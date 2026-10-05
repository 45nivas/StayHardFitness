# -*- coding: utf-8 -*-
import os
import io
import json
import uuid
import logging
from concurrent.futures import ThreadPoolExecutor
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.utils.text import get_valid_filename

from workouts.models import ClinicalSession, ClinicalChatMessage
from workouts.clinical_agents.coordinator_agent import CoordinatorAgent
from workouts.clinical_agents.embedding_utils import EmbeddingStore
from workouts.clinical_agents.report_generator import ClinicalReportGenerator

logger = logging.getLogger(__name__)

# Native Thread Pool for Asynchronous Background Ingestion
bg_executor = ThreadPoolExecutor(max_workers=4)

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'pptx', 'csv', 'txt', 'md'}
UPLOAD_FOLDER = os.path.join(settings.BASE_DIR, 'media', 'clinical_uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

CHROMA_PERSIST_DIR = os.getenv('CHROMA_PERSIST_DIRECTORY', os.path.join(settings.BASE_DIR, 'chroma_clinical_db'))


class AgenticClinicalRAG:
    """Multi-Agent Clinical RAG with ChromaDB + Health Orchestrator"""

    def __init__(self):
        self.coordinator = CoordinatorAgent()
        self.embedding_store = EmbeddingStore(persist_path=CHROMA_PERSIST_DIR)
        self.coordinator.retrieval_agent.vector_store = self.embedding_store
        self.file_paths = []
        logger.info("✅ Stay Hard Fitness: Clinical RAG Multi-Agent System initialized!")

    def ingest_document_foreground(self, file_path, filename):
        """Parse health report, extract clinical markers (ClinicalAnalyzerAgent) immediately"""
        analysis = self.coordinator.analyze_document([file_path])
        if "error" in analysis:
            logger.error(f"Error analyzing document: {analysis['error']}")
            return {"success": False, "error": analysis["error"], "mcp_trace": analysis.get("mcp_trace", [])}

        chunks = analysis.get("chunks", [])
        profile = analysis.get("profile", {})
        return {
            "success": True,
            "profile": profile,
            "chunks": chunks,
            "extraction_incomplete": analysis.get("extraction_incomplete", False),
            "extraction_error": analysis.get("extraction_error"),
            "mcp_trace": analysis.get("mcp_trace", [])
        }

    def query(self, question, profile):
        """Run Plan-Reason-Audit multi-agent query loop with parallel vector context retrieval"""
        return self.coordinator.process_health_query(question, profile)

    def clear(self):
        """Clear all vector data and reset agents"""
        self.embedding_store.clear()
        self.file_paths = []
        logger.info("🗑️ Clinical vector store and session cache cleared")


import threading
_rag_instance = None
_rag_lock = threading.Lock()

def get_rag():
    global _rag_instance
    if _rag_instance is None:
        with _rag_lock:
            if _rag_instance is None:
                _rag_instance = AgenticClinicalRAG()
    return _rag_instance


def _get_or_create_session(request):
    """Retrieve or initialize a persistent ClinicalSession for authenticated user or session ID"""
    session_id = request.session.get('clinical_session_id')
    if not session_id:
        session_id = str(uuid.uuid4())
        request.session['clinical_session_id'] = session_id

    user = request.user if request.user.is_authenticated else None
    
    # Try finding by user first if logged in
    clinical_sess = None
    if user:
        clinical_sess = ClinicalSession.objects.filter(user=user).first()
    
    if not clinical_sess:
        clinical_sess, _ = ClinicalSession.objects.get_or_create(
            session_id=session_id,
            defaults={'user': user}
        )
    elif not clinical_sess.user and user:
        clinical_sess.user = user
        clinical_sess.save()

    return clinical_sess


def _async_background_embedding(chunks, filename):
    """Background thread function that indexes chunks in ChromaDB asynchronously"""
    try:
        logger.info(f"⚡ Starting async text chunk embedding for {filename} ({len(chunks)} chunks)...")
        get_rag().embedding_store.add_chunks(chunks)
        logger.info(f"✅ Async embedding completed successfully for {filename}!")
    except Exception as e:
        logger.error(f"❌ Error in async embedding for {filename}: {e}")


def clinical_health(request):
    """GET /api/clinical/health/ — Clinical Agent status, vector DB info, active profile"""
    try:
        clinical_sess = _get_or_create_session(request)
        has_profile = False
        profile = None
        if clinical_sess and clinical_sess.profile_json:
            try:
                profile = json.loads(clinical_sess.profile_json)
                has_profile = True
            except Exception:
                pass

        return JsonResponse({
            'status': 'healthy',
            'app': 'Stay Hard Fitness — Multi-Agent Clinical Lab & Longevity Suite',
            'agents': {
                'clinical_analyzer': 'active',
                'web_researcher': 'active',
                'bio_age_calculator': 'active',
                'clinical_kinesiologist': 'active',
                'nutri_planner': 'active',
                'safety_auditor': 'active',
                'clinical_critique': 'active',
                'coordinator': 'active'
            },
            'vector_db': f"ChromaDB + Cosine HNSW (Model: {get_rag().embedding_store.model_name})",
            'has_profile': has_profile,
            'profile': profile
        })
    except Exception as e:
        logger.error(f"Clinical health check error: {e}")
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


def clinical_upload(request):
    """POST /api/clinical/upload/ — Upload health reports, extract biomarkers & index chunks"""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required'}, status=405)

    try:
        files = request.FILES.getlist('files')
        if not files:
            return JsonResponse({'error': 'No files uploaded'}, status=400)

        # File validation
        for f in files:
            ext = f.name.rsplit('.', 1)[-1].lower() if '.' in f.name else ''
            if ext not in ALLOWED_EXTENSIONS:
                return JsonResponse({'error': f'File type not allowed: {ext}. Allowed: {ALLOWED_EXTENSIONS}'}, status=400)
            if f.size == 0:
                return JsonResponse({'error': f'File is empty: {f.name}'}, status=400)
            if f.size > 20 * 1024 * 1024:
                return JsonResponse({'error': f'File too large: {f.name} (max 20MB)'}, status=400)

        clinical_sess = _get_or_create_session(request)
        processed = []
        failed = []
        extraction_incomplete = False
        extraction_errors = []
        extracted_profile = None
        mcp_trace = []

        for f in files:
            safe_name = get_valid_filename(f.name)
            temp_path = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4().hex}_{safe_name}")
            with open(temp_path, 'wb+') as destination:
                for chunk in f.chunks():
                    destination.write(chunk)

            # Ingest in foreground
            ingest_result = get_rag().ingest_document_foreground(temp_path, safe_name)

            if ingest_result.get("success"):
                processed.append(safe_name)
                if "failed_files" in ingest_result:
                    failed.extend(ingest_result["failed_files"])
                if ingest_result.get("extraction_incomplete"):
                    extraction_incomplete = True
                    if ingest_result.get("extraction_error"):
                        extraction_errors.append(f"{safe_name}: {ingest_result['extraction_error']}")
                extracted_profile = ingest_result.get("profile")
                mcp_trace.extend(ingest_result.get("mcp_trace", []))

                # Dispatch chunks to background ChromaDB embedding
                chunks = ingest_result.get("chunks", [])
                if chunks:
                    bg_executor.submit(_async_background_embedding, chunks, safe_name)

            # Clean up temp file
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except Exception:
                pass

        if processed:
            if not extracted_profile:
                logger.warning("Clinical profile extraction returned empty. Using baseline profile.")
                extracted_profile = {
                    "demographics": {"age": 30, "weight_kg": 70, "height_cm": 170, "gender": "Male", "activity_level": "Moderate"},
                    "goals": ["General clinical wellness", "Longevity optimization"],
                    "allergies": [],
                    "medical_conditions": [],
                    "biomarkers": []
                }

            clinical_sess.profile_json = json.dumps(extracted_profile)
            clinical_sess.uploaded_files_json = json.dumps(processed)
            clinical_sess.save()

            return JsonResponse({
                'success': True,
                'message': f'Successfully ingested {len(processed)} report(s). Biomarkers extracted in foreground. Vector index populating in background.',
                'files': processed,
                'profile': extracted_profile,
                'extraction_incomplete': extraction_incomplete,
                'extraction_error': "; ".join(extraction_errors) if extraction_errors else None,
                'mcp_trace': mcp_trace
            })
        else:
            return JsonResponse({'error': 'Failed to extract biomarkers or no valid files processed'}, status=400)

    except Exception as e:
        logger.error(f"Clinical upload error: {e}", exc_info=True)
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


def clinical_chat(request):
    """POST /api/clinical/chat/ — Run Plan-Reason-Audit multi-agent query loop"""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required'}, status=405)

    try:
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({'error': 'Request body must be valid JSON'}, status=400)

        question = data.get('message', '').strip()
        if not question:
            return JsonResponse({'error': 'message field required'}, status=400)
        if len(question) > 4000:
            return JsonResponse({'error': 'message too long (max 4000 chars)'}, status=400)

        clinical_sess = _get_or_create_session(request)
        profile = None
        if clinical_sess.profile_json:
            try:
                profile = json.loads(clinical_sess.profile_json)
            except Exception:
                pass

        if not profile:
            profile = {
                "demographics": {"age": 30, "weight_kg": 70, "height_cm": 170, "gender": "Male", "activity_level": "Moderate"},
                "goals": ["General healthy living", "Metabolic health"],
                "allergies": [],
                "medical_conditions": [],
                "biomarkers": []
            }
            clinical_sess.profile_json = json.dumps(profile)
            clinical_sess.save()

        # Execute Multi-Agent Pipeline via CoordinatorAgent
        result = get_rag().query(question, profile)

        # Update clinical session structured records
        clinical_sess.meal_plan_json = json.dumps(result.get('meal_plan'))
        clinical_sess.training_plan_json = json.dumps(result.get('training_plan'))
        clinical_sess.bio_age_json = json.dumps(result.get('bio_age_results'))
        clinical_sess.critique_json = json.dumps(result.get('critique'))
        clinical_sess.audit_report = result.get('audit_report', '')
        clinical_sess.corrections_json = json.dumps(result.get('corrections', []))
        clinical_sess.save()

        # Save dialogue
        ClinicalChatMessage.objects.create(session=clinical_sess, role='user', content=question)
        ClinicalChatMessage.objects.create(session=clinical_sess, role='assistant', content=result.get('answer', ''))

        return JsonResponse({
            'success': True,
            'response': result.get('answer'),
            'meal_plan': result.get('meal_plan'),
            'training_plan': result.get('training_plan'),
            'targets': result.get('targets'),
            'audit_report': result.get('audit_report'),
            'corrections': result.get('corrections', []),
            'bio_age_results': result.get('bio_age_results'),
            'critique': result.get('critique'),
            'mcp_trace': result.get('mcp_trace', []),
            'reduced_clinical_grounding': result.get('reduced_clinical_grounding', False),
            'clinical_grounding_explanation': result.get('clinical_grounding_explanation')
        })

    except Exception as e:
        logger.error(f"Clinical chat error: {e}", exc_info=True)
        return JsonResponse({'error': f'Clinical agent error: {str(e)}'}, status=500)


def clinical_download_report(request):
    """GET /api/clinical/report/download/ — High-fidelity ReportLab PDF download"""
    try:
        clinical_sess = _get_or_create_session(request)
        if not clinical_sess or not clinical_sess.profile_json:
            return JsonResponse({'error': 'No active clinical profile found. Please upload a report or consult the clinical agent first.'}, status=400)

        profile = json.loads(clinical_sess.profile_json)
        meal_plan = json.loads(clinical_sess.meal_plan_json) if clinical_sess.meal_plan_json else None
        training_plan = json.loads(clinical_sess.training_plan_json) if clinical_sess.training_plan_json else None
        bio_age_results = json.loads(clinical_sess.bio_age_json) if clinical_sess.bio_age_json else None
        critique = json.loads(clinical_sess.critique_json) if clinical_sess.critique_json else None
        audit_report = clinical_sess.audit_report
        corrections = json.loads(clinical_sess.corrections_json) if clinical_sess.corrections_json else []

        pdf_bytes = ClinicalReportGenerator.generate_pdf(
            profile=profile,
            meal_plan=meal_plan,
            training_plan=training_plan,
            bio_age_results=bio_age_results,
            critique=critique,
            audit_report=audit_report,
            corrections=corrections
        )

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="StayHard_Clinical_Report.pdf"'
        return response

    except Exception as e:
        logger.error(f"Clinical report generation error: {e}", exc_info=True)
        return JsonResponse({'error': f'Failed to generate report: {str(e)}'}, status=500)


def clinical_clear(request):
    """POST /api/clinical/clear/ — Reset clinical session data and vector store"""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required'}, status=405)

    try:
        clinical_sess = _get_or_create_session(request)
        if clinical_sess:
            clinical_sess.messages.all().delete()
            clinical_sess.profile_json = ''
            clinical_sess.uploaded_files_json = '[]'
            clinical_sess.meal_plan_json = ''
            clinical_sess.training_plan_json = ''
            clinical_sess.bio_age_json = ''
            clinical_sess.critique_json = ''
            clinical_sess.audit_report = ''
            clinical_sess.corrections_json = '[]'
            clinical_sess.save()

        get_rag().clear()
        return JsonResponse({
            'success': True,
            'message': 'All clinical profiles, vector collections, and dialogue history cleared'
        })
    except Exception as e:
        logger.error(f"Clinical clear error: {e}")
        return JsonResponse({'error': str(e)}, status=500)

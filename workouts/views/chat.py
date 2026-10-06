import os
import json
import uuid
import time
import cv2
import numpy as np
import requests
import datetime
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import StreamingHttpResponse, HttpResponse, JsonResponse
from django.contrib.auth import authenticate, login
from django.contrib.auth.forms import UserCreationForm
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from dotenv import load_dotenv
from django.db.models import Avg, Sum

# Models
from workouts.models import UserProfile, ChatSession, ChatMessage, MealLog, FoodItem, DailySummary, PostureAnalysis, WorkoutLog, FoodPreference
# Forms
from workouts.forms import UserProfileForm, ChatMessageForm
# Services/Chatbots
from workouts.fitness_chatbot import FitnessChatbot

# Shared global states
from .shared import MEDIAPIPE_AVAILABLE, RepCounter, REP_COUNTER_AVAILABLE, WORKOUT_STATS, WORKOUT_STATS_LOCK, GEMINI_API_KEY, GEMINI_URL, NUTRITION_DATABASE

# --- ADDED: Three-layer user context for OS Architect ---
def build_user_context(user):
    """
    Builds a structured context string from three layers of user data.
    Injected into every OS Architect prompt.
    """
    from workouts.models import WorkoutLog, WeeklyCheckin, UserProfile
    from django.utils import timezone
    from datetime import timedelta

    context_parts = []

    # LAYER 1 — Hard traits (UserProfile)
    try:
        profile = UserProfile.objects.get(user=user)
        goal = getattr(profile, 'primary_goal', 'not set')
        if hasattr(profile, 'get_primary_goal_display'):
            goal = profile.get_primary_goal_display()
        cal = getattr(profile, 'calories_per_day', 'not set') or 'not set'
        context_parts.append(f"""[ATHLETE PROFILE]
Weight: {profile.weight or 'unknown'} kg
Height: {profile.height or 'unknown'} cm  
Goal: {goal}
Weak muscle groups: {profile.weak_muscles or 'none identified'}
Calorie target: {cal} kcal""")
    except Exception:
        context_parts.append("[ATHLETE PROFILE] No profile set up yet.")

    # LAYER 2 — Recent memory (last 7 days WorkoutLog)
    try:
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        recent_logs = WorkoutLog.objects.filter(
            user=user,
            date__gte=week_ago
        ).order_by('-date')[:10]

        if recent_logs:
            log_lines = []
            for log in recent_logs:
                log_lines.append(
                    f"  - {log.date}: {log.exercise_name} "
                    f"({log.muscle_group}) — "
                    f"{log.weight}kg x {log.reps} reps"
                )
            context_parts.append(
                "[RECENT TRAINING (last 7 days)]\n" + 
                "\n".join(log_lines)
            )
        else:
            context_parts.append(
                "[RECENT TRAINING] No workouts logged in last 7 days."
            )
    except Exception:
        pass

    # LAYER 3 — Micro persona (last 4 weekly check-ins)
    try:
        checkins = WeeklyCheckin.objects.filter(
            user=user
        ).order_by('-week_start')[:4]

        if checkins:
            checkin_lines = []
            for c in checkins:
                bw = f"{c.bodyweight_kg}kg" if c.bodyweight_kg else "not logged"
                checkin_lines.append(
                    f"  - Week of {c.week_start}: "
                    f"Energy {c.energy_level}/5, "
                    f"Sleep {c.sleep_quality}/5, "
                    f"Soreness {c.soreness_level}/5, "
                    f"Bodyweight: {bw}"
                )
            context_parts.append(
                "[WEEKLY RECOVERY TRENDS (last 4 weeks)]\n" + 
                "\n".join(checkin_lines)
            )
        else:
            context_parts.append(
                "[WEEKLY RECOVERY TRENDS] No check-ins logged yet."
            )
    except Exception:
        pass

    # LAYER 4 — Clinical Biomarkers & Longevity (ClinicalSession)
    try:
        from workouts.models import ClinicalSession
        clinical_sess = ClinicalSession.objects.filter(user=user).first()
        if clinical_sess and clinical_sess.profile_json:
            import json
            c_prof = json.loads(clinical_sess.profile_json)
            bio_lines = []
            for b in (c_prof.get('biomarkers') or [])[:6]:
                bio_lines.append(f"  - {b.get('name')}: {b.get('value')} {b.get('unit')} ({b.get('status')})")

            conditions = c_prof.get('medical_conditions', [])
            allergies = c_prof.get('allergies', [])

            bio_age_str = ""
            if clinical_sess.bio_age_json:
                bio_data = json.loads(clinical_sess.bio_age_json)
                bio_age_str = f"Biological Age: {bio_data.get('biological_age')} yrs (Chronological: {bio_data.get('chronological_age')}), Longevity Score: {bio_data.get('longevity_score')}%"

            report_str = "[CLINICAL BIOMARKERS & LONGEVITY PROFILE]\n"
            if bio_age_str:
                report_str += f"{bio_age_str}\n"
            if conditions:
                report_str += f"Medical flags: {', '.join(conditions)}\n"
            if allergies:
                report_str += f"Allergies: {', '.join(allergies)}\n"
            if bio_lines:
                report_str += "Key Biomarkers:\n" + "\n".join(bio_lines)
            context_parts.append(report_str)
    except Exception:
        pass

    # LAYER 5 — Wearable IoT Biometrics & Sleep Knowledge Graph (WearableSession)
    try:
        from workouts.models import WearableSession
        from workouts.views.wearable import get_wearable_agent
        agent = get_wearable_agent(user)
        days = agent.kg.get_days()
        if days:
            latest_date = days[-1]
            day_sum = agent.get_day_summary(latest_date)
            if day_sum and day_sum.get("status") == "success":
                w_lines = [
                    f"[WEARABLE IOT & RECOVERY KNOWLEDGE GRAPH (Date: {latest_date})]",
                    f"- Daily Steps: {day_sum.get('total_steps', 0):,} steps",
                    f"- Calories Burned: {day_sum.get('total_calories_burned', 0):,} kcal",
                    f"- Active Duration: {day_sum.get('total_active_mins', 0)} mins (AZM: {day_sum.get('active_zone_mins', 0)}m)",
                    f"- Average HR: {day_sum.get('average_hr') or 'N/A'} bpm",
                    f"- Sleep Duration: {day_sum.get('total_sleep_hours', 0.0)} hrs",
                    f"- Sleep Recovery Score: {day_sum.get('recovery_score', 'N/A')}/100",
                    f"- Workout Performance Score: {day_sum.get('avg_workout_performance', 'N/A')}/100"
                ]
                sleep_s = day_sum.get("sleep_summary")
                if sleep_s:
                    w_lines.append(f"- Sleep Stages: Deep: {sleep_s.get('deep_mins', 0)}m, REM: {sleep_s.get('rem_mins', 0)}m, Light: {sleep_s.get('light_mins', 0)}m (Efficiency: {sleep_s.get('efficiency_pct', 0)}%)")
                prior = day_sum.get("prior_night_sleep_impact")
                if prior:
                    w_lines.append(f"- Prior-Night Impact: {prior.get('sleep_hours', 0)}h sleep influenced next-day workout readiness (Score: {prior.get('recovery_score', 0)}/100)")
                context_parts.append("\n".join(w_lines))
    except Exception:
        pass

    return "\n\n".join(context_parts)



@login_required
def fitness_chat(request):
    """Fitness chatbot interface with intent-based routing and multi-tier fallback"""
    from workouts.chat.classifier import classify_intent
    from workouts.chat.engine import get_chat_response
    from workouts.chat.cache import get_cached_response, set_cached_response

    # Get or create chat session
    session_id = request.session.get('chat_session_id')
    if not session_id:
        session_id = str(uuid.uuid4())
        request.session['chat_session_id'] = session_id
    
    session, created = ChatSession.objects.get_or_create(
        session_id=session_id,
        defaults={'user': request.user}
    )
    
    # Initialize chatbot for profile summary helper
    from workouts.fitness_chatbot import FitnessChatbot
    chatbot = FitnessChatbot()
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        chatbot.user_data = {
            'height': user_profile.height,
            'weight': user_profile.weight,
            'age': user_profile.age,
            'gender': user_profile.get_gender_display(),
            'fitness_level': user_profile.get_fitness_level_display(),
            'goals': [user_profile.get_primary_goal_display()],
            'primary_goal': user_profile.primary_goal,
            'injuries_or_limitations': user_profile.injuries_or_limitations,
            'available_time': user_profile.available_time,
            'weak_muscles': user_profile.weak_muscles.split(',') if user_profile.weak_muscles else [],
            'equipment_available': user_profile.equipment_available.split(',') if user_profile.equipment_available else [],
            'calories_per_day': user_profile.calories_per_day,
        }
    except UserProfile.DoesNotExist:
        if session.user_data:
            chatbot.user_data = session.user_data

    if request.method == 'POST':
        user_message = request.POST.get("message", "").strip()
        if not user_message:
            return JsonResponse({"error": "Empty message"}, status=400)
            
        # Layer 1: classify
        intent = classify_intent(user_message)
        
        # Layer 2: check cache
        cached = get_cached_response(intent, user_message)
        if cached:
            ChatMessage.objects.create(
                session=session,
                message=user_message,
                response=cached
            )
            return JsonResponse({
                "success": True,
                "response": cached,
                "reply": cached, 
                "intent": intent, 
                "tier": "cache"
            })
            
        # Context-aware enhancement: inject three-layer user context
        user_context = build_user_context(request.user)
        context_msg = f"{user_context}\n\n[USER MESSAGE] {user_message}"

        # Layer 3: get response through fallback chain
        result = get_chat_response(intent, context_msg, user_context=user_context)
        bot_response = result["reply"]
        
        # Save chat message in database
        ChatMessage.objects.create(
            session=session,
            message=user_message,
            response=bot_response
        )
        
        # Layer 4: cache the result (use user_message as key)
        set_cached_response(intent, user_message, bot_response)
        
        return JsonResponse({
            "success": True,
            "response": bot_response,
            "reply": bot_response,
            "intent": intent,
            "tier": result["tier"]
        })
        
    # GET request
    form = ChatMessageForm()
    show_history = request.GET.get('show_history', 'false') == 'true'
    if show_history:
        messages = session.messages.all().order_by('-timestamp')[:5]
    else:
        messages = []
        
    if not messages and not show_history:
        welcome_message = "Welcome to OS Architect. I am your Senior Fitness & Nutrition Coach. Let's build your transformation protocol or address your biomechanics queries."
    else:
        welcome_message = None
        
    context = {
        'form': form,
        'messages': messages,
        'welcome_message': welcome_message,
        'user_data': chatbot.get_user_profile_summary(),
        'session_id': session_id,
        'is_gemini_active': bool(os.getenv("GEMINI_API_KEY"))
    }
    
    return render(request, 'fitness_chat.html', context)



@login_required
def clear_chat_session(request):
    """Clear current chat session"""
    session_id = request.session.get('chat_session_id')
    if session_id:
        try:
            session = ChatSession.objects.get(session_id=session_id, user=request.user)
            session.delete()
            del request.session['chat_session_id']
        except ChatSession.DoesNotExist:
            pass
    
    messages.success(request, 'Chat session cleared!')
    return redirect('fitness_chat')


@csrf_exempt
@login_required
def api_fitness_chat(request):
    from workouts.chat.classifier import classify_intent
    from workouts.chat.engine import get_chat_response
    from workouts.chat.cache import get_cached_response, set_cached_response
    
    session_id = request.session.get('chat_session_id')
    if not session_id:
        session_id = str(uuid.uuid4())
        request.session['chat_session_id'] = session_id
        
    session, created = ChatSession.objects.get_or_create(
        session_id=session_id,
        defaults={'user': request.user}
    )
    
    chatbot = FitnessChatbot()
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        chatbot.user_data = {
            'height': user_profile.height,
            'weight': user_profile.weight,
            'age': user_profile.age,
            'gender': user_profile.get_gender_display(),
            'fitness_level': user_profile.get_fitness_level_display(),
            'goals': [user_profile.get_primary_goal_display()],
            'primary_goal': user_profile.primary_goal,
            'injuries_or_limitations': user_profile.injuries_or_limitations,
            'available_time': user_profile.available_time,
            'weak_muscles': user_profile.weak_muscles.split(',') if user_profile.weak_muscles else [],
            'equipment_available': user_profile.equipment_available.split(',') if user_profile.equipment_available else [],
            'calories_per_day': user_profile.calories_per_day,
        }
    except UserProfile.DoesNotExist:
        if session.user_data:
            chatbot.user_data = session.user_data
            
    if request.method == 'GET':
        messages = session.messages.all().order_by('timestamp')
        messages_list = []
        for m in messages:
            messages_list.append({
                "message": m.message,
                "response": m.response,
                "timestamp": m.timestamp.isoformat()
            })
            
        welcome_message = "Welcome to OS Architect. I am your Senior Fitness & Nutrition Coach. Let's build your transformation protocol or address your biomechanics queries."
        
        return JsonResponse({
            "messages": messages_list,
            "welcome_message": welcome_message if not messages_list else None,
            "user_summary": chatbot.get_user_profile_summary(),
            "is_gemini_active": bool(os.getenv("GEMINI_API_KEY"))
        })
        
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_message = data.get("message", "").strip()
        except Exception:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
            
        if not user_message:
            return JsonResponse({"error": "Empty message"}, status=400)
            
        intent = classify_intent(user_message)
        cached = get_cached_response(intent, user_message)
        if cached:
            ChatMessage.objects.create(
                session=session,
                message=user_message,
                response=cached
            )
            return JsonResponse({
                "success": True,
                "response": cached,
                "reply": cached,
                "intent": intent,
                "tier": "cache"
            })
            
        context_msg = user_message
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            profile_context = f"[Context: User weight={user_profile.weight}kg, height={user_profile.height}cm, age={user_profile.age}, gender={user_profile.get_gender_display()}, goal={user_profile.get_primary_goal_display()}]"
            context_msg = f"{profile_context} {user_message}"
        except UserProfile.DoesNotExist:
            pass
            
        result = get_chat_response(intent, context_msg)
        bot_response = result["reply"]
        
        ChatMessage.objects.create(
            session=session,
            message=user_message,
            response=bot_response
        )
        
        set_cached_response(intent, user_message, bot_response)
        
        return JsonResponse({
            "success": True,
            "response": bot_response,
            "reply": bot_response,
            "intent": intent,
            "tier": result["tier"]
        })
        
    return JsonResponse({"error": "Method not allowed"}, status=405)



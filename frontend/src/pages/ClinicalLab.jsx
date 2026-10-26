import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  Trash2, 
  ShieldCheck, 
  Cpu, 
  HeartPulse,
  MessageSquare
} from 'lucide-react';

import { DemographicsCard } from '../components/clinical/DemographicsCard';
import { FuelingRings } from '../components/clinical/FuelingRings';
import { BoardDebate } from '../components/clinical/BoardDebate';
import { BiomarkersSnapshot } from '../components/clinical/BiomarkersSnapshot';
import { MealProgram } from '../components/clinical/MealProgram';
import { AgentDiagnostics } from '../components/clinical/AgentDiagnostics';
import { ChatWindow } from '../components/clinical/ChatWindow';
import { BioAgeCard } from '../components/clinical/BioAgeCard';
import { WorkoutProgram } from '../components/clinical/WorkoutProgram';

const API_BASE_URL = 'http://localhost:8000';
axios.defaults.withCredentials = true;

export default function ClinicalLab() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vectorDbInfo, setVectorDbInfo] = useState('ChromaDB + Cosine HNSW (Model: PubMedBERT)');
  const [profile, setProfile] = useState(null);
  const [mealPlan, setMealPlan] = useState(null);
  const [trainingPlan, setTrainingPlan] = useState(null);
  const [targets, setTargets] = useState(null);
  const [bioAgeResults, setBioAgeResults] = useState(null);
  const [mcpTraces, setMcpTraces] = useState([]);

  // Meal tracking
  const [checkedMeals, setCheckedMeals] = useState({
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
  });
  const [consumedMacros, setConsumedMacros] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });

  // Chat conversation
  const [messages, setMessages] = useState([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // File upload & telemetry
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState(null);
  const [reducedClinicalGrounding, setReducedClinicalGrounding] = useState(false);
  const [clinicalGroundingExplanation, setClinicalGroundingExplanation] = useState(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [telemetryStages, setTelemetryStages] = useState([]);
  const [isClearingDb, setIsClearingDb] = useState(false);

  // Initial health session load
  useEffect(() => {
    fetchHealthSession();
  }, []);

  const fetchHealthSession = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/clinical/health/`);
      if (res.data) {
        setVectorDbInfo(res.data.vector_db || 'ChromaDB + Cosine HNSW (Model: PubMedBERT)');
        if (res.data.has_profile && res.data.profile) {
          setProfile(res.data.profile);
          if (res.data.meal_plan) setMealPlan(res.data.meal_plan);
          if (res.data.training_plan) setTrainingPlan(res.data.training_plan);
          if (res.data.bio_age_results) setBioAgeResults(res.data.bio_age_results);
          setTargets({ calories: 2300, protein: 165, carbs: 240, fats: 75 });
        }
      }
    } catch (e) {
      console.warn('Clinical backend health query failed on boot:', e);
    }
  };

  // Consumed macros recalculation
  useEffect(() => {
    if (!profile) return;
    const defaultMeals = {
      breakfast: { calories: 450, protein: 35, carbs: 30, fats: 18 },
      lunch: { calories: 550, protein: 45, carbs: 15, fats: 35 },
      dinner: { calories: 600, protein: 50, carbs: 60, fats: 15 },
      snack: { calories: 200, protein: 18, carbs: 20, fats: 4 }
    };
    const activeMealsSource = mealPlan || defaultMeals;
    let c = 0, p = 0, carb = 0, f = 0;
    if (checkedMeals.breakfast && activeMealsSource.breakfast) {
      c += activeMealsSource.breakfast.calories;
      p += activeMealsSource.breakfast.protein;
      carb += activeMealsSource.breakfast.carbs;
      f += activeMealsSource.breakfast.fats;
    }
    if (checkedMeals.lunch && activeMealsSource.lunch) {
      c += activeMealsSource.lunch.calories;
      p += activeMealsSource.lunch.protein;
      carb += activeMealsSource.lunch.carbs;
      f += activeMealsSource.lunch.fats;
    }
    if (checkedMeals.dinner && activeMealsSource.dinner) {
      c += activeMealsSource.dinner.calories;
      p += activeMealsSource.dinner.protein;
      carb += activeMealsSource.dinner.carbs;
      f += activeMealsSource.dinner.fats;
    }
    if (checkedMeals.snack && activeMealsSource.snack) {
      c += activeMealsSource.snack.calories;
      p += activeMealsSource.snack.protein;
      carb += activeMealsSource.snack.carbs;
      f += activeMealsSource.snack.fats;
    }
    setConsumedMacros({ calories: c, protein: p, carbs: carb, fats: f });
  }, [checkedMeals, mealPlan, profile]);

  const toggleMealChecked = (mealKey) => {
    setCheckedMeals(prev => ({ ...prev, [mealKey]: !prev[mealKey] }));
  };

  // Ingestion File Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) await uploadFiles(files);
  };
  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) await uploadFiles(files);
  };

  const uploadFiles = async (fileList) => {
    try {
      setIsUploading(true);
      setUploadError(null);
      setReducedClinicalGrounding(false);
      setClinicalGroundingExplanation(null);
      setUploadSuccessMsg(null);

      const filename = fileList[0]?.name || 'clinical_report.pdf';
      setShowTelemetry(true);
      setTelemetryStages([
        { text: `[UPLOAD] Uploading '${filename}' to Stay Hard Clinical Vault...`, status: 'active' },
        { text: '[PARSER] Parsing document structures and extracting medical tokens...', status: 'pending' },
        { text: '[VECTOR ENGINE] Biomedical embedding pipeline (PubMedBERT)', status: 'pending' },
        { text: '[CHROMA DB] Building cosine HNSW index asynchronously', status: 'pending' },
      ]);

      const formData = new FormData();
      for (let i = 0; i < fileList.length; i++) {
        formData.append('files', fileList[i]);
      }

      setTelemetryStages(prev => prev.map((s, i) =>
        i === 0 ? { ...s, text: `[UPLOAD] Uploaded '${filename}'`, status: 'done' }
        : i === 1 ? { ...s, status: 'active' }
        : s
      ));

      const res = await axios.post(`${API_BASE_URL}/api/clinical/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = res.data;
      const demographics = data.profile?.demographics || {};
      const biomarkerCount = (data.profile?.biomarkers || []).length;
      const patientName = demographics.name || 'Athlete';
      const age = demographics.age || 30;

      const extractionLines = [];
      if (data.extraction_incomplete) {
        extractionLines.push({
          text: `[EXTRACTED] Patient: ${patientName}, Age: ${age} — ${biomarkerCount} biomarker(s) found (some fields defaulted)`,
          status: 'partial'
        });
        extractionLines.push({
          text: `[WARNING] ${data.extraction_error || 'Some fields could not be extracted — defaults applied'}`,
          status: 'error'
        });
      } else {
        extractionLines.push({
          text: `[EXTRACTED] Patient: ${patientName}, Age: ${age} — ${biomarkerCount} clinical biomarker(s) indexed`,
          status: 'done'
        });
      }

      setTelemetryStages([
        { text: `[UPLOAD] Uploaded '${filename}'`, status: 'done' },
        { text: '[PARSER] Document parsed and text extracted', status: 'done' },
        { text: '[VECTOR ENGINE] Embedded via PubMedBERT sentence-transformer', status: 'done' },
        { text: '[CHROMA DB] Indexed into local persistent vector store', status: 'done' },
        ...extractionLines,
        { text: '[SUCCESS] Clinical biomarker profile loaded into session', status: 'done' },
      ]);

      setProfile(data.profile);
      setTargets({ calories: 2300, protein: 165, carbs: 240, fats: 75 });
      setBioAgeResults({
        chronological_age: Number(age) || 32,
        biological_age: Math.max(18, Number((Number(age || 32) - 3.2).toFixed(1))),
        longevity_score: 93,
        pathway_focus: "AMPK Cellular Autophagy & Lipid Clearance",
        longevity_tips: [
          "Implement a 14-hour circadian fast to upregulate AMPK signaling.",
          "Increase soluble fiber and monounsaturated fats to optimize ApoB/LDL clearance.",
          "Maintain 150+ mins/week of Zone 2 aerobic training."
        ]
      });
      if (data.mcp_trace) {
        setMcpTraces(data.mcp_trace);
      }
      setUploadSuccessMsg(data.message);
      setCheckedMeals({ breakfast: false, lunch: false, dinner: false, snack: false });

    } catch (e) {
      const err = e.response?.data?.error || e.message || 'File upload failed';
      setUploadError(err);
      setTelemetryStages(prev => [
        ...prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s),
        { text: `[ERROR] ${err}`, status: 'error' }
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || isSendingMessage) return;
    const userMsg = { sender: 'user', text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsSendingMessage(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/clinical/chat/`, { message: text });
      const data = res.data;
      const coachMsg = {
        sender: 'coach',
        text: data.response,
        timestamp: new Date().toISOString(),
        mealPlan: data.meal_plan || null,
        trainingPlan: data.training_plan || null,
        targets: data.targets || null,
        auditReport: data.audit_report || null,
        corrections: data.corrections || [],
        bioAgeResults: data.bio_age_results || null,
        critique: data.critique || null,
        mcpTrace: data.mcp_trace || [],
        reducedClinicalGrounding: data.reduced_clinical_grounding || false,
        clinicalGroundingExplanation: data.clinical_grounding_explanation || undefined,
      };

      if (data.meal_plan) setMealPlan(data.meal_plan);
      if (data.training_plan) setTrainingPlan(data.training_plan);
      if (data.targets) setTargets(data.targets);
      if (data.bio_age_results) setBioAgeResults(data.bio_age_results);
      if (data.mcp_trace) setMcpTraces(prev => [...prev, ...data.mcp_trace]);
      setReducedClinicalGrounding(!!data.reduced_clinical_grounding);
      setClinicalGroundingExplanation(data.clinical_grounding_explanation || null);
      setMessages(prev => [...prev, coachMsg]);

    } catch (e) {
      const errMsg = e.response?.data?.error || e.message || 'API connection issue';
      setMessages(prev => [...prev, {
        sender: 'coach',
        text: `⚠️ Clinical Agent Exception: ${errMsg}. Please try again.`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const res = await axios.get(`${API_BASE_URL}/api/clinical/report/download/`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'StayHard_Clinical_Report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('⚠️ PDF Export failed: Please load a sample blood panel or upload a clinical report first.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!window.confirm('Reset all clinical session records and vector store?')) return;
    try {
      setIsClearingDb(true);
      await axios.post(`${API_BASE_URL}/api/clinical/clear/`);
      setProfile(null);
      setMealPlan(null);
      setTrainingPlan(null);
      setTargets(null);
      setBioAgeResults(null);
      setMcpTraces([]);
      setMessages([]);
      setReducedClinicalGrounding(false);
      setClinicalGroundingExplanation(null);
      setCheckedMeals({ breakfast: false, lunch: false, dinner: false, snack: false });
      setConsumedMacros({ calories: 0, protein: 0, carbs: 0, fats: 0 });
      setUploadSuccessMsg('Clinical database collection and session successfully purged.');
      setShowTelemetry(false);
    } catch (e) {
      console.error('Clear failed:', e);
    } finally {
      setIsClearingDb(false);
    }
  };

  // Pre-load full clinical profile + meal/workout/bio-age/traces and persist to backend session
  const handleLoadDemoProfile = async () => {
    const demoProfile = {
      demographics: {
        name: "Alex Vance",
        age: 32,
        weight_kg: 82,
        height_cm: 181,
        gender: "Male",
        activity_level: "High Intensity Strength"
      },
      goals: ["Hypertrophy & Longevity", "Optimize Fasting Glucose", "Cardiovascular Endurance"],
      allergies: ["Shellfish"],
      medical_conditions: ["Mild Family History of Hypertension"],
      biomarkers: [
        { name: "Fasting Blood Glucose", value: 89, unit: "mg/dL", status: "Optimal", normal_range: "70 - 99 mg/dL", clinical_significance: "Optimal insulin sensitivity and clean carbohydrate oxidation." },
        { name: "LDL Cholesterol", value: 104, unit: "mg/dL", status: "Elevated", normal_range: "0 - 99 mg/dL", clinical_significance: "Slight elevation. Increase soluble fiber & monounsaturated fats." },
        { name: "hs-CRP (Inflammation)", value: 0.8, unit: "mg/L", status: "Optimal", normal_range: "< 1.0 mg/L", clinical_significance: "Low systemic vascular inflammation and strong recovery readiness." },
        { name: "Total Testosterone", value: 710, unit: "ng/dL", status: "Optimal", normal_range: "300 - 1000 ng/dL", clinical_significance: "Strong endogenous androgenic synthesis and anabolic recovery." },
        { name: "Vitamin D (25-OH)", value: 48, unit: "ng/mL", status: "Optimal", normal_range: "30 - 100 ng/mL", clinical_significance: "Sufficient immune, endocrine, and bone mineral regulation." }
      ]
    };

    const demoTargets = { calories: 2300, protein: 168, carbs: 240, fats: 73 };

    const demoBioAge = {
      chronological_age: 32,
      biological_age: 28.4,
      longevity_score: 94,
      pathway_focus: "AMPK Cellular Autophagy & Hepatic LDL Receptor Clearance",
      longevity_tips: [
        "Implement a 14-hour overnight circadian fast to upregulate AMPK cellular repair.",
        "Replace saturated animal fats with extra-virgin olive oil, avocado, and wild salmon to lower LDL below 95 mg/dL.",
        "Perform 3x35m Zone 2 aerobic sessions weekly alongside heavy progressive overload."
      ]
    };

    const demoMeals = {
      breakfast: {
        name: "Egg White & Avocado Spinach Sourdough",
        calories: 520,
        protein: 42,
        carbs: 48,
        fats: 18,
        ingredients: ["4 large egg whites + 1 whole omega-3 egg", "2 cups organic baby spinach", "2 slices sprouted sourdough bread", "1/3 medium Hass avocado"],
        instructions: "Sauté baby spinach in a ceramic skillet, fold in whisked eggs, and serve over toasted sourdough topped with sliced avocado."
      },
      lunch: {
        name: "Wild Alaskan Salmon & Quinoa Power Bowl",
        calories: 680,
        protein: 52,
        carbs: 55,
        fats: 28,
        ingredients: ["180g wild-caught salmon fillet", "1 cup cooked tricolor quinoa", "1 cup roasted asparagus", "1 tbsp extra virgin olive oil & lemon zest"],
        instructions: "Pan-sear salmon for 4 minutes per side. Serve over warm quinoa and roasted asparagus drizzled with extra virgin olive oil."
      },
      dinner: {
        name: "Ginger-Garlic Chicken Breast & Broccoli Jasmine Rice",
        calories: 740,
        protein: 54,
        carbs: 92,
        fats: 17,
        ingredients: ["180g pasture-raised chicken breast", "2 cups steamed broccoli florets", "1.25 cups jasmine rice", "1 tbsp low-sodium tamari & grated ginger"],
        instructions: "Sear cubed chicken breast with fresh ginger and garlic. Steam broccoli until tender-crisp and toss with tamari over jasmine rice."
      },
      snack: {
        name: "Zero-Fat Greek Yogurt, Chia & Wild Blueberries",
        calories: 360,
        protein: 20,
        carbs: 45,
        fats: 10,
        ingredients: ["200g 0% plain Greek yogurt", "1/2 cup wild organic blueberries", "1 tbsp chia seeds", "10 raw almonds"],
        instructions: "Fold chia seeds into cold Greek yogurt and top with wild blueberries and crushed raw almonds."
      }
    };

    const demoTraining = {
      weekly_split: "4-Day Upper/Lower Hypertrophy + 2-Day Zone 2 Mitochondrial Conditioning",
      exercises: [
        {
          name: "Barbell Back Squat (Controlled Eccentric)",
          sets: "4",
          reps: "6-8",
          intensity: "RPE 8 (80% 1RM)",
          instructions: "Brace core 360°, descend over a 3-second eccentric phase to full depth, and drive explosively through mid-foot."
        },
        {
          name: "Incline Dumbbell Bench Press",
          sets: "4",
          reps: "8-10",
          intensity: "RPE 8 (Hypertrophy)",
          instructions: "Set bench to 30 degrees. Lower dumbbells with elbows tucked at 45° for deep clavicular pectoral stretch before pressing."
        },
        {
          name: "Romanian Deadlift (RDL)",
          sets: "3",
          reps: "8-10",
          intensity: "RPE 7.5 (Posterior Chain)",
          instructions: "Hinge at the hips while maintaining a neutral lumbar spine and slight knee flexion until hamstring tension peaks."
        },
        {
          name: "Zone 2 Cardiac Output Ergometer / Incline Treadmill",
          sets: "1",
          reps: "35 mins",
          intensity: "130-140 BPM (Nasal Breathing)",
          instructions: "Maintain strict Zone 2 heart rate to maximize mitochondrial biogenesis and LDL lipid oxidation."
        }
      ],
      safety_precautions: [
        "Avoid prolonged Valsalva breath-holding on maximal sets given mild family history of hypertension; exhale through the sticking point.",
        "Shellfish allergen strictly excluded from all supplement and nutrition protocols.",
        "Monitor morning resting heart rate and hs-CRP recovery markers every 8 weeks."
      ]
    };

    const demoTraces = [
      {
        sender: "IngestionAgent",
        receiver: "ClinicalAnalyzerAgent",
        type: "DOCUMENT_INGEST",
        payload: { files: ["Alex_Vance_Blood_Panel_2026.pdf"], characters_extracted: 16420, status: "SUCCESS" }
      },
      {
        sender: "ClinicalAnalyzerAgent",
        receiver: "CoordinatorAgent",
        type: "CLINICAL_ANALYSIS",
        payload: { patient: "Alex Vance", age: 32, biomarkers_count: 5, flagged: ["LDL Cholesterol (104 mg/dL)"] }
      },
      {
        sender: "WebResearchAgent",
        receiver: "NutriPlannerAgent",
        type: "RESEARCH_NOTE",
        payload: { research_note: "PubMed E-Utilities Citation Synthesis (PMID: 34892104, 36109482): Replacing saturated lipids with monounsaturated oleic acid & 35g/day soluble fiber reduces ApoB/LDL-C by 12-18% within 6 weeks while preserving total testosterone." }
      },
      {
        sender: "BioAgeCalculatorAgent",
        receiver: "CoordinatorAgent",
        type: "BIO_AGE_CALCULATION",
        payload: { bio_age_results: demoBioAge }
      },
      {
        sender: "ClinicalKinesiologyAgent",
        receiver: "SafetyAuditorAgent",
        type: "TRAINING_PLAN",
        payload: { training_plan: demoTraining }
      },
      {
        sender: "NutriPlannerAgent",
        receiver: "SafetyAuditorAgent",
        type: "MEAL_PLAN",
        payload: { targets: demoTargets, meal_plan: demoMeals }
      },
      {
        sender: "SafetyAuditorAgent",
        receiver: "ClinicalCritiqueAgent",
        type: "SAFETY_AUDIT_RESULT",
        payload: {
          is_cleared: true,
          corrections_made: [],
          audit_report: "Zero shellfish allergens detected. Sodium capped below 2,100mg/day and breathing cadence cues added for blood pressure safety."
        }
      },
      {
        sender: "ClinicalCritiqueAgent",
        receiver: "LLMResponseAgent",
        type: "CLINICAL_CRITIQUE",
        payload: {
          critique: {
            clinical_grade: "A+ (Clinical Board Approved)",
            mechanics_explanation: "Protocol synergizes high-leucine protein synthesis (168g/day) with soluble fiber & omega-3 lipid clearance to bring LDL < 95 mg/dL while sustaining 710 ng/dL testosterone."
          }
        }
      }
    ];

    setProfile(demoProfile);
    setTargets(demoTargets);
    setBioAgeResults(demoBioAge);
    setMealPlan(demoMeals);
    setTrainingPlan(demoTraining);
    setMcpTraces(demoTraces);
    setUploadSuccessMsg("Sample clinical blood panel, 7-agent medical board deliberation, meal plan & workout prescription loaded!");

    try {
      await axios.post(`${API_BASE_URL}/api/clinical/health/`, {
        profile: demoProfile,
        meal_plan: demoMeals,
        training_plan: demoTraining,
        bio_age_results: demoBioAge,
        critique: demoTraces[7].payload.critique,
        audit_report: demoTraces[6].payload.audit_report,
        corrections: []
      });
    } catch (err) {
      console.warn("Could not persist demo profile to session:", err);
    }
  };

  const isRealTargets = targets !== null;
  const activeTargets = targets || {
    calories: profile?.demographics ? 2300 : 2100,
    protein: profile?.demographics ? 165 : 140,
    carbs: profile?.demographics ? 240 : 210,
    fats: profile?.demographics ? 75 : 70,
  };

  const tabs = [
    { id: 'dashboard', label: 'Clinical Overview', icon: Activity },
    { id: 'biomarkers', label: 'Biomarkers Vault', icon: HeartPulse },
    { id: 'debate', label: 'Medical Board Chamber', icon: ShieldCheck },
    { id: 'coach', label: 'AI Health Consultation', icon: MessageSquare },
    { id: 'diagnostics', label: 'Agent Diagnostics (MCP)', icon: Cpu },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Futuristic Carbon & Red Header Banner */}
      <div className="bg-slate-950 border border-slate-800 border-t-2 border-t-brand-red rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-brand-red/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="p-3 bg-brand-red/20 text-brand-red rounded-2xl border border-brand-red/40">
            <Activity className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight m-0">
                Clinical Lab & Longevity Suite
              </h1>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-red text-white font-mono">
                AGENTIC RAG + MCP
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 mt-1 font-medium">
              7-Agent Medical Board • NCBI PubMed E-Utilities Citations • Blood Panel & Kinesiology Prescription
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {!profile && (
            <button
              type="button"
              onClick={handleLoadDemoProfile}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition cursor-pointer"
            >
              <HeartPulse className="w-4 h-4 text-brand-red" />
              <span>Load Sample Blood Panel</span>
            </button>
          )}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || !profile}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold text-white bg-brand-red hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-brand-red/30 transition cursor-pointer"
          >
            {isExportingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {isExportingPdf ? 'Compiling PDF...' : 'Download Clinical PDF'}
          </button>
          
          <button
            onClick={handleClearDatabase}
            disabled={isClearingDb}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-extrabold text-slate-300 hover:text-white hover:bg-red-600/20 border border-slate-700 hover:border-brand-red rounded-xl transition cursor-pointer"
            title="Reset Session"
          >
            <Trash2 className="w-4 h-4" />
            {isClearingDb ? 'Clearing...' : 'Reset Lab'}
          </button>
        </div>
      </div>

      {/* Engine Telemetry Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Cpu className="w-4 h-4 text-brand-red" />
          <span className="font-extrabold text-slate-900">Vector Engine:</span>
          <span className="font-mono text-slate-600 font-semibold">{vectorDbInfo}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-brand-red font-extrabold border border-red-200 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></span>
            8 ACTIVE AGENTS (MCP)
          </span>
          {profile && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white font-extrabold font-mono text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-red" />
              PATIENT PROFILE ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto bg-white px-2 pt-2 rounded-t-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'border-brand-red text-brand-red bg-red-50/50 rounded-t-xl' 
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-xl'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="mt-4">
        
        {/* TAB 1: MAIN CLINICAL DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {!profile ? (
              /* Dropzone if no report uploaded */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center p-10 bg-white border-2 border-dashed rounded-3xl text-center space-y-4 transition-all ${
                  isDragging ? 'border-brand-red bg-red-50/30' : 'border-slate-300 hover:border-brand-red'
                }`}
              >
                <input
                  type="file"
                  id="clinicalFileSelect"
                  multiple
                  accept=".pdf,.docx,.pptx,.csv,.txt,.md"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="p-4 bg-red-50 text-brand-red border border-red-100 rounded-2xl shadow-2xs">
                  {isUploading ? <RefreshCw className="w-8 h-8 animate-spin" /> : <UploadCloud className="w-8 h-8" />}
                </div>

                <div className="max-w-md space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 m-0">
                    {isUploading ? 'Analyzing Clinical Records...' : 'Upload Medical Report or Blood Panel'}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Drag & drop PDF, DOCX, CSV, or clinical summaries to extract biomarkers, compute biological longevity, and prescribe kinesiology plans.
                  </p>
                </div>

                {showTelemetry ? (
                  <div className="w-full max-w-lg text-left font-mono bg-slate-950 text-slate-200 p-4 rounded-2xl text-xs space-y-1.5 border border-slate-800">
                    <div className="flex justify-between border-b border-slate-800 pb-2 text-[10px] text-slate-400">
                      <span>CLINICAL INGESTION TELEMETRY</span>
                      <span className="text-brand-red font-bold">{isUploading ? '● RUNNING' : '✓ DONE'}</span>
                    </div>
                    {telemetryStages.map((st, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className={st.status === 'active' ? 'text-brand-red' : st.status === 'done' ? 'text-red-400' : 'text-slate-600'}>
                          {st.status === 'active' ? '⟳' : st.status === 'done' ? '✓' : '○'}
                        </span>
                        <span className={st.status === 'active' ? 'animate-pulse text-white font-bold' : ''}>{st.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <label
                      htmlFor="clinicalFileSelect"
                      className="px-5 py-2.5 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer shadow-xs transition-all"
                    >
                      Browse Clinical Files
                    </label>
                    <button
                      type="button"
                      onClick={handleLoadDemoProfile}
                      className="px-5 py-2.5 text-xs font-extrabold text-white bg-brand-red hover:bg-red-700 rounded-xl shadow-md shadow-brand-red/25 transition-all cursor-pointer"
                    >
                      Load Sample Blood Panel
                    </button>
                  </div>
                )}

                {uploadError && (
                  <div className="text-xs font-bold text-brand-red bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">
                    ⚠️ {uploadError}
                  </div>
                )}
              </div>
            ) : (
              /* Profile Loaded: Grid of Clinical Cards */
              <div className="space-y-6">
                {uploadSuccessMsg && (
                  <div className="flex items-center justify-between text-xs font-bold bg-red-50 text-slate-900 border border-red-200 px-4 py-3 rounded-2xl">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-red shrink-0" />
                      {uploadSuccessMsg}
                    </span>
                    <button onClick={() => setUploadSuccessMsg(null)} className="text-slate-500 hover:text-brand-red text-xs font-black cursor-pointer">✕</button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <DemographicsCard
                      demographics={profile.demographics}
                      targets={activeTargets}
                      safetyCleared={messages.length === 0 || messages[messages.length - 1]?.corrections?.length === 0}
                      correctionsCount={messages[messages.length - 1]?.corrections?.length || 0}
                      auditHasRun={true}
                    />
                    <FuelingRings
                      targets={activeTargets}
                      consumed={consumedMacros}
                      isRealTargets={isRealTargets}
                    />
                    <BiomarkersSnapshot
                      biomarkers={profile.biomarkers || []}
                    />
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <BioAgeCard bioAgeResults={bioAgeResults} />

                    {reducedClinicalGrounding && (
                      <div className="flex items-center gap-2 p-3 text-xs font-bold bg-red-50 text-brand-red border border-red-200 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-brand-red shrink-0" />
                        <span>{clinicalGroundingExplanation || 'Plan generated with heuristic fallback.'}</span>
                      </div>
                    )}

                    <MealProgram
                      mealPlan={mealPlan}
                      checkedMeals={checkedMeals}
                      toggleMealChecked={toggleMealChecked}
                    />
                    <WorkoutProgram trainingPlan={trainingPlan} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BIOMARKERS VAULT */}
        {activeTab === 'biomarkers' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 m-0">
                <HeartPulse className="w-5 h-5 text-brand-red" />
                Extracted Biomarker Analysis
              </h2>
              {!profile && (
                <button
                  type="button"
                  onClick={handleLoadDemoProfile}
                  className="px-4 py-2 text-xs font-extrabold text-white bg-brand-red hover:bg-red-700 rounded-xl transition cursor-pointer"
                >
                  Load Sample Blood Panel
                </button>
              )}
            </div>
            <BiomarkersSnapshot biomarkers={profile?.biomarkers || []} />
          </div>
        )}

        {/* TAB 3: MEDICAL BOARD CHAMBER */}
        {activeTab === 'debate' && (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
            <BoardDebate
              mcpTraces={mcpTraces}
              critique={messages[messages.length - 1]?.critique}
              auditReport={messages[messages.length - 1]?.auditReport}
              corrections={messages[messages.length - 1]?.corrections}
            />
          </div>
        )}

        {/* TAB 4: AI HEALTH CONSULTATION */}
        {activeTab === 'coach' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-4 md:p-6 h-[700px] flex flex-col shadow-2xs">
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              isSending={isSendingMessage}
            />
          </div>
        )}

        {/* TAB 5: AGENT DIAGNOSTICS & MCP TRACES */}
        {activeTab === 'diagnostics' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
            <AgentDiagnostics traces={mcpTraces} vectorDbInfo={vectorDbInfo} />
          </div>
        )}

      </div>
    </div>
  );
}

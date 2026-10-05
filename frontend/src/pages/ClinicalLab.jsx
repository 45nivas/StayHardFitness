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
  Sparkles,
  Layers,
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
  const [vectorDbInfo, setVectorDbInfo] = useState('ChromaDB + Cosine HNSW (PubMedBERT)');
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
  const [uploadWarning, setUploadWarning] = useState(null);
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
        setVectorDbInfo(res.data.vector_db || 'ChromaDB + Cosine HNSW');
        if (res.data.has_profile && res.data.profile) {
          setProfile(res.data.profile);
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
      setUploadWarning(null);
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
      const age = demographics.age || '?';

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
      setMealPlan(null);
      setTrainingPlan(null);
      setTargets(null);
      setBioAgeResults(null);
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
      alert('⚠️ PDF Export failed: Make sure a clinical report or query has been executed first.');
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

  // Pre-load demo profile for instant evaluation
  const handleLoadDemoProfile = () => {
    const demo = {
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
        { name: "Fasting Blood Glucose", value: 89, unit: "mg/dL", status: "Optimal", normal_range: "70 - 99 mg/dL", clinical_significance: "Optimal insulin sensitivity." },
        { name: "LDL Cholesterol", value: 104, unit: "mg/dL", status: "Elevated", normal_range: "0 - 99 mg/dL", clinical_significance: "Slight elevation. Optimize monounsaturated fats." },
        { name: "hs-CRP (Inflammation)", value: 0.8, unit: "mg/L", status: "Optimal", normal_range: "< 1.0 mg/L", clinical_significance: "Low systemic inflammation." },
        { name: "Total Testosterone", value: 710, unit: "ng/dL", status: "Optimal", normal_range: "300 - 1000 ng/dL", clinical_significance: "Strong androgenic capacity." },
        { name: "Vitamin D (25-OH)", value: 48, unit: "ng/mL", status: "Optimal", normal_range: "30 - 100 ng/mL", clinical_significance: "Sufficient immune and bone regulation." }
      ]
    };
    setProfile(demo);
    setUploadSuccessMsg("Sample clinical blood panel loaded. You can now consult the Clinical AI Board!");
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
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20 shadow-md shadow-amber-500/5">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Clinical Lab & Longevity Suite
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  Agentic RAG + MCP
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Multi-Agent Clinical Wellness, Blood Panel Analysis & Kinesiology Prescription
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || !profile}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
          >
            {isExportingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {isExportingPdf ? 'Compiling PDF...' : 'Download Clinical PDF'}
          </button>
          
          <button
            onClick={handleClearDatabase}
            disabled={isClearingDb}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 border border-dark-border rounded-lg transition-all"
            title="Reset Session"
          >
            <Trash2 className="w-4 h-4" />
            {isClearingDb ? 'Clearing...' : 'Reset Lab'}
          </button>
        </div>
      </div>

      {/* Engine Telemetry Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-dark-card border border-dark-border px-4 py-2.5 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Cpu className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-slate-800">Vector Engine:</span>
          <span className="font-mono text-slate-500">{vectorDbInfo}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 font-semibold border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            8 Active Agents (MCP Protocol)
          </span>
          {profile && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 font-semibold border border-blue-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Patient Profile Active
            </span>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-dark-border space-x-2 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all whitespace-nowrap ${
                isActive 
                  ? 'border-b-2 border-amber-500 text-amber-600 bg-amber-500/5' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="mt-6">
        
        {/* TAB 1: MAIN CLINICAL DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {!profile ? (
              /* Dropzone if no report uploaded */
              <div className="flex flex-col items-center justify-center p-8 bg-dark-card border-2 border-dashed border-amber-500/40 rounded-2xl text-center space-y-4 hover:border-amber-500 transition-all">
                <input
                  type="file"
                  id="clinicalFileSelect"
                  multiple
                  accept=".pdf,.docx,.pptx,.csv,.txt,.md"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="p-4 bg-amber-500/10 text-amber-600 rounded-full shadow-inner">
                  {isUploading ? <RefreshCw className="w-8 h-8 animate-spin" /> : <UploadCloud className="w-8 h-8" />}
                </div>

                <div className="max-w-md space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    {isUploading ? 'Analyzing Clinical Records...' : 'Upload Medical Report or Blood Panel'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Drag & drop PDF, DOCX, CSV, or clinical summaries to extract biomarkers, compute biological longevity, and prescribe kinesiology plans.
                  </p>
                </div>

                {showTelemetry ? (
                  <div className="w-full max-w-lg text-left font-mono bg-slate-950 text-emerald-400 p-4 rounded-xl text-xs space-y-1.5 shadow-inner">
                    <div className="flex justify-between border-b border-slate-800 pb-2 text-[10px] text-slate-400">
                      <span>CLINICAL INGESTION TELEMETRY</span>
                      <span>{isUploading ? '● RUNNING' : '✓ DONE'}</span>
                    </div>
                    {telemetryStages.map((st, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className={st.status === 'active' ? 'text-blue-400' : st.status === 'done' ? 'text-emerald-400' : 'text-slate-600'}>
                          {st.status === 'active' ? '⟳' : st.status === 'done' ? '✓' : '○'}
                        </span>
                        <span className={st.status === 'active' ? 'animate-pulse text-blue-300' : ''}>{st.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 pt-2">
                    <label
                      htmlFor="clinicalFileSelect"
                      className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer shadow-sm transition-all"
                    >
                      Browse Files
                    </label>
                    <button
                      type="button"
                      onClick={handleLoadDemoProfile}
                      className="px-4 py-2.5 text-xs font-semibold text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all"
                    >
                      Load Sample Blood Panel
                    </button>
                  </div>
                )}

                {uploadError && (
                  <div className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                    ⚠️ {uploadError}
                  </div>
                )}
              </div>
            ) : (
              /* Profile Loaded: Grid of Clinical Cards */
              <div className="space-y-6">
                {uploadSuccessMsg && (
                  <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2.5 rounded-xl">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      {uploadSuccessMsg}
                    </span>
                    <button onClick={() => setUploadSuccessMsg(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <DemographicsCard
                      demographics={profile.demographics}
                      targets={activeTargets}
                      safetyCleared={messages[messages.length - 1]?.corrections?.length === 0}
                      correctionsCount={messages[messages.length - 1]?.corrections?.length || 0}
                      auditHasRun={messages.length > 0 && messages[messages.length - 1]?.corrections !== undefined}
                    />
                    <FuelingRings
                      targets={activeTargets}
                      consumed={consumedMacros}
                      isRealTargets={isRealTargets}
                    />
                    <BiomarkersSnapshot
                      biomarkers={profile.biomarkers}
                    />
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <BioAgeCard bioAgeResults={bioAgeResults} />

                    {reducedClinicalGrounding && (
                      <div className="flex items-center gap-2 p-3 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
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
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-amber-500" />
              Extracted Biomarker Analysis
            </h2>
            <BiomarkersSnapshot biomarkers={profile?.biomarkers || []} />
          </div>
        )}

        {/* TAB 3: MEDICAL BOARD CHAMBER */}
        {activeTab === 'debate' && (
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <BoardDebate
              critique={messages[messages.length - 1]?.critique}
              auditReport={messages[messages.length - 1]?.auditReport}
              corrections={messages[messages.length - 1]?.corrections}
            />
          </div>
        )}

        {/* TAB 4: AI HEALTH CONSULTATION */}
        {activeTab === 'coach' && (
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 h-[720px] flex flex-col">
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              isSending={isSendingMessage}
            />
          </div>
        )}

        {/* TAB 5: AGENT DIAGNOSTICS & MCP TRACES */}
        {activeTab === 'diagnostics' && (
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <AgentDiagnostics traces={mcpTraces} />
          </div>
        )}

      </div>
    </div>
  );
}

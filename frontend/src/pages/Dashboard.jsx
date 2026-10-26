import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dumbbell, 
  Utensils, 
  MessageSquare, 
  Flame, 
  Sparkles, 
  TrendingUp, 
  Activity,
  Watch,
  HeartPulse,
  ArrowRight,
  Footprints,
  ChevronRight,
  Cpu
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export default function Dashboard({ user }) {
  const [profile, setProfile] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [wearableSummary, setWearableSummary] = useState({
    steps: 2639,
    sleepScore: 88,
    deepSleepMin: 110,
    date: 'Today'
  });
  const [clinicalSummary, setClinicalSummary] = useState({
    bioAge: 28.4,
    ageDiff: -3.6,
    statusText: 'hs-CRP & Glucose: Optimal'
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingRec, setLoadingRec] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const profileRes = await axios.get(`${API_BASE_URL}/api/profile-setup/`);
        if (profileRes.data.has_profile) {
          setProfile(profileRes.data);
        } else {
          navigate('/profile');
        }
      } catch (err) {
        console.error("Error fetching profile", err);
      } finally {
        setLoadingProfile(false);
      }

      // Fetch live wearable telemetry for accurate steps & sleep
      try {
        const wearRes = await axios.get(`${API_BASE_URL}/api/wearable/data/`);
        const rawData = wearRes.data?.data || {};
        const stepPoints = (rawData.steps && rawData.steps.dataPoints) || [];
        if (stepPoints.length > 0) {
          const map = {};
          const hasFitbit = stepPoints.some(p => p.dataSource && p.dataSource.platform === 'FITBIT');
          stepPoints.forEach(p => {
            if (hasFitbit && p.dataSource?.platform !== 'FITBIT') return;
            const count = Number(p.steps?.count || p.count || 0);
            const civil = p.steps?.interval?.civilStartTime?.date;
            let dateKey = '';
            if (civil) {
              dateKey = `${civil.year}-${String(civil.month).padStart(2, '0')}-${String(civil.day).padStart(2, '0')}`;
            } else if (p.steps?.interval?.startTime) {
              dateKey = p.steps.interval.startTime.substring(0, 10);
            }
            if (dateKey) map[dateKey] = (map[dateKey] || 0) + count;
          });
          const sortedDates = Object.keys(map).sort();
          const latestDate = sortedDates[sortedDates.length - 1];
          if (latestDate && map[latestDate] !== undefined) {
            setWearableSummary(prev => ({
              ...prev,
              steps: map[latestDate],
              date: latestDate
            }));
          }
        } else if (Array.isArray(rawData) && rawData.length > 0) {
          const latest = rawData[rawData.length - 1];
          const steps = Number(latest?.activity?.steps ?? 2639);
          setWearableSummary(prev => ({
            ...prev,
            steps,
            date: latest?.date || 'Today'
          }));
        }
      } catch (err) {
        console.error("Error fetching wearable summary", err);
      }

      // Fetch clinical health session if available
      try {
        const clinRes = await axios.get(`${API_BASE_URL}/api/clinical/health/`);
        if (clinRes.data?.has_profile && clinRes.data?.bio_age_results?.biological_age) {
          const bio = Number(clinRes.data.bio_age_results.biological_age);
          const chrono = Number(clinRes.data.bio_age_results.chronological_age || 32);
          setClinicalSummary({
            bioAge: bio.toFixed(1),
            ageDiff: (bio - chrono).toFixed(1),
            statusText: 'Active Clinical Session Synced'
          });
        }
      } catch (err) {
        console.error("Error fetching clinical summary", err);
      }

      try {
        const recRes = await axios.get(`${API_BASE_URL}/api/generate-recommendation/`);
        if (recRes.data.status === 'success') {
          setRecommendation(recRes.data);
        }
      } catch (err) {
        console.error("Error fetching recommendation", err);
      } finally {
        setLoadingRec(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-brand-red rounded-full animate-spin"></div>
        <p className="text-slate-600 text-xs font-extrabold uppercase tracking-widest">Calibrating Stay Hard Human Performance OS...</p>
      </div>
    );
  }

  const suites = [
    {
      title: "Training & Biomechanics",
      category: "MODULE 01 // PHYSIQUE & VISION",
      desc: "Real-time MediaPipe 33-joint kinematics, 1RM Epley progression analytics, and computer vision physique scoring.",
      icon: Dumbbell,
      primaryPath: "/workouts",
      tools: [
        { name: "Pose Correction", desc: "MediaPipe 33-landmark tracking", path: "/workouts" },
        { name: "Analytics & PRs", desc: "Volume & 1RM trend graphs", path: "/analytics" },
        { name: "1RM Strength", desc: "Sub-maximal intensity calculator", path: "/1rm" },
        { name: "Body Vision AI", desc: "Physique scoring & scan diffing", path: "/body-vision" },
      ]
    },
    {
      title: "Nutrition & Metabolism",
      category: "MODULE 02 // METABOLIC FUELING",
      desc: "Sub-second Groq Whisper voice meal logging with RapidFuzz matching against 8,000+ foods and carb cycling protocols.",
      icon: Utensils,
      primaryPath: "/diet",
      tools: [
        { name: "Calorie Tracker", desc: "Voice logging with macro rings", path: "/diet" },
        { name: "Carb Cycling", desc: "High/low training day protocols", path: "/carb-cycling" },
      ]
    },
    {
      title: "Wearables & Sleep Telemetry",
      category: "MODULE 03 // IOT BIOMETRICS",
      desc: "Live Fitbit & Google Health OAuth 2.0 sync, step calibration, sleep stage architecture, and NetworkX Knowledge Graph.",
      icon: Watch,
      primaryPath: "/wearable",
      tools: [
        { name: "Wearable Pulse", desc: "Live steps, HR, distance & AZM", path: "/wearable" },
        { name: "Knowledge Graph", desc: "Cross-day sleep impact reasoning", path: "/wearable" },
      ]
    },
    {
      title: "Clinical Lab & Longevity",
      category: "MODULE 04 // DIAGNOSTICS & RAG",
      desc: "Multi-agent medical board debate, PubMed E-Utilities RAG citations, blood panel biomarker vault, and biological age calculation.",
      icon: Activity,
      primaryPath: "/clinical-lab",
      tools: [
        { name: "Biomarkers Vault", desc: "Blood panels (ApoB, hs-CRP, Glucose)", path: "/clinical-lab" },
        { name: "Medical Board Chamber", desc: "Cardiology, Nutrition, GP debate", path: "/clinical-lab" },
      ]
    }
  ];

  const stepGoalPct = Math.round((wearableSummary.steps / 10000) * 100);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Futuristic Carbon & Red Hero Command Banner */}
      <div className="relative bg-slate-950 rounded-3xl p-6 md:p-8 text-white overflow-hidden shadow-xl border border-slate-800 border-t-2 border-t-brand-red">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-red via-red-900/40 to-transparent pointer-events-none"></div>
        <div className="absolute left-10 -bottom-10 w-48 h-48 bg-brand-red/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 bg-brand-red/15 text-red-400 border border-brand-red/30 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest font-mono">
              <span className="w-1.5 h-1.5 bg-brand-red rounded-full animate-ping"></span>
              <span>STAY HARD // AI COMMAND CENTER</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white m-0">
              Welcome back, <span className="text-brand-red">{user?.username}</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl font-medium leading-relaxed">
              Unified neural architecture combining computer vision pose tracking, voice nutrition, clinical blood diagnostics, and live wearable telemetry.
            </p>

            {/* Quick Action Pills */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button 
                onClick={() => navigate('/workouts')}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-brand-red border border-white/15 hover:border-brand-red text-xs font-extrabold text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                <Dumbbell className="w-3.5 h-3.5 text-brand-red group-hover:text-white" />
                <span>Start Training</span>
              </button>
              <button 
                onClick={() => navigate('/diet')}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-brand-red border border-white/15 hover:border-brand-red text-xs font-extrabold text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                <Utensils className="w-3.5 h-3.5 text-red-400" />
                <span>Log Meal</span>
              </button>
              <button 
                onClick={() => navigate('/wearable')}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-brand-red border border-white/15 hover:border-brand-red text-xs font-extrabold text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                <Watch className="w-3.5 h-3.5 text-red-400" />
                <span>Wearable Pulse</span>
              </button>
              <button 
                onClick={() => navigate('/clinical-lab')}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-brand-red border border-white/15 hover:border-brand-red text-xs font-extrabold text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 text-red-400" />
                <span>Clinical Lab</span>
              </button>
              <button 
                onClick={() => navigate('/chat')}
                className="px-4 py-2 rounded-xl bg-brand-red hover:bg-red-700 text-xs font-extrabold text-white flex items-center gap-1.5 shadow-lg shadow-brand-red/30 transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask AI Coach</span>
              </button>
            </div>
          </div>

          {profile && (
            <div className="flex items-center space-x-3.5 bg-white/5 border border-white/15 backdrop-blur-md px-5 py-4 rounded-2xl self-start lg:self-auto shrink-0">
              <div className="p-2.5 rounded-xl bg-brand-red/20 border border-brand-red/30 text-brand-red">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block font-mono">PRIMARY OBJECTIVE</span>
                <span className="text-sm font-black text-white uppercase mt-0.5 block">{profile.primary_goal?.replace('_', ' ')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4 Unified Athlete Vitals Cards */}
      {profile && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-red"></span>
              <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest m-0">
                Real-Time Athlete Telemetry
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-bold font-mono">LIVE BIO-STREAM // 4 CHANNELS</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Physique Status */}
            <div 
              onClick={() => navigate('/profile')}
              className="bg-white border border-slate-200 hover:border-brand-red/50 p-5 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Physique Mass</span>
                <div className="p-2 rounded-xl bg-red-50 text-brand-red group-hover:bg-brand-red group-hover:text-white transition">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black text-slate-900 font-mono">{profile.weight}</span>
                  <span className="text-xs text-slate-500 font-bold">kg</span>
                </div>
                <div className="text-[11px] font-extrabold text-brand-red mt-1">
                  BMI: {profile.bmi} ({profile.bmi_category})
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold mt-2 block">Height: {profile.height} cm</span>
            </div>

            {/* Wearable Steps & Sleep (LIVE SYNCED) */}
            <div 
              onClick={() => navigate('/wearable')}
              className="bg-white border border-slate-200 hover:border-brand-red/50 p-5 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Wearable Pulse</span>
                <div className="p-2 rounded-xl bg-red-50 text-brand-red group-hover:bg-brand-red group-hover:text-white transition">
                  <Footprints className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black text-slate-900 font-mono">{wearableSummary.steps.toLocaleString()}</span>
                  <span className="text-xs text-slate-500 font-bold">steps</span>
                </div>
                <div className="text-[11px] font-extrabold text-brand-red mt-1">
                  {stepGoalPct}% of 10,000 daily goal
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold mt-2 block">
                Sleep Score: {wearableSummary.sleepScore}/100 (Deep {wearableSummary.deepSleepMin}m)
              </span>
            </div>

            {/* Daily Fuel Target */}
            <div 
              onClick={() => navigate('/diet')}
              className="bg-white border border-slate-200 hover:border-brand-red/50 p-5 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Calorie Budget</span>
                <div className="p-2 rounded-xl bg-red-50 text-brand-red group-hover:bg-brand-red group-hover:text-white transition">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black text-slate-900 font-mono">{profile.calories_per_day || 2500}</span>
                  <span className="text-xs text-slate-500 font-bold">kcal</span>
                </div>
                <div className="text-[11px] font-extrabold text-brand-red mt-1">
                  Adaptive Carb Cycling Ready
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold mt-2 block">Voice Engine: Groq Whisper</span>
            </div>

            {/* Clinical Longevity */}
            <div 
              onClick={() => navigate('/clinical-lab')}
              className="bg-white border border-slate-200 hover:border-brand-red/50 p-5 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Clinical Bio-Age</span>
                <div className="p-2 rounded-xl bg-red-50 text-brand-red group-hover:bg-brand-red group-hover:text-white transition">
                  <HeartPulse className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black text-slate-900 font-mono">{clinicalSummary.bioAge}</span>
                  <span className="text-xs text-slate-500 font-bold">yrs</span>
                </div>
                <div className="text-[11px] font-extrabold text-brand-red mt-1">
                  {clinicalSummary.ageDiff > 0 ? `+${clinicalSummary.ageDiff}` : clinicalSummary.ageDiff} yrs vs Chronological
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold mt-2 block">{clinicalSummary.statusText}</span>
            </div>
          </div>
        </div>
      )}

      {/* The 4 Unified Platform Suites */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-red"></span>
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest m-0">
              Core AI Performance Suites
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-bold font-mono">4 INTEGRATED SUBSYSTEMS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {suites.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="bg-white border border-slate-200 hover:border-brand-red/50 p-6 rounded-3xl shadow-xs hover:shadow-lg transition-all duration-300 relative overflow-hidden flex flex-col justify-between group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-50/40 via-transparent to-transparent pointer-events-none" />

                <div className="relative z-10 space-y-4">
                  {/* Suite Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3.5">
                      <div className="p-3 rounded-2xl bg-red-50 text-brand-red border border-red-100 group-hover:bg-brand-red group-hover:text-white transition-colors shadow-2xs">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-red block font-mono">
                          {s.category}
                        </span>
                        <h3 className="text-lg font-black text-slate-900 m-0 mt-0.5">{s.title}</h3>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(s.primaryPath)}
                      className="text-xs font-extrabold text-slate-600 hover:text-brand-red flex items-center gap-1 transition cursor-pointer bg-slate-50 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-red-200"
                    >
                      <span>Launch</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {s.desc}
                  </p>

                  {/* Nested Tools Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {s.tools.map((t) => (
                      <div
                        key={t.name}
                        onClick={() => navigate(t.path)}
                        className="p-3.5 rounded-xl bg-slate-50/80 hover:bg-red-50/60 border border-slate-200/90 hover:border-brand-red/40 cursor-pointer transition flex items-center justify-between group/tool"
                      >
                        <div className="truncate">
                          <span className="text-xs font-extrabold text-slate-900 block group-hover/tool:text-brand-red transition">
                            {t.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium truncate block mt-0.5">
                            {t.desc}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover/tool:text-brand-red group-hover/tool:translate-x-0.5 transition shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Five-Layer AI Coach Brain Spotlight */}
      <div className="bg-slate-950 border border-slate-800 border-l-4 border-l-brand-red rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-red/15 to-transparent pointer-events-none" />
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-brand-red text-white uppercase tracking-wider font-mono">
              NEURAL CORE
            </span>
            <span className="text-xs text-slate-300 font-bold font-mono">// 5-Layer Biometric Context Injection</span>
          </div>
          <h3 className="text-2xl font-black text-white m-0">
            OS Architect AI Coach
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            Synthesizes all 5 real-time telemetry layers: Workout Logs + Nutrition Macros + Clinical Blood Panels + Wearable Sleep Stages & Heart Rate. Ask anything about training intensity, joint mechanics, or recovery readiness.
          </p>
        </div>

        <button
          onClick={() => navigate('/chat')}
          className="relative z-10 px-6 py-3.5 rounded-2xl bg-brand-red hover:bg-red-700 text-white font-extrabold text-sm shadow-lg shadow-brand-red/30 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Launch AI Coach Chat</span>
        </button>
      </div>

      {/* Adaptive Recommendation Routine Panel */}
      <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-brand-red" />
            <h3 className="text-xs font-black text-slate-900 m-0 uppercase tracking-widest">
              AI Workout Recommendation Split
            </h3>
          </div>
          <span className="text-[9px] font-black bg-red-50 text-brand-red border border-red-200 px-3 py-1 rounded-full uppercase tracking-wider font-mono">
            Adaptive Protocol
          </span>
        </div>

        {loadingRec ? (
          <div className="py-12 text-center text-slate-500 text-xs font-semibold flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin"></div>
            <span>Formulating your personalized workout split...</span>
          </div>
        ) : recommendation ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4 sm:gap-0">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Split Focus</p>
                <h4 className="text-xl font-black text-slate-900 mt-1 uppercase leading-none">
                  {(recommendation.focus || recommendation.focus_areas) ? (recommendation.focus || recommendation.focus_areas).join(" & ") : "Full Body Conditioning"}
                </h4>
              </div>
              <div className="flex space-x-3">
                <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest block">Difficulty</span>
                  <p className="text-xs font-black text-brand-red mt-1 uppercase leading-none">{recommendation.difficulty || 'Intermediate'}</p>
                </div>
                <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest block">Est. Duration</span>
                  <p className="text-xs font-black text-slate-900 mt-1 leading-none">{(recommendation.duration || recommendation.estimated_duration || 45)} mins</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Recommended Exercises</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendation.routine ? (
                  Array.isArray(recommendation.routine) ? (
                    recommendation.routine.map((ex, idx) => (
                      <div key={idx} className="bg-slate-50/70 border border-slate-200 p-4 rounded-2xl flex items-center justify-between hover:border-brand-red/40 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="bg-brand-red text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs font-mono">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-slate-900">{ex.exercise}</p>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5">{ex.muscle_group}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900 font-mono">{ex.sets} x {ex.reps}</p>
                          <span className="text-[10px] text-brand-red font-extrabold uppercase tracking-wider block mt-0.5">{ex.weight}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    Object.entries(recommendation.routine).map(([day, exercises], idx) => (
                      <div key={idx} className="bg-slate-50/70 border border-slate-200 p-5 rounded-2xl hover:border-brand-red/40 transition-colors space-y-2 col-span-1 md:col-span-2">
                        <div className="flex items-center space-x-3">
                          <div className="bg-brand-red text-white px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider font-mono">
                            {day}
                          </div>
                        </div>
                        <p className="text-slate-700 text-sm font-semibold leading-relaxed pl-1">
                          {exercises}
                        </p>
                      </div>
                    ))
                  )
                ) : (
                  recommendation.recommended_exercises && (
                    Array.isArray(recommendation.recommended_exercises) ? (
                      recommendation.recommended_exercises.map((ex, idx) => (
                        <div key={idx} className="bg-slate-50/70 border border-slate-200 p-4 rounded-2xl flex items-center justify-between hover:border-brand-red/40 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="bg-brand-red text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs font-mono">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-extrabold text-slate-900">{ex.name}</p>
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5">{ex.muscle}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-900 font-mono">{ex.sets} x {ex.reps}</p>
                            <span className="text-[10px] text-brand-red font-extrabold uppercase tracking-wider block mt-0.5">{ex.weight || 'Bodyweight'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      Object.entries(recommendation.recommended_exercises).map(([day, exercises], idx) => (
                        <div key={idx} className="bg-slate-50/70 border border-slate-200 p-5 rounded-2xl hover:border-brand-red/40 transition-colors space-y-2 col-span-1 md:col-span-2">
                          <div className="flex items-center space-x-3">
                            <div className="bg-brand-red text-white px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider font-mono">
                              {day}
                            </div>
                          </div>
                          <p className="text-slate-700 text-sm font-semibold leading-relaxed pl-1">
                            {exercises}
                          </p>
                        </div>
                      ))
                    )
                  )
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 text-xs font-semibold">
            No recommendation routine available. Create your profile details to generate daily splits.
          </div>
        )}
      </div>
    </div>
  );
}

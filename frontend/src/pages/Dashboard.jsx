import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Dumbbell, 
  Utensils, 
  Calculator, 
  MessageSquare, 
  Camera, 
  Flame, 
  Sparkles, 
  TrendingUp, 
  Activity,
  Watch,
  HeartPulse,
  ArrowRight,
  ShieldCheck,
  Footprints,
  Clock,
  Zap,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export default function Dashboard({ user }) {
  const [profile, setProfile] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
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
        <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-semibold">Calibrating Stay Hard Human Performance OS...</p>
      </div>
    );
  }

  const suites = [
    {
      title: "Training & Biomechanics",
      category: "PHYSIQUE & STRENGTH",
      desc: "Real-time MediaPipe joint kinematics, 1RM Epley progression analytics, and physique progress vision.",
      icon: Dumbbell,
      accent: "from-red-500/10 to-transparent",
      borderHover: "hover:border-red-500/40",
      iconBg: "bg-red-500/10 text-red-500",
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
      category: "FUEL & ENERGY",
      desc: "Sub-second Groq Whisper voice meal logging with RapidFuzz and adaptive carb cycling targets.",
      icon: Utensils,
      accent: "from-orange-500/10 to-transparent",
      borderHover: "hover:border-orange-500/40",
      iconBg: "bg-orange-500/10 text-orange-500",
      primaryPath: "/diet",
      tools: [
        { name: "Calorie Tracker", desc: "Voice logging with macro rings", path: "/diet" },
        { name: "Carb Cycling", desc: "High/low training day protocols", path: "/carb-cycling" },
      ]
    },
    {
      title: "Wearables & Sleep Telemetry",
      category: "IOT BIOMETRICS",
      desc: "Google Health API v4 sync, 15k+ daily band steps, sleep architecture, and NetworkX Knowledge Graph.",
      icon: Watch,
      accent: "from-indigo-500/10 to-transparent",
      borderHover: "hover:border-indigo-500/40",
      iconBg: "bg-indigo-500/10 text-indigo-500",
      primaryPath: "/wearable",
      tools: [
        { name: "Fitbit Pulse", desc: "Live steps, HR, distance & AZM", path: "/wearable" },
        { name: "Knowledge Graph", desc: "Cross-day sleep impact reasoning", path: "/wearable" },
      ]
    },
    {
      title: "Clinical Lab & Longevity",
      category: "DIAGNOSTICS & RAG",
      desc: "10-Agent MCP medical board debate, blood panel biomarker vault, and biological age calculation.",
      icon: Activity,
      accent: "from-amber-500/10 to-transparent",
      borderHover: "hover:border-amber-500/40",
      iconBg: "bg-amber-500/10 text-amber-500",
      primaryPath: "/clinical-lab",
      tools: [
        { name: "Biomarkers Vault", desc: "Blood panels (ApoB, hs-CRP, Glucose)", path: "/clinical-lab" },
        { name: "Medical Board Chamber", desc: "Cardiology, Nutrition, GP debate", path: "/clinical-lab" },
      ]
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Hero Welcome Banner */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-850 to-slate-950 rounded-3xl p-6 md:p-8 text-white overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-red via-indigo-600 to-transparent pointer-events-none"></div>
        <div className="absolute left-10 -bottom-10 w-48 h-48 bg-brand-red/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-brand-red/20 text-brand-red border border-brand-red/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-brand-red rounded-full animate-ping"></span>
              <span>UNIFIED ATHLETE PLATFORM</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white m-0">
              Welcome back, {user?.username}!
            </h1>
            <p className="text-slate-400 text-sm max-w-xl font-medium leading-relaxed">
              Stay Hard OS unites computer vision pose tracking, voice nutrition, clinical blood diagnostics, and wearable telemetry into one intelligence platform.
            </p>

            {/* Quick Action Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button 
                onClick={() => navigate('/workouts')}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition"
              >
                <Dumbbell className="w-3.5 h-3.5 text-brand-red" />
                <span>Start Training</span>
              </button>
              <button 
                onClick={() => navigate('/diet')}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition"
              >
                <Utensils className="w-3.5 h-3.5 text-orange-400" />
                <span>Log Meal</span>
              </button>
              <button 
                onClick={() => navigate('/wearable')}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition"
              >
                <Watch className="w-3.5 h-3.5 text-indigo-400" />
                <span>Wearable Pulse</span>
              </button>
              <button 
                onClick={() => navigate('/clinical-lab')}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition"
              >
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>Clinical Lab</span>
              </button>
              <button 
                onClick={() => navigate('/chat')}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask AI Coach</span>
              </button>
            </div>
          </div>

          {profile && (
            <div className="flex items-center space-x-3 bg-white/5 border border-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl self-start lg:self-auto shrink-0 shadow-inner">
              <Activity className="w-6 h-6 text-brand-red animate-pulse" />
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">CURRENT GOAL</span>
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
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Athlete Health & Performance Vitals
            </h2>
            <span className="text-xs text-slate-400 font-semibold">Continuous Cross-System Telemetry</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Physique Status */}
            <div className="bg-dark-card border border-dark-border p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Physique Weight</span>
                <div className="p-2 rounded-xl bg-red-50 text-brand-red group-hover:bg-brand-red group-hover:text-white transition">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black text-slate-900">{profile.weight}</span>
                  <span className="text-xs text-slate-400 font-bold">kg</span>
                </div>
                <div className="text-[10px] font-bold text-brand-red mt-1">
                  BMI: {profile.bmi} ({profile.bmi_category})
                </div>
              </div>
              <span className="text-[9px] text-slate-400 font-semibold mt-2 block">Standing Height: {profile.height} cm</span>
            </div>

            {/* Wearable Steps & Sleep */}
            <div className="bg-dark-card border border-dark-border p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Wearable Pulse</span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <Footprints className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black text-slate-900">15,450</span>
                  <span className="text-xs text-slate-400 font-bold">steps</span>
                </div>
                <div className="text-[10px] font-bold text-emerald-600 mt-1">
                  154% of 10,000 daily goal
                </div>
              </div>
              <span className="text-[9px] text-slate-400 font-semibold mt-2 block">Sleep Recovery: 88/100 (Deep 110m)</span>
            </div>

            {/* Daily Fuel Target */}
            <div className="bg-dark-card border border-dark-border p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Calorie Budget</span>
                <div className="p-2 rounded-xl bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black text-slate-900">{profile.calories_per_day || 2500}</span>
                  <span className="text-xs text-slate-400 font-bold">kcal</span>
                </div>
                <div className="text-[10px] font-bold text-orange-600 mt-1">
                  Adaptive Carb Cycling enabled
                </div>
              </div>
              <span className="text-[9px] text-slate-400 font-semibold mt-2 block">Voice Logged: Groq Whisper</span>
            </div>

            {/* Clinical Longevity */}
            <div className="bg-dark-card border border-dark-border p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Clinical Bio-Age</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition">
                  <HeartPulse className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black text-slate-900">28.4</span>
                  <span className="text-xs text-slate-400 font-bold">yrs</span>
                </div>
                <div className="text-[10px] font-bold text-emerald-600 mt-1">
                  -3.6 yrs vs Chronological Age
                </div>
              </div>
              <span className="text-[9px] text-slate-400 font-semibold mt-2 block">hs-CRP & Glucose: Optimal</span>
            </div>
          </div>
        </div>
      )}

      {/* The 4 Unified Platform Suites */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Core Performance Suites
          </h2>
          <span className="text-xs text-slate-400 font-semibold">Organized into 4 Modular Pillars</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {suites.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className={`bg-dark-card border border-dark-border ${s.borderHover} p-6 rounded-3xl shadow-sm transition-all duration-300 relative overflow-hidden flex flex-col justify-between`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} pointer-events-none`} />

                <div className="relative z-10 space-y-4">
                  {/* Suite Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-2xl ${s.iconBg} shadow-sm`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                          {s.category}
                        </span>
                        <h3 className="text-lg font-black text-slate-900 m-0">{s.title}</h3>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(s.primaryPath)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {s.desc}
                  </p>

                  {/* Nested Tools Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {s.tools.map((t) => (
                      <div
                        key={t.name}
                        onClick={() => navigate(t.path)}
                        className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-200/70 dark:border-slate-800 cursor-pointer transition flex items-center justify-between group"
                      >
                        <div className="truncate">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-brand-red transition">
                            {t.name}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                            {t.desc}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-red group-hover:translate-x-0.5 transition shrink-0 ml-2" />
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
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/30 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider">
              CENTRAL AI BRAIN
            </span>
            <span className="text-xs text-indigo-200/80 font-bold">• 5-Layer Context Injection</span>
          </div>
          <h3 className="text-2xl font-black text-white m-0">
            OS Architect AI Coach
          </h3>
          <p className="text-sm text-indigo-200/80 leading-relaxed font-medium">
            Your AI coach connects all 5 layers: Workout Logs + Nutrition Macros + Clinical Blood Panels + Wearable Sleep Stages & Heart Rate. Ask anything about training intensity, joint mechanics, or recovery readiness.
          </p>
        </div>

        <button
          onClick={() => navigate('/chat')}
          className="relative z-10 px-6 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 shrink-0"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Launch AI Coach Chat</span>
        </button>
      </div>

      {/* Adaptive Recommendation Routine Panel */}
      <div className="bg-dark-card border border-dark-border p-6 rounded-3xl shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-dark-border pb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-brand-red animate-pulse" />
            <h3 className="text-xs font-black text-slate-900 m-0 uppercase tracking-widest">
              AI Workout Recommendation Split
            </h3>
          </div>
          <span className="text-[8px] font-black bg-brand-red/10 text-brand-red border border-brand-red/15 px-2.5 py-1 rounded-md uppercase tracking-wider">
            Adaptive Protocol
          </span>
        </div>

        {loadingRec ? (
          <div className="py-12 text-center text-slate-450 text-xs font-semibold flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin"></div>
            <span>Formulating your personalized workout split...</span>
          </div>
        ) : recommendation ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-dark-border pb-4 gap-4 sm:gap-0">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Target Split Focus</p>
                <h4 className="text-xl font-black text-slate-900 mt-1 uppercase leading-none">
                  {(recommendation.focus || recommendation.focus_areas) ? (recommendation.focus || recommendation.focus_areas).join(" & ") : "Full Body Conditioning"}
                </h4>
              </div>
              <div className="flex space-x-3">
                <div className="bg-white px-4 py-2.5 rounded-xl border border-dark-border text-center shadow-sm">
                  <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block">Difficulty</span>
                  <p className="text-xs font-black text-brand-red mt-1 uppercase leading-none">{recommendation.difficulty || 'Intermediate'}</p>
                </div>
                <div className="bg-white px-4 py-2.5 rounded-xl border border-dark-border text-center shadow-sm">
                  <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block">Est. Duration</span>
                  <p className="text-xs font-black text-slate-900 mt-1 leading-none">{(recommendation.duration || recommendation.estimated_duration || 45)} mins</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Recommended Exercises</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendation.routine ? (
                  Array.isArray(recommendation.routine) ? (
                    recommendation.routine.map((ex, idx) => (
                      <div key={idx} className="bg-white border border-dark-border p-4 rounded-2xl flex items-center justify-between shadow-sm hover:border-slate-300 transition-colors duration-250">
                        <div className="flex items-center space-x-3">
                          <div className="bg-brand-red/10 text-brand-red w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{ex.exercise}</p>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">{ex.muscle_group}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">{ex.sets} x {ex.reps}</p>
                          <span className="text-[9px] text-brand-red font-bold uppercase tracking-wider block mt-0.5">{ex.weight}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    Object.entries(recommendation.routine).map(([day, exercises], idx) => (
                      <div key={idx} className="bg-white border border-dark-border p-5 rounded-2xl shadow-sm hover:border-slate-300 transition-colors duration-250 space-y-2 col-span-1 md:col-span-2">
                        <div className="flex items-center space-x-3">
                          <div className="bg-brand-red/10 text-brand-red px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider">
                            {day}
                          </div>
                        </div>
                        <p className="text-slate-650 text-sm font-semibold leading-relaxed pl-1">
                          {exercises}
                        </p>
                      </div>
                    ))
                  )
                ) : (
                  recommendation.recommended_exercises && (
                    Array.isArray(recommendation.recommended_exercises) ? (
                      recommendation.recommended_exercises.map((ex, idx) => (
                        <div key={idx} className="bg-white border border-dark-border p-4 rounded-2xl flex items-center justify-between shadow-sm hover:border-slate-300 transition-colors duration-250">
                          <div className="flex items-center space-x-3">
                            <div className="bg-brand-red/10 text-brand-red w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{ex.name}</p>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">{ex.muscle}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-900">{ex.sets} x {ex.reps}</p>
                            <span className="text-[9px] text-brand-red font-bold uppercase tracking-wider block mt-0.5">{ex.weight || 'Bodyweight'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      Object.entries(recommendation.recommended_exercises).map(([day, exercises], idx) => (
                        <div key={idx} className="bg-white border border-dark-border p-5 rounded-2xl shadow-sm hover:border-slate-300 transition-colors duration-250 space-y-2 col-span-1 md:col-span-2">
                          <div className="flex items-center space-x-3">
                            <div className="bg-brand-red/10 text-brand-red px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider">
                              {day}
                            </div>
                          </div>
                          <p className="text-slate-650 text-sm font-semibold leading-relaxed pl-1">
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
          <div className="py-8 text-center text-slate-400 text-xs font-semibold">
            No recommendation routine available. Create your profile details to generate daily splits.
          </div>
        )}
      </div>
    </div>
  );
}

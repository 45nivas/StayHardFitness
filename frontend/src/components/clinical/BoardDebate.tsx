import React, { useState, useEffect, useRef } from 'react';
import type { AgentTrace } from '../types';
import { BookOpen, ShieldAlert, Award, Dumbbell, Apple, Heart, User, CheckCircle, AlertTriangle, Play, HelpCircle, Users } from 'lucide-react';

interface BoardDebateProps {
  mcpTraces?: AgentTrace[];
  critique?: any;
  auditReport?: string | null;
  corrections?: string[];
}

export const BoardDebate: React.FC<BoardDebateProps> = ({ mcpTraces = [] }) => {
  const safeTraces = Array.isArray(mcpTraces) ? mcpTraces : [];
  const [visibleCount, setVisibleCount] = useState<number>(safeTraces.length);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (safeTraces.length > 0) {
      setVisibleCount(safeTraces.length);
      setIsPlaying(false);
    } else {
      setVisibleCount(0);
      setIsPlaying(false);
    }
  }, [safeTraces.length]);

  useEffect(() => {
    if (isPlaying && visibleCount < safeTraces.length) {
      timerRef.current = setTimeout(() => {
        setVisibleCount(prev => prev + 1);
      }, 900);
    } else {
      setIsPlaying(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, visibleCount, safeTraces.length]);

  useEffect(() => {
    if (isPlaying) {
      containerEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleCount, isPlaying]);

  const handleRestart = () => {
    setVisibleCount(1);
    setIsPlaying(true);
  };

  const getAgentMeta = (sender: string) => {
    switch (sender) {
      case 'IngestionAgent':
        return {
          title: 'Document Ingestion Parser',
          icon: BookOpen,
          color: '#0F172A',
          bg: '#F8FAFC',
          border: '1px solid #E2E8F0',
        };
      case 'ClinicalAnalyzerAgent':
        return {
          title: 'Biomarker Extraction Analyst',
          icon: ShieldAlert,
          color: '#E50914',
          bg: '#FEF2F2',
          border: '1px solid #FECACA',
        };
      case 'WebResearchAgent':
        return {
          title: 'Clinical Research Librarian (PubMed)',
          icon: BookOpen,
          color: '#0F172A',
          bg: '#F8FAFC',
          border: '1px solid #E2E8F0',
        };
      case 'BioAgeCalculatorAgent':
        return {
          title: 'Lead Gerontologist & Longevity Specialist',
          icon: Heart,
          color: '#E50914',
          bg: '#FEF2F2',
          border: '1px solid #FECACA',
        };
      case 'ClinicalKinesiologyAgent':
        return {
          title: 'Sports Physiologist & Kinesiologist',
          icon: Dumbbell,
          color: '#0F172A',
          bg: '#F8FAFC',
          border: '1px solid #E2E8F0',
        };
      case 'NutriPlannerAgent':
        return {
          title: 'Clinical Sports Nutritionist',
          icon: Apple,
          color: '#E50914',
          bg: '#FEF2F2',
          border: '1px solid #FECACA',
        };
      case 'SafetyAuditorAgent':
        return {
          title: 'Chief Safety Compliance Officer',
          icon: ShieldAlert,
          color: '#E50914',
          bg: '#FEF2F2',
          border: '2px solid #FCA5A5',
        };
      case 'ClinicalCritiqueAgent':
        return {
          title: 'President of the Medical Board',
          icon: Award,
          color: '#0F172A',
          bg: '#F8FAFC',
          border: '2px solid #CBD5E1',
        };
      case 'LLMResponseAgent':
        return {
          title: 'Patient Health Communicator',
          icon: User,
          color: '#0F172A',
          bg: '#FFFFFF',
          border: '1px solid #0F172A',
        };
      default:
        return {
          title: 'Clinical Advisor',
          icon: HelpCircle,
          color: '#475569',
          bg: '#FFFFFF',
          border: '1px solid #E2E8F0',
        };
    }
  };

  const renderPayload = (sender: string, payload: any) => {
    if (!payload) return null;

    try {
      if (sender === 'BioAgeCalculatorAgent' && payload.bio_age_results) {
        const res = payload.bio_age_results;
        return (
          <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 font-sans text-xs flex flex-wrap gap-4 text-slate-800">
            <div><b>Chronological:</b> {res.chronological_age} yrs</div>
            <div><b>Biological:</b> <span className="text-brand-red font-bold">{res.biological_age} yrs</span></div>
            <div><b>Longevity Index:</b> {res.longevity_score}%</div>
            <div className="w-full"><b>Pathway Cellular Target:</b> {res.pathway_focus}</div>
          </div>
        );
      }

      if (sender === 'ClinicalKinesiologyAgent' && payload.training_plan) {
        const res = payload.training_plan;
        return (
          <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 font-sans text-xs text-slate-800">
            <div className="mb-2"><b>Split:</b> {res.weekly_split}</div>
            <div className="text-[10px] uppercase font-extrabold text-brand-red tracking-wider mb-1">Prescribed Workouts:</div>
            <ul className="list-disc pl-4 space-y-1">
              {res.exercises?.slice(0, 3).map((ex: any, idx: number) => (
                <li key={idx}><b>{ex.name}</b> — {ex.sets} sets x {ex.reps} reps ({ex.intensity})</li>
              ))}
            </ul>
          </div>
        );
      }

      if (sender === 'NutriPlannerAgent' && payload.targets) {
        const res = payload.targets;
        return (
          <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 font-sans text-xs flex gap-4 text-slate-800">
            <div><b>Calorie Target:</b> {res.calories} kcal</div>
            <div><b>Macros:</b> P: {res.protein}g | C: {res.carbs}g | F: {res.fats}g</div>
          </div>
        );
      }

      if (sender === 'SafetyAuditorAgent') {
        const hasCorrections = payload.corrections_made && payload.corrections_made.length > 0 && !payload.corrections_made[0].includes("Standard safety");
        return (
          <div className="mt-3 font-sans">
            {hasCorrections ? (
              <div className="p-3 rounded-xl text-xs mb-2 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-900">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-brand-red" />
                <div>
                  <div className="font-extrabold text-brand-red uppercase tracking-wider text-[10px] mb-0.5">COMPLIANCE CRITICAL OVERRIDE ENFORCED</div>
                  <ul className="list-disc pl-4 space-y-1 mt-1">
                    {payload.corrections_made.map((corr: string, idx: number) => (
                      <li key={idx} className="font-semibold">{corr}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl text-xs mb-2 flex items-center gap-2 bg-slate-900 text-white">
                <CheckCircle size={14} className="text-brand-red" />
                <span className="font-extrabold uppercase tracking-wider text-[10px]">Allergen & Joint Safety Audits Cleared</span>
              </div>
            )}
            <div className="text-xs text-slate-600 font-medium mt-1">{payload.audit_report}</div>
          </div>
        );
      }

      if (sender === 'ClinicalCritiqueAgent' && payload.critique) {
        const res = payload.critique;
        return (
          <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 font-sans text-xs text-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase font-extrabold text-slate-500">Review Board Verdict:</span>
              <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-red-50 text-brand-red border border-red-200">{res.clinical_grade}</span>
            </div>
            <div><b>Pathway Mechanics:</b> {res.mechanics_explanation}</div>
          </div>
        );
      }

      if (typeof payload === 'string') {
        return <p className="mt-2 text-xs leading-relaxed text-slate-700 font-medium break-words whitespace-pre-wrap">{payload}</p>;
      } else if (payload.research_note) {
        return <p className="mt-2 text-xs leading-relaxed text-slate-700 font-medium break-words whitespace-pre-wrap">{payload.research_note}</p>;
      } else if (payload.answer) {
        return <p className="mt-2 text-xs leading-relaxed text-slate-900 font-bold break-words whitespace-pre-wrap">{payload.answer}</p>;
      } else {
        return (
          <pre className="mt-2 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700 font-mono overflow-x-auto">
            {JSON.stringify(payload, null, 2)}
          </pre>
        );
      }
    } catch (e) {
      console.warn("Failed rendering payload trace: ", e);
    }
    
    return null;
  };

  const visibleTraces = safeTraces.slice(0, visibleCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
      {/* Control Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
      }}>
        <div>
          <h3 className="text-base font-black text-slate-900 m-0">
            Medical Advisory Board Dialogue Session
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5 mb-0">
            Real-time multi-agent deliberation: clinical extraction, PubMed RAG grounding, safety audits, and peer critique.
          </p>
        </div>

        {safeTraces.length > 0 && (
          <button
            onClick={handleRestart}
            disabled={isPlaying}
            className="px-4 py-2 rounded-xl bg-brand-red hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Play size={12} />
            Replay Deliberation
          </button>
        )}
      </div>

      {/* Main Debate Thread */}
      <div style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        backgroundColor: '#F8FAFC',
        borderRadius: '0 0 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {safeTraces.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 20px',
            color: '#64748B',
            textAlign: 'center'
          }}>
            <Users size={44} className="text-brand-red mb-3" />
            <h4 className="font-black text-base text-slate-900 m-0">Advisory Board Chamber is Ready</h4>
            <p className="text-xs text-slate-600 max-w-md mt-1.5 font-medium">
              Click <strong>"Load Sample Blood Panel"</strong> on the Clinical Overview tab or ask a question in the AI Health Consultation tab to convene the 7-agent medical board!
            </p>
          </div>
        ) : (
          <div style={{ maxWidth: '820px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {visibleTraces.map((trace, index) => {
              const meta = getAgentMeta(trace.sender);
              const Icon = meta.icon;
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: meta.bg,
                    border: meta.border,
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    gap: '14px',
                  }}
                >
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${meta.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: meta.color,
                  }}
                  className="shrink-0"
                  >
                    <Icon size={18} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: meta.color }}>
                        {meta.title}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {trace.sender === 'LLMResponseAgent' ? 'FINAL VERDICT' : `STEP 0${index + 1}`}
                      </span>
                    </div>

                    {renderPayload(trace.sender, trace.payload)}
                  </div>
                </div>
              );
            })}

            {isPlaying && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-white border border-red-200 rounded-xl max-w-xs shadow-xs">
                <div className="w-2 h-2 bg-brand-red rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-brand-red rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-2 h-2 bg-brand-red rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                <span className="text-xs font-extrabold text-slate-800">Medical Board deliberating...</span>
              </div>
            )}

            <div ref={containerEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

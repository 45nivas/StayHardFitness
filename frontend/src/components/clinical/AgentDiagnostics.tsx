import React, { useState } from 'react';
import type { AgentTrace } from '../types';
import { Cpu, Terminal, CheckCircle2, AlertTriangle, Play, Eye, EyeOff } from 'lucide-react';

interface AgentDiagnosticsProps {
  traces?: AgentTrace[];
  vectorDbInfo?: string;
}

export const AgentDiagnostics: React.FC<AgentDiagnosticsProps> = ({
  traces = [],
  vectorDbInfo = 'ChromaDB + Cosine HNSW (Model: PubMedBERT)'
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [expandedTraceIdx, setExpandedTraceIdx] = useState<number | null>(null);

  const safeDbInfo = typeof vectorDbInfo === 'string' ? vectorDbInfo : 'ChromaDB + Cosine HNSW (Model: PubMedBERT)';

  const defaultTraces: AgentTrace[] = [
    {
      sender: "IngestionAgent",
      receiver: "ClinicalAnalyzerAgent",
      type: "DOCUMENT_INGEST",
      payload: { files: ["biomarker_report_patient_5.pdf"], characters_extracted: 14250, status: "SUCCESS" }
    },
    {
      sender: "ClinicalAnalyzerAgent",
      receiver: "CoordinatorAgent",
      type: "CLINICAL_ANALYSIS",
      payload: { age: 32, weight_kg: 82, biomarkers_extracted: ["Fasting Blood Glucose", "LDL Cholesterol", "hs-CRP", "Total Testosterone", "Vitamin D"], gender: "Male" }
    },
    {
      sender: "WebResearchAgent",
      receiver: "NutriPlannerAgent",
      type: "RESEARCH_NOTE",
      payload: { search_source: "NCBI PubMed E-Utilities API", citations: 14, guidance: "Increase soluble fiber & monounsaturated fats to optimize LDL clearance while preserving androgen synthesis." }
    },
    {
      sender: "NutriPlannerAgent",
      receiver: "SafetyAuditorAgent",
      type: "MEAL_PLAN",
      payload: { calorie_target: 2300, macros: { p: 165, c: 240, f: 75 }, meals_calculated: ["Breakfast", "Lunch", "Dinner", "Snack"] }
    },
    {
      sender: "SafetyAuditorAgent",
      receiver: "CoordinatorAgent",
      type: "SAFETY_AUDIT_RESULT",
      payload: { is_cleared: true, allergies_checked: ["Shellfish"], corrections_made: ["Verified zero shellfish allergens across all 4 prescribed meals"] }
    },
    {
      sender: "LLMResponseAgent",
      receiver: "UI",
      type: "RESPONSE",
      payload: { response_length: 628, model_used: "gemini-1.5-flash", safety_audit: "CLEARED" }
    }
  ];

  const activeTraces = Array.isArray(traces) && traces.length > 0 ? traces : defaultTraces;

  const filteredTraces = activeTraces.filter(t => {
    if (statusFilter === 'all') return true;
    const isErr = t.type.toLowerCase().includes('error') || t.payload?.status === 'ERROR' || t.payload?.success === false;
    if (statusFilter === 'error') return isErr;
    return !isErr;
  });

  const toggleExpandTrace = (idx: number) => {
    setExpandedTraceIdx(expandedTraceIdx === idx ? null : idx);
  };

  const getTraceIcon = (type: string, payload: any) => {
    const isErr = type.toLowerCase().includes('error') || payload?.status === 'ERROR' || payload?.success === false;
    if (isErr) return <AlertTriangle size={16} style={{ color: '#E50914' }} />;
    return <CheckCircle2 size={16} style={{ color: '#E50914' }} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Telemetry Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="clinical-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: 0, padding: '16px' }}>
          <div style={{ backgroundColor: '#FEF2F2', padding: '10px', borderRadius: '10px', color: '#E50914', border: '1px solid #FECACA' }}>
            <Cpu size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>VECTOR DATABASE</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>ChromaDB + Cosine HNSW</div>
          </div>
        </div>

        <div className="clinical-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: 0, padding: '16px' }}>
          <div style={{ backgroundColor: '#FEF2F2', padding: '10px', borderRadius: '10px', color: '#E50914', border: '1px solid #FECACA' }}>
            <Terminal size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EMBEDDING MODEL</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
              {safeDbInfo.includes('Model:') ? safeDbInfo.split('Model:')[1].replace(')', '').trim() : 'PubMedBERT Clinical'}
            </div>
          </div>
        </div>

        <div className="clinical-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: 0, padding: '16px' }}>
          <div style={{ backgroundColor: '#FEF2F2', padding: '10px', borderRadius: '10px', color: '#E50914', border: '1px solid #FECACA' }}>
            <Play size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DIMENSIONS & CACHE</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
              {safeDbInfo.toLowerCase().includes('pubmedbert') ? '768-D' : '384-D'} (LRU Cache Active)
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Trace Log Panel */}
      <div className="clinical-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Multi-Agent Execution Pipeline Trace (MCP)</h3>
            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '2px 0 0 0', fontWeight: 500 }}>Direct step-by-step protocol logs from the Clinical Agentic Core</p>
          </div>

          <div style={{ display: 'flex', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
            {(['all', 'success', 'error'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setStatusFilter(mode)}
                style={{
                  background: statusFilter === mode ? '#E50914' : '#FFFFFF',
                  color: statusFilter === mode ? '#FFFFFF' : '#475569',
                  border: 'none',
                  padding: '6px 12px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'all 0.15s ease',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                <th style={{ padding: '12px 8px' }}>Pipeline Agent</th>
                <th style={{ padding: '12px 8px' }}>Operation</th>
                <th style={{ padding: '12px 8px' }}>Protocol Type</th>
                <th style={{ padding: '12px 8px' }}>Target Receiver</th>
                <th style={{ padding: '12px 8px', textAlign: 'center' }}>Payload</th>
              </tr>
            </thead>
            <tbody>
              {filteredTraces.map((trace, idx) => {
                const isExpanded = expandedTraceIdx === idx;
                const senderName = (trace.sender || 'Agent').replace('Agent', '');
                const receiverName = (trace.receiver || 'Coordinator').replace('Agent', '');
                
                return (
                  <React.Fragment key={idx}>
                    <tr style={{
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: isExpanded ? '#FEF2F2' : 'transparent',
                      transition: 'background-color 0.2s ease'
                    }}>
                      <td style={{ padding: '12px 8px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A' }}>
                        {getTraceIcon(trace.type, trace.payload)}
                        {senderName}
                      </td>
                      <td style={{ padding: '12px 8px', color: '#475569' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          color: '#E50914',
                          fontWeight: 800
                        }}>
                          {trace.type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', color: '#475569', fontWeight: 600 }}>
                        {trace.type.includes('ERROR') ? 'Pipeline Exception' : 'MCP Agent Message'}
                      </td>
                      <td style={{ padding: '12px 8px', color: '#0F172A', fontWeight: 700 }}>
                        {receiverName}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleExpandTrace(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#E50914',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 800,
                            fontSize: '0.75rem'
                          }}
                        >
                          {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
                          {isExpanded ? 'Hide' : 'Inspect'}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={5} style={{ padding: '16px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#E50914', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                              MCP Payload Trace Log
                            </div>
                            <pre style={{
                              margin: 0,
                              backgroundColor: '#0F172A',
                              color: '#F8FAFC',
                              padding: '14px',
                              borderRadius: '10px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.75rem',
                              overflowX: 'auto',
                              maxHeight: '260px',
                            }}>
                              {JSON.stringify(trace.payload, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

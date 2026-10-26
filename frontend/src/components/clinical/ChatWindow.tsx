import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { Send, Sparkles, MessageSquare, Cpu, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isSending: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages = [],
  onSendMessage,
  isSending,
}) => {
  const [inputText, setInputText] = useState('');
  const [expandedTraceIdx, setExpandedTraceIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const toggleTrace = (idx: number) => {
    setExpandedTraceIdx(expandedTraceIdx === idx ? null : idx);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F8FAFC', borderRadius: '14px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
      
      {/* Chat Messages Panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#64748B',
            textAlign: 'center',
            gap: '12px',
            maxWidth: '420px',
            margin: 'auto'
          }}>
            <div style={{ backgroundColor: '#FEF2F2', padding: '16px', borderRadius: '18px', color: '#E50914', border: '1px solid #FECACA' }}>
              <MessageSquare size={32} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
              Stay Hard Clinical AI Assistant
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: '1.5', margin: 0, fontWeight: 500 }}>
              Ask clinical nutrition or longevity questions. The 7-agent Plan-Reason-Audit medical board will synthesize PubMed evidence and audit safety constraints.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
              {["What foods should I avoid with high LDL?", "Optimize my protein targets", "Suggest a pre-workout breakfast"].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSendMessage(suggestion)}
                  className="text-xs font-extrabold text-slate-700 hover:text-brand-red bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 px-3.5 py-2 rounded-xl transition cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    maxWidth: '82%',
                    backgroundColor: isUser ? '#E50914' : '#FFFFFF',
                    color: isUser ? '#FFFFFF' : '#0F172A',
                    border: isUser ? '1px solid #E50914' : '1px solid #E2E8F0',
                    borderRadius: '14px',
                    borderTopRightRadius: isUser ? '3px' : '14px',
                    borderTopLeftRadius: isUser ? '14px' : '3px',
                    padding: '14px 18px',
                    fontSize: '0.9rem',
                    fontWeight: isUser ? 600 : 500,
                    lineHeight: '1.55',
                    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.text}
                </div>

                {!isUser && msg.corrections && msg.corrections.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: '#E50914',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    marginTop: '6px',
                    fontWeight: 700
                  }}>
                    <AlertCircle size={12} />
                    Safety Auditor amended menu suggestions: {msg.corrections.join(', ')}
                  </div>
                )}

                {!isUser && msg.mcpTrace && msg.mcpTrace.length > 0 && (
                  <div style={{ width: '100%', maxWidth: '82%', marginTop: '8px' }}>
                    <button
                      onClick={() => toggleTrace(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.75rem',
                        color: '#E50914',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 800,
                        padding: '2px 4px',
                      }}
                    >
                      <Cpu size={12} />
                      {expandedTraceIdx === idx ? 'Hide Multi-Agent reasoning chain' : 'Inspect multi-agent reasoning chain'}
                      {expandedTraceIdx === idx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {expandedTraceIdx === idx && (
                      <div style={{
                        marginTop: '6px',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        backgroundColor: '#FFFFFF',
                        overflow: 'hidden',
                        fontSize: '0.78rem',
                      }}>
                        <div style={{ padding: '8px 12px', backgroundColor: '#FEF2F2', borderBottom: '1px solid #FECACA', fontWeight: 800, color: '#E50914', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Trace Logs (Clinical Orchestrator)
                        </div>
                        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                          {msg.mcpTrace.map((trace, tIdx) => (
                            <div key={tIdx} style={{ display: 'flex', gap: '6px', borderBottom: tIdx < msg.mcpTrace!.length - 1 ? '1px solid #F1F5F9' : 'none', paddingBottom: '6px' }}>
                              <span style={{ fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>{trace.sender.replace('Agent', '')}:</span>
                              <span style={{ color: '#475569', fontWeight: 500 }}>
                                {trace.type === 'RESPONSE' ? 'Returned response payload' : 
                                 trace.type === 'CLINICAL_ANALYSIS' ? 'Extracted biomarkers profile' :
                                 trace.type === 'RESEARCH_NOTE' ? 'Synthesized PubMed clinical references' :
                                 trace.type === 'MEAL_PLAN' ? 'Computed calorie macro targets & menu structure' :
                                 trace.type === 'SAFETY_AUDIT_RESULT' ? `Allergen critique cleared: ${trace.payload?.is_cleared ? 'Yes' : 'No'}` :
                                 `Executed protocol ${trace.type}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <span style={{
                  fontSize: '0.68rem',
                  color: '#64748B',
                  marginTop: '4px',
                  padding: '0 4px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)'
                }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}

        {isSending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start', backgroundColor: '#FFFFFF', border: '1px solid #FECACA', padding: '12px 18px', borderRadius: '14px', borderTopLeftRadius: '3px' }}>
            <Sparkles size={16} className="animate-spin text-brand-red" />
            <span style={{ fontSize: '0.82rem', color: '#0F172A', fontWeight: 700 }}>
              Plan-Reason-Audit loop executing across 7 clinical agents...
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Message Form Panel */}
      <form onSubmit={handleSubmit} style={{
        padding: '16px 20px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask clinical diet planner or longevity board..."
          disabled={isSending}
          className="flex-1 bg-slate-50 border border-slate-300 focus:border-brand-red rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="bg-brand-red hover:bg-red-700 disabled:opacity-40 text-white w-11 h-11 rounded-xl flex items-center justify-center transition cursor-pointer shadow-md shadow-brand-red/20"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

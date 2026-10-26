import React from 'react';
import type { Biomarker } from '../types';
import { Heart, Upload } from 'lucide-react';

interface BiomarkersSnapshotProps {
  biomarkers: Biomarker[];
}

export const BiomarkersSnapshot: React.FC<BiomarkersSnapshotProps> = ({ biomarkers = [] }) => {
  const isRealData = biomarkers.length > 0;

  const defaultBiomarkers: Biomarker[] = [
    { name: 'Fasting Blood Glucose', value: 89, unit: 'mg/dL', status: 'Optimal', normal_range: '70 - 99 mg/dL', clinical_significance: 'Optimal fasting blood glucose indicates high insulin sensitivity and clean carbohydrate oxidation.' },
    { name: 'LDL Cholesterol', value: 104, unit: 'mg/dL', status: 'Elevated', normal_range: '0 - 99 mg/dL', clinical_significance: 'Mildly elevated LDL cholesterol. Increase soluble fiber intake and monounsaturated fats.' },
    { name: 'hs-CRP (Inflammation)', value: 0.8, unit: 'mg/L', status: 'Optimal', normal_range: '< 1.0 mg/L', clinical_significance: 'Low systemic vascular inflammation and strong recovery readiness.' },
  ];

  const activeBiomarkers = isRealData ? biomarkers : defaultBiomarkers;

  const getPositionPercent = (biomarker: Biomarker): number => {
    const status = (biomarker.status || 'Normal').toLowerCase();
    try {
      const val = biomarker.value;
      const normalRange = biomarker.normal_range || '';
      const rangeMatch = normalRange.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
      if (rangeMatch) {
        const min = parseFloat(rangeMatch[1]);
        const max = parseFloat(rangeMatch[2]);
        if (val >= min && val <= max) {
          const rangePct = (val - min) / (max - min);
          return 35 + rangePct * 30;
        } else if (val < min) {
          const ratio = Math.max(0.1, val / min);
          return 5 + ratio * 25;
        } else {
          const ratio = Math.min(1.0, (val - max) / max);
          return 70 + ratio * 25;
        }
      }
    } catch (e) {
      // Fallback
    }
    if (status.includes('normal') || status.includes('optimal')) return 50;
    if (status.includes('low') || status.includes('deficient') || status.includes('decrease')) return 20;
    if (status.includes('high') || status.includes('elevated') || status.includes('increase')) return 80;
    return 50;
  };

  const getStatusStyle = (status: string) => {
    const s = (status || 'Normal').toLowerCase();
    if (s.includes('normal') || s.includes('optimal')) {
      return { color: '#0F172A', bg: '#F1F5F9', border: '#CBD5E1' };
    }
    return { color: '#E50914', bg: '#FEF2F2', border: '#FECACA' };
  };

  return (
    <div className="clinical-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', overflow: 'hidden' }}>
      {!isRealData && (
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
          <span className="stat-pill accent-gold" style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Sample Preview
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Heart size={18} style={{ color: '#E50914' }} />
          Biomarkers Snapshot
        </h3>
        <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>CLINICAL REFERENCE ASSAY</span>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        opacity: isRealData ? 1 : 0.45,
        pointerEvents: isRealData ? 'auto' : 'none',
        filter: isRealData ? 'none' : 'blur(0.5px)',
        transition: 'all 0.3s ease'
      }}>
        {activeBiomarkers.map((bio) => {
          const needlePos = getPositionPercent(bio);
          const st = getStatusStyle(bio.status);
          
          return (
            <div key={bio.name} style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '14px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>{bio.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '8px', fontWeight: 600 }}>Ref: {bio.normal_range || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                    {bio.value}
                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginLeft: '3px' }}>{bio.unit || ''}</span>
                  </span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: st.color,
                    backgroundColor: st.bg,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: `1px solid ${st.border}`
                  }}>
                    {bio.status || 'Normal'}
                  </span>
                </div>
              </div>

              {/* Horizontal Slider Gauge */}
              <div style={{ position: 'relative', width: '100%', height: '12px', marginTop: '10px', marginBottom: '6px' }}>
                <div style={{
                  display: 'flex',
                  width: '100%',
                  height: '100%',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ width: '30%', height: '100%', backgroundColor: '#FEF2F2', borderRight: '1px solid #E2E8F0' }} />
                  <div style={{ width: '40%', height: '100%', backgroundColor: '#F8FAFC', borderRight: '1px solid #E2E8F0' }} />
                  <div style={{ width: '30%', height: '100%', backgroundColor: '#FEF2F2' }} />
                </div>

                {/* Sliding Needle Pin */}
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  left: `calc(${needlePos}% - 6px)`,
                  width: '12px',
                  height: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 2,
                }}>
                  <div style={{ width: '0', height: '0', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid #E50914' }} />
                  <div style={{ width: '3px', height: '13px', backgroundColor: '#E50914', borderRadius: '2px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748B', fontWeight: 700, padding: '0 4px', fontFamily: 'var(--font-mono)' }}>
                <span>LOW / DEFICIENT</span>
                <span>OPTIMAL CLINICAL RANGE</span>
                <span>ELEVATED</span>
              </div>

              <div style={{
                fontSize: '0.78rem',
                color: '#334155',
                backgroundColor: '#F8FAFC',
                padding: '10px 14px',
                borderRadius: '8px',
                borderLeft: '3px solid #E50914',
                marginTop: '4px',
                lineHeight: '1.45',
                fontWeight: 500
              }}>
                <strong style={{ color: '#0F172A' }}>Clinical Insight:</strong> {bio.clinical_significance || 'No clinical insight available.'}
              </div>
            </div>
          );
        })}
      </div>

      {!isRealData && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '0',
          right: '0',
          bottom: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 5,
        }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            border: '1px solid #FECACA',
            borderRadius: '14px',
            padding: '16px 24px',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '280px',
          }}>
            <Upload size={20} style={{ color: '#E50914' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
              Upload a health report or load sample panel to see your biomarker analysis
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

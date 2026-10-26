import type { BioAgeResults } from '../types';
import { Shield, Sparkles, Heart, Upload } from 'lucide-react';

interface BioAgeCardProps {
  bioAgeResults: BioAgeResults | null;
}

export function BioAgeCard({ bioAgeResults }: BioAgeCardProps) {
  const isRealData = bioAgeResults !== null;

  const data: BioAgeResults = bioAgeResults || {
    chronological_age: 32,
    biological_age: 28.4,
    longevity_score: 94,
    pathway_focus: "AMPK Cellular Autophagy & Mitochondrial Biogenesis",
    longevity_tips: [
      "Implement a 14-hour circadian fast to upregulate AMPK signaling and cellular repair.",
      "Pair soluble fiber and polyphenols with high-protein meals to optimize ApoB & LDL clearance.",
      "Maintain 150+ mins/week of Zone 2 aerobic base work alongside heavy resistance training."
    ]
  };

  const ageDiff = Number((data.chronological_age - data.biological_age).toFixed(1));
  const isYounger = ageDiff > 0;
  const isOlder = ageDiff < 0;

  const radius = 32;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (data.longevity_score / 100) * circumference;

  return (
    <div className="clinical-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: '230px', position: 'relative', overflow: 'hidden' }}>
      {!isRealData && (
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
          <span className="stat-pill accent-gold" style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Sample Preview
          </span>
        </div>
      )}

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Biological Age & Longevity Index</h3>
          <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '2px 0 0 0', fontWeight: 500 }}>Biomarker-derived aging velocity & cellular resilience</p>
        </div>
        <div style={{ backgroundColor: '#FEF2F2', color: '#E50914', padding: '8px', borderRadius: '12px', border: '1px solid #FECACA' }}>
          <Sparkles size={16} />
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        opacity: isRealData ? 1 : 0.45,
        pointerEvents: isRealData ? 'auto' : 'none',
        filter: isRealData ? 'none' : 'blur(0.5px)',
        transition: 'all 0.3s ease',
        flex: 1
      }}>
        {/* Main Stats Display */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', borderRight: '1px solid #E2E8F0', paddingRight: '16px' }}>
              <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.06em', fontWeight: 800 }}>Chronological</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 800, color: '#475569' }}>
                {data.chronological_age} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>yrs</span>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#E50914', letterSpacing: '0.06em', fontWeight: 800 }}>Biological</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 900, color: '#0F172A' }}>
                {data.biological_age} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>yrs</span>
              </div>
            </div>

            <div style={{ marginLeft: '4px' }}>
              {isYounger && (
                <span className="stat-pill accent-gold" style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px' }}>
                  -{ageDiff} Yrs Younger
                </span>
              )}
              {isOlder && (
                <span className="stat-pill safety-red" style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px' }}>
                  +{Math.abs(ageDiff)} Yrs Older
                </span>
              )}
              {ageDiff === 0 && (
                <span className="stat-pill" style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px' }}>
                  Neutral Pace
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Longevity Gauge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '64px', height: '64px' }}>
              <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  stroke="#F1F5F9"
                  fill="transparent"
                  strokeWidth={stroke}
                  r={normalizedRadius}
                  cx="32"
                  cy="32"
                />
                <circle
                  stroke="#E50914"
                  fill="transparent"
                  strokeWidth={stroke}
                  strokeDasharray={circumference + ' ' + circumference}
                  style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease' }}
                  r={normalizedRadius}
                  cx="32"
                  cy="32"
                  strokeLinecap="round"
                />
              </svg>
              <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '64px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.85rem',
                color: '#0F172A',
                fontFamily: 'var(--font-mono)'
              }}>
                {data.longevity_score}%
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Longevity Index</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>Optimal Resilience</span>
            </div>
          </div>
        </div>

        {/* Pathway Focus */}
        <div style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderLeft: '3px solid #E50914',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px'
        }}>
          <div style={{ color: '#E50914', marginTop: '2px' }}>
            <Heart size={14} />
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em', fontWeight: 800, display: 'block' }}>Primary Cellular Pathway Focus</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>{data.pathway_focus}</span>
          </div>
        </div>

        {/* Life Extension Hacks List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={13} style={{ color: '#E50914' }} />
            Longevity Protocol Directives:
          </span>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '4px', listStyleType: 'none', margin: 0 }}>
            {data.longevity_tips.map((tip, idx) => (
              <li key={idx} style={{
                fontSize: '0.78rem',
                color: '#475569',
                fontWeight: 500,
                lineHeight: '1.45',
                paddingLeft: '14px',
                position: 'relative'
              }}>
                <span style={{
                  position: 'absolute',
                  left: '0',
                  top: '7px',
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: '#E50914'
                }}></span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
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
              Upload a report or click "Load Sample Blood Panel" to unlock biological age metrics
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

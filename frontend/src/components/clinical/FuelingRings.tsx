import React from 'react';
import { Upload } from 'lucide-react';

interface MacroStats {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface FuelingRingsProps {
  targets: MacroStats;
  consumed: MacroStats;
  isRealTargets: boolean;
}

export const FuelingRings: React.FC<FuelingRingsProps> = ({ targets, consumed, isRealTargets }) => {
  const tgtCalories = targets.calories || 2000;
  const tgtProtein = targets.protein || 130;
  const tgtCarbs = targets.carbs || 200;
  const tgtFats = targets.fats || 70;

  const pctCalories = Math.min(1, consumed.calories / tgtCalories);
  const pctProtein = Math.min(1, consumed.protein / tgtProtein);
  const pctCarbs = Math.min(1, consumed.carbs / tgtCarbs);
  const pctFats = Math.min(1, consumed.fats / tgtFats);

  // Cohesive Red & Carbon Slate concentric rings
  const rings = [
    { name: 'Calories', radius: 80, progress: pctCalories, color: '#E50914', unit: 'kcal', target: tgtCalories, current: consumed.calories },
    { name: 'Protein', radius: 64, progress: pctProtein, color: '#0F172A', unit: 'g', target: tgtProtein, current: consumed.protein },
    { name: 'Carbs', radius: 48, progress: pctCarbs, color: '#EF4444', unit: 'g', target: tgtCarbs, current: consumed.carbs },
    { name: 'Fats', radius: 32, progress: pctFats, color: '#64748B', unit: 'g', target: tgtFats, current: consumed.fats },
  ];

  return (
    <div className="clinical-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', overflow: 'hidden' }}>
      {!isRealTargets && (
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
          <span className="stat-pill accent-gold" style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Sample Preview
          </span>
        </div>
      )}

      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px', margin: 0 }}>
        Fueling Rings & Macro Progress
      </h3>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: '24px',
        flexWrap: 'wrap',
        opacity: isRealTargets ? 1 : 0.45,
        pointerEvents: isRealTargets ? 'auto' : 'none',
        filter: isRealTargets ? 'none' : 'blur(0.5px)',
        transition: 'all 0.3s ease'
      }}>
        {/* SVG Concentric Rings Container */}
        <div style={{ position: 'relative', width: '180px', height: '180px' }}>
          <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
            {rings.map((ring) => {
              const circ = 2 * Math.PI * ring.radius;
              const strokeOffset = circ * (1 - ring.progress);
              return (
                <g key={ring.name}>
                  <circle
                    cx="90"
                    cy="90"
                    r={ring.radius}
                    fill="transparent"
                    stroke="#F1F5F9"
                    strokeWidth="10"
                  />
                  <circle
                    cx="90"
                    cy="90"
                    r={ring.radius}
                    fill="transparent"
                    stroke={ring.color}
                    strokeWidth="10"
                    strokeDasharray={circ}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    style={{
                      transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </g>
              );
            })}
          </svg>
          
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Consumed</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', lineHeight: '1.1', fontFamily: 'var(--font-mono)' }}>
              {consumed.calories}
            </span>
            <span style={{ fontSize: '0.62rem', color: '#475569', fontWeight: 700 }}>
              / {tgtCalories} kcal
            </span>
          </div>
        </div>

        {/* Legend Table Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: '150px' }}>
          {rings.map((ring) => (
            <div key={ring.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: ring.color }} />
                <span style={{ color: '#334155', fontWeight: 700 }}>{ring.name}</span>
              </div>
              <div style={{ color: '#0F172A', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                <span>{ring.current}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginLeft: '2px' }}>
                  / {ring.target}{ring.unit}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  color: ring.color,
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  marginLeft: '8px',
                  fontWeight: 800
                }}>
                  {Math.round(ring.progress * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isRealTargets && (
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
              Upload a report or load sample panel to unlock calorie & macro targets
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

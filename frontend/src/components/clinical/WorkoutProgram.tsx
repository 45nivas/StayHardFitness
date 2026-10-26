import { useState } from 'react';
import type { TrainingPlan } from '../types';
import { Dumbbell, ShieldAlert, ChevronDown, ChevronUp, CheckSquare, Square, Upload } from 'lucide-react';

interface WorkoutProgramProps {
  trainingPlan: TrainingPlan | null;
}

export function WorkoutProgram({ trainingPlan }: WorkoutProgramProps) {
  const isRealData = trainingPlan !== null;

  const plan: TrainingPlan = trainingPlan || {
    weekly_split: "3-Day Metabolic Strength Conditioning + 2-Day Zone 2 Aerobic Conditioning",
    exercises: [
      {
        name: "Controlled Dumbbell Goblet Squat",
        sets: "3",
        reps: "12",
        intensity: "RPE 7 (Moderate Intensity)",
        instructions: "Hold a single heavy dumbbell vertically at your collarbone. Slowly lower into a deep squat over a 3-second cadence, keep knees tracking outwards over toes, and return to standing while exhaling."
      },
      {
        name: "Neutral-Grip Dumbbell Floor Press",
        sets: "3",
        reps: "10-12",
        intensity: "RPE 8 (Controlled Strength)",
        instructions: "Lie flat on your back on the floor, holding dumbbells with palms facing each other. Lower arms until triceps brush the floor, pause briefly to disengage momentum, then press dynamically upward."
      },
      {
        name: "Steady-State Zone 2 Cardio (Biking or Row)",
        sets: "1",
        reps: "30-40 mins",
        intensity: "HR 125-135 BPM (Zone 2)",
        instructions: "Maintain a steady, conversation-level pace on a stationary bike or rowing machine. This target aerobic threshold encourages cellular lipid clearance and glycogen storage optimization."
      },
      {
        name: "Static Bird-Dog Core Holds",
        sets: "3",
        reps: "10 per side",
        intensity: "RPE 6 (Stability Focus)",
        instructions: "Position on all fours. Extend opposite arm and leg horizontally until parallel to the floor. Hold for 3 seconds, focusing on locking in lumbar spine stability before switching sides."
      }
    ],
    safety_precautions: [
      "Ensure controlled, continuous breathing during heavy movements. Avoid the Valsalva maneuver (holding breath) to prevent transient cardiovascular arterial spikes.",
      "Integrate an 8-minute progressive warm-up (e.g. arm swings, bodyweight hinges) before starting loaded sets to encourage synovial joint lubrication.",
      "If any dizziness, sudden heart rate spikes, or localized articular pain occurs, halt exercise immediately and check blood glucose markers."
    ]
  };

  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [checkedExercises, setCheckedExercises] = useState<{ [key: number]: boolean }>({});

  const toggleExpand = (idx: number) => {
    setExpandedExercise(prev => (prev === idx ? null : idx));
  };

  const toggleChecked = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedExercises(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <div className="clinical-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px', position: 'relative', overflow: 'hidden' }}>
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
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Clinical Workout Prescription</h3>
          <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '2px 0 0 0', fontWeight: 500 }}>Custom sports-science program & split</p>
        </div>
        <div style={{ backgroundColor: '#FEF2F2', color: '#E50914', padding: '8px', borderRadius: '12px', border: '1px solid #FECACA' }}>
          <Dumbbell size={16} />
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        opacity: isRealData ? 1 : 0.45,
        pointerEvents: isRealData ? 'auto' : 'none',
        filter: isRealData ? 'none' : 'blur(0.5px)',
        transition: 'all 0.3s ease'
      }}>
        {/* Routine Split Badge */}
        <div style={{
          padding: '10px 14px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderLeft: '3px solid #E50914',
          borderRadius: '10px',
        }}>
          <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#E50914', letterSpacing: '0.06em', fontWeight: 800, display: 'block' }}>Active Training Split</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-display)' }}>
            {plan.weekly_split}
          </span>
        </div>

        {/* Exercises Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>Exercise Prescriptions & Instruction Drawers:</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {plan.exercises.map((ex, idx) => {
              const isExpanded = expandedExercise === idx;
              const isCompleted = checkedExercises[idx] || false;

              return (
                <div 
                  key={idx} 
                  onClick={() => toggleExpand(idx)}
                  style={{
                    border: isCompleted ? '1px solid #E50914' : '1px solid #E2E8F0',
                    borderRadius: '10px',
                    backgroundColor: isCompleted ? '#FEF2F2' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div 
                        onClick={(e) => toggleChecked(idx, e)}
                        style={{ color: isCompleted ? '#E50914' : '#94A3B8', transition: 'color 0.15s ease' }}
                      >
                        {isCompleted ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>
                      <div>
                        <span style={{ 
                          fontSize: '0.88rem', 
                          fontWeight: 800, 
                          color: '#0F172A',
                          textDecoration: isCompleted ? 'line-through' : 'none'
                        }}>
                          {ex.name}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', color: '#475569', marginTop: '2px', fontWeight: 600 }}>
                          <span>{ex.sets} Sets</span>
                          <span>•</span>
                          <span>{ex.reps} Reps</span>
                          <span>•</span>
                          <span style={{ color: '#E50914', fontWeight: 800 }}>{ex.intensity}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ color: '#64748B' }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{
                      padding: '10px 14px 14px 44px',
                      borderTop: '1px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                      fontSize: '0.8rem',
                      color: '#334155',
                      lineHeight: '1.45',
                      fontWeight: 500
                    }}>
                      <span style={{ fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '4px' }}>Form & Execution Instructions:</span>
                      {ex.instructions}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sports-Science Cautions Box */}
        <div style={{
          border: '1px solid #FECACA',
          borderRadius: '10px',
          backgroundColor: '#FEF2F2',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#E50914' }}>
            <ShieldAlert size={16} />
            <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>Sports-Science Kinesiology Safety Precautions</span>
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '4px', listStyleType: 'none', margin: 0 }}>
            {plan.safety_precautions.map((prec, idx) => (
              <li key={idx} style={{
                fontSize: '0.76rem',
                color: '#334155',
                fontWeight: 500,
                lineHeight: '1.4',
                paddingLeft: '12px',
                position: 'relative'
              }}>
                <span style={{
                  position: 'absolute',
                  left: '0',
                  top: '6px',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: '#E50914'
                }}></span>
                {prec}
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
              Upload a report or load sample panel to unlock your workout prescription
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

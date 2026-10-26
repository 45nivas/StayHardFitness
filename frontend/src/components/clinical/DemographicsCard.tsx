import React from 'react';
import { User, Activity, Flame, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { Demographics, Targets } from '../types';

interface DemographicsCardProps {
  demographics: Demographics | null;
  targets: Targets | null;
  safetyCleared: boolean;
  correctionsCount: number;
  auditHasRun: boolean;
}

export const DemographicsCard: React.FC<DemographicsCardProps> = ({
  demographics,
  targets,
  safetyCleared,
  correctionsCount,
  auditHasRun,
}) => {
  const age = demographics?.age ?? 30;
  const weight = demographics?.weight_kg ?? 70;
  const height = demographics?.height_cm ?? 170;
  const gender = demographics?.gender ?? 'Male';

  const heightInMeters = height / 100;
  const bmi = heightInMeters > 0 ? (weight / (heightInMeters * heightInMeters)).toFixed(1) : '24.2';
  const bmiVal = parseFloat(bmi);

  let bmiClass = 'Normal';
  let bmiColorClass = 'safety-green';
  if (bmiVal < 18.5) {
    bmiClass = 'Underweight';
    bmiColorClass = 'safety-red';
  } else if (bmiVal >= 18.5 && bmiVal < 25) {
    bmiClass = 'Normal';
    bmiColorClass = 'safety-green';
  } else if (bmiVal >= 25 && bmiVal < 30) {
    bmiClass = 'Overweight';
    bmiColorClass = 'accent-gold';
  } else {
    bmiClass = 'Obese';
    bmiColorClass = 'safety-red';
  }

  const caloricTarget = targets?.calories ?? 2000;

  return (
    <div className="clinical-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px', padding: '20px' }}>
      {/* Patient Avatar & Profile Details */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#E50914'
        }}>
          <User size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            {demographics?.name && demographics.name.trim().length > 0 
              ? `${demographics.name} // Clinical Profile` 
              : 'Athlete Clinical Profile'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', gap: '8px', marginTop: '4px', marginBottom: 0 }}>
            <span>Age: <strong style={{ color: '#0F172A' }}>{age}</strong></span> • 
            <span>Mass: <strong style={{ color: '#0F172A' }}>{weight} kg</strong></span> • 
            <span>Height: <strong style={{ color: '#0F172A' }}>{height} cm</strong></span> • 
            <span>Sex: <strong style={{ color: '#0F172A' }}>{gender}</strong></span>
          </p>
        </div>
      </div>

      {/* Demographic Indicators & Safety Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <div className={`stat-pill ${bmiColorClass}`}>
          <Activity size={14} />
          <span>BMI: <strong>{bmi}</strong> ({bmiClass})</span>
        </div>

        <div className="stat-pill accent-gold">
          <Flame size={14} />
          <span>Calorie Plan: <strong>{caloricTarget} kcal</strong></span>
        </div>

        {!auditHasRun ? (
          <div className="stat-pill">
            <Shield size={14} />
            <span>Safety Audit: <strong>Ready</strong></span>
          </div>
        ) : safetyCleared ? (
          <div className="stat-pill safety-green">
            <ShieldCheck size={14} />
            <span>Safety Audit: <strong>Cleared</strong></span>
          </div>
        ) : (
          <div className="stat-pill safety-red">
            <ShieldAlert size={14} />
            <span>Safety Audit: <strong>{correctionsCount} {correctionsCount === 1 ? 'Flag' : 'Flags'} Corrected</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};

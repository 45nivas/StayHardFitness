import React, { useState } from 'react';
import type { MealPlan, Meal } from '../types';
import { CheckSquare, Square, ChevronDown, ChevronUp, Calendar, Compass, Upload } from 'lucide-react';

interface MealProgramProps {
  mealPlan: MealPlan | null;
  checkedMeals: { [key: string]: boolean };
  toggleMealChecked: (mealKey: string) => void;
}

export const MealProgram: React.FC<MealProgramProps> = ({
  mealPlan,
  checkedMeals,
  toggleMealChecked,
}) => {
  const isRealData = mealPlan !== null;
  const [openMeal, setOpenMeal] = useState<string | null>('breakfast');

  const defaultMeals: MealPlan = {
    breakfast: {
      name: "Egg White & Avocado Spinach Toast",
      calories: 450,
      protein: 35,
      carbs: 30,
      fats: 18,
      ingredients: ["3 large egg whites", "1 cup organic baby spinach", "1 slice whole-wheat sourdough bread", "1/4 medium fresh avocado"],
      instructions: "Whisk and cook egg whites in a non-stick pan with spinach. Serve alongside toasted sourdough topped with mashed avocado."
    },
    lunch: {
      name: "Grilled Lemon-Herb Salmon Salad",
      calories: 550,
      protein: 45,
      carbs: 15,
      fats: 35,
      ingredients: ["150g wild-caught salmon fillet", "2 cups mixed organic baby greens", "1/2 cucumber, sliced", "5 cherry tomatoes", "1 tbsp extra virgin olive oil"],
      instructions: "Grill salmon for 4 minutes per side. Toss salad greens and vegetables with olive oil and fresh lemon juice. Top with the warm salmon."
    },
    dinner: {
      name: "Ginger Soy Chicken & Steamed Broccoli",
      calories: 600,
      protein: 50,
      carbs: 60,
      fats: 15,
      ingredients: ["150g chicken breast, cubed", "1.5 cups fresh broccoli florets", "1 cup cooked organic brown jasmine rice", "1 tbsp low-sodium soy sauce", "1 tsp fresh grated ginger"],
      instructions: "Stir-fry chicken and grated ginger in a hot skillet. Add broccoli florets and low-sodium soy sauce; cover and steam until broccoli is tender. Serve over jasmine rice."
    },
    snack: {
      name: "Greek Yogurt with Blueberries & Chia Seeds",
      calories: 200,
      protein: 18,
      carbs: 20,
      fats: 4,
      ingredients: ["150g 0% plain Greek yogurt", "1/4 cup fresh organic blueberries", "1/2 tsp organic chia seeds"],
      instructions: "Spoon cold yogurt into a serving bowl, stir in chia seeds, and garnish with fresh blueberries."
    }
  };

  const activePlan = isRealData ? mealPlan : defaultMeals;
  const mealKeys: (keyof MealPlan)[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  const toggleAccordion = (key: string) => {
    setOpenMeal(openMeal === key ? null : key);
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
          <Calendar size={18} style={{ color: '#E50914' }} />
          Tailored Meal Program
        </h3>
        <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>Check meals to update Macro Rings</span>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        opacity: isRealData ? 1 : 0.45,
        pointerEvents: isRealData ? 'auto' : 'none',
        filter: isRealData ? 'none' : 'blur(0.5px)',
        transition: 'all 0.3s ease'
      }}>
        {mealKeys.map((key) => {
          const meal = activePlan[key] as Meal;
          if (!meal) return null;
          
          const isChecked = !!checkedMeals[key];
          const isOpen = openMeal === key;
          const labelUpper = key.charAt(0).toUpperCase() + key.slice(1);

          return (
            <div
              key={key}
              style={{
                border: isChecked ? '1px solid #E50914' : '1px solid #E2E8F0',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: isChecked ? '#FEF2F2' : '#FFFFFF',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => toggleAccordion(key)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '0' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMealChecked(key);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isChecked ? '#E50914' : '#94A3B8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                  >
                    {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>

                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    backgroundColor: isChecked ? '#E50914' : '#F8FAFC',
                    color: isChecked ? '#FFFFFF' : '#475569',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: isChecked ? '1px solid #E50914' : '1px solid #E2E8F0'
                  }}>
                    {labelUpper}
                  </span>

                  <span style={{
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    color: '#0F172A',
                    textDecoration: isChecked ? 'line-through' : 'none',
                    opacity: isChecked ? 0.75 : 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {meal.name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                    {meal.calories} <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>kcal</span>
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#475569', fontFamily: 'var(--font-mono)' }}>
                    P:<strong style={{ color: '#0F172A' }}>{meal.protein}g</strong> • C:<strong style={{ color: '#0F172A' }}>{meal.carbs}g</strong> • F:<strong style={{ color: '#0F172A' }}>{meal.fats}g</strong>
                  </span>
                  <button style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#F8FAFC',
                  borderTop: '1px solid #E2E8F0',
                  fontSize: '0.82rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px',
                }}
                className="grid-cols-1 md:grid-cols-2"
                >
                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#E50914', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginTop: 0 }}>
                      Ingredients Required:
                    </h4>
                    <ul style={{ paddingLeft: '16px', color: '#0F172A', display: 'flex', flexDirection: 'column', gap: '4px', margin: 0, fontWeight: 600 }}>
                      {meal.ingredients.map((ing, idx) => (
                        <li key={idx}>{ing}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Compass size={12} style={{ color: '#E50914' }} />
                      Preparation Guidelines:
                    </h4>
                    <p style={{ color: '#475569', lineHeight: '1.5', margin: 0, fontWeight: 500 }}>
                      {meal.instructions}
                    </p>
                  </div>
                </div>
              )}
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
              Upload a report or load sample panel to unlock your personalized meal plan
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

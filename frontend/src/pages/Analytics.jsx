import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Chart, registerables } from 'chart.js';
import { TrendingUp, Flame, Calendar, Play, X } from 'lucide-react';

Chart.register(...registerables);

const API_BASE_URL = 'http://localhost:8000';
axios.defaults.withCredentials = true;

const MUSCLE_COLORS = {
  Chest: 'bg-red-50 text-red-600 border border-red-150',
  Back: 'bg-blue-50 text-blue-600 border border-blue-150',
  Legs: 'bg-green-50 text-green-600 border border-green-150',
  Shoulders: 'bg-purple-50 text-purple-600 border border-purple-150',
  Biceps: 'bg-orange-50 text-orange-600 border border-orange-150',
  Triceps: 'bg-pink-50 text-pink-600 border border-pink-150',
  General: 'bg-slate-50 text-slate-600 border border-slate-150',
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // PR Modal States
  const [prModalOpen, setPrModalOpen] = useState(false);
  const [prExercise, setPrExercise] = useState('');
  const [prData, setPrData] = useState(null);
  const [prActiveTab, setPrActiveTab] = useState('e1rm'); // 'e1rm', 'weight', 'volume'

  // Video Modal States
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoExercise, setVideoExercise] = useState('');

  // Refs for Charts
  const prChartRef = useRef(null);
  const prChartInstance = useRef(null);
  const bwChartRef = useRef(null);
  const bwChartInstance = useRef(null);

  // Fetch Core Analytics Data
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/analytics/`);
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch analytics data', err);
      setError('Unable to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Initialize Bodyweight Chart when data is loaded
  useEffect(() => {
    if (!data) return;

    const renderBwChart = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/weekly-checkin/history/`);
        const checkins = res.data.checkins || [];
        const withWeight = checkins.filter(c => c.bodyweight_kg !== null);

        if (bwChartInstance.current) {
          bwChartInstance.current.destroy();
          bwChartInstance.current = null;
        }

        const ctx = bwChartRef.current?.getContext('2d');
        if (!ctx) return;

        if (withWeight.length === 0) {
          // If no weight entries exist, show empty state block
          document.getElementById('bodyweightEmpty').classList.remove('hidden');
          return;
        } else {
          document.getElementById('bodyweightEmpty').classList.add('hidden');
        }

        bwChartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: withWeight.map(c => c.week_label),
            datasets: [{
              label: 'Bodyweight (kg)',
              data: withWeight.map(c => c.bodyweight_kg),
              borderColor: '#34d399',
              backgroundColor: 'rgba(52, 211, 153, 0.08)',
              borderWidth: 2.5,
              tension: 0.35,
              fill: true,
              pointRadius: 5,
              pointBackgroundColor: '#34d399',
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#ffffff',
                titleColor: '#0f172a',
                bodyColor: '#334155',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 10,
                displayColors: false,
                callbacks: {
                  label: (item) => `${item.raw} kg`
                }
              }
            },
            scales: {
              x: {
                grid: { color: 'rgba(0,0,0,0.03)' },
                ticks: { color: '#64748b', font: { size: 11 } }
              },
              y: {
                grid: { color: 'rgba(0,0,0,0.03)' },
                ticks: { color: '#64748b', font: { size: 11 } },
                title: {
                  display: true,
                  text: 'kg',
                  color: '#64748b',
                  font: { size: 11 }
                }
              }
            }
          }
        });
      } catch (err) {
        console.warn('Failed to build bodyweight chart:', err);
      }
    };

    renderBwChart();

    return () => {
      if (bwChartInstance.current) {
        bwChartInstance.current.destroy();
        bwChartInstance.current = null;
      }
    };
  }, [data]);

  // Open PR Progress Graph Modal
  const openPrModal = async (exerciseName) => {
    setPrExercise(exerciseName);
    setPrModalOpen(true);
    setPrData(null);
    setPrActiveTab('e1rm');

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/exercise-pr/${encodeURIComponent(exerciseName)}/`
      );
      setPrData(res.data);
    } catch (err) {
      console.error('Failed to fetch PR progress data', err);
    }
  };

  // Close PR Modal & clean up
  const closePrModal = () => {
    setPrModalOpen(false);
    setPrData(null);
    setPrExercise('');
    if (prChartInstance.current) {
      prChartInstance.current.destroy();
      prChartInstance.current = null;
    }
  };

  // Render PR chart on tab change or data load
  useEffect(() => {
    if (!prModalOpen || !prData) return;

    if (prChartInstance.current) {
      prChartInstance.current.destroy();
      prChartInstance.current = null;
    }

    const ctx = prChartRef.current?.getContext('2d');
    if (!ctx) return;

    const history = prData.history || [];
    const labels = history.map(h => h.date);

    let chartData = [];
    let labelText = '';
    let valFormatter = (v) => v;

    if (prActiveTab === 'e1rm') {
      chartData = history.map(h => h.e1rm);
      labelText = 'Est. 1RM (kg)';
      valFormatter = (v) => `${v} kg`;
    } else if (prActiveTab === 'weight') {
      chartData = history.map(h => h.best_weight);
      labelText = 'Best Weight (kg)';
      valFormatter = (v) => `${v} kg`;
    } else if (prActiveTab === 'volume') {
      chartData = history.map(h => h.volume);
      labelText = 'Volume (kg)';
      valFormatter = (v) => `${v} kg`;
    }

    const pointBackgroundColor = history.map(h => h.is_pr ? '#f59e0b' : '#a78bfa');
    const pointBorderColor = history.map(h => h.is_pr ? '#f59e0b' : '#a78bfa');
    const pointRadius = history.map(h => h.is_pr ? 8 : 4);
    const pointHoverRadius = history.map(h => h.is_pr ? 10 : 6);

    prChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: labelText,
          data: chartData,
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(167, 139, 250, 0.08)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: pointBackgroundColor,
          pointBorderColor: pointBorderColor,
          pointRadius: pointRadius,
          pointHoverRadius: pointHoverRadius,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#ffffff',
            titleColor: '#0f172a',
            bodyColor: '#334155',
            borderColor: '#a78bfa',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (context) => {
                const index = context.dataIndex;
                const point = history[index];
                const valueStr = valFormatter(context.raw);
                let label = valueStr;
                if (point && point.is_pr) {
                  label += ' 🏆 PR';
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,0.03)' },
            ticks: { color: '#64748b', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.03)' },
            ticks: { color: '#64748b', font: { size: 10 } }
          }
        }
      }
    });

    return () => {
      if (prChartInstance.current) {
        prChartInstance.current.destroy();
        prChartInstance.current = null;
      }
    };
  }, [prModalOpen, prData, prActiveTab]);

  // Open Form Video Modal
  const openVideoModal = async (exerciseName) => {
    setVideoExercise(exerciseName);
    setVideoModalOpen(true);
    setVideoUrl('');

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/exercise-video/${encodeURIComponent(exerciseName)}/`
      );
      if (res.data.found) {
        setVideoUrl(res.data.video_url);
      }
    } catch (err) {
      console.error('Failed to load video URL', err);
    }
  };

  // Close Video Modal & clean up (resets URL to stop audio)
  const closeVideoModal = () => {
    setVideoModalOpen(false);
    setVideoUrl('');
    setVideoExercise('');
  };

  // Global ESC handler to close whichever modal is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (videoModalOpen) closeVideoModal();
        if (prModalOpen) closePrModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoModalOpen, prModalOpen]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <div className="w-10 h-10 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-semibold">Generating visual analytics report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center space-y-4">
        <p className="text-red-500 font-bold">{error}</p>
        <button 
          onClick={fetchAnalyticsData} 
          className="bg-brand-red hover:bg-brand-red-dark text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex items-center space-x-3">
        <div className="bg-brand-red/10 p-2.5 rounded-2xl">
          <TrendingUp className="w-6 h-6 text-brand-red" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 leading-none">Training Analytics</h2>
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black mt-1 block">Workout Metrics & PR Telemetry</span>
        </div>
      </div>

      {/* SECTION 1: Header Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1">Consistency Streak</span>
            <p className="text-3xl font-black text-slate-900 leading-none">{data.streak} Days</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-2xl">
            <Flame className="w-6 h-6 text-orange-500" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1">Total Sessions (30d)</span>
            <p className="text-3xl font-black text-slate-900 leading-none">{data.total_sessions_30d} Workouts</p>
          </div>
          <div className="bg-red-50 p-3 rounded-2xl">
            <Calendar className="w-6 h-6 text-brand-red" />
          </div>
        </div>
      </div>

      {/* SECTION 2: Today's Training Ledger */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Today's Training Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          {data.today_ledger.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm font-semibold">
              No exercises logged today. Head to Workouts to log your session.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  <th className="px-6 py-3">Exercise</th>
                  <th className="px-6 py-3">Muscle Group</th>
                  <th className="px-6 py-3">Logged Sets</th>
                  <th className="px-6 py-3">Record Details</th>
                  <th className="px-6 py-3">Form Check</th>
                </tr>
              </thead>
              <tbody>
                {data.today_ledger.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors">
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => openPrModal(log.exercise_name)}
                        className="text-sm font-bold text-slate-800 hover:text-brand-red hover:underline text-left cursor-pointer"
                      >
                        {log.exercise_name}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${MUSCLE_COLORS[log.muscle_group] || MUSCLE_COLORS.General}`}>
                        {log.muscle_group}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-semibold">
                      {log.sets} sets
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-slate-700 font-bold">
                          {log.weight ? `${log.weight}kg × ${log.reps}` : `${log.reps} reps`}
                        </span>
                        {log.is_pr && (
                          <span className="bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                            🏆 New PR!
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => openVideoModal(log.exercise_name)}
                        className="text-xs font-bold text-purple-500 border border-purple-200 rounded-full px-3 py-1 hover:bg-purple-50 flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <Play className="w-3 h-3 fill-purple-500" />
                        <span>Form</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SECTION 4: Bodyweight Trend Chart */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">⚖️ Bodyweight Progress Graph</h3>
        <div className="relative h-[240px]">
          <canvas ref={bwChartRef}></canvas>
          <div 
            id="bodyweightEmpty" 
            className="hidden absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-semibold"
          >
            Complete a weekly check-in to start tracking bodyweight.
          </div>
        </div>
      </div>

      {/* PR PROGRESS GRAPH MODAL */}
      {prModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closePrModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-150 p-6 space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={closePrModal} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title / Headers */}
            <div className="space-y-1 pr-8">
              <div className="flex items-center space-x-2">
                <h4 className="text-lg font-black text-slate-800 leading-none">{prExercise}</h4>
                {prData?.current_pr_e1rm > 0 && (
                  <span className="bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                    🏆 PR: {prData.current_pr_e1rm}kg
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-bold block">
                Session History Counter: {prData?.session_count || 0} workouts
              </span>
            </div>

            {/* Modal Tabs */}
            <div className="flex bg-slate-50 p-1 rounded-xl">
              {[
                { id: 'e1rm', label: 'Est. 1RM' },
                { id: 'weight', label: 'Best Weight' },
                { id: 'volume', label: 'Total Volume' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setPrActiveTab(tab.id)}
                  className={`flex-1 text-xs font-bold py-2 rounded-lg cursor-pointer transition-all ${
                    prActiveTab === tab.id
                      ? 'bg-white text-brand-red shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Line Chart */}
            <div className="relative h-[220px]">
              <canvas ref={prChartRef}></canvas>
            </div>
          </div>
        </div>
      )}

      {/* FORM CHECK VIDEO MODAL */}
      {videoModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeVideoModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-150 p-6 space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={closeVideoModal} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <h4 className="text-base font-black text-slate-800 leading-none pr-8">
              🎥 Form Execution: {videoExercise}
            </h4>

            {/* Video Frame container */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              {videoUrl ? (
                <iframe
                  className="w-full h-full"
                  src={videoUrl}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-sm space-y-2">
                  <Play className="w-10 h-10 stroke-slate-300" />
                  <p>Searching video demonstration database...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

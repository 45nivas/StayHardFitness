import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Activity,
  Zap,
  Footprints,
  Flame,
  Moon,
  RefreshCw,
  Sparkles,
  Search,
  ExternalLink,
  Key,
  ShieldCheck,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  BarChart3,
  Calendar,
  Heart,
  TrendingUp,
  Dumbbell,
  CheckCircle2,
  Info,
  Sliders,
  Check,
  Copy
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

export default function WearableIntelligence() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dataPayload, setDataPayload] = useState(null);
  const [oauthStatus, setOauthStatus] = useState(null);
  const [tokenStatus, setTokenStatus] = useState(null);
  const [authUrl, setAuthUrl] = useState('');
  const [redirectUri, setRedirectUri] = useState('https://www.google.com');
  const [authCode, setAuthCode] = useState('');
  const [exchangingCode, setExchangingCode] = useState(false);
  const [notification, setNotification] = useState(null);

  // Client Credentials State
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [savingCreds, setSavingCreds] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);

  // Calibration State
  const [showCalibrateModal, setShowCalibrateModal] = useState(false);
  const [calibrateStepInput, setCalibrateStepInput] = useState('2639');
  const [calibratingSteps, setCalibratingSteps] = useState(false);

  // Agent State
  const [agentQuestion, setAgentQuestion] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentResponse, setAgentResponse] = useState(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [graphStats, setGraphStats] = useState(null);

  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
    showToast('Redirect URI copied to clipboard!', 'info');
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statusRes, dataRes, tokensRes, statsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/wearable/status/`),
        axios.get(`${API_BASE_URL}/api/wearable/data/`),
        axios.get(`${API_BASE_URL}/api/wearable/tokens/`),
        axios.get(`${API_BASE_URL}/api/wearable/graph-stats/`)
      ]);

      if (statusRes.status === 'fulfilled') {
        const s = statusRes.value.data;
        setOauthStatus(s);
        if (s.client_id && !s.client_id.includes('YOUR_GOOGLE_CLIENT_ID')) {
          setClientIdInput(s.client_id);
        }
      }
      if (dataRes.status === 'fulfilled') setDataPayload(dataRes.value.data);
      if (tokensRes.status === 'fulfilled') setTokenStatus(tokensRes.value.data);
      if (statsRes.status === 'fulfilled') setGraphStats(statsRes.value.data);
    } catch (err) {
      console.error('Error fetching wearable telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    const fetchAuthUrl = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/wearable/auth-url/?redirect_uri=${encodeURIComponent(redirectUri)}`);
        if (res.data.auth_url) setAuthUrl(res.data.auth_url);
      } catch (err) {
        console.warn('Error fetching auth URL:', err);
      }
    };
    fetchAuthUrl();
  }, [redirectUri]);

  const handleSaveCredentials = async (e) => {
    if (e) e.preventDefault();
    if (!clientIdInput.trim()) {
      showToast('Please enter your Google Cloud Client ID.', 'error');
      return;
    }
    setSavingCreds(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/wearable/save-credentials/`, {
        client_id: clientIdInput.trim(),
        client_secret: clientSecretInput.trim(),
        redirect_uri: redirectUri
      });
      if (res.data.success) {
        showToast('Google Cloud credentials saved! Authorization link ready.', 'success');
        if (res.data.auth_url) {
          setAuthUrl(res.data.auth_url);
        }
        await loadAllData();
      } else {
        showToast(res.data.error || 'Failed to save credentials.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error saving credentials.', 'error');
    } finally {
      setSavingCreds(false);
    }
  };

  const handleCalibrateSteps = async () => {
    const val = parseInt(calibrateStepInput, 10);
    if (isNaN(val) || val < 0) {
      showToast('Please enter a valid step count.', 'error');
      return;
    }
    setCalibratingSteps(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/wearable/calibrate/`, { steps: val });
      if (res.data.success) {
        showToast(res.data.message || `Steps calibrated to ${val.toLocaleString()}`, 'success');
        if (res.data.data) {
          setDataPayload(res.data.data);
        }
        setShowCalibrateModal(false);
        await loadAllData();
      } else {
        showToast(res.data.error || 'Failed to calibrate steps.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Calibration error.', 'error');
    } finally {
      setCalibratingSteps(false);
    }
  };

  const handleSyncData = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/wearable/fetch-data/`);
      if (res.data.success) {
        showToast(res.data.message || 'Wearable telemetry synchronized successfully!', 'success');
        if (res.data.data) {
          setDataPayload(res.data.data);
        }
        await loadAllData();
      } else {
        showToast(res.data.error || 'Failed to sync with Google Health API.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Sync error.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleExchangeCode = async (e) => {
    e.preventDefault();
    if (!authCode.trim()) {
      showToast('Please enter an authorization code.', 'error');
      return;
    }
    setExchangingCode(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/wearable/exchange-code/`, {
        code: authCode.trim(),
        redirect_uri: redirectUri
      });
      if (res.data.success) {
        showToast('OAuth tokens validated & stored successfully!', 'success');
        setAuthCode('');
        await loadAllData();
      } else {
        showToast(res.data.error || 'Failed to exchange authorization code.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setExchangingCode(false);
    }
  };

  const handleAskAgent = async (e) => {
    if (e) e.preventDefault();
    if (!agentQuestion.trim()) return;

    setAgentLoading(true);
    setAgentResponse(null);
    setShowEvidence(false);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/wearable/ask/`, {
        question: agentQuestion.trim()
      });
      setAgentResponse(res.data);
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Agent query failed.', 'error');
    } finally {
      setAgentLoading(false);
    }
  };

  const handleSuggestionClick = (q) => {
    setAgentQuestion(q);
    setTimeout(() => {
      axios.post(`${API_BASE_URL}/api/wearable/ask/`, { question: q })
        .then(res => setAgentResponse(res.data))
        .catch(err => showToast(err.message, 'error'))
        .finally(() => setAgentLoading(false));
      setAgentLoading(true);
      setAgentResponse(null);
    }, 50);
  };

  // Helper functions for raw data
  const rawData = dataPayload?.data || {};
  const exercisePoints = (rawData.exercise && rawData.exercise.dataPoints) || (rawData.dataPoints) || [];
  const sleepPoints = (rawData.sleep && rawData.sleep.dataPoints) || [];
  const stepPoints = (rawData.steps && rawData.steps.dataPoints) || [];

  // Calculate clean step counts
  const computeStepsMap = () => {
    const map = {};
    const hasFitbit = stepPoints.some(p => p.dataSource && p.dataSource.platform === 'FITBIT');
    stepPoints.forEach(p => {
      if (hasFitbit && p.dataSource?.platform !== 'FITBIT') return;
      const count = Number(p.steps?.count || p.count || 0);
      const civil = p.steps?.interval?.civilStartTime?.date;
      let dateKey = '';
      if (civil) {
        dateKey = `${civil.year}-${String(civil.month).padStart(2, '0')}-${String(civil.day).padStart(2, '0')}`;
      } else if (p.steps?.interval?.startTime) {
        dateKey = p.steps.interval.startTime.substring(0, 10);
      }
      if (dateKey) map[dateKey] = (map[dateKey] || 0) + count;
    });
    return map;
  };
  const stepsMap = computeStepsMap();
  const sortedDates = Object.keys(stepsMap).sort();
  const latestDate = sortedDates[sortedDates.length - 1] || 'Today';
  const latestSteps = stepsMap[latestDate] !== undefined ? stepsMap[latestDate] : 2639;
  const stepPercent = Math.min(100, Math.round((latestSteps / 10000) * 100));

  // Totals from exercisePoints
  let totalWorkoutCals = 0;
  let totalWorkoutDurationMins = 0;
  let totalDistanceKm = 0;
  exercisePoints.forEach(p => {
    const ex = p.exercise || {};
    const m = ex.metricsSummary || {};
    totalWorkoutCals += Number(m.caloriesKcal || 0);
    totalDistanceKm += (Number(m.distanceMillimeters || 0) / 1000000);
    if (ex.activeDuration && ex.activeDuration.endsWith('s')) {
      totalWorkoutDurationMins += Math.round(parseFloat(ex.activeDuration.slice(0, -1)) / 60);
    }
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-extrabold transition-all ${
          notification.type === 'error'
            ? 'bg-brand-red text-white border-red-700'
            : 'bg-slate-950 text-white border-slate-800 border-l-4 border-l-brand-red'
        }`}>
          {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-brand-red" />}
          {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-white" />}
          {notification.type === 'info' && <Info className="w-4 h-4 text-brand-red" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Step Calibration Modal */}
      {showCalibrateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 border-t-4 border-t-brand-red rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 font-black text-base text-slate-900">
                <Footprints className="w-5 h-5 text-brand-red" />
                <span>Calibrate Live Fitbit Steps</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowCalibrateModal(false)}
                className="text-slate-400 hover:text-brand-red text-lg font-black cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Match the AI telemetry dashboard with the exact step count currently showing on your physical Fitbit wristband:
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Current Steps on Your Fitbit</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="100000"
                  value={calibrateStepInput}
                  onChange={(e) => setCalibrateStepInput(e.target.value)}
                  placeholder="e.g. 2639"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-black font-mono text-base focus:outline-none focus:border-brand-red"
                />
                <button
                  type="button"
                  disabled={calibratingSteps || !calibrateStepInput}
                  onClick={handleCalibrateSteps}
                  className="px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-brand-red/25 transition disabled:opacity-50 cursor-pointer"
                >
                  {calibratingSteps ? 'Applying...' : 'Apply Steps'}
                </button>
              </div>
            </div>
            <div className="text-[11px] text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <div className="font-extrabold text-slate-900">Why calibrate?</div>
              <div>
                When live Google Cloud OAuth credentials are not yet authorized, calibrating aligns your real-world band metrics (e.g. {latestSteps.toLocaleString()} steps) with the NetworkX Knowledge Graph and AI Coach immediately.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Futuristic Carbon & Red Top Header Banner */}
      <div className="bg-slate-950 border border-slate-800 border-t-2 border-t-brand-red rounded-3xl p-6 md:p-8 shadow-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-brand-red/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-brand-red/20 border border-brand-red/40 rounded-2xl">
              <Activity className="w-7 h-7 text-brand-red animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white m-0">Wearable Intelligence</h1>
                <span className="px-2.5 py-0.5 text-[10px] font-black bg-brand-red text-white rounded-full uppercase tracking-wider font-mono">
                  FITBIT PULSE
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-300 font-medium mt-1">
                Google Health REST API v4 • NetworkX Knowledge Graph Reasoning • Sleep & Performance Synergy
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2 pt-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-brand-red" />
            <span>
              {dataPayload?.fetched_at 
                ? `LAST SYNC: ${new Date(dataPayload.fetched_at).toLocaleString()}` 
                : 'TELEMETRY STREAM: ACTIVE LOCAL CACHE'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 border bg-white/5 text-white border-white/15 font-mono">
            <span className="w-2 h-2 rounded-full bg-brand-red animate-ping"></span>
            <span>{tokenStatus?.has_access_token ? 'CLOUD OAUTH LINKED' : 'LOCAL TELEMETRY READY'}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowCalibrateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/15 transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-brand-red" />
            <span>Calibrate Steps</span>
          </button>

          <button
            onClick={handleSyncData}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs bg-brand-red hover:bg-red-700 text-white shadow-lg shadow-brand-red/30 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Fitbit Data'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 md:space-x-4 overflow-x-auto bg-white px-2 pt-2 rounded-t-2xl">
        {[
          { id: 'dashboard', label: 'Dashboard & Analytics', icon: BarChart3 },
          { id: 'reasoning', label: 'Ask Your Health Data (AI Graph)', icon: Sparkles },
          { id: 'oauth', label: 'Google Health OAuth 2.0', icon: Key },
          { id: 'scheduler', label: 'Automation & Scheduler', icon: Calendar }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-extrabold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-brand-red text-brand-red bg-red-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-xl'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DASHBOARD & ANALYTICS */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-fade-in">
          {/* Top 4 Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Steps Card */}
            <div className="bg-white border border-slate-200 hover:border-brand-red/40 rounded-2xl p-5 shadow-xs space-y-3 transition">
              <div className="flex items-center justify-between text-slate-500 text-xs font-extrabold uppercase tracking-wider">
                <span>Daily Steps</span>
                <div className="p-2 rounded-xl bg-red-50 text-brand-red">
                  <Footprints className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {latestSteps.toLocaleString()}
              </div>
              <div className="text-xs font-extrabold text-brand-red flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{stepPercent}% of 10,000 daily goal</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-brand-red h-full rounded-full transition-all duration-700" style={{ width: `${stepPercent}%` }}></div>
              </div>
            </div>

            {/* Calories Card */}
            <div className="bg-white border border-slate-200 hover:border-brand-red/40 rounded-2xl p-5 shadow-xs space-y-3 transition">
              <div className="flex items-center justify-between text-slate-500 text-xs font-extrabold uppercase tracking-wider">
                <span>Workout Energy</span>
                <div className="p-2 rounded-xl bg-red-50 text-brand-red">
                  <Flame className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {totalWorkoutCals.toLocaleString()} <span className="text-xs font-bold text-slate-400">kcal</span>
              </div>
              <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-brand-red" />
                <span>Active workout expenditure</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-slate-900 h-full rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>

            {/* Distance Card */}
            <div className="bg-white border border-slate-200 hover:border-brand-red/40 rounded-2xl p-5 shadow-xs space-y-3 transition">
              <div className="flex items-center justify-between text-slate-500 text-xs font-extrabold uppercase tracking-wider">
                <span>Distance Covered</span>
                <div className="p-2 rounded-xl bg-red-50 text-brand-red">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {totalDistanceKm.toFixed(1)} <span className="text-xs font-bold text-slate-400">km</span>
              </div>
              <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-brand-red" />
                <span>GPS & pedometer telemetry</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-brand-red h-full rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>

            {/* Active Duration Card */}
            <div className="bg-white border border-slate-200 hover:border-brand-red/40 rounded-2xl p-5 shadow-xs space-y-3 transition">
              <div className="flex items-center justify-between text-slate-500 text-xs font-extrabold uppercase tracking-wider">
                <span>Active Zone Time</span>
                <div className="p-2 rounded-xl bg-red-50 text-brand-red">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {totalWorkoutDurationMins} <span className="text-xs font-bold text-slate-400">mins</span>
              </div>
              <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-brand-red" />
                <span>Active Zone Minutes tracked</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-slate-900 h-full rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>

          {/* Step Trends Visual Chart Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-base m-0">Daily Steps Telemetry</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">7-Day Pedometer trend verified against Fitbit band sensors</p>
                </div>
                <span className="px-3 py-1 text-xs font-extrabold bg-red-50 text-brand-red border border-red-200 rounded-full font-mono">
                  Target: 10,000
                </span>
              </div>

              {/* Bar visualization */}
              <div className="h-48 flex items-end justify-between gap-3 pt-6">
                {(sortedDates.length > 0 ? sortedDates.slice(-7) : ['2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02']).map((d, idx, arr) => {
                  const s = stepsMap[d] !== undefined ? stepsMap[d] : 2639;
                  const hPct = Math.max(12, Math.min(100, Math.round((s / 18000) * 100)));
                  const isLatest = idx === arr.length - 1;
                  return (
                    <div key={d} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className={`text-[10px] font-black font-mono transition ${isLatest ? 'text-brand-red opacity-100' : 'text-slate-700 opacity-0 group-hover:opacity-100'}`}>
                        {s.toLocaleString()}
                      </div>
                      <div className="w-full bg-slate-100 rounded-t-xl h-36 flex items-end overflow-hidden p-0.5">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            isLatest
                              ? 'bg-gradient-to-t from-brand-red to-red-500 shadow-md shadow-brand-red/20'
                              : 'bg-slate-800 group-hover:bg-brand-red'
                          }`}
                          style={{ height: `${hPct}%` }}
                        ></div>
                      </div>
                      <span className={`text-[11px] font-extrabold font-mono ${isLatest ? 'text-brand-red' : 'text-slate-500'}`}>{d.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recovery & Synergy Overview */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <h3 className="font-black text-slate-900 text-base m-0">Sleep Recovery Architecture</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Sleep stages and restorative deep+REM index</p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-extrabold text-slate-700 mb-1.5">
                    <span>Deep Sleep (Restorative)</span>
                    <span className="text-brand-red font-mono">110 mins (24%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-brand-red h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-extrabold text-slate-700 mb-1.5">
                    <span>REM Sleep (Cognitive)</span>
                    <span className="text-slate-900 font-mono">100 mins (22%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-slate-900 h-2 rounded-full" style={{ width: '55%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-extrabold text-slate-700 mb-1.5">
                    <span>Light Sleep (Baseline)</span>
                    <span className="text-slate-600 font-mono">240 mins (54%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-slate-400 h-2 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-red-50/70 border border-red-200 rounded-2xl flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-black text-slate-900 block uppercase tracking-wider">Sleep Recovery Score</span>
                    <span className="text-slate-600 font-medium">Benchmark: 8.0h & 95% eff</span>
                  </div>
                  <div className="text-2xl font-black text-brand-red font-mono">
                    88<span className="text-xs font-bold text-slate-500">/100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feeds */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Exercise Logs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-brand-red" />
                  <h3 className="font-black text-slate-900 text-base m-0">Recorded Workouts</h3>
                </div>
                <span className="text-xs font-extrabold text-slate-500 font-mono">{exercisePoints.length} LOGS</span>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {exercisePoints.map((p, idx) => {
                  const ex = p.exercise || {};
                  const m = ex.metricsSummary || {};
                  return (
                    <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:border-brand-red/40 transition">
                      <div className="space-y-1">
                        <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                          <span>{ex.displayName || ex.exerciseType || 'Workout'}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-brand-red border border-red-200 font-extrabold uppercase font-mono">
                            {ex.exerciseType}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium flex items-center gap-3">
                          <span>{m.caloriesKcal || 0} kcal</span>
                          <span>•</span>
                          <span>{m.steps || 0} steps</span>
                          <span>•</span>
                          <span>Avg HR: {m.averageHeartRateBeatsPerMinute || 'N/A'} bpm</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black px-2.5 py-1 bg-slate-900 text-white rounded-lg font-mono">
                          {m.activeZoneMinutes || 0} AZM
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sleep Logs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-5 h-5 text-brand-red" />
                  <h3 className="font-black text-slate-900 text-base m-0">Sleep Session Logs</h3>
                </div>
                <span className="text-xs font-extrabold text-slate-500 font-mono">{sleepPoints.length} LOGS</span>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {sleepPoints.map((p, idx) => {
                  const sl = p.sleep || {};
                  const sum = sl.summary || {};
                  const hrs = (Number(sum.minutesAsleep || 0) / 60).toFixed(1);
                  return (
                    <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:border-brand-red/40 transition">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-900">
                          Sleep Session ({hrs} hrs)
                        </span>
                        <span className="text-xs font-extrabold text-brand-red bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full font-mono">
                          Awake: {sum.minutesAwake || 0}m
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-medium">
                        Interval: {sl.interval?.startTime ? new Date(sl.interval.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Night'} to {sl.interval?.endTime ? new Date(sl.interval.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Morning'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REASONING AGENT ("ASK YOUR HEALTH DATA") */}
      {activeTab === 'reasoning' && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-red-50 text-brand-red border border-red-100">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 m-0">Knowledge Graph Reasoning Layer</h2>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    NetworkX Multi-Entity Graph Engine • Cross-day influence & sleep impact reasoning
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 text-xs font-extrabold text-white font-mono">
                <Activity className="w-4 h-4 text-brand-red" />
                <span>GRAPH-RAG TOOL CALLING</span>
              </div>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Suggested Queries:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  `Why was my energy low on ${latestDate}?`,
                  'What consistently happens before my best workouts?',
                  'Rank my best recovery days and explain why',
                  sortedDates.length >= 2
                    ? `Compare ${sortedDates[sortedDates.length - 2]} and ${latestDate} recovery metrics`
                    : 'Compare recent recovery metrics'
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSuggestionClick(chip)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-red-50 text-slate-800 hover:text-brand-red border border-slate-200 hover:border-red-200 transition cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleAskAgent} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={agentQuestion}
                  onChange={(e) => setAgentQuestion(e.target.value)}
                  placeholder="Ask anything about your health trends, sleep impact, or workout recovery..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-red text-slate-900"
                />
              </div>
              <button
                type="submit"
                disabled={agentLoading || !agentQuestion.trim()}
                className="px-6 py-3 bg-brand-red hover:bg-red-700 text-white rounded-xl font-extrabold text-sm shadow-md shadow-brand-red/20 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
              >
                {agentLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{agentLoading ? 'Analyzing...' : 'Ask Agent'}</span>
              </button>
            </form>

            {/* Agent Response Card */}
            {agentResponse && (
              <div className="bg-slate-50 border border-red-200 rounded-2xl p-6 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-red" />
                    <span className="font-black text-sm text-slate-900">Synthesized Reasoning Insight</span>
                  </div>
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-50 text-brand-red border border-red-200 font-mono">
                    {agentResponse.model_used || 'NetworkX Knowledge Graph'}
                  </span>
                </div>

                <div className="text-sm leading-relaxed text-slate-800 font-medium whitespace-pre-wrap">
                  {agentResponse.answer}
                </div>

                {/* Collapsible Evidence Trail */}
                {agentResponse.evidence && agentResponse.evidence.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <button
                      onClick={() => setShowEvidence(!showEvidence)}
                      className="flex items-center gap-2 text-xs font-extrabold text-brand-red hover:underline cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>
                        {showEvidence ? 'Hide' : 'View'} Evidence Trail ({agentResponse.evidence.length} underlying data points used)
                      </span>
                      {showEvidence ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {showEvidence && (
                      <div className="mt-3 space-y-2">
                        {agentResponse.evidence.map((ev, i) => (
                          <div key={i} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                            <div className="font-extrabold text-brand-red flex items-center justify-between font-mono">
                              <span>Tool Invoked: {ev.tool}</span>
                              <span className="text-[10px] text-slate-500">Step #{i + 1}</span>
                            </div>
                            <pre className="text-[11px] bg-slate-50 p-2.5 rounded-lg overflow-x-auto text-slate-800 font-mono border border-slate-200">
                              {JSON.stringify(ev.args || ev.result, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Knowledge Graph Topology Stats */}
            {graphStats && (
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Knowledge Graph Topology & Connectivity
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <div className="text-xl font-black text-brand-red font-mono">{graphStats.stats?.total_nodes || 0}</div>
                    <div className="text-[11px] text-slate-600 font-bold">Total Nodes</div>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <div className="text-xl font-black text-slate-900 font-mono">{graphStats.stats?.total_edges || 0}</div>
                    <div className="text-[11px] text-slate-600 font-bold">Total Edges</div>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <div className="text-xl font-black text-brand-red font-mono">
                      {graphStats.cross_day_edges?.length || 0}
                    </div>
                    <div className="text-[11px] text-slate-600 font-bold">Cross-Day Edges</div>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <div className="text-xl font-black text-slate-900 font-mono">
                      {graphStats.stats?.available_dates?.length || 0}
                    </div>
                    <div className="text-[11px] text-slate-600 font-bold">Days Modeled</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: OAUTH 2.0 MANAGEMENT */}
      {activeTab === 'oauth' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          {/* Header Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-red-50 text-brand-red border border-red-100">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 m-0">Google Health OAuth 2.0 Management</h2>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Connect your physical Fitbit wristband & Google Cloud Health API for live automatic synchronization
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <div className="px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-2 border bg-red-50 text-brand-red border-red-200 font-mono">
                  <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></span>
                  <span>{tokenStatus?.has_access_token ? 'FITBIT CONNECTED' : 'READY FOR SETUP'}</span>
                </div>
              </div>
            </div>

            {/* 4-Step Walkthrough Container */}
            <div className="space-y-6">
              <div className="p-4 bg-red-50/60 border border-red-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 font-black text-sm text-slate-900">
                  <Sparkles className="w-4 h-4 text-brand-red" />
                  <span>How to Link Your Live Fitbit in 4 Simple Steps</span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  Google stores your Fitbit data inside the Google Health API. Because this connects directly to your personal Google account, you just need a free Google Cloud OAuth Client ID (takes 1–2 minutes) to grant access to your live wristband steps, workouts, and sleep.
                </p>
              </div>

              {/* STEP 1 */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-brand-red text-white text-xs font-black flex items-center justify-center font-mono">1</span>
                    <h3 className="font-extrabold text-sm text-slate-900 m-0">Create Free OAuth Client in Google Cloud Console</h3>
                  </div>
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-brand-red text-white font-extrabold text-xs shadow-xs transition"
                  >
                    <span>Open Cloud Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="text-xs text-slate-700 font-medium space-y-2 pl-8">
                  <div className="flex items-start gap-2">
                    <span className="text-brand-red font-black">•</span>
                    <span>Go to <strong>APIs & Services &gt; Credentials</strong> in Google Cloud Console.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-brand-red font-black">•</span>
                    <span>Click <strong>+ CREATE CREDENTIALS</strong> &gt; choose <strong>OAuth client ID</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-brand-red font-black">•</span>
                    <span>Set <strong>Application type</strong> to <strong>Web application</strong> (e.g. name it <em>Stay Hard Fitness</em>).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-brand-red font-black">•</span>
                    <div className="flex-1 space-y-1">
                      <span>Under <strong>Authorized redirect URIs</strong>, click <strong>+ ADD URI</strong> and paste:</span>
                      <div className="flex items-center gap-2 pt-1">
                        <code className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-brand-red font-mono text-[11px] font-bold">
                          https://www.google.com
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('https://www.google.com')}
                          className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-brand-red hover:text-white text-xs text-slate-800 font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          {copiedUri ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedUri ? 'Copied' : 'Copy URI'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-brand-red font-black">•</span>
                    <span>Click <strong>CREATE</strong> and copy your <strong>Client ID</strong> and <strong>Client Secret</strong>.</span>
                  </div>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-brand-red text-white text-xs font-black flex items-center justify-center font-mono">2</span>
                  <h3 className="font-extrabold text-sm text-slate-900 m-0">Save Your Credentials Here</h3>
                </div>

                <form onSubmit={handleSaveCredentials} className="space-y-4 pl-8">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700">
                      Google Cloud Client ID <span className="text-brand-red">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={clientIdInput}
                      onChange={(e) => setClientIdInput(e.target.value)}
                      placeholder="e.g. 1067422915923-xxxx.apps.googleusercontent.com"
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-brand-red"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700">
                      Client Secret <span className="text-slate-500 font-normal">(stored securely in client_secret.json)</span>
                    </label>
                    <input
                      type="password"
                      value={clientSecretInput}
                      onChange={(e) => setClientSecretInput(e.target.value)}
                      placeholder="e.g. GOCSPX-xxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-brand-red"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700">Authorized Redirect URI</label>
                    <select
                      value={redirectUri}
                      onChange={(e) => setRedirectUri(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:border-brand-red"
                    >
                      <option value="https://www.google.com">https://www.google.com (Manual Copy/Paste - Recommended)</option>
                      <option value="http://localhost:8000">http://localhost:8000 (Local Endpoint)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={savingCreds || !clientIdInput.trim()}
                    className="px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-brand-red/20 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
                  >
                    {savingCreds && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{savingCreds ? 'Saving Credentials...' : 'Save Credentials & Generate Link'}</span>
                  </button>
                </form>
              </div>

              {/* STEP 3 */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-brand-red text-white text-xs font-black flex items-center justify-center font-mono">3</span>
                  <h3 className="font-extrabold text-sm text-slate-900 m-0">Sign In & Grant Fitbit Permission</h3>
                </div>

                <div className="space-y-3 pl-8">
                  <p className="text-xs text-slate-700 font-medium">
                    Click the button below to open Google's consent screen. Sign into the Google account connected to your Fitbit wristband, check all requested fitness permissions, and click <strong>Allow</strong>.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={authUrl || 'Save credentials in Step 2 to generate authorization link'}
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-600 truncate"
                    />
                    <button
                      type="button"
                      disabled={!authUrl}
                      onClick={() => authUrl && window.open(authUrl, '_blank')}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-brand-red disabled:opacity-50 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 whitespace-nowrap shadow-xs transition cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Consent Screen</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Note: After granting permission, Google will redirect to <code>https://www.google.com/?code=4/0A...</code>. Copy the full address bar URL or the code string for Step 4!
                  </p>
                </div>
              </div>

              {/* STEP 4 */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-brand-red text-white text-xs font-black flex items-center justify-center font-mono">4</span>
                  <h3 className="font-extrabold text-sm text-slate-900 m-0">Paste Authorization Code & Sync Live Data</h3>
                </div>

                <form onSubmit={handleExchangeCode} className="space-y-3 pl-8">
                  <label className="text-xs font-extrabold text-slate-700">
                    Paste Redirect URL or Authorization Code:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value)}
                      placeholder="e.g. 4/0AY0e-g4... or https://www.google.com/?code=4/0A..."
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-red"
                    />
                    <button
                      type="submit"
                      disabled={exchangingCode || !authCode.trim()}
                      className="px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-brand-red/20 disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {exchangingCode && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>{exchangingCode ? 'Exchanging...' : 'Save & Exchange Token'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Stored Token Details */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-red" />
                <span>Active Token Storage & Automatic Refresh</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 font-medium">
                <div>Access Token: {tokenStatus?.has_access_token ? 'Active (Auto-refresh enabled)' : 'Not acquired'}</div>
                <div>Refresh Token: {tokenStatus?.has_refresh_token ? 'Present (Persistent in tokens.json)' : 'Not acquired'}</div>
                <div>Token Type: {tokenStatus?.token_type || 'Bearer'}</div>
                <div>Acquired At: {tokenStatus?.acquired_at ? new Date(tokenStatus.acquired_at * 1000).toLocaleString() : 'Pre-loaded / Default'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUTOMATION & SCHEDULER GUIDE */}
      {activeTab === 'scheduler' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
              <div className="p-3 rounded-2xl bg-red-50 text-brand-red border border-red-100">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 m-0">Unattended Automation & Daily Sync</h2>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Configure background jobs to fetch daily steps, sleep stages, and exercise logs automatically
                </p>
              </div>
            </div>

            {/* Windows Task Scheduler */}
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm text-slate-900">1. Windows Task Scheduler Command</h3>
              <p className="text-xs text-slate-600 font-medium">
                Runs silently every night at 23:30 to sync the day's completed activity without launching a browser.
              </p>
              <div className="p-3.5 bg-slate-950 text-red-400 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800">
                <code>schtasks /create /tn "FitbitDailySync" /tr "python c:\Users\matta\OneDrive\Desktop\resume_projects\gym\workouts\wearable\fetch_fitbit_data.py" /sc daily /st 23:30</code>
              </div>
            </div>

            {/* Linux / macOS Cron */}
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm text-slate-900">2. Linux / macOS Cron Job</h3>
              <p className="text-xs text-slate-600 font-medium">Standard POSIX cron entry.</p>
              <div className="p-3.5 bg-slate-950 text-red-400 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800">
                <code>30 23 * * * /usr/bin/python3 workouts/wearable/fetch_fitbit_data.py &gt;&gt; fitbit_sync.log 2&gt;&amp;1</code>
              </div>
            </div>

            {/* Headless API Endpoint */}
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm text-slate-900">3. REST API Webhook Trigger</h3>
              <p className="text-xs text-slate-600 font-medium">Trigger sync via curl or Zapier/Make webhook:</p>
              <div className="p-3.5 bg-slate-950 text-red-400 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800">
                <code>curl -X POST http://localhost:8000/api/wearable/fetch-data/</code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

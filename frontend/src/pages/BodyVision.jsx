import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Loader2, 
  AlertTriangle, 
  Activity, 
  TrendingUp, 
  Compass,
  Play,
  X
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export default function BodyVision() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  // Gallery States
  const [bodyScans, setBodyScans] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);

  const fetchGallery = async () => {
    setGalleryLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/body-scan/history/`);
      setBodyScans(res.data.scans);
    } catch(e) {
      console.warn('Gallery fetch error:', e);
    } finally {
      setGalleryLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const getHintText = () => {
    if (!selectedA) return "🔵 Click a scan to select as Before";
    if (!selectedB) return "🟡 Now click another scan to select as After";
    return "✓ Ready to compare. Click the button below.";
  };

  const handleThumbClick = (scan) => {
    // If both already selected, reset
    if (selectedA && selectedB) {
      setSelectedA(scan);
      setSelectedB(null);
      setComparisonData(null);
      return;
    }
    // First selection = A
    if (!selectedA) {
      setSelectedA(scan);
      return;
    }
    // Second selection = B (must be different scan)
    if (scan.id !== selectedA.id) {
      setSelectedB(scan);
    }
  };

  const handleCompare = async () => {
    if (!selectedA || !selectedB) return;
    setComparing(true);
    
    // Auto-swap: earlier date = scan_a (Before)
    const dateA = new Date(selectedA.date);
    const dateB = new Date(selectedB.date);
    const [idA, idB] = dateA <= dateB 
      ? [selectedA.id, selectedB.id]
      : [selectedB.id, selectedA.id];
    
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/body-scan/compare/?a=${idA}&b=${idB}`
      );
      setComparisonData(res.data);
    } catch(e) {
      console.error('Compare error:', e);
    } finally {
      setComparing(false);
    }
  };

  const handleFileChange = (e) => {
    setError('');
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, or WEBP photo only.');
      return;
    }

    // Validate size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResults(null);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('photo', selectedFile);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/analyse-body/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        setResults(res.data.analysis);
        fetchGallery(); // Trigger fetchGallery() immediately on successful scan
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Analysis failed. Make sure your chest, shoulders, and hips are clearly visible.');
    } finally {
      setLoading(false);
    }
  };

  // Convert muscle scores JSON to Recharts format
  const getRadarData = (muscleScores) => {
    if (!muscleScores) return [];
    return Object.entries(muscleScores).map(([muscle, score]) => ({
      subject: muscle.replace('_', ' ').toUpperCase(),
      score: score,
      fullMark: 10
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 m-0">Body Vision Analyser</h2>
        <p className="text-slate-500 text-sm mt-1">Upload a front-facing physique photo to extract muscle proportions, skeletal tapers, and balancing parameters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload Form Block */}
        <div className="lg:col-span-1 bg-dark-card border border-dark-border p-6 rounded-3xl h-fit shadow-sm space-y-5">
          <div className="flex items-center space-x-2 border-b border-dark-border pb-3">
            <Camera className="w-5 h-5 text-brand-red" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 m-0">Photo Uploader</h3>
          </div>

          {error && (
            <div className="bg-brand-red/10 border border-brand-red/50 text-brand-red text-xs p-3 rounded-lg text-center font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-5">
            {/* File Drag Box */}
            <div className="relative border-2 border-dashed border-dark-border hover:border-brand-red rounded-2xl overflow-hidden aspect-[3/4] flex items-center justify-center bg-slate-50 cursor-pointer group transition-all duration-200">
              <input 
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-20"
              />
              
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Preview"
                  className="w-full h-full object-cover z-10"
                />
              ) : (
                <div className="text-center p-4 space-y-2 select-none z-10">
                  <Upload className="w-10 h-10 text-slate-450 group-hover:text-brand-red mx-auto transition-colors duration-200" />
                  <p className="text-xs font-bold text-slate-700">Upload shirtless photo</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">JPG, PNG or WEBP (Max 10MB)</p>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="w-full bg-brand-red hover:bg-brand-red-hover text-white py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 shadow-md shadow-brand-red/10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scanning Physique...</span>
                </>
              ) : (
                <span>ANALYSE SYMMETRY</span>
              )}
            </button>
          </form>
        </div>

        {/* Results Block */}
        <div className="lg:col-span-2">
          {results ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Muscle Balance Radar Chart */}
              <div className="bg-dark-card border border-dark-border p-6 rounded-3xl shadow-sm flex flex-col md:flex-row gap-6">
                
                {/* Chart Frame */}
                <div className="w-full md:w-1/2 aspect-square flex items-center justify-center bg-white border border-dark-border rounded-2xl p-2 shadow-inner">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={getRadarData(results.muscle_scores)}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8' }} />
                      <Radar
                        name="Development"
                        dataKey="score"
                        stroke="#e50914"
                        fill="#e50914"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Muscle metrics lists */}
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Physique Classification</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase select-none">
                      {results.taper_assessment || 'Athletic'} • {results.body_type || 'Mesomorph'}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dominant Groups</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {results.dominant_groups.map(g => (
                          <span key={g} className="bg-white border border-dark-border text-slate-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-brand-red uppercase tracking-widest">Weak / Lagging Groups</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {results.weak_groups.map(g => (
                          <span key={g} className="bg-brand-red/10 border border-brand-red/20 text-brand-red text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Landmark Ratios Grid */}
                  {results.landmark_data && (
                    <div className="grid grid-cols-3 gap-2 text-center bg-white border border-dark-border p-3.5 rounded-xl shadow-sm">
                      <div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase block">Taper Ratio</span>
                        <p className="text-sm font-black text-slate-900 mt-0.5">{results.landmark_data.taper_ratio?.toFixed(2) || '1.0'}</p>
                      </div>
                      <div className="border-x border-dark-border">
                        <span className="text-[8px] text-slate-400 font-bold uppercase block">Arm Symmetry</span>
                        <p className="text-sm font-black text-slate-900 mt-0.5">{results.landmark_data.arm_symmetry_score?.toFixed(1) || '100'}%</p>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase block">Leg Symmetry</span>
                        <p className="text-sm font-black text-slate-900 mt-0.5">{results.landmark_data.leg_symmetry_score?.toFixed(1) || '100'}%</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendation Split */}
              <div className="bg-dark-card border border-dark-border p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-dark-border pb-3">
                  <TrendingUp className="w-5 h-5 text-brand-red" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 m-0">Recommended Programming</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1 bg-white border border-dark-border p-4 rounded-xl text-center flex flex-col justify-center shadow-sm">
                    <span className="text-[8px] text-slate-400 font-bold uppercase block">Suggested Split</span>
                    <p className="text-sm font-black text-brand-red uppercase mt-1 leading-tight">{results.suggested_split}</p>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <span className="text-[8px] text-slate-400 font-bold uppercase block">Priority Recommendations</span>
                    <p className="text-xs text-slate-700 leading-relaxed font-semibold italic mt-1">
                      "{results.priority_recommendation}"
                    </p>
                  </div>
                </div>
              </div>

            </motion.div>
          ) : (
            <div className="bg-dark-card border border-dark-border border-dashed p-12 rounded-3xl text-center text-slate-500 text-sm font-semibold h-full flex flex-col justify-center items-center space-y-3 min-h-[40vh]">
              <Compass className="w-8 h-8 text-slate-400 animate-spin" />
              <p>Upload a shirtless posture snapshot to calculate skeletal tapering and muscular density balance.</p>
            </div>
          )}
        </div>

      </div>

      {/* --- ADDED: Progress Gallery Section --- */}
      <div className="mt-8 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-2">📸 Progress Gallery</h3>
        
        {galleryLoading ? (
          <div className="flex items-center justify-center py-12 space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            <p className="text-slate-400 text-xs font-semibold">Synchronizing past body scans...</p>
          </div>
        ) : bodyScans.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm font-semibold">
            No scans yet. Upload your first photo above to start tracking your progress.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selection Hint */}
            <span className="text-xs font-semibold text-slate-500 block">
              {getHintText()}
            </span>

            {/* Thumbnail strip */}
            <div className="flex gap-3 overflow-x-auto pb-2 mb-4 scrollbar-thin">
              {[...bodyScans].reverse().map((scan) => {
                const isSelectedA = selectedA?.id === scan.id;
                const isSelectedB = selectedB?.id === scan.id;
                return (
                  <div
                    key={scan.id}
                    onClick={() => handleThumbClick(scan)}
                    className={`w-18 h-18 rounded-xl overflow-hidden cursor-pointer border-2 flex-shrink-0 relative transition-all duration-200 ${
                      isSelectedA 
                        ? 'border-blue-400 shadow-md scale-95' 
                        : isSelectedB 
                          ? 'border-amber-400 shadow-md scale-95' 
                          : 'border-transparent'
                    }`}
                  >
                    <img 
                      src={scan.image_url} 
                      alt={scan.week_label}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.background = 'rgba(0,0,0,0.05)';
                        e.target.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 72 72%22><rect width=%2272%22 height=%2272%22 fill=%22%230f0c29%22/><text x=%2236%22 y=%2242%22 text-anchor=%22middle%22 fill=%22%23334155%22 font-size=%2220%22>📷</text></svg>';
                      }}
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] text-white font-bold text-center py-0.5 leading-tight truncate">
                      W{scan.week}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compare Button */}
            {selectedA && selectedB && (
              <button
                onClick={handleCompare}
                disabled={comparing}
                className="bg-brand-red hover:bg-brand-red-hover text-white py-2 px-6 rounded-full font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 inline-flex items-center space-x-2 shadow-md shadow-brand-red/10"
              >
                {comparing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{comparing ? 'COMPARING...' : 'COMPARE SELECTED SCANS'}</span>
              </button>
            )}

            {/* Comparison Panel */}
            {comparisonData && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-2 gap-4">
                  {/* Before Column */}
                  <div className="border border-blue-100 rounded-2xl overflow-hidden bg-slate-50/50">
                    <div className="bg-blue-50 text-blue-500 font-black text-[10px] uppercase tracking-wider px-4 py-2.5 border-b border-blue-100">
                      🔵 BEFORE ({comparisonData.scan_a.date})
                    </div>
                    <img 
                      src={comparisonData.scan_a.image_url} 
                      alt="Before" 
                      className="w-full aspect-square object-cover" 
                    />
                    <div className="p-2 space-y-1 bg-white">
                      {Object.entries(comparisonData.scan_a.scores).map(([muscle, score]) => (
                        <div key={muscle} className="flex justify-between items-center text-xs px-2.5 py-1.5 border-b border-slate-100 last:border-0">
                          <span className="text-slate-500 capitalize">{muscle.replace('_', ' ')}</span>
                          <span className="text-blue-500 font-bold">{score}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* After Column */}
                  <div className="border border-amber-100 rounded-2xl overflow-hidden bg-slate-50/50">
                    <div className="bg-amber-50 text-amber-500 font-black text-[10px] uppercase tracking-wider px-4 py-2.5 border-b border-amber-100">
                      🟡 AFTER ({comparisonData.scan_b.date})
                    </div>
                    <img 
                      src={comparisonData.scan_b.image_url} 
                      alt="After" 
                      className="w-full aspect-square object-cover" 
                    />
                    <div className="p-2 space-y-1 bg-white">
                      {Object.entries(comparisonData.scan_b.scores).map(([muscle, score]) => (
                        <div key={muscle} className="flex justify-between items-center text-xs px-2.5 py-1.5 border-b border-slate-100 last:border-0">
                          <span className="text-slate-500 capitalize">{muscle.replace('_', ' ')}</span>
                          <span className="text-amber-500 font-bold">{score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Delta rows */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white mt-4 shadow-sm">
                  <div className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-wider px-4 py-2.5 border-b border-slate-100">
                    Muscle Changes
                  </div>
                  <div className="p-2 space-y-0.5 bg-white">
                    {Object.entries(comparisonData.deltas).map(([muscle, d]) => {
                      const sign = d.delta > 0 ? '+' : '';
                      const badgeClass = d.delta > 0 
                        ? 'bg-green-50 text-green-600 border border-green-200' 
                        : d.delta < 0 
                          ? 'bg-red-50 text-red-600 border border-red-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200';
                      return (
                        <div key={muscle} className="flex justify-between items-center text-xs px-4 py-2 border-b border-slate-100 last:border-0">
                          <span className="text-slate-600 capitalize font-bold">{muscle.replace('_', ' ')}</span>
                          <span className="text-slate-400 font-semibold">{d.score_a} → {d.score_b}</span>
                          <span className={`text-[10px] font-black uppercase rounded-full px-2 py-0.5 ${badgeClass}`}>
                            {sign}{d.delta}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 mt-4 space-y-3 shadow-sm">
                  <h4 className="text-sm font-black text-purple-700 flex items-center space-x-1">
                    <span>🤖 AI Coach Analysis</span>
                  </h4>
                  <p className="text-slate-700 text-xs leading-relaxed font-semibold">{comparisonData.ai_analysis.summary}</p>
                  
                  <div className="space-y-1.5">
                    {comparisonData.ai_analysis.improvements?.map((imp, idx) => (
                      <div key={idx} className="text-xs text-green-700 font-bold flex items-center space-x-1">
                        <span>✓</span>
                        <span>{imp}</span>
                      </div>
                    ))}
                  </div>
                  
                  {comparisonData.ai_analysis.still_working_on && (
                    <div className="text-xs text-amber-700 font-bold flex items-center space-x-1">
                      <span>→</span>
                      <span>{comparisonData.ai_analysis.still_working_on}</span>
                    </div>
                  )}

                  {comparisonData.ai_analysis.composition_trend && (
                    <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase mt-2 ${
                      comparisonData.ai_analysis.composition_trend === 'leaner'
                        ? 'bg-green-100 text-green-700'
                        : comparisonData.ai_analysis.composition_trend === 'more_mass'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      {comparisonData.ai_analysis.composition_trend === 'leaner'
                        ? '📉 Getting Leaner'
                        : comparisonData.ai_analysis.composition_trend === 'more_mass'
                          ? '📈 Building Mass'
                          : '➡️ Maintaining'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

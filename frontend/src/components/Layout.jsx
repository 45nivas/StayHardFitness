import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Dumbbell, 
  Utensils, 
  Calculator, 
  MessageSquare, 
  Camera, 
  BarChart2, 
  LogOut, 
  Flame,
  TrendingUp,
  Activity,
  Watch,
  Cpu
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';
axios.defaults.withCredentials = true;

export default function Layout({ children, user, setUser }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/logout/`);
      setUser(null);
      navigate('/login');
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const navSections = [
    {
      title: "AI Command Core",
      items: [
        { name: 'Command Center', path: '/', icon: BarChart2, badge: 'OS' },
        { name: 'AI Coach Chat', path: '/chat', icon: MessageSquare, badge: '5-Layer' },
      ]
    },
    {
      title: "Biometric & Clinical AI",
      items: [
        { name: 'Wearable Pulse', path: '/wearable', icon: Watch, badge: 'SYNC' },
        { name: 'Clinical Lab RAG', path: '/clinical-lab', icon: Activity, badge: '7-Agent' },
      ]
    },
    {
      title: "Training & Vision",
      items: [
        { name: 'Workouts & Vision', path: '/workouts', icon: Dumbbell },
        { name: 'Analytics & PRs', path: '/analytics', icon: TrendingUp },
        { name: '1RM Strength', path: '/1rm', icon: Calculator },
        { name: 'Body Vision AI', path: '/body-vision', icon: Camera },
      ]
    },
    {
      title: "Metabolic Fueling",
      items: [
        { name: 'Calorie Tracker', path: '/diet', icon: Utensils },
        { name: 'Carb Cycling', path: '/carb-cycling', icon: Flame },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-[4px_0_24px_rgba(15,23,42,0.03)] h-auto md:h-screen sticky top-0 z-30">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-gradient-to-r from-white via-white to-red-50/40">
            <div className="flex items-center space-x-3">
              <div className="bg-brand-red p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-brand-red/25 ring-2 ring-brand-red/15">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-black tracking-tight text-slate-900 m-0 leading-none">STAY HARD</h1>
                  <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.18em] text-brand-red font-extrabold mt-1 block font-mono">
                  AI PERFORMANCE OS
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links with Suite Sections */}
          <nav className="p-3.5 space-y-5 overflow-y-auto flex-1">
            {navSections.map((sec) => (
              <div key={sec.title} className="space-y-1">
                <div className="flex items-center gap-1.5 px-3 py-1">
                  <span className="w-1 h-2.5 bg-brand-red rounded-full"></span>
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 block">
                    {sec.title}
                  </span>
                </div>
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path === '/wearable' && location.pathname === '/fitbit');
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                        isActive 
                          ? 'bg-brand-red text-white shadow-md shadow-brand-red/25 translate-x-0.5' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold tracking-wider uppercase font-mono ${
                          isActive
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'bg-red-50 text-brand-red border border-red-200'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* User Profile Summary & Logout */}
        {user && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between mb-3">
              <Link to="/profile" className="flex items-center space-x-3 group">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white font-black text-xs shadow-sm group-hover:bg-brand-red transition-colors">
                  {user.username.substring(0, 2).toUpperCase()}
                </div>
                <div className="truncate max-w-[130px]">
                  <p className="text-xs font-black truncate text-slate-900 leading-none m-0 group-hover:text-brand-red transition-colors">{user.username}</p>
                  <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1 font-mono">
                    <Cpu className="w-2.5 h-2.5 text-brand-red" /> BIO-LINK ACTIVE
                  </span>
                </div>
              </Link>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-brand-red hover:text-white text-slate-700 border border-slate-200 hover:border-brand-red py-2 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect Session</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 bg-white ai-grid-bg p-6 md:p-10 overflow-y-auto max-h-screen">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

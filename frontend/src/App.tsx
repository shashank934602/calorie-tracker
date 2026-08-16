import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Server, 
  Database, 
  Layers, 
  Terminal, 
  Globe,
  Clock
} from 'lucide-react';
import { checkBackendHealth, HealthCheckResponse } from './services/api';

export default function App(): React.JSX.Element {
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setIsLoading(true);
    const result = await checkBackendHealth();
    setHealthData(result.data);
    setLatency(result.latencyMs);
    setError(result.error);
    setLastChecked(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shadow-inner">
              🥗
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">CalorieTrack</span>
                <span className="text-[11px] font-medium tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  Foundation Phase
                </span>
              </div>
              <p className="text-xs text-slate-400">AI-Ready Calorie & Macro Tracking Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchHealth}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 border border-slate-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isLoading ? 'Checking...' : 'Ping API'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 flex flex-col gap-8">
        {/* Hero Section */}
        <section className="text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Project Scaffolding & Health Check
          </h1>
          <p className="mt-2 text-base text-slate-400 max-w-3xl">
            The full-stack foundation has been successfully configured with strict TypeScript, Vite, Tailwind CSS, Express, and Prisma ORM.
          </p>
        </section>

        {/* Server Status Hero Card */}
        <section className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-6 sm:p-8 shadow-xl shadow-black/40 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                healthData?.status === 'ok' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : error 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                {healthData?.status === 'ok' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : error ? (
                  <XCircle className="w-6 h-6" />
                ) : (
                  <Activity className="w-6 h-6 animate-pulse" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">
                    {healthData?.status === 'ok' ? 'Backend API Online' : error ? 'Backend Connection Error' : 'Connecting to API...'}
                  </h2>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                    healthData?.status === 'ok'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : error
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {healthData?.status === 'ok' ? 'HTTP 200 OK' : error ? 'Disconnected' : 'Checking'}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                  {healthData?.message || error || 'Attempting to query GET /api/health...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              {lastChecked && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Checked: {lastChecked.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-xs text-slate-400 font-medium">Roundtrip Latency</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {latency !== null ? `${latency}ms` : '—'}
                </span>
                <span className="text-xs text-slate-500">RTT</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-xs text-slate-400 font-medium">Environment</span>
              <div className="mt-1">
                <span className="text-base font-semibold text-slate-200 capitalize">
                  {healthData?.environment || '—'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-xs text-slate-400 font-medium">Server Uptime</span>
              <div className="mt-1 font-mono text-base font-semibold text-slate-200">
                {healthData?.uptime !== undefined ? formatUptime(healthData.uptime) : '—'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-xs text-slate-400 font-medium">API Version</span>
              <div className="mt-1 font-mono text-base font-semibold text-slate-200">
                {healthData?.version ? `v${healthData.version}` : '—'}
              </div>
            </div>
          </div>

          {/* Response payload viewer */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                Live Response Payload (GET /api/health)
              </span>
              <span className="text-[11px] font-mono text-slate-500">application/json</span>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
              {healthData
                ? JSON.stringify(healthData, null, 2)
                : error
                ? JSON.stringify({ error, hint: 'Make sure the backend server is running on port 5000' }, null, 2)
                : 'Loading response...'}
            </pre>
          </div>
        </section>

        {/* Stack Overview Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Frontend Spec Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 text-emerald-400 font-semibold mb-3">
                <Globe className="w-4 h-4" />
                <h3>Frontend Layer</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  <strong>React 18</strong> with Strict TypeScript
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  <strong>Vite</strong> fast HMR bundler
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  <strong>Tailwind CSS</strong> utility styling
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  <strong>Vite Proxy</strong> routing <code className="text-emerald-300 bg-slate-800 px-1 py-0.5 rounded">/api</code>
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
              Port: 5173
            </div>
          </div>

          {/* Backend Spec Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 text-blue-400 font-semibold mb-3">
                <Server className="w-4 h-4" />
                <h3>Backend API Layer</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                  <strong>Node.js + Express</strong> REST architecture
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                  <strong>TypeScript + tsx</strong> for instant dev watch
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                  <strong>Zod</strong> environment validation
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                  <strong>CORS</strong> enabled with origin security
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
              Port: 5000
            </div>
          </div>

          {/* Database Spec Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 text-indigo-400 font-semibold mb-3">
                <Database className="w-4 h-4" />
                <h3>Data & ORM Layer</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                  <strong>PostgreSQL</strong> relational database
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                  <strong>Prisma ORM</strong> typed data access
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                  <strong>schema.prisma</strong> ready for user & food models
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                  <strong>Prisma Client</strong> code generation
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
              Driver: postgresql://
            </div>
          </div>
        </section>

        {/* Roadmap Next Steps */}
        <section className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-6">
          <div className="flex items-center gap-2 text-white font-semibold mb-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3>Upcoming Step Breakdown</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            We are proceeding feature-by-feature. Future modules to be added on this clean foundation:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-xs">
              <span className="font-semibold text-slate-200 block mb-1">1. User Auth & Profile</span>
              <span className="text-slate-400">JWT auth, bcrypt hashing, body info, and targets calculation.</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-xs">
              <span className="font-semibold text-slate-200 block mb-1">2. Food Database & Logging</span>
              <span className="text-slate-400">Food item models, meal categories, and daily log entries.</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-xs">
              <span className="font-semibold text-slate-200 block mb-1">3. Progress & Analytics</span>
              <span className="text-slate-400">Daily calorie summary, macro breakdown, and weekly charts.</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-xs">
              <span className="font-semibold text-slate-200 block mb-1">4. AI Nutrition Assistant</span>
              <span className="text-slate-400">LLM integration for meal estimation and smart recommendations.</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        CalorieTrack Full-Stack Platform • Foundation Verified
      </footer>
    </div>
  );
}

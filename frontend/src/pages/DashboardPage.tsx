import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  User as UserIcon, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  Layers,
  Sparkles
} from 'lucide-react';

export default function DashboardPage(): React.JSX.Element {
  const { user, token, logout } = useAuth();

  const formattedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recently';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
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
                  Protected App
                </span>
              </div>
              <p className="text-xs text-slate-400">Authenticated Session Active</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span>{user?.name}</span>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard View */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 flex flex-col gap-8">
        {/* Welcome Banner */}
        <section className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-900/60 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Authentication Verified</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                You are successfully logged into your CalorieTrack account with a verified JWT session.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold self-start sm:self-auto">
              <ShieldCheck className="w-4 h-4" />
              <span>Session Authenticated</span>
            </div>
          </div>
        </section>

        {/* User Profile & Session Information Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{user?.name}</h3>
                  <span className="text-xs text-slate-400">Standard User</span>
                </div>
              </div>

              <div className="mt-5 space-y-3.5 text-xs">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">Email:</span>
                  <span className="font-medium text-slate-200">{user?.email}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">Member since:</span>
                  <span className="font-medium text-slate-200">{formattedDate}</span>
                </div>
                <div className="flex items-start gap-2.5 text-slate-300">
                  <KeyRound className="w-4 h-4 text-slate-500 mt-0.5" />
                  <span className="text-slate-400">User ID:</span>
                  <span className="font-mono text-[11px] text-emerald-400 truncate max-w-[160px]" title={user?.id}>
                    {user?.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Password safely hashed (bcrypt)
              </span>
            </div>
          </div>

          {/* Security & JWT Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-base mb-4">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3>JWT Token Status</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Your session is secured via signed JSON Web Tokens stored in client-side storage and sent with <code className="text-emerald-300 bg-slate-800 px-1 py-0.5 rounded">Authorization: Bearer</code> headers.
              </p>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 break-all">
                <span className="text-slate-500 block mb-1">Bearer Token:</span>
                {token ? `${token.substring(0, 32)}...${token.substring(token.length - 12)}` : 'None'}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
              Token Expiration: 7 Days from issuance
            </div>
          </div>

          {/* Next Phase Readiness Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-base mb-4">
                <Layers className="w-5 h-5 text-blue-400" />
                <h3>Next Development Step</h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Authentication is complete. In the next steps, we can attach user profile data, calorie target calculations, and food logs to your user record:
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                  User Profile (Age, Gender, Weight, Height)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                  BMR & TDEE Target Calculations
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                  Daily Food & Meal Logging
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
              Database: Neon PostgreSQL (users table active)
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        CalorieTrack • Protected User Session
      </footer>
    </div>
  );
}

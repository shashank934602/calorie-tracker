import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  User as UserIcon, 
  Flame, 
  Sparkles, 
  Edit3, 
  Activity, 
  ArrowRight,
  ShieldCheck,
  Award
} from 'lucide-react';

export default function DashboardPage(): React.JSX.Element {
  const { user, profileData, logout } = useAuth();

  const profile = profileData?.profile;
  const targets = profileData?.targets;

  const formatActivityName = (act?: string) => {
    switch (act) {
      case 'sedentary': return 'Sedentary';
      case 'lightly_active': return 'Lightly Active';
      case 'moderately_active': return 'Moderately Active';
      case 'very_active': return 'Very Active';
      case 'extremely_active': return 'Extremely Active';
      default: return 'Standard';
    }
  };

  const formatGoalName = (goal?: string) => {
    switch (goal) {
      case 'lose_weight': return 'Lose Weight (-500 kcal)';
      case 'maintain_weight': return 'Maintain Weight';
      case 'gain_weight': return 'Gain Weight (+300 kcal)';
      default: return 'Health & Wellness';
    }
  };

  // Macro calorie ratios for progress bars
  const totalCalories = targets?.dailyCalories || 2000;
  const proteinCals = (targets?.proteinGrams || 0) * 4;
  const fatCals = (targets?.fatGrams || 0) * 9;
  const carbsCals = (targets?.carbsGrams || 0) * 4;

  const proteinPct = Math.round((proteinCals / totalCalories) * 100);
  const fatPct = Math.round((fatCals / totalCalories) * 100);
  const carbsPct = Math.max(0, 100 - (proteinPct + fatPct));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Navigation Bar */}
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
                  Target Engine Active
                </span>
              </div>
              <p className="text-xs text-slate-400">Personalized Nutrition Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Edit Profile</span>
              </Link>
            )}
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-8 w-full">
        {/* If user hasn't set up their profile yet, show Onboarding CTA */}
        {!profile ? (
          <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 p-8 shadow-2xl relative overflow-hidden">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Action Required</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Complete your nutrition profile to get your calorie targets
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                You're almost there! Enter your age, gender, height, weight, and activity level so our calorie engine can calculate your exact daily calorie and macronutrient requirements.
              </p>
              <div className="mt-6">
                <Link
                  to="/onboarding"
                  className="inline-flex items-center gap-2 py-3 px-6 rounded-xl text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                >
                  <span>Start Profile Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Welcome & Overview Header */}
            <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Welcome back, {user?.name}!
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Here is your personalized daily nutrition blueprint calculated using Mifflin-St Jeor.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Target Engine Active
                </span>
              </div>
            </section>

            {/* Hero Nutrition Target Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Daily Calories Card */}
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      Daily Calorie Target
                    </span>
                    <Flame className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-1">
                    {targets?.dailyCalories.toLocaleString()}
                  </div>
                  <span className="text-xs text-slate-400">kcal / day budget</span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-emerald-400/90 font-medium">
                  Goal: {formatGoalName(profile?.goal)}
                </div>
              </div>

              {/* Protein Target Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                      Protein Target
                    </span>
                    <span className="text-xs font-mono text-blue-400/80 bg-blue-500/10 px-2 py-0.5 rounded">
                      1.8 g/kg
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-1">
                    {targets?.proteinGrams} <span className="text-lg font-sans font-normal text-slate-400">g</span>
                  </div>
                  <span className="text-xs text-slate-400">{proteinCals} kcal • {proteinPct}% of total</span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-400 h-full rounded-full" style={{ width: `${proteinPct}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Carbohydrates Target Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      Carbohydrates
                    </span>
                    <span className="text-xs font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Remaining
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-1">
                    {targets?.carbsGrams} <span className="text-lg font-sans font-normal text-slate-400">g</span>
                  </div>
                  <span className="text-xs text-slate-400">{carbsCals} kcal • {carbsPct}% of total</span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${carbsPct}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Fats Target Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      Fats Target
                    </span>
                    <span className="text-xs font-mono text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded">
                      25% kcal
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-1">
                    {targets?.fatGrams} <span className="text-lg font-sans font-normal text-slate-400">g</span>
                  </div>
                  <span className="text-xs text-slate-400">{fatCals} kcal • {fatPct}% of total</span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${fatPct}%` }}></div>
                  </div>
                </div>
              </div>
            </section>

            {/* Current Physical Profile & Energy Metabolism Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Details */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-white text-sm">Physical Parameters</h3>
                    </div>
                    <Link
                      to="/profile"
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                    >
                      Edit
                    </Link>
                  </div>

                  <div className="mt-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Current Weight:</span>
                      <span className="font-mono font-bold text-white">{profile?.weightKg} kg</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Height:</span>
                      <span className="font-mono font-bold text-white">{profile?.heightCm} cm</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Age / Sex:</span>
                      <span className="font-medium text-white capitalize">{profile?.age} yrs • {profile?.sex}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Activity Level:</span>
                      <span className="font-medium text-emerald-400">{formatActivityName(profile?.activityLevel)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                  Updated: {new Date(profile?.updatedAt || '').toLocaleDateString()}
                </div>
              </div>

              {/* Energy Expenditure Details */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400">
                      <Activity className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-white text-sm">Energy Expenditure</h3>
                  </div>

                  <div className="mt-4 space-y-3.5 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-slate-300 font-semibold block">Basal Metabolic Rate (BMR)</span>
                        <span className="text-[11px] text-slate-500">Calories burned at absolute rest</span>
                      </div>
                      <span className="font-mono text-base font-bold text-slate-200">{targets?.bmr} <span className="text-xs font-normal text-slate-500">kcal</span></span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-slate-300 font-semibold block">Total Daily Expenditure (TDEE)</span>
                        <span className="text-[11px] text-slate-500">Maintenance with activity multiplier</span>
                      </div>
                      <span className="font-mono text-base font-bold text-slate-200">{targets?.tdee} <span className="text-xs font-normal text-slate-500">kcal</span></span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                  Formula: Mifflin-St Jeor Standard
                </div>
              </div>

              {/* Next Step: Food Logging Ready Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400">
                      <Award className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-white text-sm">Next Step: Food Logging</h3>
                  </div>

                  <p className="text-xs text-slate-300 mt-4 leading-relaxed">
                    Your baseline targets are set. The next module will introduce food item tracking, meal categories (Breakfast, Lunch, Dinner, Snacks), and dynamic daily progress subtraction against your <strong>{targets?.dailyCalories} kcal</strong> budget.
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Target Engine:</span>
                  <span className="text-emerald-400 font-semibold">Ready for Step 4</span>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        CalorieTrack • Personal Nutrition Target Engine Active
      </footer>
    </div>
  );
}

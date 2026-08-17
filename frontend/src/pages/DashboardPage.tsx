import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  DailySummaryResponse, 
  MealType, 
  FoodEntry, 
  WeightSummary,
  getDailySummaryApi, 
  deleteFoodEntryApi,
  getWeightSummaryApi
} from '../services/api';
import { LogFoodModal } from '../components/LogFoodModal';
import { LogWeightModal } from '../components/LogWeightModal';
import { SessionsModal } from '../components/SessionsModal';
import { 
  LogOut, 
  Flame, 
  Sparkles, 
  Edit3, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Loader2, 
  BookOpen, 
  ArrowRight,
  Sun,
  Coffee,
  Moon,
  Apple,
  Scale,
  ShieldCheck,
  BarChart3,
  Bot
} from 'lucide-react';

export default function DashboardPage(): React.JSX.Element {
  const { user, profileData, token, logout } = useAuth();

  // Date selection state (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [dailySummary, setDailySummary] = useState<DailySummaryResponse | null>(null);
  const [weightSummary, setWeightSummary] = useState<WeightSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(true);

  // Modal states for food
  const [isFoodModalOpen, setIsFoodModalOpen] = useState<boolean>(false);
  const [modalMealType, setModalMealType] = useState<MealType>('lunch');
  const [entryToEdit, setEntryToEdit] = useState<FoodEntry | null>(null);

  // Modal state for weight
  const [isWeightModalOpen, setIsWeightModalOpen] = useState<boolean>(false);

  // Modal state for active sessions
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState<boolean>(false);

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    setIsLoadingSummary(true);
    try {
      const [summaryRes, weightRes] = await Promise.all([
        getDailySummaryApi(token, selectedDate),
        getWeightSummaryApi(token).catch(() => null),
      ]);
      setDailySummary(summaryRes);
      if (weightRes) setWeightSummary(weightRes);
    } catch (err) {
      console.warn('Failed to load dashboard summary:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [token, selectedDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Date navigation helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Open Food Modal
  const openAddFoodModal = (meal: MealType) => {
    setEntryToEdit(null);
    setModalMealType(meal);
    setIsFoodModalOpen(true);
  };

  const openEditModal = (entry: FoodEntry) => {
    setEntryToEdit(entry);
    setModalMealType(entry.mealType);
    setIsFoodModalOpen(true);
  };

  // Delete food entry
  const handleDeleteEntry = async (id: string) => {
    if (!token) return;
    try {
      await deleteFoodEntryApi(token, id);
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const formattedDateTitle = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const targets = dailySummary?.targets || { calories: 2000, protein: 140, carbs: 220, fat: 60 };
  const consumed = dailySummary?.consumed || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const remaining = dailySummary?.remaining || { calories: 2000, protein: 140, carbs: 220, fat: 60 };

  const calProgressPct = Math.min(100, Math.round((consumed.calories / (targets.calories || 1)) * 100));
  const proteinProgressPct = Math.min(100, Math.round((consumed.protein / (targets.protein || 1)) * 100));
  const carbsProgressPct = Math.min(100, Math.round((consumed.carbs / (targets.carbs || 1)) * 100));
  const fatProgressPct = Math.min(100, Math.round((consumed.fat / (targets.fat || 1)) * 100));

  const mealCardsConfig: { type: MealType; title: string; icon: React.ReactNode; defaultColor: string }[] = [
    { type: 'breakfast', title: 'Breakfast', icon: <Coffee className="w-4 h-4 text-amber-400" />, defaultColor: 'border-amber-500/20' },
    { type: 'lunch', title: 'Lunch', icon: <Sun className="w-4 h-4 text-emerald-400" />, defaultColor: 'border-emerald-500/20' },
    { type: 'dinner', title: 'Dinner', icon: <Moon className="w-4 h-4 text-indigo-400" />, defaultColor: 'border-indigo-500/20' },
    { type: 'snack', title: 'Snacks', icon: <Apple className="w-4 h-4 text-rose-400" />, defaultColor: 'border-rose-500/20' },
  ];

  const currentWeight = weightSummary?.currentWeight ?? profileData?.profile?.weightKg ?? 75;
  const targetWeight = weightSummary?.targetWeight ?? profileData?.profile?.targetWeightKg;
  const weightChange = weightSummary?.totalChange ?? 0;
  const weightPct = weightSummary?.percentageProgress;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shadow-inner">
              🥗
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">CalorieTrack</span>
                <span className="text-[11px] font-medium tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  Daily Tracker
                </span>
              </div>
              <p className="text-xs text-slate-400">Welcome, {user?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/coach"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/40 hover:to-indigo-600/40 text-purple-200 border border-purple-500/40 transition shadow-sm"
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">AI Coach</span>
            </Link>
            <Link
              to="/ai-log"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 text-purple-300 border border-purple-500/30 transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Log with AI</span>
            </Link>
            <Link
              to="/analytics"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Analytics</span>
            </Link>
            <Link
              to="/progress"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Progress</span>
            </Link>
            <Link
              to="/food"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Foods</span>
            </Link>
            {profileData?.profile && (
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
            )}
            <button
              onClick={() => setIsSessionsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/20 transition cursor-pointer"
              title="Manage Active Device Sessions"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Sessions</span>
            </button>
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

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-8 w-full">
        {/* Onboarding CTA if no profile exists yet */}
        {!profileData?.profile ? (
          <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 p-8 shadow-2xl">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Setup Required</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Complete your profile to unlock custom calorie goals
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Enter your physical stats so we can calculate your exact daily calorie and macronutrient targets.
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
            {/* Date Navigator Bar */}
            <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevDay}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white">
                  <CalendarIcon className="w-4 h-4 text-emerald-400" />
                  <span>{formattedDateTitle}</span>
                  {isToday && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Today
                    </span>
                  )}
                </div>
                <button
                  onClick={handleNextDay}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {!isToday && (
                  <button
                    onClick={handleToday}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 transition ml-2 cursor-pointer"
                  >
                    Jump to Today
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/ai-log"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 transition cursor-pointer shadow-md shadow-purple-600/30"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Log with AI</span>
                </Link>
                <button
                  onClick={() => setIsWeightModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Log Weight</span>
                </button>
                <button
                  onClick={() => openAddFoodModal('lunch')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 transition cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log Food</span>
                </button>
              </div>
            </section>

            {/* Daily Nutrition Summary Dashboard */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {/* Calories Hero Card */}
              <div className="md:col-span-4 lg:col-span-1 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      Daily Calories
                    </span>
                    <Flame className="w-5 h-5 text-emerald-400" />
                  </div>

                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
                      {consumed.calories}
                    </span>
                    <span className="text-sm text-slate-400 font-sans">/ {targets.calories} kcal</span>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400">
                        {remaining.calories >= 0 ? `${remaining.calories} kcal remaining` : `${Math.abs(remaining.calories)} kcal over budget`}
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">{calProgressPct}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          remaining.calories >= 0 ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, calProgressPct)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Goal Target:</span>
                  <span className="font-mono text-emerald-300 font-bold">{targets.calories} kcal</span>
                </div>
              </div>

              {/* Protein Target Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Protein</span>
                    <span className="text-xs font-mono text-blue-400/80 bg-blue-500/10 px-2 py-0.5 rounded">
                      1.8g/kg
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{consumed.protein}</span>
                    <span className="text-xs text-slate-400 font-sans">/ {targets.protein} g</span>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>{remaining.protein >= 0 ? `${remaining.protein}g left` : 'Goal met'}</span>
                      <span className="font-mono text-blue-400">{proteinProgressPct}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-blue-400 h-full rounded-full transition-all duration-500" style={{ width: `${proteinProgressPct}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                  Target: {targets.protein}g ({targets.protein * 4} kcal)
                </div>
              </div>

              {/* Carbohydrates Target Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Carbs</span>
                    <span className="text-xs font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Energy
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{consumed.carbs}</span>
                    <span className="text-xs text-slate-400 font-sans">/ {targets.carbs} g</span>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>{remaining.carbs >= 0 ? `${remaining.carbs}g left` : `${Math.abs(remaining.carbs)}g over`}</span>
                      <span className="font-mono text-emerald-400">{carbsProgressPct}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${carbsProgressPct}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                  Target: {targets.carbs}g ({targets.carbs * 4} kcal)
                </div>
              </div>

              {/* Fats Target Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Fats</span>
                    <span className="text-xs font-mono text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded">
                      25% kcal
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{consumed.fat}</span>
                    <span className="text-xs text-slate-400 font-sans">/ {targets.fat} g</span>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>{remaining.fat >= 0 ? `${remaining.fat}g left` : `${Math.abs(remaining.fat)}g over`}</span>
                      <span className="font-mono text-amber-400">{fatProgressPct}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${fatProgressPct}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                  Target: {targets.fat}g ({targets.fat * 9} kcal)
                </div>
              </div>
            </section>

            {/* Compact Weight & Goal Progress Widget */}
            <section className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">Body Weight Progress</h3>
                    {targetWeight && (
                      <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                        Target: {targetWeight}kg
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>
                      Current: <strong className="text-white font-mono">{currentWeight} kg</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      Change:{' '}
                      <strong className={`font-mono ${weightChange < 0 ? 'text-emerald-400' : weightChange > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                        {weightChange > 0 ? `+${weightChange}` : weightChange} kg
                      </strong>
                    </span>
                    {weightPct !== null && weightPct !== undefined && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400 font-semibold">{weightPct}% to Goal</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button
                  onClick={() => setIsWeightModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  + Log Weight
                </button>
                <Link
                  to="/progress"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition"
                >
                  <span>View Progress Chart</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </section>

            {/* Meal Category Breakdown List */}
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-tight">Today's Meals</h2>
                <span className="text-xs text-slate-400">
                  {isLoadingSummary ? 'Updating entries...' : `${dailySummary?.meals ? Object.values(dailySummary.meals).reduce((acc, m) => acc + m.entries.length, 0) : 0} items logged`}
                </span>
              </div>

              {isLoadingSummary && !dailySummary ? (
                <div className="py-12 flex justify-center items-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs">Loading meal diary...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {mealCardsConfig.map(({ type, title, icon }) => {
                    const mealGroup = dailySummary?.meals?.[type];
                    const entries = mealGroup?.entries || [];
                    const totals = mealGroup?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };

                    return (
                      <div
                        key={type}
                        className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-lg"
                      >
                        {/* Meal Header */}
                        <div className="px-6 py-4 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center">
                              {icon}
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-sm">{title}</h3>
                              <span className="text-xs font-mono text-slate-400">
                                {totals.calories} kcal • P: {totals.protein}g • C: {totals.carbs}g • F: {totals.fat}g
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => openAddFoodModal(type)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Food</span>
                          </button>
                        </div>

                        {/* Meal Item List */}
                        <div className="p-4 sm:p-6">
                          {entries.length > 0 ? (
                            <div className="divide-y divide-slate-800/60 space-y-2">
                              {entries.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-100 text-sm">{entry.food.name}</span>
                                      <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                        {entry.quantityGrams} {entry.food.servingUnit}
                                      </span>
                                    </div>
                                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                                      {entry.calculatedNutrition.calories} kcal • P: {entry.calculatedNutrition.protein}g • C: {entry.calculatedNutrition.carbs}g • F: {entry.calculatedNutrition.fat}g
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <button
                                      onClick={() => openEditModal(entry)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                                      title="Edit Quantity"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEntry(entry.id)}
                                      className="p-1.5 rounded-lg text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                      title="Delete Entry"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-xs text-slate-500">
                              No foods logged for {title.toLowerCase()} yet.{' '}
                              <button
                                onClick={() => openAddFoodModal(type)}
                                className="text-emerald-400 hover:underline font-medium cursor-pointer"
                              >
                                Add food now
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Log Food Modal */}
      <LogFoodModal
        isOpen={isFoodModalOpen}
        onClose={() => setIsFoodModalOpen(false)}
        onSuccess={fetchDashboardData}
        initialMealType={modalMealType}
        entryToEdit={entryToEdit}
        targetDate={selectedDate}
      />

      {/* Log Weight Modal */}
      <LogWeightModal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        onSuccess={fetchDashboardData}
        defaultWeightKg={currentWeight || 75}
      />

      {/* Sessions Management Modal */}
      <SessionsModal
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        CalorieTrack • Personal Food & Progress Tracker
      </footer>
    </div>
  );
}

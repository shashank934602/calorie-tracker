import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  WeightEntry, 
  WeightSummary, 
  listWeightEntriesApi, 
  getWeightSummaryApi, 
  deleteWeightEntryApi 
} from '../services/api';
import { WeightChart } from '../components/WeightChart';
import { LogWeightModal } from '../components/LogWeightModal';
import { 
  ArrowLeft, 
  Plus, 
  Scale, 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  Target, 
  Calendar as CalendarIcon, 
  Edit3, 
  Trash2, 
  Loader2, 
  Sparkles
} from 'lucide-react';

export default function ProgressPage(): React.JSX.Element {
  const { token, profileData } = useAuth();

  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [summary, setSummary] = useState<WeightSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [entryToEdit, setEntryToEdit] = useState<WeightEntry | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [entriesData, summaryData] = await Promise.all([
        listWeightEntriesApi(token, 'desc', 100),
        getWeightSummaryApi(token),
      ]);
      setEntries(entriesData);
      setSummary(summaryData);
    } catch (err) {
      console.warn('Failed to load weight progress data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAdd = () => {
    setEntryToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: WeightEntry) => {
    setEntryToEdit(entry);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await deleteWeightEntryApi(token, id);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete weight entry:', err);
    }
  };

  const goal = profileData?.profile?.goal || 'lose_weight';
  const targetWeight = summary?.targetWeight ?? profileData?.profile?.targetWeightKg;
  const currentWeight = summary?.currentWeight ?? profileData?.profile?.weightKg ?? 0;
  const startingWeight = summary?.startingWeight ?? profileData?.profile?.weightKg ?? 0;
  const totalChange = summary?.totalChange ?? 0;

  // Format change text
  const isPositiveChange = totalChange > 0;
  const isZeroChange = totalChange === 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <span className="font-bold text-base text-white">Weight & Goal Progression</span>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Log Weight</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-8 w-full">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Scale className="w-7 h-7 text-emerald-400" />
              <span>Weight Tracking & Progress</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Track your body measurements, view historical progress trends, and monitor trajectory toward your target weight.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 transition cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Record New Weight</span>
            </button>
          </div>
        </div>

        {/* Missing Target Weight Helper Banner */}
        {!targetWeight && (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">No Target Weight Defined</h4>
                <p className="text-[11px] text-slate-400">
                  Set a goal target weight in your profile to unlock remaining distance and % progress tracking.
                </p>
              </div>
            </div>
            <Link
              to="/profile"
              className="text-xs font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-500/20 transition whitespace-nowrap"
            >
              Set Target Weight →
            </Link>
          </div>
        )}

        {/* Top KPI Cards Grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* 1. Current Weight */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Current
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-extrabold text-white font-mono">{currentWeight}</span>
                <span className="text-xs text-slate-400">kg</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-2 block">
              {summary?.latestRecordedAt
                ? `Latest: ${new Date(summary.latestRecordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'Profile baseline'}
            </span>
          </div>

          {/* 2. Starting Weight */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Starting
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-extrabold text-white font-mono">{startingWeight}</span>
                <span className="text-xs text-slate-400">kg</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-2 block">Initial baseline</span>
          </div>

          {/* 3. Target Weight */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block">
                Target
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-extrabold text-sky-300 font-mono">
                  {targetWeight !== null && targetWeight !== undefined ? targetWeight : '—'}
                </span>
                {targetWeight && <span className="text-xs text-slate-400">kg</span>}
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-2 block capitalize">
              {goal.replace('_', ' ')}
            </span>
          </div>

          {/* 4. Total Change */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Change
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {isZeroChange ? (
                  <Minus className="w-4 h-4 text-slate-400" />
                ) : isPositiveChange ? (
                  <TrendingUp className={`w-4 h-4 ${goal === 'gain_weight' ? 'text-emerald-400' : 'text-amber-400'}`} />
                ) : (
                  <TrendingDown className={`w-4 h-4 ${goal === 'lose_weight' ? 'text-emerald-400' : 'text-amber-400'}`} />
                )}
                <span
                  className={`text-2xl font-extrabold font-mono ${
                    isZeroChange
                      ? 'text-slate-300'
                      : (goal === 'lose_weight' && !isPositiveChange) || (goal === 'gain_weight' && isPositiveChange)
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {totalChange > 0 ? `+${totalChange}` : totalChange}
                </span>
                <span className="text-xs text-slate-400">kg</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-2 block">Since start</span>
          </div>

          {/* 5. Remaining */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Remaining
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-extrabold text-white font-mono">
                  {summary?.remainingToGoal !== null && summary?.remainingToGoal !== undefined
                    ? summary.remainingToGoal
                    : '—'}
                </span>
                {summary?.remainingToGoal !== null && summary?.remainingToGoal !== undefined && (
                  <span className="text-xs text-slate-400">kg</span>
                )}
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-2 block">
              {summary?.remainingToGoal === 0
                ? 'Goal achieved! 🎉'
                : goal === 'lose_weight'
                ? 'Left to lose'
                : goal === 'gain_weight'
                ? 'Left to gain'
                : 'Variance'}
            </span>
          </div>

          {/* 6. Percentage Progress */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 shadow-lg flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                Progress
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-extrabold text-emerald-300 font-mono">
                  {summary?.percentageProgress !== null && summary?.percentageProgress !== undefined
                    ? `${summary.percentageProgress}%`
                    : '—'}
                </span>
              </div>
            </div>
            {summary?.percentageProgress !== null && summary?.percentageProgress !== undefined ? (
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${summary.percentageProgress}%` }}
                ></div>
              </div>
            ) : (
              <span className="text-[10px] text-slate-500 mt-2 block">Set target</span>
            )}
          </div>
        </section>

        {/* Interactive Chart Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Weight Progression Trend</span>
            </h2>
            <span className="text-xs text-slate-400">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} recorded
            </span>
          </div>

          {isLoading ? (
            <div className="h-64 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs">Loading chart data...</span>
            </div>
          ) : (
            <WeightChart entries={entries} targetWeight={targetWeight} />
          )}
        </section>

        {/* Historical Weight Log Table */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">Measurement History</h2>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs">Loading weight log...</span>
            </div>
          ) : entries.length > 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-3.5">Date Recorded</th>
                      <th className="px-6 py-3.5">Weight (kg)</th>
                      <th className="px-6 py-3.5">Note</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {entries.map((entry) => {
                      const dateStr = new Date(entry.recordedAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });

                      return (
                        <tr key={entry.id} className="hover:bg-slate-900/40 transition">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-100 flex items-center gap-2">
                            <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{dateStr}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-emerald-400 text-sm">
                            {entry.weightKg} <span className="text-xs font-normal text-slate-400">kg</span>
                          </td>
                          <td className="px-6 py-4 text-slate-400 max-w-xs truncate">
                            {entry.note ? entry.note : <span className="text-slate-600 italic">—</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                            <button
                              onClick={() => handleOpenEdit(entry)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                              title="Edit Entry"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-1.5 rounded-lg text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 rounded-2xl bg-slate-900/40 border border-slate-800 p-6">
              <Scale className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm font-medium">No weight entries recorded yet.</p>
              <p className="text-slate-500 text-xs mt-1">
                Record your weight to start building your progress trajectory.
              </p>
              <button
                onClick={handleOpenAdd}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Log First Weight</span>
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Log Weight Modal */}
      <LogWeightModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        entryToEdit={entryToEdit}
        defaultWeightKg={currentWeight || 75}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        CalorieTrack • Personal Nutrition & Progress Tracker
      </footer>
    </div>
  );
}

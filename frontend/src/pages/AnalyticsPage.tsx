import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AnalyticsSummaryResponse,
  AnalyticsTrendsResponse,
  DailyAggregatedMetrics,
  getAnalyticsSummaryApi,
  getAnalyticsTrendsApi,
} from '../services/api';
import {
  Flame,
  Scale,
  Calendar,
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';

type RangePreset = '7d' | '30d' | '90d' | 'custom';

export default function AnalyticsPage(): React.JSX.Element {
  const { token } = useAuth();

  const [rangePreset, setRangePreset] = useState<RangePreset>('30d');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrendsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tooltip interaction state for calorie chart
  const [hoveredDay, setHoveredDay] = useState<DailyAggregatedMetrics | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params: { range?: RangePreset; startDate?: string; endDate?: string } = {
        range: rangePreset,
      };

      if (rangePreset === 'custom') {
        params.startDate = customStart;
        params.endDate = customEnd;
      }

      const [summaryRes, trendsRes] = await Promise.all([
        getAnalyticsSummaryApi(token, params),
        getAnalyticsTrendsApi(token, params),
      ]);

      setSummary(summaryRes);
      setTrends(trendsRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load analytics data';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [token, rangePreset, customStart, customEnd]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handlePresetChange = (preset: RangePreset) => {
    setRangePreset(preset);
  };

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    setRangePreset('custom');
    fetchAnalytics();
  };

  const days = trends?.days || [];
  const targetCals = summary?.averages.targetCalories || 2000;

  // Chart dimension calculations for Calorie Bars
  const maxCaloriesInDays = Math.max(
    targetCals * 1.3,
    ...days.map((d) => d.calories)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">Analytics & Insights</span>
                <span className="text-[11px] font-medium tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  Trends
                </span>
              </div>
              <p className="text-xs text-slate-400">Nutritional performance and weight progression</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-8 w-full">
        {/* Controls & Range Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 self-start md:self-auto">
            {(['7d', '30d', '90d', 'custom'] as RangePreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  rangePreset === preset
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {preset === '7d' ? '7 Days' : preset === '30d' ? '30 Days' : preset === '90d' ? '90 Days' : 'Custom'}
              </button>
            ))}
          </div>

          {/* Custom Date Form */}
          {rangePreset === 'custom' && (
            <form onSubmit={handleCustomApply} className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <span className="text-slate-500">From:</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent text-white focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <span className="text-slate-500">To:</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent text-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1 rounded-lg font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer"
              >
                Apply
              </button>
            </form>
          )}

          {/* Period Label */}
          {summary && (
            <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 self-end md:self-auto">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{summary.period.startDate} to {summary.period.endDate}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {summary.period.loggedDaysCount} / {summary.period.totalDays} days logged
              </span>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading && !summary ? (
          <div className="py-24 flex flex-col justify-center items-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <span className="text-sm">Calculating analytics & time-series aggregations...</span>
          </div>
        ) : summary ? (
          <>
            {/* Top KPI Metric Strip */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Daily Average Intake */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Avg Daily Calories</span>
                  <Flame className="w-4 h-4 text-amber-400" />
                </div>
                <div className="my-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {summary.averages.dailyCalories}
                    </span>
                    <span className="text-xs text-slate-400">/ {summary.averages.targetCalories} kcal</span>
                  </div>
                  <div className="mt-1 text-xs flex items-center gap-1">
                    {summary.averages.calorieDelta < 0 ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                        <TrendingDown className="w-3.5 h-3.5" />
                        {Math.abs(summary.averages.calorieDelta)} kcal deficit
                      </span>
                    ) : summary.averages.calorieDelta > 0 ? (
                      <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        +{summary.averages.calorieDelta} kcal surplus
                      </span>
                    ) : (
                      <span className="text-slate-300">Exact target</span>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                  Target: {summary.averages.targetCalories} kcal/day
                </div>
              </div>

              {/* Logging Consistency & Streak */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Logging Consistency</span>
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="my-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {summary.adherence.loggingRatePct}%
                    </span>
                    <span className="text-xs text-slate-400">({summary.period.loggedDaysCount}d logged)</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 inline-flex items-center gap-1">
                      🔥 {summary.adherence.currentStreakDays} Day Streak
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                  {summary.period.totalDays - summary.period.loggedDaysCount} unlogged days in range
                </div>
              </div>

              {/* Target Calorie Adherence */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Budget Adherence</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                </div>
                <div className="my-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {summary.adherence.targetAdherencePct}%
                    </span>
                    <span className="text-xs text-slate-400">on target (±10%)</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400 flex items-center gap-2">
                    <span className="text-emerald-400">✓ {summary.adherence.daysOnBudget} on</span>
                    <span className="text-amber-400">▲ {summary.adherence.daysOverBudget} over</span>
                    <span className="text-blue-400">▼ {summary.adherence.daysUnderBudget} under</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                  Buffer: {Math.round(targetCals * 0.9)} - {Math.round(targetCals * 1.1)} kcal
                </div>
              </div>

              {/* Estimated Energy Balance & Weight Impact */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Estimated Weight Impact</span>
                  <Scale className="w-4 h-4 text-purple-400" />
                </div>
                <div className="my-3">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-extrabold font-mono ${
                      summary.energyBalance.estimatedWeightChangeKg < 0
                        ? 'text-emerald-400'
                        : summary.energyBalance.estimatedWeightChangeKg > 0
                        ? 'text-amber-400'
                        : 'text-slate-300'
                    }`}>
                      {summary.energyBalance.estimatedWeightChangeKg > 0 ? `+${summary.energyBalance.estimatedWeightChangeKg}` : summary.energyBalance.estimatedWeightChangeKg} kg
                    </span>
                    <span className="text-[10px] uppercase font-bold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                      Estimate
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Net: {summary.energyBalance.estimatedNetPeriodDeficit > 0 ? `+${summary.energyBalance.estimatedNetPeriodDeficit}` : summary.energyBalance.estimatedNetPeriodDeficit} kcal
                    {summary.energyBalance.actualWeightChangeKg !== null && (
                      <span className="ml-2 text-white font-medium">
                        (Actual: {summary.energyBalance.actualWeightChangeKg > 0 ? `+${summary.energyBalance.actualWeightChangeKg}` : summary.energyBalance.actualWeightChangeKg} kg)
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                  Caloric Balance Model (7700 kcal ≈ 1kg)
                </div>
              </div>
            </section>

            {/* Chart 1: Daily Calorie Intake vs Target Bar Chart */}
            <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-base">Daily Calorie Intake vs Target</h3>
                  <p className="text-xs text-slate-400">Daily logged calories compared with your target baseline</p>
                </div>

                {/* Chart Legend */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                    <span className="text-slate-300">On Target (±10%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-amber-500"></div>
                    <span className="text-slate-300">Over Budget</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                    <span className="text-slate-300">Under Budget</span>
                  </div>
                </div>
              </div>

              {/* SVG Bar Chart */}
              <div className="w-full overflow-x-auto pt-4 pb-2">
                <div className="min-w-[600px] h-64 relative flex flex-col justify-between">
                  <svg className="w-full h-full" viewBox="0 0 1000 240" preserveAspectRatio="none">
                    {/* Target dashed line */}
                    {(() => {
                      const targetY = 220 - (targetCals / maxCaloriesInDays) * 200;
                      return (
                        <g>
                          <line
                            x1="0"
                            y1={targetY}
                            x2="1000"
                            y2={targetY}
                            stroke="#10b981"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                            strokeOpacity="0.8"
                          />
                          <text
                            x="990"
                            y={targetY - 5}
                            fill="#10b981"
                            fontSize="10"
                            textAnchor="end"
                            fontWeight="bold"
                          >
                            Target: {targetCals} kcal
                          </text>
                        </g>
                      );
                    })()}

                    {/* Bars */}
                    {days.map((day, idx) => {
                      const barWidth = 1000 / days.length;
                      const barX = idx * barWidth + barWidth * 0.15;
                      const barActualWidth = barWidth * 0.7;

                      if (!day.hasLogs || day.calories === 0) {
                        return (
                          <rect
                            key={day.date}
                            x={barX}
                            y={218}
                            width={barActualWidth}
                            height={2}
                            fill="#334155"
                            rx="1"
                          />
                        );
                      }

                      const barHeight = Math.max(4, (day.calories / maxCaloriesInDays) * 200);
                      const barY = 220 - barHeight;

                      const lowerBound = targetCals * 0.9;
                      const upperBound = targetCals * 1.1;

                      let fill = '#10b981'; // On target
                      if (day.calories > upperBound) fill = '#f59e0b'; // Over
                      if (day.calories < lowerBound) fill = '#3b82f6'; // Under

                      return (
                        <rect
                          key={day.date}
                          x={barX}
                          y={barY}
                          width={barActualWidth}
                          height={barHeight}
                          fill={fill}
                          rx="2"
                          className="transition-all duration-200 hover:opacity-80 cursor-pointer"
                          onMouseEnter={() => setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                        />
                      );
                    })}
                  </svg>

                  {/* X-axis date labels */}
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2 px-1">
                    <span>{days[0]?.date}</span>
                    {days.length > 10 && (
                      <span>{days[Math.floor(days.length / 2)]?.date}</span>
                    )}
                    <span>{days[days.length - 1]?.date}</span>
                  </div>
                </div>
              </div>

              {/* Hover Tooltip display */}
              {hoveredDay && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-between text-xs font-mono animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{hoveredDay.date}:</span>
                    <span className="text-emerald-400 font-extrabold">{hoveredDay.calories} kcal</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <span>Protein: <strong className="text-blue-400">{hoveredDay.protein}g</strong></span>
                    <span>Carbs: <strong className="text-emerald-400">{hoveredDay.carbs}g</strong></span>
                    <span>Fat: <strong className="text-amber-400">{hoveredDay.fat}g</strong></span>
                  </div>
                </div>
              )}
            </section>

            {/* Chart 2: Weight & Calorie Trend (Dual Axis) */}
            <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-base">Weight & Calorie Trend</h3>
                  <p className="text-xs text-slate-400">Dual-axis trend displaying daily caloric intake alongside body weight entries</p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-slate-700"></div>
                    <span className="text-slate-300">Daily Calories (kcal)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-cyan-400"></div>
                    <span className="text-slate-300">Recorded Weight (kg)</span>
                  </div>
                </div>
              </div>

              {/* Dual Axis SVG Chart */}
              <div className="w-full overflow-x-auto pt-4 pb-2">
                <div className="min-w-[600px] h-64 relative flex flex-col justify-between">
                  {(() => {
                    const weightDays = days.filter((d) => d.weightKg !== null);
                    const minWeight = weightDays.length > 0
                      ? Math.floor(Math.min(...weightDays.map((d) => d.weightKg!)) - 1)
                      : 60;
                    const maxWeight = weightDays.length > 0
                      ? Math.ceil(Math.max(...weightDays.map((d) => d.weightKg!)) + 1)
                      : 90;
                    const weightRange = Math.max(1, maxWeight - minWeight);

                    // Build smooth SVG path for weight line
                    let weightPathD = '';
                    const weightPoints: { x: number; y: number; weight: number; date: string }[] = [];

                    days.forEach((d, idx) => {
                      if (d.weightKg !== null) {
                        const x = (idx / (days.length - 1 || 1)) * 1000;
                        const y = 220 - ((d.weightKg - minWeight) / weightRange) * 190;
                        weightPoints.push({ x, y, weight: d.weightKg, date: d.date });
                        if (!weightPathD) {
                          weightPathD = `M ${x} ${y}`;
                        } else {
                          weightPathD += ` L ${x} ${y}`;
                        }
                      }
                    });

                    return (
                      <svg className="w-full h-full" viewBox="0 0 1000 240" preserveAspectRatio="none">
                        {/* Background Calorie Bars */}
                        {days.map((day, idx) => {
                          const barWidth = 1000 / days.length;
                          const barX = idx * barWidth + barWidth * 0.2;
                          const barActualWidth = barWidth * 0.6;
                          if (!day.hasLogs) return null;

                          const h = (day.calories / maxCaloriesInDays) * 180;
                          const y = 220 - h;
                          return (
                            <rect
                              key={day.date}
                              x={barX}
                              y={y}
                              width={barActualWidth}
                              height={h}
                              fill="#334155"
                              opacity="0.4"
                              rx="1"
                            />
                          );
                        })}

                        {/* Weight Line */}
                        {weightPathD && (
                          <path
                            d={weightPathD}
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Weight Point Circles */}
                        {weightPoints.map((pt) => (
                          <g key={pt.date}>
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="4"
                              fill="#083344"
                              stroke="#22d3ee"
                              strokeWidth="2"
                            />
                            <text
                              x={pt.x}
                              y={pt.y - 8}
                              fill="#22d3ee"
                              fontSize="9"
                              textAnchor="middle"
                              fontWeight="bold"
                            >
                              {pt.weight}kg
                            </text>
                          </g>
                        ))}
                      </svg>
                    );
                  })()}

                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2 px-1">
                    <span>{days[0]?.date}</span>
                    <span>{days[days.length - 1]?.date}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Bottom Row: Macronutrient Split & Meal Breakdown */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Macronutrient Distribution */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">Macronutrient Split</h3>
                  <span className="text-xs text-slate-400">Actual vs Target %</span>
                </div>

                <div className="space-y-4">
                  {/* Protein */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-blue-400 font-semibold">Protein ({summary.averages.proteinGrams}g / day)</span>
                      <span className="font-mono text-slate-300">
                        {summary.macroSplit.proteinPct}% <span className="text-slate-500">(Target: {summary.macroSplit.targetProteinPct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-blue-400 h-full rounded-full" style={{ width: `${summary.macroSplit.proteinPct}%` }}></div>
                    </div>
                  </div>

                  {/* Carbs */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-emerald-400 font-semibold">Carbohydrates ({summary.averages.carbsGrams}g / day)</span>
                      <span className="font-mono text-slate-300">
                        {summary.macroSplit.carbsPct}% <span className="text-slate-500">(Target: {summary.macroSplit.targetCarbsPct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${summary.macroSplit.carbsPct}%` }}></div>
                    </div>
                  </div>

                  {/* Fat */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-amber-400 font-semibold">Fats ({summary.averages.fatGrams}g / day)</span>
                      <span className="font-mono text-slate-300">
                        {summary.macroSplit.fatPct}% <span className="text-slate-500">(Target: {summary.macroSplit.targetFatPct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: `${summary.macroSplit.fatPct}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meal Distribution Breakdown */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">Meal Distribution</h3>
                  <span className="text-xs text-slate-400">Calorie intake by meal category</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-xs font-semibold text-amber-400">Breakfast</span>
                    <div className="text-xl font-extrabold text-white font-mono mt-1">
                      {summary.mealDistribution.breakfast.percentage}%
                    </div>
                    <span className="text-[11px] text-slate-400">
                      ~{summary.mealDistribution.breakfast.calories} kcal/day
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-xs font-semibold text-emerald-400">Lunch</span>
                    <div className="text-xl font-extrabold text-white font-mono mt-1">
                      {summary.mealDistribution.lunch.percentage}%
                    </div>
                    <span className="text-[11px] text-slate-400">
                      ~{summary.mealDistribution.lunch.calories} kcal/day
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-xs font-semibold text-indigo-400">Dinner</span>
                    <div className="text-xl font-extrabold text-white font-mono mt-1">
                      {summary.mealDistribution.dinner.percentage}%
                    </div>
                    <span className="text-[11px] text-slate-400">
                      ~{summary.mealDistribution.dinner.calories} kcal/day
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-xs font-semibold text-rose-400">Snacks</span>
                    <div className="text-xl font-extrabold text-white font-mono mt-1">
                      {summary.mealDistribution.snack.percentage}%
                    </div>
                    <span className="text-[11px] text-slate-400">
                      ~{summary.mealDistribution.snack.calories} kcal/day
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        CalorieTrack • Deterministic Nutritional Analytics & Insights
      </footer>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { WeightEntry } from '../services/api';

interface WeightChartProps {
  entries: WeightEntry[];
  targetWeight?: number | null;
}

export const WeightChart: React.FC<WeightChartProps> = ({ entries, targetWeight }) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    entry: WeightEntry;
    x: number;
    y: number;
  } | null>(null);

  // Sort chronologically (oldest to newest for plotting from left to right)
  const sorted = useMemo(() => {
    return [...entries].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
  }, [entries]);

  const chartData = useMemo(() => {
    if (sorted.length === 0) return null;

    const weights = sorted.map((e) => e.weightKg);
    if (targetWeight !== null && targetWeight !== undefined) {
      weights.push(targetWeight);
    }

    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);

    // Give 1.5kg headroom top and bottom
    const yMin = Math.max(0, Math.floor(minWeight - 1.5));
    const yMax = Math.ceil(maxWeight + 1.5);
    const yRange = yMax - yMin || 1;

    const width = 600;
    const height = 240;
    const paddingLeft = 45;
    const paddingRight = 25;
    const paddingTop = 25;
    const paddingBottom = 35;

    const innerWidth = width - paddingLeft - paddingRight;
    const innerHeight = height - paddingTop - paddingBottom;

    const points = sorted.map((entry, index) => {
      const x =
        sorted.length === 1
          ? paddingLeft + innerWidth / 2
          : paddingLeft + (index / (sorted.length - 1)) * innerWidth;
      const y = paddingTop + innerHeight - ((entry.weightKg - yMin) / yRange) * innerHeight;
      return { entry, x, y };
    });

    // Path command
    const linePath = points.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    // Area path for gradient fill
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const areaPath = `${linePath} L ${lastPoint.x} ${paddingTop + innerHeight} L ${firstPoint.x} ${
      paddingTop + innerHeight
    } Z`;

    // Target reference line Y
    let targetY: number | null = null;
    if (targetWeight !== null && targetWeight !== undefined) {
      targetY = paddingTop + innerHeight - ((targetWeight - yMin) / yRange) * innerHeight;
    }

    // Generate 4 Y-axis ticks
    const yTicks = [0, 0.33, 0.66, 1].map((pct) => {
      const val = yMin + pct * yRange;
      const y = paddingTop + innerHeight - pct * innerHeight;
      return { val: Math.round(val * 10) / 10, y };
    });

    return {
      width,
      height,
      points,
      linePath,
      areaPath,
      targetY,
      yTicks,
      paddingLeft,
      paddingTop,
      innerWidth,
      innerHeight,
    };
  }, [sorted, targetWeight]);

  if (!chartData || sorted.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center rounded-2xl bg-slate-950/40 border border-slate-800 text-center p-6">
        <p className="text-slate-400 text-sm font-medium">No weight entries to plot yet.</p>
        <p className="text-slate-500 text-xs mt-1">
          Log your body weight above to visualize your weight trend over time.
        </p>
      </div>
    );
  }

  const {
    width,
    height,
    points,
    linePath,
    areaPath,
    targetY,
    yTicks,
    paddingLeft,
    paddingTop,
    innerWidth,
    innerHeight,
  } = chartData;

  return (
    <div className="relative w-full rounded-2xl bg-slate-950/60 border border-slate-800 p-4 sm:p-6 overflow-hidden">
      {/* SVG Canvas */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
      >
        <defs>
          <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines & Y-Axis Ticks */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={paddingLeft}
              y1={tick.y}
              x2={paddingLeft + innerWidth}
              y2={tick.y}
              stroke="#334155"
              strokeDasharray="3 3"
              strokeWidth="0.8"
            />
            <text
              x={paddingLeft - 8}
              y={tick.y + 3.5}
              textAnchor="end"
              className="text-[10px] fill-slate-500 font-mono"
            >
              {tick.val}
            </text>
          </g>
        ))}

        {/* Target Weight Reference Line */}
        {targetY !== null && targetY >= paddingTop && targetY <= paddingTop + innerHeight && (
          <g>
            <line
              x1={paddingLeft}
              y1={targetY}
              x2={paddingLeft + innerWidth}
              y2={targetY}
              stroke="#38bdf8"
              strokeDasharray="5 4"
              strokeWidth="1.5"
            />
            <text
              x={paddingLeft + innerWidth + 4}
              y={targetY + 3}
              className="text-[9px] fill-sky-400 font-mono font-semibold"
            >
              Target ({targetWeight}kg)
            </text>
          </g>
        )}

        {/* Area Gradient Fill */}
        <path d={areaPath} fill="url(#weightAreaGrad)" />

        {/* Trend Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive Data Points */}
        {points.map((p, idx) => {
          const isHovered = hoveredPoint?.entry.id === p.entry.id;
          return (
            <g
              key={p.entry.id || idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(p)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Outer halo */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 8 : 5}
                fill={isHovered ? '#34d399' : '#10b981'}
                fillOpacity={isHovered ? 0.3 : 0.2}
                className="transition-all duration-150"
              />
              {/* Center dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 5 : 3.5}
                fill={isHovered ? '#ffffff' : '#10b981'}
                stroke="#0f172a"
                strokeWidth="2"
                className="transition-all duration-150"
              />
            </g>
          );
        })}

        {/* X-Axis Date Labels (First and Last) */}
        {points.length > 0 && (
          <g>
            <text
              x={points[0].x}
              y={paddingTop + innerHeight + 18}
              textAnchor="start"
              className="text-[10px] fill-slate-400 font-mono"
            >
              {new Date(points[0].entry.recordedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </text>
            {points.length > 1 && (
              <text
                x={points[points.length - 1].x}
                y={paddingTop + innerHeight + 18}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {new Date(points[points.length - 1].entry.recordedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </text>
            )}
          </g>
        )}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-2.5 text-xs transition-transform"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100 - 4}%`,
          }}
        >
          <div className="flex items-center gap-1.5 font-bold text-white font-mono text-sm">
            <span className="text-emerald-400">{hoveredPoint.entry.weightKg}</span>
            <span>kg</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {new Date(hoveredPoint.entry.recordedAt).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
          {hoveredPoint.entry.note && (
            <div className="mt-1 pt-1 border-t border-slate-800 text-[10px] text-slate-300 italic max-w-[160px] truncate">
              "{hoveredPoint.entry.note}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

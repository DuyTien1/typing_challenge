import React, { useMemo } from 'react';
import { Activity, Flame, TrendingUp } from 'lucide-react';
import { PerformanceChartPoint } from '../types';

interface LiveWpmSparklineProps {
  timeline: PerformanceChartPoint[];
  currentWpm: number;
  targetWpm?: number;
}

export const LiveWpmSparkline: React.FC<LiveWpmSparklineProps> = React.memo(({
  timeline,
  currentWpm,
  targetWpm,
}) => {
  // Use recent points (up to 24 data points for responsive burst rhythm)
  const recentPoints = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];
    return timeline.slice(-24);
  }, [timeline]);

  const { pathData, areaData, minWpm, maxWpm, lastX, lastY } = useMemo(() => {
    if (recentPoints.length < 2) {
      return { pathData: '', areaData: '', minWpm: 0, maxWpm: Math.max(60, currentWpm), lastX: 0, lastY: 0 };
    }

    const values = recentPoints.map((p) => p.playerWpm);
    const min = Math.max(0, Math.min(...values) - 5);
    const max = Math.max(...values, currentWpm, 60) + 10;
    const range = Math.max(1, max - min);

    const width = 160;
    const height = 36;
    const padding = 3;

    const points = recentPoints.map((pt, idx) => {
      const x = padding + (idx / (recentPoints.length - 1)) * (width - padding * 2);
      const y = height - padding - ((pt.playerWpm - min) / range) * (height - padding * 2);
      return { x, y };
    });

    const path = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, '');

    const last = points[points.length - 1];
    const first = points[0];
    const area = `${path} L ${last.x},${height} L ${first.x},${height} Z`;

    return {
      pathData: path,
      areaData: area,
      minWpm: min,
      maxWpm: max,
      lastX: last?.x || 0,
      lastY: last?.y || 0,
    };
  }, [recentPoints, currentWpm]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
      <div className="flex flex-col text-left shrink-0">
        <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-slate-400 font-bold">
          <Activity className="w-3 h-3 text-amber-400 animate-pulse" />
          <span>Nhịp Gõ Live</span>
        </div>
        <div className="text-xs font-mono font-black text-amber-400 flex items-center gap-1">
          <span>{currentWpm}</span>
          <span className="text-[9px] text-slate-500 font-normal">WPM</span>
        </div>
      </div>

      <div className="relative w-36 sm:w-44 h-9 overflow-hidden">
        {recentPoints.length >= 2 ? (
          <svg className="w-full h-full overflow-visible" viewBox="0 0 160 36" preserveAspectRatio="none">
            <defs>
              <linearGradient id="liveWpmGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="liveWpmLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>

            {/* Gradient Fill under the wave */}
            <path d={areaData} fill="url(#liveWpmGradient)" />

            {/* Wave Line */}
            <path
              d={pathData}
              fill="none"
              stroke="url(#liveWpmLine)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Current Burst Speed Glow Point */}
            <circle cx={lastX} cy={lastY} r="3" fill="#fbbf24" className="animate-ping opacity-75" />
            <circle cx={lastX} cy={lastY} r="3.5" fill="#fef08a" stroke="#d97706" strokeWidth="1" />
          </svg>
        ) : (
          <div className="h-full flex items-center justify-center text-[10px] text-slate-500 italic font-mono">
            Đang đo nhịp gõ...
          </div>
        )}
      </div>

      {recentPoints.length >= 2 && (
        <div className="hidden sm:flex flex-col text-right text-[9px] text-slate-400 font-mono shrink-0">
          <span className="text-emerald-400 font-bold" title="Tốc độ bứt phá cao nhất">▲ {maxWpm}</span>
          <span className="text-slate-500" title="Tốc độ đáy">▼ {minWpm}</span>
        </div>
      )}
    </div>
  );
});

LiveWpmSparkline.displayName = 'LiveWpmSparkline';

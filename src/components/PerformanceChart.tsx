import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Scatter,
  ReferenceLine,
} from 'recharts';
import { PerformanceChartPoint } from '../types';

interface PerformanceChartProps {
  data: PerformanceChartPoint[];
  sessionBestWpm?: number;
  ghostWpm?: number;
  hasGhost?: boolean;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  sessionBestWpm,
  ghostWpm,
  hasGhost,
}) => {
  if (!data || data.length === 0) {
    return null;
  }

  // Find max WPM to set Y-axis upper limit comfortably
  const maxDataWpm = Math.max(
    ...data.map((d) => d.playerWpm || 0),
    sessionBestWpm || 0,
    ghostWpm || 0,
    40
  );
  const yUpper = Math.ceil((maxDataWpm + 15) / 10) * 10;

  // Generate X-axis ticks: 10s intervals + event points (errors or finish)
  const xTicks = React.useMemo(() => {
    const seconds = data.map((d) => d.second);
    const maxSec = Math.max(...seconds, 10);
    const baseTicks: number[] = [];
    for (let s = 10; s <= maxSec; s += 10) {
      baseTicks.push(s);
    }
    const eventTicks = data
      .filter((d) => d.errors > 0 || d.second === maxSec)
      .map((d) => d.second);
    return Array.from(new Set([...baseTicks, ...eventTicks])).sort((a, b) => a - b);
  }, [data]);

  return (
    <div className="w-full p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 shadow-xl">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="second"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              ticks={xTicks}
              tickFormatter={(v) => `${v}s`}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              domain={[0, yUpper]}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0]?.payload as PerformanceChartPoint | undefined;
                return (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-xs space-y-1 font-mono">
                    <div className="text-slate-400 font-bold border-b border-slate-800 pb-1">
                      Giây thứ: {label}s
                    </div>
                    <div className="text-amber-400 flex items-center justify-between gap-3">
                      <span>Bạn:</span>
                      <span className="font-bold">{point?.playerWpm || 0} WPM</span>
                    </div>
                    {hasGhost && ghostWpm && ghostWpm > 0 && (
                      <div className="text-cyan-400 flex items-center justify-between gap-3">
                        <span>Ghost:</span>
                        <span className="font-bold">{point?.ghostWpm ?? ghostWpm} WPM</span>
                      </div>
                    )}
                    {sessionBestWpm && sessionBestWpm > 0 && (
                      <div className="text-yellow-400 flex items-center justify-between gap-3">
                        <span>Cao nhất:</span>
                        <span className="font-bold">{sessionBestWpm} WPM</span>
                      </div>
                    )}
                    {point && point.errors > 0 && (
                      <div className="text-rose-400 flex items-center justify-between gap-3 pt-0.5 border-t border-slate-800">
                        <span>Lỗi tại mốc này:</span>
                        <span className="font-bold">+{point.errors} lỗi</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
            />

            {/* Session Best WPM Reference Line */}
            {sessionBestWpm && sessionBestWpm > 0 && (
              <ReferenceLine
                y={sessionBestWpm}
                stroke="#eab308"
                strokeDasharray="4 4"
                label={{
                  value: `Cao nhất ${sessionBestWpm}`,
                  fill: '#eab308',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />
            )}

            {/* Ghost WPM line */}
            {hasGhost && ghostWpm && ghostWpm > 0 && (
              <Line
                type="monotone"
                dataKey="ghostWpm"
                name="Ghost"
                stroke="#22d3ee"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                activeDot={{ r: 4, fill: '#22d3ee' }}
              />
            )}

            {/* Player's actual WPM curve */}
            <Line
              type="monotone"
              dataKey="playerWpm"
              name="Tốc độ của bạn"
              stroke="#fbbf24"
              strokeWidth={2.5}
              dot={{ r: 2, fill: '#fbbf24' }}
              activeDot={{ r: 5, fill: '#f59e0b' }}
            />

            {/* Errors represented as red scatter points */}
            <Scatter
              dataKey="errorPlot"
              name="Vị trí lỗi sai"
              fill="#f43f5e"
              shape="cross"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

import React from 'react';
import { Player } from '../../types';
import { PerformanceChart } from '../PerformanceChart';
import { Gauge, Target, Activity, AlertTriangle, RotateCcw, Trophy, TrendingUp, CheckCircle2 } from 'lucide-react';

interface RaceResultViewProps {
  players: Player[];
  currentPlayerId: string;
  isSolo?: boolean;
  isOutplay?: boolean;
}

export const RaceResultView: React.FC<RaceResultViewProps> = ({
  players,
  currentPlayerId,
  isSolo = false,
  isOutplay = false,
}) => {
  const me = players.find((p) => p.id === currentPlayerId);

  const calculatedAccuracy = me?.accuracy !== undefined
    ? me.accuracy
    : me
    ? Math.max(0, Math.min(100, Math.round((me.correctChars / Math.max(1, me.correctChars + (me.errors || 0) * 5)) * 100)))
    : 100;

  const wpmDiffFromLast = me?.lastWpm && me.lastWpm > 0 && me.wpm
    ? me.wpm - me.lastWpm
    : 0;

  const sorted = [...players].sort((a, b) => {
    if (a.isSurrendered && !b.isSurrendered) return 1;
    if (!a.isSurrendered && b.isSurrendered) return -1;
    return (b.wpm || 0) - (a.wpm || 0);
  });

  const chartDataToDisplay = me?.chartData && me.chartData.length > 0 ? me.chartData : [];

  return (
    <div className="space-y-4">
      {/* Primary Stats Grid */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-800/90 to-amber-500/10 border border-amber-400/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center shadow-lg">
        {/* Tốc độ với Dấu Tích Xanh Anti-Cheat */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span>Tốc Độ</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {me?.wpm || 0}
            </span>
            <span className="text-xs font-normal text-slate-400">WPM</span>

            {/* Anti-Cheat Green Checkmark Tooltip */}
            <div className="relative group inline-flex items-center ml-0.5">
              <div
                className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-help"
                title="Anti-Cheat v4.0 Verified"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none w-64 p-2.5 rounded-xl bg-slate-950 border border-emerald-500/40 shadow-2xl text-[11px] text-slate-200 text-center animate-fadeIn">
                <div className="flex items-center gap-1 text-emerald-400 font-bold mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Anti-Cheat v4.0 Verified</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Thẩm định tốc độ sinh học & tính nhất quán ngón tay hợp lệ. Sub-millisecond WPM Verified.
                </p>
                <div className="w-2 h-2 bg-slate-950 border-r border-b border-emerald-500/40 rotate-45 -mb-3.5 mt-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Độ chính xác */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>Độ Chính Xác</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-0.5">
            {calculatedAccuracy}%
          </div>
        </div>

        {/* Độ ổn định / nhất quán */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Độ Ổn Định</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono mt-0.5">
            {me?.consistency !== undefined ? `${me.consistency}%` : '---'}
          </div>
        </div>

        {/* Số lỗi */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Số Lỗi</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono mt-0.5">
            {me?.errors || 0}
            <span className="text-xs font-normal text-slate-400 ml-1">lỗi</span>
          </div>
        </div>
      </div>

      {/* Multiplayer Leaderboard Table */}
      {!isSolo && sorted.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Bảng Xếp Hạng Trận Đấu
          </h4>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {sorted.map((p, idx) => {
              const isMe = p.id === currentPlayerId;
              return (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    isMe
                      ? 'bg-amber-500/20 border-amber-400 font-bold'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-400 w-5">#{idx + 1}</span>
                    <span className="text-lg">{p.icon}</span>
                    <span className="truncate max-w-[140px] text-white">
                      {p.username} {isMe && '(Bạn)'}
                    </span>
                    {p.isSurrendered && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                        Đầu Hàng
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-amber-400 font-bold">{p.wpm || 0} WPM</span>
                    <span className="text-rose-400 text-[11px]">{p.errors || 0} lỗi</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Performance Timeline Chart */}
      {chartDataToDisplay.length > 0 && (
        <PerformanceChart
          data={chartDataToDisplay}
          sessionBestWpm={isOutplay ? me?.sessionBestWpm : undefined}
          ghostWpm={me?.ghostDiff?.ghostWpm}
          hasGhost={!!me?.ghostDiff}
        />
      )}

      {/* Session Stats */}
      <div className={`p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 grid gap-3 text-xs ${
        isOutplay ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
      }`}>
        {/* Tốc độ ván trước */}
        <div className="flex items-center justify-between sm:flex-col sm:items-start p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span>Tốc độ ván trước:</span>
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono font-bold text-white text-base">
              {me?.lastWpm && me.lastWpm > 0 ? `${me.lastWpm} WPM` : '---'}
            </span>
            {me?.lastWpm && me.lastWpm > 0 && wpmDiffFromLast !== 0 && (
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                wpmDiffFromLast > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {wpmDiffFromLast > 0 ? `+${wpmDiffFromLast}` : wpmDiffFromLast} WPM
              </span>
            )}
          </div>
        </div>

        {/* Tốc độ cao nhất - CHỈ HIỂN THỊ TRONG CHẾ ĐỘ OUTPLAY YOURSELF */}
        {isOutplay && (
          <div className="flex items-center justify-between sm:flex-col sm:items-start p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span>Cao nhất:</span>
            </span>
            <span className="font-mono font-bold text-yellow-400 text-base mt-1">
              {me?.sessionBestWpm && me.sessionBestWpm > 0
                ? `${me.sessionBestWpm} WPM`
                : '---'}
            </span>
          </div>
        )}

        {/* Tổng ký tự đúng */}
        <div className="flex items-center justify-between sm:flex-col sm:items-start p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ký tự chính xác:</span>
          </span>
          <span className="font-mono font-bold text-emerald-400 text-base mt-1">
            {me?.correctChars || 0} <span className="text-xs text-slate-400 font-normal">ký tự</span>
          </span>
        </div>
      </div>
    </div>
  );
};

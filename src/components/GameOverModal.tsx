import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { soundFx } from '../utils/audio';
import { Trophy, CheckCircle2, RotateCcw, Home, Users, Gauge, Target, Activity, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { PerformanceChart } from './PerformanceChart';
import { normalizeChartTimeline } from '../utils/chartHelper';

interface GameOverModalProps {
  players: Player[];
  currentPlayerId: string;
  isBossMode?: boolean;
  isBossVictory?: boolean;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
  onBackToWaitingRoom?: () => void;
  onAutoTimeoutLeave?: () => void;
  modeName: string;
  isSolo?: boolean;
  isOutplay?: boolean;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  players,
  currentPlayerId,
  isBossMode = false,
  isBossVictory = false,
  onPlayAgain,
  onBackToLobby,
  onBackToWaitingRoom,
  onAutoTimeoutLeave,
  modeName,
  isSolo = false,
  isOutplay = false,
}) => {
  // 10s auto-leave countdown for multiplayer: nếu trong 10s không nhấn chơi lại/về phòng chờ thì xóa người chơi khỏi phòng
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (isSolo) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onAutoTimeoutLeave?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSolo, onAutoTimeoutLeave]);
  // Sort players by WPM or Score
  const sorted = [...players].sort((a, b) => {
    if (isBossMode || a.score > 0) {
      return (b.score || 0) - (a.score || 0);
    }
    return (b.wpm || 0) - (a.wpm || 0);
  });

  const myRank = sorted.findIndex((p) => p.id === currentPlayerId) + 1;
  const me = players.find((p) => p.id === currentPlayerId);

  const calculatedAccuracy = me?.accuracy !== undefined
    ? me.accuracy
    : me
    ? Math.max(0, Math.min(100, Math.round((me.correctChars / Math.max(1, me.correctChars + (me.errors || 0) * 5)) * 100)))
    : 100;

  const wpmDiffFromLast = me?.lastWpm && me.lastWpm > 0 && me.wpm
    ? me.wpm - me.lastWpm
    : 0;

  const chartDataToDisplay = React.useMemo(() => {
    if (me?.chartData && me.chartData.length > 0) {
      return me.chartData;
    }
    const finalWpm = me?.wpm || (me?.correctChars ? Math.round((me.correctChars / 5) / 1) : 0);
    if (finalWpm > 0) {
      return normalizeChartTimeline([], 60, finalWpm, isOutplay ? me?.sessionBestWpm : undefined);
    }
    return [];
  }, [me?.chartData, me?.wpm, me?.correctChars, isOutplay, me?.sessionBestWpm]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 relative my-auto">
        {/* Top celebratory banner */}
        <div className="text-center space-y-1.5">
          {isBossMode ? (
            <div>
              <div className="text-5xl mb-2">{isBossVictory ? '🏆' : '💀'}</div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {isBossVictory ? 'HẮC LONG ĐÃ BỊ ĐÁNH BẠI!' : 'ĐỘI HÌNH ĐÃ THẤT THỦ!'}
              </h2>
              <p className="text-xs text-slate-400">
                {isBossVictory
                  ? 'Tinh thần chiến đấu tuyệt vời đã cứu rỗi đấu trường!'
                  : 'Boss quá mạnh mẽ, hãy rèn luyện thêm để phục thù!'}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-4xl sm:text-5xl mb-1.5">{isSolo ? '🎯' : '🏁'}</div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {isSolo ? 'HOÀN THÀNH BÀI THI!' : 'HOÀN THÀNH CHẶNG ĐUA!'}
              </h2>
              <p className="text-xs text-slate-400">
                Chế độ: <span className="text-amber-400 font-bold">{modeName}</span>
                {isSolo && <span className="ml-1.5 px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px] font-bold border border-slate-700">Solo / Outplay</span>}
              </p>
            </div>
          )}
        </div>

        {/* My Performance Card (Detailed Summary) */}
        {me && (
          <div className="space-y-4">
            {/* Primary Stats Grid */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-800/90 to-amber-500/10 border border-amber-400/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center shadow-lg">
              {/* Tốc độ với Dấu Tích Xanh Anti-Cheat */}
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col items-center justify-center">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isBossMode ? 'Sát Thương' : 'Tốc Độ'}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                    {isBossMode ? `${me.score || 0}` : `${me.wpm || 0}`}
                  </span>
                  <span className="text-xs font-normal text-slate-400">
                    {isBossMode ? 'DMG' : 'WPM'}
                  </span>

                  {/* Anti-Cheat Green Checkmark Tooltip */}
                  {!isBossMode && (
                    <div className="relative group inline-flex items-center ml-0.5">
                      <div
                        className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-help"
                        title="Anti-Cheat v4.0 Verified"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      {/* Tooltip on hover */}
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
                  )}
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
                  {me.consistency !== undefined ? `${me.consistency}%` : '---'}
                </div>
              </div>

              {/* Số lỗi */}
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Số Lỗi</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono mt-0.5">
                  {me.errors || 0}
                  <span className="text-xs font-normal text-slate-400 ml-1">lỗi</span>
                </div>
              </div>
            </div>

            {/* Multiplayer Leaderboard Table (Placed above the chart in multiplayer modes) */}
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
                        </div>

                        <div className="flex items-center gap-4 font-mono">
                          {isBossMode ? (
                            <span className="text-amber-400 font-bold">{p.score || 0} DMG</span>
                          ) : (
                            <>
                              <span className="text-amber-400 font-bold">{p.wpm || 0} WPM</span>
                              <span className="text-rose-400 text-[11px]">{p.errors || 0} lỗi</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Performance Timeline Chart (Đường người chơi, đường ghost, kỷ lục phiên, các lỗi sai) */}
            {chartDataToDisplay.length > 0 && (
              <PerformanceChart
                data={chartDataToDisplay}
                sessionBestWpm={isOutplay ? me?.sessionBestWpm : undefined}
                ghostWpm={me?.ghostDiff?.ghostWpm}
                hasGhost={!!me?.ghostDiff}
              />
            )}

            {/* Session Stats (Ván trước, Cao nhất phiên này - chỉ có ở Outplay, Ký tự hoàn thành) */}
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
                    {me.lastWpm && me.lastWpm > 0 ? `${me.lastWpm} WPM` : '---'}
                  </span>
                  {me.lastWpm && me.lastWpm > 0 && wpmDiffFromLast !== 0 && (
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
                    {me.sessionBestWpm && me.sessionBestWpm > 0
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
                  {me.correctChars || 0} <span className="text-xs text-slate-400 font-normal">ký tự</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 10s Countdown Bar for Multiplayer */}
        {!isSolo && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-center gap-2 font-medium">
              <Clock className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              <span>Tự động rời phòng chờ nếu không bấm chơi tiếp:</span>
            </div>
            <div className="font-mono font-black text-sm bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-500/40 text-amber-300 shrink-0">
              {countdown}s
            </div>
          </div>
        )}

        {/* Modal Buttons */}
        <div className="pt-2 flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          <button
            id="btn-modal-back-lobby"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onBackToLobby();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Trang Chủ</span>
          </button>

          {!isSolo && onBackToWaitingRoom && (
            <button
              id="btn-modal-back-waiting-room"
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onBackToWaitingRoom();
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Phòng Chờ</span>
            </button>
          )}

          <button
            id="btn-modal-play-again"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onPlayAgain();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-102 active:scale-98 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isSolo ? 'Chơi Lại Solo' : 'Đua Tiếp'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};


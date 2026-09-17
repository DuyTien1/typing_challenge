import React from 'react';
import { Player, NgauHungGameStats } from '../../types';
import { Zap, Trophy, Clock, Target, Award, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface NgauHungResultViewProps {
  stats: NgauHungGameStats | null;
  players: Player[];
  currentPlayerId: string;
  isSolo?: boolean;
}

export const NgauHungResultView: React.FC<NgauHungResultViewProps> = ({
  stats,
  players,
  currentPlayerId,
  isSolo = false,
}) => {
  const me = players.find((p) => p.id === currentPlayerId);
  const totalRounds = stats?.totalRounds || 15;
  const top1Count = stats?.top1Count || 0;
  const top2Count = stats?.top2Count || 0;
  const top3Count = stats?.top3Count || 0;
  const completedRounds = stats?.completedRounds || 0;
  const bestTimeSec = stats?.bestTimeSec || null;
  const avgTimeSec = stats?.avgTimeSec || 0;
  const totalScore = stats?.totalScore ?? (me?.score || 0);
  const perfectRounds = stats?.perfectRounds || 0;
  const roundHistory = stats?.roundHistory || [];

  const winRate = totalRounds > 0 ? Math.round((top1Count / totalRounds) * 100) : 0;
  const completionRate = totalRounds > 0 ? Math.round((completedRounds / totalRounds) * 100) : 0;

  // Xếp hạng tổng thể người chơi trong phòng
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isSurrendered && !b.isSurrendered) return 1;
    if (!a.isSurrendered && b.isSurrendered) return -1;
    return (b.score || 0) - (a.score || 0);
  });
  const myRank = sortedPlayers.findIndex((p) => p.id === currentPlayerId) + 1;

  // Đánh giá năng lực phản xạ & tốc độ
  const getSprintTier = () => {
    if (winRate >= 60 || (avgTimeSec > 0 && avgTimeSec <= 2.2)) {
      return {
        title: 'TIA CHỚP PHẢN XẠ',
        tier: 'GOD-SPEED',
        color: 'from-amber-400 to-yellow-300',
        textColor: 'text-amber-300',
        borderColor: 'border-amber-400/50',
        bgBadge: 'bg-amber-500/20',
        desc: 'Tốc độ phản ứng thần sầu, bứt tốc áp đảo mọi vòng đấu!',
      };
    }
    if (winRate >= 35 || (avgTimeSec > 0 && avgTimeSec <= 3.2)) {
      return {
        title: 'BẬC THẦY BỨT TỐC',
        tier: 'PRO-SPRINTER',
        color: 'from-orange-400 to-amber-300',
        textColor: 'text-orange-300',
        borderColor: 'border-orange-400/50',
        bgBadge: 'bg-orange-500/20',
        desc: 'Khả năng xuất chiêu nhanh nhẹn và duy trì nhịp điệu ấn tượng.',
      };
    }
    if (winRate >= 15 || completionRate >= 65) {
      return {
        title: 'TAY GÕ NHANH NHẸN',
        tier: 'ELITE SPEEDSTER',
        color: 'from-cyan-400 to-blue-300',
        textColor: 'text-cyan-300',
        borderColor: 'border-cyan-400/50',
        bgBadge: 'bg-cyan-500/20',
        desc: 'Hoàn thành ổn định nhiều vòng đấu với phong độ bền bỉ.',
      };
    }
    return {
      title: 'CHIẾN BINH BỀN BỈ',
      tier: 'CHALLENGER',
      color: 'from-slate-300 to-slate-400',
      textColor: 'text-slate-300',
      borderColor: 'border-slate-600',
      bgBadge: 'bg-slate-800',
      desc: 'Hãy tiếp tục rèn luyện phản xạ ngón tay để vươn lên đỉnh cao!',
    };
  };

  const tierInfo = getSprintTier();

  return (
    <div className="space-y-4">
      {/* Capability Tier Banner */}
      <div className={`p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-amber-500/10 border ${tierInfo.borderColor} flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center font-black text-2xl shadow-inner shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-base sm:text-lg font-black tracking-wide ${tierInfo.textColor}`}>
                {tierInfo.title}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${tierInfo.bgBadge} ${tierInfo.textColor} border ${tierInfo.borderColor}`}>
                {tierInfo.tier}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{tierInfo.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/70 px-3.5 py-2 rounded-xl border border-slate-800 shrink-0">
          <Trophy className="w-4 h-4 text-amber-400" />
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Xếp Hạng Chung</div>
            <div className="text-sm font-black text-white font-mono">
              Hạng #{myRank} / {players.length}
            </div>
          </div>
        </div>
      </div>

      {/* Core 4-Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Vòng Về Nhất */}
        <div className="p-3 rounded-2xl bg-slate-900/70 border border-amber-400/30 text-center flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Top 1 Vòng</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
            {top1Count}
            <span className="text-xs text-slate-400 font-normal ml-1">/ {totalRounds}</span>
          </div>
          <div className="text-[10px] font-bold text-emerald-400 mt-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Tỷ lệ thắng {winRate}%
          </div>
        </div>

        {/* Thời gian nhanh nhất */}
        <div className="p-3 rounded-2xl bg-slate-900/70 border border-sky-400/30 text-center flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span>Kỷ Lục Vòng</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">
            {bestTimeSec !== null ? `${bestTimeSec.toFixed(2)}s` : '---'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Bứt tốc tốt nhất</div>
        </div>

        {/* Tốc độ trung bình */}
        <div className="p-3 rounded-2xl bg-slate-900/70 border border-cyan-400/30 text-center flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>T/g Trung Bình</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
            {avgTimeSec > 0 ? `${avgTimeSec.toFixed(2)}s` : '---'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Thời gian / từ</div>
        </div>

        {/* Tổng điểm tích lũy */}
        <div className="p-3 rounded-2xl bg-slate-900/70 border border-emerald-400/30 text-center flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tổng Điểm</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            {totalScore}
            <span className="text-xs font-normal text-slate-400 ml-1">pts</span>
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-1 font-mono">
            +3 Nhất / +2 Nhì / +1 Ba
          </div>
        </div>
      </div>

      {/* Secondary Sprint Attributes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Về Nhì (Top 2):</span>
          <span className="font-mono font-bold text-slate-200">{top2Count} vòng</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Về Ba (Top 3):</span>
          <span className="font-mono font-bold text-amber-500/80">{top3Count} vòng</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Hoàn Hảo (0 lỗi):</span>
          <span className="font-mono font-bold text-emerald-400">{perfectRounds} vòng</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Hoàn thành kịp giờ:</span>
          <span className="font-mono font-bold text-sky-300">{completedRounds}/{totalRounds} ({completionRate}%)</span>
        </div>
      </div>

      {/* Round-by-Round Breakdown History */}
      {roundHistory.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Nhật Ký Từng Vòng Đua ({roundHistory.length} vòng)</span>
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">Chi tiết kết quả & thời gian</span>
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
            {roundHistory.map((item) => {
              const isTop1 = item.placement === 1;
              const isTop2 = item.placement === 2;
              const isTop3 = item.placement === 3;
              const isFailed = item.placement === null;

              return (
                <div
                  key={item.round}
                  className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                    isTop1
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      : isTop2
                      ? 'bg-slate-800/80 border-slate-600 text-slate-200'
                      : isTop3
                      ? 'bg-amber-900/20 border-amber-700/40 text-amber-300'
                      : 'bg-slate-900/50 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-400 w-12 shrink-0">
                      Vòng {item.round}
                    </span>
                    <span className="font-bold text-white tracking-wide truncate max-w-[120px] sm:max-w-[200px]">
                      "{item.word}"
                    </span>
                    {item.isPerfect && (
                      <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> 0 lỗi
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-[11px] text-slate-400">
                      {isFailed ? 'Hết giờ' : `${item.timeSec.toFixed(2)}s`}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isTop1
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : isTop2
                          ? 'bg-slate-700 border-slate-500 text-slate-200'
                          : isTop3
                          ? 'bg-amber-800/40 border-amber-600 text-amber-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      }`}
                    >
                      {isTop1 ? '🥇 Hạng 1 (+3)' : isTop2 ? '🥈 Hạng 2 (+2)' : isTop3 ? '🥉 Hạng 3 (+1)' : '⏰ 0 điểm'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Multiplayer Leaderboard Table */}
      {!isSolo && sortedPlayers.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Bảng Xếp Hạng Phòng Đấu
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {sortedPlayers.map((p, idx) => {
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

                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-amber-400 font-bold text-sm">{p.score || 0} PTS</span>
                    {idx === 0 && <span className="text-xs">👑 Quán Quân</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

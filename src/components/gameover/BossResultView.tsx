import React from 'react';
import { Player, BossBattleStats } from '../../types';
import { PerformanceChart } from '../PerformanceChart';
import { Flame, Shield, Zap, Target, Trophy, Clock, AlertTriangle, Activity, Award } from 'lucide-react';

interface BossResultViewProps {
  stats: BossBattleStats | null;
  players: Player[];
  currentPlayerId: string;
  isVictory: boolean;
  isSolo?: boolean;
}

export const BossResultView: React.FC<BossResultViewProps> = ({
  stats,
  players,
  currentPlayerId,
  isVictory,
  isSolo = false,
}) => {
  const me = players.find((p) => p.id === currentPlayerId);
  const totalDamage = stats?.totalDamage ?? (me?.score || 0);
  const dps = stats?.dps || (stats?.battleDurationSec ? Math.round(totalDamage / stats.battleDurationSec) : Math.round(totalDamage / 60));
  const maxCombo = stats?.maxCombo || 0;
  const critCount = stats?.critCount || 0;
  const critRate = stats?.critRate || 0;
  const shieldBreaks = stats?.shieldBreaks || 0;
  const battleDurationSec = stats?.battleDurationSec || 60;
  const totalErrors = stats?.totalErrors ?? (me?.errors || 0);
  const chartData = stats?.chartData || me?.chartData || [];

  const accuracy = Math.max(0, Math.min(100, Math.round((totalDamage / Math.max(1, totalDamage + totalErrors * 5)) * 100)));

  // Sắp xếp người chơi theo sát thương gây ra
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isSurrendered && !b.isSurrendered) return 1;
    if (!a.isSurrendered && b.isSurrendered) return -1;
    return (b.score || 0) - (a.score || 0);
  });
  const myRank = sortedPlayers.findIndex((p) => p.id === currentPlayerId) + 1;

  // Tổng sát thương toàn đội
  const totalTeamDamage = players.reduce((sum, p) => sum + (p.score || 0), 0);
  const myContributionRate = totalTeamDamage > 0 ? Math.round((totalDamage / totalTeamDamage) * 100) : 100;

  // Đánh giá cấp bậc chiến đấu
  const getCombatTier = () => {
    if (totalDamage >= 800 || dps >= 18) {
      return {
        title: 'BẬC THẦY DIỆT RỒNG',
        tier: 'SS-TIER SLAYER',
        color: 'from-amber-400 to-rose-400',
        textColor: 'text-amber-300',
        borderColor: 'border-amber-400/60',
        bgBadge: 'bg-amber-500/20',
        desc: 'Hỏa lực hủy diệt đỉnh cao, đòn bão kích liên hồi dồn ép Hắc Long!',
      };
    }
    if (totalDamage >= 500 || dps >= 12) {
      return {
        title: 'CHIẾN BINH TIÊN PHONG',
        tier: 'S-TIER RAIDER',
        color: 'from-rose-400 to-orange-400',
        textColor: 'text-rose-300',
        borderColor: 'border-rose-400/60',
        bgBadge: 'bg-rose-500/20',
        desc: 'Gánh vác sát thương chủ lực, phá giáp nhạy bén tạo lợi thế tuyệt đối.',
      };
    }
    if (totalDamage >= 300 || dps >= 7) {
      return {
        title: 'HIỆP SĨ TRẢM MA',
        tier: 'A-TIER FIGHTER',
        color: 'from-cyan-400 to-blue-400',
        textColor: 'text-cyan-300',
        borderColor: 'border-cyan-400/60',
        bgBadge: 'bg-cyan-500/20',
        desc: 'Tấn công nhịp nhàng, đóng góp ổn định vào chiến dịch săn Boss.',
      };
    }
    return {
      title: 'TẬP SỰ CHIẾN BINH',
      tier: 'B-TIER RECRUIT',
      color: 'from-slate-300 to-slate-400',
      textColor: 'text-slate-300',
      borderColor: 'border-slate-600',
      bgBadge: 'bg-slate-800',
      desc: 'Hãy duy trì tốc độ gõ cao và hạn chế gõ lỗi để kích hoạt bão kích x1.5!',
    };
  };

  const tierInfo = getCombatTier();

  return (
    <div className="space-y-4">
      {/* Capability Tier Banner */}
      <div className={`p-4 rounded-2xl bg-gradient-to-r from-rose-500/15 via-slate-900/90 to-amber-500/15 border ${tierInfo.borderColor} flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-400 flex items-center justify-center font-black text-2xl shadow-inner shrink-0">
            {isVictory ? '⚔️' : '🛡️'}
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
          <Trophy className="w-4 h-4 text-rose-400" />
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Đóng Góp Sát Thương</div>
            <div className="text-sm font-black text-rose-300 font-mono">
              Hạng #{myRank} ({myContributionRate}%)
            </div>
          </div>
        </div>
      </div>

      {/* Core 4-Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Tổng sát thương */}
        <div className="p-3 rounded-2xl bg-slate-900/70 border border-rose-400/30 text-center flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Tổng Sát Thương</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
            {totalDamage}
            <span className="text-xs text-slate-400 font-normal ml-1">DMG</span>
          </div>
          <div className="text-[10px] text-rose-300/80 mt-1 font-bold">
            {myContributionRate}% toàn đội
          </div>
        </div>

        {/* DPS Sát thương / giây */}
        <div className="p-3 rounded-2xl bg-slate-900/70 border border-amber-400/30 text-center flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Chỉ Số DPS</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
            {dps}
            <span className="text-xs text-slate-400 font-normal ml-1">/giây</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Hỏa lực liên tục</div>
        </div>

        {/* Đòn chí mạng */}
        <div className="p-3 rounded-2xl bg-slate-900/70 border border-yellow-400/30 text-center flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
            <Target className="w-3.5 h-3.5 text-yellow-400" />
            <span>Đòn Chí Mạng</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-yellow-400 font-mono">
            {critCount}
            <span className="text-xs text-slate-400 font-normal ml-1">lần</span>
          </div>
          <div className="text-[10px] text-yellow-300/80 mt-1">
            Tỷ lệ Crit {critRate}%
          </div>
        </div>

        {/* Phá Giáp Choáng Boss */}
        <div className="p-3 rounded-2xl bg-slate-900/70 border border-cyan-400/30 text-center flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Phá Giáp Boss</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
            {shieldBreaks}
            <span className="text-xs text-slate-400 font-normal ml-1">lần</span>
          </div>
          <div className="text-[10px] text-cyan-300 mt-1">Kích hoạt Choáng x1.5</div>
        </div>
      </div>

      {/* Secondary Combat Attributes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-400" />
            Max Combo:
          </span>
          <span className="font-mono font-bold text-orange-400">{maxCombo} từ</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-400" />
            Thời gian đấu:
          </span>
          <span className="font-mono font-bold text-sky-300">{battleDurationSec}s</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <Target className="w-3 h-3 text-emerald-400" />
            Độ chính xác:
          </span>
          <span className="font-mono font-bold text-emerald-400">{accuracy}%</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Lỗi / Trượt:
          </span>
          <span className="font-mono font-bold text-rose-400">{totalErrors} lỗi</span>
        </div>
      </div>

      {/* Team Damage Distribution Bar */}
      {players.length > 1 && (
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-rose-400" />
              <span>Phân Bổ Sát Thương Toàn Đội</span>
            </span>
            <span className="font-mono font-bold text-slate-300">
              Tổng đội: {totalTeamDamage} DMG
            </span>
          </div>

          {/* Stacked Visual Bar */}
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-800">
            {sortedPlayers.map((p, idx) => {
              const share = totalTeamDamage > 0 ? ((p.score || 0) / totalTeamDamage) * 100 : 0;
              if (share <= 0) return null;
              const isMe = p.id === currentPlayerId;
              return (
                <div
                  key={p.id}
                  style={{ width: `${share}%` }}
                  title={`${p.username}: ${p.score || 0} DMG (${Math.round(share)}%)`}
                  className={`h-full rounded-full transition-all ${
                    isMe
                      ? 'bg-gradient-to-r from-rose-500 to-amber-400'
                      : idx % 2 === 0
                      ? 'bg-sky-500/70'
                      : 'bg-indigo-500/70'
                  }`}
                />
              );
            })}
          </div>

          {/* Player Breakdown list */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {sortedPlayers.slice(0, 4).map((p) => {
              const isMe = p.id === currentPlayerId;
              const share = totalTeamDamage > 0 ? Math.round(((p.score || 0) / totalTeamDamage) * 100) : 0;
              return (
                <div
                  key={p.id}
                  className={`p-1.5 rounded-lg border text-[11px] flex items-center justify-between ${
                    isMe
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-200 font-bold'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="truncate max-w-[80px]">
                    {p.username} {isMe && '(Bạn)'}
                  </span>
                  <span className="font-mono text-white">
                    {p.score || 0} ({share}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Performance Timeline Chart */}
      {chartData.length > 0 && (
        <PerformanceChart
          data={chartData}
          hasGhost={false}
        />
      )}

      {/* Multiplayer Leaderboard Table */}
      {!isSolo && sortedPlayers.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Bảng Xếp Hạng Đấu Boss
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {sortedPlayers.map((p, idx) => {
              const isMe = p.id === currentPlayerId;
              return (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    isMe
                      ? 'bg-rose-500/20 border-rose-400 font-bold'
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
                        Tự Hủy / Đầu Hàng
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-rose-400 font-bold text-sm">{p.score || 0} DMG</span>
                    {idx === 0 && <span className="text-xs">⚔️ Sát Thương Khủng</span>}
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

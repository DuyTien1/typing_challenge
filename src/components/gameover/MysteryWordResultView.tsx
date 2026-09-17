import React from 'react';
import { Player, MysteryWordGameStats } from '../../types';
import { Brain, Trophy, Lightbulb, Zap, HelpCircle, CheckCircle2, Sparkles, Award } from 'lucide-react';

interface MysteryWordResultViewProps {
  stats: MysteryWordGameStats | null;
  players: Player[];
  currentPlayerId: string;
  isSolo?: boolean;
}

export const MysteryWordResultView: React.FC<MysteryWordResultViewProps> = ({
  stats,
  players,
  currentPlayerId,
  isSolo = false,
}) => {
  const me = players.find((p) => p.id === currentPlayerId);
  const totalRounds = stats?.totalRounds || 10;
  const correctGuesses = stats?.correctGuesses || 0;
  const accuracyRate = stats?.accuracyRate ?? (totalRounds > 0 ? Math.round((correctGuesses / totalRounds) * 100) : 0);
  const totalScore = stats?.totalScore ?? (me?.score || 0);
  const totalBonusLetters = stats?.totalBonusLetters || 0;
  const fastestGuessSec = stats?.fastestGuessSec || null;
  const roundHistory = stats?.roundHistory || [];

  // Sắp xếp người chơi theo điểm đoán chữ
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isSurrendered && !b.isSurrendered) return 1;
    if (!a.isSurrendered && b.isSurrendered) return -1;
    return (b.score || 0) - (a.score || 0);
  });
  const myRank = sortedPlayers.findIndex((p) => p.id === currentPlayerId) + 1;

  // Đánh giá năng lực suy luận ngôn ngữ
  const getDetectiveTier = () => {
    if (accuracyRate >= 70 || totalScore >= 45) {
      return {
        title: 'THÁM TỬ TỪ VỰNG THẦN SẦU',
        tier: 'MASTER SHERLOCK',
        color: 'from-purple-400 to-pink-300',
        textColor: 'text-purple-300',
        borderColor: 'border-purple-400/50',
        bgBadge: 'bg-purple-500/20',
        desc: 'Trực giác ngôn ngữ phi thường, giải mã từ bí mật trong chớp mắt!',
      };
    }
    if (accuracyRate >= 45 || totalScore >= 25) {
      return {
        title: 'BẬC THẦY SUY LUẬN',
        tier: 'DEDUCTION EXPERT',
        color: 'from-indigo-400 to-purple-300',
        textColor: 'text-indigo-300',
        borderColor: 'border-indigo-400/50',
        bgBadge: 'bg-indigo-500/20',
        desc: 'Khả năng liên tưởng từ vựng và phán đoán ngữ cảnh chuẩn xác.',
      };
    }
    if (accuracyRate >= 25 || totalScore >= 10) {
      return {
        title: 'HỌC GIẢ ĐIỀU TRA',
        tier: 'WORD ANALYST',
        color: 'from-cyan-400 to-blue-300',
        textColor: 'text-cyan-300',
        borderColor: 'border-cyan-400/50',
        bgBadge: 'bg-cyan-500/20',
        desc: 'Nắm bắt nhạy bén các chữ cái gợi ý và tích lũy điểm số ổn định.',
      };
    }
    return {
      title: 'TẬP SỰ KHÁM PHÁ',
      tier: 'APPRENTICE',
      color: 'from-slate-300 to-slate-400',
      textColor: 'text-slate-300',
      borderColor: 'border-slate-600',
      bgBadge: 'bg-slate-800',
      desc: 'Hãy tiếp tục mở rộng vốn từ tiếng Việt để giải mã thêm nhiều câu đố!',
    };
  };

  const tierInfo = getDetectiveTier();

  return (
    <div className="space-y-4">
      {/* Capability Tier Banner */}
      <div className={`p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-slate-900/90 to-purple-500/10 border ${tierInfo.borderColor} flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 text-purple-400 flex items-center justify-center font-black text-2xl shadow-inner shrink-0">
            🧩
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
          <Trophy className="w-4 h-4 text-purple-400" />
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Xếp Hạng Phán Đoán</div>
            <div className="text-sm font-black text-white font-mono">
              Hạng #{myRank} / {players.length}
            </div>
          </div>
        </div>
      </div>

      {/* Core 4-Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Số từ đoán trúng */}
        <div className="p-3 rounded-2xl bg-slate-900/70 border border-purple-400/30 text-center flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>Từ Đoán Trúng</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">
            {correctGuesses}
            <span className="text-xs text-slate-400 font-normal ml-1">/ {totalRounds}</span>
          </div>
          <div className="text-[10px] font-bold text-purple-300 mt-1 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
            Chính xác {accuracyRate}%
          </div>
        </div>

        {/* Chữ ẩn đoán sớm (bonus) */}
        <div className="p-3 rounded-2xl bg-slate-900/70 border border-amber-400/30 text-center flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>Chữ Ẩn Giải Sớm</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
            +{totalBonusLetters}
            <span className="text-xs text-slate-400 font-normal ml-1">chữ</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Thưởng suy luận sớm</div>
        </div>

        {/* Phản xạ đoán nhanh nhất */}
        <div className="p-3 rounded-2xl bg-slate-900/70 border border-cyan-400/30 text-center flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Giải Nhanh Nhất</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
            {fastestGuessSec !== null ? `${fastestGuessSec}s` : '---'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Thời gian giải mã</div>
        </div>

        {/* Tổng điểm suy luận */}
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
            +5 chuẩn + 1pt/chữ ẩn
          </div>
        </div>
      </div>

      {/* Secondary Detective Attributes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Điểm thưởng TB/từ:</span>
          <span className="font-mono font-bold text-amber-300">
            {correctGuesses > 0 ? `+${(totalBonusLetters / correctGuesses).toFixed(1)} pts` : '---'}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Từ bỏ lỡ / Hết giờ:</span>
          <span className="font-mono font-bold text-slate-400">{totalRounds - correctGuesses} từ</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between col-span-2 sm:col-span-1">
          <span className="text-slate-400">Chỉ số trực giác:</span>
          <span className="font-mono font-bold text-purple-300">{Math.min(100, Math.round(accuracyRate * 1.2))}/100</span>
        </div>
      </div>

      {/* Mystery Words Deduction History Table */}
      {roundHistory.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Hồ Sơ Giải Mã ({roundHistory.length} từ bí mật)</span>
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">Chi tiết câu đố & gợi ý</span>
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
            {roundHistory.map((item) => (
              <div
                key={item.round}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                  item.isCorrect
                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-200'
                    : 'bg-slate-900/50 border-slate-800/80 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-slate-400 w-12 shrink-0">
                    Vòng {item.round}
                  </span>
                  <div>
                    <div className="font-bold text-white tracking-wide">
                      {item.word}
                    </div>
                    {item.category && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-purple-400" />
                        <span>Chủ đề: {item.category}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono">
                  {item.hiddenCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      +{item.hiddenCount} ẩn
                    </span>
                  )}

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      item.isCorrect
                        ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {item.isCorrect ? `🎉 Bạn đoán đúng (+${item.pts})` : `⏰ ${item.solverName}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multiplayer Leaderboard Table */}
      {!isSolo && sortedPlayers.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Bảng Xếp Hạng Trí Tuệ
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {sortedPlayers.map((p, idx) => {
              const isMe = p.id === currentPlayerId;
              return (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    isMe
                      ? 'bg-purple-500/20 border-purple-400 font-bold'
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
                    <span className="text-purple-400 font-bold text-sm">{p.score || 0} PTS</span>
                    {idx === 0 && <span className="text-xs">🧠 Quán Quân</span>}
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

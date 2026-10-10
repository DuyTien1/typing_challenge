import React, { useEffect, useState } from 'react';
import {
  SectWarReportData,
  SectWarContributor,
} from '../types';
import { soundFx } from '../utils/audio';
import {
  Swords,
  Trophy,
  Zap,
  Shield,
  Clock,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Home,
  Users,
  Award,
  CheckCircle2,
} from 'lucide-react';

interface SectWarReportModalProps {
  data: SectWarReportData;
  onPlayAgain: (isPractice: boolean) => void;
  onBackToSect: () => void;
  onBackToLobby: () => void;
}

export const SectWarReportModal: React.FC<SectWarReportModalProps> = ({
  data,
  onPlayAgain,
  onBackToSect,
  onBackToLobby,
}) => {
  const [stamped, setStamped] = useState(false);
  const [stampSoundPlayed, setStampSoundPlayed] = useState(false);

  useEffect(() => {
    // Sound & stamp impact animation
    const timer = setTimeout(() => {
      setStamped(true);
      if (!stampSoundPlayed) {
        soundFx.playGuzhengNote(5);
        soundFx.playVictory();
        setStampSoundPlayed(true);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [stampSoundPlayed]);

  const {
    isPractice,
    sectName,
    wpm,
    accuracy,
    completedAllStages,
    basePoints,
    stageBonus,
    totalAddedPoints,
    previousSectPoints,
    newSectPoints,
    currentRank,
    dailyAttemptsUsed,
    dailyAttemptsLeft,
    dailyAttemptsMax,
    topContributors = [],
    stageStats,
    message,
  } = data;

  const canPlayOfficialAgain = !isPractice && dailyAttemptsLeft > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#111827] via-[#0d131f] to-[#070b12] border-2 border-amber-500/50 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.25)] p-5 sm:p-7 text-white space-y-5 my-auto overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Imperial Title */}
        <div className="text-center space-y-1.5 relative border-b border-amber-500/25 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-black tracking-widest uppercase shadow-sm">
            <Swords className="w-3.5 h-3.5" />
            <span>Vạn Phái Tranh Phong • Thái Cổ Linh Mạch</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-orange-400 uppercase tracking-wide">
            {isPractice ? '📜 Thao Diễn Võ Trường Báo Tiệp' : '📜 Chiếu Thư Báo Tiệp Tông Môn'}
          </h2>

          <p className="text-xs text-slate-300">
            {isPractice ? (
              <span>Rèn luyện 3 Ải thành công cho môn phái <strong className="text-amber-300">{sectName}</strong>!</span>
            ) : (
              <span>Chiến công hiển hách phụng hiến vì sự hưng thịnh của <strong className="text-amber-300">{sectName}</strong>!</span>
            )}
          </p>
        </div>

        {/* Imperial Vermilion Stamp (Dấu Mộc Thiên Đạo Đóng Xuống) */}
        <div className="flex justify-center my-2 relative">
          <div
            className={`transition-all duration-500 transform ${
              stamped
                ? 'scale-100 opacity-100 rotate-[-4deg]'
                : 'scale-150 opacity-0 rotate-12'
            }`}
          >
            <div
              className={`px-6 py-2.5 rounded-2xl border-4 font-black uppercase tracking-widest text-sm sm:text-base shadow-2xl flex items-center gap-2.5 select-none ${
                isPractice
                  ? 'border-cyan-500/90 bg-cyan-950/80 text-cyan-300 shadow-cyan-500/30 ring-4 ring-cyan-500/20'
                  : 'border-rose-600/90 bg-rose-950/80 text-rose-300 shadow-rose-600/40 ring-4 ring-rose-500/20'
              }`}
            >
              <span className="text-lg">💮</span>
              <span>{isPractice ? 'HOÀN THÀNH THAO DIỄN' : 'CỐNG HIẾN THÀNH CÔNG'}</span>
              <span className="text-lg">💮</span>
            </div>
          </div>
        </div>

        {/* 1. BẢNG KÊ KHAI CHIẾN CÔNG CÁ NHÂN */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-3.5 shadow-inner">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-amber-300">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Thống Kê Chiến Tích 3 Ải</span>
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {completedAllStages ? '✓ Đột Phá Toàn Bộ 85 Từ' : 'Hoàn Thành Bài Thi'}
            </span>
          </div>

          {/* Core Metrics: WPM & Accuracy */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Tốc Độ Bình Quân</div>
              <div className="text-2xl font-black font-mono text-amber-300">{wpm} <span className="text-xs font-sans font-bold text-slate-400">WPM</span></div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Độ Chuẩn Xác</div>
              <div className="text-2xl font-black font-mono text-emerald-300">{accuracy}%</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Thưởng Vượt 3 Ải</div>
              <div className="text-2xl font-black font-mono text-cyan-300">+{stageBonus}đ</div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-center shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <div className="text-[10px] uppercase font-bold text-amber-400">Cống Hiến Môn Phái</div>
              <div className="text-2xl font-black font-mono text-amber-300">
                {isPractice ? '0đ' : `+${totalAddedPoints}đ`}
              </div>
            </div>
          </div>

          {/* 3-Stage Detailed Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
            {/* Stage 1: Tiếng Việt */}
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-emerald-300 flex items-center gap-1 text-[11px]">
                  <span>🇻🇳</span> Ải 1: Tiếng Việt (30 từ)
                </span>
                <span className="text-[10px] text-slate-400">Dấu thanh & âm tiết</span>
              </div>
              <div className="text-right font-mono">
                <div className="font-black text-emerald-400">{stageStats?.stage1Wpm || wpm} WPM</div>
                <div className="text-[10px] text-slate-400">{stageStats?.stage1Accuracy || accuracy}%</div>
              </div>
            </div>

            {/* Stage 2: Tiếng Anh */}
            <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-cyan-300 flex items-center gap-1 text-[11px]">
                  <span>🇬🇧</span> Ải 2: Tiếng Anh (30 từ)
                </span>
                <span className="text-[10px] text-slate-400">Tốc độ quốc tế</span>
              </div>
              <div className="text-right font-mono">
                <div className="font-black text-cyan-400">{stageStats?.stage2Wpm || wpm} WPM</div>
                <div className="text-[10px] text-slate-400">{stageStats?.stage2Accuracy || accuracy}%</div>
              </div>
            </div>

            {/* Stage 3: Phím số */}
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-amber-300 flex items-center gap-1 text-[11px]">
                  <span>🔢</span> Ải 3: Phím Số (25 số)
                </span>
                <span className="text-[10px] text-slate-400">Sprint nước rút</span>
              </div>
              <div className="text-right font-mono">
                <div className="font-black text-amber-400">{stageStats?.stage3Wpm || wpm} WPM</div>
                <div className="text-[10px] text-slate-400">{stageStats?.stage3Accuracy || accuracy}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. TRẠNG THÁI LỆNH BÀI XUẤT TRẬN HÔM NAY */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">
                {isPractice ? 'Chế Độ Thao Diễn Võ Trường' : 'Chiến Lệnh Bài Xuất Trận Hôm Nay'}
              </span>
              <span className="text-slate-400 text-[11px]">
                {isPractice
                  ? 'Thao diễn rèn luyện tự do không giới hạn, không tiêu hao chiến lệnh bài.'
                  : message || `Đã sử dụng 1 lượt xuất chiến hôm nay. Lượt mới hồi phục vào 00:00 ngày mai.`}
              </span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono font-black text-amber-300 shrink-0">
            {isPractice ? (
              <span className="text-cyan-400">Vô Hạn (Luyện Tập)</span>
            ) : (
              <span>Còn {dailyAttemptsLeft}/{dailyAttemptsMax} Lượt</span>
            )}
          </div>
        </div>

        {/* 3. TÁC ĐỘNG TỨC THỜI LÊN THỨ HẠNG MÔN PHÁI & TOP 5 CAO THỦ */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="font-black text-white">{sectName}</span>
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 text-[10px]">
                Hạng #{currentRank || 1}
              </span>
            </div>
            <div className="font-mono text-xs">
              {isPractice ? (
                <span className="text-slate-400">Điểm hiện tại: <strong className="text-amber-300">{newSectPoints.toLocaleString()}đ</strong></span>
              ) : (
                <span className="text-slate-300">
                  <span className="line-through text-slate-500">{previousSectPoints.toLocaleString()}đ</span>{' '}
                  ➔ <strong className="text-amber-300 font-bold">{newSectPoints.toLocaleString()}đ</strong>{' '}
                  <span className="text-emerald-400 font-bold">(+{totalAddedPoints}đ)</span>
                </span>
              )}
            </div>
          </div>

          {/* Top 5 Contributors Micro-list */}
          {topContributors && topContributors.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Top Đệ Tử Đóng Góp Điểm Chiến Công Hàng Đầu:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {topContributors.slice(0, 5).map((c, idx) => (
                  <div
                    key={c.username || idx}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] flex items-center justify-between gap-1"
                  >
                    <span className="truncate text-slate-300 flex items-center gap-1">
                      <span className="font-bold text-amber-400 font-mono">#{idx + 1}</span>
                      <span className="truncate max-w-[65px]">{c.displayName || c.username}</span>
                    </span>
                    <span className="font-mono font-bold text-amber-300 text-[10px] shrink-0">
                      {c.points}đ
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onBackToLobby();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Về Sảnh Đua</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onBackToSect();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sảnh Tông Môn</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {canPlayOfficialAgain ? (
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onPlayAgain(false);
                }}
                className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Xuất Chiến Tiếp (Còn {dailyAttemptsLeft}/3)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onPlayAgain(true);
                }}
                className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Tiếp Tục Thao Diễn Võ Trường</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

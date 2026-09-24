import React, { useEffect, useState } from 'react';
import { HeavenlyDaoDecree } from '../types';
import { soundFx } from '../utils/audio';
import {
  Scroll,
  Sparkles,
  Zap,
  Crown,
  Award,
  Flame,
  X,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import { DAO_BOT_NAME, DAO_BOT_TITLE } from '../utils/heavenlyDaoBot';

interface DaoDecreeModalProps {
  decree: HeavenlyDaoDecree | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenChronicle?: () => void;
}

export const DaoDecreeModal: React.FC<DaoDecreeModalProps> = ({
  decree,
  isOpen,
  onClose,
  onOpenChronicle,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && decree) {
      soundFx.playVictory();
    }
  }, [isOpen, decree]);

  if (!isOpen || !decree) return null;

  const isBreakthrough = decree.eventType === 'breakthrough';
  const isRecord = decree.eventType === 'record';
  const isBossKill = decree.eventType === 'boss_kill';
  const isPenalty = decree.eventType === 'penalty';

  const getTheme = () => {
    if (isBreakthrough) {
      return {
        borderGlow: 'from-amber-400 via-purple-500 to-indigo-500',
        badgeBg: 'bg-purple-950/80 text-purple-200 border-purple-400/50',
        accentText: 'text-purple-300',
        title: 'THIÊN ĐỊA DỊ TƯỢNG • ĐỘ KIẾP ĐẠO QUẢ',
        icon: <Sparkles className="w-8 h-8 text-amber-300 animate-bounce" />,
        ambientSparks: '🌸 ✨ 🌟 🪷 ✨',
      };
    }
    if (isRecord) {
      return {
        borderGlow: 'from-amber-400 via-yellow-300 to-amber-600',
        badgeBg: 'bg-amber-950/80 text-amber-200 border-amber-400/50',
        accentText: 'text-amber-300',
        title: 'KIM BẢNG ĐỀ DANH • THIÊN BẢNG ĐĂNG ĐỈNH',
        icon: <Crown className="w-8 h-8 text-amber-300 animate-pulse" />,
        ambientSparks: '⚡ 👑 ⚔️ 🌟 ⚡',
      };
    }
    if (isBossKill) {
      return {
        borderGlow: 'from-red-500 via-rose-500 to-amber-500',
        badgeBg: 'bg-red-950/80 text-red-200 border-red-400/50',
        accentText: 'text-red-300',
        title: 'MA THẦN QUỴ PHỤC • CÔNG HUÂN VÔ LƯỢNG',
        icon: <Flame className="w-8 h-8 text-red-400 animate-bounce" />,
        ambientSparks: '🔥 🐉 ⚔️ 💥 🔥',
      };
    }
    if (isPenalty) {
      return {
        borderGlow: 'from-rose-600 via-purple-600 to-red-600',
        badgeBg: 'bg-rose-950/80 text-rose-200 border-rose-400/50',
        accentText: 'text-rose-400',
        title: 'THIÊN LÔI GIÁNG THẾ • TRỪNG PHẠT TÀ ĐẠO',
        icon: <Zap className="w-8 h-8 text-rose-400 animate-pulse" />,
        ambientSparks: '⚡ 🌩️ ⚡ 🌩️ ⚡',
      };
    }
    return {
      borderGlow: 'from-cyan-400 via-sky-500 to-indigo-500',
      badgeBg: 'bg-cyan-950/80 text-cyan-200 border-cyan-400/50',
      accentText: 'text-cyan-300',
      title: 'THIÊN ĐẠO CHIẾU THƯ',
      icon: <Scroll className="w-8 h-8 text-cyan-300" />,
      ambientSparks: '✨ 🧘 🍵 🌟 ✨',
    };
  };

  const theme = getTheme();

  const handleShare = () => {
    soundFx.playKeyClick();
    const shareText = `📜 [${decree.title}] ${decree.content} - FastTyping Challenge`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      {/* Background Floating Aura & Lightning Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className={`w-[600px] h-[600px] rounded-full bg-gradient-to-tr ${theme.borderGlow} opacity-20 blur-3xl animate-pulse`} />
        <div className="absolute text-2xl tracking-widest opacity-40 select-none animate-bounce">
          {theme.ambientSparks}
        </div>
      </div>

      {/* Main Celestial Scroll Frame */}
      <div className="relative w-full max-w-xl mx-auto rounded-3xl p-1 bg-gradient-to-b from-amber-400/80 via-purple-500/60 to-amber-600/80 shadow-2xl shadow-amber-500/30">
        <div className="relative rounded-[22px] bg-gradient-to-b from-[#181126] via-[#120e1e] to-[#0c0a14] border border-amber-300/40 p-6 sm:p-8 overflow-hidden text-center text-slate-100">
          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Đóng chiếu thư"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Imperial Seal / Bagua Emblem */}
          <div className="flex flex-col items-center justify-center space-y-3 mb-5">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500/30 via-purple-600/30 to-indigo-500/30 border-2 border-amber-400/80 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <span className="text-4xl animate-[spin_12s_linear_infinite]">☯️</span>
              </div>
              <div className="absolute -top-2 -right-2">
                {theme.icon}
              </div>
            </div>

            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-md ${theme.badgeBg}`}>
              <span>{theme.title}</span>
            </div>

            <div className="text-xs text-amber-300 font-semibold tracking-wide">
              {DAO_BOT_NAME} • {DAO_BOT_TITLE}
            </div>
          </div>

          {/* Golden Heading */}
          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 tracking-wide uppercase drop-shadow-md mb-4">
            {decree.title}
          </h2>

          {/* Imperial Scroll Content Box */}
          <div className="relative my-4 p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 shadow-inner space-y-3 text-left">
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans first-letter:text-2xl first-letter:font-serif first-letter:text-amber-300 first-letter:mr-1">
              {decree.content}
            </p>

            {/* Decree Metadata Badges */}
            <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
              {decree.targetUser && (
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <span>Sắc phong:</span>
                  <span className="text-white underline">@{decree.targetUser}</span>
                </div>
              )}
              {decree.wpm && (
                <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
                  <span>Tốc độ:</span>
                  <span>{decree.wpm} WPM</span>
                </div>
              )}
              {decree.realmName && (
                <div className="flex items-center gap-1 text-purple-300 font-bold">
                  <span>Cảnh giới:</span>
                  <span>{decree.realmName}</span>
                </div>
              )}
              <div className="text-[11px] text-slate-400 font-mono">
                {new Date(decree.timestamp).toLocaleTimeString('vi-VN')} • {new Date(decree.timestamp).toLocaleDateString('vi-VN')}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onClose();
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition-all cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Khấu Tạ Thiên Đạo (Lĩnh Chiếu)</span>
            </button>

            {onOpenChronicle && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onClose();
                  onOpenChronicle();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Scroll className="w-4 h-4 text-amber-300" />
                <span>Xem Cáo Thị Vạn Giới</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Sao chép chiếu thư"
            >
              <Share2 className="w-4 h-4" />
              <span>{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

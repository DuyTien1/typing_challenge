import React, { useState, useEffect } from 'react';
import {
  HeavenlyDaoDecree,
  HeavenlyDaoEventType,
} from '../types';
import {
  getStoredDaoDecrees,
  subscribeToDaoDecrees,
  DAO_BOT_NAME,
} from '../utils/heavenlyDaoBot';
import {
  Sparkles,
  ChevronRight,
  Zap,
  Award,
  Flame,
  Volume2,
  VolumeX,
  Scroll,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface HeavenlyTickerBannerProps {
  onOpenChronicle: () => void;
}

export const HeavenlyTickerBanner: React.FC<HeavenlyTickerBannerProps> = ({
  onOpenChronicle,
}) => {
  const [decrees, setDecrees] = useState<HeavenlyDaoDecree[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isGlowing, setIsGlowing] = useState(false);

  // Initialize and subscribe to real-time decrees
  useEffect(() => {
    const list = getStoredDaoDecrees();
    setDecrees(list);

    const unsubscribe = subscribeToDaoDecrees((newDecree) => {
      setDecrees((prev) => [newDecree, ...prev.filter((d) => d.id !== newDecree.id)].slice(0, 30));
      setCurrentIndex(0);
      setIsGlowing(true);
      setTimeout(() => setIsGlowing(false), 3000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-cycle through decrees every 8 seconds if there are multiple
  useEffect(() => {
    if (decrees.length <= 1 || isMinimized) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % decrees.length);
    }, 8500);

    return () => clearInterval(interval);
  }, [decrees.length, isMinimized]);

  const activeDecree = decrees[currentIndex] || decrees[0];

  if (!activeDecree) return null;

  const getEventBadge = (type: HeavenlyDaoEventType) => {
    switch (type) {
      case 'penalty':
        return {
          icon: <Zap className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
          label: 'Thiên Lôi Phạt Tội',
          badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-rose-950/50',
          dotColor: 'bg-rose-400',
        };
      case 'breakthrough':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-300 shrink-0" />,
          label: 'Thiên Địa Dị Tượng',
          badgeClass: 'bg-purple-950/80 text-purple-200 border-purple-500/50 shadow-purple-950/50',
          dotColor: 'bg-purple-400',
        };
      case 'record':
        return {
          icon: <Award className="w-3.5 h-3.5 text-amber-300 shrink-0" />,
          label: 'Kim Bảng Đề Danh',
          badgeClass: 'bg-amber-950/80 text-amber-200 border-amber-500/50 shadow-amber-950/50',
          dotColor: 'bg-amber-400',
        };
      case 'boss_kill':
        return {
          icon: <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />,
          label: 'Ma Thần Quỵ Phục',
          badgeClass: 'bg-red-950/80 text-red-200 border-red-500/50 shadow-red-950/50',
          dotColor: 'bg-red-400',
        };
      default:
        return {
          icon: <span className="text-xs">🧘</span>,
          label: 'Thiên Cơ Chỉ Điểm',
          badgeClass: 'bg-cyan-950/80 text-cyan-200 border-cyan-500/50 shadow-cyan-950/50',
          dotColor: 'bg-cyan-400',
        };
    }
  };

  const badgeInfo = getEventBadge(activeDecree.eventType);

  if (isMinimized) {
    return (
      <div className="w-full bg-slate-950/60 border-b border-purple-500/20 px-3 py-1 flex items-center justify-between text-[11px] select-none">
        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setIsMinimized(false);
          }}
          className="flex items-center gap-1.5 text-amber-300/80 hover:text-amber-200 font-bold transition-colors cursor-pointer"
        >
          <span className="animate-spin text-xs">☯️</span>
          <span>Huyền Thiên Khí Linh • {activeDecree.title}</span>
          <Eye className="w-3 h-3 text-slate-400 ml-1" />
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            onOpenChronicle();
          }}
          className="text-purple-400 hover:text-purple-300 underline font-medium cursor-pointer"
        >
          Xem Chiếu Thư
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full border-b transition-all duration-500 select-none overflow-hidden ${
        isGlowing
          ? 'bg-gradient-to-r from-amber-950/95 via-purple-950/95 to-slate-950 border-amber-400 shadow-lg shadow-amber-500/30'
          : 'bg-gradient-to-r from-[#170e2b] via-[#100c1e] to-[#0c0a14] border-purple-500/40 shadow-sm'
      }`}
    >
      {/* Floating Celestial Clouds Effect (Mây bay tiên giới phát quang viền vàng/tím) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-6 -left-10 w-48 h-16 bg-gradient-to-r from-amber-400/40 via-purple-500/30 to-transparent rounded-full blur-xl animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute -bottom-6 -right-10 w-64 h-16 bg-gradient-to-l from-purple-500/40 via-amber-400/30 to-transparent rounded-full blur-xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 py-1.5 flex items-center justify-between gap-3 text-xs">
        {/* Left: Dao Avatar + Ticker Title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              soundFx.playKeyClick();
              onOpenChronicle();
            }}
            title="Bấm để mở Chiếu Thư & Biên Niên Sử Thiên Đạo"
            className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500/30 via-purple-600/40 to-slate-900 border border-amber-500/50 flex items-center justify-center text-sm shadow-sm shrink-0 cursor-pointer hover:scale-105 transition-transform"
          >
            <span className="animate-[spin_10s_linear_infinite]">☯️</span>
          </div>

          <div
            className={`px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-sm ${badgeInfo.badgeClass}`}
          >
            {badgeInfo.icon}
            <span className="hidden sm:inline">{badgeInfo.label}</span>
          </div>

          {/* Running Text */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              soundFx.playKeyClick();
              onOpenChronicle();
            }}
            className="truncate text-slate-200 hover:text-white cursor-pointer transition-colors text-[11px] sm:text-xs flex items-center gap-1.5 min-w-0"
          >
            <span className="font-bold text-amber-300 shrink-0">[{activeDecree.title}]:</span>
            <span className="truncate text-slate-300 font-medium">{activeDecree.content}</span>
          </div>
        </div>

        {/* Right Actions: Chronicle Modal Button + Minimize */}
        <div className="flex items-center gap-1.5 shrink-0">
          {decrees.length > 1 && (
            <div className="hidden md:flex items-center gap-1 text-[10px] font-mono text-slate-400 mr-1">
              <span>{currentIndex + 1}</span>
              <span>/</span>
              <span>{decrees.length}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onOpenChronicle();
            }}
            className="h-7 px-2.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Mở Biên Niên Sử Thiên Đạo & Thỉnh Cầu Khí Linh"
          >
            <Scroll className="w-3 h-3 text-amber-400" />
            <span className="hidden xs:inline">Chiếu Thư</span>
            <ChevronRight className="w-3 h-3 opacity-70" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setIsMinimized(true);
            }}
            className="h-7 w-7 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Thu nhỏ thanh thông báo Thiên Đạo"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

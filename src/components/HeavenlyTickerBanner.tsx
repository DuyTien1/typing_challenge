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
  Scroll,
  X,
  Eye,
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface HeavenlyTickerBannerProps {
  onOpenChronicle: () => void;
}

export const HeavenlyTickerBanner: React.FC<HeavenlyTickerBannerProps> = ({
  onOpenChronicle,
}) => {
  const [decrees, setDecrees] = useState<HeavenlyDaoDecree[]>(() => getStoredDaoDecrees());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isGlowing, setIsGlowing] = useState(false);

  // Detect minimal/light mode dynamically
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return (
      document.documentElement.getAttribute('data-ui-style') === 'minimal' ||
      document.documentElement.getAttribute('data-theme-category') === 'light'
    );
  });

  useEffect(() => {
    const handleStyleChange = () => {
      const isLight =
        document.documentElement.getAttribute('data-ui-style') === 'minimal' ||
        document.documentElement.getAttribute('data-theme-category') === 'light';
      setIsLightMode(isLight);
    };

    window.addEventListener('ui_style_changed', handleStyleChange);
    const observer = new MutationObserver(handleStyleChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-ui-style', 'data-theme-category'],
    });

    handleStyleChange();
    return () => {
      window.removeEventListener('ui_style_changed', handleStyleChange);
      observer.disconnect();
    };
  }, []);

  // Initialize and subscribe to real-time decrees
  useEffect(() => {
    const unsubscribe = subscribeToDaoDecrees((newDecree) => {
      setDecrees((prev) => [newDecree, ...prev.filter((d) => d.id !== newDecree.id)].slice(0, 30));
      setCurrentIndex(0);
      setIsMinimized(false);
      setIsDismissed(false);
      setIsGlowing(true);
      setTimeout(() => setIsGlowing(false), 3000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-cycle through decrees every 8.5 seconds if there are multiple
  useEffect(() => {
    if (decrees.length <= 1 || isMinimized || isDismissed) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % decrees.length);
    }, 8500);

    return () => clearInterval(interval);
  }, [decrees.length, isMinimized, isDismissed]);

  // Listen to Escape key to quickly minimize or dismiss Khí Linh notification banner
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDismissed) return;
        const target = e.target as HTMLElement | null;
        const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (!isTyping) {
          if (!isMinimized) {
            setIsMinimized(true);
          } else {
            setIsDismissed(true);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMinimized, isDismissed]);

  const activeDecree = decrees[currentIndex] || decrees[0];

  if (!activeDecree || isDismissed) return null;

  const isLinhLung = activeDecree.personaId === 'linh_lung' || 
                     activeDecree.personaName === 'Linh Lung Tiên Đồng' ||
                     activeDecree.title?.includes('LINH LUNG') ||
                     activeDecree.title?.includes('PHONG THẦN') ||
                     activeDecree.highlightText?.includes('Linh Lung');
  const isBanCo = activeDecree.personaId === 'ban_co' || activeDecree.personaName === 'Bàn Cổ Thần Thức';
  const botName = isLinhLung ? 'Linh Lung Tiên Đồng' : (isBanCo ? 'Bàn Cổ Thần Thức' : 'Huyền Thiên Khí Linh');
  const botAvatar = isLinhLung ? '🪷' : (isBanCo ? '⚡' : '☯️');

  const getEventBadge = (type: HeavenlyDaoEventType, isLight: boolean) => {
    switch (type) {
      case 'penalty':
        return {
          icon: <Zap className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />,
          label: 'Thiên Lôi Phạt Tội',
          badgeClass: isLight
            ? 'bg-rose-100 text-rose-800 border-rose-300 shadow-sm font-black'
            : 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-rose-950/50',
          dotColor: 'bg-rose-500',
        };
      case 'breakthrough':
        return {
          icon: <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-purple-600' : 'text-purple-300'}`} />,
          label: 'Thiên Địa Dị Tượng',
          badgeClass: isLight
            ? 'bg-purple-100 text-purple-800 border-purple-300 shadow-sm font-black'
            : 'bg-purple-950/80 text-purple-200 border-purple-500/50 shadow-purple-950/50',
          dotColor: 'bg-purple-500',
        };
      case 'record':
        return {
          icon: <Award className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-amber-700' : 'text-amber-300'}`} />,
          label: 'Kim Bảng Đề Danh',
          badgeClass: isLight
            ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm font-black'
            : 'bg-amber-950/80 text-amber-200 border-amber-500/50 shadow-amber-950/50',
          dotColor: 'bg-amber-500',
        };
      case 'boss_kill':
        return {
          icon: <Flame className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-red-600' : 'text-red-400'}`} />,
          label: 'Ma Thần Quỵ Phục',
          badgeClass: isLight
            ? 'bg-red-100 text-red-800 border-red-300 shadow-sm font-black'
            : 'bg-red-950/80 text-red-200 border-red-500/50 shadow-red-950/50',
          dotColor: 'bg-red-500',
        };
      default:
        return {
          icon: <span className="text-xs">🧘</span>,
          label: 'Thiên Cơ Chỉ Điểm',
          badgeClass: isLight
            ? 'bg-sky-100 text-sky-800 border-sky-300 shadow-sm font-black'
            : 'bg-cyan-950/80 text-cyan-200 border-cyan-500/50 shadow-cyan-950/50',
          dotColor: 'bg-cyan-500',
        };
    }
  };

  const badgeInfo = getEventBadge(activeDecree.eventType, isLightMode);

  if (isMinimized) {
    return (
      <div
        id="khi-linh-ticker-minimized"
        className={`w-full px-3 py-1 flex items-center justify-between text-[11px] select-none border-b transition-colors ${
          isLightMode
            ? 'bg-white/95 border-purple-200 text-slate-800 shadow-sm'
            : 'bg-slate-950/60 border-purple-500/20 text-slate-300'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setIsMinimized(false);
          }}
          className={`flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${
            isLightMode
              ? (isLinhLung ? 'text-purple-700 hover:text-purple-900 font-extrabold' : 'text-amber-800 hover:text-amber-950 font-extrabold')
              : (isLinhLung ? 'text-purple-300 hover:text-purple-200' : 'text-amber-300/80 hover:text-amber-200')
          }`}
        >
          <span className={`text-xs ${isLinhLung ? 'animate-bounce' : 'animate-spin'}`}>{botAvatar}</span>
          <span>{botName} • {activeDecree.title}</span>
          <Eye className={`w-3 h-3 ml-1 ${isLightMode ? 'text-purple-600' : 'text-slate-400'}`} />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onOpenChronicle();
            }}
            className={`font-semibold underline cursor-pointer transition-colors ${
              isLightMode ? 'text-purple-700 hover:text-purple-950 font-bold' : 'text-purple-400 hover:text-purple-300'
            }`}
          >
            Xem Chiếu Thư
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setIsDismissed(true);
            }}
            className={`h-5 px-1.5 rounded flex items-center gap-1 transition-colors cursor-pointer border ${
              isLightMode
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-300'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
            }`}
            title="Đóng hoàn toàn thông báo Khí Linh (phím Esc)"
          >
            <X className="w-3 h-3" />
            <kbd className={`text-[9px] font-mono font-bold ${isLightMode ? 'text-slate-700' : 'text-slate-400'}`}>Esc</kbd>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="khi-linh-ticker-banner"
      className={`relative w-full border-b transition-all duration-300 select-none overflow-hidden ${
        isLightMode
          ? (isGlowing
              ? (isLinhLung
                  ? 'bg-gradient-to-r from-purple-100 via-pink-100/90 to-purple-50 border-purple-400 shadow-md shadow-purple-500/20'
                  : 'bg-gradient-to-r from-amber-100 via-yellow-100/90 to-amber-50 border-amber-400 shadow-md shadow-amber-500/20')
              : (isLinhLung
                  ? 'bg-gradient-to-r from-purple-50 via-pink-50/70 to-white border-purple-200 shadow-sm'
                  : 'bg-gradient-to-r from-amber-50 via-yellow-50/70 to-white border-amber-200 shadow-sm'))
          : (isGlowing
              ? (isLinhLung
                  ? 'bg-gradient-to-r from-purple-950/95 via-pink-950/90 to-slate-950 border-purple-400 shadow-lg shadow-purple-500/30'
                  : 'bg-gradient-to-r from-amber-950/95 via-purple-950/95 to-slate-950 border-amber-400 shadow-lg shadow-amber-500/30')
              : (isLinhLung
                  ? 'bg-gradient-to-r from-[#210d32] via-[#160c25] to-[#0d0917] border-purple-500/50 shadow-sm'
                  : 'bg-gradient-to-r from-[#170e2b] via-[#100c1e] to-[#0c0a14] border-purple-500/40 shadow-sm'))
      }`}
    >
      {/* Floating Celestial Clouds Effect */}
      <div className={`absolute inset-0 pointer-events-none overflow-hidden ${isLightMode ? 'opacity-15' : 'opacity-30'}`}>
        <div className="absolute -top-6 -left-10 w-48 h-16 bg-gradient-to-r from-purple-400/40 via-pink-500/30 to-transparent rounded-full blur-xl animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute -bottom-6 -right-10 w-64 h-16 bg-gradient-to-l from-purple-500/40 via-amber-400/30 to-transparent rounded-full blur-xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3 text-xs">
        {/* Left: Dao Avatar + Ticker Title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              soundFx.playKeyClick();
              onOpenChronicle();
            }}
            title={`Bấm để mở Chiếu Thư & Biên Niên Sử (${botName})`}
            className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center text-sm shadow-sm shrink-0 cursor-pointer hover:scale-105 transition-transform ${
              isLightMode
                ? (isLinhLung
                    ? 'bg-gradient-to-tr from-purple-200 via-pink-200 to-white border border-purple-300 shadow-sm shadow-purple-500/15'
                    : 'bg-gradient-to-tr from-amber-200 via-yellow-200 to-white border border-amber-300 shadow-sm shadow-amber-500/15')
                : (isLinhLung
                    ? 'bg-gradient-to-tr from-purple-500/40 via-pink-600/40 to-slate-900 border border-purple-400/70 shadow-purple-500/25'
                    : 'bg-gradient-to-tr from-amber-500/30 via-purple-600/40 to-slate-900 border border-amber-500/50')
            }`}
          >
            <span className={isLinhLung ? "animate-[bounce_3s_infinite]" : "animate-[spin_10s_linear_infinite]"}>{botAvatar}</span>
          </div>

          <div
            className={`px-2.5 py-0.5 rounded-lg border text-[10px] uppercase tracking-wider flex items-center gap-1.5 shrink-0 ${badgeInfo.badgeClass}`}
          >
            {badgeInfo.icon}
            <span className="hidden sm:inline">{isLinhLung ? 'Linh Lung Tiên Đồng' : badgeInfo.label}</span>
          </div>

          {/* Running Text */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              soundFx.playKeyClick();
              onOpenChronicle();
            }}
            className={`truncate cursor-pointer transition-colors text-[11px] sm:text-xs flex items-center gap-2 min-w-0 ${
              isLightMode ? 'text-slate-900 hover:text-purple-900' : 'text-slate-200 hover:text-white'
            }`}
          >
            <span className={`font-black shrink-0 ${
              isLightMode
                ? (isLinhLung ? 'text-purple-800' : 'text-amber-800')
                : (isLinhLung ? 'text-purple-300' : 'text-amber-300')
            }`}>
              [{activeDecree.title}]:
            </span>
            <span className={`truncate ${
              isLightMode ? 'text-slate-900 font-bold' : 'text-slate-300 font-medium'
            }`}>
              {activeDecree.content}
            </span>
          </div>
        </div>

        {/* Right Actions: Chronicle Modal Button + Minimize */}
        <div className="flex items-center gap-1.5 shrink-0">
          {decrees.length > 1 && (
            <div className={`hidden md:flex items-center gap-1 text-[10px] font-mono mr-1 ${
              isLightMode ? 'text-slate-600 font-bold' : 'text-slate-400'
            }`}>
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
            className={`h-7 px-2.5 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 ${
              isLightMode
                ? 'bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-900 shadow-purple-500/10'
                : 'bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 hover:text-white'
            }`}
            title="Mở Biên Niên Sử Thiên Đạo & Thỉnh Cầu Khí Linh"
          >
            <Scroll className={`w-3.5 h-3.5 ${isLightMode ? 'text-amber-600' : 'text-amber-400'}`} />
            <span className="hidden xs:inline">Chiếu Thư</span>
            <ChevronRight className="w-3 h-3 opacity-80" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setIsMinimized(true);
            }}
            className={`h-7 px-2 rounded-lg flex items-center gap-1 transition-colors cursor-pointer border ${
              isLightMode
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-300'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
            }`}
            title="Tắt nhanh thông báo Khí Linh (phím Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <kbd className={`hidden sm:inline text-[9px] font-mono font-bold px-1 py-0.5 rounded border ${
              isLightMode
                ? 'bg-white border-slate-300 text-slate-800'
                : 'bg-slate-800/90 border-slate-700/80 text-slate-300'
            }`}>
              Esc
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
};

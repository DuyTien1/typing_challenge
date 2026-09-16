import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Zap, Rocket, Crown, Star, Trophy, X, Sparkles } from 'lucide-react';

export type MilestoneType = 'combo' | 'wpm';

export interface MilestoneToastItem {
  id: string;
  type: MilestoneType;
  value: number;
  badge: string;
  title: string;
  subtitle: string;
  accentColor: 'amber' | 'cyan' | 'purple' | 'emerald' | 'rose';
  durationMs?: number;
}

interface InGameMilestoneToastProps {
  toasts: MilestoneToastItem[];
  onDismiss: (id: string) => void;
}

export const InGameMilestoneToast: React.FC<InGameMilestoneToastProps> = ({
  toasts,
  onDismiss,
}) => {
  return (
    <div
      id="in-game-milestone-toasts-container"
      className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-2.5 pointer-events-none max-w-xs sm:max-w-sm w-full"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <MilestoneToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const MilestoneToastCard: React.FC<{
  toast: MilestoneToastItem;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const duration = toast.durationMs || 2500;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  const colorStyles = {
    amber: {
      border: 'border-amber-500/60',
      bgGlow: 'shadow-[0_0_20px_rgba(245,158,11,0.22)]',
      badgeBg: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/40',
      iconColor: 'text-amber-400',
      barColor: 'bg-amber-400',
    },
    cyan: {
      border: 'border-cyan-500/60',
      bgGlow: 'shadow-[0_0_20px_rgba(6,182,212,0.22)]',
      badgeBg: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/40',
      iconColor: 'text-cyan-400',
      barColor: 'bg-cyan-400',
    },
    purple: {
      border: 'border-purple-500/60',
      bgGlow: 'shadow-[0_0_20px_rgba(168,85,247,0.25)]',
      badgeBg: 'bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 text-purple-300 border-purple-500/40',
      iconColor: 'text-purple-400',
      barColor: 'bg-purple-400',
    },
    emerald: {
      border: 'border-emerald-500/60',
      bgGlow: 'shadow-[0_0_20px_rgba(16,185,129,0.22)]',
      badgeBg: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40',
      iconColor: 'text-emerald-400',
      barColor: 'bg-emerald-400',
    },
    rose: {
      border: 'border-rose-500/60',
      bgGlow: 'shadow-[0_0_20px_rgba(244,63,94,0.25)]',
      badgeBg: 'bg-gradient-to-r from-rose-500/20 to-pink-500/20 text-rose-300 border-rose-500/40',
      iconColor: 'text-rose-400',
      barColor: 'bg-rose-400',
    },
  }[toast.accentColor];

  const renderIcon = () => {
    if (toast.type === 'combo') {
      if (toast.value >= 75) return <Crown className={`w-5 h-5 ${colorStyles.iconColor} animate-bounce`} />;
      if (toast.value >= 50) return <Trophy className={`w-5 h-5 ${colorStyles.iconColor}`} />;
      if (toast.value >= 30) return <Rocket className={`w-5 h-5 ${colorStyles.iconColor}`} />;
      if (toast.value >= 20) return <Zap className={`w-5 h-5 ${colorStyles.iconColor}`} />;
      return <Flame className={`w-5 h-5 ${colorStyles.iconColor} animate-pulse`} />;
    } else {
      if (toast.value >= 140) return <Star className={`w-5 h-5 ${colorStyles.iconColor} animate-spin`} />;
      if (toast.value >= 100) return <Crown className={`w-5 h-5 ${colorStyles.iconColor}`} />;
      if (toast.value >= 80) return <Rocket className={`w-5 h-5 ${colorStyles.iconColor}`} />;
      if (toast.value >= 60) return <Zap className={`w-5 h-5 ${colorStyles.iconColor}`} />;
      return <Sparkles className={`w-5 h-5 ${colorStyles.iconColor}`} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -15, scale: 0.92, x: 20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.9, x: 25 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-xl border ${colorStyles.border} ${colorStyles.bgGlow} p-3.5 shadow-2xl flex items-start gap-3 select-none`}
    >
      {/* Icon Badge */}
      <div className={`p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0 shadow-inner flex items-center justify-center`}>
        {renderIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase border font-mono ${colorStyles.badgeBg}`}>
            {toast.badge}
          </span>
          <span className="text-xs font-bold text-white truncate">{toast.title}</span>
        </div>
        <p className="text-[11px] text-slate-300 mt-1 line-clamp-1 leading-snug">
          {toast.subtitle}
        </p>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        title="Đóng thông báo"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Bottom auto-dismiss countdown bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-0.5 ${colorStyles.barColor} opacity-75`}
      />
    </motion.div>
  );
};

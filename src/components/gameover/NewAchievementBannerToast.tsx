import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XianxiaAchievement } from '../../utils/achievements';
import { soundFx } from '../../utils/audio';
import { Sparkles, Trophy, ChevronRight, X, ExternalLink, Award, SkipForward } from 'lucide-react';

interface QueuedAchievement {
  achievement: XianxiaAchievement;
  batchIndex: number;
  batchTotal: number;
}

export interface NewAchievementBannerToastProps {
  achievements?: XianxiaAchievement[];
  onOpenProfileAchievements?: () => void;
  onDismiss?: () => void;
  durationMs?: number;
}

const RARITY_CONFIG: Record<
  string,
  {
    label: string;
    border: string;
    glow: string;
    badgeStyle: string;
    titleColor: string;
  }
> = {
  common: {
    label: 'Phàm Phẩm',
    border: 'border-slate-500/60 shadow-[0_0_25px_rgba(100,116,139,0.25)]',
    glow: 'from-slate-500/15 via-transparent to-transparent',
    badgeStyle: 'text-slate-300 border-slate-600 bg-slate-800/90',
    titleColor: 'text-slate-200',
  },
  rare: {
    label: 'Hoàng Giai',
    border: 'border-emerald-500/70 shadow-[0_0_25px_rgba(16,185,129,0.3)]',
    glow: 'from-emerald-500/20 via-transparent to-transparent',
    badgeStyle: 'text-emerald-300 border-emerald-500/60 bg-emerald-950/90',
    titleColor: 'text-emerald-300',
  },
  epic: {
    label: 'Huyền Giai',
    border: 'border-sky-500/70 shadow-[0_0_25px_rgba(14,165,233,0.3)]',
    glow: 'from-sky-500/20 via-transparent to-transparent',
    badgeStyle: 'text-sky-300 border-sky-500/60 bg-sky-950/90',
    titleColor: 'text-sky-300',
  },
  legendary: {
    label: 'Địa Giai',
    border: 'border-purple-500/80 shadow-[0_0_30px_rgba(168,85,247,0.35)]',
    glow: 'from-purple-500/25 via-transparent to-transparent',
    badgeStyle: 'text-purple-300 border-purple-500/70 bg-purple-950/90',
    titleColor: 'text-purple-300',
  },
  mythic: {
    label: 'Thiên Giai',
    border: 'border-amber-400/90 shadow-[0_0_35px_rgba(251,191,36,0.4)]',
    glow: 'from-amber-500/30 via-yellow-500/10 to-transparent',
    badgeStyle: 'text-amber-300 border-amber-500/70 bg-amber-950/90',
    titleColor: 'text-amber-300',
  },
};

export const NewAchievementBannerToast: React.FC<NewAchievementBannerToastProps> = ({
  achievements = [],
  onOpenProfileAchievements,
  onDismiss,
  durationMs = 4800,
}) => {
  const [queue, setQueue] = useState<QueuedAchievement[]>([]);
  const [current, setCurrent] = useState<QueuedAchievement | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(100);

  // Track already-queued IDs in this session to prevent duplicate popups
  const queuedIdsRef = useRef<Set<string>>(new Set());
  const advanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Receive new achievements and enqueue them sequentially
  useEffect(() => {
    if (!achievements || achievements.length === 0) return;

    const freshAchievements = achievements.filter((a) => !queuedIdsRef.current.has(a.id));
    if (freshAchievements.length === 0) return;

    freshAchievements.forEach((a) => queuedIdsRef.current.add(a.id));

    const totalBatch = freshAchievements.length;
    const items: QueuedAchievement[] = freshAchievements.map((achievement, idx) => ({
      achievement,
      batchIndex: idx + 1,
      batchTotal: totalBatch,
    }));

    setQueue((prev) => [...prev, ...items]);
  }, [achievements]);

  // Pull the next achievement from queue whenever current is null
  useEffect(() => {
    if (!current && queue.length > 0) {
      const nextItem = queue[0];
      setQueue((prev) => prev.slice(1));
      setCurrent(nextItem);
      setProgressPercent(100);

      // Play celestial fanfare sound on each achievement pop
      try {
        soundFx.playAchievementUnlock();
      } catch {}
    }
  }, [current, queue]);

  // Move to next achievement in queue
  const handleNext = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    soundFx.playKeyClick();
    setCurrent(null);
    setProgressPercent(100);

    if (queueRef.current.length === 0 && onDismissRef.current) {
      setTimeout(() => {
        onDismissRef.current?.();
      }, 0);
    }
  }, []);

  // Dismiss everything (skip whole queue)
  const handleDismissAll = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    soundFx.playKeyClick();
    setQueue([]);
    setCurrent(null);
    setProgressPercent(100);
    if (onDismissRef.current) {
      setTimeout(() => {
        onDismissRef.current?.();
      }, 0);
    }
  }, []);

  // Countdown timer for automatic advancement
  useEffect(() => {
    if (!current) return;

    const intervalMs = 40;
    let elapsedMs = 0;

    const timer = setInterval(() => {
      if (isPausedRef.current) return;

      elapsedMs += intervalMs;
      const remainingPercent = Math.max(0, 100 - (elapsedMs / durationMs) * 100);
      setProgressPercent(remainingPercent);

      if (elapsedMs >= durationMs) {
        clearInterval(timer);
        handleNext();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [current, durationMs, handleNext]);

  // If nothing is showing and queue is empty, render nothing
  if (!current) {
    return null;
  }

  const { achievement, batchIndex, batchTotal } = current;
  const rarity = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common;
  const hasMore = queue.length > 0 || batchIndex < batchTotal;
  const remainingInQueue = queue.length;

  return (
    <aside
      id="new-achievement-corner-toast"
      aria-label="Thông báo thành tựu đạt được"
      className="fixed top-4 right-4 sm:top-5 sm:right-6 z-[100] max-w-[390px] w-[calc(100vw-2rem)] sm:w-[400px] pointer-events-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={achievement.id}
          initial={{ opacity: 0, y: -20, x: 25, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, x: 30, scale: 0.92 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className={`relative overflow-hidden rounded-2xl border-2 ${rarity.border} bg-slate-950/95 backdrop-blur-xl shadow-2xl ring-1 ring-white/10`}
        >
          {/* Subtle Ambient Rarity Aura */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${rarity.glow} pointer-events-none`}
          />

          {/* Top Bar: Header, Batch Counter & Dismiss Buttons */}
          <div className="relative z-10 flex items-center justify-between gap-2 px-3.5 pt-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0 shadow-sm">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 truncate">
                  Đột Phá Thành Tựu!
                </span>
                {batchTotal > 1 ? (
                  <span
                    id="toast-achievement-counter"
                    className="inline-flex items-center gap-1 text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0"
                    title={`Thành tựu ${batchIndex} trên ${batchTotal} vừa mở khóa`}
                  >
                    {batchIndex}/{batchTotal}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 shrink-0">
                    <Sparkles className="w-2.5 h-2.5 text-amber-300 animate-spin" />
                    Mới
                  </span>
                )}
              </div>
            </div>

            {/* Quick Action Controls: Next / Skip all / Close */}
            <div className="flex items-center gap-1 shrink-0">
              {hasMore && (
                <button
                  id="btn-toast-skip-all"
                  type="button"
                  onClick={handleDismissAll}
                  className="px-1.5 py-1 text-[10px] font-semibold text-slate-400 hover:text-slate-200 rounded-md hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1"
                  title="Bỏ qua tất cả thông báo còn lại"
                >
                  <SkipForward className="w-3 h-3" />
                  <span className="hidden sm:inline">Bỏ qua</span>
                </button>
              )}

              {hasMore && (
                <button
                  id="btn-toast-next-achievement"
                  type="button"
                  onClick={handleNext}
                  className="p-1 text-amber-300 hover:text-amber-100 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 transition-colors cursor-pointer"
                  title="Xem thành tựu tiếp theo ngay"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                id="btn-toast-close"
                type="button"
                onClick={handleNext}
                className="p-1 text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
                title="Đóng thành tựu này"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Card Content */}
          <div className="relative z-10 p-3 sm:p-3.5 flex items-start gap-3">
            {/* Achievement Icon Box */}
            <div
              className={`w-12 h-12 sm:w-13 sm:h-13 rounded-xl flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-md border-2 ${achievement.borderClass} ${achievement.badgeBg} relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/15 to-transparent pointer-events-none" />
              <span className="relative z-10 transform scale-100 transition-transform">
                {achievement.icon}
              </span>
            </div>

            {/* Texts and Rarity Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${rarity.badgeStyle}`}
                >
                  {rarity.label}
                </span>
                <span className="text-[9px] text-amber-300/90 font-medium px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                  {achievement.branchName}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">
                  {achievement.realm}
                </span>
              </div>

              <h4 className="text-sm font-black text-white truncate leading-tight">
                {achievement.name}
              </h4>

              {/* Unlocked Title Badge */}
              <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/25 w-fit max-w-full truncate">
                <Award className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">
                  Danh hiệu: <strong className="text-amber-200">[{achievement.title}]</strong>
                </span>
              </div>

              {/* Requirement Description */}
              <p className="mt-1 text-[11px] text-slate-300 leading-snug line-clamp-2">
                {achievement.req}
              </p>
            </div>
          </div>

          {/* Bottom Action Row */}
          <div className="relative z-10 px-3 pb-2.5 flex items-center justify-between gap-2 pt-1 border-t border-white/5">
            {onOpenProfileAchievements ? (
              <button
                id="btn-toast-open-profile-achievements"
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onOpenProfileAchievements();
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black shadow-sm flex items-center gap-1 transition-all cursor-pointer"
              >
                <Award className="w-3 h-3" />
                <span>Trưng Bày</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {remainingInQueue > 0 && (
                <span className="text-[10px] text-slate-400 font-medium">
                  Còn {remainingInQueue} thành tựu
                </span>
              )}
              <button
                id="btn-toast-ack"
                type="button"
                onClick={handleNext}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {hasMore ? 'Tiếp theo' : 'Đã hiểu'}
                {hasMore && <ChevronRight className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Auto-Dismiss Progress Bar at the Bottom */}
          <div className="h-1 bg-slate-900 w-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 transition-all duration-75 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </aside>
  );
};

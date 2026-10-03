import React, { useEffect, useState } from 'react';
import { Crown, Sparkles, X, Zap, Trophy } from 'lucide-react';
import { soundFx } from '../utils/audio';

export interface BreakingRecordEvent {
  username: string;
  displayName?: string;
  mode: string;
  modeName: string;
  wpm: number;
  score: number;
  errors?: number;
  accuracy?: number;
  avatar?: string;
  frame?: string;
  timestamp: number;
}

interface BreakingRecordTickerProps {
  event: BreakingRecordEvent | null;
  onDismiss: () => void;
}

export const BreakingRecordTicker: React.FC<BreakingRecordTickerProps> = ({ event, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (event) {
      setVisible(true);
      // Play celebratory sound effect
      soundFx.playVictory();

      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 12000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [event, onDismiss]);

  if (!event || !visible) return null;

  const isScoreMode = event.mode === 'san_boss' || event.mode === 'ngau_hung' || event.mode === 'doan_chu';
  const metricText = isScoreMode ? `${event.score.toLocaleString()} Điểm` : `${event.wpm} WPM`;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 px-3 sm:px-4 pointer-events-none flex justify-center animate-slideDown">
      <div className="pointer-events-auto max-w-2xl w-full bg-gradient-to-r from-amber-950/95 via-yellow-900/90 to-amber-950/95 border-2 border-yellow-400 rounded-2xl shadow-[0_0_35px_rgba(251,191,36,0.6)] backdrop-blur-md p-3 sm:p-4 text-white flex items-center justify-between gap-3 relative overflow-hidden">
        {/* Animated Background Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/15 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />

        {/* Left Icon with animated Crown */}
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <div className="relative">
            <span className="text-3xl filter drop-shadow select-none">
              {event.avatar || '⚡'}
            </span>
            <span className="absolute -top-3 -right-2 text-xl filter drop-shadow animate-bounce">
              👑
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 relative z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3 h-3 text-black animate-spin" />
              KỶ LỤC MỚI XUẤT HIỆN
            </span>
            <span className="text-[11px] font-mono text-amber-200">
              {event.modeName}
            </span>
          </div>
          <div className="text-xs sm:text-sm font-extrabold text-white mt-1 leading-snug">
            Đạo hữu{' '}
            <span className="text-amber-300 font-black underline decoration-amber-400 decoration-2">
              @{event.displayName || event.username}
            </span>{' '}
            vừa xô đổ kỷ lục hôm nay với{' '}
            <span className="text-yellow-300 font-mono font-black text-sm sm:text-base animate-pulse">
              {metricText}
            </span>
            !
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setVisible(false);
            onDismiss();
          }}
          className="relative z-10 p-1 rounded-lg bg-black/40 hover:bg-black/60 text-amber-200 hover:text-white transition-colors cursor-pointer shrink-0"
          title="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

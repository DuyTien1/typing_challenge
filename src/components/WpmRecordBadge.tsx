import React, { useState, useMemo } from 'react';
import { Flame, Clock, Target, Trophy, Info, Sparkles } from 'lucide-react';
import { BestWpmRecord, HighScoreRecord } from '../types';
import { MatchRecord } from '../utils/matchHistory';

export interface WpmRecordBadgeProps {
  bestWpm?: number;
  bestWpmDisplay?: string;
  bestWpmRecord?: BestWpmRecord | null;
  highScores?: Record<string, HighScoreRecord | null>;
  matchHistory?: MatchRecord[];
  username?: string;
  isBot?: boolean;
  isMe?: boolean;
  className?: string;
  size?: 'large' | 'normal' | 'compact';
  label?: string;
  tooltipPosition?: 'top' | 'bottom';
}

/**
 * Lấy tên hiển thị tiếng Việt chuẩn đẹp của các chế độ chơi
 */
export function getFriendlyModeTitle(modeId?: string): string {
  if (!modeId) return 'Tiếng Việt Có Dấu';
  const clean = modeId.toLowerCase().trim();
  switch (clean) {
    case 'vi_dau':
      return 'Tiếng Việt Có Dấu';
    case 'vi_nodau':
      return 'Tiếng Việt Không Dấu';
    case 'en':
      return 'Tiếng Anh (English)';
    case 'numpad':
      return 'Bàn Phím Số (Numpad)';
    case 'ngau_hung':
      return 'Ngẫu Hứng (Rush)';
    case 'doan_chu':
      return 'Đoán Chữ (Mystery)';
    case 'san_boss':
      return 'Săn Boss (Raid)';
    case 'outplay':
      return 'Outplay Yourself (Solo)';
    case 'bot_arena':
      return 'Đấu Trường Luyện Tập AI';
    default:
      return modeId;
  }
}

/**
 * Định dạng thời gian đạt kỷ lục: ngày giờ chi tiết và thời gian tương đối
 */
export function formatRecordTime(timestamp?: number): { full: string; relative: string } {
  if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
    return { full: 'Chưa xác định', relative: '' };
  }
  const d = new Date(timestamp);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  const full = `${hours}:${minutes}:${seconds} - ${day}/${month}/${year}`;

  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  let relative = 'Vừa xong';
  if (diffSec >= 60 && diffSec < 3600) {
    relative = `${Math.floor(diffSec / 60)} phút trước`;
  } else if (diffSec >= 3600 && diffSec < 86400) {
    relative = `${Math.floor(diffSec / 3600)} giờ trước`;
  } else if (diffSec >= 86400 && diffSec < 2592000) {
    relative = `${Math.floor(diffSec / 86400)} ngày trước`;
  } else if (diffSec >= 2592000) {
    relative = `${Math.floor(diffSec / 2592000)} tháng trước`;
  }

  return { full, relative };
}

/**
 * Kiểm tra xem một chế độ có phải là chế độ Outplay Yourself không
 */
export function isOutplayMode(modeIdOrName?: string | null): boolean {
  if (!modeIdOrName) return false;
  const clean = modeIdOrName.trim().toLowerCase();
  return (
    clean === 'outplay' ||
    clean === 'outplay_yourself' ||
    clean.includes('outplay') ||
    clean.includes('vượt lên chính mình')
  );
}

/**
 * Hàm tìm kiếm và suy luận kỷ lục WPM chính xác của chế độ Outplay Yourself
 * (QUY ĐỊNH BẮT BUỘC: CHỈ TÍNH CHẾ ĐỘ OUTPLAY YOURSELF, KHÔNG TÍNH CÁC CHẾ ĐỘ MULTIPLAYER)
 */
export function resolveBestWpmRecord(params: {
  bestWpm?: number;
  bestWpmRecord?: BestWpmRecord | null;
  highScores?: Record<string, HighScoreRecord | null>;
  matchHistory?: MatchRecord[];
  username?: string;
  isBot?: boolean;
  isMe?: boolean;
}): BestWpmRecord | null {
  // 1. Trường hợp là AI Bot
  if (params.isBot) {
    return {
      wpm: params.bestWpm || 70,
      mode: 'outplay',
      modeName: 'Outplay Yourself (AI Bot)',
      timestamp: Date.now() - 3600000,
    };
  }

  // 2. Tra cứu trong matchHistory: tìm trận đấu chế độ Outplay Yourself có WPM cao nhất
  if (params.matchHistory && params.matchHistory.length > 0) {
    const outplayMatches = params.matchHistory.filter(
      (m) => m && m.wpm > 0 && isOutplayMode(m.modeId || m.mode) && m.result !== 'Đầu hàng'
    );
    if (outplayMatches.length > 0) {
      const highestMatch = [...outplayMatches].sort((a, b) => b.wpm - a.wpm)[0];
      if (highestMatch && highestMatch.wpm > 0) {
        return {
          wpm: highestMatch.wpm,
          mode: 'outplay',
          modeName: 'Outplay Yourself (Solo)',
          timestamp: highestMatch.timestamp,
        };
      }
    }
  }

  // 3. Bản ghi trực tiếp: CHỈ chấp nhận nếu bản ghi thuộc chế độ Outplay Yourself
  if (params.bestWpmRecord && params.bestWpmRecord.wpm > 0) {
    if (isOutplayMode(params.bestWpmRecord.mode)) {
      return {
        ...params.bestWpmRecord,
        mode: 'outplay',
        modeName: 'Outplay Yourself (Solo)',
      };
    }
    // Nếu bản ghi cũ từ multiplayer (vi_dau, san_boss, ngau_hung...) -> BỎ QUA HOÀN TOÀN!
  }

  // 4. Nếu là người chơi hiện tại, kiểm tra bộ nhớ riêng của Outplay
  if (params.isMe && typeof window !== 'undefined') {
    try {
      const outplayStored = localStorage.getItem('fasttyping_outplay_best_record');
      if (outplayStored) {
        const parsed = JSON.parse(outplayStored);
        if (parsed && parsed.wpm > 0 && isOutplayMode(parsed.mode)) {
          return {
            ...parsed,
            mode: 'outplay',
            modeName: 'Outplay Yourself (Solo)',
          };
        }
      }

      const stored = localStorage.getItem('fasttyping_best_wpm_record');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.wpm > 0 && isOutplayMode(parsed.mode)) {
          return {
            ...parsed,
            mode: 'outplay',
            modeName: 'Outplay Yourself (Solo)',
          };
        }
      }

      const outplayWpmStr = localStorage.getItem('fasttyping_outplay_best_wpm');
      if (outplayWpmStr) {
        const wpm = Number(outplayWpmStr);
        if (wpm > 0) {
          return {
            wpm,
            mode: 'outplay',
            modeName: 'Outplay Yourself (Solo)',
            timestamp: Date.now(),
          };
        }
      }
    } catch {}
  }

  // Tuyệt đối không fallback sang highScores (multiplayer) hoặc gán mặc định vi_dau
  return null;
}

export const WpmRecordBadge: React.FC<WpmRecordBadgeProps> = ({
  bestWpm = 0,
  bestWpmDisplay,
  bestWpmRecord,
  highScores,
  matchHistory,
  username,
  isBot = false,
  isMe = false,
  className = '',
  size = 'large',
  label = 'Kỷ lục Outplay',
  tooltipPosition = 'top',
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const record = useMemo(() => {
    return resolveBestWpmRecord({
      bestWpm,
      bestWpmRecord,
      highScores,
      matchHistory,
      username,
      isBot,
      isMe,
    });
  }, [bestWpm, bestWpmRecord, highScores, matchHistory, username, isBot, isMe]);

  const timeInfo = useMemo(() => {
    return formatRecordTime(record?.timestamp);
  }, [record?.timestamp]);

  const hasRecord = !!(record && record.wpm > 0);
  const displayValue = bestWpmDisplay || (hasRecord ? `${record.wpm} WPM` : isMe ? 'Chưa lập kỷ lục' : 'Chưa có kỷ lục');

  // Title string dùng cho native browser tooltip fallback
  const nativeTitle = hasRecord
    ? `Kỷ lục Outplay: ${record.wpm} WPM | Đạt lúc: ${timeInfo.full} (${timeInfo.relative})`
    : 'Chưa có kỷ lục Outplay Yourself';

  const positionClasses = tooltipPosition === 'bottom'
    ? 'top-full left-1/2 -translate-x-1/2 mt-2.5'
    : 'bottom-full left-1/2 -translate-x-1/2 mb-2.5';

  const arrowClasses = tooltipPosition === 'bottom'
    ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-l border-t border-amber-500/40'
    : 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-r border-b border-amber-500/40';

  return (
    <div
      className={`relative group/wpm cursor-pointer select-none transition-all duration-200 ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        setIsMobileOpen((prev) => !prev);
      }}
      title={nativeTitle}
    >
      {/* Visual Container Card */}
      <div className={`p-3 rounded-2xl bg-slate-950 border transition-all duration-200 text-center ${
        hasRecord 
          ? 'border-slate-800 hover:border-amber-500/60 hover:bg-slate-900/80 hover:shadow-lg hover:shadow-amber-500/10' 
          : 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
      }`}>
        {/* Card Header Label */}
        <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
          <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{label}</span>
          <Info className="w-3 h-3 text-slate-500 group-hover/wpm:text-amber-400 transition-colors shrink-0" />
        </div>

        {/* Card Main Value */}
        <div className={`font-black text-amber-400 font-mono mt-0.5 ${
          size === 'large' ? 'text-2xl' : size === 'compact' ? 'text-lg' : 'text-xl'
        }`}>
          {displayValue}
        </div>
      </div>

      {/* Floating Hover Card / Tooltip Modal */}
      <div
        className={`absolute ${positionClasses} w-72 max-w-[calc(100vw-32px)] p-3.5 rounded-2xl bg-slate-900/98 backdrop-blur-md border border-amber-500/50 shadow-2xl shadow-black/90 pointer-events-none z-50 text-left transition-all duration-200 ${
          isMobileOpen
            ? 'opacity-100 visible scale-100'
            : 'opacity-0 invisible scale-95 group-hover/wpm:opacity-100 group-hover/wpm:visible group-hover/wpm:scale-100'
        }`}
      >
        {/* Tooltip Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wide">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Kỷ Lục Outplay Yourself</span>
          </div>
          {hasRecord && (
            <span className="text-[11px] font-black font-mono px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/40">
              {record.wpm} WPM
            </span>
          )}
        </div>

        {/* Tooltip Body */}
        {hasRecord ? (
          <div className="space-y-2.5 text-xs">
            {/* Chế độ chơi */}
            <div className="flex items-start gap-2">
              <div className="p-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                <Target className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
                  Chế độ chơi đạt kỷ lục:
                </span>
                <span className="text-xs font-black text-amber-300 block leading-snug break-words">
                  Outplay Yourself (Solo)
                </span>
              </div>
            </div>

            {/* Thời gian đạt được */}
            <div className="flex items-start gap-2">
              <div className="p-1 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
                  Thời gian xác lập:
                </span>
                <span className="text-xs font-semibold text-slate-200 font-mono block leading-snug">
                  {timeInfo.full}
                </span>
                {timeInfo.relative && (
                  <span className="text-[10px] font-medium text-sky-400/90 block mt-0.5">
                    ({timeInfo.relative})
                  </span>
                )}
              </div>
            </div>

            {/* Footer hint */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] text-slate-400">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Kỷ lục tự động cập nhật khi bạn đạt tốc độ cao hơn trong chế độ Outplay.</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-300 space-y-1.5 py-1">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Chưa có kỷ lục Outplay Yourself</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Kỷ lục tốc độ hiển thị ở hồ sơ chỉ tính riêng từ chế độ Outplay Yourself (Vượt Lên Chính Mình), không tính các chế độ multiplayer. Hãy vào chế độ Outplay Yourself để xác lập kỷ lục!
            </p>
          </div>
        )}

        {/* Tooltip Arrow Pointer */}
        <div className={`absolute w-2.5 h-2.5 bg-slate-900 rotate-45 pointer-events-none ${arrowClasses}`} />
      </div>
    </div>
  );
};

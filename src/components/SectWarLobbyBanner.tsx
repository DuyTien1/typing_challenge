import React, { useState, useEffect } from 'react';
import { SectWarStatus } from '../types';
import { fetchSectWarStatus } from '../utils/roomManager';
import { soundFx } from '../utils/audio';
import {
  Swords,
  Clock,
  ChevronRight,
  Shield,
  Trophy,
} from 'lucide-react';

interface SectWarLobbyBannerProps {
  onOpenSectModal?: () => void;
  onQuickStartRace?: () => void;
}

export const SectWarLobbyBanner: React.FC<SectWarLobbyBannerProps> = ({
  onOpenSectModal,
}) => {
  const [warStatus, setWarStatus] = useState<SectWarStatus | null>(null);
  const [timeLeftFormatted, setTimeLeftFormatted] = useState<string>('');
  const [isEnded, setIsEnded] = useState(false);

  const loadStatus = async () => {
    try {
      const data = await fetchSectWarStatus();
      if (data) {
        setWarStatus(data);
        if (!data.isActive || (data.nextSettlementTimestamp && Date.now() >= data.nextSettlementTimestamp)) {
          setIsEnded(true);
        } else {
          setIsEnded(false);
        }
      }
    } catch {
      // ignore network errors
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 20000);
    return () => clearInterval(interval);
  }, []);

  // Real-time countdown to Sunday 20:00 (VN Time)
  useEffect(() => {
    if (!warStatus?.nextSettlementTimestamp || !warStatus?.isActive) return;

    const tick = () => {
      const now = Date.now();
      const diff = warStatus.nextSettlementTimestamp - now;

      // Khi sự kiện kết thúc hoàn toàn -> lập tức ẩn banner
      if (diff <= 0) {
        setIsEnded(true);
        setTimeLeftFormatted('');
        return;
      }

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      if (days > 0) {
        setTimeLeftFormatted(
          `${days}d ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      } else {
        setTimeLeftFormatted(
          `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [warStatus?.nextSettlementTimestamp, warStatus?.isActive]);

  // ĐẢM BẢO CHỈ HIỂN THỊ KHI BẮT ĐẦU SỰ KIỆN VÀ BIẾN MẤT KHI SỰ KIỆN KẾT THÚC HOÀN TOÀN
  if (!warStatus || !warStatus.isActive || isEnded) {
    return null;
  }

  const topSect = warStatus.topSects?.[0];
  const mySect = warStatus.mySectWarStats;
  const attemptsLeft = warStatus.dailyAttemptsLeft ?? 3;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        soundFx.playKeyClick();
        if (onOpenSectModal) onOpenSectModal();
      }}
      className="w-full relative overflow-hidden rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950/90 hover:border-amber-400/60 transition-all duration-200 px-3.5 py-2.5 shadow-md shadow-amber-950/20 cursor-pointer select-none group"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        {/* Left: Badge & Event Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 shrink-0">
            <Swords className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>

          <div className="flex items-center flex-wrap gap-1.5 min-w-0">
            <span className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide">
              Vạn Phái Tranh Phong
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Đang diễn ra</span>
            </span>
          </div>
        </div>

        {/* Center: Concise Sect / Event Status */}
        <div className="flex items-center flex-wrap gap-2 text-xs min-w-0">
          {mySect ? (
            <div className="flex items-center gap-1.5 text-slate-300 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800">
              <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">
                {mySect.sectName}
              </span>
              <span className="text-amber-400 font-mono font-bold">
                #{mySect.rank} ({mySect.weeklyWarPoints.toLocaleString()}đ)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800">
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-300 truncate max-w-[160px] sm:max-w-[200px]">
                {topSect && (topSect.weeklyWarPoints || 0) > 0 ? (
                  <>Top 1: <strong className="text-amber-300">{topSect.name}</strong></>
                ) : (
                  <span className="text-slate-400 italic">Chưa có môn phái tham chiến</span>
                )}
              </span>
            </div>
          )}

          <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-1 rounded-lg border border-cyan-500/30">
            Lượt: <strong>{attemptsLeft}/3</strong>
          </span>

          {timeLeftFormatted && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30">
              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Còn: <strong>{timeLeftFormatted}</strong></span>
            </div>
          )}
        </div>

        {/* Right: Clean Action Button */}
        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
          <span className="text-xs font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-0.5">
            <span>{mySect ? 'Chiến Trường' : 'Gia Nhập'}</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
};

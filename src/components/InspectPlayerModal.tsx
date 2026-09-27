import React from 'react';
import { LeaderboardEntry } from '../types';
import { AvatarWithFrame, getFrameConfig } from '../utils/frames';
import { soundFx } from '../utils/audio';
import {
  X,
  Zap,
  Award,
  Crown,
  ShieldCheck,
  Keyboard,
  Target,
  Users,
  Ghost,
  Sparkles,
  Flame,
} from 'lucide-react';

interface InspectPlayerModalProps {
  isOpen: boolean;
  player: LeaderboardEntry | null;
  modeName?: string;
  onClose: () => void;
  onStartGhostChallenge?: (entry: LeaderboardEntry) => void;
}

export const InspectPlayerModal: React.FC<InspectPlayerModalProps> = ({
  isOpen,
  player,
  modeName = 'Tốc Ký',
  onClose,
  onStartGhostChallenge,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        soundFx.playKeyClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen || !player) return null;

  const frameConfig = getFrameConfig(player.frame || 'default');
  const isTop1 = player.rank === 1;
  const isTop2 = player.rank === 2;
  const isTop3 = player.rank === 3;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundFx.playKeyClick();
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative text-left space-y-4 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 block">
                HỒ SƠ BẢNG VÀNG
              </span>
              <span className="text-[10px] text-slate-400">
                Chi tiết thành tích & trang bị tu vi
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar & Main Card */}
        <div className="flex flex-col items-center justify-center text-center pt-1">
          <div className="relative mb-2">
            <AvatarWithFrame
              icon={player.avatar || '⚡'}
              frameId={player.frame || 'default'}
              size="xl"
            />
            {isTop1 ? (
              <span className="absolute -top-3 -right-2 text-2xl select-none filter drop-shadow animate-bounce">
                👑
              </span>
            ) : isTop2 ? (
              <span className="absolute -top-2 -right-2 text-xl select-none filter drop-shadow">
                🥈
              </span>
            ) : isTop3 ? (
              <span className="absolute -top-2 -right-2 text-xl select-none filter drop-shadow">
                🥉
              </span>
            ) : (
              <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-amber-400">
                #{player.rank}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 justify-center flex-wrap mt-1">
            <h3 className="text-base sm:text-lg font-black text-white">
              {player.displayName || player.username}
            </h3>
            {player.isVerified && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold"
                title="Kỷ lục đã xác thực: Nhịp gõ tự nhiên đạt chuẩn sinh học"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Đã xác thực</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            @{player.username} • Hạng #{player.rank} {modeName}
          </p>
        </div>

        {/* Performance Metrics: WPM/Score + Accuracy */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Thành Tích Kỷ Lục
            </span>
            <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
              {player.score > 0 ? player.score.toLocaleString() : `${player.wpm} WPM`}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              {player.errors} lỗi • {new Date(player.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
              <Target className="w-3.5 h-3.5 text-emerald-400" /> Tỷ Lệ Chuẩn Xác
            </span>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
              {player.accuracy || 100}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              {player.consistency ? `Tính nhất quán: ${player.consistency}%` : 'Chuẩn mực cao'}
            </span>
          </div>
        </div>

        {/* 4 Rich Details: Cảnh giới tu vi, Switch bàn phím, Tông môn, Khung đại diện */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
          {/* Cảnh giới tu vi */}
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span>{player.realmIcon || '🌿'}</span> Cảnh giới tu vi:
            </span>
            <span className="font-bold text-amber-300">
              {player.realmName || 'Luyện Khí Kỳ'} {player.level ? `(Cấp ${player.level})` : ''}
            </span>
          </div>

          {/* Switch bàn phím */}
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-cyan-400" /> Switch phím dùng:
            </span>
            <span className="font-bold text-cyan-300">
              {player.keyboardSwitch || 'Cherry MX Blue Clicky'}
            </span>
          </div>

          {/* Tông môn */}
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-400" /> Môn phái / Tông môn:
            </span>
            <span className="font-bold text-purple-300">
              {player.sectName ? `${player.sectName} [${player.sectTag || ''}]` : 'Tu sĩ tán tu'}
            </span>
          </div>

          {/* Khung đại diện */}
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-rose-400" /> Khung đại diện:
            </span>
            <span className="font-semibold text-slate-200">
              {frameConfig.name} ({frameConfig.tag})
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {onStartGhostChallenge && (
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onStartGhostChallenge(player);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Ghost className="w-4 h-4 text-cyan-200 animate-pulse" />
              <span>Đua Cùng Kỷ Lục Gia (Khiêu Chiến Bóng Ma)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

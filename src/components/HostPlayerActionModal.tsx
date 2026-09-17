import React from 'react';
import { Player, HighScoreRecord } from '../types';
import { AvatarWithFrame } from '../utils/frames';
import { getPlayerTitle } from '../utils/titles';
import { soundFx } from '../utils/audio';
import { X, User, Crown, UserX, Bot, Shield, ChevronRight } from 'lucide-react';

interface HostPlayerActionModalProps {
  isOpen: boolean;
  player: Player | null;
  onClose: () => void;
  onViewProfile: (player: Player) => void;
  onTransferHost: (player: Player) => void;
  onKickPlayer: (player: Player) => void;
  highScores?: Record<string, HighScoreRecord | null>;
  isAdminUser?: boolean;
}

export const HostPlayerActionModal: React.FC<HostPlayerActionModalProps> = ({
  isOpen,
  player,
  onClose,
  onViewProfile,
  onTransferHost,
  onKickPlayer,
  highScores = {},
  isAdminUser = false,
}) => {
  if (!isOpen || !player) return null;

  const playerTitle = getPlayerTitle(player, highScores, isAdminUser, false);
  const isBot = !!player.isBot;

  return (
    <div
      id="host-player-action-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundFx.playKeyClick();
          onClose();
        }
      }}
    >
      <div
        id="host-player-action-modal-card"
        className="w-full max-w-sm bg-slate-900 border border-slate-700/90 rounded-3xl p-5 shadow-2xl space-y-4 relative animate-scaleUp text-left"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                QUẢN LÝ THÀNH VIÊN
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Tùy chọn dành cho Chủ phòng
              </div>
            </div>
          </div>
          <button
            id="btn-close-action-menu"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Player Info Box */}
        <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-center gap-3">
          <div className="relative shrink-0">
            <AvatarWithFrame
              icon={player.icon}
              frameId={player.frame || 'default'}
              size="md"
            />
            {isBot ? (
              <div
                className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-700 text-slate-300 shadow-sm"
                title="Bot máy tính"
              >
                <Bot className="w-3 h-3" />
              </div>
            ) : (
              <div
                className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-emerald-500 text-black shadow-sm"
                title="Người chơi thực"
              >
                <Shield className="w-3 h-3 fill-black" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-black text-white truncate max-w-[140px]">
                {player.username}
              </span>
              {playerTitle && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded border uppercase tracking-wider bg-amber-500/20 border-amber-400/60 text-amber-300">
                  {playerTitle.tag}
                </span>
              )}
              {isBot && (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700">
                  Bot
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {isBot
                ? `Mục tiêu tốc độ: ~${player.botTargetWpm || 60} WPM`
                : `Kỷ lục: ${player.bestWpm ? `${player.bestWpm} WPM` : 'Chưa có'}`}
            </div>
          </div>
        </div>

        {/* Action Buttons List */}
        <div className="space-y-2">
          {/* Action 1: Xem hồ sơ */}
          <button
            id="btn-action-view-profile"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onViewProfile(player);
            }}
            className="w-full group p-3 rounded-2xl bg-slate-800/70 hover:bg-cyan-950/40 border border-slate-700/60 hover:border-cyan-500/60 transition-all flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 group-hover:scale-105 transition-transform shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors">
                  Xem hồ sơ
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1">
                  Xem chi tiết thông số, danh hiệu & thành tích
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Action 2: Nhường chủ phòng */}
          <button
            id="btn-action-transfer-host"
            type="button"
            disabled={isBot}
            onClick={() => {
              if (isBot) return;
              soundFx.playKeyClick();
              onTransferHost(player);
            }}
            title={isBot ? 'Không thể nhường chủ phòng cho Bot' : 'Nhường vị trí chủ phòng'}
            className={`w-full group p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left ${
              isBot
                ? 'bg-slate-900/40 border-slate-800 opacity-45 cursor-not-allowed'
                : 'bg-slate-800/70 hover:bg-amber-950/40 border-slate-700/60 hover:border-amber-500/60 cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2 rounded-xl shrink-0 transition-transform ${
                  isBot
                    ? 'bg-slate-800 text-slate-500 border border-slate-700'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 group-hover:scale-105'
                }`}
              >
                <Crown className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div
                  className={`text-xs font-black transition-colors ${
                    isBot
                      ? 'text-slate-400'
                      : 'text-white group-hover:text-amber-300'
                  }`}
                >
                  Nhường chủ phòng
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1">
                  {isBot
                    ? 'Không thể nhường quyền cho Bot'
                    : 'Chuyển quyền chủ phòng và đưa người này lên Slot 1'}
                </div>
              </div>
            </div>
            {!isBot && (
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 shrink-0 transition-transform group-hover:translate-x-0.5" />
            )}
          </button>

          {/* Action 3: Đá khỏi phòng */}
          <button
            id="btn-action-kick-player"
            type="button"
            onClick={() => {
              soundFx.playError();
              onKickPlayer(player);
            }}
            className="w-full group p-3 rounded-2xl bg-slate-800/70 hover:bg-rose-950/40 border border-slate-700/60 hover:border-rose-500/60 transition-all flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 group-hover:scale-105 transition-transform shrink-0">
                <UserX className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-rose-300 group-hover:text-rose-200 transition-colors">
                  {isBot ? 'Xóa Bot này khỏi phòng' : 'Đá khỏi phòng'}
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1">
                  {isBot
                    ? 'Giải phóng slot này cho người chơi khác'
                    : 'Mời rời khỏi phòng và chuyển về sảnh chính'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Player, HighScoreRecord } from '../types';
import { getPlayerTitle } from '../utils/titles';
import { AvatarWithFrame, getFrameConfig } from '../utils/frames';
import { getAchievementById } from '../utils/achievements';
import { soundFx } from '../utils/audio';
import { X, Flame, Zap, Award, Crown, Bot, User, ShieldCheck } from 'lucide-react';
import { WpmRecordBadge } from './WpmRecordBadge';

interface PlayerSimpleProfileModalProps {
  isOpen: boolean;
  player: Player | null;
  isHost: boolean;
  isMe: boolean;
  highScores: Record<string, HighScoreRecord | null>;
  isAdminUser: boolean;
  onClose: () => void;
}

export const PlayerSimpleProfileModal: React.FC<PlayerSimpleProfileModalProps> = ({
  isOpen,
  player,
  isHost,
  isMe,
  highScores,
  isAdminUser,
  onClose,
}) => {
  if (!isOpen || !player) return null;

  const title = getPlayerTitle(player, highScores, isAdminUser, isMe);
  const effectiveFrame =
    player.frame && player.frame !== 'default'
      ? player.frame
      : title
      ? (title.type === 'admin' ? 'admin_gold' : title.id)
      : (player.frame || 'default');
  const frame = getFrameConfig(effectiveFrame);

  // Stats fallback
  const bestWpmDisplay = player.bestWpm
    ? `${player.bestWpm} WPM`
    : player.isBot && player.botTargetWpm
    ? `~${player.botTargetWpm} WPM`
    : isMe
    ? 'Chưa lập kỷ lục'
    : player.isBot
    ? '65 WPM'
    : '78 WPM';

  const totalGamesDisplay = player.totalGames !== undefined
    ? `${player.totalGames} trận`
    : player.isBot
    ? 'Hệ thống AI'
    : '12 trận';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundFx.playKeyClick();
          onClose();
        }
      }}
    >
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/90 rounded-3xl p-5 shadow-2xl space-y-4 relative animate-scaleUp text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <User className="w-4 h-4" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-300">
              HỒ SƠ NGƯỜI CHƠI
            </span>
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

        {/* Avatar & Player Info Section */}
        <div className="flex flex-col items-center justify-center text-center pt-2">
          {/* Large Avatar with Frame */}
          <div className="relative mb-3">
            <AvatarWithFrame
              icon={player.icon}
              frameId={effectiveFrame}
              size="xl"
              showBadge={!isHost}
            />
            {isHost && (
              <div
                className="absolute -top-2 -right-2 p-1 rounded-full bg-amber-400 text-black shadow-lg z-30 flex items-center justify-center"
                title="Chủ phòng"
              >
                <Crown className="w-3.5 h-3.5 fill-black" />
              </div>
            )}
            {player.isBot && (
              <div
                className="absolute -bottom-2 -right-2 p-1 rounded-full bg-sky-500 text-white shadow-lg z-30 flex items-center justify-center"
                title="AI Bot"
              >
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          {/* Username & Tags */}
          <div className="flex items-center gap-1.5 justify-center flex-wrap">
            <h3 className="text-lg font-black text-white">{player.username}</h3>
            {isMe && (
              <span className="text-[10px] bg-amber-400 text-black font-extrabold px-1.5 py-0.5 rounded">
                Bạn
              </span>
            )}
            {player.isBot && (
              <span className="text-[10px] bg-sky-500/20 text-sky-300 font-bold px-1.5 py-0.5 rounded border border-sky-500/30">
                AI BOT
              </span>
            )}
          </div>

          {/* Role badge */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            {isHost ? (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Crown className="w-3 h-3" /> Chủ phòng đấu
              </span>
            ) : player.isBot ? (
              <span className="text-sky-400 font-semibold flex items-center gap-1">
                <Bot className="w-3 h-3" /> Bot Luyện Tập Tự Động
              </span>
            ) : (
              <span className="text-slate-300 font-medium">Tuyển Thủ Tham Gia</span>
            )}
            <span>•</span>
            <span className="text-slate-400 font-mono text-[11px]">
              {frame.name}
            </span>
          </div>

          {/* Title Badge if any */}
          {title && (
            <div className="mt-2.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center gap-1.5 text-xs font-black shadow-sm">
              <span>{title.badge}</span>
              <span>{title.name}</span>
            </div>
          )}
        </div>

        {/* 2 Main Stats Cards: Kỷ Lục WPM & Trận Đã Đấu */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Kỷ lục */}
          <WpmRecordBadge
            bestWpm={player.bestWpm}
            bestWpmDisplay={bestWpmDisplay}
            bestWpmRecord={player.bestWpmRecord}
            highScores={highScores}
            username={player.username}
            isBot={player.isBot}
            isMe={isMe}
            size="normal"
            tooltipPosition="top"
          />

          {/* Trận đã đấu */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
              <Zap className="w-3.5 h-3.5 text-sky-400" /> Trận Đã Đấu
            </div>
            <div className="text-xl font-black text-sky-400 font-mono mt-0.5">
              {totalGamesDisplay}
            </div>
          </div>
        </div>

        {/* Additional details */}
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Trạng thái:
            </span>
            <span className="font-semibold text-emerald-400">Sẵn sàng thi đấu</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-purple-400" /> Khung đại diện:
            </span>
            <span className="font-semibold text-slate-200">{frame.name} ({frame.tag})</span>
          </div>
        </div>

        {/* Thành Tựu Tiên Hiệp Trưng Bày (Tối đa 3 - Chỉ người chơi đã đăng nhập) */}
        {player.isLoggedIn && !player.isBot && player.showcaseAchievements && player.showcaseAchievements.length > 0 && (
          <div className="p-3 rounded-2xl bg-slate-950/90 border border-purple-500/30 space-y-2">
            <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>✨</span> Thành Tựu Tiên Hiệp
              </span>
              <span className="text-[9px] font-mono text-slate-400 font-normal">
                {player.showcaseAchievements.length}/3 Đang Trưng Bày
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {player.showcaseAchievements.slice(0, 3).map((achId) => {
                const ach = getAchievementById(achId);
                if (!ach) return null;
                return (
                  <div
                    key={achId}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center ${ach.badgeBg} ${ach.borderClass} shadow-sm transition-transform hover:scale-105`}
                    title={`${ach.name}: ${ach.req} (${ach.realm})`}
                  >
                    <span className="text-base">{ach.icon}</span>
                    <span className="text-[10px] font-black leading-tight truncate max-w-full mt-1">
                      {ach.title}
                    </span>
                    <span className="text-[8px] text-amber-300 font-mono leading-none mt-0.5 truncate max-w-full">
                      {ach.realm}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            onClose();
          }}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          Đóng
        </button>
      </div>
    </div>
  );
};

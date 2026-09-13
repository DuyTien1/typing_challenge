import React from 'react';
import { Volume2, VolumeX, Trophy, MessageSquare, Shield, Users, Flame } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface HeaderProps {
  username: string;
  avatar: string;
  onlineCount: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenLeaderboard: () => void;
  onToggleChat: () => void;
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
  onGoHome?: () => void;
  chatUnreadCount?: number;
  activeModeName: string;
}

export const Header: React.FC<HeaderProps> = ({
  username,
  avatar,
  onlineCount,
  isMuted,
  onToggleMute,
  onOpenLeaderboard,
  onToggleChat,
  onOpenAdmin,
  onOpenProfile,
  onGoHome,
  chatUnreadCount = 0,
  activeModeName,
}) => {
  return (
    <header className="w-full border-b border-slate-800/80 bg-[#121620]/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Branding - Click to return to Home/Lobby */}
        <div
          id="header-brand-logo"
          role="button"
          tabIndex={0}
          title="Trở về Trang chủ FastTyping"
          className="flex items-center gap-3 cursor-pointer select-none transition-all duration-150 active:scale-95 group"
          onClick={() => {
            soundFx.playKeyClick();
            if (onGoHome) onGoHome();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (onGoHome) onGoHome();
            }
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5 group-hover:text-amber-300 transition-colors">
                FastTyping
                <span className="text-amber-400 font-black">Challenge</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Đấu trường gõ phím Tiếng Việt thời gian thực
            </p>
          </div>
        </div>

        {/* Current Active Mode Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs font-medium text-slate-300">
          <span className="text-amber-400 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Chế độ:
          </span>
          <span className="text-white font-semibold">{activeModeName}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Online Counter */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <Users className="w-3.5 h-3.5" />
            <span>{onlineCount} Online</span>
          </div>

          {/* Sound Toggle */}
          <button
            id="btn-toggle-sound"
            type="button"
            onClick={() => {
              onToggleMute();
              soundFx.playKeyClick();
            }}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Leaderboard Button */}
          <button
            id="btn-open-leaderboard"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onOpenLeaderboard();
            }}
            title="Bảng Vàng Kỷ Lục"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 text-amber-400 hover:text-amber-300 text-xs font-medium transition-colors"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Bảng Vàng</span>
          </button>

          {/* Chat Button */}
          <button
            id="btn-toggle-chat"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onToggleChat();
            }}
            title="Kênh Chat"
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Chat</span>
            {chatUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
              </span>
            )}
          </button>

          {/* User Profile Pill */}
          <button
            id="btn-user-profile"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onOpenProfile();
            }}
            className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/70 transition-all hover:scale-102"
          >
            <span className="text-lg">{avatar}</span>
            <span className="text-xs font-semibold text-slate-200 max-w-[100px] truncate">
              {username || 'Vô danh'}
            </span>
          </button>

          {/* Admin Panel Button */}
          <button
            id="btn-open-admin"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onOpenAdmin();
            }}
            title="Bảng Quản Trị Admin"
            className="p-2 rounded-lg bg-slate-800/40 hover:bg-slate-700/60 text-slate-400 hover:text-amber-400 transition-colors"
          >
            <Shield className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

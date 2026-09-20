import React, { useState, useRef, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Trophy, 
  MessageSquare, 
  Shield, 
  Settings, 
  Sparkles,
  ChevronDown,
  User,
  Palette,
  Users
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface HeaderProps {
  username: string;
  avatar: string;
  onlineCount: number;
  isMuted: boolean;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  onToggleMute: () => void;
  onOpenLeaderboard: () => void;
  onToggleChat: () => void;
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
  onOpenAppearance?: () => void;
  onOpenCultivation?: () => void;
  cultivationLevel?: number;
  cultivationRealmName?: string;
  cultivationTier?: number;
  cultivationSubStage?: string;
  cultivationIcon?: string;
  cultivationThoNguyen?: number;
  cultivationMaxThoNguyen?: number;
  onOpenOnlineUsers?: () => void;
  onOpenAuthModal?: () => void;
  onGoHome?: () => void;
  chatUnreadCount?: number;
  activeModeName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  username,
  avatar,
  onlineCount,
  isMuted,
  isAdmin = false,
  isLoggedIn = false,
  onToggleMute,
  onOpenLeaderboard,
  onToggleChat,
  onOpenAdmin,
  onOpenProfile,
  onOpenAppearance,
  onOpenCultivation,
  cultivationRealmName,
  cultivationTier,
  cultivationSubStage,
  cultivationIcon,
  cultivationThoNguyen,
  cultivationMaxThoNguyen,
  onOpenOnlineUsers,
  onGoHome,
  chatUnreadCount = 0,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  return (
    <header className="w-full border-b border-slate-800/80 bg-[#121620]/90 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo & Branding - Click to return to Home/Lobby */}
        <div
          id="header-brand-logo"
          role="button"
          tabIndex={0}
          title="Trở về Trang chủ FastTyping"
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none transition-all duration-150 active:scale-95 group shrink-0 min-w-0"
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
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-base sm:text-lg shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm sm:text-lg tracking-tight text-white flex items-center gap-1 group-hover:text-amber-300 transition-colors whitespace-nowrap">
              FastTyping
              <span className="text-amber-400 font-black">Challenge</span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden xl:block truncate">
              Đấu trường gõ phím Tiếng Việt thời gian thực
            </p>
          </div>
        </div>

        {/* Streamlined Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Online Counter - Interactive button for Admin to view detailed online players, status badge for regular players */}
          {isAdmin && onOpenOnlineUsers ? (
            <button
              id="btn-online-count"
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onOpenOnlineUsers();
              }}
              title="Người chơi đang trực tuyến - Bấm để xem chi tiết danh sách người chơi (Admin)"
              className="h-8.5 flex items-center gap-1.5 px-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/50 hover:border-emerald-400 text-xs text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer select-none shrink-0 group shadow-sm active:scale-95 ring-1 ring-emerald-500/20"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse group-hover:scale-125 transition-transform" />
              <span className="font-bold text-slate-100 group-hover:text-white">{onlineCount}</span>
              <span className="hidden xs:inline text-[10px] text-emerald-400/90 font-medium">Online</span>
              <Users className="w-3.5 h-3.5 text-emerald-400/80 group-hover:text-emerald-300 ml-0.5" />
            </button>
          ) : (
            <div
              id="badge-online-count"
              title="Người chơi đang trực tuyến"
              className="h-8.5 hidden md:flex items-center gap-1.5 px-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs text-emerald-400 cursor-default select-none shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium text-slate-300">{onlineCount}</span>
              <span className="hidden sm:inline text-[10px] text-emerald-400/80">Online</span>
            </div>
          )}

          {/* Sound Toggle (Fast Access) */}
          <button
            id="btn-toggle-sound"
            type="button"
            onClick={() => {
              onToggleMute();
              soundFx.playKeyClick();
            }}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="h-8.5 w-8.5 flex items-center justify-center rounded-xl bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
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
            className="h-8.5 px-2.5 relative flex items-center justify-center gap-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
          >
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <span className="hidden md:inline whitespace-nowrap">Chat</span>
            {chatUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
              </span>
            )}
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
            className="hidden sm:flex h-8.5 px-2.5 items-center justify-center gap-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/50 text-amber-400 hover:text-amber-300 text-xs font-medium transition-colors cursor-pointer shrink-0"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden lg:inline whitespace-nowrap">Bảng Vàng</span>
          </button>

          {/* Eye-catching More Menu / Control Hub */}
          <div className="relative" ref={moreMenuRef}>
            <button
              id="btn-header-more-menu"
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setIsMoreMenuOpen(!isMoreMenuOpen);
              }}
              title="Cài Đặt & Menu (Hồ sơ, Giao diện, Tu tiên, Admin)"
              className={`h-8.5 px-2.5 sm:px-3 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 shadow-sm active:scale-95 ${
                isMoreMenuOpen
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 border border-amber-300 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/40'
                  : 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:to-slate-800 text-amber-400 hover:text-amber-300 border border-amber-500/40 hover:border-amber-400 shadow-amber-500/10'
              }`}
            >
              <Settings className={`w-4 h-4 text-amber-400 transition-transform duration-300 ${isMoreMenuOpen ? 'rotate-90 text-slate-950' : 'group-hover:rotate-45'}`} />
              <span className="text-xs font-bold tracking-tight max-w-[80px] sm:max-w-[110px] truncate">
                {username || (isLoggedIn ? 'Thành viên' : 'Khách')}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180 text-slate-950' : 'text-amber-400'}`} />
            </button>

            {/* Dropdown Menu Box */}
            {isMoreMenuOpen && (
              <div className={`absolute right-0 mt-2 w-64 rounded-2xl bg-slate-950/95 shadow-2xl shadow-black/90 backdrop-blur-xl p-2 z-50 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-800/80 ${
                isAdmin 
                  ? 'border-2 border-amber-500/60 shadow-amber-500/20' 
                  : 'border border-slate-700/90'
              }`}>
                {/* Header User Identity Preview in Dropdown */}
                <div className={`pb-2.5 px-2 py-1.5 rounded-xl flex items-center justify-between gap-2 ${
                  isAdmin ? 'border border-amber-500/40 bg-amber-500/10' : ''
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl p-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                      {avatar}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs truncate flex items-center gap-1">
                        <span>{username || (isLoggedIn ? 'Thành viên' : 'Khách')}</span>
                        {isAdmin && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {isAdmin ? 'Quản trị viên hệ thống' : (isLoggedIn ? 'Tài khoản chính thức' : 'Chế độ khách tạm thời')}
                      </div>
                    </div>
                  </div>
                  {isLoggedIn ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Online" />
                  ) : (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      Khách
                    </span>
                  )}
                </div>

                {/* Primary Action Tabs: 1. Hồ Sơ Cá Nhân & 2. Tùy Chỉnh Giao Diện */}
                <div className="py-1.5 space-y-1">
                  {/* Mục 1: Hồ Sơ Cá Nhân */}
                  <button
                    id="menu-item-profile"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setIsMoreMenuOpen(false);
                      onOpenProfile();
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 text-left text-slate-200 hover:text-white transition-all cursor-pointer group ${
                      isAdmin 
                        ? 'border border-amber-500/40 hover:border-amber-400/80 bg-slate-900/40 shadow-xs' 
                        : 'border border-transparent hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white">Hồ Sơ Cá Nhân</div>
                        <div className="text-[10px] text-slate-400">Tên, Avatar, Khung đại diện & Kỷ lục</div>
                      </div>
                    </div>
                  </button>

                  {/* Mục 2: Tùy Chỉnh Giao Diện */}
                  <button
                    id="menu-item-appearance"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setIsMoreMenuOpen(false);
                      if (onOpenAppearance) {
                        onOpenAppearance();
                      }
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 text-left text-slate-200 hover:text-white transition-all cursor-pointer group ${
                      isAdmin 
                        ? 'border border-amber-500/40 hover:border-amber-400/80 bg-slate-900/40 shadow-xs' 
                        : 'border border-transparent hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Palette className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white">Tùy Chỉnh Giao Diện</div>
                        <div className="text-[10px] text-slate-400">20 Themes Monkeytype, 20 Fonts & Switch phím</div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Secondary Actions: Linh Đài & Bảng Vàng */}
                <div className="py-1.5 space-y-1">
                  {/* Cultivation / Linh Đài Tu Tiên */}
                  {onOpenCultivation && (
                    <button
                      id="menu-item-cultivation"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setIsMoreMenuOpen(false);
                        onOpenCultivation();
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 text-left text-amber-300 hover:text-amber-200 transition-all cursor-pointer group ${
                        isAdmin 
                          ? 'border border-amber-500/40 hover:border-amber-400/80 bg-slate-900/40 shadow-xs' 
                          : 'border border-transparent hover:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm shrink-0 group-hover:scale-105 transition-transform">
                          {cultivationIcon || '🌿'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-amber-300">
                            Linh Đài Tu Tiên
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {cultivationRealmName || 'Luyện Khí'} T.{cultivationTier || 1} • {cultivationSubStage || 'Sơ Kỳ'}
                          </div>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Leaderboard for small screens */}
                  <button
                    onClick={() => {
                      soundFx.playKeyClick();
                      setIsMoreMenuOpen(false);
                      onOpenLeaderboard();
                    }}
                    className={`w-full sm:hidden flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 text-left text-amber-300 transition-all cursor-pointer ${
                      isAdmin 
                        ? 'border border-amber-500/40 hover:border-amber-400/80 bg-slate-900/40' 
                        : 'border border-transparent hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="font-semibold text-xs">Bảng Vàng Kỷ Lục</span>
                    </div>
                  </button>
                </div>

                {/* Admin Section: Always in Dropdown for Admins */}
                {isAdmin && (
                  <div className="pt-1.5 space-y-1">
                    <button
                      id="menu-item-admin"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setIsMoreMenuOpen(false);
                        onOpenAdmin();
                      }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-left text-amber-300 font-semibold transition-all cursor-pointer border border-amber-500/50 hover:border-amber-400 shadow-sm shadow-amber-500/10"
                    >
                      <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-amber-300">Bảng Cài Đặt Admin</div>
                        <div className="text-[10px] text-amber-400/70 font-normal">Quản trị hệ thống, điểm số & thiết lập</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};



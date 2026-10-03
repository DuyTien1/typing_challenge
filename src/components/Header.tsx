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
  ChevronRight,
  User,
  Palette,
  Users,
  LogIn,
  LogOut,
  Lock,
  History,
  Check,
  Database
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { DatabaseHealthModal } from './DatabaseHealthModal';
import { 
  UI_STYLES, 
  UIStyleId, 
  applyUIStyle 
} from '../utils/themeAndFont';

// Safe resolver for stored UI style across all build environments
const getInitialHeaderUIStyle = (): UIStyleId => {
  if (typeof window === 'undefined') return 'xianxia';
  try {
    const saved = localStorage.getItem('fasttyping_ui_style');
    if (saved && UI_STYLES.some((s) => s.id === saved)) {
      return saved as UIStyleId;
    }
    const savedTheme = localStorage.getItem('fasttyping_theme');
    if (savedTheme) {
      if (savedTheme === 'cyberpunk') return 'cyberpunk';
      if (savedTheme === 'retro' || savedTheme === 'classic') return 'classic';
      if (savedTheme === 'crimson' || savedTheme === 'abyss') return 'abyss';
      if (savedTheme === 'paper_white' || savedTheme === 'minimal_mono' || savedTheme === 'minimal') return 'minimal';
    }
  } catch {}
  return 'xianxia';
};

interface HeaderProps {
  username: string;
  avatar: string;
  onlineCount: number;
  isMuted: boolean;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  onToggleMute: () => void;
  onOpenLeaderboard: () => void;
  onOpenMatchHistory?: () => void;
  onToggleChat: () => void;
  onOpenFriends?: () => void;
  friendRequestsCount?: number;
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
  onLogout?: () => void;
  onGoHome?: () => void;
  chatUnreadCount?: number;
  activeModeName?: string;
  onOpenHeavenlyChronicle?: () => void;
  isBanned?: boolean;
  bannedRemainingFormatted?: string;
  onOpenBanModal?: () => void;
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
  onOpenMatchHistory,
  onToggleChat,
  onOpenFriends,
  friendRequestsCount = 0,
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
  onOpenAuthModal,
  onLogout,
  onGoHome,
  chatUnreadCount = 0,
  activeModeName,
  onOpenHeavenlyChronicle,
  isBanned = false,
  bannedRemainingFormatted,
  onOpenBanModal,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [currentUIStyleId, setCurrentUIStyleId] = useState<UIStyleId>(() => getInitialHeaderUIStyle());
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const styleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleStyleChange = (e: any) => {
      if (e.detail?.id) setCurrentUIStyleId(e.detail.id);
    };
    window.addEventListener('ui_style_changed', handleStyleChange);
    return () => window.removeEventListener('ui_style_changed', handleStyleChange);
  }, []);

  useEffect(() => {
    const handleClickOutsideStyle = (e: MouseEvent) => {
      if (styleDropdownRef.current && !styleDropdownRef.current.contains(e.target as Node)) {
        setIsStyleDropdownOpen(false);
      }
    };
    if (isStyleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutsideStyle);
    }
    return () => document.removeEventListener('mousedown', handleClickOutsideStyle);
  }, [isStyleDropdownOpen]);

  const currentStyle = UI_STYLES.find((s) => s.id === currentUIStyleId) || UI_STYLES[0];

  // Close dropdown menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isMoreMenuOpen]);

  return (
    <>
      <header className="w-full border-b border-[var(--theme-border,#1e293b)] bg-[var(--theme-card,#131926)]/90 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-4 py-2 transition-colors duration-300">
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
            title="Kênh Chat & Mật Đàm (Phím tắt: Ctrl + Enter)"
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

          {/* Đạo Hữu (Friends Roster & Dao Lu) Button */}
          {onOpenFriends && (
            <button
              id="btn-open-friends"
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onOpenFriends();
              }}
              title="Sổ Tay Đạo Hữu & Kết Bái Đạo Lữ"
              className="h-8.5 px-2.5 relative flex items-center justify-center gap-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/50 text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              <Users className="w-4 h-4" />
              <span className="hidden lg:inline whitespace-nowrap">Đạo Hữu</span>
              {friendRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce shadow-md">
                  {friendRequestsCount > 9 ? '9+' : friendRequestsCount}
                </span>
              )}
            </button>
          )}

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

          {/* Huyền Thiên Khí Linh / Thiên Đạo Chiếu Thư Button */}
          {onOpenHeavenlyChronicle && (
            <button
              id="btn-header-dao-chronicle"
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onOpenHeavenlyChronicle();
              }}
              title="Huyền Thiên Khí Linh - Thiên Đạo Chấp Pháp Sứ (Chiếu thư, kỷ lục & xử phạt)"
              className="hidden md:flex h-8.5 px-2.5 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-950/80 to-amber-950/80 hover:from-purple-900/90 hover:to-amber-900/90 border border-amber-400/50 hover:border-amber-300 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm active:scale-95 group"
            >
              <span className="text-sm group-hover:rotate-180 transition-transform duration-500">☯️</span>
              <span className="hidden xl:inline whitespace-nowrap">Khí Linh</span>
            </button>
          )}

          {/* Bàn Cổ Thần Thức - Warning Banner Button if Banned */}
          {isBanned && (
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                if (onOpenBanModal) onOpenBanModal();
              }}
              title="Đang chịu án phạt cấm đấu từ Bàn Cổ Thần Thức. Bấm để xem chi tiết thời gian thụ án"
              className="h-8.5 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-950 via-rose-950 to-red-900 border border-red-500 text-red-300 font-bold text-xs shadow-md shadow-red-950/60 cursor-pointer animate-pulse active:scale-95 shrink-0"
            >
              <span className="text-sm animate-bounce">⚡</span>
              <span className="hidden sm:inline font-black text-rose-300">Bàn Cổ Phạt:</span>
              <span className="font-mono text-amber-300 font-black">
                {bannedRemainingFormatted || '2h'}
              </span>
            </button>
          )}

          {/* Quick UI Style Switcher Button */}
          <div className="relative" ref={styleDropdownRef}>
            <button
              id="btn-switch-ui-style"
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setIsStyleDropdownOpen(!isStyleDropdownOpen);
              }}
              title={`Đổi Phong Cách Giao Diện (Hiện tại: ${currentStyle.name})`}
              className="h-8.5 px-2 sm:px-2.5 flex items-center gap-1.5 rounded-xl border border-slate-700/60 hover:border-amber-400/60 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
            >
              <span className="text-sm leading-none shrink-0">{currentStyle.icon}</span>
              <span className="text-xs font-bold hidden md:inline max-w-[100px] truncate text-amber-300">
                {currentStyle.tag}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isStyleDropdownOpen ? 'rotate-180 text-amber-400' : ''}`} />
            </button>

            {/* Dropdown Menu of 5 Distinct Styles */}
            {isStyleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-slate-700/90 shadow-2xl p-2 z-50 text-xs text-slate-200 space-y-1.5 ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-extrabold text-[11px] uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> 5 Phong Cách Giao Diện
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">1 Click đổi ngay</span>
                </div>

                <div className="space-y-1 pt-0.5">
                  {UI_STYLES.map((style) => {
                    const isSelected = style.id === currentUIStyleId;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          applyUIStyle(style.id);
                          soundFx.playKeyClick();
                          setIsStyleDropdownOpen(false);
                        }}
                        className={`w-full p-2 rounded-xl text-left flex items-center justify-between gap-2 transition-all cursor-pointer group ${
                          isSelected
                            ? 'bg-amber-500/20 border border-amber-400/80 text-amber-300 shadow-sm'
                            : 'hover:bg-slate-900 border border-transparent text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg p-1 rounded-lg bg-slate-900 border border-slate-800 shrink-0 group-hover:scale-110 transition-transform">
                            {style.icon}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-xs flex items-center gap-1.5 truncate">
                              <span>{style.name}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 border border-slate-700 font-normal opacity-80">
                                {style.tag}
                              </span>
                            </div>
                            <div className="text-[10px] opacity-70 truncate font-mono">
                              {style.switchName} • {style.fontName}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {onOpenAppearance && (
                  <div className="pt-1.5 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setIsStyleDropdownOpen(false);
                        onOpenAppearance();
                      }}
                      className="w-full py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-amber-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Palette className="w-3.5 h-3.5 text-amber-400" />
                      <span>Xem Chi Tiết & Tùy Chỉnh Nâng Cao</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

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
              <div className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-950/95 shadow-2xl shadow-black/90 backdrop-blur-xl p-2.5 z-50 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-2.5 ${
                isAdmin 
                  ? 'border border-amber-500/60 shadow-amber-500/15 ring-1 ring-amber-500/30' 
                  : 'border border-slate-700/80 shadow-black/80'
              }`}>
                {/* Header User Identity Card */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors ${
                  isAdmin 
                    ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-slate-900/60 to-slate-900/60' 
                    : 'border-slate-800/90 bg-slate-900/60'
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0 shadow-inner">
                      {avatar}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                        <span className="truncate">{username || (isLoggedIn ? 'Thành viên' : 'Khách')}</span>
                        {isAdmin && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold shrink-0">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {isAdmin ? 'Quản trị viên hệ thống' : (isLoggedIn ? 'Tài khoản chính thức' : 'Chế độ khách tạm thời')}
                      </div>
                    </div>
                  </div>
                  {isLoggedIn ? (
                    <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-semibold text-emerald-400">Online</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                      Khách
                    </span>
                  )}
                </div>

                {/* Section 1: Cá Nhân & Giao Diện */}
                <div className="space-y-1">
                  <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span>Cá Nhân & Giao Diện</span>
                  </div>

                  {/* Mục 1: Hồ Sơ Cá Nhân */}
                  <button
                    id="menu-item-profile"
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setIsMoreMenuOpen(false);
                      onOpenProfile();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-800/90 hover:border-sky-500/50 bg-slate-900/50 hover:bg-slate-900 text-left text-slate-200 hover:text-white transition-all duration-150 cursor-pointer group shadow-xs active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white">Hồ Sơ Cá Nhân</div>
                        <div className="text-[10px] text-slate-400 truncate">Tên, Avatar, Khung đại diện & Kỷ lục</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                  </button>

                  {/* Mục 2: Tùy Chỉnh Giao Diện */}
                  <button
                    id="menu-item-appearance"
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setIsMoreMenuOpen(false);
                      if (onOpenAppearance) {
                        onOpenAppearance();
                      }
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-800/90 hover:border-amber-500/50 bg-slate-900/50 hover:bg-slate-900 text-left text-slate-200 hover:text-white transition-all duration-150 cursor-pointer group shadow-xs active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Palette className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white">Phong Cách & Giao Diện</div>
                        <div className="text-[10px] text-slate-400 truncate">5 Phong Cách Độc Bản, Font Chữ & Âm Phím</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                  </button>

                  {/* Mục 3: Lịch Sử Đấu */}
                  {onOpenMatchHistory && (
                    <button
                      id="menu-item-match-history"
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setIsMoreMenuOpen(false);
                        onOpenMatchHistory();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-800/90 hover:border-emerald-500/50 bg-slate-900/50 hover:bg-slate-900 text-left text-slate-200 hover:text-white transition-all duration-150 cursor-pointer group shadow-xs active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <History className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-white">Lịch Sử Đấu</div>
                          <div className="text-[10px] text-slate-400 truncate">Replay, phân tích lỗi sai & lời khuyên</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                    </button>
                  )}

                  {/* Mục 4: Sổ Tay Đạo Hữu */}
                  {onOpenFriends && (
                    <button
                      id="menu-item-friends"
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setIsMoreMenuOpen(false);
                        onOpenFriends();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-800/90 hover:border-teal-500/50 bg-slate-900/50 hover:bg-slate-900 text-left text-slate-200 hover:text-white transition-all duration-150 cursor-pointer group shadow-xs active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-white flex items-center gap-1.5">
                            <span>Sổ Tay Đạo Hữu</span>
                            {friendRequestsCount > 0 && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono font-bold">
                                {friendRequestsCount} mới
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">Danh sách bạn bè, Hảo Cảm & Đạo Lữ</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                    </button>
                  )}
                </div>

                {/* Section 2: Tu Tiên & Tính Năng */}
                <div className="space-y-1">
                  <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span>Tu Tiên & Tính Năng</span>
                  </div>

                  {/* Huyền Thiên Khí Linh */}
                  {onOpenHeavenlyChronicle && (
                    <button
                      id="menu-item-dao-chronicle"
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setIsMoreMenuOpen(false);
                        onOpenHeavenlyChronicle();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl border border-purple-500/40 hover:border-purple-400/80 bg-purple-950/25 hover:bg-purple-950/45 text-left text-slate-200 hover:text-white transition-all duration-150 cursor-pointer group shadow-xs active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center text-sm shrink-0 group-hover:scale-110 transition-transform">
                          ☯️
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-purple-300 group-hover:text-purple-200">
                            Huyền Thiên Khí Linh
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Thiên Đạo Chấp Pháp Sứ & Chiếu Thư
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-purple-400/60 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                    </button>
                  )}

                  {/* Cultivation / Linh Đài Tu Tiên */}
                  {onOpenCultivation && (
                    <button
                      id="menu-item-cultivation"
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setIsMoreMenuOpen(false);
                        if (!isLoggedIn) {
                          if (onOpenAuthModal) onOpenAuthModal();
                          return;
                        }
                        onOpenCultivation();
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all duration-150 cursor-pointer group shadow-xs active:scale-[0.99] text-left ${
                        !isLoggedIn
                          ? 'border-amber-500/30 hover:border-amber-400/70 bg-amber-500/5 hover:bg-amber-500/15 text-slate-300 hover:text-white'
                          : 'border-emerald-500/40 hover:border-emerald-400/80 bg-emerald-950/20 hover:bg-emerald-950/40 text-slate-200 hover:text-white'
                      }`}
                      title={!isLoggedIn ? 'Khóa ở chế độ Khách - Đăng nhập để mở khóa' : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 group-hover:scale-105 transition-transform ${
                          !isLoggedIn 
                            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' 
                            : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                        }`}>
                          {!isLoggedIn ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : (cultivationIcon || '🌿')}
                        </div>
                        <div className="min-w-0">
                          <div className={`font-bold text-xs ${!isLoggedIn ? 'text-slate-300' : 'text-emerald-300 group-hover:text-emerald-200'}`}>
                            Linh Đài Tu Tiên
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {!isLoggedIn 
                              ? 'Khóa ở chế độ Khách (Đăng nhập để vào)'
                              : `${cultivationRealmName || 'Luyện Khí'} T.${cultivationTier || 1} • ${cultivationSubStage || 'Sơ Kỳ'}`}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-all shrink-0 ml-1.5 ${
                        !isLoggedIn ? 'text-amber-500/60 group-hover:text-amber-400' : 'text-emerald-400/60 group-hover:text-emerald-300'
                      } group-hover:translate-x-0.5`} />
                    </button>
                  )}

                  {/* Leaderboard for small screens */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setIsMoreMenuOpen(false);
                      onOpenLeaderboard();
                    }}
                    className="w-full sm:hidden flex items-center justify-between p-2 rounded-xl border border-slate-800/90 hover:border-amber-500/50 bg-slate-900/50 hover:bg-slate-900 text-left text-slate-200 hover:text-white transition-all duration-150 cursor-pointer group shadow-xs active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white">Bảng Vàng Kỷ Lục</div>
                        <div className="text-[10px] text-slate-400 truncate">Xếp hạng tốc độ WPM & vinh danh</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                  </button>
                </div>

                {/* Section 3: Quản Trị Hệ Thống (Nếu là Admin) */}
                {isAdmin && (
                  <div className="space-y-1">
                    <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-amber-500/80 flex items-center justify-between">
                      <span>Quản Trị Hệ Thống</span>
                    </div>

                    <button
                      id="menu-item-admin"
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setIsMoreMenuOpen(false);
                        onOpenAdmin();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl border border-amber-500/50 hover:border-amber-400/90 bg-amber-500/15 hover:bg-amber-500/25 text-left text-amber-300 hover:text-amber-200 transition-all duration-150 cursor-pointer group shadow-xs shadow-amber-500/10 active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/25 border border-amber-500/50 text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-amber-300">Bảng Cài Đặt Admin</div>
                          <div className="text-[10px] text-amber-400/70 truncate">Quản trị hệ thống, điểm số & thiết lập</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400/70 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                    </button>
                  </div>
                )}

                {/* Section: Kiểm Tra CSDL Supabase */}
                <div className="space-y-1">
                  <button
                    id="menu-item-db-health"
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setIsMoreMenuOpen(false);
                      setIsDbModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl border border-emerald-500/30 hover:border-emerald-400/80 bg-emerald-500/10 hover:bg-emerald-500/20 text-left text-emerald-300 hover:text-emerald-200 transition-all duration-150 cursor-pointer group shadow-xs active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Database className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                          <span>Trạng Thái CSDL Supabase</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <div className="text-[10px] text-emerald-400/70 truncate">Kiểm tra kết nối DATABASE_URL</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-400/70 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                  </button>
                </div>

                {/* Section 4: Tài Khoản (Đăng Nhập / Đăng Xuất) */}
                <div className="pt-1.5 border-t border-slate-800/80">
                  {isLoggedIn ? (
                    <button
                      id="menu-item-logout"
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setIsMoreMenuOpen(false);
                        if (onLogout) onLogout();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl border border-rose-500/40 hover:border-rose-400/80 bg-rose-500/15 hover:bg-rose-500/25 text-left text-rose-300 hover:text-rose-200 transition-all duration-150 cursor-pointer group shadow-xs active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <LogOut className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-rose-300">Đăng Xuất Tài Khoản</div>
                          <div className="text-[10px] text-rose-400/70 truncate">Xóa phiên làm việc, chuyển về khách</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-rose-400/70 group-hover:text-rose-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                    </button>
                  ) : (
                    <button
                      id="menu-item-login"
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setIsMoreMenuOpen(false);
                        if (onOpenAuthModal) onOpenAuthModal();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl border border-amber-500/40 hover:border-amber-400/80 bg-amber-500/15 hover:bg-amber-500/25 text-left text-amber-300 hover:text-amber-200 transition-all duration-150 cursor-pointer group shadow-xs active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <LogIn className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-amber-300">Đăng Nhập / Đăng Ký</div>
                          <div className="text-[10px] text-amber-400/70 truncate">Lưu kỷ lục, đổi tên & khung avatar</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400/70 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

    {/* Database Health Diagnostic Modal */}
    <DatabaseHealthModal
      isOpen={isDbModalOpen}
      onClose={() => setIsDbModalOpen(false)}
    />
  </>
  );
};



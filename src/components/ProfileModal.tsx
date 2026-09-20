import React, { useState } from 'react';
import { soundFx } from '../utils/audio';
import { 
  User, 
  X, 
  Check, 
  Flame, 
  Zap, 
  Sparkles, 
  ChevronDown,
  Edit3,
  Award,
  Lock,
  History,
  Trophy,
  Flag,
  Target
} from 'lucide-react';
import { 
  EXPANDED_AVATARS, 
} from '../utils/themeAndFont';
import { 
  AvatarWithFrame, 
  AVATAR_FRAMES, 
  getFrameConfig, 
  getStoredFrame, 
  setStoredFrame,
  isFrameOwned,
  checkIsAdmin
} from '../utils/frames';
import { MatchRecord, getStoredMatchHistory } from '../utils/matchHistory';
import { HighScoreRecord, UserAccount, BestWpmRecord } from '../types';
import { updateUserProfile } from '../utils/auth';
import { AchievementsSection } from './AchievementsSection';
import { getShowcaseAchievements, getAchievementById, setShowcaseAchievements } from '../utils/achievements';
import { WpmRecordBadge } from './WpmRecordBadge';

interface ProfileModalProps {
  username: string;
  avatar: string;
  frame?: string;
  showcaseAchievements?: string[];
  bestWpm: number;
  bestWpmRecord?: BestWpmRecord | null;
  totalGames: number;
  isAdmin?: boolean;
  highScores?: Record<string, HighScoreRecord | null>;
  matchHistory?: MatchRecord[];
  isLoggedIn?: boolean;
  currentUser?: UserAccount | null;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
  onChangeUsername: (name: string) => void;
  onChangeAvatar: (emoji: string) => void;
  onChangeFrame?: (frameId: string) => void;
  onUpdateShowcaseAchievements?: (newShowcase: string[]) => void;
  onClose: () => void;
  initialTab?: 'profile' | 'achievements';
}

function formatRelativeTime(ts: number): string {
  if (!ts) return '';
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  username,
  avatar,
  frame,
  showcaseAchievements: propShowcase,
  bestWpm,
  bestWpmRecord,
  totalGames,
  isAdmin = false,
  highScores,
  matchHistory,
  isLoggedIn = false,
  currentUser = null,
  onOpenAuthModal,
  onChangeUsername,
  onChangeAvatar,
  onChangeFrame,
  onUpdateShowcaseAchievements,
  onClose,
  initialTab = 'profile',
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'achievements'>(() => {
    if (initialTab === 'achievements') return 'achievements';
    return 'profile';
  });

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [currentShowcase, setCurrentShowcase] = useState<string[]>(() => {
    if (!isLoggedIn) return [];
    if (propShowcase && propShowcase.length > 0) return propShowcase.slice(0, 3);
    if (currentUser?.showcaseAchievements && currentUser.showcaseAchievements.length > 0) {
      return currentUser.showcaseAchievements.slice(0, 3);
    }
    return getShowcaseAchievements(currentUser?.id);
  });

  // Đồng bộ showcase khi đăng nhập/đăng xuất
  React.useEffect(() => {
    if (!isLoggedIn) {
      setCurrentShowcase([]);
    } else {
      const showcase = propShowcase && propShowcase.length > 0
        ? propShowcase.slice(0, 3)
        : (currentUser?.showcaseAchievements && currentUser.showcaseAchievements.length > 0
          ? currentUser.showcaseAchievements.slice(0, 3)
          : getShowcaseAchievements(currentUser?.id));
      setCurrentShowcase(showcase);
    }
  }, [isLoggedIn, propShowcase, currentUser?.id, currentUser?.showcaseAchievements]);

  const [nameInput, setNameInput] = useState(username);
  const [selectedAvatar, setSelectedAvatar] = useState(avatar);
  const [selectedFrame, setSelectedFrame] = useState<string>(() => frame || getStoredFrame());
  const [history] = useState<MatchRecord[]>(() => matchHistory || getStoredMatchHistory());
  const [guestNotice, setGuestNotice] = useState<string | null>(null);
  const recentMatches = history.slice(0, 5);

  const handleShowcaseChange = (newShowcase: string[]) => {
    if (!isLoggedIn) return;
    setCurrentShowcase(newShowcase);
    setShowcaseAchievements(newShowcase, currentUser?.id);
    if (onUpdateShowcaseAchievements) {
      onUpdateShowcaseAchievements(newShowcase);
    }
    updateUserProfile({ showcaseAchievements: newShowcase }).catch(() => {});
  };

  // Popups state
  const [isAvatarFrameModalOpen, setIsAvatarFrameModalOpen] = useState(false);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);

  // Temporary state for Avatar & Frame selection popup
  const [tempAvatar, setTempAvatar] = useState(selectedAvatar);
  const [tempFrame, setTempFrame] = useState(selectedFrame);
  const [avatarFrameTab, setAvatarFrameTab] = useState<'avatar' | 'frame'>('avatar');
  const [frameCategoryFilter, setFrameCategoryFilter] = useState<'all' | 'champion' | 'progression'>('all');
  const [activeAvatarCategory, setActiveAvatarCategory] = useState(0);
  const [lockedFrameTip, setLockedFrameTip] = useState<string | null>(null);

  // Temporary state for Edit Name popup
  const [tempName, setTempName] = useState(nameInput);
  const [nameError, setNameError] = useState('');

  const currentFrameConfig = getFrameConfig(selectedFrame);
  const tempFrameConfig = getFrameConfig(tempFrame);

  // Confirm Name Change from Popup
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setNameError('Chế độ Khách không thể đổi tên. Vui lòng đăng nhập!');
      return;
    }
    const trimmed = tempName.trim();
    if (!trimmed) {
      setNameError('Vui lòng nhập biệt danh của bạn!');
      return;
    }
    if (trimmed.length < 2) {
      setNameError('Biệt danh phải có ít nhất 2 ký tự!');
      return;
    }
    if (trimmed.length > 24) {
      setNameError('Biệt danh tối đa 24 ký tự!');
      return;
    }
    if (trimmed.toLowerCase() === username.trim().toLowerCase()) {
      setIsEditNameOpen(false);
      return;
    }
    setNameError('');
    try {
      const res = await updateUserProfile({ username: trimmed });
      if (!res.success) {
        setNameError(res.error || 'Biệt danh này đã có người sử dụng. Vui lòng chọn tên khác!');
        return;
      }
      setNameInput(trimmed);
      onChangeUsername(trimmed);
      soundFx.playKeyClick();
      setIsEditNameOpen(false);
    } catch (err: any) {
      setNameError(err.message || 'Lỗi khi cập nhật biệt danh');
    }
  };

  // Confirm Avatar & Frame from Popup
  const handleSaveAvatarFrame = () => {
    if (!isLoggedIn) {
      setGuestNotice('Chế độ Khách không thể đổi avatar và khung. Vui lòng đăng nhập tài khoản!');
      setIsAvatarFrameModalOpen(false);
      return;
    }
    setSelectedAvatar(tempAvatar);
    setSelectedFrame(tempFrame);
    onChangeAvatar(tempAvatar);
    if (onChangeFrame) {
      onChangeFrame(tempFrame);
    }
    setStoredFrame(tempFrame);
    soundFx.playVictory();
    setIsAvatarFrameModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">HỒ SƠ CÁ NHÂN & THÀNH TỰU</h3>
              <p className="text-xs text-slate-400">Tùy biến avatar, khung hào quang, thành tựu vinh danh và lịch sử thi đấu</p>
            </div>
          </div>
          <button
            id="btn-close-profile"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TOP NAVIGATION TABS */}
        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
          <button
            id="tab-profile-identity"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('profile');
            }}
            className={`flex-1 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 ring-1 ring-amber-300'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="whitespace-nowrap">Hồ Sơ Cá Nhân</span>
          </button>

          <button
            id="tab-profile-achievements"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('achievements');
            }}
            className={`flex-1 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'achievements'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="hidden xs:inline whitespace-nowrap">Thành Tựu</span>
            <span className="xs:hidden whitespace-nowrap">Thành Tựu</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-950/80 text-purple-200 border border-purple-400/40 font-mono">
              {currentShowcase.length}/3
            </span>
          </button>
        </div>

        {activeTab === 'achievements' ? (
          <AchievementsSection
            bestWpm={bestWpm}
            totalGames={totalGames}
            username={username}
            frame={selectedFrame}
            isLoggedIn={isLoggedIn}
            userId={currentUser?.id}
            matchHistory={history}
            highScores={highScores}
            showcaseAchievements={isLoggedIn ? currentShowcase : []}
            onShowcaseChange={handleShowcaseChange}
            onOpenAuthModal={onOpenAuthModal}
          />
        ) : (
          <div className="space-y-4">
        {/* GUEST BANNER / NOTICE IF NOT LOGGED IN */}
        {!isLoggedIn ? (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>Chế độ Khách (Chưa đăng nhập)</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Tạo tài khoản hoặc đăng nhập để lưu kỷ lục chính thức, đổi tên, avatar & khung hào quang!
                </p>
              </div>
            </div>
            <button
              id="btn-profile-login-cta"
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                if (onOpenAuthModal) onOpenAuthModal();
              }}
              className="w-full sm:w-auto h-9 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs shrink-0 shadow-md shadow-amber-400/20 transition-transform active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center"
            >
              Tạo Tài Khoản / Đăng Nhập
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              <span className="text-xs text-emerald-300 font-semibold truncate flex items-center gap-1.5">
                <span>Tài khoản: <strong className="text-white">{currentUser?.email || currentUser?.username}</strong></span>
                {currentUser?.isAdmin && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                    Quản Trị Viên
                  </span>
                )}
              </span>
            </div>
            <button
              id="btn-profile-manage-account"
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                if (onOpenAuthModal) onOpenAuthModal('login');
              }}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 underline shrink-0 cursor-pointer"
            >
              Quản lý tài khoản
            </button>
          </div>
        )}

        {guestNotice && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{guestNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                if (onOpenAuthModal) onOpenAuthModal('login');
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-[11px] shrink-0 cursor-pointer"
            >
              Đăng nhập
            </button>
          </div>
        )}

        {/* 1. TOP IDENTITY CARD: AVATAR + KHUNG NGANG HÀNG VỚI TÊN NGƯỜI CHƠI */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between gap-4 shadow-inner">
          <div className="flex items-center gap-4 min-w-0">
            {/* Clickable Avatar with Frame */}
            <button
              id="btn-profile-avatar-trigger"
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                if (!isLoggedIn) {
                  setGuestNotice('Chế độ Khách không thể đổi avatar và khung. Vui lòng đăng nhập để mở khóa!');
                  return;
                }
                setTempAvatar(selectedAvatar);
                setTempFrame(selectedFrame);
                setAvatarFrameTab('avatar');
                setLockedFrameTip(null);
                setIsAvatarFrameModalOpen(true);
              }}
              className="relative group p-1 rounded-2xl cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              title={isLoggedIn ? "Nhấn vào avatar để tùy chỉnh Avatar và Khung đại diện" : "Đăng nhập để đổi avatar"}
            >
              <AvatarWithFrame
                icon={selectedAvatar}
                frameId={selectedFrame}
                size="xl"
              />
              {!isLoggedIn && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-800 border border-amber-400/60 text-amber-400 flex items-center justify-center shadow-md z-30">
                  <Lock className="w-2.5 h-2.5" />
                </div>
              )}
            </button>

            {/* Username with Edit Icon & Frame Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight truncate max-w-[200px] sm:max-w-[260px]">
                  {nameInput}
                </span>
                {isLoggedIn ? (
                  <button
                    id="btn-open-edit-name"
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setTempName(nameInput);
                      setNameError('');
                      setIsEditNameOpen(true);
                    }}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 hover:border-amber-400/60 transition-all cursor-pointer shadow-sm shrink-0"
                    title="Nhấn để đổi tên người chơi"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    id="btn-open-edit-name-locked"
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setGuestNotice('Chế độ Khách không thể đổi tên người chơi. Vui lòng đăng nhập để mở khóa!');
                    }}
                    className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-500 hover:text-amber-400 border border-slate-700/80 transition-all cursor-pointer shadow-sm shrink-0"
                    title="Đăng nhập để đổi tên"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Current Frame Details & Quick Hint */}
              <div className="mt-1.5 flex items-center gap-2 text-xs flex-wrap">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  Khung: <b className="text-slate-200">{currentFrameConfig.name}</b>
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300 font-mono">
                  {currentFrameConfig.tag}
                </span>
                <span className="text-[11px] text-slate-500 italic">
                  {isLoggedIn ? '(Nhấn avatar để đổi)' : '(Khóa ở chế độ Khách)'}
                </span>
              </div>

              {/* Showcase Achievements Badges in Profile Header */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono flex items-center gap-1">
                    <span>✨</span> Danh Hiệu:
                  </span>
                  {!isLoggedIn ? (
                    <span className="text-[11px] text-amber-400/80 italic flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" /> Khóa ở chế độ Khách (Đăng nhập để mở)
                    </span>
                  ) : currentShowcase.length > 0 ? (
                    currentShowcase.map((achId) => {
                      const ach = getAchievementById(achId);
                      if (!ach) return null;
                      return (
                        <span
                          key={achId}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 shadow-sm ${ach.badgeBg} ${ach.borderClass}`}
                          title={`${ach.name}: ${ach.req} (${ach.realm})`}
                        >
                          <span>{ach.icon}</span>
                          <span className="text-white truncate max-w-[110px]">{ach.title}</span>
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">Chưa chọn thành tựu</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setActiveTab('achievements');
                  }}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>{isLoggedIn ? `Lĩnh Ngộ (${currentShowcase.length}/3)` : 'Xem Thành Tựu'}</span>
                  <Sparkles className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Career Stats Overview */}
        <div className="grid grid-cols-2 gap-3">
          <WpmRecordBadge
            bestWpm={bestWpm}
            bestWpmRecord={bestWpmRecord}
            highScores={highScores}
            matchHistory={history}
            username={username}
            isMe={true}
            size="large"
            tooltipPosition="top"
          />
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
              <Zap className="w-3.5 h-3.5 text-sky-400" /> Trận Đã Đấu
            </div>
            <div className="text-2xl font-black text-sky-400 font-mono mt-0.5">
              {totalGames} <span className="text-xs text-slate-400 font-normal">trận</span>
            </div>
          </div>
        </div>

        {/* Lịch Sử Đấu Của Tôi (5 trận gần nhất) */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Lịch Sử Đấu Của Tôi
                </h4>
                <p className="text-[10px] text-slate-400">Hiển thị 5 trận đấu gần nhất</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-amber-300">
              {recentMatches.length}/5 trận
            </span>
          </div>

          {recentMatches.length === 0 ? (
            <div className="py-6 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800/80 text-slate-500 text-xs space-y-1">
              <History className="w-6 h-6 mx-auto text-slate-600 mb-1" />
              <p className="font-medium text-slate-400">Chưa có lịch sử thi đấu</p>
              <p className="text-[11px] text-slate-500">Hoàn thành ván đấu để ghi nhận kết quả và chỉ số tại đây.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
              {recentMatches.map((m, idx) => {
                const isWin = m.result === 'Thắng';
                const isSurrender = m.result === 'Đầu hàng';
                const isLoss = m.result === 'Thua';

                return (
                  <div
                    key={m.id || idx}
                    className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-slate-700/80 flex items-center justify-between gap-2.5 text-xs transition-colors"
                  >
                    {/* Chế độ & Thời gian */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-slate-500 text-[10px] w-4 shrink-0 text-center">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate max-w-[110px] sm:max-w-[150px] flex items-center gap-1.5">
                          <span className="truncate">{m.mode}</span>
                          {m.playType === 'multiplayer' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0 font-normal">
                              Phòng
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatRelativeTime(m.timestamp)}
                        </div>
                      </div>
                    </div>

                    {/* WPM & Độ chính xác */}
                    <div className="flex items-center gap-3 shrink-0 font-mono text-right">
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-500">Tốc độ</div>
                        <div className="font-bold text-amber-400 text-xs sm:text-sm">
                          {m.wpm} <span className="text-[10px] text-slate-400 font-normal">WPM</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-500">Độ chính xác</div>
                        <div className="font-bold text-emerald-400 text-xs sm:text-sm">
                          {m.accuracy}%
                        </div>
                      </div>
                    </div>

                    {/* Kết quả (Thắng / Thua / Đầu hàng) */}
                    <div className="shrink-0 w-22 text-right">
                      {isWin && (
                        <span className="inline-flex items-center justify-center gap-1 w-full px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                          <Trophy className="w-3 h-3 shrink-0" />
                          <span>Thắng</span>
                        </span>
                      )}
                      {isLoss && (
                        <span className="inline-flex items-center justify-center gap-1 w-full px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
                          <X className="w-3 h-3 shrink-0" />
                          <span>Thua</span>
                        </span>
                      )}
                      {isSurrender && (
                        <span className="inline-flex items-center justify-center gap-1 w-full px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                          <Flag className="w-3 h-3 shrink-0" />
                          <span>Đầu hàng</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
        )}
      </div>

      {/* POPUP 1: TÙY CHỌN AVATAR & KHUNG ĐẠI DIỆN */}
      {isAvatarFrameModalOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              soundFx.playKeyClick();
              setIsAvatarFrameModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto animate-scaleUp text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    Tùy Chọn Avatar & Khung Hào Quang
                  </h4>
                  <p className="text-[11px] text-slate-400">Xem trước trực tiếp diện mạo trên đường đua</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setIsAvatarFrameModalOpen(false);
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* LIVE PREVIEW BOX */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Xem trước diện mạo
              </span>
              <div className="py-2">
                <AvatarWithFrame
                  icon={tempAvatar}
                  frameId={tempFrame}
                  size="xl"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{tempFrameConfig.name}</span>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300">
                  {tempFrameConfig.tag}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs">{tempFrameConfig.desc}</p>
            </div>

            {/* TABS SWITCHER: BIỂU TƯỢNG VS KHUNG HÀO QUANG */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setAvatarFrameTab('avatar');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  avatarFrameTab === 'avatar'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Biểu Tượng Avatar (48+)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setAvatarFrameTab('frame');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  avatarFrameTab === 'frame'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Khung Hào Quang ({AVATAR_FRAMES.length} Khung)</span>
              </button>
            </div>

            {/* TAB CONTENT: 1. AVATARS */}
            {avatarFrameTab === 'avatar' && (
              <div className="space-y-3">
                {/* Category Selector Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {EXPANDED_AVATARS.map((cat, idx) => {
                    const isActive = activeAvatarCategory === idx;
                    return (
                      <button
                        key={cat.category}
                        type="button"
                        onClick={() => {
                          soundFx.playKeyClick();
                          setActiveAvatarCategory(idx);
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-400 text-black shadow-sm'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {cat.category}
                      </button>
                    );
                  })}
                </div>

                {/* Avatars Grid */}
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 max-h-52 overflow-y-auto">
                  {EXPANDED_AVATARS[activeAvatarCategory].icons.map((emoji) => (
                    <button
                      id={`btn-popup-avatar-${emoji}`}
                      type="button"
                      key={emoji}
                      onClick={() => {
                        setTempAvatar(emoji);
                        soundFx.playKeyClick();
                      }}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl transition-all cursor-pointer ${
                        tempAvatar === emoji
                          ? 'bg-amber-500/30 border-2 border-amber-400 ring-2 ring-amber-400/50 scale-110 shadow-lg'
                          : 'hover:bg-slate-800 border border-transparent hover:scale-105'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. FRAMES */}
            {avatarFrameTab === 'frame' && (
              <div className="space-y-2.5">
                {/* Category Filter Pills for Frames */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setFrameCategoryFilter('all');
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      frameCategoryFilter === 'all'
                        ? 'bg-amber-400 text-black shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Tất Cả ({AVATAR_FRAMES.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setFrameCategoryFilter('champion');
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                      frameCategoryFilter === 'champion'
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-slate-950 text-rose-300/80 hover:text-rose-200 border border-slate-800'
                    }`}
                  >
                    <span>👑 Quán Quân Top 1 ({AVATAR_FRAMES.filter((f) => f.category === 'champion').length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setFrameCategoryFilter('progression');
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      frameCategoryFilter === 'progression'
                        ? 'bg-amber-400 text-black shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    ⚡ Tiến Trình & VIP ({AVATAR_FRAMES.filter((f) => f.category !== 'champion').length})
                  </button>
                </div>

                {/* Locked Frame Feedback Alert */}
                {lockedFrameTip && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{lockedFrameTip}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLockedFrameTip(null)}
                      className="text-slate-400 hover:text-white shrink-0 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 sm:max-h-80 overflow-y-auto p-1">
                  {AVATAR_FRAMES.filter((f) => {
                    if (frameCategoryFilter === 'champion') return f.category === 'champion';
                    if (frameCategoryFilter === 'progression') return f.category !== 'champion';
                    return true;
                  }).map((f) => {
                    const isOwned = isFrameOwned(f.id, {
                      username,
                      bestWpm,
                      totalGames,
                      isAdmin: Boolean(isAdmin || checkIsAdmin()),
                      highScores,
                    });
                    const isSelected = tempFrame === f.id;
                    const isChampionFrame = f.category === 'champion' || Boolean(f.topMode);
                    const currentHolder = f.topMode && highScores ? highScores[f.topMode] : null;

                    if (isOwned) {
                      return (
                        <button
                          key={f.id}
                          id={`btn-frame-owned-${f.id}`}
                          type="button"
                          onClick={() => {
                            setTempFrame(f.id);
                            setLockedFrameTip(null);
                            soundFx.playKeyClick();
                          }}
                          className={`p-2.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/60 shadow-lg'
                              : isChampionFrame
                              ? 'bg-slate-950 border-rose-500/40 hover:border-rose-400 hover:bg-slate-900/70 shadow-sm'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                          }`}
                        >
                          {/* Mini Frame Preview */}
                          <AvatarWithFrame
                            icon={tempAvatar}
                            frameId={f.id}
                            size="sm"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-white truncate flex items-center gap-1">
                                {f.badge && <span>{f.badge}</span>}
                                {f.name}
                              </span>
                              <span
                                className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  isChampionFrame
                                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                                    : 'bg-slate-900 border border-slate-800 text-amber-300'
                                }`}
                              >
                                {f.tag}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <p className="text-[10px] text-slate-400 truncate">{f.desc}</p>
                              <span
                                className={`text-[9px] font-bold shrink-0 flex items-center gap-0.5 ${
                                  isChampionFrame ? 'text-amber-300' : 'text-emerald-400'
                                }`}
                              >
                                <Check className="w-2.5 h-2.5" />
                                {isChampionFrame ? 'Quán quân' : 'Sở hữu'}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    }

                    // Locked Frame: Grayed out, unselectable, clear requirement info
                    return (
                      <div
                        key={f.id}
                        id={`btn-frame-locked-${f.id}`}
                        onClick={() => {
                          soundFx.playError();
                          const holderInfo = currentHolder?.username
                            ? ` (Kỷ lục hiện tại: ${currentHolder.username} - ${currentHolder.wpm || currentHolder.score || 0} WPM)`
                            : isChampionFrame
                            ? ' (Chưa có ai xác lập, cơ hội mở khóa của bạn!)'
                            : '';
                          setLockedFrameTip(`Khung "${f.name}" chưa mở khóa: ${f.unlockReq}${holderInfo}`);
                        }}
                        className="p-2.5 rounded-2xl border border-slate-800/60 bg-slate-950/40 text-left flex items-center gap-3 opacity-40 grayscale hover:opacity-60 transition-all cursor-not-allowed select-none group"
                        title={`Chưa sở hữu. Yêu cầu: ${f.unlockReq}`}
                      >
                        {/* Grayed-out Mini Preview */}
                        <div className="relative shrink-0">
                          <AvatarWithFrame
                            icon={tempAvatar}
                            frameId={f.id}
                            size="sm"
                            isLocked={true}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 rounded-2xl z-30">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-medium text-slate-400 truncate flex items-center gap-1">
                              {f.badge && <span className="opacity-70">{f.badge}</span>}
                              {f.name}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 flex items-center gap-0.5 shrink-0">
                              <Lock className="w-2.5 h-2.5" /> Chưa có
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-400/80 font-medium truncate mt-0.5">
                            Khóa: {f.unlockReq}
                          </p>
                          {currentHolder?.username && (
                            <p className="text-[9px] text-slate-500 truncate mt-0.2">
                              Đang giữ: {currentHolder.username} ({currentHolder.wpm || currentHolder.score || 0} WPM)
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Popup Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setIsAvatarFrameModalOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveAvatarFrame}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-400/20 cursor-pointer"
              >
                Xác Nhận Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP 2: ĐỔI BIỆT DANH NGƯỜI CHƠI */}
      {isEditNameOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              soundFx.playKeyClick();
              setIsEditNameOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4 relative animate-scaleUp text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    Đổi Biệt Danh Người Chơi
                  </h4>
                  <p className="text-[11px] text-slate-400">Tên xuất hiện trên bảng xếp hạng và các phòng đấu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setIsEditNameOpen(false);
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSaveName} className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Biệt Danh Mới
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    {tempName.length}/20 ký tự
                  </span>
                </div>
                <input
                  id="input-edit-username-popup"
                  type="text"
                  value={tempName}
                  onChange={(e) => {
                    setTempName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  maxLength={20}
                  autoFocus
                  placeholder="Nhập biệt danh của bạn..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                />
                {nameError && (
                  <p className="text-xs text-rose-400 font-medium">{nameError}</p>
                )}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Biệt danh giúp bạn bè và đối thủ nhận diện bạn trong các trận đua phím nhiều người chơi.
              </p>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setIsEditNameOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-400/20 cursor-pointer"
                >
                  Lưu Tên Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

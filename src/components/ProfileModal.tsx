import React, { useState, useEffect, useMemo } from 'react';
import { soundFx } from '../utils/audio';
import { 
  User, 
  X, 
  Check, 
  Flame, 
  Zap, 
  Sparkles, 
  ChevronDown,
  ChevronRight,
  Edit3, 
  Award, 
  Lock, 
  History, 
  Trophy, 
  Flag, 
  Target, 
  LogOut,
  Copy,
  Shield,
  Gem,
  Clock,
  Compass,
  Swords,
  Users,
  CheckCircle2,
  ExternalLink,
  TrendingUp,
  Activity,
  Layers,
  Scroll,
  Heart,
  Sparkle
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
import { getShowcaseAchievements, getAchievementById, setShowcaseAchievements, formatOnlineDuration, XIANXIA_ACHIEVEMENTS } from '../utils/achievements';
import { WpmRecordBadge, getFriendlyModeTitle, formatRecordTime, isOutplayMode } from './WpmRecordBadge';
import { XIANXIA_REALMS, getSubStage, SECT_ROLES_CONFIG } from '../utils/cultivation';

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
  cultivationLevel?: number;
  cultivationRealmIndex?: number;
  cultivationState?: any;
  onlineSeconds?: number;
  friendsList?: any[];
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
  onLogout?: () => void;
  onChangeUsername: (name: string) => void;
  onChangeAvatar: (emoji: string) => void;
  onChangeFrame?: (frameId: string) => void;
  onUpdateShowcaseAchievements?: (newShowcase: string[]) => void;
  onOpenMatchHistory?: () => void;
  onClose: () => void;
  initialTab?: 'profile' | 'achievements';
}

function formatRelativeTime(ts?: number): string {
  if (!ts) return 'Chưa rõ';
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
  cultivationLevel,
  cultivationRealmIndex,
  cultivationState,
  onlineSeconds,
  friendsList,
  onOpenAuthModal,
  onLogout,
  onChangeUsername,
  onChangeAvatar,
  onChangeFrame,
  onUpdateShowcaseAchievements,
  onOpenMatchHistory,
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

  const sanitizeShowcase = (list?: string[] | null): string[] => {
    if (!Array.isArray(list)) return [];
    return Array.from(new Set(list.filter((id) => Boolean(getAchievementById(id))))).slice(0, 4);
  };

  const [currentShowcase, setCurrentShowcase] = useState<string[]>(() => {
    if (!isLoggedIn) return [];
    if (propShowcase && propShowcase.length > 0) return sanitizeShowcase(propShowcase);
    if (currentUser?.showcaseAchievements && currentUser.showcaseAchievements.length > 0) {
      return sanitizeShowcase(currentUser.showcaseAchievements);
    }
    return sanitizeShowcase(getShowcaseAchievements(currentUser?.id));
  });

  // Đồng bộ showcase khi đăng nhập/đăng xuất
  React.useEffect(() => {
    if (!isLoggedIn) {
      setCurrentShowcase([]);
    } else {
      const showcase = propShowcase && propShowcase.length > 0
        ? sanitizeShowcase(propShowcase)
        : (currentUser?.showcaseAchievements && currentUser.showcaseAchievements.length > 0
          ? sanitizeShowcase(currentUser.showcaseAchievements)
          : sanitizeShowcase(getShowcaseAchievements(currentUser?.id)));
      setCurrentShowcase(showcase);
    }
  }, [isLoggedIn, propShowcase, currentUser?.id, currentUser?.showcaseAchievements]);

  const [nameInput, setNameInput] = useState(username);
  const [selectedAvatar, setSelectedAvatar] = useState(avatar);
  const [selectedFrame, setSelectedFrame] = useState<string>(() => frame || getStoredFrame());
  const [history, setHistory] = useState<MatchRecord[]>(() => matchHistory || getStoredMatchHistory());
  const [guestNotice, setGuestNotice] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  React.useEffect(() => {
    setNameInput(username);
  }, [username]);

  React.useEffect(() => {
    setSelectedAvatar(avatar);
  }, [avatar]);

  React.useEffect(() => {
    setSelectedFrame(frame || getStoredFrame());
  }, [frame]);

  React.useEffect(() => {
    setHistory(matchHistory || []);
  }, [matchHistory]);

  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      soundFx.playKeyClick();
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // ignore
    }
  };

  // Tính toán chỉ số thi đấu toàn diện từ lịch sử
  const matchStats = useMemo(() => {
    if (!history || history.length === 0) {
      return {
        total: totalGames || 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        avgWpm: 0,
        avgAccuracy: '100',
      };
    }
    const validMatches = history.filter((m) => m && (m.wpm > 0 || m.result));
    const wins = validMatches.filter((m) => m.result === 'Thắng' || m.result === 'Top 1').length;
    const losses = validMatches.filter((m) => m.result === 'Thua' || m.result === 'Đầu hàng').length;
    const totalDecided = wins + losses;
    const winRate = totalDecided > 0 
      ? Math.round((wins / totalDecided) * 100) 
      : (validMatches.length > 0 ? Math.round((wins / validMatches.length) * 100) : 0);
    const totalWpm = validMatches.reduce((acc, m) => acc + (m.wpm || 0), 0);
    const avgWpm = validMatches.length > 0 ? Math.round(totalWpm / validMatches.length) : 0;
    const totalAcc = validMatches.reduce((acc, m) => acc + (typeof m.accuracy === 'number' ? m.accuracy : 100), 0);
    const avgAccuracy = validMatches.length > 0 ? (totalAcc / validMatches.length).toFixed(1) : '100';
    return {
      total: Math.max(totalGames || 0, validMatches.length),
      wins,
      losses,
      winRate,
      avgWpm,
      avgAccuracy,
    };
  }, [history, totalGames]);

  // Cảnh giới & Tu Đạo
  const effectiveCultivation = currentUser?.cultivation || cultivationState;
  const currentRealmIndex = effectiveCultivation?.realmIndex ?? cultivationRealmIndex ?? 0;
  const currentRealm = XIANXIA_REALMS[currentRealmIndex] || XIANXIA_REALMS[0];
  const effectiveTier = effectiveCultivation?.tier || 1;
  const subStageName = getSubStage(effectiveTier);
  const currentTuVi = effectiveCultivation?.tuVi || 0;
  const maxTuVi = effectiveCultivation?.maxTuVi || 1000;
  const tuViPercent = Math.min(100, Math.round((currentTuVi / Math.max(1, maxTuVi)) * 100));
  const thoNguyen = effectiveCultivation?.thoNguyen ?? currentRealm.maxThoNguyen;
  const maxThoNguyen = effectiveCultivation?.maxThoNguyen ?? currentRealm.maxThoNguyen;
  const linhThach = effectiveCultivation?.linhThach || 0;
  const chienLuc = effectiveCultivation?.chienLuc || 0;
  const sectInfo = effectiveCultivation?.sect;
  const sectRoleConfig = sectInfo?.role && SECT_ROLES_CONFIG[sectInfo.role as keyof typeof SECT_ROLES_CONFIG]
    ? SECT_ROLES_CONFIG[sectInfo.role as keyof typeof SECT_ROLES_CONFIG]
    : null;

  // Thành tựu
  const unlockedCount = currentUser?.unlockedAchievements?.length || (isLoggedIn ? 1 : 0);
  const totalAchievements = XIANXIA_ACHIEVEMENTS.length;
  const achievementPercent = Math.round((unlockedCount / Math.max(1, totalAchievements)) * 100);

  // Cột mốc thành tựu Bách Chiến Đăng Tiên (nhánh số trận thi đấu)
  const MATCH_MILESTONES = [
    { target: 1, id: 'matches_1', name: 'Nhập Đạo Sơ Thí', title: 'Sơ Khởi Hành Giả', icon: '📜', rarity: 'Phàm Phẩm' },
    { target: 10, id: 'matches_10', name: 'Luyện Khí Trúc Cơ', title: 'Tu Tiên Tân Tú', icon: '🌱', rarity: 'Phàm Phẩm' },
    { target: 30, id: 'matches_30', name: 'Kim Đan Tụ Đỉnh', title: 'Kim Đan Đạo Trưởng', icon: '🔮', rarity: 'Hoàng Giai' },
    { target: 50, id: 'matches_50', name: 'Bách Luyện Đúc Cốt', title: 'Cương Cốt Kiếm Giả', icon: '🔨', rarity: 'Hoàng Giai' },
    { target: 75, id: 'matches_75', name: 'Nguyên Anh Hóa Hình', title: 'Nguyên Anh Lão Tổ', icon: '🧘‍♂️', rarity: 'Huyền Giai' },
    { target: 100, id: 'matches_100', name: 'Bách Chiến Tinh Anh', title: 'Bách Trận Tướng Quân', icon: '🚩', rarity: 'Huyền Giai' },
    { target: 150, id: 'matches_150', name: 'Hóa Thần Chi Cảnh', title: 'Hóa Thần Chân Nhân', icon: '⚡', rarity: 'Địa Giai' },
    { target: 200, id: 'matches_200', name: 'Cửu Chuyển Chiến Thần', title: 'Chiến Ý Cuồng Đồ', icon: '🔥', rarity: 'Địa Giai' },
    { target: 300, id: 'matches_300', name: 'Độ Kiếp Phi Thăng', title: 'Cửu Trọng Tiên Tôn', icon: '🌌', rarity: 'Thiên Giai' },
    { target: 500, id: 'matches_500', name: 'Vạn Cổ Trường Tồn', title: 'Vạn Kiếp Thần Đế', icon: '👑', rarity: 'Chí Tôn' },
    { target: 750, id: 'matches_750', name: 'Thiên Cổ Hùng Sư', title: 'Thiên Cổ Chiến Tổ', icon: '🦁', rarity: 'Chí Tôn' },
    { target: 1000, id: 'matches_1000', name: 'Thiên Thu Vạn Kiếp Đế', title: 'Thiên Thu Chiến Đế', icon: '⚜️', rarity: 'Thần Thoại' },
  ];

  const matchMilestoneInfo = useMemo(() => {
    const current = matchStats.total;
    const nextIdx = MATCH_MILESTONES.findIndex((m) => m.target > current);

    if (nextIdx === -1) {
      const last = MATCH_MILESTONES[MATCH_MILESTONES.length - 1];
      return {
        isMaxed: true,
        current,
        target: last.target,
        prevTarget: MATCH_MILESTONES[MATCH_MILESTONES.length - 2].target,
        remaining: 0,
        percent: 100,
        currentMilestone: last,
        nextMilestone: null,
      };
    }

    const nextMilestone = MATCH_MILESTONES[nextIdx];
    const prevMilestone = nextIdx > 0 ? MATCH_MILESTONES[nextIdx - 1] : null;
    const prevTarget = prevMilestone ? prevMilestone.target : 0;
    const remaining = Math.max(0, nextMilestone.target - current);

    const range = nextMilestone.target - prevTarget;
    const progressInRange = current - prevTarget;
    const segmentPercent = range > 0 ? Math.min(100, Math.max(0, Math.round((progressInRange / range) * 100))) : 0;

    return {
      isMaxed: false,
      current,
      target: nextMilestone.target,
      prevTarget,
      remaining,
      percent: segmentPercent,
      currentMilestone: prevMilestone,
      nextMilestone,
    };
  }, [matchStats.total]);

  // Kỷ lục theo chế độ
  const MODE_RECORDS_LIST = [
    { id: 'vi_dau', name: 'Chính Đạo Vấn Tâm', icon: '📜', shortName: 'Tiếng Việt Có Dấu' },
    { id: 'vi_nodau', name: 'Tật Phong Ngự Kiếm', icon: '🍃', shortName: 'Tiếng Việt Không Dấu' },
    { id: 'en', name: 'Dị Vực Luận Đạo', icon: '🌐', shortName: 'Tiếng Anh' },
    { id: 'numpad', name: 'Cửu Cung Trận Pháp', icon: '🔢', shortName: 'Bàn Phím Số' },
    { id: 'doan_chu', name: 'Huyền Cơ Mật Cảnh', icon: '🧩', shortName: 'Đoán Chữ' },
    { id: 'ngau_hung', name: 'Lôi Đình Nhất Kích', icon: '⚡', shortName: 'Ngẫu Hứng' },
    { id: 'san_boss', name: 'Hàng Phục Ma Tôn', icon: '🐉', shortName: 'Săn Boss Hắc Long' },
    { id: 'outplay', name: 'Tâm Ma Thí Luyện', icon: '🔥', shortName: 'Outplay Yourself' },
  ];

  const getModeRecord = (modeId: string) => {
    const hs = highScores?.[modeId];
    if (hs && hs.wpm > 0) {
      return {
        wpm: hs.wpm,
        accuracy: typeof hs.accuracy === 'number' ? hs.accuracy : 100,
        timestamp: hs.timestamp,
      };
    }
    const match = history.find((m) => (m.modeId === modeId || m.mode === modeId) && m.wpm > 0);
    if (match) {
      return {
        wpm: match.wpm,
        accuracy: match.accuracy,
        timestamp: match.timestamp,
      };
    }
    return null;
  };

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
      const res = await updateUserProfile({ displayName: trimmed });
      if (!res.success) {
        setNameError(res.error || 'Không thể cập nhật tên người chơi. Vui lòng thử lại!');
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

  // Escape key handler: closes sub-modal first, or main modal if no sub-modal is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      if (isAvatarFrameModalOpen) {
        e.preventDefault();
        e.stopPropagation();
        soundFx.playKeyClick();
        setIsAvatarFrameModalOpen(false);
      } else if (isEditNameOpen) {
        e.preventDefault();
        e.stopPropagation();
        soundFx.playKeyClick();
        setIsEditNameOpen(false);
      } else {
        e.preventDefault();
        e.stopPropagation();
        soundFx.playKeyClick();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isAvatarFrameModalOpen, isEditNameOpen, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-3xl h-[92vh] max-h-[860px] min-h-[600px] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                <span>HỒ SƠ CÁ NHÂN & THÀNH TỰU</span>
                {currentUser?.isAdmin && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono uppercase">
                    Admin
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Diện mạo đạo hữu, cảnh giới tu vi, chỉ số tốc ký và lịch sử luận đạo</p>
            </div>
          </div>
          <button
            id="btn-close-profile"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
            title="Đóng (Esc)"
          >
            <kbd className="hidden sm:inline text-[10px] font-mono px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
              Esc
            </kbd>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TOP NAVIGATION TABS */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner shrink-0 mt-3">
          <button
            id="tab-profile-identity"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('profile');
            }}
            className={`flex-1 h-10 sm:h-11 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer select-none ${
              activeTab === 'profile'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 ring-1 ring-amber-300'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Hồ Sơ Đạo Hữu</span>
          </button>

          <button
            id="tab-profile-achievements"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('achievements');
            }}
            className={`flex-1 h-10 sm:h-11 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer select-none ${
              activeTab === 'achievements'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="whitespace-nowrap">Thành Tựu Tiên Giới</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-950/80 text-purple-200 border border-purple-400/40 font-mono leading-none shrink-0">
              {currentShowcase.length}/4
            </span>
          </button>
        </div>

        {/* Tab Body - Fixed height with smooth internal scrolling */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 mt-3 space-y-4">
        {activeTab === 'achievements' ? (
          <AchievementsSection
            bestWpm={bestWpm}
            totalGames={totalGames}
            username={username}
            frame={selectedFrame}
            isLoggedIn={isLoggedIn}
            isAdmin={isAdmin}
            userId={currentUser?.id}
            matchHistory={history}
            highScores={highScores}
            showcaseAchievements={(isLoggedIn || isAdmin) ? currentShowcase : []}
            cultivationLevel={cultivationLevel}
            cultivationRealmIndex={cultivationRealmIndex}
            cultivationState={cultivationState}
            onlineSeconds={onlineSeconds}
            friendsList={friendsList}
            onShowcaseChange={handleShowcaseChange}
            onOpenAuthModal={onOpenAuthModal}
          />
        ) : (
          <div className="space-y-4">
            {/* GUEST BANNER / ACCOUNT BAR */}
            {!isLoggedIn ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left animate-fadeIn">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span>Chế độ Tán Tu (Chưa Đăng Nhập)</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Đăng nhập để lưu giữ Tu Vi, Cảnh Giới, Linh Thạch, mở khóa đổi Avatar & Khung Hào Quang và vinh danh trên Bảng Vàng!
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
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-left">
                <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
                  <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5 flex-wrap">
                    <span>Tài khoản: <strong className="text-white font-mono">{currentUser?.email || currentUser?.username}</strong></span>
                    {currentUser?.isAdmin && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                        Quản Trị Viên
                      </span>
                    )}
                  </div>
                  <span className="text-slate-600 hidden sm:inline">·</span>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-sky-400" />
                    <span>Tu đạo: <strong className="text-sky-300 font-mono">{formatOnlineDuration(onlineSeconds || 0)}</strong></span>
                  </div>
                  <span className="text-slate-600 hidden sm:inline">·</span>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Users className="w-3 h-3 text-emerald-400" />
                    <span>Bằng hữu: <strong className="text-emerald-300 font-mono">{friendsList?.length || 0}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="btn-profile-manage-account"
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      if (onOpenAuthModal) onOpenAuthModal('login');
                    }}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 underline cursor-pointer px-2 py-1"
                  >
                    Đổi mật khẩu
                  </button>
                  {onLogout && (
                    <button
                      id="btn-profile-logout"
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        onLogout();
                      }}
                      className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-colors"
                      title="Đăng xuất tài khoản"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Đăng xuất</span>
                    </button>
                  )}
                </div>
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

            {/* 1. THẺ DIỆN MẠO & ĐỊNH DANH ĐẠO HỮU */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                    {isLoggedIn ? (
                      <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-amber-400 text-black text-[9px] font-black uppercase tracking-wider shadow-md opacity-90 group-hover:opacity-100 flex items-center gap-0.5">
                        <Edit3 className="w-2.5 h-2.5" />
                        <span>Đổi</span>
                      </div>
                    ) : (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-800 border border-amber-400/60 text-amber-400 flex items-center justify-center shadow-md z-30">
                        <Lock className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>

                  {/* Username, Edit, UID & Badges */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl sm:text-2xl font-black text-white tracking-tight truncate max-w-[200px] sm:max-w-[280px]">
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
                          title="Đổi tên hiển thị / Biệt danh"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
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

                    {/* Metadata line: System username + UID + Frame */}
                    <div className="flex items-center gap-2 text-xs flex-wrap text-slate-400">
                      {currentUser?.username && (
                        <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/70 text-amber-300">
                          @{currentUser.username}
                        </span>
                      )}

                      {currentUser?.id && currentUser.authProvider !== 'guest' ? (
                        <button
                          type="button"
                          onClick={() => handleCopy(currentUser.id, 'id')}
                          className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-700/50 transition-colors cursor-pointer"
                          title="Sao chép UID"
                        >
                          <span>UID: {currentUser.id.slice(0, 8)}...</span>
                          {copiedField === 'id' ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500" />
                          )}
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded border border-slate-700/40">
                          Tán Tu (Chưa có UID)
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-[11px]">
                        Khung: <strong className="text-slate-200">{currentFrameConfig.name}</strong>
                      </span>
                    </div>

                    {/* Realm Tag */}
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                        <span>{currentRealm.icon}</span>
                        <span>{currentRealm.name}</span>
                        <span className="text-emerald-400/60">·</span>
                        <span className="text-[11px] font-normal text-emerald-200">
                          Tầng {effectiveTier} ({subStageName})
                        </span>
                      </div>

                      {sectInfo?.sectName && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-bold">
                          <span>🏰</span>
                          <span>{sectInfo.sectName}</span>
                          {sectRoleConfig && (
                            <>
                              <span className="text-purple-400/60">·</span>
                              <span className="text-[11px] font-normal text-purple-200">
                                {sectRoleConfig.title}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Showcase Danh Hiệu */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono flex items-center gap-1 shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Danh Hiệu Tiên Giới:
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
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-sm ${ach.badgeBg} ${ach.borderClass}`}
                          title={`${ach.name}: ${ach.req} (${ach.realm})`}
                        >
                          <span>{ach.icon}</span>
                          <span className="text-white truncate max-w-[120px]">{ach.title}</span>
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">Chưa chọn danh hiệu vinh dự</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setActiveTab('achievements');
                  }}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1 shrink-0 self-end sm:self-auto"
                >
                  <span>{isLoggedIn ? `Đổi Danh Hiệu (${currentShowcase.length}/4)` : 'Xem Thành Tựu'}</span>
                  <Sparkles className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 2. TIẾN TRÌNH TU TIÊN & TÔNG MÔN */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Scroll className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      <span>CẢNH GIỚI TU TIÊN & ĐẠO QUẢ</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        Cấp {effectiveCultivation?.level || 1}
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-400">Đạo hạnh tích lũy, thọ nguyên và tài nguyên tu luyện</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                  {currentRealm.name}
                </span>
              </div>

              {/* Progress Bar Tu Vi */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <Sparkle className="w-3 h-3 text-amber-400" />
                    <span>Tu Vi Hiện Tại</span>
                  </span>
                  <span className="font-mono font-bold text-amber-300 text-[11px]">
                    {currentTuVi.toLocaleString()} / {maxTuVi.toLocaleString()}{' '}
                    <span className="text-slate-400 font-normal">({tuViPercent}%)</span>
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    style={{ width: `${tuViPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* 4 Cultivation Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-400" /> Thọ Nguyên
                  </div>
                  <div className="text-sm font-black text-rose-300 font-mono mt-0.5">
                    {thoNguyen} <span className="text-[10px] text-slate-500 font-normal">/ {maxThoNguyen} năm</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Gem className="w-3 h-3 text-sky-400" /> Linh Thạch
                  </div>
                  <div className="text-sm font-black text-sky-300 font-mono mt-0.5">
                    {linhThach.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">viên</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Swords className="w-3 h-3 text-amber-400" /> Chiến Lực
                  </div>
                  <div className="text-sm font-black text-amber-300 font-mono mt-0.5">
                    {chienLuc.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">điểm</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-purple-400" /> Tông Môn
                  </div>
                  <div className="text-xs font-bold text-purple-300 truncate mt-0.5">
                    {sectInfo?.sectName || 'Tán Tu'}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. MA TRẬN CHỈ SỐ TỐC KÝ TOÀN DIỆN */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      CHỈ SỐ THI ĐẤU TOÀN DIỆN
                    </h4>
                    <p className="text-[10px] text-slate-400">Thống kê phong độ và hiệu suất tốc ký đỉnh cao</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {matchStats.total} trận đã đấu
                </span>
              </div>

              {/* 4 Cards Thống Kê Chính */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1. Best WPM */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-amber-500/30 text-left relative overflow-hidden">
                  <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1 font-mono">
                    <Flame className="w-3 h-3" /> Kỷ Lục Đỉnh Cao
                  </div>
                  <div className="text-2xl font-black text-amber-300 font-mono mt-1">
                    {bestWpm || 0}{' '}
                    <span className="text-xs text-slate-400 font-normal">WPM</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {bestWpmRecord?.modeName || 'Outplay Yourself'}
                  </div>
                </div>

                {/* 2. Win Rate */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/30 text-left">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1 font-mono">
                    <Trophy className="w-3 h-3" /> Tỷ Lệ Thắng
                  </div>
                  <div className="text-2xl font-black text-emerald-300 font-mono mt-1">
                    {matchStats.winRate}%
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {matchStats.wins} Thắng · {matchStats.losses} Thua
                  </div>
                </div>

                {/* 3. Average WPM */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-sky-500/30 text-left">
                  <div className="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1 font-mono">
                    <TrendingUp className="w-3 h-3" /> Tốc Độ TB
                  </div>
                  <div className="text-2xl font-black text-sky-300 font-mono mt-1">
                    {matchStats.avgWpm}{' '}
                    <span className="text-xs text-slate-400 font-normal">WPM</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    Các ván gần nhất
                  </div>
                </div>

                {/* 4. Average Accuracy */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-purple-500/30 text-left">
                  <div className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1 font-mono">
                    <Target className="w-3 h-3" /> Độ Chính Xác
                  </div>
                  <div className="text-2xl font-black text-purple-300 font-mono mt-1">
                    {matchStats.avgAccuracy}%
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    Tỷ lệ gõ chuẩn xác
                  </div>
                </div>
              </div>

              {/* THANH TIẾN ĐỘ CỘT MỐC BÁCH CHIẾN TIẾP THEO */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-950 border border-amber-500/30 space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 text-base shadow-sm">
                      {matchMilestoneInfo.isMaxed ? '👑' : matchMilestoneInfo.nextMilestone?.icon || '🚩'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase font-bold text-amber-400 font-mono tracking-wider flex items-center gap-1.5">
                        <span>🎯 CỘT MỐC THÀNH TỰU BÁCH CHIẾN</span>
                        {!matchMilestoneInfo.isMaxed && matchMilestoneInfo.nextMilestone?.rarity && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-normal">
                            {matchMilestoneInfo.nextMilestone.rarity}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-black text-white truncate flex items-center gap-1.5 mt-0.5">
                        {matchMilestoneInfo.isMaxed ? (
                          <span className="text-amber-300">Đại Viên Mãn Bách Chiến Đăng Tiên (Đỉnh Phong)</span>
                        ) : (
                          <>
                            <span>{matchMilestoneInfo.nextMilestone?.name}</span>
                            <span className="text-slate-500 font-normal">·</span>
                            <span className="text-amber-300 font-medium font-mono text-[11px]">
                              {matchMilestoneInfo.nextMilestone?.title}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ratio & Percentage */}
                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-xs sm:text-sm text-amber-300">
                      {matchMilestoneInfo.current} <span className="text-slate-400 text-xs font-normal">/ {matchMilestoneInfo.target} trận</span>
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400 font-semibold">
                      {matchMilestoneInfo.percent}% chặng mốc
                    </div>
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 p-0.5 overflow-hidden relative shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-emerald-400 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(251,191,36,0.6)] relative"
                      style={{ width: `${Math.max(4, matchMilestoneInfo.percent)}%` }}
                    >
                      {/* Glossy shimmer effect */}
                      <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse opacity-40"></div>
                    </div>
                  </div>

                  {/* Helper Subtext / Motivation */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 flex-wrap gap-1">
                    <div className="truncate flex items-center gap-1 text-[11px]">
                      {matchMilestoneInfo.isMaxed ? (
                        <span className="text-amber-300 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          Đã chinh phục đỉnh phong 1.000 trận thi đấu thiên cổ!
                        </span>
                      ) : (
                        <span>
                          Còn thiếu <strong className="text-amber-300 font-mono font-bold">{matchMilestoneInfo.remaining}</strong> trận nữa để đạt mốc này
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setActiveTab('achievements');
                      }}
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 transition-colors cursor-pointer shrink-0 ml-auto"
                      title="Xem toàn bộ cây thành tựu Bách Chiến Đăng Tiên"
                    >
                      <span>Xem tất cả mốc</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Thông số phụ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-900 text-slate-400 text-xs">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/50">
                  <Zap className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-[11px]">Tổng ván: <strong className="text-white font-mono">{matchStats.total}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/50">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px]">Thành tựu: <strong className="text-white font-mono">{unlockedCount}/{totalAchievements}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/50">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px]">Bằng hữu: <strong className="text-white font-mono">{friendsList?.length || 0}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/50">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] truncate">Online: <strong className="text-white font-mono">{formatOnlineDuration(onlineSeconds || 0)}</strong></span>
                </div>
              </div>
            </div>

            {/* 4. BẢNG KỶ LỤC TỪNG CHẾ ĐỘ THI ĐẤU */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      KỶ LỤC TỪNG CHẾ ĐỘ THI ĐẤU
                    </h4>
                    <p className="text-[10px] text-slate-400">Thành tích cao nhất trong các bí cảnh tốc ký</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-500/30">
                  8 Chế Độ
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MODE_RECORDS_LIST.map((mode) => {
                  const rec = getModeRecord(mode.id);
                  const hasRecord = rec && rec.wpm > 0;

                  return (
                    <div
                      key={mode.id}
                      className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col justify-between text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm shrink-0">{mode.icon}</span>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-white truncate" title={mode.name}>
                            {mode.shortName}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex items-baseline justify-between">
                        {hasRecord ? (
                          <>
                            <div className="font-mono font-black text-amber-400 text-sm">
                              {rec.wpm} <span className="text-[9px] text-slate-400 font-normal">WPM</span>
                            </div>
                            <div className="text-[10px] font-mono text-emerald-400">
                              {rec.accuracy}%
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] font-mono text-slate-500">
                            -- WPM
                          </div>
                        )}
                      </div>

                      {hasRecord && rec.timestamp && (
                        <div className="mt-1 text-[9px] text-slate-500 font-mono truncate">
                          {formatRelativeTime(rec.timestamp)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. LỊCH SỬ ĐẤU CỦA TÔI (5 TRẬN GẦN NHẤT) */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      LỊCH SỬ ĐẤU GẦN NHẤT
                    </h4>
                    <p className="text-[10px] text-slate-400">5 ván so tài tốc ký gần đây</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-amber-300">
                    {recentMatches.length}/5 trận
                  </span>
                  {onOpenMatchHistory && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        onClose();
                        onOpenMatchHistory();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-white border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Mở 20 ván gần nhất, replay và phân tích chuyên sâu"
                    >
                      <History className="w-3 h-3 text-emerald-400" />
                      <span>Xem 20 Trận & Replay</span>
                    </button>
                  )}
                </div>
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
                    const isWin = m.result === 'Thắng' || m.result === 'Top 1';
                    const isAFK = m.result === 'AFK';
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
                            <div className="font-bold text-white truncate max-w-[110px] sm:max-w-[170px] flex items-center gap-1.5">
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
                          {isAFK && (
                            <span className="inline-flex items-center justify-center gap-1 w-full px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                              <span>💤</span>
                              <span>AFK</span>
                            </span>
                          )}
                          {isSurrender && (
                            <span className="inline-flex items-center justify-center gap-1 w-full px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
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

              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                💡 Tên người chơi xuất hiện trên bảng xếp hạng và các phòng đua. Đổi tên người chơi sẽ <b>không làm thay đổi tên đăng nhập</b> ({currentUser?.username}).
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

export default ProfileModal;

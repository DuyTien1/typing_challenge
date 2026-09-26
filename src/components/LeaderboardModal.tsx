import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HighScoreRecord,
  CultivationLeaderboardEntry,
  UserAccount,
  HeavenlyDaoDecree,
  SectLeaderboardEntry,
  SectRole,
} from '../types';
import { soundFx } from '../utils/audio';
import {
  Trophy,
  Clock,
  X,
  Flame,
  Sparkles,
  Search,
  RefreshCw,
  Crown,
  Shield,
  Zap,
  Award,
  User,
  ChevronRight,
  Scroll,
  Users,
  Swords,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { AvatarWithFrame, checkIsAdmin } from '../utils/frames';
import { fetchCultivationLeaderboard, fetchSectLeaderboard, serverJoinSect } from '../utils/roomManager';
import { XIANXIA_REALMS, CultivationState, getSubStage, getSectsLeaderboard, SECT_ROLES_CONFIG, joinSect } from '../utils/cultivation';
import { getStoredDaoDecrees, subscribeToDaoDecrees } from '../utils/heavenlyDaoBot';
import { DaoDecreeModal } from './DaoDecreeModal';

interface LeaderboardModalProps {
  highScores: Record<string, HighScoreRecord | null>;
  onClose: () => void;
  currentUsername?: string;
  currentUser?: UserAccount | null;
  cultivationState?: CultivationState;
  onOpenAuthModal?: () => void;
  isAdmin?: boolean;
  onRefreshLeaderboard?: () => Promise<void> | void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  highScores,
  onClose,
  currentUsername,
  currentUser,
  cultivationState,
  onOpenAuthModal,
  isAdmin = false,
  onRefreshLeaderboard,
}) => {
  const [selectedTab, setSelectedTab] = useState<string>('tu_vi');
  const [cultivationList, setCultivationList] = useState<CultivationLeaderboardEntry[]>([]);
  const [loadingCultivation, setLoadingCultivation] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTier, setFilterTier] = useState<'all' | 'tien_nhan' | 'dai_nang' | 'tu_si'>('all');
  const [userRankInfo, setUserRankInfo] = useState<{
    rank: number;
    username: string;
    level: number;
    realmIndex: number;
    realmName: string;
    tier: number;
    subStage: string;
    exp: number;
  } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(3600);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<number>(0);

  // Cáo Thị Vạn Giới state
  const [daoDecrees, setDaoDecrees] = useState<HeavenlyDaoDecree[]>([]);
  const [caoThiFilter, setCaoThiFilter] = useState<string>('all');
  const [selectedDecreeForModal, setSelectedDecreeForModal] = useState<HeavenlyDaoDecree | null>(null);

  // Bảng Xếp Hạng Tông Môn state
  const [sectList, setSectList] = useState<SectLeaderboardEntry[]>(() => getSectsLeaderboard());
  const [loadingSects, setLoadingSects] = useState<boolean>(false);
  const [selectedSectForDetails, setSelectedSectForDetails] = useState<SectLeaderboardEntry | null>(null);
  const [sectNotice, setSectNotice] = useState<string | null>(null);

  useEffect(() => {
    setDaoDecrees(getStoredDaoDecrees());
    const unsub = subscribeToDaoDecrees((newDecree) => {
      setDaoDecrees((prev) => [newDecree, ...prev.filter((d) => d.id !== newDecree.id)]);
    });
    return () => unsub();
  }, []);

  // Kiểm tra quyền Quản trị viên (chỉ Admin mới nhìn thấy nút làm mới bảng xếp hạng)
  const isUserAdmin = Boolean(
    isAdmin ||
    currentUser?.isAdmin ||
    currentUser?.username?.toLowerCase() === 'admin' ||
    checkIsAdmin()
  );

  const tabs = [
    { id: 'tu_vi', name: 'Top 50 Tu Vi', unit: 'Tu Vi', isSpecial: true },
    { id: 'tong_mon', name: 'Bảng Xếp Hạng Tông Môn', unit: 'Tu Vi', isSpecial: true },
    { id: 'cao_thi', name: 'Cáo Thị Vạn Giới', unit: '', isSpecial: true },
    { id: 'vi_dau', name: 'Tiếng Việt Có Dấu', unit: 'WPM' },
    { id: 'vi_nodau', name: 'Tiếng Việt Không Dấu', unit: 'WPM' },
    { id: 'en', name: 'Tiếng Anh', unit: 'WPM' },
    { id: 'numpad', name: 'Bàn Phím Số', unit: 'WPM' },
    { id: 'ngau_hung', name: 'Ngẫu Hứng', unit: 'Điểm' },
    { id: 'doan_chu', name: 'Đoán Chữ', unit: 'Điểm' },
    { id: 'san_boss', name: 'Săn Boss', unit: 'DMG' },
  ];

  const loadSectLeaderboardData = useCallback(async () => {
    setLoadingSects(true);
    try {
      const data = await fetchSectLeaderboard();
      if (data && data.success && Array.isArray(data.topSects) && data.topSects.length > 0) {
        setSectList(data.topSects);
      } else {
        setSectList(getSectsLeaderboard());
      }
    } catch {
      setSectList(getSectsLeaderboard());
    } finally {
      setLoadingSects(false);
    }
  }, []);

  const loadCultivationData = useCallback(async (force?: boolean) => {
    setLoadingCultivation(true);
    try {
      const data = await fetchCultivationLeaderboard({
        username: currentUsername,
        userId: currentUser?.id,
        force,
        cultivation: cultivationState,
      });
      if (data && data.success && Array.isArray(data.top50)) {
        setCultivationList(data.top50);
        if (data.currentUserRank) {
          setUserRankInfo(data.currentUserRank);
        }
        if (data.lastUpdated) {
          setLastUpdatedTime(data.lastUpdated);
        }
        if (typeof data.remainingSeconds === 'number') {
          setRemainingSeconds(data.remainingSeconds);
        }
      }
    } catch (err) {
      console.error('Error fetching cultivation leaderboard:', err);
    } finally {
      setLoadingCultivation(false);
    }
  }, [currentUsername, currentUser?.id, cultivationState]);

  useEffect(() => {
    if (selectedTab === 'tu_vi') {
      loadCultivationData();
    } else if (selectedTab === 'tong_mon') {
      loadSectLeaderboardData();
    }
  }, [selectedTab, loadCultivationData, loadSectLeaderboardData]);

  // Bộ đếm ngược thời gian đến chu kỳ cập nhật 1 giờ kế tiếp
  useEffect(() => {
    if (selectedTab !== 'tu_vi') return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          loadCultivationData();
          return 3600;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedTab, loadCultivationData]);

  // Esc key listener to quickly close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        soundFx.playKeyClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.max(0, Math.floor(totalSeconds / 60));
    const secs = Math.max(0, totalSeconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const filteredCultivationList = useMemo(() => {
    return cultivationList.filter((item) => {
      const q = String(searchQuery || '').toLowerCase();
      const matchesSearch =
        (item.displayName ? String(item.displayName).toLowerCase().includes(q) : false) ||
        (item.username ? String(item.username).toLowerCase().includes(q) : false) ||
        (item.realmName ? String(item.realmName).toLowerCase().includes(q) : false);

      if (!matchesSearch) return false;

      if (filterTier === 'tien_nhan') {
        return item.realmIndex >= 9; // Kim Tiên, Đại La, Thiên Tôn
      }
      if (filterTier === 'dai_nang') {
        return item.realmIndex >= 5 && item.realmIndex <= 8; // Luyện Hư, Hợp Thể, Đại Thừa, Độ Kiếp
      }
      if (filterTier === 'tu_si') {
        return item.realmIndex <= 4; // Luyện Khí -> Hóa Thần
      }
      return true;
    });
  }, [cultivationList, searchQuery, filterTier]);

  const currentScore = highScores[selectedTab];

  // Realm styling helper
  const getRealmBadgeStyle = (realmIndex: number) => {
    const realm = XIANXIA_REALMS[realmIndex] || XIANXIA_REALMS[0];
    return {
      name: realm.name,
      icon: realm.icon,
      titleName: realm.titleName,
      color: realm.colorClass || 'text-amber-400',
      border: realm.borderClass || 'border-amber-500/40',
      bg: 'bg-slate-950/80',
    };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div
        className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 relative flex flex-col h-[90vh] max-h-[740px] min-h-[560px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 min-h-[44px]">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                selectedTab === 'tu_vi'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {selectedTab === 'tu_vi' ? (
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              ) : (
                <Trophy className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                {selectedTab === 'tu_vi' ? (
                  <>
                    <span>BẢNG VÀNG TU TIÊN • TOP 50 TU VI</span>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                      Toàn Server
                    </span>
                  </>
                ) : (
                  'BẢNG VÀNG KỶ LỤC TRONG NGÀY'
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {selectedTab === 'tu_vi'
                  ? 'Xếp hạng 50 đại năng có cảnh giới và tu vi thâm hậu nhất toàn cõi tu chân'
                  : 'Tự động đặt lại lúc 00:00 (GMT+7)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isUserAdmin && (
              <button
                id="btn-refresh-leaderboard"
                type="button"
                onClick={async () => {
                  soundFx.playKeyClick();
                  if (selectedTab === 'tu_vi') {
                    await loadCultivationData(true);
                  }
                  if (onRefreshLeaderboard) {
                    await onRefreshLeaderboard();
                  }
                }}
                disabled={loadingCultivation}
                title="Làm mới bảng xếp hạng (Dành riêng cho Quản trị viên)"
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingCultivation ? 'animate-spin text-amber-400' : ''}`} />
                <span className="hidden sm:inline">Làm mới (Admin)</span>
              </button>
            )}
            <button
              id="btn-close-leaderboard"
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onClose();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Đóng (Esc)"
            >
              <kbd className="hidden sm:inline text-[10px] font-mono font-semibold px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                Esc
              </kbd>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
          {tabs.map((tab) => (
            <button
              id={`tab-leaderboard-${tab.id}`}
              type="button"
              key={tab.id}
              onClick={() => {
                soundFx.playKeyClick();
                setSelectedTab(tab.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedTab === tab.id
                  ? tab.isSpecial
                    ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black shadow-md shadow-amber-500/20'
                    : 'bg-amber-500 text-black shadow-sm font-bold'
                  : tab.isSpecial
                  ? 'text-amber-300 hover:text-white hover:bg-amber-950/40 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.isSpecial ? (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{tab.name}</span>
                </span>
              ) : (
                tab.name
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: TOP 50 TU VI LEADERBOARD */}
        {selectedTab === 'tu_vi' ? (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Search and Category Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between shrink-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm tu sĩ hoặc cảnh giới..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
                <button
                  type="button"
                  onClick={() => setFilterTier('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                    filterTier === 'all'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  Tất cả ({cultivationList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTier('tien_nhan')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                    filterTier === 'tien_nhan'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  👑 Tiên Nhân
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTier('dai_nang')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                    filterTier === 'dai_nang'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  ⚡ Đại Năng
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTier('tu_si')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                    filterTier === 'tu_si'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  🌿 Tu Sĩ
                </button>
              </div>
            </div>

            {/* 1-Hour Periodic Refresh Notice Banner */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-amber-500/20 text-[11px] text-slate-300 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Cập nhật BXH: <b className="text-amber-300">Cứ 1 giờ / lần</b></span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-slate-400 hidden sm:inline">
                  Đợt kế tiếp sau: <b className="text-emerald-400 font-mono">{formatCountdown(remainingSeconds)}</b>
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                Tự động cập nhật
              </span>
            </div>

            {/* List Container */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950">
              {loadingCultivation && cultivationList.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 font-medium">Đang hiệu triệu bảng vàng tu tiên...</p>
                </div>
              ) : filteredCultivationList.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                  <p className="text-sm text-slate-300 font-semibold">
                    {cultivationList.length === 0
                      ? 'Chưa có tu sĩ nào ghi danh trên Bảng Vàng!'
                      : 'Không tìm thấy tu sĩ phù hợp với bộ lọc'}
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {cultivationList.length === 0
                      ? 'Bảng xếp hạng hiển thị 100% người chơi thật. Hãy đăng ký tài khoản và tu luyện gõ phím để trở thành người đầu tiên ghi danh!'
                      : 'Thử tìm kiếm với từ khóa khác hoặc chuyển sang danh mục Tất cả.'}
                  </p>
                </div>
              ) : (
                filteredCultivationList.map((cultivator) => {
                  const isTop1 = cultivator.rank === 1;
                  const isTop2 = cultivator.rank === 2;
                  const isTop3 = cultivator.rank === 3;
                  const isMe =
                    (currentUser && (
                      (cultivator.id && cultivator.id === currentUser.id) ||
                      (cultivator.username && currentUser.username && cultivator.username.toLowerCase() === currentUser.username.toLowerCase())
                    )) ||
                    (currentUsername && (
                      (cultivator.username && cultivator.username.toLowerCase() === currentUsername.toLowerCase()) ||
                      (cultivator.displayName && cultivator.displayName.toLowerCase() === currentUsername.toLowerCase())
                    ));

                  // Đảm bảo tu vi của người chơi trong danh sách luôn đồng bộ tuyệt đối với thực tế
                  const displayRealmIndex = isMe && cultivationState ? cultivationState.realmIndex : (typeof cultivator.realmIndex === 'number' ? cultivator.realmIndex : 0);
                  const displayRealmMeta = XIANXIA_REALMS[displayRealmIndex] || XIANXIA_REALMS[0];
                  const displayRealmName = displayRealmMeta.name;
                  const displayTier = isMe && cultivationState ? cultivationState.tier : (cultivator.tier || 1);
                  const displaySubStage = getSubStage(displayTier);
                  const displayLevel = isMe && cultivationState ? cultivationState.level : (cultivator.level || displayRealmMeta.startLevel);
                  const displayExp = isMe && cultivationState ? cultivationState.exp : (cultivator.exp || 0);
                  const displayThoNguyen = isMe && cultivationState ? cultivationState.thoNguyen : (cultivator.thoNguyen || displayRealmMeta.maxThoNguyen);

                  const realmStyle = getRealmBadgeStyle(displayRealmIndex);

                  return (
                    <div
                      key={cultivator.id || `${cultivator.username}_${cultivator.rank}`}
                      className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl border transition-all ${
                        isMe
                          ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-400/50 shadow-md shadow-amber-500/10'
                          : isTop1
                          ? 'bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-slate-950/70 border-amber-500/50 shadow-md shadow-amber-500/10'
                          : isTop2
                          ? 'bg-gradient-to-r from-slate-800/40 via-slate-900/30 to-slate-950/70 border-slate-500/40'
                          : isTop3
                          ? 'bg-gradient-to-r from-amber-950/30 via-orange-950/20 to-slate-950/70 border-amber-700/40'
                          : 'bg-slate-950/60 hover:bg-slate-800/40 border-slate-800/70'
                      }`}
                    >
                      {/* Rank Indicator */}
                      <div className="w-9 sm:w-10 flex flex-col items-center justify-center shrink-0">
                        {isTop1 ? (
                          <div className="flex flex-col items-center">
                            <span className="text-base select-none">👑</span>
                            <span className="text-xs font-black text-amber-300">#1</span>
                          </div>
                        ) : isTop2 ? (
                          <div className="flex flex-col items-center">
                            <span className="text-base select-none">🥈</span>
                            <span className="text-xs font-black text-slate-200">#2</span>
                          </div>
                        ) : isTop3 ? (
                          <div className="flex flex-col items-center">
                            <span className="text-base select-none">🥉</span>
                            <span className="text-xs font-black text-amber-500">#3</span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-800">
                            #{cultivator.rank}
                          </span>
                        )}
                      </div>

                      {/* Avatar with Frame */}
                      <div className="relative shrink-0">
                        <AvatarWithFrame
                          icon={cultivator.avatar || '⚡'}
                          frameId={cultivator.frame || 'default'}
                          size="md"
                        />
                      </div>

                      {/* User & Realm Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-xs sm:text-sm font-bold truncate ${
                              isMe
                                ? 'text-amber-300 font-black'
                                : isTop1
                                ? 'text-amber-200 font-extrabold'
                                : 'text-white'
                            }`}
                          >
                            {cultivator.displayName || cultivator.username}
                          </span>
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider">
                              Bạn
                            </span>
                          )}
                          {(((cultivator.username && (cultivator.username.toLowerCase() === 'admin' || cultivator.username.toLowerCase() === 'quantrivien'))) || (isMe && checkIsAdmin())) && (
                            <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5 text-amber-400" />
                              Admin
                            </span>
                          )}
                          {/* Danh Hiệu Tiên Đạo (ví dụ: Nguyên Anh Lão Quái) */}
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/40 text-amber-300 font-black text-[10px] shadow-sm tracking-wide"
                            title={`Danh hiệu Tiên Đạo: ${realmStyle.titleName}`}
                          >
                            <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            <span>{realmStyle.titleName}</span>
                          </span>
                        </div>

                        {/* Realm & Sub-stage Badges */}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px]">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-semibold ${realmStyle.bg} ${realmStyle.border} ${realmStyle.color}`}
                          >
                            <span>{realmStyle.icon}</span>
                            <span>{displayRealmName}</span>
                          </span>
                          <span className="text-slate-400 font-mono">
                            Tầng {displayTier}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            • [{displaySubStage}]
                          </span>
                        </div>
                      </div>

                      {/* Level, EXP, and Longevity (Thọ Nguyên) */}
                      <div className="text-right shrink-0 space-y-0.5 font-mono">
                        <div className="text-xs sm:text-sm font-black text-amber-400">
                          Cấp {displayLevel}
                          <span className="text-[10px] font-normal text-slate-500">/1000</span>
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {displayExp.toLocaleString()}
                          <span className="text-[10px] text-slate-500"> Tu Vi</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                          <span className="text-slate-500">⏳ Thọ:</span>
                          <span
                            className={
                              displayRealmIndex >= 11
                                ? 'text-amber-300 font-bold'
                                : displayThoNguyen <= 50
                                ? 'text-rose-400 font-bold'
                                : 'text-slate-300'
                            }
                          >
                            {displayRealmIndex >= 11
                              ? 'Bất Tử'
                              : `${displayThoNguyen.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Current Player Rank Status Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                  <Crown className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  {currentUser ? (
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <span>Đạo hiệu:</span>
                        <b className="text-amber-400">{currentUser.displayName || currentUser.username}</b>
                        {userRankInfo ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black">
                            Hạng #{userRankInfo.rank}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            (Chưa lọt Top 50)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Cảnh giới: {cultivationState ? (
                          <>
                            {XIANXIA_REALMS[cultivationState.realmIndex]?.name || 'Luyện Khí Kỳ'} Tầng {cultivationState.tier} • Danh hiệu: <strong className="text-amber-300">{XIANXIA_REALMS[cultivationState.realmIndex]?.titleName}</strong> • Cấp {cultivationState.level}/1000 • {cultivationState.exp.toLocaleString()} Tu Vi
                          </>
                        ) : (
                          'Chưa nhập môn'
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-200">
                        Chế độ Khách: <span className="text-amber-400 font-bold">{currentUsername || 'Người Chơi'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Chế độ Khách: Khóa Tu Vi & Linh Đài. Đăng nhập để kích hoạt tu tiên và vinh danh Bảng Vàng!
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!currentUser && onOpenAuthModal && (
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-sm shrink-0 flex items-center justify-center gap-1"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Đăng Nhập Ghi Danh</span>
                </button>
              )}
            </div>
          </div>
        ) : selectedTab === 'tong_mon' ? (
          /* TAB: BẢNG XẾP HẠNG TÔNG MÔN DỰA TRÊN TỔNG TU VI THÀNH VIÊN */
          <div className="flex-1 min-h-0 flex flex-col space-y-3">
            {/* Header intro & Search */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-cyan-950/30 to-slate-950 border border-amber-500/30 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400/30 to-cyan-500/30 border border-amber-400/50 flex items-center justify-center text-lg shadow-sm shrink-0">
                  <span>🏰</span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5 truncate">
                    <span>Bảng Vàng Tông Môn Đệ Nhất Thiên Hạ</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {sectList.length} Tiên Môn
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300 truncate">
                    Xếp hạng thực tế dựa trên <strong>Tổng Tu Vi của toàn thể Chưởng Môn & Đệ Tử</strong>
                  </p>
                </div>
              </div>

              {/* Search & Refresh */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên môn phái, tag..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    loadSectLeaderboardData();
                  }}
                  disabled={loadingSects}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                  title="Cập nhật Bảng Vàng Tông Môn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSects ? 'animate-spin text-amber-400' : ''}`} />
                  <span className="hidden sm:inline">Làm mới</span>
                </button>
              </div>
            </div>

            {/* Notice Toast */}
            {sectNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
                <span>{sectNotice}</span>
                <button
                  type="button"
                  onClick={() => setSectNotice(null)}
                  className="text-slate-400 hover:text-white ml-2 text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Sect Cards List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {loadingSects ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>Đang hội tụ linh khí chư phái...</span>
                </div>
              ) : sectList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Chưa có tông môn nào được ghi danh.
                </div>
              ) : (
                sectList
                  .filter((s) => {
                    const q = String(searchQuery || '').toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (s.name ? s.name.toLowerCase().includes(q) : false) ||
                      (s.tag ? s.tag.toLowerCase().includes(q) : false) ||
                      (s.leaderName ? s.leaderName.toLowerCase().includes(q) : false)
                    );
                  })
                  .map((sect) => {
                    const isTop1 = sect.rank === 1;
                    const isTop2 = sect.rank === 2;
                    const isTop3 = sect.rank === 3;
                    const isMySect = cultivationState?.sect?.sectId === sect.id;

                    return (
                      <div
                        key={sect.id}
                        className={`p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between gap-3 ${
                          isTop1
                            ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
                            : isTop2
                            ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-slate-300/60 shadow-[0_0_15px_rgba(203,213,225,0.15)]'
                            : isTop3
                            ? 'bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 border-amber-600/60 shadow-[0_0_12px_rgba(217,119,6,0.15)]'
                            : isMySect
                            ? 'bg-slate-900/90 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Rank & Crest & Sect Identity */}
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Rank Indicator */}
                            <div className="w-10 text-center shrink-0">
                              {isTop1 ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-xl animate-bounce">👑</span>
                                  <span className="text-[11px] font-black text-amber-300">#1</span>
                                </div>
                              ) : isTop2 ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-xl">🥈</span>
                                  <span className="text-[11px] font-black text-slate-200">#2</span>
                                </div>
                              ) : isTop3 ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-xl">🥉</span>
                                  <span className="text-[11px] font-black text-amber-500">#3</span>
                                </div>
                              ) : (
                                <span className="text-xs font-mono font-black text-slate-400 px-2 py-1 rounded bg-slate-900 border border-slate-800">
                                  #{sect.rank}
                                </span>
                              )}
                            </div>

                            {/* Sect Icon */}
                            <div className="text-3xl p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner shrink-0">
                              {sect.badgeIcon}
                            </div>

                            {/* Name & Tags */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm sm:text-base font-black text-white truncate">
                                  {sect.name}
                                </h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 uppercase font-mono">
                                  {sect.tag}
                                </span>
                                {isTop1 && (
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase tracking-wider animate-pulse">
                                    Thiên Hạ Đệ Nhất Phái
                                  </span>
                                )}
                                {isMySect && (
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 uppercase">
                                    Tông Môn Của Bạn
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-300 italic mt-0.5 line-clamp-1">
                                &ldquo;{sect.slogan || sect.description}&rdquo;
                              </p>

                              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                                <span>
                                  Chưởng Môn: <strong className="text-amber-300">{sect.leaderName}</strong>
                                </span>
                                <span className="text-slate-600">•</span>
                                <span>
                                  Đệ Tử: <strong className="text-emerald-400">{sect.memberCount} vị</strong>
                                </span>
                                <span className="text-slate-600">•</span>
                                <span>
                                  Linh Mạch: <strong className="text-cyan-300">Cấp {sect.linhMachLevel}/5</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Cultivation Total & Actions */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 shrink-0">
                            {/* Total Member Cultivation Score */}
                            <div className="text-left sm:text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                Tổng Tu Vi Thành Viên
                              </span>
                              <div className="text-base sm:text-lg font-mono font-black text-amber-300 flex items-center sm:justify-end gap-1">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                <span>{(sect.totalTuVi || 0).toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  soundFx.playKeyClick();
                                  setSelectedSectForDetails(sect);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Xem danh sách đệ tử và thứ bậc"
                              >
                                <Users className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Đệ Tử & Chức Vị</span>
                              </button>

                              {!isMySect ? (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    soundFx.playKeyClick();
                                    const res = await serverJoinSect(sect.id);
                                    if (res.success) {
                                      soundFx.playVictory();
                                      setSectNotice(`Đã bái nhập ${sect.name} [${sect.tag}] thành công!`);
                                      loadSectLeaderboardData();
                                    } else {
                                      soundFx.playError();
                                      setSectNotice(res.error || 'Bái nhập thất bại.');
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-xs font-black hover:brightness-110 shadow-sm transition-all cursor-pointer"
                                >
                                  Bái Nhập Phái
                                </button>
                              ) : (
                                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Đang Tham Gia</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Bottom Current User Sect Status */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 text-xs">
                <span className="text-slate-400 font-bold">Thân Phận Tông Môn Hiện Tại:</span>
                {cultivationState?.sect?.sectId ? (
                  <div className="flex items-center gap-2">
                    <span className="font-black text-amber-300">
                      {cultivationState.sect.sectName} [{cultivationState.sect.sectTag}]
                    </span>
                    {(() => {
                      const roleKey = cultivationState.sect.role || 'ngoai_mon';
                      const roleConfig = SECT_ROLES_CONFIG[roleKey] || SECT_ROLES_CONFIG.ngoai_mon;
                      return (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleConfig.colorClass} ${roleConfig.borderClass} ${roleConfig.bgClass}`}>
                          {roleConfig.badge} {roleConfig.title}
                        </span>
                      );
                    })()}
                    <span className="text-[11px] font-mono text-cyan-300">
                      (Cống hiến: {(cultivationState.sect.contribution || 0).toLocaleString()} Điểm)
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Chưa bái nhập môn phái nào (Tán tu)</span>
                )}
              </div>

              {!cultivationState?.sect?.sectId && (
                <span className="text-[11px] text-amber-400 font-bold">
                  Bái nhập phái để tích lũy tu vi cho tông môn & nhận buff Linh Mạch!
                </span>
              )}
            </div>
          </div>
        ) : selectedTab === 'cao_thi' ? (
          /* TAB 2: BẢNG CÁO THỊ VẠN GIỚI (BIÊN NIÊN SỬ THIÊN ĐẠO) */
          <div className="flex-1 min-h-0 flex flex-col space-y-3">
            {/* Header intro & Filters */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-slate-950 border border-amber-500/30 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400/30 to-purple-600/30 border border-amber-400/50 flex items-center justify-center text-base shadow-sm shrink-0">
                  <span className="animate-[spin_12s_linear_infinite]">☯️</span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5 truncate">
                    <span>Bảng Cáo Thị Vạn Giới</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {daoDecrees.length} sự kiện
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">
                    Biên niên sử lưu giữ toàn bộ đại sự, chiếu thư và sấm truyền toàn cõi Tiên Giới
                  </p>
                </div>
              </div>

              {/* Event Type Filter Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 shrink-0 text-[10px]">
                {[
                  { id: 'all', label: 'Tất Cả' },
                  { id: 'record', label: 'Kim Bảng', icon: '👑' },
                  { id: 'breakthrough', label: 'Dị Tượng', icon: '🌟' },
                  { id: 'boss_kill', label: 'Ma Thần', icon: '🐉' },
                  { id: 'penalty', label: 'Thiên Lôi', icon: '⚡' },
                  { id: 'guidance', label: 'Chỉ Điểm', icon: '🍵' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setCaoThiFilter(f.id);
                    }}
                    className={`px-2 py-1 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                      caoThiFilter === f.id
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {f.icon && <span className="mr-0.5">{f.icon}</span>}
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Decree Cards List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
              {daoDecrees
                .filter((d) => caoThiFilter === 'all' || d.eventType === caoThiFilter)
                .map((decree) => {
                  const isBreakthrough = decree.eventType === 'breakthrough';
                  const isRecord = decree.eventType === 'record';
                  const isBossKill = decree.eventType === 'boss_kill';
                  const isPenalty = decree.eventType === 'penalty';

                  const badgeClass = isBreakthrough
                    ? 'bg-purple-950/80 text-purple-200 border-purple-500/50'
                    : isRecord
                    ? 'bg-amber-950/80 text-amber-200 border-amber-500/50'
                    : isBossKill
                    ? 'bg-red-950/80 text-red-200 border-red-500/50'
                    : isPenalty
                    ? 'bg-rose-950/80 text-rose-200 border-rose-500/50'
                    : 'bg-cyan-950/80 text-cyan-200 border-cyan-500/50';

                  const badgeIcon = isBreakthrough
                    ? '🌟'
                    : isRecord
                    ? '👑'
                    : isBossKill
                    ? '🐉'
                    : isPenalty
                    ? '⚡'
                    : '🍵';

                  return (
                    <div
                      key={decree.id}
                      className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/40 transition-all space-y-2 group shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${badgeClass}`}>
                            <span>{badgeIcon}</span>
                            <span>{decree.title}</span>
                          </span>

                          {decree.targetUser && (
                            <span className="text-xs font-bold text-amber-300 truncate">
                              @{decree.targetUser}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(decree.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(decree.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playKeyClick();
                              setSelectedDecreeForModal(decree);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Mở toàn văn Thiên Đạo Chiếu Thư"
                          >
                            <Scroll className="w-3 h-3 text-amber-400" />
                            <span>Chiếu Thư</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-200 font-sans leading-relaxed">
                        {decree.content}
                      </p>

                      {(decree.wpm || decree.realmName) && (
                        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono">
                          {decree.wpm && (
                            <span className="text-emerald-400 font-bold">
                              ⚡ Tốc độ: {decree.wpm} WPM
                            </span>
                          )}
                          {decree.accuracy && (
                            <span className="text-cyan-400">
                              🎯 Chuẩn xác: {decree.accuracy}%
                            </span>
                          )}
                          {decree.realmName && (
                            <span className="text-purple-300 font-semibold">
                              🪷 Cảnh giới: {decree.realmName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          /* TAB 2: STANDARD GAME MODES HIGH SCORE */
          <div className="flex-1 min-h-0 flex flex-col justify-between space-y-3">
            <div className="flex-1 min-h-0 flex flex-col justify-center items-center p-6 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 text-center space-y-4 shadow-inner">
              {currentScore ? (
                <div className="space-y-3 max-w-md w-full">
                  <div className="relative inline-flex items-center justify-center pt-2">
                    <AvatarWithFrame
                      icon={currentScore.avatar || '⚡'}
                      frameId={currentScore.frame || 'default'}
                      size="lg"
                    />
                    <span className="absolute -top-1.5 -right-2 text-2xl filter drop-shadow-md select-none animate-bounce">
                      👑
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-amber-400 uppercase tracking-widest font-bold">
                      Quán Quân Đang Nắm Giữ
                    </div>
                    <div className="text-xl font-black text-white mt-0.5">
                      {currentScore.displayName || currentScore.username}
                    </div>
                  </div>

                  <div className="flex justify-center items-baseline gap-2 font-mono">
                    <span className="text-4xl sm:text-5xl font-black text-amber-400">
                      {currentScore.score > 0 ? currentScore.score : currentScore.wpm}
                    </span>
                    <span className="text-sm font-bold text-slate-400">
                      {tabs.find((t) => t.id === selectedTab)?.unit}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800 font-mono">
                    <span>
                      Số lỗi: <b className="text-rose-400">{currentScore.errors}</b>
                    </span>
                    <span>•</span>
                    <span>
                      Thiết lập: {new Date(currentScore.timestamp).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-8 space-y-2 text-slate-400 max-w-md w-full">
                  <Flame className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold">Chưa có kỷ lục nào trong ngày hôm nay!</p>
                  <p className="text-xs text-slate-500">
                    Hãy là người đầu tiên thi đấu và ghi danh vào Bảng Vàng!
                  </p>
                </div>
              )}
            </div>

            {/* Rule banner */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2 shrink-0">
              <span className="text-sm select-none">⚖️</span>
              <span>
                <b>Điều kiện vinh danh:</b> Ván đấu phải diễn ra trọn vẹn từ đầu đến cuối. Người chơi đầu hàng hoặc rời phòng (out) sẽ không được ghi danh dù đủ điểm.
              </span>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center pt-1 border-t border-slate-800/60 shrink-0">
          <button
            id="btn-dismiss-leaderboard"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider transition-all"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Standalone Dao Decree Popup Modal when clicked */}
      <DaoDecreeModal
        decree={selectedDecreeForModal}
        isOpen={Boolean(selectedDecreeForModal)}
        onClose={() => setSelectedDecreeForModal(null)}
      />

      {/* Standalone Sect Members & Hierarchy Roster Modal */}
      {selectedSectForDetails && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 rounded-2xl bg-slate-950 border border-amber-500/40 shadow-inner">
                  {selectedSectForDetails.badgeIcon}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white">
                      {selectedSectForDetails.name}
                    </h3>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                      {selectedSectForDetails.tag}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Hạng #{selectedSectForDetails.rank}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 italic mt-0.5">
                    &ldquo;{selectedSectForDetails.slogan || selectedSectForDetails.description}&rdquo;
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSectForDetails(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sect Overview Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs shrink-0">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Tổng Tu Vi</span>
                <span className="text-sm font-mono font-black text-amber-400">
                  {(selectedSectForDetails.totalTuVi || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Đệ Tử Đồng Môn</span>
                <span className="text-sm font-mono font-black text-emerald-400">
                  {selectedSectForDetails.members?.length || selectedSectForDetails.memberCount} Vị
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Linh Mạch Động Phủ</span>
                <span className="text-sm font-mono font-black text-cyan-400">
                  Cấp {selectedSectForDetails.linhMachLevel}/5
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Tổng Cống Hiến</span>
                <span className="text-sm font-mono font-black text-purple-400">
                  {(selectedSectForDetails.totalContribution || 0).toLocaleString()} Điểm
                </span>
              </div>
            </div>

            {/* Disciples Roster Grouped by Hierarchy */}
            <div className="flex-1 min-h-0 flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                <span>Thứ Bậc & Danh Sách Đệ Tử (Chưởng Môn ➜ Ngoại Môn)</span>
                <span>{selectedSectForDetails.members?.length || 0} Thành viên</span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {(!selectedSectForDetails.members || selectedSectForDetails.members.length === 0) ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Chưa có danh sách chi tiết đệ tử.
                  </div>
                ) : (
                  // Sort by hierarchy: chuong_mon (5) > dai_truong_lao (4) > chan_truyen (3) > noi_mon (2) > ngoai_mon (1)
                  [...selectedSectForDetails.members]
                    .sort((a, b) => {
                      const rankA = SECT_ROLES_CONFIG[a.role]?.rankLevel || 1;
                      const rankB = SECT_ROLES_CONFIG[b.role]?.rankLevel || 1;
                      if (rankB !== rankA) return rankB - rankA;
                      return (b.tuViScore || 0) - (a.tuViScore || 0);
                    })
                    .map((m, idx) => {
                      const roleConfig = SECT_ROLES_CONFIG[m.role] || SECT_ROLES_CONFIG.ngoai_mon;
                      const isMe = currentUsername && m.username && m.username.toLowerCase() === currentUsername.toLowerCase();

                      return (
                        <div
                          key={`${m.userId}-${idx}`}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            m.role === 'chuong_mon'
                              ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border-amber-400/60 shadow-sm'
                              : m.role === 'dai_truong_lao'
                              ? 'bg-slate-950/90 border-purple-500/40'
                              : m.role === 'chan_truyen'
                              ? 'bg-slate-950/80 border-cyan-500/40'
                              : isMe
                              ? 'bg-slate-900 border-amber-400'
                              : 'bg-slate-950/60 border-slate-800'
                          }`}
                        >
                          {/* Member info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <AvatarWithFrame
                                icon={m.avatar || '⚡'}
                                frameId={m.frame || 'default'}
                                size="sm"
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold truncate ${isMe ? 'text-amber-300 font-black' : 'text-white'}`}>
                                  {m.displayName || m.username}
                                </span>
                                {isMe && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[9px] font-black uppercase">
                                    Bạn
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleConfig.colorClass} ${roleConfig.borderClass} ${roleConfig.bgClass} uppercase font-mono`}>
                                  {roleConfig.badge} {roleConfig.title}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{m.realmIcon} {m.realmName} Cấp {m.level}</span>
                                <span className="text-slate-600">•</span>
                                <span>Cống hiến: <strong className="text-amber-300">{m.contribution.toLocaleString()}</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* Member Tu Vi Contribution */}
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-slate-500 block">Tu Vi Đóng Góp</span>
                            <span className="text-xs font-mono font-black text-cyan-300">
                              {(m.tuViScore || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-400">
                Đặc quyền Chưởng Môn: Tấn phong chức vụ từ Chưởng Môn đến Ngoại Môn tại Động Phủ Tông Môn.
              </span>

              <div className="flex items-center gap-2">
                {cultivationState?.sect?.sectId !== selectedSectForDetails.id && (
                  <button
                    type="button"
                    onClick={async () => {
                      soundFx.playKeyClick();
                      const res = await serverJoinSect(selectedSectForDetails.id);
                      if (res.success) {
                        soundFx.playVictory();
                        setSectNotice(`Đã bái nhập ${selectedSectForDetails.name} thành công!`);
                        setSelectedSectForDetails(null);
                        loadSectLeaderboardData();
                      } else {
                        soundFx.playError();
                        setSectNotice(res.error || 'Bái nhập thất bại.');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-md cursor-pointer"
                  >
                    Bái Nhập Phái
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedSectForDetails(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

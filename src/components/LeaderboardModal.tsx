import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HighScoreRecord,
  LeaderboardEntry,
  LeaderboardTimePeriod,
  LeaderboardGroup,
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
  Gift,
  Ghost,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Target,
} from 'lucide-react';
import { AvatarWithFrame, checkIsAdmin } from '../utils/frames';
import {
  fetchCultivationLeaderboard,
  fetchSectLeaderboard,
  serverJoinSect,
  fetchLeaderboardFull,
} from '../utils/roomManager';
import {
  XIANXIA_REALMS,
  CultivationState,
  getSubStage,
  getSectsLeaderboard,
  SECT_ROLES_CONFIG,
} from '../utils/cultivation';
import { getStoredDaoDecrees, subscribeToDaoDecrees } from '../utils/heavenlyDaoBot';
import { DaoDecreeModal } from './DaoDecreeModal';
import { InspectPlayerModal } from './InspectPlayerModal';
import { SeasonRewardsModal } from './SeasonRewardsModal';
import { VirtualList, VirtualListHandle } from './VirtualList';

interface LeaderboardModalProps {
  highScores: Record<string, HighScoreRecord | null>;
  onClose: () => void;
  currentUsername?: string;
  currentUser?: UserAccount | null;
  cultivationState?: CultivationState;
  onOpenAuthModal?: () => void;
  isAdmin?: boolean;
  onRefreshLeaderboard?: () => Promise<void> | void;
  onStartGhostChallenge?: (entry: LeaderboardEntry) => void;
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
  onStartGhostChallenge,
}) => {
  // Top-Level Group Tabs: ⚔️ Chiến Trường Tốc Ký & 🪷 Cõi Tu Tiên & Tông Môn
  const [activeGroup, setActiveGroup] = useState<LeaderboardGroup>('battle');
  const [selectedTab, setSelectedTab] = useState<string>('vi_dau');
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardTimePeriod>('daily');

  // Multi-Period Rankings cache from server
  const [multiRankings, setMultiRankings] = useState<
    Record<string, { daily: LeaderboardEntry[]; weekly: LeaderboardEntry[]; all_time: LeaderboardEntry[] }>
  >({});
  const [loadingRankings, setLoadingRankings] = useState<boolean>(false);

  // Tu Vi state
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

  // Cáo Thị Vạn Giới state
  const [daoDecrees, setDaoDecrees] = useState<HeavenlyDaoDecree[]>([]);
  const [selectedDecreeForModal, setSelectedDecreeForModal] = useState<HeavenlyDaoDecree | null>(null);

  // Bảng Xếp Hạng Tông Môn state
  const [sectList, setSectList] = useState<SectLeaderboardEntry[]>(() => getSectsLeaderboard());
  const [loadingSects, setLoadingSects] = useState<boolean>(false);
  const [selectedSectForDetails, setSelectedSectForDetails] = useState<SectLeaderboardEntry | null>(null);

  // Modals for inspecting player & claiming rewards
  const [inspectPlayer, setInspectPlayer] = useState<LeaderboardEntry | null>(null);
  const [isRewardsModalOpen, setIsRewardsModalOpen] = useState<boolean>(false);

  // Virtual Scrolling refs & highlight state for smooth 60fps scrolling
  const battleVirtualListRef = React.useRef<VirtualListHandle>(null);
  const cultivationVirtualListRef = React.useRef<VirtualListHandle>(null);
  const sectVirtualListRef = React.useRef<VirtualListHandle>(null);
  const decreeVirtualListRef = React.useRef<VirtualListHandle>(null);
  const [highlightedRank, setHighlightedRank] = useState<number | null>(null);

  // Load Multi-Period Leaderboard from server
  const loadLeaderboardData = useCallback(async () => {
    setLoadingRankings(true);
    try {
      const data = await fetchLeaderboardFull();
      if (data && data.rankings) {
        setMultiRankings(data.rankings);
      }
    } catch (err) {
      console.warn('Failed to load multi-period rankings:', err);
    } finally {
      setLoadingRankings(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboardData();
  }, [loadLeaderboardData]);

  // Subscribe to Dao Decrees
  useEffect(() => {
    setDaoDecrees(getStoredDaoDecrees());
    const unsub = subscribeToDaoDecrees((newDecree) => {
      setDaoDecrees((prev) => [newDecree, ...prev.filter((d) => d.id !== newDecree.id)]);
    });
    return () => unsub();
  }, []);

  // Admin Check
  const isUserAdmin = Boolean(
    isAdmin ||
    currentUser?.isAdmin ||
    currentUser?.username?.toLowerCase() === 'admin' ||
    checkIsAdmin()
  );

  // Tabs Definitions grouped by Category
  const speedTabs = [
    { id: 'vi_dau', name: 'Tiếng Việt Có Dấu', unit: 'WPM', icon: '🇻🇳' },
    { id: 'vi_nodau', name: 'Tiếng Việt Không Dấu', unit: 'WPM', icon: '⚡' },
    { id: 'en', name: 'Tiếng Anh', unit: 'WPM', icon: '🌐' },
    { id: 'numpad', name: 'Bàn Phím Số', unit: 'WPM', icon: '🔢' },
    { id: 'ngau_hung', name: 'Ngẫu Hứng', unit: 'Điểm', icon: '🎲' },
    { id: 'doan_chu', name: 'Đoán Chữ', unit: 'Điểm', icon: '🧩' },
  ];

  const cultivationTabs = [
    { id: 'tu_vi', name: 'Top 50 Tu Vi', unit: 'Tu Vi', isSpecial: true, icon: '🪷' },
    { id: 'tong_mon', name: 'Bảng Tông Môn', unit: 'Tu Vi', isSpecial: true, icon: '🏰' },
    { id: 'san_boss', name: 'Săn Boss Ma Thần', unit: 'DMG', isSpecial: true, icon: '🐉' },
    { id: 'cao_thi', name: 'Cáo Thị Vạn Giới', unit: '', isSpecial: true, icon: '📜' },
  ];

  const currentTabConfig = useMemo(() => {
    const all = [...speedTabs, ...cultivationTabs];
    return all.find((t) => t.id === selectedTab) || speedTabs[0];
  }, [selectedTab]);

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
    } else if (selectedTab === 'san_boss' || speedTabs.some((t) => t.id === selectedTab)) {
      loadLeaderboardData();
    }
  }, [selectedTab, loadCultivationData, loadSectLeaderboardData, loadLeaderboardData]);

  // Periodic Countdown for Tu Vi refresh
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
      if (e.key === 'Escape' && !selectedDecreeForModal && !selectedSectForDetails && !inspectPlayer && !isRewardsModalOpen) {
        e.preventDefault();
        e.stopPropagation();
        soundFx.playKeyClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose, selectedDecreeForModal, selectedSectForDetails, inspectPlayer, isRewardsModalOpen]);

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.max(0, Math.floor(totalSeconds / 60));
    const secs = Math.max(0, totalSeconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Filtered Tu Vi list
  const filteredCultivationList = useMemo(() => {
    return cultivationList.filter((item) => {
      const q = String(searchQuery || '').toLowerCase();
      const matchesSearch =
        (item.displayName ? String(item.displayName).toLowerCase().includes(q) : false) ||
        (item.username ? String(item.username).toLowerCase().includes(q) : false) ||
        (item.realmName ? String(item.realmName).toLowerCase().includes(q) : false);

      if (!matchesSearch) return false;

      if (filterTier === 'tien_nhan') return item.realmIndex >= 9;
      if (filterTier === 'dai_nang') return item.realmIndex >= 5 && item.realmIndex <= 8;
      if (filterTier === 'tu_si') return item.realmIndex <= 4;
      return true;
    });
  }, [cultivationList, searchQuery, filterTier]);

  // Current Mode's Multi-Period Ranked List (Top 20)
  const currentModeRankings: LeaderboardEntry[] = useMemo(() => {
    const modeData = multiRankings[selectedTab];
    if (modeData && Array.isArray(modeData[selectedPeriod])) {
      return modeData[selectedPeriod];
    }
    // Fallback: If no server ranking array yet, fallback to single Top 1 if available
    const fallbackTop1 = highScores[selectedTab];
    if (fallbackTop1) {
      return [
        {
          rank: 1,
          userId: fallbackTop1.userId,
          username: fallbackTop1.username,
          displayName: fallbackTop1.displayName || fallbackTop1.username,
          avatar: fallbackTop1.avatar || '⚡',
          frame: fallbackTop1.frame || 'default',
          wpm: fallbackTop1.wpm || 0,
          score: fallbackTop1.score || 0,
          errors: fallbackTop1.errors || 0,
          accuracy: fallbackTop1.accuracy || 100,
          timestamp: fallbackTop1.timestamp || Date.now(),
          isVerified: fallbackTop1.isVerified ?? true,
          realmName: 'Luyện Khí Kỳ',
          keyboardSwitch: 'Cherry MX Blue',
        },
      ];
    }
    return [];
  }, [multiRankings, selectedTab, selectedPeriod, highScores]);

  // Top 3 Podium Extraction
  const top1Player = currentModeRankings[0] || null;
  const top2Player = currentModeRankings[1] || null;
  const top3Player = currentModeRankings[2] || null;

  // The rest of the ranking list (Ranks 4..20)
  const restRankings = useMemo(() => {
    return currentModeRankings.slice(3);
  }, [currentModeRankings]);

  // My Rank Calculation for Sticky Bar
  const myRankData = useMemo(() => {
    const myId = currentUser?.id;
    const myName = (currentUsername || currentUser?.username || '').toLowerCase();

    const foundIdx = currentModeRankings.findIndex(
      (item) =>
        (myId && item.userId && item.userId === myId) ||
        (item.username && item.username.toLowerCase() === myName)
    );

    const isScoreMode = selectedTab === 'ngau_hung' || selectedTab === 'doan_chu' || selectedTab === 'san_boss';

    if (foundIdx !== -1) {
      const myEntry = currentModeRankings[foundIdx];
      const top1 = currentModeRankings[0];
      const myVal = isScoreMode ? myEntry.score : myEntry.wpm;
      const top1Val = isScoreMode ? top1.score : top1.wpm;
      const gapToTop1 = Math.max(0, top1Val - myVal);

      return {
        hasRank: true,
        rank: myEntry.rank,
        entry: myEntry,
        scoreVal: myVal,
        gapToTop1,
        isChampion: myEntry.rank === 1,
      };
    }

    // User has not reached top 20
    const top1 = currentModeRankings[0];
    const top10 = currentModeRankings[9] || currentModeRankings[currentModeRankings.length - 1];
    const top1Val = top1 ? (isScoreMode ? top1.score : top1.wpm) : 0;
    const top10Val = top10 ? (isScoreMode ? top10.score : top10.wpm) : 0;

    return {
      hasRank: false,
      rank: 0,
      entry: null,
      scoreVal: 0,
      gapToTop1: top1Val,
      gapToTop10: top10Val,
      isChampion: false,
    };
  }, [currentModeRankings, currentUser?.id, currentUser?.username, currentUsername, selectedTab]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-3 relative flex flex-col h-[92vh] max-h-[820px] min-h-[580px] text-left">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/90 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/25 via-yellow-400/20 to-amber-500/25 text-amber-300 border border-amber-500/40 shrink-0">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>PHONG THẦN KIM BẢNG • BẢNG VÀNG KỶ LỤC</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  Toàn Server
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Xếp hạng vinh danh Top 20 cao thủ tốc ký & đại năng tu tiên toàn cõi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Season Rewards Button */}
            <button
              id="btn-season-rewards"
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setIsRewardsModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 hover:from-amber-500/30 hover:to-yellow-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Xem và nhận phần thưởng Đăng Đỉnh mùa giải"
            >
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Phần Thưởng Đăng Đỉnh</span>
              <span className="sm:hidden">Thưởng</span>
            </button>

            {/* Admin Refresh */}
            {isUserAdmin && (
              <button
                id="btn-refresh-leaderboard"
                type="button"
                onClick={async () => {
                  soundFx.playKeyClick();
                  if (selectedTab === 'tu_vi') {
                    await loadCultivationData(true);
                  } else {
                    await loadLeaderboardData();
                  }
                  if (onRefreshLeaderboard) {
                    await onRefreshLeaderboard();
                  }
                }}
                disabled={loadingRankings || loadingCultivation}
                title="Làm mới bảng xếp hạng (Dành riêng cho Quản trị viên)"
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRankings || loadingCultivation ? 'animate-spin text-amber-400' : ''}`} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            )}

            {/* Close Button */}
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

        {/* Smart Grouping: 2 Main Category Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveGroup('battle');
              if (!speedTabs.some((t) => t.id === selectedTab)) {
                setSelectedTab('vi_dau');
              }
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeGroup === 'battle'
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>⚔️ CHIẾN TRƯỜNG TỐC KÝ (TOP 20)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveGroup('cultivation');
              if (!cultivationTabs.some((t) => t.id === selectedTab)) {
                setSelectedTab('tu_vi');
              }
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeGroup === 'cultivation'
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>🪷 CÕI TU TIÊN & TÔNG MÔN</span>
          </button>
        </div>

        {/* Secondary Sub-Tabs according to Active Group */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80 shrink-0">
          {(activeGroup === 'battle' ? speedTabs : cultivationTabs).map((tab) => (
            <button
              id={`tab-leaderboard-${tab.id}`}
              type="button"
              key={tab.id}
              onClick={() => {
                soundFx.playKeyClick();
                setSelectedTab(tab.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedTab === tab.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-black shadow-sm shadow-amber-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Multi-Period Filter (Daily / Weekly / All-Time) - Available on all speed modes & san_boss */}
        {(activeGroup === 'battle' || selectedTab === 'san_boss') && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 shrink-0 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Chu kỳ xếp hạng:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setSelectedPeriod('daily');
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedPeriod === 'daily'
                      ? 'bg-amber-400 text-black shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  ☀️ Hôm Nay (Daily)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setSelectedPeriod('weekly');
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedPeriod === 'weekly'
                      ? 'bg-amber-400 text-black shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  📅 Tuần Này (Weekly)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setSelectedPeriod('all_time');
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedPeriod === 'all_time'
                      ? 'bg-amber-400 text-black shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  🏛️ Điện Danh Vọng (All-Time)
                </button>
              </div>

              <span
                className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 text-[10px] font-mono font-medium"
                title="Tự động áp dụng cuộn ảo (Virtual Scrolling) tối ưu 60 FPS cho danh sách dài"
              >
                <Zap className="w-3 h-3 text-cyan-400 animate-pulse" />
                Cuộn ảo 60 FPS
              </span>
            </div>
          </div>
        )}

        {/* TAB BODY CONTENT */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* TAB: TOP 50 TU VI */}
          {selectedTab === 'tu_vi' ? (
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              {/* Search & Filter */}
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

                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFilterTier('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
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
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
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
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
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
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                      filterTier === 'tu_si'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    🌿 Tu Sĩ
                  </button>
                </div>
              </div>

              {/* Notice Banner */}
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

              {/* Cultivators List with Virtual Scrolling */}
              <div className="flex-1 min-h-0 flex flex-col">
                {loadingCultivation && cultivationList.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">Đang hiệu triệu bảng vàng tu tiên...</p>
                  </div>
                ) : (
                  <VirtualList<CultivationLeaderboardEntry>
                    ref={cultivationVirtualListRef}
                    items={filteredCultivationList}
                    estimateItemHeight={72}
                    gap={8}
                    keyExtractor={(cultivator) => cultivator.id || `${cultivator.username}_${cultivator.rank}`}
                    className="flex-1 min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950"
                    emptyComponent={
                      <div className="py-12 px-4 text-center space-y-2 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                        <p className="text-sm text-slate-300 font-semibold">Chưa có tu sĩ nào trong danh mục này</p>
                      </div>
                    }
                    renderItem={(cultivator) => {
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
                      const isHighlighted = highlightedRank === cultivator.rank;

                      return (
                        <div
                          key={cultivator.id || `${cultivator.username}_${cultivator.rank}`}
                          onClick={() => {
                            soundFx.playKeyClick();
                            setInspectPlayer({
                              rank: cultivator.rank,
                              userId: cultivator.id,
                              username: cultivator.username,
                              displayName: cultivator.displayName || cultivator.username,
                              avatar: cultivator.avatar || '⚡',
                              frame: cultivator.frame || 'default',
                              wpm: 0,
                              score: cultivator.tuViScore || 0,
                              errors: 0,
                              accuracy: 100,
                              timestamp: Date.now(),
                              isVerified: true,
                              realmName: cultivator.realmName,
                              level: cultivator.level,
                              sectName: cultivator.sectName,
                              sectTag: cultivator.sectTag,
                              keyboardSwitch: 'Cherry MX Blue Clicky',
                            });
                          }}
                          className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer ${
                            isHighlighted
                              ? 'ring-2 ring-yellow-400 bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 animate-pulse'
                              : isMe
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
                          {/* Rank */}
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

                          {/* Avatar */}
                          <div className="relative shrink-0">
                            <AvatarWithFrame
                              icon={cultivator.avatar || '⚡'}
                              frameId={cultivator.frame || 'default'}
                              size="md"
                            />
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold truncate text-white">
                                {cultivator.displayName || cultivator.username}
                              </span>
                              {isMe && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-400 text-black text-[9px] font-black uppercase">
                                  Bạn
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-amber-400">
                                {cultivator.realmName} ({cultivator.subStage})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Cấp {cultivator.level} • {cultivator.sectName ? `${cultivator.sectName} [${cultivator.sectTag}]` : 'Tán tu'}
                            </div>
                          </div>

                          {/* Tu Vi Score */}
                          <div className="text-right shrink-0">
                            <div className="text-sm sm:text-base font-black font-mono text-amber-400">
                              {(cultivator.tuViScore || 0).toLocaleString()}
                            </div>
                            <span className="text-[9px] text-slate-500 uppercase font-bold">
                              Tu Vi
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                )}
              </div>
            </div>
          ) : selectedTab === 'tong_mon' ? (
            /* TAB: BẢNG TÔNG MÔN with Virtual Scrolling */
            <VirtualList<SectLeaderboardEntry>
              ref={sectVirtualListRef}
              items={sectList}
              estimateItemHeight={76}
              gap={8}
              keyExtractor={(sect) => sect.id}
              className="flex-1 min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700"
              renderItem={(sect) => (
                <div
                  key={sect.id}
                  onClick={() => setSelectedSectForDetails(sect)}
                  className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-slate-900 border border-slate-700">
                      {sect.badgeIcon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{sect.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                          {sect.tag}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                          Hạng #{sect.rank}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 italic mt-0.5">
                        &ldquo;{sect.slogan || sect.description}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-black text-amber-400">
                      {(sect.totalTuVi || 0).toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">
                      {sect.memberCount} Thành Viên
                    </span>
                  </div>
                </div>
              )}
            />
          ) : selectedTab === 'cao_thi' ? (
            /* TAB: CÁO THỊ VẠN GIỚI with Virtual Scrolling */
            <VirtualList<HeavenlyDaoDecree>
              ref={decreeVirtualListRef}
              items={daoDecrees}
              estimateItemHeight={72}
              gap={8}
              keyExtractor={(decree) => decree.id}
              className="flex-1 min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700"
              renderItem={(decree) => (
                <div
                  key={decree.id}
                  onClick={() => setSelectedDecreeForModal(decree)}
                  className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/40 transition-all space-y-1.5 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold uppercase">
                      {decree.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(decree.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200">{decree.content}</p>
                </div>
              )}
            />
          ) : (
            /* SPEED MODES & BOSS HUNT: TOP 3 3D PODIUM + TOP 4-20 LIST */
            <div className="flex-1 min-h-0 flex flex-col space-y-3">
              {/* TOP 3 PODIUM 3D (Vinh danh Top 1 Vàng kim, Top 2 Bạc, Top 3 Đồng) */}
              <div className="shrink-0 p-3 sm:p-4 rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-inner">
                <div className="text-center mb-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 flex items-center justify-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>BỤC VINH QUANG 3D • TAM ĐẠI QUÁN QUÂN ({selectedPeriod === 'daily' ? 'HÔM NAY' : selectedPeriod === 'weekly' ? 'TUẦN NÀY' : 'ĐIỆN DANH VỌNG'})</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-2 pb-1">
                  {/* TOP 2 PODIUM (Bạc Tinh Anh - Bên Trái) */}
                  <div className="flex flex-col items-center text-center">
                    {top2Player ? (
                      <div className="w-full flex flex-col items-center group">
                        <div className="relative mb-1">
                          <AvatarWithFrame
                            icon={top2Player.avatar || '⚡'}
                            frameId={top2Player.frame || 'default'}
                            size="md"
                          />
                          <span className="absolute -top-2.5 -right-2 text-xl filter drop-shadow select-none">
                            🥈
                          </span>
                        </div>
                        <span className="text-xs font-black text-slate-200 truncate max-w-full block">
                          {top2Player.displayName || top2Player.username}
                        </span>
                        <span className="text-xs font-black font-mono text-slate-300">
                          {top2Player.score > 0 ? top2Player.score.toLocaleString() : `${top2Player.wpm} WPM`}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playKeyClick();
                              setInspectPlayer(top2Player);
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold transition-colors cursor-pointer"
                            title="Xem hồ sơ"
                          >
                            Hồ sơ
                          </button>
                          {onStartGhostChallenge && (
                            <button
                              type="button"
                              onClick={() => {
                                soundFx.playKeyClick();
                                onStartGhostChallenge(top2Player);
                                onClose();
                              }}
                              className="px-1.5 py-0.5 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-[10px] font-bold transition-colors cursor-pointer"
                              title="Khiêu chiến bóng ma"
                            >
                              Đua 👻
                            </button>
                          )}
                        </div>

                        {/* 3D Pedestal Base */}
                        <div className="w-full mt-2 h-16 sm:h-20 rounded-t-2xl bg-gradient-to-t from-slate-800 to-slate-700 border-t-2 border-slate-400 flex flex-col items-center justify-center shadow-lg">
                          <span className="text-xl sm:text-2xl font-black font-mono text-slate-200">
                            #2
                          </span>
                          <span className="text-[9px] uppercase font-bold text-slate-400">
                            Bạc Tinh Anh
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center opacity-40">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 mb-1">
                          🥈
                        </div>
                        <span className="text-[11px] text-slate-500">Chưa có</span>
                        <div className="w-full mt-2 h-16 sm:h-20 rounded-t-2xl bg-slate-900 border-t border-slate-700 flex items-center justify-center">
                          <span className="text-base font-bold text-slate-600">#2</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TOP 1 PODIUM (Vàng Kim Hào Quang Nhấp Nháy - Cao Nhất Ở Giữa) */}
                  <div className="flex flex-col items-center text-center">
                    {top1Player ? (
                      <div className="w-full flex flex-col items-center group">
                        <div className="relative mb-1">
                          <div className="relative p-0.5 rounded-full ring-2 ring-yellow-400/90 shadow-[0_0_20px_rgba(251,191,36,0.8)] animate-pulse">
                            <AvatarWithFrame
                              icon={top1Player.avatar || '⚡'}
                              frameId={top1Player.frame || 'frame_kim_bang'}
                              size="lg"
                            />
                          </div>
                          <span className="absolute -top-4 -right-2 text-2xl filter drop-shadow animate-bounce select-none">
                            👑
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm font-black text-amber-200 truncate max-w-full block">
                          {top1Player.displayName || top1Player.username}
                        </span>
                        <span className="text-sm sm:text-base font-black font-mono text-amber-400">
                          {top1Player.score > 0 ? top1Player.score.toLocaleString() : `${top1Player.wpm} WPM`}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playKeyClick();
                              setInspectPlayer(top1Player);
                            }}
                            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[10px] text-amber-300 font-bold border border-amber-500/40 transition-colors cursor-pointer"
                            title="Xem hồ sơ"
                          >
                            Hồ sơ
                          </button>
                          {onStartGhostChallenge && (
                            <button
                              type="button"
                              onClick={() => {
                                soundFx.playKeyClick();
                                onStartGhostChallenge(top1Player);
                                onClose();
                              }}
                              className="px-2 py-0.5 rounded bg-cyan-500/30 hover:bg-cyan-500/50 text-cyan-300 text-[10px] font-bold border border-cyan-500/40 transition-colors cursor-pointer"
                              title="Khiêu chiến bóng ma Quán Quân"
                            >
                              Đua 👻
                            </button>
                          )}
                        </div>

                        {/* 3D Pedestal Base (Tallest) */}
                        <div className="w-full mt-2 h-24 sm:h-28 rounded-t-2xl bg-gradient-to-t from-amber-700 via-amber-600 to-yellow-500 border-t-2 border-yellow-300 flex flex-col items-center justify-center shadow-xl shadow-amber-500/20 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-b from-yellow-300/20 to-transparent" />
                          <span className="text-2xl sm:text-3xl font-black font-mono text-black relative z-10">
                            #1
                          </span>
                          <span className="text-[10px] uppercase font-black text-black tracking-wider relative z-10">
                            QUÁN QUÂN
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center opacity-40">
                        <div className="w-12 h-12 rounded-full bg-slate-800 border border-yellow-500/40 flex items-center justify-center text-yellow-400 mb-1">
                          👑
                        </div>
                        <span className="text-xs text-slate-400">Chưa có kỷ lục</span>
                        <div className="w-full mt-2 h-24 sm:h-28 rounded-t-2xl bg-slate-900 border-t-2 border-yellow-500/40 flex items-center justify-center">
                          <span className="text-lg font-bold text-slate-500">#1</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TOP 3 PODIUM (Đồng Kiên Cường - Bên Phải) */}
                  <div className="flex flex-col items-center text-center">
                    {top3Player ? (
                      <div className="w-full flex flex-col items-center group">
                        <div className="relative mb-1">
                          <AvatarWithFrame
                            icon={top3Player.avatar || '⚡'}
                            frameId={top3Player.frame || 'default'}
                            size="md"
                          />
                          <span className="absolute -top-2.5 -right-2 text-xl filter drop-shadow select-none">
                            🥉
                          </span>
                        </div>
                        <span className="text-xs font-black text-amber-500 truncate max-w-full block">
                          {top3Player.displayName || top3Player.username}
                        </span>
                        <span className="text-xs font-black font-mono text-amber-500">
                          {top3Player.score > 0 ? top3Player.score.toLocaleString() : `${top3Player.wpm} WPM`}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playKeyClick();
                              setInspectPlayer(top3Player);
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold transition-colors cursor-pointer"
                            title="Xem hồ sơ"
                          >
                            Hồ sơ
                          </button>
                          {onStartGhostChallenge && (
                            <button
                              type="button"
                              onClick={() => {
                                soundFx.playKeyClick();
                                onStartGhostChallenge(top3Player);
                                onClose();
                              }}
                              className="px-1.5 py-0.5 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-[10px] font-bold transition-colors cursor-pointer"
                              title="Khiêu chiến bóng ma"
                            >
                              Đua 👻
                            </button>
                          )}
                        </div>

                        {/* 3D Pedestal Base */}
                        <div className="w-full mt-2 h-12 sm:h-16 rounded-t-2xl bg-gradient-to-t from-amber-900 to-amber-800 border-t-2 border-amber-600 flex flex-col items-center justify-center shadow-lg">
                          <span className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                            #3
                          </span>
                          <span className="text-[9px] uppercase font-bold text-amber-400">
                            Đồng Kiên Cường
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center opacity-40">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-600 mb-1">
                          🥉
                        </div>
                        <span className="text-[11px] text-slate-500">Chưa có</span>
                        <div className="w-full mt-2 h-12 sm:h-16 rounded-t-2xl bg-slate-900 border-t border-slate-700 flex items-center justify-center">
                          <span className="text-base font-bold text-slate-600">#3</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* TOP 4 - TOP 20+ LIST CONTAINER with Virtual Scrolling (60-120 FPS) */}
              <div className="flex-1 min-h-0 flex flex-col">
                {currentModeRankings.length === 0 ? (
                  <div className="py-8 text-center space-y-2 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                    <Flame className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-sm font-semibold text-slate-300">
                      Chưa có kỷ lục nào trong chu kỳ này!
                    </p>
                    <p className="text-xs text-slate-500">
                      Hãy là người đầu tiên thi đấu và ghi danh vào Bảng Vàng!
                    </p>
                  </div>
                ) : restRankings.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500 italic">
                    Chưa có thêm người chơi từ hạng #4 trở xuống trong chu kỳ này.
                  </div>
                ) : (
                  <VirtualList<LeaderboardEntry>
                    ref={battleVirtualListRef}
                    items={restRankings}
                    estimateItemHeight={58}
                    gap={6}
                    keyExtractor={(entry) => `${entry.username}_${entry.rank}`}
                    className="flex-1 min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950"
                    renderItem={(entry) => {
                      const isMe =
                        (currentUser && (
                          (entry.userId && entry.userId === currentUser.id) ||
                          (entry.username && currentUser.username && entry.username.toLowerCase() === currentUser.username.toLowerCase())
                        )) ||
                        (currentUsername && (
                          (entry.username && entry.username.toLowerCase() === currentUsername.toLowerCase()) ||
                          (entry.displayName && entry.displayName.toLowerCase() === currentUsername.toLowerCase())
                        ));
                      const isHighlighted = highlightedRank === entry.rank;

                      return (
                        <div
                          key={`${entry.username}_${entry.rank}`}
                          onClick={() => {
                            soundFx.playKeyClick();
                            setInspectPlayer(entry);
                          }}
                          className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isHighlighted
                              ? 'ring-2 ring-yellow-400 bg-amber-500/20 border-amber-400 shadow-md shadow-amber-500/20 animate-pulse'
                              : isMe
                              ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-400/50 shadow-sm'
                              : 'bg-slate-950/70 hover:bg-slate-800/60 border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Rank Badge */}
                            <span className="w-7 text-center font-mono font-bold text-xs text-slate-400">
                              #{entry.rank}
                            </span>

                            {/* Avatar */}
                            <div className="shrink-0">
                              <AvatarWithFrame
                                icon={entry.avatar || '⚡'}
                                frameId={entry.frame || 'default'}
                                size="sm"
                              />
                            </div>

                            {/* Player info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-xs font-bold truncate ${
                                    isMe ? 'text-amber-300 font-black' : 'text-white'
                                  }`}
                                >
                                  {entry.displayName || entry.username}
                                </span>
                                {isMe && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-400 text-black text-[9px] font-black uppercase">
                                    Bạn
                                  </span>
                                )}
                                {entry.isVerified && (
                                  <span
                                    className="inline-flex items-center text-emerald-400"
                                    title="Đã xác thực nhịp gõ chuẩn"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block truncate">
                                @{entry.username} • {entry.keyboardSwitch || 'Cherry MX Blue'}
                              </span>
                            </div>
                          </div>

                          {/* Score & Quick Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <div className="text-sm font-black font-mono text-amber-400">
                                {entry.score > 0 ? entry.score.toLocaleString() : `${entry.wpm} WPM`}
                              </div>
                              <span className="text-[9px] text-slate-500 font-mono">
                                {entry.accuracy || 100}% CS
                              </span>
                            </div>

                            {onStartGhostChallenge && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  soundFx.playKeyClick();
                                  onStartGhostChallenge(entry);
                                  onClose();
                                }}
                                className="p-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                                title="Khiêu chiến bóng ma của người này"
                              >
                                <Ghost className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* 1. STICKY BOTTOM BAR: "VỊ TRÍ CỦA BẠN" (MY RANK STICKY BAR) */}
        {(activeGroup === 'battle' || selectedTab === 'san_boss') && (
          <div className="shrink-0 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 shadow-lg flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <Target className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black uppercase text-slate-300">
                    VỊ TRÍ CỦA BẠN:
                  </span>
                  {myRankData.hasRank ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/40">
                      {myRankData.isChampion ? '👑 QUÁN QUÂN TOP 1' : `HẠNG #${myRankData.rank}`}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold">
                      Chưa lọt vào Top 20
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {myRankData.hasRank ? (
                    <span>
                      Thành tích: <b className="text-amber-300">{myRankData.scoreVal} {currentTabConfig.unit}</b>
                      {!myRankData.isChampion && (
                        <span> • Cách Top 1: <b className="text-rose-400">+{myRankData.gapToTop1} {currentTabConfig.unit}</b></span>
                      )}
                    </span>
                  ) : (
                    <span>
                      {myRankData.gapToTop1 > 0
                        ? `Khoảng cách tới Top 1: ${myRankData.gapToTop1} ${currentTabConfig.unit}`
                        : 'Hãy thi đấu ngay để xác lập thành tích đầu tiên!'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Scroll to My Rank button via VirtualList */}
              {myRankData.hasRank && myRankData.rank >= 4 && (
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setHighlightedRank(myRankData.rank);
                    battleVirtualListRef.current?.scrollToIndex(myRankData.rank - 4);
                    setTimeout(() => setHighlightedRank(null), 2500);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  title="Cuộn danh sách ảo tới ngay vị trí của bạn"
                >
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span>Xem vị trí</span>
                </button>
              )}

              {/* Verification & Anti-Cheat Requirement Badge */}
              <div
                className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-medium"
                title="Quy tắc: Độ chính xác >= 92%, ván đấu 100% không đầu hàng/out phòng"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Chuẩn xét duyệt: Độ chính xác ≥ 92%</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Dismiss Button */}
        <div className="pt-1 border-t border-slate-800/80 shrink-0 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Kỷ lục Bảng Vàng được bảo chứng bởi hệ thống chống gian lận & xác thực nhịp gõ 60 FPS</span>
          </div>

          <button
            id="btn-dismiss-leaderboard"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Inspect Player Modal */}
      <InspectPlayerModal
        isOpen={Boolean(inspectPlayer)}
        player={inspectPlayer}
        modeName={currentTabConfig.name}
        onClose={() => setInspectPlayer(null)}
        onStartGhostChallenge={onStartGhostChallenge}
      />

      {/* Season Rewards Modal */}
      <SeasonRewardsModal
        isOpen={isRewardsModalOpen}
        onClose={() => setIsRewardsModalOpen(false)}
        currentUser={currentUser || null}
        onClaimSuccess={() => {
          loadLeaderboardData();
        }}
      />

      {/* Dao Decree Modal */}
      <DaoDecreeModal
        decree={selectedDecreeForModal}
        isOpen={Boolean(selectedDecreeForModal)}
        onClose={() => setSelectedDecreeForModal(null)}
      />

      {/* Sect Details Modal */}
      {selectedSectForDetails && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] space-y-4 text-left">
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs shrink-0">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Tổng Tu Vi</span>
                <span className="text-sm font-mono font-black text-amber-400">
                  {(selectedSectForDetails.totalTuVi || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Đệ Tử</span>
                <span className="text-sm font-mono font-black text-emerald-400">
                  {selectedSectForDetails.members?.length || selectedSectForDetails.memberCount} Vị
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Linh Mạch</span>
                <span className="text-sm font-mono font-black text-purple-400">
                  Cấp {selectedSectForDetails.linhMachLevel || 1}/5
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Chưởng Môn</span>
                <span className="text-xs font-bold text-amber-300 truncate block mt-0.5">
                  {selectedSectForDetails.leaderName}
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
              <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                Danh Sách Đệ Tử Đồng Môn
              </span>
              {(selectedSectForDetails.members || []).map((m: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{m.avatar || '⚡'}</span>
                    <div>
                      <span className="font-bold text-white block">{m.displayName || m.username}</span>
                      <span className="text-[10px] text-slate-400">{m.realmName} • Cấp {m.level}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-amber-400 block">
                      {(m.tuViScore || 0).toLocaleString()} Tu Vi
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      {m.role || 'Đệ tử'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedSectForDetails(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

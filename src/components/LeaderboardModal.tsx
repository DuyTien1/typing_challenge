import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HighScoreRecord, CultivationLeaderboardEntry, UserAccount } from '../types';
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
} from 'lucide-react';
import { AvatarWithFrame, checkIsAdmin } from '../utils/frames';
import { fetchCultivationLeaderboard } from '../utils/roomManager';
import { XIANXIA_REALMS, CultivationState } from '../utils/cultivation';

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

  // Kiểm tra quyền Quản trị viên (chỉ Admin mới nhìn thấy nút làm mới bảng xếp hạng)
  const isUserAdmin = Boolean(
    isAdmin ||
    currentUser?.isAdmin ||
    currentUser?.username?.toLowerCase() === 'admin' ||
    checkIsAdmin()
  );

  const tabs = [
    { id: 'tu_vi', name: 'Top 50 Tu Vi', unit: 'Tu Vi', isSpecial: true },
    { id: 'vi_dau', name: 'Tiếng Việt Có Dấu', unit: 'WPM' },
    { id: 'vi_nodau', name: 'Tiếng Việt Không Dấu', unit: 'WPM' },
    { id: 'en', name: 'Tiếng Anh', unit: 'WPM' },
    { id: 'numpad', name: 'Bàn Phím Số', unit: 'WPM' },
    { id: 'ngau_hung', name: 'Ngẫu Hứng', unit: 'Điểm' },
    { id: 'doan_chu', name: 'Đoán Chữ', unit: 'Điểm' },
    { id: 'san_boss', name: 'Săn Boss', unit: 'DMG' },
  ];

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
    }
  }, [selectedTab, loadCultivationData]);

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

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.max(0, Math.floor(totalSeconds / 60));
    const secs = Math.max(0, totalSeconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const filteredCultivationList = useMemo(() => {
    return cultivationList.filter((item) => {
      const matchesSearch =
        item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.realmName.toLowerCase().includes(searchQuery.toLowerCase());

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
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
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
                    currentUsername &&
                    cultivator.username.toLowerCase() === currentUsername.toLowerCase();

                  // Đảm bảo tu vi của người chơi trong danh sách luôn đồng bộ tuyệt đối với thực tế
                  const displayRealmIndex = isMe && cultivationState ? cultivationState.realmIndex : cultivator.realmIndex;
                  const displayRealmName = isMe && cultivationState ? cultivationState.realmName : cultivator.realmName;
                  const displayTier = isMe && cultivationState ? cultivationState.tier : cultivator.tier;
                  const displaySubStage = isMe && cultivationState ? cultivationState.subStage : cultivator.subStage;
                  const displayLevel = isMe && cultivationState ? cultivationState.level : cultivator.level;
                  const displayExp = isMe && cultivationState ? cultivationState.exp : cultivator.exp;
                  const displayThoNguyen = isMe && cultivationState ? cultivationState.thoNguyen : cultivator.thoNguyen;

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
                            {cultivator.username}
                          </span>
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider">
                              Bạn
                            </span>
                          )}
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
                        <b className="text-amber-400">{currentUser.username}</b>
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
                            {cultivationState.realmName} Tầng {cultivationState.tier} • Cấp {cultivationState.level}/1000 • {cultivationState.exp.toLocaleString()} Tu Vi
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
                        {cultivationState ? (
                          <>Cảnh giới hiện tại: {cultivationState.realmName} Tầng {cultivationState.tier} (Cấp {cultivationState.level})</>
                        ) : (
                          'Đăng nhập tài khoản để vinh danh và bảo lưu thứ hạng Tu Tiên!'
                        )}
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
                      {currentScore.username}
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
    </div>
  );
};

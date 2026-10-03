import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Swords, 
  ShieldAlert, 
  Activity, 
  RefreshCw, 
  Clock, 
  Award, 
  Unlock, 
  Flame, 
  Laptop, 
  Gamepad2, 
  Sparkles, 
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface ActivePlayerItem {
  userId: string;
  username: string;
  avatar: string;
  frame: string;
  bestWpm: number;
  totalGames: number;
  currentRoomId: string | null;
  currentMode: string;
  userState: 'in_match' | 'in_room' | 'in_lobby';
  roomInfo?: {
    roomId: string;
    mode: string;
    modeName: string;
    roomStatus: string;
    isHost: boolean;
    playerCount: number;
    playerWpm: number;
    playerProgress: number;
  };
  browser: string;
  device: string;
  connectedAt: number;
  lastSeen: number;
  isAdmin: boolean;
}

interface TopRankingPlayer {
  id: string;
  username: string;
  avatar: string;
  frame: string;
  totalGames: number;
  bestWpm: number;
  realmName?: string;
}

interface BannedAccountItem {
  username: string;
  userId?: string;
  reason: string;
  bannedAt: number;
  bannedUntil: number;
  remainingMinutes: number;
  isPermanent: boolean;
  avatar?: string;
}

interface UserStatsData {
  timestamp: number;
  realtimeActivePlayers: {
    count: number;
    inMatch: number;
    inRoomWaiting: number;
    inLobby: number;
    totalConnections: number;
    activeRooms: number;
    players: ActivePlayerItem[];
  };
  totalMatches: {
    count: number;
    avgPerUser: number;
    topMatchesPlayer: { username: string; totalGames: number; bestWpm: number; avatar: string } | null;
    topRankings: TopRankingPlayer[];
  };
  bannedAccounts: {
    count: number;
    bannedRatePercent: number;
    list: BannedAccountItem[];
  };
  summary: {
    totalRegisteredUsers: number;
    activeRatePercent: number;
  };
}

interface AdminUserStatsTabProps {
  onNavigateTab?: (tab: any) => void;
  showToast: (msg: string) => void;
}

export const AdminUserStatsTab: React.FC<AdminUserStatsTabProps> = ({
  onNavigateTab,
  showToast,
}) => {
  const [data, setData] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [playerFilter, setPlayerFilter] = useState<'all' | 'in_match' | 'in_room' | 'in_lobby'>('all');
  const [searchPlayer, setSearchPlayer] = useState('');
  const [activeSubView, setActiveSubView] = useState<'realtime' | 'rankings' | 'bans'>('realtime');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/user-stats?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    if (!autoRefresh) return;
    const timer = setInterval(fetchStats, 4000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const handleUnbanUser = async (username: string, userId?: string) => {
    soundFx.playKeyClick();

    // Instant optimistic removal from banned list:
    setData((prev) => {
      if (!prev) return prev;
      const updatedList = prev.bannedAccounts.list.filter(
        (b) => b.username.toLowerCase() !== username.toLowerCase() && (!userId || b.userId !== userId)
      );
      return {
        ...prev,
        bannedAccounts: {
          ...prev.bannedAccounts,
          count: Math.max(0, prev.bannedAccounts.count - 1),
          list: updatedList,
        },
      };
    });

    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unban', username, userId }),
      });
      const resData = await res.json();
      if (resData.success) {
        soundFx.playSuccess();
        showToast(resData.message || `Đã giải trừ phong ấn cấm cho ${username}!`);
        fetchStats();
      } else {
        showToast(resData.error || 'Không thể giải trừ án phạt');
        fetchStats();
      }
    } catch {
      showToast('Lỗi kết nối máy chủ');
      fetchStats();
    }
  };

  const formatRemaining = (mins: number, isPerm: boolean) => {
    if (isPerm || mins > 500000) return 'Vĩnh viễn (Bàn Cổ Thần Phạt)';
    if (mins >= 1440) {
      const days = Math.floor(mins / 1440);
      const h = Math.floor((mins % 1440) / 60);
      return `${days} ngày ${h} giờ`;
    }
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h} giờ ${m} phút`;
    }
    return `${mins} phút`;
  };

  const filteredPlayers = (data?.realtimeActivePlayers.players || []).filter((p) => {
    if (playerFilter !== 'all' && p.userState !== playerFilter) return false;
    if (searchPlayer) {
      const q = searchPlayer.toLowerCase();
      return p.username.toLowerCase().includes(q) || (p.currentRoomId && p.currentRoomId.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h3 className="text-sm font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Thống Kê Người Dùng & Hoạt Động Hệ Thống</span>
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Giám sát thời gian thực người chơi đang hoạt động, tổng số trận đấu toàn máy chủ và các tài khoản bị cấm.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setAutoRefresh(!autoRefresh);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              autoRefresh 
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Tự động cập nhật mỗi 4 giây"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>Auto: {autoRefresh ? 'Bật' : 'Tắt'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              fetchStats();
            }}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-slate-700 hover:border-slate-600"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3 HIGHLIGHT STAT CARDS - THE 3 USER-REQUESTED KEY METRICS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* METRIC 1: Người chơi đang hoạt động theo thời gian thực */}
        <div 
          onClick={() => setActiveSubView('realtime')}
          className={`p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border transition-all cursor-pointer relative overflow-hidden shadow-lg hover:scale-[1.01] ${
            activeSubView === 'realtime' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-emerald-500/30 hover:border-emerald-500/60'
          }`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Đang Hoạt Động (Realtime)</span>
            </span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
              {data ? data.realtimeActivePlayers.count.toLocaleString() : '...'}
            </span>
            <span className="text-xs font-bold text-emerald-400">người chơi online</span>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-900/40 grid grid-cols-3 gap-1 text-[11px]">
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 text-center">
              <span className="text-slate-400 block text-[10px]">Thi Đấu</span>
              <span className="font-bold text-amber-400">{data?.realtimeActivePlayers.inMatch || 0}</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 text-center">
              <span className="text-slate-400 block text-[10px]">Trong Phòng</span>
              <span className="font-bold text-sky-400">{data?.realtimeActivePlayers.inRoomWaiting || 0}</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 text-center">
              <span className="text-slate-400 block text-[10px]">Tại Sảnh</span>
              <span className="font-bold text-slate-300">{data?.realtimeActivePlayers.inLobby || 0}</span>
            </div>
          </div>
        </div>

        {/* METRIC 2: Tổng số trận đấu đã diễn ra */}
        <div 
          onClick={() => setActiveSubView('rankings')}
          className={`p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border transition-all cursor-pointer relative overflow-hidden shadow-lg hover:scale-[1.01] ${
            activeSubView === 'rankings' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-amber-500/30 hover:border-amber-500/60'
          }`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-amber-400" />
              <span>Tổng Trận Đấu Đã Diễn Ra</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
              Toàn Máy Chủ
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
              {data ? data.totalMatches.count.toLocaleString() : '...'}
            </span>
            <span className="text-xs font-bold text-amber-400">trận hoàn thành</span>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-900/40 flex items-center justify-between text-[11px] text-slate-300">
            <div>
              <span className="text-slate-400 block text-[10px]">Trung bình / người chơi:</span>
              <span className="font-bold text-white">{data?.totalMatches.avgPerUser || 0} ván</span>
            </div>
            {data?.totalMatches.topMatchesPlayer && (
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Kỷ lục cao nhất:</span>
                <span className="font-bold text-amber-400">
                  @{data.totalMatches.topMatchesPlayer.username} ({data.totalMatches.topMatchesPlayer.totalGames} ván)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* METRIC 3: Số tài khoản bị cấm hiện tại */}
        <div 
          onClick={() => setActiveSubView('bans')}
          className={`p-5 rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border transition-all cursor-pointer relative overflow-hidden shadow-lg hover:scale-[1.01] ${
            activeSubView === 'bans' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-rose-500/30 hover:border-rose-500/60'
          }`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Tài Khoản Bị Cấm Hiện Tại</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              (data?.bannedAccounts.count || 0) > 0 
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}>
              {(data?.bannedAccounts.count || 0) > 0 ? 'Có Tài Khoản Vi Phạm' : 'Hệ Thống An Toàn'}
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
              {data ? data.bannedAccounts.count.toLocaleString() : '...'}
            </span>
            <span className="text-xs font-bold text-rose-400">tài khoản phong ấn</span>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-900/40 flex items-center justify-between text-[11px] text-slate-300">
            <div>
              <span className="text-slate-400 block text-[10px]">Tỷ lệ vi phạm:</span>
              <span className="font-bold text-white">{data?.bannedAccounts.bannedRatePercent || 0}% người dùng</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">Bàn Cổ Thần Phạt:</span>
              <span className="font-bold text-rose-400">
                {(data?.bannedAccounts.count || 0) > 0 ? 'Đang kích hoạt' : '0 vi phạm'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Sub-tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveSubView('realtime');
          }}
          className={`flex-1 min-w-[170px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubView === 'realtime'
              ? 'bg-emerald-500 text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Người Chơi Online ({data?.realtimeActivePlayers.count || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveSubView('rankings');
          }}
          className={`flex-1 min-w-[170px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubView === 'rankings'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Top Trận Đấu ({data?.totalMatches.count || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveSubView('bans');
          }}
          className={`flex-1 min-w-[170px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubView === 'bans'
              ? 'bg-rose-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Tài Khoản Bị Cấm ({data?.bannedAccounts.count || 0})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBVIEW 1: REALTIME ACTIVE PLAYERS TABLE & DETAILS */}
      {/* ========================================================================= */}
      {activeSubView === 'realtime' && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Danh Sách Người Chơi Đang Hoạt Động Thời Gian Thực</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cập nhật tức thời mỗi 4 giây từ activePresenceSessions. Nhận diện phòng, tốc độ gõ và trạng thái trận.
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setPlayerFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  playerFilter === 'all' ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tất Cả ({data?.realtimeActivePlayers.count || 0})
              </button>
              <button
                type="button"
                onClick={() => setPlayerFilter('in_match')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  playerFilter === 'in_match' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Đang Đấu ({data?.realtimeActivePlayers.inMatch || 0})
              </button>
              <button
                type="button"
                onClick={() => setPlayerFilter('in_room')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  playerFilter === 'in_room' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Trong Phòng ({data?.realtimeActivePlayers.inRoomWaiting || 0})
              </button>
              <button
                type="button"
                onClick={() => setPlayerFilter('in_lobby')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  playerFilter === 'in_lobby' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tại Sảnh ({data?.realtimeActivePlayers.inLobby || 0})
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm kiếm người chơi đang online theo tên, phòng..."
              value={searchPlayer}
              onChange={(e) => setSearchPlayer(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Player Cards/Table */}
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredPlayers.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800/80">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
                <p className="text-xs text-slate-400 font-semibold">
                  Hiện chưa có người chơi nào thỏa mãn điều kiện lọc.
                </p>
              </div>
            ) : (
              filteredPlayers.map((player) => (
                <div
                  key={`${player.userId}-${player.username}`}
                  className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-lg border border-slate-700 shrink-0">
                      {player.avatar || '👤'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-white">@{player.username}</span>
                        {player.isAdmin && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black">
                            ADMIN
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">• {player.device} / {player.browser}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                        <span>Đã đấu: <strong className="text-slate-300">{player.totalGames} ván</strong></span>
                        <span>Đỉnh cao: <strong className="text-emerald-400">{player.bestWpm} WPM</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                    {/* Status Badge */}
                    {player.userState === 'in_match' && (
                      <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span>Đang Đấu {player.roomInfo ? `#${player.roomInfo.roomId}` : ''}</span>
                        {player.roomInfo && (
                          <span className="text-[10px] text-amber-400/80">({player.roomInfo.playerWpm} WPM)</span>
                        )}
                      </div>
                    )}

                    {player.userState === 'in_room' && (
                      <div className="px-2.5 py-1 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[11px] font-bold flex items-center gap-1.5">
                        <Gamepad2 className="w-3.5 h-3.5 text-sky-400" />
                        <span>Chờ Trong Phòng #{player.currentRoomId}</span>
                      </div>
                    )}

                    {player.userState === 'in_lobby' && (
                      <div className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-[11px] font-bold flex items-center gap-1.5 border border-slate-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>Tại Sảnh</span>
                      </div>
                    )}

                    <span className="text-[10px] text-slate-500 font-mono">
                      {Math.max(1, Math.round((Date.now() - player.lastSeen) / 1000))}s trước
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBVIEW 2: MATCH RANKINGS & ACTIVITY LEADERS */}
      {/* ========================================================================= */}
      {activeSubView === 'rankings' && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wide flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Bảng Xếp Hạng Người Chơi Tích Cực Nhất Theo Số Trận Đấu</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tổng hợp tất cả các trận đấu tích lũy từ các chế độ (Solo, 1v1 PvP, Săn Boss, Đoán Chữ, Ngẫu Hứng).
              </p>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
              Tổng máy chủ: {data?.totalMatches.count.toLocaleString() || 0} trận
            </div>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {(data?.totalMatches.topRankings || []).map((rankUser, idx) => (
              <div
                key={rankUser.id}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                    idx === 0 ? 'bg-amber-500 text-black ring-2 ring-amber-300' :
                    idx === 1 ? 'bg-slate-300 text-black' :
                    idx === 2 ? 'bg-amber-700 text-white' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    #{idx + 1}
                  </div>

                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-base border border-slate-700 shrink-0">
                    {rankUser.avatar || '👤'}
                  </div>

                  <div>
                    <span className="font-bold text-xs text-white">@{rankUser.username}</span>
                    <span className="text-[10px] text-amber-400 ml-2">[{rankUser.realmName || 'Luyện Khí Kỳ'}]</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-xs font-black text-white font-mono">{rankUser.totalGames.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 block">trận đấu</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{rankUser.bestWpm}</span>
                    <span className="text-[10px] text-slate-400 block">WPM Đỉnh</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBVIEW 3: CURRENTLY BANNED ACCOUNTS MONITOR & UNBAN */}
      {/* ========================================================================= */}
      {activeSubView === 'bans' && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black uppercase text-rose-400 tracking-wide flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Giám Sát & Hóa Giải Tài Khoản Bị Cấm Thi Đấu</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Các tài khoản đang chịu phong ấn Bàn Cổ Thần Phạt hoặc vi phạm điều lệ Đạo Giới.
              </p>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Đang cấm: {data?.bannedAccounts.count || 0} tài khoản</span>
            </div>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {(data?.bannedAccounts.list || []).length === 0 ? (
              <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800/80">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-bold">
                  Hiện không có tài khoản nào bị cấm thi đấu.
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Môi trường thi đấu đang trong tình trạng kỷ luật hoàn hảo và an toàn 100%.
                </p>
              </div>
            ) : (
              (data?.bannedAccounts.list || []).map((banItem) => (
                <div
                  key={banItem.username}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-rose-500/30 hover:border-rose-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-center text-lg shrink-0">
                      {banItem.avatar || '⚠️'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">@{banItem.username}</span>
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black">
                          BỊ PHONG ẤN
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Lý do: <span className="text-rose-300/90 font-medium">{banItem.reason}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Thời hạn còn lại: <strong className="text-amber-400">{formatRemaining(banItem.remainingMinutes, banItem.isPermanent)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Unban Action Button */}
                  <div className="self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleUnbanUser(banItem.username, banItem.userId)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 hover:border-emerald-500/60 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      title="Giải trừ phong ấn cấm đấu cho tài khoản này"
                    >
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Hóa Giải (Gỡ Cấm)</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

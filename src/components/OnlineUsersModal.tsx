import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Users,
  Shield,
  RefreshCw,
  Search,
  X,
  Check,
  Copy,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  Zap,
  Flame,
  Award,
  ArrowLeft,
  Gamepad2,
  Play,
  Layers,
  Activity,
  UserCheck,
  MessageSquare,
} from 'lucide-react';
import { OnlineUserDetail, HighScoreRecord, Player } from '../types';
import { fetchOnlineUsers } from '../utils/roomManager';
import { AvatarWithFrame } from '../utils/frames';
import { getPlayerTitle } from '../utils/titles';
import { soundFx } from '../utils/audio';
import { WpmRecordBadge, resolveBestWpmRecord } from './WpmRecordBadge';

interface OnlineUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onJoinRoom?: (roomId: string) => void;
  onOpenChat?: () => void;
  highScores: Record<string, HighScoreRecord | null>;
}

export const OnlineUsersModal: React.FC<OnlineUsersModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  onJoinRoom,
  onOpenChat,
  highScores,
}) => {
  const [users, setUsers] = useState<OnlineUserDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'lobby' | 'room' | 'playing' | 'admin'>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const bodyRef = useRef<HTMLDivElement>(null);

  // Reset scroll to top when changing filter tab or switching between detail/list view
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [filterTab, selectedUserId]);

  // Load online users from server
  const loadUsers = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await fetchOnlineUsers();
      setUsers(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load online users:', err);
    } finally {
      setIsLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    if (!isOpen) return;
    loadUsers();

    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadUsers();
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, loadUsers]);

  // Esc key listener: closes selected user detail first, or modal if on list
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        soundFx.playKeyClick();
        if (selectedUserId) {
          setSelectedUserId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, selectedUserId, onClose]);

  // Copy helper with feedback
  const handleCopy = (text: string, label: string) => {
    soundFx.playKeyClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedText(label);
        setTimeout(() => setCopiedText(null), 2000);
      });
    }
  };

  // Find currently selected user
  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.userId === selectedUserId) || null;
  }, [users, selectedUserId]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return users.filter((user) => {
      // Search text match
      if (q) {
        const matchName = user.username.toLowerCase().includes(q);
        const matchId = user.userId.toLowerCase().includes(q);
        const matchRoom = user.currentRoomId?.toLowerCase().includes(q);
        const matchIp = user.ip?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchRoom && !matchIp) {
          return false;
        }
      }

      // Tab filter
      if (filterTab === 'lobby') {
        return user.status === 'lobby' || (!user.currentRoomId && user.status !== 'playing' && user.status !== 'outplay');
      }
      if (filterTab === 'room') {
        return !!user.currentRoomId || user.status === 'waiting_room';
      }
      if (filterTab === 'playing') {
        return user.status === 'playing' || user.status === 'outplay' || user.roomInfo?.roomStatus === 'playing';
      }
      if (filterTab === 'admin') {
        return Boolean(user.isAdmin);
      }

      return true;
    });
  }, [users, searchQuery, filterTab]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    let lobby = 0;
    let room = 0;
    let playing = 0;
    let admin = 0;

    users.forEach((u) => {
      if (u.isAdmin) admin++;
      if (u.status === 'playing' || u.status === 'outplay' || u.roomInfo?.roomStatus === 'playing') {
        playing++;
      }
      if (u.currentRoomId || u.status === 'waiting_room') {
        room++;
      }
      if (u.status === 'lobby' || (!u.currentRoomId && u.status !== 'playing' && u.status !== 'outplay')) {
        lobby++;
      }
    });

    return { all: users.length, lobby, room, playing, admin };
  }, [users]);

  if (!isOpen) return null;

  // Format time helpers
  const formatTimeAgo = (timestamp: number) => {
    const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSec < 5) return 'Vừa xong';
    if (diffSec < 60) return `${diffSec}s trước`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m trước`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h trước`;
  };

  const formatConnectedDuration = (connectedAt: number) => {
    const diffSec = Math.max(0, Math.floor((Date.now() - connectedAt) / 1000));
    const hours = Math.floor(diffSec / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = diffSec % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const getDeviceIcon = (device?: string) => {
    if (device === 'Mobile') return <Smartphone className="w-3.5 h-3.5 text-sky-400" />;
    if (device === 'Tablet') return <Tablet className="w-3.5 h-3.5 text-amber-400" />;
    return <Monitor className="w-3.5 h-3.5 text-emerald-400" />;
  };

  const getStatusBadge = (user: OnlineUserDetail) => {
    if (user.status === 'playing' || user.roomInfo?.roomStatus === 'playing') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
          Đang thi đấu
          {user.currentRoomId && ` (${user.currentRoomId})`}
        </span>
      );
    }
    if (user.status === 'outplay') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
          Solo Outplay
        </span>
      );
    }
    if (user.currentRoomId || user.status === 'waiting_room') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          Phòng chờ {user.currentRoomId}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        Sảnh chính
      </span>
    );
  };

  return (
    <div
      id="modal-admin-online-users"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundFx.playKeyClick();
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-4xl h-[88vh] max-h-[820px] min-h-[520px] bg-[#121622] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Fixed at top) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            {selectedUser ? (
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setSelectedUserId(null);
                }}
                className="p-1.5 -ml-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Quay lại danh sách"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-950">
                <Users className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {selectedUser ? 'Chi Tiết Người Chơi Trực Tuyến' : 'Người Chơi Đang Trực Tuyến'}
                </h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Shield className="w-3 h-3" />
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {users.length} người online
                </span>
                <span>•</span>
                <span>Cập nhật: {lastUpdated.toLocaleTimeString()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto refresh toggle */}
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setAutoRefresh(!autoRefresh);
              }}
              title={autoRefresh ? 'Tự động làm mới: Đang BẬT' : 'Tự động làm mới: Đang TẮT'}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                autoRefresh
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Live Sync</span>
            </button>

            {/* Manual refresh button */}
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                loadUsers(true);
              }}
              disabled={isRefreshing}
              title="Làm mới danh sách ngay"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* Close modal button */}
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onClose();
              }}
              title="Đóng cửa sổ (Esc)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-950/60 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors cursor-pointer"
            >
              <kbd className="hidden sm:inline text-[10px] font-mono font-semibold px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                Esc
              </kbd>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Fixed Filters & Search Sub-Header (When in users list mode) */}
        {!selectedUser && !isLoading && (
          <div className="shrink-0 px-5 py-3 border-b border-slate-800/80 bg-slate-950/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, ID, phòng hoặc IP..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { key: 'all', label: 'Tất cả', count: tabCounts.all },
                { key: 'lobby', label: 'Sảnh', count: tabCounts.lobby },
                { key: 'room', label: 'Phòng', count: tabCounts.room },
                { key: 'playing', label: 'Đang đấu', count: tabCounts.playing },
                { key: 'admin', label: 'Admin', count: tabCounts.admin },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setFilterTab(tab.key as any);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    filterTab === tab.key
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-750'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      filterTab === tab.key
                        ? 'bg-slate-950/30 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal Body (Scrollable, consistent remaining height) */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-sm">Đang tải danh sách người chơi trực tuyến...</p>
            </div>
          ) : selectedUser ? (
            /* ========================================================================= */
            /* SINGLE USER DETAILED VIEW                                                */
            /* ========================================================================= */
            <div className="space-y-5 animate-fade-in">
              {/* Profile Card Header */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-850/90 border border-slate-750 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <AvatarWithFrame
                    icon={selectedUser.avatar || '⚡'}
                    frameId={selectedUser.frame || 'default'}
                    size="xl"
                    showBadge={true}
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-extrabold text-white tracking-tight">
                        {selectedUser.username}
                      </h3>
                      {selectedUser.isAdmin && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Shield className="w-3 h-3" />
                          Quản Trị Viên
                        </span>
                      )}
                      {selectedUser.userId === currentUserId && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Bạn (Tài khoản hiện tại)
                        </span>
                      )}
                    </div>

                    {/* Title Badge if any */}
                    {(() => {
                      const dummyPlayer: Player = {
                        id: selectedUser.userId,
                        username: selectedUser.username,
                        icon: selectedUser.avatar,
                        frame: selectedUser.frame,
                        bestWpm: selectedUser.bestWpm || 0,
                        totalGames: selectedUser.totalGames || 0,
                        progress: 0,
                        wpm: 0,
                        score: 0,
                        errors: 0,
                        correctChars: 0,
                        isFinished: false,
                        isSurrendered: false,
                        isAFK: false,
                      };
                      const title = getPlayerTitle(
                        dummyPlayer,
                        highScores,
                        Boolean(selectedUser.isAdmin),
                        selectedUser.userId === currentUserId
                      );
                      if (title) {
                        return (
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-300">
                            <Award className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-semibold">{title.name}</span>
                            <span className="text-slate-400 text-[11px]">({title.tag})</span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                      <span className="font-mono text-slate-300">ID: {selectedUser.userId}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedUser.userId, 'userId')}
                        className="p-1 rounded hover:bg-slate-750 text-slate-400 hover:text-white transition-colors"
                        title="Sao chép ID người chơi"
                      >
                        {copiedText === 'userId' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                  {getStatusBadge(selectedUser)}
                  <span className="text-xs text-slate-400">
                    Trực tuyến được: <strong className="text-slate-200">{formatConnectedDuration(selectedUser.connectedAt)}</strong>
                  </span>
                </div>
              </div>

              {/* Grid 2-columns: Activity & Connection telemetry */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Panel 1: Activity & Room info */}
                <div className="p-4 rounded-xl bg-slate-850/70 border border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white border-b border-slate-800 pb-2">
                    <Gamepad2 className="w-4 h-4 text-amber-400" />
                    <span>Hoạt Động & Phòng Đang Tham Gia</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Vị trí hiện tại:</span>
                      <span className="font-medium text-white">{getStatusBadge(selectedUser)}</span>
                    </div>

                    {selectedUser.currentRoomId ? (
                      <>
                        <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Mã phòng:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-amber-400 text-sm">
                              {selectedUser.currentRoomId}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(selectedUser.currentRoomId!, 'roomCode')}
                              className="p-1 rounded hover:bg-slate-750 text-slate-400 hover:text-white"
                              title="Sao chép mã phòng"
                            >
                              {copiedText === 'roomCode' ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>

                        {selectedUser.roomInfo && (
                          <>
                            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                              <span className="text-slate-400">Chế độ thi đấu:</span>
                              <span className="font-medium text-white">{selectedUser.roomInfo.modeName}</span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                              <span className="text-slate-400">Vai trò trong phòng:</span>
                              <span className="font-medium text-white">
                                {selectedUser.roomInfo.isHost ? (
                                  <span className="text-amber-400 font-semibold">Chủ phòng (Host)</span>
                                ) : (
                                  'Tuyển thủ tham gia'
                                )}
                              </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                              <span className="text-slate-400">Thành viên phòng:</span>
                              <span className="font-medium text-white">
                                {selectedUser.roomInfo.playerCount} / {selectedUser.roomInfo.maxSlots} người
                              </span>
                            </div>

                            {selectedUser.roomInfo.roomStatus === 'playing' && (
                              <div className="py-2 px-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-400">Tiến độ gõ:</span>
                                  <span className="font-bold text-emerald-400">
                                    {Math.round(selectedUser.roomInfo.playerProgress || 0)}%
                                  </span>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, selectedUser.roomInfo.playerProgress || 0)}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[11px] pt-1">
                                  <span className="text-slate-400">Tốc độ tức thời:</span>
                                  <span className="font-extrabold text-amber-300">
                                    {selectedUser.roomInfo.playerWpm || 0} WPM
                                  </span>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <div className="py-2 text-center text-slate-400 italic">
                        Người chơi hiện đang ở sảnh chờ chung, chưa vào phòng nào.
                      </div>
                    )}
                  </div>
                </div>

                {/* Panel 2: Technical & Connection Telemetry */}
                <div className="p-4 rounded-xl bg-slate-850/70 border border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white border-b border-slate-800 pb-2">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span>Thông Số Kết Nối & Thiết Bị</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        {getDeviceIcon(selectedUser.device)}
                        Thiết bị & Nền tảng:
                      </span>
                      <span className="font-medium text-white">
                        {selectedUser.device || 'Desktop'} ({selectedUser.browser || 'Web Browser'})
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        Số tab đang mở:
                      </span>
                      <span className="font-semibold text-white">
                        {selectedUser.tabCount || 1} tab trình duyệt
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        Địa chỉ IP:
                      </span>
                      <span className="font-mono font-medium text-slate-300">
                        {selectedUser.ip || '127.0.0.1'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Thời điểm vào mạng:
                      </span>
                      <span className="font-medium text-slate-300">
                        {new Date(selectedUser.connectedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        Tín hiệu gần nhất:
                      </span>
                      <span className="font-medium text-emerald-400">
                        {formatTimeAgo(selectedUser.lastSeen)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel 3: Stats Record & Performance */}
              <div className="p-4 rounded-xl bg-slate-850/70 border border-slate-800">
                <div className="flex items-center gap-2 text-sm font-semibold text-white border-b border-slate-800 pb-2 mb-3">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>Kỷ Lục & Thống Kê Cá Nhân</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <WpmRecordBadge
                    bestWpm={selectedUser.bestWpm}
                    bestWpmRecord={selectedUser.bestWpmRecord}
                    highScores={highScores}
                    username={selectedUser.username}
                    size="compact"
                    label="Kỷ Lục Outplay"
                    tooltipPosition="top"
                  />

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 block mb-1">Tổng Số Ván Đã Đấu</span>
                    <span className="text-xl font-black text-white">
                      {selectedUser.totalGames || 0} <span className="text-xs font-normal text-slate-400">trận</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 block mb-1">Khung Avatar</span>
                    <span className="text-sm font-bold text-sky-300 truncate block">
                      {selectedUser.frame || 'default'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 block mb-1">Phiên Tab ID</span>
                    <span className="text-xs font-mono text-slate-400 truncate block">
                      {selectedUser.tabId.slice(-8)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                {selectedUser.currentRoomId && onJoinRoom && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      onJoinRoom(selectedUser.currentRoomId!);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Vào Phòng #{selectedUser.currentRoomId}</span>
                  </button>
                )}

                {onOpenChat && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      onOpenChat();
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                    <span>Mở Kênh Chat</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setSelectedUserId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  ← Trở Lại Danh Sách
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* USERS LIST VIEW                                                          */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Users Grid */}
              {filteredUsers.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Không tìm thấy người chơi nào phù hợp</p>
                  <p className="text-xs text-slate-600 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc chuyển sang bộ lọc khác</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredUsers.map((user) => {
                    const isMe = user.userId === currentUserId;
                    return (
                      <div
                        key={user.userId}
                        onClick={() => {
                          soundFx.playKeyClick();
                          setSelectedUserId(user.userId);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedUserId(user.userId);
                          }
                        }}
                        className={`group relative p-3.5 rounded-xl border transition-all duration-150 cursor-pointer text-left ${
                          isMe
                            ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-950/30'
                            : 'bg-slate-850/80 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700'
                        } hover:shadow-lg hover:shadow-black/40`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <AvatarWithFrame
                              icon={user.avatar || '⚡'}
                              frameId={user.frame || 'default'}
                              size="md"
                              showBadge={true}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white text-sm truncate max-w-[130px] sm:max-w-[160px] group-hover:text-emerald-300 transition-colors">
                                  {user.username}
                                </span>
                                {user.isAdmin && (
                                  <span className="p-0.5 rounded bg-amber-500/20 text-amber-300" title="Quản trị viên">
                                    <Shield className="w-3 h-3" />
                                  </span>
                                )}
                                {isMe && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                                    Bạn
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                                  <Zap className="w-3 h-3" />
                                  {(() => {
                                    const rec = resolveBestWpmRecord({
                                      bestWpm: user.bestWpm,
                                      bestWpmRecord: user.bestWpmRecord,
                                      username: user.username,
                                    });
                                    return rec && rec.wpm > 0 ? `${rec.wpm} WPM (Outplay)` : 'Chưa có kỷ lục';
                                  })()}
                                </span>
                                <span>•</span>
                                <span>{user.totalGames || 0} trận</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {getStatusBadge(user)}
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              {getDeviceIcon(user.device)}
                              <span>{formatTimeAgo(user.lastSeen)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card footer indicator */}
                        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="truncate max-w-[200px] text-slate-500">
                            {user.currentRoomId ? `Phòng: ${user.currentRoomId}` : 'Ở Sảnh Chính'}
                          </span>
                          <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
                            Xem chi tiết →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Chỉ Admin mới có quyền truy cập bảng giám sát này</span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

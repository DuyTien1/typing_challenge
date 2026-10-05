import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Heart, 
  MessageSquare, 
  Swords, 
  Coffee, 
  GraduationCap, 
  Trash2, 
  Check, 
  X, 
  Search, 
  Sparkles, 
  Flame, 
  ShieldAlert,
  Send,
  ExternalLink,
  Crown,
  User,
  Copy,
  CheckCircle2,
  Clock,
  UserCheck,
  RefreshCw,
  Loader2,
  Radio
} from 'lucide-react';
import { FriendRecord, FriendRequest, UserAccount } from '../types';
import { AvatarWithFrame } from '../utils/frames';
import { soundFx } from '../utils/audio';
import { PlayerSimpleProfileModal } from './PlayerSimpleProfileModal';
import { 
  fetchFriendsList, 
  searchFriends,
  sendFriendRequest, 
  respondFriendRequest, 
  removeFriend, 
  giftNgocDaoTea, 
  mentorGuidance, 
  proposeDaoLu, 
  inviteFriendToRoom,
  broadcastLocalFriendsUpdate 
} from '../utils/roomManager';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  currentUserId?: string;
  currentUsername?: string;
  currentRoomId?: string | null;
  currentMode?: string;
  initialTab?: 'friends' | 'requests' | 'search' | 'daolu';
  onPendingRequestsCountChange?: (count: number) => void;
  onOpenWhisperChat?: (targetUsername: string, targetUserId: string) => void;
  onChallengeFriend?: (friend: FriendRecord) => void;
  onOpenAuth?: () => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentUserId,
  currentUsername,
  currentRoomId,
  currentMode,
  initialTab,
  onPendingRequestsCountChange,
  onOpenWhisperChat,
  onChallengeFriend,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search' | 'daolu'>('friends');
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [inspectedFriend, setInspectedFriend] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTarget, setSearchTarget] = useState('');
  const [searchMessage, setSearchMessage] = useState('Bái kiến Đạo Hữu, mong được kết bái giao lưu đạo pháp gõ phím!');
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search & Suggestions states
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [sendingTargetId, setSendingTargetId] = useState<string | null>(null);

  const effectiveUserId = currentUser?.id || currentUserId || (typeof window !== 'undefined' ? localStorage.getItem('fasttyping_player_id') || sessionStorage.getItem('fasttyping_player_id') || '' : '');
  const effectiveUsername = currentUser?.username || currentUsername || (typeof window !== 'undefined' ? localStorage.getItem('fasttyping_user') || localStorage.getItem('fasttyping_username') || 'Đạo Hữu' : 'Đạo Hữu');

  // Chỉ người chơi đã đăng nhập tài khoản thực thụ mới có Mã UID
  const isLoggedInUser = Boolean(currentUser && currentUser.authProvider !== 'guest' && currentUser.id);
  const myUid = isLoggedInUser ? currentUser!.id : null;

  // Esc key listener to quickly close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        soundFx.playKeyClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  const loadData = async () => {
    if (!effectiveUserId) return;
    setIsLoading(true);
    try {
      const data = await fetchFriendsList(effectiveUserId, effectiveUsername);
      if (data && data.success) {
        setFriends(data.friends || []);
        const nextPending = data.pendingRequests || [];
        setPendingRequests(nextPending);
        onPendingRequestsCountChange?.(nextPending.length);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const res = await searchFriends('', effectiveUserId, effectiveUsername);
      if (res && res.success) {
        setSuggestions(res.results || []);
      }
    } catch {
      // ignore
    }
  };

  // Initial tab and data loading
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      loadData();
      loadSuggestions();
    }
  }, [isOpen, initialTab, effectiveUserId, effectiveUsername]);

  // Real-time synchronization listeners across SSE, WebSocket and cross-tab BroadcastChannel
  useEffect(() => {
    if (!isOpen) return;

    const handleFriendsUpdated = () => {
      loadData();
      if (activeTab === 'search') {
        loadSuggestions();
      }
    };

    window.addEventListener('friends_data_updated', handleFriendsUpdated);
    window.addEventListener('friend_request_received', handleFriendsUpdated);
    window.addEventListener('friend_request_accepted', handleFriendsUpdated);
    window.addEventListener('friend_request_sent', handleFriendsUpdated);
    window.addEventListener('friend_request_responded', handleFriendsUpdated);

    // Heartbeat fallback polling every 2.5s while modal is actively open for zero-delay synchronization
    const pollTimer = setInterval(() => {
      loadData();
    }, 2500);

    return () => {
      window.removeEventListener('friends_data_updated', handleFriendsUpdated);
      window.removeEventListener('friend_request_received', handleFriendsUpdated);
      window.removeEventListener('friend_request_accepted', handleFriendsUpdated);
      window.removeEventListener('friend_request_sent', handleFriendsUpdated);
      window.removeEventListener('friend_request_responded', handleFriendsUpdated);
      clearInterval(pollTimer);
    };
  }, [isOpen, activeTab, effectiveUserId, effectiveUsername]);

  // Realtime search with debounce
  useEffect(() => {
    if (!isOpen || activeTab !== 'search') return;
    const q = searchTarget.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchFriends(q, effectiveUserId, effectiveUsername);
        if (res && res.success) {
          setSearchResults(res.results || []);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTarget, isOpen, activeTab, effectiveUserId, effectiveUsername]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => {
      setActionNotice((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const handleCopyUid = () => {
    if (!myUid) {
      showToast('Đạo hữu đang là Tán Tu. Vui lòng đăng nhập để nhận Mã UID!', 'error');
      return;
    }
    try {
      navigator.clipboard.writeText(myUid);
      setCopiedUid(true);
      soundFx.playKeyClick();
      showToast(`Đã sao chép mã UID: ${myUid}`, 'success');
      setTimeout(() => setCopiedUid(false), 3000);
    } catch {
      showToast(`Mã UID của bạn: ${myUid}`, 'success');
    }
  };

  const handleSendRequest = async () => {
    const trimmed = searchTarget.trim();
    if (!trimmed) {
      showToast('Vui lòng nhập tên người chơi hoặc UID cần kết bạn!', 'error');
      return;
    }
    soundFx.playKeyClick();
    const isLikelyUid = trimmed.startsWith('p_') || trimmed.startsWith('usr_') || (trimmed.length > 15 && !trimmed.includes(' '));
    const res = await sendFriendRequest(
      trimmed, 
      isLikelyUid ? trimmed : undefined, 
      searchMessage.trim(), 
      effectiveUserId, 
      effectiveUsername
    );
    if (res.success) {
      soundFx.playVictory();
      showToast(res.message || 'Đã gửi lời mời kết bạn!', 'success');
      setSearchTarget('');
      loadData();
      loadSuggestions();
    } else {
      soundFx.playError();
      showToast(res.error || 'Không thể gửi lời mời', 'error');
    }
  };

  const handleSendToCandidate = async (candidate: { id: string; username: string; displayName?: string }) => {
    soundFx.playKeyClick();
    setSendingTargetId(candidate.id);
    const res = await sendFriendRequest(
      candidate.username,
      candidate.id,
      searchMessage.trim(),
      effectiveUserId,
      effectiveUsername
    );
    setSendingTargetId(null);
    if (res.success) {
      soundFx.playVictory();
      showToast(res.message || `Đã gửi lời mời kết bạn tới ${candidate.displayName || candidate.username}!`, 'success');
      // Optimistically update candidate in suggestions and search results
      setSuggestions((prev) =>
        prev.map((c) => (c.id === candidate.id ? { ...c, isPendingSent: true } : c))
      );
      setSearchResults((prev) =>
        prev.map((c) => (c.id === candidate.id ? { ...c, isPendingSent: true } : c))
      );
      loadData();
    } else {
      soundFx.playError();
      showToast(res.error || 'Không thể gửi lời mời', 'error');
    }
  };

  const handleRespondRequest = async (requestId: string, action: 'accept' | 'reject') => {
    soundFx.playKeyClick();
    const pendingTarget = pendingRequests.find((r) => r.id === requestId || r.fromUserId === requestId);

    // Optimistic removal so badge and list update immediately
    setPendingRequests((prev) => {
      const next = prev.filter((r) => r.id !== requestId && r.fromUserId !== requestId);
      onPendingRequestsCountChange?.(next.length);
      return next;
    });

    if (action === 'accept') {
      if (pendingTarget) {
        setFriends((prev) => {
          if (prev.some((f) => f.userId === pendingTarget.fromUserId || f.username === pendingTarget.fromUsername)) {
            return prev;
          }
          const optimisticFriend: FriendRecord = {
            friendshipId: `fs_opt_${Date.now()}`,
            userId: pendingTarget.fromUserId,
            username: pendingTarget.fromUsername,
            displayName: pendingTarget.fromDisplayName,
            avatar: pendingTarget.fromAvatar || '⚡',
            frame: pendingTarget.fromFrame || 'default',
            realmName: pendingTarget.fromRealmName || 'Luyện Khí',
            realmIcon: '🌿',
            intimacy: 60,
            intimacyLevel: 1,
            status: 'online',
            isDaoLu: false,
            connectedAt: Date.now(),
          };
          return [optimisticFriend, ...prev];
        });
      }

      setSuggestions((prev) =>
        prev.map((c) =>
          c.id === requestId || (pendingTarget && c.id === pendingTarget.fromUserId)
            ? { ...c, isFriend: true, isPendingReceived: false }
            : c
        )
      );
      setSearchResults((prev) =>
        prev.map((c) =>
          c.id === requestId || (pendingTarget && c.id === pendingTarget.fromUserId)
            ? { ...c, isFriend: true, isPendingReceived: false }
            : c
        )
      );
    }

    const res = await respondFriendRequest(requestId, action, effectiveUserId, effectiveUsername);
    if (res.success) {
      if (action === 'accept') {
        soundFx.playVictory();
        showToast(res.message || 'Đã kết bái đạo hữu thành công!', 'success');
        setActiveTab('friends');
      } else {
        showToast(res.message || 'Đã từ chối lời mời', 'success');
      }
      loadData();
      loadSuggestions();
    } else {
      soundFx.playError();
      showToast(res.error || 'Có lỗi xảy ra', 'error');
      loadData();
    }
  };

  const handleRemoveFriend = async (friend: FriendRecord) => {
    if (!window.confirm(`Đạo hữu có chắc chắn muốn hủy kết bái với ${friend.displayName || friend.username}?`)) {
      return;
    }
    soundFx.playKeyClick();
    const res = await removeFriend(friend.friendshipId, friend.userId);
    if (res.success) {
      showToast(res.message || 'Đã hủy đạo hữu', 'success');
      loadData();
    }
  };

  const handleGiftTea = async (friend: FriendRecord) => {
    soundFx.playKeyClick();
    const res = await giftNgocDaoTea(friend.userId);
    if (res.success) {
      soundFx.playVictory();
      showToast(res.message || 'Đã tặng một chén Ngộ Đạo Trà!', 'success');
      loadData();
    } else {
      soundFx.playError();
      showToast(res.error || 'Chưa thể tặng trà', 'error');
    }
  };

  const handleMentorGuidance = async (friend: FriendRecord) => {
    soundFx.playKeyClick();
    const res = await mentorGuidance(friend.userId);
    if (res.success) {
      soundFx.playVictory();
      showToast(res.message || 'Đã truyền thụ công lực cho đạo hữu!', 'success');
      loadData();
    } else {
      soundFx.playError();
      showToast(res.error || 'Chưa thể chỉ điểm', 'error');
    }
  };

  const handleProposeDaoLu = async (friend: FriendRecord) => {
    if (!window.confirm(`Đạo hữu có nguyện ý dâng Tín Vật Định Tình, kết duyên Đạo Lữ trăm năm cùng ${friend.displayName || friend.username}?`)) {
      return;
    }
    soundFx.playKeyClick();
    const res = await proposeDaoLu(friend.userId);
    if (res.success) {
      soundFx.playVictory();
      showToast(res.message || 'Đã gửi lời cầu kết duyên Đạo Lữ!', 'success');
      loadData();
    } else {
      soundFx.playError();
      showToast(res.error || 'Chưa thể kết duyên', 'error');
    }
  };

  const handleInviteToRoom = async (friend: FriendRecord) => {
    soundFx.playKeyClick();
    if (!currentRoomId) {
      if (onChallengeFriend) {
        onChallengeFriend(friend);
        onClose();
        return;
      }
      showToast('Đạo hữu cần ở trong phòng thi đấu để mời bạn bè!', 'error');
      return;
    }
    const res = await inviteFriendToRoom(friend.userId, currentRoomId, currentMode);
    if (res.success) {
      soundFx.playVictory();
      showToast(`Đã gửi lời mời tham gia phòng thi đấu tới ${friend.displayName || friend.username}!`, 'success');
    } else {
      soundFx.playError();
      showToast(res.error || 'Không thể gửi lời mời', 'error');
    }
  };

  if (!isOpen) return null;

  const daoLuFriend = friends.find((f) => f.isDaoLu);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl h-[88vh] max-h-[740px] min-h-[520px] sm:min-h-[580px] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  SỔ TAY ĐẠO HỮU
                </h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {friends.length} Tri Kỷ
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Giao lưu đàm đạo, tặng Ngộ Đạo Trà, cùng nhau thi đấu và kết bái Đạo Lữ
              </p>
            </div>
          </div>

          <button
            id="btn-close-friends-modal"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className={`shrink-0 px-4 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2 animate-slideDown ${
            actionNotice.type === 'success' ? 'bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300' : 'bg-rose-500/20 border-b border-rose-500/40 text-rose-300'
          }`}>
            <span>{actionNotice.type === 'success' ? '✨' : '⚠️'}</span>
            <span>{actionNotice.text}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-2 gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('friends');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'friends'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Đạo Hữu ({friends.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('requests');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap relative ${
              activeTab === 'requests'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Lời Mời ({pendingRequests.length})</span>
            {pendingRequests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('search');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'search'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tìm & Kết Giao</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('daolu');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'daolu'
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400/40" />
            <span>Đạo Lữ Đồng Tu</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
          
          {/* TAB 1: DANH SÁCH ĐẠO HỮU */}
          {activeTab === 'friends' && (
            <div className="space-y-4 min-h-full">
              {friends.length === 0 ? (
                <div className="min-h-[340px] flex flex-col items-center justify-center text-center py-12 px-4 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-3xl">
                    📿
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">Chưa có đạo hữu kết bái</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Tiên lộ xa xôi vạn dặm, hãy chuyển sang tab "Tìm & Kết Giao" để tìm kiếm đạo hữu cùng chung chí hướng tu tiên gõ phím!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('search')}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold cursor-pointer transition-all active:scale-95"
                  >
                    Tìm bạn ngay
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {friends.map((friend) => {
                    const isOnline = friend.status !== 'offline';
                    const isInMatch = friend.status === 'in_match';
                    const intimacyTierName = 
                      friend.intimacyLevel === 4 ? 'Đạo Lữ Đồng Tu' :
                      friend.intimacyLevel === 3 ? 'Tri Kỷ Sinh Tử' :
                      friend.intimacyLevel === 2 ? 'Kim Lan Chi Giao' : 'Sơ Thức';

                    return (
                      <div
                        key={friend.friendshipId}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          friend.isDaoLu
                            ? 'bg-gradient-to-br from-pink-950/40 via-purple-950/30 to-slate-900 border-pink-500/50 shadow-lg shadow-pink-950/30'
                            : isOnline
                            ? 'bg-slate-900/90 hover:bg-slate-850 border-slate-750 hover:border-emerald-500/40'
                            : 'bg-slate-900/50 border-slate-800/60 opacity-80'
                        }`}
                      >
                        {/* Top: Avatar, Name, Realm, Online Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className="shrink-0 relative cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => {
                                soundFx.playKeyClick();
                                setInspectedFriend(friend);
                              }}
                              title={`Xem hồ sơ của ${friend.displayName || friend.username}`}
                            >
                              <AvatarWithFrame
                                icon={friend.avatar || '⚡'}
                                frameId={friend.frame || 'default'}
                                size="md"
                              />
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                                  isInMatch
                                    ? 'bg-amber-400 animate-pulse'
                                    : isOnline
                                    ? 'bg-emerald-400'
                                    : 'bg-slate-500'
                                }`}
                                title={isInMatch ? 'Đang trong trận đấu' : isOnline ? 'Đang trực tuyến' : 'Ngoại tuyến'}
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  onClick={() => {
                                    soundFx.playKeyClick();
                                    setInspectedFriend(friend);
                                  }}
                                  className="font-black text-sm text-white hover:text-amber-300 cursor-pointer transition-colors truncate"
                                  title={`Xem hồ sơ của ${friend.displayName || friend.username}`}
                                >
                                  {friend.displayName || friend.username}
                                </span>
                                {friend.isDaoLu && (
                                  <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded-full bg-pink-500/30 text-pink-300 border border-pink-400/50 flex items-center gap-0.5">
                                    <Heart className="w-2.5 h-2.5 fill-pink-400" />
                                    ĐẠO LỮ
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap mt-0.5">
                                <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                                  <span>{friend.realmIcon}</span>
                                  <span>{friend.realmName}</span>
                                </span>
                                {friend.sectTag && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                    [{friend.sectTag}]
                                  </span>
                                )}
                                <span className="font-mono text-emerald-400 font-bold">
                                  {friend.bestWpm || 0} WPM
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isInMatch
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : isOnline
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-500 border border-slate-700/50'
                            }`}>
                              {isInMatch ? 'Đang đấu' : isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>

                        {/* Mid: Intimacy Progress Bar & Tier benefits */}
                        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 flex items-center gap-1 font-semibold">
                              <Heart className="w-3 h-3 text-rose-400" />
                              <span>Hảo Cảm:</span>
                              <span className="text-rose-300 font-bold font-mono">{friend.intimacy}</span>
                            </span>
                            <span className="text-[10px] font-bold text-amber-300">
                              {intimacyTierName} (Bậc {friend.intimacyLevel})
                            </span>
                          </div>

                          {/* Progress line */}
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-rose-500 to-pink-400 transition-all duration-500"
                              style={{ width: `${Math.min(100, (friend.intimacy / 5000) * 100)}%` }}
                            />
                          </div>

                          <div className="text-[10px] text-slate-400 flex items-center justify-between">
                            <span>
                              {friend.intimacyLevel === 1 && 'Sơ thức: Mời đấu nhanh & xem trạng thái'}
                              {friend.intimacyLevel === 2 && 'Kim Lan: +5% Tu Vi khi chung phòng'}
                              {friend.intimacyLevel === 3 && 'Tri Kỷ: +10% Tu Vi & danh hiệu đôi'}
                              {friend.intimacyLevel === 4 && 'Đạo Lữ: Buff Tâm Hữu Linh Tê (+15% thọ nguyên)'}
                            </span>
                          </div>
                        </div>

                        {/* Bottom: Action buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/60">
                          {/* View Profile */}
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playKeyClick();
                              setInspectedFriend(friend);
                            }}
                            title="Xem chi tiết hồ sơ xem trước"
                            className="py-1.5 px-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>Hồ Sơ</span>
                          </button>

                          {/* Whisper */}
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playKeyClick();
                              if (onOpenWhisperChat) {
                                onOpenWhisperChat(friend.username, friend.userId);
                                onClose();
                              }
                            }}
                            title="Truyền Âm Nhập Mật (Mật Đàm 1-1)"
                            className="flex-1 py-1.5 px-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Mật Đàm</span>
                          </button>

                          {/* Invite to Room */}
                          <button
                            type="button"
                            onClick={() => handleInviteToRoom(friend)}
                            title={currentRoomId ? 'Mời vào phòng thi đấu' : 'Thách đấu 1v1'}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <Swords className="w-3.5 h-3.5" />
                            <span>{currentRoomId ? 'Mời Phòng' : 'Tỷ Võ'}</span>
                          </button>

                          {/* Gift Tea */}
                          <button
                            type="button"
                            onClick={() => handleGiftTea(friend)}
                            disabled={!friend.canGiftTeaToday}
                            title={friend.canGiftTeaToday ? 'Mời Ngộ Đạo Trà (+50 Tu Vi, +10 Hảo Cảm)' : 'Hôm nay đã tặng trà rồi'}
                            className="p-1.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <Coffee className="w-3.5 h-3.5" />
                            <span>{friend.canGiftTeaToday ? 'Tặng Trà' : 'Đã Tặng'}</span>
                          </button>

                          {/* Mentorship Guide */}
                          {friend.canGuideToday && (
                            <button
                              type="button"
                              onClick={() => handleMentorGuidance(friend)}
                              title="Chỉ điểm bí kíp gõ phím cho hậu bối (+30 Tu Vi, +20 Hảo Cảm)"
                              className="p-1.5 px-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>Chỉ Điểm</span>
                            </button>
                          )}

                          {/* Dao Lu Propose */}
                          {friend.intimacy >= 2000 && !friend.isDaoLu && (
                            <button
                              type="button"
                              onClick={() => handleProposeDaoLu(friend)}
                              title="Kết Duyên Đạo Lữ (Cần Hảo Cảm >= 2000)"
                              className="p-1.5 px-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            >
                              <Heart className="w-3.5 h-3.5 fill-pink-400" />
                              <span>Cầu Hôn</span>
                            </button>
                          )}

                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => handleRemoveFriend(friend)}
                            title="Hủy kết bái"
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LỜI MỜI CHỜ DUYỆT */}
          {activeTab === 'requests' && (
            <div className="space-y-3 min-h-full">
              {pendingRequests.length === 0 ? (
                <div className="min-h-[340px] flex flex-col items-center justify-center text-center py-12 px-4 space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-2xl">
                    📩
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">Không có lời mời nào đang chờ</h4>
                  <p className="text-xs text-slate-500">
                    Khi các đạo hữu khác gửi lời mời kết bái tới bạn, danh sách sẽ xuất hiện tại đây.
                  </p>
                </div>
              ) : (
                pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-750 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <AvatarWithFrame
                        icon={req.fromAvatar || '⚡'}
                        frameId={req.fromFrame || 'default'}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-white">
                            {req.fromDisplayName || req.fromUsername}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {req.fromRealmName || 'Luyện Khí'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 italic">
                          "{req.message || 'Kết bái đạo hữu!'}"
                        </p>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(req.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleRespondRequest(req.id, 'accept')}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                      >
                        <Check className="w-4 h-4" />
                        <span>Chấp Nhận</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRespondRequest(req.id, 'reject')}
                        className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <X className="w-4 h-4" />
                        <span>Từ Chối</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: TÌM & KẾT GIAO */}
          {activeTab === 'search' && (
            <div className="space-y-5 w-full max-w-3xl mx-auto py-2">
              
              {/* Box 1: Mã UID (Chỉ hiển thị cho đạo hữu đã đăng nhập tài khoản) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    {isLoggedInUser && myUid ? (
                      <>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Mã Đạo Hữu (UID) Của Bạn</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">Đã Đăng Nhập</span>
                        </div>
                        <div className="font-mono font-bold text-xs sm:text-sm text-amber-300 select-all">
                          {myUid}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Thân Phận: Tán Tu</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-750">Chưa có Mã UID</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Chỉ người chơi đã đăng nhập mới có Mã UID để kết bạn chính xác.
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {isLoggedInUser && myUid ? (
                  <button
                    type="button"
                    onClick={handleCopyUid}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUid ? 'Đã Sao Chép!' : 'Sao Chép UID'}</span>
                  </button>
                ) : (
                  onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        onOpenAuth();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 shadow-md shadow-amber-500/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Đăng Nhập Nhận UID</span>
                    </button>
                  )
                )}
              </div>

              {/* Box 2: Khung tìm kiếm thời gian thực */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                      <Search className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white">TÌM KIẾM ĐẠO HỮU</h4>
                      <p className="text-[11px] text-slate-400">Tìm kiếm bằng Tên nhân vật hoặc dán chính xác Mã UID</p>
                    </div>
                  </div>
                  {isSearching && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-[11px]">Đang tìm...</span>
                    </div>
                  )}
                </div>

                {/* Input tìm kiếm */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchTarget}
                    onChange={(e) => setSearchTarget(e.target.value)}
                    placeholder="Nhập tên nhân vật (ví dụ: TienNhan99) hoặc dán mã UID (usr_...)..."
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  {searchTarget && (
                    <button
                      type="button"
                      onClick={() => setSearchTarget('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Lời nhắn gửi đi */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Lời nhắn kết giao:</span>
                    <span className="text-[10px] text-slate-500">{searchMessage.length}/150</span>
                  </label>
                  <textarea
                    value={searchMessage}
                    onChange={(e) => setSearchMessage(e.target.value)}
                    rows={2}
                    maxLength={150}
                    placeholder="Nhập đôi câu tâm sự kết giao đạo hữu..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                {searchTarget.trim() && (
                  <button
                    type="button"
                    onClick={handleSendRequest}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Gửi Lời Mời Trực Tiếp Cho "{searchTarget.trim()}"</span>
                  </button>
                )}
              </div>

              {/* Box 3: Danh sách kết quả tìm kiếm HOẶC Gợi ý đạo hữu trực tuyến */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                      {searchTarget.trim() ? (
                        <>
                          <Search className="w-3.5 h-3.5 text-amber-400" />
                          <span>Kết Quả Tìm Kiếm ({searchResults.length})</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Gợi Ý Đạo Hữu Trực Tuyến & Cao Thủ Tu Chân</span>
                        </>
                      )}
                    </span>
                  </div>

                  {!searchTarget.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        loadSuggestions();
                      }}
                      className="text-[11px] text-slate-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Làm mới gợi ý</span>
                    </button>
                  )}
                </div>

                {/* Candidate Cards Grid */}
                {searchTarget.trim() ? (
                  searchResults.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                      <div className="text-3xl">🔍</div>
                      <p className="text-xs font-bold text-slate-300">Không tìm thấy người chơi nào phù hợp</p>
                      <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                        Đạo hữu hãy kiểm tra lại chính xác tên đăng nhập hoặc Mã UID của đối phương, hoặc nhấn nút gửi trực tiếp ở trên.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {searchResults.map((candidate) => (
                        <CandidateCard
                          key={candidate.id}
                          candidate={candidate}
                          sendingTargetId={sendingTargetId}
                          pendingRequests={pendingRequests}
                          onSend={handleSendToCandidate}
                          onAccept={handleRespondRequest}
                          onInspect={setInspectedFriend}
                        />
                      ))}
                    </div>
                  )
                ) : suggestions.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                    <div className="text-3xl">🧘‍♂️</div>
                    <p className="text-xs font-bold text-slate-300">Chưa có gợi ý người chơi nào</p>
                    <p className="text-[11px] text-slate-500">
                      Hãy nhập tên hoặc UID ở thanh tìm kiếm phía trên để kết giao đạo hữu.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {suggestions.map((candidate) => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        sendingTargetId={sendingTargetId}
                        pendingRequests={pendingRequests}
                        onSend={handleSendToCandidate}
                        onAccept={handleRespondRequest}
                        onInspect={setInspectedFriend}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Lợi ích kết bái đạo hữu */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="font-bold text-amber-400 flex items-center gap-1.5 uppercase text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Quyền Lợi & Lợi Ích Kết Bái Đạo Hữu</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc list-inside">
                  <li><strong className="text-slate-200">Mời thi đấu tức thời:</strong> 1-chạm kéo bạn bè vào phòng so tài gõ phím.</li>
                  <li><strong className="text-slate-200">Mời Ngộ Đạo Trà:</strong> Mỗi ngày nhận thêm +50 Tu Vi EXP miễn phí.</li>
                  <li><strong className="text-slate-200">Chỉ điểm công lực:</strong> Tu sĩ cảnh giới cao truyền dạy kinh nghiệm gõ phím cho đệ tử.</li>
                  <li><strong className="text-slate-200">Kết Duyên Đạo Lữ:</strong> Bậc 3 (Tri Kỷ) mở khóa đại lễ kết duyên, nhận buff Tâm Hữu Linh Tê bất tử thọ nguyên.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: ĐẠO LỮ ĐỒNG TU */}
          {activeTab === 'daolu' && (
            <div className="space-y-6 w-full max-w-2xl mx-auto py-2">
              {daoLuFriend ? (
                <div className="p-6 rounded-3xl bg-gradient-to-b from-pink-950/60 via-purple-950/40 to-slate-950 border-2 border-pink-500/60 text-center space-y-4 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-3xl opacity-20">💖</div>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-pink-500/40 animate-pulse">
                    💍
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                      ĐẠI LỄ KẾT DUYÊN HOÀN TẤT
                    </span>
                    <h3 className="text-lg font-black text-white mt-1">
                      {currentUser?.displayName || currentUser?.username} & {daoLuFriend.displayName || daoLuFriend.username}
                    </h3>
                    <p className="text-xs text-pink-200 font-semibold italic mt-0.5">
                      « Bạch Đầu Giai Lão • Tâm Đầu Ý Hợp »
                    </p>
                  </div>

                  {/* Buff overview */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-pink-500/30 text-left space-y-2">
                    <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-pink-400" />
                      <span>HIỆU ỨNG: TÂM HỮU LINH TÊ</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Hai vị đạo hữu đã kết khế ước linh hồn. Khi cùng nhau thi đấu hoặc bế quan, tốc độ hồi phục Thọ Nguyên tăng thêm <strong className="text-emerald-400">+15%</strong> và giảm 10% tiêu hao độ bền pháp bảo.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        if (onOpenWhisperChat) {
                          onOpenWhisperChat(daoLuFriend.username, daoLuFriend.userId);
                          onClose();
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-pink-500/20 transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Truyền Âm Cho Đạo Lữ</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-3xl bg-slate-950/70 border border-slate-800 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-3xl mx-auto text-pink-400">
                    💖
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">CHƯA CÓ ĐẠO LỮ ĐỒNG TU</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                      Đại đạo độc hành vốn cô liêu. Khi cùng một đạo hữu tích lũy điểm Hảo Cảm đạt mốc <strong className="text-pink-400">2000 Điểm (Bậc 3 - Tri Kỷ)</strong>, hai người có thể tiến hành đại lễ Kết Duyên Đạo Lữ!
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-2 text-xs text-slate-300">
                    <div className="font-bold text-pink-300 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-pink-400" />
                      <span>Cách Thức Kết Duyên:</span>
                    </div>
                    <ol className="space-y-1.5 text-[11px] text-slate-400 list-decimal list-inside">
                      <li>Tặng Ngộ Đạo Trà hằng ngày cho đạo hữu (+10 Hảo Cảm/lần).</li>
                      <li>Cùng nhau thi đấu trong phòng đua chữ hoặc săn boss (+5 Hảo Cảm/ván).</li>
                      <li>Trò chuyện Mật Đàm thường xuyên để gia tăng thấu hiểu.</li>
                      <li>Khi đạt 2000 điểm, bấm nút [Cầu Hôn] trong danh sách bạn bè để lập khế ước!</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Preview Profile Modal when inspecting any friend */}
      {inspectedFriend && (
        <PlayerSimpleProfileModal
          isOpen={Boolean(inspectedFriend)}
          player={inspectedFriend}
          onClose={() => setInspectedFriend(null)}
          currentUser={currentUser}
          onOpenWhisper={(uName, uId) => {
            if (onOpenWhisperChat) {
              onOpenWhisperChat(uName, uId);
              setInspectedFriend(null);
              onClose();
            }
          }}
        />
      )}
    </div>
  );
};

interface CandidateCardProps {
  candidate: any;
  sendingTargetId: string | null;
  pendingRequests: FriendRequest[];
  onSend: (candidate: any) => void;
  onAccept: (requestId: string, action: 'accept' | 'reject') => void;
  onInspect: (friend: any) => void;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  sendingTargetId,
  pendingRequests,
  onSend,
  onAccept,
  onInspect,
}) => {
  const isSending = sendingTargetId === candidate.id;
  const matchingPending = pendingRequests.find(
    (r) =>
      r.fromUserId === candidate.id ||
      (r.fromUsername && candidate.username && r.fromUsername.toLowerCase() === candidate.username.toLowerCase()) ||
      r.id === candidate.id
  );

  return (
    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between gap-3 shadow-md">
      <div className="flex items-start gap-3">
        <div 
          onClick={() => onInspect(candidate)}
          className="cursor-pointer hover:scale-105 transition-transform shrink-0"
        >
          <AvatarWithFrame
            icon={candidate.avatar || '⚡'}
            frameId={candidate.frame || 'default'}
            size="md"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span 
              onClick={() => onInspect(candidate)}
              className="font-bold text-xs sm:text-sm text-white truncate cursor-pointer hover:text-amber-300 transition-colors"
            >
              {candidate.displayName || candidate.username}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {candidate.realmName || 'Luyện Khí'}
            </span>
            {candidate.hasUid && candidate.isExactUidMatch && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Khớp chính xác UID
              </span>
            )}
          </div>

          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono truncate">
            <span>@{candidate.username}</span>
            <span>•</span>
            {candidate.hasUid ? (
              <span className="text-amber-400/90 font-semibold truncate" title={candidate.id}>
                UID: {candidate.id.length > 14 ? `${candidate.id.slice(0, 10)}...` : candidate.id}
              </span>
            ) : (
              <span className="text-slate-500 font-sans italic">
                Tán Tu
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {candidate.status === 'online' && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Trực Tuyến
              </span>
            )}
            {candidate.status === 'in_match' && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                <Swords className="w-3 h-3 text-amber-400" />
                Đang Thi Đấu
              </span>
            )}
            {candidate.status === 'offline' && (
              <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                Ngoại Tuyến
              </span>
            )}

            {typeof candidate.bestWpm === 'number' && candidate.bestWpm > 0 && (
              <span className="text-[10px] text-slate-400 font-mono">
                {candidate.bestWpm} WPM
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-end gap-2">
        {candidate.isFriend ? (
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Tri Kỷ</span>
          </span>
        ) : matchingPending || candidate.isPendingReceived ? (
          <button
            type="button"
            onClick={() => {
              onAccept(matchingPending?.id || candidate.pendingRequestId || candidate.id, 'accept');
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md shadow-emerald-500/20"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Chấp Nhận Kết Bạn</span>
          </button>
        ) : candidate.isPendingSent ? (
          <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Đã Gửi Lời Mời</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onSend(candidate)}
            disabled={isSending}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/15 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserPlus className="w-3.5 h-3.5" />
            )}
            <span>Kết Bạn</span>
          </button>
        )}
      </div>
    </div>
  );
};

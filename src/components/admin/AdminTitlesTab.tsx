import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Trophy, 
  Award, 
  RotateCcw, 
  Crown, 
  Check, 
  Search, 
  Sparkles, 
  Shield, 
  UserCheck, 
  Zap, 
  Flame, 
  Save, 
  Filter,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Edit3,
  Sliders,
  Star,
  UserPlus,
  ArrowUpRight,
  Eye,
  X,
  ChevronDown,
  Layers,
  Medal,
  Activity
} from 'lucide-react';
import { HighScoreRecord } from '../../types';
import { soundFx } from '../../utils/audio';
import { CHAMPION_TITLES, ADMIN_TITLE } from '../../utils/titles';
import { 
  AVATAR_FRAMES, 
  AvatarWithFrame, 
  AvatarFrameConfig, 
  getFrameConfig,
  setStoredFrame,
  addCustomOwnedFrame
} from '../../utils/frames';
import { getStoredAuthToken } from '../../utils/auth';

interface AdminTitlesTabProps {
  highScores: Record<string, HighScoreRecord | null>;
  onUpdateHighScores: (updater: (prev: Record<string, HighScoreRecord | null>) => Record<string, HighScoreRecord | null>) => void;
  onResetLeaderboard: (modeKey?: string) => void;
  currentUsername: string;
  currentUser?: any;
  showToast: (msg: string) => void;
}

export interface AdminUserDataSimple {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  frame?: string;
  bestWpm?: number;
  cultivationRealm?: string;
  level?: number;
  sectName?: string;
}

export interface ServerLeaderboardRankingItem {
  rank: number;
  userId?: string;
  username: string;
  displayName: string;
  avatar?: string;
  frame?: string;
  wpm: number;
  score: number;
  errors?: number;
  accuracy?: number;
  timestamp: number;
  sectName?: string;
  sectTag?: string;
  sectRole?: string;
  realmName?: string;
  realmIcon?: string;
  level?: number;
}

export const AdminTitlesTab: React.FC<AdminTitlesTabProps> = ({
  highScores,
  onUpdateHighScores,
  onResetLeaderboard,
  currentUsername,
  currentUser,
  showToast,
}) => {
  // Navigation inside Titles Tab: 3 tabs
  const [activeSubTab, setActiveSubTab] = useState<'champions' | 'rankings' | 'frame_granter'>('champions');

  // Local copy of high scores
  const [localScores, setLocalScores] = useState<Record<string, HighScoreRecord | null>>(() => ({ ...highScores }));
  const [isSavingScores, setIsSavingScores] = useState(false);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());

  // Rankings state
  const [rankingsData, setRankingsData] = useState<Record<string, { daily: ServerLeaderboardRankingItem[]; weekly: ServerLeaderboardRankingItem[]; all_time: ServerLeaderboardRankingItem[] }>>({});
  const [selectedRankMode, setSelectedRankMode] = useState<string>('vi_dau');
  const [selectedRankPeriod, setSelectedRankPeriod] = useState<'all_time' | 'weekly' | 'daily'>('all_time');
  const [isDeletingRanking, setIsDeletingRanking] = useState<string | null>(null);

  // All Users List for selecting users to grant frame or make champion
  const [userList, setUserList] = useState<AdminUserDataSimple[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Frame Granter state
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [customUsernameInput, setCustomUsernameInput] = useState<string>('');
  const [userSearchFilter, setUserSearchFilter] = useState<string>('');
  const [selectedFrameId, setSelectedFrameId] = useState<string>('admin_gold');
  const [frameCategoryFilter, setFrameCategoryFilter] = useState<'all' | 'champion' | 'xianxia' | 'mythic' | 'progression' | 'default'>('all');
  const [frameSearchFilter, setFrameSearchFilter] = useState<string>('');
  const [isGrantingFrame, setIsGrantingFrame] = useState(false);

  // Modal / Dropdown state for selecting user for a specific champion mode
  const [modePickingUser, setModePickingUser] = useState<string | null>(null);

  // Fetch full leaderboard directly from server
  const fetchLeaderboard = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoadingLeaderboard(true);
    try {
      const res = await fetch(`/api/leaderboard?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.highScores && typeof data.highScores === 'object') {
          setLocalScores(data.highScores);
          onUpdateHighScores(() => data.highScores);
        }
        if (data.rankings && typeof data.rankings === 'object') {
          setRankingsData(data.rankings);
        }
        setLastSyncTime(Date.now());
      }
    } catch (err) {
      console.error('Lỗi nạp dữ liệu Bảng Vàng từ máy chủ:', err);
    } finally {
      if (!quiet) setIsLoadingLeaderboard(false);
    }
  }, [onUpdateHighScores]);

  // Fetch users for dropdowns and frame granter
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const token = getStoredAuthToken();
      const headers: Record<string, string> = { 'x-admin-key': 'fasttyping-admin' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/users?_t=${Date.now()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) {
          setUserList(data.users);
          if (data.users.length > 0 && !selectedUsername) {
            const currentU = data.users.find((u: any) => u.username === currentUsername);
            const target = currentU ? currentU.username : data.users[0].username;
            setSelectedUsername(target);
            setCustomUsernameInput(target);
          }
        }
      }
    } catch (err) {
      console.error('Lỗi nạp danh sách tài khoản cho Bảng Vàng:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentUsername, selectedUsername]);

  useEffect(() => {
    fetchUsers();
    fetchLeaderboard();
  }, [fetchUsers, fetchLeaderboard]);

  // Synchronize when highScores prop changes from parent
  useEffect(() => {
    if (highScores && Object.keys(highScores).length > 0) {
      setLocalScores((prev) => ({ ...prev, ...highScores }));
    }
  }, [highScores]);

  // Handle single mode champion change
  const handleScoreChange = (
    modeKey: string, 
    field: 'username' | 'displayName' | 'wpm' | 'score' | 'accuracy' | 'avatar', 
    val: string | number
  ) => {
    setLocalScores((prev) => {
      const current = prev[modeKey] || {
        username: currentUsername,
        displayName: currentUsername,
        wpm: 100,
        score: 1000,
        errors: 0,
        accuracy: 98,
        timestamp: Date.now(),
      };

      const updated: any = {
        ...current,
        [field]: val,
        timestamp: Date.now(),
      };

      // If user typed in displayName or username, attempt to link with existing user
      if ((field === 'displayName' || field === 'username') && typeof val === 'string') {
        const clean = val.replace(/^@/, '').trim().toLowerCase();
        const found = userList.find((u) => 
          u.username.toLowerCase() === clean || 
          (u.displayName && u.displayName.toLowerCase() === clean)
        );
        if (found) {
          updated.username = found.username;
          if (field === 'username') updated.displayName = found.displayName || found.username;
          if (found.avatar) updated.avatar = found.avatar;
          if (found.frame) updated.frame = found.frame;
          if (found.id) updated.userId = found.id;
          if (found.cultivationRealm) updated.realmName = found.cultivationRealm;
        } else {
          if (field === 'displayName') {
            updated.username = val.trim();
          }
        }
      }

      return {
        ...prev,
        [modeKey]: updated,
      };
    });
  };

  // Quick Pick User as Champion for a mode
  const handlePickUserForMode = (modeKey: string, user: AdminUserDataSimple) => {
    soundFx.playKeyClick();
    setLocalScores((prev) => {
      const current = prev[modeKey];
      return {
        ...prev,
        [modeKey]: {
          username: user.username,
          displayName: user.displayName || user.username,
          userId: user.id,
          avatar: user.avatar || '🧘',
          frame: user.frame || 'default',
          wpm: user.bestWpm && user.bestWpm > 0 ? user.bestWpm : (current?.wpm || 110),
          score: current?.score || ((user.bestWpm || 100) * 10),
          errors: current?.errors || 0,
          accuracy: current?.accuracy || 98,
          timestamp: Date.now(),
        },
      };
    });
    setModePickingUser(null);
    showToast(`Đã chọn @${user.displayName || user.username} làm Quán Quân "${CHAMPION_TITLES[modeKey]?.modeName || modeKey}". Bấm "Lưu Bảng Vàng" để đồng bộ!`);
  };

  // Assign mode champion to current admin
  const handleAssignToMe = (modeKey: string) => {
    soundFx.playKeyClick();
    const myName = (currentUser as any)?.displayName || currentUser?.username || currentUsername;
    const myUsername = currentUser?.username || currentUsername;
    const myAvatar = currentUser?.avatar || '👑';
    const myFrame = currentUser?.frame || 'admin_gold';

    setLocalScores((prev) => ({
      ...prev,
      [modeKey]: {
        username: myUsername,
        displayName: myName,
        userId: currentUser?.id,
        avatar: myAvatar,
        frame: myFrame,
        wpm: 128,
        score: 1280,
        errors: 0,
        accuracy: 99,
        timestamp: Date.now(),
      },
    }));

    showToast(`Đã gán Quán Quân "${CHAMPION_TITLES[modeKey]?.modeName || modeKey}" cho Bạn! Nhớ bấm "Lưu Bảng Vàng".`);
  };

  // Save all high scores to Server & Database
  const handleSaveAllScores = async () => {
    soundFx.playKeyClick();
    setIsSavingScores(true);

    try {
      const token = getStoredAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-key': 'fasttyping-admin',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/leaderboard/admin-update', {
        method: 'POST',
        headers,
        body: JSON.stringify({ highScores: localScores }),
      });

      const data = await res.json();
      if (data.success) {
        soundFx.playSuccess();
        onUpdateHighScores(() => localScores);
        setLastSyncTime(Date.now());
        showToast('Đã lưu & đồng bộ toàn bộ Bảng Vàng lên Máy Chủ & Cơ Sở Dữ Liệu!');
        fetchLeaderboard(true);
      } else {
        showToast(data.error || 'Lỗi khi lưu bảng vàng');
      }
    } catch {
      showToast('Lỗi máy chủ khi cập nhật bảng vàng');
    } finally {
      setIsSavingScores(false);
    }
  };

  // Reset single mode leaderboard
  const handleResetSingle = async (modeKey: string, modeName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn đặt lại bảng vàng cho chế độ "${modeName}" không? Kỷ lục hiện tại sẽ bị xóa.`)) {
      return;
    }
    soundFx.playKeyClick();

    try {
      const token = getStoredAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-key': 'fasttyping-admin',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/leaderboard/admin-reset', {
        method: 'POST',
        headers,
        body: JSON.stringify({ mode: modeKey }),
      });

      if (res.ok) {
        setLocalScores((prev) => ({
          ...prev,
          [modeKey]: null,
        }));
        onResetLeaderboard(modeKey);
        showToast(`Đã đặt lại bảng vàng cho chế độ ${modeName}!`);
        fetchLeaderboard(true);
      } else {
        showToast('Lỗi máy chủ khi đặt lại bảng vàng');
      }
    } catch {
      showToast('Lỗi khi đặt lại bảng vàng');
    }
  };

  // Reset all modes leaderboard
  const handleResetAll = async () => {
    if (!window.confirm('CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn xóa và đặt lại TOÀN BỘ Bảng Vàng tất cả 8 chế độ không?')) {
      return;
    }
    soundFx.playKeyClick();

    try {
      const token = getStoredAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-key': 'fasttyping-admin',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/leaderboard/admin-reset', {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const cleared: Record<string, HighScoreRecord | null> = {};
        Object.keys(CHAMPION_TITLES).forEach((k) => {
          cleared[k] = null;
        });
        setLocalScores(cleared);
        onResetLeaderboard();
        showToast('Đã đặt lại toàn bộ Bảng Vàng tất cả chế độ thành công!');
        fetchLeaderboard(true);
      } else {
        showToast('Lỗi khi đặt lại toàn bộ bảng vàng');
      }
    } catch {
      showToast('Lỗi khi đặt lại bảng vàng');
    }
  };

  // Remove a ranking entry
  const handleDeleteRankingEntry = async (modeKey: string, item: ServerLeaderboardRankingItem) => {
    if (!window.confirm(`Xóa điểm số của @${item.displayName || item.username} (${item.wpm} WPM) khỏi bảng xếp hạng ${modeKey}?`)) {
      return;
    }
    setIsDeletingRanking(item.username);
    soundFx.playKeyClick();

    try {
      const token = getStoredAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-key': 'fasttyping-admin',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/leaderboard/admin-remove-ranking', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: modeKey,
          period: selectedRankPeriod,
          username: item.username,
          userId: item.userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        soundFx.playSuccess();
        showToast(data.message || 'Đã xóa bản ghi thành công!');
        fetchLeaderboard(true);
      } else {
        showToast(data.error || 'Lỗi khi xóa bản ghi');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ');
    } finally {
      setIsDeletingRanking(null);
    }
  };

  // Promote a ranking player to Mode Champion
  const handlePromoteRankingToChampion = (modeKey: string, item: ServerLeaderboardRankingItem) => {
    soundFx.playKeyClick();
    setLocalScores((prev) => ({
      ...prev,
      [modeKey]: {
        username: item.username,
        displayName: item.displayName || item.username,
        userId: item.userId,
        avatar: item.avatar || '🧘',
        frame: item.frame || 'default',
        wpm: item.wpm,
        score: item.score,
        errors: item.errors || 0,
        accuracy: item.accuracy || 100,
        timestamp: item.timestamp || Date.now(),
      },
    }));
    setActiveSubTab('champions');
    showToast(`Đã thiết lập @${item.displayName || item.username} làm Quán Quân "${CHAMPION_TITLES[modeKey]?.modeName || modeKey}". Hãy bấm "Lưu Bảng Vàng" để xác nhận!`);
  };

  // Grant frame to user
  const handleGrantFrameToUser = async (targetUser: string, frameId: string) => {
    const cleanTarget = String(targetUser || '').replace(/^@/, '').trim();
    if (!cleanTarget) {
      showToast('Vui lòng chọn hoặc nhập tên người chơi cần gắn khung!');
      return;
    }

    soundFx.playKeyClick();
    setIsGrantingFrame(true);

    try {
      const token = getStoredAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-key': 'fasttyping-admin',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'set_frame',
          username: cleanTarget,
          frameId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        soundFx.playSuccess();
        showToast(data.message || `Đã gắn khung [${frameId}] cho @${cleanTarget} thành công!`);

        // If granted to current admin user, update local storage state immediately
        const isMe = cleanTarget.toLowerCase() === currentUsername.toLowerCase() || 
          (currentUser && (cleanTarget.toLowerCase() === String(currentUser.username || '').toLowerCase()));
        if (isMe) {
          setStoredFrame(frameId);
          addCustomOwnedFrame(frameId);
        }

        // Update user in local userList
        setUserList((prev) =>
          prev.map((u) => {
            if (u.username.toLowerCase() === cleanTarget.toLowerCase() || 
                (u.displayName && u.displayName.toLowerCase() === cleanTarget.toLowerCase())) {
              return { ...u, frame: frameId };
            }
            return u;
          })
        );

        // Also update local copy of leaderboard if that user is on it
        setLocalScores((prev) => {
          let modified = false;
          const nextScores = { ...prev };
          for (const [k, rawVal] of Object.entries(nextScores)) {
            const v = rawVal as HighScoreRecord | null;
            if (v && v.username && v.username.toLowerCase() === cleanTarget.toLowerCase()) {
              nextScores[k] = { ...v, frame: frameId };
              modified = true;
            }
          }
          return modified ? nextScores : prev;
        });

        // Background reload users and leaderboard
        fetchUsers();
        fetchLeaderboard(true);
      } else {
        showToast(data.error || 'Lỗi khi gắn khung cho người chơi');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ');
    } finally {
      setIsGrantingFrame(false);
    }
  };

  // Selected User Object for Frame Granter
  const selectedUserObj = useMemo(() => {
    const target = customUsernameInput.trim() || selectedUsername.trim();
    if (!target) return null;
    const clean = target.replace(/^@/, '').toLowerCase();
    return userList.find((u) => 
      u.username.toLowerCase() === clean || 
      (u.displayName && u.displayName.toLowerCase() === clean)
    ) || null;
  }, [userList, selectedUsername, customUsernameInput]);

  // Filtered users for dropdown search
  const filteredUsers = useMemo(() => {
    if (!userSearchFilter.trim()) return userList;
    const q = userSearchFilter.toLowerCase();
    return userList.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.cultivationRealm && u.cultivationRealm.toLowerCase().includes(q))
    );
  }, [userList, userSearchFilter]);

  // Filtered frames
  const filteredFrames = useMemo(() => {
    return AVATAR_FRAMES.filter((f) => {
      // Category filter
      if (frameCategoryFilter === 'champion') {
        if (!(f.category === 'champion' || f.id.startsWith('top_') || f.id === 'frame_kim_bang')) return false;
      } else if (frameCategoryFilter === 'xianxia') {
        if (!(f.category === 'xianxia' || f.id.startsWith('frame_xianxia_'))) return false;
      } else if (frameCategoryFilter === 'mythic') {
        if (!(f.rarity === 'mythic' || f.rarity === 'legendary' || f.id === 'admin_gold')) return false;
      } else if (frameCategoryFilter === 'progression') {
        if (!(f.category === 'progression' || f.rarity === 'rare' || f.rarity === 'epic')) return false;
      } else if (frameCategoryFilter === 'default') {
        if (f.id !== 'default') return false;
      }

      // Text search filter
      if (frameSearchFilter.trim()) {
        const q = frameSearchFilter.toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q) ||
          f.desc.toLowerCase().includes(q) ||
          f.tag.toLowerCase().includes(q) ||
          (f.topModeName && f.topModeName.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [frameCategoryFilter, frameSearchFilter]);

  // Selected frame config
  const selectedFrameConfig = useMemo(() => {
    return AVATAR_FRAMES.find((f) => f.id === selectedFrameId) || AVATAR_FRAMES[0];
  }, [selectedFrameId]);

  // Rankings of currently selected mode and period
  const currentModeRankings = useMemo(() => {
    return rankingsData[selectedRankMode]?.[selectedRankPeriod] || [];
  }, [rankingsData, selectedRankMode, selectedRankPeriod]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Sub-Tabs Switcher */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-900 border border-amber-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/20 via-yellow-500/20 to-amber-600/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 shrink-0">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-amber-400 tracking-wide flex items-center gap-2">
                BẢNG VÀNG THIÊN ĐẠO & GẮN KHUNG ĐẠI DIỆN
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Thần Bảng FastTyping
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Quản trị 8 Quán Quân Thiên Bảng, tra cứu bảng xếp hạng thời gian thực & Ban gắn Khung Avatar cho bất kỳ người chơi nào
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {/* Subtab Toggle Buttons */}
          <div className="flex items-center gap-1 bg-slate-900/95 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              type="button"
              id="subtab-admin-champions"
              onClick={() => {
                soundFx.playKeyClick();
                setActiveSubTab('champions');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'champions'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Quán Quân 8 Màn</span>
            </button>

            <button
              type="button"
              id="subtab-admin-rankings"
              onClick={() => {
                soundFx.playKeyClick();
                setActiveSubTab('rankings');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'rankings'
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-md shadow-emerald-400/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Medal className="w-3.5 h-3.5" />
              <span>Top Bảng Xếp Hạng</span>
            </button>

            <button
              type="button"
              id="subtab-admin-frame-granter"
              onClick={() => {
                soundFx.playKeyClick();
                setActiveSubTab('frame_granter');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'frame_granter'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>Gắn Khung Bất Kỳ Ai</span>
            </button>
          </div>

          {/* Quick Refresh Button */}
          <button
            type="button"
            title="Làm mới dữ liệu từ Máy Chủ"
            onClick={() => {
              soundFx.playKeyClick();
              fetchLeaderboard();
              fetchUsers();
              showToast('Đã làm mới dữ liệu Bảng Vàng từ máy chủ!');
            }}
            disabled={isLoadingLeaderboard}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingLeaderboard ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Save HighScores Button */}
          {activeSubTab === 'champions' && (
            <button
              type="button"
              id="btn-admin-save-leaderboard"
              onClick={handleSaveAllScores}
              disabled={isSavingScores}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingScores ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Lưu Bảng Vàng</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Status Bar */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span>Đồng bộ máy chủ: <strong className="text-slate-200">Supabase Pooler & In-Memory Cache</strong></span>
        </div>
        <div>
          Cập nhật lần cuối: <span className="font-mono text-amber-300/90">{new Date(lastSyncTime).toLocaleTimeString('vi-VN')}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: QUÁN QUÂN 8 CHẾ ĐỘ THI ĐẤU */}
      {/* ========================================================================= */}
      {activeSubTab === 'champions' && (
        <div className="space-y-6">
          {/* Admin Supreme Title Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-950 to-slate-900 border-2 border-amber-500/50 flex flex-col sm:flex-row items-center gap-4 shadow-xl shadow-amber-500/10">
            <div className="relative shrink-0">
              <AvatarWithFrame
                icon="👑"
                frameId="admin_gold"
                size="lg"
                showBadge={true}
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-1">
                {ADMIN_TITLE.tag}
              </div>
              <h4 className="text-base font-black text-amber-400">
                {ADMIN_TITLE.name}
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                &ldquo;{ADMIN_TITLE.description}&rdquo;
              </p>
              <div className="text-xs text-amber-300/90 font-semibold mt-1 flex items-center gap-1.5 justify-center sm:justify-start">
                <span>Tài khoản Quản Trị ({currentUsername}):</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Khung Hoàng Kim 360° Đang Kích Hoạt
                </span>
              </div>
            </div>

            {/* Master Reset All Button */}
            <button
              type="button"
              id="btn-admin-reset-all-leaderboard"
              onClick={handleResetAll}
              className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 text-rose-300 hover:text-rose-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt Lại Toàn Bộ Bảng Vàng</span>
            </button>
          </div>

          {/* Champions Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Danh Sách 8 Chế Độ Thi Đấu & Quán Quân Đăng Đỉnh:</span>
              </h4>
              <span className="text-xs text-amber-400 font-medium">
                * Bấm nút "Chọn tài khoản" hoặc "Gán tôi" để thiết lập Quán Quân bất kỳ
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(CHAMPION_TITLES).map(([modeKey, titleData]) => {
                const score = localScores[modeKey];
                const holderUsername = score?.username || '';
                const holderDisplayName = score?.displayName || holderUsername || 'Chưa xác lập';
                const frameIdForMode = `top_${modeKey}`;
                const isConfigured = Boolean(score && score.username);

                return (
                  <div
                    key={modeKey}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 flex flex-col justify-between gap-3.5 hover:border-slate-700 shadow-lg transition-all relative overflow-hidden"
                  >
                    {/* Top ambient glow */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

                    <div className="flex items-start gap-3.5">
                      {/* Avatar With Mode Champion Frame Preview */}
                      <div className="shrink-0 pt-1">
                        <AvatarWithFrame
                          icon={score?.avatar || titleData.badge || '🏆'}
                          frameId={score?.frame || frameIdForMode}
                          size="md"
                          showBadge={true}
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className={`text-sm font-black truncate ${titleData.colorClass}`}>
                            {titleData.name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] bg-slate-900 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                              {titleData.modeName}
                            </span>
                            {isConfigured ? (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black border border-emerald-500/30 uppercase">
                                Đã có kỷ lục
                              </span>
                            ) : (
                              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">
                                Trống
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 italic line-clamp-1">
                          &ldquo;{titleData.description}&rdquo;
                        </p>

                        {/* Champion Inputs: Name & WPM */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {/* Username / Display Name Input */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                              <span>Tên Quán Quân:</span>
                              <button
                                type="button"
                                onClick={() => setModePickingUser(modePickingUser === modeKey ? null : modeKey)}
                                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer lowercase"
                              >
                                <UserPlus className="w-2.5 h-2.5" /> chọn
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={holderDisplayName}
                                onChange={(e) => handleScoreChange(modeKey, 'displayName', e.target.value)}
                                placeholder="Nhập tên người chơi..."
                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-amber-300 font-bold text-xs focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          {/* WPM Input */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">
                              Kỷ lục WPM:
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                max={500}
                                value={score?.wpm ?? 100}
                                onChange={(e) => handleScoreChange(modeKey, 'wpm', Number(e.target.value))}
                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-emerald-400 font-bold font-mono text-xs focus:outline-none focus:border-emerald-400"
                              />
                              <button
                                type="button"
                                title="Gán danh hiệu này cho Tôi"
                                onClick={() => handleAssignToMe(modeKey)}
                                className="px-2 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-black shrink-0 transition-colors cursor-pointer"
                              >
                                Gán tôi
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Inline Dropdown for picking user */}
                        {modePickingUser === modeKey && (
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-cyan-500/40 space-y-2 shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                              <span>Chọn người chơi từ danh sách ({userList.length}):</span>
                              <button
                                type="button"
                                onClick={() => setModePickingUser(null)}
                                className="text-slate-400 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                              {userList.map((u) => (
                                <button
                                  key={u.id || u.username}
                                  type="button"
                                  onClick={() => handlePickUserForMode(modeKey, u)}
                                  className="w-full text-left p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{u.avatar || '🧘'}</span>
                                    <span className="font-bold text-slate-200">@{u.username}</span>
                                    <span className="text-[10px] text-slate-400">({u.displayName || u.username})</span>
                                  </div>
                                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                                    {u.bestWpm || 0} WPM
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Additional stats: Score & Accuracy */}
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800/80 text-[10px]">
                            <span className="text-slate-400">Điểm:</span>
                            <input
                              type="number"
                              value={score?.score ?? 1000}
                              onChange={(e) => handleScoreChange(modeKey, 'score', Number(e.target.value))}
                              className="w-16 bg-transparent text-right font-mono font-bold text-cyan-400 focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800/80 text-[10px]">
                            <span className="text-slate-400">Độ chuẩn:</span>
                            <div className="flex items-center gap-0.5">
                              <input
                                type="number"
                                min={50}
                                max={100}
                                value={score?.accuracy ?? 98}
                                onChange={(e) => handleScoreChange(modeKey, 'accuracy', Number(e.target.value))}
                                className="w-10 bg-transparent text-right font-mono font-bold text-emerald-400 focus:outline-none"
                              />
                              <span className="text-slate-500 font-bold">%</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Action: Grant this mode's champion frame directly */}
                        {holderUsername && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-slate-500">
                              Khung: <code className="text-cyan-400 font-mono">{frameIdForMode}</code>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleGrantFrameToUser(holderUsername, frameIdForMode)}
                              disabled={isGrantingFrame}
                              className="text-[10px] px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/50 text-cyan-300 font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Crown className="w-3 h-3 text-amber-300" />
                              <span>Gắn Khung Này Cho @{holderDisplayName}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mode Card Footer */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {score ? `Kỷ lục: ${score.wpm} WPM • ${score.score || 0} điểm` : 'Chưa có kỷ lục nào'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUsername(holderUsername);
                            setCustomUsernameInput(holderUsername);
                            setSelectedFrameId(frameIdForMode);
                            setActiveSubTab('frame_granter');
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-cyan-950/50 border border-slate-800 hover:border-cyan-700 text-cyan-400 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Crown className="w-3 h-3 text-amber-300" />
                          <span>Mở Gắn Khung</span>
                        </button>

                        <button
                          type="button"
                          id={`btn-reset-leaderboard-${modeKey}`}
                          onClick={() => handleResetSingle(modeKey, titleData.modeName)}
                          className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-700 text-rose-400 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Đặt Lại</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: BẢNG XẾP HẠNG ĐUA TOP THỜI GIAN THỰC (RANKINGS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'rankings' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Medal className="w-4 h-4 text-emerald-400" />
                <span>Tra Cứu Bảng Xếp Hạng Đua Top Theo Chế Độ</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Xem bảng xếp hạng All-Time, Tuần hoặc Ngày. Admin có thể phong bất kỳ ai làm Quán Quân hoặc xóa kỷ lục bất thường.
              </p>
            </div>

            {/* Mode & Period Pickers */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedRankMode}
                onChange={(e) => setSelectedRankMode(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-bold focus:outline-none"
              >
                {Object.entries(CHAMPION_TITLES).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.modeName} ({item.name})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedRankPeriod('all_time')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    selectedRankPeriod === 'all_time' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Toàn Thời Gian
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRankPeriod('weekly')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    selectedRankPeriod === 'weekly' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tuần Này
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRankPeriod('daily')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    selectedRankPeriod === 'daily' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Hôm Nay
                </button>
              </div>
            </div>
          </div>

          {/* Rankings Table / List */}
          {currentModeRankings.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
              <Award className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-300">
                Chưa có dữ liệu xếp hạng cho chế độ này trong kỳ đã chọn
              </div>
              <p className="text-xs text-slate-500">
                Khi các đạo hữu tham gia thi đấu, hệ thống sẽ tự động cập nhật danh sách tại đây
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentModeRankings.map((item, idx) => {
                const rankNum = idx + 1;
                const isTop1 = rankNum === 1;
                const isTop2 = rankNum === 2;
                const isTop3 = rankNum === 3;

                return (
                  <div
                    key={`${item.username}-${idx}`}
                    className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                      isTop1
                        ? 'bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-900 border-amber-500/60 shadow-lg shadow-amber-500/10'
                        : isTop2
                        ? 'bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-slate-700'
                        : isTop3
                        ? 'bg-gradient-to-r from-amber-950/20 via-slate-950 to-slate-900 border-amber-800/40'
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Rank & User Info */}
                    <div className="flex items-center gap-3">
                      {/* Rank Badge */}
                      <div
                        className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                          isTop1
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 shadow-md shadow-yellow-500/30'
                            : isTop2
                            ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-950'
                            : isTop3
                            ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${rankNum}`}
                      </div>

                      {/* Avatar with Frame */}
                      <AvatarWithFrame
                        icon={item.avatar || '🧘'}
                        frameId={item.frame || (isTop1 ? 'frame_kim_bang' : 'default')}
                        size="md"
                        showBadge={true}
                      />

                      {/* Name & Sub details */}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-white">
                            {item.displayName || item.username}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            @{item.username}
                          </span>
                          {item.realmName && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                              {item.realmIcon} {item.realmName}
                            </span>
                          )}
                          {item.sectName && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold">
                              [{item.sectTag || item.sectName}]
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Khung: <span className="text-cyan-400">{item.frame || 'default'}</span> •{' '}
                          {new Date(item.timestamp).toLocaleDateString('vi-VN')} {new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 flex-wrap">
                      <div className="text-right">
                        <div className="text-sm sm:text-base font-black font-mono text-emerald-400">
                          {item.wpm} <span className="text-xs font-normal text-slate-400">WPM</span>
                        </div>
                        <div className="text-[10px] text-cyan-300 font-mono">
                          {item.score || 0} điểm {item.accuracy ? `• ${item.accuracy}%` : ''}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Phong làm Quán Quân Top 1 màn này"
                          onClick={() => handlePromoteRankingToChampion(selectedRankMode, item)}
                          className="px-2 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Crown className="w-3 h-3" />
                          <span className="hidden sm:inline">Phong Quán Quân</span>
                        </button>

                        <button
                          type="button"
                          title="Gắn khung đại diện cho người chơi này"
                          onClick={() => {
                            setSelectedUsername(item.username);
                            setCustomUsernameInput(item.username);
                            setActiveSubTab('frame_granter');
                          }}
                          className="px-2 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/50 text-cyan-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Crown className="w-3 h-3 text-amber-300" />
                          <span className="hidden sm:inline">Gắn Khung</span>
                        </button>

                        <button
                          type="button"
                          title="Xóa kỷ lục này khỏi bảng xếp hạng"
                          onClick={() => handleDeleteRankingEntry(selectedRankMode, item)}
                          disabled={isDeletingRanking === item.username}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 border border-slate-800 hover:border-rose-700 text-rose-400 text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: BAN GẮN KHUNG ĐẠI DIỆN CHO BẤT KỲ AI */}
      {/* ========================================================================= */}
      {activeSubTab === 'frame_granter' && (
        <div className="space-y-6">
          {/* Target User Selector Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span>Bước 1: Chọn Hoặc Nhập Tên Người Chơi Cần Gắn Khung</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Admin có thể chọn từ danh sách hoặc nhập trực tiếp bất kỳ Username nào (kể cả Quán Quân hoặc Đạo Hữu mới)
                </p>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setSelectedUsername(currentUsername);
                    setCustomUsernameInput(currentUsername);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>Tôi (Admin @{currentUsername})</span>
                </button>

                {Object.values(localScores).find((s) => {
                  const r = s as HighScoreRecord | null;
                  return r && r.username && r.username !== currentUsername;
                }) && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      const firstChamp = Object.values(localScores).find((s) => {
                        const r = s as HighScoreRecord | null;
                        return r && r.username && r.username !== currentUsername;
                      }) as HighScoreRecord | undefined;
                      if (firstChamp?.username) {
                        setSelectedUsername(firstChamp.username);
                        setCustomUsernameInput(firstChamp.username);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Trophy className="w-3 h-3" />
                    <span>Quán Quân Bảng Vàng</span>
                  </button>
                )}
              </div>
            </div>

            {/* Target User Info & Selector Dropdown / Manual Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Chọn người chơi từ hệ thống ({userList.length} tài khoản) hoặc tự nhập username:
                </label>
                
                {/* Search / Select Dropdown */}
                <select
                  value={selectedUsername}
                  onChange={(e) => {
                    setSelectedUsername(e.target.value);
                    setCustomUsernameInput(e.target.value);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-bold focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Chọn từ danh sách --</option>
                  {filteredUsers.map((u) => (
                    <option key={u.id || u.username} value={u.username}>
                      @{u.username} - {u.displayName || u.username} ({u.cultivationRealm || 'Luyện Khí'})
                    </option>
                  ))}
                </select>

                {/* Direct Username Input */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">@</span>
                  <input
                    type="text"
                    value={customUsernameInput}
                    onChange={(e) => {
                      setCustomUsernameInput(e.target.value);
                      setSelectedUsername(e.target.value);
                    }}
                    placeholder="Nhập chính xác Username hoặc DisplayName..."
                    className="w-full text-xs pl-7 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-bold"
                  />
                </div>
              </div>

              {/* Target User Live Preview Card */}
              {selectedUserObj ? (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <AvatarWithFrame
                      icon={selectedUserObj.avatar || '🧘'}
                      frameId={selectedUserObj.frame || 'default'}
                      size="lg"
                      showBadge={true}
                    />
                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-1.5">
                        <span>{selectedUserObj.displayName || selectedUserObj.username}</span>
                        {selectedUserObj.cultivationRealm && (
                          <span className="text-[10px] text-emerald-400 font-normal">
                            ({selectedUserObj.cultivationRealm})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        @{selectedUserObj.username} • Kỷ lục: <strong className="text-amber-400">{selectedUserObj.bestWpm || 0} WPM</strong>
                      </div>
                      <div className="text-[11px] text-cyan-400 mt-1 font-semibold flex items-center gap-1">
                        <span>Khung đang đeo:</span>
                        <code className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-[10px]">
                          {selectedUserObj.frame || 'default'}
                        </code>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    Đã Khớp
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-xl text-slate-500">
                    👤
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-300">
                      Mục tiêu tự do: @{customUsernameInput || selectedUsername || 'Chưa nhập'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Sẽ được gắn khung và tự động ghi nhận khi tài khoản này đăng nhập
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Frame Category Filter & Search Bar */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Bước 2: Chọn Khung Viền Muốn Gán ({filteredFrames.length} khung phù hợp):
                </h4>
              </div>

              {/* Text Search for frames */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={frameSearchFilter}
                  onChange={(e) => setFrameSearchFilter(e.target.value)}
                  placeholder="Tìm tên khung, ID..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex-wrap">
              <button
                type="button"
                onClick={() => setFrameCategoryFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  frameCategoryFilter === 'all' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tất Cả ({AVATAR_FRAMES.length})
              </button>

              <button
                type="button"
                onClick={() => setFrameCategoryFilter('champion')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  frameCategoryFilter === 'champion' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Quán Quân Top 1
              </button>

              <button
                type="button"
                onClick={() => setFrameCategoryFilter('xianxia')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  frameCategoryFilter === 'xianxia' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cảnh Giới Tu Tiên (12 Khung)
              </button>

              <button
                type="button"
                onClick={() => setFrameCategoryFilter('mythic')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  frameCategoryFilter === 'mythic' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Thần Thoại & Admin
              </button>

              <button
                type="button"
                onClick={() => setFrameCategoryFilter('progression')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  frameCategoryFilter === 'progression' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sử Thi & Hiếm
              </button>

              <button
                type="button"
                onClick={() => setFrameCategoryFilter('default')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  frameCategoryFilter === 'default' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Khung Cổ Điển (Gỡ Khung)
              </button>
            </div>

            {/* Frames Gallery Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredFrames.map((frame) => {
                const isSelected = selectedFrameId === frame.id;
                const isCurrentOfUser = selectedUserObj?.frame === frame.id;

                return (
                  <button
                    key={frame.id}
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setSelectedFrameId(frame.id);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 relative ${
                      isSelected
                        ? 'bg-gradient-to-br from-cyan-950/80 via-slate-900 to-slate-950 border-cyan-500 shadow-xl shadow-cyan-500/10 ring-2 ring-cyan-400/60'
                        : 'bg-slate-950/90 hover:bg-slate-900 border-slate-800'
                    }`}
                  >
                    {/* Live Avatar with candidate frame */}
                    <div className="shrink-0 pt-0.5">
                      <AvatarWithFrame
                        icon={selectedUserObj?.avatar || '🧘'}
                        frameId={frame.id}
                        size="md"
                        showBadge={true}
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-white truncate">
                          {frame.name}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0"
                          style={{
                            backgroundColor: `${frame.previewColor}22`,
                            color: frame.previewColor,
                            border: `1px solid ${frame.previewColor}44`,
                          }}
                        >
                          {frame.tag}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {frame.desc}
                      </p>

                      <div className="flex items-center justify-between text-[10px] pt-1">
                        <span className="font-mono text-cyan-400/90">
                          ID: {frame.id}
                        </span>
                        {isCurrentOfUser && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-bold border border-emerald-500/30">
                            Đang dùng
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute top-2 right-2 p-1 rounded-full bg-cyan-500 text-slate-950 shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Trigger Bar: Apply Selected Frame to Selected User */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-2 border-cyan-500/60 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <AvatarWithFrame
                  icon={selectedUserObj?.avatar || '🧘'}
                  frameId={selectedFrameConfig.id}
                  size="lg"
                  showBadge={true}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-black text-white">
                    Xem Trước: @{selectedUserObj?.displayName || selectedUsername || customUsernameInput || 'Người chơi'} + Khung [{selectedFrameConfig.name}]
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {selectedFrameConfig.tag}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Bấm nút bên phải để ghi nhận vào Database Supabase, cập nhật toàn bộ Bảng Vàng và phát thông báo toàn máy chủ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Reset to Default Button */}
              {selectedFrameId !== 'default' && (
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setSelectedFrameId('default');
                  }}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                >
                  Chọn Khung Cổ Điển
                </button>
              )}

              {/* Confirm Grant Frame Button */}
              <button
                type="button"
                id="btn-admin-confirm-grant-frame"
                onClick={() => {
                  const target = customUsernameInput.trim() || selectedUsername.trim();
                  handleGrantFrameToUser(target, selectedFrameId);
                }}
                disabled={isGrantingFrame || (!customUsernameInput.trim() && !selectedUsername.trim())}
                className="px-6 py-3 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-xl shadow-cyan-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isGrantingFrame ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Crown className="w-4 h-4 text-amber-300 stroke-[2.5]" />
                )}
                <span>
                  Xác Nhận Gắn Khung Cho @{selectedUserObj?.displayName || customUsernameInput || selectedUsername || 'Người chơi'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

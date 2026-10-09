import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Key, 
  Gift, 
  Trash2, 
  RefreshCw, 
  Clock, 
  Award, 
  Check, 
  X, 
  AlertTriangle,
  Sparkles,
  Zap,
  Lock,
  Unlock,
  Coins,
  Plus,
  Crown
} from 'lucide-react';
import { soundFx } from '../../utils/audio';
import { 
  CultivationState, 
  saveStoredCultivationState,
  XIANXIA_REALMS,
  getSubStage,
  getLevelForRealmAndTier,
  getRealmAndTierFromLevel,
} from '../../utils/cultivation';
import { getStoredAuthToken } from '../../utils/auth';
import { AVATAR_FRAMES, AvatarWithFrame } from '../../utils/frames';
import { broadcastAdminEvent } from '../../utils/adminEventSync';
import { saveStoredBanInfo } from '../../utils/banManager';

export interface AdminUserData {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  avatar: string;
  frame: string;
  isAdmin: boolean;
  isVerified: boolean;
  createdAt: number;
  bestWpm: number;
  totalGames: number;
  isBanned: boolean;
  remainingMinutes: number;
  banReason?: string;
  cultivationRealm?: string;
  cultivationTier?: number;
  spiritStones?: number;
}

interface AdminUsersTabProps {
  currentUsername: string;
  currentUser?: { id?: string; username?: string } | null;
  cultivationState?: CultivationState;
  onUpdateCultivationState?: (nextState: CultivationState) => void;
  onRewardSuccess?: (msg: string) => void;
  onChangeFrame?: (newFrame: string) => void;
  showToast: (msg: string) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  currentUsername,
  currentUser,
  cultivationState,
  onUpdateCultivationState,
  onRewardSuccess,
  onChangeFrame,
  showToast,
}) => {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'member'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'banned'>('all');

  // Modal states for actions
  const [selectedUser, setSelectedUser] = useState<AdminUserData | null>(null);
  const [actionType, setActionType] = useState<'ban' | 'reward' | 'set_level' | 'reset_pwd' | 'delete' | 'set_frame' | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState<string>('admin_gold');

  // Form states
  const [banDurationMinutes, setBanDurationMinutes] = useState(120); // 2 hours default
  const [banReason, setBanReason] = useState('Nghi vấn Auto/Macro phím hoặc bất thường WPM');
  const [rewardStones, setRewardStones] = useState(5000);
  const [rewardExp, setRewardExp] = useState(10000);
  const [rewardThoNguyen, setRewardThoNguyen] = useState(1);
  const [rewardHoTam, setRewardHoTam] = useState(1);
  const [rewardPhaCanh, setRewardPhaCanh] = useState(1);
  const [newPasswordInput, setNewPasswordInput] = useState('fasttyping123');

  // Set level & realm states
  const [selectedRealmIdx, setSelectedRealmIdx] = useState<number>(0);
  const [selectedTier, setSelectedTier] = useState<number>(1);
  const [targetLevel, setTargetLevel] = useState<number>(1);
  const [refillThoNguyen, setRefillThoNguyen] = useState<boolean>(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = getStoredAuthToken();
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/users?_t=${Date.now()}`, {
        cache: 'no-store',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user list:', err);
      showToast('Không thể tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleExecuteAction = async () => {
    if (!selectedUser || !actionType) return;
    soundFx.playKeyClick();

    const targetUser = selectedUser;
    const currentAction = actionType;
    const targetUserId = targetUser.id;
    const targetUsername = targetUser.username;

    // Immediately close modal
    setActionType(null);
    setSelectedUser(null);

    // INSTANT OPTIMISTIC UI UPDATE:
    if (currentAction === 'delete') {
      setUsers((prev) => prev.filter((u) => u.id !== targetUserId && u.username.toLowerCase() !== targetUsername.toLowerCase()));
    } else if (currentAction === 'ban') {
      setUsers((prev) => prev.map((u) => {
        if (u.id === targetUserId || u.username.toLowerCase() === targetUsername.toLowerCase()) {
          return { ...u, isBanned: true, remainingMinutes: banDurationMinutes, banReason };
        }
        return u;
      }));
    } else if (currentAction === 'reward') {
      setUsers((prev) => prev.map((u) => {
        if (u.id === targetUserId || u.username.toLowerCase() === targetUsername.toLowerCase()) {
          return { ...u, spiritStones: (u.spiritStones || 0) + rewardStones };
        }
        return u;
      }));
    } else if (currentAction === 'set_level') {
      const realmName = XIANXIA_REALMS[selectedRealmIdx]?.name || 'Tu Chân';
      setUsers((prev) => prev.map((u) => {
        if (u.id === targetUserId || u.username.toLowerCase() === targetUsername.toLowerCase()) {
          return { ...u, cultivationRealm: realmName, cultivationTier: selectedTier };
        }
        return u;
      }));
    } else if (currentAction === 'set_frame') {
      setUsers((prev) => prev.map((u) => {
        if (u.id === targetUserId || u.username.toLowerCase() === targetUsername.toLowerCase()) {
          return { ...u, frame: selectedFrameId };
        }
        return u;
      }));
    }

    try {
      const playerDisplayName = targetUser.displayName || targetUser.username;
      let body: any = {
        action: currentAction,
        username: targetUsername,
        displayName: playerDisplayName,
        userId: targetUserId,
      };

      if (currentAction === 'ban') {
        body.durationMs = banDurationMinutes * 60 * 1000;
        body.reason = banReason;
      } else if (currentAction === 'reward') {
        body.spiritStones = rewardStones;
        body.exp = rewardExp;
        if (rewardThoNguyen > 0) body.thoNguyenPills = rewardThoNguyen;
        if (rewardHoTam > 0) body.hoTamPills = rewardHoTam;
        if (rewardPhaCanh > 0) body.phaCanhPills = rewardPhaCanh;
      } else if (currentAction === 'set_level') {
        body.action = 'set_level';
        body.targetLevel = targetLevel;
        body.realmIndex = selectedRealmIdx;
        body.tier = selectedTier;
        body.refillThoNguyen = refillThoNguyen;
      } else if (currentAction === 'reset_pwd') {
        body.action = 'reset_password';
        body.newPassword = newPasswordInput;
      } else if (currentAction === 'set_frame') {
        body.action = 'set_frame';
        body.frameId = selectedFrameId;
      } else if (currentAction === 'delete') {
        body.action = 'delete';
      }

      const token = getStoredAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        soundFx.playSuccess();
        const successMsg = data.message || (currentAction === 'delete' ? `Đã xóa vĩnh viễn tài khoản @${playerDisplayName}` : 'Thao tác thành công!');
        showToast(successMsg);

        const cleanTargetUser = targetUsername.toLowerCase().replace(/^@/, '');
        const cleanCurrentUser = (currentUser?.username || '').toLowerCase().replace(/^@/, '');
        const cleanCurrentName = (currentUsername || '').toLowerCase().replace(/^@/, '');
        const cleanDisplayName = (targetUser.displayName || '').toLowerCase().replace(/^@/, '');
        const cleanMyDisplayName = ((currentUser as any)?.displayName || '').toLowerCase().replace(/^@/, '');

        const isTargetCurrent = Boolean(
          (currentUser?.id && (targetUserId === currentUser.id || targetUser.id === currentUser.id)) ||
          (cleanCurrentUser && (cleanTargetUser === cleanCurrentUser || cleanDisplayName === cleanCurrentUser)) ||
          (cleanCurrentName && (cleanTargetUser === cleanCurrentName || cleanDisplayName === cleanCurrentName)) ||
          (cleanMyDisplayName && (cleanDisplayName === cleanMyDisplayName || cleanTargetUser === cleanMyDisplayName))
        );

        // 1. REWARD ACTION DISPATCH
        if (currentAction === 'reward') {
          if (onRewardSuccess) onRewardSuccess(successMsg);

          const cult = data.cultivation;
          if (cult && isTargetCurrent && onUpdateCultivationState) {
            onUpdateCultivationState(cult);
            saveStoredCultivationState(cult);
          }

          // Broadcast real-time event across tabs & windows
          broadcastAdminEvent({
            type: 'cultivation_reward_received',
            userId: targetUserId,
            username: targetUsername,
            displayName: playerDisplayName,
            cultivation: cult,
            reward: {
              spiritStones: rewardStones,
              exp: rewardExp,
              thoNguyenPills: rewardThoNguyen,
              hoTamPills: rewardHoTam,
              phaCanhPills: rewardPhaCanh,
            },
            title: 'BÀN CỔ THẦN ĐIỆN BAN THƯỞNG',
            message: `🎉 Bàn Cổ Thần Điện ban thưởng: +${rewardStones.toLocaleString()} Linh Thạch, +${rewardExp.toLocaleString()} Tu Vi${rewardThoNguyen > 0 ? `, +${rewardThoNguyen} Thọ Nguyên Đan` : ''}${rewardHoTam > 0 ? `, +${rewardHoTam} Hộ Tâm Đan` : ''}${rewardPhaCanh > 0 ? `, +${rewardPhaCanh} Phá Cảnh Đan` : ''}!`,
          });

          // Always update user item in table
          setUsers((prev) => prev.map((u) => {
            if (u.id === targetUserId || u.username.toLowerCase() === targetUsername.toLowerCase()) {
              const stones = cult && typeof cult.linhThach === 'number'
                ? cult.linhThach
                : (cult && typeof cult.spiritStones === 'number' ? cult.spiritStones : (u.spiritStones || 0) + rewardStones);
              return {
                ...u,
                spiritStones: stones,
                cultivationRealm: (cult && cult.realmName) || u.cultivationRealm,
                cultivationTier: (cult && cult.tier) || u.cultivationTier,
              };
            }
            return u;
          }));
        }

        // 2. SET LEVEL & REALM ACTION DISPATCH
        if (currentAction === 'set_level') {
          const cult = data.cultivation;
          if (cult && isTargetCurrent && onUpdateCultivationState) {
            onUpdateCultivationState(cult);
            saveStoredCultivationState(cult);
          }

          broadcastAdminEvent({
            type: 'cultivation_level_updated',
            userId: targetUserId,
            username: targetUsername,
            displayName: playerDisplayName,
            cultivation: cult,
            level: targetLevel,
            realmIndex: selectedRealmIdx,
            tier: selectedTier,
            realmName: XIANXIA_REALMS[selectedRealmIdx]?.name || 'Tu Chân',
            title: 'THĂNG CẤP CẢNH GIỚI',
            message: `🌟 Quản Trị Viên đã sắc phong cảnh giới cho bạn: ${XIANXIA_REALMS[selectedRealmIdx]?.name} Tầng ${selectedTier} (Cấp ${targetLevel})!`,
          });

          setUsers((prev) => prev.map((u) => {
            if (u.id === targetUserId || u.username.toLowerCase() === targetUsername.toLowerCase()) {
              return {
                ...u,
                cultivationRealm: (cult && cult.realmName) || XIANXIA_REALMS[selectedRealmIdx]?.name || u.cultivationRealm,
                cultivationTier: (cult && cult.tier) || selectedTier,
              };
            }
            return u;
          }));
        }

        // 3. SET FRAME ACTION DISPATCH
        if (currentAction === 'set_frame') {
          if (isTargetCurrent && onChangeFrame) {
            onChangeFrame(selectedFrameId);
          }

          broadcastAdminEvent({
            type: 'frame_updated',
            userId: targetUserId,
            username: targetUsername,
            frame: selectedFrameId,
            title: 'BAN THƯỞNG KHUNG VIỀN',
            message: `👑 Quản Trị Viên đã ban thưởng khung viền [${selectedFrameId}] cho bạn!`,
          });
        }

        // 4. BAN ACTION DISPATCH
        if (currentAction === 'ban') {
          const banDurationMs = banDurationMinutes * 60 * 1000;
          const bannedUntilTs = Date.now() + banDurationMs;

          if (isTargetCurrent) {
            saveStoredBanInfo(bannedUntilTs, banReason);
          }

          broadcastAdminEvent({
            type: 'user_banned',
            userId: targetUserId,
            username: targetUsername,
            displayName: playerDisplayName,
            reason: banReason,
            durationMs: banDurationMs,
            bannedUntil: bannedUntilTs,
            remainingMinutes: banDurationMinutes,
            title: 'LỆNH TRỪNG PHẠT BÀN CỔ',
            message: `⚡ Bạn đã bị cấm thi đấu ${banDurationMinutes} phút: ${banReason}`,
          });
        }

        // 5. RESET PASSWORD DISPATCH
        if (currentAction === 'reset_pwd') {
          broadcastAdminEvent({
            type: 'password_reset_notice',
            userId: targetUserId,
            username: targetUsername,
            title: 'ĐẶT LẠI MẬT KHẨU',
            message: `🔑 Mật khẩu tài khoản của bạn đã được quản trị viên đặt lại: ${newPasswordInput}`,
          });
        }

        // Sync with backend to ensure perfect consistency
        fetchUsers();
      } else {
        soundFx.playError();
        showToast(data.error || 'Thao tác thất bại');
        // Rollback state by re-fetching
        fetchUsers();
      }
    } catch {
      showToast('Lỗi kết nối máy chủ khi thực thi hành động');
      fetchUsers();
    }
  };

  const handleUnban = async (u: AdminUserData) => {
    soundFx.playKeyClick();
    // Instant optimistic update
    setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, isBanned: false, remainingMinutes: 0 } : item)));

    const cleanUname = (u.username || '').toLowerCase().replace(/^@/, '');
    const cleanCur = (currentUser?.username || '').toLowerCase().replace(/^@/, '');
    const cleanCurName = (currentUsername || '').toLowerCase().replace(/^@/, '');
    if (
      (currentUser?.id && u.id === currentUser.id) ||
      (cleanCur && cleanUname === cleanCur) ||
      (cleanCurName && cleanUname === cleanCurName)
    ) {
      try {
        localStorage.removeItem('fasttyping_banco_ban_v1');
      } catch {}
    }

    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unban', username: u.username, userId: u.id }),
      });
      const data = await res.json();
      if (data.success) {
        soundFx.playSuccess();
        broadcastAdminEvent({
          type: 'user_unbanned',
          userId: u.id,
          username: u.username,
          title: 'HÓA GIẢI PHONG ẤN',
          message: `✨ Lệnh cấm thi đấu cho @${u.displayName || u.username} đã được giải trừ!`,
        });
        showToast(data.message || `Đã gỡ cấm cho ${u.username}!`);
        fetchUsers();
      } else {
        showToast(data.error || 'Lỗi khi gỡ cấm');
        fetchUsers();
      }
    } catch {
      showToast('Lỗi khi kết nối máy chủ');
      fetchUsers();
    }
  };

  const handleToggleAdmin = async (u: AdminUserData) => {
    soundFx.playKeyClick();
    // Instant optimistic update
    setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, isAdmin: !item.isAdmin } : item)));

    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_admin', username: u.username, userId: u.id }),
      });
      const data = await res.json();
      if (data.success) {
        soundFx.playSuccess();
        broadcastAdminEvent({
          type: 'admin_role_updated',
          userId: u.id,
          username: u.username,
          isAdmin: !u.isAdmin,
          title: 'PHÂN QUYỀN HỆ THỐNG',
          message: !u.isAdmin
            ? `🛡️ Đã phong Quản Trị Viên cho @${u.displayName || u.username}!`
            : `🛡️ Đã chuyển quyền @${u.displayName || u.username} về Thành Viên.`,
        });
        showToast(data.message || 'Thay đổi quyền thành công!');
        fetchUsers();
      } else {
        showToast(data.error || 'Không thể thay đổi quyền');
        fetchUsers();
      }
    } catch {
      showToast('Lỗi khi thay đổi quyền quản trị');
      fetchUsers();
    }
  };

  const handleDeleteUser = (u: AdminUserData) => {
    soundFx.playKeyClick();
    setSelectedUser(u);
    setActionType('delete');
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = u.username.toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }
    if (filterRole === 'admin' && !u.isAdmin) return false;
    if (filterRole === 'member' && u.isAdmin) return false;
    if (filterStatus === 'banned' && !u.isBanned) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header controls & Filters */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-black uppercase text-amber-400 tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Quản Lý Danh Sách Người Chơi & Đạo Hữu</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Phân quyền Admin, thưởng tài nguyên, xử phạt Bàn Cổ Thần Thức và đặt lại mật khẩu thành viên.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              fetchUsers();
            }}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Làm Mới</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Search Box */}
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm theo username, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Filter Role */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilterRole('all')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                filterRole === 'all' ? 'bg-amber-500 text-black shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất Cả ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('admin')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                filterRole === 'admin' ? 'bg-amber-500 text-black shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin ({users.filter(u => u.isAdmin).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('member')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                filterRole === 'member' ? 'bg-amber-500 text-black shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Thành Viên
            </button>
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                filterStatus === 'all' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Toàn Bộ Trạng Thái
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('banned')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
                filterStatus === 'banned' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <span>⚡ Đang Bị Cấm ({users.filter(u => u.isBanned).length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Users List Table / Card Grid */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 text-xs">
            Không tìm thấy người chơi nào phù hợp với bộ lọc tìm kiếm.
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isSelf = u.username.toLowerCase() === currentUsername.toLowerCase();
            return (
              <div
                key={u.id}
                className={`p-3.5 sm:p-4 rounded-2xl bg-slate-950 border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  u.isBanned 
                    ? 'border-rose-900/60 bg-rose-950/20' 
                    : (u.isAdmin ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800 hover:border-slate-700')
                }`}
              >
                {/* User Identity & Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xl shrink-0 shadow-inner">
                    {u.avatar || '👤'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs truncate">
                        {u.displayName || u.username}
                      </span>
                      {u.displayName && u.username && u.displayName.toLowerCase() !== u.username.toLowerCase() && (
                        <span className="text-[10px] text-slate-400 font-mono font-normal">
                          (@{u.username})
                        </span>
                      )}
                      {isSelf && (
                        <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[9px] font-bold">
                          BẠN
                        </span>
                      )}
                      {u.isAdmin && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-amber-400" />
                          <span>ADMIN</span>
                        </span>
                      )}
                      {u.isBanned && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold flex items-center gap-1 animate-pulse">
                          <span>⚡ BÀN CỔ PHẠT ({u.remainingMinutes}m)</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                      <span>{u.email || 'Chưa liên kết email'}</span>
                      <span>•</span>
                      <span className="text-amber-300 font-semibold">{u.cultivationRealm || 'Luyện Khí'} T.{u.cultivationTier || 1}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-mono font-bold">💎 {u.spiritStones || 0}</span>
                      <span>•</span>
                      <span>WPM Kỷ Lục: <strong className="text-white font-mono">{u.bestWpm || 0}</strong></span>
                      <span>•</span>
                      <span>Số Ván: <strong className="text-white font-mono">{u.totalGames || 0}</strong></span>
                    </div>

                    {u.isBanned && u.banReason && (
                      <div className="text-[10px] text-rose-400 mt-1 italic">
                        Lý do: &ldquo;{u.banReason}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                {/* Operations & Action Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center shrink-0">
                  {/* Ban or Unban */}
                  {u.isBanned ? (
                    <button
                      type="button"
                      onClick={() => handleUnban(u)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      title="Giải trừ án phạt Bàn Cổ Thần Thức"
                    >
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Hóa Giải</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setActionType('ban');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/60 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      title="Phạt cấm thi đấu (Bàn Cổ Thần Phạt)"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span>Cấm Đấu</span>
                    </button>
                  )}

                  {/* Reward Stones / EXP */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(u);
                      setActionType('reward');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-500/60 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="Tặng thưởng Linh Thạch, Tu Vi, Đan Dược"
                  >
                    <Gift className="w-3.5 h-3.5 text-amber-400" />
                    <span>Thưởng</span>
                  </button>

                  {/* Sắc Phong Cảnh Giới / Thăng Cấp Trực Tiếp */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setSelectedUser(u);
                      const rIdx = XIANXIA_REALMS.findIndex((r) => r.name === u.cultivationRealm);
                      const initR = rIdx >= 0 ? rIdx : 0;
                      const initT = Math.max(1, Math.min(10, u.cultivationTier || 1));
                      setSelectedRealmIdx(initR);
                      setSelectedTier(initT);
                      setTargetLevel(getLevelForRealmAndTier(initR, initT));
                      setActionType('set_level');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:border-purple-500/60 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="Cài đặt cấp độ & sắc phong cảnh giới tu vi trực tiếp"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Cấp</span>
                  </button>

                  {/* Gắn Khung Đại Diện */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(u);
                      setSelectedFrameId(u.frame || 'admin_gold');
                      setActionType('set_frame');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/60 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="Ban tặng khung viền đại diện (Avatar Frame)"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-300" />
                    <span>Khung</span>
                  </button>

                  {/* Toggle Admin */}
                  {u.id !== 'usr_admin_default' && u.username !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => handleToggleAdmin(u)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                        u.isAdmin
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                      }`}
                      title={u.isAdmin ? 'Hạ quyền Quản trị viên' : 'Thăng cấp Quản trị viên'}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>{u.isAdmin ? 'Bỏ Admin' : 'Cấp Admin'}</span>
                    </button>
                  )}

                  {/* Reset Password */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(u);
                      setActionType('reset_pwd');
                    }}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                    title="Đặt lại mật khẩu cho tài khoản"
                  >
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Delete Account */}
                  {u.id !== 'usr_admin_default' && u.username !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 transition-all cursor-pointer"
                      title="Xóa vĩnh viễn tài khoản"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Dialog / Modal Popover */}
      {actionType && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full ${actionType === 'set_level' ? 'max-w-lg' : 'max-w-md'} bg-slate-950 border rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 ${
            actionType === 'delete' ? 'border-rose-500/50 shadow-rose-950/40' : (actionType === 'set_level' ? 'border-purple-500/50 shadow-purple-950/40' : 'border-amber-500/40')
          }`}>
            {/* Modal Title */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h5 className="font-bold text-sm text-white flex items-center gap-2">
                {actionType === 'ban' && <ShieldAlert className="w-4 h-4 text-rose-500" />}
                {actionType === 'reward' && <Gift className="w-4 h-4 text-amber-400" />}
                {actionType === 'set_level' && <Sparkles className="w-4 h-4 text-purple-400" />}
                {actionType === 'set_frame' && <Crown className="w-4 h-4 text-amber-400" />}
                {actionType === 'reset_pwd' && <Key className="w-4 h-4 text-sky-400" />}
                {actionType === 'delete' && <Trash2 className="w-4 h-4 text-rose-500" />}
                <span>
                  {actionType === 'ban' && `Thi Hành Phạt: ${selectedUser.displayName || selectedUser.username}`}
                  {actionType === 'reward' && `Ban Thưởng: ${selectedUser.displayName || selectedUser.username}`}
                  {actionType === 'set_level' && `Sắc Phong Cảnh Giới: ${selectedUser.displayName || selectedUser.username}`}
                  {actionType === 'set_frame' && `Gắn Khung Đại Diện: ${selectedUser.displayName || selectedUser.username}`}
                  {actionType === 'reset_pwd' && `Đặt Lại Mật Khẩu: ${selectedUser.displayName || selectedUser.username}`}
                  {actionType === 'delete' && `Xác Nhận Xóa Vĩnh Viễn: ${selectedUser.displayName || selectedUser.username}`}
                </span>
              </h5>
              <button
                type="button"
                onClick={() => {
                  setActionType(null);
                  setSelectedUser(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* DELETE ACCOUNT CONFIRMATION */}
            {actionType === 'delete' && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 animate-pulse" />
                    <span>CẢNH BÁO NGUY HIỂM TỐI CAO</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    Bạn đang chuẩn bị thực hiện xóa vĩnh viễn tài khoản <strong className="text-white font-mono">{selectedUser.displayName || selectedUser.username}</strong> (@{selectedUser.username}) ({selectedUser.email || 'Không có email'}). Thao tác này sẽ hủy bỏ toàn bộ hồ sơ trên máy chủ và <strong className="text-rose-400">KHÔNG THỂ PHỤC HỒI</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    Các dữ liệu sẽ bị hủy bỏ ngay lập tức:
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px]">Cảnh Giới Tu Tiên</span>
                      <span className="font-bold text-amber-400">{selectedUser.cultivationRealm || 'Luyện Khí Kỳ'} (Tầng {selectedUser.cultivationTier || 1})</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px]">Kho Linh Thạch</span>
                      <span className="font-bold text-cyan-400">{(selectedUser.spiritStones || 0).toLocaleString()} viên</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px]">Tốc Độ Đỉnh Cao</span>
                      <span className="font-bold text-emerald-400">{selectedUser.bestWpm || 0} WPM</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px]">Tổng Ván Đấu</span>
                      <span className="font-bold text-slate-300">{selectedUser.totalGames || 0} trận</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BAN FORM */}
            {actionType === 'ban' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Thời lượng cấm thi đấu
                  </label>
                  <select
                    value={banDurationMinutes}
                    onChange={(e) => setBanDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value={15}>15 Phút (Cảnh cáo nhẹ)</option>
                    <option value={60}>1 Giờ (Cảnh cáo)</option>
                    <option value={120}>2 Giờ (Bàn Cổ Thần Phạt mặc định)</option>
                    <option value={1440}>24 Giờ (1 Ngày)</option>
                    <option value={10080}>7 Ngày (1 Tuần)</option>
                    <option value={525600}>1 Năm (Vĩnh viễn)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Lý do xử phạt (sẽ công bố trên Chiếu Thư Toàn Server)
                  </label>
                  <textarea
                    rows={3}
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                    placeholder="Nhập lý do xử phạt..."
                  />
                </div>
              </div>
            )}

            {/* REWARD FORM */}
            {actionType === 'reward' && (
              <div className="space-y-3.5">
                {/* User Current Status Summary */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Cảnh Giới Hiện Tại</span>
                    <span className="font-bold text-amber-300">
                      {selectedUser.cultivationRealm || 'Luyện Khí Kỳ'} T.{selectedUser.cultivationTier || 1}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Linh Thạch Hiện Có</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      💎 {(selectedUser.spiritStones || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Linh Thạch Input & Presets */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <span className="text-emerald-400">💎</span>
                      <span>Thêm Linh Thạch</span>
                    </label>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      +{rewardStones.toLocaleString()} viên
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={rewardStones}
                    onChange={(e) => setRewardStones(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[500, 1000, 5000, 20000, 50000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          soundFx.playKeyClick();
                          setRewardStones((prev) => prev + amt);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
                      >
                        +{amt >= 1000 ? `${amt / 1000}k` : amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setRewardStones(0)}
                      className="px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                </div>

                {/* Tu Vi EXP Input & Presets */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Thêm Tu Vi EXP (Tự động thăng cấp)</span>
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      +{rewardExp.toLocaleString()} EXP
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={rewardExp}
                    onChange={(e) => setRewardExp(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1000, 2500, 5000, 10000, 50000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          soundFx.playKeyClick();
                          setRewardExp((prev) => prev + amt);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
                      >
                        +{amt >= 1000 ? `${amt / 1000}k` : amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setRewardExp(0)}
                      className="px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                </div>

                {/* Đan Dược Phụ Trợ */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <label className="text-[11px] font-semibold text-slate-400 block">
                    💊 Tặng Thêm Đan Dược Quý (Tùy chọn)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block truncate">Thọ Nguyên (+5)</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={rewardThoNguyen}
                        onChange={(e) => setRewardThoNguyen(Math.max(0, Number(e.target.value)))}
                        className="w-full text-center mt-1 px-1 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-emerald-400 font-mono font-bold"
                      />
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block truncate">Hộ Tâm (Giữ tầng)</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={rewardHoTam}
                        onChange={(e) => setRewardHoTam(Math.max(0, Number(e.target.value)))}
                        className="w-full text-center mt-1 px-1 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-amber-400 font-mono font-bold"
                      />
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block truncate">Phá Cảnh (+15%)</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={rewardPhaCanh}
                        onChange={(e) => setRewardPhaCanh(Math.max(0, Number(e.target.value)))}
                        className="w-full text-center mt-1 px-1 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-purple-400 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SET LEVEL & REALM FORM */}
            {actionType === 'set_level' && (
              <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                {/* Live Preview Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/40 flex items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-500/50 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                      {XIANXIA_REALMS[selectedRealmIdx]?.icon || '🧘'}
                    </div>
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-2">
                        <span>{selectedUser.displayName || selectedUser.username}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                          Cấp {targetLevel}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-amber-300 mt-0.5">
                        {XIANXIA_REALMS[selectedRealmIdx]?.name} • Tầng {selectedTier} ({getSubStage(selectedTier)})
                      </div>
                      <div className="text-[10px] text-purple-300/80 font-medium mt-0.5">
                        Danh hiệu: &ldquo;{XIANXIA_REALMS[selectedRealmIdx]?.titleName}&rdquo;
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Hiện tại:</span>
                    <span className="text-xs font-mono text-slate-300 font-bold">
                      {selectedUser.cultivationRealm || 'Luyện Khí'} T.{selectedUser.cultivationTier || 1}
                    </span>
                  </div>
                </div>

                {/* Chọn 1 trong 12 Cảnh Giới */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>1. Chọn Cảnh Giới ({XIANXIA_REALMS.length} cảnh giới):</span>
                    <span className="text-purple-400 font-mono text-[11px] font-bold">
                      {XIANXIA_REALMS[selectedRealmIdx]?.name}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1 bg-slate-900/60 rounded-xl border border-slate-800">
                    {XIANXIA_REALMS.map((r, idx) => {
                      const isSel = selectedRealmIdx === idx;
                      return (
                        <button
                          key={r.id || idx}
                          type="button"
                          onClick={() => {
                            soundFx.playKeyClick();
                            setSelectedRealmIdx(idx);
                            setTargetLevel(getLevelForRealmAndTier(idx, selectedTier));
                          }}
                          className={`p-2 rounded-xl text-left transition-all cursor-pointer border flex items-center gap-2 ${
                            isSel
                              ? 'bg-purple-600/30 border-purple-400 text-white font-black shadow-md'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-base shrink-0">{r.icon}</span>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold truncate leading-tight">{r.name}</div>
                            <div className="text-[9px] text-slate-400 font-mono">Cấp {idx * 10 + 1}-{idx * 10 + 10}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chọn Tầng (1 -> 10) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-300">
                      2. Chọn Tầng Tu Vi (1 - 10):
                    </label>
                    <span className="text-xs font-bold text-amber-400">
                      Tầng {selectedTier} ({getSubStage(selectedTier)})
                    </span>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => {
                      const isSel = selectedTier === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            soundFx.playKeyClick();
                            setSelectedTier(t);
                            setTargetLevel(getLevelForRealmAndTier(selectedRealmIdx, t));
                          }}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border text-center ${
                            isSel
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          T.{t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target Level input & Refill Lifespan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Cấp Độ Chính Xác (1 - 1000):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={targetLevel}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(1000, Number(e.target.value) || 1));
                        setTargetLevel(val);
                        const { realmIndex, tier } = getRealmAndTierFromLevel(val);
                        setSelectedRealmIdx(realmIndex);
                        setSelectedTier(tier);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-purple-300 font-mono font-bold focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="flex items-center gap-2 sm:mt-5">
                    <input
                      type="checkbox"
                      id="refillThoNguyenChk"
                      checked={refillThoNguyen}
                      onChange={(e) => setRefillThoNguyen(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="refillThoNguyenChk" className="text-xs text-slate-300 font-semibold cursor-pointer select-none">
                      Hồi đầy 100% Thọ Nguyên ({240 + selectedRealmIdx * 200 + (selectedTier - 1) * 20}h)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* RESET PASSWORD FORM */}
            {actionType === 'reset_pwd' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mật khẩu mới gán cho tài khoản
                  </label>
                  <input
                    type="text"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    placeholder="Nhập mật khẩu mới..."
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Người chơi có thể đăng nhập bằng mật khẩu này và đổi lại trong mục Hồ Sơ.
                  </p>
                </div>
              </div>
            )}

            {/* SET FRAME FORM */}
            {actionType === 'set_frame' && (
              <div className="space-y-4">
                {/* Live Preview */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <AvatarWithFrame
                      icon={selectedUser.avatar || '🧘'}
                      frameId={selectedFrameId}
                      size="lg"
                      showBadge={true}
                    />
                    <div>
                      <div className="text-xs font-black text-white">
                        {selectedUser.displayName || selectedUser.username}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        @{selectedUser.username}
                      </div>
                      <div className="text-[10px] text-cyan-400 font-bold mt-0.5">
                        Khung mới chọn: {selectedFrameId}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Khung hiện tại:</span>
                    <span className="text-xs font-mono text-slate-300 font-bold">{selectedUser.frame || 'default'}</span>
                  </div>
                </div>

                {/* Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Chọn khung viền muốn ban tặng ({AVATAR_FRAMES.length} khung):
                  </label>
                  <select
                    value={selectedFrameId}
                    onChange={(e) => setSelectedFrameId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                  >
                    {AVATAR_FRAMES.map((f) => (
                      <option key={f.id} value={f.id}>
                        [{f.tag}] {f.name} - ID: {f.id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Frame Pills */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Khung nổi bật & Quán quân:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-900/60 rounded-xl border border-slate-800">
                    {AVATAR_FRAMES.map((f) => {
                      const isSelected = selectedFrameId === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setSelectedFrameId(f.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                              : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          <span>{f.badge || '🖼️'}</span>
                          <span>{f.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActionType(null);
                  setSelectedUser(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                onClick={handleExecuteAction}
                className={`px-4 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-lg ${
                  actionType === 'delete'
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-950/50'
                    : actionType === 'set_level'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-950/50'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:from-amber-400 hover:to-yellow-300'
                }`}
              >
                {actionType === 'delete' ? (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác Nhận Xóa Vĩnh Viễn</span>
                  </>
                ) : actionType === 'set_level' ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Xác Nhận Đổi Cảnh Giới</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Xác Nhận Thực Thi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

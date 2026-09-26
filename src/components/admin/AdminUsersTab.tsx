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
  Unlock
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

export interface AdminUserData {
  id: string;
  username: string;
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
  showToast: (msg: string) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  currentUsername,
  showToast,
}) => {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'member'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'banned'>('all');

  // Modal states for actions
  const [selectedUser, setSelectedUser] = useState<AdminUserData | null>(null);
  const [actionType, setActionType] = useState<'ban' | 'reward' | 'reset_pwd' | 'delete' | null>(null);

  // Form states
  const [banDurationMinutes, setBanDurationMinutes] = useState(120); // 2 hours default
  const [banReason, setBanReason] = useState('Nghi vấn Auto/Macro phím hoặc bất thường WPM');
  const [rewardStones, setRewardStones] = useState(500);
  const [rewardExp, setRewardExp] = useState(1000);
  const [newPasswordInput, setNewPasswordInput] = useState('fasttyping123');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
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

    try {
      let body: any = {
        action: actionType,
        username: selectedUser.username,
        userId: selectedUser.id,
      };

      if (actionType === 'ban') {
        body.durationMs = banDurationMinutes * 60 * 1000;
        body.reason = banReason;
      } else if (actionType === 'reward') {
        body.spiritStones = rewardStones;
        body.exp = rewardExp;
      } else if (actionType === 'reset_pwd') {
        body.action = 'reset_password';
        body.newPassword = newPasswordInput;
      } else if (actionType === 'delete') {
        body.action = 'delete';
      }

      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        soundFx.playCorrect();
        showToast(data.message || (actionType === 'delete' ? `Đã xóa vĩnh viễn tài khoản @${selectedUser.username}` : 'Thao tác thành công!'));
        setActionType(null);
        setSelectedUser(null);
        fetchUsers();
      } else {
        soundFx.playWrong();
        showToast(data.error || 'Thao tác thất bại');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ khi thực thi hành động');
    }
  };

  const handleUnban = async (u: AdminUserData) => {
    soundFx.playKeyClick();
    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unban', username: u.username, userId: u.id }),
      });
      const data = await res.json();
      if (data.success) {
        soundFx.playCorrect();
        showToast(data.message || `Đã gỡ cấm cho ${u.username}!`);
        fetchUsers();
      } else {
        showToast(data.error || 'Lỗi khi gỡ cấm');
      }
    } catch {
      showToast('Lỗi khi kết nối máy chủ');
    }
  };

  const handleToggleAdmin = async (u: AdminUserData) => {
    soundFx.playKeyClick();
    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_admin', username: u.username, userId: u.id }),
      });
      const data = await res.json();
      if (data.success) {
        soundFx.playCorrect();
        showToast(data.message || 'Thay đổi quyền thành công!');
        fetchUsers();
      } else {
        showToast(data.error || 'Không thể thay đổi quyền');
      }
    } catch {
      showToast('Lỗi khi thay đổi quyền quản trị');
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
                        {u.username}
                      </span>
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
                    title="Tặng thưởng Linh Thạch hoặc Tu Vi"
                  >
                    <Gift className="w-3.5 h-3.5 text-amber-400" />
                    <span>Thưởng</span>
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
          <div className={`w-full max-w-md bg-slate-950 border rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 ${
            actionType === 'delete' ? 'border-rose-500/50 shadow-rose-950/40' : 'border-amber-500/40'
          }`}>
            {/* Modal Title */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h5 className="font-bold text-sm text-white flex items-center gap-2">
                {actionType === 'ban' && <ShieldAlert className="w-4 h-4 text-rose-500" />}
                {actionType === 'reward' && <Gift className="w-4 h-4 text-amber-400" />}
                {actionType === 'reset_pwd' && <Key className="w-4 h-4 text-sky-400" />}
                {actionType === 'delete' && <Trash2 className="w-4 h-4 text-rose-500" />}
                <span>
                  {actionType === 'ban' && `Thi Hành Phạt: ${selectedUser.username}`}
                  {actionType === 'reward' && `Ban Thưởng: ${selectedUser.username}`}
                  {actionType === 'reset_pwd' && `Đặt Lại Mật Khẩu: ${selectedUser.username}`}
                  {actionType === 'delete' && `Xác Nhận Xóa Vĩnh Viễn: ${selectedUser.username}`}
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
                    Bạn đang chuẩn bị thực hiện xóa vĩnh viễn tài khoản <strong className="text-white font-mono">@{selectedUser.username}</strong> ({selectedUser.email || 'Không có email'}). Thao tác này sẽ hủy bỏ toàn bộ hồ sơ trên máy chủ và <strong className="text-rose-400">KHÔNG THỂ PHỤC HỒI</strong>.
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
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    💎 Thêm Linh Thạch
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={rewardStones}
                    onChange={(e) => setRewardStones(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ⚡ Thêm Tu Vi EXP
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={rewardExp}
                    onChange={(e) => setRewardExp(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
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
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:from-amber-400 hover:to-yellow-300'
                }`}
              >
                {actionType === 'delete' ? (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác Nhận Xóa Vĩnh Viễn</span>
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

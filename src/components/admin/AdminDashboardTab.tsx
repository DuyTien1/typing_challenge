import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Swords, 
  Database, 
  Server, 
  Activity, 
  RefreshCw, 
  Radio, 
  ShieldAlert, 
  Trash2, 
  FileDown, 
  Cpu, 
  HardDrive, 
  Clock, 
  ArrowUpRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface SystemStats {
  onlineCount: number;
  totalConnections: number;
  activeRoomsCount: number;
  totalRegisteredUsers: number;
  serverUptimeSeconds: number;
  nodeVersion: string;
  memoryUsage: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  systemTime: number;
}

interface AdminDashboardTabProps {
  onNavigateTab: (tab: any) => void;
  onClearChat?: () => void;
  showToast: (msg: string) => void;
}

export const AdminDashboardTab: React.FC<AdminDashboardTabProps> = ({
  onNavigateTab,
  onClearChat,
  showToast,
}) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/system-stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch system stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    if (!autoRefresh) return;
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h3 className="text-sm font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Bảng Điều Khiển Hệ Thống Realtime</span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Giám sát thời gian thực người chơi trực tuyến, phòng thi đấu, tài nguyên máy chủ và vận hành dịch vụ.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              autoRefresh 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span>{autoRefresh ? 'Tự Động Làm Mới (5s)' : 'Tự Động: Tắt'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              fetchStats();
            }}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu ngay"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Online Players */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-lg shadow-emerald-950/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Người Chơi Online</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
              {stats?.onlineCount ?? 1}
            </span>
            <span className="text-[11px] text-slate-400">
              ({stats?.totalConnections ?? 1} kết nối)
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('users')}
            className="mt-3 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Quản lý người chơi</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 2: Active Rooms */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-sky-500/30 shadow-lg shadow-sky-950/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phòng Thi Đấu</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Swords className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-sky-400 tracking-tight">
              {stats?.activeRoomsCount ?? 0}
            </span>
            <span className="text-[11px] text-slate-400">phòng hoạt động</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('rooms')}
            className="mt-3 text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Giám sát phòng đấu</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 3: Registered Accounts */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-lg shadow-amber-950/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Tài Khoản</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
              {stats?.totalRegisteredUsers ?? 1}
            </span>
            <span className="text-[11px] text-slate-400">đã đăng ký</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('users')}
            className="mt-3 text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Xem danh sách tài khoản</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 4: Server Uptime */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 shadow-lg shadow-purple-950/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời Gian Uptime</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-300 tracking-tight">
              {stats ? formatUptime(stats.serverUptimeSeconds) : '0m 0s'}
            </span>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Server className="w-3 h-3 text-purple-400" />
            <span>Node {stats?.nodeVersion || 'v20'}</span>
          </div>
        </div>
      </div>

      {/* Server Health & Memory Telemetry */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-sky-400" />
          <span>Tài Nguyên Hệ Thống & Bộ Nhớ RAM</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-sky-400" />
              <span>Bộ Nhớ RSS (Resident Set)</span>
            </div>
            <div className="text-lg font-bold text-white mt-1">
              {stats?.memoryUsage?.rssMb ?? 0} MB
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Heap Đang Dùng</span>
            </div>
            <div className="text-lg font-bold text-emerald-400 mt-1">
              {stats?.memoryUsage?.heapUsedMb ?? 0} MB
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Tổng Dung Lượng Heap Cấp Phát</span>
            </div>
            <div className="text-lg font-bold text-amber-300 mt-1">
              {stats?.memoryUsage?.heapTotalMb ?? 0} MB
            </div>
          </div>
        </div>
      </div>

      {/* Quick Operations Grid */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Thao Tác Điều Hành Nhanh (Quick Actions)</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action 1: Broadcast */}
          <button
            type="button"
            onClick={() => onNavigateTab('broadcast')}
            className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-amber-500/30 hover:border-amber-400/80 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
              <Radio className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Phát Chiếu Thư Toàn Server</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Gửi thông báo đỏ chạy trực tiếp tới tất cả người chơi đang online.
            </p>
          </button>

          {/* Action 2: Clear Spam Chat */}
          <button
            type="button"
            onClick={async () => {
              if (window.confirm('Bạn có chắc chắn muốn dọn sạch toàn bộ tin nhắn trong Kênh Chat Hệ Thống?')) {
                soundFx.playKeyClick();
                try {
                  const res = await fetch('/api/chat/clear', { method: 'POST' });
                  if (res.ok) {
                    if (onClearChat) onClearChat();
                    showToast('Đã dọn dẹp sạch sẽ toàn bộ tin nhắn chat!');
                  }
                } catch {
                  showToast('Lỗi khi xóa kênh chat!');
                }
              }
            }}
            className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-rose-500/30 hover:border-rose-400/80 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs mb-1">
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Xóa Sạch Chat Rác / Spam</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Làm trống phòng chat công cộng khi có spam hoặc ngôn từ không phù hợp.
            </p>
          </button>

          {/* Action 3: Player Punish & Ban */}
          <button
            type="button"
            onClick={() => onNavigateTab('users')}
            className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-red-500/30 hover:border-red-400/80 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs mb-1">
              <ShieldAlert className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Xử Lý Gian Lận / Ban Cổ Phạt</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Cấm thi đấu các tài khoản sử dụng Auto, Macro hoặc vi phạm nội quy.
            </p>
          </button>

          {/* Action 4: Backup & Restore */}
          <button
            type="button"
            onClick={() => onNavigateTab('backup')}
            className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-sky-500/30 hover:border-sky-400/80 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs mb-1">
              <FileDown className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Sao Lưu & Xuất Cấu Hình</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Xuất tệp JSON dự phòng toàn bộ cài đặt game, từ vựng và Boss.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

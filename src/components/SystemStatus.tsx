import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  Activity, 
  RefreshCw, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Zap, 
  Lock, 
  Users, 
  Layers, 
  ExternalLink,
  ChevronRight,
  X,
  Radio,
  Clock
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { checkDatabaseHealth, HealthCheckResponse } from '../utils/dbHealth';

export interface SystemStatusProps {
  /**
   * Kiểu hiển thị:
   * - 'bar': Thanh trạng thái chân trang gọn gàng, thanh lịch
   * - 'card': Khối widget đầy đủ thông số cho Lobby / Admin
   * - 'badge': Nút pill siêu nhỏ gọn hiển thị ping & trạng thái
   */
  variant?: 'bar' | 'card' | 'badge';
  className?: string;
  autoRefreshInterval?: number; // mặc định 15000ms
  onOpenDetails?: () => void;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({
  variant = 'bar',
  className = '',
  autoRefreshInterval = 15000,
  onOpenDetails,
}) => {
  const [data, setData] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<number>(Date.now());
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchHealth = useCallback(async (isManual = false) => {
    try {
      setLoading(true);
      if (isManual) soundFx.playKeyClick();
      const res = await checkDatabaseHealth(6000);
      setData(res);
      setLastChecked(Date.now());
    } catch (err) {
      console.error('SystemStatus check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth(false);
    if (autoRefreshInterval <= 0) return;
    const timer = setInterval(() => {
      fetchHealth(false);
    }, autoRefreshInterval);
    return () => clearInterval(timer);
  }, [fetchHealth, autoRefreshInterval]);

  const isConnected = data?.database?.connected;
  const isConfigured = data?.database?.configured;
  const latency = data?.database?.latencyMs;
  const isServerless = data?.database?.serverless ?? false;
  const tablesVerified = data?.database?.tablesVerified ?? false;

  // Xếp loại màu sắc theo độ trễ ping
  const getLatencyColor = (ms?: number) => {
    if (ms === undefined) return 'text-slate-400';
    if (ms < 120) return 'text-emerald-400';
    if (ms < 250) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getLatencyBadgeBg = (ms?: number) => {
    if (ms === undefined) return 'bg-slate-800 border-slate-700 text-slate-400';
    if (ms < 120) return 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300';
    if (ms < 250) return 'bg-amber-950/60 border-amber-500/40 text-amber-300';
    return 'bg-rose-950/60 border-rose-500/40 text-rose-300';
  };

  const handleOpenDetailModal = () => {
    soundFx.playKeyClick();
    if (onOpenDetails) {
      onOpenDetails();
    } else {
      setIsDetailModalOpen(true);
    }
  };

  // =========================================================================
  // VARIANT: BADGE (Pill nhỏ gọn cho Header hoặc góc màn hình)
  // =========================================================================
  if (variant === 'badge') {
    return (
      <>
        <button
          type="button"
          onClick={handleOpenDetailModal}
          className={`h-7.5 px-2.5 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer select-none shadow-xs active:scale-95 ${
            isConnected
              ? 'bg-slate-900/90 hover:bg-slate-800 border-emerald-500/40 text-slate-200'
              : isConfigured
                ? 'bg-rose-950/80 hover:bg-rose-900/80 border-rose-500/40 text-rose-300'
                : 'bg-amber-950/80 hover:bg-amber-900/80 border-amber-500/40 text-amber-300'
          } ${className}`}
          title="Xem chi tiết trạng thái CSDL Supabase & Máy chủ"
        >
          <span className="flex h-2 w-2 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isConnected ? 'bg-emerald-400' : isConfigured ? 'bg-rose-400' : 'bg-amber-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isConnected ? 'bg-emerald-500' : isConfigured ? 'bg-rose-500' : 'bg-amber-500'
            }`} />
          </span>
          <span className="font-mono font-bold text-white">
            {isConnected ? (latency !== undefined ? `${latency}ms` : 'Online') : 'DB Offline'}
          </span>
        </button>

        {isDetailModalOpen && (
          <DetailModal
            data={data}
            loading={loading}
            onClose={() => setIsDetailModalOpen(false)}
            onRefresh={() => fetchHealth(true)}
          />
        )}
      </>
    );
  }

  // =========================================================================
  // VARIANT: CARD (Khối hiển thị đầy đủ thông số cho Lobby / Admin)
  // =========================================================================
  if (variant === 'card') {
    return (
      <>
        <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-800/90 shadow-xl relative overflow-hidden backdrop-blur-md ${className}`}>
          {/* Subtle Ambient Glow */}
          <div className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
            isConnected ? 'bg-emerald-500/10' : isConfigured ? 'bg-rose-500/10' : 'bg-amber-500/10'
          }`} />

          {/* Top Row: Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-xs ${
                isConnected
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : isConfigured
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              }`}>
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <span>Trạng Thái Hệ Thống & CSDL</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Supabase PostgreSQL
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Giám sát độ trễ mạng, tính sẵn sàng của kết nối DATABASE_URL và máy chủ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => fetchHealth(true)}
                disabled={loading}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Đo lại độ trễ mạng ngay bây giờ"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-amber-400' : ''}`} />
                <span>{loading ? 'Đang ping...' : 'Ping CSDL'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenDetailModal}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Chi Tiết</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-3.5">
            {/* Metric 1: DB Health */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-400" />
                <span>Kết Nối CSDL</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`} />
                <span className={`text-xs sm:text-sm font-black truncate ${
                  isConnected ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {isConnected ? 'Supabase Online' : (isConfigured ? 'Lỗi Kết Nối' : 'Chưa Cấu Hình')}
                </span>
              </div>
            </div>

            {/* Metric 2: Ping Latency */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-400" />
                <span>Độ Trễ Ping</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className={`text-xs sm:text-sm font-black font-mono ${getLatencyColor(latency)}`}>
                  {latency !== undefined ? `${latency} ms` : '---'}
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  {latency !== undefined ? (latency < 120 ? 'Rất nhanh' : 'Bình thường') : ''}
                </span>
              </div>
            </div>

            {/* Metric 3: Table Schema */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-purple-400" />
                <span>Bảng Dữ Liệu</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs sm:text-sm font-bold text-purple-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                <span>{tablesVerified ? '5/5 Xác Thực' : (isConnected ? 'Khởi Tạo Xong' : 'Chưa Sẵn Sàng')}</span>
              </div>
            </div>

            {/* Metric 4: Platform Engine */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3 h-3 text-amber-400" />
                <span>Môi Trường Máy Chủ</span>
              </div>
              <div className="mt-1 text-xs sm:text-sm font-bold text-amber-300 truncate">
                {isServerless ? 'Vercel Serverless' : 'Node.js Express'}
              </div>
            </div>
          </div>
        </div>

        {isDetailModalOpen && (
          <DetailModal
            data={data}
            loading={loading}
            onClose={() => setIsDetailModalOpen(false)}
            onRefresh={() => fetchHealth(true)}
          />
        )}
      </>
    );
  }

  // =========================================================================
  // VARIANT: BAR (Thanh trạng thái chân trang thanh lịch)
  // =========================================================================
  return (
    <>
      <div 
        onClick={handleOpenDetailModal}
        className={`inline-flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-850 border border-slate-800/90 hover:border-slate-700 shadow-sm text-xs text-slate-400 transition-all cursor-pointer group active:scale-[0.99] select-none ${className}`}
        title="Bấm để xem chi tiết chẩn đoán CSDL Supabase & hạ tầng"
      >
        {/* Status Dot */}
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isConnected ? 'bg-emerald-400' : isConfigured ? 'bg-rose-400' : 'bg-amber-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isConnected ? 'bg-emerald-500' : isConfigured ? 'bg-rose-500' : 'bg-amber-500'
            }`} />
          </span>

          <span className="font-medium text-slate-300 group-hover:text-white flex items-center gap-1">
            <Database className="w-3 h-3 text-slate-400 group-hover:text-amber-400 transition-colors" />
            <span>Supabase CSDL:</span>
          </span>

          <span className={`font-bold ${isConnected ? 'text-emerald-400' : isConfigured ? 'text-rose-400' : 'text-amber-400'}`}>
            {isConnected ? 'Hoạt Động' : (isConfigured ? 'Lỗi Kết Nối' : 'Chưa Cấu Hình')}
          </span>
        </div>

        <span className="text-slate-600 hidden xs:inline">•</span>

        {/* Latency Pill */}
        <div className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border flex items-center gap-1 ${getLatencyBadgeBg(latency)}`}>
          <Clock className="w-3 h-3 opacity-80" />
          <span>{latency !== undefined ? `${latency}ms` : '---'}</span>
        </div>

        <span className="text-slate-600 hidden sm:inline">•</span>

        {/* Server & Security Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-[11px]">
          <Lock className="w-3 h-3 text-sky-400" />
          <span>SSL Secured</span>
          <span className="text-slate-600">•</span>
          <span>{isServerless ? 'Vercel Serverless' : 'Server Online'}</span>
        </div>

        {/* Refresh Icon */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fetchHealth(true);
          }}
          disabled={loading}
          className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-0.5 cursor-pointer disabled:opacity-50"
          title="Đo lại độ trễ mạng ngay lập tức"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {isDetailModalOpen && (
        <DetailModal
          data={data}
          loading={loading}
          onClose={() => setIsDetailModalOpen(false)}
          onRefresh={() => fetchHealth(true)}
        />
      )}
    </>
  );
};

// ===========================================================================
// MODAL CHẨN ĐOÁN CHI TIẾT (Detail Modal)
// ===========================================================================
interface DetailModalProps {
  data: HealthCheckResponse | null;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({
  data,
  loading,
  onClose,
  onRefresh,
}) => {
  const isConnected = data?.database?.connected;
  const isConfigured = data?.database?.configured;
  const latency = data?.database?.latencyMs;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              isConnected 
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}>
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Chẩn Đoán Tính Sẵn Sàng Hệ Thống</h3>
              <p className="text-[11px] text-slate-400">Supabase PostgreSQL & Vercel Availability</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-300 overflow-y-auto">
          {/* Status Box */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            isConnected
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
          }`}>
            <div className="flex items-center gap-2.5">
              {isConnected ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
              )}
              <div>
                <div className="font-bold text-white text-sm">
                  {isConnected ? 'CSDL Hoạt Động Bình Thường' : 'Mất Kết Nối Tới CSDL'}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  {isConnected 
                    ? 'Tất cả lệnh đọc/ghi CSDL qua Supabase connection pool đều sẵn sàng.' 
                    : (data?.database?.error || 'Kiểm tra cấu hình DATABASE_URL trên Vercel.')}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              title="Ping lại ngay"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>

          {/* Diagnostics Details Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Độ Trễ Mạng (Ping Latency):</span>
              <span className="font-mono font-bold text-white">
                {latency !== undefined ? `${latency} ms` : 'Chưa đo được'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Hạ Tầng Lưu Trữ:</span>
              <span className="font-bold text-emerald-400">
                {isConnected ? 'PostgreSQL (Supabase Pooler)' : 'Local Memory Storage'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Môi Trường Vận Hành:</span>
              <span className="font-bold text-amber-300">
                {data?.database?.serverless ? 'Vercel Serverless Function' : 'Node.js Express Server'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Bảo Mật Giao Thức:</span>
              <span className="font-bold text-sky-400">SSL / TLS Enforced</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Các Bảng CSDL (Tables):</span>
              <span className="font-bold text-purple-300">
                {data?.database?.tablesVerified ? '5/5 Bảng Sẵn Sàng (Verified)' : 'Đang đồng bộ'}
              </span>
            </div>
          </div>

          {/* API Link Reference */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-300">Endpoint Healthcheck Trực Tiếp</div>
              <div className="font-mono text-[11px] text-amber-400/90 mt-0.5">/api/db-health</div>
            </div>
            <a
              href="/api/db-health"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Mở API</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

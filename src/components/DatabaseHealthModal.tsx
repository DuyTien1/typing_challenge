import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  X, 
  Server, 
  Zap, 
  Layers, 
  ExternalLink, 
  Copy, 
  Check,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { checkDatabaseHealth, HealthCheckResponse } from '../utils/dbHealth';

interface DatabaseHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseHealthModal: React.FC<DatabaseHealthModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const res = await checkDatabaseHealth();
      setData(res);
    } catch (err) {
      console.error('Error running DB health check:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runHealthCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = data?.database?.connected;
  const isConfigured = data?.database?.configured;
  const latency = data?.database?.latencyMs;

  const copyEndpointUrl = () => {
    const fullUrl = `${window.location.origin}/api/db-health`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    soundFx.playKeyClick();
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs ${
              isConnected 
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                : isConfigured 
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' 
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Kiểm Tra Kết Nối CSDL Supabase</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-medium border bg-slate-800 border-slate-700 text-slate-300">
                  DATABASE_URL
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Xác thực trạng thái CSDL PostgreSQL & Serverless Functions trên Vercel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-300">
          {/* Main Status Hero Card */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isConnected
              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-xs shadow-emerald-950/20'
              : isConfigured
                ? 'bg-rose-950/20 border-rose-500/40 shadow-xs shadow-rose-950/20'
                : 'bg-amber-950/20 border-amber-500/40 shadow-xs shadow-amber-950/20'
          }`}>
            <div className="flex items-center gap-3">
              {isConnected ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
              ) : isConfigured ? (
                <XCircle className="w-7 h-7 text-rose-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-7 h-7 text-amber-400 shrink-0" />
              )}
              <div>
                <div className="font-bold text-white text-base">
                  {isConnected 
                    ? 'Kết Nối Supabase Thành Công!' 
                    : isConfigured 
                      ? 'Lỗi Kết Nối Tới Supabase' 
                      : 'Chưa Phát Hiện DATABASE_URL'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {isConnected 
                    ? 'CSDL PostgreSQL Supabase hoạt động ổn định và sẵn sàng lưu trữ dữ liệu vĩnh viễn.' 
                    : isConfigured 
                      ? (data?.database?.error || 'Không thể thiết lập kết nối tới chuỗi DATABASE_URL được cung cấp.') 
                      : 'Hệ thống đang tạm sử dụng bộ nhớ cục bộ. Vui lòng thêm biến DATABASE_URL trên Vercel.'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                runHealthCheck();
              }}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 self-end sm:self-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>{loading ? 'Đang kiểm tra...' : 'Kiểm Tra Lại'}</span>
            </button>
          </div>

          {/* Detailed Diagnostic Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Metric 1: Latency */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Độ Trễ Ping (Latency)</span>
              </div>
              <div className="text-lg font-bold text-white mt-1">
                {latency !== undefined ? `${latency} ms` : '---'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {latency !== undefined ? (latency < 150 ? 'Rất nhanh (Lý tưởng)' : 'Chấp nhận được') : 'Chưa đo được'}
              </div>
            </div>

            {/* Metric 2: Storage Type */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span>Loại Lưu Trữ</span>
              </div>
              <div className="text-lg font-bold text-emerald-400 mt-1 truncate">
                {isConnected ? 'PostgreSQL' : (isConfigured ? 'Lỗi CSDL' : 'Local Memory')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                {isConnected ? 'Supabase Pooler' : 'Fallback'}
              </div>
            </div>

            {/* Metric 3: Table Schema Status */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Bảng CSDL</span>
              </div>
              <div className="text-lg font-bold text-purple-300 mt-1">
                {data?.database?.tablesVerified ? 'Đã Xác Thực' : (isConnected ? 'Khởi Tạo Xong' : 'Chờ Kết Nối')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                5 bảng dữ liệu cốt lõi
              </div>
            </div>
          </div>

          {/* Database Tables Verification Checklist */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Cấu Trúc Các Bảng Trên Supabase</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <Check className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span className="font-mono text-slate-200">app_users</span>
                <span className="text-[10px] text-slate-500 ml-auto">Tài khoản & tu vi</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <Check className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span className="font-mono text-slate-200">app_sects</span>
                <span className="text-[10px] text-slate-500 ml-auto">Tông môn & bang hội</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <Check className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span className="font-mono text-slate-200">app_leaderboard</span>
                <span className="text-[10px] text-slate-500 ml-auto">Bảng vàng WPM</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <Check className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span className="font-mono text-slate-200">app_chat_messages</span>
                <span className="text-[10px] text-slate-500 ml-auto">Lịch sử chat</span>
              </div>
            </div>
          </div>

          {/* Quick Endpoint Reference */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-300">
                Endpoint Kiểm Tra Trực Tiếp (Healthcheck API):
              </div>
              <div className="text-[11px] font-mono text-amber-400/90 mt-0.5">
                /api/db-health &nbsp;hoặc&nbsp; /api/health
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={copyEndpointUrl}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sao chép đường dẫn API"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Đã sao chép' : 'Copy URL'}</span>
              </button>

              <a
                href="/api/db-health"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
                title="Mở trong tab mới"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở API</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/30 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Môi trường: <span className="font-mono text-slate-400">{data?.database?.serverless ? 'Vercel Serverless' : 'Node Server'}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

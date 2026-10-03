import React, { useState, useEffect } from 'react';
import { ShieldAlert, Zap, Clock, AlertOctagon, Flame, X, Lock } from 'lucide-react';
import { formatRemainingTime } from '../utils/banManager';
import { soundFx } from '../utils/audio';

interface BanPenaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  bannedUntil: number;
  reason: string;
  username: string;
}

export const BanPenaltyModal: React.FC<BanPenaltyModalProps> = ({
  isOpen,
  onClose,
  bannedUntil,
  reason,
  username,
}) => {
  const [remainingMs, setRemainingMs] = useState<number>(() => Math.max(0, bannedUntil - Date.now()));

  useEffect(() => {
    if (!isOpen) return;

    const updateTimer = () => {
      const diff = Math.max(0, bannedUntil - Date.now());
      setRemainingMs(diff);
      if (diff <= 0) {
        // Tự động đóng khi hết hạn
        onClose();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isOpen, bannedUntil, onClose]);

  // Listen to Escape key to quickly close ban penalty modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        soundFx.playKeyClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const time = formatRemainingTime(remainingMs);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundFx.playKeyClick();
          onClose();
        }
      }}
    >
      {/* Background Glow Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/40 via-purple-950/20 to-black pointer-events-none" />

      <div className="relative w-full max-w-lg rounded-3xl bg-[#0f0c13] border-2 border-red-600/80 shadow-2xl shadow-red-950/80 overflow-hidden text-slate-100 flex flex-col">
        {/* Top Header Banner with Lightning Sparks */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-red-950 via-slate-950 to-purple-950 border-b border-red-500/40 flex items-start justify-between gap-3 overflow-hidden">
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-red-600/20 rounded-full blur-2xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-600/20 rounded-full blur-2xl pointer-events-none animate-pulse" />

          <div className="flex items-center gap-3.5 relative z-10">
            {/* Bàn Cổ Avatar with Dark Blood Flame Halo */}
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-900 to-slate-900 border-2 border-red-500 shadow-lg shadow-red-600/50 flex items-center justify-center text-2xl shrink-0 frame-dragon-box">
              <span className="animate-pulse">⚡</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 border border-red-500/60 tracking-wider">
                  THIÊN QUY BẤT DUNG
                </span>
                <span className="text-[10px] font-bold text-amber-400">
                  CẤM ĐẤU 2 GIỜ
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-amber-300 uppercase tracking-wide mt-0.5">
                Bàn Cổ Trừng Phạt • U Minh Hàn Ngục
              </h2>
              <p className="text-[11px] text-slate-400">
                Chấp Pháp: <span className="text-red-300 font-bold">Bàn Cổ Thần Thức</span> (Giám Giới Thần Quân)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="px-2 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-red-500/80 text-slate-400 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer relative z-10 shrink-0 shadow-sm"
            title="Đóng thông báo (phím Esc)"
          >
            <X className="w-4 h-4" />
            <kbd className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-amber-400">Esc</kbd>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Target & Violation Warning */}
          <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold">Đạo hữu thụ án:</span>
              <span className="font-mono font-black text-amber-300 text-sm">@{username}</span>
            </div>
            <div className="flex items-start gap-2 pt-1 border-t border-red-900/40">
              <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="text-slate-200 leading-relaxed">
                <span className="text-red-400 font-bold">Hành vi phát hiện: </span>
                <span>{reason || 'Bất thường tần số gõ phím / Nghi vấn can thiệp Auto Macro'}</span>
              </div>
            </div>
          </div>

          {/* Countdown Clock Display */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-red-500/50 shadow-inner flex flex-col items-center justify-center space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-red-400 animate-spin" />
              <span>Thời Gian Thụ Án Còn Lại</span>
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-black text-red-400 tracking-widest drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]">
              {time.formatted}
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              (Phong ấn sẽ tự động được Bàn Cổ Thần Thức hóa giải sau khi đếm ngược kết thúc)
            </p>
          </div>

          {/* Penalty Rules List */}
          <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-black text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Chế tài thi hành nghiêm cấm:</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 text-[11px] pl-1">
              <li className="flex items-center gap-2 text-rose-300">
                <span className="text-red-400">⚡</span>
                <span><strong>Phế trừ 500 Tu Vi:</strong> Tiêu tán đạo hạnh và giáng cấp công lực.</span>
              </li>
              <li className="flex items-center gap-2 text-rose-300">
                <span className="text-red-400">🔒</span>
                <span><strong>Khóa toàn bộ chế độ thi đấu:</strong> Không thể vào phòng, tạo phòng, Săn Boss, Đoán Chữ, Ngẫu Hứng hay Outplay.</span>
              </li>
              <li className="flex items-center gap-2 text-rose-300">
                <span className="text-red-400">🚫</span>
                <span><strong>Đóng băng Bảng Vàng:</strong> Mọi thành tích trong thời gian thụ án đều bị vô hiệu hóa.</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <span className="text-amber-400">🍵</span>
                <span>Hãy tranh thủ 2 giờ này buông lỏng cổ tay, rèn luyện đạo tâm và trở lại với phong thái chính trực!</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-700 via-rose-700 to-red-800 hover:from-red-600 hover:to-rose-600 text-white font-black text-xs transition-all shadow-lg shadow-red-950/50 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Đã Hiểu & Tự Hối Lỗi (Cấm Đấu 2 Giờ)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

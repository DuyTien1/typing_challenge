import React, { useState, useEffect } from 'react';
import { GameMode } from '../types';
import { soundFx } from '../utils/audio';
import { getModeDisplayName } from '../utils/roomManager';
import { 
  X, 
  Crown, 
  Zap, 
  LogIn, 
  Sparkles, 
  AlertCircle, 
  Users, 
  ArrowRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: GameMode;
  onCreateNewRoom: (mode: GameMode) => Promise<void> | void;
  onJoinExistingRoom: (code: string, mode: GameMode) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onQuickJoinRoom: (mode: GameMode) => Promise<void> | void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  mode,
  onCreateNewRoom,
  onJoinExistingRoom,
  onQuickJoinRoom,
}) => {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setRoomCodeInput('');
      setErrorMessage(null);
      setIsProcessing(false);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const modeName = getModeDisplayName(mode);

  const handleCreateNew = async () => {
    soundFx.playKeyClick();
    setIsProcessing(true);
    try {
      await onCreateNewRoom(mode);
    } catch {
      setIsProcessing(false);
    }
  };

  const handleJoinExisting = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    const trimmed = roomCodeInput.trim();
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập mã phòng thi đấu (VD: VN-5111 hoặc 5111).');
      soundFx.playError();
      return;
    }

    soundFx.playKeyClick();
    setIsProcessing(true);

    try {
      const result = await onJoinExistingRoom(trimmed, mode);
      if (!result.success) {
        soundFx.playError();
        setErrorMessage(result.error || 'Không thể tham gia phòng này.');
        setIsProcessing(false);
      }
    } catch {
      soundFx.playError();
      setErrorMessage('Lỗi kết nối máy chủ. Vui lòng thử lại!');
      setIsProcessing(false);
    }
  };

  const handleQuickJoin = async () => {
    soundFx.playKeyClick();
    setIsProcessing(true);
    try {
      await onQuickJoinRoom(mode);
    } catch {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          soundFx.playKeyClick();
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative my-auto animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="btn-close-join-modal"
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            onClose();
          }}
          disabled={isProcessing}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pr-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>Phòng Chờ Thi Đấu Nhiều Người</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Chọn Cách Vào Phòng</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Chế độ: <span className="text-amber-400 font-bold">{modeName}</span> (Hỗ trợ tối đa 8 người chơi / bot)
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* 3 Main Action Choices */}
        <div className="grid grid-cols-1 gap-3.5">
          {/* Option 1: Tạo Phòng Mới (Chủ phòng, 0 bot, slot trống để tự thêm) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-850 border border-amber-500/30 hover:border-amber-400/70 transition-all group relative shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Crown className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                      Tạo Phòng Mới
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Chủ Phòng
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Khởi tạo phòng mới hoàn toàn. Bạn có quyền chọn độ khó, chủ động thêm bot vào slot trống và bắt đầu trận đấu.
                  </p>
                </div>
              </div>

              <button
                id="btn-choice-create-room"
                type="button"
                disabled={isProcessing}
                onClick={handleCreateNew}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4 fill-black" />}
                <span>Tạo Phòng</span>
              </button>
            </div>
          </div>

          {/* Option 2: Vào Phòng Đã Có (Nhập mã phòng) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-850 border border-slate-700/80 hover:border-sky-500/60 transition-all group relative shadow-md">
            <div className="flex flex-col gap-3.5">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
                  <LogIn className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white group-hover:text-sky-300 transition-colors">
                      Vào Phòng Đã Có
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      Nhập Mã
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Nhập mã phòng được chia sẻ từ bạn bè hoặc người chơi khác để cùng tham gia tranh tài.
                  </p>
                </div>
              </div>

              {/* Form Input + Submit */}
              <form onSubmit={handleJoinExisting} className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-1">
                <div className="relative flex-1">
                  <input
                    id="input-room-code"
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => {
                      setRoomCodeInput(e.target.value.toUpperCase());
                      setErrorMessage(null);
                    }}
                    placeholder="Nhập mã phòng (VD: VN-5111 hoặc #VN-5111 hoặc 5111)"
                    maxLength={30}
                    disabled={isProcessing}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 text-sm font-mono font-bold tracking-wider text-white placeholder:text-slate-500 outline-none transition-all"
                  />
                </div>

                <button
                  id="btn-choice-join-code"
                  type="submit"
                  disabled={isProcessing || !roomCodeInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  <span>Vào Phòng</span>
                </button>
              </form>
            </div>
          </div>

          {/* Option 3: Vào Phòng Nhanh (Ghép tự động) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-850 border border-emerald-500/30 hover:border-emerald-400/70 transition-all group relative shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                      Vào Phòng Nhanh
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Tự Động Ghép
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Người vào đầu tiên sẽ làm chủ phòng. Các người chơi kế tiếp tự động ghép vào phòng này cho đến khi đầy hoặc bắt đầu.
                  </p>
                </div>
              </div>

              <button
                id="btn-choice-quick-join"
                type="button"
                disabled={isProcessing}
                onClick={handleQuickJoin}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-black" />}
                <span>Vào Nhanh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Bạn có thể mở nhiều tab trình duyệt để kiểm tra ghép phòng thời gian thực!</span>
          </span>
          <button
            id="btn-cancel-join-modal"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white underline cursor-pointer text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

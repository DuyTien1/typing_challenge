import React, { useState, useEffect, useRef } from 'react';
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
  Loader2,
  CornerDownLeft
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
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const createBtnRef = useRef<HTMLButtonElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);
  const quickJoinBtnRef = useRef<HTMLButtonElement>(null);

  // Reset state on open and default focus to Option 0 (Tạo phòng)
  useEffect(() => {
    if (isOpen) {
      setRoomCodeInput('');
      setErrorMessage(null);
      setIsProcessing(false);
      setSelectedIndex(0);

      const timer = setTimeout(() => {
        createBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mode]);

  // Focus element whenever selectedIndex changes
  useEffect(() => {
    if (!isOpen || isProcessing) return;

    const timer = setTimeout(() => {
      if (selectedIndex === 0) {
        createBtnRef.current?.focus();
      } else if (selectedIndex === 1) {
        roomInputRef.current?.focus();
        roomInputRef.current?.select();
      } else if (selectedIndex === 2) {
        quickJoinBtnRef.current?.focus();
      }
    }, 40);

    return () => clearTimeout(timer);
  }, [selectedIndex, isOpen, isProcessing]);

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
      roomInputRef.current?.focus();
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
        roomInputRef.current?.focus();
      }
    } catch {
      soundFx.playError();
      setErrorMessage('Lỗi kết nối máy chủ. Vui lòng thử lại!');
      setIsProcessing(false);
      roomInputRef.current?.focus();
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

  // Keyboard navigation listener (Arrow keys, Enter, Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isProcessing) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        soundFx.playKeyClick();
        onClose();
        return;
      }

      const isInputFocused = document.activeElement === roomInputRef.current;

      // Down arrow moves to next option (0 -> 1 -> 2 -> 0)
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        soundFx.playKeyClick();
        setSelectedIndex((prev) => (prev + 1) % 3);
        return;
      }

      // Up arrow moves to previous option (0 -> 2 -> 1 -> 0)
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        soundFx.playKeyClick();
        setSelectedIndex((prev) => (prev - 1 + 3) % 3);
        return;
      }

      // Left/Right arrow when not typing inside input
      if (!isInputFocused) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          soundFx.playKeyClick();
          setSelectedIndex((prev) => (prev + 1) % 3);
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          soundFx.playKeyClick();
          setSelectedIndex((prev) => (prev - 1 + 3) % 3);
          return;
        }
      }

      // Enter key confirms current option
      if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex === 0) {
          handleCreateNew();
        } else if (selectedIndex === 1) {
          handleJoinExisting();
        } else if (selectedIndex === 2) {
          handleQuickJoin();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, isProcessing, roomCodeInput, mode]);

  if (!isOpen) return null;

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
          className="absolute top-5 right-5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
          title="Đóng (Esc)"
        >
          <kbd className="hidden sm:inline text-[10px] font-mono font-semibold px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
            Esc
          </kbd>
          <X className="w-4 h-4" />
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
            Chế độ: <span className="text-amber-400 font-bold">{modeName}</span> (Dùng phím <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono text-[10px]">↓</kbd> để di chuyển, <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono text-[10px]">Enter</kbd> để chọn)
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
          <div 
            onClick={() => {
              setSelectedIndex(0);
              createBtnRef.current?.focus();
            }}
            className={`p-4 sm:p-5 rounded-2xl transition-all relative shadow-md cursor-pointer ${
              selectedIndex === 0
                ? 'bg-amber-500/10 border-2 border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/10'
                : 'bg-slate-850 border border-slate-700/70 hover:border-amber-500/40 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className={`p-3 rounded-2xl transition-transform shrink-0 ${
                  selectedIndex === 0 
                    ? 'bg-amber-500/25 border border-amber-400 text-amber-300 scale-105' 
                    : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                }`}>
                  <Crown className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-black transition-colors ${
                      selectedIndex === 0 ? 'text-amber-300' : 'text-white'
                    }`}>
                      Tạo Phòng Mới
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Chủ Phòng
                    </span>
                    {selectedIndex === 0 && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 animate-pulse">
                        <CornerDownLeft className="w-3 h-3" />
                        Enter
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Khởi tạo phòng mới hoàn toàn. Bạn có quyền chọn độ khó, chủ động thêm bot vào slot trống và bắt đầu trận đấu.
                  </p>
                </div>
              </div>

              <button
                ref={createBtnRef}
                id="btn-choice-create-room"
                type="button"
                disabled={isProcessing}
                onFocus={() => setSelectedIndex(0)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(0);
                  handleCreateNew();
                }}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50 ${
                  selectedIndex === 0
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black shadow-amber-400/30 ring-2 ring-white/50'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 shadow-amber-500/20'
                }`}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4 fill-black" />}
                <span>Tạo Phòng</span>
              </button>
            </div>
          </div>

          {/* Option 2: Vào Phòng Đã Có (Nhập mã phòng) */}
          <div 
            onClick={() => {
              setSelectedIndex(1);
              roomInputRef.current?.focus();
            }}
            className={`p-4 sm:p-5 rounded-2xl transition-all relative shadow-md cursor-pointer ${
              selectedIndex === 1
                ? 'bg-sky-500/10 border-2 border-sky-400 ring-2 ring-sky-400/30 shadow-lg shadow-sky-500/10'
                : 'bg-slate-850 border border-slate-700/70 hover:border-sky-500/40 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex flex-col gap-3.5">
              <div className="flex items-start gap-3.5">
                <div className={`p-3 rounded-2xl transition-transform shrink-0 ${
                  selectedIndex === 1 
                    ? 'bg-sky-500/25 border border-sky-400 text-sky-300 scale-105' 
                    : 'bg-sky-500/15 border border-sky-500/30 text-sky-400'
                }`}>
                  <LogIn className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-black transition-colors ${
                      selectedIndex === 1 ? 'text-sky-300' : 'text-white'
                    }`}>
                      Vào Phòng Đã Có
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      Nhập Mã
                    </span>
                    {selectedIndex === 1 && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-400/20 text-sky-300 border border-sky-400/30 animate-pulse">
                        <CornerDownLeft className="w-3 h-3" />
                        Enter
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Nhập mã phòng được chia sẻ từ bạn bè hoặc người chơi khác để cùng tham gia tranh tài.
                  </p>
                </div>
              </div>

              {/* Form Input + Submit */}
              <form 
                onSubmit={handleJoinExisting} 
                className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative flex-1">
                  <input
                    ref={roomInputRef}
                    id="input-room-code"
                    type="text"
                    value={roomCodeInput}
                    onFocus={() => setSelectedIndex(1)}
                    onChange={(e) => {
                      setRoomCodeInput(e.target.value.toUpperCase());
                      setErrorMessage(null);
                    }}
                    placeholder="Nhập mã phòng (VD: VN-5111 hoặc #VN-5111 hoặc 5111)"
                    maxLength={30}
                    disabled={isProcessing}
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-900 border text-sm font-mono font-bold tracking-wider text-white placeholder:text-slate-500 outline-none transition-all ${
                      selectedIndex === 1 
                        ? 'border-sky-400 ring-2 ring-sky-400/30 bg-slate-950' 
                        : 'border-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20'
                    }`}
                  />
                </div>

                <button
                  id="btn-choice-join-code"
                  type="submit"
                  disabled={isProcessing || !roomCodeInput.trim()}
                  onFocus={() => setSelectedIndex(1)}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                    selectedIndex === 1 && roomCodeInput.trim()
                      ? 'bg-sky-400 text-black shadow-sky-400/30 ring-2 ring-white/50'
                      : 'bg-sky-500 hover:bg-sky-400 text-black shadow-sky-500/20'
                  }`}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  <span>Vào Phòng</span>
                </button>
              </form>
            </div>
          </div>

          {/* Option 3: Vào Phòng Nhanh (Ghép tự động) */}
          <div 
            onClick={() => {
              setSelectedIndex(2);
              quickJoinBtnRef.current?.focus();
            }}
            className={`p-4 sm:p-5 rounded-2xl transition-all relative shadow-md cursor-pointer ${
              selectedIndex === 2
                ? 'bg-emerald-500/10 border-2 border-emerald-400 ring-2 ring-emerald-400/30 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-850 border border-slate-700/70 hover:border-emerald-500/40 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className={`p-3 rounded-2xl transition-transform shrink-0 ${
                  selectedIndex === 2 
                    ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-300 scale-105' 
                    : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                }`}>
                  <Zap className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-black transition-colors ${
                      selectedIndex === 2 ? 'text-emerald-300' : 'text-white'
                    }`}>
                      Vào Phòng Nhanh
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Tự Động Ghép
                    </span>
                    {selectedIndex === 2 && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 animate-pulse">
                        <CornerDownLeft className="w-3 h-3" />
                        Enter
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Người vào đầu tiên sẽ làm chủ phòng. Các người chơi kế tiếp tự động ghép vào phòng này cho đến khi đầy hoặc bắt đầu.
                  </p>
                </div>
              </div>

              <button
                ref={quickJoinBtnRef}
                id="btn-choice-quick-join"
                type="button"
                disabled={isProcessing}
                onFocus={() => setSelectedIndex(2)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(2);
                  handleQuickJoin();
                }}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50 ${
                  selectedIndex === 2
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-300 text-black shadow-emerald-400/30 ring-2 ring-white/50'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:from-emerald-400 hover:to-teal-300 shadow-emerald-500/20'
                }`}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-black" />}
                <span>Vào Nhanh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note with keyboard controls */}
        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-amber-300 font-bold">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-amber-300 font-bold">↓</kbd>
              <span className="text-slate-400 text-[10px] ml-0.5">Di chuyển</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-amber-300 font-bold">Enter</kbd>
              <span className="text-slate-400 text-[10px] ml-0.5">Chọn / Xác nhận</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-400">Esc</kbd>
              <span className="text-slate-400 text-[10px] ml-0.5">Đóng</span>
            </span>
          </div>
          <button
            id="btn-cancel-join-modal"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white underline cursor-pointer text-xs shrink-0"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

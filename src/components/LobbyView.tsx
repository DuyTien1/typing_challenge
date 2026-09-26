import React from 'react';
import { GameMode } from '../types';
import { soundFx } from '../utils/audio';
import { 
  Zap, 
  Search, 
  Skull, 
  Target, 
  Calculator, 
  Flag, 
  Users, 
  Play, 
  Sparkles,
  Gamepad2
} from 'lucide-react';

interface LobbyViewProps {
  currentMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  onStartSoloGame: (modeOverride?: GameMode) => void;
  onJoinWaitingRoom: (mode?: GameMode) => void;
  hasAnyModalOpen?: boolean;
  isBanned?: boolean;
  bannedRemainingFormatted?: string;
  onOpenBanModal?: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  currentMode,
  onSelectMode,
  onStartSoloGame,
  onJoinWaitingRoom,
  hasAnyModalOpen = false,
  isBanned = false,
  bannedRemainingFormatted,
  onOpenBanModal,
}) => {
  const modes = [
    {
      id: 'vi_dau' as GameMode,
      keyShortcut: '1',
      name: 'Tiếng Việt Có Dấu',
      subtext: 'Bộ từ vựng chuẩn & phức tạp, luyện gõ thanh điệu tiếng Việt',
      icon: <Flag className="w-5 h-5 text-rose-400" />,
      tag: 'Multiplayer (8 Người)',
      isSolo: false,
      color: 'from-rose-500/20 via-rose-500/10 to-transparent border-rose-500/40 text-rose-300',
      badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
      accentColor: 'hover:border-rose-400/80 hover:shadow-rose-500/10',
    },
    {
      id: 'vi_nodau' as GameMode,
      keyShortcut: '2',
      name: 'Tiếng Việt Không Dấu',
      subtext: 'Luyện gõ lướt phím tốc độ cao, bứt phá giới hạn WPM',
      icon: <span className="text-base font-black text-amber-400">VD</span>,
      tag: 'Multiplayer (8 Người)',
      isSolo: false,
      color: 'from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/40 text-amber-300',
      badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
      accentColor: 'hover:border-amber-400/80 hover:shadow-amber-500/10',
    },
    {
      id: 'en' as GameMode,
      keyShortcut: '3',
      name: 'Tiếng Anh (English)',
      subtext: 'Bộ từ điển Oxford 3000 từ thông dụng và học thuật',
      icon: <span className="text-base font-black text-sky-400">EN</span>,
      tag: 'Multiplayer (8 Người)',
      isSolo: false,
      color: 'from-sky-500/20 via-sky-500/10 to-transparent border-sky-500/40 text-sky-300',
      badgeColor: 'bg-sky-950/80 text-sky-300 border-sky-500/40',
      accentColor: 'hover:border-sky-400/80 hover:shadow-sky-500/10',
    },
    {
      id: 'numpad' as GameMode,
      keyShortcut: '4',
      name: 'Bàn Phím Số (Numpad)',
      subtext: 'Chuỗi số tính tiền, phép tính Fullsize và mã Easter Egg 58008',
      icon: <Calculator className="w-5 h-5 text-emerald-400" />,
      tag: 'Multiplayer (8 Người)',
      isSolo: false,
      color: 'from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-500/40 text-emerald-300',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      accentColor: 'hover:border-emerald-400/80 hover:shadow-emerald-500/10',
    },
    {
      id: 'ngau_hung' as GameMode,
      keyShortcut: '5',
      name: 'Ngẫu Hứng (Rush)',
      subtext: 'Đua 1 từ chớp nhoáng theo vòng (15 hoặc 20 vòng)',
      icon: <Zap className="w-5 h-5 text-yellow-400" />,
      tag: 'Multiplayer (8 Người)',
      isSolo: false,
      color: 'from-yellow-500/20 via-yellow-500/10 to-transparent border-yellow-500/40 text-yellow-300',
      badgeColor: 'bg-yellow-950/80 text-yellow-300 border-yellow-500/40',
      accentColor: 'hover:border-yellow-400/80 hover:shadow-yellow-500/10',
    },
    {
      id: 'doan_chu' as GameMode,
      keyShortcut: '6',
      name: 'Đoán Chữ (Mystery)',
      subtext: 'Mở ký tự theo chu kỳ, gợi ý chủ đề & phán đoán từ',
      icon: <Search className="w-5 h-5 text-purple-400" />,
      tag: 'Multiplayer (8 Người)',
      isSolo: false,
      color: 'from-purple-500/20 via-purple-500/10 to-transparent border-purple-500/40 text-purple-300',
      badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
      accentColor: 'hover:border-purple-400/80 hover:shadow-purple-500/10',
    },
    {
      id: 'san_boss' as GameMode,
      keyShortcut: '7',
      name: 'Săn Boss (Raid)',
      subtext: 'Hợp lực diệt Hắc Long Ma Vương, phá giáp làm choáng & tự bạo',
      icon: <Skull className="w-5 h-5 text-red-500 animate-pulse" />,
      tag: 'Multiplayer Co-op',
      isSolo: false,
      color: 'from-red-600/25 via-red-900/15 to-transparent border-red-500/50 text-red-300',
      badgeColor: 'bg-red-950/80 text-red-300 border-red-500/40',
      accentColor: 'hover:border-red-400/80 hover:shadow-red-500/10',
    },
    {
      id: 'outplay' as GameMode,
      keyShortcut: '8',
      name: 'Outplay Yourself',
      subtext: 'Luyện tập cá nhân vượt kỷ lục bóng ma WPM của chính bạn',
      icon: <Target className="w-5 h-5 text-cyan-400" />,
      tag: 'Solo Độc Quyền',
      isSolo: true,
      color: 'from-cyan-500/20 via-blue-600/10 to-transparent border-cyan-500/40 text-cyan-300',
      badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
      accentColor: 'hover:border-cyan-400/80 hover:shadow-cyan-500/10',
    },
  ];

  // Phím tắt bàn phím tại Sảnh Chính:
  // - Phím 1 -> 8: Chọn nhanh chế độ (bấm phím số lần 2 sẽ vào chơi ngay)
  // - Enter / Space: Vào phòng chờ hoặc bắt đầu chế độ đang chọn
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasAnyModalOpen) return;

      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const keyMap: Record<string, GameMode> = {
        '1': 'vi_dau',
        '2': 'vi_nodau',
        '3': 'en',
        '4': 'numpad',
        '5': 'ngau_hung',
        '6': 'doan_chu',
        '7': 'san_boss',
        '8': 'outplay',
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        const targetMode = keyMap[e.key];
        soundFx.playKeyClick();
        if (currentMode === targetMode) {
          if (isBanned) {
            if (onOpenBanModal) onOpenBanModal();
            return;
          }
          if (targetMode === 'outplay') {
            soundFx.playCountdown(true);
            onStartSoloGame('outplay');
          } else {
            onJoinWaitingRoom(targetMode);
          }
        } else {
          onSelectMode(targetMode);
        }
        return;
      }

      // Arrow keys navigation between 8 modes
      const modeList: GameMode[] = [
        'vi_dau',
        'vi_nodau',
        'en',
        'numpad',
        'ngau_hung',
        'doan_chu',
        'san_boss',
        'outplay',
      ];
      const currentIdx = modeList.indexOf(currentMode);

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIdx = (currentIdx + 1) % modeList.length;
        soundFx.playKeyClick();
        onSelectMode(modeList[nextIdx]);
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIdx = (currentIdx - 1 + modeList.length) % modeList.length;
        soundFx.playKeyClick();
        onSelectMode(modeList[prevIdx]);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextRowIdx = (currentIdx + 4) % modeList.length;
        soundFx.playKeyClick();
        onSelectMode(modeList[nextRowIdx]);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevRowIdx = (currentIdx - 4 + modeList.length) % modeList.length;
        soundFx.playKeyClick();
        onSelectMode(modeList[prevRowIdx]);
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        soundFx.playKeyClick();
        if (isBanned) {
          if (onOpenBanModal) onOpenBanModal();
          return;
        }
        if (currentMode === 'outplay') {
          soundFx.playCountdown(true);
          onStartSoloGame('outplay');
        } else {
          onJoinWaitingRoom(currentMode);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMode, hasAnyModalOpen, onSelectMode, onStartSoloGame, onJoinWaitingRoom, isBanned, onOpenBanModal]);

  const handleCardClick = (mode: typeof modes[0]) => {
    soundFx.playKeyClick();
    onSelectMode(mode.id);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 animate-fadeIn">
      {/* Clean Mode Hub Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-amber-400" />
            <span>Chọn Chế Độ Thi Đấu</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Outplay Yourself: Chơi đơn (Solo) | 7 Chế độ còn lại: Thi đấu phòng chờ (Multiplayer 8 người)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px]">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold">1-8</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold">&larr;&rarr;&uarr;&darr;</kbd> Chọn
            <span className="text-slate-600">&bull;</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold">Enter</kbd> Vào chơi
          </span>
          <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 8 Chế độ hỗ trợ Telex / VNI
          </span>
        </div>
      </div>

      {/* Ban Warning Banner if active */}
      {isBanned && (
        <div
          id="banner-banco-ban"
          role="button"
          tabIndex={0}
          onClick={() => {
            soundFx.playKeyClick();
            if (onOpenBanModal) onOpenBanModal();
          }}
          className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-950 via-rose-950 to-red-900 border-2 border-red-500 text-slate-100 flex items-center justify-between gap-3 shadow-xl shadow-red-950/70 cursor-pointer animate-pulse hover:border-red-400 transition-all select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl animate-bounce">⚡</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-rose-300 uppercase tracking-wide">
                  Bàn Cổ Thần Thức Phong Ấn • Cấm Đấu 2 Giờ
                </span>
                <span className="text-xs font-mono font-black text-amber-300 px-2 py-0.5 rounded-full bg-black/50 border border-red-500/50">
                  {bannedRemainingFormatted || '02:00:00'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                Tài khoản đang bị giam cầm tại U Minh Hàn Ngục do nghi vấn gian lận/macro. Bấm để xem chi tiết án phạt.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shrink-0 cursor-pointer shadow-md"
          >
            Chi tiết
          </button>
        </div>
      )}

      {/* 8 Clean Game Mode Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {modes.map((mode) => {
          const isSelected = currentMode === mode.id;

          return (
            <div
              key={mode.id}
              id={`card-mode-${mode.id}`}
              onClick={() => handleCardClick(mode)}
              className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between cursor-pointer group bg-slate-900/70 hover:bg-slate-850/90 shadow-lg ${
                isSelected
                  ? `ring-2 ring-amber-400/60 border-amber-400/50 bg-gradient-to-br ${mode.color}`
                  : `border-slate-800 ${mode.accentColor}`
              }`}
            >
              {/* Card Top: Icon + Shortcut + Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/60 shadow-inner group-hover:scale-105 transition-transform">
                  {mode.icon}
                </div>

                <div className="flex items-center gap-1.5">
                  <kbd className={`text-[11px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                      : 'bg-slate-900/90 text-slate-400 border-slate-700/80 group-hover:border-amber-400/50 group-hover:text-amber-300'
                  }`}>
                    {mode.keyShortcut}
                  </kbd>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${mode.badgeColor}`}>
                    {mode.tag}
                  </span>
                </div>
              </div>

              {/* Card Middle: Title & 1-line Subtitle */}
              <div className="space-y-1 mb-4 flex-1">
                <h3 className="font-black text-sm text-white group-hover:text-amber-300 transition-colors">
                  {mode.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {mode.subtext}
                </p>
              </div>

              {/* Card Bottom: Direct Action Button */}
              <div>
                {mode.isSolo ? (
                  <button
                    id={`btn-start-${mode.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isBanned) {
                        soundFx.playKeyClick();
                        if (onOpenBanModal) onOpenBanModal();
                        return;
                      }
                      onSelectMode(mode.id);
                      soundFx.playCountdown(true);
                      onStartSoloGame(mode.id);
                    }}
                    className={`w-full h-10 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98 cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-950 shadow-cyan-500/25 ring-2 ring-cyan-300/80'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-cyan-500/20'
                    }`}
                    title="Bắt đầu Solo (Nhấn Enter)"
                  >
                    <Play className="w-3.5 h-3.5 fill-black shrink-0" />
                    <span>BẮT ĐẦU SOLO</span>
                    <span className="font-mono text-xs font-black shrink-0 opacity-80" aria-label="Enter">↵</span>
                  </button>
                ) : (
                  <button
                    id={`btn-join-${mode.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isBanned) {
                        soundFx.playKeyClick();
                        if (onOpenBanModal) onOpenBanModal();
                        return;
                      }
                      onSelectMode(mode.id);
                      onJoinWaitingRoom(mode.id);
                    }}
                    className={`w-full h-10 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98 cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-amber-500/25 ring-2 ring-amber-300/80'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/20'
                    }`}
                    title="Vào phòng chờ (Nhấn Enter)"
                  >
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>VÀO PHÒNG CHỜ</span>
                    <span className="font-mono text-xs font-black shrink-0 opacity-80" aria-label="Enter">↵</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

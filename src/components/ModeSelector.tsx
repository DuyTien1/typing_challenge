import React from 'react';
import { GameMode } from '../types';
import { soundFx } from '../utils/audio';
import { 
  Zap, 
  Search, 
  Skull, 
  Target, 
  Calculator, 
  Flag 
} from 'lucide-react';

interface ModeSelectorProps {
  currentMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  disabled?: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onSelectMode,
  disabled = false,
}) => {
  const modes = [
    {
      id: 'vi_dau' as GameMode,
      keyShortcut: '1',
      name: 'Tiếng Việt Có Dấu',
      subtext: 'Bộ từ vựng chuẩn & phức tạp',
      icon: <Flag className="w-4 h-4 text-rose-400" />,
      tag: 'Multiplayer',
      color: 'from-rose-500/20 to-red-600/10 border-rose-500/40 text-rose-300',
    },
    {
      id: 'vi_nodau' as GameMode,
      keyShortcut: '2',
      name: 'Tiếng Việt Không Dấu',
      subtext: 'Luyện gõ lướt phím tốc độ cao',
      icon: <span className="text-sm font-bold text-amber-400">VD</span>,
      tag: 'Multiplayer',
      color: 'from-amber-500/20 to-yellow-600/10 border-amber-500/40 text-amber-300',
    },
    {
      id: 'en' as GameMode,
      keyShortcut: '3',
      name: 'Tiếng Anh (English)',
      subtext: 'Oxford 3000 từ thông dụng',
      icon: <span className="text-sm font-bold text-sky-400">EN</span>,
      tag: 'Multiplayer',
      color: 'from-sky-500/20 to-blue-600/10 border-sky-500/40 text-sky-300',
    },
    {
      id: 'numpad' as GameMode,
      keyShortcut: '4',
      name: 'Bàn Phím Số (Numpad)',
      subtext: 'Fullsize & Chuỗi số tính tiền',
      icon: <Calculator className="w-4 h-4 text-emerald-400" />,
      tag: 'Multiplayer',
      color: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/40 text-emerald-300',
    },
    {
      id: 'ngau_hung' as GameMode,
      keyShortcut: '5',
      name: 'Ngẫu Hứng (Rush)',
      subtext: 'Đua 1 từ chớp nhoáng theo vòng',
      icon: <Zap className="w-4 h-4 text-yellow-400" />,
      tag: 'Multiplayer',
      color: 'from-yellow-500/20 to-amber-600/10 border-yellow-500/40 text-yellow-300',
    },
    {
      id: 'doan_chu' as GameMode,
      keyShortcut: '6',
      name: 'Đoán Chữ (Mystery)',
      subtext: 'Mở ký tự, gợi ý & đoán từ',
      icon: <Search className="w-4 h-4 text-purple-400" />,
      tag: 'Multiplayer',
      color: 'from-purple-500/20 to-indigo-600/10 border-purple-500/40 text-purple-300',
    },
    {
      id: 'san_boss' as GameMode,
      keyShortcut: '7',
      name: 'Săn Boss (Raid)',
      subtext: 'Hắc Long Ma Vương & Phá Giáp',
      icon: <Skull className="w-4 h-4 text-red-500 animate-pulse" />,
      tag: 'Multiplayer Co-op',
      color: 'from-red-600/30 to-rose-900/20 border-red-500/50 text-red-300',
    },
    {
      id: 'outplay' as GameMode,
      keyShortcut: '8',
      name: 'Outplay Yourself',
      subtext: 'Luyện tập cá nhân vượt kỷ lục',
      icon: <Target className="w-4 h-4 text-cyan-400" />,
      tag: 'Solo Độc Quyền',
      color: 'from-cyan-500/20 to-blue-600/10 border-cyan-500/40 text-cyan-300',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <span>Chọn Chế Độ Thi Đấu</span>
          <span className="text-[11px] text-amber-400/90 font-mono hidden sm:inline">(Phím 1-8)</span>
        </h2>
        <span className="text-xs text-slate-500">Outplay: Solo | Các chế độ khác: Multiplayer</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5">
        {modes.map((mode) => {
          const isSelected = currentMode === mode.id;
          return (
            <button
              id={`btn-mode-${mode.id}`}
              type="button"
              key={mode.id}
              disabled={disabled}
              onClick={() => {
                soundFx.playKeyClick();
                onSelectMode(mode.id);
              }}
              className={`text-left p-3 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between group ${
                isSelected
                  ? `bg-gradient-to-br ${mode.color} shadow-lg shadow-black/40 ring-2 ring-amber-400/60 scale-101`
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-98'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
                  {mode.icon}
                </div>
                <div className="flex items-center gap-1">
                  <kbd className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                      : 'bg-slate-800/90 text-slate-400 border-slate-700 group-hover:text-slate-200'
                  }`}>
                    {mode.keyShortcut}
                  </kbd>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {mode.tag}
                  </span>
                </div>
              </div>

              <div>
                <h3 className={`font-bold text-xs sm:text-sm tracking-tight ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                  {mode.name}
                </h3>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                  {mode.subtext}
                </p>
              </div>

              {isSelected && (
                <div className="absolute top-0 right-0 w-2 h-2 rounded-bl bg-amber-400 shadow-sm" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Palette, 
  Type, 
  Volume2, 
  Sparkles, 
  ChevronDown 
} from 'lucide-react';
import { soundFx, SwitchType } from '../utils/audio';
import { 
  MONKEY_THEMES, 
  TYPING_FONTS, 
  applyThemeAndFont, 
  getStoredTheme, 
  getStoredFont 
} from '../utils/themeAndFont';

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SWITCHES: { id: SwitchType; name: string; desc: string; icon: string }[] = [
  { id: 'cherry_blue', name: 'Cherry Blue', desc: 'Clicky, đanh giòn sắc bén (1800Hz)', icon: '🟦' },
  { id: 'cherry_brown', name: 'Cherry Brown', desc: 'Tactile, khấc êm đầm ấm (850Hz)', icon: '🟫' },
  { id: 'cherry_red', name: 'Cherry Red', desc: 'Linear, mượt mà lướt êm (480Hz)', icon: '🟥' },
  { id: 'thock', name: 'Deep Thock', desc: 'Trầm ấm, âm trầm hộp phím sâu (340Hz)', icon: '⬛' },
];

export const AppearanceModal: React.FC<AppearanceModalProps> = ({ isOpen, onClose }) => {
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => getStoredTheme());
  const [selectedFontId, setSelectedFontId] = useState<string>(() => getStoredFont());
  const [currentSwitch, setCurrentSwitch] = useState<SwitchType>(() => soundFx.getSwitchType());
  const [isThemeOpen, setIsThemeOpen] = useState<boolean>(false);
  const [isFontOpen, setIsFontOpen] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedTheme = MONKEY_THEMES.find((t) => t.id === selectedThemeId) || MONKEY_THEMES[0];
  const selectedFont = TYPING_FONTS.find((f) => f.id === selectedFontId) || TYPING_FONTS[0];

  const handleSelectTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    setIsThemeOpen(false);
    applyThemeAndFont(themeId, selectedFontId);
    soundFx.playKeyClick();
  };

  const handleSelectFont = (fontId: string) => {
    setSelectedFontId(fontId);
    setIsFontOpen(false);
    applyThemeAndFont(selectedThemeId, fontId);
    soundFx.playKeyClick();
  };

  const handleSelectSwitch = (switchId: SwitchType) => {
    setCurrentSwitch(switchId);
    soundFx.setSwitchType(switchId);
    soundFx.playKeyClick();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    applyThemeAndFont(selectedThemeId, selectedFontId);
    soundFx.setSwitchType(currentSwitch);
    soundFx.playSuccess();
    setSaveToast('Đã lưu tùy chỉnh giao diện và âm phím thành công!');
    setTimeout(() => {
      setSaveToast(null);
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundFx.playKeyClick();
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[92vh] overflow-y-auto animate-scaleUp text-left ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Tùy Chỉnh Giao Diện</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Monkeytype Pro
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                20 bảng màu chủ đề, 20 font chữ chuẩn Monkeytype & 4 loại âm switch phím cơ
              </p>
            </div>
          </div>
          <button
            id="btn-close-appearance"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between gap-4 shadow-inner">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" /> Trải Nghiệm Gõ Phím Hiện Tại
            </span>
            <div className="text-sm font-bold text-white flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedTheme.main }} />
              <span className="truncate">{selectedTheme.name}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 font-mono text-xs truncate" style={{ fontFamily: selectedFont.family }}>
                {selectedFont.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {selectedTheme.desc} • {selectedFont.type === 'monospace' ? 'Font Monospace' : 'Font Sans-Serif'}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 p-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: selectedTheme.bg }} />
            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: selectedTheme.main }} />
            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: selectedTheme.sub }} />
          </div>
        </div>

        {/* Customization Controls */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* 1. Theme Dropdown (20 Themes) */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> Giao Diện Màu (20 Themes)
              </label>

              <button
                id="dropdown-theme-toggle"
                type="button"
                onClick={() => {
                  setIsThemeOpen(!isThemeOpen);
                  setIsFontOpen(false);
                  soundFx.playKeyClick();
                }}
                className="w-full h-[54px] px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-amber-400/70 text-left flex items-center justify-between transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center gap-1 shrink-0 p-1 rounded bg-slate-900 border border-slate-800">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedTheme.bg }} />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedTheme.main }} />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedTheme.sub }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{selectedTheme.name}</div>
                    <div className="text-[10px] text-slate-400 truncate font-mono">Bảng màu Monkeytype</div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isThemeOpen ? 'rotate-180 text-amber-400' : ''}`} />
              </button>

              {/* Theme Menu Options */}
              {isThemeOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 p-2 rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl max-h-64 overflow-y-auto space-y-1 ring-1 ring-white/10">
                  {MONKEY_THEMES.map((theme) => {
                    const isCurrent = theme.id === selectedThemeId;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleSelectTheme(theme.id)}
                        className={`w-full p-2 rounded-xl text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-500/20 border border-amber-400/80 text-amber-300'
                            : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex items-center gap-0.5 p-0.5 rounded bg-slate-900 shrink-0">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.bg }} />
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.main }} />
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.sub }} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">{theme.name}</div>
                            <div className="text-[10px] text-slate-500 truncate">{theme.desc}</div>
                          </div>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Font Dropdown (20 Fonts) */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" /> Font Chữ Gõ (20 Fonts)
              </label>

              <button
                id="dropdown-font-toggle"
                type="button"
                onClick={() => {
                  setIsFontOpen(!isFontOpen);
                  setIsThemeOpen(false);
                  soundFx.playKeyClick();
                }}
                className="w-full h-[54px] px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-sky-400/70 text-left flex items-center justify-between transition-all cursor-pointer shadow-sm"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate" style={{ fontFamily: selectedFont.family }}>
                    {selectedFont.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate font-mono">
                    {selectedFont.type === 'monospace' ? 'Monospace (Chuẩn)' : 'Sans-Serif'}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isFontOpen ? 'rotate-180 text-sky-400' : ''}`} />
              </button>

              {/* Font Menu Options */}
              {isFontOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 p-2 rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl max-h-64 overflow-y-auto space-y-1 ring-1 ring-white/10">
                  {TYPING_FONTS.map((font) => {
                    const isCurrent = font.id === selectedFontId;
                    return (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => handleSelectFont(font.id)}
                        className={`w-full p-2 rounded-xl text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-sky-500/20 border border-sky-400/80 text-sky-300'
                            : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate" style={{ fontFamily: font.family }}>
                            {font.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate opacity-80" style={{ fontFamily: font.family }}>
                            {font.sample}
                          </div>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Switch Sound Selection (Mechanical Keyboard Audio Synth) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Volume2 className="w-3.5 h-3.5" /> Âm Thanh Phím Cơ (Web Audio Synth)
              </span>
              <span className="text-[10px] text-slate-500 font-normal">Bấm thử để nghe âm trực tiếp</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SWITCHES.map((sw) => {
                const isSelected = currentSwitch === sw.id;
                return (
                  <button
                    id={`btn-switch-${sw.id}`}
                    key={sw.id}
                    type="button"
                    onClick={() => handleSelectSwitch(sw.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{sw.icon}</span> {sw.name}
                      </span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">{sw.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {saveToast && (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-bold text-center animate-fadeIn">
              {saveToast}
            </div>
          )}

          <button
            id="btn-save-appearance-modal"
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 hover:scale-101 active:scale-98 transition-all cursor-pointer"
          >
            Lưu Thiết Lập Giao Diện
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
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
  { id: 'topre', name: 'Topre Electro-Capacitive', desc: 'Thock trầm ấm êm dịu, đệm điện dung nảy nhẹ (260Hz)', icon: '🟪' },
  { id: 'truc_tien', name: 'Trúc Tiên Đạo', desc: 'Mộc phím trúc thanh tao tiên hiệp, âm mộc gõ đầm ấm (620Hz)', icon: '🎋' },
];

export const AppearanceModal: React.FC<AppearanceModalProps> = ({ isOpen, onClose }) => {
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => getStoredTheme());
  const [selectedFontId, setSelectedFontId] = useState<string>(() => getStoredFont());
  const [currentSwitch, setCurrentSwitch] = useState<SwitchType>(() => soundFx.getSwitchType());
  const [isThemeOpen, setIsThemeOpen] = useState<boolean>(false);
  const [isFontOpen, setIsFontOpen] = useState<boolean>(false);
  const [themeFilter, setThemeFilter] = useState<'all' | 'light' | 'dark' | 'colorful'>('all');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Esc key listener: closes dropdowns first, or modal if no dropdown is open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      soundFx.playKeyClick();
      if (isThemeOpen) {
        setIsThemeOpen(false);
      } else if (isFontOpen) {
        setIsFontOpen(false);
      } else {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isThemeOpen, isFontOpen, onClose]);

  if (!isOpen) return null;

  const selectedTheme = MONKEY_THEMES.find((t) => t.id === selectedThemeId) || MONKEY_THEMES[0];
  const selectedFont = TYPING_FONTS.find((f) => f.id === selectedFontId) || TYPING_FONTS[0];

  const lightThemesCount = MONKEY_THEMES.filter((t) => t.category === 'light').length;
  const darkThemesCount = MONKEY_THEMES.filter((t) => t.category === 'dark').length;
  const colorfulThemesCount = MONKEY_THEMES.filter((t) => t.category === 'colorful').length;

  const filteredThemes = MONKEY_THEMES.filter((t) => {
    if (themeFilter === 'all') return true;
    return t.category === themeFilter;
  });

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
                {MONKEY_THEMES.length} bảng màu chủ đề (bao gồm {lightThemesCount} theme nền trắng tinh khôi), 20 font chữ chuẩn Monkeytype & 4 loại âm switch phím cơ
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
            title="Đóng (Esc)"
          >
            <kbd className="hidden sm:inline text-[10px] font-mono font-semibold px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
              Esc
            </kbd>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Card */}
        <div 
          className="p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner"
          style={{
            backgroundColor: selectedTheme.cardBg,
            borderColor: selectedTheme.border,
            color: selectedTheme.text,
          }}
        >
          <div className="space-y-1 min-w-0">
            <span 
              className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5"
              style={{ color: selectedTheme.main }}
            >
              <Sparkles className="w-3 h-3" /> Trải Nghiệm Gõ Phím Trực Quan
            </span>
            <div className="text-sm font-bold flex items-center gap-2 truncate" style={{ color: selectedTheme.text }}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20" style={{ backgroundColor: selectedTheme.main }} />
              <span className="truncate">{selectedTheme.name}</span>
              <span className="opacity-40">•</span>
              <span className="font-mono text-xs truncate opacity-90" style={{ fontFamily: selectedFont.family }}>
                {selectedFont.name}
              </span>
            </div>
            <div 
              className="text-xs pt-1 truncate font-medium"
              style={{ fontFamily: selectedFont.family }}
            >
              <span style={{ color: selectedTheme.text, fontWeight: 'bold' }}>The quick brown </span>
              <span className="border-r-2 animate-pulse pr-0.5" style={{ borderColor: selectedTheme.main, color: selectedTheme.main, fontWeight: 'bold' }}>fox</span>
              <span style={{ color: selectedTheme.sub }}> jumps over the lazy dog</span>
            </div>
          </div>
          <div 
            className="flex items-center gap-1.5 shrink-0 p-1.5 rounded-xl border shadow-sm self-start sm:self-auto"
            style={{ backgroundColor: selectedTheme.bg, borderColor: selectedTheme.border }}
          >
            <span className="w-4 h-4 rounded-full border border-black/20 shadow-sm" title={`Nền: ${selectedTheme.bg}`} style={{ backgroundColor: selectedTheme.bg }} />
            <span className="w-4 h-4 rounded-full border border-black/20 shadow-sm" title={`Màu chính: ${selectedTheme.main}`} style={{ backgroundColor: selectedTheme.main }} />
            <span className="w-4 h-4 rounded-full border border-black/20 shadow-sm" title={`Màu phụ: ${selectedTheme.sub}`} style={{ backgroundColor: selectedTheme.sub }} />
          </div>
        </div>

        {/* Customization Controls */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* 1. Theme Dropdown */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" /> Giao Diện Màu ({MONKEY_THEMES.length} Themes)
                </span>
                <span className="text-[10px] text-amber-300 font-semibold lowercase">
                  {lightThemesCount} nền trắng
                </span>
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
                    <span className="w-3 h-3 rounded-full border border-slate-700" style={{ backgroundColor: selectedTheme.bg }} />
                    <span className="w-3 h-3 rounded-full border border-slate-700" style={{ backgroundColor: selectedTheme.main }} />
                    <span className="w-3 h-3 rounded-full border border-slate-700" style={{ backgroundColor: selectedTheme.sub }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span>{selectedTheme.name}</span>
                      {selectedTheme.category === 'light' && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold shrink-0">
                          Nền Trắng
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate font-mono">{selectedTheme.desc}</div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isThemeOpen ? 'rotate-180 text-amber-400' : ''}`} />
              </button>

              {/* Theme Menu Options */}
              {isThemeOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 p-2.5 rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl max-h-72 overflow-y-auto space-y-2 ring-1 ring-white/10">
                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 overflow-x-auto text-[11px] font-semibold sticky top-0 z-10 backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setThemeFilter('all');
                      }}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        themeFilter === 'all'
                          ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tất cả ({MONKEY_THEMES.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setThemeFilter('light');
                      }}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        themeFilter === 'light'
                          ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                          : 'text-amber-300 hover:text-amber-200'
                      }`}
                    >
                      <span>☀️</span> Nền Trắng ({lightThemesCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setThemeFilter('dark');
                      }}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        themeFilter === 'dark'
                          ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🌙</span> Nền Tối ({darkThemesCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setThemeFilter('colorful');
                      }}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        themeFilter === 'colorful'
                          ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🎨</span> Sắc Màu ({colorfulThemesCount})
                    </button>
                  </div>

                  {/* Theme List */}
                  <div className="space-y-1">
                    {filteredThemes.map((theme) => {
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
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex items-center gap-0.5 p-1 rounded bg-slate-900 border border-slate-800 shrink-0">
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-700" style={{ backgroundColor: theme.bg }} />
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-700" style={{ backgroundColor: theme.main }} />
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-700" style={{ backgroundColor: theme.sub }} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                <span>{theme.name}</span>
                                {theme.category === 'light' && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold shrink-0">
                                    Nền Trắng
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">{theme.desc}</div>
                            </div>
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
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

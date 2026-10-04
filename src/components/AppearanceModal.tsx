import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Palette, 
  Type, 
  Volume2, 
  Sparkles, 
  ChevronDown,
  Layers,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { soundFx, SwitchType } from '../utils/audio';
import { 
  UI_STYLES,
  UIStyleId,
  applyUIStyle,
  MONKEY_THEMES, 
  TYPING_FONTS, 
  applyThemeAndFont, 
  getStoredTheme, 
  getStoredFont 
} from '../utils/themeAndFont';

// Safe resolver for stored UI style across all build environments
const getInitialModalUIStyle = (): UIStyleId => {
  if (typeof window === 'undefined') return 'xianxia';
  try {
    const saved = localStorage.getItem('fasttyping_ui_style');
    if (saved && UI_STYLES.some((s) => s.id === saved)) {
      return saved as UIStyleId;
    }
    const savedTheme = localStorage.getItem('fasttyping_theme');
    if (savedTheme) {
      if (savedTheme === 'cyberpunk') return 'cyberpunk';
      if (savedTheme === 'retro' || savedTheme === 'classic') return 'classic';
      if (savedTheme === 'crimson' || savedTheme === 'abyss') return 'abyss';
      if (savedTheme === 'paper_white' || savedTheme === 'minimal_mono' || savedTheme === 'minimal') return 'minimal';
    }
  } catch {}
  return 'xianxia';
};

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SWITCHES: { id: SwitchType; name: string; desc: string; icon: string }[] = [
  { id: 'truc_tien', name: 'Trúc Tiên Đạo', desc: 'Mộc phím trúc thanh tao tiên hiệp, âm mộc gõ đầm ấm (620Hz)', icon: '🎋' },
  { id: 'cherry_blue', name: 'Cherry Blue', desc: 'Clicky, đanh giòn sắc bén cổ điển (1800Hz)', icon: '🟦' },
  { id: 'cherry_red', name: 'Cherry Red', desc: 'Linear, mượt mà lướt êm tốc độ ánh sáng (480Hz)', icon: '🟥' },
  { id: 'topre', name: 'Topre Electro-Capacitive', desc: 'Thock trầm ấm êm dịu, đệm điện dung nảy nhẹ (260Hz)', icon: '🟪' },
  { id: 'thock', name: 'Deep Thock', desc: 'Trầm ấm, âm trầm hộp phím sâu như sấm sét (340Hz)', icon: '⬛' },
  { id: 'cherry_brown', name: 'Cherry Brown', desc: 'Tactile, khấc êm đầm ấm (850Hz)', icon: '🟫' },
];

export const AppearanceModal: React.FC<AppearanceModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'styles' | 'advanced'>('styles');
  const [currentUIStyleId, setCurrentUIStyleId] = useState<UIStyleId>(() => getInitialModalUIStyle());
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => getStoredTheme());
  const [selectedFontId, setSelectedFontId] = useState<string>(() => getStoredFont());
  const [currentSwitch, setCurrentSwitch] = useState<SwitchType>(() => soundFx.getSwitchType());
  const [isThemeOpen, setIsThemeOpen] = useState<boolean>(false);
  const [isFontOpen, setIsFontOpen] = useState<boolean>(false);
  const [themeFilter, setThemeFilter] = useState<'all' | 'light' | 'dark' | 'colorful'>('all');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Sync state if style changed externally
  useEffect(() => {
    const handleStyleChange = (e: any) => {
      if (e.detail?.id) {
        setCurrentUIStyleId(e.detail.id);
        setSelectedThemeId(e.detail.id);
        setSelectedFontId(e.detail.fontId);
        setCurrentSwitch(e.detail.soundSwitch);
      }
    };
    window.addEventListener('ui_style_changed', handleStyleChange);
    return () => window.removeEventListener('ui_style_changed', handleStyleChange);
  }, []);

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

  const currentStyle = UI_STYLES.find((s) => s.id === currentUIStyleId) || UI_STYLES[0];
  const selectedTheme = MONKEY_THEMES.find((t) => t.id === selectedThemeId) || MONKEY_THEMES[0];
  const selectedFont = TYPING_FONTS.find((f) => f.id === selectedFontId) || TYPING_FONTS[0];

  const lightThemesCount = MONKEY_THEMES.filter((t) => t.category === 'light').length;
  const darkThemesCount = MONKEY_THEMES.filter((t) => t.category === 'dark').length;
  const colorfulThemesCount = MONKEY_THEMES.filter((t) => t.category === 'colorful').length;

  const filteredThemes = MONKEY_THEMES.filter((t) => {
    if (themeFilter === 'all') return true;
    return t.category === themeFilter;
  });

  const handleSelectStyle = (styleId: UIStyleId) => {
    setCurrentUIStyleId(styleId);
    setSelectedThemeId(styleId);
    const style = applyUIStyle(styleId, true);
    setSelectedFontId(style.fontId);
    setCurrentSwitch(style.soundSwitch);
    soundFx.playSuccess();
    setSaveToast(`Đã chuyển sang phong cách « ${style.name} »!`);
    setTimeout(() => setSaveToast(null), 2400);
  };

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

  const handleSaveAdvanced = (e: React.FormEvent) => {
    e.preventDefault();
    applyThemeAndFont(selectedThemeId, selectedFontId);
    soundFx.setSwitchType(currentSwitch);
    soundFx.playSuccess();
    setSaveToast('Đã lưu tùy chỉnh nâng cao thành công!');
    setTimeout(() => {
      setSaveToast(null);
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundFx.playKeyClick();
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl h-[90vh] max-h-[820px] min-h-[580px] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden animate-scaleUp text-left ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner text-xl">
              {currentStyle.icon}
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Phong Cách & Giao Diện</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  5 Bản Sắc
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Chuyển đổi tức thì 5 phong cách độc bản (Tiên Hiệp, Cổ Điển, Cyberpunk, Tối Giản, Hắc Ám)
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

        {/* Tab Switcher: 5 Styles vs Advanced Monkeytype */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner shrink-0 mt-3">
          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('styles');
            }}
            className={`flex-1 h-10 sm:h-11 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer select-none ${
              activeTab === 'styles'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 ring-1 ring-amber-300'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">5 Phong Cách Độc Bản</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('advanced');
            }}
            className={`flex-1 h-10 sm:h-11 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer select-none ${
              activeTab === 'advanced'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 ring-1 ring-amber-300'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Tùy Chỉnh Nâng Cao</span>
          </button>
        </div>

        {/* Toast Notification */}
        {saveToast && (
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn shadow-sm shrink-0 mt-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{saveToast}</span>
          </div>
        )}

        {/* Tab Body - Fixed height with smooth internal scrolling */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 mt-3 space-y-4">

        {/* TAB 1: 5 DISTINCT UI STYLES */}
        {activeTab === 'styles' && (
          <div className="space-y-3.5 pt-1">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Bấm vào bất kỳ phong cách nào để kích hoạt ngay lập tức toàn bộ màu sắc, phông chữ và âm phím tương thích:</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {UI_STYLES.map((style) => {
                const isSelected = style.id === currentUIStyleId;
                return (
                  <div
                    key={style.id}
                    onClick={() => handleSelectStyle(style.id)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden group select-none ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-xl'
                        : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/60 hover:bg-slate-950'
                    }`}
                    style={{
                      backgroundColor: isSelected ? style.cardBg : undefined,
                    }}
                  >
                    {/* Top Row: Title, Tag & Selection Indicator */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl p-1.5 rounded-xl bg-black/30 border border-white/10 shrink-0 group-hover:scale-110 transition-transform">
                          {style.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-sm text-white tracking-tight">
                              {style.name}
                            </h3>
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider"
                              style={{ 
                                backgroundColor: `${style.main}22`,
                                borderColor: `${style.main}55`,
                                color: style.main,
                              }}
                            >
                              {style.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {style.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isSelected ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black flex items-center gap-1 shadow-sm">
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> Đang Dùng
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 group-hover:text-white border border-slate-700 text-[11px] font-bold transition-colors"
                          >
                            Chọn Giao Diện
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed opacity-90">
                      {style.desc}
                    </p>

                    {/* Live Style Typographic & Color Preview */}
                    <div 
                      className="mt-2.5 p-2.5 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-inner"
                      style={{
                        backgroundColor: style.cardBg,
                        borderColor: style.border,
                        color: style.text,
                        fontFamily: style.fontFamily,
                      }}
                    >
                      <div className="min-w-0 truncate">
                        <span style={{ color: style.main, fontWeight: 'bold' }}>The quick brown </span>
                        <span className="border-r-2 animate-pulse pr-0.5" style={{ borderColor: style.main, color: style.main, fontWeight: 'bold' }}>fox</span>
                        <span style={{ color: style.sub }}> jumps over the lazy dog</span>
                      </div>

                      {/* Specs Badge */}
                      <div className="flex items-center gap-2 shrink-0 text-[10px] opacity-80 font-sans">
                        <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                          {style.fontName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                          {style.switchName}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Specs & Color Swatches */}
                    <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>Bảng màu:</span>
                        <div className="flex items-center gap-1">
                          <span className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs" title={`Nền: ${style.bg}`} style={{ backgroundColor: style.bg }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs" title={`Thẻ: ${style.cardBg}`} style={{ backgroundColor: style.cardBg }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs" title={`Accent: ${style.main}`} style={{ backgroundColor: style.main }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs" title={`Viền: ${style.border}`} style={{ backgroundColor: style.border }} />
                        </div>
                      </div>

                      <div className="text-[10px] font-mono text-slate-400">
                        Bo góc: <span className="text-slate-300 font-bold">{style.borderRadius}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ADVANCED CUSTOMIZATION (MONKEYTYPE PALETTES & FONTS) */}
        {activeTab === 'advanced' && (
          <form onSubmit={handleSaveAdvanced} className="space-y-4 pt-1">
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
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex items-center gap-0.5 shrink-0">
                                <span className="w-2.5 h-2.5 rounded-full border border-black/30" style={{ backgroundColor: theme.bg }} />
                                <span className="w-2.5 h-2.5 rounded-full border border-black/30" style={{ backgroundColor: theme.main }} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate flex items-center gap-1">
                                  <span>{theme.name}</span>
                                  {theme.category === 'light' && (
                                    <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      Sáng
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">{theme.desc}</div>
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

              {/* 2. Font Dropdown */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" /> Phông Chữ Gõ ({TYPING_FONTS.length} Fonts)
                </label>

                <button
                  id="dropdown-font-toggle"
                  type="button"
                  onClick={() => {
                    setIsFontOpen(!isFontOpen);
                    setIsThemeOpen(false);
                    soundFx.playKeyClick();
                  }}
                  className="w-full h-[54px] px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-amber-400/70 text-left flex items-center justify-between transition-all cursor-pointer shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span style={{ fontFamily: selectedFont.family }}>{selectedFont.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {selectedFont.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate font-mono">{selectedFont.desc}</div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isFontOpen ? 'rotate-180 text-amber-400' : ''}`} />
                </button>

                {/* Font Menu Options */}
                {isFontOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 p-2 rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl max-h-72 overflow-y-auto space-y-1 ring-1 ring-white/10">
                    {TYPING_FONTS.map((font) => {
                      const isCurrent = font.id === selectedFontId;
                      return (
                        <button
                          key={font.id}
                          type="button"
                          onClick={() => handleSelectFont(font.id)}
                          className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-amber-500/20 border border-amber-400/80 text-amber-300'
                              : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold flex items-center gap-1.5 truncate">
                              <span style={{ fontFamily: font.family }}>{font.name}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                {font.type}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{font.desc}</div>
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Switch Keyboard Sound Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Âm Thanh Switch Phím Cơ
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SWITCHES.map((sw) => {
                  const isCurrent = sw.id === currentSwitch;
                  return (
                    <button
                      key={sw.id}
                      type="button"
                      onClick={() => handleSelectSwitch(sw.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${
                        isCurrent
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                          : 'bg-slate-950 border-slate-700/80 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-base shrink-0">{sw.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{sw.name}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{sw.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer transition-colors"
              >
                Đóng
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all active:scale-95"
              >
                Lưu Tùy Chỉnh
              </button>
            </div>
          </form>
        )}
        </div>
      </div>
    </div>
  );
};

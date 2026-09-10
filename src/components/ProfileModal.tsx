import React, { useState } from 'react';
import { soundFx, SwitchType } from '../utils/audio';
import { 
  User, 
  X, 
  Check, 
  Flame, 
  Zap, 
  Volume2, 
  Palette, 
  Type, 
  Sparkles, 
  ChevronDown 
} from 'lucide-react';
import { 
  MONKEY_THEMES, 
  TYPING_FONTS, 
  EXPANDED_AVATARS, 
  applyThemeAndFont, 
  getStoredTheme, 
  getStoredFont 
} from '../utils/themeAndFont';

interface ProfileModalProps {
  username: string;
  avatar: string;
  bestWpm: number;
  totalGames: number;
  onChangeUsername: (name: string) => void;
  onChangeAvatar: (emoji: string) => void;
  onClose: () => void;
}

const SWITCHES: { id: SwitchType; name: string; desc: string; icon: string }[] = [
  { id: 'cherry_blue', name: 'Cherry Blue', desc: 'Clicky, đanh giòn sắc bén (1800Hz)', icon: '🟦' },
  { id: 'cherry_brown', name: 'Cherry Brown', desc: 'Tactile, khấc êm đầm ấm (850Hz)', icon: '🟫' },
  { id: 'cherry_red', name: 'Cherry Red', desc: 'Linear, mượt mà lướt êm (480Hz)', icon: '🟥' },
  { id: 'thock', name: 'Deep Thock', desc: 'Trầm ấm, âm trầm hộp phím sâu (340Hz)', icon: '⬛' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  username,
  avatar,
  bestWpm,
  totalGames,
  onChangeUsername,
  onChangeAvatar,
  onClose,
}) => {
  const [nameInput, setNameInput] = useState(username);
  const [selectedAvatar, setSelectedAvatar] = useState(avatar);
  const [activeAvatarCategory, setActiveAvatarCategory] = useState(0);
  const [currentSwitch, setCurrentSwitch] = useState<SwitchType>(() => soundFx.getSwitchType());

  // Monkeytype Theme & Font State
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => getStoredTheme());
  const [selectedFontId, setSelectedFontId] = useState<string>(() => getStoredFont());
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isFontOpen, setIsFontOpen] = useState(false);

  const selectedTheme = MONKEY_THEMES.find((t) => t.id === selectedThemeId) || MONKEY_THEMES[0];
  const selectedFont = TYPING_FONTS.find((f) => f.id === selectedFontId) || TYPING_FONTS[0];

  const handleSelectSwitch = (sw: SwitchType) => {
    setCurrentSwitch(sw);
    soundFx.setSwitchType(sw);
  };

  const handleSelectTheme = (themeId: string) => {
    soundFx.playKeyClick();
    setSelectedThemeId(themeId);
    applyThemeAndFont(themeId, selectedFontId);
    setIsThemeOpen(false);
  };

  const handleSelectFont = (fontId: string) => {
    soundFx.playKeyClick();
    setSelectedFontId(fontId);
    applyThemeAndFont(selectedThemeId, fontId);
    setIsFontOpen(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onChangeUsername(nameInput.trim());
      onChangeAvatar(selectedAvatar);
      soundFx.setSwitchType(currentSwitch);
      applyThemeAndFont(selectedThemeId, selectedFontId);
      soundFx.playVictory();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">HỒ SƠ CÁ NHÂN & GIAO DIỆN MONKEYTYPE</h3>
              <p className="text-xs text-slate-400">Tùy biến 20 giao diện màu, 20 font chữ và 48+ ảnh đại diện</p>
            </div>
          </div>
          <button
            id="btn-close-profile"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Career Stats Overview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Kỷ lục WPM
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
              {bestWpm} <span className="text-xs text-slate-400 font-normal">WPM</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
              <Zap className="w-3.5 h-3.5 text-sky-400" /> Trận Đã Đấu
            </div>
            <div className="text-2xl font-black text-sky-400 font-mono mt-0.5">
              {totalGames} <span className="text-xs text-slate-400 font-normal">trận</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Biệt Danh (Username)
            </label>
            <input
              id="input-profile-username"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={20}
              placeholder="Nhập tên của bạn..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold text-sm outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {/* MONKEYTYPE THEME & FONT DROPDOWNS */}
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
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-amber-400/70 text-left flex items-center justify-between transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center gap-1 shrink-0 p-1 rounded bg-slate-900 border border-slate-800">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedTheme.bg }} />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedTheme.main }} />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedTheme.sub }} />
                  </div>
                  <span className="text-xs font-bold text-white truncate">{selectedTheme.name}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isThemeOpen ? 'rotate-180 text-amber-400' : ''}`} />
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
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-sky-400/70 text-left flex items-center justify-between transition-all cursor-pointer shadow-sm"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate" style={{ fontFamily: selectedFont.family }}>
                    {selectedFont.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate font-mono">
                    {selectedFont.type === 'monospace' ? 'Monospace (Chuẩn)' : 'Sans-Serif'}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isFontOpen ? 'rotate-180 text-sky-400' : ''}`} />
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
              <span className="text-[10px] text-slate-500 font-normal">Bấm thử để nghe âm</span>
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

          {/* 48+ AVATARS WITH CATEGORY TABS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Biểu Tượng Đại Diện ({EXPANDED_AVATARS.reduce((acc, c) => acc + c.icons.length, 0)}+ Avatars)</span>
              </label>
              <div className="text-xs text-amber-400 font-mono font-bold flex items-center gap-1">
                <span>Đang chọn:</span>
                <span className="text-lg leading-none">{selectedAvatar}</span>
              </div>
            </div>

            {/* Category Selector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {EXPANDED_AVATARS.map((cat, idx) => {
                const isActive = activeAvatarCategory === idx;
                return (
                  <button
                    key={cat.category}
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setActiveAvatarCategory(idx);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-black shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat.category}
                  </button>
                );
              })}
            </div>

            {/* Avatars Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 max-h-48 overflow-y-auto">
              {EXPANDED_AVATARS[activeAvatarCategory].icons.map((emoji) => (
                <button
                  id={`btn-profile-avatar-${emoji}`}
                  type="button"
                  key={emoji}
                  onClick={() => {
                    setSelectedAvatar(emoji);
                    soundFx.playKeyClick();
                  }}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl transition-all cursor-pointer ${
                    selectedAvatar === emoji
                      ? 'bg-amber-500/25 border-2 border-amber-400 ring-2 ring-amber-400/50 scale-110 shadow-lg'
                      : 'hover:bg-slate-800 border border-transparent hover:scale-105'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <button
            id="btn-save-profile"
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 hover:scale-101 active:scale-98 transition-all cursor-pointer"
          >
            Lưu Hồ Sơ & Áp Dụng Toàn Hệ Thống
          </button>
        </form>
      </div>
    </div>
  );
};

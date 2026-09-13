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
  ChevronDown,
  Edit3,
  Award,
  Lock
} from 'lucide-react';
import { 
  MONKEY_THEMES, 
  TYPING_FONTS, 
  EXPANDED_AVATARS, 
  applyThemeAndFont, 
  getStoredTheme, 
  getStoredFont 
} from '../utils/themeAndFont';
import { 
  AvatarWithFrame, 
  AVATAR_FRAMES, 
  getFrameConfig, 
  getStoredFrame, 
  setStoredFrame,
  isFrameOwned,
  checkIsAdmin
} from '../utils/frames';

interface ProfileModalProps {
  username: string;
  avatar: string;
  frame?: string;
  bestWpm: number;
  totalGames: number;
  isAdmin?: boolean;
  onChangeUsername: (name: string) => void;
  onChangeAvatar: (emoji: string) => void;
  onChangeFrame?: (frameId: string) => void;
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
  frame,
  bestWpm,
  totalGames,
  isAdmin = false,
  onChangeUsername,
  onChangeAvatar,
  onChangeFrame,
  onClose,
}) => {
  const [nameInput, setNameInput] = useState(username);
  const [selectedAvatar, setSelectedAvatar] = useState(avatar);
  const [selectedFrame, setSelectedFrame] = useState<string>(() => frame || getStoredFrame());

  // Popups state
  const [isAvatarFrameModalOpen, setIsAvatarFrameModalOpen] = useState(false);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);

  // Temporary state for Avatar & Frame selection popup
  const [tempAvatar, setTempAvatar] = useState(selectedAvatar);
  const [tempFrame, setTempFrame] = useState(selectedFrame);
  const [avatarFrameTab, setAvatarFrameTab] = useState<'avatar' | 'frame'>('avatar');
  const [activeAvatarCategory, setActiveAvatarCategory] = useState(0);
  const [lockedFrameTip, setLockedFrameTip] = useState<string | null>(null);

  // Temporary state for Edit Name popup
  const [tempName, setTempName] = useState(nameInput);
  const [nameError, setNameError] = useState('');

  const [currentSwitch, setCurrentSwitch] = useState<SwitchType>(() => soundFx.getSwitchType());

  // Monkeytype Theme & Font State
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => getStoredTheme());
  const [selectedFontId, setSelectedFontId] = useState<string>(() => getStoredFont());
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isFontOpen, setIsFontOpen] = useState(false);

  const selectedTheme = MONKEY_THEMES.find((t) => t.id === selectedThemeId) || MONKEY_THEMES[0];
  const selectedFont = TYPING_FONTS.find((f) => f.id === selectedFontId) || TYPING_FONTS[0];
  const currentFrameConfig = getFrameConfig(selectedFrame);
  const tempFrameConfig = getFrameConfig(tempFrame);

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

  // Confirm Name Change from Popup
  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tempName.trim();
    if (!trimmed) {
      setNameError('Vui lòng nhập biệt danh của bạn!');
      return;
    }
    setNameError('');
    setNameInput(trimmed);
    onChangeUsername(trimmed);
    soundFx.playKeyClick();
    setIsEditNameOpen(false);
  };

  // Confirm Avatar & Frame from Popup
  const handleSaveAvatarFrame = () => {
    setSelectedAvatar(tempAvatar);
    setSelectedFrame(tempFrame);
    onChangeAvatar(tempAvatar);
    if (onChangeFrame) {
      onChangeFrame(tempFrame);
    }
    setStoredFrame(tempFrame);
    soundFx.playVictory();
    setIsAvatarFrameModalOpen(false);
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onChangeUsername(nameInput.trim());
      onChangeAvatar(selectedAvatar);
      if (onChangeFrame) {
        onChangeFrame(selectedFrame);
      }
      setStoredFrame(selectedFrame);
      soundFx.setSwitchType(currentSwitch);
      applyThemeAndFont(selectedThemeId, selectedFontId);
      soundFx.playVictory();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">HỒ SƠ CÁ NHÂN & THIẾT LẬP HỆ THỐNG</h3>
              <p className="text-xs text-slate-400">Tùy biến avatar, khung hào quang, giao diện Monkeytype và âm thanh</p>
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

        {/* 1. TOP IDENTITY CARD: AVATAR + KHUNG NGANG HÀNG VỚI TÊN NGƯỜI CHƠI */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between gap-4 shadow-inner">
          <div className="flex items-center gap-4 min-w-0">
            {/* Clickable Avatar with Frame */}
            <button
              id="btn-profile-avatar-trigger"
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setTempAvatar(selectedAvatar);
                setTempFrame(selectedFrame);
                setAvatarFrameTab('avatar');
                setLockedFrameTip(null);
                setIsAvatarFrameModalOpen(true);
              }}
              className="relative group p-1 rounded-2xl cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              title="Nhấn vào avatar để tùy chỉnh Avatar và Khung đại diện"
            >
              <AvatarWithFrame
                icon={selectedAvatar}
                frameId={selectedFrame}
                size="xl"
              />
            </button>

            {/* Username with Edit Icon & Frame Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight truncate max-w-[200px] sm:max-w-[260px]">
                  {nameInput}
                </span>
                <button
                  id="btn-open-edit-name"
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setTempName(nameInput);
                    setNameError('');
                    setIsEditNameOpen(true);
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 hover:border-amber-400/60 transition-all cursor-pointer shadow-sm shrink-0"
                  title="Nhấn để đổi tên người chơi"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              {/* Current Frame Details & Quick Hint */}
              <div className="mt-1.5 flex items-center gap-2 text-xs flex-wrap">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  Khung: <b className="text-slate-200">{currentFrameConfig.name}</b>
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300 font-mono">
                  {currentFrameConfig.tag}
                </span>
                <span className="text-[11px] text-slate-500 italic">
                  (Nhấn avatar để đổi)
                </span>
              </div>
            </div>
          </div>
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
        <form onSubmit={handleSaveAll} className="space-y-4">
          {/* MONKEYTYPE THEME & FONT DROPDOWNS (EQUAL HEIGHT: h-[54px]) */}
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

          <button
            id="btn-save-profile"
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 hover:scale-101 active:scale-98 transition-all cursor-pointer"
          >
            Lưu Thiết Lập & Đóng
          </button>
        </form>
      </div>

      {/* POPUP 1: TÙY CHỌN AVATAR & KHUNG ĐẠI DIỆN */}
      {isAvatarFrameModalOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              soundFx.playKeyClick();
              setIsAvatarFrameModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto animate-scaleUp text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    Tùy Chọn Avatar & Khung Hào Quang
                  </h4>
                  <p className="text-[11px] text-slate-400">Xem trước trực tiếp diện mạo trên đường đua</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setIsAvatarFrameModalOpen(false);
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* LIVE PREVIEW BOX */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Xem trước diện mạo
              </span>
              <div className="py-2">
                <AvatarWithFrame
                  icon={tempAvatar}
                  frameId={tempFrame}
                  size="xl"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{tempFrameConfig.name}</span>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300">
                  {tempFrameConfig.tag}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs">{tempFrameConfig.desc}</p>
            </div>

            {/* TABS SWITCHER: BIỂU TƯỢNG VS KHUNG HÀO QUANG */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setAvatarFrameTab('avatar');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  avatarFrameTab === 'avatar'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Biểu Tượng Avatar (48+)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setAvatarFrameTab('frame');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  avatarFrameTab === 'frame'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Khung Hào Quang (8 Khung)</span>
              </button>
            </div>

            {/* TAB CONTENT: 1. AVATARS */}
            {avatarFrameTab === 'avatar' && (
              <div className="space-y-3">
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
                            ? 'bg-amber-400 text-black shadow-sm'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {cat.category}
                      </button>
                    );
                  })}
                </div>

                {/* Avatars Grid */}
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 max-h-52 overflow-y-auto">
                  {EXPANDED_AVATARS[activeAvatarCategory].icons.map((emoji) => (
                    <button
                      id={`btn-popup-avatar-${emoji}`}
                      type="button"
                      key={emoji}
                      onClick={() => {
                        setTempAvatar(emoji);
                        soundFx.playKeyClick();
                      }}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl transition-all cursor-pointer ${
                        tempAvatar === emoji
                          ? 'bg-amber-500/30 border-2 border-amber-400 ring-2 ring-amber-400/50 scale-110 shadow-lg'
                          : 'hover:bg-slate-800 border border-transparent hover:scale-105'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. FRAMES */}
            {avatarFrameTab === 'frame' && (
              <div className="space-y-2.5">
                {/* Locked Frame Feedback Alert */}
                {lockedFrameTip && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{lockedFrameTip}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLockedFrameTip(null)}
                      className="text-slate-400 hover:text-white shrink-0 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 sm:max-h-80 overflow-y-auto p-1">
                  {AVATAR_FRAMES.map((f) => {
                    const isOwned = isFrameOwned(f.id, { bestWpm, totalGames, isAdmin: Boolean(isAdmin || checkIsAdmin()) });
                    const isSelected = tempFrame === f.id;

                    if (isOwned) {
                      return (
                        <button
                          key={f.id}
                          id={`btn-frame-owned-${f.id}`}
                          type="button"
                          onClick={() => {
                            setTempFrame(f.id);
                            setLockedFrameTip(null);
                            soundFx.playKeyClick();
                          }}
                          className={`p-2.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/60 shadow-lg'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                          }`}
                        >
                          {/* Mini Frame Preview */}
                          <AvatarWithFrame
                            icon={tempAvatar}
                            frameId={f.id}
                            size="sm"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-white truncate flex items-center gap-1">
                                {f.name}
                              </span>
                              <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 shrink-0">
                                {f.tag}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <p className="text-[10px] text-slate-400 truncate">{f.desc}</p>
                              <span className="text-[9px] font-bold text-emerald-400 shrink-0 flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Sở hữu
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    }

                    // Locked Frame: Grayed out, unselectable
                    return (
                      <div
                        key={f.id}
                        id={`btn-frame-locked-${f.id}`}
                        onClick={() => {
                          soundFx.playError();
                          setLockedFrameTip(`Khung "${f.name}" chưa mở khóa: ${f.unlockReq}`);
                        }}
                        className="p-2.5 rounded-2xl border border-slate-800/60 bg-slate-950/40 text-left flex items-center gap-3 opacity-40 grayscale hover:opacity-60 transition-all cursor-not-allowed select-none group"
                        title={`Chưa sở hữu. Yêu cầu: ${f.unlockReq}`}
                      >
                        {/* Grayed-out Mini Preview */}
                        <div className="relative shrink-0">
                          <AvatarWithFrame
                            icon={tempAvatar}
                            frameId={f.id}
                            size="sm"
                            isLocked={true}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 rounded-2xl">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-medium text-slate-400 truncate flex items-center gap-1">
                              {f.name}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 flex items-center gap-0.5 shrink-0">
                              <Lock className="w-2.5 h-2.5" /> Chưa có
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-400/80 font-medium truncate mt-0.5">
                            Khóa: {f.unlockReq}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Popup Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setIsAvatarFrameModalOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveAvatarFrame}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-400/20 cursor-pointer"
              >
                Xác Nhận Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP 2: ĐỔI BIỆT DANH NGƯỜI CHƠI */}
      {isEditNameOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              soundFx.playKeyClick();
              setIsEditNameOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4 relative animate-scaleUp text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    Đổi Biệt Danh Người Chơi
                  </h4>
                  <p className="text-[11px] text-slate-400">Tên xuất hiện trên bảng xếp hạng và các phòng đấu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setIsEditNameOpen(false);
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSaveName} className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Biệt Danh Mới
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    {tempName.length}/20 ký tự
                  </span>
                </div>
                <input
                  id="input-edit-username-popup"
                  type="text"
                  value={tempName}
                  onChange={(e) => {
                    setTempName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  maxLength={20}
                  autoFocus
                  placeholder="Nhập biệt danh của bạn..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                />
                {nameError && (
                  <p className="text-xs text-rose-400 font-medium">{nameError}</p>
                )}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Biệt danh giúp bạn bè và đối thủ nhận diện bạn trong các trận đua phím nhiều người chơi.
              </p>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setIsEditNameOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-400/20 cursor-pointer"
                >
                  Lưu Tên Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

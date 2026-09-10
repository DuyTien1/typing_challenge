import React, { useState } from 'react';
import { GameConfig, HighScoreRecord, BossDifficultyConfig } from '../types';
import { soundFx } from '../utils/audio';
import { CHAMPION_TITLES, ADMIN_TITLE } from '../utils/titles';
import { 
  Shield, 
  Lock, 
  Trash2, 
  RotateCcw, 
  X, 
  CheckCircle2, 
  Clock, 
  Sliders, 
  Swords, 
  Award, 
  Sparkles, 
  Crown, 
  AlertTriangle,
  Flame,
  Zap,
  Percent,
  Check
} from 'lucide-react';

interface AdminModalProps {
  isAdmin: boolean;
  onLogin: (password: string) => boolean;
  onLogout: () => void;
  config: GameConfig;
  onUpdateConfig: (newCfg: GameConfig) => void;
  onClearChat: () => void;
  onResetLeaderboard: () => void;
  onClose: () => void;
  highScores?: Record<string, HighScoreRecord | null>;
  onUpdateHighScores?: (newScores: Record<string, HighScoreRecord | null>) => void;
  currentUsername?: string;
  defaultConfig: GameConfig;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isAdmin,
  onLogin,
  onLogout,
  config,
  onUpdateConfig,
  onClearChat,
  onResetLeaderboard,
  onClose,
  highScores = {},
  onUpdateHighScores,
  currentUsername = 'Bạn',
  defaultConfig,
}) => {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);
  const [activeTab, setActiveTab] = useState<'durations' | 'hard_words' | 'san_boss' | 'titles' | 'system'>('san_boss');
  const [selectedBossDiff, setSelectedBossDiff] = useState<'normal' | 'hard' | 'hell'>('normal');

  const [editableConfig, setEditableConfig] = useState<GameConfig>(() => ({
    ...defaultConfig,
    ...config,
    hardWordRate: config.hardWordRate ?? 30,
    modeHardWordRates: {
      vi_dau: config.modeHardWordRates?.vi_dau ?? config.hardWordRate ?? 30,
      vi_nodau: config.modeHardWordRates?.vi_nodau ?? config.hardWordRate ?? 25,
      en: config.modeHardWordRates?.en ?? config.hardWordRate ?? 30,
      ngau_hung: config.modeHardWordRates?.ngau_hung ?? config.hardWordRate ?? 40,
      san_boss: config.modeHardWordRates?.san_boss ?? config.hardWordRate ?? 50,
      outplay: config.modeHardWordRates?.outplay ?? config.hardWordRate ?? 35,
      numpad: config.modeHardWordRates?.numpad ?? 20,
      ...(config.modeHardWordRates || {}),
    },
    modeDurations: {
      ...defaultConfig.modeDurations,
      ...(config.modeDurations || {}),
    },
    sanBoss: {
      difficulties: {
        normal: {
          ...defaultConfig.sanBoss.difficulties.normal,
          ...(config.sanBoss?.difficulties?.normal || {}),
          skillRates: {
            ...defaultConfig.sanBoss.difficulties.normal.skillRates,
            ...(config.sanBoss?.difficulties?.normal?.skillRates || {}),
          },
        },
        hard: {
          ...defaultConfig.sanBoss.difficulties.hard,
          ...(config.sanBoss?.difficulties?.hard || {}),
          skillRates: {
            ...defaultConfig.sanBoss.difficulties.hard.skillRates,
            ...(config.sanBoss?.difficulties?.hard?.skillRates || {}),
          },
        },
        hell: {
          ...defaultConfig.sanBoss.difficulties.hell,
          ...(config.sanBoss?.difficulties?.hell || {}),
          skillRates: {
            ...defaultConfig.sanBoss.difficulties.hell.skillRates,
            ...(config.sanBoss?.difficulties?.hell?.skillRates || {}),
          },
        },
      },
    },
  }));

  const [editableHighScores, setEditableHighScores] = useState<Record<string, HighScoreRecord | null>>({ ...highScores });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onLogin(password);
    if (!ok) {
      setErrorMsg('Mật khẩu không đúng! Mặc định là: admin123');
      soundFx.playError();
    } else {
      setErrorMsg('');
      soundFx.playVictory();
    }
  };

  const handleSaveConfig = () => {
    onUpdateConfig(editableConfig);
    if (onUpdateHighScores) {
      onUpdateHighScores(editableHighScores);
    }
    setSavedNotice(true);
    soundFx.playVictory();
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ thiết lập về mặc định ban đầu?')) {
      setEditableConfig(defaultConfig);
      onUpdateConfig(defaultConfig);
      setSavedNotice(true);
      soundFx.playKeyClick();
      setTimeout(() => setSavedNotice(false), 2500);
    }
  };

  const currentBossDiffConfig = editableConfig.sanBoss.difficulties[selectedBossDiff] || editableConfig.sanBoss.difficulties.normal;

  const updateCurrentBossDiff = (partial: Partial<BossDifficultyConfig>) => {
    setEditableConfig((prev) => ({
      ...prev,
      sanBoss: {
        ...prev.sanBoss,
        difficulties: {
          ...prev.sanBoss.difficulties,
          [selectedBossDiff]: {
            ...prev.sanBoss.difficulties[selectedBossDiff],
            ...partial,
          },
        },
      },
    }));
  };

  const updateSkillRate = (skillKey: 'shield' | 'shake' | 'smoke' | 'reverse' | 'capslock', val: number) => {
    updateCurrentBossDiff({
      skillRates: {
        ...currentBossDiffConfig.skillRates,
        [skillKey]: Math.max(0, Math.min(100, val)),
      },
    });
  };

  const balanceSkillRatesEqually = () => {
    updateCurrentBossDiff({
      skillRates: {
        shield: 20,
        shake: 20,
        smoke: 20,
        reverse: 20,
        capslock: 20,
      },
    });
    soundFx.playKeyClick();
  };

  const totalSkillWeight =
    (currentBossDiffConfig.skillRates?.shield || 0) +
    (currentBossDiffConfig.skillRates?.shake || 0) +
    (currentBossDiffConfig.skillRates?.smoke || 0) +
    (currentBossDiffConfig.skillRates?.reverse || 0) +
    (currentBossDiffConfig.skillRates?.capslock || 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/10">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  TRUNG TÂM ĐIỀU HÀNH ADMIN
                </h3>
                {isAdmin && (
                  <span className="text-[10px] bg-amber-500 text-black font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Đã Đăng Nhập
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Toàn quyền quản lý thời gian, tỷ lệ từ khó, chuyên sâu thuộc tính Boss & Danh hiệu
              </p>
            </div>
          </div>

          <button
            id="btn-close-admin-modal"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAdmin ? (
          /* Login View */
          <div className="p-8 sm:p-12 overflow-y-auto flex-1 flex items-center justify-center">
            <form onSubmit={handleLoginSubmit} className="w-full max-w-sm space-y-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/15">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-white">Yêu Cầu Quyền Quản Trị Viên</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Đăng nhập quyền Admin để nhận danh hiệu <span className="text-amber-400 font-bold">👑 Quản Trị Viên Tối Cao</span> và mở khóa toàn bộ quyền năng quản lý.
                </p>
              </div>

              <input
                id="input-admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu Admin (admin123)..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-center text-sm outline-none focus:ring-2 focus:ring-amber-400"
                autoFocus
              />

              {errorMsg && (
                <div className="text-xs text-rose-400 font-semibold p-2 bg-rose-950/40 rounded-lg border border-rose-800/60">
                  {errorMsg}
                </div>
              )}

              <button
                id="btn-submit-admin-login"
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer transition-transform hover:scale-101"
              >
                Kích Hoạt Quyền Admin
              </button>
            </form>
          </div>
        ) : (
          /* Admin Main Control Center */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-2 bg-slate-950 border-b border-slate-800 overflow-x-auto">
              <button
                id="tab-admin-boss"
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setActiveTab('san_boss');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === 'san_boss'
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Chuyên Sâu Săn Boss</span>
              </button>

              <button
                id="tab-admin-hardwords"
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setActiveTab('hard_words');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === 'hard_words'
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Tỷ Lệ Từ Khó ({editableConfig.hardWordRate}%)</span>
              </button>

              <button
                id="tab-admin-durations"
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setActiveTab('durations');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === 'durations'
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Thời Gian Màn Chơi</span>
              </button>

              <button
                id="tab-admin-titles"
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setActiveTab('titles');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === 'titles'
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Danh Hiệu & Khung Avatar</span>
              </button>

              <button
                id="tab-admin-system"
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setActiveTab('system');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === 'system'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Hệ Thống</span>
              </button>
            </div>

            {/* Saved Notice Banner */}
            {savedNotice && (
              <div className="px-4 py-2 bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Đã lưu thành công các cài đặt vào toàn bộ hệ thống FastTyping Arena!</span>
              </div>
            )}

            {/* Tab Contents */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: CHUYÊN SÂU SĂN BOSS */}
              {activeTab === 'san_boss' && (
                <div className="space-y-6">
                  {/* Boss Difficulty Selector */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <div>
                      <div className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                        Chọn Cấp Độ Boss Cần Hiệu Chỉnh:
                      </div>
                      <div className="text-sm font-black text-white">
                        Hắc Long Ma Vương - {currentBossDiffConfig.name}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(['normal', 'hard', 'hell'] as const).map((diffKey) => {
                        const diffData = editableConfig.sanBoss.difficulties[diffKey];
                        const isSelected = selectedBossDiff === diffKey;
                        return (
                          <button
                            id={`btn-admin-boss-diff-${diffKey}`}
                            type="button"
                            key={diffKey}
                            onClick={() => {
                              soundFx.playKeyClick();
                              setSelectedBossDiff(diffKey);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-2 ring-amber-400'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span>{diffData.icon}</span>
                            <span>{diffData.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 1: Core Boss Attributes */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Flame className="w-4 h-4" />
                      <span>Thuộc Tính Cơ Bản & Sinh Lực Boss</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-400">Máu Cơ Bản (Base HP):</label>
                        <input
                          id="input-boss-basehp"
                          type="number"
                          min={100}
                          max={10000}
                          value={currentBossDiffConfig.baseHp}
                          onChange={(e) => updateCurrentBossDiff({ baseHp: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm"
                        />
                        <p className="text-[10px] text-slate-500">Máu khi đánh solo 1 mình</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-400">Máu Cộng Thêm / Người Chơi:</label>
                        <input
                          id="input-boss-hpperplayer"
                          type="number"
                          min={50}
                          max={3000}
                          value={currentBossDiffConfig.hpPerPlayer}
                          onChange={(e) => updateCurrentBossDiff({ hpPerPlayer: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm"
                        />
                        <p className="text-[10px] text-slate-500">Thêm vào mỗi slot đồng đội trong phòng</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-400">Thời Gian Trận Đấu (Giây):</label>
                        <input
                          id="input-boss-duration"
                          type="number"
                          min={30}
                          max={600}
                          value={currentBossDiffConfig.duration}
                          onChange={(e) => updateCurrentBossDiff({ duration: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm"
                        />
                        <p className="text-[10px] text-slate-500">Đếm ngược hết giờ Boss thắng</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-400">Mốc Tự Bạo Cảm Tử (DMG):</label>
                        <input
                          id="input-boss-selfdestruct"
                          type="number"
                          min={100}
                          max={2000}
                          value={currentBossDiffConfig.selfDestructTarget}
                          onChange={(e) => updateCurrentBossDiff({ selfDestructTarget: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm"
                        />
                        <p className="text-[10px] text-slate-500">Sát thương cần đạt để kích hoạt tự bạo</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Skill Intervals & Cast Times */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Zap className="w-4 h-4" />
                      <span>Thời Gian Tung Chiêu & Niệm Chiêu</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-300">Chu Kỳ Tung Chiêu (Cooldown):</label>
                          <span className="text-xs font-black text-amber-400">{currentBossDiffConfig.skillInterval}s</span>
                        </div>
                        <input
                          id="slider-boss-skill-interval"
                          type="range"
                          min={5}
                          max={30}
                          step={1}
                          value={currentBossDiffConfig.skillInterval}
                          onChange={(e) => updateCurrentBossDiff({ skillInterval: Number(e.target.value) })}
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-500">Mỗi {currentBossDiffConfig.skillInterval}s Boss sẽ tung 1 chiêu ngẫu nhiên</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-300">Thời Gian Niệm Chiêu (Cast Warning):</label>
                          <span className="text-xs font-black text-amber-400">{currentBossDiffConfig.skillWarningDuration}s</span>
                        </div>
                        <input
                          id="slider-boss-cast-time"
                          type="range"
                          min={1}
                          max={5}
                          step={0.5}
                          value={currentBossDiffConfig.skillWarningDuration}
                          onChange={(e) => updateCurrentBossDiff({ skillWarningDuration: Number(e.target.value) })}
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-500">Thời gian báo trước cảnh báo đỏ trên màn hình</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-300">Boss Bị Choáng Sau Khi Vỡ Khiên:</label>
                          <span className="text-xs font-black text-amber-400">{currentBossDiffConfig.stunDuration}s</span>
                        </div>
                        <input
                          id="slider-boss-stun-duration"
                          type="range"
                          min={1}
                          max={8}
                          step={0.5}
                          value={currentBossDiffConfig.stunDuration}
                          onChange={(e) => updateCurrentBossDiff({ stunDuration: Number(e.target.value) })}
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-500">Boss nằm bất động, nhận x1.5 sát thương</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: In-Depth Skill Durations */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>Thời Gian Duy Trì Từng Kỹ Năng</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Shield */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                            🛡️ Khiên Hộ Thể Tím
                          </span>
                          <span className="text-xs font-black text-purple-400">{currentBossDiffConfig.shieldDuration}s</span>
                        </div>
                        <input
                          id="slider-shield-duration"
                          type="range"
                          min={2}
                          max={15}
                          value={currentBossDiffConfig.shieldDuration}
                          onChange={(e) => updateCurrentBossDiff({ shieldDuration: Number(e.target.value) })}
                          className="w-full accent-purple-400 cursor-pointer"
                        />
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Máu khiên / người:</span>
                          <input
                            id="input-shield-hp-player"
                            type="number"
                            min={10}
                            max={200}
                            value={currentBossDiffConfig.shieldHpPerPlayer}
                            onChange={(e) => updateCurrentBossDiff({ shieldHpPerPlayer: Number(e.target.value) })}
                            className="w-16 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-right font-mono text-white text-xs"
                          />
                        </div>
                      </div>

                      {/* Smoke */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            💨 Khói Mù Độc Dược
                          </span>
                          <span className="text-xs font-black text-slate-200">{currentBossDiffConfig.smokeDuration}s</span>
                        </div>
                        <input
                          id="slider-smoke-duration"
                          type="range"
                          min={1}
                          max={10}
                          value={currentBossDiffConfig.smokeDuration}
                          onChange={(e) => updateCurrentBossDiff({ smokeDuration: Number(e.target.value) })}
                          className="w-full accent-slate-400 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-500">Làm mờ chữ mục tiêu khiến người chơi khó đọc</p>
                      </div>

                      {/* Shake */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-orange-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                            🌋 Rung Chuyển Đất Trời
                          </span>
                          <span className="text-xs font-black text-orange-400">{currentBossDiffConfig.shakeDuration}s</span>
                        </div>
                        <input
                          id="slider-shake-duration"
                          type="range"
                          min={1}
                          max={10}
                          value={currentBossDiffConfig.shakeDuration}
                          onChange={(e) => updateCurrentBossDiff({ shakeDuration: Number(e.target.value) })}
                          className="w-full accent-orange-400 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-500">Màn hình rung giật kịch liệt gây mất tập trung</p>
                      </div>

                      {/* Reverse */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                            🌀 Không Gian Đảo Ngược
                          </span>
                          <span className="text-xs font-black text-cyan-400">{currentBossDiffConfig.reverseDuration}s</span>
                        </div>
                        <input
                          id="slider-reverse-duration"
                          type="range"
                          min={1}
                          max={10}
                          value={currentBossDiffConfig.reverseDuration}
                          onChange={(e) => updateCurrentBossDiff({ reverseDuration: Number(e.target.value) })}
                          className="w-full accent-cyan-400 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-500">Đảo ngược toàn bộ trật tự chữ cần gõ</p>
                      </div>

                      {/* CapsLock */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-yellow-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                            🔠 Áp Chế Chữ Hoa
                          </span>
                          <span className="text-xs font-black text-yellow-400">{currentBossDiffConfig.capslockDuration}s</span>
                        </div>
                        <input
                          id="slider-capslock-duration"
                          type="range"
                          min={1}
                          max={10}
                          value={currentBossDiffConfig.capslockDuration}
                          onChange={(e) => updateCurrentBossDiff({ capslockDuration: Number(e.target.value) })}
                          className="w-full accent-yellow-400 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-500">Bắt buộc bật CapsLock hoặc giữ Shift để gõ hoa</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Skill Spawn Weights / Probabilities */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Percent className="w-4 h-4" />
                        <span>Tỷ Lệ Xuất Hiện Các Kỹ Năng (%)</span>
                      </h4>

                      <button
                        id="btn-balance-skills"
                        type="button"
                        onClick={balanceSkillRatesEqually}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        ⚡ Phân Bổ Đều (20% Mỗi Chiêu)
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      {/* Visual Allocation Bar */}
                      <div className="h-3 rounded-full overflow-hidden flex bg-slate-800 shadow-inner">
                        <div style={{ width: `${((currentBossDiffConfig.skillRates?.shield || 0) / totalSkillWeight) * 100}%` }} className="bg-purple-500 transition-all" title="Khiên Hộ Thể" />
                        <div style={{ width: `${((currentBossDiffConfig.skillRates?.shake || 0) / totalSkillWeight) * 100}%` }} className="bg-orange-500 transition-all" title="Rung Lắc" />
                        <div style={{ width: `${((currentBossDiffConfig.skillRates?.smoke || 0) / totalSkillWeight) * 100}%` }} className="bg-slate-400 transition-all" title="Khói Mù" />
                        <div style={{ width: `${((currentBossDiffConfig.skillRates?.reverse || 0) / totalSkillWeight) * 100}%` }} className="bg-cyan-500 transition-all" title="Đảo Ngược" />
                        <div style={{ width: `${((currentBossDiffConfig.skillRates?.capslock || 0) / totalSkillWeight) * 100}%` }} className="bg-yellow-400 transition-all" title="Chữ Hoa" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-purple-400">🛡️ Khiên Giáp:</span>
                            <span className="font-mono font-black text-white">{currentBossDiffConfig.skillRates?.shield}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={currentBossDiffConfig.skillRates?.shield}
                            onChange={(e) => updateSkillRate('shield', Number(e.target.value))}
                            className="w-full accent-purple-400 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-orange-400">🌋 Rung Lắc:</span>
                            <span className="font-mono font-black text-white">{currentBossDiffConfig.skillRates?.shake}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={currentBossDiffConfig.skillRates?.shake}
                            onChange={(e) => updateSkillRate('shake', Number(e.target.value))}
                            className="w-full accent-orange-400 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-300">💨 Khói Mù:</span>
                            <span className="font-mono font-black text-white">{currentBossDiffConfig.skillRates?.smoke}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={currentBossDiffConfig.skillRates?.smoke}
                            onChange={(e) => updateSkillRate('smoke', Number(e.target.value))}
                            className="w-full accent-slate-400 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-cyan-400">🌀 Đảo Ngược:</span>
                            <span className="font-mono font-black text-white">{currentBossDiffConfig.skillRates?.reverse}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={currentBossDiffConfig.skillRates?.reverse}
                            onChange={(e) => updateSkillRate('reverse', Number(e.target.value))}
                            className="w-full accent-cyan-400 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-yellow-400">🔠 Chữ Hoa:</span>
                            <span className="font-mono font-black text-white">{currentBossDiffConfig.skillRates?.capslock}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={currentBossDiffConfig.skillRates?.capslock}
                            onChange={(e) => updateSkillRate('capslock', Number(e.target.value))}
                            className="w-full accent-yellow-400 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TỶ LỆ TỪ KHÓ CHUYÊN BIỆT CHO TỪNG MÀN CHƠI */}
              {activeTab === 'hard_words' && (
                <div className="space-y-6">
                  {/* Quick Sync Header */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>Cài Đặt Tỷ Lệ Từ Khó Từng Màn Chơi</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Tùy chỉnh độ khó độc lập cho từng chế độ thi đấu để tối ưu hóa trải nghiệm người chơi
                      </p>
                    </div>

                    {/* Quick Sync Button */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Đồng bộ tất cả:</span>
                      {[20, 35, 50, 75].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            soundFx.playKeyClick();
                            setEditableConfig({
                              ...editableConfig,
                              hardWordRate: val,
                              modeHardWordRates: {
                                vi_dau: val,
                                vi_nodau: val,
                                en: val,
                                ngau_hung: val,
                                san_boss: val,
                                outplay: val,
                                numpad: val,
                              },
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-amber-300 cursor-pointer transition-all"
                        >
                          {val}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grid of Per-Mode Hard Word Rates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        key: 'vi_dau',
                        name: 'Tiếng Việt Có Dấu',
                        icon: '🔥',
                        color: 'text-rose-400',
                        badgeColor: 'border-rose-500/40 text-rose-300 bg-rose-950/50',
                        desc: 'Từ ghép vần phức tạp, thanh điệu hiểm hóc (khuếch, nghiêng, thuở, ngoằn ngoèo...)',
                        defaultVal: 30,
                      },
                      {
                        key: 'vi_nodau',
                        name: 'Tiếng Việt Không Dấu',
                        icon: '⚡',
                        color: 'text-yellow-400',
                        badgeColor: 'border-yellow-500/40 text-yellow-300 bg-yellow-950/50',
                        desc: 'Từ không dấu có cụm phụ âm liên tiếp thử thách cơ tay (khuyuu, nghieng, nghich...)',
                        defaultVal: 25,
                      },
                      {
                        key: 'en',
                        name: 'Tiếng Anh (English)',
                        icon: '🌐',
                        color: 'text-sky-400',
                        badgeColor: 'border-sky-500/40 text-sky-300 bg-sky-950/50',
                        desc: 'Từ vựng tiếng Anh dài và hiếm gặp (knapsack, quizzical, bizarre, awkward...)',
                        defaultVal: 30,
                      },
                      {
                        key: 'ngau_hung',
                        name: 'Ngẫu Hứng Đa Dạng',
                        icon: '🎭',
                        color: 'text-orange-400',
                        badgeColor: 'border-orange-500/40 text-orange-300 bg-orange-950/50',
                        desc: 'Xáo trộn ngẫu nhiên Có Dấu, Không Dấu, Tiếng Anh & Số tạo bất ngờ cao độ',
                        defaultVal: 40,
                      },
                      {
                        key: 'san_boss',
                        name: 'Săn Boss Hắc Long',
                        icon: '🐉',
                        color: 'text-red-400',
                        badgeColor: 'border-red-500/40 text-red-300 bg-red-950/50',
                        desc: 'Gõ chữ dưới áp lực phản đòn, đảo ngược bàn phím & sấm sét từ Boss',
                        defaultVal: 50,
                      },
                      {
                        key: 'outplay',
                        name: 'Outplay Yourself (Solo Bóng Ma)',
                        icon: '👻',
                        color: 'text-cyan-400',
                        badgeColor: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/50',
                        desc: 'Tỷ lệ từ khó khi đối đầu với bóng ma thành tích cao nhất của chính bạn',
                        defaultVal: 35,
                      },
                      {
                        key: 'numpad',
                        name: 'Bàn Phím Số 58008',
                        icon: '🔢',
                        color: 'text-emerald-400',
                        badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/50',
                        desc: 'Tần suất xuất hiện các chuỗi số dài 5-6 chữ số so với số ngắn 1-2 chữ số',
                        defaultVal: 20,
                      },
                    ].map((modeItem) => {
                      const currentVal =
                        editableConfig.modeHardWordRates?.[modeItem.key as keyof typeof editableConfig.modeHardWordRates] ??
                        editableConfig.hardWordRate ??
                        modeItem.defaultVal;

                      return (
                        <div
                          key={modeItem.key}
                          className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-md"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{modeItem.icon}</span>
                              <div className={`text-xs font-black uppercase tracking-wide ${modeItem.color}`}>
                                {modeItem.name}
                              </div>
                            </div>
                            <div className={`px-2.5 py-0.5 rounded-lg border font-mono font-black text-sm ${modeItem.badgeColor}`}>
                              {currentVal}%
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-400 leading-snug">
                            {modeItem.desc}
                          </p>

                          {/* Range Slider */}
                          <input
                            id={`slider-hard-word-${modeItem.key}`}
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={currentVal}
                            onChange={(e) => {
                              const newVal = Number(e.target.value);
                              setEditableConfig({
                                ...editableConfig,
                                modeHardWordRates: {
                                  ...editableConfig.modeHardWordRates,
                                  [modeItem.key]: newVal,
                                },
                              });
                            }}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                          />

                          {/* Quick Presets for this specific mode */}
                          <div className="flex items-center justify-between gap-1 pt-1">
                            {[
                              { label: 'Dễ (15%)', val: 15 },
                              { label: 'Vừa (30%)', val: 30 },
                              { label: 'Khó (55%)', val: 55 },
                              { label: 'Ác mộng (85%)', val: 85 },
                            ].map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => {
                                  soundFx.playKeyClick();
                                  setEditableConfig({
                                    ...editableConfig,
                                    modeHardWordRates: {
                                      ...editableConfig.modeHardWordRates,
                                      [modeItem.key]: preset.val,
                                    },
                                  });
                                }}
                                className={`flex-1 py-1 rounded-lg text-[10px] font-bold border text-center transition-all cursor-pointer ${
                                  currentVal === preset.val
                                    ? 'bg-amber-500/25 border-amber-400 text-amber-300 font-black'
                                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Word Bank Preview */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Mẫu Từ Vựng Trong Bộ Ngân Hàng Từ Khó
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'khuếch', 'nghiêng', 'ngoằn', 'ngoèo', 'khuỵu', 'thuở', 'nghiến', 'nguyện',
                        'chuyển', 'tuyệt', 'khuyết', 'nghịch', 'xoắn', 'khoảnh', 'quýnh', 'rhythm',
                        'knapsack', 'quizzical', 'bizarre', 'synergy', 'awkward', '58008', '376007'
                      ].map((w) => (
                        <span key={w} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-amber-300">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: THỜI GIAN CÁC MÀN CHƠI */}
              {activeTab === 'durations' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Tiếng Việt Có Dấu */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-xs font-black text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                        🔥 Tiếng Việt Có Dấu
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Thời gian thi đấu (giây):</label>
                        <input
                          type="number"
                          value={editableConfig.modeDurations.vi_dau}
                          onChange={(e) =>
                            setEditableConfig({
                              ...editableConfig,
                              modeDurations: { ...editableConfig.modeDurations, vi_dau: Number(e.target.value) },
                              normalRace: { ...editableConfig.normalRace, duration: Number(e.target.value) },
                            })
                          }
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Số từ vựng nạp vào:</label>
                        <input
                          type="number"
                          value={editableConfig.normalRace.wordCount}
                          onChange={(e) =>
                            setEditableConfig({
                              ...editableConfig,
                              normalRace: { ...editableConfig.normalRace, wordCount: Number(e.target.value) },
                            })
                          }
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Tiếng Việt Không Dấu */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-xs font-black text-yellow-400 uppercase tracking-wide flex items-center gap-1.5">
                        ⚡ Tiếng Việt Không Dấu
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Thời gian thi đấu (giây):</label>
                        <input
                          type="number"
                          value={editableConfig.modeDurations.vi_nodau}
                          onChange={(e) =>
                            setEditableConfig({
                              ...editableConfig,
                              modeDurations: { ...editableConfig.modeDurations, vi_nodau: Number(e.target.value) },
                            })
                          }
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Tiếng Anh */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-xs font-black text-sky-400 uppercase tracking-wide flex items-center gap-1.5">
                        🌐 Tiếng Anh (English)
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Thời gian thi đấu (giây):</label>
                        <input
                          type="number"
                          value={editableConfig.modeDurations.en}
                          onChange={(e) =>
                            setEditableConfig({
                              ...editableConfig,
                              modeDurations: { ...editableConfig.modeDurations, en: Number(e.target.value) },
                            })
                          }
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Bàn Phím Số Numpad */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-xs font-black text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                        🔢 Bàn Phím Số (Numpad)
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Thời gian thi đấu (giây):</label>
                        <input
                          type="number"
                          value={editableConfig.modeDurations.numpad}
                          onChange={(e) =>
                            setEditableConfig({
                              ...editableConfig,
                              modeDurations: { ...editableConfig.modeDurations, numpad: Number(e.target.value) },
                              numpad: { ...editableConfig.numpad, duration: Number(e.target.value) },
                            })
                          }
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Outplay Yourself */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-xs font-black text-cyan-400 uppercase tracking-wide flex items-center gap-1.5">
                        🎯 Outplay Yourself (Solo)
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Thời gian thi đấu (giây):</label>
                        <input
                          type="number"
                          value={editableConfig.modeDurations.outplay}
                          onChange={(e) =>
                            setEditableConfig({
                              ...editableConfig,
                              modeDurations: { ...editableConfig.modeDurations, outplay: Number(e.target.value) },
                            })
                          }
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Ngẫu Hứng (Rush) */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-xs font-black text-orange-400 uppercase tracking-wide flex items-center gap-1.5">
                        🌪️ Ngẫu Hứng (Rush)
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Thời gian mỗi vòng (giây):</label>
                        <input
                          type="number"
                          value={editableConfig.ngauHung.difficulties.normal.roundDuration}
                          onChange={(e) =>
                            setEditableConfig({
                              ...editableConfig,
                              ngauHung: {
                                ...editableConfig.ngauHung,
                                difficulties: {
                                  ...editableConfig.ngauHung.difficulties,
                                  normal: {
                                    ...editableConfig.ngauHung.difficulties.normal,
                                    roundDuration: Number(e.target.value),
                                  },
                                },
                              },
                            })
                          }
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Đoán Chữ (Mystery) */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-xs font-black text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                        🔮 Đoán Chữ (Mystery Word)
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Thời gian đoán mỗi câu (giây):</label>
                        <input
                          type="number"
                          value={editableConfig.doanChu.difficulties.normal.roundDuration}
                          onChange={(e) =>
                            setEditableConfig({
                              ...editableConfig,
                              doanChu: {
                                ...editableConfig.doanChu,
                                difficulties: {
                                  ...editableConfig.doanChu.difficulties,
                                  normal: {
                                    ...editableConfig.doanChu.difficulties.normal,
                                    roundDuration: Number(e.target.value),
                                  },
                                },
                              },
                            })
                          }
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: DANH HIỆU & KHUNG AVATAR */}
              {activeTab === 'titles' && (
                <div className="space-y-6">
                  {/* Current Admin Title Preview */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-900 border-2 border-amber-500/50 flex flex-col sm:flex-row items-center gap-4 shadow-xl shadow-amber-500/10">
                    <div className="relative w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-3xl border-2 border-amber-400 ring-4 ring-amber-400/40 ring-offset-2 ring-offset-slate-950 shadow-[0_0_25px_rgba(251,191,36,0.7)] animate-pulse">
                      👑
                      <div className="absolute -top-2 -right-2 p-1 rounded-full bg-amber-400 text-black shadow-md">
                        <Crown className="w-3.5 h-3.5 fill-black" />
                      </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <div className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-1">
                        {ADMIN_TITLE.tag}
                      </div>
                      <h4 className="text-base font-black text-amber-400">
                        {ADMIN_TITLE.name}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        &ldquo;{ADMIN_TITLE.description}&rdquo;
                      </p>
                      <div className="text-xs text-amber-300/80 font-semibold mt-1">
                        Trạng thái tài khoản của bạn ({currentUsername}): <span className="text-emerald-400 font-bold">ĐÃ KÍCH HOẠT KHUNG ADMIN TRONG PHÒNG CHỜ</span>
                      </div>
                    </div>
                  </div>

                  {/* Mode Champion Titles List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Danh Sách Danh Hiệu Top 1 Các Màn Chơi:
                      </h4>
                      <span className="text-xs text-slate-500">
                        Người giữ Top 1 sẽ có khung hào quang tương ứng trong phòng chờ
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(CHAMPION_TITLES).map(([modeKey, titleData]) => {
                        const score = editableHighScores[modeKey];
                        const holderName = score?.username || 'Chưa xác lập';

                        return (
                          <div
                            key={modeKey}
                            className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3 hover:border-slate-700 transition-all"
                          >
                            <div className={`w-12 h-12 rounded-xl bg-slate-900 border flex items-center justify-center text-2xl shrink-0 ${titleData.borderClass}`}>
                              {titleData.badge}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-xs font-black truncate ${titleData.colorClass}`}>
                                  {titleData.name}
                                </span>
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                                  {titleData.modeName}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                                <span>Quán quân:</span>
                                <input
                                  type="text"
                                  value={holderName}
                                  onChange={(e) => {
                                    const newName = e.target.value;
                                    setEditableHighScores((prev) => ({
                                      ...prev,
                                      [modeKey]: {
                                        username: newName,
                                        wpm: prev[modeKey]?.wpm || 100,
                                        score: prev[modeKey]?.score || 0,
                                        errors: 0,
                                        timestamp: Date.now(),
                                      },
                                    }));
                                  }}
                                  className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-amber-400 font-bold text-xs max-w-[140px]"
                                />
                                <button
                                  type="button"
                                  title="Gán cho bản thân tôi"
                                  onClick={() => {
                                    soundFx.playKeyClick();
                                    setEditableHighScores((prev) => ({
                                      ...prev,
                                      [modeKey]: {
                                        username: currentUsername,
                                        wpm: 125,
                                        score: 999,
                                        errors: 0,
                                        timestamp: Date.now(),
                                      },
                                    }));
                                  }}
                                  className="text-[10px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 px-1.5 py-0.5 rounded border border-amber-500/30 cursor-pointer"
                                >
                                  Gán tôi
                                </button>
                              </div>

                              <p className="text-[10px] text-slate-500 mt-1 italic line-clamp-2">
                                &ldquo;{titleData.description}&rdquo;
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: HỆ THỐNG */}
              {activeTab === 'system' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <h5 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span>Kênh Chat Toàn Cầu</span>
                      </h5>
                      <p className="text-xs text-slate-400">
                        Xóa toàn bộ tin nhắn đã trò chuyện để làm sạch phòng đấu.
                      </p>
                      <button
                        id="btn-admin-clear-chat"
                        type="button"
                        onClick={() => {
                          soundFx.playKeyClick();
                          onClearChat();
                          alert('Đã xóa toàn bộ lịch sử trò chuyện!');
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-700 text-rose-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        Xóa Lịch Sử Chat
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <h5 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-amber-400" />
                        <span>Bảng Vàng Kỷ Lục</span>
                      </h5>
                      <p className="text-xs text-slate-400">
                        Đặt lại thành tích Quán Quân trong ngày về trạng thái khởi tạo.
                      </p>
                      <button
                        id="btn-admin-reset-leaderboard"
                        type="button"
                        onClick={() => {
                          soundFx.playKeyClick();
                          onResetLeaderboard();
                          alert('Đã đặt lại Bảng Vàng Kỷ Lục!');
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-amber-950/40 border border-slate-700 hover:border-amber-700 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        Đặt Lại Bảng Vàng
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wide">
                      Khôi Phục Cài Đặt Gốc (Factory Reset)
                    </h5>
                    <p className="text-xs text-slate-400">
                      Đưa toàn bộ thông số thời gian, máu Boss, chiêu thức Boss và tỷ lệ từ khó về mặc định nhà phát triển.
                    </p>
                    <button
                      id="btn-admin-reset-default"
                      type="button"
                      onClick={handleResetToDefault}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Khôi Phục Mặc Định Ban Đầu
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                id="btn-admin-logout"
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onLogout();
                }}
                className="text-xs text-rose-400 hover:underline cursor-pointer"
              >
                Đăng Xuất Quyền Admin
              </button>

              <div className="flex items-center gap-3">
                <button
                  id="btn-admin-cancel"
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>

                <button
                  id="btn-save-admin-config"
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all hover:scale-102 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Lưu Cấu Hình Toàn Hệ Thống</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

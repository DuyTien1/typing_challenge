import React, { useState } from 'react';
import { GameConfig, HighScoreRecord, BossDifficultyConfig, ModeWordCountsConfig, WordPoolType } from '../types';
import { soundFx } from '../utils/audio';
import { CHAMPION_TITLES, ADMIN_TITLE } from '../utils/titles';
import { CustomNumberInput } from './CustomNumberInput';
import { CustomCheckbox } from './CustomCheckbox';
import { 
  Shield, 
  Lock, 
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
  Check,
  Keyboard,
  HelpCircle,
  LogOut,
  Hash,
  KeyRound
} from 'lucide-react';

export const POOL_OPTIONS: {
  id: WordPoolType;
  label: string;
  description: string;
  sampleBadge: string;
}[] = [
  {
    id: 'vi_dau',
    label: 'Tiếng Việt có dấu',
    description: 'Chữ tiếng Việt nguyên bản đầy đủ dấu câu, dấu thanh (sắc, huyền, hỏi, ngã, nặng)',
    sampleBadge: 'sông núi',
  },
  {
    id: 'vi_nodau',
    label: 'Tiếng Việt không dấu',
    description: 'Chữ tiếng Việt loại bỏ toàn bộ dấu thanh và dấu mũ/móc chữ cái',
    sampleBadge: 'song nui',
  },
  {
    id: 'en',
    label: 'Tiếng Anh',
    description: 'Kho từ vựng tiếng Anh hiện đại, chuẩn xác và phong phú nhiều chủ đề',
    sampleBadge: 'keyboard',
  },
  {
    id: 'numbers',
    label: 'Chỉ chữ số (number)',
    description: 'Dãy số nguyên ngẫu nhiên từ 1 đến 6 chữ số liên tiếp',
    sampleBadge: '58008',
  },
  {
    id: 'fullsize',
    label: 'Fullsize (+-*/58008)',
    description: 'Bao gồm phép toán (+, -, *, /), số thập phân và mã số Easter Egg huyền thoại',
    sampleBadge: '+-*/58008',
  },
];

interface AdminModalProps {
  isAdmin: boolean;
  onLogin: (password: string) => boolean;
  onChangePassword?: (newPassword: string, oldPassword: string) => boolean;
  onLogout: () => void;
  config: GameConfig;
  onUpdateConfig: (newCfg: GameConfig) => void;
  onClearChat?: () => void;
  onResetLeaderboard: (modeKey?: string) => void;
  onClose: () => void;
  highScores?: Record<string, HighScoreRecord | null>;
  onUpdateHighScores?: (newScores: Record<string, HighScoreRecord | null>) => void;
  currentUsername?: string;
  defaultConfig: GameConfig;
}

type AdminTab = 'basic' | 'ngau_hung' | 'doan_chu' | 'san_boss' | 'titles';
type BasicSubTab = 'all' | 'vi_dau' | 'vi_nodau' | 'en' | 'numpad';

export const AdminModal: React.FC<AdminModalProps> = ({
  isAdmin,
  onLogin,
  onChangePassword,
  onLogout,
  config,
  onUpdateConfig,
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Change Password State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  
  const [activeTab, setActiveTab] = useState<AdminTab>('basic');
  const [basicSubTab, setBasicSubTab] = useState<BasicSubTab>('all');
  const [selectedBossDiff, setSelectedBossDiff] = useState<'normal' | 'hard' | 'hell'>('normal');
  const [selectedDoanChuDiff, setSelectedDoanChuDiff] = useState<'normal' | 'hard' | 'legendary'>('normal');
  const [selectedNgauHungDiff, setSelectedNgauHungDiff] = useState<'normal' | 'legendary'>('normal');

  const [editableConfig, setEditableConfig] = useState<GameConfig>(() => ({
    ...defaultConfig,
    ...config,
    hardWordRate: config.hardWordRate ?? 30,
    modeHardWordRates: {
      vi_dau: config.modeHardWordRates?.vi_dau ?? 30,
      vi_nodau: config.modeHardWordRates?.vi_nodau ?? 25,
      en: config.modeHardWordRates?.en ?? 30,
      ngau_hung: config.modeHardWordRates?.ngau_hung ?? 40,
      san_boss: config.modeHardWordRates?.san_boss ?? 50,
      outplay: config.modeHardWordRates?.outplay ?? 35,
      numpad: config.modeHardWordRates?.numpad ?? 20,
      ...(config.modeHardWordRates || {}),
    },
    modeDurations: {
      ...defaultConfig.modeDurations,
      ...(config.modeDurations || {}),
    },
    modeWordCounts: {
      vi_dau: config.modeWordCounts?.vi_dau ?? defaultConfig.modeWordCounts?.vi_dau ?? 150,
      vi_nodau: config.modeWordCounts?.vi_nodau ?? defaultConfig.modeWordCounts?.vi_nodau ?? 150,
      en: config.modeWordCounts?.en ?? defaultConfig.modeWordCounts?.en ?? 150,
      numpad: config.modeWordCounts?.numpad ?? defaultConfig.modeWordCounts?.numpad ?? 300,
      outplay: config.modeWordCounts?.outplay ?? defaultConfig.modeWordCounts?.outplay ?? 100,
      ...(config.modeWordCounts || {}),
    },
    sanBoss: {
      difficulties: {
        normal: {
          ...defaultConfig.sanBoss.difficulties.normal,
          ...(config.sanBoss?.difficulties?.normal || {}),
          allowedPools:
            config.sanBoss?.difficulties?.normal?.allowedPools ??
            defaultConfig.sanBoss?.difficulties?.normal?.allowedPools ??
            ['vi_dau', 'vi_nodau', 'en', 'numbers'],
          skillRates: {
            ...defaultConfig.sanBoss.difficulties.normal.skillRates,
            ...(config.sanBoss?.difficulties?.normal?.skillRates || {}),
          },
        },
        hard: {
          ...defaultConfig.sanBoss.difficulties.hard,
          ...(config.sanBoss?.difficulties?.hard || {}),
          allowedPools:
            config.sanBoss?.difficulties?.hard?.allowedPools ??
            defaultConfig.sanBoss?.difficulties?.hard?.allowedPools ??
            ['vi_dau', 'vi_nodau', 'en', 'numbers', 'fullsize'],
          skillRates: {
            ...defaultConfig.sanBoss.difficulties.hard.skillRates,
            ...(config.sanBoss?.difficulties?.hard?.skillRates || {}),
          },
        },
        hell: {
          ...defaultConfig.sanBoss.difficulties.hell,
          ...(config.sanBoss?.difficulties?.hell || {}),
          allowedPools:
            config.sanBoss?.difficulties?.hell?.allowedPools ??
            defaultConfig.sanBoss?.difficulties?.hell?.allowedPools ??
            ['vi_dau', 'vi_nodau', 'en', 'numbers', 'fullsize'],
          skillRates: {
            ...defaultConfig.sanBoss.difficulties.hell.skillRates,
            ...(config.sanBoss?.difficulties?.hell?.skillRates || {}),
          },
        },
      },
    },
    ngauHung: {
      difficulties: {
        normal: {
          ...defaultConfig.ngauHung.difficulties.normal,
          ...(config.ngauHung?.difficulties?.normal || {}),
          allowedPools:
            config.ngauHung?.difficulties?.normal?.allowedPools ??
            defaultConfig.ngauHung?.difficulties?.normal?.allowedPools ??
            ['vi_dau', 'vi_nodau', 'en', 'numbers'],
        },
        legendary: {
          ...defaultConfig.ngauHung.difficulties.legendary,
          ...(config.ngauHung?.difficulties?.legendary || {}),
          allowedPools:
            config.ngauHung?.difficulties?.legendary?.allowedPools ??
            defaultConfig.ngauHung?.difficulties?.legendary?.allowedPools ??
            ['vi_dau', 'vi_nodau', 'en', 'numbers', 'fullsize'],
        },
      },
    },
    doanChu: {
      difficulties: {
        normal: {
          ...defaultConfig.doanChu.difficulties.normal,
          ...(config.doanChu?.difficulties?.normal || {}),
          allowedPools:
            config.doanChu?.difficulties?.normal?.allowedPools ??
            defaultConfig.doanChu?.difficulties?.normal?.allowedPools ??
            ['vi_dau', 'vi_nodau'],
        },
        hard: {
          ...defaultConfig.doanChu.difficulties.hard,
          ...(config.doanChu?.difficulties?.hard || {}),
          allowedPools:
            config.doanChu?.difficulties?.hard?.allowedPools ??
            defaultConfig.doanChu?.difficulties?.hard?.allowedPools ??
            ['vi_dau', 'vi_nodau', 'en'],
        },
        legendary: {
          ...defaultConfig.doanChu.difficulties.legendary,
          ...(config.doanChu?.difficulties?.legendary || {}),
          allowedPools:
            config.doanChu?.difficulties?.legendary?.allowedPools ??
            defaultConfig.doanChu?.difficulties?.legendary?.allowedPools ??
            ['vi_dau', 'en', 'numbers'],
        },
      },
    },
  }));

  const [editableHighScores, setEditableHighScores] = useState<Record<string, HighScoreRecord | null>>({ ...highScores });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onLogin(password);
    if (!ok) {
      setErrorMsg('Mật khẩu không đúng! Mặc định ban đầu là: admin123');
      soundFx.playError();
    } else {
      setErrorMsg('');
      soundFx.playVictory();
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError('');

    if (!newPasswordInput || newPasswordInput.trim().length < 4) {
      setChangePasswordError('Mật khẩu mới phải có tối thiểu 4 ký tự!');
      soundFx.playError();
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setChangePasswordError('Mật khẩu mới và xác nhận mật khẩu không khớp!');
      soundFx.playError();
      return;
    }

    if (onChangePassword) {
      const ok = onChangePassword(newPasswordInput.trim(), oldPasswordInput);
      if (!ok) {
        setChangePasswordError('Mật khẩu hiện tại không chính xác!');
        soundFx.playError();
        return;
      }
    }

    soundFx.playVictory();
    showToast('Đã đổi mật khẩu Admin thành công! Hãy ghi nhớ mật khẩu mới.');
    setIsChangePasswordOpen(false);
    setOldPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
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
    if (window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ cài đặt về mặc định của nhà phát triển không?')) {
      setEditableConfig(defaultConfig);
      onUpdateConfig(defaultConfig);
      soundFx.playVictory();
      showToast('Đã khôi phục toàn bộ thông số về mặc định ban đầu!');
    }
  };

  // Reset single leaderboard mode
  const handleResetSingleLeaderboard = (modeKey: string, modeName: string) => {
    if (window.confirm(`Bạn có chắc muốn đặt lại bảng vàng cho chế độ "${modeName}" không?`)) {
      soundFx.playKeyClick();
      setEditableHighScores((prev) => ({ ...prev, [modeKey]: null }));
      onResetLeaderboard(modeKey);
      showToast(`Đã đặt lại Bảng Vàng kỷ lục chế độ ${modeName}!`);
    }
  };

  // Reset all leaderboard modes
  const handleResetAllLeaderboard = () => {
    if (window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa toàn bộ Quán Quân và thành tích của tất cả các chế độ không?')) {
      soundFx.playKeyClick();
      setEditableHighScores({});
      onResetLeaderboard();
      showToast('Đã làm mới toàn bộ Bảng Vàng Kỷ Lục!');
    }
  };

  const currentBossDiffConfig = editableConfig.sanBoss.difficulties[selectedBossDiff];

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
            skillRates: {
              ...prev.sanBoss.difficulties[selectedBossDiff].skillRates,
              ...(partial.skillRates || {}),
            },
          },
        },
      },
    }));
  };

  const togglePool = (
    mode: 'ngauHung' | 'doanChu' | 'sanBoss',
    diffKey: string,
    poolId: WordPoolType
  ) => {
    setEditableConfig((prev) => {
      let currentPools: WordPoolType[] = [];
      if (mode === 'ngauHung') {
        currentPools =
          prev.ngauHung.difficulties[diffKey]?.allowedPools || ['vi_dau', 'vi_nodau', 'en', 'numbers'];
      } else if (mode === 'doanChu') {
        currentPools =
          prev.doanChu.difficulties[diffKey]?.allowedPools || ['vi_dau', 'vi_nodau'];
      } else if (mode === 'sanBoss') {
        currentPools =
          prev.sanBoss.difficulties[diffKey]?.allowedPools || ['vi_dau', 'vi_nodau', 'en', 'numbers'];
      }

      const isCurrentlyChecked = currentPools.includes(poolId);
      let nextPools: WordPoolType[];
      if (isCurrentlyChecked) {
        if (currentPools.length <= 1) {
          showToast('⚠️ Cần giữ lại ít nhất 1 loại ngôn ngữ/nội dung cho độ khó này!');
          return prev;
        }
        nextPools = currentPools.filter((p) => p !== poolId);
      } else {
        nextPools = [...currentPools, poolId];
      }

      if (mode === 'ngauHung') {
        return {
          ...prev,
          ngauHung: {
            ...prev.ngauHung,
            difficulties: {
              ...prev.ngauHung.difficulties,
              [diffKey]: {
                ...prev.ngauHung.difficulties[diffKey],
                allowedPools: nextPools,
              },
            },
          },
        };
      } else if (mode === 'doanChu') {
        return {
          ...prev,
          doanChu: {
            ...prev.doanChu,
            difficulties: {
              ...prev.doanChu.difficulties,
              [diffKey]: {
                ...prev.doanChu.difficulties[diffKey],
                allowedPools: nextPools,
              },
            },
          },
        };
      } else {
        return {
          ...prev,
          sanBoss: {
            ...prev.sanBoss,
            difficulties: {
              ...prev.sanBoss.difficulties,
              [diffKey]: {
                ...prev.sanBoss.difficulties[diffKey],
                allowedPools: nextPools,
              },
            },
          },
        };
      }
    });
  };

  const currentWordCounts: ModeWordCountsConfig = editableConfig.modeWordCounts || {
    vi_dau: 150,
    vi_nodau: 150,
    en: 150,
    numpad: 300,
    outplay: 100,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[900px] flex flex-col bg-slate-900 border-2 border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2 tracking-wide uppercase">
                <span>Trung Tâm Điều Hành Admin</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  SYSTEM CORE
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Tùy chỉnh thông số từng chế độ thi đấu, tỷ lệ từ khó và quản lý bảng vàng
              </p>
            </div>
          </div>

          <button
            id="btn-close-admin-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {!isAdmin ? (
          /* Login View */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10 animate-pulse">
              <Lock className="w-8 h-8" />
            </div>

            <h4 className="text-lg font-black text-white tracking-wide mb-1">
              Yêu Cầu Xác Thực Quyền Quản Trị
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mb-6">
              Vui lòng nhập mật mã quản trị viên cấp cao để truy cập bảng điều khiển cấu hình toàn hệ thống.
            </p>

            <form onSubmit={handleLoginSubmit} className="w-full max-w-xs space-y-3">
              <input
                id="input-admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu Admin..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-center text-sm outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-500"
                autoFocus
              />

              {errorMsg && (
                <div className="text-xs text-rose-400 font-semibold p-2.5 bg-rose-950/40 rounded-xl border border-rose-800/60">
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
            
            {/* Main Tabs Navigation Bar */}
            <div className="flex items-center gap-1.5 p-2 bg-slate-950 border-b border-slate-800 overflow-x-auto shrink-0">
              
              {/* Tab 1: Chế độ Cơ Bản */}
              <button
                id="tab-admin-basic"
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setActiveTab('basic');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === 'basic'
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30 ring-1 ring-amber-300'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Chế Độ Cơ Bản (4 Màn)</span>
              </button>

              {/* Tab 2: Ngẫu Hứng */}
              <button
                id="tab-admin-ngauhung"
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setActiveTab('ngau_hung');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === 'ngau_hung'
                    ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/30 ring-1 ring-orange-300'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Ngẫu Hứng (Rush)</span>
              </button>

              {/* Tab 3: Đoán Chữ */}
              <button
                id="tab-admin-doanchu"
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setActiveTab('doan_chu');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === 'doan_chu'
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30 ring-1 ring-purple-300'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Đoán Chữ (Mystery)</span>
              </button>

              {/* Tab 4: Săn Boss (Raid) */}
              <button
                id="tab-admin-boss"
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setActiveTab('san_boss');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === 'san_boss'
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 ring-1 ring-red-300'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Săn Boss (Raid)</span>
              </button>

              {/* Tab 5: Bảng Vàng & Danh Hiệu */}
              <button
                id="tab-admin-titles"
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setActiveTab('titles');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === 'titles'
                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30 ring-1 ring-amber-200'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Bảng Vàng & Danh Hiệu</span>
              </button>
            </div>

            {/* Notification Banners */}
            {savedNotice && (
              <div className="px-4 py-2 bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn shrink-0">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Đã lưu thành công các cài đặt vào toàn bộ hệ thống FastTyping Arena!</span>
              </div>
            )}

            {toastMessage && (
              <div className="px-4 py-2 bg-sky-950/90 border-b border-sky-500/40 text-sky-300 text-xs font-bold flex items-center gap-2 animate-fadeIn shrink-0">
                <Sparkles className="w-4 h-4 shrink-0 text-sky-400" />
                <span>{toastMessage}</span>
              </div>
            )}

            {/* Tab Contents Viewport */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

              {/* ========================================================================= */}
              {/* TAB 1: CHẾ ĐỘ CƠ BẢN (Gộp 4 chế độ: vi_dau, vi_nodau, en, numpad) */}
              {/* ========================================================================= */}
              {activeTab === 'basic' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <div>
                      <h4 className="text-xs font-black uppercase text-amber-400 tracking-wide flex items-center gap-2">
                        <Keyboard className="w-4 h-4" />
                        <span>Cài Đặt 4 Màn Gõ Phím Cơ Bản</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Mỗi màn chơi có thời gian thi đấu, số chữ render và tỷ lệ từ khó (chuỗi số dài) riêng biệt.
                      </p>
                    </div>

                    {/* Sub-selector for basic modes */}
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setBasicSubTab('all')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                          basicSubTab === 'all'
                            ? 'bg-amber-500 text-black shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Tất cả (4)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBasicSubTab('vi_dau')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                          basicSubTab === 'vi_dau'
                            ? 'bg-rose-500 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Có Dấu
                      </button>
                      <button
                        type="button"
                        onClick={() => setBasicSubTab('vi_nodau')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                          basicSubTab === 'vi_nodau'
                            ? 'bg-yellow-500 text-black shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Không Dấu
                      </button>
                      <button
                        type="button"
                        onClick={() => setBasicSubTab('en')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                          basicSubTab === 'en'
                            ? 'bg-sky-500 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Tiếng Anh
                      </button>
                      <button
                        type="button"
                        onClick={() => setBasicSubTab('numpad')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                          basicSubTab === 'numpad'
                            ? 'bg-emerald-500 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Numpad
                      </button>
                    </div>
                  </div>

                  {/* 4 Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* 1. Tiếng Việt Có Dấu */}
                    {(basicSubTab === 'all' || basicSubTab === 'vi_dau') && (
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 hover:border-rose-500/40 transition-colors">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                          <div className="text-xs font-black text-rose-400 uppercase tracking-wide flex items-center gap-2">
                            <span className="text-base">🇻🇳</span>
                            <span>Tiếng Việt Có Dấu</span>
                          </div>
                          <span className="text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800/40 px-2 py-0.5 rounded-full font-bold">
                            Chế độ chuẩn
                          </span>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                            <span>Thời gian thi đấu (giây):</span>
                            <span className="text-rose-400 font-mono font-black">{editableConfig.modeDurations.vi_dau}s</span>
                          </label>
                          <CustomNumberInput
                            min={30}
                            max={600}
                            step={5}
                            value={editableConfig.modeDurations.vi_dau}
                            onChange={(val) =>
                              setEditableConfig({
                                ...editableConfig,
                                modeDurations: { ...editableConfig.modeDurations, vi_dau: val },
                                normalRace: { ...editableConfig.normalRace, duration: val },
                              })
                            }
                            focusBorderColor="focus-within:border-rose-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                            <span>Số chữ render (từ khởi tạo):</span>
                            <span className="text-rose-400 font-mono font-black">{currentWordCounts.vi_dau} từ</span>
                          </label>
                          <CustomNumberInput
                            min={30}
                            max={1000}
                            step={10}
                            value={currentWordCounts.vi_dau}
                            onChange={(val) =>
                              setEditableConfig({
                                ...editableConfig,
                                modeWordCounts: { ...currentWordCounts, vi_dau: val },
                                normalRace: { ...editableConfig.normalRace, wordCount: val },
                              })
                            }
                            focusBorderColor="focus-within:border-rose-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-400">Tỷ lệ từ khó xuất hiện (%):</span>
                            <span className="text-rose-400 font-mono font-black">{editableConfig.modeHardWordRates.vi_dau}%</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={editableConfig.modeHardWordRates.vi_dau}
                              onChange={(e) =>
                                setEditableConfig({
                                  ...editableConfig,
                                  modeHardWordRates: { ...editableConfig.modeHardWordRates, vi_dau: Number(e.target.value) },
                                })
                              }
                              className="flex-1 accent-rose-500 cursor-pointer"
                            />
                            <CustomNumberInput
                              size="sm"
                              className="w-20"
                              min={0}
                              max={100}
                              value={editableConfig.modeHardWordRates.vi_dau}
                              onChange={(val) =>
                                setEditableConfig({
                                  ...editableConfig,
                                  modeHardWordRates: { ...editableConfig.modeHardWordRates, vi_dau: val },
                                })
                              }
                              focusBorderColor="focus-within:border-rose-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. Tiếng Việt Không Dấu */}
                    {(basicSubTab === 'all' || basicSubTab === 'vi_nodau') && (
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 hover:border-yellow-500/40 transition-colors">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                          <div className="text-xs font-black text-yellow-400 uppercase tracking-wide flex items-center gap-2">
                            <span className="text-base">⚡</span>
                            <span>Tiếng Việt Không Dấu</span>
                          </div>
                          <span className="text-[10px] bg-yellow-950/60 text-yellow-300 border border-yellow-800/40 px-2 py-0.5 rounded-full font-bold">
                            Tốc độ cao
                          </span>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                            <span>Thời gian thi đấu (giây):</span>
                            <span className="text-yellow-400 font-mono font-black">{editableConfig.modeDurations.vi_nodau}s</span>
                          </label>
                          <CustomNumberInput
                            min={30}
                            max={600}
                            step={5}
                            value={editableConfig.modeDurations.vi_nodau}
                            onChange={(val) =>
                              setEditableConfig({
                                ...editableConfig,
                                modeDurations: { ...editableConfig.modeDurations, vi_nodau: val },
                              })
                            }
                            focusBorderColor="focus-within:border-yellow-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                            <span>Số chữ render (từ khởi tạo):</span>
                            <span className="text-yellow-400 font-mono font-black">{currentWordCounts.vi_nodau} từ</span>
                          </label>
                          <CustomNumberInput
                            min={30}
                            max={1000}
                            step={10}
                            value={currentWordCounts.vi_nodau}
                            onChange={(val) =>
                              setEditableConfig({
                                ...editableConfig,
                                modeWordCounts: { ...currentWordCounts, vi_nodau: val },
                              })
                            }
                            focusBorderColor="focus-within:border-yellow-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-400">Tỷ lệ từ khó xuất hiện (%):</span>
                            <span className="text-yellow-400 font-mono font-black">{editableConfig.modeHardWordRates.vi_nodau}%</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={editableConfig.modeHardWordRates.vi_nodau}
                              onChange={(e) =>
                                setEditableConfig({
                                  ...editableConfig,
                                  modeHardWordRates: { ...editableConfig.modeHardWordRates, vi_nodau: Number(e.target.value) },
                                })
                              }
                              className="flex-1 accent-yellow-500 cursor-pointer"
                            />
                            <CustomNumberInput
                              size="sm"
                              className="w-20"
                              min={0}
                              max={100}
                              value={editableConfig.modeHardWordRates.vi_nodau}
                              onChange={(val) =>
                                setEditableConfig({
                                  ...editableConfig,
                                  modeHardWordRates: { ...editableConfig.modeHardWordRates, vi_nodau: val },
                                })
                              }
                              focusBorderColor="focus-within:border-yellow-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. Tiếng Anh */}
                    {(basicSubTab === 'all' || basicSubTab === 'en') && (
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 hover:border-sky-500/40 transition-colors">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                          <div className="text-xs font-black text-sky-400 uppercase tracking-wide flex items-center gap-2">
                            <span className="text-base">🌐</span>
                            <span>Tiếng Anh (English)</span>
                          </div>
                          <span className="text-[10px] bg-sky-950/60 text-sky-300 border border-sky-800/40 px-2 py-0.5 rounded-full font-bold">
                            Quốc tế
                          </span>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                            <span>Thời gian thi đấu (giây):</span>
                            <span className="text-sky-400 font-mono font-black">{editableConfig.modeDurations.en}s</span>
                          </label>
                          <CustomNumberInput
                            min={30}
                            max={600}
                            step={5}
                            value={editableConfig.modeDurations.en}
                            onChange={(val) =>
                              setEditableConfig({
                                ...editableConfig,
                                modeDurations: { ...editableConfig.modeDurations, en: val },
                              })
                            }
                            focusBorderColor="focus-within:border-sky-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                            <span>Số chữ render (từ khởi tạo):</span>
                            <span className="text-sky-400 font-mono font-black">{currentWordCounts.en} từ</span>
                          </label>
                          <CustomNumberInput
                            min={30}
                            max={1000}
                            step={10}
                            value={currentWordCounts.en}
                            onChange={(val) =>
                              setEditableConfig({
                                ...editableConfig,
                                modeWordCounts: { ...currentWordCounts, en: val },
                              })
                            }
                            focusBorderColor="focus-within:border-sky-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-400">Tỷ lệ từ khó xuất hiện (%):</span>
                            <span className="text-sky-400 font-mono font-black">{editableConfig.modeHardWordRates.en}%</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={editableConfig.modeHardWordRates.en}
                              onChange={(e) =>
                                setEditableConfig({
                                  ...editableConfig,
                                  modeHardWordRates: { ...editableConfig.modeHardWordRates, en: Number(e.target.value) },
                                })
                              }
                              className="flex-1 accent-sky-500 cursor-pointer"
                            />
                            <CustomNumberInput
                              size="sm"
                              className="w-20"
                              min={0}
                              max={100}
                              value={editableConfig.modeHardWordRates.en}
                              onChange={(val) =>
                                setEditableConfig({
                                  ...editableConfig,
                                  modeHardWordRates: { ...editableConfig.modeHardWordRates, en: val },
                                })
                              }
                              focusBorderColor="focus-within:border-sky-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. Bàn Phím Số Numpad */}
                    {(basicSubTab === 'all' || basicSubTab === 'numpad') && (
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 hover:border-emerald-500/40 transition-colors">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                          <div className="text-xs font-black text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                            <span className="text-base">🔢</span>
                            <span>Bàn Phím Số (Numpad)</span>
                          </div>
                          <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded-full font-bold">
                            Phím số chuyên dụng
                          </span>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                            <span>Thời gian thi đấu (giây):</span>
                            <span className="text-emerald-400 font-mono font-black">{editableConfig.modeDurations.numpad}s</span>
                          </label>
                          <CustomNumberInput
                            min={30}
                            max={600}
                            step={5}
                            value={editableConfig.modeDurations.numpad}
                            onChange={(val) =>
                              setEditableConfig({
                                ...editableConfig,
                                modeDurations: { ...editableConfig.modeDurations, numpad: val },
                                numpad: { ...editableConfig.numpad, duration: val },
                              })
                            }
                            focusBorderColor="focus-within:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                            <span>Số chữ render (chuỗi số tạo ra):</span>
                            <span className="text-emerald-400 font-mono font-black">{currentWordCounts.numpad} số</span>
                          </label>
                          <CustomNumberInput
                            min={50}
                            max={1000}
                            step={10}
                            value={currentWordCounts.numpad}
                            onChange={(val) =>
                              setEditableConfig({
                                ...editableConfig,
                                modeWordCounts: { ...currentWordCounts, numpad: val },
                                numpad: { ...editableConfig.numpad, wordCount: val },
                              })
                            }
                            focusBorderColor="focus-within:border-emerald-500"
                          />
                        </div>

                        {/* Yêu cầu cụ thể: "Tần suất xuất hiện các chuỗi số dài 5-6 chữ số" */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-emerald-300">Tần suất xuất hiện các chuỗi số dài 5-6 chữ số (%):</span>
                            <span className="text-emerald-400 font-mono font-black">{editableConfig.modeHardWordRates.numpad}%</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={editableConfig.modeHardWordRates.numpad}
                              onChange={(e) =>
                                setEditableConfig({
                                  ...editableConfig,
                                  modeHardWordRates: { ...editableConfig.modeHardWordRates, numpad: Number(e.target.value) },
                                })
                              }
                              className="flex-1 accent-emerald-500 cursor-pointer"
                            />
                            <CustomNumberInput
                              size="sm"
                              className="w-20"
                              min={0}
                              max={100}
                              value={editableConfig.modeHardWordRates.numpad}
                              onChange={(val) =>
                                setEditableConfig({
                                  ...editableConfig,
                                  modeHardWordRates: { ...editableConfig.modeHardWordRates, numpad: val },
                                })
                              }
                              focusBorderColor="focus-within:border-emerald-500"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 italic">
                            Tăng tỷ lệ sẽ tạo nhiều chuỗi số thử thách dài 5 đến 6 chữ số thay vì số ngắn 1-3 số.
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: NGẪU HỨNG (RUSH) */}
              {/* ========================================================================= */}
              {activeTab === 'ngau_hung' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black uppercase text-orange-400 tracking-wide flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        <span>Chế Độ Ngẫu Hứng (Rush - Chạy Đua Từ Rơi)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Thi đấu theo từng đợt hiệp dồn dập, gõ kịp trước khi hết thanh thời gian mỗi vòng.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedNgauHungDiff('normal')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          selectedNgauHungDiff === 'normal'
                            ? 'bg-yellow-500 text-black shadow'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        🟡 Bình thường
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedNgauHungDiff('legendary')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          selectedNgauHungDiff === 'legendary'
                            ? 'bg-orange-500 text-white shadow'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        👑 Huyền Thoại
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
                        <span>Thời gian mỗi vòng:</span>
                        <span className="text-orange-400 font-mono font-black">
                          {editableConfig.ngauHung.difficulties[selectedNgauHungDiff]?.roundDuration}s
                        </span>
                      </label>
                      <CustomNumberInput
                        min={3}
                        max={30}
                        step={1}
                        value={editableConfig.ngauHung.difficulties[selectedNgauHungDiff]?.roundDuration || 7}
                        onChange={(val) =>
                          setEditableConfig({
                            ...editableConfig,
                            ngauHung: {
                              ...editableConfig.ngauHung,
                              difficulties: {
                                ...editableConfig.ngauHung.difficulties,
                                [selectedNgauHungDiff]: {
                                  ...editableConfig.ngauHung.difficulties,
                                  [selectedNgauHungDiff]: {
                                    ...editableConfig.ngauHung.difficulties[selectedNgauHungDiff],
                                    roundDuration: val,
                                  },
                                },
                              },
                            },
                          })
                        }
                        focusBorderColor="focus-within:border-orange-500"
                      />
                      <p className="text-[10px] text-slate-500">Giây để hoàn thành 1 từ rơi</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
                        <span>Nghỉ giữa các vòng:</span>
                        <span className="text-orange-400 font-mono font-black">
                          {editableConfig.ngauHung.difficulties[selectedNgauHungDiff]?.intermissionDuration}s
                        </span>
                      </label>
                      <CustomNumberInput
                        min={1}
                        max={10}
                        step={1}
                        value={editableConfig.ngauHung.difficulties[selectedNgauHungDiff]?.intermissionDuration || 3}
                        onChange={(val) =>
                          setEditableConfig({
                            ...editableConfig,
                            ngauHung: {
                              ...editableConfig.ngauHung,
                              difficulties: {
                                ...editableConfig.ngauHung.difficulties,
                                [selectedNgauHungDiff]: {
                                  ...editableConfig.ngauHung.difficulties[selectedNgauHungDiff],
                                  intermissionDuration: val,
                                },
                              },
                            },
                          })
                        }
                        focusBorderColor="focus-within:border-orange-500"
                      />
                      <p className="text-[10px] text-slate-500">Thời gian chờ trước từ kế tiếp</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
                        <span>Tổng số hiệp (vòng):</span>
                        <span className="text-orange-400 font-mono font-black">
                          {editableConfig.ngauHung.difficulties[selectedNgauHungDiff]?.totalRounds} hiệp
                        </span>
                      </label>
                      <CustomNumberInput
                        min={5}
                        max={50}
                        step={1}
                        value={editableConfig.ngauHung.difficulties[selectedNgauHungDiff]?.totalRounds || 15}
                        onChange={(val) =>
                          setEditableConfig({
                            ...editableConfig,
                            ngauHung: {
                              ...editableConfig.ngauHung,
                              difficulties: {
                                ...editableConfig.ngauHung.difficulties,
                                [selectedNgauHungDiff]: {
                                  ...editableConfig.ngauHung.difficulties[selectedNgauHungDiff],
                                  totalRounds: val,
                                },
                              },
                            },
                          })
                        }
                        focusBorderColor="focus-within:border-orange-500"
                      />
                      <p className="text-[10px] text-slate-500">Số vòng đấu cần vượt qua</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-400">Tỷ lệ từ khó:</span>
                        <span className="text-orange-400 font-mono font-black">{editableConfig.modeHardWordRates.ngau_hung}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={editableConfig.modeHardWordRates.ngau_hung}
                          onChange={(e) =>
                            setEditableConfig({
                              ...editableConfig,
                              modeHardWordRates: { ...editableConfig.modeHardWordRates, ngau_hung: Number(e.target.value) },
                            })
                          }
                          className="flex-1 accent-orange-500 cursor-pointer"
                        />
                        <CustomNumberInput
                          size="sm"
                          className="w-20"
                          min={0}
                          max={100}
                          value={editableConfig.modeHardWordRates.ngau_hung}
                          onChange={(val) =>
                            setEditableConfig({
                              ...editableConfig,
                              modeHardWordRates: { ...editableConfig.modeHardWordRates, ngau_hung: val },
                            })
                          }
                          focusBorderColor="focus-within:border-orange-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">Mức độ xuất hiện từ đa âm tiết</p>
                    </div>
                  </div>

                  {/* Cấu Hình Bộ Từ & Ngôn Ngữ Được Phép Xuất Hiện */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div>
                        <h4 className="text-xs font-black uppercase text-orange-400 tracking-wide flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          <span>Ngôn Ngữ & Nội Dung Được Phép Xuất Hiện</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Đang cấu hình cấp độ: <span className="text-white font-bold">{editableConfig.ngauHung.difficulties[selectedNgauHungDiff]?.name}</span>. Tích chọn các loại ngôn ngữ / nội dung được phép xuất hiện trong chế độ này.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-orange-950/40 border border-orange-800/50 text-orange-300">
                        Đã chọn: {editableConfig.ngauHung.difficulties[selectedNgauHungDiff]?.allowedPools?.length || 4}/5 loại
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {POOL_OPTIONS.map((opt) => {
                        const currentPools = editableConfig.ngauHung.difficulties[selectedNgauHungDiff]?.allowedPools || ['vi_dau', 'vi_nodau', 'en', 'numbers'];
                        const isChecked = currentPools.includes(opt.id);
                        return (
                          <CustomCheckbox
                            key={opt.id}
                            id={`checkbox-ngauhung-${selectedNgauHungDiff}-${opt.id}`}
                            checked={isChecked}
                            onChange={() => togglePool('ngauHung', selectedNgauHungDiff, opt.id)}
                            label={opt.label}
                            description={opt.description}
                            sampleBadge={opt.sampleBadge}
                            accentColor="orange"
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 4: ĐOÁN CHỮ (MYSTERY WORD) */}
              {/* ========================================================================= */}
              {activeTab === 'doan_chu' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black uppercase text-purple-400 tracking-wide flex items-center gap-2">
                        <HelpCircle className="w-4 h-4" />
                        <span>Chế Độ Đoán Chữ (Mystery Word)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Tùy chỉnh thời gian đoán từ, chu kỳ lật mở ký tự gợi ý và số lượng câu đố.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {(['normal', 'hard', 'legendary'] as const).map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setSelectedDoanChuDiff(diff)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                            selectedDoanChuDiff === diff
                              ? 'bg-purple-600 text-white shadow ring-2 ring-purple-400'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {editableConfig.doanChu.difficulties[diff]?.icon} {editableConfig.doanChu.difficulties[diff]?.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
                        <span>Thời gian đoán mỗi câu:</span>
                        <span className="text-purple-400 font-mono font-black">
                          {editableConfig.doanChu.difficulties[selectedDoanChuDiff]?.roundDuration}s
                        </span>
                      </label>
                      <CustomNumberInput
                        min={5}
                        max={60}
                        step={1}
                        value={editableConfig.doanChu.difficulties[selectedDoanChuDiff]?.roundDuration || 30}
                        onChange={(val) =>
                          setEditableConfig({
                            ...editableConfig,
                            doanChu: {
                              ...editableConfig.doanChu,
                              difficulties: {
                                ...editableConfig.doanChu.difficulties,
                                [selectedDoanChuDiff]: {
                                  ...editableConfig.doanChu.difficulties[selectedDoanChuDiff],
                                  roundDuration: val,
                                },
                              },
                            },
                          })
                        }
                        focusBorderColor="focus-within:border-purple-500"
                      />
                      <p className="text-[10px] text-slate-500">Giây đếm ngược cho 1 từ bí ẩn</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
                        <span>Chu kỳ lật mở gợi ý:</span>
                        <span className="text-purple-400 font-mono font-black">
                          {editableConfig.doanChu.difficulties[selectedDoanChuDiff]?.revealInterval}s
                        </span>
                      </label>
                      <CustomNumberInput
                        min={0.3}
                        max={5}
                        step={0.1}
                        value={editableConfig.doanChu.difficulties[selectedDoanChuDiff]?.revealInterval || 2}
                        onChange={(val) =>
                          setEditableConfig({
                            ...editableConfig,
                            doanChu: {
                              ...editableConfig.doanChu,
                              difficulties: {
                                ...editableConfig.doanChu.difficulties,
                                [selectedDoanChuDiff]: {
                                  ...editableConfig.doanChu.difficulties[selectedDoanChuDiff],
                                  revealInterval: val,
                                },
                              },
                            },
                          })
                        }
                        focusBorderColor="focus-within:border-purple-500"
                      />
                      <p className="text-[10px] text-slate-500">Khoảng cách giây hé lộ 1 ký tự</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
                        <span>Tổng số câu hỏi mỗi trận:</span>
                        <span className="text-purple-400 font-mono font-black">
                          {editableConfig.doanChu.difficulties[selectedDoanChuDiff]?.totalRounds} câu
                        </span>
                      </label>
                      <CustomNumberInput
                        min={3}
                        max={30}
                        step={1}
                        value={editableConfig.doanChu.difficulties[selectedDoanChuDiff]?.totalRounds || 10}
                        onChange={(val) =>
                          setEditableConfig({
                            ...editableConfig,
                            doanChu: {
                              ...editableConfig.doanChu,
                              difficulties: {
                                ...editableConfig.doanChu.difficulties,
                                [selectedDoanChuDiff]: {
                                  ...editableConfig.doanChu.difficulties[selectedDoanChuDiff],
                                  totalRounds: val,
                                },
                              },
                            },
                          })
                        }
                        focusBorderColor="focus-within:border-purple-500"
                      />
                      <p className="text-[10px] text-slate-500">Số lượng từ bí ẩn trong trận</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-400">Hiển thị gợi ý nghĩa từ:</span>
                        <span className="text-purple-400 font-mono font-black">
                          {editableConfig.doanChu.difficulties[selectedDoanChuDiff]?.showHint ? 'BẬT' : 'TẮT'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEditableConfig({
                            ...editableConfig,
                            doanChu: {
                              ...editableConfig.doanChu,
                              difficulties: {
                                ...editableConfig.doanChu.difficulties,
                                [selectedDoanChuDiff]: {
                                  ...editableConfig.doanChu.difficulties[selectedDoanChuDiff],
                                  showHint: !editableConfig.doanChu.difficulties[selectedDoanChuDiff]?.showHint,
                                },
                              },
                            },
                          })
                        }
                        className={`w-full py-2 rounded-xl text-xs font-black cursor-pointer transition-colors border ${
                          editableConfig.doanChu.difficulties[selectedDoanChuDiff]?.showHint
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        }`}
                      >
                        {editableConfig.doanChu.difficulties[selectedDoanChuDiff]?.showHint ? '✓ Đang Bật Gợi Ý' : '✕ Đã Tắt Gợi Ý'}
                      </button>
                      <p className="text-[10px] text-slate-500">Ẩn hoặc hiện câu mô tả gợi ý</p>
                    </div>
                  </div>

                  {/* Cấu Hình Bộ Từ & Ngôn Ngữ Được Phép Xuất Hiện */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div>
                        <h4 className="text-xs font-black uppercase text-purple-400 tracking-wide flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          <span>Ngôn Ngữ & Nội Dung Được Phép Xuất Hiện</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Đang cấu hình cấp độ: <span className="text-white font-bold">{editableConfig.doanChu.difficulties[selectedDoanChuDiff]?.name}</span>. Tích chọn các loại ngôn ngữ / nội dung được phép xuất hiện trong câu đố.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-800/50 text-purple-300">
                        Đã chọn: {editableConfig.doanChu.difficulties[selectedDoanChuDiff]?.allowedPools?.length || 2}/5 loại
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {POOL_OPTIONS.map((opt) => {
                        const currentPools = editableConfig.doanChu.difficulties[selectedDoanChuDiff]?.allowedPools || ['vi_dau', 'vi_nodau'];
                        const isChecked = currentPools.includes(opt.id);
                        return (
                          <CustomCheckbox
                            key={opt.id}
                            id={`checkbox-doanchu-${selectedDoanChuDiff}-${opt.id}`}
                            checked={isChecked}
                            onChange={() => togglePool('doanChu', selectedDoanChuDiff, opt.id)}
                            label={opt.label}
                            description={opt.description}
                            sampleBadge={opt.sampleBadge}
                            accentColor="purple"
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 5: CHUYÊN SÂU SĂN BOSS */}
              {/* ========================================================================= */}
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
                        <CustomNumberInput
                          id="input-boss-basehp"
                          min={100}
                          max={10000}
                          step={50}
                          value={currentBossDiffConfig.baseHp}
                          onChange={(val) => updateCurrentBossDiff({ baseHp: val })}
                          focusBorderColor="focus-within:border-amber-500"
                        />
                        <p className="text-[10px] text-slate-500">Máu khi đánh solo 1 mình</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-400">Máu Cộng Thêm / Người Chơi:</label>
                        <CustomNumberInput
                          id="input-boss-hpperplayer"
                          min={50}
                          max={3000}
                          step={50}
                          value={currentBossDiffConfig.hpPerPlayer}
                          onChange={(val) => updateCurrentBossDiff({ hpPerPlayer: val })}
                          focusBorderColor="focus-within:border-amber-500"
                        />
                        <p className="text-[10px] text-slate-500">Thêm vào mỗi slot đồng đội trong phòng</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-400">Thời Gian Trận Đấu (Giây):</label>
                        <CustomNumberInput
                          id="input-boss-duration"
                          min={30}
                          max={600}
                          step={5}
                          value={currentBossDiffConfig.duration}
                          onChange={(val) => updateCurrentBossDiff({ duration: val })}
                          focusBorderColor="focus-within:border-amber-500"
                        />
                        <p className="text-[10px] text-slate-500">Đếm ngược hết giờ Boss thắng</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <label className="text-[11px] font-bold text-slate-400">Mốc Tự Bạo Cảm Tử (DMG):</label>
                        <CustomNumberInput
                          id="input-boss-selfdestruct"
                          min={100}
                          max={2000}
                          step={25}
                          value={currentBossDiffConfig.selfDestructTarget}
                          onChange={(val) => updateCurrentBossDiff({ selfDestructTarget: val })}
                          focusBorderColor="focus-within:border-amber-500"
                        />
                        <p className="text-[10px] text-slate-500">Sát thương cần đạt để kích hoạt tự bạo</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Combat Cadence & Durations */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>Nhịp Độ Chiêu Thức & Thời Lượng Hiệu Ứng</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">Chu Kỳ Chiêu (s):</label>
                        <CustomNumberInput
                          size="sm"
                          step={0.5}
                          min={2}
                          max={30}
                          value={currentBossDiffConfig.skillInterval}
                          onChange={(val) => updateCurrentBossDiff({ skillInterval: val })}
                          focusBorderColor="focus-within:border-amber-500"
                        />
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">Báo Trước (s):</label>
                        <CustomNumberInput
                          size="sm"
                          step={0.5}
                          min={1}
                          max={10}
                          value={currentBossDiffConfig.skillWarningDuration}
                          onChange={(val) => updateCurrentBossDiff({ skillWarningDuration: val })}
                          focusBorderColor="focus-within:border-amber-500"
                        />
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">Giữ Khiên (s):</label>
                        <CustomNumberInput
                          size="sm"
                          step={1}
                          min={3}
                          max={30}
                          value={currentBossDiffConfig.shieldDuration}
                          onChange={(val) => updateCurrentBossDiff({ shieldDuration: val })}
                          focusBorderColor="focus-within:border-amber-500"
                        />
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">Máu Khiên / Người:</label>
                        <CustomNumberInput
                          size="sm"
                          step={10}
                          min={10}
                          max={500}
                          value={currentBossDiffConfig.shieldHpPerPlayer}
                          onChange={(val) => updateCurrentBossDiff({ shieldHpPerPlayer: val })}
                          focusBorderColor="focus-within:border-amber-500"
                        />
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">Khói Đen (s):</label>
                        <CustomNumberInput
                          size="sm"
                          step={1}
                          min={2}
                          max={15}
                          value={currentBossDiffConfig.smokeDuration}
                          onChange={(val) => updateCurrentBossDiff({ smokeDuration: val })}
                          focusBorderColor="focus-within:border-amber-500"
                        />
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">Đảo Ngược (s):</label>
                        <CustomNumberInput
                          size="sm"
                          step={1}
                          min={2}
                          max={15}
                          value={currentBossDiffConfig.reverseDuration}
                          onChange={(val) => updateCurrentBossDiff({ reverseDuration: val })}
                          focusBorderColor="focus-within:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Skill Trigger Probabilities */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Percent className="w-4 h-4" />
                      <span>Tỷ Lệ Kích Hoạt Từng Kỹ Năng Của Boss (%)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {(['shield', 'capslock', 'shake', 'smoke', 'reverse'] as const).map((skillName) => {
                        const skillLabels: Record<string, { label: string; icon: string; color: string }> = {
                          shield: { label: 'Khiên Hắc Giáp', icon: '🛡️', color: 'text-amber-400' },
                          capslock: { label: 'Lời Nguyền IN HOA', icon: '🔠', color: 'text-purple-400' },
                          shake: { label: 'Rung Lắc Địa Chấn', icon: '⚡', color: 'text-yellow-400' },
                          smoke: { label: 'Màn Khói Mù', icon: '💨', color: 'text-slate-400' },
                          reverse: { label: 'Đảo Ngược Ký Tự', icon: '🔄', color: 'text-rose-400' },
                        };
                        const info = skillLabels[skillName];
                        const currentRate = currentBossDiffConfig.skillRates?.[skillName] ?? 20;

                        return (
                          <div key={skillName} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className={`flex items-center gap-1 ${info.color}`}>
                                <span>{info.icon}</span>
                                <span>{info.label}</span>
                              </span>
                              <span className="text-white font-mono">{currentRate}%</span>
                            </div>

                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={currentRate}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                updateCurrentBossDiff({
                                  skillRates: {
                                    ...currentBossDiffConfig.skillRates,
                                    [skillName]: val,
                                  },
                                });
                              }}
                              className="w-full accent-amber-500 cursor-pointer"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 3: Ngôn Ngữ & Nội Dung Được Phép Xuất Hiện */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div>
                        <h4 className="text-xs font-black uppercase text-amber-400 tracking-wide flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          <span>Mục 3: Ngôn Ngữ & Nội Dung Được Phép Xuất Hiện</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Đang cấu hình cấp độ Boss: <span className="text-white font-bold">{currentBossDiffConfig.name}</span>. Tích chọn các loại ngôn ngữ / nội dung được phép xuất hiện khi giao chiến với Boss.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300">
                        Đã chọn: {currentBossDiffConfig.allowedPools?.length || 4}/5 loại
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {POOL_OPTIONS.map((opt) => {
                        const currentPools = currentBossDiffConfig.allowedPools || ['vi_dau', 'vi_nodau', 'en', 'numbers'];
                        const isChecked = currentPools.includes(opt.id);
                        return (
                          <CustomCheckbox
                            key={opt.id}
                            id={`checkbox-boss-${selectedBossDiff}-${opt.id}`}
                            checked={isChecked}
                            onChange={() => togglePool('sanBoss', selectedBossDiff, opt.id)}
                            label={opt.label}
                            description={opt.description}
                            sampleBadge={opt.sampleBadge}
                            accentColor="amber"
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 6: BẢNG VÀNG & DANH HIỆU */}
              {/* ========================================================================= */}
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
                        Trạng thái tài khoản ({currentUsername}): <span className="text-emerald-400 font-bold">ĐÃ KÍCH HOẠT KHUNG ADMIN TRONG PHÒNG CHỜ</span>
                      </div>
                    </div>

                    {/* Master Reset All Leaderboard Button */}
                    <button
                      type="button"
                      onClick={handleResetAllLeaderboard}
                      className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 hover:text-rose-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Đặt Lại Toàn Bộ Bảng Vàng</span>
                    </button>
                  </div>

                  {/* Mode Champion Titles List & Reset Per Mode */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Danh Sách Quán Quân & Đặt Lại Từng Chế Độ:
                      </h4>
                      <span className="text-xs text-amber-400 font-medium">
                        Có thể nhấn nút "Đặt Lại" riêng cho từng chế độ bên dưới
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {Object.entries(CHAMPION_TITLES).map(([modeKey, titleData]) => {
                        const score = editableHighScores[modeKey];
                        const holderName = score?.username || 'Chưa xác lập';

                        return (
                          <div
                            key={modeKey}
                            className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-700 transition-all"
                          >
                            <div className="flex items-start gap-3">
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

                                <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
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
                                    className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-amber-400 font-bold text-xs max-w-[130px]"
                                  />
                                  <button
                                    type="button"
                                    title="Gán quán quân cho tôi"
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

                                <p className="text-[10px] text-slate-500 mt-1 italic line-clamp-1">
                                  &ldquo;{titleData.description}&rdquo;
                                </p>
                              </div>
                            </div>

                            {/* Nút đặt lại bảng vàng riêng cho chế độ này */}
                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                              <span className="text-[10px] text-slate-500">
                                {score ? `Kỷ lục: ${score.wpm} WPM` : 'Chưa có kỷ lục'}
                              </span>

                              <button
                                id={`btn-reset-leaderboard-${modeKey}`}
                                type="button"
                                onClick={() => handleResetSingleLeaderboard(modeKey, titleData.modeName)}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-700 text-rose-300 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <RotateCcw className="w-3 h-3 text-rose-400" />
                                <span>Đặt Lại Màn Này</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* ========================================================================= */}
            {/* BOTTOM ACTIONS FOOTER */}
            {/* ========================================================================= */}
            <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              
              {/* Left Side: Nút Khôi Phục Mặc Định NẰM CẠNH Nút Đăng Xuất Admin (yêu cầu người dùng) */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <button
                  id="btn-admin-reset-default"
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Khôi phục toàn bộ thông số thời gian, từ khó và Boss về cài đặt gốc"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Khôi Phục Cài Đặt Gốc</span>
                </button>

                <button
                  id="btn-admin-change-password"
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setIsChangePasswordOpen(true);
                    setChangePasswordError('');
                    setOldPasswordInput('');
                    setNewPasswordInput('');
                    setConfirmPasswordInput('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Thay đổi mật khẩu đăng nhập quyền Quản Trị Viên"
                >
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Đổi Mật Khẩu Admin</span>
                </button>

                <button
                  id="btn-admin-logout"
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    onLogout();
                  }}
                  className="px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:underline cursor-pointer flex items-center gap-1.5 transition-colors font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng Xuất Quyền Admin</span>
                </button>
              </div>

              {/* Right Side: Nút Đóng & Lưu Cấu Hình */}
              <div className="flex items-center gap-3">
                <button
                  id="btn-admin-cancel"
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
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

            {/* Change Password Dialog Modal */}
            {isChangePasswordOpen && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                <div className="w-full max-w-md bg-slate-900 border-2 border-cyan-500/50 rounded-2xl shadow-2xl p-6 text-slate-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <h4 className="font-black text-white text-sm uppercase tracking-wide">
                        Đổi Mật Khẩu Quản Trị Viên
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChangePasswordOpen(false)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Mật khẩu hiện tại:</label>
                      <input
                        type="password"
                        value={oldPasswordInput}
                        onChange={(e) => setOldPasswordInput(e.target.value)}
                        placeholder="Nhập mật khẩu admin hiện tại..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-cyan-400"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Mật khẩu mới (tối thiểu 4 ký tự):</label>
                      <input
                        type="password"
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Nhập mật khẩu mới..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-cyan-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Xác nhận mật khẩu mới:</label>
                      <input
                        type="password"
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-cyan-400"
                        required
                      />
                    </div>

                    {changePasswordError && (
                      <div className="text-xs text-rose-400 font-semibold p-2.5 bg-rose-950/40 rounded-xl border border-rose-800/60">
                        {changePasswordError}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsChangePasswordOpen(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 cursor-pointer"
                      >
                        Lưu Mật Khẩu Mới
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

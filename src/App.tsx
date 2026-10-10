import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameMode,
  DifficultyLevel,
  Player,
  BossState,
  HighScoreRecord,
  ChatMessage,
  MysteryWordItem,
  GameConfig,
  KeystrokeEvent,
  PerformanceChartPoint,
  NgauHungGameStats,
  MysteryWordGameStats,
  BossBattleStats,
  UserAccount,
  BestWpmRecord,
  HeavenlyDaoDecree,
  HerbType,
  ChatChannel,
  ChatCardType,
  ChatCardData,
  FriendRecord,
  SectWarReportData,
  SectTrialStageStats,
} from './types';
import { Header } from './components/Header';
import { LobbyView } from './components/LobbyView';
import { WaitingRoomView } from './components/WaitingRoomView';
import { MemoizedArenaSection } from './components/MemoizedArenaSection';
import { GameOverModal } from './components/GameOverModal';
import { SectWarReportModal } from './components/SectWarReportModal';
import { MatchHistoryModal } from './components/MatchHistoryModal';
import { ChatDrawer } from './components/ChatDrawer';
import { FriendsModal } from './components/FriendsModal';
import { ModalContainer } from './components/ModalContainer';
import { HeavenlyTickerBanner } from './components/HeavenlyTickerBanner';
import { HeavenlyChronicleModal } from './components/HeavenlyChronicleModal';
import { DaoDecreeModal } from './components/DaoDecreeModal';
import { BanPenaltyModal } from './components/BanPenaltyModal';
import { useChatEngine } from './hooks/useChatEngine';
import { useCultivationEngine } from './hooks/useCultivationEngine';
import { useRoomEngine } from './hooks/useRoomEngine';
import { 
  announcePenalty, 
  announceRecord, 
  announceBossKill, 
  announceBreakthrough, 
  subscribeToDaoDecrees,
  announceLinhLungCheer,
  announceLinhLungCommentary,
} from './utils/heavenlyDaoBot';
import {
  checkClientBanStatus,
  getStoredBanInfo,
  saveStoredBanInfo,
  clearStoredBanInfo,
  executeBanPenalty,
  syncServerBanStatus,
} from './utils/banManager';
import { initGlobalHorizontalWheelScroll } from './utils/horizontalScroll';
import { NewAchievementBannerToast } from './components/gameover/NewAchievementBannerToast';
import { resolveBestWpmRecord, isOutplayMode } from './components/WpmRecordBadge';
import { fetchCurrentUser, logoutUser, updateUserProfile, getStoredAuthToken, loginWithEmail, getStoredCachedUser } from './utils/auth';
import {
  createNewRoom,
  joinExistingRoom,
  quickJoinOrCreateRoom,
  subscribeToRoom,
  updateRoomPlayers,
  updateRoomDifficulty,
  updateRoomMode,
  transferRoomHost,
  kickRoomPlayer,
  markRoomPlaying,
  markRoomWaiting,
  markRoomFinished,
  leaveRoom,
  updatePlayerRoomStatus,
  sendPlayerProgress,
  subscribeToGlobalChat,
  sendPresencePing,
  sendChatMessage,
  clearServerChat,
  fetchChatMessages,
  fetchOnlineCount,
  fetchLeaderboard,
  submitScoreToLeaderboard,
  adminUpdateLeaderboard,
  adminResetLeaderboard,
  fetchFriendsList,
  sendFriendRequest,
  respondFriendRequest,
  serverContributeSectWarScore,
  serverPenalizeSectSurrender,
  retryPendingSectContributions,
} from './utils/roomManager';
import {
  getLeaderboardSync,
  getLeaderboardFromIndexedDB,
  saveLeaderboardToIndexedDB,
  clearLeaderboardFromIndexedDB,
  migrateLegacyLocalStorageToIndexedDB,
} from './utils/leaderboardStorage';
import { soundFx } from './utils/audio';
import { validateKeystrokes } from './utils/antiCheat';
import { generateWords, generateDoanChuWords, generateSectTrialWords } from './data/wordBanks';
import { initThemeAndFont } from './utils/themeAndFont';
import { getStoredFrame, setStoredFrame, checkIsAdmin, setAdminStatus } from './utils/frames';
import { 
  getShowcaseAchievements, 
  setShowcaseAchievements, 
  checkNewAchievementsOnMatchEnd, 
  setStoredUnlockedAchievements,
  XianxiaAchievement,
  XIANXIA_ACHIEVEMENTS,
  getAccountOnlineSeconds,
  addAccountOnlineSeconds,
  saveAccountOnlineSeconds,
} from './utils/achievements';
import { 
  MatchRecord, 
  MatchResult, 
  addMatchRecord, 
  getFriendlyModeName, 
  getStoredMatchHistory,
  clearMatchHistory,
} from './utils/matchHistory';
import { OutplayPaceMode } from './utils/outplayGhost';
import { UserX, X } from 'lucide-react';
import {
  XIANXIA_REALMS,
  CultivationState,
  loadStoredCultivationState,
  saveStoredCultivationState,
  createInitialCultivationState,
  processCultivationDecay,
  addTuViFromMatch,
  getSubStage,
  ensureDailySync,
  mergeCultivationStates,
  attackSectWorldBoss,
  contributeTournamentScore,
  isSectWarEventActive,
  getConsecutiveSectSurrenders,
  resetConsecutiveSectSurrenders,
  recordSectTrialSurrender,
} from './utils/cultivation';

export const DEFAULT_CONFIG: GameConfig = {
  hardWordRate: 30,
  modeHardWordRates: {
    vi_dau: 30,
    vi_nodau: 25,
    en: 30,
    ngau_hung: 40,
    san_boss: 50,
    outplay: 35,
    numpad: 20,
  },
  modeDurations: {
    vi_dau: 300,
    vi_nodau: 300,
    en: 300,
    numpad: 90,
    outplay: 60,
  },
  modeWordCounts: {
    vi_dau: 150,
    vi_nodau: 150,
    en: 150,
    numpad: 300,
    outplay: 100,
  },
  normalRace: { duration: 300, wordCount: 150 },
  numpad: { duration: 90, wordCount: 500 },
  ngauHung: {
    difficulties: {
      normal: {
        name: 'Bình thường',
        icon: '🟡',
        color: '#ffe600',
        roundDuration: 7,
        intermissionDuration: 3,
        totalRounds: 15,
        allowedPools: ['vi_nodau', 'en', 'numbers'],
      },
      legendary: {
        name: 'Huyền Thoại',
        icon: '👑',
        color: '#ff0055',
        roundDuration: 5,
        intermissionDuration: 2,
        totalRounds: 20,
        allowedPools: ['vi_nodau', 'en', 'numbers', 'fullsize'],
      },
    },
  },
  doanChu: {
    difficulties: {
      normal: {
        name: 'Bình thường',
        icon: '🟡',
        color: '#ffe600',
        roundDuration: 30,
        revealInterval: 2.2,
        intermissionDuration: 3,
        totalRounds: 10,
        showHint: true,
        allowedPools: ['vi_nodau'],
      },
      hard: {
        name: 'Khó',
        icon: '🔴',
        color: '#ff7700',
        roundDuration: 14,
        revealInterval: 1.0,
        intermissionDuration: 2.5,
        totalRounds: 12,
        showHint: true,
        allowedPools: ['vi_nodau', 'en'],
      },
      legendary: {
        name: 'Huyền Thoại',
        icon: '👑',
        color: '#ff0055',
        roundDuration: 10,
        revealInterval: 0.7,
        intermissionDuration: 2,
        totalRounds: 15,
        showHint: false,
        allowedPools: ['en', 'numbers'],
      },
    },
  },
  sanBoss: {
    difficulties: {
      normal: {
        name: 'Bình thường',
        icon: '🟡',
        color: '#ffe600',
        duration: 120,
        baseHp: 800,
        hpPerPlayer: 500,
        selfDestructTarget: 600,
        skillInterval: 9,
        skillWarningDuration: 1.8,
        shieldDuration: 5.5,
        shieldHpPerPlayer: 60,
        stunDuration: 3.5,
        shakeDuration: 4.5,
        smokeDuration: 4.5,
        reverseDuration: 5,
        capslockDuration: 5,
        skillRates: {
          shield: 25,
          shake: 20,
          smoke: 20,
          reverse: 15,
          capslock: 20,
        },
        allowedPools: ['vi_nodau', 'en', 'numbers'],
      },
      hard: {
        name: 'Khó',
        icon: '🔴',
        color: '#ff7700',
        duration: 100,
        baseHp: 1200,
        hpPerPlayer: 700,
        selfDestructTarget: 900,
        skillInterval: 7.5,
        skillWarningDuration: 1.4,
        shieldDuration: 4.5,
        shieldHpPerPlayer: 60,
        stunDuration: 3.0,
        shakeDuration: 5,
        smokeDuration: 5,
        reverseDuration: 5.5,
        capslockDuration: 5.5,
        skillRates: {
          shield: 30,
          shake: 15,
          smoke: 20,
          reverse: 15,
          capslock: 20,
        },
        allowedPools: ['vi_nodau', 'en', 'numbers', 'fullsize'],
      },
      hell: {
        name: 'Địa ngục',
        icon: '💀',
        color: '#ff0055',
        duration: 85,
        baseHp: 1800,
        hpPerPlayer: 1000,
        selfDestructTarget: 1350,
        skillInterval: 6.0,
        skillWarningDuration: 1.0,
        shieldDuration: 4.0,
        shieldHpPerPlayer: 80,
        stunDuration: 2.5,
        shakeDuration: 5.5,
        smokeDuration: 5.5,
        reverseDuration: 6,
        capslockDuration: 6,
        skillRates: {
          shield: 30,
          shake: 15,
          smoke: 20,
          reverse: 15,
          capslock: 20,
        },
        allowedPools: ['vi_nodau', 'en', 'numbers', 'fullsize'],
      },
    },
  },
};

const BOT_NAMES = [
  { name: 'PhímThần_VN', icon: '⚡', wpm: 75 },
  { name: 'BóngMaTốcĐộ', icon: '🚀', wpm: 90 },
  { name: 'ChiếnBinhGõ', icon: '🥋', wpm: 65 },
  { name: 'TayLướtPhím', icon: '🐯', wpm: 70 },
  { name: 'NinjaCơKhí', icon: '🐱', wpm: 80 },
  { name: 'RồngLửaTốcĐộ', icon: '🐉', wpm: 85 },
  { name: 'ThầnGõPhím', icon: '👑', wpm: 95 },
  { name: 'CơnLốcVàng', icon: '🌪️', wpm: 72 },
  { name: 'PhùThủyCode', icon: '🧙‍♂️', wpm: 78 },
  { name: 'GấuChiếnBinh', icon: '🐼', wpm: 62 },
  { name: 'ĐạiBàngBắcCực', icon: '🦅', wpm: 88 },
  { name: 'BáoĐốmSiêuTốc', icon: '🐆', wpm: 92 },
  { name: 'PhượngHoàngLửa', icon: '🔥', wpm: 84 },
  { name: 'SóiBăngTuyệtKỹ', icon: '🐺', wpm: 76 },
  { name: 'HảiTặcBànPhím', icon: '🏴‍☠️', wpm: 68 },
  { name: 'KiếmSĩÁnhSáng', icon: '⚔️', wpm: 82 },
  { name: 'RobotSiêuThanh', icon: '🤖', wpm: 94 },
  { name: 'ThầnSấmCyber', icon: '🌩️', wpm: 89 },
  { name: 'SưTửBấtBại', icon: '🦁', wpm: 79 },
  { name: 'BóngĐêmHuyềnBí', icon: '🌌', wpm: 86 },
];

export default function App() {
  // User Profile: Persistent across tabs with fallback
  const [username, setUsername] = useState<string>(() => {
    if (typeof window === 'undefined') return 'Tán Tu 100';
    let localUser = localStorage.getItem('fasttyping_user');
    // Tự động chuyển đổi các tiền tố cũ như TayGõ_xxx, NgườiChơi_xxx, Khách_xxx sang Tán Tu xxx
    if (localUser && (localUser.startsWith('TayGõ') || localUser.startsWith('NgườiChơi') || localUser.startsWith('Khách_'))) {
      const numPart = localUser.replace(/\D/g, '') || Math.floor(Math.random() * 900 + 100);
      localUser = `Tán Tu ${numPart}`;
      try {
        localStorage.setItem('fasttyping_user', localUser);
        sessionStorage.setItem('fasttyping_user_session', localUser);
      } catch {}
      return localUser;
    }
    if (localUser) return localUser;
    const sessionUser = sessionStorage.getItem('fasttyping_user_session');
    if (sessionUser && (sessionUser.startsWith('TayGõ') || sessionUser.startsWith('NgườiChơi') || sessionUser.startsWith('Khách_'))) {
      const numPart = sessionUser.replace(/\D/g, '') || Math.floor(Math.random() * 900 + 100);
      const newName = `Tán Tu ${numPart}`;
      try {
        localStorage.setItem('fasttyping_user', newName);
        sessionStorage.setItem('fasttyping_user_session', newName);
      } catch {}
      return newName;
    }
    if (sessionUser) return sessionUser;
    const defaultName = 'Tán Tu ' + Math.floor(Math.random() * 900 + 100);
    try {
      localStorage.setItem('fasttyping_user', defaultName);
      sessionStorage.setItem('fasttyping_user_session', defaultName);
    } catch {}
    return defaultName;
  });
  const [avatar, setAvatar] = useState<string>(() => {
    if (typeof window === 'undefined') return '🤖';
    const localAvatar = localStorage.getItem('fasttyping_avatar');
    if (localAvatar) return localAvatar;
    const sessionAvatar = sessionStorage.getItem('fasttyping_avatar_session');
    if (sessionAvatar) return sessionAvatar;
    const avatarList = ['🦊', '⚡', '🚀', '🔥', '🐯', '🤖', '🎯', '👑', '🐉'];
    const defaultAvatar = avatarList[Math.floor(Math.random() * avatarList.length)];
    try {
      localStorage.setItem('fasttyping_avatar', defaultAvatar);
      sessionStorage.setItem('fasttyping_avatar_session', defaultAvatar);
    } catch {}
    return defaultAvatar;
  });
  const [bestWpm, setBestWpm] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const outplaySaved = localStorage.getItem('fasttyping_outplay_best_record');
      if (outplaySaved) {
        const parsed = JSON.parse(outplaySaved);
        if (parsed && parsed.wpm > 0) return parsed.wpm;
      }
      const outplayWpm = Number(localStorage.getItem('fasttyping_outplay_best_wpm'));
      if (outplayWpm > 0) return outplayWpm;

      const saved = localStorage.getItem('fasttyping_best_wpm_record');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.wpm > 0) return parsed.wpm;
      }
      const generalWpm = Number(localStorage.getItem('fasttyping_best_wpm'));
      if (generalWpm > 0) return generalWpm;
    } catch {}
    return 0;
  });
  const [bestWpmRecord, setBestWpmRecord] = useState<BestWpmRecord | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const outplaySaved = localStorage.getItem('fasttyping_outplay_best_record');
      if (outplaySaved) {
        const parsed = JSON.parse(outplaySaved);
        if (parsed && parsed.wpm > 0) return parsed;
      }
      const saved = localStorage.getItem('fasttyping_best_wpm_record');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.wpm > 0) return parsed;
      }
    } catch {}
    return null;
  });
  const [totalGames, setTotalGames] = useState<number>(() => {
    return Number(localStorage.getItem('fasttyping_games_count')) || 0;
  });

  const [userFrame, setUserFrame] = useState<string>(() => getStoredFrame());

  // Unique Player ID persisted across refreshes, preferring cached authenticated user ID
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'usr_default';
    const cachedUser = getStoredCachedUser();
    if (cachedUser && cachedUser.id) {
      return cachedUser.id;
    }
    let id = localStorage.getItem('fasttyping_player_id') || sessionStorage.getItem('fasttyping_player_id');
    if (!id) {
      id = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
      try {
        localStorage.setItem('fasttyping_player_id', id);
        sessionStorage.setItem('fasttyping_player_id', id);
      } catch {}
    }
    return id;
  });
  const currentUserIdRef = useRef<string>(currentUserId);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Tab ID persistent per tab across F5 reloads via sessionStorage
  const [currentTabId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'tab_default';
    let tid = sessionStorage.getItem('fasttyping_tab_id');
    if (!tid) {
      tid = 'tab_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
      try {
        sessionStorage.setItem('fasttyping_tab_id', tid);
      } catch {}
    }
    return tid;
  });

  // Persistent device ID across all tabs
  const [deviceId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'dev_default';
    try {
      let id = localStorage.getItem('fasttyping_device_id');
      if (!id) {
        id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        localStorage.setItem('fasttyping_device_id', id);
      }
      return id;
    } catch {
      return 'dev_fallback';
    }
  });

  const awardMatchHarvestRef = useRef<any>(null);

  // Session Statistics for Realtime HUD (In-Memory Room Session Tracking - Cleared on room exit or page reload)
  const [conditionStats, setConditionStats] = useState<Record<string, { lastWpm: number; bestWpm: number }>>({});
  const [lastGameWpm, setLastGameWpm] = useState<number>(0);
  const [sessionBestWpm, setSessionBestWpm] = useState<number>(0);

  // Outplay Mode Persistent Settings (Ghost & Pace Mode - Preserved across restarts)
  const [outplayPaceMode, setOutplayPaceMode] = useState<OutplayPaceMode>(() => {
    try {
      const saved = localStorage.getItem('fasttyping_outplay_pacemode');
      if (saved && ['last', 'pb', 'custom', 'off'].includes(saved)) {
        return saved as OutplayPaceMode;
      }
    } catch {}
    return 'last';
  });
  const [outplayCustomWpm, setOutplayCustomWpm] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fasttyping_outplay_custom_wpm');
      return saved ? parseInt(saved, 10) : 80;
    } catch {
      return 80;
    }
  });

  // Game Settings & State
  const [gameMode, setGameMode] = useState<GameMode>('vi_dau');
  const gameModeRef = useRef<GameMode>(gameMode);
  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('normal');
  const difficultyRef = useRef<DifficultyLevel>(difficulty);
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);
  const [playType, setPlayType] = useState<'solo' | 'multiplayer'>('multiplayer');

  // Tông Môn Match Context: Vây Quét Thần Thú hoặc Đại Hội Tỷ Võ
  const [sectMatchNotice, setSectMatchNotice] = useState<string | null>(null);
  const [sectMatchContext, setSectMatchContext] = useState<{
    type: 'sect_boss' | 'sect_tournament';
    sectId: string;
    sectName: string;
    isPractice?: boolean;
    preflightToken?: string;
  } | null>(null);
  const sectMatchContextRef = useRef<{
    type: 'sect_boss' | 'sect_tournament';
    sectId: string;
    sectName: string;
    isPractice?: boolean;
    preflightToken?: string;
  } | null>(null);
  const [sectWarReportData, setSectWarReportData] = useState<SectWarReportData | null>(null);

  // Ban & Penalty Enforcement State (Bàn Cổ Thần Thức)
  const [clientBanStatus, setClientBanStatus] = useState(() => checkClientBanStatus());
  const [isBanModalOpen, setIsBanModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    let lastServerSync = 0;

    const updateBan = async () => {
      const now = Date.now();
      const myUsername = currentUserRef.current?.username || usernameRef.current;
      const myUserId = currentUserRef.current?.id || currentUserIdRef.current;
      const myDisplayName = currentUserRef.current?.displayName || myUsername;

      // Sync with server every 3 seconds if user information exists
      if ((myUsername || myUserId) && now - lastServerSync > 3000) {
        lastServerSync = now;
        try {
          const srvStatus = await syncServerBanStatus(myUsername, myUserId, myDisplayName);
          if (isMounted) {
            setClientBanStatus(checkClientBanStatus());
            return;
          }
        } catch {}
      }

      if (isMounted) {
        setClientBanStatus(checkClientBanStatus());
      }
    };

    updateBan();
    // 1-second interval ensures accurate countdown timer display on homepage
    const interval = setInterval(updateBan, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Hỗ trợ cuộn chuột lăn để cuộn ngang tự động cho toàn bộ tab, thanh điều hướng và vùng cuộn ngang trên website
  useEffect(() => {
    return initGlobalHorizontalWheelScroll();
  }, []);

  // Tự động kiểm tra và nộp bù chiến công ngoại tuyến khi khởi động hoặc khi có mạng lại
  useEffect(() => {
    retryPendingSectContributions().catch(() => {});
    const handleOnline = () => {
      retryPendingSectContributions().catch(() => {});
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Match History state & tracking
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>(() => getStoredMatchHistory());
  const currentMatchRecordedRef = useRef<boolean>(false);
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<XianxiaAchievement[]>([]);

  // Refs for fresh player stats during match conclusion
  const currentUserRef = useRef<UserAccount | null>(null);
  const highScoresRef = useRef<Record<string, HighScoreRecord | null>>({});
  const userFrameRef = useRef<string>('default');
  const usernameRef = useRef<string>('');
  const bestWpmRef = useRef<number>(0);
  const totalGamesRef = useRef<number>(0);

  const recordCurrentMatch = useCallback((data: {
    modeId: string;
    mode?: string;
    subMode?: string;
    difficulty?: string;
    wpm: number;
    accuracy: number;
    result: MatchResult;
    score?: number;
    isCompleted?: boolean;
    durationSeconds?: number;
    totalWords?: number;
    correctChars?: number;
    totalErrors?: number;
    consistency?: number;
    promptWords?: string[];
    wordLogs?: import('./utils/matchHistory').MatchWordLog[];
    keystrokes?: import('./utils/matchHistory').MatchReplayEvent[];
    chartData?: PerformanceChartPoint[];
    maxCombo?: number;
  }) => {
    if (currentMatchRecordedRef.current) return;
    currentMatchRecordedRef.current = true;

    // LOGIC HOÀN THÀNH TRẬN ĐỂ ĐƯỢC TÍNH THÀNH TỰU VÀ THƯỞNG TU VI:
    // Người chơi phải hoàn thành toàn bộ trận thi đấu mới được tính là hoàn thành và được tính thành tựu, thưởng tu vi.
    // Đầu hàng, out phòng sớm ở chế độ multiplayer và đầu hàng cùng reset trong trận ở chế độ solo
    // TUYỆT ĐỐI không được tính là hoàn thành trận đấu, KHÔNG được thưởng tu vi và KHÔNG được tính vào thành tựu.
    const isActuallyCompleted = data.isCompleted === true && data.result !== 'Đầu hàng' && data.result !== 'AFK';

    const newRecord = addMatchRecord({
      mode: data.mode || getFriendlyModeName(data.modeId),
      modeId: data.modeId,
      subMode: data.subMode,
      difficulty: data.difficulty || difficulty,
      wpm: data.wpm,
      accuracy: data.accuracy,
      result: data.result,
      score: data.score,
      playType,
      isCompleted: isActuallyCompleted,
      durationSeconds: data.durationSeconds,
      totalWords: data.totalWords,
      correctChars: data.correctChars,
      totalErrors: data.totalErrors,
      consistency: data.consistency,
      promptWords: data.promptWords,
      wordLogs: data.wordLogs,
      keystrokes: data.keystrokes,
      chartData: data.chartData
        ? data.chartData.map((p) => ({
            second: p.second,
            wpm: (p as any).wpm ?? (p as any).playerWpm ?? 0,
            errors: p.errors,
          }))
        : undefined,
    });
    setMatchHistory((prev) => [newRecord, ...prev.filter((m) => m.id !== newRecord.id)].slice(0, 20));

    // Cập nhật Tu Vi và nhiệm vụ hàng ngày KHI VÀ CHỈ KHI hoàn thành toàn bộ trận đấu VÀ người chơi ĐÃ ĐĂNG NHẬP
    // QUY TẮC: Chế độ Tán Tu (chưa đăng nhập) TUYỆT ĐỐI KHÔNG ĐƯỢC THƯỞNG TU VI, LINH THẠCH HAY DƯỢC LIỆU
    const userNow = currentUserRef.current;
    if (isActuallyCompleted && userNow) {
      const currentList = playersRef.current && playersRef.current.length > 0 ? playersRef.current : players;
      awardMatchHarvestRef.current?.({
        modeId: data.modeId,
        wpm: data.wpm,
        accuracy: data.accuracy,
        score: data.score,
        maxCombo: data.maxCombo,
        currentUser: userNow,
        players: currentList,
        friendsList,
      });
    } else {
      // Tán Tu không được nhận bất kỳ thu hoạch tu tiên hay vật phẩm nào
      setCultivationMatchHarvest(null);
    }

    // KIỂM TRA VÀ BẬT THÔNG BÁO THÀNH TỰU TIÊN HIỆP MỚI NGAY KHI VỪA KẾT THÚC TRẬN ĐẤU:
    // QUY TẮC BẮT BUỘC:
    // 1. Chỉ người chơi ĐÃ ĐĂNG NHẬP (userNow !== null) mới được tính thành tựu.
    // 2. Trận đấu PHẢI THỰC SỰ HOÀN THÀNH (isActuallyCompleted === true).
    // Nếu đầu hàng, out phòng hoặc là Tán Tu: TUYỆT ĐỐI KHÔNG TÍNH THÀNH TỰU VÀ KHÔNG TĂNG SỐ TRẬN HOÀN THÀNH.
    if (userNow) {
      try {
        const nextTotalGames = isActuallyCompleted ? (totalGamesRef.current || 0) + 1 : (totalGamesRef.current || 0);
        const nextBestWpm = isActuallyCompleted ? Math.max(bestWpmRef.current || 0, data.wpm || 0) : (bestWpmRef.current || 0);

        if (isActuallyCompleted) {
          const newUnlocks = checkNewAchievementsOnMatchEnd({
            bestWpm: nextBestWpm,
            totalGames: nextTotalGames,
            username: usernameRef.current || userNow.username,
            frame: userFrameRef.current || userNow.frame || 'default',
            isLoggedIn: true,
            isAdmin: Boolean(userNow.isAdmin || isAdmin),
            userId: userNow.id,
            matchHistory: [newRecord, ...matchHistory],
            highScores: highScoresRef.current || {},
            roomPlayerCount: playersRef.current?.length || 1,
            initialUnlocked: userNow.unlockedAchievements || [],
            cultivationLevel: cultivationStateRef.current?.level || cultivationState.level,
            cultivationRealmIndex: cultivationStateRef.current?.realmIndex || cultivationState.realmIndex,
            cultivationState: cultivationStateRef.current || cultivationState,
            onlineSeconds: getAccountOnlineSeconds(userNow.id) || userNow.totalOnlineSeconds || 0,
            friendsList: friendsList,
            isMatchCompleted: true,
          });

          if (newUnlocks && newUnlocks.length > 0) {
            setNewlyUnlockedAchievements(newUnlocks);

            // Cập nhật và lưu lại danh sách thành tựu đã mở lên tài khoản người chơi
            const allUnlockedIds = Array.from(
              new Set([
                ...(userNow.unlockedAchievements || []),
                ...newUnlocks.map((a) => a.id),
              ])
            );
            setCurrentUser((prev) =>
              prev ? { ...prev, unlockedAchievements: allUnlockedIds } : prev
            );
            updateUserProfile({ unlockedAchievements: allUnlockedIds }).catch(() => {});
          }
        } else {
          // Trận đấu chưa hoàn thành / đầu hàng / out phòng: đảm bảo không có thành tựu mới nào được bật
          setNewlyUnlockedAchievements([]);
        }

        // Tự động đồng bộ số trận, kỷ lục WPM và lịch sử đấu lên tài khoản máy chủ
        const updatedHistory = [newRecord, ...matchHistory].slice(0, 50);
        const allTimeBestWpm = Math.max(bestWpmRef.current || 0, bestWpm, nextBestWpm, data.wpm || 0);
        let bestRecordToSave: any = bestWpmRecord || null;
        if (isActuallyCompleted && (data.wpm >= allTimeBestWpm || !bestRecordToSave)) {
          bestRecordToSave = {
            wpm: Math.max(data.wpm, allTimeBestWpm),
            mode: data.mode || getFriendlyModeName(data.modeId),
            modeName: getFriendlyModeName(data.modeId),
            timestamp: Date.now(),
          };
        }
        updateUserProfile({
          bestWpm: allTimeBestWpm,
          ...(bestRecordToSave ? { bestWpmRecord: bestRecordToSave } : {}),
          totalGames: nextTotalGames,
          matchHistory: updatedHistory,
        }).catch(() => {});
      } catch (err) {
        console.error('Lỗi kiểm tra thành tựu sau trận:', err);
      }
    } else {
      // Người chơi chưa đăng nhập: Tuyệt đối không tính thành tựu
      setNewlyUnlockedAchievements([]);
    }
  }, [playType, matchHistory]);
  const [gameState, setGameState] = useState<'lobby' | 'waiting_room' | 'countdown' | 'playing' | 'gameover'>(() => {
    if (typeof window === 'undefined') return 'lobby';
    const savedRoom = sessionStorage.getItem('fasttyping_current_room_id');
    const savedState = sessionStorage.getItem('fasttyping_game_state');
    if (savedRoom && savedState === 'waiting_room') {
      return 'waiting_room';
    }
    return 'lobby';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (gameState === 'waiting_room') {
      sessionStorage.setItem('fasttyping_game_state', 'waiting_room');
    } else {
      sessionStorage.removeItem('fasttyping_game_state');
    }
  }, [gameState]);
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundFx.getMuted());
  const [config, setConfig] = useState<GameConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try {
      const saved = localStorage.getItem('fasttyping_game_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        const needsDiacriticsMigration = !parsed._migratedNoDiacriticsDefault_v1;
        const needsBossHpMigration = !parsed._migratedBossHp_v2;

        const sanitizePools = (pools: import('./types').WordPoolType[] | undefined, defaultPools: import('./types').WordPoolType[]) => {
          if (!pools) return defaultPools;
          if (needsDiacriticsMigration) {
            const filtered = pools.filter((p) => p !== 'vi_dau');
            return filtered.length > 0 ? filtered : defaultPools;
          }
          return pools;
        };

        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          _migratedNoDiacriticsDefault_v1: true,
          _migratedBossHp_v2: true,
          sanBoss: {
            difficulties: {
              normal: {
                ...DEFAULT_CONFIG.sanBoss.difficulties.normal,
                ...((!needsBossHpMigration && parsed.sanBoss?.difficulties?.normal) || {}),
                baseHp: 800,
                hpPerPlayer: 500,
                shieldHpPerPlayer: 60,
                selfDestructTarget: 600,
                allowedPools: sanitizePools(
                  parsed.sanBoss?.difficulties?.normal?.allowedPools,
                  DEFAULT_CONFIG.sanBoss.difficulties.normal.allowedPools || ['vi_nodau', 'en', 'numbers']
                ),
              },
              hard: {
                ...DEFAULT_CONFIG.sanBoss.difficulties.hard,
                ...((!needsBossHpMigration && parsed.sanBoss?.difficulties?.hard) || {}),
                baseHp: 1200,
                hpPerPlayer: 700,
                shieldHpPerPlayer: 60,
                selfDestructTarget: 900,
                allowedPools: sanitizePools(
                  parsed.sanBoss?.difficulties?.hard?.allowedPools,
                  DEFAULT_CONFIG.sanBoss.difficulties.hard.allowedPools || ['vi_nodau', 'en', 'numbers', 'fullsize']
                ),
              },
              hell: {
                ...DEFAULT_CONFIG.sanBoss.difficulties.hell,
                ...((!needsBossHpMigration && parsed.sanBoss?.difficulties?.hell) || {}),
                baseHp: 1800,
                hpPerPlayer: 1000,
                shieldHpPerPlayer: 80,
                selfDestructTarget: 1350,
                allowedPools: sanitizePools(
                  parsed.sanBoss?.difficulties?.hell?.allowedPools,
                  DEFAULT_CONFIG.sanBoss.difficulties.hell.allowedPools || ['vi_nodau', 'en', 'numbers', 'fullsize']
                ),
              },
            },
          },
          ngauHung: {
            difficulties: {
              normal: {
                ...DEFAULT_CONFIG.ngauHung.difficulties.normal,
                ...(parsed.ngauHung?.difficulties?.normal || {}),
                allowedPools: sanitizePools(
                  parsed.ngauHung?.difficulties?.normal?.allowedPools,
                  DEFAULT_CONFIG.ngauHung.difficulties.normal.allowedPools || ['vi_nodau', 'en', 'numbers']
                ),
              },
              legendary: {
                ...DEFAULT_CONFIG.ngauHung.difficulties.legendary,
                ...(parsed.ngauHung?.difficulties?.legendary || {}),
                allowedPools: sanitizePools(
                  parsed.ngauHung?.difficulties?.legendary?.allowedPools,
                  DEFAULT_CONFIG.ngauHung.difficulties.legendary.allowedPools || ['vi_nodau', 'en', 'numbers', 'fullsize']
                ),
              },
            },
          },
          doanChu: {
            difficulties: {
              normal: {
                ...DEFAULT_CONFIG.doanChu.difficulties.normal,
                ...(parsed.doanChu?.difficulties?.normal || {}),
                allowedPools: sanitizePools(
                  parsed.doanChu?.difficulties?.normal?.allowedPools,
                  DEFAULT_CONFIG.doanChu.difficulties.normal.allowedPools || ['vi_nodau']
                ),
              },
              hard: {
                ...DEFAULT_CONFIG.doanChu.difficulties.hard,
                ...(parsed.doanChu?.difficulties?.hard || {}),
                allowedPools: sanitizePools(
                  parsed.doanChu?.difficulties?.hard?.allowedPools,
                  DEFAULT_CONFIG.doanChu.difficulties.hard.allowedPools || ['vi_nodau', 'en']
                ),
              },
              legendary: {
                ...DEFAULT_CONFIG.doanChu.difficulties.legendary,
                ...(parsed.doanChu?.difficulties?.legendary || {}),
                allowedPools: sanitizePools(
                  parsed.doanChu?.difficulties?.legendary?.allowedPools,
                  DEFAULT_CONFIG.doanChu.difficulties.legendary.allowedPools || ['en', 'numbers']
                ),
              },
            },
          },
        };
      }
    } catch {
      // fallback to DEFAULT_CONFIG
    }
    return DEFAULT_CONFIG;
  });

  useEffect(() => {
    try {
      localStorage.setItem('fasttyping_game_config', JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  // Active match data
  const [words, setWords] = useState<string[]>([]);
  const [mysteryWords, setMysteryWords] = useState<MysteryWordItem[]>([]);
  const [bossState, setBossState] = useState<BossState | null>(null);
  const [isBossVictory, setIsBossVictory] = useState<boolean>(false);
  const [ngauHungStats, setNgauHungStats] = useState<NgauHungGameStats | null>(null);
  const [mysteryWordStats, setMysteryWordStats] = useState<MysteryWordGameStats | null>(null);
  const [bossBattleStats, setBossBattleStats] = useState<BossBattleStats | null>(null);

  // Modals
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMatchHistoryOpen, setIsMatchHistoryOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'achievements'>('profile');
  const [isOnlineUsersOpen, setIsOnlineUsersOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'register'>('login');
  const [isFriendsOpen, setIsFriendsOpen] = useState<boolean>(false);
  const [friendsInitialTab, setFriendsInitialTab] = useState<'friends' | 'requests' | 'search' | 'daolu'>('friends');
  const [friendRequestsCount, setFriendRequestsCount] = useState<number>(0);
  const [friendsList, setFriendsList] = useState<FriendRecord[]>([]);
  const [friendInviteToast, setFriendInviteToast] = useState<{
    id: string;
    type: 'room_invite' | 'friend_request' | 'friend_request_accepted' | 'tea_gift' | 'guidance' | 'daolu';
    fromUser?: any;
    fromName?: string;
    roomId?: string;
    mode?: string;
    tuViBonus?: number;
    message?: string;
    friendshipId?: string;
  } | null>(null);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getStoredCachedUser());
  const [isAdmin, setIsAdmin] = useState<boolean>(() => checkIsAdmin() || Boolean(getStoredCachedUser()?.isAdmin));
  const [isHeavenlyChronicleOpen, setIsHeavenlyChronicleOpen] = useState(false);
  const [activeDaoDecreePopup, setActiveDaoDecreePopup] = useState<HeavenlyDaoDecree | null>(null);
  const [breakingRecordNotice, setBreakingRecordNotice] = useState<{
    username: string;
    displayName: string;
    mode: string;
    modeName: string;
    wpm: number;
    score: number;
    timestamp: number;
  } | null>(null);

  // 1. CULTIVATION ENGINE (Hệ thống Tu Tiên & Thăng Hoa Cảnh Giới)
  const {
    cultivationState,
    setCultivationState,
    cultivationStateRef,
    isCultivationOpen,
    setIsCultivationOpen,
    isTribulationOpen,
    setIsTribulationOpen,
    cultivationMatchHarvest,
    setCultivationMatchHarvest,
    awardMatchHarvest,
    addDirectTuVi,
    openCultivation,
    closeCultivation,
    openTribulation,
    closeTribulation,
  } = useCultivationEngine({
    onBreakthroughNotice: (dec) => setActiveDaoDecreePopup(dec),
  });
  awardMatchHarvestRef.current = awardMatchHarvest;
  const [cultivationInitialTab, setCultivationInitialTab] = useState<'overview' | 'alchemy' | 'artifacts' | 'sects' | 'van_bao_cac' | 'phuong_thi' | 'checkin' | 'quests' | 'realms' | 'history'>('overview');

  // Me player factory for room & multiplayer synchronization
  const createMePlayer = useCallback((): Player => {
    const realm = XIANXIA_REALMS[cultivationState.realmIndex] || XIANXIA_REALMS[0];
    return {
      id: currentUserId,
      username: username,
      icon: avatar,
      frame: userFrame,
      showcaseAchievements: currentUser ? (currentUser.showcaseAchievements || getShowcaseAchievements()) : [],
      cultivation: currentUser ? {
        level: cultivationState.level,
        realmIndex: cultivationState.realmIndex,
        tier: cultivationState.tier,
        realmName: realm.name,
        subStage: getSubStage(cultivationState.tier),
        thoNguyen: cultivationState.thoNguyen,
        maxThoNguyen: cultivationState.maxThoNguyen,
      } : undefined,
      bestWpm: bestWpm,
      bestWpmRecord: bestWpmRecord || undefined,
      totalGames: totalGames,
      progress: 0,
      wpm: 0,
      score: 0,
      errors: 0,
      correctChars: 0,
      isFinished: false,
      isSurrendered: false,
      isAFK: false,
    };
  }, [currentUserId, username, avatar, userFrame, bestWpm, bestWpmRecord, totalGames, currentUser, cultivationState]);

  // Ref for launching game callback to avoid circular reference
  const handleLaunchGameRef = useRef<any>(null);

  // Live Friend Events Listener callback shared by Room Engine, Global Chat & WebSocket/SSE
  const handleLiveFriendEvent = useCallback((ev: any) => {
    if (!ev) return;
    if (ev.type === 'friend_requests_count') {
      setFriendRequestsCount(ev.count || 0);
    } else if (ev.type === 'friend_request_received') {
      setFriendRequestsCount((prev) => prev + 1);
      setFriendInviteToast({
        id: `fr_${Date.now()}`,
        type: 'friend_request',
        fromUser: ev.fromUser,
        message: ev.message,
      });
      soundFx.playKeyClick();
      const activeUid = currentUserRef.current?.id || currentUserId;
      const activeName = currentUserRef.current?.username || username;
      if (activeUid) {
        fetchFriendsList(activeUid, activeName).then((res) => {
          if (res && res.success) {
            if (Array.isArray(res.friends) && res.friends.length > 0) {
              setFriendsList(res.friends);
            }
            setFriendRequestsCount(res.pendingRequests?.length || 0);
          }
        }).catch(() => {});
      }
    } else if (ev.type === 'friend_request_accepted') {
      soundFx.playVictory();
      setFriendInviteToast({
        id: `fa_${Date.now()}`,
        type: 'friend_request_accepted',
        fromName: ev.friendName || 'Đạo Hữu',
      });
      const activeUid = currentUserRef.current?.id || currentUserId;
      const activeName = currentUserRef.current?.username || username;
      if (activeUid) {
        fetchFriendsList(activeUid, activeName).then((res) => {
          if (res && res.success) {
            if (Array.isArray(res.friends) && res.friends.length > 0) {
              setFriendsList(res.friends);
            }
            setFriendRequestsCount(res.pendingRequests?.length || 0);
          }
        }).catch(() => {});
      }
    } else if (ev.type === 'friends_data_updated') {
      const activeUid = currentUserRef.current?.id || currentUserId;
      const activeName = currentUserRef.current?.username || username;
      if (activeUid) {
        fetchFriendsList(activeUid, activeName).then((res) => {
          if (res && res.success) {
            if (Array.isArray(res.friends) && res.friends.length > 0) {
              setFriendsList(res.friends);
            }
            if (typeof ev.count === 'number') {
              setFriendRequestsCount(ev.count);
            } else if (Array.isArray(res.pendingRequests)) {
              setFriendRequestsCount(res.pendingRequests.length);
            }
          }
        }).catch(() => {});
      }
    } else if (ev.type === 'room_invite') {
      setFriendInviteToast({
        id: `ri_${Date.now()}`,
        type: 'room_invite',
        fromUser: ev.fromUser,
        roomId: ev.roomId,
        mode: ev.mode,
      });
      soundFx.playWhisperPing();
    } else if (ev.type === 'tea_gift_received') {
      if (currentUserRef.current) {
        const bonus = ev.tuViBonus || 50;
        setFriendInviteToast({
          id: `tg_${Date.now()}`,
          type: 'tea_gift',
          fromName: ev.fromName || 'Đạo Hữu',
          tuViBonus: bonus,
        });
        addDirectTuVi(bonus);
        soundFx.playVictory();
      }
    } else if (ev.type === 'mentor_guidance_received') {
      if (currentUserRef.current) {
        const bonus = ev.tuViBonus || 30;
        setFriendInviteToast({
          id: `mg_${Date.now()}`,
          type: 'guidance',
          fromName: ev.fromName || 'Tiền Bối',
          tuViBonus: bonus,
        });
        addDirectTuVi(bonus);
        soundFx.playVictory();
      }
    } else if (ev.type === 'daolu_proposal_received') {
      setFriendInviteToast({
        id: `dl_${Date.now()}`,
        type: 'daolu',
        fromName: ev.fromName || 'Đạo Hữu',
        friendshipId: ev.friendshipId,
      });
      soundFx.playVictory();
    } else if (ev.type === 'daolu_ceremony_complete') {
      soundFx.playVictory();
    }
  }, [currentUserId, username, addDirectTuVi]);

  // 2. ROOM ENGINE (Hệ thống Phòng thi đấu & WebSocket/SSE)
  const {
    currentRoomId,
    setCurrentRoomId,
    isRoomHost,
    setIsRoomHost,
    isJoinModalOpen,
    setIsJoinModalOpen,
    targetJoinMode,
    setTargetJoinMode,
    kickedNotice,
    setKickedNotice,
    players,
    setPlayers,
    playersRef,
    currentMatchIdRef,
    metaRef,
    handleCreateRoom: engineCreateRoom,
    handleJoinExistingRoom: engineJoinRoom,
    handleQuickJoinRoom: engineQuickJoinRoom,
    handleLeaveRoom,
    handleAddBot,
    handleRemoveBot,
    handleTransferHost,
    handleKickPlayer,
    sendProgress,
    updatePlayers,
  } = useRoomEngine({
    currentUserId,
    currentUser,
    username,
    avatar,
    userFrame,
    bestWpm,
    bestWpmRecord,
    totalGames,
    isAdmin,
    deviceId,
    currentTabId,
    gameState,
    gameMode,
    difficulty,
    createMePlayer,
    onGameStateChange: setGameState,
    onGameModeChange: setGameMode,
    onDifficultyChange: (diff) => {
      setDifficulty(diff);
      difficultyRef.current = diff;
    },
    onChatMessage: (msg) => appendChatMessage(msg),
    onRecordMatch: (data) => recordCurrentMatch(data),
    onLaunchGame: (isSolo, mode, words, mystery, matchId) => {
      handleLaunchGameRef.current?.(isSolo, mode, words, mystery, matchId);
    },
    onBossVictoryChange: setIsBossVictory,
    onFriendEvent: handleLiveFriendEvent,
  });

  // 3. CHAT ENGINE (Hệ thống Chat đa kênh & Tin nhắn mật đàm)
  const {
    chatMessages,
    setChatMessages,
    isChatOpen,
    setIsChatOpen,
    activeChannel: chatInitialChannel,
    setActiveChannel: setChatInitialChannel,
    whisperTargetUser: chatWhisperTarget,
    setWhisperTargetUser: setChatWhisperTarget,
    unreadChatCount,
    setUnreadChatCount,
    appendChatMessage,
    handleSendMessage,
    openWhisperWith,
    openChat,
    closeChat,
    toggleChat,
    fetchChannelMessages,
  } = useChatEngine({
    currentUsername: currentUser?.displayName || currentUser?.username || username,
    currentUserAvatar: avatar,
    currentUserFrame: userFrame,
    currentUserId: currentUser?.id || currentUserId,
    currentRealmName: XIANXIA_REALMS[cultivationState.realmIndex]?.name,
    currentRealmIcon: XIANXIA_REALMS[cultivationState.realmIndex]?.icon,
    currentSectId: cultivationState?.sectId,
    currentSectTag: cultivationState?.sectTag,
    currentRoomId,
    isAdmin,
  });

  // Đồng bộ danh sách Đạo Hữu và thông tin Đạo Lữ (hỗ trợ cả tài khoản và Tán Tu thông qua currentUserId)
  useEffect(() => {
    const activeUid = currentUser?.id || currentUserId;
    const activeName = currentUser?.username || username;
    if (activeUid) {
      fetchFriendsList(activeUid, activeName).then((res) => {
        if (res && res.success) {
          if (res.friends) setFriendsList(res.friends);
          setFriendRequestsCount(res.pendingRequests ? res.pendingRequests.length : 0);
        }
      }).catch(() => {});
    }
  }, [currentUser, currentUserId, username, isFriendsOpen]);

  // Theo dõi thời gian online / tọa thiền của tài khoản trên website (Động Phủ Tọa Thiền)
  useEffect(() => {
    if (!currentUser?.id) return;
    const userId = currentUser.id;

    if (currentUser.totalOnlineSeconds && getAccountOnlineSeconds(userId) === 0) {
      saveAccountOnlineSeconds(currentUser.totalOnlineSeconds, userId);
    }

    let accumulatedUnsyncedSeconds = 0;

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;

      const updated = addAccountOnlineSeconds(10, userId);
      accumulatedUnsyncedSeconds += 10;

      // Đồng bộ lên server mỗi 60 giây
      if (accumulatedUnsyncedSeconds >= 60) {
        accumulatedUnsyncedSeconds = 0;
        updateUserProfile({ totalOnlineSeconds: updated }).catch(() => {});
        setCurrentUser((prev) => (prev && prev.id === userId ? { ...prev, totalOnlineSeconds: updated } : prev));
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Lắng nghe Thiên Đạo Chiếu Thư theo thời gian thực
  useEffect(() => {
    const unsub = subscribeToDaoDecrees((decree) => {
      if (!decree) return;
      const curUser = currentUserRef.current;
      const myUid = String(curUser?.id || currentUserIdRef.current || '').toLowerCase().trim();
      const myUsername = String(curUser?.username || '').toLowerCase().trim().replace(/^@/, '');
      const myDisp = String(curUser?.displayName || usernameRef.current || '').toLowerCase().trim().replace(/^@/, '');
      const myCurrentName = String(usernameRef.current || '').toLowerCase().trim().replace(/^@/, '');

      const targetRaw = String(decree.targetUser || '').toLowerCase().trim().replace(/^@/, '');

      const isTargetMe =
        Boolean(targetRaw) &&
        (
          (myUsername && targetRaw === myUsername) ||
          (myDisp && targetRaw === myDisp) ||
          (myCurrentName && targetRaw === myCurrentName) ||
          (myUid && targetRaw === myUid)
        );

      if (isTargetMe) {
        if (decree.eventType === 'penalty') {
          const reason = decree.content || 'Bàn Cổ Thần Thức phát hiện bất thường tốc độ gõ phím / Nghi vấn Auto Macro';
          saveStoredBanInfo(Date.now() + 2 * 60 * 60 * 1000, reason);
          const newStatus = checkClientBanStatus();
          setClientBanStatus(newStatus);
          setIsBanModalOpen(true);
          soundFx.playError();
          handleReturnToLobby();
        } else if (
          decree.eventType === 'breakthrough' ||
          decree.eventType === 'record' ||
          decree.eventType === 'boss_kill'
        ) {
          setActiveDaoDecreePopup(decree);
        }
      }
    });
    return () => unsub();
  }, []);

  // Real Online Presence & Server-wide Leaderboard (Zero mock data, backed by IndexedDB)
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [highScores, setHighScores] = useState<Record<string, HighScoreRecord | null>>(() => {
    return getLeaderboardSync();
  });

  // Background migration from localStorage to IndexedDB and fetch latest data
  useEffect(() => {
    migrateLegacyLocalStorageToIndexedDB().then(() => {
      getLeaderboardFromIndexedDB().then((idbScores) => {
        if (idbScores) {
          setHighScores((prev) => {
            const hasPrev = Object.values(prev).some((r) => r !== null && r !== undefined);
            const hasIdb = Object.values(idbScores).some((r) => r !== null && r !== undefined);
            if (!hasIdb && hasPrev) return prev;
            return idbScores;
          });
        }
      });
    });
  }, []);

  // Tự động đồng bộ và khôi phục kỷ lục WPM chi tiết cho mọi chế độ chơi (Tuyệt đối không bao giờ làm giảm kỷ lục)
  useEffect(() => {
    const resolved = resolveBestWpmRecord({
      bestWpm,
      bestWpmRecord,
      highScores,
      matchHistory,
      username,
      isMe: true,
    });
    if (resolved && resolved.wpm > 0) {
      if (resolved.wpm > bestWpm || (!bestWpmRecord && resolved.wpm >= bestWpm)) {
        setBestWpmRecord(resolved);
        setBestWpm(resolved.wpm);
        bestWpmRef.current = resolved.wpm;
        try {
          localStorage.setItem('fasttyping_best_wpm', resolved.wpm.toString());
          localStorage.setItem('fasttyping_best_wpm_record', JSON.stringify(resolved));
          if (isOutplayMode(resolved.mode)) {
            localStorage.setItem('fasttyping_outplay_best_wpm', resolved.wpm.toString());
            localStorage.setItem('fasttyping_outplay_best_record', JSON.stringify(resolved));
          }
        } catch {}
      }
    }
  }, [bestWpm, bestWpmRecord, highScores, username, matchHistory]);

  // Realtime Global Chat, Presence & Server Leaderboard Synchronization (WebSocket / SSE)
  useEffect(() => {
    const unsubscribeGlobalChat = subscribeToGlobalChat(
      (newMsg) => {
        appendChatMessage(newMsg);
      },
      () => {
        setChatMessages((prev) => prev.filter((m) => m.channel !== 'global'));
      },
      (count) => {
        setOnlineCount(count);
      },
      (serverRecords) => {
        if (!serverRecords) return;
        setHighScores((prev) => {
          const hasNew = Object.values(serverRecords).some((r) => r !== null && r !== undefined);
          const hasPrev = Object.values(prev).some((r) => r !== null && r !== undefined);
          if (!hasNew && hasPrev) {
            return prev;
          }
          saveLeaderboardToIndexedDB(serverRecords).catch(() => {});
          return serverRecords;
        });
      },
      currentUser?.id || currentUserId,
      currentTabId,
      () => metaRef.current,
      handleLiveFriendEvent,
      (record: any) => {
        if (!record) return;
        soundFx.playVictory();
        setBreakingRecordNotice(record);
        setTimeout(() => {
          setBreakingRecordNotice((prev) => (prev && prev.timestamp === record.timestamp ? null : prev));
        }, 14000);
      }
    );
    return () => {
      unsubscribeGlobalChat();
    };
  }, [appendChatMessage, currentUserId, currentUser, currentTabId, metaRef, setChatMessages, handleLiveFriendEvent]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  useEffect(() => {
    highScoresRef.current = highScores;
  }, [highScores]);
  useEffect(() => {
    userFrameRef.current = userFrame;
  }, [userFrame]);
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);
  useEffect(() => {
    bestWpmRef.current = bestWpm;
  }, [bestWpm]);
  useEffect(() => {
    totalGamesRef.current = totalGames;
  }, [totalGames]);

  useEffect(() => {
    initThemeAndFont();
  }, []);

  // Global Escape key listener: quickly closes any active modal, panel, or drawer
  useEffect(() => {
    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      // Close open modals/drawers in top-to-bottom priority
      if (isFriendsOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsFriendsOpen(false);
        return;
      }
      if (isChatOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsChatOpen(false);
        return;
      }
      if (isJoinModalOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsJoinModalOpen(false);
        return;
      }
      if (isAuthModalOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsAuthModalOpen(false);
        return;
      }
      if (isOnlineUsersOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsOnlineUsersOpen(false);
        return;
      }
      if (isAppearanceOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsAppearanceOpen(false);
        return;
      }
      if (isCultivationOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsCultivationOpen(false);
        return;
      }
      if (isLeaderboardOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsLeaderboardOpen(false);
        return;
      }
      if (isAdminOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsAdminOpen(false);
        return;
      }
      if (isProfileOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsProfileOpen(false);
        return;
      }
      if (kickedNotice) {
        e.preventDefault();
        setKickedNotice(null);
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalEscape, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalEscape, true);
    };
  }, [
    isChatOpen,
    isJoinModalOpen,
    isAuthModalOpen,
    isOnlineUsersOpen,
    isAppearanceOpen,
    isCultivationOpen,
    isLeaderboardOpen,
    isAdminOpen,
    isProfileOpen,
    isFriendsOpen,
    kickedNotice,
  ]);

  // Phím tắt toàn năng (Power-user Shortcuts: Ctrl+K / F2 mở Sổ Tay Đạo Hữu, Enter mở Chat ở Sảnh Chờ)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // 1. Ctrl + K hoặc F2: Bật nhanh Sổ Tay Đạo Hữu
      if ((e.key === 'F2' || ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K'))) && !e.shiftKey) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsFriendsOpen((prev) => !prev);
        return;
      }

      // 2. Ctrl + Enter: Mở nhanh khung chat khi đang ở sảnh chờ hoặc phòng chờ
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isInput && (gameState === 'lobby' || gameState === 'waiting_room')) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsChatOpen(true);
        setTimeout(() => {
          document.getElementById('input-chat-message')?.focus();
        }, 80);
        return;
      }

      // 3. Enter (không giữ phím Ctrl/Cmd/Alt): Bắt đầu trận đấu nhanh khi đang ở phòng chờ (Chủ phòng)
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey && !isInput && gameState === 'waiting_room' && isRoomHost) {
        e.preventDefault();
        soundFx.playCountdown(true);
        handleLaunchGame(false);
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, [gameState]);

  // Handle Mode Change
  const handleSelectMode = (newMode: GameMode) => {
    soundFx.playKeyClick();
    setGameMode(newMode);
    gameModeRef.current = newMode;
    const defaultDiff = newMode === 'numpad' ? 'number' : 'normal';
    setDifficulty(defaultDiff);
    difficultyRef.current = defaultDiff;
    if (newMode === 'outplay') {
      setPlayType('solo');
    } else {
      setPlayType('multiplayer');
    }
    // Clean bots if new mode does not support bots
    if (newMode === 'ngau_hung' || newMode === 'doan_chu' || newMode === 'san_boss') {
      setPlayers((prev) => {
        const humanOnly = prev.filter((p) => !p.isBot);
        if (currentRoomId && humanOnly.length !== prev.length) {
          updateRoomPlayers(currentRoomId, humanOnly);
        }
        return humanOnly;
      });
    }
    if (currentRoomId && isRoomHost) {
      updateRoomMode(currentRoomId, newMode, defaultDiff);
    }
  };

  // Handle Difficulty Change (Host configuration & room synchronization)
  const handleSelectDifficulty = (newDiff: DifficultyLevel) => {
    soundFx.playKeyClick();
    setDifficulty(newDiff);
    difficultyRef.current = newDiff;
    if (currentRoomId && isRoomHost) {
      updateRoomDifficulty(currentRoomId, newDiff);
    }
  };

  // Trigger modal when user selects a multiplayer mode
  const handleJoinWaitingRoom = (modeOverride?: GameMode) => {
    const ban = checkClientBanStatus();
    if (ban.isBanned) {
      setClientBanStatus(ban);
      setIsBanModalOpen(true);
      soundFx.playError();
      return;
    }
    const chosenMode = modeOverride || gameMode;
    soundFx.playKeyClick();
    handleSelectMode(chosenMode);
    setTargetJoinMode(chosenMode);
    setIsJoinModalOpen(true);
  };

  // Modal Action 1: Tạo phòng mới
  const handleModalCreateNewRoom = async (mode: GameMode) => {
    const ban = checkClientBanStatus();
    if (ban.isBanned) {
      setClientBanStatus(ban);
      setIsBanModalOpen(true);
      soundFx.playError();
      return;
    }
    await engineCreateRoom(mode, difficulty);
    setGameMode(mode);
    setPlayType('multiplayer');
    setGameState('waiting_room');
    setIsJoinModalOpen(false);
  };

  // Modal Action 2: Vào phòng đã có bằng mã
  const handleModalJoinExistingRoom = async (code: string, mode: GameMode) => {
    const ban = checkClientBanStatus();
    if (ban.isBanned) {
      setClientBanStatus(ban);
      setIsBanModalOpen(true);
      soundFx.playError();
      return { success: false, error: `Tài khoản đang chịu án phạt từ Bàn Cổ Thần Thức (${ban.formatted}).` };
    }
    const result = await engineJoinRoom(code, mode);
    if (!result.success || !result.room) {
      return { success: false, error: result.error || 'Phòng không tồn tại hoặc không thể tham gia.' };
    }
    setGameMode(result.room.mode as GameMode);
    if (result.room.difficulty) {
      const diff = result.room.difficulty as DifficultyLevel;
      setDifficulty(diff);
      difficultyRef.current = diff;
    }
    setPlayType('multiplayer');
    setGameState('waiting_room');
    setIsJoinModalOpen(false);
    return { success: true };
  };

  // Modal Action 3: Vào phòng nhanh (tự động ghép hoặc tạo mới)
  const handleModalQuickJoinRoom = async (mode: GameMode) => {
    const ban = checkClientBanStatus();
    if (ban.isBanned) {
      setClientBanStatus(ban);
      setIsBanModalOpen(true);
      soundFx.playError();
      return;
    }
    const result = await engineQuickJoinRoom(mode, difficulty);
    setGameMode(result.room.mode as GameMode);
    if (result.room.difficulty) {
      const diff = result.room.difficulty as DifficultyLevel;
      setDifficulty(diff);
      difficultyRef.current = diff;
    }
    setPlayType('multiplayer');
    setGameState('waiting_room');
    setIsJoinModalOpen(false);
  };

  // Launch Game Core (Countdown -> Playing)
  const handleLaunchGame = (
    isSoloOverride?: boolean,
    modeOverride?: GameMode,
    sharedWords?: string[],
    sharedMysteryWords?: MysteryWordItem[],
    matchIdOverride?: string
  ) => {
    const ban = checkClientBanStatus();
    if (ban.isBanned) {
      setClientBanStatus(ban);
      setIsBanModalOpen(true);
      soundFx.playError();
      handleReturnToLobby();
      return;
    }
    const isSolo = isSoloOverride !== undefined ? isSoloOverride : playType === 'solo';
    const targetMode = modeOverride || gameMode;

    let targetWords = sharedWords;
    let targetMystery = sharedMysteryWords;

    // Generate words based on mode if not already shared by host
    if (targetMode === 'doan_chu') {
      if (!targetMystery || targetMystery.length === 0) {
        const validDiff = (difficulty === 'hard' || difficulty === 'legendary') ? difficulty : 'normal';
        const doanChuDiff = config.doanChu?.difficulties?.[validDiff] || config.doanChu?.difficulties?.normal;
        const totalRounds = doanChuDiff?.totalRounds || 10;
        const allowedPools = doanChuDiff?.allowedPools || config.doanChu?.difficulties?.normal?.allowedPools;
        targetMystery = generateDoanChuWords(validDiff, totalRounds, allowedPools);
      }
      setMysteryWords(targetMystery);
    } else {
      if (!targetWords || targetWords.length === 0) {
        const configuredCount = config.modeWordCounts?.[targetMode as keyof typeof config.modeWordCounts];
        const count =
          configuredCount ||
          (targetMode === 'san_boss'
            ? 300
            : targetMode === 'ngau_hung'
            ? (config.ngauHung?.difficulties[difficulty]?.totalRounds ? config.ngauHung.difficulties[difficulty].totalRounds + 10 : 25)
            : targetMode === 'numpad'
            ? (config.numpad?.wordCount || 300)
            : (config.normalRace?.wordCount || 150));
        const modeHardRate =
          config.modeHardWordRates?.[targetMode as keyof typeof config.modeHardWordRates] ??
          config.hardWordRate;

        let allowedPools: import('./types').WordPoolType[] | undefined;
        let effectiveDiff = difficulty;
        if (targetMode === 'ngau_hung') {
          effectiveDiff = difficulty === 'legendary' ? 'legendary' : 'normal';
          allowedPools = config.ngauHung?.difficulties?.[effectiveDiff]?.allowedPools || config.ngauHung?.difficulties?.normal?.allowedPools;
        } else if (targetMode === 'san_boss') {
          effectiveDiff = (difficulty === 'hard' || difficulty === 'hell') ? difficulty : 'normal';
          allowedPools = config.sanBoss?.difficulties?.[effectiveDiff]?.allowedPools || config.sanBoss?.difficulties?.normal?.allowedPools;
        }

        targetWords = generateWords(targetMode, count, effectiveDiff, modeHardRate, allowedPools);
      }
      setWords(targetWords);
    }

    // Prepare Boss if in Săn Boss mode
    if (targetMode === 'san_boss') {
      const isSectBoss = sectMatchContextRef.current?.type === 'sect_boss';
      const bossDiff =
        config.sanBoss.difficulties[difficulty] || config.sanBoss.difficulties.normal;
      const totalHp = isSolo
        ? bossDiff.baseHp
        : bossDiff.baseHp + Math.max(0, players.length - 1) * bossDiff.hpPerPlayer;

      setBossState({
        name: isSectBoss ? 'THÁI CỔ HẮC LONG (THẦN THÚ TRẤN GIỚI)' : 'HẮC LONG MA VƯƠNG',
        icon: '🐉',
        hp: totalHp,
        maxHp: totalHp,
        shield: 0,
        maxShield: 0,
        isShieldActive: false,
        isStunned: false,
        isCapsLockActive: false,
        duration: bossDiff.duration,
        skillInterval: bossDiff.skillInterval || 14,
        skillWarningDuration: bossDiff.skillWarningDuration || 2,
        shieldDuration: bossDiff.shieldDuration,
        shieldHpPerPlayer: bossDiff.shieldHpPerPlayer || 45,
        stunDuration: bossDiff.stunDuration,
        shakeDuration: bossDiff.shakeDuration || 5,
        smokeDuration: bossDiff.smokeDuration || 4,
        reverseDuration: bossDiff.reverseDuration || 5,
        capslockDuration: bossDiff.capslockDuration || 5,
        skillRates: bossDiff.skillRates || {
          shield: 25,
          shake: 20,
          smoke: 20,
          reverse: 15,
          capslock: 20,
        },
        activeSkill: null,
        skillWarning: null,
        selfDestructTarget: bossDiff.selfDestructTarget,
      });
    }

    // Reset players progress and mark inMatch: true
    setNgauHungStats(null);
    setMysteryWordStats(null);
    setBossBattleStats(null);
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        progress: 0,
        wpm: 0,
        score: 0,
        errors: 0,
        correctChars: 0,
        isFinished: false,
        isSurrendered: false,
        inMatch: true,
      }))
    );

    // Notify other players in room if multiplayer host and share words with unique matchId
    if (currentRoomId && isRoomHost) {
      const newMatchId =
        matchIdOverride ||
        ('match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
      currentMatchIdRef.current = newMatchId;
      markRoomPlaying(currentRoomId, targetMode, targetWords, targetMystery, newMatchId, difficulty);
    } else if (matchIdOverride) {
      currentMatchIdRef.current = matchIdOverride;
    }

    // Loại bỏ hoàn toàn màn hình đếm ngược ngoài phòng. Cả Multiplayer và Solo vào thẳng phòng chơi ngay lập tức!
    // Đồng hồ 3s sẽ đếm ngược trực quan ngay trong bàn gõ của phòng chơi trước khi bắt đầu tính giờ thi đấu.
    currentMatchRecordedRef.current = false;
    setNewlyUnlockedAchievements([]);
    soundFx.playKeyClick();
    setGameState('playing');
  };

  // Start Solo game directly (No waiting room, no other players or bots, no countdown)
  const handleStartSoloGame = (modeOverride?: GameMode) => {
    const ban = checkClientBanStatus();
    if (ban.isBanned) {
      setClientBanStatus(ban);
      setIsBanModalOpen(true);
      soundFx.playError();
      return;
    }
    const targetMode = modeOverride || (gameMode === 'outplay' ? 'outplay' : gameMode);
    setGameMode(targetMode);
    setPlayType('solo');
    setPlayers([
      {
        id: currentUserId,
        username: username,
        icon: avatar,
        progress: 0,
        wpm: 0,
        score: 0,
        errors: 0,
        correctChars: 0,
        isFinished: false,
        isSurrendered: false,
        isAFK: false,
      },
    ]);
    handleLaunchGame(true, targetMode);
  };

  // Khởi động Vây Quét Thần Thú Trấn Giới (Săn Boss Tông Môn)
  const handleStartSectBoss = (sectId: string, sectName: string) => {
    const ban = checkClientBanStatus();
    if (ban.isBanned) {
      setClientBanStatus(ban);
      setIsBanModalOpen(true);
      soundFx.playError();
      return;
    }
    setIsCultivationOpen(false);
    sectMatchContextRef.current = { type: 'sect_boss', sectId, sectName };
    setSectMatchContext(sectMatchContextRef.current);
    setSectMatchNotice(null);

    setGameMode('san_boss');
    gameModeRef.current = 'san_boss';
    setDifficulty('normal');
    difficultyRef.current = 'normal';
    setPlayType('solo');
    setPlayers([
      {
        id: currentUserId,
        username: `${username} (${sectName})`,
        icon: avatar,
        progress: 0,
        wpm: 0,
        score: 0,
        errors: 0,
        correctChars: 0,
        isFinished: false,
        isSurrendered: false,
        isAFK: false,
      },
    ]);
    handleLaunchGame(true, 'san_boss');
  };

  // Khởi động Xuất Chiến Đại Hội Tỷ Võ Tông Môn (Vạn Phái Tranh Phong - Thử Thách 3 Ải Chơi Đơn)
  const handleStartSectTournament = (
    sectId: string,
    sectName: string,
    options?: { isPractice?: boolean; preflightToken?: string }
  ) => {
    const isPractice = options?.isPractice ?? !isSectWarEventActive();

    const ban = checkClientBanStatus();
    if (ban.isBanned) {
      setClientBanStatus(ban);
      setIsBanModalOpen(true);
      soundFx.playError();
      return;
    }
    setIsCultivationOpen(false);
    sectMatchContextRef.current = {
      type: 'sect_tournament',
      sectId,
      sectName,
      isPractice,
      preflightToken: options?.preflightToken,
    };
    setSectMatchContext(sectMatchContextRef.current);
    setSectWarReportData(null);
    
    const currentSurr = getConsecutiveSectSurrenders(currentUser?.username);
    if (!isPractice && currentSurr > 0) {
      setSectMatchNotice(
        `⚠️ Cảnh báo: Đạo hữu đang có ${currentSurr}/3 lần đầu hàng liên tiếp. Nếu đầu hàng thêm ${3 - currentSurr} lần sẽ bị khấu trừ 1 lượt bài thi hôm nay (sẽ reset khi hoàn thành bài mới)!`
      );
    } else {
      setSectMatchNotice(null);
    }

    // Sinh bộ từ ngữ 3 Ải liên hoàn: Ải 1 (Tiếng Việt 30 từ) -> Ải 2 (Tiếng Anh 30 từ) -> Ải 3 (Phím số 25 số)
    const trialWords = generateSectTrialWords();
    setWords(trialWords);

    setGameMode('vi_dau');
    gameModeRef.current = 'vi_dau';
    setDifficulty('normal');
    difficultyRef.current = 'normal';
    setPlayType('solo');
    setPlayers([
      {
        id: currentUserId,
        username: `${username} (${sectName})`,
        icon: avatar,
        frame: userFrame,
        progress: 0,
        wpm: 0,
        score: 0,
        errors: 0,
        correctChars: 0,
        isFinished: false,
        isSurrendered: false,
        isAFK: false,
      },
    ]);
    handleLaunchGame(true, 'vi_dau', trialWords);
  };

  // Alias for backward compatibility / restarting
  const handleStartGame = () => {
    setCultivationMatchHarvest(null);
    const ban = checkClientBanStatus();
    if (ban.isBanned) {
      setClientBanStatus(ban);
      setIsBanModalOpen(true);
      soundFx.playError();
      return;
    }
    if (playType === 'solo' || gameMode === 'outplay') {
      handleStartSoloGame(gameMode);
    } else {
      handleLaunchGame(false);
    }
  };

  // Match History Actions: Practice Mistakes & Challenge Retry
  const handlePracticeMistakes = (mistakeWords: string[], modeOverride?: GameMode) => {
    const ban = checkClientBanStatus();
    if (ban.isBanned) {
      setClientBanStatus(ban);
      setIsBanModalOpen(true);
      soundFx.playError();
      return;
    }
    if (!mistakeWords || mistakeWords.length === 0) return;
    let practiceList: string[] = [];
    if (mistakeWords.length >= 20) {
      practiceList = mistakeWords.slice(0, 30);
    } else {
      while (practiceList.length < 25) {
        practiceList.push(...mistakeWords);
      }
      practiceList = practiceList.slice(0, 30);
    }

    let targetMode = modeOverride || 'vi_dau';
    const hasNumbers = practiceList.some((w) => /^[\d+\-*/=.]+$/.test(w.trim()));
    if (hasNumbers) {
      targetMode = 'numpad';
    } else if (targetMode === 'san_boss' || targetMode === 'doan_chu' || targetMode === 'ngau_hung' || targetMode === 'outplay') {
      const isEn = practiceList.every((w) => /^[a-zA-Z',.\-!?]+$/.test(w.trim()));
      targetMode = isEn ? 'en' : 'vi_dau';
    }

    setGameMode(targetMode);
    gameModeRef.current = targetMode;
    const defaultDiff = targetMode === 'numpad' ? 'number' : 'normal';
    setDifficulty(defaultDiff);
    difficultyRef.current = defaultDiff;
    setPlayType('solo');
    setPlayers([
      {
        id: currentUserId,
        username: username,
        icon: avatar,
        progress: 0,
        wpm: 0,
        score: 0,
        errors: 0,
        correctChars: 0,
        isFinished: false,
        isSurrendered: false,
        isAFK: false,
      },
    ]);
    handleLaunchGame(true, targetMode, practiceList);
  };

  const handleRetryMatch = (record: MatchRecord) => {
    const ban = checkClientBanStatus();
    if (ban.isBanned) {
      setClientBanStatus(ban);
      setIsBanModalOpen(true);
      soundFx.playError();
      return;
    }
    const retryWords = record.promptWords || record.wordLogs?.map((w) => w.word);
    const targetMode = (record.modeId as GameMode) || 'vi_dau';
    setGameMode(targetMode);
    setPlayType('solo');
    setPlayers([
      {
        id: currentUserId,
        username: username,
        icon: avatar,
        progress: 0,
        wpm: 0,
        score: 0,
        errors: 0,
        correctChars: 0,
        isFinished: false,
        isSurrendered: false,
        isAFK: false,
      },
    ]);
    handleLaunchGame(true, targetMode, retryWords);
  };

  const handleClearMatchHistory = () => {
    clearMatchHistory();
    setMatchHistory([]);
  };

  // Finish Match Handler
  const handleFinishMatch = useCallback((
    correctChars: number,
    errors: number,
    keystrokes: KeystrokeEvent[],
    consistency?: number,
    extraStats?: {
      lastWpm?: number;
      sessionBestWpm?: number;
      ghostDiff?: {
        ghostWpm: number;
        wpmDiff: number;
        leadChars: number;
        paceLabel: string;
      };
      finalWpm?: number;
      elapsedSeconds?: number;
      chartData?: PerformanceChartPoint[];
      wordResults?: {
        word: string;
        typed: string;
        isCorrect: boolean;
      }[];
      promptWords?: string[];
      outplaySubMode?: any;
      maxCombo?: number;
      score?: number;
      sectTrialStageStats?: SectTrialStageStats;
    }
  ) => {
    // Validate anti-cheat with true elapsed duration
    const effectiveDuration = extraStats?.elapsedSeconds && extraStats.elapsedSeconds > 0
      ? extraStats.elapsedSeconds
      : (keystrokes.length >= 2 ? (keystrokes[keystrokes.length - 1].time - keystrokes[0].time) / 1000 : 60);

    const validation = validateKeystrokes(keystrokes, correctChars, effectiveDuration);
    const verifiedWpm = validation.isValid
      ? (extraStats?.finalWpm ?? validation.verifiedWpm)
      : 0;
    const accuracy = Math.max(0, Math.min(100, Math.round((correctChars / Math.max(1, correctChars + errors * 5)) * 100)));

    // Bàn Cổ Thần Thức trừng phạt gian lận nếu phát hiện can thiệp tà pháp / macro / bất thường
    if (!validation.isValid) {
      const banReason = validation.reason || 'Bất thường tần số gõ phím / Nghi vấn Auto Macro';
      const myUser = currentUser?.username || username;
      const myDisplayName = currentUser?.displayName || myUser;

      // 1. Lưu án phạt 2 giờ (2h) ngay lập tức trên máy người chơi
      saveStoredBanInfo(Date.now() + 2 * 60 * 60 * 1000, banReason);
      const newBanStatus = checkClientBanStatus();
      setClientBanStatus(newBanStatus);
      setIsBanModalOpen(true);
      soundFx.playError();

      // 2. Bàn Cổ Thần Thức phát chiếu thư thông báo toàn cõi và trừ tu vi
      announcePenalty(myDisplayName, banReason).catch(() => {});

      // 3. Gửi lệnh cấm lên Server để khóa phòng & bảng vàng
      executeBanPenalty({
        username: myUser,
        displayName: myDisplayName,
        userId: currentUser?.id,
        reason: banReason,
      }).catch(() => {});

      // 4. Nếu đang trong phòng thi đấu, lập tức rời phòng và đá về Sảnh chính (Lobby)
      if (currentRoomId) {
        leaveRoom(currentRoomId, currentUserId);
        setCurrentRoomId(null);
        setIsRoomHost(false);
      }
      setGameState('lobby');
      return;
    }

    // Update Session stats
    const prevLast = lastGameWpm;
    setLastGameWpm(verifiedWpm);

    // Kiểm tra trạng thái hoàn thành: không đầu hàng và không out phòng
    const me = players.find((p) => p.id === currentUserId);
    const isPlayerSurrendered = me?.isSurrendered || false;
    const isMatchCompleted = correctChars > 0 && verifiedWpm > 0 && !isPlayerSurrendered;

    // Session best WPM is strictly for Outplay Yourself mode
    let updatedBest = sessionBestWpm;
    if (gameMode === 'outplay' && !isPlayerSurrendered) {
      updatedBest = Math.max(sessionBestWpm, verifiedWpm);
      setSessionBestWpm(updatedBest);
    }

    // Update Career stats: KỶ LỤC CAO NHẤT LỊCH SỬ KHI VÁN ĐẤU THỰC SỰ HOÀN THÀNH (MỌI CHẾ ĐỘ CHƠI)
    if (!isPlayerSurrendered && isMatchCompleted) {
      const currentPeak = Math.max(bestWpm, bestWpmRef.current || 0);
      if (verifiedWpm > currentPeak) {
        setBestWpm(verifiedWpm);
        bestWpmRef.current = verifiedWpm;
        localStorage.setItem('fasttyping_best_wpm', verifiedWpm.toString());
        const newRec: BestWpmRecord = {
          wpm: verifiedWpm,
          mode: gameMode,
          modeName: getFriendlyModeName(gameMode),
          timestamp: Date.now(),
        };
        setBestWpmRecord(newRec);
        try {
          localStorage.setItem('fasttyping_best_wpm_record', JSON.stringify(newRec));
          if (isOutplayMode(gameMode)) {
            localStorage.setItem('fasttyping_outplay_best_wpm', verifiedWpm.toString());
            localStorage.setItem('fasttyping_outplay_best_record', JSON.stringify(newRec));
          }
        } catch {}

        // Tự động đồng bộ ngay lập tức kỷ lục lên tài khoản máy chủ
        const activeUser = currentUserRef.current || currentUser;
        if (activeUser) {
          updateUserProfile({
            bestWpm: verifiedWpm,
            bestWpmRecord: newRec,
          }).catch(() => {});
        }

        // Huyền Thiên Khí Linh ban chiếu thư Kim Bảng Đề Danh
        announceRecord(
          activeUser?.displayName || activeUser?.username || username,
          verifiedWpm,
          accuracy,
          getFriendlyModeName(gameMode),
          verifiedWpm >= 120
        ).then((dec) => {
          setActiveDaoDecreePopup(dec);
        }).catch(() => {});
      }
      const nextGameCount = totalGames + 1;
      setTotalGames(nextGameCount);
      localStorage.setItem('fasttyping_games_count', nextGameCount.toString());
    }

    // Update player (ensure lastWpm is undefined on the very first game of this condition)
    const effectiveLastWpm = gameMode === 'outplay'
      ? (extraStats?.lastWpm && extraStats.lastWpm > 0 ? extraStats.lastWpm : undefined)
      : ((extraStats?.lastWpm && extraStats.lastWpm > 0) ? extraStats.lastWpm : (prevLast > 0 ? prevLast : undefined));

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentUserId
          ? {
              ...p,
              progress: 100,
              correctChars,
              errors,
              wpm: verifiedWpm,
              consistency,
              accuracy,
              lastWpm: effectiveLastWpm,
              sessionBestWpm: gameMode === 'outplay' ? (extraStats?.sessionBestWpm ?? updatedBest) : undefined,
              ghostDiff: extraStats?.ghostDiff,
              chartData: extraStats?.chartData,
              isFinished: true,
            }
          : p
      )
    );

    if (currentRoomId && playType === 'multiplayer') {
      sendPlayerProgress(currentRoomId, currentUserId, 100, correctChars, errors, verifiedWpm, true);
    }

    // Chỉ người chơi hoàn thành trọn vẹn ván đấu, không đầu hàng và không out phòng mới được xét lên Bảng Vàng
    if (!isPlayerSurrendered && isMatchCompleted) {
      // Submit real score to server leaderboard (broadcasts to all players if new record)
      submitScoreToLeaderboard({
        mode: gameMode,
        username: currentUser?.username || username,
        displayName: currentUser?.displayName || username,
        wpm: verifiedWpm,
        score: (gameMode === 'ngau_hung' || gameMode === 'doan_chu' || gameMode === 'san_boss') ? (extraStats?.score || 0) : 0,
        errors,
        accuracy,
        consistency,
        avatar,
        frame: userFrame,
        isSurrendered: false,
        isCompleted: true,
        roomId: currentRoomId || undefined,
        playerId: currentUserId,
        keyboardSwitch: (currentUser as any)?.keyboardSwitch || 'Cherry MX Blue Clicky',
      }).then((res) => {
        if (res && res.success && res.highScores) {
          setHighScores(res.highScores);
          saveLeaderboardToIndexedDB(res.highScores).catch(() => {});
        }
      });

      // Khí linh Linh Lung Tiên Đồng cổ vũ và bình phẩm sôi nổi sau trận đấu
      if (verifiedWpm >= 80 || accuracy === 100) {
        announceLinhLungCheer(
          currentUser?.displayName || currentUser?.username || username,
          verifiedWpm,
          accuracy,
          getFriendlyModeName(gameMode)
        ).catch(() => {});
      } else if (errors >= 7) {
        announceLinhLungCommentary({
          username: currentUser?.displayName || currentUser?.username || username,
          wpm: verifiedWpm,
          accuracy,
          modeName: getFriendlyModeName(gameMode),
          errors,
        }).catch(() => {});
      }
    }

    // Ghi nhận trận đấu vào lịch sử đấu
    let matchResult: MatchResult = 'Thắng';
    if (isPlayerSurrendered) {
      matchResult = 'Đầu hàng';
    } else if (playType === 'multiplayer') {
      const rivals = players.filter((p) => p.id !== currentUserId && !p.isSurrendered);
      const isOutperformed = rivals.some((r) => (r.wpm || 0) > verifiedWpm);
      matchResult = isOutperformed ? 'Thua' : 'Thắng';
    } else {
      matchResult = 'Thắng';
    }

    const firstKeyRaw = keystrokes.length > 0 ? ((keystrokes[0] as any).timeMs ?? keystrokes[0].time) : 0;
    const isAbsTime = firstKeyRaw > 50000;

    const replayKeystrokes = keystrokes.map((k) => {
      const relTime = (k as any).timeMs !== undefined ? (k as any).timeMs : (isAbsTime ? k.time - firstKeyRaw : k.time);
      return {
        key: k.key,
        timeMs: Math.max(0, Math.round(relTime)),
        isCorrect: typeof k.isCorrect === 'boolean' ? k.isCorrect : true,
      };
    });

    let matchSubMode: string | undefined = undefined;
    let matchDifficulty = difficulty;
    let matchModeName: string | undefined = undefined;

    if (gameMode === 'outplay') {
      const activeSub = extraStats?.outplaySubMode;
      matchSubMode = activeSub;
      if (activeSub === 'numpad_number') {
        matchDifficulty = 'number';
        matchModeName = 'Outplay Yourself (Numpad Số)';
      } else if (activeSub === 'numpad_fullsize') {
        matchDifficulty = 'fullsize';
        matchModeName = 'Outplay Yourself (Numpad Phép tính)';
      } else if (activeSub === 'vi_nodau') {
        matchDifficulty = 'normal';
        matchModeName = 'Outplay Yourself (Không dấu)';
      } else if (activeSub === 'en') {
        matchDifficulty = 'normal';
        matchModeName = 'Outplay Yourself (Tiếng Anh)';
      } else if (activeSub === 'vi_dau') {
        matchDifficulty = 'normal';
        matchModeName = 'Outplay Yourself (Có dấu)';
      }
    }

    recordCurrentMatch({
      modeId: gameMode,
      mode: matchModeName,
      subMode: matchSubMode,
      difficulty: matchDifficulty,
      wpm: verifiedWpm,
      accuracy,
      result: matchResult,
      score: 0,
      isCompleted: !isPlayerSurrendered,
      durationSeconds: Math.round(effectiveDuration),
      totalWords: extraStats?.wordResults?.length || words.length,
      correctChars,
      totalErrors: errors,
      consistency,
      promptWords: extraStats?.promptWords || words,
      wordLogs: extraStats?.wordResults,
      keystrokes: replayKeystrokes,
      chartData: extraStats?.chartData,
      maxCombo: extraStats?.maxCombo,
    });

    // Đóng góp điểm Đại Hội Tỷ Võ Tông Môn & Vạn Phái Tranh Phong (Vượt 3 Ải Liên Hoàn)
    if (!isPlayerSurrendered && verifiedWpm > 0 && sectMatchContextRef.current?.type === 'sect_tournament') {
      resetConsecutiveSectSurrenders(currentUser?.username);

      const isPractice = Boolean(sectMatchContextRef.current?.isPractice);
      const sectId = sectMatchContextRef.current?.sectId || cultivationState?.sect?.sectId;
      const sectName = sectMatchContextRef.current?.sectName || cultivationState?.sect?.sectName || 'Tông Môn';
      const stageStats: SectTrialStageStats = extraStats?.sectTrialStageStats || {
        stage1Wpm: verifiedWpm,
        stage1Accuracy: accuracy || 100,
        stage1TimeMs: Math.round((effectiveDuration * 1000) / 3),
        stage2Wpm: verifiedWpm,
        stage2Accuracy: accuracy || 100,
        stage2TimeMs: Math.round((effectiveDuration * 1000) / 3),
        stage3Wpm: verifiedWpm,
        stage3Accuracy: accuracy || 100,
        stage3TimeMs: Math.round((effectiveDuration * 1000) / 3),
        totalTimeSeconds: Math.round(effectiveDuration),
        maxCombo: extraStats?.maxCombo || 0,
      };

      if (sectId) {
        // Gửi điểm cống hiến hoặc báo tiệp thao diễn lên máy chủ (Hỗ trợ Atomic Transaction & Offline Checksum)
        serverContributeSectWarScore({
          wpm: verifiedWpm,
          accuracy: accuracy || 100,
          completedAllStages: true,
          isPractice,
          sectId,
          stageStats,
          preflightToken: sectMatchContextRef.current?.preflightToken,
          mode: 'sect_trial',
          isMultiplayer: false,
        }).then((warRes) => {
          const basePts = warRes.basePoints ?? Math.max(1, Math.round(((verifiedWpm * ((accuracy || 100) / 100)) / 10)));
          const stageBonus = warRes.stageBonus ?? 25;
          const addedPts = isPractice ? 0 : (warRes.addedPoints ?? (basePts + stageBonus));

          setSectWarReportData({
            isPractice,
            sectId,
            sectName: warRes.sectName || sectName,
            wpm: verifiedWpm,
            accuracy: accuracy || 100,
            completedAllStages: true,
            basePoints: basePts,
            stageBonus,
            totalAddedPoints: addedPts,
            previousSectPoints: warRes.previousSectPoints ?? 0,
            newSectPoints: warRes.totalWeeklyPoints ?? warRes.previousSectPoints ?? 0,
            currentRank: warRes.currentRank ?? 1,
            dailyAttemptsUsed: warRes.dailyAttemptsUsed ?? (isPractice ? 0 : 1),
            dailyAttemptsLeft: warRes.dailyAttemptsLeft ?? (3 - (warRes.dailyAttemptsUsed ?? 1)),
            dailyAttemptsMax: warRes.dailyAttemptsMax ?? 3,
            topContributors: warRes.topContributors || [],
            stageStats,
            message: warRes.message,
          });
        }).catch(() => {
          // Fallback an toàn bảo lưu lượt
          const basePts = Math.max(1, Math.round(((verifiedWpm * ((accuracy || 100) / 100)) / 10)));
          setSectWarReportData({
            isPractice,
            sectId,
            sectName,
            wpm: verifiedWpm,
            accuracy: accuracy || 100,
            completedAllStages: true,
            basePoints: basePts,
            stageBonus: 25,
            totalAddedPoints: isPractice ? 0 : basePts + 25,
            previousSectPoints: 0,
            newSectPoints: 0,
            currentRank: 1,
            dailyAttemptsUsed: 1,
            dailyAttemptsLeft: 2,
            dailyAttemptsMax: 3,
            topContributors: [],
            stageStats,
            message: 'Đã phát hiện sự cố kết nối máy chủ! Thiên Đạo bảo lưu nguyên vẹn 1 lượt xuất chiến cho đạo hữu.',
          });
        });

        if (!isPractice && isSectWarEventActive()) {
          const tourneyRes = contributeTournamentScore(cultivationState, sectId, verifiedWpm);
          setCultivationState(tourneyRes.updatedState);
          saveStoredCultivationState(tourneyRes.updatedState);

          if (currentUser) {
            setCurrentUser((prev) => (prev ? { ...prev, cultivation: tourneyRes.updatedState } : prev));
            const token = getStoredAuthToken();
            if (token || currentUser.username) {
              fetch('/api/cultivation', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  'x-username': currentUser.username,
                },
                body: JSON.stringify({
                  cultivation: tourneyRes.updatedState,
                  username: currentUser.username,
                  userId: currentUser.id,
                }),
              }).catch(() => {});
            }
          }
        }
      }
    }

    // Kiểm tra xem trong phòng multiplayer còn đối thủ thực nào đang tiếp tục thi đấu không:
    const currentList = playersRef.current && playersRef.current.length > 0 ? playersRef.current : players;
    const activeHumanCompetitors = currentList.filter(
      (p) => p.id !== currentUserId && !p.isBot && !p.isSurrendered && !p.isFinished && p.inMatch !== false
    );

    if (playType === 'multiplayer' && activeHumanCompetitors.length > 0) {
      // Người chơi này về đích trước: phát âm thanh chúc mừng nhẹ và ở lại TypingArena để quan sát trực tiếp
      // các đối thủ còn lại. Khi người cuối cùng kết thúc, hệ thống sẽ tự động tổng kết chung một lần cho tất cả!
      soundFx.playVictory();
    } else {
      // Solo mode hoặc là người chơi cuối cùng về đích: kết thúc phòng và hiển thị bảng tổng kết chung
      if (currentRoomId && playType === 'multiplayer') {
        markRoomFinished(currentRoomId);
      }
      soundFx.playVictory();
      setGameState('gameover');
    }
  }, [bestWpm, totalGames, currentUserId, currentUser, highScores, gameMode, username, lastGameWpm, sessionBestWpm, avatar, userFrame, players, playType, recordCurrentMatch, currentRoomId]);

  // Boss Mode Damage & Victory Handlers
  const handleBossDamage = (dmg: number, errors: number, targetPlayerId?: string) => {
    const id = targetPlayerId || currentUserId;
    let nextPlayers: Player[] = [];
    setPlayers((prev) => {
      nextPlayers = prev.map((p) =>
        p.id === id
          ? { ...p, score: p.score + dmg, errors: targetPlayerId ? p.errors : errors, correctChars: p.correctChars + dmg }
          : p
      );
      return nextPlayers;
    });
    if (playType === 'multiplayer' && currentRoomId && nextPlayers.length > 0) {
      updateRoomPlayers(currentRoomId, nextPlayers);
    }
  };

  const handleBossSelfDestruct = () => {
    // Kamikaze self-destruct dealing proportional massive damage to Boss based on new halved HP
    const bossDiff = config.sanBoss.difficulties[difficulty] || config.sanBoss.difficulties.normal;
    // Sát thương tự bạo tương ứng ~28% máu cơ bản (Bình thường: 225 DMG - giảm 50% chuẩn từ 450; Khó: 392 DMG; Địa ngục: 588 DMG)
    const selfDestructDmg = Math.round(bossDiff.baseHp * 0.28);
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentUserId
          ? { ...p, score: p.score + selfDestructDmg, isSurrendered: true }
          : p
      )
    );

    recordCurrentMatch({
      modeId: 'san_boss',
      wpm: 0,
      accuracy: 0,
      result: 'Đầu hàng',
      score: selfDestructDmg,
      isCompleted: false,
    });

    soundFx.playShieldBreak();
    setGameState('gameover');
    setIsBossVictory(false);
  };

  const handleBossFinish = (
    isVictory: boolean,
    totalDmg: number,
    errors: number,
    chartData?: PerformanceChartPoint[],
    stats?: BossBattleStats
  ) => {
    setIsBossVictory(isVictory);
    if (stats) {
      setBossBattleStats(stats);
    }
    const approxWpm = Math.round((totalDmg / 5) / 1);
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentUserId
          ? { ...p, score: totalDmg, errors, wpm: approxWpm, isFinished: true, chartData }
          : p
      )
    );

    // Điểm Boss chỉ được xét lên Bảng Vàng khi và chỉ khi:
    // - Ván đấu kết thúc trọn vẹn và giành chiến thắng trước Boss (isVictory === true)
    // - Người chơi KHÔNG đầu hàng (không tự hủy) và không rời phòng
    const me = players.find((p) => p.id === currentUserId);
    const isPlayerSurrendered = me?.isSurrendered || false;
    const isMatchCompleted = isVictory && !isPlayerSurrendered && totalDmg > 0;

    if (!isPlayerSurrendered && isMatchCompleted) {
      // Huyền Thiên Khí Linh ban chiếu thư Ma Thần Quỵ Phục
      announceBossKill(
        currentUser?.displayName || currentUser?.username || username,
        'Hắc Long Ma Vương',
        totalDmg
      ).then((dec) => {
        setActiveDaoDecreePopup(dec);
      }).catch(() => {});

      const bossAcc = Math.max(0, Math.min(100, Math.round((totalDmg / Math.max(1, totalDmg + errors * 5)) * 100)));

      // Save Boss High Score to server
      submitScoreToLeaderboard({
        mode: 'san_boss',
        username: currentUser?.username || username,
        displayName: currentUser?.displayName || username,
        wpm: 0,
        score: totalDmg,
        errors,
        accuracy: bossAcc,
        avatar,
        frame: userFrame,
        isSurrendered: false,
        isCompleted: true,
        roomId: currentRoomId || undefined,
        playerId: currentUserId,
        keyboardSwitch: (currentUser as any)?.keyboardSwitch || 'Cherry MX Blue Clicky',
      }).then((res) => {
        if (res && res.success && res.highScores) {
          setHighScores(res.highScores);
          saveLeaderboardToIndexedDB(res.highScores).catch(() => {});
        }
      });
    }

    const bossAcc = Math.max(0, Math.min(100, Math.round((totalDmg / Math.max(1, totalDmg + errors * 5)) * 100)));
    recordCurrentMatch({
      modeId: 'san_boss',
      wpm: approxWpm,
      accuracy: bossAcc,
      result: isVictory ? 'Thắng' : 'Thua',
      score: totalDmg,
      isCompleted: isMatchCompleted,
    });

    // Trừ huyết lượng Thần Thú Trấn Giới Tông Môn nếu đang thi đấu trong ngữ cảnh Vây Quét Thần Thú (chỉ người chơi chính thức)
    if (currentUser && sectMatchContextRef.current && sectMatchContextRef.current.type === 'sect_boss' && totalDmg > 0) {
      const { sectId, sectName } = sectMatchContextRef.current;
      const res = attackSectWorldBoss(cultivationState, sectId, totalDmg);
      setCultivationState(res.updatedState);
      saveStoredCultivationState(res.updatedState);
      if (currentUser) {
        setCurrentUser((prev) => (prev ? { ...prev, cultivation: res.updatedState } : prev));
        const token = getStoredAuthToken();
        if (token || currentUser.username) {
          fetch('/api/cultivation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              'x-username': currentUser.username,
            },
            body: JSON.stringify({
              cultivation: res.updatedState,
              username: currentUser.username,
              userId: currentUser.id,
            }),
          }).catch(() => {});
        }
      }

      setSectMatchNotice(
        res.bossDefeated
          ? `🎉 [VÂY QUÉT THẦN THÚ] Bạn đã trảm sát thành công Thái Cổ Hắc Long của ${sectName}! Toàn môn nhận siêu cấp phần thưởng!`
          : `🐉 [VÂY QUÉT THẦN THÚ] Bạn đã xuất chiêu gây ${totalDmg.toLocaleString()} sát thương lên Thần Thú Thái Cổ Hắc Long của ${sectName} (Còn ${res.remainingHp.toLocaleString()}/${res.maxHp.toLocaleString()} HP)!`
      );
    }

    soundFx.playVictory();
    setGameState('gameover');
  };

  // Surrender Handler (isAFK = true: Bị tính là AFK do 30s không gõ phím)
  const handleSurrender = (isAFK: boolean = false) => {
    // Không tính cơ chế AFK cho 2 chế độ multiplayer Ngẫu Hứng và Đoán Chữ
    const effectiveIsAFK = (gameMode === 'ngau_hung' || gameMode === 'doan_chu') ? false : isAFK;

    // Clear last game WPM, but keep sessionBestWpm
    setLastGameWpm(0);

    // Ghi nhận đầu hàng hoặc AFK vào lịch sử đấu nếu không phải chế độ Outplay (Outplay là chế độ tự luyện tập retry)
    if (gameMode !== 'outplay') {
      const me = players.find((p) => p.id === currentUserId);
      recordCurrentMatch({
        modeId: gameMode,
        wpm: me?.wpm || 0,
        accuracy: me?.accuracy ?? 100,
        result: effectiveIsAFK ? 'AFK' : 'Đầu hàng',
        score: me?.score,
        isCompleted: false,
      });
    }

    // Cơ chế chống lạm dụng đầu hàng liên tục trong bài thi Tông Môn (Vạn Phái Tranh Phong)
    if (sectMatchContextRef.current?.type === 'sect_tournament') {
      const penaltyResult = recordSectTrialSurrender(currentUser?.username);
      if (penaltyResult.penalized) {
        // Đã đầu hàng 3 lần liên tục: Khấu trừ 1 lượt bài thi hôm nay
        serverPenalizeSectSurrender().then((penRes) => {
          if (penRes && penRes.success) {
            setSectMatchNotice(
              `⚡ [THIÊN ĐẠO TRỪNG PHẠT] Đạo hữu đã đầu hàng 3 lần liên tục trong Vạn Phái Tranh Phong! Đã khấu trừ 1 lượt bài thi hôm nay (Còn ${penRes.dailyAttemptsLeft ?? 0}/3 lượt)!`
            );
          }
        }).catch(() => {});
        setSectMatchNotice(penaltyResult.message);
        announcePenalty(
          currentUser?.displayName || currentUser?.username || username,
          'Đầu hàng 3 lần liên tiếp trong Vạn Phái Tranh Phong',
          'Khấu trừ 1 lượt xuất chiến bài thi hôm nay'
        );
      } else {
        setSectMatchNotice(penaltyResult.message);
      }
    }

    const updatedPlayers = players.map((p) =>
      p.id === currentUserId
        ? {
            ...p,
            // In outplay mode, player can continue typing immediately without being locked in surrendered state
            isSurrendered: gameMode === 'outplay' ? false : true,
            isAFK: effectiveIsAFK,
            lastWpm: undefined,
          }
        : p
    );
    setPlayers(updatedPlayers);
    playersRef.current = updatedPlayers;

    if (playType === 'multiplayer' && currentRoomId) {
      updatePlayerRoomStatus(currentRoomId, currentUserId, {
        isSurrendered: true,
        isAFK: effectiveIsAFK,
      });

      // Kiểm tra nếu người chơi vừa đầu hàng / AFK là người chơi cuối cùng đang thi đấu:
      const activeHumanPlayers = updatedPlayers.filter(
        (p) => !p.isBot && !p.isSurrendered && !p.isFinished && p.inMatch !== false && !p.isAFK
      );

      if (activeHumanPlayers.length === 0) {
        // Người chơi cuối cùng đầu hàng / AFK: kết thúc phòng chơi và tổng kết ngay lập tức, không đợi hết giờ
        markRoomFinished(currentRoomId);
        setPlayers((prev) =>
          prev.map((p) =>
            p.isBot
              ? { ...p, inMatch: false, isSurrendered: false, isAFK: false, isFinished: false, progress: 0, wpm: 0, errors: 0, correctChars: 0 }
              : p
          )
        );
        if (gameMode === 'san_boss') {
          setIsBossVictory(false);
        }
        soundFx.playError();
        setGameState('gameover');
        return;
      }
    }

    soundFx.playError();
  };

  const handleAFK = () => {
    // Không tính cơ chế AFK cho 2 chế độ multiplayer Ngẫu Hứng và Đoán Chữ
    if (gameMode === 'ngau_hung' || gameMode === 'doan_chu') {
      return;
    }
    handleSurrender(true);
  };

  // Surrender Rematch Handler: if player surrendered while match is ongoing, return them to waiting room and light up their avatar
  const handleSurrenderRestart = () => {
    if (playType === 'multiplayer' && currentRoomId) {
      updatePlayerRoomStatus(currentRoomId, currentUserId, {
        inMatch: false,
        isSurrendered: false,
        isAFK: false,
        isFinished: false,
      });
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === currentUserId || p.isBot
            ? { ...p, inMatch: false, isSurrendered: false, isAFK: false, isFinished: false, progress: 0, wpm: 0, errors: 0, correctChars: 0 }
            : p
        )
      );
      setGameState('waiting_room');
    } else {
      handleStartGame();
    }
  };

  // Return to lobby & clear session-only stats (Strictly Session-Only per Room)
  const handleReturnToLobby = () => {
    if (gameState === 'playing' && gameMode !== 'outplay') {
      const me = players.find((p) => p.id === currentUserId);
      recordCurrentMatch({
        modeId: gameMode,
        wpm: me?.wpm || 0,
        accuracy: me?.accuracy ?? 100,
        result: 'Đầu hàng',
        score: me?.score,
        isCompleted: false,
      });

      // Kiểm tra cơ chế chống lạm dụng đầu hàng/thoát bài thi Tông Môn liên tiếp
      if (sectMatchContextRef.current?.type === 'sect_tournament') {
        const penaltyResult = recordSectTrialSurrender(currentUser?.username);
        if (penaltyResult.penalized) {
          serverPenalizeSectSurrender().catch(() => {});
          announcePenalty(
            currentUser?.displayName || currentUser?.username || username,
            'Bỏ cuộc 3 lần liên tiếp trong Vạn Phái Tranh Phong',
            'Khấu trừ 1 lượt xuất chiến bài thi hôm nay'
          );
        }
      }
    }
    if (currentRoomId) {
      leaveRoom(currentRoomId, currentUserId);
      setCurrentRoomId(null);
    }
    setIsRoomHost(true);
    setNewlyUnlockedAchievements([]);
    sectMatchContextRef.current = null;
    setSectMatchContext(null);
    setSectMatchNotice(null);
    setGameState('lobby');
    setConditionStats({});
    setLastGameWpm(0);
    setSessionBestWpm(0);
    try {
      sessionStorage.removeItem('fasttyping_last_game_wpm');
      sessionStorage.removeItem('fasttyping_session_best_wpm');
    } catch {}
  };

  // Return to waiting room after match completion or rematch click
  const handleBackToWaitingRoom = () => {
    const ban = checkClientBanStatus();
    if (ban.isBanned) {
      setClientBanStatus(ban);
      setIsBanModalOpen(true);
      soundFx.playError();
      handleReturnToLobby();
      return;
    }
    setNewlyUnlockedAchievements([]);
    if (currentRoomId) {
      updatePlayerRoomStatus(currentRoomId, currentUserId, {
        inMatch: false,
        isSurrendered: false,
        isFinished: false,
      });
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === currentUserId || p.isBot
            ? { ...p, inMatch: false, isSurrendered: false, isFinished: false, progress: 0, wpm: 0, errors: 0, correctChars: 0 }
            : p
        )
      );
    }
    sectMatchContextRef.current = null;
    setSectMatchContext(null);
    setSectMatchNotice(null);
    setGameState('waiting_room');
  };

  // 15s auto-leave timeout when match ends: xóa người chơi khỏi phòng chờ, nếu là chủ phòng thì slot kế tiếp làm chủ phòng,
  // nhưng vẫn giữ người chơi ở giao diện tổng kết để theo dõi kết quả, nếu bấm Chơi Lại sau khi đã quá giờ thì hiện thông báo
  const handleAutoTimeoutLeave = () => {
    if (currentRoomId) {
      leaveRoom(currentRoomId, currentUserId);
      setCurrentRoomId(null);
    }
    setIsRoomHost(true);
    // Vẫn giữ người chơi ở giao diện tổng kết (gameState === 'gameover'), không tự ý đẩy về lobby
  };


  const handleUpdateConditionStats = (conditionKey: string, lastWpm: number, bestWpm: number) => {
    setConditionStats((prev) => ({
      ...prev,
      [conditionKey]: { lastWpm, bestWpm },
    }));
    setLastGameWpm(lastWpm);
    setSessionBestWpm(bestWpm);
  };

  const handleAcceptBattleChallenge = async (challenge: ChatCardData) => {
    if (!challenge.challengeRoomId) return;
    soundFx.playVictory();
    setIsChatOpen(false);
    const targetMode = (challenge.challengeMode as GameMode) || 'vi_dau';
    await handleModalJoinExistingRoom(challenge.challengeRoomId, targetMode);
  };

  // Auth Success & Logout Handlers
  const applyAuthenticatedUser = useCallback((user: UserAccount) => {
    setCurrentUser(user);
    currentUserRef.current = user;
    if (user.id) {
      setCurrentUserId(user.id);
      currentUserIdRef.current = user.id;
      try {
        localStorage.setItem('fasttyping_player_id', user.id);
        sessionStorage.setItem('fasttyping_player_id', user.id);
      } catch {}
    }
    const activeName = user.displayName || user.username;
    setUsername(activeName);
    usernameRef.current = activeName;
    const userAvatarChoice = user.avatar || '🤖';
    setAvatar(userAvatarChoice);
    const userFrameChoice = user.frame || 'default';
    setUserFrame(userFrameChoice);
    setStoredFrame(userFrameChoice);

    const isUserAdmin = Boolean(user?.isAdmin || String(user?.username || '').toLowerCase() === 'admin');
    setIsAdmin(isUserAdmin);
    setAdminStatus(isUserAdmin);

    // Dữ liệu kỷ lục WPM: ĐẢM BẢO BẢO TOÀN TUYỆT ĐỐI KỶ LỤC CAO NHẤT LỊCH SỬ, TUYỆT ĐỐI KHÔNG BAO GIỜ BỊ RESET HOẶC GIẢM ĐIỂM
    let effectiveBestWpm = typeof user.bestWpm === 'number' && user.bestWpm > 0 ? user.bestWpm : 0;
    let effectiveRecord: BestWpmRecord | null = user.bestWpmRecord || null;

    if (effectiveRecord && typeof effectiveRecord === 'object' && effectiveRecord.wpm > effectiveBestWpm) {
      effectiveBestWpm = effectiveRecord.wpm;
    }

    // 1. Quét lịch sử ván đấu từ server
    if (Array.isArray(user.matchHistory) && user.matchHistory.length > 0) {
      for (const m of user.matchHistory) {
        if (m && typeof m.wpm === 'number' && m.wpm > effectiveBestWpm && m.result !== 'Đầu hàng' && m.result !== 'AFK') {
          effectiveBestWpm = m.wpm;
          effectiveRecord = {
            wpm: m.wpm,
            mode: m.modeId || m.mode || 'vi_dau',
            modeName: m.mode || getFriendlyModeName(m.modeId || 'vi_dau'),
            timestamp: m.timestamp || Date.now(),
          };
        }
      }
    }

    // 2. Quét toàn bộ các khóa lưu trữ trên máy (LocalStorage, Outplay, v.v.)
    const localGeneralWpm = Number(localStorage.getItem('fasttyping_best_wpm')) || 0;
    const localOutplayWpm = Number(localStorage.getItem('fasttyping_outplay_best_wpm')) || 0;
    const statePeakWpm = Math.max(bestWpmRef.current || 0, bestWpm || 0);
    const localHighestWpm = Math.max(localGeneralWpm, localOutplayWpm, statePeakWpm);

    if (localHighestWpm > effectiveBestWpm) {
      effectiveBestWpm = localHighestWpm;
      try {
        const outplayRecStr = localStorage.getItem('fasttyping_outplay_best_record');
        if (outplayRecStr) {
          const parsed = JSON.parse(outplayRecStr);
          if (parsed && typeof parsed.wpm === 'number' && parsed.wpm >= (effectiveRecord?.wpm || 0)) {
            effectiveRecord = parsed;
          }
        }
        const generalRecStr = localStorage.getItem('fasttyping_best_wpm_record');
        if (generalRecStr) {
          const parsed = JSON.parse(generalRecStr);
          if (parsed && typeof parsed.wpm === 'number' && parsed.wpm >= (effectiveRecord?.wpm || 0)) {
            effectiveRecord = parsed;
          }
        }
      } catch {}
    }

    // 3. Quét lịch sử đấu cục bộ để không bỏ sót bất kỳ ván đấu nào có điểm cao hơn
    const storedHistory = getStoredMatchHistory();
    if (Array.isArray(storedHistory)) {
      for (const m of storedHistory) {
        if (m && typeof m.wpm === 'number' && m.wpm > effectiveBestWpm && m.result !== 'Đầu hàng' && m.result !== 'AFK') {
          effectiveBestWpm = m.wpm;
          effectiveRecord = {
            wpm: m.wpm,
            mode: m.modeId || m.mode || 'vi_dau',
            modeName: m.mode || getFriendlyModeName(m.modeId || 'vi_dau'),
            timestamp: m.timestamp || Date.now(),
          };
        }
      }
    }

    setBestWpm(effectiveBestWpm);
    setBestWpmRecord(effectiveRecord);
    bestWpmRef.current = effectiveBestWpm;

    if (effectiveBestWpm > 0) {
      localStorage.setItem('fasttyping_best_wpm', effectiveBestWpm.toString());
      if (effectiveRecord) {
        try {
          localStorage.setItem('fasttyping_best_wpm_record', JSON.stringify(effectiveRecord));
          if (isOutplayMode(effectiveRecord.mode)) {
            localStorage.setItem('fasttyping_outplay_best_wpm', effectiveBestWpm.toString());
            localStorage.setItem('fasttyping_outplay_best_record', JSON.stringify(effectiveRecord));
          }
        } catch {}
      }

      // Nếu máy khách đang có kỷ lục cao hơn kỷ lục máy chủ lưu trữ, tự động đồng bộ lên máy chủ để sửa chữa
      if (effectiveBestWpm > (user.bestWpm || 0)) {
        updateUserProfile({
          bestWpm: effectiveBestWpm,
          bestWpmRecord: effectiveRecord,
        }).catch(() => {});
      }
    }

    const serverTotalGames = typeof user.totalGames === 'number' ? user.totalGames : 0;
    const localTotalGames = Number(localStorage.getItem('fasttyping_games_count')) || 0;
    const effectiveTotalGames = Math.max(serverTotalGames, localTotalGames);
    setTotalGames(effectiveTotalGames);
    if (effectiveTotalGames > 0) {
      localStorage.setItem('fasttyping_games_count', effectiveTotalGames.toString());
    }

    // Hợp nhất an toàn lịch sử đấu: Giữ trọn vẹn cả lịch sử máy chủ lẫn các ván mới ở máy khách
    const serverHistory = Array.isArray(user.matchHistory) ? user.matchHistory : [];
    const localHistList = getStoredMatchHistory() || [];
    const mergedHistoryMap = new Map<string, MatchRecord>();
    for (const m of [...serverHistory, ...localHistList, ...matchHistory]) {
      if (m && m.id) {
        const existing = mergedHistoryMap.get(m.id);
        if (!existing || (m.wpm || 0) >= (existing.wpm || 0)) {
          mergedHistoryMap.set(m.id, m);
        }
      }
    }
    const finalHistory = Array.from(mergedHistoryMap.values())
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 50);

    if (finalHistory.length > 0) {
      setMatchHistory(finalHistory);
      try {
        localStorage.setItem('fasttyping_match_history', JSON.stringify(finalHistory));
      } catch {}
    }

    // Tiến độ tu vi tiên hiệp: Hợp nhất bảo toàn tiến độ đã đạt được, không bao giờ bị ghi đè mất Tu Vi hay Điểm Danh
    const localCult = loadStoredCultivationState();
    const mergedCult = mergeCultivationStates(localCult, user.cultivation);
    const syncRes = ensureDailySync(mergedCult);
    setCultivationState(syncRes.updatedState);
    saveStoredCultivationState(syncRes.updatedState);
    user.cultivation = syncRes.updatedState;

    // Danh hiệu & thành tựu
    if (Array.isArray(user.showcaseAchievements)) {
      setShowcaseAchievements(user.showcaseAchievements, user.id);
    }
    if (Array.isArray(user.unlockedAchievements)) {
      setStoredUnlockedAchievements(user.unlockedAchievements, user.id);
    }

    setCurrentUserId(user.id);
    try {
      localStorage.setItem('fasttyping_player_id', user.id);
      sessionStorage.setItem('fasttyping_player_id', user.id);
    } catch {}

    localStorage.setItem('fasttyping_user', activeName);
    localStorage.setItem('fasttyping_username', activeName);
    sessionStorage.setItem('fasttyping_user_session', activeName);
    localStorage.setItem('fasttyping_avatar', userAvatarChoice);
    sessionStorage.setItem('fasttyping_avatar_session', userAvatarChoice);

    if (currentRoomId) {
      setPlayers((prev) => {
        const next = prev.map((p) =>
          p.id === currentUserId
            ? { 
                ...p, 
                username: activeName, 
                icon: userAvatarChoice, 
                frame: userFrameChoice,
                showcaseAchievements: user.showcaseAchievements || p.showcaseAchievements,
              }
            : p
        );
        updateRoomPlayers(currentRoomId, next);
        return next;
      });
    }
  }, [currentRoomId, currentUserId]);

  // Khôi phục phiên đăng nhập và toàn bộ dữ liệu từ server khi tải trang (chỉ chạy 1 lần khi mount)
  useEffect(() => {
    fetchCurrentUser()
      .then((user) => {
        if (user) {
          applyAuthenticatedUser(user);
        }
      })
      .catch(() => {});
  }, []);

  // Lắng nghe toàn bộ sự kiện Ban Quản Trị thời gian thực (Ban Thưởng, Cảnh Giới, Khung, Cấm đấu, Phân quyền)
  useEffect(() => {
    const isTargetMe = (detail: any): boolean => {
      if (!detail) return false;
      const targetUid = String(detail.userId || '').toLowerCase().trim();
      const targetUname = String(detail.username || '').toLowerCase().trim().replace(/^@/, '');
      const targetDisp = String(detail.displayName || '').toLowerCase().trim().replace(/^@/, '');

      const curUser = currentUserRef.current;
      const myUid = String(curUser?.id || currentUserIdRef.current || '').toLowerCase().trim();
      const myUsername = String(curUser?.username || '').toLowerCase().trim().replace(/^@/, '');
      const myDisp = String(curUser?.displayName || usernameRef.current || '').toLowerCase().trim().replace(/^@/, '');
      const myCurrentName = String(usernameRef.current || '').toLowerCase().trim().replace(/^@/, '');

      if (!targetUid && !targetUname && !targetDisp) return true; // Global broadcast
      if (targetUid && myUid && targetUid === myUid) return true;
      if (targetUname && myUsername && targetUname === myUsername) return true;
      if (targetUname && myDisp && targetUname === myDisp) return true;
      if (targetUname && myCurrentName && targetUname === myCurrentName) return true;
      if (targetDisp && myDisp && targetDisp === myDisp) return true;
      if (targetDisp && myUsername && targetDisp === myUsername) return true;
      return false;
    };

    // 1. Nhận thưởng Linh Thạch, Tu Vi, Đan Dược
    const handleAdminReward = (e: any) => {
      const detail = e.detail;
      if (!isTargetMe(detail)) return;

      if (detail?.cultivation) {
        const syncRes = ensureDailySync(detail.cultivation);
        setCultivationState(syncRes.updatedState);
        saveStoredCultivationState(syncRes.updatedState);
        soundFx.playLevelUp();
        setCurrentUser((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, cultivation: syncRes.updatedState };
          try {
            localStorage.setItem('fasttyping_user', JSON.stringify(updated));
          } catch {}
          return updated;
        });

        if (detail.message) {
          window.dispatchEvent(
            new CustomEvent('admin_reward_notification', {
              detail: {
                title: 'BÀN CỔ THẦN ĐIỆN BAN THƯỞNG',
                message: detail.message,
                timestamp: Date.now(),
              },
            })
          );
        }
      }
    };

    // 2. Nhận thăng cấp cảnh giới & tầng tu vi trực tiếp
    const handleLevelUpdate = (e: any) => {
      const detail = e.detail;
      if (!isTargetMe(detail)) return;

      if (detail?.cultivation) {
        const syncRes = ensureDailySync(detail.cultivation);
        setCultivationState(syncRes.updatedState);
        saveStoredCultivationState(syncRes.updatedState);
        soundFx.playVictory();
        setCurrentUser((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, cultivation: syncRes.updatedState };
          try {
            localStorage.setItem('fasttyping_user', JSON.stringify(updated));
          } catch {}
          return updated;
        });

        window.dispatchEvent(
          new CustomEvent('admin_reward_notification', {
            detail: {
              title: 'THĂNG CẤP CẢNH GIỚI',
              message: detail.message || `Cảnh giới của bạn đã được nâng lên ${detail.realmName || syncRes.updatedState.realmName} Tầng ${detail.tier || syncRes.updatedState.tier}!`,
              timestamp: Date.now(),
            },
          })
        );
      }
    };

    // 3. Nhận ban thưởng khung viền đại diện
    const handleFrameUpdate = (e: any) => {
      const detail = e.detail;
      if (!isTargetMe(detail) || !detail.frame) return;

      setUserFrame(detail.frame);
      setStoredFrame(detail.frame);
      metaRef.current.frame = detail.frame;
      soundFx.playAchievementUnlock();

      setCurrentUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, frame: detail.frame };
        try {
          localStorage.setItem('fasttyping_user', JSON.stringify(updated));
          localStorage.setItem('fasttyping_user_frame', detail.frame);
        } catch {}
        return updated;
      });

      window.dispatchEvent(
        new CustomEvent('admin_reward_notification', {
          detail: {
            title: 'BAN THƯỞNG KHUNG VIỀN',
            message: detail.message || `Bạn vừa được ban thưởng khung viền mới [${detail.frame}]!`,
            timestamp: Date.now(),
          },
        })
      );
    };

    // 4. Án phạt cấm thi đấu (Bàn Cổ Thần Phạt)
    const handleUserBanned = (e: any) => {
      const detail = e.detail;
      if (!isTargetMe(detail)) return;

      const banTime = detail.bannedUntil || (Date.now() + (detail.durationMs || 7200000));
      saveStoredBanInfo(banTime, detail.reason || 'Quyết định từ Ban Quản Trị');
      setClientBanStatus(checkClientBanStatus());
      setIsBanModalOpen(true);
      handleLeaveRoom();
      handleReturnToLobby();
      soundFx.playError();
    };

    // 5. Hóa giải lệnh cấm thi đấu
    const handleUserUnbanned = (e: any) => {
      const detail = e.detail;
      if (!isTargetMe(detail)) return;

      clearStoredBanInfo();
      setClientBanStatus(checkClientBanStatus());
      setIsBanModalOpen(false);
      soundFx.playSuccess();
    };

    // 6. Cập nhật quyền Quản Trị Viên (Admin)
    const handleAdminRoleUpdate = (e: any) => {
      const detail = e.detail;
      if (!isTargetMe(detail)) return;

      const isAdm = Boolean(detail.isAdmin);
      setIsAdmin(isAdm);
      setAdminStatus(isAdm);
      soundFx.playSuccess();

      setCurrentUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, isAdmin: isAdm };
        try {
          localStorage.setItem('fasttyping_user', JSON.stringify(updated));
          localStorage.setItem('fasttyping_is_admin', isAdm ? 'true' : 'false');
        } catch {}
        return updated;
      });

      window.dispatchEvent(
        new CustomEvent('admin_reward_notification', {
          detail: {
            title: 'PHÂN QUYỀN HỆ THỐNG',
            message: detail.message || (isAdm ? 'Bạn đã được bổ nhiệm làm Quản Trị Viên!' : 'Quyền Quản Trị Viên của bạn đã kết thúc.'),
            timestamp: Date.now(),
          },
        })
      );
    };

    // 7. Thông báo đặt lại mật khẩu
    const handlePasswordReset = (e: any) => {
      const detail = e.detail;
      if (!isTargetMe(detail)) return;

      window.dispatchEvent(
        new CustomEvent('admin_reward_notification', {
          detail: {
            title: 'ĐẶT LẠI MẬT KHẨU',
            message: detail.message || 'Mật khẩu tài khoản của bạn đã được quản trị viên đặt lại!',
            timestamp: Date.now(),
          },
        })
      );
    };

    window.addEventListener('cultivation_reward_received', handleAdminReward);
    window.addEventListener('cultivation_level_updated', handleLevelUpdate);
    window.addEventListener('frame_updated', handleFrameUpdate);
    window.addEventListener('user_banned', handleUserBanned);
    window.addEventListener('user_unbanned', handleUserUnbanned);
    window.addEventListener('admin_role_updated', handleAdminRoleUpdate);
    window.addEventListener('password_reset_notice', handlePasswordReset);

    return () => {
      window.removeEventListener('cultivation_reward_received', handleAdminReward);
      window.removeEventListener('cultivation_level_updated', handleLevelUpdate);
      window.removeEventListener('frame_updated', handleFrameUpdate);
      window.removeEventListener('user_banned', handleUserBanned);
      window.removeEventListener('user_unbanned', handleUserUnbanned);
      window.removeEventListener('admin_role_updated', handleAdminRoleUpdate);
      window.removeEventListener('password_reset_notice', handlePasswordReset);
    };
  }, [currentUser, currentUserId, username, setCultivationState, handleLeaveRoom]);

  const handleAuthSuccess = (user: UserAccount) => {
    applyAuthenticatedUser(user);
  };

  const handleLogout = async () => {
    await logoutUser();

    // 1. Xóa sạch toàn bộ dữ liệu người chơi và kỷ lục cá nhân khỏi localStorage & sessionStorage
    try {
      localStorage.removeItem('fasttyping_user');
      sessionStorage.removeItem('fasttyping_user_session');
      localStorage.removeItem('fasttyping_avatar');
      sessionStorage.removeItem('fasttyping_avatar_session');
      localStorage.removeItem('fasttyping_user_frame');
      localStorage.removeItem('fasttyping_best_wpm');
      localStorage.removeItem('fasttyping_best_wpm_record');
      localStorage.removeItem('fasttyping_games_count');
      localStorage.removeItem('fasttyping_match_history');
      localStorage.removeItem('fasttyping_cultivation_state_v1');
      localStorage.removeItem('fasttyping_is_admin');
      localStorage.removeItem('fasttyping_unlocked_achievements');
      localStorage.removeItem('fasttyping_showcase_achievements');

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('fasttyping_unlocked_achievements_') ||
            key.startsWith('fasttyping_showcase_achievements_'))
        ) {
          localStorage.removeItem(key);
        }
      }
    } catch {}

    // 2. Reset trạng thái xác thực và quyền Admin
    setCurrentUser(null);
    setIsAdmin(false);
    setAdminStatus(false);

    // 3. Đưa thông tin người chơi về trạng thái Tán Tu mặc định mới hoàn toàn
    const defaultName = 'Tán Tu ' + Math.floor(Math.random() * 900 + 100);
    const defaultAvatar = '🤖';
    const defaultFrame = 'default';
    const newGuestId = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

    setCurrentUserId(newGuestId);
    try {
      localStorage.setItem('fasttyping_player_id', newGuestId);
      sessionStorage.setItem('fasttyping_player_id', newGuestId);
    } catch {}

    setUsername(defaultName);
    setAvatar(defaultAvatar);
    setUserFrame(defaultFrame);
    setStoredFrame(defaultFrame);

    setBestWpm(0);
    setBestWpmRecord(null);
    setTotalGames(0);
    setMatchHistory([]);
    setCultivationState(createInitialCultivationState());
    setNewlyUnlockedAchievements([]);
    setCultivationMatchHarvest(null);

    sessionStorage.setItem('fasttyping_user_session', defaultName);
    sessionStorage.setItem('fasttyping_avatar_session', defaultAvatar);

    // 4. Cập nhật phòng chơi nếu đang tham gia phòng
    if (currentRoomId) {
      setPlayers((prev) => {
        const next = prev.map((p) =>
          p.id === currentUserId
            ? {
                ...p,
                username: defaultName,
                icon: defaultAvatar,
                frame: defaultFrame,
                showcaseAchievements: [],
              }
            : p
        );
        updateRoomPlayers(currentRoomId, next);
        return next;
      });
    }
  };

  // Name & Avatar & Frame Change (Restricted to logged-in users)
  const handleChangeUsername = (newName: string) => {
    if (!currentUser) return;
    setUsername(newName);
    setCurrentUser((prev) => (prev ? { ...prev, displayName: newName } : null));
    updateUserProfile({ displayName: newName, username: newName });
    localStorage.setItem('fasttyping_user', newName);
    localStorage.setItem('fasttyping_username', newName);
    sessionStorage.setItem('fasttyping_user_session', newName);
    if (currentRoomId) {
      setPlayers((prev) => {
        const next = prev.map((p) => (p.id === currentUserId ? { ...p, username: newName } : p));
        updateRoomPlayers(currentRoomId, next);
        return next;
      });
    }
  };

  const handleChangeAvatar = (newAvatar: string) => {
    if (!currentUser) return;
    setAvatar(newAvatar);
    updateUserProfile({ avatar: newAvatar });
    localStorage.setItem('fasttyping_avatar', newAvatar);
    sessionStorage.setItem('fasttyping_avatar_session', newAvatar);
    if (currentRoomId) {
      setPlayers((prev) => {
        const next = prev.map((p) => (p.id === currentUserId ? { ...p, icon: newAvatar } : p));
        updateRoomPlayers(currentRoomId, next);
        return next;
      });
    }
  };

  const handleChangeFrame = (newFrame: string) => {
    if (!currentUser) return;
    setUserFrame(newFrame);
    setStoredFrame(newFrame);
    updateUserProfile({ frame: newFrame });
    if (currentRoomId) {
      setPlayers((prev) => {
        const next = prev.map((p) => (p.id === currentUserId ? { ...p, frame: newFrame } : p));
        updateRoomPlayers(currentRoomId, next);
        return next;
      });
    }
  };

  const handleChangeShowcaseAchievements = (newShowcase: string[]) => {
    setShowcaseAchievements(newShowcase);
    if (currentUser) {
      setCurrentUser((prev) => (prev ? { ...prev, showcaseAchievements: newShowcase } : prev));
      updateUserProfile({ showcaseAchievements: newShowcase });
    }
    setPlayers((prev) => {
      const next = prev.map((p) =>
        p.id === currentUserId ? { ...p, showcaseAchievements: newShowcase } : p
      );
      if (currentRoomId) {
        updateRoomPlayers(currentRoomId, next);
      }
      return next;
    });
  };

  // Admin Actions
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    try {
      return localStorage.getItem('fasttyping_admin_pwd') || 'admin123';
    } catch {
      return 'admin123';
    }
  });

  const handleAdminLogin = (pwd: string) => {
    if (pwd === adminPassword) {
      setIsAdmin(true);
      setAdminStatus(true);
      // Đồng bộ đăng nhập phiên tài khoản admin trên máy chủ backend nếu chưa đăng nhập
      if (!currentUser?.isAdmin && String(currentUser?.username || '').toLowerCase() !== 'admin') {
        loginWithEmail('admin', pwd)
          .then((res) => {
            if (res.success && res.user) {
              applyAuthenticatedUser(res.user);
            }
          })
          .catch(() => {});
      }
      return true;
    }
    return false;
  };

  const handleChangeAdminPassword = (newPwd: string, oldPwd: string) => {
    if (oldPwd !== adminPassword) {
      return false;
    }
    setAdminPassword(newPwd);
    try {
      localStorage.setItem('fasttyping_admin_pwd', newPwd);
    } catch {
      // ignore
    }
    return true;
  };

  const handleClearChat = async () => {
    try {
      await clearServerChat();
      setChatMessages((prev) => prev.filter((m) => m.channel !== 'global'));
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  const handleResetLeaderboard = async (modeKey?: string) => {
    if (modeKey) {
      setHighScores((prev) => {
        const next = { ...prev, [modeKey]: null };
        saveLeaderboardToIndexedDB(next).catch(() => {});
        return next;
      });
      await adminResetLeaderboard(modeKey);
    } else {
      const cleanScores: Record<string, HighScoreRecord | null> = {
        vi_dau: null,
        vi_nodau: null,
        en: null,
        numpad: null,
        outplay: null,
        ngau_hung: null,
        doan_chu: null,
        san_boss: null,
      };
      setHighScores(cleanScores);
      clearLeaderboardFromIndexedDB().catch(() => {});
      await adminResetLeaderboard();
    }
  };

  const handleUpdateHighScores = async (newScores: Record<string, HighScoreRecord | null>) => {
    setHighScores(newScores);
    saveLeaderboardToIndexedDB(newScores).catch(() => {});
    await adminUpdateLeaderboard(newScores);
  };

  const handleRefreshLeaderboard = async () => {
    try {
      const res = await fetchLeaderboard();
      if (res) {
        const scores = (res as any).highScores || res;
        setHighScores(scores);
        saveLeaderboardToIndexedDB(scores).catch(() => {});
      }
    } catch (err) {
      console.error('Error refreshing leaderboards:', err);
    }
  };

  // Khiêu Chiến Bóng Ma (Ghost Challenge): Đua cùng nhịp gõ của kỷ lục gia Bảng Vàng
  const handleStartGhostChallenge = (entry: any) => {
    soundFx.playVictory();
    setIsLeaderboardOpen(false);
    const targetWpm = entry?.wpm > 0 ? entry.wpm : (entry?.score > 0 ? Math.round(entry.score / 2) : 90);
    setOutplayPaceMode('custom');
    setOutplayCustomWpm(targetWpm);
    try {
      localStorage.setItem('fasttyping_outplay_pacemode', 'custom');
      localStorage.setItem('fasttyping_outplay_custom_wpm', String(targetWpm));
    } catch {}
    setGameMode('outplay');
    setPlayType('solo');
    handleLaunchGame(true, 'outplay');
  };

  // Gửi lời mời kết bạn từ Preview Profile
  const handleAddFriend = async (targetUserId: string, targetUsername?: string) => {
    soundFx.playKeyClick();
    try {
      const activeUid = currentUser?.id || currentUserId;
      const activeName = currentUser?.username || username;
      const res = await sendFriendRequest(targetUsername || targetUserId, targetUserId, undefined, activeUid, activeName);
      if (res && res.success) {
        soundFx.playVictory();
        if (res.autoAccepted) {
          setFriendInviteToast({
            id: `fa_${Date.now()}`,
            type: 'friend_request_accepted',
            fromName: targetUsername || 'Đạo Hữu',
          });
        }
        if (activeUid) {
          fetchFriendsList(activeUid, activeName).then((data) => {
            if (data && data.success) {
              setFriendsList(data.friends || []);
              setFriendRequestsCount(data.pendingRequests?.length || 0);
            }
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Failed to send friend request:', err);
    }
  };

  // Mode display name helper
  const getModeTitle = () => {
    if (sectMatchContext?.type === 'sect_boss') {
      return '🐉 Vây Quét Thần Thú Trấn Giới';
    }
    if (sectMatchContext?.type === 'sect_tournament') {
      return '⚔️ Vạn Phái Tranh Phong (Vượt 3 Ải Solo)';
    }
    switch (gameMode) {
      case 'vi_dau':
        return '🪷 Chính Đạo Vấn Tâm (Tiếng Việt Có Dấu)';
      case 'vi_nodau':
        return '⚡ Tật Phong Ngự Kiếm (Tiếng Việt Không Dấu)';
      case 'en':
        return '🌐 Dị Vực Luận Đạo (Tiếng Anh)';
      case 'numpad':
        return '🔢 Cửu Cung Trận Pháp (Bàn Phím Số)';
      case 'ngau_hung':
        return '🌪️ Lôi Đình Nhất Kích (Ngẫu Hứng - Rush)';
      case 'doan_chu':
        return '🔮 Huyền Cơ Mật Cảnh (Đoán Chữ - Mystery)';
      case 'san_boss':
        return '🐉 Hàng Phục Ma Tôn (Săn Boss Hắc Long)';
      case 'outplay':
        return '🎯 Tâm Ma Thí Luyện (Đột Phá Bản Ngã)';
      default:
        return 'Chính Đạo Vấn Tâm';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg,#0a0e17)] text-[var(--theme-text,#f8fafc)] flex flex-col selection:bg-[var(--theme-main,#10b981)] selection:text-black transition-colors duration-300">
      {/* Universal Top Header */}
      <Header
        username={username}
        avatar={avatar}
        onlineCount={onlineCount}
        isMuted={isMuted}
        isAdmin={isAdmin}
        isLoggedIn={!!currentUser}
        onToggleMute={() => setIsMuted(soundFx.toggleMute())}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenMatchHistory={() => setIsMatchHistoryOpen(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onOpenFriends={() => {
          if (friendRequestsCount > 0) {
            setFriendsInitialTab('requests');
          } else {
            setFriendsInitialTab('friends');
          }
          setIsFriendsOpen(true);
        }}
        friendRequestsCount={friendRequestsCount}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenProfile={() => {
          setProfileInitialTab('profile');
          setIsProfileOpen(true);
        }}
        onOpenAppearance={() => {
          setIsAppearanceOpen(true);
        }}
        onOpenCultivation={() => {
          if (!currentUser) {
            soundFx.playKeyClick();
            setAuthModalInitialTab('login');
            setIsAuthModalOpen(true);
            return;
          }
          setIsCultivationOpen(true);
        }}
        cultivationLevel={currentUser ? cultivationState.level : undefined}
        cultivationRealmName={currentUser ? XIANXIA_REALMS[cultivationState.realmIndex]?.name : 'Tán Tu'}
        cultivationTier={currentUser ? cultivationState.tier : undefined}
        cultivationSubStage={currentUser ? getSubStage(cultivationState.tier) : undefined}
        cultivationIcon={currentUser ? XIANXIA_REALMS[cultivationState.realmIndex]?.icon : '🌱'}
        cultivationThoNguyen={currentUser ? cultivationState.thoNguyen : undefined}
        cultivationMaxThoNguyen={currentUser ? cultivationState.maxThoNguyen : undefined}
        onOpenOnlineUsers={() => setIsOnlineUsersOpen(true)}
        onOpenAuthModal={() => {
          setAuthModalInitialTab('login');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onGoHome={handleReturnToLobby}
        activeModeName={getModeTitle()}
        onOpenHeavenlyChronicle={() => setIsHeavenlyChronicleOpen(true)}
        isBanned={clientBanStatus.isBanned}
        bannedRemainingFormatted={clientBanStatus.formatted}
        onOpenBanModal={() => setIsBanModalOpen(true)}
      />

      {/* Heavenly Ticker Banner (Chiếu Thư Thiên Đạo & Sấm Truyền Khí Linh) */}
      <HeavenlyTickerBanner onOpenChronicle={() => setIsHeavenlyChronicleOpen(true)} />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-start gap-6">
        {/* Breaking Record Golden Wave Ticker (Thông báo chiếu thư phá kỷ lục ngày toàn server) */}
        {breakingRecordNotice && (
          <div
            id="breaking-record-banner"
            className="w-full max-w-4xl mx-auto p-3.5 rounded-2xl bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 border-2 border-yellow-400 shadow-2xl shadow-yellow-500/30 text-yellow-100 flex items-center justify-between gap-3 animate-pulse"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl animate-bounce">👑⚡</span>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                  CHIẾU THƯ PHONG THẦN • XÔ ĐỔ KỶ LỤC TOÀN SERVER
                </div>
                <div className="text-xs sm:text-sm font-bold text-white truncate">
                  Đạo hữu <span className="text-yellow-300 font-black">@{breakingRecordNotice.displayName || breakingRecordNotice.username}</span> vừa lập kỷ lục mới chế độ <span className="text-amber-400 font-black">{breakingRecordNotice.modeName}</span> với <span className="text-yellow-300 font-mono font-black">{breakingRecordNotice.score > 0 ? `${breakingRecordNotice.score.toLocaleString()} Điểm` : `${breakingRecordNotice.wpm} WPM`}</span>! 🏆
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBreakingRecordNotice(null)}
              className="p-1 rounded-lg bg-yellow-900/60 hover:bg-yellow-800 text-yellow-300 cursor-pointer"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Kicked / Host Action Notification Banner */}
        {kickedNotice && (
          <div
            id="kicked-player-notification-toast"
            className="w-full max-w-xl mx-auto p-4 rounded-2xl bg-rose-950/90 border-2 border-rose-500/80 text-rose-200 shadow-2xl flex items-center justify-between gap-3 animate-slideDown"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-rose-400">
                  THÔNG BÁO TỪ PHÒNG CHỜ
                </div>
                <div className="text-sm font-semibold text-white">
                  {kickedNotice}
                </div>
              </div>
            </div>
            <button
              id="btn-dismiss-kicked-notice"
              type="button"
              onClick={() => setKickedNotice(null)}
              className="p-1.5 rounded-lg bg-rose-900/50 hover:bg-rose-800 text-rose-300 hover:text-white cursor-pointer transition-colors"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. CLEAN LOBBY / HOME VIEW (SHOWS ALL GAME MODES FOR SELECTION ONLY) */}
        {gameState === 'lobby' && (
          <LobbyView
            currentMode={gameMode}
            onSelectMode={handleSelectMode}
            onStartSoloGame={handleStartSoloGame}
            onJoinWaitingRoom={handleJoinWaitingRoom}
            isBanned={clientBanStatus.isBanned}
            bannedRemainingFormatted={clientBanStatus.formatted}
            banReason={clientBanStatus.reason}
            onOpenBanModal={() => setIsBanModalOpen(true)}
            onOpenSectModal={() => {
              setCultivationInitialTab('sects');
              setIsCultivationOpen(true);
            }}
            hasAnyModalOpen={
              isLeaderboardOpen ||
              isChatOpen ||
              isAdminOpen ||
              isProfileOpen ||
              isAppearanceOpen ||
              isOnlineUsersOpen ||
              isAuthModalOpen ||
              isCultivationOpen ||
              isJoinModalOpen
            }
          />
        )}

        {/* 2. MULTIPLAYER WAITING ROOM VIEW */}
        {gameState === 'waiting_room' && (
          <WaitingRoomView
            mode={gameMode}
            modeName={getModeTitle()}
            difficulty={difficulty}
            onSelectDifficulty={handleSelectDifficulty}
            players={players}
            currentPlayerId={currentUserId}
            roomId={currentRoomId || undefined}
            isHost={isRoomHost}
            onAddBot={handleAddBot}
            onRemoveBot={handleRemoveBot}
            onTransferHost={handleTransferHost}
            onKickPlayer={handleKickPlayer}
            onStartGame={() => handleLaunchGame(false)}
            onLeaveWaitingRoom={handleReturnToLobby}
            currentUsername={username}
            currentAvatar={avatar}
            onChangeAvatar={handleChangeAvatar}
            onChangeUsername={handleChangeUsername}
            highScores={highScores}
            isAdmin={isAdmin}
            friendsList={friendsList}
            onOpenFriends={() => setIsFriendsOpen(true)}
            currentUser={currentUser}
            cultivationState={cultivationState}
            onOpenWhisper={openWhisperWith}
            onAddFriend={handleAddFriend}
            onStartGhostChallenge={handleStartGhostChallenge}
          />
        )}

        {/* 3. COUNTDOWN OVERLAY */}
        {gameState === 'countdown' && (
          <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-fadeIn select-none">
            <div className="text-8xl sm:text-9xl font-black text-amber-400 font-['JetBrains_Mono',monospace] animate-ping">
              {countdownNum === 0 ? 'XUẤT PHÁT!' : countdownNum}
            </div>
            <div className="mt-8 text-slate-400 text-sm font-semibold tracking-wider uppercase">
              Chuẩn bị gõ: <span className="text-white">{getModeTitle()}</span>
            </div>
          </div>
        )}

        {/* 3. PLAYING ARENAS (Optimized with MemoizedArenaSection to isolate high-frequency progress updates & prevent root App re-renders in Citrix VDI) */}
        {gameState === 'playing' && (
          <MemoizedArenaSection
            gameMode={gameMode}
            words={words}
            mysteryWords={mysteryWords}
            bossState={bossState}
            config={config}
            difficulty={difficulty}
            roomPlayers={players}
            currentPlayerId={currentUserId}
            playType={playType}
            currentRoomId={currentRoomId}
            sectMatchContext={sectMatchContext}
            conditionStats={conditionStats}
            lastGameWpm={lastGameWpm}
            sessionBestWpm={sessionBestWpm}
            outplayPaceMode={outplayPaceMode}
            outplayCustomWpm={outplayCustomWpm}
            friendsList={friendsList}
            currentUser={currentUser}
            username={username}
            avatar={avatar}
            userFrame={userFrame}
            modeTitle={getModeTitle()}
            onFinishMatch={handleFinishMatch}
            onSurrender={handleSurrender}
            onAFK={handleAFK}
            onRestart={playType === 'multiplayer' ? handleSurrenderRestart : handleStartGame}
            onHome={handleReturnToLobby}
            onUpdateConditionStats={handleUpdateConditionStats}
            onUpdateSessionStats={(newLast, newBest) => {
              setLastGameWpm(newLast);
              setSessionBestWpm(newBest);
            }}
            onPaceModeChange={(newPace) => {
              setOutplayPaceMode(newPace);
              try {
                localStorage.setItem('fasttyping_outplay_pacemode', newPace);
              } catch {}
            }}
            onCustomWpmChange={(newWpm) => {
              setOutplayCustomWpm(newWpm);
              try {
                localStorage.setItem('fasttyping_outplay_custom_wpm', newWpm.toString());
              } catch {}
            }}
            onBossDamage={handleBossDamage}
            onBossSelfDestruct={handleBossSelfDestruct}
            onBossFinish={handleBossFinish}
            recordCurrentMatch={recordCurrentMatch}
            setHighScores={setHighScores}
            setMysteryWordStats={setMysteryWordStats}
            setNgauHungStats={setNgauHungStats}
            setGameState={setGameState}
          />
        )}

        {/* 4. SECT WAR IMPERIAL DECREE REPORT MODAL (Chiếu Thư Báo Tiệp Tông Môn) */}
        {gameState === 'gameover' && sectWarReportData && (
          <SectWarReportModal
            data={sectWarReportData}
            onPlayAgain={(isPractice) => {
              const sid = sectWarReportData.sectId;
              const sname = sectWarReportData.sectName;
              setSectWarReportData(null);
              handleStartSectTournament(sid, sname, { isPractice });
            }}
            onBackToSect={() => {
              setSectWarReportData(null);
              setGameState('lobby');
              setIsCultivationOpen(true);
            }}
            onBackToLobby={() => {
              setSectWarReportData(null);
              setGameState('lobby');
            }}
          />
        )}

        {/* 4. STANDARD GAME OVER MODAL (Khi không có báo tiệp tông môn) */}
        {gameState === 'gameover' && !sectWarReportData && (
          <GameOverModal
            players={players}
            currentPlayerId={currentUserId}
            gameMode={gameMode}
            isBossMode={gameMode === 'san_boss'}
            isBossVictory={isBossVictory}
            isLoggedIn={!!currentUser}
            onOpenAuthModal={() => {
              setAuthModalInitialTab('login');
              setIsAuthModalOpen(true);
            }}
            onPlayAgain={playType === 'multiplayer' ? handleBackToWaitingRoom : handleStartGame}
            onBackToLobby={handleReturnToLobby}
            onBackToWaitingRoom={handleBackToWaitingRoom}
            onAutoTimeoutLeave={handleAutoTimeoutLeave}
            modeName={getModeTitle()}
            isSolo={playType === 'solo'}
            isOutplay={gameMode === 'outplay'}
            ngauHungStats={ngauHungStats}
            mysteryWordStats={mysteryWordStats}
            bossBattleStats={bossBattleStats}
            cultivationState={cultivationState}
            cultivationMatchResult={cultivationMatchHarvest}
            onOpenCultivation={() => {
              if (!currentUser) {
                soundFx.playKeyClick();
                setAuthModalInitialTab('login');
                setIsAuthModalOpen(true);
                return;
              }
              setIsCultivationOpen(true);
            }}
            newlyUnlockedAchievements={newlyUnlockedAchievements}
            onOpenProfileAchievements={() => {
              setProfileInitialTab('achievements');
              setIsProfileOpen(true);
            }}
            onOpenMatchHistory={() => {
              setIsMatchHistoryOpen(true);
            }}
            isDaoDecreeOpen={Boolean(activeDaoDecreePopup)}
            sectMatchNotice={sectMatchNotice}
          />
        )}
      </main>

      {/* Floating Chat Drawer */}
      {isChatOpen && (
        <ChatDrawer
          messages={chatMessages}
          currentUsername={currentUser?.displayName || currentUser?.username || username}
          currentUserAvatar={avatar}
          currentUserFrame={userFrame}
          currentUserId={currentUser?.id || currentUserId}
          currentRoomId={currentRoomId}
          currentSectId={cultivationState?.sectId}
          currentSectName={cultivationState?.sectName}
          currentSectTag={cultivationState?.sectTag}
          currentRealmName={XIANXIA_REALMS[cultivationState.realmIndex]?.name}
          currentRealmIcon={XIANXIA_REALMS[cultivationState.realmIndex]?.icon}
          bestWpm={bestWpm}
          bestWpmRecord={bestWpmRecord}
          cultivationState={cultivationState}
          isAdmin={isAdmin}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          onClose={() => setIsChatOpen(false)}
          onOpenCultivation={() => {
            if (!currentUser) {
              soundFx.playKeyClick();
              setAuthModalInitialTab('login');
              setIsAuthModalOpen(true);
              return;
            }
            setIsCultivationOpen(true);
          }}
          onAcceptBattleChallenge={handleAcceptBattleChallenge}
          initialChannel={chatInitialChannel}
          initialWhisperTarget={chatWhisperTarget || undefined}
          onOpenFriends={() => setIsFriendsOpen(true)}
          onChannelChange={setChatInitialChannel}
          onRefreshChannelMessages={fetchChannelMessages}
        />
      )}

      {/* Sổ Tay Đạo Hữu & Kết Bái Đạo Lữ Modal */}
      <FriendsModal
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
        currentUser={currentUser}
        currentUserId={currentUser?.id || currentUserId}
        currentUsername={currentUser?.username || username}
        currentRoomId={currentRoomId}
        currentMode={gameMode}
        initialTab={friendsInitialTab}
        onPendingRequestsCountChange={(count) => setFriendRequestsCount(count)}
        onOpenWhisperChat={(targetUsername, targetUserId) => {
          setChatWhisperTarget({ username: targetUsername, userId: targetUserId });
          setChatInitialChannel('whisper');
          setIsFriendsOpen(false);
          setIsChatOpen(true);
        }}
        onChallengeFriend={(friend) => {
          setChatWhisperTarget({ username: friend.username, userId: friend.userId });
          setChatInitialChannel('whisper');
          setIsFriendsOpen(false);
          setIsChatOpen(true);
        }}
        onOpenAuth={() => {
          setIsFriendsOpen(false);
          setAuthModalInitialTab('login');
          setIsAuthModalOpen(true);
        }}
      />

      {/* Toast Lời Mời Vào Phòng Thi Đấu / Tương Tác Đạo Hữu */}
      {friendInviteToast && (
        <div
          id="friend-invite-toast"
          className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full p-4 rounded-2xl bg-slate-900/98 border-2 border-emerald-500/80 shadow-2xl backdrop-blur-xl animate-slideInRight text-left space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
              <span>
                {friendInviteToast.type === 'room_invite'
                  ? '⚔️ LỜI MỜI THI ĐẤU'
                  : friendInviteToast.type === 'tea_gift'
                  ? '🍵 NGỘ ĐẠO TRÀ'
                  : friendInviteToast.type === 'guidance'
                  ? '🎓 CHỈ ĐIỂM BÀN PHÍM'
                  : friendInviteToast.type === 'daolu'
                  ? '🌸 ĐẠO LỮ KẾT DUYÊN'
                  : friendInviteToast.type === 'friend_request_accepted'
                  ? '✨ KẾT BÁI THÀNH CÔNG'
                  : '🤝 LỜI MỜI KẾT BẠN'}
              </span>
            </span>
            <button
              onClick={() => setFriendInviteToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-200">
            {friendInviteToast.type === 'room_invite' && (
              <>
                Đạo hữu <strong className="text-amber-300">{friendInviteToast.fromUser?.displayName || friendInviteToast.fromUser?.username}</strong> mời bạn tham gia phòng thi đấu <strong className="text-sky-300">{friendInviteToast.roomId}</strong>!
              </>
            )}
            {friendInviteToast.type === 'friend_request' && (
              <>
                Đạo hữu <strong className="text-amber-300">{friendInviteToast.fromUser?.displayName || friendInviteToast.fromUser?.username}</strong> vừa gửi lời mời kết bái đạo hữu tới bạn!
              </>
            )}
            {friendInviteToast.type === 'friend_request_accepted' && (
              <>
                Đạo hữu <strong className="text-emerald-300">{friendInviteToast.fromName}</strong> đã đồng ý lời mời kết bái! Hai vị đã chính thức là đạo hữu tri kỷ!
              </>
            )}
            {friendInviteToast.type === 'tea_gift' && (
              <>
                Đạo hữu <strong className="text-amber-300">{friendInviteToast.fromName}</strong> vừa dâng tặng 1 chén Ngộ Đạo Trà! (+{friendInviteToast.tuViBonus} Tu Vi)
              </>
            )}
            {friendInviteToast.type === 'guidance' && (
              <>
                Tiền bối <strong className="text-amber-300">{friendInviteToast.fromName}</strong> vừa truyền thụ công lực chỉ điểm bàn phím! (+{friendInviteToast.tuViBonus} Tu Vi)
              </>
            )}
            {friendInviteToast.type === 'daolu' && (
              <>
                Đạo hữu <strong className="text-pink-300">{friendInviteToast.fromName}</strong> vừa gửi lời cầu hôn Kết Duyên Đạo Lữ kèm Tín Vật Định Tình!
              </>
            )}
          </p>
          <div className="flex items-center gap-2 pt-1">
            {friendInviteToast.type === 'room_invite' && friendInviteToast.roomId && (
              <button
                type="button"
                onClick={async () => {
                  const targetRoom = friendInviteToast.roomId!;
                  const targetMode = (friendInviteToast.mode as GameMode) || 'vi_dau';
                  setFriendInviteToast(null);
                  soundFx.playVictory();
                  await handleModalJoinExistingRoom(targetRoom, targetMode);
                }}
                className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all active:scale-95 text-center"
              >
                Vào Phòng Ngay
              </button>
            )}
            {friendInviteToast.type === 'friend_request' && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    const reqId = friendInviteToast.fromUser?.requestId || friendInviteToast.fromUser?.id;
                    setFriendInviteToast(null);
                    soundFx.playVictory();
                    if (reqId) {
                      const activeUid = currentUser?.id || currentUserId;
                      const activeName = currentUser?.username || username;
                      await respondFriendRequest(reqId, 'accept', activeUid, activeName);
                      if (activeUid) {
                        fetchFriendsList(activeUid, activeName).then((res) => {
                          if (res && res.success) {
                            if (res.friends) setFriendsList(res.friends);
                            setFriendRequestsCount(res.pendingRequests ? res.pendingRequests.length : 0);
                          }
                        }).catch(() => {});
                      }
                    }
                    setFriendsInitialTab('friends');
                    setIsFriendsOpen(true);
                  }}
                  className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all active:scale-95 text-center"
                >
                  Chấp Nhận Nhanh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFriendInviteToast(null);
                    setFriendsInitialTab('requests');
                    setIsFriendsOpen(true);
                  }}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Mở Sổ Tay
                </button>
              </>
            )}
            {friendInviteToast.type === 'friend_request_accepted' && (
              <button
                type="button"
                onClick={() => {
                  setFriendInviteToast(null);
                  setFriendsInitialTab('friends');
                  setIsFriendsOpen(true);
                }}
                className="flex-1 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all active:scale-95 text-center"
              >
                Mở Sổ Tay Đạo Hữu
              </button>
            )}
            {friendInviteToast.type === 'daolu' && (
              <button
                type="button"
                onClick={() => {
                  setFriendInviteToast(null);
                  setFriendsInitialTab('daolu');
                  setIsFriendsOpen(true);
                }}
                className="flex-1 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all active:scale-95 text-center"
              >
                Xem Khế Ước Kết Duyên
              </button>
            )}
            <button
              type="button"
              onClick={() => setFriendInviteToast(null)}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs cursor-pointer"
            >
              Bỏ Qua
            </button>
          </div>
        </div>
      )}

      {/* All Auxiliary Modals bundled into code-split Lazy Container */}
      <ModalContainer
        isLeaderboardOpen={isLeaderboardOpen}
        setIsLeaderboardOpen={setIsLeaderboardOpen}
        isAdminOpen={isAdminOpen}
        setIsAdminOpen={setIsAdminOpen}
        isProfileOpen={isProfileOpen}
        setIsProfileOpen={setIsProfileOpen}
        profileInitialTab={profileInitialTab}
        setProfileInitialTab={setProfileInitialTab}
        isAppearanceOpen={isAppearanceOpen}
        setIsAppearanceOpen={setIsAppearanceOpen}
        isCultivationOpen={isCultivationOpen}
        setIsCultivationOpen={setIsCultivationOpen}
        cultivationInitialTab={cultivationInitialTab}
        isAuthModalOpen={isAuthModalOpen}
        setIsAuthModalOpen={setIsAuthModalOpen}
        authModalInitialTab={authModalInitialTab}
        setAuthModalInitialTab={setAuthModalInitialTab}
        isJoinModalOpen={isJoinModalOpen}
        setIsJoinModalOpen={setIsJoinModalOpen}
        targetJoinMode={targetJoinMode}
        isOnlineUsersOpen={isOnlineUsersOpen}
        setIsOnlineUsersOpen={setIsOnlineUsersOpen}
        highScores={highScores}
        username={username}
        avatar={avatar}
        userFrame={userFrame}
        bestWpm={bestWpm}
        bestWpmRecord={bestWpmRecord}
        totalGames={totalGames}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        setAdminStatus={setAdminStatus}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        matchHistory={matchHistory}
        cultivationState={cultivationState}
        setCultivationState={setCultivationState}
        currentUserId={currentUserId}
        gameMode={gameMode}
        setGameMode={setGameMode}
        config={config}
        setConfig={setConfig}
        defaultConfig={DEFAULT_CONFIG}
        onRefreshLeaderboard={handleRefreshLeaderboard}
        onAdminLogin={handleAdminLogin}
        onChangeAdminPassword={handleChangeAdminPassword}
        onClearChat={handleClearChat}
        onResetLeaderboard={handleResetLeaderboard}
        onUpdateHighScores={handleUpdateHighScores}
        onLogout={handleLogout}
        onChangeUsername={handleChangeUsername}
        onChangeAvatar={handleChangeAvatar}
        onChangeFrame={handleChangeFrame}
        showcaseAchievements={currentUser?.showcaseAchievements || getShowcaseAchievements()}
        onChangeShowcaseAchievements={handleChangeShowcaseAchievements}
        friendsList={friendsList}
        onlineSeconds={currentUser ? (getAccountOnlineSeconds(currentUser.id) || currentUser.totalOnlineSeconds || 0) : 0}
        onAuthSuccess={handleAuthSuccess}
        onModalCreateNewRoom={handleModalCreateNewRoom}
        onModalJoinExistingRoom={handleModalJoinExistingRoom}
        onModalQuickJoinRoom={handleModalQuickJoinRoom}
        onOpenMatchHistory={() => setIsMatchHistoryOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        setNewlyUnlockedAchievements={setNewlyUnlockedAchievements}
        onStartGhostChallenge={handleStartGhostChallenge}
        onStartSectBoss={handleStartSectBoss}
        onStartSectTournament={handleStartSectTournament}
        onOpenWhisper={openWhisperWith}
        onAddFriend={handleAddFriend}
      />

      {/* Dedicated Match History, Replay & Skill Diagnostics Modal */}
      <MatchHistoryModal
        isOpen={isMatchHistoryOpen}
        history={matchHistory}
        onClose={() => setIsMatchHistoryOpen(false)}
        onClearHistory={handleClearMatchHistory}
        onPracticeMistakes={handlePracticeMistakes}
        onRetryMatch={handleRetryMatch}
      />

      {/* Huyền Thiên Khí Linh - Thiên Đạo Chiếu Thư & Biên Niên Sử Modal */}
      <HeavenlyChronicleModal
        isOpen={isHeavenlyChronicleOpen}
        onClose={() => setIsHeavenlyChronicleOpen(false)}
        currentUsername={currentUser?.displayName || currentUser?.username || username}
      />

      {/* Popup Chúc Mừng Độc Bản (Dao Decree Modal) khi đột phá hoặc đạt kỷ lục cao */}
      <DaoDecreeModal
        decree={activeDaoDecreePopup}
        isOpen={Boolean(activeDaoDecreePopup)}
        onClose={() => setActiveDaoDecreePopup(null)}
        onOpenChronicle={() => {
          setActiveDaoDecreePopup(null);
          setIsHeavenlyChronicleOpen(true);
        }}
      />

      {/* Bàn Cổ Thần Thức - Án Phạt Cấm Đấu Modal */}
      <BanPenaltyModal
        isOpen={isBanModalOpen}
        onClose={() => setIsBanModalOpen(false)}
        bannedUntil={getStoredBanInfo()?.bannedUntil || (Date.now() + 2 * 3600 * 1000)}
        reason={clientBanStatus.reason || 'Bất thường tần số gõ phím / Nghi vấn Auto Macro'}
        username={currentUser?.displayName || currentUser?.username || username}
      />

      {/* Toast thông báo thành tựu mới dạng góc màn hình, hiển thị tuần tự từng thành tựu tránh giật lag */}
      <NewAchievementBannerToast
        achievements={newlyUnlockedAchievements}
        onOpenProfileAchievements={() => {
          setProfileInitialTab('achievements');
          setIsProfileOpen(true);
        }}
        onDismiss={() => {
          setNewlyUnlockedAchievements([]);
        }}
      />

      {/* Footer - Tự động ẩn trên mobile dọc và khi mở Chat hoặc Sổ Tay để tránh che khuất bàn phím ảo */}
      {!(isChatOpen || isFriendsOpen) && (
        <footer className="border-t border-slate-800/80 bg-slate-950/70 py-2.5 px-4 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 text-center sm:text-left">
              <span className="font-bold text-slate-300">FastTyping Challenge</span>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span className="hidden sm:inline text-slate-400">Đấu trường gõ phím Tiếng Việt thời gian thực</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                copyright Nguyễn Duy Tiến - niTe
              </span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

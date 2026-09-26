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
} from './types';
import { Header } from './components/Header';
import { LobbyView } from './components/LobbyView';
import { WaitingRoomView } from './components/WaitingRoomView';
import { TypingArena } from './components/TypingArena';
import { BossArena } from './components/BossArena';
import { MysteryWordArena } from './components/MysteryWordArena';
import { NgauHungArena } from './components/NgauHungArena';
import { GameOverModal } from './components/GameOverModal';
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
  executeBanPenalty,
  syncServerBanStatus,
} from './utils/banManager';
import { NewAchievementBannerToast } from './components/gameover/NewAchievementBannerToast';
import { resolveBestWpmRecord, isOutplayMode } from './components/WpmRecordBadge';
import { fetchCurrentUser, logoutUser, updateUserProfile } from './utils/auth';
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
import { generateWords, generateDoanChuWords } from './data/wordBanks';
import { initThemeAndFont } from './utils/themeAndFont';
import { getStoredFrame, setStoredFrame, checkIsAdmin, setAdminStatus } from './utils/frames';
import { 
  getShowcaseAchievements, 
  setShowcaseAchievements, 
  checkNewAchievementsOnMatchEnd, 
  setStoredUnlockedAchievements,
  XianxiaAchievement,
  XIANXIA_ACHIEVEMENTS,
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
        baseHp: 1600,
        hpPerPlayer: 1000,
        selfDestructTarget: 1200,
        skillInterval: 9,
        skillWarningDuration: 1.8,
        shieldDuration: 5.5,
        shieldHpPerPlayer: 120,
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
        baseHp: 2800,
        hpPerPlayer: 1600,
        selfDestructTarget: 2000,
        skillInterval: 7.5,
        skillWarningDuration: 1.4,
        shieldDuration: 4.5,
        shieldHpPerPlayer: 200,
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
        baseHp: 4200,
        hpPerPlayer: 2400,
        selfDestructTarget: 3000,
        skillInterval: 6.0,
        skillWarningDuration: 1.0,
        shieldDuration: 4.0,
        shieldHpPerPlayer: 300,
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
  // User Profile: Unique per tab session with fallback to localStorage
  const [username, setUsername] = useState<string>(() => {
    if (typeof window === 'undefined') return 'NgườiChơi_1';
    const sessionUser = sessionStorage.getItem('fasttyping_user_session');
    if (sessionUser) return sessionUser;
    const localUser = localStorage.getItem('fasttyping_user');
    const defaultName = localUser || ('TayGõ_' + Math.floor(Math.random() * 900 + 100));
    sessionStorage.setItem('fasttyping_user_session', defaultName);
    return defaultName;
  });
  const [avatar, setAvatar] = useState<string>(() => {
    if (typeof window === 'undefined') return '🤖';
    const sessionAvatar = sessionStorage.getItem('fasttyping_avatar_session');
    if (sessionAvatar) return sessionAvatar;
    const localAvatar = localStorage.getItem('fasttyping_avatar');
    const avatarList = ['🦊', '⚡', '🚀', '🔥', '🐯', '🤖', '🎯', '👑', '🐉'];
    const defaultAvatar = localAvatar || avatarList[Math.floor(Math.random() * avatarList.length)];
    sessionStorage.setItem('fasttyping_avatar_session', defaultAvatar);
    return defaultAvatar;
  });
  const [bestWpm, setBestWpm] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const outplaySaved = localStorage.getItem('fasttyping_outplay_best_record');
      if (outplaySaved) {
        const parsed = JSON.parse(outplaySaved);
        if (parsed && parsed.wpm > 0 && isOutplayMode(parsed.mode)) {
          return parsed.wpm;
        }
      }
      const outplayWpm = Number(localStorage.getItem('fasttyping_outplay_best_wpm'));
      if (outplayWpm > 0) return outplayWpm;

      const saved = localStorage.getItem('fasttyping_best_wpm_record');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.wpm > 0 && isOutplayMode(parsed.mode)) return parsed.wpm;
      }
    } catch {}
    return 0;
  });
  const [bestWpmRecord, setBestWpmRecord] = useState<BestWpmRecord | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const outplaySaved = localStorage.getItem('fasttyping_outplay_best_record');
      if (outplaySaved) {
        const parsed = JSON.parse(outplaySaved);
        if (parsed && parsed.wpm > 0 && isOutplayMode(parsed.mode)) return parsed;
      }
      const saved = localStorage.getItem('fasttyping_best_wpm_record');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.wpm > 0 && isOutplayMode(parsed.mode)) return parsed;
      }
    } catch {}
    return null;
  });
  const [totalGames, setTotalGames] = useState<number>(() => {
    return Number(localStorage.getItem('fasttyping_games_count')) || 0;
  });

  const [userFrame, setUserFrame] = useState<string>(() => getStoredFrame());

  // Unique Player ID per tab/session to guarantee distinct players across multiple tabs
  const [currentUserId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'usr_default';
    let id = sessionStorage.getItem('fasttyping_player_id');
    if (!id) {
      id = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
      sessionStorage.setItem('fasttyping_player_id', id);
    }
    return id;
  });

  // Unique Tab ID per page instance in memory
  const [currentTabId] = useState<string>(() => {
    return 'tab_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
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

  // Ban & Penalty Enforcement State (Bàn Cổ Thần Thức)
  const [clientBanStatus, setClientBanStatus] = useState(() => checkClientBanStatus());
  const [isBanModalOpen, setIsBanModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const updateBan = async () => {
      const myUsername = currentUserRef.current?.username || usernameRef.current;
      const myUserId = currentUserRef.current?.id;
      if (myUsername) {
        try {
          const srvStatus = await syncServerBanStatus(myUsername, myUserId);
          if (srvStatus.isBanned && isMounted) {
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
    const interval = setInterval(updateBan, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
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
    const isActuallyCompleted = data.isCompleted === true && data.result !== 'Đầu hàng';

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
    // QUY TẮC: Chế độ Khách (chưa đăng nhập) TUYỆT ĐỐI KHÔNG ĐƯỢC THƯỞNG TU VI
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
    }

    // KIỂM TRA VÀ BẬT THÔNG BÁO THÀNH TỰU TIÊN HIỆP MỚI NGAY KHI VỪA KẾT THÚC TRẬN ĐẤU:
    // QUY TẮC BẮT BUỘC:
    // 1. Chỉ người chơi ĐÃ ĐĂNG NHẬP (userNow !== null) mới được tính thành tựu.
    // 2. Trận đấu PHẢI THỰC SỰ HOÀN THÀNH (isActuallyCompleted === true).
    // Nếu đầu hàng, out phòng hoặc chưa đăng nhập: TUYỆT ĐỐI KHÔNG TÍNH THÀNH TỰU VÀ KHÔNG TĂNG SỐ TRẬN HOÀN THÀNH.
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
            userId: userNow.id,
            matchHistory: [newRecord, ...matchHistory],
            highScores: highScoresRef.current || {},
            roomPlayerCount: playersRef.current?.length || 1,
            initialUnlocked: userNow.unlockedAchievements || [],
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
        let bestRecordToSave: any = undefined;
        if (isActuallyCompleted && data.wpm > (bestWpmRef.current || 0)) {
          bestRecordToSave = {
            wpm: data.wpm,
            mode: data.mode || getFriendlyModeName(data.modeId),
            modeName: getFriendlyModeName(data.modeId),
            timestamp: Date.now(),
          };
        }
        updateUserProfile({
          bestWpm: nextBestWpm,
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
  const [gameState, setGameState] = useState<'lobby' | 'waiting_room' | 'countdown' | 'playing' | 'gameover'>('lobby');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundFx.getMuted());
  const [config, setConfig] = useState<GameConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try {
      const saved = localStorage.getItem('fasttyping_game_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        const needsDiacriticsMigration = !parsed._migratedNoDiacriticsDefault_v1;

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
          sanBoss: {
            difficulties: {
              normal: {
                ...DEFAULT_CONFIG.sanBoss.difficulties.normal,
                ...((parsed.sanBoss?.difficulties?.normal?.baseHp && parsed.sanBoss.difficulties.normal.baseHp > 750)
                  ? parsed.sanBoss.difficulties.normal
                  : {}),
                allowedPools: sanitizePools(
                  parsed.sanBoss?.difficulties?.normal?.allowedPools,
                  DEFAULT_CONFIG.sanBoss.difficulties.normal.allowedPools || ['vi_nodau', 'en', 'numbers']
                ),
              },
              hard: {
                ...DEFAULT_CONFIG.sanBoss.difficulties.hard,
                ...((parsed.sanBoss?.difficulties?.hard?.baseHp && parsed.sanBoss.difficulties.hard.baseHp > 1000)
                  ? parsed.sanBoss.difficulties.hard
                  : {}),
                allowedPools: sanitizePools(
                  parsed.sanBoss?.difficulties?.hard?.allowedPools,
                  DEFAULT_CONFIG.sanBoss.difficulties.hard.allowedPools || ['vi_nodau', 'en', 'numbers', 'fullsize']
                ),
              },
              hell: {
                ...DEFAULT_CONFIG.sanBoss.difficulties.hell,
                ...((parsed.sanBoss?.difficulties?.hell?.baseHp && parsed.sanBoss.difficulties.hell.baseHp > 1200)
                  ? parsed.sanBoss.difficulties.hell
                  : {}),
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
  const [friendRequestsCount, setFriendRequestsCount] = useState<number>(0);
  const [friendsList, setFriendsList] = useState<FriendRecord[]>([]);
  const [friendInviteToast, setFriendInviteToast] = useState<{
    id: string;
    type: 'room_invite' | 'friend_request' | 'tea_gift' | 'guidance' | 'daolu';
    fromUser?: any;
    fromName?: string;
    roomId?: string;
    mode?: string;
    tuViBonus?: number;
    message?: string;
    friendshipId?: string;
  } | null>(null);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => checkIsAdmin());
  const [isHeavenlyChronicleOpen, setIsHeavenlyChronicleOpen] = useState(false);
  const [activeDaoDecreePopup, setActiveDaoDecreePopup] = useState<HeavenlyDaoDecree | null>(null);

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

  // Me player factory for room & multiplayer synchronization
  const createMePlayer = useCallback((): Player => {
    const realm = XIANXIA_REALMS[cultivationState.realmIndex] || XIANXIA_REALMS[0];
    return {
      id: currentUserId,
      username: username,
      icon: avatar,
      frame: userFrame,
      showcaseAchievements: currentUser?.showcaseAchievements || getShowcaseAchievements(),
      cultivation: {
        level: cultivationState.level,
        realmIndex: cultivationState.realmIndex,
        tier: cultivationState.tier,
        realmName: realm.name,
        subStage: getSubStage(cultivationState.tier),
        thoNguyen: cultivationState.thoNguyen,
        maxThoNguyen: cultivationState.maxThoNguyen,
      },
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
  } = useChatEngine({
    currentUsername: username,
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

  // Đồng bộ danh sách Đạo Hữu và thông tin Đạo Lữ
  useEffect(() => {
    if (currentUser) {
      fetchFriendsList().then((res) => {
        if (res && res.success && res.friends) {
          setFriendsList(res.friends);
        }
      }).catch(() => {});
    } else {
      setFriendsList([]);
    }
  }, [currentUser, isFriendsOpen]);

  // Lắng nghe Thiên Đạo Chiếu Thư theo thời gian thực
  useEffect(() => {
    const unsub = subscribeToDaoDecrees((decree) => {
      const myUsername = currentUserRef.current?.username || usernameRef.current || '';
      const myDisplayName = currentUserRef.current?.displayName || myUsername || '';
      const targetUser = String(decree.targetUser || '').toLowerCase();
      const isTargetMe =
        Boolean(targetUser) &&
        Boolean(myUsername) &&
        (targetUser === myUsername.toLowerCase() ||
          targetUser === myDisplayName.toLowerCase());

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

  // Tự động đồng bộ và khôi phục kỷ lục WPM chi tiết cho Outplay Yourself
  useEffect(() => {
    const resolved = resolveBestWpmRecord({
      bestWpm,
      bestWpmRecord,
      highScores,
      matchHistory,
      username,
      isMe: true,
    });
    if (resolved && resolved.wpm > 0 && isOutplayMode(resolved.mode)) {
      if (!bestWpmRecord || bestWpmRecord.wpm !== resolved.wpm || !isOutplayMode(bestWpmRecord.mode)) {
        setBestWpmRecord(resolved);
        setBestWpm(resolved.wpm);
        try {
          localStorage.setItem('fasttyping_best_wpm', resolved.wpm.toString());
          localStorage.setItem('fasttyping_best_wpm_record', JSON.stringify(resolved));
          localStorage.setItem('fasttyping_outplay_best_wpm', resolved.wpm.toString());
          localStorage.setItem('fasttyping_outplay_best_record', JSON.stringify(resolved));
        } catch {}
      }
    } else if (bestWpmRecord && !isOutplayMode(bestWpmRecord.mode)) {
      setBestWpmRecord(null);
      setBestWpm(0);
      try {
        localStorage.removeItem('fasttyping_best_wpm');
        localStorage.removeItem('fasttyping_best_wpm_record');
      } catch {}
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
      (ev: any) => {
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
          const bonus = ev.tuViBonus || 50;
          setFriendInviteToast({
            id: `tg_${Date.now()}`,
            type: 'tea_gift',
            fromName: ev.fromName || 'Đạo Hữu',
            tuViBonus: bonus,
          });
          addDirectTuVi(bonus);
          soundFx.playVictory();
        } else if (ev.type === 'mentor_guidance_received') {
          const bonus = ev.tuViBonus || 30;
          setFriendInviteToast({
            id: `mg_${Date.now()}`,
            type: 'guidance',
            fromName: ev.fromName || 'Tiền Bối',
            tuViBonus: bonus,
          });
          addDirectTuVi(bonus);
          soundFx.playVictory();
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
      }
    );
    return () => {
      unsubscribeGlobalChat();
    };
  }, [appendChatMessage, currentUserId, currentUser, currentTabId, addDirectTuVi, metaRef, setChatMessages]);

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

      // 2. Enter: Mở nhanh khung chat khi đang ở sảnh chờ hoặc phòng chờ (khi không focus vào ô nhập liệu)
      if (e.key === 'Enter' && !isInput && (gameState === 'lobby' || gameState === 'waiting_room')) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsChatOpen(true);
        setTimeout(() => {
          document.getElementById('input-chat-message')?.focus();
        }, 80);
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
      const bossDiff =
        config.sanBoss.difficulties[difficulty] || config.sanBoss.difficulties.normal;
      const totalHp = isSolo
        ? bossDiff.baseHp
        : bossDiff.baseHp + Math.max(0, players.length - 1) * bossDiff.hpPerPlayer;

      setBossState({
        name: 'HẮC LONG MA VƯƠNG',
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

  // Bot Simulation in Playing state (for standard typing modes)
  useEffect(() => {
    if (gameState !== 'playing') return;
    // Special modes (san_boss, doan_chu, ngau_hung) have dedicated, realistic bot mechanics inside their arenas
    if (gameMode === 'san_boss' || gameMode === 'doan_chu' || gameMode === 'ngau_hung') return;

    // In multiplayer with active room, the server coordinates bot synchronization for all room members
    if (playType === 'multiplayer' && currentRoomId) return;

    const botInterval = setInterval(() => {
      setPlayers((prev) =>
        prev.map((p) => {
          if (!p.isBot || p.isFinished || p.isSurrendered) return p;

          const targetWpm = p.botTargetWpm || 60;
          const deltaProgress = (targetWpm / 150) * 0.8; // progress per tick
          const newProgress = Math.min(100, p.progress + deltaProgress);
          const newCorrectChars = Math.round(newProgress * 8);

          return {
            ...p,
            progress: newProgress,
            correctChars: newCorrectChars,
            wpm: targetWpm + Math.floor(Math.random() * 6 - 3),
            score: p.score,
            isFinished: newProgress >= 100,
          };
        })
      );
    }, 600);

    return () => clearInterval(botInterval);
  }, [gameState, gameMode, playType, currentRoomId]);

  // Player Progress Update Handler (Throttled & Memoized to avoid root App re-renders in Citrix VDI)
  const handleUpdatePlayerProgress = useCallback((
    progress: number,
    correctChars: number,
    errors: number,
    wpm: number
  ) => {
    if (playType === 'multiplayer') {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === currentUserId
            ? { ...p, progress, correctChars, errors, wpm }
            : p
        )
      );

      if (currentRoomId) {
        sendPlayerProgress(currentRoomId, currentUserId, progress, correctChars, errors, wpm, progress >= 100);
      }
    } else {
      setPlayers((prev) => {
        const me = prev.find((p) => p.id === currentUserId);
        if (me && me.progress === progress && me.errors === errors && (progress < 100 && !me.isFinished)) {
          return prev;
        }
        return prev.map((p) =>
          p.id === currentUserId
            ? { ...p, progress, correctChars, errors, wpm, isFinished: progress >= 100 }
            : p
        );
      });
    }
  }, [playType, currentRoomId, currentUserId]);

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

      // 1. Lưu án phạt 2 giờ (2h) ngay lập tức trên máy người chơi
      saveStoredBanInfo(Date.now() + 2 * 60 * 60 * 1000, banReason);
      const newBanStatus = checkClientBanStatus();
      setClientBanStatus(newBanStatus);
      setIsBanModalOpen(true);
      soundFx.playError();

      // 2. Bàn Cổ Thần Thức phát chiếu thư thông báo toàn cõi và trừ tu vi
      announcePenalty(myUser, banReason).catch(() => {});

      // 3. Gửi lệnh cấm lên Server để khóa phòng & bảng vàng
      executeBanPenalty({
        username: myUser,
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

    // Update Career stats: CHỈ CẬP NHẬT KHI VÁN ĐẤU THỰC SỰ HOÀN THÀNH (KHÔNG ĐẦU HÀNG)
    if (!isPlayerSurrendered && isMatchCompleted) {
      // QUY ĐỊNH BẮT BUỘC: KỶ LỤC WPM HỒ SƠ CHỈ CẬP NHẬT TỪ CHẾ ĐỘ OUTPLAY YOURSELF!
      // Các chế độ multiplayer KHÔNG tính vào kỷ lục WPM hồ sơ.
      if (gameMode === 'outplay') {
        if (verifiedWpm > bestWpm) {
          setBestWpm(verifiedWpm);
          localStorage.setItem('fasttyping_best_wpm', verifiedWpm.toString());
          localStorage.setItem('fasttyping_outplay_best_wpm', verifiedWpm.toString());
          const newRec: BestWpmRecord = {
            wpm: verifiedWpm,
            mode: 'outplay',
            modeName: 'Outplay Yourself (Solo)',
            timestamp: Date.now(),
          };
          setBestWpmRecord(newRec);
          try {
            localStorage.setItem('fasttyping_best_wpm_record', JSON.stringify(newRec));
            localStorage.setItem('fasttyping_outplay_best_record', JSON.stringify(newRec));
          } catch {}

          // Huyền Thiên Khí Linh ban chiếu thư Kim Bảng Đề Danh
          announceRecord(
            currentUser?.username || username,
            verifiedWpm,
            accuracy,
            'Outplay Yourself (Solo)',
            verifiedWpm >= 120
          ).then((dec) => {
            setActiveDaoDecreePopup(dec);
          }).catch(() => {});
        }
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
        score: 0,
        errors,
        avatar,
        frame: userFrame,
        isSurrendered: false,
        isCompleted: true,
        roomId: currentRoomId || undefined,
        playerId: currentUserId,
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

    const replayKeystrokes = keystrokes.map((k) => ({
      key: k.key,
      timeMs: Math.round(k.time),
      isCorrect: k.isCorrect,
    }));

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
  }, [bestWpm, totalGames, currentUserId, highScores, gameMode, username, lastGameWpm, sessionBestWpm, avatar, userFrame, players, playType, recordCurrentMatch, currentRoomId]);

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
    // Kamikaze self-destruct dealing massive damage to Boss
    const selfDestructDmg = 450;
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
        currentUser?.username || username,
        'Hắc Long Ma Vương',
        totalDmg
      ).then((dec) => {
        setActiveDaoDecreePopup(dec);
      }).catch(() => {});

      // Save Boss High Score to server
      submitScoreToLeaderboard({
        mode: 'san_boss',
        username: currentUser?.username || username,
        displayName: currentUser?.displayName || username,
        wpm: 0,
        score: totalDmg,
        errors,
        avatar,
        frame: userFrame,
        isSurrendered: false,
        isCompleted: true,
        roomId: currentRoomId || undefined,
        playerId: currentUserId,
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

    soundFx.playVictory();
    setGameState('gameover');
  };

  // Surrender Handler
  const handleSurrender = () => {
    // Clear last game WPM, but keep sessionBestWpm
    setLastGameWpm(0);

    // Ghi nhận đầu hàng vào lịch sử đấu nếu không phải chế độ Outplay (Outplay là chế độ tự luyện tập retry)
    if (gameMode !== 'outplay') {
      const me = players.find((p) => p.id === currentUserId);
      recordCurrentMatch({
        modeId: gameMode,
        wpm: me?.wpm || 0,
        accuracy: me?.accuracy ?? 100,
        result: 'Đầu hàng',
        score: me?.score,
        isCompleted: false,
      });
    }

    const updatedPlayers = players.map((p) =>
      p.id === currentUserId
        ? {
            ...p,
            // In outplay mode, player can continue typing immediately without being locked in surrendered state
            isSurrendered: gameMode === 'outplay' ? false : true,
            lastWpm: undefined,
          }
        : p
    );
    setPlayers(updatedPlayers);

    if (playType === 'multiplayer' && currentRoomId) {
      updatePlayerRoomStatus(currentRoomId, currentUserId, {
        isSurrendered: true,
      });

      // Kiểm tra nếu người chơi vừa đầu hàng là người chơi cuối cùng đang thi đấu:
      const activeHumanPlayers = updatedPlayers.filter(
        (p) => !p.isBot && !p.isSurrendered && !p.isFinished && p.inMatch !== false
      );

      if (activeHumanPlayers.length === 0) {
        // Người chơi cuối cùng đầu hàng: kết thúc phòng chơi và tổng kết ngay lập tức, không đợi hết giờ
        markRoomFinished(currentRoomId);
        setPlayers((prev) =>
          prev.map((p) =>
            p.isBot
              ? { ...p, inMatch: false, isSurrendered: false, isFinished: false, progress: 0, wpm: 0, errors: 0, correctChars: 0 }
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

  // Surrender Rematch Handler: if player surrendered while match is ongoing, return them to waiting room and light up their avatar
  const handleSurrenderRestart = () => {
    if (playType === 'multiplayer' && currentRoomId) {
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
    }
    if (currentRoomId) {
      leaveRoom(currentRoomId, currentUserId);
      setCurrentRoomId(null);
    }
    setIsRoomHost(true);
    setNewlyUnlockedAchievements([]);
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

  // Global Power-User Shortcuts:
  // - Tab + Enter: Vào chơi lại ngay lập tức sau khi kết thúc trận (ở GameOverModal)
  // - Ctrl + K or F2: Bật nhanh Sổ Tay Đạo Hữu
  // - Enter: Mở nhanh khung chat khi đang ở sảnh chờ (lobby hoặc waiting_room)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable);

      // 1. Ctrl + K or F2: Bật nhanh Sổ Tay Đạo Hữu
      if ((e.ctrlKey && (e.key === 'k' || e.key === 'K')) || e.key === 'F2') {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsFriendsOpen((prev) => !prev);
        return;
      }

      // 2. Enter: Mở nhanh khung chat khi đang ở sảnh chờ
      if (e.key === 'Enter' && !isInputFocused) {
        if (gameState === 'lobby' || gameState === 'waiting_room') {
          e.preventDefault();
          soundFx.playKeyClick();
          setIsChatOpen(true);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [gameState]);

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
    const activeName = user.displayName || user.username;
    setUsername(activeName);
    const userAvatarChoice = user.avatar || '🤖';
    setAvatar(userAvatarChoice);
    const userFrameChoice = user.frame || 'default';
    setUserFrame(userFrameChoice);
    setStoredFrame(userFrameChoice);

    const isUserAdmin = Boolean(user?.isAdmin || String(user?.username || '').toLowerCase() === 'admin');
    setIsAdmin(isUserAdmin);
    setAdminStatus(isUserAdmin);

    // Dữ liệu kỷ lục WPM: CHỈ ÁP DỤNG KỶ LỤC TỪ CHẾ ĐỘ OUTPLAY YOURSELF
    let serverOutplayWpm = 0;
    let serverOutplayRecord: BestWpmRecord | null = null;
    if (
      user.bestWpmRecord &&
      typeof user.bestWpmRecord === 'object' &&
      user.bestWpmRecord.wpm > 0 &&
      isOutplayMode(user.bestWpmRecord.mode)
    ) {
      serverOutplayRecord = {
        ...user.bestWpmRecord,
        mode: 'outplay',
        modeName: 'Outplay Yourself (Solo)',
      };
      serverOutplayWpm = user.bestWpmRecord.wpm;
    } else if (Array.isArray(user.matchHistory)) {
      const outplayMatches = user.matchHistory.filter(
        (m: any) => m && m.wpm > 0 && isOutplayMode(m.modeId || m.mode) && m.result !== 'Đầu hàng'
      );
      if (outplayMatches.length > 0) {
        const best = [...outplayMatches].sort((a: any, b: any) => b.wpm - a.wpm)[0];
        serverOutplayRecord = {
          wpm: best.wpm,
          mode: 'outplay',
          modeName: 'Outplay Yourself (Solo)',
          timestamp: best.timestamp,
        };
        serverOutplayWpm = best.wpm;
      }
    }

    setBestWpm(serverOutplayWpm);
    setBestWpmRecord(serverOutplayRecord);
    if (serverOutplayWpm > 0) {
      localStorage.setItem('fasttyping_best_wpm', serverOutplayWpm.toString());
      localStorage.setItem('fasttyping_outplay_best_wpm', serverOutplayWpm.toString());
    } else {
      localStorage.removeItem('fasttyping_best_wpm');
      localStorage.removeItem('fasttyping_outplay_best_wpm');
    }

    if (serverOutplayRecord) {
      try {
        localStorage.setItem('fasttyping_best_wpm_record', JSON.stringify(serverOutplayRecord));
        localStorage.setItem('fasttyping_outplay_best_record', JSON.stringify(serverOutplayRecord));
      } catch {}
    } else {
      localStorage.removeItem('fasttyping_best_wpm_record');
      localStorage.removeItem('fasttyping_outplay_best_record');
    }

    const serverTotalGames = typeof user.totalGames === 'number' ? user.totalGames : 0;
    setTotalGames(serverTotalGames);
    if (serverTotalGames > 0) {
      localStorage.setItem('fasttyping_games_count', serverTotalGames.toString());
    } else {
      localStorage.removeItem('fasttyping_games_count');
    }

    if (Array.isArray(user.matchHistory)) {
      setMatchHistory(user.matchHistory);
      try {
        localStorage.setItem('fasttyping_match_history', JSON.stringify(user.matchHistory));
      } catch {}
    } else {
      setMatchHistory([]);
      localStorage.removeItem('fasttyping_match_history');
    }

    // Tiến độ tu vi tiên hiệp
    if (user.cultivation) {
      setCultivationState(user.cultivation);
      saveStoredCultivationState(user.cultivation);
    }

    // Danh hiệu & thành tựu
    if (Array.isArray(user.showcaseAchievements)) {
      setShowcaseAchievements(user.showcaseAchievements, user.id);
    }
    if (Array.isArray(user.unlockedAchievements)) {
      setStoredUnlockedAchievements(user.unlockedAchievements, user.id);
    }

    localStorage.setItem('fasttyping_user', activeName);
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

  // Khôi phục phiên đăng nhập và toàn bộ dữ liệu từ server khi tải trang
  useEffect(() => {
    fetchCurrentUser()
      .then((user) => {
        if (user) {
          applyAuthenticatedUser(user);
        }
      })
      .catch(() => {});
  }, [applyAuthenticatedUser]);

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

    // 3. Đưa thông tin người chơi về trạng thái Khách mặc định mới hoàn toàn
    const defaultName = 'Khách_' + Math.floor(Math.random() * 9000 + 1000);
    const defaultAvatar = '🤖';
    const defaultFrame = 'default';

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

  // Mode display name helper
  const getModeTitle = () => {
    switch (gameMode) {
      case 'vi_dau':
        return 'Tiếng Việt Có Dấu';
      case 'vi_nodau':
        return 'Tiếng Việt Không Dấu';
      case 'en':
        return 'Tiếng Anh (English)';
      case 'numpad':
        return 'Bàn Phím Số (Numpad)';
      case 'ngau_hung':
        return 'Ngẫu Hứng (Rush)';
      case 'doan_chu':
        return 'Đoán Chữ (Mystery)';
      case 'san_boss':
        return 'Săn Boss Hắc Long';
      case 'outplay':
        return 'Outplay Yourself';
      default:
        return 'Đua Thường';
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 flex flex-col selection:bg-amber-400 selection:text-black">
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
        onOpenFriends={() => setIsFriendsOpen(true)}
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
        cultivationLevel={cultivationState.level}
        cultivationRealmName={XIANXIA_REALMS[cultivationState.realmIndex]?.name}
        cultivationTier={cultivationState.tier}
        cultivationSubStage={getSubStage(cultivationState.tier)}
        cultivationIcon={XIANXIA_REALMS[cultivationState.realmIndex]?.icon}
        cultivationThoNguyen={cultivationState.thoNguyen}
        cultivationMaxThoNguyen={cultivationState.maxThoNguyen}
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
            onOpenBanModal={() => setIsBanModalOpen(true)}
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

        {/* 3. PLAYING ARENAS */}
        {gameState === 'playing' && (
          <>
            {/* Standard Typing / Numpad / Outplay */}
            {(gameMode === 'vi_dau' ||
              gameMode === 'vi_nodau' ||
              gameMode === 'en' ||
              gameMode === 'numpad' ||
              gameMode === 'outplay') && (
              <TypingArena
                words={words}
                duration={
                  gameMode === 'numpad'
                    ? (config.modeDurations?.numpad || config.numpad.duration)
                    : gameMode === 'outplay'
                    ? (config.modeDurations?.outplay || 60)
                    : (config.modeDurations?.[gameMode as keyof typeof config.modeDurations] || config.normalRace.duration)
                }
                players={players}
                currentPlayerId={currentUserId}
                onUpdateProgress={handleUpdatePlayerProgress}
                onFinish={handleFinishMatch}
                onSurrender={handleSurrender}
                onRestart={playType === 'multiplayer' ? handleSurrenderRestart : handleStartGame}
                onHome={handleReturnToLobby}
                modeName={getModeTitle()}
                isOutplay={gameMode === 'outplay'}
                isMultiplayer={playType === 'multiplayer'}
                conditionStats={conditionStats}
                onUpdateConditionStats={handleUpdateConditionStats}
                lastGameWpm={lastGameWpm}
                sessionBestWpm={sessionBestWpm}
                onUpdateSessionStats={(newLast, newBest) => {
                  setLastGameWpm(newLast);
                  setSessionBestWpm(newBest);
                }}
                savedPaceMode={outplayPaceMode}
                onPaceModeChange={(newPace) => {
                  setOutplayPaceMode(newPace);
                  try {
                    localStorage.setItem('fasttyping_outplay_pacemode', newPace);
                  } catch {}
                }}
                savedCustomWpm={outplayCustomWpm}
                onCustomWpmChange={(newWpm) => {
                  setOutplayCustomWpm(newWpm);
                  try {
                    localStorage.setItem('fasttyping_outplay_custom_wpm', newWpm.toString());
                  } catch {}
                }}
                daoLuPartnerName={friendsList.find((f) => f.isDaoLu)?.username}
                daoLuPartnerId={friendsList.find((f) => f.isDaoLu)?.userId}
              />
            )}

            {/* Săn Boss Battle Arena */}
            {gameMode === 'san_boss' && bossState && (
              <BossArena
                words={words}
                boss={bossState}
                players={players}
                currentPlayerId={currentUserId}
                onDealDamage={handleBossDamage}
                onSelfDestruct={handleBossSelfDestruct}
                onFinish={handleBossFinish}
                onSurrender={handleSurrender}
                onRestart={playType === 'multiplayer' ? handleSurrenderRestart : handleStartGame}
                onHome={handleReturnToLobby}
                isMultiplayer={playType === 'multiplayer'}
              />
            )}

            {/* Đoán Chữ (Mystery Word) Arena */}
            {gameMode === 'doan_chu' && (
              <MysteryWordArena
                roundItems={mysteryWords}
                totalRounds={
                  config.doanChu?.difficulties[difficulty]?.totalRounds || (difficulty === 'legendary' ? 15 : difficulty === 'hard' ? 12 : 10)
                }
                revealIntervalSec={
                  config.doanChu?.difficulties[difficulty]?.revealInterval || (difficulty === 'legendary' ? 0.7 : difficulty === 'hard' ? 1.0 : 2.2)
                }
                roundDurationSec={
                  config.doanChu?.difficulties[difficulty]?.roundDuration || (difficulty === 'legendary' ? 10 : difficulty === 'hard' ? 14 : 30)
                }
                players={players}
                currentPlayerId={currentUserId}
                onSurrender={handleSurrender}
                onRestart={playType === 'multiplayer' ? handleSurrenderRestart : handleStartGame}
                onHome={handleReturnToLobby}
                isMultiplayer={playType === 'multiplayer'}
                onFinishRound={(round, scoreEarned, correct, targetId) => {
                  const id = targetId || currentUserId;
                  let nextPlayers: Player[] = [];
                  setPlayers((prev) => {
                    nextPlayers = prev.map((p) =>
                      p.id === id
                        ? { ...p, score: p.score + scoreEarned }
                        : p
                    );
                    playersRef.current = nextPlayers;
                    return nextPlayers;
                  });
                  if (playType === 'multiplayer' && currentRoomId && nextPlayers.length > 0) {
                    updateRoomPlayers(currentRoomId, nextPlayers);
                  }
                }}
                onFinishGame={(stats?: MysteryWordGameStats) => {
                  if (stats) {
                    setMysteryWordStats(stats);
                  }
                  let nextPlayers: Player[] = [];
                  setPlayers((prev) => {
                    nextPlayers = prev.map((p) =>
                      p.id === currentUserId ? { ...p, isFinished: true, progress: 100 } : p
                    );
                    playersRef.current = nextPlayers;
                    return nextPlayers;
                  });

                  if (playType === 'multiplayer' && currentRoomId) {
                    sendPlayerProgress(currentRoomId, currentUserId, 100, 0, 0, 0, true);
                    updateRoomPlayers(currentRoomId, nextPlayers);
                  }

                  const currentList = nextPlayers.length > 0 ? nextPlayers : (playersRef.current || players);
                  const me = currentList.find((p) => p.id === currentUserId);
                  const isPlayerSurrendered = me?.isSurrendered || false;
                  const finalScore = me ? me.score : 0;

                  // Chỉ người chơi tham gia trọn vẹn ván đấu, không đầu hàng và không out phòng mới được xét lên Bảng Vàng
                  if (!isPlayerSurrendered && finalScore > 0) {
                    submitScoreToLeaderboard({
                      mode: 'doan_chu',
                      username: currentUser?.username || username,
                      displayName: currentUser?.displayName || username,
                      score: finalScore,
                      errors: 0,
                      avatar,
                      frame: userFrame,
                      isSurrendered: false,
                      isCompleted: true,
                      roomId: currentRoomId || undefined,
                      playerId: currentUserId,
                    }).then((res) => {
                      if (res && res.success && res.highScores) {
                        setHighScores(res.highScores);
                        saveLeaderboardToIndexedDB(res.highScores).catch(() => {});
                      }
                    });

                    if (finalScore >= 80) {
                      announceLinhLungCheer(
                        currentUser?.displayName || currentUser?.username || username,
                        finalScore,
                        100,
                        'Đoán Chữ Thần Tốc'
                      ).catch(() => {});
                    }
                  }

                  const rivals = currentList.filter((p) => p.id !== currentUserId && !p.isSurrendered);
                  const isTop = rivals.every((r) => (r.score || 0) <= finalScore);
                  const matchResult: MatchResult = isPlayerSurrendered
                    ? 'Đầu hàng'
                    : playType === 'multiplayer'
                    ? (isTop ? 'Thắng' : 'Thua')
                    : (finalScore > 0 ? 'Thắng' : 'Thua');

                  recordCurrentMatch({
                    modeId: 'doan_chu',
                    wpm: me?.wpm || (finalScore ? Math.round(finalScore / 2) : 0),
                    accuracy: me?.accuracy ?? 100,
                    result: matchResult,
                    score: finalScore,
                    isCompleted: !isPlayerSurrendered,
                  });

                  const activeHumanCompetitors = currentList.filter(
                    (p) => p.id !== currentUserId && !p.isBot && !p.isSurrendered && !p.isFinished && p.inMatch !== false
                  );

                  if (playType === 'multiplayer' && activeHumanCompetitors.length > 0) {
                    soundFx.playVictory();
                  } else {
                    if (currentRoomId && playType === 'multiplayer') {
                      markRoomFinished(currentRoomId);
                    }
                    soundFx.playVictory();
                    setGameState('gameover');
                  }
                }}
              />
            )}

            {/* Ngẫu Hứng (Rush) Arena */}
            {gameMode === 'ngau_hung' && (
              <NgauHungArena
                words={words}
                totalRounds={
                  config.ngauHung?.difficulties[difficulty]?.totalRounds || (difficulty === 'legendary' ? 20 : 15)
                }
                roundDurationSec={
                  config.ngauHung?.difficulties[difficulty]?.roundDuration || (difficulty === 'legendary' ? 5 : 7)
                }
                intermissionDurationSec={
                  config.ngauHung?.difficulties[difficulty]?.intermissionDuration || (difficulty === 'legendary' ? 2 : 3)
                }
                players={players}
                currentPlayerId={currentUserId}
                onSurrender={handleSurrender}
                onRestart={playType === 'multiplayer' ? handleSurrenderRestart : handleStartGame}
                onHome={handleReturnToLobby}
                isMultiplayer={playType === 'multiplayer'}
                onFinishGame={(stats?: NgauHungGameStats) => {
                  if (stats) {
                    setNgauHungStats(stats);
                  }
                  let nextPlayers: Player[] = [];
                  setPlayers((prev) => {
                    nextPlayers = prev.map((p) =>
                      p.id === currentUserId ? { ...p, isFinished: true, progress: 100 } : p
                    );
                    playersRef.current = nextPlayers;
                    return nextPlayers;
                  });

                  if (playType === 'multiplayer' && currentRoomId) {
                    sendPlayerProgress(currentRoomId, currentUserId, 100, 0, 0, 0, true);
                    updateRoomPlayers(currentRoomId, nextPlayers);
                  }

                  const currentList = nextPlayers.length > 0 ? nextPlayers : (playersRef.current || players);
                  const me = currentList.find((p) => p.id === currentUserId);
                  const isPlayerSurrendered = me?.isSurrendered || false;
                  const finalScore = me ? me.score : 0;

                  // Chỉ người chơi tham gia trọn vẹn ván đấu, không đầu hàng và không out phòng mới được xét lên Bảng Vàng
                  if (!isPlayerSurrendered && finalScore > 0) {
                    submitScoreToLeaderboard({
                      mode: 'ngau_hung',
                      username: currentUser?.username || username,
                      displayName: currentUser?.displayName || username,
                      score: finalScore,
                      errors: 0,
                      avatar,
                      frame: userFrame,
                      isSurrendered: false,
                      isCompleted: true,
                      roomId: currentRoomId || undefined,
                      playerId: currentUserId,
                    }).then((res) => {
                      if (res && res.success && res.highScores) {
                        setHighScores(res.highScores);
                        saveLeaderboardToIndexedDB(res.highScores).catch(() => {});
                      }
                    });

                    if (finalScore >= 100) {
                      announceLinhLungCheer(
                        currentUser?.displayName || currentUser?.username || username,
                        finalScore,
                        100,
                        'Ngẫu Hứng (Rush)'
                      ).catch(() => {});
                    }
                  }

                  const rivals = currentList.filter((p) => p.id !== currentUserId && !p.isSurrendered);
                  const isTop = rivals.every((r) => (r.score || 0) <= finalScore);
                  const matchResult: MatchResult = isPlayerSurrendered
                    ? 'Đầu hàng'
                    : playType === 'multiplayer'
                    ? (isTop ? 'Thắng' : 'Thua')
                    : (finalScore > 0 ? 'Thắng' : 'Thua');

                  recordCurrentMatch({
                    modeId: 'ngau_hung',
                    wpm: me?.wpm || (finalScore ? Math.round(finalScore / 2) : 0),
                    accuracy: me?.accuracy ?? 100,
                    result: matchResult,
                    score: finalScore,
                    isCompleted: !isPlayerSurrendered,
                  });

                  const activeHumanCompetitors = currentList.filter(
                    (p) => p.id !== currentUserId && !p.isBot && !p.isSurrendered && !p.isFinished && p.inMatch !== false
                  );

                  if (playType === 'multiplayer' && activeHumanCompetitors.length > 0) {
                    soundFx.playVictory();
                  } else {
                    if (currentRoomId && playType === 'multiplayer') {
                      markRoomFinished(currentRoomId);
                    }
                    soundFx.playVictory();
                    setGameState('gameover');
                  }
                }}
                onUpdateScore={(pts, targetId) => {
                  const id = targetId || currentUserId;
                  const currentList = playersRef.current || players;
                  const nextPlayers = currentList.map((p) =>
                    p.id === id ? { ...p, score: p.score + pts } : p
                  );
                  playersRef.current = nextPlayers;
                  setPlayers(nextPlayers);
                  if (playType === 'multiplayer' && currentRoomId && nextPlayers.length > 0) {
                    updateRoomPlayers(currentRoomId, nextPlayers);
                  }
                }}
              />
            )}
          </>
        )}

        {/* 4. GAME OVER MODAL */}
        {gameState === 'gameover' && (
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
          />
        )}
      </main>

      {/* Floating Chat Drawer */}
      {isChatOpen && (
        <ChatDrawer
          messages={chatMessages}
          currentUsername={username}
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
        />
      )}

      {/* Sổ Tay Đạo Hữu & Kết Bái Đạo Lữ Modal */}
      <FriendsModal
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
        currentUser={currentUser}
        currentRoomId={currentRoomId}
        currentMode={gameMode}
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
      />

      {/* Toast Lời Mời Vào Phòng Thi Đấu / Tương Tác Đạo Hữu */}
      {friendInviteToast && (
        <div
          id="friend-invite-toast"
          className="fixed bottom-6 right-6 z-50 max-w-sm w-full p-4 rounded-2xl bg-slate-900/98 border-2 border-emerald-500/80 shadow-2xl backdrop-blur-xl animate-slideInRight text-left space-y-3"
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
              <button
                type="button"
                onClick={() => {
                  setFriendInviteToast(null);
                  setIsFriendsOpen(true);
                }}
                className="flex-1 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all active:scale-95 text-center"
              >
                Mở Sổ Tay Duyệt
              </button>
            )}
            {friendInviteToast.type === 'daolu' && (
              <button
                type="button"
                onClick={() => {
                  setFriendInviteToast(null);
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
        onAuthSuccess={handleAuthSuccess}
        onModalCreateNewRoom={handleModalCreateNewRoom}
        onModalJoinExistingRoom={handleModalJoinExistingRoom}
        onModalQuickJoinRoom={handleModalQuickJoinRoom}
        onOpenMatchHistory={() => setIsMatchHistoryOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        setNewlyUnlockedAchievements={setNewlyUnlockedAchievements}
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
        currentUsername={currentUser?.username || username}
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
        username={currentUser?.username || username}
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
        <footer className="border-t border-slate-800/80 bg-slate-950/60 py-3 px-4 text-center text-xs text-slate-500 hidden sm:block">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>FastTyping Challenge • Đấu trường gõ phím Tiếng Việt thời gian thực</span>
            <span className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              copyright Nguyễn Duy Tiến - niTe
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}

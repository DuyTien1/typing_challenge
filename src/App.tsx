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
import { ModalContainer } from './components/ModalContainer';
import { HeavenlyTickerBanner } from './components/HeavenlyTickerBanner';
import { HeavenlyChronicleModal } from './components/HeavenlyChronicleModal';
import { DaoDecreeModal } from './components/DaoDecreeModal';
import { announcePenalty, announceRecord, announceBossKill, announceBreakthrough, subscribeToDaoDecrees } from './utils/heavenlyDaoBot';
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
      difficulty,
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
      setCultivationState((prev) => {
        const cultRes = addTuViFromMatch(prev, {
          wpm: data.wpm,
          accuracy: data.accuracy,
          mode: (data.modeId as GameMode) || 'vi_dau',
          score: data.score,
        });
        saveStoredCultivationState(cultRes.updatedState);

        // Đột phá cảnh giới hoặc thăng tầng Tu Vi: Huyền Thiên Khí Linh phát chiếu thư dị tượng
        if (cultRes.leveledUp) {
          const currentRealm = XIANXIA_REALMS[cultRes.updatedState.realmIndex];
          announceBreakthrough(
            userNow.displayName || userNow.username,
            currentRealm?.name || 'Tu Chân',
            getSubStage(cultRes.updatedState.tier),
            cultRes.updatedState.tier
          ).then((dec) => {
            setActiveDaoDecreePopup(dec);
          }).catch(() => {});
        }

        const token = sessionStorage.getItem('fasttyping_token');
        if (token) {
          fetch('/api/cultivation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ cultivation: cultRes.updatedState }),
          }).catch(() => {});
        }
        return cultRes.updatedState;
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMatchHistoryOpen, setIsMatchHistoryOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'achievements'>('profile');
  const [isOnlineUsersOpen, setIsOnlineUsersOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => checkIsAdmin());
  const [kickedNotice, setKickedNotice] = useState<string | null>(null);
  const [isCultivationOpen, setIsCultivationOpen] = useState(false);
  const [isHeavenlyChronicleOpen, setIsHeavenlyChronicleOpen] = useState(false);
  const [activeDaoDecreePopup, setActiveDaoDecreePopup] = useState<HeavenlyDaoDecree | null>(null);
  const [cultivationState, setCultivationState] = useState<CultivationState>(() => loadStoredCultivationState());

  // Lắng nghe Thiên Đạo Chiếu Thư theo thời gian thực:
  // Nếu chiếu thư sắc phong người chơi hiện tại (đột phá, kỷ lục, săn boss), bật Popup Chúc Mừng Độc Bản
  useEffect(() => {
    const unsub = subscribeToDaoDecrees((decree) => {
      const myUsername = currentUserRef.current?.username || usernameRef.current;
      const myDisplayName = currentUserRef.current?.displayName || myUsername;
      if (
        decree.targetUser &&
        myUsername &&
        (decree.targetUser.toLowerCase() === myUsername.toLowerCase() ||
          decree.targetUser.toLowerCase() === myDisplayName.toLowerCase()) &&
        (decree.eventType === 'breakthrough' || decree.eventType === 'record' || decree.eventType === 'boss_kill')
      ) {
        setActiveDaoDecreePopup(decree);
      }
    });
    return () => unsub();
  }, []);

  // Process cultivation lifespan and inactivity decay
  useEffect(() => {
    const res = processCultivationDecay(cultivationState);
    if (
      res.updatedState.thoNguyen !== cultivationState.thoNguyen ||
      res.updatedState.exp !== cultivationState.exp ||
      res.updatedState.realmIndex !== cultivationState.realmIndex
    ) {
      setCultivationState(res.updatedState);
      saveStoredCultivationState(res.updatedState);
    }

    // Periodic check every 60s for 2-hour thọ nguyên decay
    const interval = setInterval(() => {
      setCultivationState((prev) => {
        const checkRes = processCultivationDecay(prev);
        if (
          checkRes.updatedState.thoNguyen !== prev.thoNguyen ||
          checkRes.updatedState.exp !== prev.exp
        ) {
          saveStoredCultivationState(checkRes.updatedState);
          return checkRes.updatedState;
        }
        return prev;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss notification after 7s
  useEffect(() => {
    if (!kickedNotice) return;
    const timer = setTimeout(() => {
      setKickedNotice(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [kickedNotice]);

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

  // Unique Tab ID per page instance in memory (guaranteed unique for every tab even if cloned or incognito)
  const [currentTabId] = useState<string>(() => {
    return 'tab_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  });

  // Persistent device ID across all tabs of this browser to guarantee 1 human user = 1 online count
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

  // Track the current active match ID to prevent auto-relaunching when returning to waiting room
  const currentMatchIdRef = useRef<string | null>(null);

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

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Tự động đồng bộ và khôi phục kỷ lục WPM chi tiết (thời điểm & chế độ) cho chế độ Outplay Yourself
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
      // Dọn dẹp bản ghi cũ nếu thuộc chế độ multiplayer
      setBestWpmRecord(null);
      setBestWpm(0);
      try {
        localStorage.removeItem('fasttyping_best_wpm');
        localStorage.removeItem('fasttyping_best_wpm_record');
      } catch {}
    }
  }, [bestWpm, bestWpmRecord, highScores, username, matchHistory]);

  // Deduplication helper to prevent double chat in all channels (Global & Room)
  const appendChatMessage = useCallback((newMsg: ChatMessage) => {
    setChatMessages((prev) => {
      // 1. Direct ID deduplication
      if (prev.some((m) => m.id === newMsg.id)) {
        return prev;
      }
      // 2. Strict content deduplication: same user, channel, message within 4 seconds window
      const isDuplicate = prev.some(
        (m) =>
          m.username === newMsg.username &&
          m.channel === newMsg.channel &&
          m.message.trim() === newMsg.message.trim() &&
          Math.abs(m.timestamp - newMsg.timestamp) < 4000
      );
      if (isDuplicate) {
        return prev;
      }
      return [...prev, newMsg];
    });
  }, []);

  // Players list & Room Management
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isRoomHost, setIsRoomHost] = useState(true);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [targetJoinMode, setTargetJoinMode] = useState<GameMode>('vi_dau');
  const [userFrame, setUserFrame] = useState<string>(() => getStoredFrame());

  // Presence metadata synchronization
  const metaRef = useRef({
    username,
    avatar,
    frame: userFrame,
    bestWpm,
    bestWpmRecord: bestWpmRecord || undefined,
    totalGames,
    currentRoomId,
    currentMode: gameMode,
    status: (gameState === 'lobby' ? 'lobby' : (gameState === 'waiting_room' ? 'waiting_room' : (gameMode === 'outplay' ? 'outplay' : 'playing'))) as 'lobby' | 'waiting_room' | 'playing' | 'outplay' | 'gameover',
    isAdmin,
    deviceId,
  });

  useEffect(() => {
    const newStatus = (gameState === 'lobby' ? 'lobby' : (gameState === 'waiting_room' ? 'waiting_room' : (gameMode === 'outplay' ? 'outplay' : 'playing'))) as 'lobby' | 'waiting_room' | 'playing' | 'outplay' | 'gameover';
    metaRef.current = {
      username,
      avatar,
      frame: userFrame,
      bestWpm,
      bestWpmRecord: bestWpmRecord || undefined,
      totalGames,
      currentRoomId,
      currentMode: gameMode,
      status: newStatus,
      isAdmin,
      deviceId,
    };
    sendPresencePing(currentTabId, currentUser?.id || currentUserId, metaRef.current);
  }, [username, avatar, userFrame, bestWpm, bestWpmRecord, totalGames, currentRoomId, gameMode, gameState, isAdmin, currentTabId, currentUserId, currentUser, deviceId]);

  // Realtime Global Chat, Presence & Server Leaderboard Synchronization
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
      () => metaRef.current
    );
    return () => {
      unsubscribeGlobalChat();
    };
  }, [appendChatMessage, currentUserId, currentUser, currentTabId]);

  const createMePlayer = useCallback((): Player => ({
    id: currentUserId,
    username: username,
    icon: avatar,
    frame: userFrame,
    showcaseAchievements: currentUser?.showcaseAchievements || getShowcaseAchievements(),
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
  }), [currentUserId, username, avatar, userFrame, bestWpm, bestWpmRecord, totalGames, currentUser]);

  // Initial players: ONLY current user, NO automatic bots!
  const [players, setPlayers] = useState<Player[]>([
    {
      id: currentUserId,
      username: username,
      icon: avatar,
      frame: getStoredFrame(),
      showcaseAchievements: getShowcaseAchievements(),
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
    },
  ]);

  // Sync user changes to players list
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

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

  useEffect(() => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentUserId
          ? { ...p, username, icon: avatar, frame: userFrame, bestWpm, bestWpmRecord: bestWpmRecord || undefined, totalGames }
          : p
      )
    );
  }, [username, avatar, userFrame, bestWpm, bestWpmRecord, totalGames, currentUserId]);

  // Realtime cross-device & cross-tab synchronization for Rooms
  useEffect(() => {
    if ((gameState !== 'waiting_room' && gameState !== 'playing' && gameState !== 'gameover') || !currentRoomId) return;

    // Realtime cross-device & cross-tab synchronization for Rooms & Room Chat
    fetchChatMessages('room', currentRoomId).then((msgs) => {
      msgs.forEach((m) => appendChatMessage(m));
    });

    const unsubscribe = subscribeToRoom(
      currentRoomId,
      (updatedRoom) => {
        if (!updatedRoom) {
          // Room was closed or all players left
          if (gameState === 'waiting_room' || gameState === 'gameover') {
            setCurrentRoomId(null);
            setGameState('lobby');
          }
          return;
        }

        if (gameState === 'waiting_room' || gameState === 'gameover') {
          // Kiểm tra xem người chơi có bị đá khỏi phòng không
          const meInRoom = updatedRoom.players?.find((p) => p.id === currentUserId);
          if (gameState === 'waiting_room' && !meInRoom) {
            soundFx.playError();
            setCurrentRoomId(null);
            setGameState('lobby');
            setKickedNotice('Bạn đã bị chủ phòng mời ra khỏi phòng.');
            return;
          }

          setPlayers((currentPlayers) => {
            if (
              currentPlayers.length === updatedRoom.players.length &&
              currentPlayers.every((cp, i) => {
                const up = updatedRoom.players[i];
                return (
                  up &&
                  cp.id === up.id &&
                  cp.username === up.username &&
                  cp.icon === up.icon &&
                  cp.frame === up.frame &&
                  cp.isBot === up.isBot &&
                  cp.inMatch === up.inMatch &&
                  cp.progress === up.progress &&
                  cp.wpm === up.wpm &&
                  cp.isFinished === up.isFinished &&
                  cp.isSurrendered === up.isSurrendered
                );
              })
            ) {
              return currentPlayers;
            }
            return updatedRoom.players;
          });
          setIsRoomHost(updatedRoom.hostId === currentUserId);
          if (updatedRoom.mode && updatedRoom.mode !== gameModeRef.current) {
            setGameMode(updatedRoom.mode);
            gameModeRef.current = updatedRoom.mode;
          }
          if (updatedRoom.difficulty && updatedRoom.difficulty !== difficultyRef.current) {
            setDifficulty(updatedRoom.difficulty);
            difficultyRef.current = updatedRoom.difficulty;
          }

          // Kiểm tra xem người chơi hiện tại có thực sự đang trong trạng thái thi đấu (inMatch: true)
          // và có phải trận đấu MỚI (khác matchId) do chủ phòng vừa phát động không
          const isNewMatch = Boolean(
            updatedRoom.matchId && updatedRoom.matchId !== currentMatchIdRef.current
          );

          // Chỉ khởi chạy vào game khi chủ phòng phát động trận đấu MỚI và người chơi này có inMatch: true!
          // Nếu người chơi đã đầu hàng trở về phòng chờ (inMatch: false), giữ nguyên ở phòng chờ.
          if (
            gameState === 'waiting_room' &&
            updatedRoom.status === 'playing' &&
            isNewMatch &&
            meInRoom?.inMatch
          ) {
            currentMatchIdRef.current = updatedRoom.matchId || null;
            handleLaunchGame(
              false,
              updatedRoom.mode,
              updatedRoom.words,
              updatedRoom.mysteryWords,
              updatedRoom.matchId
            );
          }
        } else if (gameState === 'playing') {
          // Khi phòng được thông báo kết thúc (status: finished):
          if (updatedRoom.status === 'finished') {
            setPlayers((prev) => {
              const me = prev.find((p) => p.id === currentUserId);
              return updatedRoom.players.map((remoteP) => {
                if (remoteP.id === currentUserId) {
                  return {
                    ...remoteP,
                    progress: me?.progress ?? remoteP.progress,
                    wpm: me?.wpm ?? remoteP.wpm,
                    correctChars: me?.correctChars ?? remoteP.correctChars,
                    errors: me?.errors ?? remoteP.errors,
                    isFinished: me?.isFinished ?? remoteP.isFinished,
                    isSurrendered: me?.isSurrendered ?? remoteP.isSurrendered,
                    score: me?.score ?? remoteP.score,
                    chartData: me?.chartData ?? remoteP.chartData,
                    ghostDiff: me?.ghostDiff ?? remoteP.ghostDiff,
                    lastWpm: me?.lastWpm ?? remoteP.lastWpm,
                    sessionBestWpm: me?.sessionBestWpm ?? remoteP.sessionBestWpm,
                  };
                }
                return remoteP;
              });
            });
            if (gameMode === 'san_boss') {
              setIsBossVictory(false);
            }
            const meInUpdated = updatedRoom.players.find((p) => p.id === currentUserId);
            const isSurr = meInUpdated?.isSurrendered || false;
            // Chỉ được tính là hoàn thành ván đấu nếu người chơi đã hoàn thành toàn bộ bài thi (isFinished === true) và không đầu hàng
            const isFinishedMatch = !!meInUpdated?.isFinished && !isSurr;
            const rivals = updatedRoom.players.filter((p) => p.id !== currentUserId && !p.isSurrendered);
            const isTop = rivals.every((r) => (r.wpm || 0) <= (meInUpdated?.wpm || 0));
            const result: MatchResult = isSurr ? 'Đầu hàng' : (isTop ? 'Thắng' : 'Thua');
            recordCurrentMatch({
              modeId: gameMode,
              wpm: meInUpdated?.wpm || 0,
              accuracy: meInUpdated?.accuracy ?? 100,
              result,
              score: meInUpdated?.score,
              isCompleted: isFinishedMatch,
            });
            if (result === 'Thắng' && isFinishedMatch) {
              soundFx.playVictory();
            } else if (isSurr) {
              soundFx.playError();
            }
            setGameState('gameover');
            return;
          }

          // Live match synchronization: update other players' progress bars, WPM, and surrender state
          // Lấy danh sách từ updatedRoom.players để cập nhật cả các trường hợp người chơi out/rời phòng
          let shouldEndGame = false;
          setPlayers((prev) => {
            const me = prev.find((p) => p.id === currentUserId);
            const synced = updatedRoom.players.map((remoteP) => {
              if (remoteP.id === currentUserId) {
                return {
                  ...remoteP,
                  progress: me?.progress ?? remoteP.progress,
                  wpm: me?.wpm ?? remoteP.wpm,
                  correctChars: me?.correctChars ?? remoteP.correctChars,
                  errors: me?.errors ?? remoteP.errors,
                  isFinished: me?.isFinished ?? remoteP.isFinished,
                  isSurrendered: me?.isSurrendered ?? remoteP.isSurrendered,
                  score: me?.score ?? remoteP.score,
                  chartData: me?.chartData ?? remoteP.chartData,
                  ghostDiff: me?.ghostDiff ?? remoteP.ghostDiff,
                  lastWpm: me?.lastWpm ?? remoteP.lastWpm,
                  sessionBestWpm: me?.sessionBestWpm ?? remoteP.sessionBestWpm,
                };
              }
              return remoteP;
            });

            // Kiểm tra nếu không còn người chơi thực nào đang chơi (tất cả đã đầu hàng, hoàn thành, hoặc out)
            const activeHumanPlayers = synced.filter(
              (p) => !p.isBot && !p.isSurrendered && !p.isFinished && p.inMatch !== false
            );
            if (activeHumanPlayers.length === 0) {
              shouldEndGame = true;
            }

            playersRef.current = synced;
            return synced;
          });

          if (shouldEndGame) {
            if (currentRoomId) {
              markRoomFinished(currentRoomId);
            }
            if (gameMode === 'san_boss') {
              setIsBossVictory(false);
            }
            soundFx.playVictory();
            setGameState('gameover');
          }
        }
      },
      (roomMsg) => {
        appendChatMessage(roomMsg);
      },
      (kickedPlayerId, kickedUsername) => {
        if (kickedPlayerId === currentUserId) {
          soundFx.playError();
          setCurrentRoomId(null);
          setGameState('lobby');
          setKickedNotice('Bạn đã bị chủ phòng mời ra khỏi phòng.');
        } else {
          setKickedNotice(`${kickedUsername || 'Một người chơi'} đã bị chủ phòng mời rời khỏi phòng.`);
        }
      }
    );

    return () => unsubscribe();
  }, [gameState, currentRoomId, currentUserId, appendChatMessage]);

  // Clean up player from room when tab is closed or navigated away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentRoomId) {
        leaveRoom(currentRoomId, currentUserId);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentRoomId, currentUserId]);

  // Global Escape key listener: quickly closes any active modal, panel, or drawer
  useEffect(() => {
    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      // Close open modals/drawers in top-to-bottom priority
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
    kickedNotice,
  ]);

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

  // Bot Management - Host adds/removes bots manually as needed (randomized and non-duplicate)
  const handleAddBot = useCallback(() => {
    // Chế độ ngẫu hứng, đoán chữ và săn boss không cho phép thêm bot
    if (gameMode === 'ngau_hung' || gameMode === 'doan_chu' || gameMode === 'san_boss') return;
    if (players.length >= 8) return;

    const existingNames = new Set(players.map((p) => p.username.toLowerCase()));
    const existingIcons = new Set(players.map((p) => p.icon));

    // Lọc ra các bot chưa có trong phòng để đảm bảo chọn ngẫu nhiên nhưng không trùng lặp
    let availableTemplates = BOT_NAMES.filter(
      (b) => !existingNames.has(b.name.toLowerCase()) && !existingIcons.has(b.icon)
    );

    // Nếu các icon bị trùng nhưng tên chưa trùng:
    if (availableTemplates.length === 0) {
      availableTemplates = BOT_NAMES.filter((b) => !existingNames.has(b.name.toLowerCase()));
    }

    // Chọn ngẫu nhiên 1 template trong danh sách chưa trùng
    const botTemplate = availableTemplates.length > 0
      ? availableTemplates[Math.floor(Math.random() * availableTemplates.length)]
      : BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];

    // Đảm bảo tên duy nhất tuyệt đối nếu có trường hợp trùng
    let botUsername = botTemplate.name;
    let counter = 2;
    while (existingNames.has(botUsername.toLowerCase())) {
      botUsername = `${botTemplate.name}_${counter}`;
      counter++;
    }

    // Chọn khung viền ngẫu nhiên không trùng nếu có thể
    const allFrames = ['default', 'flame', 'lightning', 'cosmic', 'matrix', 'arcane', 'dragon'];
    const existingFrames = new Set(players.map((p) => p.frame).filter(Boolean));
    const availableFrames = allFrames.filter((f) => !existingFrames.has(f));
    const chosenFrame = availableFrames.length > 0
      ? availableFrames[Math.floor(Math.random() * availableFrames.length)]
      : allFrames[Math.floor(Math.random() * allFrames.length)];

    const randomVariance = Math.floor(Math.random() * 7) - 3;
    const targetWpm = Math.max(50, botTemplate.wpm + randomVariance);

    const newBot: Player = {
      id: `bot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username: botUsername,
      icon: botTemplate.icon,
      frame: chosenFrame,
      bestWpm: targetWpm + Math.floor(Math.random() * 6 + 2),
      totalGames: Math.floor(Math.random() * 40 + 15),
      progress: 0,
      wpm: 0,
      score: 0,
      errors: 0,
      correctChars: 0,
      isFinished: false,
      isSurrendered: false,
      isAFK: false,
      isBot: true,
      botTargetWpm: targetWpm,
    };

    soundFx.playKeyClick();
    const updated = [...players, newBot];
    setPlayers(updated);
    if (currentRoomId) {
      updateRoomPlayers(currentRoomId, updated);
    }
  }, [gameMode, players, currentRoomId]);

  const handleRemoveBot = useCallback(() => {
    const lastBotIdx = [...players].reverse().findIndex((p) => p.isBot);
    if (lastBotIdx === -1) return;
    const actualIdx = players.length - 1 - lastBotIdx;
    const updated = players.filter((_, i) => i !== actualIdx);
    soundFx.playKeyClick();
    setPlayers(updated);
    if (currentRoomId) {
      updateRoomPlayers(currentRoomId, updated);
    }
  }, [players, currentRoomId]);

  // Nhường quyền chủ phòng: người được chọn lên Slot 1, chủ cũ chuyển vào slot người kia để lại
  const handleTransferHost = async (targetPlayerId: string) => {
    if (!currentRoomId || !isRoomHost) return;
    const targetIdx = players.findIndex((p) => p.id === targetPlayerId);
    const hostIdx = players.findIndex((p) => p.id === currentUserId);
    if (targetIdx === -1) return;

    const targetPlayer = players[targetIdx];
    if (targetPlayer.isBot) return;

    // Optimistic local update
    const updated = [...players];
    const effectiveHostIdx = hostIdx !== -1 ? hostIdx : 0;
    const oldHostPlayer = updated[effectiveHostIdx];
    updated[0] = targetPlayer;
    updated[targetIdx] = oldHostPlayer;
    setPlayers(updated);
    setIsRoomHost(false);

    soundFx.playKeyClick();
    await transferRoomHost(currentRoomId, targetPlayerId, currentUserId);
  };

  // Đá người chơi hoặc bot khỏi phòng
  const handleKickPlayer = async (targetPlayerId: string) => {
    if (!currentRoomId || !isRoomHost) return;
    const targetPlayer = players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer) return;

    // Optimistic local update
    const updated = players.filter((p) => p.id !== targetPlayerId);
    setPlayers(updated);

    soundFx.playError();
    await kickRoomPlayer(currentRoomId, targetPlayerId, currentUserId);
  };

  // Trigger modal when user selects a multiplayer mode
  const handleJoinWaitingRoom = (modeOverride?: GameMode) => {
    const chosenMode = modeOverride || gameMode;
    soundFx.playKeyClick();
    handleSelectMode(chosenMode);
    setTargetJoinMode(chosenMode);
    setIsJoinModalOpen(true);
  };

  // Modal Action 1: Tạo phòng mới
  const handleModalCreateNewRoom = async (mode: GameMode) => {
    const me = createMePlayer();
    const newRoom = await createNewRoom(mode, me, false, difficulty);
    setCurrentRoomId(newRoom.id);
    setIsRoomHost(true);
    setPlayers([me]); // 0 bots, only host!
    setGameMode(mode);
    setPlayType('multiplayer');
    setGameState('waiting_room');
    setIsJoinModalOpen(false);
  };

  // Modal Action 2: Vào phòng đã có bằng mã
  const handleModalJoinExistingRoom = async (code: string, mode: GameMode) => {
    const me = createMePlayer();
    const result = await joinExistingRoom(code, me, mode);
    if (!result.success || !result.room) {
      return { success: false, error: result.error || 'Phòng không tồn tại hoặc không thể tham gia.' };
    }
    setCurrentRoomId(result.room.id);
    setIsRoomHost(Boolean(result.isHost));
    setPlayers(result.room.players);
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
    const me = createMePlayer();
    const result = await quickJoinOrCreateRoom(mode, me, difficulty);
    setCurrentRoomId(result.room.id);
    setIsRoomHost(Boolean(result.isHost));
    setPlayers(result.room.players);
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
    if (playType === 'solo' || gameMode === 'outplay') {
      handleStartSoloGame(gameMode);
    } else {
      handleLaunchGame(false);
    }
  };

  // Match History Actions: Practice Mistakes & Challenge Retry
  const handlePracticeMistakes = (mistakeWords: string[], modeOverride?: GameMode) => {
    if (!mistakeWords || mistakeWords.length === 0) return;
    let practiceList: string[] = [];
    while (practiceList.length < 25) {
      practiceList.push(...mistakeWords);
    }
    practiceList = practiceList.slice(0, 30);
    const targetMode = modeOverride || 'vi_dau';
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
    handleLaunchGame(true, targetMode, practiceList);
  };

  const handleRetryMatch = (record: MatchRecord) => {
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

    // Huyền Thiên Khí Linh trừng phạt gian lận nếu phát hiện can thiệp tà pháp / macro
    if (!validation.isValid) {
      announcePenalty(
        currentUser?.username || username,
        validation.reason || 'Bất thường tần số gõ phím / Nghi vấn Auto Macro'
      ).catch(() => {});
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

    recordCurrentMatch({
      modeId: gameMode,
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

  const handleUpdateConditionStats = (conditionKey: string, lastWpm: number, bestWpm: number) => {
    setConditionStats((prev) => ({
      ...prev,
      [conditionKey]: { lastWpm, bestWpm },
    }));
    setLastGameWpm(lastWpm);
    setSessionBestWpm(bestWpm);
  };

  // Chat message send
  const handleSendMessage = async (messageText: string, channel: 'global' | 'room') => {
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMsg: ChatMessage = {
      id: msgId,
      username,
      avatar,
      frame: userFrame,
      message: messageText,
      timestamp: Date.now(),
      channel,
      roomId: channel === 'room' ? (currentRoomId || undefined) : undefined,
      isAdmin,
    };
    appendChatMessage(optimisticMsg);

    try {
      await sendChatMessage({
        id: msgId,
        username,
        avatar,
        frame: userFrame,
        message: messageText,
        channel,
        roomId: channel === 'room' ? (currentRoomId || undefined) : undefined,
        isAdmin,
      });
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
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

    const isUserAdmin = Boolean(user.isAdmin || user.username.toLowerCase() === 'admin');
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
          currentRoomId={currentRoomId}
          isAdmin={isAdmin}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          onClose={() => setIsChatOpen(false)}
        />
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

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-3 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>FastTyping Challenge • Đấu trường gõ phím Tiếng Việt thời gian thực</span>
          <span className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            copyright Nguyễn Duy Tiến - niTe
          </span>
        </div>
      </footer>
    </div>
  );
}

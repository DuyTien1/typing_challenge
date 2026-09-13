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
} from './types';
import { Header } from './components/Header';
import { LobbyView } from './components/LobbyView';
import { WaitingRoomView } from './components/WaitingRoomView';
import { TypingArena } from './components/TypingArena';
import { BossArena } from './components/BossArena';
import { MysteryWordArena } from './components/MysteryWordArena';
import { NgauHungArena } from './components/NgauHungArena';
import { GameOverModal } from './components/GameOverModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ChatDrawer } from './components/ChatDrawer';
import { AdminModal } from './components/AdminModal';
import { ProfileModal } from './components/ProfileModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import {
  createNewRoom,
  joinExistingRoom,
  quickJoinOrCreateRoom,
  subscribeToRoom,
  updateRoomPlayers,
  markRoomPlaying,
  markRoomWaiting,
  leaveRoom,
  sendPlayerProgress,
  subscribeToGlobalChat,
  sendChatMessage,
  clearServerChat,
  fetchChatMessages,
  fetchOnlineCount,
  fetchLeaderboard,
  submitScoreToLeaderboard,
  adminUpdateLeaderboard,
  adminResetLeaderboard,
} from './utils/roomManager';
import { soundFx } from './utils/audio';
import { validateKeystrokes } from './utils/antiCheat';
import { generateWords, generateDoanChuWords } from './data/wordBanks';
import { initThemeAndFont } from './utils/themeAndFont';
import { getStoredFrame, setStoredFrame, checkIsAdmin, setAdminStatus } from './utils/frames';

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
      },
      legendary: {
        name: 'Huyền Thoại',
        icon: '👑',
        color: '#ff0055',
        roundDuration: 5,
        intermissionDuration: 2,
        totalRounds: 20,
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
      },
    },
  },
  sanBoss: {
    difficulties: {
      normal: {
        name: 'Bình thường',
        icon: '🟡',
        color: '#ffe600',
        duration: 150,
        baseHp: 550,
        hpPerPlayer: 500,
        selfDestructTarget: 450,
        skillInterval: 14,
        skillWarningDuration: 2,
        shieldDuration: 6,
        shieldHpPerPlayer: 45,
        stunDuration: 3,
        shakeDuration: 5,
        smokeDuration: 4,
        reverseDuration: 5,
        capslockDuration: 5,
        skillRates: {
          shield: 25,
          shake: 20,
          smoke: 20,
          reverse: 15,
          capslock: 20,
        },
      },
      hard: {
        name: 'Khó',
        icon: '🔴',
        color: '#ff7700',
        duration: 130,
        baseHp: 650,
        hpPerPlayer: 600,
        selfDestructTarget: 500,
        skillInterval: 12,
        skillWarningDuration: 1.8,
        shieldDuration: 5,
        shieldHpPerPlayer: 55,
        stunDuration: 2.5,
        shakeDuration: 5,
        smokeDuration: 4,
        reverseDuration: 5,
        capslockDuration: 5,
        skillRates: {
          shield: 25,
          shake: 20,
          smoke: 20,
          reverse: 15,
          capslock: 20,
        },
      },
      hell: {
        name: 'Địa ngục',
        icon: '💀',
        color: '#ff0055',
        duration: 120,
        baseHp: 750,
        hpPerPlayer: 700,
        selfDestructTarget: 550,
        skillInterval: 10,
        skillWarningDuration: 1.5,
        shieldDuration: 5,
        shieldHpPerPlayer: 65,
        stunDuration: 2,
        shakeDuration: 5,
        smokeDuration: 5,
        reverseDuration: 6,
        capslockDuration: 6,
        skillRates: {
          shield: 30,
          shake: 15,
          smoke: 20,
          reverse: 15,
          capslock: 20,
        },
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
    return Number(localStorage.getItem('fasttyping_best_wpm')) || 0;
  });
  const [totalGames, setTotalGames] = useState<number>(() => {
    return Number(localStorage.getItem('fasttyping_games_count')) || 0;
  });

  // Session Statistics for Realtime HUD (In-Memory Room Session Tracking - Cleared on room exit or page reload)
  const [conditionStats, setConditionStats] = useState<Record<string, { lastWpm: number; bestWpm: number }>>({});
  const [lastGameWpm, setLastGameWpm] = useState<number>(0);
  const [sessionBestWpm, setSessionBestWpm] = useState<number>(0);

  // Game Settings & State
  const [gameMode, setGameMode] = useState<GameMode>('vi_dau');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('normal');
  const [playType, setPlayType] = useState<'solo' | 'multiplayer'>('multiplayer');
  const [gameState, setGameState] = useState<'lobby' | 'waiting_room' | 'countdown' | 'playing' | 'gameover'>('lobby');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundFx.getMuted());
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);

  // Active match data
  const [words, setWords] = useState<string[]>([]);
  const [mysteryWords, setMysteryWords] = useState<MysteryWordItem[]>([]);
  const [bossState, setBossState] = useState<BossState | null>(null);
  const [isBossVictory, setIsBossVictory] = useState<boolean>(false);

  // Modals
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => checkIsAdmin());

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

  // Real Online Presence & Server-wide Leaderboard (Zero mock data)
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [highScores, setHighScores] = useState<Record<string, HighScoreRecord | null>>(() => {
    const saved = localStorage.getItem('fasttyping_highscores');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const mockNames = new Set(['GiaCátGõ', 'LướtGió', 'QuickFox', 'KếToánViên', 'ChớpNhoáng', 'ThámTửPhím', 'DũngSĩRồng', 'PhímThần_VN']);
        const hasMock = Object.values(parsed).some((r: any) => r && mockNames.has(r.username));
        if (!hasMock) {
          return parsed;
        }
      } catch {
        // ignore
      }
      localStorage.removeItem('fasttyping_highscores');
    }
    return {
      vi_dau: null,
      vi_nodau: null,
      en: null,
      numpad: null,
      ngau_hung: null,
      doan_chu: null,
      san_boss: null,
    };
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

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
        setHighScores(serverRecords);
        localStorage.setItem('fasttyping_highscores', JSON.stringify(serverRecords));
      },
      currentUserId
    );
    return () => {
      unsubscribeGlobalChat();
    };
  }, [appendChatMessage, currentUserId]);

  // Players list & Room Management
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isRoomHost, setIsRoomHost] = useState(true);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [targetJoinMode, setTargetJoinMode] = useState<GameMode>('vi_dau');
  const [userFrame, setUserFrame] = useState<string>(() => getStoredFrame());

  const createMePlayer = useCallback((): Player => ({
    id: currentUserId,
    username: username,
    icon: avatar,
    frame: userFrame,
    bestWpm: bestWpm,
    totalGames: totalGames,
    progress: 0,
    wpm: 0,
    score: 0,
    errors: 0,
    correctChars: 0,
    isFinished: false,
    isSurrendered: false,
    isAFK: false,
  }), [currentUserId, username, avatar, userFrame, bestWpm, totalGames]);

  // Initial players: ONLY current user, NO automatic bots!
  const [players, setPlayers] = useState<Player[]>([
    {
      id: currentUserId,
      username: username,
      icon: avatar,
      frame: getStoredFrame(),
      bestWpm: bestWpm,
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
  useEffect(() => {
    initThemeAndFont();
  }, []);

  useEffect(() => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentUserId
          ? { ...p, username, icon: avatar, frame: userFrame, bestWpm, totalGames }
          : p
      )
    );
  }, [username, avatar, userFrame, bestWpm, totalGames, currentUserId]);

  // Realtime cross-device & cross-tab synchronization for Rooms
  useEffect(() => {
    if ((gameState !== 'waiting_room' && gameState !== 'playing') || !currentRoomId) return;

    // Realtime cross-device & cross-tab synchronization for Rooms & Room Chat
    fetchChatMessages('room', currentRoomId).then((msgs) => {
      msgs.forEach((m) => appendChatMessage(m));
    });

    const unsubscribe = subscribeToRoom(
      currentRoomId,
      (updatedRoom) => {
        if (!updatedRoom) {
          // Room was closed or host left
          if (gameState === 'waiting_room') {
            setCurrentRoomId(null);
            setGameState('lobby');
          }
          return;
        }

        if (gameState === 'waiting_room') {
          setPlayers(updatedRoom.players);
          setIsRoomHost(updatedRoom.hostId === currentUserId);
          if (updatedRoom.difficulty && updatedRoom.difficulty !== difficulty) {
            setDifficulty(updatedRoom.difficulty);
          }

          // If host started match, start playing immediately with synchronized words!
          if (updatedRoom.status === 'playing') {
            handleLaunchGame(false, updatedRoom.mode, updatedRoom.words, updatedRoom.mysteryWords);
          }
        } else if (gameState === 'playing') {
          // Live match synchronization: update other players' progress bars and WPM
          setPlayers((prev) =>
            prev.map((p) => {
              if (p.id === currentUserId) return p;
              const remoteP = updatedRoom.players?.find((rp) => rp.id === p.id);
              if (!remoteP) return p;
              return {
                ...p,
                progress: remoteP.progress ?? p.progress,
                wpm: remoteP.wpm ?? p.wpm,
                correctChars: remoteP.correctChars ?? p.correctChars,
                errors: remoteP.errors ?? p.errors,
                isFinished: remoteP.isFinished ?? p.isFinished,
                score: remoteP.score ?? p.score,
              };
            })
          );
        }
      },
      (roomMsg) => {
        appendChatMessage(roomMsg);
      }
    );

    return () => unsubscribe();
  }, [gameState, currentRoomId, currentUserId, difficulty, appendChatMessage]);

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

  // Handle Mode Change
  const handleSelectMode = (newMode: GameMode) => {
    soundFx.playKeyClick();
    setGameMode(newMode);
    if (newMode === 'numpad') {
      setDifficulty('number');
    } else {
      setDifficulty('normal');
    }
    if (newMode === 'outplay') {
      setPlayType('solo');
    } else {
      setPlayType('multiplayer');
    }
  };

  // Bot Management - Host adds/removes bots manually as needed
  const handleAddBot = () => {
    if (players.length >= 8) return;

    const currentBotCount = players.filter((p) => p.isBot).length;
    const botTemplate = BOT_NAMES[currentBotCount % BOT_NAMES.length];
    const newBot: Player = {
      id: `bot-${Date.now()}-${currentBotCount}`,
      username: `${botTemplate.name}${currentBotCount >= BOT_NAMES.length ? `_${currentBotCount + 1}` : ''}`,
      icon: botTemplate.icon,
      frame: ['flame', 'lightning', 'cosmic', 'matrix', 'arcane', 'dragon'][currentBotCount % 6],
      bestWpm: botTemplate.wpm + (currentBotCount % 3) * 4,
      totalGames: 15 + currentBotCount * 8,
      progress: 0,
      wpm: 0,
      score: 0,
      errors: 0,
      correctChars: 0,
      isFinished: false,
      isSurrendered: false,
      isAFK: false,
      isBot: true,
      botTargetWpm: botTemplate.wpm,
    };
    const updated = [...players, newBot];
    setPlayers(updated);
    if (currentRoomId) {
      updateRoomPlayers(currentRoomId, updated);
    }
  };

  const handleRemoveBot = () => {
    const lastBotIdx = [...players].reverse().findIndex((p) => p.isBot);
    if (lastBotIdx === -1) return;
    const actualIdx = players.length - 1 - lastBotIdx;
    const updated = players.filter((_, i) => i !== actualIdx);
    setPlayers(updated);
    if (currentRoomId) {
      updateRoomPlayers(currentRoomId, updated);
    }
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
      setDifficulty(result.room.difficulty as DifficultyLevel);
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
      setDifficulty(result.room.difficulty as DifficultyLevel);
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
    sharedMysteryWords?: MysteryWordItem[]
  ) => {
    const isSolo = isSoloOverride !== undefined ? isSoloOverride : playType === 'solo';
    const targetMode = modeOverride || gameMode;

    let targetWords = sharedWords;
    let targetMystery = sharedMysteryWords;

    // Generate words based on mode if not already shared by host
    if (targetMode === 'doan_chu') {
      if (!targetMystery || targetMystery.length === 0) {
        targetMystery = generateDoanChuWords(difficulty, 10);
      }
      setMysteryWords(targetMystery);
    } else {
      if (!targetWords || targetWords.length === 0) {
        const count = targetMode === 'san_boss' ? 300 : targetMode === 'ngau_hung' ? 25 : 150;
        const modeHardRate =
          config.modeHardWordRates?.[targetMode as keyof typeof config.modeHardWordRates] ??
          config.hardWordRate;
        targetWords = generateWords(targetMode, count, difficulty, modeHardRate);
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

    // Reset players progress
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
      }))
    );

    // Notify other players in room if multiplayer host and share words
    if (currentRoomId && isRoomHost) {
      markRoomPlaying(currentRoomId, targetMode, targetWords, targetMystery);
    }

    // Loại bỏ hoàn toàn màn hình đếm ngược ngoài phòng. Cả Multiplayer và Solo vào thẳng phòng chơi ngay lập tức!
    // Đồng hồ 3s sẽ đếm ngược trực quan ngay trong bàn gõ của phòng chơi trước khi bắt đầu tính giờ thi đấu.
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

  // Bot Simulation in Playing state
  useEffect(() => {
    if (gameState !== 'playing') return;

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
            score: p.score + (gameMode === 'san_boss' ? Math.floor(targetWpm / 15) : 0),
            isFinished: newProgress >= 100,
          };
        })
      );
    }, 600);

    return () => clearInterval(botInterval);
  }, [gameState, gameMode]);

  // Player Progress Update Handler
  const handleUpdatePlayerProgress = (
    progress: number,
    correctChars: number,
    errors: number,
    wpm: number
  ) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentUserId
          ? { ...p, progress, correctChars, errors, wpm }
          : p
      )
    );

    if (playType === 'multiplayer' && currentRoomId) {
      sendPlayerProgress(currentRoomId, currentUserId, progress, correctChars, errors, wpm, progress >= 100);
    }
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

    // Update Session stats
    const prevLast = lastGameWpm;
    setLastGameWpm(verifiedWpm);

    // Session best WPM is strictly for Outplay Yourself mode
    let updatedBest = sessionBestWpm;
    if (gameMode === 'outplay') {
      updatedBest = Math.max(sessionBestWpm, verifiedWpm);
      setSessionBestWpm(updatedBest);
    }

    // Update Career stats
    if (verifiedWpm > bestWpm) {
      setBestWpm(verifiedWpm);
      localStorage.setItem('fasttyping_best_wpm', verifiedWpm.toString());
    }
    const nextGameCount = totalGames + 1;
    setTotalGames(nextGameCount);
    localStorage.setItem('fasttyping_games_count', nextGameCount.toString());

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

    // Submit real score to server leaderboard (broadcasts to all players if new record)
    submitScoreToLeaderboard({
      mode: gameMode,
      username,
      wpm: verifiedWpm,
      score: 0,
      errors,
      avatar,
      frame: userFrame,
    }).then((res) => {
      if (res && res.success && res.highScores) {
        setHighScores(res.highScores);
        localStorage.setItem('fasttyping_highscores', JSON.stringify(res.highScores));
      }
    });

    soundFx.playVictory();
    setGameState('gameover');
  }, [bestWpm, totalGames, currentUserId, highScores, gameMode, username, lastGameWpm, sessionBestWpm, avatar, userFrame]);

  // Boss Mode Damage & Victory Handlers
  const handleBossDamage = (dmg: number, errors: number) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentUserId
          ? { ...p, score: p.score + dmg, errors, correctChars: p.correctChars + dmg }
          : p
      )
    );
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
    soundFx.playShieldBreak();
    setGameState('gameover');
    setIsBossVictory(false);
  };

  const handleBossFinish = (isVictory: boolean, totalDmg: number, errors: number, chartData?: PerformanceChartPoint[]) => {
    setIsBossVictory(isVictory);
    const approxWpm = Math.round((totalDmg / 5) / 1);
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentUserId
          ? { ...p, score: totalDmg, errors, wpm: approxWpm, isFinished: true, chartData }
          : p
      )
    );

    // Save Boss High Score to server
    submitScoreToLeaderboard({
      mode: 'san_boss',
      username,
      wpm: 0,
      score: totalDmg,
      errors,
      avatar,
      frame: userFrame,
    }).then((res) => {
      if (res && res.success && res.highScores) {
        setHighScores(res.highScores);
        localStorage.setItem('fasttyping_highscores', JSON.stringify(res.highScores));
      }
    });

    soundFx.playVictory();
    setGameState('gameover');
  };

  // Surrender Handler
  const handleSurrender = () => {
    // Clear last game WPM, but keep sessionBestWpm
    setLastGameWpm(0);

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentUserId
          ? {
              ...p,
              // In outplay mode, player can continue typing immediately without being locked in surrendered state
              isSurrendered: gameMode === 'outplay' ? false : true,
              lastWpm: undefined,
            }
          : p
      )
    );
    soundFx.playError();
  };

  // Return to lobby & clear session-only stats (Strictly Session-Only per Room)
  const handleReturnToLobby = () => {
    if (currentRoomId) {
      leaveRoom(currentRoomId, currentUserId);
      setCurrentRoomId(null);
    }
    setIsRoomHost(true);
    setGameState('lobby');
    setConditionStats({});
    setLastGameWpm(0);
    setSessionBestWpm(0);
    try {
      sessionStorage.removeItem('fasttyping_last_game_wpm');
      sessionStorage.removeItem('fasttyping_session_best_wpm');
    } catch {}
  };

  const handleBackToWaitingRoom = () => {
    if (currentRoomId && isRoomHost) {
      markRoomWaiting(currentRoomId);
    }
    setGameState('waiting_room');
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

  // Name & Avatar & Frame Change
  const handleChangeUsername = (newName: string) => {
    setUsername(newName);
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
    setAvatar(newAvatar);
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
    setUserFrame(newFrame);
    setStoredFrame(newFrame);
    if (currentRoomId) {
      setPlayers((prev) => {
        const next = prev.map((p) => (p.id === currentUserId ? { ...p, frame: newFrame } : p));
        updateRoomPlayers(currentRoomId, next);
        return next;
      });
    }
  };

  // Admin Actions
  const handleAdminLogin = (pwd: string) => {
    if (pwd === 'admin123') {
      setIsAdmin(true);
      setAdminStatus(true);
      return true;
    }
    return false;
  };

  const handleClearChat = async () => {
    try {
      await clearServerChat();
      setChatMessages((prev) => prev.filter((m) => m.channel !== 'global'));
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  const handleResetLeaderboard = async () => {
    const cleanScores: Record<string, HighScoreRecord | null> = {
      vi_dau: null,
      vi_nodau: null,
      en: null,
      numpad: null,
      ngau_hung: null,
      doan_chu: null,
      san_boss: null,
    };
    setHighScores(cleanScores);
    localStorage.removeItem('fasttyping_highscores');
    await adminResetLeaderboard();
  };

  const handleUpdateHighScores = async (newScores: Record<string, HighScoreRecord | null>) => {
    setHighScores(newScores);
    localStorage.setItem('fasttyping_highscores', JSON.stringify(newScores));
    await adminUpdateLeaderboard(newScores);
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
        onToggleMute={() => setIsMuted(soundFx.toggleMute())}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onGoHome={handleReturnToLobby}
        activeModeName={getModeTitle()}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-start gap-6">
        {/* 1. CLEAN LOBBY / HOME VIEW (SHOWS ALL GAME MODES FOR SELECTION ONLY) */}
        {gameState === 'lobby' && (
          <LobbyView
            currentMode={gameMode}
            onSelectMode={handleSelectMode}
            onStartSoloGame={handleStartSoloGame}
            onJoinWaitingRoom={handleJoinWaitingRoom}
          />
        )}

        {/* 2. MULTIPLAYER WAITING ROOM VIEW */}
        {gameState === 'waiting_room' && (
          <WaitingRoomView
            mode={gameMode}
            modeName={getModeTitle()}
            difficulty={difficulty}
            onSelectDifficulty={setDifficulty}
            players={players}
            currentPlayerId={currentUserId}
            roomId={currentRoomId || undefined}
            isHost={isRoomHost}
            onAddBot={handleAddBot}
            onRemoveBot={handleRemoveBot}
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
                onRestart={handleStartGame}
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
                onRestart={handleStartGame}
                isMultiplayer={playType === 'multiplayer'}
              />
            )}

            {/* Đoán Chữ (Mystery Word) Arena */}
            {gameMode === 'doan_chu' && (
              <MysteryWordArena
                roundItems={mysteryWords}
                totalRounds={10}
                revealIntervalSec={2.0}
                roundDurationSec={25}
                players={players}
                currentPlayerId={currentUserId}
                onFinishRound={(round, scoreEarned) => {
                  setPlayers((prev) =>
                    prev.map((p) =>
                      p.id === currentUserId
                        ? { ...p, score: p.score + scoreEarned }
                        : p
                    )
                  );
                }}
                onFinishGame={() => {
                  const me = players.find((p) => p.id === currentUserId);
                  const finalScore = me ? me.score : 0;
                  submitScoreToLeaderboard({
                    mode: 'doan_chu',
                    username,
                    score: finalScore,
                    errors: 0,
                    avatar,
                    frame: userFrame,
                  }).then((res) => {
                    if (res && res.success && res.highScores) {
                      setHighScores(res.highScores);
                      localStorage.setItem('fasttyping_highscores', JSON.stringify(res.highScores));
                    }
                  });
                  soundFx.playVictory();
                  setGameState('gameover');
                }}
              />
            )}

            {/* Ngẫu Hứng (Rush) Arena */}
            {gameMode === 'ngau_hung' && (
              <NgauHungArena
                words={words}
                totalRounds={15}
                roundDurationSec={7}
                intermissionDurationSec={3}
                players={players}
                currentPlayerId={currentUserId}
                onFinishGame={() => {
                  const me = players.find((p) => p.id === currentUserId);
                  const finalScore = me ? me.score : 0;
                  submitScoreToLeaderboard({
                    mode: 'ngau_hung',
                    username,
                    score: finalScore,
                    errors: 0,
                    avatar,
                    frame: userFrame,
                  }).then((res) => {
                    if (res && res.success && res.highScores) {
                      setHighScores(res.highScores);
                      localStorage.setItem('fasttyping_highscores', JSON.stringify(res.highScores));
                    }
                  });
                  soundFx.playVictory();
                  setGameState('gameover');
                }}
                onUpdateScore={(pts) => {
                  setPlayers((prev) =>
                    prev.map((p) =>
                      p.id === currentUserId ? { ...p, score: p.score + pts } : p
                    )
                  );
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
            isBossMode={gameMode === 'san_boss'}
            isBossVictory={isBossVictory}
            onPlayAgain={handleStartGame}
            onBackToLobby={handleReturnToLobby}
            onBackToWaitingRoom={handleBackToWaitingRoom}
            modeName={getModeTitle()}
            isSolo={playType === 'solo'}
            isOutplay={gameMode === 'outplay'}
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

      {/* Leaderboard Modal */}
      {isLeaderboardOpen && (
        <LeaderboardModal
          highScores={highScores}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      )}

      {/* Admin Panel Modal */}
      {isAdminOpen && (
        <AdminModal
          isAdmin={isAdmin}
          onLogin={handleAdminLogin}
          onLogout={() => {
            setIsAdmin(false);
            setAdminStatus(false);
          }}
          config={config}
          onUpdateConfig={setConfig}
          onClearChat={handleClearChat}
          onResetLeaderboard={handleResetLeaderboard}
          onClose={() => setIsAdminOpen(false)}
          highScores={highScores}
          onUpdateHighScores={handleUpdateHighScores}
          currentUsername={username}
          defaultConfig={DEFAULT_CONFIG}
        />
      )}

      {/* Profile Modal */}
      {isProfileOpen && (
        <ProfileModal
          username={username}
          avatar={avatar}
          frame={userFrame}
          bestWpm={bestWpm}
          totalGames={totalGames}
          isAdmin={isAdmin}
          onChangeUsername={handleChangeUsername}
          onChangeAvatar={handleChangeAvatar}
          onChangeFrame={handleChangeFrame}
          onClose={() => setIsProfileOpen(false)}
        />
      )}

      {/* Join Room Selection Modal (Tạo phòng mới, Vào phòng đã có, Vào phòng nhanh) */}
      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        mode={targetJoinMode}
        onCreateNewRoom={handleModalCreateNewRoom}
        onJoinExistingRoom={handleModalJoinExistingRoom}
        onQuickJoinRoom={handleModalQuickJoinRoom}
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

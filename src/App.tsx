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
import { soundFx } from './utils/audio';
import { validateKeystrokes } from './utils/antiCheat';
import { generateWords, generateDoanChuWords } from './data/wordBanks';
import { initThemeAndFont } from './utils/themeAndFont';

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
  // User Profile
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('fasttyping_user') || 'NgườiChơi_' + Math.floor(Math.random() * 900 + 100);
  });
  const [avatar, setAvatar] = useState<string>(() => {
    return localStorage.getItem('fasttyping_avatar') || '🤖';
  });
  const [bestWpm, setBestWpm] = useState<number>(() => {
    return Number(localStorage.getItem('fasttyping_best_wpm')) || 0;
  });
  const [totalGames, setTotalGames] = useState<number>(() => {
    return Number(localStorage.getItem('fasttyping_games_count')) || 0;
  });

  // Session Statistics for Realtime HUD (Room-specific tracking, reset on leaving room or web refresh)
  const [lastGameWpm, setLastGameWpm] = useState<number>(0);
  const [sessionBestWpm, setSessionBestWpm] = useState<number>(0);
  const [multiplayerCountdown, setMultiplayerCountdown] = useState<number>(0);

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
  const [isAdmin, setIsAdmin] = useState(false);

  // High Scores & Chat
  const [highScores, setHighScores] = useState<Record<string, HighScoreRecord | null>>(() => {
    const saved = localStorage.getItem('fasttyping_highscores');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {
      vi_dau: { username: 'GiaCátGõ', wpm: 98, score: 0, errors: 2, timestamp: Date.now() - 3600000 },
      vi_nodau: { username: 'LướtGió', wpm: 122, score: 0, errors: 1, timestamp: Date.now() - 7200000 },
      en: { username: 'QuickFox', wpm: 104, score: 0, errors: 3, timestamp: Date.now() - 5400000 },
      numpad: { username: 'KếToánViên', wpm: 115, score: 0, errors: 0, timestamp: Date.now() - 2400000 },
      ngau_hung: { username: 'ChớpNhoáng', wpm: 0, score: 42, errors: 1, timestamp: Date.now() - 1800000 },
      doan_chu: { username: 'ThámTửPhím', wpm: 0, score: 58, errors: 2, timestamp: Date.now() - 9000000 },
      san_boss: { username: 'DũngSĩRồng', wpm: 0, score: 850, errors: 4, timestamp: Date.now() - 4800000 },
    };
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'sys-1',
      username: 'Hệ Thống',
      message: 'Chào mừng bạn đến với FastTyping Challenge v4.0! Tất cả nút bấm và chế độ đã sẵn sàng.',
      timestamp: Date.now() - 60000,
      isSystem: true,
      channel: 'global',
    },
    {
      id: 'sys-2',
      username: 'PhímThần_VN',
      message: 'Có ai vào phòng Săn Boss Hắc Long không?',
      timestamp: Date.now() - 20000,
      channel: 'global',
    },
  ]);

  // Players list (Current user + 2 default bots)
  const currentUserId = 'user_me';
  const [players, setPlayers] = useState<Player[]>([
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
    {
      id: 'bot-1',
      username: BOT_NAMES[0].name,
      icon: BOT_NAMES[0].icon,
      progress: 0,
      wpm: 0,
      score: 0,
      errors: 0,
      correctChars: 0,
      isFinished: false,
      isSurrendered: false,
      isAFK: false,
      isBot: true,
      botTargetWpm: BOT_NAMES[0].wpm,
    },
    {
      id: 'bot-2',
      username: BOT_NAMES[1].name,
      icon: BOT_NAMES[1].icon,
      progress: 0,
      wpm: 0,
      score: 0,
      errors: 0,
      correctChars: 0,
      isFinished: false,
      isSurrendered: false,
      isAFK: false,
      isBot: true,
      botTargetWpm: BOT_NAMES[1].wpm,
    },
  ]);

  // Sync user changes to players list
  useEffect(() => {
    initThemeAndFont();
  }, []);

  useEffect(() => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === currentUserId ? { ...p, username, icon: avatar } : p))
    );
  }, [username, avatar]);

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

  // Bot Management
  const handleAddBot = () => {
    if (players.length >= 8) return;

    const currentBotCount = players.filter((p) => p.isBot).length;
    const botTemplate = BOT_NAMES[currentBotCount % BOT_NAMES.length];
    const newBot: Player = {
      id: `bot-${Date.now()}-${currentBotCount}`,
      username: `${botTemplate.name}${currentBotCount >= BOT_NAMES.length ? `_${currentBotCount + 1}` : ''}`,
      icon: botTemplate.icon,
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
    setPlayers((prev) => [...prev, newBot]);
  };

  const handleRemoveBot = () => {
    setPlayers((prev) => {
      const lastBotIdx = [...prev].reverse().findIndex((p) => p.isBot);
      if (lastBotIdx === -1) return prev;
      const actualIdx = prev.length - 1 - lastBotIdx;
      return prev.filter((_, i) => i !== actualIdx);
    });
  };

  // Helper to ensure multiplayer players are populated
  const ensureMultiplayerBots = () => {
    setPlayers((prev) => {
      const bots = prev.filter((p) => p.isBot);
      if (bots.length === 0) {
        return [
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
          {
            id: 'bot-1',
            username: BOT_NAMES[0].name,
            icon: BOT_NAMES[0].icon,
            progress: 0,
            wpm: 0,
            score: 0,
            errors: 0,
            correctChars: 0,
            isFinished: false,
            isSurrendered: false,
            isAFK: false,
            isBot: true,
            botTargetWpm: BOT_NAMES[0].wpm,
          },
          {
            id: 'bot-2',
            username: BOT_NAMES[1].name,
            icon: BOT_NAMES[1].icon,
            progress: 0,
            wpm: 0,
            score: 0,
            errors: 0,
            correctChars: 0,
            isFinished: false,
            isSurrendered: false,
            isAFK: false,
            isBot: true,
            botTargetWpm: BOT_NAMES[1].wpm,
          },
        ];
      }
      return prev;
    });
  };

  // Join Waiting Room from Home page for Multiplayer
  const handleJoinWaitingRoom = (modeOverride?: GameMode) => {
    if (modeOverride) {
      handleSelectMode(modeOverride);
    }
    setPlayType('multiplayer');
    ensureMultiplayerBots();
    setGameState('waiting_room');
  };

  // Launch Game Core (Countdown -> Playing)
  const handleLaunchGame = (isSoloOverride?: boolean, modeOverride?: GameMode) => {
    const isSolo = isSoloOverride !== undefined ? isSoloOverride : playType === 'solo';
    const targetMode = modeOverride || gameMode;

    // Generate words based on mode
    if (targetMode === 'doan_chu') {
      const items = generateDoanChuWords(difficulty, 10);
      setMysteryWords(items);
    } else {
      const count = targetMode === 'san_boss' ? 300 : targetMode === 'ngau_hung' ? 25 : 150;
      const modeHardRate =
        config.modeHardWordRates?.[targetMode as keyof typeof config.modeHardWordRates] ??
        config.hardWordRate;
      const generated = generateWords(targetMode, count, difficulty, modeHardRate);
      setWords(generated);
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

    // Chế độ multiplayer: Loại bỏ hoàn toàn màn hình đếm ngược 3 giây rồi mới vào phòng chơi.
    // Sau khi nhấn bắt đầu, đưa người chơi vào phòng chơi ngay lập tức;
    // đồng hồ trong phòng lúc này sẽ đếm ngược 3s rồi mới chạy thời gian ván đấu!
    if (!isSolo && targetMode !== 'outplay') {
      setMultiplayerCountdown(3);
    } else {
      setMultiplayerCountdown(0);
    }

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
    try {
      sessionStorage.setItem('fasttyping_last_game_wpm', verifiedWpm.toString());
    } catch {}

    // Session best WPM is strictly for Outplay Yourself mode
    let updatedBest = sessionBestWpm;
    if (gameMode === 'outplay') {
      updatedBest = Math.max(sessionBestWpm, verifiedWpm);
      setSessionBestWpm(updatedBest);
      try {
        sessionStorage.setItem('fasttyping_session_best_wpm', updatedBest.toString());
      } catch {}
    }

    // Update Career stats
    if (verifiedWpm > bestWpm) {
      setBestWpm(verifiedWpm);
      localStorage.setItem('fasttyping_best_wpm', verifiedWpm.toString());
    }
    const nextGameCount = totalGames + 1;
    setTotalGames(nextGameCount);
    localStorage.setItem('fasttyping_games_count', nextGameCount.toString());

    // Update player (ensure lastWpm is undefined on the very first game)
    const effectiveLastWpm = (extraStats?.lastWpm && extraStats.lastWpm > 0)
      ? extraStats.lastWpm
      : (prevLast > 0 ? prevLast : undefined);

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

    // Update High Score if eligible
    const currentRecord = highScores[gameMode];
    if (!currentRecord || verifiedWpm > currentRecord.wpm) {
      const newHighScores = {
        ...highScores,
        [gameMode]: {
          username,
          wpm: verifiedWpm,
          score: 0,
          errors,
          timestamp: Date.now(),
        },
      };
      setHighScores(newHighScores);
      localStorage.setItem('fasttyping_highscores', JSON.stringify(newHighScores));
    }

    soundFx.playVictory();
    setGameState('gameover');
  }, [bestWpm, totalGames, currentUserId, highScores, gameMode, username, lastGameWpm, sessionBestWpm]);

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

  const handleBossFinish = (isVictory: boolean, totalDmg: number, errors: number) => {
    setIsBossVictory(isVictory);
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentUserId
          ? { ...p, score: totalDmg, errors, isFinished: true }
          : p
      )
    );

    // Save Boss High Score
    const currentRecord = highScores.san_boss;
    if (!currentRecord || totalDmg > (currentRecord.score || 0)) {
      const updated = {
        ...highScores,
        san_boss: {
          username,
          wpm: 0,
          score: totalDmg,
          errors,
          timestamp: Date.now(),
        },
      };
      setHighScores(updated);
      localStorage.setItem('fasttyping_highscores', JSON.stringify(updated));
    }

    soundFx.playVictory();
    setGameState('gameover');
  };

  // Surrender Handler
  const handleSurrender = () => {
    // Clear last game WPM, but keep sessionBestWpm
    setLastGameWpm(0);
    try {
      sessionStorage.removeItem('fasttyping_last_game_wpm');
    } catch {}

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

  // Chat message send
  const handleSendMessage = (messageText: string, channel: 'global' | 'room') => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      username,
      message: messageText,
      timestamp: Date.now(),
      channel,
    };
    setChatMessages((prev) => [...prev, newMsg]);
  };

  // Name & Avatar Change
  const handleChangeUsername = (newName: string) => {
    setUsername(newName);
    localStorage.setItem('fasttyping_user', newName);
  };

  const handleChangeAvatar = (newAvatar: string) => {
    setAvatar(newAvatar);
    localStorage.setItem('fasttyping_avatar', newAvatar);
  };

  // Admin Actions
  const handleAdminLogin = (pwd: string) => {
    if (pwd === 'admin123') {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const handleClearChat = () => {
    setChatMessages([]);
  };

  const handleResetLeaderboard = () => {
    setHighScores({});
    localStorage.removeItem('fasttyping_highscores');
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
        onlineCount={38}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(soundFx.toggleMute())}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
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
            onAddBot={handleAddBot}
            onRemoveBot={handleRemoveBot}
            onStartGame={() => handleLaunchGame(false)}
            onLeaveWaitingRoom={() => {
              setLastGameWpm(0);
              setSessionBestWpm(0);
              setGameState('lobby');
            }}
            currentUsername={username}
            currentAvatar={avatar}
            onChangeAvatar={handleChangeAvatar}
            onChangeUsername={handleChangeUsername}
            highScores={highScores}
            isAdmin={isAdmin}
          />
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
                onHome={() => {
                  setLastGameWpm(0);
                  setSessionBestWpm(0);
                  setGameState('lobby');
                }}
                modeName={getModeTitle()}
                isOutplay={gameMode === 'outplay'}
                initialCountdown={multiplayerCountdown}
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
                initialCountdown={multiplayerCountdown}
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
            onBackToLobby={() => {
              setLastGameWpm(0);
              setSessionBestWpm(0);
              setGameState('lobby');
            }}
            onBackToWaitingRoom={() => {
              setLastGameWpm(0);
              setSessionBestWpm(0);
              setGameState('waiting_room');
            }}
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
          onSendMessage={handleSendMessage}
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
          onLogout={() => setIsAdmin(false)}
          config={config}
          onUpdateConfig={setConfig}
          onClearChat={handleClearChat}
          onResetLeaderboard={handleResetLeaderboard}
          onClose={() => setIsAdminOpen(false)}
          highScores={highScores}
          onUpdateHighScores={setHighScores}
          currentUsername={username}
          defaultConfig={DEFAULT_CONFIG}
        />
      )}

      {/* Profile Modal */}
      {isProfileOpen && (
        <ProfileModal
          username={username}
          avatar={avatar}
          bestWpm={bestWpm}
          totalGames={totalGames}
          onChangeUsername={handleChangeUsername}
          onChangeAvatar={handleChangeAvatar}
          onClose={() => setIsProfileOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-3 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>FastTyping Challenge v4.0 • Đấu trường gõ phím Tiếng Việt thời gian thực</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Tất cả nút bấm & chế độ hoạt động bình thường
          </span>
        </div>
      </footer>
    </div>
  );
}

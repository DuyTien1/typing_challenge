import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  GameMode,
  DifficultyLevel,
  Player,
  BossState,
  MysteryWordItem,
  GameConfig,
  KeystrokeEvent,
  PerformanceChartPoint,
  NgauHungGameStats,
  MysteryWordGameStats,
  BossBattleStats,
  UserAccount,
  FriendRecord,
  MatchResult,
} from '../types';
import { TypingArena } from './TypingArena';
import { BossArena } from './BossArena';
import { MysteryWordArena } from './MysteryWordArena';
import { NgauHungArena } from './NgauHungArena';
import { OutplayPaceMode } from '../utils/outplayGhost';
import { soundFx } from '../utils/audio';
import {
  sendPlayerProgress,
  updateRoomPlayers,
  submitScoreToLeaderboard,
  markRoomFinished,
} from '../utils/roomManager';
import { announceLinhLungCheer } from '../utils/heavenlyDaoBot';
import { saveLeaderboardToIndexedDB } from '../utils/leaderboardStorage';

export interface MemoizedArenaSectionProps {
  gameMode: GameMode;
  words: string[];
  mysteryWords: MysteryWordItem[];
  bossState: BossState | null;
  config: GameConfig;
  difficulty: DifficultyLevel;
  roomPlayers: Player[];
  currentPlayerId: string;
  playType: 'solo' | 'multiplayer';
  currentRoomId: string | null;
  sectMatchContext: any;
  conditionStats: any;
  lastGameWpm: number;
  sessionBestWpm: number;
  outplayPaceMode: OutplayPaceMode;
  outplayCustomWpm: number;
  friendsList: FriendRecord[];
  currentUser: UserAccount | null;
  username: string;
  avatar: string;
  userFrame: string;
  modeTitle: string;
  onFinishMatch: (
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
  ) => void;
  onSurrender: () => void;
  onAFK?: () => void;
  onRestart: () => void;
  onHome: () => void;
  onUpdateConditionStats?: (conditionKey: string, lastWpm: number, bestWpm: number) => void;
  onUpdateSessionStats?: (lastWpm: number, sessionBestWpm: number) => void;
  onPaceModeChange?: (newPace: OutplayPaceMode) => void;
  onCustomWpmChange?: (newWpm: number) => void;
  onBossDamage: (dmg: number, errors: number, targetPlayerId?: string) => void;
  onBossSelfDestruct: () => void;
  onBossFinish: (isVictory: boolean, stats?: BossBattleStats) => void;
  recordCurrentMatch: (data: {
    modeId: string;
    wpm: number;
    accuracy: number;
    result: MatchResult;
    score?: number;
    isCompleted: boolean;
  }) => void;
  setHighScores: React.Dispatch<React.SetStateAction<any>>;
  setMysteryWordStats: (stats: MysteryWordGameStats) => void;
  setNgauHungStats: (stats: NgauHungGameStats) => void;
  setGameState: (state: any) => void;
}

/**
 * MemoizedArenaSection:
 * Tách biệt và đóng gói các cập nhật trạng thái tần suất cao (keystroke progress, WPM, correct chars,
 * bot simulation) vào trong một sub-component được memoize tối ưu.
 * Ngăn chặn hoàn toàn hiện tượng re-render liên tục của component gốc App.tsx khi người chơi gõ phím,
 * đặc biệt mượt mà và ổn định trong môi trường ảo hóa VDI (Citrix Workspace).
 */
export const MemoizedArenaSection: React.FC<MemoizedArenaSectionProps> = React.memo((props) => {
  const {
    gameMode,
    words,
    mysteryWords,
    bossState,
    config,
    difficulty,
    roomPlayers,
    currentPlayerId,
    playType,
    currentRoomId,
    sectMatchContext,
    conditionStats,
    lastGameWpm,
    sessionBestWpm,
    outplayPaceMode,
    outplayCustomWpm,
    friendsList,
    currentUser,
    username,
    avatar,
    userFrame,
    modeTitle,
    onFinishMatch,
    onSurrender,
    onAFK,
    onRestart,
    onHome,
    onUpdateConditionStats,
    onUpdateSessionStats,
    onPaceModeChange,
    onCustomWpmChange,
    onBossDamage,
    onBossSelfDestruct,
    onBossFinish,
    recordCurrentMatch,
    setHighScores,
    setMysteryWordStats,
    setNgauHungStats,
    setGameState,
  } = props;

  // Local state for high-frequency player progress updates:
  // Isolate keystroke re-renders strictly to this component, preventing root App re-renders!
  const [arenaPlayers, setArenaPlayers] = useState<Player[]>(roomPlayers);
  const arenaPlayersRef = useRef<Player[]>(arenaPlayers);
  arenaPlayersRef.current = arenaPlayers;

  // Synchronize remote room players (from SSE/room sync) into arenaPlayers without overwriting local player's high-frequency keystroke progress
  useEffect(() => {
    setArenaPlayers((prev) => {
      if (!roomPlayers || roomPlayers.length === 0) return prev;
      return roomPlayers.map((remoteP) => {
        if (remoteP.id === currentPlayerId) {
          const localMe = prev.find((p) => p.id === currentPlayerId);
          return {
            ...remoteP,
            progress: Math.max(remoteP.progress || 0, localMe?.progress || 0),
            correctChars: Math.max(remoteP.correctChars || 0, localMe?.correctChars || 0),
            wpm: localMe?.wpm !== undefined ? localMe.wpm : remoteP.wpm,
            errors: localMe?.errors !== undefined ? localMe.errors : remoteP.errors,
          };
        }
        return remoteP;
      });
    });
  }, [roomPlayers, currentPlayerId]);

  // High-frequency progress handler for local typing in arena:
  const handleUpdateProgress = useCallback(
    (progress: number, correctChars: number, errors: number, wpm: number) => {
      // 1. Update local arenaPlayers state immediately for smooth visual racetrack
      setArenaPlayers((prev) =>
        prev.map((p) =>
          p.id === currentPlayerId
            ? { ...p, progress, correctChars, errors, wpm, isFinished: progress >= 100 }
            : p
        )
      );

      // 2. Transmit to multiplayer room via network (throttled at 150ms in sendPlayerProgress)
      if (playType === 'multiplayer' && currentRoomId) {
        sendPlayerProgress(currentRoomId, currentPlayerId, progress, correctChars, errors, wpm, progress >= 100);
      }
    },
    [currentPlayerId, playType, currentRoomId]
  );

  // Simulated bot progress during solo practice race modes (vi_dau, vi_nodau, en, numpad)
  useEffect(() => {
    if (gameMode === 'san_boss' || gameMode === 'doan_chu' || gameMode === 'ngau_hung') return;
    if (playType === 'multiplayer' && currentRoomId) return;

    const botInterval = setInterval(() => {
      setArenaPlayers((prev) =>
        prev.map((p) => {
          if (!p.isBot || p.isFinished || p.isSurrendered) return p;

          const targetWpm = p.botTargetWpm || 60;
          const deltaProgress = (targetWpm / 150) * 0.8;
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
  }, [gameMode, playType, currentRoomId]);

  // Duration computation memoized
  const duration = useMemo(() => {
    if (sectMatchContext?.type === 'sect_tournament') return 180;
    if (gameMode === 'numpad') return config.modeDurations?.numpad || config.numpad.duration;
    if (gameMode === 'outplay') return config.modeDurations?.outplay || 60;
    return config.modeDurations?.[gameMode as keyof typeof config.modeDurations] || config.normalRace.duration;
  }, [sectMatchContext?.type, gameMode, config]);

  const handleDealDamage = useCallback(
    (dmg: number, errors: number, targetPlayerId?: string) => {
      const id = targetPlayerId || currentPlayerId;
      setArenaPlayers((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, score: p.score + dmg, errors: targetPlayerId ? p.errors : errors, correctChars: p.correctChars + dmg }
            : p
        )
      );
      onBossDamage(dmg, errors, targetPlayerId);
    },
    [currentPlayerId, onBossDamage]
  );

  const handleMysteryFinishRound = useCallback(
    (round: number, scoreEarned: number, correct: boolean, targetId?: string) => {
      const id = targetId || currentPlayerId;
      let nextPlayers: Player[] = [];
      setArenaPlayers((prev) => {
        nextPlayers = prev.map((p) =>
          p.id === id ? { ...p, score: p.score + scoreEarned } : p
        );
        arenaPlayersRef.current = nextPlayers;
        return nextPlayers;
      });
      if (playType === 'multiplayer' && currentRoomId && nextPlayers.length > 0) {
        updateRoomPlayers(currentRoomId, nextPlayers);
      }
    },
    [currentPlayerId, playType, currentRoomId]
  );

  const handleMysteryFinishGame = useCallback(
    (stats?: MysteryWordGameStats) => {
      if (stats) {
        setMysteryWordStats(stats);
      }
      let nextPlayers: Player[] = [];
      setArenaPlayers((prev) => {
        nextPlayers = prev.map((p) =>
          p.id === currentPlayerId ? { ...p, isFinished: true, progress: 100 } : p
        );
        arenaPlayersRef.current = nextPlayers;
        return nextPlayers;
      });

      if (playType === 'multiplayer' && currentRoomId) {
        sendPlayerProgress(currentRoomId, currentPlayerId, 100, 0, 0, 0, true);
        updateRoomPlayers(currentRoomId, nextPlayers);
      }

      const currentList = nextPlayers.length > 0 ? nextPlayers : arenaPlayersRef.current;
      const me = currentList.find((p) => p.id === currentPlayerId);
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
          playerId: currentPlayerId,
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

      const rivals = currentList.filter((p) => p.id !== currentPlayerId && !p.isSurrendered);
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
        (p) => p.id !== currentPlayerId && !p.isBot && !p.isSurrendered && !p.isFinished && p.inMatch !== false
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
    },
    [currentPlayerId, playType, currentRoomId, currentUser, username, avatar, userFrame, recordCurrentMatch, setHighScores, setMysteryWordStats, setGameState]
  );

  const handleNgauHungFinishGame = useCallback(
    (stats?: NgauHungGameStats) => {
      if (stats) {
        setNgauHungStats(stats);
      }
      let nextPlayers: Player[] = [];
      setArenaPlayers((prev) => {
        nextPlayers = prev.map((p) =>
          p.id === currentPlayerId ? { ...p, isFinished: true, progress: 100 } : p
        );
        arenaPlayersRef.current = nextPlayers;
        return nextPlayers;
      });

      if (playType === 'multiplayer' && currentRoomId) {
        sendPlayerProgress(currentRoomId, currentPlayerId, 100, 0, 0, 0, true);
        updateRoomPlayers(currentRoomId, nextPlayers);
      }

      const currentList = nextPlayers.length > 0 ? nextPlayers : arenaPlayersRef.current;
      const me = currentList.find((p) => p.id === currentPlayerId);
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
          playerId: currentPlayerId,
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

      const rivals = currentList.filter((p) => p.id !== currentPlayerId && !p.isSurrendered);
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
        (p) => p.id !== currentPlayerId && !p.isBot && !p.isSurrendered && !p.isFinished && p.inMatch !== false
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
    },
    [currentPlayerId, playType, currentRoomId, currentUser, username, avatar, userFrame, recordCurrentMatch, setHighScores, setNgauHungStats, setGameState]
  );

  return (
    <>
      {/* 1. Standard Typing / Numpad / Outplay */}
      {(gameMode === 'vi_dau' ||
        gameMode === 'vi_nodau' ||
        gameMode === 'en' ||
        gameMode === 'numpad' ||
        gameMode === 'outplay') && (
        <TypingArena
          words={words}
          duration={duration}
          players={arenaPlayers}
          currentPlayerId={currentPlayerId}
          onUpdateProgress={handleUpdateProgress}
          onFinish={onFinishMatch}
          onSurrender={onSurrender}
          onAFK={onAFK}
          onRestart={onRestart}
          onHome={onHome}
          modeName={modeTitle}
          isOutplay={gameMode === 'outplay'}
          isMultiplayer={playType === 'multiplayer'}
          isSectTrial={sectMatchContext?.type === 'sect_tournament'}
          conditionStats={conditionStats}
          onUpdateConditionStats={onUpdateConditionStats}
          lastGameWpm={lastGameWpm}
          sessionBestWpm={sessionBestWpm}
          onUpdateSessionStats={onUpdateSessionStats}
          savedPaceMode={outplayPaceMode}
          onPaceModeChange={onPaceModeChange}
          savedCustomWpm={outplayCustomWpm}
          onCustomWpmChange={onCustomWpmChange}
          daoLuPartnerName={friendsList.find((f) => f.isDaoLu)?.username}
          daoLuPartnerId={friendsList.find((f) => f.isDaoLu)?.userId}
        />
      )}

      {/* 2. Săn Boss Battle Arena */}
      {gameMode === 'san_boss' && bossState && (
        <BossArena
          words={words}
          boss={bossState}
          players={arenaPlayers}
          currentPlayerId={currentPlayerId}
          onDealDamage={handleDealDamage}
          onSelfDestruct={onBossSelfDestruct}
          onFinish={onBossFinish}
          onSurrender={onSurrender}
          onAFK={onAFK}
          onRestart={onRestart}
          onHome={onHome}
          isMultiplayer={playType === 'multiplayer'}
        />
      )}

      {/* 3. Đoán Chữ (Mystery Word) Arena */}
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
          players={arenaPlayers}
          currentPlayerId={currentPlayerId}
          onSurrender={onSurrender}
          onRestart={onRestart}
          onHome={onHome}
          isMultiplayer={playType === 'multiplayer'}
          onFinishRound={handleMysteryFinishRound}
          onFinishGame={handleMysteryFinishGame}
        />
      )}

      {/* 4. Ngẫu Hứng (Rush) Arena */}
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
          players={arenaPlayers}
          currentPlayerId={currentPlayerId}
          onSurrender={onSurrender}
          onRestart={onRestart}
          onHome={onHome}
          isMultiplayer={playType === 'multiplayer'}
          onFinishGame={handleNgauHungFinishGame}
          onUpdateScore={(pts, targetId) => {
            const id = targetId || currentPlayerId;
            let nextPlayers: Player[] = [];
            setArenaPlayers((prev) => {
              nextPlayers = prev.map((p) =>
                p.id === id ? { ...p, score: p.score + pts } : p
              );
              arenaPlayersRef.current = nextPlayers;
              return nextPlayers;
            });
            if (playType === 'multiplayer' && currentRoomId && nextPlayers.length > 0) {
              updateRoomPlayers(currentRoomId, nextPlayers);
            }
          }}
        />
      )}
    </>
  );
});

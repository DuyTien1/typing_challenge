import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GameMode,
  DifficultyLevel,
  Player,
  GameState,
  UserAccount,
  ChatMessage,
  MysteryWordItem,
  MatchResult,
} from '../types';
import {
  createNewRoom,
  joinExistingRoom,
  quickJoinOrCreateRoom,
  subscribeToRoom,
  leaveRoom,
  updateRoomPlayers,
  updateRoomDifficulty,
  updateRoomMode,
  transferRoomHost,
  kickRoomPlayer,
  sendPlayerProgress,
  markRoomFinished,
  fetchChatMessages,
  sendPresencePing,
  updatePlayerRoomStatus,
} from '../utils/roomManager';
import { soundFx } from '../utils/audio';
import { checkClientBanStatus } from '../utils/banManager';
import { loadStoredCultivationState } from '../utils/cultivation';

export const BOT_NAMES = [
  { name: 'PhímThần_VN', icon: '⚡', wpm: 75 },
  { name: 'BóngMaTốcĐộ', icon: '🚀', wpm: 90 },
  { name: 'ChiếnBinhGõ', icon: '🥋', wpm: 65 },
  { name: 'TayLướtPhím', icon: '🐯', wpm: 70 },
  { name: 'NinjaCơKhí', icon: '🐱', wpm: 80 },
  { name: 'ThợGõSiêuCấp', icon: '🦊', wpm: 85 },
  { name: 'CơnLốcChữ', icon: '🌪️', wpm: 95 },
  { name: 'HuyềnThoạiPhím', icon: '👑', wpm: 105 },
  { name: 'TiểuĐệGõNhanh', icon: '🐥', wpm: 60 },
  { name: 'ĐạiSưHuynh', icon: '🐉', wpm: 100 },
  { name: 'BạchHổTiênTử', icon: '🐅', wpm: 88 },
  { name: 'PhượngHoàngLửa', icon: '🔥', wpm: 92 },
  { name: 'KiếmTiênGõChữ', icon: '⚔️', wpm: 82 },
  { name: 'VôSongChíTôn', icon: '✨', wpm: 110 },
  { name: 'LinhĐanDượcSư', icon: '🌿', wpm: 72 },
];

export interface UseRoomEngineProps {
  currentUserId: string;
  currentUser: UserAccount | null;
  username: string;
  avatar: string;
  userFrame: string;
  bestWpm: number;
  bestWpmRecord: any;
  totalGames: number;
  isAdmin: boolean;
  deviceId: string;
  currentTabId: string;
  gameState: GameState;
  gameMode: GameMode;
  difficulty: DifficultyLevel;
  createMePlayer: () => Player;
  onGameStateChange: (state: GameState) => void;
  onGameModeChange: (mode: GameMode) => void;
  onDifficultyChange: (diff: DifficultyLevel) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onRecordMatch: (data: {
    modeId: string;
    wpm: number;
    accuracy: number;
    result: MatchResult;
    score?: number;
    isCompleted: boolean;
  }) => void;
  onLaunchGame: (
    isSoloOverride?: boolean,
    modeOverride?: GameMode,
    sharedWords?: string[],
    sharedMysteryWords?: MysteryWordItem[],
    matchIdOverride?: string
  ) => void;
  onBossVictoryChange?: (isVictory: boolean) => void;
  onFriendEvent?: (event: any) => void;
}

export function useRoomEngine({
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
  onGameStateChange,
  onGameModeChange,
  onDifficultyChange,
  onChatMessage,
  onRecordMatch,
  onLaunchGame,
  onBossVictoryChange,
  onFriendEvent,
}: UseRoomEngineProps) {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('fasttyping_current_room_id') || null;
  });
  const [isRoomHost, setIsRoomHost] = useState(true);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [targetJoinMode, setTargetJoinMode] = useState<GameMode>('vi_dau');
  const [kickedNotice, setKickedNotice] = useState<string | null>(null);

  // Sync active room ID to sessionStorage for F5 reload persistence
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentRoomId) {
      sessionStorage.setItem('fasttyping_current_room_id', currentRoomId);
    } else {
      sessionStorage.removeItem('fasttyping_current_room_id');
    }
  }, [currentRoomId]);

  // Initial players list
  const [players, setPlayers] = useState<Player[]>(() => [createMePlayer()]);

  const playersRef = useRef<Player[]>(players);
  playersRef.current = players;

  const currentRoomIdRef = useRef<string | null>(currentRoomId);
  currentRoomIdRef.current = currentRoomId;

  const currentMatchIdRef = useRef<string | null>(null);
  const gameModeRef = useRef<GameMode>(gameMode);
  gameModeRef.current = gameMode;

  const difficultyRef = useRef<DifficultyLevel>(difficulty);
  difficultyRef.current = difficulty;

  // Bot Guard Refs: Bảo vệ trạng thái Bot trong môi trường Citrix Workspace và mạng có proxy trễ
  const recentBotsRef = useRef<Map<string, { bot: Player; addedAt: number }>>(new Map());
  const recentlyRemovedBotIdsRef = useRef<Map<string, number>>(new Map());
  const lastKnownRoomVersionRef = useRef<number>(0);

  // Auto dismiss kicked notification after 7 seconds
  useEffect(() => {
    if (!kickedNotice) return;
    const timer = setTimeout(() => {
      setKickedNotice(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [kickedNotice]);

  // Keep player's own profile updated in the players list
  useEffect(() => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentUserId
          ? {
              ...p,
              username,
              icon: avatar,
              frame: userFrame,
              bestWpm,
              bestWpmRecord: bestWpmRecord || undefined,
              totalGames,
            }
          : p
      )
    );
  }, [username, avatar, userFrame, bestWpm, bestWpmRecord, totalGames, currentUserId]);

  // Presence metadata synchronization
  const metaRef = useRef({
    userId: currentUser?.id || currentUserId,
    username,
    avatar,
    frame: userFrame,
    bestWpm,
    bestWpmRecord: bestWpmRecord || undefined,
    totalGames,
    currentRoomId,
    currentMode: gameMode,
    status: (gameState === 'lobby'
      ? 'lobby'
      : gameState === 'waiting_room'
      ? 'waiting_room'
      : gameMode === 'outplay'
      ? 'outplay'
      : 'playing') as 'lobby' | 'waiting_room' | 'playing' | 'outplay' | 'gameover',
    isAdmin,
    deviceId,
  });

  useEffect(() => {
    const newStatus = (gameState === 'lobby'
      ? 'lobby'
      : gameState === 'waiting_room'
      ? 'waiting_room'
      : gameMode === 'outplay'
      ? 'outplay'
      : 'playing') as 'lobby' | 'waiting_room' | 'playing' | 'outplay' | 'gameover';

    const currentCult = loadStoredCultivationState();
    metaRef.current = {
      userId: currentUser?.id || currentUserId,
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
      cultivationLevel: currentCult?.level || 1,
      realmIndex: currentCult?.realmIndex || 0,
      realmName: currentCult?.realmName || 'Luyện Khí Kỳ',
    };
    sendPresencePing(currentTabId, currentUser?.id || currentUserId, metaRef.current);
  }, [
    username,
    avatar,
    userFrame,
    bestWpm,
    bestWpmRecord,
    totalGames,
    currentRoomId,
    gameMode,
    gameState,
    isAdmin,
    currentTabId,
    currentUserId,
    currentUser,
    deviceId,
  ]);

  // Realtime cross-device & cross-tab synchronization for Rooms
  useEffect(() => {
    if (
      (gameState !== 'waiting_room' && gameState !== 'playing' && gameState !== 'gameover') ||
      !currentRoomId
    ) {
      return;
    }

    // Fetch previous room messages
    fetchChatMessages('room', currentRoomId).then((msgs) => {
      msgs.forEach((m) => onChatMessage(m));
    });

    const unsubscribe = subscribeToRoom(
      currentRoomId,
      (updatedRoom) => {
        if (!updatedRoom) {
          // Room was closed or all players left
          if (gameState === 'waiting_room' || gameState === 'gameover') {
            setCurrentRoomId(null);
            onGameStateChange('lobby');
          }
          return;
        }

        if (gameState === 'waiting_room' || gameState === 'gameover') {
          // Check if player was kicked
          const meInRoom = updatedRoom.players?.find(
            (p) => p.id === currentUserId || (currentUser?.id && p.id === currentUser.id) || p.username === username
          );
          if (gameState === 'waiting_room' && !meInRoom) {
            soundFx.playError();
            setCurrentRoomId(null);
            onGameStateChange('lobby');
            const banCheck = checkClientBanStatus();
            if (!banCheck.isBanned) {
              setKickedNotice('Bạn đã bị chủ phòng mời ra khỏi phòng.');
            }
            return;
          }

          // 1. Kiểm tra phiên bản phòng (out-of-order packet protection trong Citrix Workspace)
          const roomVersion = updatedRoom.version || 0;
          if (roomVersion > 0 && lastKnownRoomVersionRef.current > roomVersion) {
            // Nhận được gói tin phòng cũ hơn gói tin hiện tại -> Bỏ qua để chống giật
            return;
          }
          if (roomVersion > 0) {
            lastKnownRoomVersionRef.current = roomVersion;
          }

          // 2. Dọn dẹp cache Bot Guard quá 6000ms
          const now = Date.now();
          for (const [id, meta] of recentBotsRef.current.entries()) {
            if (now - meta.addedAt > 6000) {
              recentBotsRef.current.delete(id);
            }
          }
          for (const [id, removedAt] of recentlyRemovedBotIdsRef.current.entries()) {
            if (now - removedAt > 6000) {
              recentlyRemovedBotIdsRef.current.delete(id);
            }
          }

          // 3. Xây dựng danh sách người chơi an toàn (Guarded Players):
          let incomingPlayers = [...(updatedRoom.players || [])];

          // Lọc bỏ bot nếu người dùng vừa mới bấm xóa bot đó trong vòng 6s (chống server trả kết quả cũ khôi phục lại bot)
          incomingPlayers = incomingPlayers.filter((p) => {
            if (p.isBot && recentlyRemovedBotIdsRef.current.has(p.id)) {
              return false;
            }
            return true;
          });

          // Giữ lại bot nếu người dùng vừa mới bấm thêm bot đó trong vòng 6s nhưng server/polling chưa kịp ghi nhận
          const existingBotIds = new Set(incomingPlayers.map((p) => p.id));
          const existingBotNames = new Set(incomingPlayers.map((p) => p.username.toLowerCase()));
          for (const [bId, { bot }] of recentBotsRef.current.entries()) {
            if (existingBotIds.has(bId) || existingBotNames.has(bot.username.toLowerCase())) {
              // Server đã ghi nhận bot này thành công
              recentBotsRef.current.delete(bId);
            } else if (incomingPlayers.length < (updatedRoom.maxSlots || 8)) {
              // Server hoặc polling cũ chưa có bot -> Giữ nguyên bot, chống giật biến mất
              incomingPlayers.push(bot);
              existingBotIds.add(bId);
              existingBotNames.add(bot.username.toLowerCase());
            }
          }

          setPlayers((currentPlayers) => {
            if (
              currentPlayers.length === incomingPlayers.length &&
              currentPlayers.every((cp, i) => {
                const up = incomingPlayers[i];
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
                  cp.isSurrendered === up.isSurrendered &&
                  cp.isAFK === up.isAFK
                );
              })
            ) {
              return currentPlayers;
            }
            playersRef.current = incomingPlayers;
            return incomingPlayers;
          });

          setIsRoomHost(
            updatedRoom.hostId === currentUserId ||
            (currentUser?.id && updatedRoom.hostId === currentUser.id) ||
            updatedRoom.hostName === username
          );
          if (updatedRoom.mode && updatedRoom.mode !== gameModeRef.current) {
            onGameModeChange(updatedRoom.mode);
            gameModeRef.current = updatedRoom.mode;
          }
          if (updatedRoom.difficulty && updatedRoom.difficulty !== difficultyRef.current) {
            onDifficultyChange(updatedRoom.difficulty);
            difficultyRef.current = updatedRoom.difficulty;
          }

          // Check if new match launched
          const isNewMatch = Boolean(
            updatedRoom.matchId && updatedRoom.matchId !== currentMatchIdRef.current
          );

          if (
            gameState === 'waiting_room' &&
            updatedRoom.status === 'playing' &&
            isNewMatch &&
            meInRoom?.inMatch
          ) {
            currentMatchIdRef.current = updatedRoom.matchId || null;
            onLaunchGame(
              false,
              updatedRoom.mode,
              updatedRoom.words,
              updatedRoom.mysteryWords,
              updatedRoom.matchId
            );
          }
        } else if (gameState === 'playing') {
          // Room finished:
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
                    isAFK: me?.isAFK ?? remoteP.isAFK,
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

            if (gameMode === 'san_boss' && onBossVictoryChange) {
              onBossVictoryChange(false);
            }

            const meInUpdated = updatedRoom.players.find((p) => p.id === currentUserId);
            const isSurr = meInUpdated?.isSurrendered || false;
            const isAfkPlayer = (gameMode === 'ngau_hung' || gameMode === 'doan_chu') ? false : (meInUpdated?.isAFK || false);
            const isFinishedMatch = !!meInUpdated?.isFinished && !isSurr && !isAfkPlayer;
            const rivals = updatedRoom.players.filter(
              (p) => p.id !== currentUserId && !p.isSurrendered && !((gameMode === 'ngau_hung' || gameMode === 'doan_chu') ? false : p.isAFK)
            );
            const isTop = rivals.every((r) => (r.wpm || 0) <= (meInUpdated?.wpm || 0));
            const result: MatchResult = isAfkPlayer ? 'AFK' : isSurr ? 'Đầu hàng' : isTop ? 'Thắng' : 'Thua';

            onRecordMatch({
              modeId: gameMode,
              wpm: meInUpdated?.wpm || 0,
              accuracy: meInUpdated?.accuracy ?? 100,
              result,
              score: meInUpdated?.score,
              isCompleted: isFinishedMatch,
            });

            if (result === 'Thắng' && isFinishedMatch) {
              soundFx.playVictory();
            } else if (isSurr || isAfkPlayer) {
              soundFx.playError();
            }
            onGameStateChange('gameover');
            return;
          }

          // Live progress synchronization
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
                  isAFK: me?.isAFK ?? remoteP.isAFK,
                  score: me?.score ?? remoteP.score,
                  chartData: me?.chartData ?? remoteP.chartData,
                  ghostDiff: me?.ghostDiff ?? remoteP.ghostDiff,
                  lastWpm: me?.lastWpm ?? remoteP.lastWpm,
                  sessionBestWpm: me?.sessionBestWpm ?? remoteP.sessionBestWpm,
                };
              }
              return remoteP;
            });

            const activeHumanPlayers = synced.filter(
              (p) => !p.isBot && !p.isSurrendered && !p.isFinished && p.inMatch !== false && !((gameMode === 'ngau_hung' || gameMode === 'doan_chu') ? false : p.isAFK)
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
            if (gameMode === 'san_boss' && onBossVictoryChange) {
              onBossVictoryChange(false);
            }
            soundFx.playVictory();
            onGameStateChange('gameover');
          }
        }
      },
      (roomMsg) => {
        onChatMessage(roomMsg);
      },
      (kickedPlayerId, kickedUsername) => {
        if (kickedPlayerId === currentUserId) {
          soundFx.playError();
          setCurrentRoomId(null);
          onGameStateChange('lobby');
          const banCheck = checkClientBanStatus();
          if (!banCheck.isBanned) {
            setKickedNotice('Bạn đã bị chủ phòng mời ra khỏi phòng.');
          }
        } else {
          setKickedNotice(
            `${kickedUsername || 'Một người chơi'} đã bị chủ phòng mời rời khỏi phòng.`
          );
        }
      },
      currentUser?.id || currentUserId,
      currentUser?.username || username,
      currentTabId,
      (friendEv) => {
        if (onFriendEvent) onFriendEvent(friendEv);
        if (friendEv.type === 'friend_request_accepted' || friendEv.type === 'friends_data_updated') {
          // Optimistically update isFriend on matching room players
          setPlayers((prev) =>
            prev.map((p) => {
              const matchesTarget =
                (friendEv.targetUserId && (p.userId === friendEv.targetUserId || p.id === friendEv.targetUserId)) ||
                (friendEv.fromUserId && (p.userId === friendEv.fromUserId || p.id === friendEv.fromUserId)) ||
                (friendEv.friendName && p.username?.toLowerCase() === String(friendEv.friendName).toLowerCase());
              if (matchesTarget) {
                return { ...p, isFriend: true };
              }
              return p;
            })
          );
        }
      }
    );

    return () => unsubscribe();
  }, [
    gameState,
    currentRoomId,
    currentUserId,
    currentUser,
    username,
    currentTabId,
    gameMode,
    onChatMessage,
    onGameStateChange,
    onGameModeChange,
    onDifficultyChange,
    onLaunchGame,
    onRecordMatch,
    onBossVictoryChange,
    onFriendEvent,
  ]);

  // Real-time synchronization of player friend badges across all windows/events
  useEffect(() => {
    const handleFriendSync = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      if (detail.type === 'friend_request_accepted') {
        const friendId = detail.targetUserId || detail.fromUserId;
        const friendName = detail.friendName ? String(detail.friendName).toLowerCase() : '';
        setPlayers((prev) =>
          prev.map((p) => {
            if (
              (friendId && (p.userId === friendId || p.id === friendId)) ||
              (friendName && p.username?.toLowerCase() === friendName)
            ) {
              return { ...p, isFriend: true };
            }
            return p;
          })
        );
      }
    };

    window.addEventListener('friend_request_accepted', handleFriendSync);
    window.addEventListener('friends_data_updated', handleFriendSync);
    return () => {
      window.removeEventListener('friend_request_accepted', handleFriendSync);
      window.removeEventListener('friends_data_updated', handleFriendSync);
    };
  }, []);

  // Note: Tab reload (F5) preserves room session; explicit leaveRoom is only invoked on manual exit
  useEffect(() => {
    // Keep empty to avoid leaving room on refresh
  }, [currentRoomId, currentUserId]);

  // Room Actions
  const handleCreateRoom = useCallback(
    async (mode: GameMode, roomDifficulty: DifficultyLevel) => {
      const me = createMePlayer();
      const newRoom = await createNewRoom(mode, me, false, roomDifficulty);
      setCurrentRoomId(newRoom.id);
      setIsRoomHost(true);
      setPlayers([me]);
      return newRoom;
    },
    [createMePlayer]
  );

  const handleJoinExistingRoom = useCallback(
    async (code: string, mode: GameMode) => {
      const me = createMePlayer();
      const result = await joinExistingRoom(code, me, mode);
      if (!result.success || !result.room) {
        return {
          success: false,
          error: result.error || 'Phòng không tồn tại hoặc không thể tham gia.',
        };
      }
      setCurrentRoomId(result.room.id);
      setIsRoomHost(Boolean(result.isHost));
      setPlayers(result.room.players);
      return { success: true, room: result.room };
    },
    [createMePlayer]
  );

  const handleQuickJoinRoom = useCallback(
    async (mode: GameMode, roomDifficulty: DifficultyLevel) => {
      const me = createMePlayer();
      const result = await quickJoinOrCreateRoom(mode, me, roomDifficulty);
      setCurrentRoomId(result.room.id);
      setIsRoomHost(Boolean(result.isHost));
      setPlayers(result.room.players);
      return result;
    },
    [createMePlayer]
  );

  const handleLeaveRoom = useCallback(async () => {
    if (currentRoomIdRef.current) {
      await leaveRoom(currentRoomIdRef.current, currentUserId);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('fasttyping_current_room_id');
        sessionStorage.removeItem('fasttyping_game_state');
      }
      setCurrentRoomId(null);
    }
    const me = createMePlayer();
    setPlayers([me]);
    setIsRoomHost(true);
    onGameStateChange('lobby');
  }, [currentUserId, createMePlayer, onGameStateChange]);

  const handleAddBot = useCallback(() => {
    if (gameMode === 'ngau_hung' || gameMode === 'doan_chu' || gameMode === 'san_boss') return;
    if (playersRef.current.length >= 8) return;

    const existingNames = new Set(
      playersRef.current.map((p) => String(p.username || '').toLowerCase())
    );
    const existingIcons = new Set(playersRef.current.map((p) => p.icon));

    let availableTemplates = BOT_NAMES.filter(
      (b) =>
        !existingNames.has(String(b.name || '').toLowerCase()) && !existingIcons.has(b.icon)
    );

    if (availableTemplates.length === 0) {
      availableTemplates = BOT_NAMES.filter(
        (b) => !existingNames.has(String(b.name || '').toLowerCase())
      );
    }

    const botTemplate =
      availableTemplates.length > 0
        ? availableTemplates[Math.floor(Math.random() * availableTemplates.length)]
        : BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];

    let botUsername = botTemplate.name;
    let counter = 2;
    while (existingNames.has(botUsername.toLowerCase())) {
      botUsername = `${botTemplate.name}_${counter}`;
      counter++;
    }

    const allFrames = ['default', 'flame', 'lightning', 'cosmic', 'matrix', 'arcane', 'dragon'];
    const existingFrames = new Set(playersRef.current.map((p) => p.frame).filter(Boolean));
    const availableFrames = allFrames.filter((f) => !existingFrames.has(f));
    const chosenFrame =
      availableFrames.length > 0
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
    recentBotsRef.current.set(newBot.id, { bot: newBot, addedAt: Date.now() });
    recentlyRemovedBotIdsRef.current.delete(newBot.id);

    const updated = [...playersRef.current, newBot];
    setPlayers(updated);
    playersRef.current = updated;
    if (currentRoomIdRef.current) {
      updateRoomPlayers(currentRoomIdRef.current, updated).then((res) => {
        if (res && res.success && res.room) {
          recentBotsRef.current.delete(newBot.id);
        }
      });
    }
  }, [gameMode]);

  const handleRemoveBot = useCallback(() => {
    const lastBotIdx = [...playersRef.current].reverse().findIndex((p) => p.isBot);
    if (lastBotIdx === -1) return;
    const actualIdx = playersRef.current.length - 1 - lastBotIdx;
    const botToRemove = playersRef.current[actualIdx];

    recentBotsRef.current.delete(botToRemove.id);
    recentlyRemovedBotIdsRef.current.set(botToRemove.id, Date.now());

    const updated = playersRef.current.filter((_, i) => i !== actualIdx);
    soundFx.playKeyClick();
    setPlayers(updated);
    playersRef.current = updated;
    if (currentRoomIdRef.current) {
      updateRoomPlayers(currentRoomIdRef.current, updated).then((res) => {
        if (res && res.success && res.room) {
          recentlyRemovedBotIdsRef.current.delete(botToRemove.id);
        }
      });
    }
  }, []);

  const handleTransferHost = useCallback(
    async (targetPlayerId: string) => {
      if (!currentRoomIdRef.current || !isRoomHost) return;
      const targetIdx = playersRef.current.findIndex((p) => p.id === targetPlayerId);
      const hostIdx = playersRef.current.findIndex((p) => p.id === currentUserId);
      if (targetIdx === -1) return;

      const targetPlayer = playersRef.current[targetIdx];
      if (targetPlayer.isBot) return;

      const updated = [...playersRef.current];
      const effectiveHostIdx = hostIdx !== -1 ? hostIdx : 0;
      const oldHostPlayer = updated[effectiveHostIdx];
      updated[0] = targetPlayer;
      updated[targetIdx] = oldHostPlayer;
      setPlayers(updated);
      setIsRoomHost(false);

      soundFx.playKeyClick();
      await transferRoomHost(currentRoomIdRef.current, targetPlayerId, currentUserId);
    },
    [currentUserId, isRoomHost]
  );

  const handleKickPlayer = useCallback(
    async (targetPlayerId: string) => {
      if (!currentRoomIdRef.current || !isRoomHost) return;
      const targetPlayer = playersRef.current.find((p) => p.id === targetPlayerId);
      if (!targetPlayer) return;

      if (targetPlayer.isBot) {
        recentBotsRef.current.delete(targetPlayerId);
        recentlyRemovedBotIdsRef.current.set(targetPlayerId, Date.now());
      }

      const updated = playersRef.current.filter((p) => p.id !== targetPlayerId);
      setPlayers(updated);
      playersRef.current = updated;

      soundFx.playError();
      await kickRoomPlayer(currentRoomIdRef.current, targetPlayerId, currentUserId);
    },
    [currentUserId, isRoomHost]
  );

  const sendProgress = useCallback(
    (
      progress: number,
      correctChars: number,
      errors: number,
      wpm: number,
      isFinished: boolean = false
    ) => {
      if (currentRoomIdRef.current) {
        sendPlayerProgress(
          currentRoomIdRef.current,
          currentUserId,
          progress,
          correctChars,
          errors,
          wpm,
          isFinished
        );
      }
    },
    [currentUserId]
  );

  const updatePlayers = useCallback((nextPlayers: Player[]) => {
    setPlayers(nextPlayers);
    playersRef.current = nextPlayers;
    if (currentRoomIdRef.current) {
      updateRoomPlayers(currentRoomIdRef.current, nextPlayers).catch(() => {});
    }
  }, []);

  return {
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
    handleCreateRoom,
    handleJoinExistingRoom,
    handleQuickJoinRoom,
    handleLeaveRoom,
    handleAddBot,
    handleRemoveBot,
    handleTransferHost,
    handleKickPlayer,
    sendProgress,
    updatePlayers,
  };
}

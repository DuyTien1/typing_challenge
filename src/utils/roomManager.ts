import { GameMode, GameRoom, Player, DifficultyLevel, MysteryWordItem, ChatMessage, HighScoreRecord, OnlineUserDetail } from '../types';

export interface PresenceUserMeta {
  username?: string;
  avatar?: string;
  frame?: string;
  bestWpm?: number;
  totalGames?: number;
  currentRoomId?: string | null;
  currentMode?: string | null;
  status?: 'lobby' | 'waiting_room' | 'playing' | 'outplay' | 'gameover';
  isAdmin?: boolean;
}

const ROOMS_STORAGE_KEY = 'fasttyping_game_rooms_v4';
const ROOM_CHANNEL_NAME = 'fasttyping_room_sync_v4';
const CHAT_CHANNEL_NAME = 'fasttyping_chat_sync_v4';

/**
 * Chuẩn hóa mã phòng linh hoạt và thông minh:
 * Hỗ trợ tất cả định dạng:
 * - "#VN-5111" -> "VN-5111"
 * - "VN-5111" -> "VN-5111"
 * - "vn-5111" -> "VN-5111"
 * - "VN5111" -> "VN-5111"
 * - "#5111" -> "VN-5111"
 * - "5111" -> "VN-5111"
 * - "Mã: #VN-5111" -> "VN-5111"
 * - "Phòng #VN-5111" -> "VN-5111"
 */
export function normalizeRoomCode(input: string): string {
  if (!input) return '';
  let cleaned = input.trim().toUpperCase();

  // Loại bỏ các tiền tố thường gặp: "MÃ PHÒNG:", "MÃ:", "MA:", "PHÒNG:", "PHONG:", "ROOM:", "CODE:"
  cleaned = cleaned.replace(/^(MÃ\s*PHÒNG|MA\s*PHONG|PHÒNG|PHONG|ROOM|CODE|MÃ|MA)[:\s]*/i, '').trim();

  // Loại bỏ tất cả ký tự '#' ở đầu hoặc trong chuỗi
  cleaned = cleaned.replace(/^#+/, '').trim();
  cleaned = cleaned.replace(/#/g, '').trim();

  if (!cleaned) return '';

  // Khớp định dạng VN kèm số: "VN-5111", "VN_5111", "VN 5111", "VN5111"
  const matchVn = cleaned.match(/^VN[-_\s]*(\d+)/i);
  if (matchVn) {
    return `VN-${matchVn[1]}`;
  }

  // Khớp chuỗi thuần số: "5111" -> "VN-5111"
  const matchDigits = cleaned.match(/^(\d+)$/);
  if (matchDigits) {
    return `VN-${matchDigits[1]}`;
  }

  // Nếu đã có tiền tố VN-
  if (cleaned.startsWith('VN-')) {
    return cleaned;
  }

  // Nếu bắt đầu bằng VN nhưng không có gạch nối
  if (cleaned.startsWith('VN')) {
    const rest = cleaned.slice(2).replace(/^[-_\s]+/, '');
    return `VN-${rest}`;
  }

  return `VN-${cleaned}`;
}

// Tên hiển thị thân thiện cho từng chế độ chơi
export function getModeDisplayName(mode: GameMode): string {
  switch (mode) {
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
      return 'Săn Boss (Raid)';
    case 'outplay':
      return 'Outplay Yourself (Solo)';
    default:
      return mode;
  }
}

// Kênh BroadcastChannel đồng bộ thời gian thực giữa các tab/cửa sổ cùng trình duyệt
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(ROOM_CHANNEL_NAME);
  }
} catch {
  // Fallback nếu không hỗ trợ
}

export type RoomEvent =
  | { type: 'room_updated'; room: GameRoom }
  | { type: 'room_started'; roomId: string; mode: GameMode; words?: string[]; mysteryWords?: MysteryWordItem[]; room?: GameRoom }
  | { type: 'room_closed'; roomId: string }
  | { type: 'player_progress'; roomId: string; playerId: string; progress: number; correctChars: number; errors: number; wpm: number; isFinished: boolean; players?: Player[] };

const subscribers: Array<(event: RoomEvent) => void> = [];

if (broadcastChannel) {
  broadcastChannel.onmessage = (e) => {
    if (e.data && e.data.type) {
      subscribers.forEach((cb) => {
        try {
          cb(e.data);
        } catch (err) {
          console.error('Room subscriber error:', err);
        }
      });
    }
  };
}

function broadcastLocalEvent(event: RoomEvent) {
  subscribers.forEach((cb) => {
    try {
      cb(event);
    } catch {
      // Ignore
    }
  });
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(event);
    } catch {
      // Ignore
    }
  }
}

export function subscribeToRooms(callback: (event: RoomEvent) => void): () => void {
  subscribers.push(callback);
  return () => {
    const idx = subscribers.indexOf(callback);
    if (idx !== -1) subscribers.splice(idx, 1);
  };
}

/**
 * 1. Tạo phòng mới hoàn toàn thông qua Server API:
 */
export async function createNewRoom(
  mode: GameMode,
  host: Player,
  isQuickRoom = false,
  difficulty?: DifficultyLevel
): Promise<GameRoom> {
  try {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, host, isQuickRoom, difficulty }),
    });
    const data = await res.json();
    if (data.success && data.room) {
      broadcastLocalEvent({ type: 'room_updated', room: data.room });
      return data.room;
    }
  } catch (err) {
    console.error('createNewRoom server error:', err);
  }

  // Local fallback nếu server tạm thời bận
  const code = `VN-${Math.floor(1000 + Math.random() * 9000)}`;
  const fallbackRoom: GameRoom = {
    id: code,
    mode,
    hostId: host.id,
    hostName: host.username,
    isQuickRoom,
    status: 'waiting',
    createdAt: Date.now(),
    lastActive: Date.now(),
    players: [{ ...host, isBot: false, progress: 0, wpm: 0, score: 0, errors: 0, correctChars: 0, isFinished: false, isSurrendered: false, isAFK: false }],
    difficulty,
    maxSlots: 8,
  };
  broadcastLocalEvent({ type: 'room_updated', room: fallbackRoom });
  return fallbackRoom;
}

/**
 * 2. Kiểm tra và Vào phòng đã có bằng mã qua Server API:
 */
export async function joinExistingRoom(
  rawCode: string,
  player: Player,
  currentMode: GameMode
): Promise<{
  success: boolean;
  room?: GameRoom;
  error?: string;
  isHost?: boolean;
}> {
  const normCode = normalizeRoomCode(rawCode);
  if (!normCode) {
    return {
      success: false,
      error: 'Vui lòng nhập mã phòng hợp lệ (VD: VN-5111 hoặc 5111).',
    };
  }

  try {
    const res = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawCode: normCode, player, currentMode }),
    });
    const data = await res.json();
    if (data.success && data.room) {
      broadcastLocalEvent({ type: 'room_updated', room: data.room });
      return {
        success: true,
        room: data.room,
        isHost: Boolean(data.isHost),
      };
    } else {
      return {
        success: false,
        error: data.error || 'Không thể tham gia phòng.',
      };
    }
  } catch (err) {
    console.error('joinExistingRoom server error:', err);
    return {
      success: false,
      error: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng!',
    };
  }
}

/**
 * 3. Vào phòng nhanh (Quick Match) qua Server API:
 */
export async function quickJoinOrCreateRoom(
  mode: GameMode,
  player: Player,
  difficulty?: DifficultyLevel
): Promise<{
  room: GameRoom;
  isHost: boolean;
  isNewlyCreated: boolean;
}> {
  try {
    const res = await fetch('/api/rooms/quick-join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, player, difficulty }),
    });
    const data = await res.json();
    if (data.success && data.room) {
      broadcastLocalEvent({ type: 'room_updated', room: data.room });
      return {
        room: data.room,
        isHost: Boolean(data.isHost),
        isNewlyCreated: Boolean(data.isNewlyCreated),
      };
    }
  } catch (err) {
    console.error('quickJoinOrCreateRoom server error:', err);
  }

  // Fallback
  const fallback = await createNewRoom(mode, player, true, difficulty);
  return {
    room: fallback,
    isHost: true,
    isNewlyCreated: true,
  };
}

// Cập nhật danh sách người chơi trong phòng (khi thêm / bớt bot)
export async function updateRoomPlayers(roomId: string, players: Player[]): Promise<void> {
  const normId = normalizeRoomCode(roomId);
  try {
    await fetch(`/api/rooms/${encodeURIComponent(normId)}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players }),
    });
  } catch (err) {
    console.error('updateRoomPlayers error:', err);
  }
}

// Cập nhật cấu hình độ khó phòng thi đấu (Chủ phòng)
export async function updateRoomDifficulty(roomId: string, difficulty: DifficultyLevel): Promise<void> {
  const normId = normalizeRoomCode(roomId);
  try {
    await fetch(`/api/rooms/${encodeURIComponent(normId)}/difficulty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ difficulty }),
    });
  } catch (err) {
    console.error('updateRoomDifficulty error:', err);
  }
}

// Bắt đầu trận đấu (Chủ phòng kích hoạt, đồng bộ danh sách từ thi đấu và mã phiên đấu)
export async function markRoomPlaying(
  roomId: string,
  mode?: GameMode,
  words?: string[],
  mysteryWords?: MysteryWordItem[],
  matchId?: string,
  difficulty?: DifficultyLevel
): Promise<void> {
  const normId = normalizeRoomCode(roomId);
  try {
    await fetch(`/api/rooms/${encodeURIComponent(normId)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'playing', mode, words, mysteryWords, matchId, difficulty }),
    });
  } catch (err) {
    console.error('markRoomPlaying error:', err);
  }
}

// Chuyển phòng về trạng thái chờ (khi kết thúc ván và quay lại phòng chờ)
export async function markRoomWaiting(roomId: string): Promise<void> {
  const normId = normalizeRoomCode(roomId);
  try {
    await fetch(`/api/rooms/${encodeURIComponent(normId)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'waiting' }),
    });
  } catch (err) {
    console.error('markRoomWaiting error:', err);
  }
}

// Chuyển phòng về trạng thái kết thúc (khi người chơi cuối cùng đầu hàng hoặc out)
export async function markRoomFinished(roomId: string): Promise<void> {
  const normId = normalizeRoomCode(roomId);
  try {
    await fetch(`/api/rooms/${encodeURIComponent(normId)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'finished' }),
    });
  } catch (err) {
    console.error('markRoomFinished error:', err);
  }
}

// Cập nhật trạng thái cụ thể của người chơi trong phòng (inMatch: false khi về phòng chờ, isSurrendered, ...)
export async function updatePlayerRoomStatus(
  roomId: string,
  playerId: string,
  updates: { inMatch?: boolean; isSurrendered?: boolean; isFinished?: boolean }
): Promise<void> {
  const normId = normalizeRoomCode(roomId);
  try {
    await fetch(`/api/rooms/${encodeURIComponent(normId)}/player-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        ...updates,
      }),
    });
  } catch (err) {
    console.error('updatePlayerRoomStatus error:', err);
  }
}

// Đồng bộ tiến độ gõ của người chơi trong trận đấu
const lastProgressSentTimeMap = new Map<string, number>();
export function sendPlayerProgress(
  roomId: string,
  playerId: string,
  progress: number,
  correctChars: number,
  errors: number,
  wpm: number,
  force = false
): void {
  const now = Date.now();
  const lastTime = lastProgressSentTimeMap.get(playerId) || 0;
  // Throttle 150ms trừ khi hoàn thành
  if (!force && now - lastTime < 150) return;
  lastProgressSentTimeMap.set(playerId, now);

  const normId = normalizeRoomCode(roomId);
  fetch(`/api/rooms/${encodeURIComponent(normId)}/player-progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId,
      progress,
      correctChars,
      errors,
      wpm,
      isFinished: progress >= 100,
    }),
  }).catch(() => {});
}

// Chuyển quyền chủ phòng và đổi slot
export async function transferRoomHost(
  roomId: string,
  targetPlayerId: string,
  requesterId: string
): Promise<{ success: boolean; room?: GameRoom; error?: string }> {
  const normId = normalizeRoomCode(roomId);
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(normId)}/transfer-host`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPlayerId, requesterId }),
    });
    return await res.json();
  } catch (err) {
    console.error('transferRoomHost error:', err);
    return { success: false, error: 'Lỗi mạng khi chuyển quyền chủ phòng' };
  }
}

// Đá người chơi hoặc bot khỏi phòng
export async function kickRoomPlayer(
  roomId: string,
  targetPlayerId: string,
  requesterId: string
): Promise<{ success: boolean; room?: GameRoom; error?: string }> {
  const normId = normalizeRoomCode(roomId);
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(normId)}/kick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPlayerId, requesterId }),
    });
    return await res.json();
  } catch (err) {
    console.error('kickRoomPlayer error:', err);
    return { success: false, error: 'Lỗi mạng khi mời người chơi rời phòng' };
  }
}

// Lắng nghe thay đổi của 1 phòng cụ thể (kết hợp Server SSE, Polling 1s, BroadcastChannel và Room Chat)
export function subscribeToRoom(
  roomId: string,
  callback: (room: GameRoom | null) => void,
  onRoomChat?: (msg: ChatMessage) => void,
  onPlayerKicked?: (playerId: string, username: string) => void
): () => void {
  const normId = normalizeRoomCode(roomId);
  let isSubscribed = true;
  let currentCachedRoom: GameRoom | null = null;
  const processedRoomChatIds = new Set<string>();

  const safeCallback = (room: GameRoom | null) => {
    currentCachedRoom = room;
    callback(room);
  };

  // 1. Initial Fetch
  fetch(`/api/rooms/${encodeURIComponent(normId)}`)
    .then((r) => r.json())
    .then((data) => {
      if (isSubscribed && data.success && data.room) {
        safeCallback(data.room);
      }
    })
    .catch(() => {});

  // 2. Server-Sent Events (SSE) Stream
  let eventSource: EventSource | null = null;
  try {
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      eventSource = new EventSource(`/api/rooms/${encodeURIComponent(normId)}/stream`);
      eventSource.onmessage = (e) => {
        if (!isSubscribed || !e.data) return;
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'room_updated' && event.room) {
            safeCallback(event.room);
          } else if (event.type === 'room_closed') {
            safeCallback(null);
          } else if (event.type === 'room_started') {
            safeCallback({
              ...(event.room || {}),
              status: 'playing',
              matchId: event.matchId || event.room?.matchId,
              words: event.words,
              mysteryWords: event.mysteryWords,
            } as GameRoom);
          } else if (event.type === 'chat_message' && event.message) {
            if (onRoomChat && event.message.id) {
              if (!processedRoomChatIds.has(event.message.id)) {
                processedRoomChatIds.add(event.message.id);
                onRoomChat(event.message);
              }
            }
          } else if (event.type === 'init_room_chat' && Array.isArray(event.messages)) {
            if (onRoomChat) {
              event.messages.forEach((m: ChatMessage) => {
                if (m.id && !processedRoomChatIds.has(m.id)) {
                  processedRoomChatIds.add(m.id);
                  onRoomChat(m);
                }
              });
            }
          } else if (event.type === 'player_kicked' && event.playerId) {
            if (onPlayerKicked) {
              onPlayerKicked(event.playerId, event.username || '');
            }
          } else if (event.type === 'player_progress' && event.players) {
            // Live update players progress instantly without extra fetch
            if (currentCachedRoom) {
              currentCachedRoom = {
                ...currentCachedRoom,
                players: event.players,
              };
              callback(currentCachedRoom);
            } else {
              fetch(`/api/rooms/${encodeURIComponent(normId)}`)
                .then((r) => r.json())
                .then((data) => {
                  if (isSubscribed && data.success && data.room) {
                    safeCallback(data.room);
                  }
                })
                .catch(() => {});
            }
          }
        } catch {
          // Ignore
        }
      };
      eventSource.onerror = () => {
        // EventSource will auto-reconnect
      };
    }
  } catch (err) {
    console.error('SSE initialization error:', err);
  }

  // 3. Fallback Polling mỗi 1000ms đảm bảo đồng bộ 100% qua mọi tường lửa và trình duyệt ẩn danh
  const pollTimer = setInterval(() => {
    if (!isSubscribed) return;
    fetch(`/api/rooms/${encodeURIComponent(normId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isSubscribed) return;
        if (data.success && data.room) {
          callback(data.room);
        } else if (data.status === 404 || data.error === 'Room not found') {
          callback(null);
        }
      })
      .catch(() => {});
  }, 1000);

  // 4. Local BroadcastChannel subscription
  const unsubscribeBroadcast = subscribeToRooms((ev) => {
    if (!isSubscribed) return;
    if (ev.type === 'room_updated' && normalizeRoomCode(ev.room.id) === normId) {
      callback(ev.room);
    } else if (ev.type === 'room_closed' && normalizeRoomCode(ev.roomId) === normId) {
      callback(null);
    } else if (ev.type === 'room_started' && normalizeRoomCode(ev.roomId) === normId) {
      fetch(`/api/rooms/${encodeURIComponent(normId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (isSubscribed && data.success && data.room) {
            callback({
              ...data.room,
              status: 'playing',
              words: ev.words || data.room.words,
              mysteryWords: ev.mysteryWords || data.room.mysteryWords,
            });
          }
        })
        .catch(() => {});
    }
  });

  return () => {
    isSubscribed = false;
    clearInterval(pollTimer);
    if (eventSource) {
      eventSource.close();
    }
    unsubscribeBroadcast();
  };
}

// Người chơi rời phòng
export function leaveRoom(roomId: string, playerId: string): void {
  const normId = normalizeRoomCode(roomId);
  const payload = JSON.stringify({ playerId });

  // 1. Dùng navigator.sendBeacon cho tab unload
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(`/api/rooms/${encodeURIComponent(normId)}/leave`, blob);
    } catch {
      // Fallback to fetch
    }
  }

  // 2. Gọi fetch
  fetch(`/api/rooms/${encodeURIComponent(normId)}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

// ==========================================
// CHAT & PRESENCE SYNCHRONIZATION
// ==========================================

const PRESENCE_CHANNEL_NAME = 'fasttyping_presence_sync_v4';

let chatBroadcastChannel: BroadcastChannel | null = null;
let presenceBroadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    chatBroadcastChannel = new BroadcastChannel(CHAT_CHANNEL_NAME);
    presenceBroadcastChannel = new BroadcastChannel(PRESENCE_CHANNEL_NAME);
  }
} catch {
  // BroadcastChannel unavailable
}

export function broadcastLocalPresenceCount(count: number) {
  try {
    if (presenceBroadcastChannel) {
      presenceBroadcastChannel.postMessage({ type: 'online_count', count });
    }
  } catch {
    // Ignore
  }
}

export function broadcastLocalChat(msg: ChatMessage) {
  try {
    if (chatBroadcastChannel) {
      chatBroadcastChannel.postMessage({ type: 'new_chat_message', message: msg });
    }
  } catch {
    // Ignore
  }
}

export function broadcastLocalChatClear() {
  try {
    if (chatBroadcastChannel) {
      chatBroadcastChannel.postMessage({ type: 'chat_cleared' });
    }
  } catch {
    // Ignore
  }
}

/**
 * Fetch chat messages from server
 */
export async function fetchChatMessages(channel: 'global' | 'room', roomId?: string): Promise<ChatMessage[]> {
  try {
    const url = channel === 'room' && roomId
      ? `/api/chat/messages?channel=room&roomId=${encodeURIComponent(normalizeRoomCode(roomId))}`
      : `/api/chat/messages?channel=global`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data && data.success && Array.isArray(data.messages)) {
      return data.messages;
    }
  } catch {
    // Fallback quietly if server is reconnecting or offline
  }
  return [];
}

/**
 * Send chat message to server and broadcast locally
 */
export async function sendChatMessage(msg: {
  id?: string;
  username: string;
  avatar?: string;
  frame?: string;
  message: string;
  channel: 'global' | 'room';
  roomId?: string;
  isAdmin?: boolean;
}): Promise<ChatMessage | null> {
  try {
    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.success && data.message) {
      return data.message;
    }
  } catch {
    // Fallback quietly
  }
  return null;
}

/**
 * Admin clear global chat
 */
export async function clearServerChat(): Promise<void> {
  try {
    await fetch('/api/chat/clear', { method: 'POST' });
    broadcastLocalChatClear();
  } catch {
    // Fallback quietly
  }
}

/**
 * Fetch real-time active online user count with tab presence registration
 */
export async function fetchOnlineCount(tabId?: string, userId?: string, meta?: PresenceUserMeta): Promise<number> {
  try {
    const params = new URLSearchParams();
    if (tabId) params.append('tabId', tabId);
    if (userId) params.append('userId', userId);
    if (meta?.username) params.append('username', meta.username);
    if (meta?.avatar) params.append('avatar', meta.avatar);
    if (meta?.frame) params.append('frame', meta.frame);
    if (typeof meta?.bestWpm === 'number') params.append('bestWpm', meta.bestWpm.toString());
    if (typeof meta?.totalGames === 'number') params.append('totalGames', meta.totalGames.toString());
    if (meta?.currentRoomId) params.append('currentRoomId', meta.currentRoomId);
    if (meta?.currentMode) params.append('currentMode', meta.currentMode);
    if (meta?.status) params.append('status', meta.status);
    if (meta?.isAdmin) params.append('isAdmin', 'true');

    const qs = params.toString();
    const url = qs ? `/api/online-count?${qs}` : '/api/online-count';
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (data && typeof data.count === 'number') {
      return data.count;
    }
  } catch {
    // ignore
  }
  return 1;
}

/**
 * Send heartbeat presence ping to server with rich metadata
 */
export async function sendPresencePing(tabId: string, userId?: string, meta?: PresenceUserMeta): Promise<number> {
  try {
    const payload = {
      tabId,
      userId,
      ...meta,
    };
    const res = await fetch('/api/presence/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const data = await res.json();
    if (data && typeof data.count === 'number') {
      return data.count;
    }
  } catch {
    // ignore
  }
  return 1;
}

/**
 * Admin action: Fetch list of real-time online players with rich details
 */
export async function fetchOnlineUsers(): Promise<OnlineUserDetail[]> {
  try {
    const res = await fetch('/api/admin/online-users', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    const data = await res.json();
    if (data && data.success && Array.isArray(data.users)) {
      return data.users as OnlineUserDetail[];
    }
  } catch (err) {
    console.error('Error fetching online users:', err);
  }
  return [];
}

/**
 * Send beacon when tab is closing or unloading
 */
export function sendPresenceLeave(tabId: string) {
  if (!tabId || typeof window === 'undefined') return;
  try {
    const url = `/api/presence/leave?tabId=${encodeURIComponent(tabId)}`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url);
    } else {
      fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
    }
  } catch {
    // ignore
  }
}

/**
 * Fetch real server-wide high scores
 */
export async function fetchLeaderboard(): Promise<Record<string, HighScoreRecord | null>> {
  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    if (data && data.success && data.highScores) {
      return data.highScores;
    }
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
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
}

/**
 * Submit player score to server leaderboard
 * Chỉ được ghi nhận khi ván đấu diễn ra trọn vẹn, người chơi không đầu hàng hoặc out phòng
 */
export async function submitScoreToLeaderboard(record: {
  mode: string;
  username: string;
  wpm?: number;
  score?: number;
  errors?: number;
  avatar?: string;
  frame?: string;
  isSurrendered?: boolean;
  isCompleted?: boolean;
  roomId?: string;
  playerId?: string;
}): Promise<{ success: boolean; isNewRecord: boolean; highScores: Record<string, HighScoreRecord | null>; error?: string }> {
  // Chặn ngay lập tức tại client nếu người chơi đã đầu hàng hoặc ván đấu không trọn vẹn
  if (record.isSurrendered === true || record.isCompleted === false) {
    return {
      success: false,
      isNewRecord: false,
      highScores: {},
      error: 'Ván đấu không trọn vẹn hoặc người chơi đã đầu hàng/out phòng. Không đủ điều kiện lên Bảng Vàng.',
    };
  }

  try {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error submitting score to leaderboard:', err);
    return { success: false, isNewRecord: false, highScores: {} };
  }
}

/**
 * Admin update high scores
 */
export async function adminUpdateLeaderboard(highScores: Record<string, HighScoreRecord | null>): Promise<boolean> {
  try {
    const res = await fetch('/api/leaderboard/admin-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ highScores }),
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('Error updating leaderboard:', err);
    return false;
  }
}

/**
 * Admin reset leaderboard (resets all or a specific mode if provided)
 */
export async function adminResetLeaderboard(mode?: string): Promise<boolean> {
  try {
    const res = await fetch('/api/leaderboard/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mode ? { mode } : {}),
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('Error resetting leaderboard:', err);
    return false;
  }
}

/**
 * Subscribe to real-time global chat updates (SSE stream + Polling fallback + BroadcastChannel + Tab Presence)
 */
export function subscribeToGlobalChat(
  onMsg: (msg: ChatMessage) => void,
  onClear?: () => void,
  onOnlineCount?: (count: number) => void,
  onLeaderboard?: (highScores: Record<string, HighScoreRecord | null>) => void,
  userId?: string,
  tabId?: string,
  getUserMeta?: () => PresenceUserMeta
): () => void {
  let isSubscribed = true;
  let isSseConnected = false;
  const processedGlobalIds = new Set<string>();

  const actualTabId = tabId || (typeof window !== 'undefined' ? `tab_${Math.random().toString(36).slice(2, 9)}` : 'tab_init');
  const actualUserId = userId || actualTabId;

  const updatePresence = (count: number) => {
    if (typeof count === 'number' && onOnlineCount) {
      onOnlineCount(count);
      broadcastLocalPresenceCount(count);
    }
  };

  const dispatchMsg = (m: ChatMessage) => {
    if (!m || !m.id) return;
    if (processedGlobalIds.has(m.id)) return;
    processedGlobalIds.add(m.id);
    onMsg(m);
  };

  // 1. Initial fetch
  fetchChatMessages('global').then((msgs) => {
    if (!isSubscribed) return;
    msgs.forEach((m) => dispatchMsg(m));
  });

  const initialMeta = getUserMeta ? getUserMeta() : undefined;

  if (onOnlineCount) {
    fetchOnlineCount(actualTabId, actualUserId, initialMeta).then((count) => {
      if (isSubscribed) updatePresence(count);
    });
  }

  if (onLeaderboard) {
    fetchLeaderboard().then((records) => {
      if (isSubscribed && onLeaderboard) onLeaderboard(records);
    });
  }

  // 2. Global Chat & Presence & Leaderboard SSE stream
  let eventSource: EventSource | null = null;
  try {
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      const meta = getUserMeta ? getUserMeta() : undefined;
      const params = new URLSearchParams({
        tabId: actualTabId,
        userId: actualUserId,
      });
      if (meta?.username) params.append('username', meta.username);
      if (meta?.avatar) params.append('avatar', meta.avatar);
      if (meta?.frame) params.append('frame', meta.frame);
      if (typeof meta?.bestWpm === 'number') params.append('bestWpm', meta.bestWpm.toString());
      if (typeof meta?.totalGames === 'number') params.append('totalGames', meta.totalGames.toString());
      if (meta?.currentRoomId) params.append('currentRoomId', meta.currentRoomId);
      if (meta?.currentMode) params.append('currentMode', meta.currentMode);
      if (meta?.status) params.append('status', meta.status);
      if (meta?.isAdmin) params.append('isAdmin', 'true');

      const url = `/api/chat/stream?${params.toString()}`;
      eventSource = new EventSource(url);
      eventSource.onopen = () => {
        isSseConnected = true;
      };
      eventSource.onerror = () => {
        isSseConnected = false;
      };
      eventSource.onmessage = (e) => {
        if (!isSubscribed || !e.data) return;
        try {
          const ev = JSON.parse(e.data);
          if (ev.type === 'new_chat_message' && ev.message) {
            dispatchMsg(ev.message);
          } else if (ev.type === 'init_chat' && Array.isArray(ev.messages)) {
            ev.messages.forEach((m: ChatMessage) => dispatchMsg(m));
          } else if (ev.type === 'chat_cleared') {
            processedGlobalIds.clear();
            if (onClear) onClear();
          } else if (ev.type === 'online_count' && typeof ev.count === 'number') {
            updatePresence(ev.count);
          } else if (ev.type === 'leaderboard_updated' && ev.highScores) {
            if (onLeaderboard) onLeaderboard(ev.highScores);
          }
        } catch {
          // Ignore
        }
      };
    }
  } catch {
    // SSE fallback
  }

  // 3. Periodic Presence Ping & Heartbeat (every 3000ms)
  // Keeps session alive on server and fetches up-to-date presence count
  const pingTimer = setInterval(() => {
    if (!isSubscribed) return;
    const currentMeta = getUserMeta ? getUserMeta() : undefined;
    sendPresencePing(actualTabId, actualUserId, currentMeta).then((count) => {
      if (isSubscribed) updatePresence(count);
    });
    if (!isSseConnected) {
      fetchChatMessages('global').then((msgs) => {
        if (!isSubscribed) return;
        msgs.forEach((m) => dispatchMsg(m));
      });
    }
  }, 3000);

  // 4. Instant refresh on Tab focus & visibility change (e.g. switching between tabs in Brave)
  const handleVisibilityOrFocus = () => {
    if (!isSubscribed) return;
    const currentMeta = getUserMeta ? getUserMeta() : undefined;
    fetchOnlineCount(actualTabId, actualUserId, currentMeta).then((count) => {
      if (isSubscribed) updatePresence(count);
    });
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
  }

  // 5. Send leave beacon on tab unload
  const handleUnload = () => {
    sendPresenceLeave(actualTabId);
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);
  }

  // 6. BroadcastChannel subscriptions for instantaneous cross-tab synchronization
  const handleBcMessage = (event: MessageEvent) => {
    if (!isSubscribed || !event.data) return;
    if (event.data.type === 'new_chat_message' && event.data.message) {
      dispatchMsg(event.data.message);
    } else if (event.data.type === 'chat_cleared') {
      processedGlobalIds.clear();
      if (onClear) onClear();
    }
  };

  const handlePresenceBcMessage = (event: MessageEvent) => {
    if (!isSubscribed || !event.data) return;
    if (event.data.type === 'online_count' && typeof event.data.count === 'number') {
      if (onOnlineCount) onOnlineCount(event.data.count);
    }
  };

  if (chatBroadcastChannel) {
    chatBroadcastChannel.addEventListener('message', handleBcMessage);
  }
  if (presenceBroadcastChannel) {
    presenceBroadcastChannel.addEventListener('message', handlePresenceBcMessage);
  }

  return () => {
    isSubscribed = false;
    clearInterval(pingTimer);
    if (eventSource) {
      eventSource.close();
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
    }
    if (chatBroadcastChannel) {
      chatBroadcastChannel.removeEventListener('message', handleBcMessage);
    }
    if (presenceBroadcastChannel) {
      presenceBroadcastChannel.removeEventListener('message', handlePresenceBcMessage);
    }
  };
}

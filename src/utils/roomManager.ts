import { 
  GameMode, 
  GameRoom, 
  Player, 
  DifficultyLevel, 
  MysteryWordItem, 
  ChatMessage, 
  ChatChannel,
  ChatCardType,
  ChatCardData,
  FriendRecord,
  FriendRequest,
  HighScoreRecord, 
  OnlineUserDetail, 
  BestWpmRecord, 
  CultivationLeaderboardEntry, 
  SectLeaderboardEntry, 
  SectInfo, 
  SectRole,
  SectWarStatus,
  LeaderboardEntry,
  LeaderboardMultiData,
  PlayerProfileDetail,
} from '../types';
import { getLeaderboardSync, saveLeaderboardToIndexedDB } from './leaderboardStorage';
import { getStoredAuthToken, getStoredCachedUser } from './auth';
import { saveDaoDecree } from './heavenlyDaoBot';
import { getStoredSects } from './cultivation';
import { broadcastAdminEvent } from './adminEventSync';

export interface PresenceUserMeta {
  userId?: string;
  username?: string;
  avatar?: string;
  frame?: string;
  deviceId?: string;
  bestWpm?: number;
  bestWpmRecord?: BestWpmRecord;
  totalGames?: number;
  currentRoomId?: string | null;
  sectId?: string | null;
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

// Tên hiển thị thân thiện cho từng chế độ chơi theo phong cách Tiên Hiệp
export function getModeDisplayName(mode: GameMode): string {
  switch (mode) {
    case 'vi_dau':
      return 'Chính Đạo Vấn Tâm (Tiếng Việt Có Dấu)';
    case 'vi_nodau':
      return 'Tật Phong Ngự Kiếm (Tiếng Việt Không Dấu)';
    case 'en':
      return 'Dị Vực Luận Đạo (Tiếng Anh)';
    case 'numpad':
      return 'Cửu Cung Trận Pháp (Bàn Phím Số)';
    case 'ngau_hung':
      return 'Lôi Đình Nhất Kích (Ngẫu Hứng - Rush)';
    case 'doan_chu':
      return 'Huyền Cơ Mật Cảnh (Đoán Chữ - Mystery)';
    case 'san_boss':
      return 'Hàng Phục Ma Tôn (Săn Boss Hắc Long)';
    case 'outplay':
      return 'Tâm Ma Thí Luyện (Đột Phá Bản Ngã)';
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
 * Trợ giúp phân tích phản hồi JSON an toàn, không bao giờ ném ngoại lệ SyntaxError khi server trả về HTML (502, 503, 404 proxy).
 */
export async function safeResponseJson<T = any>(res: Response): Promise<T | null> {
  try {
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
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
    const data = await safeResponseJson<{ success: boolean; room: GameRoom }>(res);
    if (data?.success && data.room) {
      broadcastLocalEvent({ type: 'room_updated', room: data.room });
      return data.room;
    }
  } catch (err) {
    console.warn('createNewRoom network/server fallback:', err);
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
    const data = await safeResponseJson<{ success: boolean; room?: GameRoom; error?: string; isHost?: boolean }>(res);
    if (data?.success && data.room) {
      broadcastLocalEvent({ type: 'room_updated', room: data.room });
      return {
        success: true,
        room: data.room,
        isHost: Boolean(data.isHost),
      };
    } else {
      return {
        success: false,
        error: data?.error || 'Không thể tham gia phòng hoặc máy chủ đang phản hồi lại.',
      };
    }
  } catch (err) {
    console.warn('joinExistingRoom network fallback:', err);
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
    const data = await safeResponseJson<{ success: boolean; room: GameRoom; isHost?: boolean; isNewlyCreated?: boolean }>(res);
    if (data?.success && data.room) {
      broadcastLocalEvent({ type: 'room_updated', room: data.room });
      return {
        room: data.room,
        isHost: Boolean(data.isHost),
        isNewlyCreated: Boolean(data.isNewlyCreated),
      };
    }
  } catch (err) {
    console.warn('quickJoinOrCreateRoom network fallback:', err);
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
export async function updateRoomPlayers(
  roomId: string,
  players: Player[]
): Promise<{ success: boolean; room?: GameRoom }> {
  const normId = normalizeRoomCode(roomId);
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(normId)}/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
      body: JSON.stringify({ players }),
    });
    const data = await safeResponseJson<{ success: boolean; room?: GameRoom }>(res);
    if (data?.success && data.room) {
      broadcastLocalEvent({ type: 'room_updated', room: data.room });
      return { success: true, room: data.room };
    }
  } catch (err) {
    console.warn('updateRoomPlayers fallback:', err);
  }
  return { success: false };
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

// Cập nhật chế độ thi đấu của phòng (Chủ phòng)
export async function updateRoomMode(roomId: string, mode: GameMode, difficulty?: DifficultyLevel): Promise<void> {
  const normId = normalizeRoomCode(roomId);
  try {
    await fetch(`/api/rooms/${encodeURIComponent(normId)}/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, difficulty }),
    });
  } catch (err) {
    console.error('updateRoomMode error:', err);
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

// Cập nhật trạng thái cụ thể của người chơi trong phòng (inMatch: false khi về phòng chờ, isSurrendered, isAFK, ...)
export async function updatePlayerRoomStatus(
  roomId: string,
  playerId: string,
  updates: { inMatch?: boolean; isSurrendered?: boolean; isFinished?: boolean; isAFK?: boolean }
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

// Lắng nghe thay đổi của 1 phòng cụ thể (kết hợp Server SSE, Polling 1s, BroadcastChannel, Room Chat và Real-time Friend Events)
export function subscribeToRoom(
  roomId: string,
  callback: (room: GameRoom | null) => void,
  onRoomChat?: (msg: ChatMessage) => void,
  onPlayerKicked?: (playerId: string, username: string) => void,
  userId?: string,
  username?: string,
  tabId?: string,
  onFriendEvent?: (event: any) => void
): () => void {
  const normId = normalizeRoomCode(roomId);
  let isSubscribed = true;
  let currentCachedRoom: GameRoom | null = null;
  const processedRoomChatIds = new Set<string>();

  const safeCallback = (room: GameRoom | null) => {
    currentCachedRoom = room;
    callback(room);
  };

  // 1. Initial Fetch với anti-cache và cache-buster timestamp chống proxy Citrix đệm kết quả cũ
  fetch(`/api/rooms/${encodeURIComponent(normId)}?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
  })
    .then((r) => safeResponseJson<{ success: boolean; room?: GameRoom }>(r))
    .then((data) => {
      if (isSubscribed && data?.success && data.room) {
        safeCallback(data.room);
      }
    })
    .catch(() => {});

  // 2. Server-Sent Events (SSE) Stream
  let eventSource: EventSource | null = null;
  try {
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      const qParams = new URLSearchParams();
      if (userId) qParams.append('userId', userId);
      if (username) qParams.append('username', username);
      if (tabId) qParams.append('tabId', tabId);
      const streamUrl = `/api/rooms/${encodeURIComponent(normId)}/stream${qParams.toString() ? `?${qParams.toString()}` : ''}`;
      eventSource = new EventSource(streamUrl);
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
          } else if ((event.type === 'chat_message' || event.type === 'new_chat_message') && event.message) {
            if (onRoomChat && event.message.id) {
              if (!processedRoomChatIds.has(event.message.id)) {
                processedRoomChatIds.add(event.message.id);
                onRoomChat(event.message);
              }
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('room_chat_received', { detail: event.message }));
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
            if (typeof window !== 'undefined' && event.messages.length > 0) {
              event.messages.forEach((m: ChatMessage) => {
                window.dispatchEvent(new CustomEvent('room_chat_received', { detail: m }));
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
                status: event.status || currentCachedRoom.status,
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
          } else if (
            event.type === 'friend_request_received' ||
            event.type === 'friend_request_accepted' ||
            event.type === 'friends_data_updated' ||
            event.type === 'friend_requests_count' ||
            event.type === 'room_invite'
          ) {
            if (onFriendEvent) onFriendEvent(event);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('friends_data_updated', { detail: event }));
              if (event.type === 'friend_request_received') {
                window.dispatchEvent(new CustomEvent('friend_request_received', { detail: event }));
              }
              if (event.type === 'friend_request_accepted') {
                window.dispatchEvent(new CustomEvent('friend_request_accepted', { detail: event }));
              }
              if (event.type === 'room_invite') {
                window.dispatchEvent(new CustomEvent('room_invite', { detail: event }));
              }
            }
          } else if (
            event.type === 'cultivation_reward_received' ||
            event.type === 'cultivation_level_updated' ||
            event.type === 'frame_updated' ||
            event.type === 'user_banned' ||
            event.type === 'user_unbanned' ||
            event.type === 'admin_role_updated' ||
            event.type === 'password_reset_notice'
          ) {
            broadcastAdminEvent(event);
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

  // 3. Fallback Polling mỗi 1000ms đảm bảo đồng bộ 100% qua mọi tường lửa, proxy Citrix và trình duyệt ẩn danh
  const pollTimer = setInterval(() => {
    if (!isSubscribed) return;
    fetch(`/api/rooms/${encodeURIComponent(normId)}?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    })
      .then((r) => safeResponseJson<{ success: boolean; room?: GameRoom; status?: number; error?: string }>(r))
      .then((data) => {
        if (!isSubscribed || !data) return;
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
const FRIENDS_CHANNEL_NAME = 'fasttyping_friends_sync_v1';

let chatBroadcastChannel: BroadcastChannel | null = null;
let presenceBroadcastChannel: BroadcastChannel | null = null;
let friendsBroadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    chatBroadcastChannel = new BroadcastChannel(CHAT_CHANNEL_NAME);
    presenceBroadcastChannel = new BroadcastChannel(PRESENCE_CHANNEL_NAME);
    friendsBroadcastChannel = new BroadcastChannel(FRIENDS_CHANNEL_NAME);
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

export function broadcastLocalFriendsUpdate(data?: any) {
  try {
    if (friendsBroadcastChannel) {
      friendsBroadcastChannel.postMessage({ type: 'friends_data_updated', ...data });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('friends_data_updated', { detail: data }));
      if (data?.type === 'friend_request_sent') {
        window.dispatchEvent(new CustomEvent('friend_request_sent', { detail: data }));
      }
      if (data?.type === 'friend_request_responded') {
        window.dispatchEvent(new CustomEvent('friend_request_responded', { detail: data }));
      }
      if (data?.type === 'friend_request_received') {
        window.dispatchEvent(new CustomEvent('friend_request_received', { detail: data }));
      }
      if (data?.type === 'friend_request_accepted') {
        window.dispatchEvent(new CustomEvent('friend_request_accepted', { detail: data }));
      }
      if (data?.type === 'room_invite') {
        window.dispatchEvent(new CustomEvent('room_invite', { detail: data }));
      }
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('new_chat_message', { detail: msg }));
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chat_cleared'));
    }
  } catch {
    // Ignore
  }
}

/**
 * Fetch chat messages from server with multi-channel support
 */
export async function fetchChatMessages(
  channelOrParams: ChatChannel | {
    channel: ChatChannel;
    roomId?: string;
    sectId?: string;
    currentUserId?: string;
    targetUserId?: string;
    currentUsername?: string;
    targetUsername?: string;
  },
  roomId?: string
): Promise<ChatMessage[]> {
  try {
    let url = '/api/chat/messages';
    if (typeof channelOrParams === 'string') {
      const channel = channelOrParams;
      if (channel === 'room' && roomId) {
        url = `/api/chat/messages?channel=room&roomId=${encodeURIComponent(normalizeRoomCode(roomId))}`;
      } else {
        url = `/api/chat/messages?channel=${encodeURIComponent(channel)}`;
      }
    } else if (typeof channelOrParams === 'object') {
      const p = new URLSearchParams();
      p.append('channel', channelOrParams.channel);
      if (channelOrParams.roomId) p.append('roomId', normalizeRoomCode(channelOrParams.roomId));
      if (channelOrParams.sectId) p.append('sectId', channelOrParams.sectId);
      if (channelOrParams.currentUserId) p.append('currentUserId', channelOrParams.currentUserId);
      if (channelOrParams.targetUserId) p.append('targetUserId', channelOrParams.targetUserId);
      if (channelOrParams.currentUsername) p.append('currentUsername', channelOrParams.currentUsername);
      if (channelOrParams.targetUsername) p.append('targetUsername', channelOrParams.targetUsername);
      url = `/api/chat/messages?${p.toString()}`;
    }

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
 * Send chat message to server and broadcast locally with rich card & multi-channel support
 */
export async function sendChatMessage(msg: {
  id?: string;
  username: string;
  avatar?: string;
  frame?: string;
  message: string;
  channel: ChatChannel;
  roomId?: string;
  sectId?: string;
  whisperTarget?: string;
  whisperTargetUserId?: string;
  senderUserId?: string;
  senderRealm?: string;
  senderRealmIcon?: string;
  senderSectTag?: string;
  cardType?: ChatCardType;
  cardData?: ChatCardData;
  isAdmin?: boolean;
  isDaoBot?: boolean;
  daoEventType?: string;
  daoTitle?: string;
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
      broadcastLocalChat(data.message);
      return data.message;
    }
  } catch {
    // Fallback quietly
  }
  return null;
}

// ==========================================
// HỆ THỐNG ĐẠO HỮU & KẾT BÁI ĐẠO LỮ (CLIENT UTILS)
// ==========================================

export function getEffectiveClientUser(explicitId?: string, explicitUsername?: string): { id?: string; username?: string } {
  let id = explicitId;
  let username = explicitUsername;
  const cached = getStoredCachedUser();
  if (!id) {
    id = cached?.id || (typeof window !== 'undefined' ? localStorage.getItem('fasttyping_player_id') || sessionStorage.getItem('fasttyping_player_id') || undefined : undefined);
  }
  if (!username) {
    username = cached?.username || cached?.displayName || (typeof window !== 'undefined' ? localStorage.getItem('fasttyping_user') || localStorage.getItem('fasttyping_username') || undefined : undefined);
  }
  return { id, username };
}

export async function fetchFriendsList(userId?: string, username?: string): Promise<{
  success: boolean;
  friends: FriendRecord[];
  pendingRequests: FriendRequest[];
  sentRequests: any[];
  isGuest?: boolean;
}> {
  try {
    const token = getStoredAuthToken();
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const { id: effectiveId, username: effectiveUsername } = getEffectiveClientUser(userId, username);
    const params = new URLSearchParams();
    if (effectiveId) params.append('userId', effectiveId);
    if (effectiveUsername) params.append('username', effectiveUsername);
    params.append('_t', Date.now().toString());

    const url = `/api/friends/list?${params.toString()}`;
    const res = await fetch(url, { headers, cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        if (typeof window !== 'undefined' && Array.isArray(data.friends)) {
          try {
            localStorage.setItem('fasttyping_friends_cache', JSON.stringify(data.friends));
          } catch {}
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch friends list:', err);
  }
  return { success: false, friends: [], pendingRequests: [], sentRequests: [] };
}

export async function searchFriends(query?: string, userId?: string, username?: string): Promise<{
  success: boolean;
  query: string;
  results: Array<{
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    frame: string;
    bestWpm: number;
    level: number;
    realmName: string;
    realmIcon: string;
    sectName?: string;
    sectTag?: string;
    status: 'online' | 'in_match' | 'offline';
    isFriend: boolean;
    isPendingSent: boolean;
    isPendingReceived: boolean;
    isExactUidMatch?: boolean;
  }>;
}> {
  try {
    const token = getStoredAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const { id: effectiveId, username: effectiveUsername } = getEffectiveClientUser(userId, username);
    const params = new URLSearchParams();
    if (query !== undefined && query !== null) params.append('q', query);
    if (effectiveId) params.append('userId', effectiveId);
    if (effectiveUsername) params.append('username', effectiveUsername);

    const res = await fetch(`/api/friends/search?${params.toString()}`, { headers, cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) return data;
    }
  } catch (err) {
    console.warn('Failed to search friends:', err);
  }
  return { success: false, query: query || '', results: [] };
}

export async function sendFriendRequest(
  targetUsername: string,
  targetUserId?: string,
  message?: string,
  currentUserId?: string,
  currentUsername?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  autoAccepted?: boolean;
}> {
  try {
    const token = getStoredAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const { id: effectiveId, username: effectiveUsername } = getEffectiveClientUser(currentUserId, currentUsername);

    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        targetUsername, 
        targetUserId, 
        message, 
        currentUserId: effectiveId,
        currentUsername: effectiveUsername 
      }),
    });
    const data = await res.json();
    if (data.success) {
      broadcastLocalFriendsUpdate({ targetUsername, targetUserId, type: 'friend_request_sent' });
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

export async function respondFriendRequest(
  requestId: string,
  action: 'accept' | 'reject',
  currentUserId?: string,
  currentUsername?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  remainingCount?: number;
  friend?: FriendRecord;
}> {
  try {
    const token = getStoredAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const { id: effectiveId, username: effectiveUsername } = getEffectiveClientUser(currentUserId, currentUsername);

    const res = await fetch('/api/friends/respond', {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        requestId, 
        action, 
        currentUserId: effectiveId,
        currentUsername: effectiveUsername 
      }),
    });
    const data = await res.json();
    if (data.success) {
      broadcastLocalFriendsUpdate({ requestId, action, type: 'friend_request_responded', friend: data.friend });
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

export async function removeFriend(
  friendshipId?: string,
  targetUserId?: string,
  currentUserId?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const token = getStoredAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const { id: effectiveId } = getEffectiveClientUser(currentUserId);

    const res = await fetch('/api/friends/remove', {
      method: 'POST',
      headers,
      body: JSON.stringify({ friendshipId, targetUserId, currentUserId: effectiveId }),
    });
    const data = await res.json();
    if (data.success) {
      broadcastLocalFriendsUpdate({ friendshipId, targetUserId });
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

export async function giftNgocDaoTea(targetUserId: string, currentUserId?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  intimacy?: number;
}> {
  try {
    const token = getStoredAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const { id: effectiveId } = getEffectiveClientUser(currentUserId);

    const res = await fetch('/api/friends/tea', {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetUserId, currentUserId: effectiveId }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

export async function mentorGuidance(targetUserId: string, currentUserId?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  intimacy?: number;
}> {
  try {
    const token = getStoredAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const { id: effectiveId } = getEffectiveClientUser(currentUserId);

    const res = await fetch('/api/friends/guide', {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetUserId, currentUserId: effectiveId }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

export async function proposeDaoLu(targetUserId: string, currentUserId?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const token = getStoredAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const { id: effectiveId } = getEffectiveClientUser(currentUserId);

    const res = await fetch('/api/friends/daolu/propose', {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetUserId, currentUserId: effectiveId }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

export async function respondDaoLu(friendshipId: string, accept: boolean, currentUserId?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const token = getStoredAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const { id: effectiveId } = getEffectiveClientUser(currentUserId);

    const res = await fetch('/api/friends/daolu/respond', {
      method: 'POST',
      headers,
      body: JSON.stringify({ friendshipId, accept, currentUserId: effectiveId }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

export async function inviteFriendToRoom(targetUserId: string, roomId: string, mode?: string, currentUserId?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const token = getStoredAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const { id: effectiveId } = getEffectiveClientUser(currentUserId);

    const res = await fetch('/api/friends/invite-room', {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetUserId, roomId, mode, currentUserId: effectiveId }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
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
    if (meta?.deviceId) params.append('deviceId', meta.deviceId);
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
export async function sendPresencePing(
  tabId: string,
  userId?: string,
  meta?: PresenceUserMeta
): Promise<{ count: number; pendingFriendRequestsCount?: number; friendEvents?: any[] }> {
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
      return {
        count: data.count,
        pendingFriendRequestsCount: data.pendingFriendRequestsCount,
        friendEvents: data.friendEvents,
      };
    }
  } catch {
    // ignore
  }
  return { count: 1 };
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
    console.warn('Unable to fetch online users:', err);
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
 * Get stored local high scores cache as fallback (Non-blocking from memory/IndexedDB cache)
 */
export function getStoredHighScores(): Record<string, HighScoreRecord | null> {
  return getLeaderboardSync();
}

/**
 * Fetch real server-wide high scores with multi-period Top 20
 */
export async function fetchLeaderboardFull(): Promise<LeaderboardMultiData> {
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/leaderboard', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        if (text.includes('Rate exceeded') || res.status === 429) {
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 800));
            continue;
          }
        }
      }

      if (data && data.success) {
        if (data.highScores) {
          saveLeaderboardToIndexedDB(data.highScores).catch(() => {});
        }
        return {
          highScores: data.highScores || {},
          rankings: data.rankings || {},
          lastResetDate: data.lastResetDate,
          lastResetWeek: data.lastResetWeek,
        };
      } else if (!res.ok && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 800));
        continue;
      }
    } catch (err: any) {
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 800));
        continue;
      }
      // Silently fall back to cached scores without console noise if request was aborted or throttled
      if (err?.name !== 'AbortError' && !String(err?.message || '').includes('aborted')) {
        console.warn('Leaderboard service note, using local cache:', err?.message || err);
      }
    }
  }
  return {
    highScores: getStoredHighScores(),
    rankings: {},
  };
}

/**
 * Fetch real server-wide high scores with resilient retries, timeout, and local cache fallback
 */
export async function fetchLeaderboard(): Promise<Record<string, HighScoreRecord | null>> {
  const full = await fetchLeaderboardFull();
  return full.highScores;
}

/**
 * Fetch top 50 cultivators with highest tu vi from server
 */
export async function fetchCultivationLeaderboard(params?: {
  username?: string;
  userId?: string;
  force?: boolean;
  cultivation?: any;
}): Promise<{
  success: boolean;
  top50: CultivationLeaderboardEntry[];
  totalCount?: number;
  currentUserRank?: {
    rank: number;
    username: string;
    level: number;
    realmIndex: number;
    realmName: string;
    tier: number;
    subStage: string;
    exp: number;
  } | null;
  currentUserActualCultivation?: any;
  lastUpdated?: number;
  nextUpdate?: number;
  remainingSeconds?: number;
  updateInterval?: number;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.username) query.set('username', params.username);
    if (params?.userId) query.set('userId', params.userId);
    if (params?.force) query.set('force', 'true');
    const token = getStoredAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Nếu có dữ liệu tu vi hiện tại, đồng bộ lên server trước hoặc truyền kèm
    if (params?.cultivation && token) {
      fetch('/api/cultivation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cultivation: params.cultivation }),
      }).catch(() => {});
    }

    const res = await fetch(`/api/leaderboard/cultivation?${query.toString()}`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.top50)) {
        return data;
      }
    }
  } catch (err) {
    console.error('Failed to fetch cultivation leaderboard:', err);
  }
  return { success: false, top50: [] };
}

/**
 * Lấy Bảng Xếp Hạng Tông Môn từ Server (sắp xếp theo Tổng Tu Vi Thành Viên)
 */
export async function fetchSectLeaderboard(): Promise<{
  success: boolean;
  topSects: SectLeaderboardEntry[];
  totalSects?: number;
  lastUpdated?: number;
}> {
  try {
    const res = await fetch('/api/leaderboard/sects');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.topSects)) {
        return data;
      }
    }
  } catch (err) {
    console.error('Failed to fetch sect leaderboard:', err);
  }
  return { success: false, topSects: [] };
}

/**
 * Lấy danh sách toàn bộ Tông Môn từ Server
 */
export async function fetchServerSects(): Promise<{ success: boolean; sects: SectInfo[] }> {
  try {
    const res = await fetch('/api/sects');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.sects)) {
        return data;
      }
    }
  } catch (err) {
    console.error('Failed to fetch sects:', err);
  }
  return { success: false, sects: [] };
}

/**
 * Lấy hồ sơ xem trước chi tiết của người chơi từ Server
 */
export async function fetchPlayerProfile(identifier: string): Promise<{
  success: boolean;
  profile?: PlayerProfileDetail;
  error?: string;
}> {
  if (!identifier) return { success: false, error: 'Thiếu định danh' };
  try {
    const res = await fetch(`/api/player/profile/${encodeURIComponent(identifier)}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err: any) {
    console.warn('Failed to fetch player profile:', err?.message || err);
  }
  return { success: false };
}

/**
 * Khai Sơn Lập Phái thông qua Server API
 */
export async function serverCreateSect(params: {
  name: string;
  tag: string;
  description: string;
  slogan?: string;
  badgeIcon: string;
  bannerColor?: string;
}): Promise<{ success: boolean; message?: string; error?: string; sect?: SectInfo; cultivation?: any }> {
  const token = getStoredAuthToken();
  if (!token) return { success: false, error: 'Chưa đăng nhập!' };
  try {
    const res = await fetch('/api/sects/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

/**
 * Bái nhập môn phái thông qua Server API
 */
export async function serverJoinSect(sectId: string): Promise<{ success: boolean; message?: string; error?: string; sect?: SectInfo; cultivation?: any }> {
  const token = getStoredAuthToken();
  if (!token) return { success: false, error: 'Chưa đăng nhập!' };
  try {
    const res = await fetch('/api/sects/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sectId }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

/**
 * Rời khỏi môn phái thông qua Server API
 */
export async function serverLeaveSect(): Promise<{ success: boolean; message?: string; error?: string; cultivation?: any }> {
  const token = getStoredAuthToken();
  if (!token) return { success: false, error: 'Chưa đăng nhập!' };
  try {
    const res = await fetch('/api/sects/leave', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

/**
 * Tấn phong / bãi miễn chức vụ đệ tử thông qua Server API
 */
export async function serverUpdateMemberRole(
  targetUsername: string,
  newRole: SectRole
): Promise<{ success: boolean; message?: string; error?: string; sect?: SectInfo; cultivation?: any }> {
  const token = getStoredAuthToken();
  if (!token) return { success: false, error: 'Chưa đăng nhập!' };
  try {
    const res = await fetch('/api/sects/role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetUsername, newRole }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

/**
 * Trục xuất đệ tử khỏi môn phái thông qua Server API
 */
export async function serverKickSectMember(targetUsername: string): Promise<{ success: boolean; message?: string; error?: string; sect?: SectInfo }> {
  const token = getStoredAuthToken();
  if (!token) return { success: false, error: 'Chưa đăng nhập!' };
  try {
    const res = await fetch('/api/sects/kick', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetUsername }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

/**
 * Cống hiến Linh Thạch bồi dưỡng Linh Mạch thông qua Server API
 */
export async function serverContributeToSect(amount: number): Promise<{ success: boolean; message?: string; error?: string; sect?: SectInfo; cultivation?: any }> {
  const token = getStoredAuthToken();
  if (!token) return { success: false, error: 'Chưa đăng nhập!' };
  try {
    const res = await fetch('/api/sects/contribute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
  }
}

/**
 * Trạng thái dự phòng Vạn Phái Tranh Phong cục bộ khi máy chủ đang khởi động hoặc mất mạng
 */
export function getLocalSectWarStatus(): SectWarStatus {
  const now = Date.now();
  const VN_OFFSET = 7 * 3600 * 1000;
  const nowVN = new Date(now + VN_OFFSET);
  const day = nowVN.getUTCDay(); // 0 = Chủ Nhật, 6 = Thứ Bảy
  const hour = nowVN.getUTCHours();

  const isActive = day === 6 || (day === 0 && hour < 20);

  let daysUntilSunday = (7 - day) % 7;
  if (day === 0 && hour >= 20) {
    daysUntilSunday = 7;
  }
  const targetVN = new Date(nowVN);
  targetVN.setUTCDate(targetVN.getUTCDate() + daysUntilSunday);
  targetVN.setUTCHours(20, 0, 0, 0);
  const nextSettlementTimestamp = targetVN.getTime() - VN_OFFSET;
  const timeRemainingMs = Math.max(0, nextSettlementTimestamp - now);

  let topSects: SectWarStatus['topSects'] = [];
  try {
    const localSects = getStoredSects();
    if (Array.isArray(localSects)) {
      topSects = localSects
        .map((s, idx) => ({
          id: s.id,
          name: s.name,
          tag: s.tag,
          badgeIcon: s.badgeIcon || '⚔️',
          bannerColor: s.bannerColor || '#38bdf8',
          leaderName: s.leaderName,
          leaderAvatar: s.leaderAvatar || '👑',
          weeklyWarPoints: s.weeklyTournamentPoints || 0,
          memberCount: s.memberCount || 1,
          isHoldingThienCung: Boolean(s.isHoldingThienCung || (idx === 0 && (s.weeklyTournamentPoints || 0) > 0)),
          rank: idx + 1,
        }))
        .sort((a, b) => (b.weeklyWarPoints || 0) - (a.weeklyWarPoints || 0));
    }
  } catch {
    topSects = [];
  }

  return {
    isActive,
    phase: isActive ? 'active' : 'settled_rest',
    timeRemainingMs,
    nextSettlementTimestamp,
    dailyAttemptsMax: 3,
    dailyAttemptsUsed: 0,
    dailyAttemptsLeft: 3,
    isHappyHour: false,
    happyHourMultiplier: 1,
    topSects,
  };
}

/**
 * Lấy trạng thái Đại sự kiện Vạn Phái Tranh Phong cuối tuần (T7 & CN • Tổng kết 20h CN)
 */
export async function fetchSectWarStatus(): Promise<SectWarStatus | null> {
  const token = getStoredAuthToken();
  try {
    const res = await fetch('/api/sects/war/status', {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return getLocalSectWarStatus();
    const data = await res.json();
    return data && data.success ? data : getLocalSectWarStatus();
  } catch {
    // Dự phòng an toàn bằng tính toán lịch trình sự kiện cục bộ, không ném console.error
    return getLocalSectWarStatus();
  }
}

/**
 * Đóng góp điểm Chiến Công cho Tông Môn sau khi hoàn thành bài gõ
 */
export async function serverContributeSectWarScore(payload: {
  wpm: number;
  accuracy: number;
  mode?: string;
  isMultiplayer?: boolean;
}): Promise<{
  success: boolean;
  addedPoints?: number;
  userTotalPoints?: number;
  totalWeeklyPoints?: number;
  dailyAttemptsUsed?: number;
  dailyAttemptsLeft?: number;
  dailyAttemptsMax?: number;
  currentRank?: number;
  isHappyHour?: boolean;
  sectName?: string;
  isActive?: boolean;
  error?: string;
}> {
  const token = getStoredAuthToken();
  if (!token) return { success: false, error: 'Chưa đăng nhập!' };
  try {
    const res = await fetch('/api/sects/war/contribute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi mạng khi cống hiến điểm chiến công' };
  }
}

/**
 * Khấu trừ 1 lượt bài thi Tông Môn khi đầu hàng 3 lần liên tục
 */
export async function serverPenalizeSectSurrender(): Promise<{
  success: boolean;
  deducted?: boolean;
  dailyAttemptsUsed?: number;
  dailyAttemptsLeft?: number;
  dailyAttemptsMax?: number;
  message?: string;
  error?: string;
}> {
  const token = getStoredAuthToken();
  try {
    const res = await fetch('/api/sects/war/penalize-surrender', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối khi trừ lượt bài thi' };
  }
}

/**
 * Submit player score to server leaderboard
 * Chỉ được ghi nhận khi ván đấu diễn ra trọn vẹn, không đầu hàng, không out phòng, độ chính xác >= 92%
 */
export async function submitScoreToLeaderboard(record: {
  mode: string;
  username: string;
  displayName?: string;
  wpm?: number;
  score?: number;
  errors?: number;
  accuracy?: number;
  consistency?: number;
  avatar?: string;
  frame?: string;
  isSurrendered?: boolean;
  isCompleted?: boolean;
  roomId?: string;
  playerId?: string;
  keyboardSwitch?: string;
}): Promise<{
  success: boolean;
  isNewRecord: boolean;
  highScores: Record<string, HighScoreRecord | null>;
  rankings?: Record<string, { daily: LeaderboardEntry[]; weekly: LeaderboardEntry[]; all_time: LeaderboardEntry[] }>;
  userRank?: { daily: number; weekly: number; allTime: number };
  isGuest?: boolean;
  error?: string;
}> {
  // Chặn ngay lập tức tại client nếu người chơi đã đầu hàng hoặc ván đấu không trọn vẹn
  if (record.isSurrendered === true || record.isCompleted === false) {
    return {
      success: false,
      isNewRecord: false,
      highScores: {},
      error: 'Ván đấu không trọn vẹn hoặc người chơi đã đầu hàng/out phòng. Không đủ điều kiện lên Bảng Vàng.',
    };
  }

  // Điều kiện tối thiểu: Độ chính xác >= 92%
  if (record.accuracy !== undefined && record.accuracy < 92) {
    return {
      success: false,
      isNewRecord: false,
      highScores: {},
      error: 'Độ chính xác tối thiểu phải từ 92% trở lên mới đủ điều kiện xét duyệt vào Bảng Vàng!',
    };
  }

  const token = getStoredAuthToken();
  if (!token) {
    return {
      success: false,
      isGuest: true,
      isNewRecord: false,
      highScores: {},
      error: 'Người chơi đang ở chế độ Khách. Kỷ lục chỉ được lưu khi đăng nhập tài khoản.',
    };
  }

  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...record, authToken: token }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        // Plain text response like "Rate exceeded." or 429
        if (text.includes('Rate exceeded') || res.status === 429) {
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 800));
            continue;
          }
          return {
            success: false,
            isNewRecord: false,
            highScores: getStoredHighScores(),
            error: 'Lưu lượng truy cập máy chủ đang cao, điểm số đã được bảo toàn trên thiết bị của bạn.',
          };
        }
        return {
          success: false,
          isNewRecord: false,
          highScores: getStoredHighScores(),
        };
      }

      if (data && typeof data === 'object') {
        return data;
      }
    } catch (err: any) {
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 800));
        continue;
      }
      if (err?.name !== 'AbortError' && !String(err?.message || '').includes('aborted')) {
        console.warn('Leaderboard submission note:', err?.message || err);
      }
    }
  }

  return { success: false, isNewRecord: false, highScores: getStoredHighScores() };
}

/**
 * Claim daily/weekly season reward
 */
export async function claimSeasonReward(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  reward?: {
    rank: number;
    title: string;
    frame: string;
    spiritStones: number;
    exp: number;
  };
  cultivation?: any;
  user?: any;
}> {
  const token = getStoredAuthToken();
  if (!token) return { success: false, error: 'Chưa đăng nhập!' };
  try {
    const res = await fetch('/api/leaderboard/claim-reward', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
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
    console.warn('Error updating leaderboard:', err);
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
    console.warn('Error resetting leaderboard:', err);
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
  getUserMeta?: () => PresenceUserMeta,
  onFriendEvent?: (event: any) => void,
  onBreakingRecord?: (record: any) => void
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
      if (meta?.deviceId) params.append('deviceId', meta.deviceId);
      if (meta?.username) params.append('username', meta.username);
      if (meta?.avatar) params.append('avatar', meta.avatar);
      if (meta?.frame) params.append('frame', meta.frame);
      if (typeof meta?.bestWpm === 'number') params.append('bestWpm', meta.bestWpm.toString());
      if (typeof meta?.totalGames === 'number') params.append('totalGames', meta.totalGames.toString());
      if (meta?.currentRoomId) params.append('currentRoomId', meta.currentRoomId);
      if (meta?.sectId) params.append('sectId', meta.sectId);
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
          if ((ev.type === 'new_chat_message' || ev.type === 'chat_message') && ev.message) {
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
          } else if (ev.type === 'breaking_record' && ev.record) {
            if (onBreakingRecord) onBreakingRecord(ev.record);
          } else if (ev.type === 'heavenly_dao_event' && ev.decree) {
            saveDaoDecree(ev.decree);
          } else if (
            ev.type === 'friend_request_received' ||
            ev.type === 'friend_request_accepted' ||
            ev.type === 'room_invite' ||
            ev.type === 'tea_gift_received' ||
            ev.type === 'mentor_guidance_received' ||
            ev.type === 'daolu_proposal_received' ||
            ev.type === 'daolu_ceremony_complete' ||
            ev.type === 'friend_requests_count' ||
            ev.type === 'friends_data_updated'
          ) {
            if (onFriendEvent) onFriendEvent(ev);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('friends_data_updated', { detail: ev }));
              if (ev.type === 'friend_request_received') {
                window.dispatchEvent(new CustomEvent('friend_request_received', { detail: ev }));
              }
              if (ev.type === 'friend_request_accepted') {
                window.dispatchEvent(new CustomEvent('friend_request_accepted', { detail: ev }));
              }
            }
          } else if (
            ev.type === 'cultivation_reward_received' ||
            ev.type === 'cultivation_level_updated' ||
            ev.type === 'frame_updated' ||
            ev.type === 'user_banned' ||
            ev.type === 'user_unbanned' ||
            ev.type === 'admin_role_updated' ||
            ev.type === 'password_reset_notice'
          ) {
            broadcastAdminEvent(ev);
          }
        } catch {
          // Ignore
        }
      };
    }
  } catch {
    // SSE fallback
  }

  // 3. Periodic Presence Ping & Heartbeat (every 2500ms)
  // Keeps session alive on server, delivers friend events and fetches up-to-date presence count
  const pingTimer = setInterval(() => {
    if (!isSubscribed) return;
    const currentMeta = getUserMeta ? getUserMeta() : undefined;
    sendPresencePing(actualTabId, actualUserId, currentMeta).then((res) => {
      if (!isSubscribed || !res) return;
      if (typeof res.count === 'number') updatePresence(res.count);
      if (typeof res.pendingFriendRequestsCount === 'number') {
        if (onFriendEvent) onFriendEvent({ type: 'friend_requests_count', count: res.pendingFriendRequestsCount });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('friend_requests_count', { detail: { count: res.pendingFriendRequestsCount } }));
          window.dispatchEvent(new CustomEvent('friends_data_updated', { detail: { type: 'friend_requests_count', count: res.pendingFriendRequestsCount } }));
        }
        if (friendsBroadcastChannel) {
          try {
            friendsBroadcastChannel.postMessage({ type: 'friend_requests_count', count: res.pendingFriendRequestsCount });
          } catch {}
        }
      }
      if (Array.isArray(res.friendEvents) && res.friendEvents.length > 0) {
        for (const ev of res.friendEvents) {
          if (
            ev.type === 'cultivation_reward_received' ||
            ev.type === 'cultivation_level_updated' ||
            ev.type === 'frame_updated' ||
            ev.type === 'user_banned' ||
            ev.type === 'user_unbanned' ||
            ev.type === 'admin_role_updated' ||
            ev.type === 'password_reset_notice'
          ) {
            broadcastAdminEvent(ev);
          } else {
            if (onFriendEvent) onFriendEvent(ev);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('friends_data_updated', { detail: ev }));
              if (ev.type === 'friend_request_received') {
                window.dispatchEvent(new CustomEvent('friend_request_received', { detail: ev }));
              }
              if (ev.type === 'friend_request_accepted') {
                window.dispatchEvent(new CustomEvent('friend_request_accepted', { detail: ev }));
              }
            }
          }
        }
      }
    });

    // Luôn chủ động kéo tin nhắn mới để đảm bảo tính thời gian thực 100% không bao giờ bị trễ/lọt tin
    fetchChatMessages('global').then((msgs) => {
      if (!isSubscribed) return;
      msgs.forEach((m) => dispatchMsg(m));
    });
  }, 2500);

  // 4. Instant refresh on Tab focus & visibility change (e.g. switching between tabs in Brave)
  const handleVisibilityOrFocus = () => {
    if (!isSubscribed) return;
    const currentMeta = getUserMeta ? getUserMeta() : undefined;
    fetchOnlineCount(actualTabId, actualUserId, currentMeta).then((count) => {
      if (isSubscribed) updatePresence(count);
    });
    fetchChatMessages('global').then((msgs) => {
      if (!isSubscribed) return;
      msgs.forEach((m) => dispatchMsg(m));
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

  // 6. BroadcastChannel & Window event subscriptions for instantaneous cross-tab synchronization
  const handleBcMessage = (event: MessageEvent) => {
    if (!isSubscribed || !event.data) return;
    if ((event.data.type === 'new_chat_message' || event.data.type === 'chat_message') && event.data.message) {
      dispatchMsg(event.data.message);
    } else if (event.data.type === 'chat_cleared') {
      processedGlobalIds.clear();
      if (onClear) onClear();
    }
  };

  const handleWindowChatMessage = (e: any) => {
    if (!isSubscribed || !e.detail) return;
    dispatchMsg(e.detail);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('new_chat_message', handleWindowChatMessage);
    window.addEventListener('room_chat_received', handleWindowChatMessage);
  }

  const handlePresenceBcMessage = (event: MessageEvent) => {
    if (!isSubscribed || !event.data) return;
    if (event.data.type === 'online_count' && typeof event.data.count === 'number') {
      if (onOnlineCount) onOnlineCount(event.data.count);
    }
  };

  const handleFriendsBcMessage = (event: MessageEvent) => {
    if (!isSubscribed || !event.data) return;
    if (
      event.data.type === 'friends_data_updated' ||
      event.data.type === 'friend_request_received' ||
      event.data.type === 'friend_request_accepted' ||
      event.data.type === 'friend_requests_count' ||
      event.data.type === 'room_invite'
    ) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('friends_data_updated', { detail: event.data }));
        if (event.data.type === 'friend_request_received') {
          window.dispatchEvent(new CustomEvent('friend_request_received', { detail: event.data }));
        }
        if (event.data.type === 'friend_request_accepted') {
          window.dispatchEvent(new CustomEvent('friend_request_accepted', { detail: event.data }));
        }
        if (event.data.type === 'room_invite') {
          window.dispatchEvent(new CustomEvent('room_invite', { detail: event.data }));
        }
      }
      if (onFriendEvent) onFriendEvent(event.data);
    }
  };

  if (chatBroadcastChannel) {
    chatBroadcastChannel.addEventListener('message', handleBcMessage);
  }
  if (presenceBroadcastChannel) {
    presenceBroadcastChannel.addEventListener('message', handlePresenceBcMessage);
  }
  if (friendsBroadcastChannel) {
    friendsBroadcastChannel.addEventListener('message', handleFriendsBcMessage);
  }

  return () => {
    isSubscribed = false;
    clearInterval(pingTimer);
    if (eventSource) {
      eventSource.close();
    }
    sendPresenceLeave(actualTabId);
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('new_chat_message', handleWindowChatMessage);
      window.removeEventListener('room_chat_received', handleWindowChatMessage);
    }
    if (chatBroadcastChannel) {
      chatBroadcastChannel.removeEventListener('message', handleBcMessage);
    }
    if (presenceBroadcastChannel) {
      presenceBroadcastChannel.removeEventListener('message', handlePresenceBcMessage);
    }
    if (friendsBroadcastChannel) {
      friendsBroadcastChannel.removeEventListener('message', handleFriendsBcMessage);
    }
  };
}

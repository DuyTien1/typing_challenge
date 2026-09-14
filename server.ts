import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { createServer as createViteServer } from 'vite';

interface Player {
  id: string;
  username: string;
  icon: string;
  frame?: string;
  bestWpm?: number;
  totalGames?: number;
  progress: number;
  wpm: number;
  score: number;
  errors: number;
  correctChars: number;
  isFinished: boolean;
  isSurrendered: boolean;
  isAFK: boolean;
  isBot?: boolean;
  botTargetWpm?: number;
  inMatch?: boolean;
}

interface GameRoom {
  id: string; // e.g. "VN-5111"
  mode: string;
  hostId: string;
  hostName: string;
  isQuickRoom: boolean;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
  lastActive: number;
  players: Player[];
  difficulty?: string;
  maxSlots: number;
  words?: string[];
  mysteryWords?: any[];
}

function normalizeRoomCode(input: string): string {
  if (!input) return '';
  let cleaned = input.trim().toUpperCase();

  cleaned = cleaned.replace(/^(MÃ\s*PHÒNG|MA\s*PHONG|PHÒNG|PHONG|ROOM|CODE|MÃ|MA)[:\s]*/i, '').trim();
  cleaned = cleaned.replace(/^#+/, '').trim();
  cleaned = cleaned.replace(/#/g, '').trim();

  if (!cleaned) return '';

  const matchVn = cleaned.match(/^VN[-_\s]*(\d+)/i);
  if (matchVn) {
    return `VN-${matchVn[1]}`;
  }

  const matchDigits = cleaned.match(/^(\d+)$/);
  if (matchDigits) {
    return `VN-${matchDigits[1]}`;
  }

  if (cleaned.startsWith('VN-')) {
    return cleaned;
  }

  if (cleaned.startsWith('VN')) {
    const rest = cleaned.slice(2).replace(/^[-_\s]+/, '');
    return `VN-${rest}`;
  }

  return `VN-${cleaned}`;
}

function getModeDisplayName(mode: string): string {
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

// In-memory rooms store
const rooms = new Map<string, GameRoom>();
const sseClientsByRoom = new Map<string, Set<express.Response>>();

interface ServerChatMessage {
  id: string;
  username: string;
  avatar?: string;
  frame?: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
  channel: 'global' | 'room';
  roomId?: string;
  isAdmin?: boolean;
}

const globalChatMessages: ServerChatMessage[] = [
  {
    id: 'sys-welcome',
    username: 'Hệ Thống',
    avatar: '🤖',
    frame: 'admin_gold',
    message: 'Chào mừng bạn đến với FastTyping Challenge v4.0! Hãy rèn luyện và xác lập kỷ lục mới trên Bảng Vàng.',
    timestamp: Date.now(),
    isSystem: true,
    channel: 'global',
  },
];

const roomChatMessages = new Map<string, ServerChatMessage[]>();

// Real Leaderboard Storage (Persistent to leaderboard.json)
export interface ServerHighScoreRecord {
  username: string;
  wpm: number;
  score: number;
  errors: number;
  timestamp: number;
  avatar?: string;
  frame?: string;
}

const LEADERBOARD_FILE = path.join(process.cwd(), 'leaderboard.json');

function loadLeaderboardFromFile(): Record<string, ServerHighScoreRecord | null> {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const content = fs.readFileSync(LEADERBOARD_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (data && typeof data === 'object') {
        const clean: Record<string, ServerHighScoreRecord | null> = {
          vi_dau: null,
          vi_nodau: null,
          en: null,
          numpad: null,
          ngau_hung: null,
          doan_chu: null,
          san_boss: null,
        };
        const mockNames = new Set(['GiaCátGõ', 'LướtGió', 'QuickFox', 'KếToánViên', 'ChớpNhoáng', 'ThámTửPhím', 'DũngSĩRồng', 'PhímThần_VN']);
        for (const [key, value] of Object.entries(data)) {
          const rec = value as ServerHighScoreRecord | null;
          if (rec && typeof rec === 'object' && rec.username && !mockNames.has(rec.username.trim())) {
            clean[key] = rec;
          }
        }
        return clean;
      }
    }
  } catch (err) {
    console.error('Error reading leaderboard file:', err);
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

let serverHighScores = loadLeaderboardFromFile();

function saveLeaderboardToFile() {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(serverHighScores, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving leaderboard file:', err);
  }
}

// Presence and SSE Client Tracking with multi-layer heartbeat & session management
interface PresenceSession {
  tabId: string;
  userId: string;
  lastSeen: number;
}

const activePresenceSessions = new Map<string, PresenceSession>(); // tabId -> session
const sseGlobalClients = new Map<express.Response, string>(); // res -> tabId
const sseGlobalChatClients = new Set<express.Response>();

function cleanStaleSessions(): boolean {
  const now = Date.now();
  const TIMEOUT_MS = 10000; // Tab considered inactive after 10s without ping or stream
  let removed = false;
  for (const [tabId, session] of activePresenceSessions.entries()) {
    if (now - session.lastSeen > TIMEOUT_MS) {
      activePresenceSessions.delete(tabId);
      removed = true;
    }
  }
  return removed;
}

function getRealOnlineCount(): number {
  cleanStaleSessions();
  const activeTabs = new Set<string>();
  for (const [tabId] of activePresenceSessions.entries()) {
    activeTabs.add(tabId);
  }
  for (const [, tabId] of sseGlobalClients.entries()) {
    if (tabId) {
      activeTabs.add(tabId);
    }
  }
  return Math.max(1, activeTabs.size);
}

function registerPresence(tabId: string, userId?: string) {
  if (!tabId) return;
  const prevCount = getRealOnlineCount();
  activePresenceSessions.set(tabId, {
    tabId,
    userId: userId || tabId,
    lastSeen: Date.now(),
  });
  const newCount = getRealOnlineCount();
  if (newCount !== prevCount) {
    broadcastOnlinePresence();
  }
}

function removePresence(tabId: string) {
  if (!tabId) return;
  const prevCount = getRealOnlineCount();
  activePresenceSessions.delete(tabId);
  const newCount = getRealOnlineCount();
  if (newCount !== prevCount) {
    broadcastOnlinePresence();
  }
}

function broadcastOnlinePresence() {
  const count = getRealOnlineCount();
  const payload = `data: ${JSON.stringify({ type: 'online_count', count })}\n\n`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      client.write(payload);
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
    }
  }
}

// Background cleanup check every 4 seconds
setInterval(() => {
  const countBefore = getRealOnlineCount();
  const removed = cleanStaleSessions();
  const countAfter = getRealOnlineCount();
  if (removed && countBefore !== countAfter) {
    broadcastOnlinePresence();
  }
}, 4000);

function broadcastLeaderboard() {
  const payload = `data: ${JSON.stringify({ type: 'leaderboard_updated', highScores: serverHighScores })}\n\n`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      client.write(payload);
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
    }
  }
}

function broadcastGlobalChat(msg: ServerChatMessage) {
  const payload = `data: ${JSON.stringify({ type: 'new_chat_message', message: msg })}\n\n`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      client.write(payload);
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
    }
  }
}

function broadcastGlobalChatClear() {
  const payload = `data: ${JSON.stringify({ type: 'chat_cleared' })}\n\n`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      client.write(payload);
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
    }
  }
}

function generateUniqueRoomCode(): string {
  for (let i = 0; i < 200; i++) {
    const num = Math.floor(1000 + Math.random() * 9000);
    const code = `VN-${num}`;
    if (!rooms.has(code)) {
      return code;
    }
  }
  return `VN-${Date.now().toString().slice(-4)}`;
}

function cleanupInactiveRooms() {
  const now = Date.now();
  for (const [id, room] of rooms.entries()) {
    if (now - (room.lastActive || room.createdAt) > 30 * 60 * 1000) {
      rooms.delete(id);
      broadcastToRoom(id, { type: 'room_closed', roomId: id });
    }
  }
}
setInterval(cleanupInactiveRooms, 60 * 1000);

function broadcastToRoom(roomId: string, event: any) {
  const normId = normalizeRoomCode(roomId);
  const clients = sseClientsByRoom.get(normId);
  if (!clients || clients.size === 0) return;

  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of Array.from(clients)) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size });
  });

  // Get all active rooms
  app.get('/api/rooms', (_req, res) => {
    cleanupInactiveRooms();
    const list = Array.from(rooms.values()).filter((r) => r.status !== 'finished');
    res.json({ success: true, rooms: list });
  });

  // Get specific room by code
  app.get('/api/rooms/:id', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }
    res.json({ success: true, room });
  });

  // Create new room
  app.post('/api/rooms', (req, res) => {
    const { mode, host, isQuickRoom = false, difficulty } = req.body;
    if (!mode || !host) {
      res.status(400).json({ success: false, error: 'Thiếu thông tin người chơi hoặc chế độ chơi.' });
      return;
    }

    const code = generateUniqueRoomCode();
    const hostPlayer: Player = {
      ...host,
      isBot: false,
      progress: 0,
      wpm: 0,
      score: 0,
      errors: 0,
      correctChars: 0,
      isFinished: false,
      isSurrendered: false,
      isAFK: false,
    };

    const newRoom: GameRoom = {
      id: code,
      mode,
      hostId: host.id,
      hostName: host.username,
      isQuickRoom: Boolean(isQuickRoom),
      status: 'waiting',
      createdAt: Date.now(),
      lastActive: Date.now(),
      players: [hostPlayer],
      difficulty,
      maxSlots: 8,
    };

    rooms.set(code, newRoom);
    broadcastToRoom(code, { type: 'room_updated', room: newRoom });

    res.json({ success: true, room: newRoom, isHost: true });
  });

  // Join room by code
  app.post('/api/rooms/join', (req, res) => {
    const { rawCode, player, currentMode } = req.body;
    if (!rawCode || !player) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập mã phòng hợp lệ.' });
      return;
    }

    const normCode = normalizeRoomCode(rawCode);
    const room = rooms.get(normCode);

    if (!room) {
      res.json({
        success: false,
        error: `Không tìm thấy phòng với mã "${normCode}". Vui lòng kiểm tra lại mã phòng (chủ phòng có thể đã rời hoặc đóng phòng)!`,
      });
      return;
    }

    // 1. Kiểm tra chế độ chơi
    if (room.mode !== currentMode) {
      res.json({
        success: false,
        error: `Mã phòng ${room.id} thuộc chế độ "${getModeDisplayName(
          room.mode
        )}", khác với chế độ "${getModeDisplayName(
          currentMode
        )}" bạn đang chọn. Vui lòng chuyển sang chế độ "${getModeDisplayName(
          room.mode
        )}" để cùng tham gia thi đấu!`,
      });
      return;
    }

    // 2. Kiểm tra trạng thái
    if (room.status === 'playing') {
      res.json({
        success: false,
        error: `Phòng ${room.id} hiện đang trong trận đấu. Không thể tham gia lúc này!`,
      });
      return;
    }

    if (room.status === 'finished') {
      res.json({
        success: false,
        error: `Phòng ${room.id} đã kết thúc. Vui lòng tạo phòng mới hoặc vào phòng khác!`,
      });
      return;
    }

    // 3. Kiểm tra số lượng
    const existingIndex = room.players.findIndex((p) => p.id === player.id);
    if (existingIndex === -1 && room.players.length >= room.maxSlots) {
      res.json({
        success: false,
        error: `Phòng ${room.id} đã đủ số lượng (${room.players.length}/${room.maxSlots} người chơi). Không thể tham gia thêm!`,
      });
      return;
    }

    const guestPlayer: Player = {
      ...player,
      isBot: false,
      progress: 0,
      wpm: 0,
      score: 0,
      errors: 0,
      correctChars: 0,
      isFinished: false,
      isSurrendered: false,
      isAFK: false,
    };

    if (existingIndex >= 0) {
      room.players[existingIndex] = {
        ...room.players[existingIndex],
        ...guestPlayer,
      };
    } else {
      room.players.push(guestPlayer);
    }

    room.lastActive = Date.now();
    rooms.set(normCode, room);

    broadcastToRoom(normCode, { type: 'room_updated', room });

    res.json({
      success: true,
      room,
      isHost: room.hostId === player.id,
    });
  });

  // Quick Join or Create Room
  app.post('/api/rooms/quick-join', (req, res) => {
    const { mode, player, difficulty } = req.body;
    if (!mode || !player) {
      res.status(400).json({ success: false, error: 'Thiếu thông tin người chơi hoặc chế độ.' });
      return;
    }

    cleanupInactiveRooms();
    const now = Date.now();

    // Find candidate quick room
    const candidateRooms = Array.from(rooms.values())
      .filter((r) => {
        return (
          r.mode === mode &&
          r.isQuickRoom === true &&
          r.status === 'waiting' &&
          r.players.length < r.maxSlots &&
          r.players.some((p) => !p.isBot) &&
          now - (r.lastActive || r.createdAt) < 15 * 60 * 1000
        );
      })
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    if (candidateRooms.length > 0) {
      const matchedRoom = candidateRooms[0];
      const existingIdx = matchedRoom.players.findIndex((p) => p.id === player.id);

      const freshPlayer: Player = {
        ...player,
        isBot: false,
        progress: 0,
        wpm: 0,
        score: 0,
        errors: 0,
        correctChars: 0,
        isFinished: false,
        isSurrendered: false,
        isAFK: false,
      };

      if (existingIdx >= 0) {
        matchedRoom.players[existingIdx] = {
          ...matchedRoom.players[existingIdx],
          ...freshPlayer,
        };
      } else {
        matchedRoom.players.push(freshPlayer);
      }

      matchedRoom.lastActive = now;
      rooms.set(matchedRoom.id, matchedRoom);

      broadcastToRoom(matchedRoom.id, { type: 'room_updated', room: matchedRoom });

      res.json({
        success: true,
        room: matchedRoom,
        isHost: matchedRoom.hostId === player.id,
        isNewlyCreated: false,
      });
      return;
    }

    // No waiting quick room available, create a fresh one
    const code = generateUniqueRoomCode();
    const hostPlayer: Player = {
      ...player,
      isBot: false,
      progress: 0,
      wpm: 0,
      score: 0,
      errors: 0,
      correctChars: 0,
      isFinished: false,
      isSurrendered: false,
      isAFK: false,
    };

    const newQuickRoom: GameRoom = {
      id: code,
      mode,
      hostId: player.id,
      hostName: player.username,
      isQuickRoom: true,
      status: 'waiting',
      createdAt: now,
      lastActive: now,
      players: [hostPlayer],
      difficulty,
      maxSlots: 8,
    };

    rooms.set(code, newQuickRoom);
    broadcastToRoom(code, { type: 'room_updated', room: newQuickRoom });

    res.json({
      success: true,
      room: newQuickRoom,
      isHost: true,
      isNewlyCreated: true,
    });
  });

  // Update players list (add/remove bot)
  app.post('/api/rooms/:id/players', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const { players } = req.body;
    if (Array.isArray(players)) {
      room.players = players;
      room.lastActive = Date.now();
      rooms.set(norm, room);
      broadcastToRoom(norm, { type: 'room_updated', room });
    }

    res.json({ success: true, room });
  });

  // Update room status (waiting / playing / finished + synchronize words)
  app.post('/api/rooms/:id/status', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const { status, mode, words, mysteryWords } = req.body;
    room.status = status;
    room.lastActive = Date.now();
    if (words) room.words = words;
    if (mysteryWords) room.mysteryWords = mysteryWords;
    if (mode) room.mode = mode;

    if (status === 'playing') {
      // Khi bắt đầu: tất cả người chơi trong phòng được đánh dấu inMatch = true (avatar xám)
      room.players.forEach((p) => {
        p.inMatch = true;
        p.isSurrendered = false;
        p.isFinished = false;
        p.progress = 0;
      });
    } else if (status === 'waiting') {
      // Khi trở về phòng chờ: tắt inMatch (avatar sáng lên)
      room.players.forEach((p) => {
        p.inMatch = false;
        p.isSurrendered = false;
        p.isFinished = false;
        p.progress = 0;
      });
    }

    rooms.set(norm, room);

    if (status === 'playing') {
      broadcastToRoom(norm, {
        type: 'room_started',
        roomId: norm,
        mode: room.mode,
        words: room.words,
        mysteryWords: room.mysteryWords,
        room,
      });
    } else {
      broadcastToRoom(norm, { type: 'room_updated', room });
    }

    res.json({ success: true, room });
  });

  // Update specific player status in room (e.g. surrender and return to waiting room -> inMatch: false)
  app.post('/api/rooms/:id/player-status', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const { playerId, inMatch, isSurrendered, isFinished } = req.body;
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      if (typeof inMatch === 'boolean') player.inMatch = inMatch;
      if (typeof isSurrendered === 'boolean') player.isSurrendered = isSurrendered;
      if (typeof isFinished === 'boolean') player.isFinished = isFinished;
      room.lastActive = Date.now();
      rooms.set(norm, room);
      broadcastToRoom(norm, { type: 'room_updated', room });
    }

    res.json({ success: true, room });
  });

  // Live in-game player progress sync
  app.post('/api/rooms/:id/player-progress', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const { playerId, progress, correctChars, errors, wpm, isFinished } = req.body;
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.progress = progress;
      player.correctChars = correctChars;
      player.errors = errors;
      player.wpm = wpm;
      if (typeof isFinished === 'boolean') {
        player.isFinished = isFinished;
      }
      room.lastActive = Date.now();
      broadcastToRoom(norm, {
        type: 'player_progress',
        roomId: norm,
        playerId,
        progress,
        correctChars,
        errors,
        wpm,
        isFinished: player.isFinished,
        players: room.players,
      });
    }

    res.json({ success: true });
  });

  // Leave room: Xóa người chơi khỏi phòng chờ, nếu chủ phòng rời/bị xóa thì slot kế tiếp được đôn lên làm chủ phòng
  app.post('/api/rooms/:id/leave', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.json({ success: true });
      return;
    }

    const { playerId } = req.body;
    const wasHost = room.hostId === playerId;
    room.players = room.players.filter((p) => p.id !== playerId);

    const humanPlayers = room.players.filter((p) => !p.isBot);
    if (humanPlayers.length === 0) {
      rooms.delete(norm);
      broadcastToRoom(norm, { type: 'room_closed', roomId: norm });
    } else {
      if (wasHost) {
        // Slot kế tiếp trong danh sách người chơi thực được đôn lên làm chủ phòng
        const nextHost = humanPlayers[0];
        room.hostId = nextHost.id;
        room.hostName = nextHost.username;
      }
      room.lastActive = Date.now();
      rooms.set(norm, room);
      broadcastToRoom(norm, { type: 'room_updated', room });
    }

    res.json({ success: true, room });
  });

  // SSE Stream for realtime room synchronization
  app.get('/api/rooms/:id/stream', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let clientSet = sseClientsByRoom.get(norm);
    if (!clientSet) {
      clientSet = new Set();
      sseClientsByRoom.set(norm, clientSet);
    }
    clientSet.add(res);

    // Send current room state immediately
    const room = rooms.get(norm);
    if (room) {
      res.write(`data: ${JSON.stringify({ type: 'room_updated', room })}\n\n`);
      const existingMsgs = roomChatMessages.get(norm) || [];
      if (existingMsgs.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'init_room_chat', roomId: norm, messages: existingMsgs })}\n\n`);
      }
    }

    // Keep-alive heartbeat every 15s
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clientSet?.delete(res);
      if (clientSet && clientSet.size === 0) {
        sseClientsByRoom.delete(norm);
      }
    });
  });

  // GET /api/chat/messages: Fetch chat messages for global or specific room
  app.get('/api/chat/messages', (req, res) => {
    const channel = req.query.channel === 'room' ? 'room' : 'global';
    const roomId = req.query.roomId ? normalizeRoomCode(String(req.query.roomId)) : '';
    if (channel === 'room' && roomId) {
      const msgs = roomChatMessages.get(roomId) || [];
      res.json({ success: true, messages: msgs });
      return;
    }
    res.json({ success: true, messages: globalChatMessages });
  });

  // POST /api/chat/messages: Broadcast new chat message to global or room
  app.post('/api/chat/messages', (req, res) => {
    const { username, avatar, frame, message, channel, roomId, isAdmin } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ success: false, error: 'Tin nhắn không được để trống' });
      return;
    }

    const targetChannel = channel === 'room' ? 'room' : 'global';
    const normRoomId = roomId ? normalizeRoomCode(String(roomId)) : undefined;
    const msgId = (typeof req.body.id === 'string' && req.body.id.trim())
      ? req.body.id.trim()
      : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newMsg: ServerChatMessage = {
      id: msgId,
      username: String(username || 'Vô Danh').trim().slice(0, 30),
      avatar: avatar || '⚡',
      frame: frame || 'default',
      message: message.trim().slice(0, 400),
      timestamp: Date.now(),
      channel: targetChannel,
      roomId: normRoomId,
      isAdmin: Boolean(isAdmin),
    };

    if (targetChannel === 'global') {
      globalChatMessages.push(newMsg);
      if (globalChatMessages.length > 200) globalChatMessages.shift();
      broadcastGlobalChat(newMsg);
    } else if (normRoomId) {
      let list = roomChatMessages.get(normRoomId);
      if (!list) {
        list = [];
        roomChatMessages.set(normRoomId, list);
      }
      list.push(newMsg);
      if (list.length > 150) list.shift();

      // Broadcast to room participants via room SSE stream
      broadcastToRoom(normRoomId, { type: 'chat_message', message: newMsg });
    }

    res.json({ success: true, message: newMsg });
  });

  // GET /api/online-count: Get exact real-time active online users
  app.get('/api/online-count', (req, res) => {
    const tabId = String(req.query.tabId || '').trim();
    const userId = String(req.query.userId || '').trim();
    if (tabId) {
      registerPresence(tabId, userId);
    }
    res.json({ success: true, count: getRealOnlineCount() });
  });

  // POST or GET /api/presence/ping: Heartbeat ping from any active tab
  app.all('/api/presence/ping', (req, res) => {
    const tabId = String(req.query.tabId || req.body?.tabId || '').trim();
    const userId = String(req.query.userId || req.body?.userId || '').trim();
    if (tabId) {
      registerPresence(tabId, userId);
    }
    res.json({ success: true, count: getRealOnlineCount() });
  });

  // POST or GET /api/presence/leave: Beacon sent when a tab unloads/closes
  app.all('/api/presence/leave', (req, res) => {
    const tabId = String(req.query.tabId || req.body?.tabId || '').trim();
    if (tabId) {
      removePresence(tabId);
    }
    res.json({ success: true, count: getRealOnlineCount() });
  });

  // GET /api/leaderboard: Get real server-wide high scores
  app.get('/api/leaderboard', (_req, res) => {
    res.json({ success: true, highScores: serverHighScores });
  });

  // POST /api/leaderboard: Submit real score achieved by player
  app.post('/api/leaderboard', (req, res) => {
    const { mode, username, wpm = 0, score = 0, errors = 0, avatar, frame } = req.body;
    const validModes = ['vi_dau', 'vi_nodau', 'en', 'numpad', 'ngau_hung', 'doan_chu', 'san_boss'];
    if (!mode || !validModes.includes(mode) || !username) {
      res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
      return;
    }

    const cleanUsername = String(username).trim().slice(0, 30);
    const numWpm = Math.max(0, Math.round(Number(wpm) || 0));
    const numScore = Math.max(0, Math.round(Number(score) || 0));
    const numErrors = Math.max(0, Math.round(Number(errors) || 0));

    const currentRecord = serverHighScores[mode];
    let isBetter = false;

    if (mode === 'ngau_hung' || mode === 'doan_chu' || mode === 'san_boss') {
      // Points or damage based
      if (!currentRecord) {
        isBetter = numScore > 0;
      } else {
        isBetter = numScore > currentRecord.score || (numScore === currentRecord.score && numErrors < currentRecord.errors);
      }
    } else {
      // WPM speed based
      if (!currentRecord) {
        isBetter = numWpm > 0;
      } else {
        isBetter = numWpm > currentRecord.wpm || (numWpm === currentRecord.wpm && numErrors < currentRecord.errors);
      }
    }

    if (isBetter) {
      serverHighScores[mode] = {
        username: cleanUsername,
        wpm: numWpm,
        score: numScore,
        errors: numErrors,
        timestamp: Date.now(),
        avatar: avatar || '⚡',
        frame: frame || 'default',
      };
      saveLeaderboardToFile();
      broadcastLeaderboard();
      res.json({ success: true, isNewRecord: true, highScores: serverHighScores });
      return;
    }

    res.json({ success: true, isNewRecord: false, highScores: serverHighScores });
  });

  // POST /api/leaderboard/admin-update: Admin updates high scores
  app.post('/api/leaderboard/admin-update', (req, res) => {
    const { highScores } = req.body;
    if (highScores && typeof highScores === 'object') {
      serverHighScores = { ...serverHighScores, ...highScores };
      saveLeaderboardToFile();
      broadcastLeaderboard();
      res.json({ success: true, highScores: serverHighScores });
      return;
    }
    res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
  });

  // POST /api/leaderboard/reset: Reset leaderboard to clean state
  app.post('/api/leaderboard/reset', (_req, res) => {
    serverHighScores = {
      vi_dau: null,
      vi_nodau: null,
      en: null,
      numpad: null,
      ngau_hung: null,
      doan_chu: null,
      san_boss: null,
    };
    saveLeaderboardToFile();
    broadcastLeaderboard();
    res.json({ success: true, highScores: serverHighScores });
  });

  // GET /api/chat/stream: SSE real-time stream for global chat, presence, and leaderboard
  app.get('/api/chat/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const tabId = req.query.tabId
      ? String(req.query.tabId).trim()
      : (req.query.userId ? String(req.query.userId).trim() : `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    const userId = req.query.userId
      ? String(req.query.userId).trim()
      : `guest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    registerPresence(tabId, userId);
    sseGlobalClients.set(res, tabId);
    sseGlobalChatClients.add(res);

    // Initial sync of chat messages, real online count, and leaderboard
    res.write(`data: ${JSON.stringify({ type: 'init_chat', messages: globalChatMessages })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'online_count', count: getRealOnlineCount() })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'leaderboard_updated', highScores: serverHighScores })}\n\n`);

    // Broadcast presence update to all connected users
    broadcastOnlinePresence();

    const heartbeat = setInterval(() => {
      try {
        registerPresence(tabId, userId);
        res.write(': heartbeat\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 6000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseGlobalChatClients.delete(res);
      sseGlobalClients.delete(res);
      removePresence(tabId);
      broadcastOnlinePresence();
    });
  });

  // POST /api/chat/clear: Clear global chat (admin action)
  app.post('/api/chat/clear', (_req, res) => {
    globalChatMessages.length = 0;
    broadcastGlobalChatClear();
    res.json({ success: true });
  });

  const httpServer = http.createServer(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

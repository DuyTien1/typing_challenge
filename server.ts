import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

import {
  Player,
  GameRoom,
  ServerChatMessage,
  ServerHighScoreRecord,
  ServerUserRecord,
  ActivePresenceSession,
} from './server/types';
import { normalizeRoomCode, getModeDisplayName, hashPassword } from './server/utils';

// In-memory rooms store
const rooms = new Map<string, GameRoom>();
const sseClientsByRoom = new Map<string, Set<express.Response>>();

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
            clean[key] = {
              ...rec,
              displayName: rec.displayName || rec.username,
            };
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

// User Account Storage (Persistent to users.json - no external database required)
const USERS_FILE = path.join(process.cwd(), 'users.json');

function ensureDefaultAdminUser(map: Map<string, ServerUserRecord>): boolean {
  let adminUser: ServerUserRecord | undefined;
  for (const u of map.values()) {
    if (u.username.toLowerCase() === 'admin' || u.id === 'usr_admin_default') {
      adminUser = u;
      break;
    }
  }

  if (!adminUser) {
    const salt = 'f8a7e4b2c1d3e5f60718293a4b5c6d7e';
    const passwordHash = hashPassword('admin123', salt);
    const newAdmin: ServerUserRecord = {
      id: 'usr_admin_default',
      email: '',
      username: 'admin',
      displayName: 'Admin',
      avatar: '👑',
      frame: 'admin_gold',
      isAdmin: true,
      authProvider: 'email',
      passwordHash,
      salt,
      isVerified: true,
      sessionTokens: [],
      showcaseAchievements: ['speed_100', 'pve_boss_win', 'pvp_first_win', 'hidden_top1'],
      unlockedAchievements: [
        'speed_40', 'speed_60', 'speed_80', 'speed_100', 'speed_120', 'speed_140', 'speed_160',
        'acc_95', 'acc_98', 'acc_100_once', 'acc_100_3x', 'acc_100_10x',
        'matches_10', 'matches_30', 'matches_75', 'matches_150', 'matches_300', 'matches_500',
        'pve_boss_win', 'pve_boss_hell', 'pve_mystery_word', 'pve_rush_high', 'pve_outplay_beat',
        'numpad_intro', 'numpad_50', 'numpad_75', 'numpad_100',
        'pvp_first_win', 'pvp_streak_3', 'pvp_streak_5', 'pvp_streak_10',
        'hidden_night', 'hidden_midnight', 'hidden_verified_dao', 'hidden_top1'
      ],
      createdAt: 1700000000000,
      updatedAt: Date.now(),
    };
    map.set(newAdmin.id, newAdmin);
    return true;
  } else {
    // Ensure admin flags are set
    adminUser.isAdmin = true;
    if (!adminUser.displayName) {
      adminUser.displayName = 'Admin';
    }
    if (!adminUser.frame || adminUser.frame === 'default') {
      adminUser.frame = 'admin_gold';
    }
    // Clean up legacy invalid achievement IDs from existing admin record
    const legacyInvalid = new Set(['god_speed', 'boss_slayer', 'mythic_master', 'first_win', 'streak_3']);
    if (Array.isArray(adminUser.showcaseAchievements)) {
      adminUser.showcaseAchievements = adminUser.showcaseAchievements.filter((id) => !legacyInvalid.has(id));
      if (adminUser.showcaseAchievements.length === 0) {
        adminUser.showcaseAchievements = ['speed_100', 'pve_boss_win', 'pvp_first_win', 'hidden_top1'];
      }
    }
    if (Array.isArray(adminUser.unlockedAchievements)) {
      adminUser.unlockedAchievements = adminUser.unlockedAchievements.filter((id) => !legacyInvalid.has(id));
      if (adminUser.unlockedAchievements.length < 5) {
        adminUser.unlockedAchievements = [
          'speed_40', 'speed_60', 'speed_80', 'speed_100', 'speed_120', 'speed_140', 'speed_160',
          'acc_95', 'acc_98', 'acc_100_once', 'acc_100_3x', 'acc_100_10x',
          'matches_10', 'matches_30', 'matches_75', 'matches_150', 'matches_300', 'matches_500',
          'pve_boss_win', 'pve_boss_hell', 'pve_mystery_word', 'pve_rush_high', 'pve_outplay_beat',
          'numpad_intro', 'numpad_50', 'numpad_75', 'numpad_100',
          'pvp_first_win', 'pvp_streak_3', 'pvp_streak_5', 'pvp_streak_10',
          'hidden_night', 'hidden_midnight', 'hidden_verified_dao', 'hidden_top1'
        ];
      }
    }
    return false;
  }
}

function loadUsersFromFile(): Map<string, ServerUserRecord> {
  const map = new Map<string, ServerUserRecord>();
  let needsSave = false;
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        for (const u of data) {
          if (u && u.id) {
            if (!u.displayName) {
              u.displayName = u.username;
              needsSave = true;
            }
            map.set(u.id, u);
          }
        }
      } else if (data && typeof data === 'object') {
        for (const [id, u] of Object.entries(data)) {
          if (u && typeof u === 'object') {
            const rec = u as ServerUserRecord;
            if (!rec.displayName) {
              rec.displayName = rec.username;
              needsSave = true;
            }
            map.set(id, rec);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error reading users.json:', err);
  }

  const added = ensureDefaultAdminUser(map);
  if (added || needsSave) {
    try {
      const obj: Record<string, ServerUserRecord> = {};
      for (const [id, u] of map.entries()) {
        obj[id] = u;
      }
      fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  return map;
}

const serverUsers = loadUsersFromFile();

function saveUsersToFile() {
  try {
    const obj: Record<string, ServerUserRecord> = {};
    for (const [id, u] of serverUsers.entries()) {
      obj[id] = u;
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving users.json:', err);
  }
}

function getUserByToken(rawToken?: string): ServerUserRecord | null {
  if (!rawToken) return null;
  const cleanToken = rawToken.replace(/^Bearer\s+/i, '').trim();
  if (!cleanToken) return null;
  for (const user of serverUsers.values()) {
    if (user.sessionTokens && user.sessionTokens.includes(cleanToken)) {
      return user;
    }
  }
  return null;
}

function getUserByEmail(email?: string): ServerUserRecord | null {
  if (!email) return null;
  const lower = email.trim().toLowerCase();
  for (const user of serverUsers.values()) {
    if (user.email.toLowerCase() === lower) {
      return user;
    }
  }
  return null;
}

function getUserByUsername(username?: string): ServerUserRecord | null {
  if (!username) return null;
  const lower = username.trim().toLowerCase();
  for (const user of serverUsers.values()) {
    if (user.username && user.username.trim().toLowerCase() === lower) {
      return user;
    }
  }
  return null;
}

function getUserByUsernameOrEmail(identifier?: string): ServerUserRecord | null {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  for (const user of serverUsers.values()) {
    if (
      (user.username && user.username.toLowerCase() === clean) ||
      (user.email && user.email.toLowerCase() === clean)
    ) {
      return user;
    }
  }
  return null;
}

function sanitizeUser(u: ServerUserRecord) {
  return {
    id: u.id,
    email: u.email || '',
    username: u.username, // Tên đăng nhập cố định (dùng để đăng nhập)
    displayName: u.displayName || u.username, // Tên người chơi hiển thị trong game
    avatar: u.avatar,
    frame: u.frame,
    isAdmin: Boolean(u.isAdmin || u.username.toLowerCase() === 'admin'),
    showcaseAchievements: u.showcaseAchievements || [],
    unlockedAchievements: u.unlockedAchievements || [],
    isVerified: u.isVerified,
    authProvider: u.authProvider,
    cultivation: u.cultivation || null,
    bestWpm: u.bestWpm || 0,
    bestWpmRecord: u.bestWpmRecord || null,
    totalGames: u.totalGames || 0,
    matchHistory: u.matchHistory || [],
    createdAt: u.createdAt,
  };
}

function decodeGoogleJwt(credential: string): { sub: string; email: string; email_verified?: boolean; name?: string; picture?: string } | null {
  try {
    const parts = credential.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// Presence and SSE Client Tracking with multi-layer heartbeat & session management
export interface PresenceSession {
  tabId: string;
  userId: string;
  deviceId?: string;
  username: string;
  avatar: string;
  frame?: string;
  bestWpm?: number;
  bestWpmRecord?: {
    wpm: number;
    mode: string;
    modeName: string;
    timestamp: number;
  };
  totalGames?: number;
  currentRoomId?: string | null;
  currentMode?: string | null;
  status: 'lobby' | 'waiting_room' | 'playing' | 'outplay' | 'gameover';
  isAdmin?: boolean;
  ip?: string;
  browser?: string;
  device?: string;
  connectedAt: number;
  lastSeen: number;
}

const activePresenceSessions = new Map<string, PresenceSession>(); // tabId -> session
const sseGlobalClients = new Map<express.Response, string>(); // res -> tabId
const sseGlobalChatClients = new Set<express.Response>();

function parseUserAgent(ua?: string): { browser: string; device: string } {
  if (!ua) return { browser: 'Web Browser', device: 'Desktop' };
  let device = 'Desktop';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) {
    device = 'Mobile';
  } else if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) {
    device = 'Tablet';
  }

  let browser = 'Web Browser';
  if (/edg\//i.test(ua)) {
    browser = 'Edge';
  } else if (/opr\/|opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/chrome|crios/i.test(ua)) {
    browser = 'Chrome';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/safari/i.test(ua)) {
    browser = 'Safari';
  }
  return { browser, device };
}

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

function extractSessionMetaFromReq(req: express.Request) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const query = req.query || {};

  const username = String(body.username || query.username || '').trim();
  const avatar = String(body.avatar || query.avatar || '').trim();
  const frame = String(body.frame || query.frame || '').trim();
  const deviceId = String(body.deviceId || query.deviceId || '').trim();
  const rawBestWpm = body.bestWpm !== undefined ? body.bestWpm : query.bestWpm;
  const rawTotalGames = body.totalGames !== undefined ? body.totalGames : query.totalGames;
  const bestWpm = rawBestWpm !== undefined ? Number(rawBestWpm) : undefined;
  let bestWpmRecord = body.bestWpmRecord;
  if (!bestWpmRecord && query.bestWpmRecord) {
    try {
      bestWpmRecord = JSON.parse(String(query.bestWpmRecord));
    } catch {}
  }
  const totalGames = rawTotalGames !== undefined ? Number(rawTotalGames) : undefined;
  const currentRoomId = body.currentRoomId !== undefined ? String(body.currentRoomId).trim() : (query.currentRoomId !== undefined ? String(query.currentRoomId).trim() : undefined);
  const currentMode = body.currentMode !== undefined ? String(body.currentMode).trim() : (query.currentMode !== undefined ? String(query.currentMode).trim() : undefined);
  const rawStatus = String(body.status || query.status || '').trim();
  const isAdmin = body.isAdmin === true || body.isAdmin === 'true' || query.isAdmin === 'true';

  const ua = String(req.headers['user-agent'] || '');
  const { browser, device } = parseUserAgent(ua);
  const ip = getClientIp(req);

  return {
    username: username || undefined,
    avatar: avatar || undefined,
    frame: frame || undefined,
    deviceId: deviceId || undefined,
    bestWpm: bestWpm !== undefined && !isNaN(bestWpm) ? bestWpm : undefined,
    bestWpmRecord: bestWpmRecord && typeof bestWpmRecord === 'object' ? bestWpmRecord : undefined,
    totalGames: totalGames !== undefined && !isNaN(totalGames) ? totalGames : undefined,
    currentRoomId: currentRoomId !== undefined ? (currentRoomId || null) : undefined,
    currentMode: currentMode !== undefined ? (currentMode || null) : undefined,
    status: (['lobby', 'waiting_room', 'playing', 'outplay', 'gameover'].includes(rawStatus) ? rawStatus : undefined) as
      | 'lobby'
      | 'waiting_room'
      | 'playing'
      | 'outplay'
      | 'gameover'
      | undefined,
    isAdmin,
    ip,
    browser,
    device,
  };
}

// Get unique identifier for a human player across multiple tabs
function getUniqueUserKey(session: PresenceSession): string {
  // 1. Registered / Logged in username (not generic guest prefix)
  if (session.username && session.username !== 'Khách' && !session.username.startsWith('Khách ')) {
    return `user_${session.username.toLowerCase().trim()}`;
  }
  // 2. Persistent device ID across all tabs of the same browser
  if (session.deviceId && session.deviceId.trim()) {
    return `dev_${session.deviceId.trim()}`;
  }
  // 3. User ID if available and not random guest
  if (session.userId && !session.userId.startsWith('guest_') && !session.userId.startsWith('p_')) {
    return `id_${session.userId.trim()}`;
  }
  // 4. Session userId or fallback to tabId
  return session.userId ? `id_${session.userId.trim()}` : `tab_${session.tabId}`;
}

function cleanStaleSessions(): boolean {
  const now = Date.now();
  const TIMEOUT_MS = 7000; // Client sends ping every 3s, timeout after 7s of silence
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
  const uniqueUsers = new Set<string>();
  for (const session of activePresenceSessions.values()) {
    uniqueUsers.add(getUniqueUserKey(session));
  }
  return uniqueUsers.size;
}

function registerPresence(
  tabId: string,
  userId?: string,
  meta?: {
    username?: string;
    avatar?: string;
    frame?: string;
    deviceId?: string;
    bestWpm?: number;
    bestWpmRecord?: any;
    totalGames?: number;
    currentRoomId?: string | null;
    currentMode?: string | null;
    status?: 'lobby' | 'waiting_room' | 'playing' | 'outplay' | 'gameover';
    isAdmin?: boolean;
    ip?: string;
    browser?: string;
    device?: string;
  }
) {
  if (!tabId) return;
  const now = Date.now();
  const prevCount = getRealOnlineCount();
  const existing = activePresenceSessions.get(tabId);

  activePresenceSessions.set(tabId, {
    tabId,
    userId: userId || existing?.userId || tabId,
    deviceId: meta?.deviceId || existing?.deviceId,
    username: meta?.username || existing?.username || 'Khách ' + tabId.slice(-4),
    avatar: meta?.avatar || existing?.avatar || '⚡',
    frame: meta?.frame !== undefined ? meta.frame : existing?.frame || 'default',
    bestWpm: typeof meta?.bestWpm === 'number' ? meta.bestWpm : existing?.bestWpm || 0,
    bestWpmRecord: meta?.bestWpmRecord || existing?.bestWpmRecord,
    totalGames: typeof meta?.totalGames === 'number' ? meta.totalGames : existing?.totalGames || 0,
    currentRoomId: meta?.currentRoomId !== undefined ? meta.currentRoomId : existing?.currentRoomId || null,
    currentMode: meta?.currentMode !== undefined ? meta.currentMode : existing?.currentMode || null,
    status: meta?.status || existing?.status || 'lobby',
    isAdmin: meta?.isAdmin !== undefined ? meta.isAdmin : existing?.isAdmin || false,
    ip: meta?.ip || existing?.ip || '127.0.0.1',
    browser: meta?.browser || existing?.browser || 'Chrome',
    device: meta?.device || existing?.device || 'Desktop',
    connectedAt: existing?.connectedAt || now,
    lastSeen: now,
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

// Background cleanup check every 2 seconds
setInterval(() => {
  const countBefore = getRealOnlineCount();
  const removed = cleanStaleSessions();
  const countAfter = getRealOnlineCount();
  if (removed && countBefore !== countAfter) {
    broadcastOnlinePresence();
  }
}, 2000);

// Xianxia realm max longevity table for server background calculation
const REALM_MAX_THO_NGUYEN = [240, 480, 960, 1800, 3000, 4800, 7200, 10800, 15000, 30000, 60000, 999999];
const REALM_START_LEVELS = [1, 31, 71, 131, 211, 311, 431, 571, 721, 871, 941, 981];
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

// Background cultivation lifespan (Thọ Nguyên) decay every 2 hours: -1 point every 2 hours
setInterval(() => {
  const now = Date.now();
  let anyUserUpdated = false;

  for (const user of serverUsers.values()) {
    if (!user.cultivation) continue;

    const realmIndex = typeof user.cultivation.realmIndex === 'number' ? user.cultivation.realmIndex : 0;
    if (realmIndex >= 11) continue; // Thiên Tôn bất tử

    const lastDecay = user.cultivation.lastThoNguyenDecay || now;
    const elapsed = now - lastDecay;
    const decayUnits = Math.floor(elapsed / TWO_HOURS_MS);

    if (decayUnits > 0) {
      anyUserUpdated = true;
      user.cultivation.thoNguyen = Math.max(0, (user.cultivation.thoNguyen ?? REALM_MAX_THO_NGUYEN[realmIndex]) - decayUnits);
      user.cultivation.lastThoNguyenDecay = lastDecay + decayUnits * TWO_HOURS_MS;

      // Check Luân Hồi khi hết Thọ Nguyên: đưa về tầng 1 của 2 cảnh giới trước đó
      if (user.cultivation.thoNguyen <= 0) {
        const targetRealmIndex = Math.max(0, realmIndex - 2);
        const targetLevel = REALM_START_LEVELS[targetRealmIndex];
        user.cultivation.realmIndex = targetRealmIndex;
        user.cultivation.tier = 1;
        user.cultivation.level = targetLevel;
        user.cultivation.exp = 0;
        user.cultivation.thoNguyen = REALM_MAX_THO_NGUYEN[targetRealmIndex];
        user.cultivation.maxThoNguyen = REALM_MAX_THO_NGUYEN[targetRealmIndex];
      }
    }
  }

  if (anyUserUpdated) {
    saveUsersToFile();
  }
}, 60000);

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
    const humanPlayers = room.players.filter((p) => !p.isBot);
    // Phòng KHÔNG CÓ người chơi thực nào (chỉ còn bot hoặc 0 người) -> Xóa phòng ngay lập tức khỏi server
    if (humanPlayers.length === 0) {
      stopRoomBots(id, false);
      rooms.delete(id);
      sseClientsByRoom.delete(id);
      roomChatMessages.delete(id);
      broadcastToRoom(id, { type: 'room_closed', roomId: id });
      continue;
    }

    // Nếu không còn bất kỳ client SSE nào kết nối và phòng đã không có hoạt động trong 30 giây
    const clients = sseClientsByRoom.get(id);
    const hasActiveSse = clients && clients.size > 0;
    if (!hasActiveSse && now - (room.lastActive || room.createdAt) > 30 * 1000) {
      stopRoomBots(id, false);
      rooms.delete(id);
      sseClientsByRoom.delete(id);
      roomChatMessages.delete(id);
      broadcastToRoom(id, { type: 'room_closed', roomId: id });
      continue;
    }

    if (now - (room.lastActive || room.createdAt) > 30 * 60 * 1000) {
      stopRoomBots(id, false);
      rooms.delete(id);
      sseClientsByRoom.delete(id);
      roomChatMessages.delete(id);
      broadcastToRoom(id, { type: 'room_closed', roomId: id });
    }
  }
}
setInterval(cleanupInactiveRooms, 5 * 1000);

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

// Room Bot Simulation Engine for standard typing race modes (vi_dau, vi_nodau, en, numpad)
const roomBotIntervals = new Map<string, NodeJS.Timeout>();

function stopRoomBots(roomId: string, resetBotsToWaiting = true) {
  const norm = normalizeRoomCode(roomId);
  const existing = roomBotIntervals.get(norm);
  if (existing) {
    clearInterval(existing);
    roomBotIntervals.delete(norm);
  }

  // Khi dừng bot, lập tức reset trạng thái của tất cả bot về trạng thái chờ (inMatch: false)
  if (resetBotsToWaiting) {
    const room = rooms.get(norm);
    if (room) {
      let updated = false;
      room.players.forEach((p) => {
        if (p.isBot) {
          p.inMatch = false;
          p.isSurrendered = false;
          p.isFinished = false;
          p.progress = 0;
          p.wpm = 0;
          p.correctChars = 0;
          p.errors = 0;
          updated = true;
        }
      });
      if (updated) {
        room.lastActive = Date.now();
        rooms.set(norm, room);
      }
    }
  }
}

function startRoomBots(roomId: string) {
  const norm = normalizeRoomCode(roomId);
  stopRoomBots(norm, false);

  const room = rooms.get(norm);
  if (!room || room.status !== 'playing') return;

  // Bot simulation is exclusively for standard typing races (vi_dau, vi_nodau, en, numpad)
  const standardModes = ['vi_dau', 'vi_nodau', 'en', 'numpad', 'outplay'];
  if (!standardModes.includes(room.mode)) return;

  const bots = room.players.filter((p) => p.isBot);
  if (bots.length === 0) return;

  const startTime = Date.now();
  const countdownDelayMs = 3500; // Match TypingArena inRoomCountdown (3s + start buffer)

  const interval = setInterval(() => {
    const currentRoom = rooms.get(norm);
    if (!currentRoom || currentRoom.status !== 'playing') {
      stopRoomBots(norm, true);
      return;
    }

    // Kiểm tra nếu không còn người chơi thực nào đang thi đấu (đã về đích, đầu hàng hoặc rời phòng)
    const activeHumans = currentRoom.players.filter(
      (p) => !p.isBot && !p.isSurrendered && !p.isFinished && p.inMatch !== false
    );
    if (activeHumans.length === 0) {
      currentRoom.status = 'finished';
      stopRoomBots(norm, true);
      broadcastToRoom(norm, { type: 'room_updated', room: currentRoom });
      return;
    }

    const elapsedTotal = Date.now() - startTime;
    if (elapsedTotal < countdownDelayMs) {
      return; // Waiting for in-room countdown to finish
    }

    const elapsedTypingSec = (elapsedTotal - countdownDelayMs) / 1000;
    const totalWords = Math.max(1, currentRoom.words?.length || 150);
    let anyBotUpdated = false;

    currentRoom.players.forEach((p, idx) => {
      if (!p.isBot || p.isFinished || p.isSurrendered) return;

      const targetWpm = p.botTargetWpm || 60;
      // Realistic human-like variation (+/- 4 WPM smooth fluctuation)
      const variance = Math.sin(idx * 7 + elapsedTypingSec * 1.5) * 3 + Math.cos(elapsedTypingSec * 0.8) * 2;
      const liveWpm = Math.max(20, Math.round(targetWpm + variance));

      // Calculate words typed based on targetWpm
      const wordsTyped = (targetWpm / 60) * elapsedTypingSec;
      const progress = Math.min(100, parseFloat(((wordsTyped / totalWords) * 100).toFixed(1)));
      const correctChars = Math.round(wordsTyped * 5);

      p.wpm = liveWpm;
      p.progress = progress;
      p.correctChars = correctChars;
      if (progress >= 100) {
        p.isFinished = true;
      }
      anyBotUpdated = true;
    });

    if (anyBotUpdated) {
      currentRoom.lastActive = Date.now();
      broadcastToRoom(norm, {
        type: 'player_progress',
        roomId: norm,
        players: currentRoom.players,
      });
    }

    // Check if all players (both bots and humans) are finished or surrendered
    const activePlayers = currentRoom.players.filter(
      (p) => !p.isSurrendered && !p.isFinished && p.inMatch !== false
    );
    if (activePlayers.length === 0) {
      currentRoom.status = 'finished';
      stopRoomBots(norm, true);
      broadcastToRoom(norm, { type: 'room_updated', room: currentRoom });
    }
  }, 500);

  roomBotIntervals.set(norm, interval);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // === AUTHENTICATION API ROUTES (users.json persistence) ===

  // POST /api/auth/google: Decommissioned (Google sign-in removed per user request)
  app.post('/api/auth/google', (req, res) => {
    res.status(410).json({
      success: false,
      error: 'Tính năng đăng nhập bằng Google đã được gỡ bỏ. Vui lòng đăng ký hoặc đăng nhập bằng tài khoản!',
    });
  });

  // POST /api/auth/register and /api/auth/register-email: Quick 1-step account creation
  const handleQuickRegister = (req: express.Request, res: express.Response) => {
    const { password, username, displayName, avatar } = req.body || {};

    const cleanUsername = String(username || '').trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      res.status(400).json({ success: false, error: 'Tên đăng nhập phải có ít nhất 3 ký tự.' });
      return;
    }
    if (cleanUsername.length > 24) {
      res.status(400).json({ success: false, error: 'Tên đăng nhập không được vượt quá 24 ký tự.' });
      return;
    }
    if (/\s/.test(cleanUsername)) {
      res.status(400).json({ success: false, error: 'Tên đăng nhập không được chứa khoảng trắng (dấu cách).' });
      return;
    }

    const cleanPassword = String(password || '');
    if (!cleanPassword || cleanPassword.length < 4) {
      res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 4 ký tự.' });
      return;
    }

    // Check if login username is already taken (strictly unique across all accounts)
    const existingByName = getUserByUsername(cleanUsername);
    if (existingByName) {
      res.status(400).json({
        success: false,
        error: `Tên đăng nhập "${cleanUsername}" đã có người sử dụng. Vui lòng chọn tên đăng nhập khác!`,
      });
      return;
    }

    // Player in-game display name (defaults to username if not explicitly set)
    const cleanDisplayName = String(displayName || cleanUsername).trim().slice(0, 24) || cleanUsername;

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(cleanPassword, salt);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const sessionToken = `tok_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

    // Account created without email requirement or auto-generated fake email
    const user: ServerUserRecord = {
      id: userId,
      email: '',
      username: cleanUsername, // Tên đăng nhập cố định (không thể thay đổi)
      displayName: cleanDisplayName, // Tên người chơi hiển thị trong game
      avatar: avatar || '⚡',
      frame: 'default',
      authProvider: 'email',
      passwordHash,
      salt,
      isVerified: true,
      sessionTokens: [sessionToken],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    serverUsers.set(userId, user);
    saveUsersToFile();

    console.log(`[FastTyping Auth] Đăng ký thành công: Username="${cleanUsername}", DisplayName="${cleanDisplayName}"`);

    res.json({
      success: true,
      token: sessionToken,
      user: sanitizeUser(user),
      message: 'Tạo tài khoản thành công! Bạn đã sẵn sàng tham gia Bảng Vàng.',
    });
  };

  app.post('/api/auth/register', handleQuickRegister);
  app.post('/api/auth/register-email', handleQuickRegister);

  // POST /api/auth/login and /api/auth/login-email: Quick login by username OR email
  const handleQuickLogin = (req: express.Request, res: express.Response) => {
    const { email, username, account, identifier: reqIdentifier, password } = req.body || {};
    const identifier = String(reqIdentifier || account || username || email || '').trim();

    if (!identifier) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập tên đăng nhập.' });
      return;
    }
    if (!password) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập mật khẩu.' });
      return;
    }

    const user = getUserByUsernameOrEmail(identifier);
    if (!user) {
      res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản với tên đăng nhập này.' });
      return;
    }

    if (!user.salt || !user.passwordHash) {
      res.status(400).json({
        success: false,
        error: 'Tài khoản này chưa thiết lập mật khẩu. Vui lòng tạo tài khoản mới!',
      });
      return;
    }

    const checkHash = hashPassword(password, user.salt);
    if (checkHash !== user.passwordHash) {
      res.status(400).json({ success: false, error: 'Mật khẩu không chính xác.' });
      return;
    }

    // Auto-verify if legacy unverified account
    user.isVerified = true;
    user.updatedAt = Date.now();

    const sessionToken = `tok_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    if (!user.sessionTokens) user.sessionTokens = [];
    user.sessionTokens.push(sessionToken);
    if (user.sessionTokens.length > 20) user.sessionTokens.shift();

    serverUsers.set(user.id, user);
    saveUsersToFile();

    res.json({
      success: true,
      token: sessionToken,
      user: sanitizeUser(user),
      message: 'Đăng nhập thành công!',
    });
  };

  app.post('/api/auth/login', handleQuickLogin);
  app.post('/api/auth/login-email', handleQuickLogin);

  // GET /api/auth/me: Retrieve current authenticated profile
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    const user = getUserByToken(authHeader);
    if (!user) {
      res.json({ success: false, isGuest: true, user: null });
      return;
    }

    res.json({
      success: true,
      isGuest: false,
      user: sanitizeUser(user),
    });
  });

  // POST /api/auth/profile: Update name, avatar, frame (Restricted to verified accounts)
  app.post('/api/auth/profile', (req, res) => {
    const authHeader = req.headers.authorization;
    const user = getUserByToken(authHeader);

    // Người chơi không đăng nhập (Khách) không thể đổi tên, khung và avatar
    if (!user || !user.isVerified) {
      res.status(403).json({
        success: false,
        error: 'Chế độ Khách không thể đổi tên, khung và avatar. Vui lòng đăng nhập tài khoản!',
      });
      return;
    }

    const { 
      displayName, 
      username, 
      avatar, 
      frame, 
      showcaseAchievements, 
      unlockedAchievements,
      bestWpm,
      bestWpmRecord,
      totalGames,
      matchHistory,
      cultivation
    } = req.body || {};
    
    // Đổi tên người chơi (displayName): Tên đăng nhập (user.username) CỐ ĐỊNH, KHÔNG THAY ĐỔI
    const newPlayerName = String(displayName || username || '').trim();
    if (newPlayerName && newPlayerName.length >= 2) {
      const slicedName = newPlayerName.slice(0, 24);
      const cleanNew = slicedName.toLowerCase();
      const currentDisplayName = (user.displayName || user.username).trim().toLowerCase();
      
      if (cleanNew !== currentDisplayName) {
        const existing = Array.from(serverUsers.values()).find(
          (u) =>
            u.id !== user.id &&
            (((u.displayName && u.displayName.trim().toLowerCase() === cleanNew) ||
              (!u.displayName && u.username.trim().toLowerCase() === cleanNew)))
        );
        if (existing) {
          res.status(400).json({
            success: false,
            error: `Tên người chơi / Biệt danh "${slicedName}" đã có người sử dụng. Vui lòng chọn tên khác!`,
          });
          return;
        }
      }
      user.displayName = slicedName;
      // QUAN TRỌNG: user.username (Tên đăng nhập) TUYỆT ĐỐI GIỮ NGUYÊN
    }

    if (avatar && typeof avatar === 'string' && avatar.trim()) {
      user.avatar = avatar.trim();
    }
    if (frame && typeof frame === 'string' && frame.trim()) {
      user.frame = frame.trim();
    }
    if (Array.isArray(showcaseAchievements)) {
      user.showcaseAchievements = showcaseAchievements.filter((x: any) => typeof x === 'string').slice(0, 4);
    }
    if (Array.isArray(unlockedAchievements)) {
      user.unlockedAchievements = unlockedAchievements.filter((x: any) => typeof x === 'string');
    }
    if (typeof bestWpm === 'number' && !isNaN(bestWpm)) {
      user.bestWpm = Math.round(bestWpm);
    }
    if (bestWpmRecord && typeof bestWpmRecord === 'object') {
      user.bestWpmRecord = bestWpmRecord;
    }
    if (typeof totalGames === 'number' && !isNaN(totalGames)) {
      user.totalGames = Math.max(user.totalGames || 0, Math.round(totalGames));
    }
    if (Array.isArray(matchHistory)) {
      user.matchHistory = matchHistory.slice(0, 50);
    }
    if (cultivation && typeof cultivation === 'object') {
      user.cultivation = cultivation;
    }

    user.updatedAt = Date.now();
    serverUsers.set(user.id, user);
    saveUsersToFile();

    // Cập nhật tên hiển thị trên Bảng Vàng nếu người chơi đang nắm giữ kỷ lục
    let updatedHighScores = false;
    for (const modeKey of Object.keys(serverHighScores)) {
      const rec = serverHighScores[modeKey];
      if (rec && (rec.userId === user.id || rec.username.toLowerCase() === user.username.toLowerCase())) {
        rec.displayName = user.displayName || user.username;
        if (user.avatar) rec.avatar = user.avatar;
        if (user.frame) rec.frame = user.frame;
        updatedHighScores = true;
      }
    }
    if (updatedHighScores) {
      saveLeaderboardToFile();
      broadcastLeaderboard();
    }
    syncUserCultivationToCache(user);

    res.json({
      success: true,
      user: sanitizeUser(user),
      message: 'Cập nhật hồ sơ thành công!',
    });
  });

  // POST /api/auth/change-password: Change password for authenticated player
  app.post('/api/auth/change-password', (req, res) => {
    const authHeader = req.headers.authorization;
    const user = getUserByToken(authHeader);

    if (!user || !user.isVerified) {
      res.status(401).json({
        success: false,
        error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại!',
      });
      return;
    }

    const { oldPassword, newPassword } = req.body || {};

    const cleanOld = String(oldPassword || '');
    const cleanNew = String(newPassword || '');

    if (!cleanOld) {
      res.status(400).json({
        success: false,
        error: 'Vui lòng nhập mật khẩu hiện tại.',
      });
      return;
    }

    if (!cleanNew || cleanNew.length < 4) {
      res.status(400).json({
        success: false,
        error: 'Mật khẩu mới phải có ít nhất 4 ký tự.',
      });
      return;
    }

    if (cleanOld === cleanNew) {
      res.status(400).json({
        success: false,
        error: 'Mật khẩu mới không được trùng với mật khẩu cũ.',
      });
      return;
    }

    if (!user.salt || !user.passwordHash) {
      res.status(400).json({
        success: false,
        error: 'Tài khoản chưa có mật khẩu gốc để đổi. Vui lòng thử lại!',
      });
      return;
    }

    const checkHash = hashPassword(cleanOld, user.salt);
    if (checkHash !== user.passwordHash) {
      res.status(400).json({
        success: false,
        error: 'Mật khẩu hiện tại không chính xác.',
      });
      return;
    }

    // Generate fresh salt and new hash
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newPasswordHash = hashPassword(cleanNew, newSalt);

    user.salt = newSalt;
    user.passwordHash = newPasswordHash;
    user.updatedAt = Date.now();

    serverUsers.set(user.id, user);
    saveUsersToFile();

    console.log(`[FastTyping Auth] Đổi mật khẩu thành công cho tài khoản: ${user.username}`);

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Mật khẩu mới đã có hiệu lực.',
    });
  });

  // POST /api/auth/logout: Revoke current session token
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const cleanToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    if (cleanToken) {
      for (const user of serverUsers.values()) {
        if (user.sessionTokens && user.sessionTokens.includes(cleanToken)) {
          user.sessionTokens = user.sessionTokens.filter((t) => t !== cleanToken);
          serverUsers.set(user.id, user);
          saveUsersToFile();
          break;
        }
      }
    }
    res.json({ success: true, message: 'Đã đăng xuất.' });
  });

  // GET /api/cultivation: Retrieve user's cultivation data
  app.get('/api/cultivation', (req, res) => {
    const authHeader = req.headers.authorization;
    let user = getUserByToken(authHeader);

    if (!user && req.query.userId) {
      user = serverUsers.get(String(req.query.userId)) || null;
    }
    if (!user && req.query.username) {
      user = getUserByUsername(String(req.query.username));
    }

    if (!user) {
      res.status(404).json({ success: false, error: 'Không tìm thấy thông tin tài khoản.' });
      return;
    }

    res.json({
      success: true,
      cultivation: user.cultivation || null,
    });
  });

  // Cấu hình Bảng Vàng Top 50 Tu Vi cập nhật định kỳ cứ 1 giờ sẽ cập nhật 1 lần
  const CULTIVATION_LEADERBOARD_INTERVAL_MS = 60 * 60 * 1000; // 1 giờ = 3.600.000 ms
  let lastCultivationLeaderboardUpdate = 0;
  let cachedCultivationTop50: any[] = [];
  let cachedCultivationRankedList: any[] = [];
  let cachedTotalCultivators = 0;

  const XIANXIA_REALM_METAS = [
    { name: 'Luyện Khí Kỳ', titleName: 'Luyện Khí Tu Sĩ', icon: '🌿', badge: 'Khí', frameId: 'frame_xianxia_luyenkhi', startLevel: 1, endLevel: 30 },
    { name: 'Trúc Cơ Kỳ', titleName: 'Trúc Cơ Chân Nhân', icon: '🧱', badge: 'Cơ', frameId: 'frame_xianxia_trucco', startLevel: 31, endLevel: 70 },
    { name: 'Kết Đan Kỳ', titleName: 'Kim Đan Tông Sư', icon: '🔮', badge: 'Đan', frameId: 'frame_xianxia_ketdan', startLevel: 71, endLevel: 130 },
    { name: 'Nguyên Anh Kỳ', titleName: 'Nguyên Anh Lão Quái', icon: '👶', badge: 'Anh', frameId: 'frame_xianxia_nguyenanh', startLevel: 131, endLevel: 210 },
    { name: 'Hóa Thần Kỳ', titleName: 'Hóa Thần Tôn Giả', icon: '🌌', badge: 'Thần', frameId: 'frame_xianxia_hoathan', startLevel: 211, endLevel: 310 },
    { name: 'Luyện Hư Kỳ', titleName: 'Luyện Hư Thần Quân', icon: '🌀', badge: 'Hư', frameId: 'frame_xianxia_luyenhu', startLevel: 311, endLevel: 430 },
    { name: 'Hợp Thể Kỳ', titleName: 'Hợp Thể Thánh Quân', icon: '⚡', badge: 'Thể', frameId: 'frame_xianxia_hopthe', startLevel: 431, endLevel: 570 },
    { name: 'Đại Thừa Kỳ', titleName: 'Đại Thừa Chí Tôn', icon: '☀️', badge: 'Thừa', frameId: 'frame_xianxia_daithua', startLevel: 571, endLevel: 720 },
    { name: 'Độ Kiếp Kỳ', titleName: 'Độ Kiếp Tiên Tôn', icon: '🌩️', badge: 'Kiếp', frameId: 'frame_xianxia_dokiep', startLevel: 721, endLevel: 870 },
    { name: 'Kim Tiên', titleName: 'Bất Hủ Kim Tiên', icon: '🌟', badge: 'Kim', frameId: 'frame_xianxia_kimtien', startLevel: 871, endLevel: 940 },
    { name: 'Đại La Tiên', titleName: 'Đại La Kim Tiên', icon: '🌠', badge: 'La', frameId: 'frame_xianxia_daila', startLevel: 941, endLevel: 980 },
    { name: 'Thiên Tôn', titleName: 'Hỗn Độn Thiên Tôn', icon: '👑', badge: 'Tôn', frameId: 'frame_xianxia_thienton', startLevel: 981, endLevel: 1000 },
  ];

  function getSubStageName(tier: number): 'Sơ Kỳ' | 'Trung Kỳ' | 'Hậu Kỳ' | 'Đại Viên Mãn' {
    if (tier <= 3) return 'Sơ Kỳ';
    if (tier <= 6) return 'Trung Kỳ';
    if (tier <= 9) return 'Hậu Kỳ';
    return 'Đại Viên Mãn';
  }

  function buildCultivationLeaderboardSnapshot() {
    const map = new Map<string, any>();

    // Lấy dữ liệu từ tất cả tài khoản người chơi đã đăng ký trên hệ thống (serverUsers)
    for (const user of serverUsers.values()) {
      if (!user.username) continue;
      const cult = user.cultivation || {};
      const realmIndex = Math.max(0, Math.min(11, Number(cult.realmIndex) || 0));
      const tier = Math.max(1, Math.min(10, Number(cult.tier) || 1));
      const level = Math.max(1, Math.min(1000, Number(cult.level) || 1));
      const exp = Math.max(0, Number(cult.exp) || 0);
      const maxExp = Math.max(1, Number(cult.maxExp) || 500);
      const rawTho = cult.thoNguyen !== undefined ? Number(cult.thoNguyen) : 240;
      const thoNguyen = !isNaN(rawTho) && rawTho >= 0 ? rawTho : 240;
      const realmMeta = XIANXIA_REALM_METAS[realmIndex] || XIANXIA_REALM_METAS[0];

      map.set(user.username.toLowerCase(), {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar || '⚡',
        frame: user.frame || realmMeta.frameId,
        realmIndex,
        realmName: realmMeta.name,
        realmIcon: realmMeta.icon,
        titleName: realmMeta.titleName,
        badge: realmMeta.badge,
        tier,
        subStage: getSubStageName(tier),
        level,
        exp,
        maxExp,
        thoNguyen,
        isRegistered: true,
      });
    }

    // Sắp xếp theo thứ tự tiến độ tu vi thực tế
    const all = Array.from(map.values()).map((c) => {
      const score = (c.realmIndex * 1_000_000_000) + (c.tier * 10_000_000) + (c.level * 100_000) + c.exp;
      return { ...c, score };
    });

    all.sort((a, b) => b.score - a.score);

    // Gán thứ hạng
    const rankedList = all.map((item, index) => {
      const { score, ...rest } = item;
      return {
        ...rest,
        rank: index + 1,
      };
    });

    cachedCultivationRankedList = rankedList;
    cachedCultivationTop50 = rankedList.slice(0, 50);
    cachedTotalCultivators = rankedList.length;
    lastCultivationLeaderboardUpdate = Date.now();

    console.log(`[Leaderboard] Cập nhật Bảng Vàng Top 50 Tu Vi chu kỳ 1 giờ/lần: ${cachedCultivationTop50.length} vị đại năng`);
  }

  // Khởi tạo snapshot đầu tiên khi server khởi động
  buildCultivationLeaderboardSnapshot();

  // Đặt lịch cập nhật định kỳ cứ 1 giờ sẽ cập nhật 1 lần
  setInterval(() => {
    try {
      buildCultivationLeaderboardSnapshot();
    } catch (err) {
      console.error('[Leaderboard] Lỗi khi cập nhật bảng vàng tu vi chu kỳ 1 giờ:', err);
    }
  }, CULTIVATION_LEADERBOARD_INTERVAL_MS);

  // Helper đồng bộ tu vi thực tế của người chơi vào danh sách ngay khi có cập nhật
  function syncUserCultivationToCache(user: ServerUserRecord) {
    if (!user || !user.username || !user.cultivation) return;
    const cult = user.cultivation;
    const realmIndex = Math.max(0, Math.min(11, Number(cult.realmIndex) || 0));
    const tier = Math.max(1, Math.min(10, Number(cult.tier) || 1));
    const level = Math.max(1, Math.min(1000, Number(cult.level) || 1));
    const exp = Math.max(0, Number(cult.exp) || 0);
    const maxExp = Math.max(1, Number(cult.maxExp) || 500);
    const rawTho = cult.thoNguyen !== undefined ? Number(cult.thoNguyen) : 240;
    const thoNguyen = !isNaN(rawTho) && rawTho >= 0 ? rawTho : 240;
    const realmMeta = XIANXIA_REALM_METAS[realmIndex] || XIANXIA_REALM_METAS[0];

    const uLower = user.username.toLowerCase();
    const existingIndex = cachedCultivationRankedList.findIndex((item) => item.username.toLowerCase() === uLower);
    if (existingIndex !== -1) {
      cachedCultivationRankedList[existingIndex] = {
        ...cachedCultivationRankedList[existingIndex],
        displayName: user.displayName || user.username,
        realmIndex,
        realmName: realmMeta.name,
        realmIcon: realmMeta.icon,
        titleName: realmMeta.titleName,
        badge: realmMeta.badge,
        tier,
        subStage: getSubStageName(tier),
        level,
        exp,
        maxExp,
        thoNguyen,
      };
    }

    const topIndex = cachedCultivationTop50.findIndex((item) => item.username.toLowerCase() === uLower);
    if (topIndex !== -1) {
      cachedCultivationTop50[topIndex] = {
        ...cachedCultivationTop50[topIndex],
        displayName: user.displayName || user.username,
        realmIndex,
        realmName: realmMeta.name,
        realmIcon: realmMeta.icon,
        titleName: realmMeta.titleName,
        badge: realmMeta.badge,
        tier,
        subStage: getSubStageName(tier),
        level,
        exp,
        maxExp,
        thoNguyen,
      };
    }
  }

  // POST /api/cultivation: Update user's cultivation state
  app.post('/api/cultivation', (req, res) => {
    const authHeader = req.headers.authorization;
    let user = getUserByToken(authHeader);

    if (!user && req.body.userId) {
      user = serverUsers.get(String(req.body.userId)) || null;
    }
    if (!user && req.body.username) {
      user = getUserByUsername(String(req.body.username));
    }

    if (!user) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập hoặc không tìm thấy tài khoản.' });
      return;
    }

    if (req.body.cultivation && typeof req.body.cultivation === 'object') {
      user.cultivation = req.body.cultivation;
      user.updatedAt = Date.now();
      serverUsers.set(user.id, user);
      saveUsersToFile();
      // Đồng bộ ngay tu vi thực tế vào cache để đảm bảo không bị lệch
      syncUserCultivationToCache(user);
    }

    res.json({
      success: true,
      cultivation: user.cultivation,
    });
  });

  // Server background task: Decay Thọ Nguyên (cứ 2 giờ -1) & Tâm Ma (sau 48h không tu luyện)
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  setInterval(() => {
    const now = Date.now();
    let hasChanges = false;

    for (const [userId, user] of serverUsers.entries()) {
      if (!user.cultivation) continue;
      const cult = user.cultivation;
      let userChanged = false;

      // 1. Cứ 2 giờ trôi qua giảm 1 điểm Thọ Nguyên (trừ cảnh giới 11 Thiên Tôn)
      if ((cult.realmIndex ?? 0) < 11) {
        const lastDecay = cult.lastThoNguyenDecay || now;
        const elapsed = now - lastDecay;
        const units = Math.floor(elapsed / TWO_HOURS_MS);

        if (units > 0) {
          cult.thoNguyen = Math.max(0, (cult.thoNguyen ?? 240) - units);
          cult.lastThoNguyenDecay = lastDecay + units * TWO_HOURS_MS;
          userChanged = true;

          // Luân hồi nếu hết Thọ Nguyên: rớt về tầng 1 của 2 cảnh giới trước
          if (cult.thoNguyen <= 0) {
            const oldRealmIdx = cult.realmIndex ?? 0;
            const targetRealmIdx = Math.max(0, oldRealmIdx - 2);
            cult.realmIndex = targetRealmIdx;
            cult.tier = 1;
            cult.exp = 0;
            cult.thoNguyen = 240; // baseline
            if (!cult.historyLog) cult.historyLog = [];
            cult.historyLog.unshift(`⚠️ [TỌA HÓA LUÂN HỒI] Thọ nguyên cạn kiệt! Rơi vào luân hồi về cảnh giới thứ ${targetRealmIdx + 1} Tầng 1.`);
            if (cult.historyLog.length > 20) cult.historyLog.pop();
          }
        }
      }

      // 2. Giảm Tu Vi nếu không hoạt động sau 48h (Tâm ma xâm lấn)
      const lastActive = cult.lastCultivateTime || user.updatedAt || now;
      const inactiveElapsed = now - lastActive;
      if (inactiveElapsed > FORTY_EIGHT_HOURS_MS && (cult.exp ?? 0) > 0) {
        const overdueDays = Math.floor((inactiveElapsed - FORTY_EIGHT_HOURS_MS) / ONE_DAY_MS) + 1;
        const decayPercent = Math.min(30, overdueDays * 3);
        const maxExp = cult.maxExp || 500;
        const expLost = Math.round((maxExp * decayPercent) / 100);
        if (expLost > 0 && cult.exp > 0) {
          const oldExp = cult.exp;
          cult.exp = Math.max(0, cult.exp - expLost);
          if (oldExp !== cult.exp) {
            userChanged = true;
            if (!cult.historyLog) cult.historyLog = [];
            cult.historyLog.unshift(`💀 [TÂM MA XÂM LẤN] Không tu luyện quá 48h, tổn thất ${oldExp - cult.exp} Tu Vi!`);
            if (cult.historyLog.length > 20) cult.historyLog.pop();
          }
        }
      }

      if (userChanged) {
        user.cultivation = cult;
        serverUsers.set(userId, user);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      saveUsersToFile();
    }
  }, 60000); // Check every 60 seconds

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size, registeredUsers: serverUsers.size });
  });

  // Get all active rooms (chỉ lấy các phòng có ít nhất 1 người chơi thực và chưa kết thúc)
  app.get('/api/rooms', (_req, res) => {
    cleanupInactiveRooms();
    const list = Array.from(rooms.values()).filter(
      (r) => r.status !== 'finished' && r.players.some((p) => !p.isBot)
    );
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
    const humanPlayers = room.players.filter((p) => !p.isBot);
    if (humanPlayers.length === 0) {
      stopRoomBots(norm, false);
      rooms.delete(norm);
      sseClientsByRoom.delete(norm);
      roomChatMessages.delete(norm);
      res.status(404).json({ success: false, error: 'Phòng không còn người chơi thực' });
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
      difficulty: difficulty || (mode === 'numpad' ? 'number' : 'normal'),
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

    // 4. Không cho phép tên người chơi biệt danh trùng nhau trong cùng một phòng
    const isDuplicateName = room.players.some(
      (p) => p.id !== player.id && p.username.trim().toLowerCase() === String(player.username || '').trim().toLowerCase()
    );
    if (isDuplicateName) {
      res.json({
        success: false,
        error: `Biệt danh "${player.username}" đã có người sử dụng trong phòng này. Vui lòng đổi biệt danh khác!`,
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
      difficulty: difficulty || (mode === 'numpad' ? 'number' : 'normal'),
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
      const humanPlayers = players.filter((p) => !p.isBot);
      if (humanPlayers.length === 0) {
        stopRoomBots(norm, false);
        rooms.delete(norm);
        sseClientsByRoom.delete(norm);
        roomChatMessages.delete(norm);
        broadcastToRoom(norm, { type: 'room_closed', roomId: norm });
        res.json({ success: true, message: 'Phòng đã tự động giải tán do không còn người chơi thực' });
        return;
      }
      room.players = players;
      room.lastActive = Date.now();
      rooms.set(norm, room);
      broadcastToRoom(norm, { type: 'room_updated', room });
    }

    res.json({ success: true, room });
  });

  // Transfer host: Chủ phòng nhường quyền cho người chơi khác, người được chọn lên Slot 1 (index 0), chủ cũ vào slot người kia để lại
  app.post('/api/rooms/:id/transfer-host', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const { targetPlayerId, requesterId } = req.body;
    if (room.hostId !== requesterId) {
      res.status(403).json({ success: false, error: 'Chỉ chủ phòng mới có quyền chuyển nhượng chủ phòng' });
      return;
    }

    const targetIdx = room.players.findIndex((p) => p.id === targetPlayerId);
    if (targetIdx === -1) {
      res.status(404).json({ success: false, error: 'Không tìm thấy người chơi được chọn' });
      return;
    }

    const targetPlayer = room.players[targetIdx];
    if (targetPlayer.isBot) {
      res.status(400).json({ success: false, error: 'Không thể nhường chủ phòng cho Bot' });
      return;
    }

    const hostIdx = room.players.findIndex((p) => p.id === room.hostId);
    const effectiveHostIdx = hostIdx !== -1 ? hostIdx : 0;
    const oldHostPlayer = room.players[effectiveHostIdx];

    // Hoán đổi vị trí:
    // Slot 1 (index 0) là người được nhường (targetPlayer)
    // Slot của targetPlayer được thay bằng oldHostPlayer
    const newPlayers = [...room.players];
    if (effectiveHostIdx === 0) {
      newPlayers[0] = targetPlayer;
      newPlayers[targetIdx] = oldHostPlayer;
    } else {
      const slot0 = newPlayers[0];
      newPlayers[0] = targetPlayer;
      newPlayers[targetIdx] = oldHostPlayer;
      newPlayers[effectiveHostIdx] = slot0;
    }

    room.players = newPlayers;
    room.hostId = targetPlayer.id;
    room.hostName = targetPlayer.username;
    room.lastActive = Date.now();
    rooms.set(norm, room);

    broadcastToRoom(norm, {
      type: 'host_transferred',
      oldHostId: requesterId,
      newHostId: targetPlayer.id,
      newHostName: targetPlayer.username,
      room,
    });
    broadcastToRoom(norm, { type: 'room_updated', room });

    res.json({ success: true, room });
  });

  // Kick player or bot: Chủ phòng đá người chơi hoặc bot khỏi phòng
  app.post('/api/rooms/:id/kick', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const { targetPlayerId, requesterId } = req.body;
    if (room.hostId !== requesterId) {
      res.status(403).json({ success: false, error: 'Chỉ chủ phòng mới có quyền mời người chơi rời phòng' });
      return;
    }

    if (targetPlayerId === room.hostId) {
      res.status(400).json({ success: false, error: 'Chủ phòng không thể tự đá chính mình' });
      return;
    }

    const targetPlayer = room.players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer) {
      res.status(404).json({ success: false, error: 'Không tìm thấy người chơi' });
      return;
    }

    room.players = room.players.filter((p) => p.id !== targetPlayerId);
    const humanPlayers = room.players.filter((p) => !p.isBot);
    if (humanPlayers.length === 0) {
      stopRoomBots(norm, false);
      rooms.delete(norm);
      sseClientsByRoom.delete(norm);
      roomChatMessages.delete(norm);
      broadcastToRoom(norm, { type: 'room_closed', roomId: norm });
      res.json({ success: true, roomClosed: true });
      return;
    }

    room.lastActive = Date.now();
    rooms.set(norm, room);

    // Nếu người bị đá là người chơi thực, broadcast event player_kicked
    if (!targetPlayer.isBot) {
      broadcastToRoom(norm, {
        type: 'player_kicked',
        roomId: norm,
        playerId: targetPlayerId,
        username: targetPlayer.username,
      });
    }

    broadcastToRoom(norm, { type: 'room_updated', room });

    res.json({ success: true, room });
  });

  // Update room difficulty (Host configuration)
  app.post('/api/rooms/:id/difficulty', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const { difficulty } = req.body;
    if (difficulty) {
      room.difficulty = difficulty;
      room.lastActive = Date.now();
      rooms.set(norm, room);
      broadcastToRoom(norm, { type: 'room_updated', room });
    }

    res.json({ success: true, room });
  });

  // Update room mode (Host configuration)
  app.post('/api/rooms/:id/mode', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const { mode, difficulty } = req.body;
    if (mode) {
      room.mode = mode;
      if (difficulty) {
        room.difficulty = difficulty;
      } else {
        room.difficulty = mode === 'numpad' ? 'number' : 'normal';
      }
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

    const humanPlayers = room.players.filter((p) => !p.isBot);
    if (humanPlayers.length === 0) {
      stopRoomBots(norm, false);
      rooms.delete(norm);
      sseClientsByRoom.delete(norm);
      roomChatMessages.delete(norm);
      broadcastToRoom(norm, { type: 'room_closed', roomId: norm });
      res.status(404).json({ success: false, error: 'Phòng không còn người chơi thực' });
      return;
    }

    const { status, mode, words, mysteryWords, matchId, difficulty } = req.body;
    room.status = status;
    room.lastActive = Date.now();
    if (words) room.words = words;
    if (mysteryWords) room.mysteryWords = mysteryWords;
    if (mode) room.mode = mode;
    if (difficulty) room.difficulty = difficulty;

    if (status === 'playing') {
      // Gán mã định danh duy nhất cho từng trận đấu (matchId) để phòng tránh hiện tượng tự động reset phòng
      room.matchId = matchId || ('match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
      // Khi bắt đầu: tất cả người chơi trong phòng được đánh dấu inMatch = true (avatar xám)
      room.players.forEach((p) => {
        p.inMatch = true;
        p.isSurrendered = false;
        p.isFinished = false;
        p.progress = 0;
        p.wpm = 0;
        p.correctChars = 0;
        p.errors = 0;
      });
      startRoomBots(norm);
    } else if (status === 'waiting') {
      stopRoomBots(norm, true);
      // Khi trở về phòng chờ: tắt inMatch (avatar sáng lên) cho tất cả người chơi và bot
      room.players.forEach((p) => {
        p.inMatch = false;
        p.isSurrendered = false;
        p.isFinished = false;
        p.progress = 0;
        p.wpm = 0;
        p.correctChars = 0;
        p.errors = 0;
      });
    } else if (status === 'finished') {
      stopRoomBots(norm, true);
      // Khi trận đấu kết thúc hoặc người chơi duy nhất đầu hàng kết thúc sớm:
      // Toàn bộ bot ngay lập tức trở về trạng thái chờ trong phòng (inMatch: false)
      room.players.forEach((p) => {
        if (p.isBot) {
          p.inMatch = false;
          p.isSurrendered = false;
          p.isFinished = false;
          p.progress = 0;
          p.wpm = 0;
          p.correctChars = 0;
          p.errors = 0;
        }
      });
    }

    rooms.set(norm, room);

    if (status === 'playing') {
      broadcastToRoom(norm, {
        type: 'room_started',
        roomId: norm,
        matchId: room.matchId,
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

    const humanPlayers = room.players.filter((p) => !p.isBot);
    if (humanPlayers.length === 0) {
      stopRoomBots(norm, false);
      rooms.delete(norm);
      sseClientsByRoom.delete(norm);
      roomChatMessages.delete(norm);
      broadcastToRoom(norm, { type: 'room_closed', roomId: norm });
      res.status(404).json({ success: false, error: 'Phòng không còn người chơi thực' });
      return;
    }

    const { playerId, inMatch, isSurrendered, isFinished } = req.body;
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      if (typeof inMatch === 'boolean') player.inMatch = inMatch;
      if (typeof isSurrendered === 'boolean') player.isSurrendered = isSurrendered;
      if (typeof isFinished === 'boolean') player.isFinished = isFinished;

      // Khi người chơi cuối cùng đầu hàng hoặc out trong phòng đang thi đấu (playing):
      // Kết thúc phòng ngay lập tức và tổng kết mà không đợi hết thời gian, bot lập tức về phòng chờ
      if (room.status === 'playing') {
        const activeHumanPlayers = humanPlayers.filter(
          (p) => !p.isSurrendered && !p.isFinished && p.inMatch !== false
        );
        if (activeHumanPlayers.length === 0) {
          room.status = 'finished';
          stopRoomBots(norm, true);
        }
      }

      // Nếu tất cả người chơi thực đã trở về phòng chờ (không còn ai inMatch), phòng tự động chuyển về trạng thái 'waiting'
      if (humanPlayers.length > 0 && humanPlayers.every((p) => !p.inMatch)) {
        room.status = 'waiting';
        stopRoomBots(norm, true);
      }

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
        if (isFinished && room.status === 'playing') {
          const humanPlayers = room.players.filter((p) => !p.isBot);
          const activeHumans = humanPlayers.filter(
            (p) => !p.isSurrendered && !p.isFinished && p.inMatch !== false
          );
          if (activeHumans.length === 0) {
            room.status = 'finished';
            stopRoomBots(norm, true);
            broadcastToRoom(norm, { type: 'room_updated', room });
          }
        }
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
        status: room.status,
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
      stopRoomBots(norm, false);
      rooms.delete(norm);
      sseClientsByRoom.delete(norm);
      roomChatMessages.delete(norm);
      broadcastToRoom(norm, { type: 'room_closed', roomId: norm });
    } else {
      if (wasHost) {
        // Slot kế tiếp trong danh sách người chơi thực được đôn lên làm chủ phòng
        const nextHost = humanPlayers[0];
        room.hostId = nextHost.id;
        room.hostName = nextHost.username;
      }
      // Nếu phòng đang thi đấu (status === 'playing') mà người chơi cuối cùng rời phòng (out):
      // Kết thúc phòng ngay lập tức và tổng kết, bot lập tức về phòng
      if (room.status === 'playing') {
        const activeHumanPlayers = humanPlayers.filter(
          (p) => !p.isSurrendered && !p.isFinished && p.inMatch !== false
        );
        if (activeHumanPlayers.length === 0) {
          room.status = 'finished';
          stopRoomBots(norm, true);
        }
      }
      if (humanPlayers.length > 0 && humanPlayers.every((p) => !p.inMatch)) {
        room.status = 'waiting';
        stopRoomBots(norm, true);
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
      const meta = extractSessionMetaFromReq(req);
      registerPresence(tabId, userId, meta);
    }
    res.json({ success: true, count: getRealOnlineCount() });
  });

  // POST or GET /api/presence/ping: Heartbeat ping from any active tab
  app.all('/api/presence/ping', (req, res) => {
    const tabId = String(req.query.tabId || req.body?.tabId || '').trim();
    const userId = String(req.query.userId || req.body?.userId || '').trim();
    if (tabId) {
      const meta = extractSessionMetaFromReq(req);
      registerPresence(tabId, userId, meta);
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

  // GET /api/admin/online-users: Detailed list of real-time online players for Admin inspection
  app.get('/api/admin/online-users', (_req, res) => {
    cleanStaleSessions();

    const usersByUniqueKey = new Map<string, any>();

    for (const session of activePresenceSessions.values()) {
      let roomInfo: any = null;
      if (session.currentRoomId) {
        const norm = normalizeRoomCode(session.currentRoomId);
        const r = rooms.get(norm);
        if (r) {
          const playerInRoom = r.players.find((p) => p.id === session.userId);
          roomInfo = {
            roomId: r.id,
            mode: r.mode,
            modeName: getModeDisplayName(r.mode),
            roomStatus: r.status,
            isHost: r.hostId === session.userId,
            playerCount: r.players.length,
            maxSlots: r.maxSlots,
            playerProgress: playerInRoom?.progress || 0,
            playerWpm: playerInRoom?.wpm || 0,
            isFinished: playerInRoom?.isFinished || false,
            isSurrendered: playerInRoom?.isSurrendered || false,
          };
        }
      }

      const userKey = getUniqueUserKey(session);

      if (!usersByUniqueKey.has(userKey)) {
        usersByUniqueKey.set(userKey, {
          userId: session.userId,
          tabId: session.tabId,
          username: session.username,
          avatar: session.avatar,
          frame: session.frame,
          bestWpm: session.bestWpm,
          bestWpmRecord: session.bestWpmRecord,
          totalGames: session.totalGames,
          currentRoomId: session.currentRoomId,
          currentMode: session.currentMode,
          status: session.status,
          isAdmin: session.isAdmin,
          ip: session.ip,
          browser: session.browser,
          device: session.device,
          connectedAt: session.connectedAt,
          lastSeen: session.lastSeen,
          tabCount: 1,
          roomInfo,
        });
      } else {
        const existing = usersByUniqueKey.get(userKey)!;
        existing.tabCount += 1;
        if (session.currentRoomId && !existing.currentRoomId) {
          existing.currentRoomId = session.currentRoomId;
          existing.roomInfo = roomInfo;
        }
        if (session.lastSeen > existing.lastSeen) {
          existing.lastSeen = session.lastSeen;
          existing.status = session.status;
          if (session.username && !session.username.startsWith('Khách ')) {
            existing.username = session.username;
          }
          if (session.isAdmin) {
            existing.isAdmin = true;
          }
        }
      }
    }

    const users = Array.from(usersByUniqueKey.values()).sort((a, b) => {
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      return b.lastSeen - a.lastSeen;
    });

    res.json({
      success: true,
      count: users.length,
      totalConnections: activePresenceSessions.size,
      users,
    });
  });

  // GET /api/leaderboard/cultivation: Top 50 tu vi cao nhất server (Cập nhật định kỳ 1 giờ/lần)
  app.get('/api/leaderboard/cultivation', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const now = Date.now();
    // Nếu quá 1 giờ hoặc có yêu cầu ép làm mới chu kỳ (?force=true)
    if (
      !lastCultivationLeaderboardUpdate ||
      now - lastCultivationLeaderboardUpdate >= CULTIVATION_LEADERBOARD_INTERVAL_MS ||
      req.query.force === 'true'
    ) {
      buildCultivationLeaderboardSnapshot();
    }

    const authHeader = req.headers.authorization;
    let authUser = getUserByToken(authHeader);
    const targetUsername = String(req.query.username || (authUser ? authUser.username : '')).trim().toLowerCase();

    // Đồng bộ nếu authUser có cultivation nhưng trong cache chưa khớp
    if (authUser && authUser.cultivation) {
      syncUserCultivationToCache(authUser);
    }

    // Xác định thứ hạng và thông tin tu vi thực tế của người chơi
    let currentUserRank = null;
    let currentUserActualCultivation = null;

    if (authUser && authUser.cultivation) {
      currentUserActualCultivation = authUser.cultivation;
    }

    if (targetUsername) {
      const foundIdx = cachedCultivationRankedList.findIndex((x) => x.username.toLowerCase() === targetUsername);
      if (foundIdx !== -1) {
        const item = cachedCultivationRankedList[foundIdx];
        currentUserRank = {
          rank: item.rank,
          username: item.username,
          displayName: item.displayName || item.username,
          level: item.level,
          realmIndex: item.realmIndex,
          realmName: item.realmName,
          realmIcon: item.realmIcon,
          tier: item.tier,
          subStage: item.subStage,
          exp: item.exp,
        };
      }
    }

    const nextUpdate = lastCultivationLeaderboardUpdate + CULTIVATION_LEADERBOARD_INTERVAL_MS;
    const remainingSeconds = Math.max(0, Math.floor((nextUpdate - Date.now()) / 1000));

    res.json({
      success: true,
      top50: cachedCultivationTop50,
      totalCount: cachedTotalCultivators,
      currentUserRank,
      currentUserActualCultivation,
      lastUpdated: lastCultivationLeaderboardUpdate,
      nextUpdate,
      remainingSeconds,
      updateInterval: CULTIVATION_LEADERBOARD_INTERVAL_MS,
    });
  });

  // GET /api/leaderboard: Get real server-wide high scores
  app.get('/api/leaderboard', (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const enrichedScores: Record<string, ServerHighScoreRecord | null> = {};
    for (const [key, val] of Object.entries(serverHighScores)) {
      if (val) {
        let user: ServerUserRecord | null = null;
        if (val.userId && serverUsers.has(val.userId)) {
          user = serverUsers.get(val.userId) || null;
        } else if (val.username) {
          user = getUserByUsername(val.username);
        }
        enrichedScores[key] = {
          ...val,
          displayName: user?.displayName || val.displayName || val.username,
        };
      } else {
        enrichedScores[key] = null;
      }
    }
    res.json({ success: true, highScores: enrichedScores });
  });

  // POST /api/leaderboard: Submit real score achieved by player
  app.post('/api/leaderboard', (req, res) => {
    const {
      mode,
      username,
      displayName,
      wpm = 0,
      score = 0,
      errors = 0,
      avatar,
      frame,
      isSurrendered,
      isCompleted = true,
      roomId,
      playerId,
    } = req.body;

    const validModes = ['vi_dau', 'vi_nodau', 'en', 'numpad', 'ngau_hung', 'doan_chu', 'san_boss'];
    if (!mode || !validModes.includes(mode) || !username) {
      res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
      return;
    }

    // QUY TẮC BẢNG VÀNG:
    // 1. NGƯỜI CHƠI CHƯA ĐĂNG NHẬP (KHÁCH) KHÔNG ĐƯỢC GHI KỶ LỤC BẢNG VÀNG
    const authHeader = (req.headers.authorization || (req.body && req.body.authToken ? `Bearer ${req.body.authToken}` : '')) as string;
    const authenticatedUser = getUserByToken(authHeader);
    if (!authenticatedUser || !authenticatedUser.isVerified) {
      res.json({
        success: false,
        isGuest: true,
        isNewRecord: false,
        error: 'Người chơi đang ở chế độ Khách (chưa đăng nhập hoặc chưa xác thực Gmail). Điểm số không được ghi nhận lên Bảng Vàng. Hãy đăng nhập tài khoản để xác lập kỷ lục!',
        highScores: serverHighScores,
      });
      return;
    }

    // 2. Người chơi chỉ có thể lên Bảng Vàng khi và chỉ khi ván đấu diễn ra trọn vẹn, không đầu hàng và không out phòng.
    if (isSurrendered === true || isCompleted === false) {
      res.json({
        success: false,
        isNewRecord: false,
        error: 'Ván đấu không trọn vẹn hoặc người chơi đã đầu hàng / rời phòng. Điểm không đủ điều kiện lên Bảng Vàng.',
        highScores: serverHighScores,
      });
      return;
    }

    // Nếu là phòng thi đấu multiplayer: kiểm tra trạng thái thực tế của người chơi trong phòng
    if (roomId && playerId) {
      const norm = normalizeRoomCode(roomId);
      const room = rooms.get(norm);
      if (room) {
        const roomPlayer = room.players.find((p) => p.id === playerId);
        // Nếu người chơi không còn trong phòng (out phòng) hoặc đã bị đánh dấu đầu hàng: từ chối ghi nhận
        if (!roomPlayer || roomPlayer.isSurrendered) {
          res.json({
            success: false,
            isNewRecord: false,
            error: 'Người chơi đã đầu hàng hoặc rời phòng trong ván đấu này. Điểm không đủ điều kiện lên Bảng Vàng.',
            highScores: serverHighScores,
          });
          return;
        }
      }
    }

    const cleanUsername = authenticatedUser.username || String(username).trim().slice(0, 30);
    const cleanDisplayName = (authenticatedUser.displayName || displayName || cleanUsername).trim().slice(0, 30);
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
        username: authenticatedUser.username || cleanUsername,
        displayName: cleanDisplayName,
        userId: authenticatedUser.id,
        wpm: numWpm,
        score: numScore,
        errors: numErrors,
        timestamp: Date.now(),
        avatar: avatar || authenticatedUser.avatar || '⚡',
        frame: frame || authenticatedUser.frame || 'default',
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
      const sanitized: Record<string, any> = {};
      for (const [k, v] of Object.entries(highScores)) {
        if (v && typeof v === 'object') {
          const rec = v as any;
          sanitized[k] = {
            ...rec,
            displayName: rec.displayName || rec.username,
          };
        } else {
          sanitized[k] = null;
        }
      }
      serverHighScores = { ...serverHighScores, ...sanitized };
      saveLeaderboardToFile();
      broadcastLeaderboard();
      res.json({ success: true, highScores: serverHighScores });
      return;
    }
    res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
  });

  // POST /api/leaderboard/reset: Reset leaderboard to clean state (or single mode if provided)
  app.post('/api/leaderboard/reset', (req, res) => {
    const { mode } = req.body || {};
    if (mode && typeof mode === 'string') {
      serverHighScores[mode] = null;
    } else {
      serverHighScores = {
        vi_dau: null,
        vi_nodau: null,
        en: null,
        numpad: null,
        outplay: null,
        ngau_hung: null,
        doan_chu: null,
        san_boss: null,
      };
    }
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

    const initialMeta = extractSessionMetaFromReq(req);
    registerPresence(tabId, userId, initialMeta);
    sseGlobalClients.set(res, tabId);
    sseGlobalChatClients.add(res);

    // Initial sync of chat messages, real online count, and leaderboard
    res.write(`data: ${JSON.stringify({ type: 'init_chat', messages: globalChatMessages })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'online_count', count: getRealOnlineCount() })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'leaderboard_updated', highScores: serverHighScores })}\n\n`);

    // Broadcast presence update to all connected users
    broadcastOnlinePresence();

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      clearInterval(heartbeat);
      sseGlobalChatClients.delete(res);
      sseGlobalClients.delete(res);
      removePresence(tabId);
      broadcastOnlinePresence();
    };

    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        cleanup();
      }
    }, 6000);

    req.on('close', cleanup);
    req.on('end', cleanup);
    res.on('close', cleanup);
    res.on('finish', cleanup);
    res.on('error', cleanup);
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

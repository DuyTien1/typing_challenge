import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { ServerUserRecord, ServerMultiLeaderboard, MarketListing, MarketLog } from './types';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let isInitialized = false;

export const DEFAULT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  avatar TEXT DEFAULT '🧘',
  frame TEXT DEFAULT 'wood',
  password_hash TEXT,
  salt TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT TRUE,
  auth_provider TEXT DEFAULT 'email',
  session_tokens JSONB DEFAULT '[]'::jsonb,
  best_wpm NUMERIC DEFAULT 0,
  best_wpm_record JSONB,
  total_games INTEGER DEFAULT 0,
  match_history JSONB DEFAULT '[]'::jsonb,
  showcase_achievements JSONB DEFAULT '[]'::jsonb,
  unlocked_achievements JSONB DEFAULT '[]'::jsonb,
  cultivation JSONB,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE INDEX IF NOT EXISTS idx_users_username ON app_users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON app_users (email);
CREATE INDEX IF NOT EXISTS idx_users_best_wpm ON app_users (best_wpm DESC);

CREATE TABLE IF NOT EXISTS app_sects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  leader_id TEXT,
  leader_name TEXT,
  level INTEGER DEFAULT 1,
  exp INTEGER DEFAULT 0,
  members JSONB DEFAULT '[]'::jsonb,
  buffs JSONB DEFAULT '{}'::jsonb,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_market_listings (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  seller_username TEXT NOT NULL,
  seller_avatar TEXT DEFAULT '🧘',
  seller_frame TEXT DEFAULT 'wood',
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_icon TEXT NOT NULL,
  quality TEXT DEFAULT 'ha_pham',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_per_unit INTEGER NOT NULL CHECK (price_per_unit > 0),
  total_price INTEGER NOT NULL,
  listed_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  status TEXT DEFAULT 'active',
  buyer_id TEXT,
  buyer_username TEXT,
  sold_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_market_status ON app_market_listings (status);
CREATE INDEX IF NOT EXISTS idx_market_seller ON app_market_listings (seller_id);

CREATE TABLE IF NOT EXISTS app_market_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  actor_username TEXT NOT NULL,
  target_username TEXT,
  amount INTEGER
);

CREATE TABLE IF NOT EXISTS app_leaderboards (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_banned_users (
  identifier TEXT PRIMARY KEY,
  reason TEXT,
  banned_by TEXT,
  banned_until BIGINT,
  duration_ms BIGINT,
  persona_id TEXT DEFAULT 'ban_co',
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE TABLE IF NOT EXISTS app_game_rooms (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'waiting',
  updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE INDEX IF NOT EXISTS idx_rooms_status ON app_game_rooms (status);
CREATE INDEX IF NOT EXISTS idx_rooms_updated ON app_game_rooms (updated_at DESC);

CREATE TABLE IF NOT EXISTS app_chat_messages (
  id TEXT PRIMARY KEY,
  channel TEXT DEFAULT 'global',
  data JSONB NOT NULL,
  timestamp BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_channel_time ON app_chat_messages (channel, timestamp DESC);
`;

/**
 * Tự động chuẩn hóa chuỗi kết nối Database:
 * 1. Bóc bỏ dấu ngoặc vuông vô tình nhập vào quanh mật khẩu: [password] -> password
 * 2. Tự động chuyển đổi Direct Connection IPv6 của Supabase (db.<ref>.supabase.co:5432) sang Connection Pooler IPv4 (aws-0-ap-southeast-1.pooler.supabase.com:6543)
 */
export function normalizeDatabaseUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  let urlStr = rawUrl.trim();

  // Strip accidental outer quotes
  if (
    (urlStr.startsWith('"') && urlStr.endsWith('"')) ||
    (urlStr.startsWith("'") && urlStr.endsWith("'"))
  ) {
    urlStr = urlStr.slice(1, -1).trim();
  }

  try {
    const parsed = new URL(urlStr);

    // 1. Loại bỏ dấu ngoặc vuông trong mật khẩu nếu người dùng giữ nguyên template [password]
    let pass = parsed.password;
    if (pass.startsWith('%5B') && pass.endsWith('%5D')) {
      pass = pass.slice(3, -3);
    } else if (pass.startsWith('[') && pass.endsWith(']')) {
      pass = pass.slice(1, -1);
    }
    parsed.password = pass;

    // 2. Chuyển đổi Supabase Direct host sang Supabase Pooler IPv4 tương thích với tất cả môi trường
    const supabaseMatch = parsed.hostname.match(/^db\.([a-z0-9_-]+)\.supabase\.co$/i);
    if (supabaseMatch) {
      const projectRef = supabaseMatch[1];
      parsed.hostname = 'aws-0-ap-southeast-1.pooler.supabase.com';
      parsed.port = '6543';
      if (!parsed.username.includes('.')) {
        parsed.username = `postgres.${projectRef}`;
      }
    }

    return parsed.toString();
  } catch {
    return urlStr;
  }
}

/**
 * Tìm chuỗi kết nối DATABASE_URL từ nhiều biến môi trường phổ biến
 */
export function getRawDatabaseUrl(): string | undefined {
  const keys = [
    'DATABASE_URL',
    'VITE_DATABASE_URL',
    'DATABASE_URI',
    'POSTGRES_URL',
    'POSTGRESQL_URL',
    'SUPABASE_DATABASE_URL',
    'VITE_SUPABASE_DATABASE_URL',
    'SUPABASE_URL',
    'DB_URL',
  ];
  for (const k of keys) {
    const val = process.env[k];
    if (val && typeof val === 'string' && val.trim().length > 0) {
      const trimmed = val.trim();
      if (trimmed.startsWith('postgres://') || trimmed.startsWith('postgresql://')) {
        return trimmed;
      }
    }
  }
  // Quét phòng trường hợp người dùng vô tình nhập tên biến kèm dấu cách (vd: "DATABASE_URL ")
  for (const [k, v] of Object.entries(process.env)) {
    if (k.trim().toUpperCase() === 'DATABASE_URL' && typeof v === 'string' && v.trim().length > 0) {
      return v.trim();
    }
  }
  return process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : undefined;
}

export function isDatabaseConfigured(): boolean {
  const url = getRawDatabaseUrl();
  return Boolean(url && url.length > 0);
}

export function getDbPool(): pg.Pool | null {
  if (!isDatabaseConfigured()) return null;
  if (!pool) {
    const rawUrl = getRawDatabaseUrl()!;
    const connectionString = normalizeDatabaseUrl(rawUrl);
    const isRemote =
      !connectionString.includes('localhost') &&
      !connectionString.includes('127.0.0.1');

    pool = new Pool({
      connectionString,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
      max: process.env.VERCEL ? 4 : 20, // Giới hạn connection pool trên Vercel Serverless Function tránh làm tràn quota của Supabase
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[PostgreSQL] Unexpected error on idle client:', err);
    });
  }
  return pool;
}

/**
 * Tự động khởi tạo cấu trúc bảng trên PostgreSQL khi kết nối lần đầu
 */
export async function initDatabase(): Promise<boolean> {
  const p = getDbPool();
  if (!p) {
    console.log('[Database] DATABASE_URL not set - using in-memory / local storage mode');
    return false;
  }

  if (isInitialized) return true;

  try {
    const client = await p.connect();
    try {
      console.log('[Database] 🚀 Đang kết nối tới PostgreSQL Supabase...');
      let sql = DEFAULT_SCHEMA_SQL;
      const schemaPath = path.resolve(process.cwd(), 'server', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        try {
          sql = fs.readFileSync(schemaPath, 'utf8');
        } catch {
          sql = DEFAULT_SCHEMA_SQL;
        }
      }
      await client.query(sql);
      console.log('[Database] ✅ Cấu trúc bảng PostgreSQL (Supabase) đã được xác thực & khởi tạo thành công!');
      isInitialized = true;
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[Database] ❌ Lỗi kết nối CSDL PostgreSQL Supabase:', err?.message || err);
    if (pool) {
      try {
        await pool.end();
      } catch {}
      pool = null;
    }
    isInitialized = false;
    return false;
  }
}

/**
 * Tải toàn bộ tài khoản người chơi từ PostgreSQL
 */
export async function dbLoadUsers(): Promise<Map<string, ServerUserRecord> | null> {
  const p = getDbPool();
  if (!p) return null;

  try {
    const res = await p.query(`
      SELECT id, username, email, display_name as "displayName", avatar, frame,
             password_hash as "passwordHash", salt, is_admin as "isAdmin",
             is_verified as "isVerified", auth_provider as "authProvider",
             session_tokens as "sessionTokens",
             best_wpm as "bestWpm", best_wpm_record as "bestWpmRecord",
             total_games as "totalGames", match_history as "matchHistory",
             showcase_achievements as "showcaseAchievements",
             unlocked_achievements as "unlockedAchievements",
             cultivation, created_at as "createdAt", updated_at as "updatedAt"
      FROM app_users
    `);

    const usersMap = new Map<string, ServerUserRecord>();
    for (const row of res.rows) {
      usersMap.set(row.id, {
        id: row.id,
        username: row.username,
        email: row.email,
        displayName: row.displayName,
        avatar: row.avatar || '🧘',
        frame: row.frame || 'wood',
        passwordHash: row.passwordHash,
        salt: row.salt,
        isAdmin: Boolean(row.isAdmin),
        isVerified: Boolean(row.isVerified),
        authProvider: (row.authProvider as 'google' | 'email') || 'email',
        sessionTokens: Array.isArray(row.sessionTokens) ? row.sessionTokens : [],
        bestWpm: Number(row.bestWpm) || 0,
        bestWpmRecord: row.bestWpmRecord,
        totalGames: Number(row.totalGames) || 0,
        matchHistory: row.matchHistory || [],
        showcaseAchievements: row.showcaseAchievements || [],
        unlockedAchievements: row.unlockedAchievements || [],
        cultivation: row.cultivation,
        createdAt: Number(row.createdAt) || Date.now(),
        updatedAt: Number(row.updatedAt) || Date.now(),
      });
    }
    console.log(`[Database] Loaded ${usersMap.size} users from PostgreSQL.`);
    return usersMap;
  } catch (err) {
    console.error('[Database] Error loading users from PostgreSQL:', err);
    return null;
  }
}

/**
 * Lưu hoặc cập nhật một tài khoản người chơi vào PostgreSQL
 */
export async function dbSaveUser(user: ServerUserRecord): Promise<void> {
  const p = getDbPool();
  if (!p) return;

  const query = `
    INSERT INTO app_users (
      id, username, email, display_name, avatar, frame,
      password_hash, salt, is_admin, is_verified, auth_provider,
      session_tokens, best_wpm, best_wpm_record, total_games, match_history,
      showcase_achievements, unlocked_achievements, cultivation,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16,
      $17, $18, $19,
      $20, $21
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      avatar = EXCLUDED.avatar,
      frame = EXCLUDED.frame,
      password_hash = EXCLUDED.password_hash,
      salt = EXCLUDED.salt,
      is_admin = EXCLUDED.is_admin,
      is_verified = EXCLUDED.is_verified,
      auth_provider = EXCLUDED.auth_provider,
      session_tokens = EXCLUDED.session_tokens,
      best_wpm = EXCLUDED.best_wpm,
      best_wpm_record = EXCLUDED.best_wpm_record,
      total_games = EXCLUDED.total_games,
      match_history = EXCLUDED.match_history,
      showcase_achievements = EXCLUDED.showcase_achievements,
      unlocked_achievements = EXCLUDED.unlocked_achievements,
      cultivation = EXCLUDED.cultivation,
      updated_at = EXCLUDED.updated_at;
  `;

  const values = [
    user.id,
    user.username,
    user.email || null,
    user.displayName || user.username,
    user.avatar || '🧘',
    user.frame || 'wood',
    user.passwordHash || null,
    user.salt || null,
    Boolean(user.isAdmin),
    Boolean(user.isVerified),
    user.authProvider || 'email',
    JSON.stringify(user.sessionTokens || []),
    user.bestWpm || 0,
    JSON.stringify(user.bestWpmRecord || null),
    user.totalGames || 0,
    JSON.stringify(user.matchHistory || []),
    JSON.stringify(user.showcaseAchievements || []),
    JSON.stringify(user.unlockedAchievements || []),
    JSON.stringify(user.cultivation || null),
    user.createdAt || Date.now(),
    Date.now(),
  ];

  try {
    await p.query(query, values);
  } catch (err) {
    console.error(`[Database] Failed to upsert user ${user.id} (${user.username}):`, err);
  }
}

/**
 * Tải danh sách Tông môn từ PostgreSQL
 */
export async function dbLoadSects(): Promise<any[] | null> {
  const p = getDbPool();
  if (!p) return null;

  try {
    const res = await p.query('SELECT * FROM app_sects ORDER BY level DESC, exp DESC');
    if (res.rows.length === 0) return null;
    return res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      tag: row.tag,
      description: row.description,
      icon: row.icon,
      leaderId: row.leader_id,
      leaderName: row.leader_name,
      level: row.level,
      exp: row.exp,
      members: row.members || [],
      buffs: row.buffs || {},
    }));
  } catch (err) {
    console.error('[Database] Error loading sects from PostgreSQL:', err);
    return null;
  }
}

/**
 * Lưu danh sách Tông môn vào PostgreSQL
 */
export async function dbSaveSects(sects: any[]): Promise<void> {
  const p = getDbPool();
  if (!p) return;

  const client = await p.connect();
  try {
    await client.query('BEGIN');
    for (const sect of sects) {
      await client.query(`
        INSERT INTO app_sects (id, name, tag, description, icon, leader_id, leader_name, level, exp, members, buffs, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          tag = EXCLUDED.tag,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon,
          leader_id = EXCLUDED.leader_id,
          leader_name = EXCLUDED.leader_name,
          level = EXCLUDED.level,
          exp = EXCLUDED.exp,
          members = EXCLUDED.members,
          buffs = EXCLUDED.buffs,
          updated_at = NOW();
      `, [
        sect.id,
        sect.name,
        sect.tag,
        sect.description || '',
        sect.icon || '⚔️',
        sect.leaderId || null,
        sect.leaderName || null,
        sect.level || 1,
        sect.exp || 0,
        JSON.stringify(sect.members || []),
        JSON.stringify(sect.buffs || {}),
      ]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Database] Failed to save sects to PostgreSQL:', err);
  } finally {
    client.release();
  }
}

/**
 * Tải dữ liệu Phường Thị P2P từ PostgreSQL
 */
export async function dbLoadMarket(): Promise<{ listings: MarketListing[]; logs: MarketLog[] } | null> {
  const p = getDbPool();
  if (!p) return null;

  try {
    const listingsRes = await p.query(`
      SELECT id, seller_id as "sellerId", seller_username as "sellerUsername",
             seller_avatar as "sellerAvatar", seller_frame as "sellerFrame",
             item_type as "itemType", item_id as "itemId",
             item_name as "itemName", item_icon as "itemIcon", quality,
             quantity, price_per_unit as "pricePerUnit", total_price as "totalPrice",
             listed_at as "listedAt", expires_at as "expiresAt", status,
             buyer_id as "buyerId", buyer_username as "buyerUsername", sold_at as "soldAt"
      FROM app_market_listings
      WHERE status = 'active'
      ORDER BY listed_at DESC
    `);

    const logsRes = await p.query(`
      SELECT id, type, details, timestamp,
             actor_username as "actorUsername", target_username as "targetUsername",
             amount
      FROM app_market_logs
      ORDER BY timestamp DESC
      LIMIT 100
    `);

    return {
      listings: listingsRes.rows,
      logs: logsRes.rows,
    };
  } catch (err) {
    console.error('[Database] Error loading market from PostgreSQL:', err);
    return null;
  }
}

/**
 * Lưu tin niêm yết Phường Thị vào PostgreSQL
 */
export async function dbSaveMarketListing(listing: MarketListing): Promise<void> {
  const p = getDbPool();
  if (!p) return;

  try {
    await p.query(`
      INSERT INTO app_market_listings (
        id, seller_id, seller_username, seller_avatar, seller_frame,
        item_type, item_id, item_name, item_icon, quality,
        quantity, price_per_unit, total_price, listed_at, expires_at, status,
        buyer_id, buyer_username, sold_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (id) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        status = EXCLUDED.status,
        buyer_id = EXCLUDED.buyer_id,
        buyer_username = EXCLUDED.buyer_username,
        sold_at = EXCLUDED.sold_at;
    `, [
      listing.id,
      listing.sellerId,
      listing.sellerUsername,
      listing.sellerAvatar || '🧘',
      listing.sellerFrame || 'wood',
      listing.itemType,
      listing.itemId,
      listing.itemName,
      listing.itemIcon,
      listing.quality || 'ha_pham',
      listing.quantity,
      listing.pricePerUnit,
      listing.totalPrice,
      listing.listedAt,
      listing.expiresAt,
      listing.status || 'active',
      listing.buyerId || null,
      listing.buyerUsername || null,
      listing.soldAt || null,
    ]);
  } catch (err) {
    console.error('[Database] Error saving market listing:', err);
  }
}

/**
 * Lưu log giao dịch Phường Thị vào PostgreSQL
 */
export async function dbSaveMarketLog(log: MarketLog): Promise<void> {
  const p = getDbPool();
  if (!p) return;

  try {
    await p.query(`
      INSERT INTO app_market_logs (
        id, type, details, timestamp, actor_username, target_username, amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING;
    `, [
      log.id,
      log.type,
      log.details,
      log.timestamp,
      log.actorUsername,
      log.targetUsername || null,
      log.amount || null,
    ]);
  } catch (err) {
    console.error('[Database] Error saving market log:', err);
  }
}

/**
 * Tải Bảng xếp hạng từ PostgreSQL
 */
export async function dbLoadLeaderboard(): Promise<ServerMultiLeaderboard | null> {
  const p = getDbPool();
  if (!p) return null;

  try {
    const res = await p.query("SELECT data FROM app_leaderboards WHERE id = 'main'");
    if (res.rows.length > 0 && res.rows[0].data) {
      return res.rows[0].data as ServerMultiLeaderboard;
    }
    return null;
  } catch (err) {
    console.error('[Database] Error loading leaderboard from PostgreSQL:', err);
    return null;
  }
}

/**
 * Lưu Bảng xếp hạng vào PostgreSQL
 */
export async function dbSaveLeaderboard(board: ServerMultiLeaderboard): Promise<void> {
  const p = getDbPool();
  if (!p) return;

  try {
    await p.query(`
      INSERT INTO app_leaderboards (id, data, updated_at)
      VALUES ('main', $1, NOW())
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = NOW();
    `, [JSON.stringify(board)]);
  } catch (err) {
    console.error('[Database] Error saving leaderboard to PostgreSQL:', err);
  }
}

/**
 * Tải danh sách tài khoản bị cấm từ PostgreSQL
 */
export async function dbLoadBannedUsers(): Promise<string[] | null> {
  const p = getDbPool();
  if (!p) return null;

  try {
    const res = await p.query('SELECT identifier FROM app_banned_users');
    return res.rows.map((r) => r.identifier);
  } catch (err) {
    console.error('[Database] Error loading banned users from PostgreSQL:', err);
    return null;
  }
}

/**
 * Lưu danh sách tài khoản bị cấm vào PostgreSQL
 */
export async function dbSaveBannedUsers(bannedIdentifiers: string[]): Promise<void> {
  const p = getDbPool();
  if (!p) return;

  const client = await p.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM app_banned_users');
    for (const id of bannedIdentifiers) {
      await client.query(`
        INSERT INTO app_banned_users (identifier, created_at)
        VALUES ($1, EXTRACT(EPOCH FROM NOW()) * 1000)
        ON CONFLICT (identifier) DO NOTHING
      `, [id]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Database] Error saving banned users to PostgreSQL:', err);
  } finally {
    client.release();
  }
}

/**
 * Lưu hoặc cập nhật một phòng chơi vào Supabase (Hỗ trợ đa người chơi trên Vercel Serverless)
 */
export async function dbSaveRoom(room: any): Promise<void> {
  const p = getDbPool();
  if (!p || !room || !room.id) return;

  try {
    await p.query(`
      INSERT INTO app_game_rooms (id, data, status, updated_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at;
    `, [
      room.id,
      JSON.stringify(room),
      room.status || 'waiting',
      Date.now(),
    ]);
  } catch (err) {
    // Không log lỗi quá ồn ào khi phòng cập nhật liên tục
  }
}

/**
 * Tải một phòng chơi từ Supabase
 */
export async function dbLoadRoom(roomId: string): Promise<any | null> {
  const p = getDbPool();
  if (!p || !roomId) return null;

  try {
    const res = await p.query('SELECT data FROM app_game_rooms WHERE id = $1', [roomId]);
    if (res.rows.length > 0 && res.rows[0].data) {
      return res.rows[0].data;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Tải tất cả các phòng đang chờ hoặc đang đua còn hoạt động (trong vòng 30 phút)
 */
export async function dbLoadActiveRooms(): Promise<any[] | null> {
  const p = getDbPool();
  if (!p) return null;

  try {
    const threshold = Date.now() - 30 * 60 * 1000;
    const res = await p.query(
      "SELECT data FROM app_game_rooms WHERE status != 'closed' AND updated_at > $1 ORDER BY updated_at DESC LIMIT 50",
      [threshold]
    );
    return res.rows.map((r) => r.data);
  } catch (err) {
    return null;
  }
}

/**
 * Đóng hoặc xóa phòng chơi khỏi Supabase
 */
export async function dbDeleteRoom(roomId: string): Promise<void> {
  const p = getDbPool();
  if (!p || !roomId) return;

  try {
    await p.query("UPDATE app_game_rooms SET status = 'closed', updated_at = $1 WHERE id = $2", [Date.now(), roomId]);
  } catch (err) {
    // Ignore
  }
}

/**
 * Lưu một tin nhắn chat vào Supabase (Đồng bộ tán gẫu thời gian thực trên Vercel Serverless)
 */
export async function dbSaveChatMessage(msg: any): Promise<void> {
  const p = getDbPool();
  if (!p || !msg || !msg.id) return;

  try {
    await p.query(`
      INSERT INTO app_chat_messages (id, channel, data, timestamp)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING;
    `, [
      msg.id,
      msg.channel || 'global',
      JSON.stringify(msg),
      Number(msg.timestamp) || Date.now(),
    ]);
  } catch (err) {
    // Ignore
  }
}

/**
 * Tải lịch sử tin nhắn chat mới nhất từ Supabase
 */
export async function dbLoadChatMessages(limit = 100): Promise<any[] | null> {
  const p = getDbPool();
  if (!p) return null;

  try {
    const res = await p.query(
      'SELECT data FROM app_chat_messages ORDER BY timestamp DESC LIMIT $1',
      [limit]
    );
    return res.rows.map((r) => r.data).reverse();
  } catch (err) {
    return null;
  }
}

/**
 * Kiểm tra trạng thái kết nối trực tiếp đến PostgreSQL (Supabase)
 */
export async function checkDatabaseHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  type: string;
  latencyMs?: number;
  tablesVerified?: boolean;
  error?: string;
}> {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      type: 'local_json_storage',
    };
  }

  const p = getDbPool();
  if (!p) {
    return {
      configured: true,
      connected: false,
      type: 'postgresql_supabase',
      error: 'Không thể khởi tạo Connection Pool',
    };
  }

  const start = Date.now();
  try {
    const client = await p.connect();
    try {
      await client.query('SELECT 1');
      const latencyMs = Date.now() - start;
      return {
        configured: true,
        connected: true,
        type: 'postgresql_supabase',
        latencyMs,
        tablesVerified: isInitialized,
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      type: 'postgresql_supabase',
      error: err?.message || String(err),
    };
  }
}

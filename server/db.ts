import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { ServerUserRecord, ServerMultiLeaderboard, MarketListing, MarketLog, ServerFriendshipRecord, ServerFriendRequestRecord } from './types';

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
  data JSONB,
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

CREATE TABLE IF NOT EXISTS app_friendships (
  id TEXT PRIMARY KEY,
  user1_id TEXT NOT NULL,
  user2_id TEXT NOT NULL,
  intimacy INTEGER DEFAULT 60,
  is_daolu BOOLEAN DEFAULT FALSE,
  daolu_sworn_at BIGINT,
  last_interact_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_friendships_u1 ON app_friendships (user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_u2 ON app_friendships (user2_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_pair ON app_friendships (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

CREATE TABLE IF NOT EXISTS app_friend_requests (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  from_username TEXT NOT NULL,
  from_avatar TEXT DEFAULT '🧘',
  from_frame TEXT DEFAULT 'wood',
  to_user_id TEXT NOT NULL,
  to_username TEXT NOT NULL,
  message TEXT DEFAULT 'Kết bái đạo hữu, cùng đàm đạo gõ phím!',
  status TEXT DEFAULT 'pending',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_friend_req_to ON app_friend_requests (to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_req_from ON app_friend_requests (from_user_id, status);
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
      // Đảm bảo cột data JSONB tồn tại trong app_sects
      await client.query('ALTER TABLE app_sects ADD COLUMN IF NOT EXISTS data JSONB;').catch(() => {});
      console.log('[Database] ✅ Cấu trúc bảng PostgreSQL (Supabase) đã được xác thực & khởi tạo thành công!');
      isInitialized = true;

      // Tự động dọn dẹp các tông môn tự tạo và tài khoản ảo trên Supabase
      try {
        await dbCleanAutoGeneratedData();
      } catch (cleanErr) {
        console.warn('[Database] Cảnh báo khi dọn dẹp dữ liệu tự sinh:', cleanErr);
      }

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
    const DEFAULT_SECT_IDS = new Set(['sect_thuc_son', 'sect_van_hoa', 'sect_tieu_dao', 'sect_u_minh']);
    for (const row of res.rows) {
      let cult = row.cultivation;
      if (cult?.sect?.sectId && (DEFAULT_SECT_IDS.has(cult.sect.sectId) || String(cult.sect.sectId).startsWith('sect_thuc_son'))) {
        cult = { ...cult };
        delete cult.sect;
      }

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
        cultivation: cult,
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
    // Tự động dọn dẹp triệt để các tông môn mặc định tự sinh trước đây
    await p.query(`
      DELETE FROM app_sects 
      WHERE id IN ('sect_thuc_son', 'sect_van_hoa', 'sect_tieu_dao', 'sect_u_minh') 
         OR id LIKE 'sect_thuc_son%'
    `).catch(() => {});

    const res = await p.query('SELECT * FROM app_sects ORDER BY level DESC, exp DESC');
    if (res.rows.length === 0) return [];
    const DEFAULT_SECT_IDS = new Set(['sect_thuc_son', 'sect_van_hoa', 'sect_tieu_dao', 'sect_u_minh']);
    const validRows = res.rows.filter(
      (row) => row && row.id && !DEFAULT_SECT_IDS.has(row.id) && !String(row.id).startsWith('sect_thuc_son')
    );
    return validRows.map((row) => {
      let rawData: any = {};
      if (row.data) {
        try {
          rawData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        } catch {
          rawData = {};
        }
      }
      return {
        ...rawData,
        id: row.id,
        name: row.name || rawData.name,
        tag: row.tag || rawData.tag,
        description: row.description || rawData.description,
        icon: row.icon || rawData.icon || rawData.badgeIcon || '⚔️',
        badgeIcon: rawData.badgeIcon || row.icon || '⚔️',
        leaderId: row.leader_id || rawData.leaderId,
        leaderName: row.leader_name || rawData.leaderName,
        level: Number(row.level) || Number(rawData.level) || Number(rawData.linhMachLevel) || 1,
        linhMachLevel: Number(rawData.linhMachLevel) || Number(row.level) || 1,
        exp: Number(row.exp) || Number(rawData.exp) || 0,
        members: (Array.isArray(rawData.members) && rawData.members.length > 0)
          ? rawData.members
          : (Array.isArray(row.members) ? row.members : []),
        buffs: row.buffs || rawData.buffs || {},
        createdAt: Number(row.created_at) || rawData.createdAt || Date.now(),
      };
    });
  } catch (err) {
    console.error('[Database] Error loading sects from PostgreSQL:', err);
    return null;
  }
}

/**
 * Lưu hoặc cập nhật một Tông môn đơn lẻ vào PostgreSQL (Supabase)
 */
export async function dbSaveSect(sect: any): Promise<boolean> {
  const p = getDbPool();
  if (!p || !sect || !sect.id) return false;

  try {
    const query = `
      INSERT INTO app_sects (
        id, name, tag, description, icon, leader_id, leader_name, level, exp, members, buffs, data, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
      )
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
        data = EXCLUDED.data,
        updated_at = NOW();
    `;

    const values = [
      sect.id,
      sect.name,
      sect.tag,
      sect.description || '',
      sect.badgeIcon || sect.icon || '⚔️',
      sect.leaderId || null,
      sect.leaderName || null,
      sect.linhMachLevel || sect.level || 1,
      sect.exp || 0,
      JSON.stringify(sect.members || []),
      JSON.stringify(sect.buffs || {}),
      JSON.stringify(sect),
      sect.createdAt || Date.now(),
    ];

    await p.query(query, values);
    console.log(`[Database] ✅ Đã lưu tông môn "${sect.name}" [${sect.tag}] (${sect.id}) vào Supabase.`);
    return true;
  } catch (err: any) {
    console.error(`[Database] ❌ Lỗi lưu tông môn "${sect.name}" vào Supabase:`, err?.message || err);
    return false;
  }
}

/**
 * Lưu danh sách Tông môn vào PostgreSQL
 */
export async function dbSaveSects(sects: any[]): Promise<void> {
  const p = getDbPool();
  if (!p || !Array.isArray(sects)) return;

  for (const sect of sects) {
    if (sect && sect.id) {
      await dbSaveSect(sect);
    }
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

/**
 * Xóa một tài khoản người chơi khỏi PostgreSQL (Supabase)
 */
export async function dbDeleteUser(userId: string): Promise<boolean> {
  const p = getDbPool();
  if (!p) return false;

  try {
    await p.query('DELETE FROM app_users WHERE id = $1', [userId]);
    return true;
  } catch (err) {
    console.error(`[Database] Lỗi xóa tài khoản ${userId} khỏi PostgreSQL:`, err);
    return false;
  }
}

/**
 * Xóa toàn bộ tài khoản và tông môn được tạo tự động khỏi PostgreSQL Supabase
 */
export async function dbCleanAutoGeneratedData(): Promise<{
  deletedSectsCount: number;
  deletedUsersCount: number;
}> {
  const p = getDbPool();
  if (!p) {
    return { deletedSectsCount: 0, deletedUsersCount: 0 };
  }

  const client = await p.connect();
  try {
    await client.query('BEGIN');

    // 1. Xóa tất cả các tông môn tạo tự động (default / non-custom)
    const sectsRes = await client.query(`
      DELETE FROM app_sects
      WHERE id NOT LIKE 'sect_custom_%'
         OR id IN ('sect_thuc_son', 'sect_van_hoa', 'sect_tieu_dao', 'sect_u_minh')
         OR id LIKE 'sect_thuc_son%'
         OR tag IN ('TS', 'VH', 'TD', 'UM', 'TT')
         OR name IN ('Thục Sơn Kiếm Tông', 'Vạn Hoa Linh Cốc', 'Tiêu Dao Môn', 'U Minh Ma Điện')
    `);
    const deletedSectsCount = sectsRes.rowCount || 0;

    // 2. Xóa tất cả các tài khoản bot hoặc tạo tự động (giữ lại tài khoản admin và người chơi thật)
    const usersRes = await client.query(`
      DELETE FROM app_users
      WHERE id != 'usr_admin_default'
        AND LOWER(username) != 'admin'
        AND (
          id LIKE 'bot_%'
          OR id LIKE 'mock_%'
          OR id LIKE 'dummy_%'
          OR id LIKE 'test_%'
          OR id LIKE 'fake_%'
          OR LOWER(username) LIKE 'bot_%'
          OR LOWER(username) LIKE 'mock_%'
          OR LOWER(username) LIKE 'dummy_%'
          OR LOWER(username) LIKE 'test_%'
          OR LOWER(username) LIKE 'fake_%'
          OR LOWER(username) LIKE 'user_demo%'
          OR LOWER(username) LIKE 'guest_%'
        )
    `);
    const deletedUsersCount = usersRes.rowCount || 0;

    // 3. Gỡ bỏ liên kết tông môn mặc định khỏi toàn bộ tài khoản người chơi còn lại
    await client.query(`
      UPDATE app_users
      SET cultivation = cultivation - 'sect'
      WHERE cultivation->'sect'->>'sectId' IN ('sect_thuc_son', 'sect_van_hoa', 'sect_tieu_dao', 'sect_u_minh')
         OR cultivation->'sect'->>'sectId' LIKE 'sect_thuc_son%'
         OR (cultivation->'sect'->>'sectId' IS NOT NULL AND cultivation->'sect'->>'sectId' NOT LIKE 'sect_custom_%')
    `);

    await client.query('COMMIT');
    console.log(`[Database Cleanup] ✅ Đã xóa ${deletedSectsCount} tông môn tự động và ${deletedUsersCount} tài khoản tự động khỏi Supabase.`);
    return { deletedSectsCount, deletedUsersCount };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Database Cleanup] ❌ Lỗi dọn dẹp dữ liệu tự động trên Supabase:', err);
    return { deletedSectsCount: 0, deletedUsersCount: 0 };
  } finally {
    client.release();
  }
}

/**
 * =========================================================================
 * CÁC HÀM XỬ LÝ QUAN HỆ ĐẠO HỮU (FRIENDSHIPS) TRÊN SUPABASE POSTGRESQL
 * =========================================================================
 */

export async function dbLoadFriendships(): Promise<ServerFriendshipRecord[]> {
  const p = getDbPool();
  if (!p) return [];

  try {
    const res = await p.query(`
      SELECT id, user1_id, user2_id, intimacy, is_daolu, daolu_sworn_at, last_interact_at, created_at, updated_at
      FROM app_friendships
      ORDER BY updated_at DESC
    `);

    return res.rows.map((r) => ({
      id: r.id,
      user1Id: r.user1_id,
      user2Id: r.user2_id,
      intimacy: Number(r.intimacy) || 60,
      isDaoLu: Boolean(r.is_daolu),
      daoLuTitle: r.is_daolu ? 'Đạo Lữ Song Tu' : undefined,
      createdAt: Number(r.created_at) || Date.now(),
      updatedAt: Number(r.updated_at) || Date.now(),
    }));
  } catch (err) {
    console.warn('[Database] dbLoadFriendships error (table may not exist yet):', err);
    return [];
  }
}

export async function dbSaveFriendship(fsRecord: ServerFriendshipRecord): Promise<boolean> {
  const p = getDbPool();
  if (!p) return false;

  try {
    await p.query(
      `
      INSERT INTO app_friendships (id, user1_id, user2_id, intimacy, is_daolu, daolu_sworn_at, last_interact_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        user1_id = EXCLUDED.user1_id,
        user2_id = EXCLUDED.user2_id,
        intimacy = EXCLUDED.intimacy,
        is_daolu = EXCLUDED.is_daolu,
        daolu_sworn_at = EXCLUDED.daolu_sworn_at,
        last_interact_at = EXCLUDED.last_interact_at,
        updated_at = EXCLUDED.updated_at
    `,
      [
        fsRecord.id,
        fsRecord.user1Id,
        fsRecord.user2Id,
        fsRecord.intimacy || 60,
        Boolean(fsRecord.isDaoLu),
        fsRecord.isDaoLu ? fsRecord.updatedAt : null,
        fsRecord.updatedAt || Date.now(),
        fsRecord.createdAt || Date.now(),
        fsRecord.updatedAt || Date.now(),
      ]
    );
    return true;
  } catch (err) {
    console.error('[Database] dbSaveFriendship error:', err);
    return false;
  }
}

export async function dbDeleteFriendship(id: string): Promise<boolean> {
  const p = getDbPool();
  if (!p) return false;

  try {
    await p.query(`DELETE FROM app_friendships WHERE id = $1`, [id]);
    return true;
  } catch (err) {
    console.error('[Database] dbDeleteFriendship error:', err);
    return false;
  }
}

/**
 * =========================================================================
 * CÁC HÀM XỬ LÝ LỜI MỜI KẾT BÁI (FRIEND REQUESTS) TRÊN SUPABASE POSTGRESQL
 * =========================================================================
 */

export async function dbLoadFriendRequests(): Promise<ServerFriendRequestRecord[]> {
  const p = getDbPool();
  if (!p) return [];

  try {
    const res = await p.query(`
      SELECT id, from_user_id, from_username, from_avatar, from_frame, to_user_id, to_username, message, status, created_at, updated_at
      FROM app_friend_requests
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `);

    return res.rows.map((r) => ({
      id: r.id,
      fromUserId: r.from_user_id,
      fromUsername: r.from_username,
      toUserId: r.to_user_id,
      toUsername: r.to_username,
      message: r.message,
      createdAt: Number(r.created_at) || Date.now(),
      status: r.status,
      fromAvatar: r.from_avatar,
      fromFrame: r.from_frame,
    }));
  } catch (err) {
    console.warn('[Database] dbLoadFriendRequests error (table may not exist yet):', err);
    return [];
  }
}

export async function dbSaveFriendRequest(reqRecord: ServerFriendRequestRecord & { status?: string; fromAvatar?: string; fromFrame?: string }): Promise<boolean> {
  const p = getDbPool();
  if (!p) return false;

  try {
    await p.query(
      `
      INSERT INTO app_friend_requests (id, from_user_id, from_username, from_avatar, from_frame, to_user_id, to_username, message, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        message = EXCLUDED.message,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `,
      [
        reqRecord.id,
        reqRecord.fromUserId,
        reqRecord.fromUsername || 'Đạo Hữu',
        (reqRecord as any).fromAvatar || '🧘',
        (reqRecord as any).fromFrame || 'wood',
        reqRecord.toUserId,
        reqRecord.toUsername || 'Đạo Hữu',
        reqRecord.message || 'Kết bái đạo hữu, cùng đàm đạo gõ phím!',
        reqRecord.status || 'pending',
        reqRecord.createdAt || Date.now(),
        Date.now(),
      ]
    );
    return true;
  } catch (err) {
    console.error('[Database] dbSaveFriendRequest error:', err);
    return false;
  }
}

export async function dbDeleteFriendRequest(id: string): Promise<boolean> {
  const p = getDbPool();
  if (!p) return false;

  try {
    await p.query(`DELETE FROM app_friend_requests WHERE id = $1`, [id]);
    return true;
  } catch (err) {
    console.error('[Database] dbDeleteFriendRequest error:', err);
    return false;
  }
}



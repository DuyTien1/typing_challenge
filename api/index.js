// server.ts
import "dotenv/config";
import express from "express";
import path3 from "path";
import fs3 from "fs";
import http from "http";
import crypto2 from "crypto";
import { GoogleGenAI } from "@google/genai";

// server/utils.ts
import crypto from "crypto";
import path from "path";
function normalizeRoomCode(input) {
  if (!input) return "";
  let cleaned = input.trim().toUpperCase();
  cleaned = cleaned.replace(/^(MÃ\s*PHÒNG|MA\s*PHONG|PHÒNG|PHONG|ROOM|CODE|MÃ|MA)[:\s]*/i, "").trim();
  cleaned = cleaned.replace(/^#+/, "").trim();
  cleaned = cleaned.replace(/#/g, "").trim();
  if (!cleaned) return "";
  const matchVn = cleaned.match(/^VN[-_\s]*(\d+)/i);
  if (matchVn) {
    return `VN-${matchVn[1]}`;
  }
  const matchDigits = cleaned.match(/^(\d+)$/);
  if (matchDigits) {
    return `VN-${matchDigits[1]}`;
  }
  if (cleaned.startsWith("VN-")) {
    return cleaned;
  }
  if (cleaned.startsWith("VN")) {
    const rest = cleaned.slice(2).replace(/^[-_\s]+/, "");
    return `VN-${rest}`;
  }
  return `VN-${cleaned}`;
}
function getModeDisplayName(mode) {
  switch (mode) {
    case "vi_dau":
      return "Ti\u1EBFng Vi\u1EC7t C\xF3 D\u1EA5u";
    case "vi_nodau":
      return "Ti\u1EBFng Vi\u1EC7t Kh\xF4ng D\u1EA5u";
    case "en":
      return "Ti\u1EBFng Anh (English)";
    case "numpad":
      return "B\xE0n Ph\xEDm S\u1ED1 (Numpad)";
    case "ngau_hung":
      return "Ng\u1EABu H\u1EE9ng (Rush)";
    case "doan_chu":
      return "\u0110o\xE1n Ch\u1EEF (Mystery)";
    case "san_boss":
      return "S\u0103n Boss (Raid)";
    case "outplay":
      return "Outplay Yourself (Solo)";
    default:
      return mode;
  }
}
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1e3, 32, "sha256").toString("hex");
}
function getSafeStoragePath(filename) {
  return path.join(process.cwd(), filename);
}

// server/economy.ts
import fs2 from "fs";

// server/db.ts
import pg from "pg";
import fs from "fs";
import path2 from "path";
var { Pool } = pg;
var pool = null;
var isInitialized = false;
var DEFAULT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  avatar TEXT DEFAULT '\u{1F9D8}',
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
  seller_avatar TEXT DEFAULT '\u{1F9D8}',
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
function normalizeDatabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  let urlStr = rawUrl.trim();
  if (urlStr.startsWith('"') && urlStr.endsWith('"') || urlStr.startsWith("'") && urlStr.endsWith("'")) {
    urlStr = urlStr.slice(1, -1).trim();
  }
  try {
    const parsed = new URL(urlStr);
    let pass = parsed.password;
    if (pass.startsWith("%5B") && pass.endsWith("%5D")) {
      pass = pass.slice(3, -3);
    } else if (pass.startsWith("[") && pass.endsWith("]")) {
      pass = pass.slice(1, -1);
    }
    parsed.password = pass;
    const supabaseMatch = parsed.hostname.match(/^db\.([a-z0-9_-]+)\.supabase\.co$/i);
    if (supabaseMatch) {
      const projectRef = supabaseMatch[1];
      parsed.hostname = "aws-0-ap-southeast-1.pooler.supabase.com";
      parsed.port = "6543";
      if (!parsed.username.includes(".")) {
        parsed.username = `postgres.${projectRef}`;
      }
    }
    return parsed.toString();
  } catch {
    return urlStr;
  }
}
function getRawDatabaseUrl() {
  const keys = [
    "DATABASE_URL",
    "VITE_DATABASE_URL",
    "DATABASE_URI",
    "POSTGRES_URL",
    "POSTGRESQL_URL",
    "SUPABASE_DATABASE_URL",
    "VITE_SUPABASE_DATABASE_URL",
    "SUPABASE_URL",
    "DB_URL"
  ];
  for (const k of keys) {
    const val = process.env[k];
    if (val && typeof val === "string" && val.trim().length > 0) {
      const trimmed = val.trim();
      if (trimmed.startsWith("postgres://") || trimmed.startsWith("postgresql://")) {
        return trimmed;
      }
    }
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (k.trim().toUpperCase() === "DATABASE_URL" && typeof v === "string" && v.trim().length > 0) {
      return v.trim();
    }
  }
  return process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : void 0;
}
function isDatabaseConfigured() {
  const url = getRawDatabaseUrl();
  return Boolean(url && url.length > 0);
}
function getDbPool() {
  if (!isDatabaseConfigured()) return null;
  if (!pool) {
    const rawUrl = getRawDatabaseUrl();
    const connectionString = normalizeDatabaseUrl(rawUrl);
    const isRemote = !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
    pool = new Pool({
      connectionString,
      ssl: isRemote ? { rejectUnauthorized: false } : void 0,
      max: process.env.VERCEL ? 4 : 20,
      // Giới hạn connection pool trên Vercel Serverless Function tránh làm tràn quota của Supabase
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 1e4
    });
    pool.on("error", (err) => {
      console.error("[PostgreSQL] Unexpected error on idle client:", err);
    });
  }
  return pool;
}
async function initDatabase() {
  const p = getDbPool();
  if (!p) {
    console.log("[Database] DATABASE_URL not set - using in-memory / local storage mode");
    return false;
  }
  if (isInitialized) return true;
  try {
    const client = await p.connect();
    try {
      console.log("[Database] \u{1F680} \u0110ang k\u1EBFt n\u1ED1i t\u1EDBi PostgreSQL Supabase...");
      let sql = DEFAULT_SCHEMA_SQL;
      const schemaPath = path2.resolve(process.cwd(), "server", "schema.sql");
      if (fs.existsSync(schemaPath)) {
        try {
          sql = fs.readFileSync(schemaPath, "utf8");
        } catch {
          sql = DEFAULT_SCHEMA_SQL;
        }
      }
      await client.query(sql);
      console.log("[Database] \u2705 C\u1EA5u tr\xFAc b\u1EA3ng PostgreSQL (Supabase) \u0111\xE3 \u0111\u01B0\u1EE3c x\xE1c th\u1EF1c & kh\u1EDFi t\u1EA1o th\xE0nh c\xF4ng!");
      isInitialized = true;
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[Database] \u274C L\u1ED7i k\u1EBFt n\u1ED1i CSDL PostgreSQL Supabase:", err?.message || err);
    if (pool) {
      try {
        await pool.end();
      } catch {
      }
      pool = null;
    }
    isInitialized = false;
    return false;
  }
}
async function dbLoadUsers() {
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
    const usersMap = /* @__PURE__ */ new Map();
    for (const row of res.rows) {
      usersMap.set(row.id, {
        id: row.id,
        username: row.username,
        email: row.email,
        displayName: row.displayName,
        avatar: row.avatar || "\u{1F9D8}",
        frame: row.frame || "wood",
        passwordHash: row.passwordHash,
        salt: row.salt,
        isAdmin: Boolean(row.isAdmin),
        isVerified: Boolean(row.isVerified),
        authProvider: row.authProvider || "email",
        sessionTokens: Array.isArray(row.sessionTokens) ? row.sessionTokens : [],
        bestWpm: Number(row.bestWpm) || 0,
        bestWpmRecord: row.bestWpmRecord,
        totalGames: Number(row.totalGames) || 0,
        matchHistory: row.matchHistory || [],
        showcaseAchievements: row.showcaseAchievements || [],
        unlockedAchievements: row.unlockedAchievements || [],
        cultivation: row.cultivation,
        createdAt: Number(row.createdAt) || Date.now(),
        updatedAt: Number(row.updatedAt) || Date.now()
      });
    }
    console.log(`[Database] Loaded ${usersMap.size} users from PostgreSQL.`);
    return usersMap;
  } catch (err) {
    console.error("[Database] Error loading users from PostgreSQL:", err);
    return null;
  }
}
async function dbSaveUser(user) {
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
    user.avatar || "\u{1F9D8}",
    user.frame || "wood",
    user.passwordHash || null,
    user.salt || null,
    Boolean(user.isAdmin),
    Boolean(user.isVerified),
    user.authProvider || "email",
    JSON.stringify(user.sessionTokens || []),
    user.bestWpm || 0,
    JSON.stringify(user.bestWpmRecord || null),
    user.totalGames || 0,
    JSON.stringify(user.matchHistory || []),
    JSON.stringify(user.showcaseAchievements || []),
    JSON.stringify(user.unlockedAchievements || []),
    JSON.stringify(user.cultivation || null),
    user.createdAt || Date.now(),
    Date.now()
  ];
  try {
    await p.query(query, values);
  } catch (err) {
    console.error(`[Database] Failed to upsert user ${user.id} (${user.username}):`, err);
  }
}
async function dbLoadSects() {
  const p = getDbPool();
  if (!p) return null;
  try {
    const res = await p.query("SELECT * FROM app_sects ORDER BY level DESC, exp DESC");
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
      buffs: row.buffs || {}
    }));
  } catch (err) {
    console.error("[Database] Error loading sects from PostgreSQL:", err);
    return null;
  }
}
async function dbSaveSects(sects) {
  const p = getDbPool();
  if (!p) return;
  const client = await p.connect();
  try {
    await client.query("BEGIN");
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
        sect.description || "",
        sect.icon || "\u2694\uFE0F",
        sect.leaderId || null,
        sect.leaderName || null,
        sect.level || 1,
        sect.exp || 0,
        JSON.stringify(sect.members || []),
        JSON.stringify(sect.buffs || {})
      ]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Database] Failed to save sects to PostgreSQL:", err);
  } finally {
    client.release();
  }
}
async function dbLoadMarket() {
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
      logs: logsRes.rows
    };
  } catch (err) {
    console.error("[Database] Error loading market from PostgreSQL:", err);
    return null;
  }
}
async function dbSaveMarketListing(listing) {
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
      listing.sellerAvatar || "\u{1F9D8}",
      listing.sellerFrame || "wood",
      listing.itemType,
      listing.itemId,
      listing.itemName,
      listing.itemIcon,
      listing.quality || "ha_pham",
      listing.quantity,
      listing.pricePerUnit,
      listing.totalPrice,
      listing.listedAt,
      listing.expiresAt,
      listing.status || "active",
      listing.buyerId || null,
      listing.buyerUsername || null,
      listing.soldAt || null
    ]);
  } catch (err) {
    console.error("[Database] Error saving market listing:", err);
  }
}
async function dbSaveMarketLog(log) {
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
      log.amount || null
    ]);
  } catch (err) {
    console.error("[Database] Error saving market log:", err);
  }
}
async function dbLoadLeaderboard() {
  const p = getDbPool();
  if (!p) return null;
  try {
    const res = await p.query("SELECT data FROM app_leaderboards WHERE id = 'main'");
    if (res.rows.length > 0 && res.rows[0].data) {
      return res.rows[0].data;
    }
    return null;
  } catch (err) {
    console.error("[Database] Error loading leaderboard from PostgreSQL:", err);
    return null;
  }
}
async function dbSaveLeaderboard(board) {
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
    console.error("[Database] Error saving leaderboard to PostgreSQL:", err);
  }
}
async function dbLoadBannedUsers() {
  const p = getDbPool();
  if (!p) return null;
  try {
    const res = await p.query("SELECT identifier FROM app_banned_users");
    return res.rows.map((r) => r.identifier);
  } catch (err) {
    console.error("[Database] Error loading banned users from PostgreSQL:", err);
    return null;
  }
}
async function dbSaveBannedUsers(bannedIdentifiers) {
  const p = getDbPool();
  if (!p) return;
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM app_banned_users");
    for (const id of bannedIdentifiers) {
      await client.query(`
        INSERT INTO app_banned_users (identifier, created_at)
        VALUES ($1, EXTRACT(EPOCH FROM NOW()) * 1000)
        ON CONFLICT (identifier) DO NOTHING
      `, [id]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Database] Error saving banned users to PostgreSQL:", err);
  } finally {
    client.release();
  }
}
async function dbSaveRoom(room) {
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
      room.status || "waiting",
      Date.now()
    ]);
  } catch (err) {
  }
}
async function dbLoadRoom(roomId) {
  const p = getDbPool();
  if (!p || !roomId) return null;
  try {
    const res = await p.query("SELECT data FROM app_game_rooms WHERE id = $1", [roomId]);
    if (res.rows.length > 0 && res.rows[0].data) {
      return res.rows[0].data;
    }
    return null;
  } catch (err) {
    return null;
  }
}
async function dbLoadActiveRooms() {
  const p = getDbPool();
  if (!p) return null;
  try {
    const threshold = Date.now() - 30 * 60 * 1e3;
    const res = await p.query(
      "SELECT data FROM app_game_rooms WHERE status != 'closed' AND updated_at > $1 ORDER BY updated_at DESC LIMIT 50",
      [threshold]
    );
    return res.rows.map((r) => r.data);
  } catch (err) {
    return null;
  }
}
async function checkDatabaseHealth() {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      type: "local_json_storage"
    };
  }
  const p = getDbPool();
  if (!p) {
    return {
      configured: true,
      connected: false,
      type: "postgresql_supabase",
      error: "Kh\xF4ng th\u1EC3 kh\u1EDFi t\u1EA1o Connection Pool"
    };
  }
  const start = Date.now();
  try {
    const client = await p.connect();
    try {
      await client.query("SELECT 1");
      const latencyMs = Date.now() - start;
      return {
        configured: true,
        connected: true,
        type: "postgresql_supabase",
        latencyMs,
        tablesVerified: isInitialized
      };
    } finally {
      client.release();
    }
  } catch (err) {
    return {
      configured: true,
      connected: false,
      type: "postgresql_supabase",
      error: err?.message || String(err)
    };
  }
}

// server/economy.ts
var SHOP_CONFIG_FILE = getSafeStoragePath("shop_config.json");
var MARKET_FILE = getSafeStoragePath("market.json");
var shopCatalog = [];
var marketListings = /* @__PURE__ */ new Map();
var marketTaxRate = 0.05;
var marketStats = {
  totalVolume: 0,
  totalTaxBurned: 0,
  totalTradesCount: 0
};
var marketLogs = [];
var ITEM_META = {
  uLan: { name: "U Lan Th\u1EA3o", icon: "\u{1F331}", category: "herb" },
  huyetTinh: { name: "Huy\u1EBFt Tinh Th\u1EA3o", icon: "\u{1F33F}", category: "herb" },
  hoaAnh: { name: "H\u1ECFa Anh Th\u1EA3o", icon: "\u{1F525}", category: "herb" },
  huyenThiet: { name: "Huy\u1EC1n Thi\u1EBFt Chi", icon: "\u{1F344}", category: "herb" },
  longTu: { name: "Long Tu Th\u1EA3o", icon: "\u{1F409}", category: "herb" },
  thoNguyen: { name: "Th\u1ECD Nguy\xEAn \u0110an", icon: "\u{1F48A}", category: "pill" },
  dinhTam: { name: "\u0110\u1ECBnh T\xE2m \u0110an", icon: "\u{1F9D8}", category: "pill" },
  ngungThan: { name: "Ng\u01B0ng Th\u1EA7n \u0110an", icon: "\u{1F441}\uFE0F", category: "pill" },
  hoTam: { name: "H\u1ED9 T\xE2m \u0110an", icon: "\u{1F6E1}\uFE0F", category: "pill" },
  phaCanh: { name: "Ph\xE1 C\u1EA3nh \u0110an", icon: "\u26A1", category: "pill" },
  tuViDan: { name: "Tu Vi \u0110an", icon: "\u{1F52E}", category: "pill" },
  sieuCapTuViDan: { name: "Si\xEAu C\u1EA5p Tu Vi \u0110an", icon: "\u{1F52E}", category: "pill" },
  linhTra: { name: "B\xE1t Tr\u1EA3m Linh Tr\xE0", icon: "\u{1F375}", category: "tea" },
  dongTamToa: { name: "\u0110\u1ED3ng T\xE2m T\u1ECFa", icon: "\u{1F510}", category: "tea" }
};
function loadEconomyData() {
  try {
    if (fs2.existsSync(SHOP_CONFIG_FILE)) {
      const data = JSON.parse(fs2.readFileSync(SHOP_CONFIG_FILE, "utf-8"));
      if (Array.isArray(data)) {
        shopCatalog = data;
      }
    }
  } catch (err) {
    console.error("Error loading shop_config.json:", err);
  }
  try {
    if (fs2.existsSync(MARKET_FILE)) {
      const data = JSON.parse(fs2.readFileSync(MARKET_FILE, "utf-8"));
      if (data && typeof data === "object") {
        if (Array.isArray(data.listings)) {
          marketListings.clear();
          for (const item of data.listings) {
            if (item && item.id) {
              marketListings.set(item.id, item);
            }
          }
        }
        if (typeof data.taxRate === "number") {
          marketTaxRate = data.taxRate;
        }
        if (data.stats && typeof data.stats === "object") {
          marketStats = {
            totalVolume: Number(data.stats.totalVolume) || 0,
            totalTaxBurned: Number(data.stats.totalTaxBurned) || 0,
            totalTradesCount: Number(data.stats.totalTradesCount) || 0
          };
        }
        if (Array.isArray(data.logs)) {
          marketLogs.length = 0;
          marketLogs.push(...data.logs.slice(-100));
        }
      }
    }
  } catch (err) {
    console.error("Error loading market.json:", err);
  }
  if (isDatabaseConfigured()) {
    dbLoadMarket().then((dbData) => {
      if (dbData && dbData.listings && dbData.listings.length > 0) {
        marketListings.clear();
        for (const item of dbData.listings) {
          if (item && item.id) {
            marketListings.set(item.id, item);
          }
        }
        if (dbData.logs && dbData.logs.length > 0) {
          marketLogs.length = 0;
          marketLogs.push(...dbData.logs);
        }
        console.log(`[Database] Hydrated ${marketListings.size} market listings from PostgreSQL.`);
      }
    }).catch((err) => {
      console.error("[Database] Failed to hydrate market from PostgreSQL:", err);
    });
  }
}
function saveMarketData() {
  try {
    const payload = {
      listings: Array.from(marketListings.values()),
      taxRate: marketTaxRate,
      stats: marketStats,
      logs: marketLogs.slice(-100)
    };
    fs2.writeFileSync(MARKET_FILE, JSON.stringify(payload, null, 2), "utf-8");
    if (isDatabaseConfigured()) {
      for (const item of marketListings.values()) {
        dbSaveMarketListing(item).catch(() => {
        });
      }
    }
  } catch (err) {
    console.error("Error saving market.json:", err);
  }
}
function saveShopConfigData() {
  try {
    fs2.writeFileSync(SHOP_CONFIG_FILE, JSON.stringify(shopCatalog, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving shop_config.json:", err);
  }
}
function addMarketLog(log) {
  const entry = {
    ...log,
    id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now()
  };
  marketLogs.unshift(entry);
  if (marketLogs.length > 100) marketLogs.pop();
  saveMarketData();
  if (isDatabaseConfigured()) {
    dbSaveMarketLog(entry).catch(() => {
    });
  }
}
function returnItemsToSeller(seller, listing) {
  if (!seller.cultivation) {
    seller.cultivation = {};
  }
  const cult = seller.cultivation;
  if (listing.itemType === "herb") {
    if (!cult.herbs) cult.herbs = { uLan: 0, huyetTinh: 0, hoaAnh: 0, huyenThiet: 0, longTu: 0 };
    cult.herbs[listing.itemId] = (cult.herbs[listing.itemId] || 0) + listing.quantity;
  } else if (listing.itemType === "pill") {
    if (!cult.pillCount) cult.pillCount = { thoNguyen: 0, hoTam: 0, phaCanh: 0 };
    cult.pillCount[listing.itemId] = (cult.pillCount[listing.itemId] || 0) + listing.quantity;
  } else if (listing.itemType === "tea") {
    if (!cult.teaInventory) cult.teaInventory = {};
    cult.teaInventory[listing.itemId] = (cult.teaInventory[listing.itemId] || 0) + listing.quantity;
  }
}
function registerEconomyRoutes(app2, serverUsers2, getUserByToken2, saveUsersToFile2) {
  loadEconomyData();
  function resolveUserFromReq(req) {
    const authHeader = req.headers.authorization;
    let user = getUserByToken2(authHeader);
    if (user) return user;
    const customToken = req.headers["x-auth-token"] || req.headers["x-access-token"];
    if (customToken) {
      user = getUserByToken2(customToken);
      if (user) return user;
    }
    const payloadToken = req.body?.token || req.body?.authToken || req.query?.token;
    if (payloadToken) {
      user = getUserByToken2(payloadToken);
      if (user) return user;
    }
    const usernameHeader = req.headers["x-username"] || req.body?.username || req.query?.username;
    if (usernameHeader && typeof usernameHeader === "string") {
      const clean = usernameHeader.trim().toLowerCase();
      for (const u of serverUsers2.values()) {
        if (u.username && u.username.trim().toLowerCase() === clean) {
          return u;
        }
      }
    }
    const userIdHeader = req.headers["x-user-id"] || req.body?.userId || req.query?.userId;
    if (userIdHeader && typeof userIdHeader === "string" && serverUsers2.has(userIdHeader)) {
      return serverUsers2.get(userIdHeader) || null;
    }
    return null;
  }
  function isUserAdmin(user) {
    if (!user) return false;
    return Boolean(user.isAdmin || user.username && user.username.trim().toLowerCase() === "admin");
  }
  function ensureUserShopPurchases(user) {
    if (!user.cultivation) user.cultivation = {};
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (user.cultivation.shopPurchasesDate !== today) {
      user.cultivation.shopPurchasesDate = today;
      user.cultivation.shopPurchasesToday = {};
      saveUsersToFile2();
    }
    return user.cultivation.shopPurchasesToday || {};
  }
  app2.get("/api/shop/catalog", (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    const user = resolveUserFromReq(req);
    const purchasesToday = user ? ensureUserShopPurchases(user) : {};
    res.json({
      success: true,
      items: shopCatalog.filter((it) => it.enabled),
      purchasesToday,
      userLinhThach: user ? Number(user.cultivation?.linhThach) || 0 : 0
    });
  });
  app2.post("/api/shop/buy", (req, res) => {
    const user = resolveUserFromReq(req);
    if (!user) {
      res.status(401).json({ success: false, error: "Vui l\xF2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 v\xE0o V\u1EA1n B\u1EA3o C\xE1c!" });
      return;
    }
    const { itemId, quantity = 1, clientCultivation } = req.body;
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const item = shopCatalog.find((it) => it.id === itemId && it.enabled);
    if (!item) {
      res.status(404).json({ success: false, error: "V\u1EADt ph\u1EA9m kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 ng\u1EEBng cung \u1EE9ng!" });
      return;
    }
    if (!user.cultivation) {
      user.cultivation = {};
    }
    if (clientCultivation && typeof clientCultivation === "object") {
      const clientLt = Number(clientCultivation.linhThach) || 0;
      const serverLt = Number(user.cultivation.linhThach) || 0;
      if (clientLt > serverLt) {
        user.cultivation.linhThach = clientLt;
      }
      if (clientCultivation.herbs && !user.cultivation.herbs) {
        user.cultivation.herbs = { ...clientCultivation.herbs };
      }
      if (clientCultivation.pillCount && !user.cultivation.pillCount) {
        user.cultivation.pillCount = { ...clientCultivation.pillCount };
      }
    }
    const purchasesToday = ensureUserShopPurchases(user);
    const currentBought = purchasesToday[itemId] || 0;
    if (item.dailyLimit > 0 && currentBought + qty > item.dailyLimit) {
      res.status(400).json({
        success: false,
        error: `\u0110\xE3 v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n mua trong ng\xE0y (${currentBought}/${item.dailyLimit})!`
      });
      return;
    }
    const discount = Math.max(0, Math.min(90, item.discountPercent || 0));
    const unitPrice = Math.round(item.price * (1 - discount / 100));
    const totalCost = unitPrice * qty;
    const currentLinhThach = Number(user.cultivation?.linhThach) || 0;
    if (currentLinhThach < totalCost) {
      res.status(400).json({
        success: false,
        error: `Linh Th\u1EA1ch kh\xF4ng \u0111\u1EE7! C\u1EA7n ${totalCost.toLocaleString()} LT, hi\u1EC7n c\xF3 ${currentLinhThach.toLocaleString()} LT.`
      });
      return;
    }
    user.cultivation.linhThach = currentLinhThach - totalCost;
    if (item.itemType === "herb") {
      if (!user.cultivation.herbs) {
        user.cultivation.herbs = { uLan: 0, huyetTinh: 0, hoaAnh: 0, huyenThiet: 0, longTu: 0 };
      }
      user.cultivation.herbs[item.targetKey] = (user.cultivation.herbs[item.targetKey] || 0) + qty;
    } else if (item.itemType === "pill") {
      if (!user.cultivation.pillCount) {
        user.cultivation.pillCount = { thoNguyen: 0, hoTam: 0, phaCanh: 0 };
      }
      user.cultivation.pillCount[item.targetKey] = (user.cultivation.pillCount[item.targetKey] || 0) + qty;
    } else if (item.itemType === "tea") {
      if (!user.cultivation.teaInventory) user.cultivation.teaInventory = {};
      user.cultivation.teaInventory[item.targetKey] = (user.cultivation.teaInventory[item.targetKey] || 0) + qty;
    } else if (item.itemType === "frame") {
      user.frame = item.targetKey;
    }
    purchasesToday[itemId] = currentBought + qty;
    user.cultivation.shopPurchasesToday = purchasesToday;
    if (!Array.isArray(user.cultivation.historyLog)) {
      user.cultivation.historyLog = [];
    }
    user.cultivation.historyLog.unshift(
      `\u0110\u1EBFn V\u1EA1n B\u1EA3o C\xE1c d\xF9ng ${totalCost.toLocaleString()} Linh Th\u1EA1ch mua ${qty}x ${item.name}`
    );
    if (user.cultivation.historyLog.length > 50) user.cultivation.historyLog.pop();
    saveUsersToFile2();
    addMarketLog({
      type: "buy",
      actorUsername: user.username,
      details: `Mua ${qty}x ${item.name} t\u1EA1i V\u1EA1n B\u1EA3o C\xE1c gi\xE1 ${totalCost} LT.`,
      amount: totalCost
    });
    res.json({
      success: true,
      message: `\u0110\xE3 mua th\xE0nh c\xF4ng ${qty}x ${item.name}!`,
      updatedCultivation: user.cultivation,
      purchasesToday
    });
  });
  app2.get("/api/market/listings", (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    const { category, search, sortBy } = req.query;
    const now = Date.now();
    for (const [id, listing] of marketListings.entries()) {
      if (listing.status === "active" && listing.expiresAt <= now) {
        listing.status = "cancelled";
        const seller = serverUsers2.get(listing.sellerId) || Array.from(serverUsers2.values()).find((u) => u.username === listing.sellerUsername);
        if (seller) {
          returnItemsToSeller(seller, listing);
          saveUsersToFile2();
        }
      }
    }
    saveMarketData();
    let list = Array.from(marketListings.values()).filter((l) => l.status === "active");
    if (category && category !== "all") {
      list = list.filter((l) => l.itemType === category);
    }
    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) => l.itemName.toLowerCase().includes(q) || l.sellerUsername.toLowerCase().includes(q)
      );
    }
    if (sortBy === "price_asc") {
      list.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.pricePerUnit - a.pricePerUnit);
    } else {
      list.sort((a, b) => b.listedAt - a.listedAt);
    }
    res.json({
      success: true,
      listings: list,
      taxRate: marketTaxRate,
      stats: marketStats
    });
  });
  app2.get("/api/market/my-listings", (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    const user = resolveUserFromReq(req);
    if (!user) {
      res.status(401).json({ success: false, error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp!" });
      return;
    }
    const myListings = Array.from(marketListings.values()).filter((l) => l.sellerId === user.id || l.sellerUsername === user.username).sort((a, b) => b.listedAt - a.listedAt);
    res.json({
      success: true,
      listings: myListings
    });
  });
  app2.post("/api/market/list", (req, res) => {
    const user = resolveUserFromReq(req);
    if (!user) {
      res.status(401).json({ success: false, error: "Vui l\xF2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 m\u1EDF s\u1EA1p h\xE0ng!" });
      return;
    }
    const { itemType, itemId, quantity = 1, pricePerUnit } = req.body;
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const unitPrice = Math.max(1, parseInt(pricePerUnit, 10) || 1);
    const userActiveCount = Array.from(marketListings.values()).filter(
      (l) => (l.sellerId === user.id || l.sellerUsername === user.username) && l.status === "active"
    ).length;
    if (userActiveCount >= 8) {
      res.status(400).json({
        success: false,
        error: "\u0110\u1EA1o h\u1EEFu \u0111\xE3 m\u1EDF t\u1ED1i \u0111a 8 gian h\xE0ng k\xFD g\u1EEDi c\xF9ng l\xFAc! H\xE3y ch\u1EDD b\xE1n b\u1EDBt ho\u1EB7c thu h\u1ED3i s\u1EA1p."
      });
      return;
    }
    const cult = user.cultivation || {};
    let itemMeta = ITEM_META[itemId];
    if (!itemMeta) {
      itemMeta = { name: itemId, icon: "\u{1F4E6}", category: itemType };
    }
    if (itemType === "herb") {
      const currentQty = cult.herbs?.[itemId] || 0;
      if (currentQty < qty) {
        res.status(400).json({ success: false, error: `S\u1ED1 l\u01B0\u1EE3ng ${itemMeta.name} trong t\xFAi kh\xF4ng \u0111\u1EE7 (${currentQty}/${qty})!` });
        return;
      }
      cult.herbs[itemId] -= qty;
    } else if (itemType === "pill") {
      const currentQty = cult.pillCount?.[itemId] || 0;
      if (currentQty < qty) {
        res.status(400).json({ success: false, error: `S\u1ED1 l\u01B0\u1EE3ng ${itemMeta.name} trong t\xFAi kh\xF4ng \u0111\u1EE7 (${currentQty}/${qty})!` });
        return;
      }
      cult.pillCount[itemId] -= qty;
    } else if (itemType === "tea") {
      const currentQty = cult.teaInventory?.[itemId] || 0;
      if (currentQty < qty) {
        res.status(400).json({ success: false, error: `S\u1ED1 l\u01B0\u1EE3ng ${itemMeta.name} trong t\xFAi kh\xF4ng \u0111\u1EE7 (${currentQty}/${qty})!` });
        return;
      }
      cult.teaInventory[itemId] -= qty;
    } else {
      res.status(400).json({ success: false, error: "Ch\u1EE7ng lo\u1EA1i v\u1EADt ph\u1EA9m kh\xF4ng h\u1EE3p l\u1EC7!" });
      return;
    }
    const listingId = "lst_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const newListing = {
      id: listingId,
      sellerId: user.id,
      sellerUsername: user.username,
      sellerAvatar: user.avatar || "\u26A1",
      sellerFrame: user.frame || "default",
      itemType,
      itemId,
      itemName: itemMeta.name,
      itemIcon: itemMeta.icon,
      quality: "trung_pham",
      quantity: qty,
      pricePerUnit: unitPrice,
      totalPrice: unitPrice * qty,
      listedAt: Date.now(),
      expiresAt: Date.now() + 48 * 3600 * 1e3,
      // 48h
      status: "active"
    };
    marketListings.set(listingId, newListing);
    saveMarketData();
    saveUsersToFile2();
    addMarketLog({
      type: "list",
      actorUsername: user.username,
      details: `K\xFD g\u1EEDi ${qty}x ${itemMeta.name} v\u1EDBi gi\xE1 ${unitPrice} LT/m\xF3n (T\u1ED5ng: ${newListing.totalPrice} LT).`,
      amount: newListing.totalPrice
    });
    res.json({
      success: true,
      message: `\u0110\xE3 k\xFD g\u1EEDi th\xE0nh c\xF4ng ${qty}x ${itemMeta.name} l\xEAn Ph\u01B0\u1EDDng Th\u1ECB!`,
      listing: newListing,
      updatedCultivation: user.cultivation
    });
  });
  app2.post("/api/market/buy", (req, res) => {
    const buyer = resolveUserFromReq(req);
    if (!buyer) {
      res.status(401).json({ success: false, error: "Vui l\xF2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 mua s\u1EAFm tr\xEAn Ph\u01B0\u1EDDng Th\u1ECB!" });
      return;
    }
    const { listingId } = req.body;
    const listing = marketListings.get(listingId);
    if (!listing || listing.status !== "active") {
      res.status(404).json({ success: false, error: "Gian h\xE0ng n\xE0y kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 \u0111\u01B0\u1EE3c b\xE1n!" });
      return;
    }
    if (listing.sellerId === buyer.id || listing.sellerUsername === buyer.username) {
      res.status(400).json({ success: false, error: "\u0110\u1EA1o h\u1EEFu kh\xF4ng th\u1EC3 t\u1EF1 mua v\u1EADt ph\u1EA9m do ch\xEDnh m\xECnh \u0111\u0103ng b\xE1n!" });
      return;
    }
    const totalCost = listing.totalPrice;
    const buyerLinhThach = Number(buyer.cultivation?.linhThach) || 0;
    if (buyerLinhThach < totalCost) {
      res.status(400).json({
        success: false,
        error: `Linh Th\u1EA1ch kh\xF4ng \u0111\u1EE7! C\u1EA7n ${totalCost.toLocaleString()} LT, \u0111\u1EA1o h\u1EEFu hi\u1EC7n c\xF3 ${buyerLinhThach.toLocaleString()} LT.`
      });
      return;
    }
    const tax = Math.round(totalCost * marketTaxRate);
    const sellerPayout = totalCost - tax;
    buyer.cultivation.linhThach = buyerLinhThach - totalCost;
    if (listing.itemType === "herb") {
      if (!buyer.cultivation.herbs) buyer.cultivation.herbs = { uLan: 0, huyetTinh: 0, hoaAnh: 0, huyenThiet: 0, longTu: 0 };
      buyer.cultivation.herbs[listing.itemId] = (buyer.cultivation.herbs[listing.itemId] || 0) + listing.quantity;
    } else if (listing.itemType === "pill") {
      if (!buyer.cultivation.pillCount) buyer.cultivation.pillCount = { thoNguyen: 0, hoTam: 0, phaCanh: 0 };
      buyer.cultivation.pillCount[listing.itemId] = (buyer.cultivation.pillCount[listing.itemId] || 0) + listing.quantity;
    } else if (listing.itemType === "tea") {
      if (!buyer.cultivation.teaInventory) buyer.cultivation.teaInventory = {};
      buyer.cultivation.teaInventory[listing.itemId] = (buyer.cultivation.teaInventory[listing.itemId] || 0) + listing.quantity;
    }
    let seller = serverUsers2.get(listing.sellerId);
    if (!seller) {
      seller = Array.from(serverUsers2.values()).find((u) => u.username === listing.sellerUsername);
    }
    if (seller) {
      if (!seller.cultivation) seller.cultivation = {};
      seller.cultivation.linhThach = (Number(seller.cultivation.linhThach) || 0) + sellerPayout;
      if (!Array.isArray(seller.cultivation.historyLog)) seller.cultivation.historyLog = [];
      seller.cultivation.historyLog.unshift(
        `[Ph\u01B0\u1EDDng Th\u1ECB] \u0110\u1EA1o h\u1EEFu @${buyer.username} \u0111\xE3 mua ${listing.quantity}x ${listing.itemName}. Thu v\u1EC1 +${sellerPayout.toLocaleString()} Linh Th\u1EA1ch (Thu\u1EBF 5%: ${tax} LT).`
      );
      if (seller.cultivation.historyLog.length > 50) seller.cultivation.historyLog.pop();
    }
    listing.status = "sold";
    listing.buyerId = buyer.id;
    listing.buyerUsername = buyer.username;
    listing.soldAt = Date.now();
    marketStats.totalVolume += totalCost;
    marketStats.totalTaxBurned += tax;
    marketStats.totalTradesCount += 1;
    saveMarketData();
    saveUsersToFile2();
    addMarketLog({
      type: "buy",
      actorUsername: buyer.username,
      targetUsername: listing.sellerUsername,
      details: `@${buyer.username} \u0111\xE3 mua ${listing.quantity}x ${listing.itemName} t\u1EEB @${listing.sellerUsername} gi\xE1 ${totalCost} LT (Thu\u1EBF s\xE0n thi\xEAu h\u1EE7y: ${tax} LT).`,
      amount: totalCost
    });
    res.json({
      success: true,
      message: `\u0110\xE3 mua th\xE0nh c\xF4ng ${listing.quantity}x ${listing.itemName} t\u1EEB @${listing.sellerUsername}!`,
      updatedCultivation: buyer.cultivation
    });
  });
  app2.post("/api/market/cancel", (req, res) => {
    const user = resolveUserFromReq(req);
    if (!user) {
      res.status(401).json({ success: false, error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp!" });
      return;
    }
    const { listingId } = req.body;
    const listing = marketListings.get(listingId);
    if (!listing || listing.status !== "active") {
      res.status(404).json({ success: false, error: "Gian h\xE0ng kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 giao d\u1ECBch xong!" });
      return;
    }
    if (listing.sellerId !== user.id && listing.sellerUsername !== user.username) {
      res.status(403).json({ success: false, error: "\u0110\u1EA1o h\u1EEFu kh\xF4ng th\u1EC3 h\u1EE7y gian h\xE0ng c\u1EE7a ng\u01B0\u1EDDi kh\xE1c!" });
      return;
    }
    returnItemsToSeller(user, listing);
    listing.status = "cancelled";
    saveMarketData();
    saveUsersToFile2();
    addMarketLog({
      type: "cancel",
      actorUsername: user.username,
      details: `H\u1EE7y gian h\xE0ng k\xFD g\u1EEDi ${listing.quantity}x ${listing.itemName}. \u0110\xE3 ho\xE0n tr\u1EA3 v\xE0o t\xFAi \u0111\u1ED3.`
    });
    res.json({
      success: true,
      message: `\u0110\xE3 thu h\u1ED3i s\u1EA1p h\xE0ng v\xE0 nh\u1EADn l\u1EA1i ${listing.quantity}x ${listing.itemName}!`,
      updatedCultivation: user.cultivation
    });
  });
  app2.get("/api/admin/economy/overview", (req, res) => {
    const adminUser = resolveUserFromReq(req);
    if (!isUserAdmin(adminUser)) {
      res.status(403).json({ success: false, error: "Ch\u1EC9 Qu\u1EA3n Tr\u1ECB Vi\xEAn m\u1EDBi c\xF3 quy\u1EC1n xem!" });
      return;
    }
    let totalCirculatingLinhThach = 0;
    const userRankings = [];
    for (const u of serverUsers2.values()) {
      const lt = Number(u.cultivation?.linhThach) || 0;
      totalCirculatingLinhThach += lt;
      userRankings.push({
        userId: u.id,
        username: u.username,
        avatar: u.avatar || "\u26A1",
        frame: u.frame || "default",
        linhThach: lt,
        realmName: u.cultivation?.realmName || "Luy\u1EC7n Kh\xED K\u1EF3"
      });
    }
    userRankings.sort((a, b) => b.linhThach - a.linhThach);
    const activeListingsCount = Array.from(marketListings.values()).filter(
      (l) => l.status === "active"
    ).length;
    res.json({
      success: true,
      totalCirculatingLinhThach,
      topRichest: userRankings.slice(0, 10),
      stats: marketStats,
      taxRate: marketTaxRate,
      activeListingsCount,
      totalListingsCount: marketListings.size
    });
  });
  app2.post("/api/admin/economy/adjust-linh-thach", (req, res) => {
    const adminUser = resolveUserFromReq(req);
    if (!isUserAdmin(adminUser) || !adminUser) {
      res.status(403).json({ success: false, error: "Ch\u1EC9 Qu\u1EA3n Tr\u1ECB Vi\xEAn m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n!" });
      return;
    }
    const { targetUsername, amount, reason } = req.body;
    const delta = parseInt(amount, 10);
    if (isNaN(delta) || delta === 0) {
      res.status(400).json({ success: false, error: "S\u1ED1 l\u01B0\u1EE3ng Linh Th\u1EA1ch kh\xF4ng h\u1EE3p l\u1EC7!" });
      return;
    }
    const searchKey = String(targetUsername || "").trim().toLowerCase();
    const target = Array.from(serverUsers2.values()).find(
      (u) => u.username.toLowerCase() === searchKey || u.displayName && u.displayName.toLowerCase() === searchKey || u.id.toLowerCase() === searchKey
    );
    if (!target) {
      res.status(404).json({ success: false, error: `Kh\xF4ng t\xECm th\u1EA5y \u0111\u1EA1o h\u1EEFu c\xF3 t\xEAn @${targetUsername}!` });
      return;
    }
    if (!target.cultivation) target.cultivation = {};
    const oldBalance = Number(target.cultivation.linhThach) || 0;
    const newBalance = Math.max(0, oldBalance + delta);
    target.cultivation.linhThach = newBalance;
    const targetDisplayName = target.displayName || target.username;
    const adminDisplayName = adminUser.displayName || adminUser.username;
    if (!Array.isArray(target.cultivation.historyLog)) target.cultivation.historyLog = [];
    target.cultivation.historyLog.unshift(
      `[Thi\xEAn \u0110\u1EA1o Ban Th\u01B0\u1EDFng/Thu H\u1ED3i] Qu\u1EA3n Tr\u1ECB Vi\xEAn \u0111\xE3 ${delta > 0 ? "c\u1EA5p ph\xE1t +" : "thu h\u1ED3i "}${Math.abs(delta).toLocaleString()} Linh Th\u1EA1ch. L\xFD do: ${reason || "\u0110i\u1EC1u ch\u1EC9nh h\u1EC7 th\u1ED1ng"}. S\u1ED1 d\u01B0 m\u1EDBi: ${newBalance.toLocaleString()} LT.`
    );
    if (target.cultivation.historyLog.length > 50) target.cultivation.historyLog.pop();
    saveUsersToFile2();
    addMarketLog({
      type: delta > 0 ? "admin_grant" : "admin_deduct",
      actorUsername: adminDisplayName,
      targetUsername: targetDisplayName,
      details: `Admin @${adminDisplayName} \u0111\xE3 ${delta > 0 ? "c\u1EA5p +" : "thu h\u1ED3i "}${Math.abs(delta)} LT c\u1EE7a @${targetDisplayName}. L\xFD do: ${reason || "N/A"}.`,
      amount: Math.abs(delta)
    });
    res.json({
      success: true,
      message: `\u0110\xE3 ${delta > 0 ? "c\u1EA5p ph\xE1t" : "thu h\u1ED3i"} th\xE0nh c\xF4ng ${Math.abs(delta).toLocaleString()} Linh Th\u1EA1ch c\u1EE7a @${targetDisplayName}!`,
      newBalance
    });
  });
  app2.post("/api/admin/economy/tax-rate", (req, res) => {
    const adminUser = resolveUserFromReq(req);
    if (!isUserAdmin(adminUser) || !adminUser) {
      res.status(403).json({ success: false, error: "Ch\u1EC9 Qu\u1EA3n Tr\u1ECB Vi\xEAn m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n!" });
      return;
    }
    const { taxRate } = req.body;
    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 0.25) {
      res.status(400).json({ success: false, error: "M\u1EE9c thu\u1EBF kh\xF4ng h\u1EE3p l\u1EC7 (Ph\u1EA3i t\u1EEB 0% \u0111\u1EBFn 25%)!" });
      return;
    }
    marketTaxRate = rate;
    saveMarketData();
    addMarketLog({
      type: "admin_takedown",
      actorUsername: adminUser.username,
      details: `Admin @${adminUser.username} \u0111\xE3 \u0111i\u1EC1u ch\u1EC9nh m\u1EE9c thu\u1EBF s\xE0n Ph\u01B0\u1EDDng Th\u1ECB th\xE0nh ${(rate * 100).toFixed(1)}%.`
    });
    res.json({
      success: true,
      message: `\u0110\xE3 c\u1EADp nh\u1EADt thu\u1EBF s\xE0n th\xE0nh ${(rate * 100).toFixed(1)}%!`,
      taxRate: marketTaxRate
    });
  });
  app2.post("/api/admin/market/takedown", (req, res) => {
    const adminUser = resolveUserFromReq(req);
    if (!isUserAdmin(adminUser) || !adminUser) {
      res.status(403).json({ success: false, error: "Ch\u1EC9 Qu\u1EA3n Tr\u1ECB Vi\xEAn m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n!" });
      return;
    }
    const { listingId, reason = "Vi ph\u1EA1m quy t\u1EAFc Ph\u01B0\u1EDDng Th\u1ECB" } = req.body;
    const listing = marketListings.get(listingId);
    if (!listing) {
      res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y gian h\xE0ng!" });
      return;
    }
    const seller = serverUsers2.get(listing.sellerId) || Array.from(serverUsers2.values()).find((u) => u.username === listing.sellerUsername);
    if (seller) {
      returnItemsToSeller(seller, listing);
      if (!Array.isArray(seller.cultivation?.historyLog)) seller.cultivation.historyLog = [];
      seller.cultivation.historyLog.unshift(
        `[C\u1EA3nh B\xE1o Admin] Gian h\xE0ng #${listing.id} (${listing.quantity}x ${listing.itemName}) \u0111\xE3 b\u1ECB c\u01B0\u1EE1ng ch\u1EBF thu h\u1ED3i. L\xFD do: ${reason}. V\u1EADt ph\u1EA9m \u0111\xE3 \u0111\u01B0\u1EE3c ho\xE0n tr\u1EA3.`
      );
      saveUsersToFile2();
    }
    listing.status = "takedown_by_admin";
    saveMarketData();
    addMarketLog({
      type: "admin_takedown",
      actorUsername: adminUser.username,
      targetUsername: listing.sellerUsername,
      details: `Admin c\u01B0\u1EE1ng ch\u1EBF g\u1EE1 b\u1ECF s\u1EA1p #${listing.id} c\u1EE7a @${listing.sellerUsername}. L\xFD do: ${reason}.`
    });
    res.json({
      success: true,
      message: `\u0110\xE3 c\u01B0\u1EE1ng ch\u1EBF g\u1EE1 b\u1ECF s\u1EA1p h\xE0ng v\xE0 ho\xE0n tr\u1EA3 v\u1EADt ph\u1EA9m v\u1EC1 cho @${listing.sellerUsername}!`
    });
  });
  app2.post("/api/admin/shop/update-item", (req, res) => {
    const adminUser = resolveUserFromReq(req);
    if (!isUserAdmin(adminUser)) {
      res.status(403).json({ success: false, error: "Ch\u1EC9 Qu\u1EA3n Tr\u1ECB Vi\xEAn m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n!" });
      return;
    }
    const { itemId, price, dailyLimit, discountPercent, enabled } = req.body;
    const item = shopCatalog.find((it) => it.id === itemId);
    if (!item) {
      res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y v\u1EADt ph\u1EA9m trong V\u1EA1n B\u1EA3o C\xE1c!" });
      return;
    }
    if (price !== void 0) item.price = Math.max(1, parseInt(price, 10) || 1);
    if (dailyLimit !== void 0) item.dailyLimit = Math.max(0, parseInt(dailyLimit, 10) || 0);
    if (discountPercent !== void 0) {
      item.discountPercent = Math.max(0, Math.min(90, parseInt(discountPercent, 10) || 0));
    }
    if (enabled !== void 0) item.enabled = Boolean(enabled);
    saveShopConfigData();
    res.json({
      success: true,
      message: `\u0110\xE3 c\u1EADp nh\u1EADt c\u1EA5u h\xECnh cho ${item.name}!`,
      item
    });
  });
  app2.get("/api/admin/economy/logs", (req, res) => {
    const adminUser = resolveUserFromReq(req);
    if (!isUserAdmin(adminUser)) {
      res.status(403).json({ success: false, error: "Ch\u1EC9 Qu\u1EA3n Tr\u1ECB Vi\xEAn m\u1EDBi c\xF3 quy\u1EC1n xem s\u1ED5 c\xE1i!" });
      return;
    }
    res.json({
      success: true,
      logs: marketLogs
    });
  });
}

// server.ts
var rooms = /* @__PURE__ */ new Map();
var sseClientsByRoom = /* @__PURE__ */ new Map();
var roomChatMessages = /* @__PURE__ */ new Map();
function getSafeStoragePath2(filename) {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path3.join("/tmp", "fasttyping_data");
    if (!fs3.existsSync(tmpDir)) {
      try {
        fs3.mkdirSync(tmpDir, { recursive: true });
      } catch {
      }
    }
    const tmpPath = path3.join(tmpDir, filename);
    if (!fs3.existsSync(tmpPath)) {
      const seedPath = path3.join(process.cwd(), filename);
      if (fs3.existsSync(seedPath)) {
        try {
          fs3.copyFileSync(seedPath, tmpPath);
        } catch {
        }
      }
    }
    return tmpPath;
  }
  return path3.join(process.cwd(), filename);
}
var CHAT_FILE = getSafeStoragePath2("chat_history.json");
var DEFAULT_GLOBAL_CHAT = [
  {
    id: "sys-welcome",
    username: "H\u1EC7 Th\u1ED1ng",
    avatar: "\u{1F916}",
    frame: "admin_gold",
    message: "Ch\xE0o m\u1EEBng b\u1EA1n \u0111\u1EBFn v\u1EDBi FastTyping Challenge v4.0! H\xE3y r\xE8n luy\u1EC7n v\xE0 x\xE1c l\u1EADp k\u1EF7 l\u1EE5c m\u1EDBi tr\xEAn B\u1EA3ng V\xE0ng.",
    timestamp: Date.now(),
    isSystem: true,
    channel: "global"
  }
];
function loadChatFromFile() {
  try {
    if (fs3.existsSync(CHAT_FILE)) {
      const content = fs3.readFileSync(CHAT_FILE, "utf-8");
      const data = JSON.parse(content);
      if (Array.isArray(data) && data.length > 0) {
        return data.slice(-150);
      }
    }
  } catch (err) {
    console.error("Error reading chat_history.json:", err);
  }
  return [...DEFAULT_GLOBAL_CHAT];
}
var globalChatMessages = loadChatFromFile();
function saveChatToFile() {
  try {
    fs3.writeFileSync(CHAT_FILE, JSON.stringify(globalChatMessages.slice(-150), null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving chat_history.json:", err);
  }
}
var LEADERBOARD_FILE = getSafeStoragePath2("leaderboard.json");
function getVietnamDateStr() {
  const now = /* @__PURE__ */ new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 6e4;
  const vnTime = new Date(utc + 7 * 36e5);
  return vnTime.toISOString().slice(0, 10);
}
function getVietnamWeekStr() {
  const now = /* @__PURE__ */ new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 6e4;
  const vnTime = new Date(utc + 7 * 36e5);
  const d = new Date(Date.UTC(vnTime.getFullYear(), vnTime.getMonth(), vnTime.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 864e5 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo < 10 ? "0" : ""}${weekNo}`;
}
var VALID_LEADERBOARD_MODES = ["vi_dau", "vi_nodau", "en", "numpad", "ngau_hung", "doan_chu", "san_boss"];
function createEmptyLeaderboardData() {
  const highScores = {};
  const rankings = {};
  for (const m of VALID_LEADERBOARD_MODES) {
    highScores[m] = null;
    rankings[m] = { daily: [], weekly: [], all_time: [] };
  }
  return {
    highScores,
    rankings,
    lastResetDate: getVietnamDateStr(),
    lastResetWeek: getVietnamWeekStr()
  };
}
function loadLeaderboardFromFile() {
  const empty = createEmptyLeaderboardData();
  try {
    if (fs3.existsSync(LEADERBOARD_FILE)) {
      const content = fs3.readFileSync(LEADERBOARD_FILE, "utf-8");
      const data = JSON.parse(content);
      if (data && typeof data === "object") {
        const mockNames = /* @__PURE__ */ new Set([
          "GiaC\xE1tG\xF5",
          "L\u01B0\u1EDBtGi\xF3",
          "QuickFox",
          "K\u1EBFTo\xE1nVi\xEAn",
          "Ch\u1EDBpNho\xE1ng",
          "Th\xE1mT\u1EEDPh\xEDm",
          "D\u0169ngS\u0129R\u1ED3ng",
          "Ph\xEDmTh\u1EA7n_VN",
          "testplayer1",
          "\u0110\u1ED9c C\xF4 Ki\u1EBFm T\xF4n",
          "Thanh H\u01B0 Ch\xE2n Nh\xE2n",
          "L\u0103ng Phong Ki\u1EBFm S\u0129",
          "V\xE2n Dao Ki\u1EBFm N\u1EEF",
          "H\xE0n L\u1EADp",
          "Di\u1EC7p Th\u1EA7n",
          "Tr\u01B0\u01A1ng \u0110an",
          "L\u1EE5c Tuy\u1EBFt",
          "C\u1EEDu Thi\xEAn Th\u1EA7n Qu\xE2n",
          "L\xF4i Ch\u1EA5n T\u1EED",
          "Phong L\xF4i Ti\xEAn T\u1EED",
          "Th\u1EA7n Ti\xEAu Ki\u1EBFm Hi\u1EC7p",
          "L\xF4i B\u1EA1o Cu\u1ED3ng \u0110ao",
          "L\xF4i \u0110\xECnh Ti\u1EC3u Sinh",
          "V\xF4 Nhai Ki\u1EBFm Th\xE1nh",
          "T\xE0ng Ki\u1EBFm L\xE3o Nh\xE2n",
          "Ki\u1EBFm V\xF4 Ng\u1EA5n",
          "M\u1EB7c Ki\u1EBFm Kh\xE1ch",
          "T\u1ED1 Ki\u1EBFm \u0110\u1EC7 T\u1EED",
          "Ti\xEAu Dao T\u1EED",
          "C\u1EA7m H\u1ECDa Ti\xEAn C\xF4",
          "B\u1EA1ch L\u1ED9c Ch\xE2n Qu\xE2n",
          "L\u01B0u V\xE2n \u0110\u1EA1o Tr\u01B0\u1EDFng",
          "Th\xEDnh Phong T\u1EED"
        ]);
        if (data.rankings && typeof data.rankings === "object") {
          for (const m of VALID_LEADERBOARD_MODES) {
            if (data.highScores && data.highScores[m]) {
              const hs = data.highScores[m];
              if (hs && hs.username && !mockNames.has(hs.username.trim())) {
                empty.highScores[m] = {
                  ...hs,
                  displayName: hs.displayName || hs.username
                };
              }
            }
            if (data.rankings[m]) {
              const filterValid = (arr) => (Array.isArray(arr) ? arr : []).filter((e) => e && e.username && !mockNames.has(e.username.trim())).map((e, idx) => ({
                ...e,
                rank: idx + 1,
                displayName: e.displayName || e.username
              }));
              empty.rankings[m] = {
                daily: filterValid(data.rankings[m].daily),
                weekly: filterValid(data.rankings[m].weekly),
                all_time: filterValid(data.rankings[m].all_time)
              };
            }
          }
          empty.lastResetDate = data.lastResetDate || getVietnamDateStr();
          empty.lastResetWeek = data.lastResetWeek || getVietnamWeekStr();
          return empty;
        }
        for (const [key, value] of Object.entries(data)) {
          if (VALID_LEADERBOARD_MODES.includes(key) && value && typeof value === "object") {
            const rec = value;
            if (rec.username && !mockNames.has(rec.username.trim())) {
              const cleaned = {
                ...rec,
                displayName: rec.displayName || rec.username
              };
              empty.highScores[key] = cleaned;
              empty.rankings[key].all_time.push({
                rank: 1,
                userId: rec.userId,
                username: rec.username,
                displayName: rec.displayName || rec.username,
                avatar: rec.avatar || "\u26A1",
                frame: rec.frame || "default",
                wpm: rec.wpm || 0,
                score: rec.score || 0,
                errors: rec.errors || 0,
                accuracy: rec.accuracy || 98,
                timestamp: rec.timestamp || Date.now(),
                isVerified: true
              });
            }
          }
        }
        return empty;
      }
    }
  } catch (err) {
    console.error("Error reading leaderboard file:", err);
  }
  return empty;
}
var serverLeaderboardData = loadLeaderboardFromFile();
var serverHighScores = serverLeaderboardData.highScores;
function checkLeaderboardResets() {
  const todayStr = getVietnamDateStr();
  const thisWeekStr = getVietnamWeekStr();
  let changed = false;
  if (serverLeaderboardData.lastResetDate !== todayStr) {
    for (const m of VALID_LEADERBOARD_MODES) {
      serverLeaderboardData.rankings[m].daily = [];
      serverLeaderboardData.highScores[m] = null;
    }
    serverLeaderboardData.lastResetDate = todayStr;
    changed = true;
  }
  if (serverLeaderboardData.lastResetWeek !== thisWeekStr) {
    for (const m of VALID_LEADERBOARD_MODES) {
      serverLeaderboardData.rankings[m].weekly = [];
    }
    serverLeaderboardData.lastResetWeek = thisWeekStr;
    changed = true;
  }
  if (changed) {
    saveLeaderboardToFile();
    broadcastLeaderboard();
  }
  return changed;
}
function saveLeaderboardToFile() {
  try {
    fs3.writeFileSync(LEADERBOARD_FILE, JSON.stringify(serverLeaderboardData, null, 2), "utf-8");
    if (isDatabaseConfigured()) {
      dbSaveLeaderboard(serverLeaderboardData).catch(() => {
      });
    }
  } catch (err) {
    console.error("Error saving leaderboard file:", err);
  }
}
setInterval(() => {
  checkLeaderboardResets();
}, 3e4);
var USERS_FILE = getSafeStoragePath2("users.json");
function ensureDefaultAdminUser(map) {
  let adminUser;
  for (const u of map.values()) {
    if (String(u.username || "").toLowerCase() === "admin" || u.id === "usr_admin_default") {
      adminUser = u;
      break;
    }
  }
  if (!adminUser) {
    const salt = "f8a7e4b2c1d3e5f60718293a4b5c6d7e";
    const passwordHash = hashPassword("admin123", salt);
    const newAdmin = {
      id: "usr_admin_default",
      email: "",
      username: "admin",
      displayName: "Admin",
      avatar: "\u{1F451}",
      frame: "admin_gold",
      isAdmin: true,
      authProvider: "email",
      passwordHash,
      salt,
      isVerified: true,
      sessionTokens: [],
      showcaseAchievements: ["speed_100", "pve_boss_win", "pvp_first_win", "hidden_top1"],
      unlockedAchievements: [
        "speed_40",
        "speed_60",
        "speed_80",
        "speed_100",
        "speed_120",
        "speed_140",
        "speed_160",
        "acc_95",
        "acc_98",
        "acc_100_once",
        "acc_100_3x",
        "acc_100_10x",
        "matches_10",
        "matches_30",
        "matches_75",
        "matches_150",
        "matches_300",
        "matches_500",
        "pve_boss_win",
        "pve_boss_hell",
        "pve_mystery_word",
        "pve_rush_high",
        "pve_outplay_beat",
        "numpad_intro",
        "numpad_50",
        "numpad_75",
        "numpad_100",
        "pvp_first_win",
        "pvp_streak_3",
        "pvp_streak_5",
        "pvp_streak_10",
        "hidden_night",
        "hidden_midnight",
        "hidden_verified_dao",
        "hidden_top1"
      ],
      createdAt: 17e11,
      updatedAt: Date.now()
    };
    map.set(newAdmin.id, newAdmin);
    return true;
  } else {
    adminUser.isAdmin = true;
    if (!adminUser.displayName) {
      adminUser.displayName = "Admin";
    }
    if (!adminUser.frame || adminUser.frame === "default") {
      adminUser.frame = "admin_gold";
    }
    const legacyInvalid = /* @__PURE__ */ new Set(["god_speed", "boss_slayer", "mythic_master", "first_win", "streak_3"]);
    if (Array.isArray(adminUser.showcaseAchievements)) {
      adminUser.showcaseAchievements = adminUser.showcaseAchievements.filter((id) => !legacyInvalid.has(id));
      if (adminUser.showcaseAchievements.length === 0) {
        adminUser.showcaseAchievements = ["speed_100", "pve_boss_win", "pvp_first_win", "hidden_top1"];
      }
    }
    if (Array.isArray(adminUser.unlockedAchievements)) {
      adminUser.unlockedAchievements = adminUser.unlockedAchievements.filter((id) => !legacyInvalid.has(id));
      if (adminUser.unlockedAchievements.length < 5) {
        adminUser.unlockedAchievements = [
          "speed_40",
          "speed_60",
          "speed_80",
          "speed_100",
          "speed_120",
          "speed_140",
          "speed_160",
          "acc_95",
          "acc_98",
          "acc_100_once",
          "acc_100_3x",
          "acc_100_10x",
          "matches_10",
          "matches_30",
          "matches_75",
          "matches_150",
          "matches_300",
          "matches_500",
          "pve_boss_win",
          "pve_boss_hell",
          "pve_mystery_word",
          "pve_rush_high",
          "pve_outplay_beat",
          "numpad_intro",
          "numpad_50",
          "numpad_75",
          "numpad_100",
          "pvp_first_win",
          "pvp_streak_3",
          "pvp_streak_5",
          "pvp_streak_10",
          "hidden_night",
          "hidden_midnight",
          "hidden_verified_dao",
          "hidden_top1"
        ];
      }
    }
    return false;
  }
}
function loadUsersFromFile() {
  const map = /* @__PURE__ */ new Map();
  let needsSave = false;
  try {
    if (fs3.existsSync(USERS_FILE)) {
      const content = fs3.readFileSync(USERS_FILE, "utf-8");
      const data = JSON.parse(content);
      const DEFAULT_SECT_IDS = /* @__PURE__ */ new Set(["sect_thuc_son", "sect_van_hoa", "sect_tieu_dao", "sect_u_minh"]);
      if (Array.isArray(data)) {
        for (const u of data) {
          if (u && u.id) {
            if (!u.displayName) {
              u.displayName = u.username;
              needsSave = true;
            }
            if (u.cultivation?.sect?.sectId && (DEFAULT_SECT_IDS.has(u.cultivation.sect.sectId) || u.cultivation.sect.sectId.startsWith("sect_thuc_son"))) {
              delete u.cultivation.sect;
              needsSave = true;
            }
            map.set(u.id, u);
          }
        }
      } else if (data && typeof data === "object") {
        for (const [id, u] of Object.entries(data)) {
          if (u && typeof u === "object") {
            const rec = u;
            if (!rec.displayName) {
              rec.displayName = rec.username;
              needsSave = true;
            }
            if (rec.cultivation?.sect?.sectId && (DEFAULT_SECT_IDS.has(rec.cultivation.sect.sectId) || rec.cultivation.sect.sectId.startsWith("sect_thuc_son"))) {
              delete rec.cultivation.sect;
              needsSave = true;
            }
            map.set(id, rec);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error reading users.json:", err);
  }
  const added = ensureDefaultAdminUser(map);
  if (added || needsSave) {
    try {
      const obj = {};
      for (const [id, u] of map.entries()) {
        obj[id] = u;
      }
      fs3.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2), "utf-8");
    } catch {
    }
  }
  return map;
}
var serverUsers = loadUsersFromFile();
function saveUsersToFile() {
  try {
    const obj = {};
    for (const [id, u] of serverUsers.entries()) {
      obj[id] = u;
      if (isDatabaseConfigured()) {
        dbSaveUser(u).catch((err) => {
          console.error(`[Database] \u274C L\u1ED7i l\u01B0u t\xE0i kho\u1EA3n ${u.username} v\xE0o PostgreSQL:`, err?.message || err);
        });
      }
    }
    fs3.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving users.json:", err);
  }
}
var XIANXIA_REALM_METAS = [
  { name: "Luy\u1EC7n Kh\xED K\u1EF3", titleName: "Luy\u1EC7n Kh\xED Tu S\u0129", icon: "\u{1F33F}", badge: "Kh\xED", frameId: "frame_xianxia_luyenkhi", startLevel: 1, endLevel: 30 },
  { name: "Tr\xFAc C\u01A1 K\u1EF3", titleName: "Tr\xFAc C\u01A1 Ch\xE2n Nh\xE2n", icon: "\u{1F9F1}", badge: "C\u01A1", frameId: "frame_xianxia_trucco", startLevel: 31, endLevel: 70 },
  { name: "K\u1EBFt \u0110an K\u1EF3", titleName: "Kim \u0110an T\xF4ng S\u01B0", icon: "\u{1F52E}", badge: "\u0110an", frameId: "frame_xianxia_ketdan", startLevel: 71, endLevel: 130 },
  { name: "Nguy\xEAn Anh K\u1EF3", titleName: "Nguy\xEAn Anh L\xE3o Qu\xE1i", icon: "\u{1F476}", badge: "Anh", frameId: "frame_xianxia_nguyenanh", startLevel: 131, endLevel: 210 },
  { name: "H\xF3a Th\u1EA7n K\u1EF3", titleName: "H\xF3a Th\u1EA7n T\xF4n Gi\u1EA3", icon: "\u{1F30C}", badge: "Th\u1EA7n", frameId: "frame_xianxia_hoathan", startLevel: 211, endLevel: 310 },
  { name: "Luy\u1EC7n H\u01B0 K\u1EF3", titleName: "Luy\u1EC7n H\u01B0 Th\u1EA7n Qu\xE2n", icon: "\u{1F300}", badge: "H\u01B0", frameId: "frame_xianxia_luyenhu", startLevel: 311, endLevel: 430 },
  { name: "H\u1EE3p Th\u1EC3 K\u1EF3", titleName: "H\u1EE3p Th\u1EC3 Th\xE1nh Qu\xE2n", icon: "\u26A1", badge: "Th\u1EC3", frameId: "frame_xianxia_hopthe", startLevel: 431, endLevel: 570 },
  { name: "\u0110\u1EA1i Th\u1EEBa K\u1EF3", titleName: "\u0110\u1EA1i Th\u1EEBa Ch\xED T\xF4n", icon: "\u2600\uFE0F", badge: "Th\u1EEBa", frameId: "frame_xianxia_daithua", startLevel: 571, endLevel: 720 },
  { name: "\u0110\u1ED9 Ki\u1EBFp K\u1EF3", titleName: "\u0110\u1ED9 Ki\u1EBFp Ti\xEAn T\xF4n", icon: "\u{1F329}\uFE0F", badge: "Ki\u1EBFp", frameId: "frame_xianxia_dokiep", startLevel: 721, endLevel: 870 },
  { name: "Kim Ti\xEAn", titleName: "B\u1EA5t H\u1EE7 Kim Ti\xEAn", icon: "\u{1F31F}", badge: "Kim", frameId: "frame_xianxia_kimtien", startLevel: 871, endLevel: 940 },
  { name: "\u0110\u1EA1i La Ti\xEAn", titleName: "\u0110\u1EA1i La Kim Ti\xEAn", icon: "\u{1F320}", badge: "La", frameId: "frame_xianxia_daila", startLevel: 941, endLevel: 980 },
  { name: "Thi\xEAn T\xF4n", titleName: "H\u1ED7n \u0110\u1ED9n Thi\xEAn T\xF4n", icon: "\u{1F451}", badge: "T\xF4n", frameId: "frame_xianxia_thienton", startLevel: 981, endLevel: 1e3 }
];
var SECTS_FILE = getSafeStoragePath2("sects.json");
function recalculateSectStats(sect) {
  if (!sect.members || !Array.isArray(sect.members)) {
    sect.members = [];
  }
  const totalTuVi = sect.members.reduce((acc, m) => acc + (Number(m.tuViScore) || 0), 0);
  sect.totalTuVi = totalTuVi > 0 ? totalTuVi : sect.totalTuVi || 1e6;
  sect.memberCount = sect.members.length;
  if (sect.members.length > 0) {
    sect.avgLevel = Math.round(sect.members.reduce((acc, m) => acc + (Number(m.level) || 1), 0) / sect.members.length);
    const avgRealmIdx = Math.round(sect.members.reduce((acc, m) => acc + (Number(m.realmIndex) || 0), 0) / sect.members.length);
    sect.avgRealmName = XIANXIA_REALM_METAS[Math.min(11, Math.max(0, avgRealmIdx))]?.name || "H\xF3a Th\u1EA7n K\u1EF3";
  }
}
function loadSectsFromFile() {
  const map = /* @__PURE__ */ new Map();
  const DEFAULT_SECT_IDS = /* @__PURE__ */ new Set(["sect_thuc_son", "sect_van_hoa", "sect_tieu_dao", "sect_u_minh"]);
  try {
    if (fs3.existsSync(SECTS_FILE)) {
      const content = fs3.readFileSync(SECTS_FILE, "utf-8");
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        for (const s of data) {
          if (s && s.id && !DEFAULT_SECT_IDS.has(s.id) && !s.id.startsWith("sect_thuc_son")) {
            recalculateSectStats(s);
            map.set(s.id, s);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error reading sects.json:", err);
  }
  try {
    fs3.writeFileSync(SECTS_FILE, JSON.stringify(Array.from(map.values()), null, 2), "utf-8");
  } catch {
  }
  return map;
}
var serverSects = loadSectsFromFile();
function saveSectsToFile() {
  try {
    const arr = Array.from(serverSects.values());
    fs3.writeFileSync(SECTS_FILE, JSON.stringify(arr, null, 2), "utf-8");
    if (isDatabaseConfigured()) {
      dbSaveSects(arr).catch(() => {
      });
    }
  } catch (err) {
    console.error("Error saving sects.json:", err);
  }
}
function ensureLeaderboardPopulated() {
  let needsSave = false;
  const now = Date.now();
  const cultivators = Array.from(serverUsers.values()).filter(
    (u) => u && u.id && u.id !== "usr_admin_default" && u.username
  );
  for (const m of VALID_LEADERBOARD_MODES) {
    if (!serverLeaderboardData.rankings[m]) {
      serverLeaderboardData.rankings[m] = { daily: [], weekly: [], all_time: [] };
    }
    const currentAllTime = serverLeaderboardData.rankings[m].all_time || [];
    if (currentAllTime.length < 15 && cultivators.length > 0) {
      const entries = cultivators.map((user) => {
        const cult = user.cultivation || {};
        const realmIndex = Math.max(0, Math.min(11, Number(cult.realmIndex) || 0));
        const realmMeta = XIANXIA_REALM_METAS[realmIndex] || XIANXIA_REALM_METAS[0];
        const cultLevel = Number(cult.level) || 1;
        const hash = (user.username || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        let baseWpm = 65 + Math.floor(realmIndex * 3 + cultLevel % 15);
        if (m === "vi_nodau") baseWpm += 6;
        if (m === "numpad") baseWpm = Math.max(50, baseWpm - 8);
        if (m === "san_boss") baseWpm += 4;
        if (m === "ngau_hung") baseWpm += 2;
        if (m === "doan_chu") baseWpm = Math.max(45, baseWpm - 10);
        const wpm = user.bestWpm || baseWpm;
        const score = wpm * 10;
        const errors = hash % 3;
        const accuracy = 97 + hash % 3;
        const consistency = 88 + hash % 10;
        let sectName = cult.sect?.sectName || cult.sect?.name || cult.sectName;
        let sectTag = cult.sect?.sectTag || cult.sect?.tag || cult.sectTag;
        let sectRole = cult.sect?.role;
        return {
          rank: 1,
          userId: user.id,
          username: user.username,
          displayName: user.displayName || user.username,
          avatar: user.avatar || "\u26A1",
          frame: user.frame || realmMeta.frameId,
          wpm,
          score,
          errors,
          accuracy,
          consistency,
          timestamp: now - hash % 14 * 864e5,
          isVerified: true,
          realmName: realmMeta.name,
          realmIcon: realmMeta.icon,
          level: cultLevel,
          sectName,
          sectTag,
          sectRole,
          keyboardSwitch: "blue"
        };
      });
      const mergedMap = /* @__PURE__ */ new Map();
      for (const e of currentAllTime) {
        if (e && e.username) mergedMap.set(e.username.toLowerCase(), e);
      }
      for (const e of entries) {
        const key = e.username.toLowerCase();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, e);
        }
      }
      const isScoreMode = m === "ngau_hung" || m === "doan_chu";
      const sorted = Array.from(mergedMap.values()).sort((a, b) => {
        if (isScoreMode) {
          if (b.score !== a.score) return b.score - a.score;
        } else {
          if (b.wpm !== a.wpm) return b.wpm - a.wpm;
        }
        if (a.errors !== b.errors) return a.errors - b.errors;
        return a.timestamp - b.timestamp;
      });
      sorted.forEach((item, idx) => {
        item.rank = idx + 1;
      });
      serverLeaderboardData.rankings[m].all_time = sorted.slice(0, 20);
      serverLeaderboardData.rankings[m].weekly = sorted.slice(0, 20);
      serverLeaderboardData.rankings[m].daily = sorted.slice(0, 20);
      if (sorted.length > 0) {
        const top1 = sorted[0];
        serverLeaderboardData.highScores[m] = {
          userId: top1.userId,
          username: top1.username,
          displayName: top1.displayName || top1.username,
          avatar: top1.avatar,
          frame: top1.frame || "default",
          wpm: top1.wpm,
          score: top1.score,
          errors: top1.errors,
          accuracy: top1.accuracy || 98,
          timestamp: top1.timestamp,
          isVerified: true,
          sectName: top1.sectName,
          sectTag: top1.sectTag,
          sectRole: top1.sectRole,
          realmName: top1.realmName,
          realmIcon: top1.realmIcon,
          level: top1.level
        };
      }
      needsSave = true;
    }
  }
  serverHighScores = serverLeaderboardData.highScores;
  if (needsSave) {
    saveLeaderboardToFile();
  }
}
ensureLeaderboardPopulated();
var BANS_FILE = getSafeStoragePath2("banned_users.json");
function loadBansFromFile() {
  const map = /* @__PURE__ */ new Map();
  try {
    if (fs3.existsSync(BANS_FILE)) {
      const content = fs3.readFileSync(BANS_FILE, "utf-8");
      const data = JSON.parse(content);
      if (data && typeof data === "object") {
        const now = Date.now();
        for (const [key, val] of Object.entries(data)) {
          if (val && typeof val === "object" && val.bannedUntil > now) {
            map.set(key.toLowerCase(), val);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error reading banned_users.json:", err);
  }
  return map;
}
var serverBans = loadBansFromFile();
function saveBansToFile() {
  try {
    const obj = {};
    const now = Date.now();
    for (const [k, v] of serverBans.entries()) {
      if (v.bannedUntil > now) {
        obj[k] = v;
      }
    }
    fs3.writeFileSync(BANS_FILE, JSON.stringify(obj, null, 2), "utf-8");
    if (isDatabaseConfigured()) {
      dbSaveBannedUsers(Object.keys(obj)).catch(() => {
      });
    }
  } catch (err) {
    console.error("Error saving banned_users.json:", err);
  }
}
var isDbHydrated = false;
var dbHydratePromise = null;
async function ensureDatabaseHydrated() {
  if (isDbHydrated) return true;
  if (!isDatabaseConfigured()) return false;
  if (dbHydratePromise) return dbHydratePromise;
  dbHydratePromise = (async () => {
    console.log("[Database] \u{1F50C} Ph\xE1t hi\u1EC7n c\u1EA5u h\xECnh DATABASE_URL. B\u1EAFt \u0111\u1EA7u k\u1EBFt n\u1ED1i CSDL Supabase PostgreSQL...");
    const ok = await initDatabase();
    if (!ok) {
      console.warn("[Database] \u26A0\uFE0F Ch\u01B0a th\u1EC3 k\u1EBFt n\u1ED1i t\u1EDBi Supabase. H\u1EC7 th\u1ED1ng t\u1EA1m th\u1EDDi s\u1EED d\u1EE5ng b\u1ED9 nh\u1EDB c\u1EE5c b\u1ED9 \u0111\u1EC3 \u0111\u1EA3m b\u1EA3o \u1EE9ng d\u1EE5ng ho\u1EA1t \u0111\u1ED9ng th\xF4ng su\u1ED1t.");
      dbHydratePromise = null;
      return false;
    }
    try {
      const dbUsers = await dbLoadUsers();
      if (dbUsers && dbUsers.size > 0) {
        for (const [id, u] of dbUsers.entries()) {
          serverUsers.set(id, u);
        }
        console.log(`[Database] \u2705 \u0110\xE3 n\u1EA1p th\xE0nh c\xF4ng ${serverUsers.size} t\xE0i kho\u1EA3n t\u1EEB Supabase.`);
      } else {
        console.log("[Database] \u2139\uFE0F Supabase r\u1ED7ng. T\u1EF1 \u0111\u1ED9ng \u0111\u1ED3ng b\u1ED9 t\xE0i kho\u1EA3n hi\u1EC7n c\xF3 l\xEAn DB...");
        for (const u of serverUsers.values()) {
          await dbSaveUser(u);
        }
      }
      const dbSectsList = await dbLoadSects();
      if (dbSectsList && dbSectsList.length > 0) {
        serverSects.clear();
        for (const s of dbSectsList) {
          serverSects.set(s.id, s);
        }
        console.log(`[Database] \u0110\xE3 n\u1EA1p ${serverSects.size} t\xF4ng m\xF4n t\u1EEB Supabase.`);
      } else {
        await dbSaveSects(Array.from(serverSects.values()));
      }
      const dbBoard = await dbLoadLeaderboard();
      if (dbBoard) {
        Object.assign(serverLeaderboardData, dbBoard);
        console.log("[Database] \u0110\xE3 n\u1EA1p B\u1EA3ng x\u1EBFp h\u1EA1ng t\u1EEB Supabase.");
      } else {
        await dbSaveLeaderboard(serverLeaderboardData);
      }
      const dbBans = await dbLoadBannedUsers();
      if (dbBans && dbBans.length > 0) {
        const now = Date.now();
        for (const id of dbBans) {
          serverBans.set(id, {
            username: id,
            reason: "B\u1ECB c\u1EA5m b\u1EDFi Thi\xEAn \u0110\u1EA1o",
            durationMs: 365 * 24 * 3600 * 1e3,
            bannedUntil: now + 365 * 24 * 3600 * 1e3,
            bannedAt: now,
            personaId: "ban_co"
          });
        }
      }
      const activeRooms = await dbLoadActiveRooms();
      if (activeRooms && activeRooms.length > 0) {
        for (const r of activeRooms) {
          if (r && r.id) {
            rooms.set(normalizeRoomCode(r.id), r);
          }
        }
        console.log(`[Database] \u0110\xE3 \u0111\u1ED3ng b\u1ED9 ${activeRooms.length} ph\xF2ng \u0111ua t\u1EEB Supabase.`);
      }
      isDbHydrated = true;
      return true;
    } catch (err) {
      console.error("[Database] L\u1ED7i trong qu\xE1 tr\xECnh n\u1EA1p d\u1EEF li\u1EC7u ban \u0111\u1EA7u t\u1EEB Supabase:", err);
      dbHydratePromise = null;
      return false;
    }
  })();
  return dbHydratePromise;
}
if (isDatabaseConfigured()) {
  ensureDatabaseHydrated().catch((err) => {
    console.error("[Database] Kh\xF4ng th\u1EC3 kh\u1EDFi t\u1EA1o database:", err);
  });
} else {
  console.warn("[Database] \u26A0\uFE0F C\u1EA2NH B\xC1O: Ch\u01B0a c\u1EA5u h\xECnh bi\u1EBFn m\xF4i tr\u01B0\u1EDDng DATABASE_URL!");
  console.warn("[Database] \u2139\uFE0F M\xE1y ch\u1EE7 \u0111ang ch\u1EA1y v\u1EDBi b\u1ED9 nh\u1EDB c\u1EE5c b\u1ED9. Tr\xEAn Vercel, d\u1EEF li\u1EC7u ch\u1EC9 l\u01B0u t\u1EA1m th\u1EDDi trong phi\xEAn l\xE0m vi\u1EC7c.");
  console.warn('[Database] \u{1F449} C\xE1ch kh\u1EAFc ph\u1EE5c: V\xE0o Vercel Dashboard -> Project Settings -> Environment Variables -> th\xEAm key "DATABASE_URL" ch\u1EE9a chu\u1ED7i k\u1EBFt n\u1ED1i Supabase PostgreSQL (Connection Pooler).');
}
function checkIsBanned(usernameOrId) {
  try {
    if (!usernameOrId) return { isBanned: false, remainingMs: 0, remainingMinutes: 0 };
    const key = String(usernameOrId).trim().toLowerCase();
    if (!key) return { isBanned: false, remainingMs: 0, remainingMinutes: 0 };
    const now = Date.now();
    let record = serverBans?.get(key);
    if (!record && serverBans) {
      for (const b of serverBans.values()) {
        if (b && (b.username && String(b.username).toLowerCase() === key || b.userId && String(b.userId).toLowerCase() === key)) {
          record = b;
          break;
        }
      }
    }
    if (record) {
      if (record.bannedUntil && record.bannedUntil > now) {
        const remainingMs = record.bannedUntil - now;
        return {
          isBanned: true,
          record,
          remainingMs,
          remainingMinutes: Math.max(1, Math.ceil(remainingMs / 6e4))
        };
      } else {
        if (serverBans) serverBans.delete(key);
        try {
          saveBansToFile();
        } catch {
        }
      }
    }
    const user = getUserByUsername(usernameOrId) || (serverUsers ? serverUsers.get(usernameOrId) : null);
    if (user && user.bannedUntil && user.bannedUntil > now) {
      const remainingMs = user.bannedUntil - now;
      const rec = {
        username: user.username || String(usernameOrId),
        userId: user.id,
        bannedAt: user.bannedAt || now,
        bannedUntil: user.bannedUntil,
        durationMs: user.bannedDurationMs || 2 * 60 * 60 * 1e3,
        reason: user.banReason || "B\u1EA5t th\u01B0\u1EDDng t\u1EA7n s\u1ED1 g\xF5 ph\xEDm / Nghi v\u1EA5n Auto Macro",
        personaId: "ban_co"
      };
      if (serverBans && user.username) {
        serverBans.set(String(user.username).toLowerCase(), rec);
      }
      return {
        isBanned: true,
        record: rec,
        remainingMs,
        remainingMinutes: Math.max(1, Math.ceil(remainingMs / 6e4))
      };
    }
    return { isBanned: false, remainingMs: 0, remainingMinutes: 0 };
  } catch (err) {
    console.error("Error in checkIsBanned:", err);
    return { isBanned: false, remainingMs: 0, remainingMinutes: 0 };
  }
}
var syncUserCultivationToCache = null;
function executeApplyBan(params) {
  const durationMs = params.durationMs || 2 * 60 * 60 * 1e3;
  const now = Date.now();
  const bannedUntil = now + durationMs;
  const cleanUsername = String(params.username || "V\xF4 Danh").trim();
  const reason = String(params.reason || "B\u1EA5t th\u01B0\u1EDDng t\u1EA7n s\u1ED1 g\xF5 ph\xEDm / Nghi v\u1EA5n Auto Macro").trim();
  const record = {
    username: cleanUsername,
    userId: params.userId,
    bannedAt: now,
    bannedUntil,
    durationMs,
    reason,
    personaId: "ban_co"
  };
  serverBans.set(cleanUsername.toLowerCase(), record);
  if (params.userId) {
    serverBans.set(params.userId.toLowerCase(), record);
  }
  saveBansToFile();
  const user = getUserByUsername(cleanUsername) || (params.userId ? serverUsers.get(params.userId) : null);
  if (user) {
    user.bannedUntil = bannedUntil;
    user.bannedAt = now;
    user.banReason = reason;
    user.bannedDurationMs = durationMs;
    if (user.cultivation) {
      const exp = Number(user.cultivation.exp) || 0;
      user.cultivation.exp = Math.max(0, exp - 500);
      if (syncUserCultivationToCache) {
        try {
          syncUserCultivationToCache(user);
        } catch {
        }
      }
    }
    saveUsersToFile();
  }
  for (const [code, r] of rooms.entries()) {
    const hasP = r.players.some(
      (p) => p.username && p.username.toLowerCase() === cleanUsername.toLowerCase() || params.userId && p.id === params.userId
    );
    if (hasP) {
      r.players = r.players.filter(
        (p) => (!p.username || p.username.toLowerCase() !== cleanUsername.toLowerCase()) && (!params.userId || p.id !== params.userId)
      );
      if (r.players.length === 0) {
        rooms.delete(code);
      } else {
        if (r.hostName && r.hostName.toLowerCase() === cleanUsername.toLowerCase()) {
          r.hostId = r.players[0].id;
          r.hostName = r.players[0].username;
        }
        broadcastToRoom(code, {
          type: "room_updated",
          room: r
        });
      }
    }
  }
  return record;
}
function getUserByToken(rawToken) {
  if (!rawToken || !serverUsers) return null;
  const cleanToken = String(rawToken).replace(/^Bearer\s+/i, "").trim();
  if (!cleanToken) return null;
  for (const user of serverUsers.values()) {
    if (user && Array.isArray(user.sessionTokens) && user.sessionTokens.includes(cleanToken)) {
      return user;
    }
  }
  return null;
}
function getUserByUsername(username) {
  if (!username || !serverUsers) return null;
  const lower = String(username).trim().toLowerCase();
  for (const user of serverUsers.values()) {
    if (user && user.username && String(user.username).trim().toLowerCase() === lower) {
      return user;
    }
  }
  return null;
}
function getUserByUsernameOrEmail(identifier) {
  if (!identifier || !serverUsers) return null;
  const clean = String(identifier).trim().toLowerCase();
  for (const user of serverUsers.values()) {
    if (user) {
      const uName = user.username ? String(user.username).trim().toLowerCase() : "";
      const uEmail = user.email ? String(user.email).trim().toLowerCase() : "";
      if (uName === clean || uEmail === clean) {
        return user;
      }
    }
  }
  return null;
}
function getUserByDisplayNameOrUsername(identifier) {
  if (!identifier || !serverUsers) return null;
  const clean = String(identifier).trim().toLowerCase();
  for (const user of serverUsers.values()) {
    if (user) {
      const uDisplay = user.displayName ? String(user.displayName).trim().toLowerCase() : "";
      const uName = user.username ? String(user.username).trim().toLowerCase() : "";
      const uId = user.id ? String(user.id).trim().toLowerCase() : "";
      if (uDisplay === clean || uName === clean || uId === clean) {
        return user;
      }
    }
  }
  return null;
}
function resolvePlayerDisplayName(identifier) {
  if (!identifier) return "\u0110\u1EA1o H\u1EEFu";
  const user = getUserByDisplayNameOrUsername(identifier);
  if (user) {
    return user.displayName || user.username || identifier;
  }
  return identifier;
}
function sanitizeUser(u) {
  return {
    id: u.id,
    email: u.email || "",
    username: u.username,
    // Tên đăng nhập cố định (dùng để đăng nhập)
    displayName: u.displayName || u.username,
    // Tên người chơi hiển thị trong game
    avatar: u.avatar,
    frame: u.frame,
    isAdmin: Boolean(u.isAdmin || u.username.toLowerCase() === "admin"),
    showcaseAchievements: u.showcaseAchievements || [],
    unlockedAchievements: u.unlockedAchievements || [],
    isVerified: u.isVerified,
    authProvider: u.authProvider,
    cultivation: u.cultivation || null,
    bestWpm: u.bestWpm || 0,
    bestWpmRecord: u.bestWpmRecord || null,
    totalGames: u.totalGames || 0,
    matchHistory: u.matchHistory || [],
    createdAt: u.createdAt
  };
}
var activePresenceSessions = /* @__PURE__ */ new Map();
var sseGlobalClients = /* @__PURE__ */ new Map();
var sseGlobalChatClients = /* @__PURE__ */ new Set();
var sseClientMeta = /* @__PURE__ */ new Map();
var sectChatMessages = /* @__PURE__ */ new Map();
var whisperChatMessages = /* @__PURE__ */ new Map();
function getWhisperKey(id1, id2) {
  return [String(id1 || "").toLowerCase(), String(id2 || "").toLowerCase()].sort().join("_");
}
var FRIENDS_FILE = getSafeStoragePath2("friends.json");
var serverFriendships = /* @__PURE__ */ new Map();
var serverFriendRequests = /* @__PURE__ */ new Map();
function loadFriendsFromFile() {
  try {
    if (fs3.existsSync(FRIENDS_FILE)) {
      const content = fs3.readFileSync(FRIENDS_FILE, "utf-8");
      const data = JSON.parse(content);
      if (data && Array.isArray(data.friendships)) {
        for (const f of data.friendships) {
          if (f && f.id) serverFriendships.set(f.id, f);
        }
      }
      if (data && Array.isArray(data.requests)) {
        for (const r of data.requests) {
          if (r && r.id) serverFriendRequests.set(r.id, r);
        }
      }
    }
  } catch (err) {
    console.error("Error loading friends.json:", err);
  }
}
function saveFriendsToFile() {
  try {
    const data = {
      friendships: Array.from(serverFriendships.values()),
      requests: Array.from(serverFriendRequests.values())
    };
    fs3.writeFileSync(FRIENDS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving friends.json:", err);
  }
}
loadFriendsFromFile();
function parseUserAgent(ua) {
  if (!ua) return { browser: "Web Browser", device: "Desktop" };
  let device = "Desktop";
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) {
    device = "Mobile";
  } else if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) {
    device = "Tablet";
  }
  let browser = "Web Browser";
  if (/edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/opr\/|opera/i.test(ua)) {
    browser = "Opera";
  } else if (/chrome|crios/i.test(ua)) {
    browser = "Chrome";
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Firefox";
  } else if (/safari/i.test(ua)) {
    browser = "Safari";
  }
  return { browser, device };
}
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "127.0.0.1";
}
function extractSessionMetaFromReq(req) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const query = req.query || {};
  const username = String(body.username || query.username || "").trim();
  const avatar = String(body.avatar || query.avatar || "").trim();
  const frame = String(body.frame || query.frame || "").trim();
  const deviceId = String(body.deviceId || query.deviceId || "").trim();
  const rawBestWpm = body.bestWpm !== void 0 ? body.bestWpm : query.bestWpm;
  const rawTotalGames = body.totalGames !== void 0 ? body.totalGames : query.totalGames;
  const bestWpm = rawBestWpm !== void 0 ? Number(rawBestWpm) : void 0;
  let bestWpmRecord = body.bestWpmRecord;
  if (!bestWpmRecord && query.bestWpmRecord) {
    try {
      bestWpmRecord = JSON.parse(String(query.bestWpmRecord));
    } catch {
    }
  }
  const totalGames = rawTotalGames !== void 0 ? Number(rawTotalGames) : void 0;
  const currentRoomId = body.currentRoomId !== void 0 ? String(body.currentRoomId).trim() : query.currentRoomId !== void 0 ? String(query.currentRoomId).trim() : void 0;
  const currentMode = body.currentMode !== void 0 ? String(body.currentMode).trim() : query.currentMode !== void 0 ? String(query.currentMode).trim() : void 0;
  const rawStatus = String(body.status || query.status || "").trim();
  const isAdmin = body.isAdmin === true || body.isAdmin === "true" || query.isAdmin === "true";
  const ua = String(req.headers["user-agent"] || "");
  const { browser, device } = parseUserAgent(ua);
  const ip = getClientIp(req);
  return {
    username: username || void 0,
    avatar: avatar || void 0,
    frame: frame || void 0,
    deviceId: deviceId || void 0,
    bestWpm: bestWpm !== void 0 && !isNaN(bestWpm) ? bestWpm : void 0,
    bestWpmRecord: bestWpmRecord && typeof bestWpmRecord === "object" ? bestWpmRecord : void 0,
    totalGames: totalGames !== void 0 && !isNaN(totalGames) ? totalGames : void 0,
    currentRoomId: currentRoomId !== void 0 ? currentRoomId || null : void 0,
    currentMode: currentMode !== void 0 ? currentMode || null : void 0,
    status: ["lobby", "waiting_room", "playing", "outplay", "gameover"].includes(rawStatus) ? rawStatus : void 0,
    isAdmin,
    ip,
    browser,
    device
  };
}
function getUniqueUserKey(session) {
  if (session.username && session.username !== "Kh\xE1ch" && !session.username.startsWith("Kh\xE1ch ")) {
    return `user_${session.username.toLowerCase().trim()}`;
  }
  if (session.deviceId && session.deviceId.trim()) {
    return `dev_${session.deviceId.trim()}`;
  }
  if (session.userId && !session.userId.startsWith("guest_") && !session.userId.startsWith("p_")) {
    return `id_${session.userId.trim()}`;
  }
  return session.userId ? `id_${session.userId.trim()}` : `tab_${session.tabId}`;
}
function cleanStaleSessions() {
  const now = Date.now();
  const TIMEOUT_MS = 25e3;
  let removed = false;
  for (const [tabId, session] of activePresenceSessions.entries()) {
    if (session.tabId.startsWith("world_cultivator_")) {
      activePresenceSessions.delete(tabId);
      removed = true;
      continue;
    }
    if (now - session.lastSeen > TIMEOUT_MS) {
      activePresenceSessions.delete(tabId);
      removed = true;
    }
  }
  return removed;
}
function getRealOnlineCount() {
  cleanStaleSessions();
  const uniqueUsers = /* @__PURE__ */ new Set();
  for (const session of activePresenceSessions.values()) {
    if (!session.tabId.startsWith("world_cultivator_")) {
      uniqueUsers.add(getUniqueUserKey(session));
    }
  }
  return uniqueUsers.size;
}
function registerPresence(tabId, userId, meta) {
  if (!tabId) return;
  const now = Date.now();
  const prevCount = getRealOnlineCount();
  const existing = activePresenceSessions.get(tabId);
  activePresenceSessions.set(tabId, {
    tabId,
    userId: userId || existing?.userId || tabId,
    deviceId: meta?.deviceId || existing?.deviceId,
    username: meta?.username || existing?.username || "Kh\xE1ch " + tabId.slice(-4),
    avatar: meta?.avatar || existing?.avatar || "\u26A1",
    frame: meta?.frame !== void 0 ? meta.frame : existing?.frame || "default",
    bestWpm: typeof meta?.bestWpm === "number" ? meta.bestWpm : existing?.bestWpm || 0,
    bestWpmRecord: meta?.bestWpmRecord || existing?.bestWpmRecord,
    totalGames: typeof meta?.totalGames === "number" ? meta.totalGames : existing?.totalGames || 0,
    currentRoomId: meta?.currentRoomId !== void 0 ? meta.currentRoomId : existing?.currentRoomId || null,
    currentMode: meta?.currentMode !== void 0 ? meta.currentMode : existing?.currentMode || null,
    status: meta?.status || existing?.status || "lobby",
    isAdmin: meta?.isAdmin !== void 0 ? meta.isAdmin : existing?.isAdmin || false,
    ip: meta?.ip || existing?.ip || "127.0.0.1",
    browser: meta?.browser || existing?.browser || "Chrome",
    device: meta?.device || existing?.device || "Desktop",
    connectedAt: existing?.connectedAt || now,
    lastSeen: now
  });
  const newCount = getRealOnlineCount();
  if (newCount !== prevCount) {
    broadcastOnlinePresence();
  }
}
function removePresence(tabId) {
  if (!tabId || tabId.startsWith("world_cultivator_")) return;
  setTimeout(() => {
    const session = activePresenceSessions.get(tabId);
    if (session && Date.now() - session.lastSeen > 8e3) {
      const prevCount = getRealOnlineCount();
      activePresenceSessions.delete(tabId);
      const newCount = getRealOnlineCount();
      if (newCount !== prevCount) {
        broadcastOnlinePresence();
      }
    }
  }, 1e4);
}
function broadcastOnlinePresence() {
  const count = getRealOnlineCount();
  const payload = `data: ${JSON.stringify({ type: "online_count", count })}

`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      client.write(payload);
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
    }
  }
}
setInterval(() => {
  const countBefore = getRealOnlineCount();
  const removed = cleanStaleSessions();
  const countAfter = getRealOnlineCount();
  if (removed && countBefore !== countAfter) {
    broadcastOnlinePresence();
  }
}, 2e3);
var REALM_MAX_THO_NGUYEN = [240, 480, 960, 1800, 3e3, 4800, 7200, 10800, 15e3, 3e4, 6e4, 999999];
var REALM_START_LEVELS = [1, 31, 71, 131, 211, 311, 431, 571, 721, 871, 941, 981];
var TWO_HOURS_MS = 2 * 60 * 60 * 1e3;
setInterval(() => {
  const now = Date.now();
  let anyUserUpdated = false;
  for (const user of serverUsers.values()) {
    if (!user.cultivation) continue;
    const realmIndex = typeof user.cultivation.realmIndex === "number" ? user.cultivation.realmIndex : 0;
    if (realmIndex >= 11) continue;
    const lastDecay = user.cultivation.lastThoNguyenDecay || now;
    const elapsed = now - lastDecay;
    const decayUnits = Math.floor(elapsed / TWO_HOURS_MS);
    if (decayUnits > 0) {
      anyUserUpdated = true;
      user.cultivation.thoNguyen = Math.max(0, (user.cultivation.thoNguyen ?? REALM_MAX_THO_NGUYEN[realmIndex]) - decayUnits);
      user.cultivation.lastThoNguyenDecay = lastDecay + decayUnits * TWO_HOURS_MS;
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
}, 6e4);
function broadcastLeaderboard() {
  const payload = `data: ${JSON.stringify({
    type: "leaderboard_updated",
    highScores: serverLeaderboardData.highScores,
    rankings: serverLeaderboardData.rankings,
    lastResetDate: serverLeaderboardData.lastResetDate,
    lastResetWeek: serverLeaderboardData.lastResetWeek
  })}

`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      client.write(payload);
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
    }
  }
}
function broadcastBreakingRecord(record) {
  const payload = `data: ${JSON.stringify({
    type: "breaking_record",
    record
  })}

`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      client.write(payload);
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
    }
  }
}
function broadcastGlobalChat(msg) {
  const payload = `data: ${JSON.stringify({ type: "new_chat_message", message: msg })}

`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      client.write(payload);
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
      sseClientMeta.delete(client);
    }
  }
}
function broadcastSectChat(sectId, msg) {
  const payload = `data: ${JSON.stringify({ type: "new_chat_message", message: msg })}

`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      const meta = sseClientMeta.get(client);
      const user = meta?.userId ? serverUsers.get(meta.userId) : meta?.username ? getUserByUsername(meta.username) : null;
      const userSectId = user?.cultivation?.sectId || meta?.sectId;
      if (userSectId === sectId || meta?.username === "Admin" || user?.isAdmin) {
        client.write(payload);
      }
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
      sseClientMeta.delete(client);
    }
  }
}
function broadcastWhisperChat(user1Id, user2Id, msg) {
  const payload = `data: ${JSON.stringify({ type: "new_chat_message", message: msg })}

`;
  const clean1 = (user1Id || "").toLowerCase();
  const clean2 = (user2Id || "").toLowerCase();
  const targetName = (msg.whisperTarget || "").toLowerCase();
  const senderName = (msg.username || "").toLowerCase();
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      const meta = sseClientMeta.get(client);
      const cUserId = (meta?.userId || "").toLowerCase();
      const cUsername = (meta?.username || "").toLowerCase();
      const isParticipant = cUserId && (cUserId === clean1 || cUserId === clean2) || cUsername && (cUsername === senderName || cUsername === targetName) || cUsername === "admin";
      if (isParticipant) {
        client.write(payload);
      }
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
      sseClientMeta.delete(client);
    }
  }
}
function broadcastToUser(targetUserIdOrName, event) {
  if (!targetUserIdOrName) return;
  const payload = `data: ${JSON.stringify(event)}

`;
  const clean = String(targetUserIdOrName || "").toLowerCase();
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      const meta = sseClientMeta.get(client);
      if (meta?.userId && meta.userId.toLowerCase() === clean || meta?.username && meta.username.toLowerCase() === clean) {
        client.write(payload);
      }
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
      sseClientMeta.delete(client);
    }
  }
}
function broadcastGlobalChatClear() {
  const payload = `data: ${JSON.stringify({ type: "chat_cleared" })}

`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      client.write(payload);
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
    }
  }
}
function generateUniqueRoomCode() {
  for (let i = 0; i < 200; i++) {
    const num = Math.floor(1e3 + Math.random() * 9e3);
    const code = `VN-${num}`;
    if (!rooms.has(code)) {
      return code;
    }
  }
  return `VN-${Date.now().toString().slice(-4)}`;
}
function initWorldRooms() {
}
initWorldRooms();
function cleanupInactiveRooms() {
  const now = Date.now();
  for (const [id, room] of rooms.entries()) {
    const lastActive = room.lastActive || room.createdAt || now;
    if (now - lastActive < 60 * 1e3) {
      continue;
    }
    const humanPlayers = room.players.filter((p) => !p.isBot);
    if (humanPlayers.length === 0) {
      stopRoomBots(id, false);
      rooms.delete(id);
      sseClientsByRoom.delete(id);
      roomChatMessages.delete(id);
      broadcastToRoom(id, { type: "room_closed", roomId: id });
      continue;
    }
    const clients = sseClientsByRoom.get(id);
    const hasActiveSse = clients && clients.size > 0;
    if (!hasActiveSse && now - lastActive > 60 * 1e3) {
      stopRoomBots(id, false);
      rooms.delete(id);
      sseClientsByRoom.delete(id);
      roomChatMessages.delete(id);
      broadcastToRoom(id, { type: "room_closed", roomId: id });
      continue;
    }
    if (now - (room.lastActive || room.createdAt) > 60 * 60 * 1e3) {
      stopRoomBots(id, false);
      rooms.delete(id);
      sseClientsByRoom.delete(id);
      roomChatMessages.delete(id);
      broadcastToRoom(id, { type: "room_closed", roomId: id });
    }
  }
}
setInterval(cleanupInactiveRooms, 5 * 1e3);
function broadcastToRoom(roomId, event) {
  const normId = normalizeRoomCode(roomId);
  const clients = sseClientsByRoom.get(normId);
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify(event)}

`;
  for (const res of Array.from(clients)) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}
var roomBotIntervals = /* @__PURE__ */ new Map();
function stopRoomBots(roomId, resetBotsToWaiting = true) {
  const norm = normalizeRoomCode(roomId);
  const existing = roomBotIntervals.get(norm);
  if (existing) {
    clearInterval(existing);
    roomBotIntervals.delete(norm);
  }
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
function startRoomBots(roomId) {
  const norm = normalizeRoomCode(roomId);
  stopRoomBots(norm, false);
  const room = rooms.get(norm);
  if (!room || room.status !== "playing") return;
  const standardModes = ["vi_dau", "vi_nodau", "en", "numpad", "outplay"];
  if (!standardModes.includes(room.mode)) return;
  const bots = room.players.filter((p) => p.isBot);
  if (bots.length === 0) return;
  const startTime = Date.now();
  const countdownDelayMs = 3500;
  const interval = setInterval(() => {
    const currentRoom = rooms.get(norm);
    if (!currentRoom || currentRoom.status !== "playing") {
      stopRoomBots(norm, true);
      return;
    }
    const activeHumans = currentRoom.players.filter(
      (p) => !p.isBot && !p.isSurrendered && !p.isFinished && p.inMatch !== false
    );
    if (activeHumans.length === 0) {
      currentRoom.status = "finished";
      stopRoomBots(norm, true);
      broadcastToRoom(norm, { type: "room_updated", room: currentRoom });
      return;
    }
    const elapsedTotal = Date.now() - startTime;
    if (elapsedTotal < countdownDelayMs) {
      return;
    }
    const elapsedTypingSec = (elapsedTotal - countdownDelayMs) / 1e3;
    const totalWords = Math.max(1, currentRoom.words?.length || 150);
    let anyBotUpdated = false;
    currentRoom.players.forEach((p, idx) => {
      if (!p.isBot || p.isFinished || p.isSurrendered) return;
      const targetWpm = p.botTargetWpm || 60;
      const variance = Math.sin(idx * 7 + elapsedTypingSec * 1.5) * 3 + Math.cos(elapsedTypingSec * 0.8) * 2;
      const liveWpm = Math.max(20, Math.round(targetWpm + variance));
      const wordsTyped = targetWpm / 60 * elapsedTypingSec;
      const progress = Math.min(100, parseFloat((wordsTyped / totalWords * 100).toFixed(1)));
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
        type: "player_progress",
        roomId: norm,
        players: currentRoom.players
      });
    }
    const activePlayers = currentRoom.players.filter(
      (p) => !p.isSurrendered && !p.isFinished && p.inMatch !== false
    );
    if (activePlayers.length === 0) {
      currentRoom.status = "finished";
      stopRoomBots(norm, true);
      broadcastToRoom(norm, { type: "room_updated", room: currentRoom });
    }
  }, 500);
  roomBotIntervals.set(norm, interval);
}
var app = express();
app.set("trust proxy", 1);
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});
app.use(async (_req, _res, next) => {
  if (isDatabaseConfigured() && !isDbHydrated) {
    try {
      await ensureDatabaseHydrated();
    } catch {
    }
  }
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use((err, _req, res, next) => {
  if (err && (err.type === "entity.too.large" || err.status === 413 || err.statusCode === 413)) {
    res.status(413).json({
      success: false,
      error: "Dung l\u01B0\u1EE3ng y\xEAu c\u1EA7u qu\xE1 l\u1EDBn (Payload Too Large). Gi\u1EDBi h\u1EA1n t\u1ED1i \u0111a l\xE0 50MB.",
      message: "D\u1EEF li\u1EC7u v\u01B0\u1EE3t qu\xE1 dung l\u01B0\u1EE3ng cho ph\xE9p."
    });
    return;
  }
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      success: false,
      error: "D\u1EEF li\u1EC7u JSON g\u1EEDi l\xEAn kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng."
    });
    return;
  }
  next(err);
});
app.post("/api/auth/google", (req, res) => {
  res.status(410).json({
    success: false,
    error: "T\xEDnh n\u0103ng \u0111\u0103ng nh\u1EADp b\u1EB1ng Google \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EE1 b\u1ECF. Vui l\xF2ng \u0111\u0103ng k\xFD ho\u1EB7c \u0111\u0103ng nh\u1EADp b\u1EB1ng t\xE0i kho\u1EA3n!"
  });
});
var handleQuickRegister = (req, res) => {
  const { password, username, displayName, avatar } = req.body || {};
  const cleanUsername = String(username || "").trim();
  if (!cleanUsername || cleanUsername.length < 3) {
    res.status(400).json({ success: false, error: "T\xEAn \u0111\u0103ng nh\u1EADp ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 3 k\xFD t\u1EF1." });
    return;
  }
  if (cleanUsername.length > 24) {
    res.status(400).json({ success: false, error: "T\xEAn \u0111\u0103ng nh\u1EADp kh\xF4ng \u0111\u01B0\u1EE3c v\u01B0\u1EE3t qu\xE1 24 k\xFD t\u1EF1." });
    return;
  }
  if (/\s/.test(cleanUsername)) {
    res.status(400).json({ success: false, error: "T\xEAn \u0111\u0103ng nh\u1EADp kh\xF4ng \u0111\u01B0\u1EE3c ch\u1EE9a kho\u1EA3ng tr\u1EAFng (d\u1EA5u c\xE1ch)." });
    return;
  }
  const cleanPassword = String(password || "");
  if (!cleanPassword || cleanPassword.length < 4) {
    res.status(400).json({ success: false, error: "M\u1EADt kh\u1EA9u ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 4 k\xFD t\u1EF1." });
    return;
  }
  const existingByName = getUserByUsername(cleanUsername);
  if (existingByName) {
    res.status(400).json({
      success: false,
      error: `T\xEAn \u0111\u0103ng nh\u1EADp "${cleanUsername}" \u0111\xE3 c\xF3 ng\u01B0\u1EDDi s\u1EED d\u1EE5ng. Vui l\xF2ng ch\u1ECDn t\xEAn \u0111\u0103ng nh\u1EADp kh\xE1c!`
    });
    return;
  }
  const cleanDisplayName = String(displayName || cleanUsername).trim().slice(0, 24) || cleanUsername;
  const salt = crypto2.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(cleanPassword, salt);
  const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const sessionToken = `tok_${Date.now()}_${crypto2.randomBytes(16).toString("hex")}`;
  const user = {
    id: userId,
    email: "",
    username: cleanUsername,
    // Tên đăng nhập cố định (không thể thay đổi)
    displayName: cleanDisplayName,
    // Tên người chơi hiển thị trong game
    avatar: avatar || "\u26A1",
    frame: "default",
    authProvider: "email",
    passwordHash,
    salt,
    isVerified: true,
    sessionTokens: [sessionToken],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  serverUsers.set(userId, user);
  saveUsersToFile();
  console.log(`[FastTyping Auth] \u0110\u0103ng k\xFD th\xE0nh c\xF4ng: Username="${cleanUsername}", DisplayName="${cleanDisplayName}"`);
  res.json({
    success: true,
    token: sessionToken,
    user: sanitizeUser(user),
    message: "T\u1EA1o t\xE0i kho\u1EA3n th\xE0nh c\xF4ng! B\u1EA1n \u0111\xE3 s\u1EB5n s\xE0ng tham gia B\u1EA3ng V\xE0ng."
  });
};
app.post("/api/auth/register", handleQuickRegister);
app.post("/api/auth/register-email", handleQuickRegister);
var handleQuickLogin = (req, res) => {
  const { email, username, account, identifier: reqIdentifier, password } = req.body || {};
  const identifier = String(reqIdentifier || account || username || email || "").trim();
  if (!identifier) {
    res.status(400).json({ success: false, error: "Vui l\xF2ng nh\u1EADp t\xEAn \u0111\u0103ng nh\u1EADp." });
    return;
  }
  if (!password) {
    res.status(400).json({ success: false, error: "Vui l\xF2ng nh\u1EADp m\u1EADt kh\u1EA9u." });
    return;
  }
  const user = getUserByUsernameOrEmail(identifier);
  if (!user) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n v\u1EDBi t\xEAn \u0111\u0103ng nh\u1EADp n\xE0y." });
    return;
  }
  if (!user.salt || !user.passwordHash) {
    res.status(400).json({
      success: false,
      error: "T\xE0i kho\u1EA3n n\xE0y ch\u01B0a thi\u1EBFt l\u1EADp m\u1EADt kh\u1EA9u. Vui l\xF2ng t\u1EA1o t\xE0i kho\u1EA3n m\u1EDBi!"
    });
    return;
  }
  const checkHash = hashPassword(password, user.salt);
  if (checkHash !== user.passwordHash) {
    res.status(400).json({ success: false, error: "M\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c." });
    return;
  }
  user.isVerified = true;
  user.updatedAt = Date.now();
  const sessionToken = `tok_${Date.now()}_${crypto2.randomBytes(16).toString("hex")}`;
  if (!user.sessionTokens) user.sessionTokens = [];
  user.sessionTokens.push(sessionToken);
  if (user.sessionTokens.length > 20) user.sessionTokens.shift();
  serverUsers.set(user.id, user);
  saveUsersToFile();
  res.json({
    success: true,
    token: sessionToken,
    user: sanitizeUser(user),
    message: "\u0110\u0103ng nh\u1EADp th\xE0nh c\xF4ng!"
  });
};
app.post("/api/auth/login", handleQuickLogin);
app.post("/api/auth/login-email", handleQuickLogin);
app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserByToken(authHeader);
  if (!user) {
    res.json({ success: false, isGuest: true, user: null });
    return;
  }
  res.json({
    success: true,
    isGuest: false,
    user: sanitizeUser(user)
  });
});
app.post("/api/auth/profile", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserByToken(authHeader);
  if (!user || !user.isVerified) {
    res.status(403).json({
      success: false,
      error: "Ch\u1EBF \u0111\u1ED9 Kh\xE1ch kh\xF4ng th\u1EC3 \u0111\u1ED5i t\xEAn, khung v\xE0 avatar. Vui l\xF2ng \u0111\u0103ng nh\u1EADp t\xE0i kho\u1EA3n!"
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
  const newPlayerName = String(displayName || username || "").trim();
  if (newPlayerName && newPlayerName.length >= 2) {
    const slicedName = newPlayerName.slice(0, 24);
    const cleanNew = slicedName.toLowerCase();
    const currentDisplayName = (user.displayName || user.username).trim().toLowerCase();
    if (cleanNew !== currentDisplayName) {
      const existing = Array.from(serverUsers.values()).find(
        (u) => u.id !== user.id && (u.displayName && u.displayName.trim().toLowerCase() === cleanNew || !u.displayName && u.username.trim().toLowerCase() === cleanNew)
      );
      if (existing) {
        res.status(400).json({
          success: false,
          error: `T\xEAn ng\u01B0\u1EDDi ch\u01A1i / Bi\u1EC7t danh "${slicedName}" \u0111\xE3 c\xF3 ng\u01B0\u1EDDi s\u1EED d\u1EE5ng. Vui l\xF2ng ch\u1ECDn t\xEAn kh\xE1c!`
        });
        return;
      }
    }
    user.displayName = slicedName;
  }
  if (avatar && typeof avatar === "string" && avatar.trim()) {
    user.avatar = avatar.trim();
  }
  if (frame && typeof frame === "string" && frame.trim()) {
    user.frame = frame.trim();
  }
  if (Array.isArray(showcaseAchievements)) {
    user.showcaseAchievements = showcaseAchievements.filter((x) => typeof x === "string").slice(0, 4);
  }
  if (Array.isArray(unlockedAchievements)) {
    user.unlockedAchievements = unlockedAchievements.filter((x) => typeof x === "string");
  }
  if (typeof bestWpm === "number" && !isNaN(bestWpm)) {
    user.bestWpm = Math.round(bestWpm);
  }
  if (bestWpmRecord && typeof bestWpmRecord === "object") {
    user.bestWpmRecord = bestWpmRecord;
  }
  if (typeof totalGames === "number" && !isNaN(totalGames)) {
    user.totalGames = Math.max(user.totalGames || 0, Math.round(totalGames));
  }
  if (Array.isArray(matchHistory)) {
    user.matchHistory = matchHistory.slice(0, 50);
  }
  if (cultivation && typeof cultivation === "object") {
    user.cultivation = cultivation;
  }
  user.updatedAt = Date.now();
  serverUsers.set(user.id, user);
  saveUsersToFile();
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
    message: "C\u1EADp nh\u1EADt h\u1ED3 s\u01A1 th\xE0nh c\xF4ng!"
  });
});
app.post("/api/auth/change-password", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserByToken(authHeader);
  if (!user || !user.isVerified) {
    res.status(401).json({
      success: false,
      error: "Phi\xEAn \u0111\u0103ng nh\u1EADp kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i!"
    });
    return;
  }
  const { oldPassword, newPassword } = req.body || {};
  const cleanOld = String(oldPassword || "");
  const cleanNew = String(newPassword || "");
  if (!cleanOld) {
    res.status(400).json({
      success: false,
      error: "Vui l\xF2ng nh\u1EADp m\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i."
    });
    return;
  }
  if (!cleanNew || cleanNew.length < 4) {
    res.status(400).json({
      success: false,
      error: "M\u1EADt kh\u1EA9u m\u1EDBi ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 4 k\xFD t\u1EF1."
    });
    return;
  }
  if (cleanOld === cleanNew) {
    res.status(400).json({
      success: false,
      error: "M\u1EADt kh\u1EA9u m\u1EDBi kh\xF4ng \u0111\u01B0\u1EE3c tr\xF9ng v\u1EDBi m\u1EADt kh\u1EA9u c\u0169."
    });
    return;
  }
  if (!user.salt || !user.passwordHash) {
    res.status(400).json({
      success: false,
      error: "T\xE0i kho\u1EA3n ch\u01B0a c\xF3 m\u1EADt kh\u1EA9u g\u1ED1c \u0111\u1EC3 \u0111\u1ED5i. Vui l\xF2ng th\u1EED l\u1EA1i!"
    });
    return;
  }
  const checkHash = hashPassword(cleanOld, user.salt);
  if (checkHash !== user.passwordHash) {
    res.status(400).json({
      success: false,
      error: "M\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i kh\xF4ng ch\xEDnh x\xE1c."
    });
    return;
  }
  const newSalt = crypto2.randomBytes(16).toString("hex");
  const newPasswordHash = hashPassword(cleanNew, newSalt);
  user.salt = newSalt;
  user.passwordHash = newPasswordHash;
  user.updatedAt = Date.now();
  serverUsers.set(user.id, user);
  saveUsersToFile();
  console.log(`[FastTyping Auth] \u0110\u1ED5i m\u1EADt kh\u1EA9u th\xE0nh c\xF4ng cho t\xE0i kho\u1EA3n: ${user.username}`);
  res.json({
    success: true,
    message: "\u0110\u1ED5i m\u1EADt kh\u1EA9u th\xE0nh c\xF4ng! M\u1EADt kh\u1EA9u m\u1EDBi \u0111\xE3 c\xF3 hi\u1EC7u l\u1EF1c."
  });
});
app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  const cleanToken = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
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
  res.json({ success: true, message: "\u0110\xE3 \u0111\u0103ng xu\u1EA5t." });
});
app.get("/api/cultivation", (req, res) => {
  const authHeader = req.headers.authorization;
  let user = getUserByToken(authHeader);
  if (!user && req.query.userId) {
    user = serverUsers.get(String(req.query.userId)) || null;
  }
  if (!user && req.query.username) {
    user = getUserByUsername(String(req.query.username));
  }
  if (!user) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y th\xF4ng tin t\xE0i kho\u1EA3n." });
    return;
  }
  res.json({
    success: true,
    cultivation: user.cultivation || null
  });
});
var CULTIVATION_LEADERBOARD_INTERVAL_MS = 60 * 60 * 1e3;
var lastCultivationLeaderboardUpdate = 0;
var cachedCultivationTop50 = [];
var cachedCultivationRankedList = [];
var cachedTotalCultivators = 0;
function getSubStageName(tier) {
  if (tier <= 3) return "S\u01A1 K\u1EF3";
  if (tier <= 6) return "Trung K\u1EF3";
  if (tier <= 9) return "H\u1EADu K\u1EF3";
  return "\u0110\u1EA1i Vi\xEAn M\xE3n";
}
app.get("/api/player/profile/:identifier", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const identifier = decodeURIComponent(req.params.identifier || "").trim();
  if (!identifier) {
    res.status(400).json({ success: false, error: "Thi\u1EBFu \u0111\u1ECBnh danh ng\u01B0\u1EDDi ch\u01A1i" });
    return;
  }
  const clean = identifier.toLowerCase();
  const user = serverUsers.get(identifier) || null || getUserByUsername(identifier) || getUserByDisplayNameOrUsername(identifier);
  if (!user) {
    for (const s of serverSects.values()) {
      const m = (s.members || []).find(
        (x) => x.userId === identifier || x.username && x.username.toLowerCase() === clean || x.displayName && x.displayName.toLowerCase() === clean
      );
      if (m) {
        const rMeta2 = XIANXIA_REALM_METAS[m.realmIndex] || XIANXIA_REALM_METAS[0];
        res.json({
          success: true,
          profile: {
            userId: m.userId,
            username: m.username,
            displayName: m.displayName || m.username,
            avatar: m.avatar || "\u26A1",
            frame: m.frame || rMeta2.frameId,
            isVerified: true,
            isAdmin: false,
            totalGames: 10,
            bestWpm: 0,
            bestWpmRecord: null,
            showcaseAchievements: [],
            unlockedAchievementsCount: 5,
            keyboardSwitch: "Cherry MX Blue Clicky",
            isOnline: false,
            cultivation: {
              level: m.level || 1,
              realmIndex: m.realmIndex || 0,
              tier: m.tier || 1,
              realmName: m.realmName || rMeta2.name,
              realmIcon: m.realmIcon || rMeta2.icon,
              titleName: rMeta2.titleName,
              badge: rMeta2.badge,
              subStage: getSubStageName(m.tier || 1),
              exp: m.exp || 0,
              maxExp: 1e3,
              tuViScore: m.tuViScore || 0,
              thoNguyen: 240,
              linhThach: 100,
              sect: {
                sectId: s.id,
                sectName: s.name,
                sectTag: s.tag,
                role: m.role,
                contribution: m.contribution || 0
              }
            },
            sectInfo: {
              id: s.id,
              name: s.name,
              tag: s.tag,
              role: m.role,
              badgeIcon: s.badgeIcon || "\u{1F3F0}",
              slogan: s.slogan || s.description || "",
              bannerColor: s.bannerColor || "#f59e0b",
              linhMachLevel: s.linhMachLevel || 1,
              memberCount: s.members?.length || 1
            }
          }
        });
        return;
      }
    }
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y th\xF4ng tin ng\u01B0\u1EDDi ch\u01A1i n\xE0y" });
    return;
  }
  const cult = user.cultivation || {};
  const rIdx = Math.max(0, Math.min(11, Number(cult.realmIndex) || 0));
  const rMeta = XIANXIA_REALM_METAS[rIdx] || XIANXIA_REALM_METAS[0];
  let sectName = cult.sect?.sectName || cult.sect?.name || cult.sectName || void 0;
  let sectTag = cult.sect?.sectTag || cult.sect?.tag || cult.sectTag || void 0;
  let sectRole = cult.sect?.role || void 0;
  let sectId = cult.sect?.sectId || void 0;
  let sectContribution = cult.sect?.contribution || 0;
  let sectBadgeIcon = "\u{1F3F0}";
  let sectSlogan = "";
  let sectColor = "#f59e0b";
  let sectLinhMach = 1;
  let sectMemberCount = 1;
  if (sectId && serverSects.has(sectId)) {
    const s = serverSects.get(sectId);
    sectName = s.name;
    sectTag = s.tag;
    sectBadgeIcon = s.badgeIcon || "\u{1F3F0}";
    sectSlogan = s.slogan || s.description || "";
    sectColor = s.bannerColor || "#f59e0b";
    sectLinhMach = s.linhMachLevel || 1;
    sectMemberCount = s.members?.length || 1;
  }
  if (!sectName) {
    const uLower = user.username.toLowerCase();
    for (const s of serverSects.values()) {
      const m = (s.members || []).find(
        (x) => x.userId && x.userId === user.id || x.username && x.username.toLowerCase() === uLower
      );
      if (m) {
        sectId = s.id;
        sectName = s.name;
        sectTag = s.tag;
        sectRole = m.role;
        sectContribution = m.contribution || 0;
        sectBadgeIcon = s.badgeIcon || "\u{1F3F0}";
        sectSlogan = s.slogan || s.description || "";
        sectColor = s.bannerColor || "#f59e0b";
        sectLinhMach = s.linhMachLevel || 1;
        sectMemberCount = s.members?.length || 1;
        break;
      } else if (s.leaderName && s.leaderName.toLowerCase() === uLower) {
        sectId = s.id;
        sectName = s.name;
        sectTag = s.tag;
        sectRole = "chuong_mon";
        sectBadgeIcon = s.badgeIcon || "\u{1F3F0}";
        sectSlogan = s.slogan || s.description || "";
        sectColor = s.bannerColor || "#f59e0b";
        sectLinhMach = s.linhMachLevel || 1;
        sectMemberCount = s.members?.length || 1;
        break;
      }
    }
  }
  let isOnline = false;
  for (const session of activePresenceSessions.values()) {
    if (session.userId === user.id || session.username && session.username.toLowerCase() === clean) {
      isOnline = true;
      break;
    }
  }
  const modeRecords = {};
  if (serverLeaderboardData && serverLeaderboardData.highScores) {
    for (const [modeKey, recordItem] of Object.entries(serverLeaderboardData.highScores)) {
      const record = recordItem;
      if (record && (record.username?.toLowerCase() === clean || record.userId === user.id)) {
        modeRecords[modeKey] = {
          wpm: Number(record.wpm) || 0,
          accuracy: record.accuracy !== void 0 ? Number(record.accuracy) : 99,
          timestamp: Number(record.timestamp) || Date.now()
        };
      }
    }
  }
  res.json({
    success: true,
    profile: {
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar || "\u26A1",
      frame: user.frame || rMeta.frameId,
      isAdmin: !!user.isAdmin,
      isVerified: !!user.isVerified,
      totalGames: user.totalGames || 0,
      bestWpm: user.bestWpm || 0,
      bestWpmRecord: user.bestWpmRecord || null,
      showcaseAchievements: user.showcaseAchievements || [],
      unlockedAchievementsCount: user.unlockedAchievements?.length || 0,
      unlockedAchievements: user.unlockedAchievements || [],
      accuracy: user.accuracy !== void 0 ? user.accuracy : 98.6,
      consistency: user.consistency !== void 0 ? user.consistency : 94,
      modeRecords,
      keyboardSwitch: user.keyboardSwitch || "Cherry MX Blue Clicky",
      isOnline,
      cultivation: {
        level: Number(cult.level) || 1,
        realmIndex: rIdx,
        tier: Number(cult.tier) || 1,
        realmName: rMeta.name,
        realmIcon: rMeta.icon,
        titleName: rMeta.titleName,
        badge: rMeta.badge,
        subStage: getSubStageName(Number(cult.tier) || 1),
        exp: Number(cult.exp) || 0,
        maxExp: Number(cult.maxExp) || 500,
        thoNguyen: cult.thoNguyen !== void 0 ? Number(cult.thoNguyen) : 240,
        linhThach: Number(cult.linhThach) || 0,
        sect: sectName ? {
          sectId: sectId || "",
          sectName,
          sectTag: sectTag || "",
          role: sectRole || "noi_mon",
          contribution: sectContribution
        } : void 0
      },
      sectInfo: sectName ? {
        id: sectId || "",
        name: sectName,
        tag: sectTag || "",
        role: sectRole || "noi_mon",
        badgeIcon: sectBadgeIcon,
        slogan: sectSlogan,
        bannerColor: sectColor,
        linhMachLevel: sectLinhMach,
        memberCount: sectMemberCount
      } : null
    }
  });
});
function buildCultivationLeaderboardSnapshot() {
  const map = /* @__PURE__ */ new Map();
  for (const user of serverUsers.values()) {
    if (!user.username) continue;
    const cult = user.cultivation || {};
    const realmIndex = Math.max(0, Math.min(11, Number(cult.realmIndex) || 0));
    const tier = Math.max(1, Math.min(10, Number(cult.tier) || 1));
    const level = Math.max(1, Math.min(1e3, Number(cult.level) || 1));
    const exp = Math.max(0, Number(cult.exp) || 0);
    const maxExp = Math.max(1, Number(cult.maxExp) || 500);
    const rawTho = cult.thoNguyen !== void 0 ? Number(cult.thoNguyen) : 240;
    const thoNguyen = !isNaN(rawTho) && rawTho >= 0 ? rawTho : 240;
    const realmMeta = XIANXIA_REALM_METAS[realmIndex] || XIANXIA_REALM_METAS[0];
    let sectName = cult.sect?.sectName || cult.sect?.name || cult.sectName || void 0;
    let sectTag = cult.sect?.sectTag || cult.sect?.tag || cult.sectTag || void 0;
    let sectRole = cult.sect?.role || void 0;
    if (!sectName) {
      const uLower = (user.username || "").toLowerCase();
      for (const s of serverSects.values()) {
        const m = (s.members || []).find((x) => x.userId && x.userId === user.id || x.username && x.username.toLowerCase() === uLower);
        if (m) {
          sectName = s.name;
          sectTag = s.tag;
          sectRole = m.role;
          break;
        } else if (s.leaderName && s.leaderName.toLowerCase() === uLower) {
          sectName = s.name;
          sectTag = s.tag;
          sectRole = "chuong_mon";
          break;
        }
      }
    }
    map.set(user.username.toLowerCase(), {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar || "\u26A1",
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
      sectName,
      sectTag,
      sectRole
    });
  }
  const all = Array.from(map.values()).map((c) => {
    const score = c.realmIndex * 1e9 + c.tier * 1e7 + c.level * 1e5 + c.exp;
    return { ...c, score };
  });
  all.sort((a, b) => b.score - a.score);
  const rankedList = all.map((item, index) => {
    const { score, ...rest } = item;
    return {
      ...rest,
      rank: index + 1
    };
  });
  cachedCultivationRankedList = rankedList;
  cachedCultivationTop50 = rankedList.slice(0, 50);
  cachedTotalCultivators = rankedList.length;
  lastCultivationLeaderboardUpdate = Date.now();
  console.log(`[Leaderboard] C\u1EADp nh\u1EADt B\u1EA3ng V\xE0ng Top 50 Tu Vi chu k\u1EF3 1 gi\u1EDD/l\u1EA7n: ${cachedCultivationTop50.length} v\u1ECB \u0111\u1EA1i n\u0103ng`);
}
buildCultivationLeaderboardSnapshot();
setInterval(() => {
  try {
    buildCultivationLeaderboardSnapshot();
  } catch (err) {
    console.error("[Leaderboard] L\u1ED7i khi c\u1EADp nh\u1EADt b\u1EA3ng v\xE0ng tu vi chu k\u1EF3 1 gi\u1EDD:", err);
  }
}, CULTIVATION_LEADERBOARD_INTERVAL_MS);
syncUserCultivationToCache = function(user) {
  if (!user || !user.username || !user.cultivation) return;
  const cult = user.cultivation;
  const realmIndex = Math.max(0, Math.min(11, Number(cult.realmIndex) || 0));
  const tier = Math.max(1, Math.min(10, Number(cult.tier) || 1));
  const level = Math.max(1, Math.min(1e3, Number(cult.level) || 1));
  const exp = Math.max(0, Number(cult.exp) || 0);
  const maxExp = Math.max(1, Number(cult.maxExp) || 500);
  const rawTho = cult.thoNguyen !== void 0 ? Number(cult.thoNguyen) : 240;
  const thoNguyen = !isNaN(rawTho) && rawTho >= 0 ? rawTho : 240;
  const realmMeta = XIANXIA_REALM_METAS[realmIndex] || XIANXIA_REALM_METAS[0];
  let sectName = cult.sect?.sectName || cult.sect?.name || cult.sectName || void 0;
  let sectTag = cult.sect?.sectTag || cult.sect?.tag || cult.sectTag || void 0;
  let sectRole = cult.sect?.role || void 0;
  const uLower = String(user.username || "").toLowerCase();
  if (!sectName) {
    for (const s of serverSects.values()) {
      const m = (s.members || []).find((x) => x.userId && x.userId === user.id || x.username && x.username.toLowerCase() === uLower);
      if (m) {
        sectName = s.name;
        sectTag = s.tag;
        sectRole = m.role;
        break;
      } else if (s.leaderName && s.leaderName.toLowerCase() === uLower) {
        sectName = s.name;
        sectTag = s.tag;
        sectRole = "chuong_mon";
        break;
      }
    }
  }
  const existingIndex = cachedCultivationRankedList.findIndex((item) => (item.username || "").toLowerCase() === uLower);
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
      sectName,
      sectTag,
      sectRole
    };
  }
  const topIndex = cachedCultivationTop50.findIndex((item) => (item.username || "").toLowerCase() === uLower);
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
      sectName,
      sectTag,
      sectRole
    };
  }
};
app.post("/api/cultivation", (req, res) => {
  const authHeader = req.headers.authorization;
  let user = getUserByToken(authHeader);
  if (!user && req.body.userId) {
    user = serverUsers.get(String(req.body.userId)) || null;
  }
  if (!user && req.body.username) {
    user = getUserByUsername(String(req.body.username));
  }
  if (!user) {
    res.status(401).json({ success: false, error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp ho\u1EB7c kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n." });
    return;
  }
  if (req.body.cultivation && typeof req.body.cultivation === "object") {
    user.cultivation = req.body.cultivation;
    user.updatedAt = Date.now();
    serverUsers.set(user.id, user);
    saveUsersToFile();
    syncUserCultivationToCache(user);
  }
  res.json({
    success: true,
    cultivation: user.cultivation
  });
});
var FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1e3;
var ONE_DAY_MS = 24 * 60 * 60 * 1e3;
setInterval(() => {
  const now = Date.now();
  let hasChanges = false;
  for (const [userId, user] of serverUsers.entries()) {
    if (!user.cultivation) continue;
    const cult = user.cultivation;
    let userChanged = false;
    if ((cult.realmIndex ?? 0) < 11) {
      const lastDecay = cult.lastThoNguyenDecay || now;
      const elapsed = now - lastDecay;
      const units = Math.floor(elapsed / TWO_HOURS_MS);
      if (units > 0) {
        cult.thoNguyen = Math.max(0, (cult.thoNguyen ?? 240) - units);
        cult.lastThoNguyenDecay = lastDecay + units * TWO_HOURS_MS;
        userChanged = true;
        if (cult.thoNguyen <= 0) {
          const oldRealmIdx = cult.realmIndex ?? 0;
          const targetRealmIdx = Math.max(0, oldRealmIdx - 2);
          cult.realmIndex = targetRealmIdx;
          cult.tier = 1;
          cult.exp = 0;
          cult.thoNguyen = 240;
          if (!cult.historyLog) cult.historyLog = [];
          cult.historyLog.unshift(`\u26A0\uFE0F [T\u1ECCA H\xD3A LU\xC2N H\u1ED2I] Th\u1ECD nguy\xEAn c\u1EA1n ki\u1EC7t! R\u01A1i v\xE0o lu\xE2n h\u1ED3i v\u1EC1 c\u1EA3nh gi\u1EDBi th\u1EE9 ${targetRealmIdx + 1} T\u1EA7ng 1.`);
          if (cult.historyLog.length > 20) cult.historyLog.pop();
        }
      }
    }
    const lastActive = cult.lastCultivateTime || user.updatedAt || now;
    const inactiveElapsed = now - lastActive;
    if (inactiveElapsed > FORTY_EIGHT_HOURS_MS && (cult.exp ?? 0) > 0) {
      const overdueDays = Math.floor((inactiveElapsed - FORTY_EIGHT_HOURS_MS) / ONE_DAY_MS) + 1;
      const decayPercent = Math.min(30, overdueDays * 3);
      const maxExp = cult.maxExp || 500;
      const expLost = Math.round(maxExp * decayPercent / 100);
      if (expLost > 0 && cult.exp > 0) {
        const oldExp = cult.exp;
        cult.exp = Math.max(0, cult.exp - expLost);
        if (oldExp !== cult.exp) {
          userChanged = true;
          if (!cult.historyLog) cult.historyLog = [];
          cult.historyLog.unshift(`\u{1F480} [T\xC2M MA X\xC2M L\u1EA4N] Kh\xF4ng tu luy\u1EC7n qu\xE1 48h, t\u1ED5n th\u1EA5t ${oldExp - cult.exp} Tu Vi!`);
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
}, 6e4);
app.get("/api/health", async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.json({
    status: dbHealth.connected ? "ok" : "degraded",
    database: dbHealth,
    activeRooms: rooms.size,
    registeredUsers: serverUsers.size,
    serverless: Boolean(process.env.VERCEL),
    timestamp: Date.now()
  });
});
app.get(["/api/db-health", "/api/healthcheck"], async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const isHealthy = dbHealth.connected;
  const responsePayload = {
    status: isHealthy ? "healthy" : dbHealth.configured ? "unhealthy" : "unconfigured",
    database: {
      ...dbHealth,
      provider: dbHealth.configured ? "supabase_postgresql" : "local_json_storage",
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
      serverless: Boolean(process.env.VERCEL)
    },
    message: isHealthy ? "K\u1EBFt n\u1ED1i Supabase PostgreSQL ho\u1EA1t \u0111\u1ED9ng \u1ED5n \u0111\u1ECBnh v\xE0 s\u1EB5n s\xE0ng." : dbHealth.configured ? `L\u1ED7i k\u1EBFt n\u1ED1i Supabase: ${dbHealth.error || "Kh\xF4ng th\u1EC3 truy v\u1EA5n CSDL"}` : "Ch\u01B0a c\u1EA5u h\xECnh DATABASE_URL. \u0110ang d\xF9ng b\u1ED9 nh\u1EDB c\u1EE5c b\u1ED9.",
    timestamp: Date.now()
  };
  res.status(isHealthy ? 200 : dbHealth.configured ? 503 : 200).json(responsePayload);
});
app.get("/api/rooms", async (_req, res) => {
  cleanupInactiveRooms();
  if (isDatabaseConfigured()) {
    try {
      const activeRooms = await dbLoadActiveRooms();
      if (activeRooms && activeRooms.length > 0) {
        for (const r of activeRooms) {
          if (r && r.id && !rooms.has(normalizeRoomCode(r.id))) {
            rooms.set(normalizeRoomCode(r.id), r);
          }
        }
      }
    } catch {
    }
  }
  const list = Array.from(rooms.values()).filter(
    (r) => r.status !== "finished" && r.players.length > 0
  );
  res.json({ success: true, rooms: list });
});
app.get("/api/rooms/:id", async (req, res) => {
  const norm = normalizeRoomCode(req.params.id);
  let room = rooms.get(norm);
  if (!room && isDatabaseConfigured()) {
    try {
      room = await dbLoadRoom(norm);
      if (room) {
        rooms.set(norm, room);
      }
    } catch {
    }
  }
  if (!room) {
    res.status(404).json({ success: false, error: "Ph\xF2ng kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 k\u1EBFt th\xFAc" });
    return;
  }
  room.lastActive = Date.now();
  res.json({ success: true, room });
});
app.post("/api/rooms", (req, res) => {
  const { mode, host, isQuickRoom = false, difficulty } = req.body;
  if (!mode || !host) {
    res.status(400).json({ success: false, error: "Thi\u1EBFu th\xF4ng tin ng\u01B0\u1EDDi ch\u01A1i ho\u1EB7c ch\u1EBF \u0111\u1ED9 ch\u01A1i." });
    return;
  }
  const hostBan = checkIsBanned(host.username || host.id);
  if (hostBan.isBanned) {
    res.status(403).json({
      success: false,
      error: `T\xE0i kho\u1EA3n \u0111ang ch\u1ECBu \xE1n ph\u1EA1t t\u1EEB B\xE0n C\u1ED5 Th\u1EA7n Th\u1EE9c (C\u1EA5m thi \u0111\u1EA5u 2 gi\u1EDD). Th\u1EDDi gian th\u1EE5 \xE1n c\xF2n l\u1EA1i: ${hostBan.remainingMinutes} ph\xFAt!`
    });
    return;
  }
  const code = generateUniqueRoomCode();
  const hostPlayer = {
    ...host,
    isBot: false,
    progress: 0,
    wpm: 0,
    score: 0,
    errors: 0,
    correctChars: 0,
    isFinished: false,
    isSurrendered: false,
    isAFK: false
  };
  const newRoom = {
    id: code,
    mode,
    hostId: host.id,
    hostName: host.username,
    isQuickRoom: Boolean(isQuickRoom),
    status: "waiting",
    createdAt: Date.now(),
    lastActive: Date.now(),
    players: [hostPlayer],
    difficulty: difficulty || (mode === "numpad" ? "number" : "normal"),
    maxSlots: 8
  };
  rooms.set(code, newRoom);
  if (isDatabaseConfigured()) {
    dbSaveRoom(newRoom).catch(() => {
    });
  }
  broadcastToRoom(code, { type: "room_updated", room: newRoom });
  res.json({ success: true, room: newRoom, isHost: true });
});
app.post("/api/rooms/join", async (req, res) => {
  const { rawCode, player, currentMode } = req.body;
  if (!rawCode || !player) {
    res.status(400).json({ success: false, error: "Vui l\xF2ng nh\u1EADp m\xE3 ph\xF2ng h\u1EE3p l\u1EC7." });
    return;
  }
  const playerBan = checkIsBanned(player.username || player.id);
  if (playerBan.isBanned) {
    res.status(403).json({
      success: false,
      error: `T\xE0i kho\u1EA3n \u0111ang ch\u1ECBu \xE1n ph\u1EA1t t\u1EEB B\xE0n C\u1ED5 Th\u1EA7n Th\u1EE9c (C\u1EA5m thi \u0111\u1EA5u 2 gi\u1EDD). Th\u1EDDi gian th\u1EE5 \xE1n c\xF2n l\u1EA1i: ${playerBan.remainingMinutes} ph\xFAt!`
    });
    return;
  }
  const normCode = normalizeRoomCode(rawCode);
  let room = rooms.get(normCode);
  if (!room && isDatabaseConfigured()) {
    try {
      room = await dbLoadRoom(normCode);
      if (room) {
        rooms.set(normCode, room);
      }
    } catch {
    }
  }
  if (!room) {
    res.json({
      success: false,
      error: `Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng v\u1EDBi m\xE3 "${normCode}". Vui l\xF2ng ki\u1EC3m tra l\u1EA1i m\xE3 ph\xF2ng (ch\u1EE7 ph\xF2ng c\xF3 th\u1EC3 \u0111\xE3 r\u1EDDi ho\u1EB7c \u0111\xF3ng ph\xF2ng)!`
    });
    return;
  }
  if (room.mode !== currentMode) {
    res.json({
      success: false,
      error: `M\xE3 ph\xF2ng ${room.id} thu\u1ED9c ch\u1EBF \u0111\u1ED9 "${getModeDisplayName(
        room.mode
      )}", kh\xE1c v\u1EDBi ch\u1EBF \u0111\u1ED9 "${getModeDisplayName(
        currentMode
      )}" b\u1EA1n \u0111ang ch\u1ECDn. Vui l\xF2ng chuy\u1EC3n sang ch\u1EBF \u0111\u1ED9 "${getModeDisplayName(
        room.mode
      )}" \u0111\u1EC3 c\xF9ng tham gia thi \u0111\u1EA5u!`
    });
    return;
  }
  if (room.status === "playing") {
    res.json({
      success: false,
      error: `Ph\xF2ng ${room.id} hi\u1EC7n \u0111ang trong tr\u1EADn \u0111\u1EA5u. Kh\xF4ng th\u1EC3 tham gia l\xFAc n\xE0y!`
    });
    return;
  }
  if (room.status === "finished") {
    res.json({
      success: false,
      error: `Ph\xF2ng ${room.id} \u0111\xE3 k\u1EBFt th\xFAc. Vui l\xF2ng t\u1EA1o ph\xF2ng m\u1EDBi ho\u1EB7c v\xE0o ph\xF2ng kh\xE1c!`
    });
    return;
  }
  const existingIndex = room.players.findIndex((p) => p.id === player.id);
  if (existingIndex === -1 && room.players.length >= room.maxSlots) {
    res.json({
      success: false,
      error: `Ph\xF2ng ${room.id} \u0111\xE3 \u0111\u1EE7 s\u1ED1 l\u01B0\u1EE3ng (${room.players.length}/${room.maxSlots} ng\u01B0\u1EDDi ch\u01A1i). Kh\xF4ng th\u1EC3 tham gia th\xEAm!`
    });
    return;
  }
  const isDuplicateName = room.players.some(
    (p) => p.id !== player.id && p.username.trim().toLowerCase() === String(player.username || "").trim().toLowerCase()
  );
  if (isDuplicateName) {
    res.json({
      success: false,
      error: `Bi\u1EC7t danh "${player.username}" \u0111\xE3 c\xF3 ng\u01B0\u1EDDi s\u1EED d\u1EE5ng trong ph\xF2ng n\xE0y. Vui l\xF2ng \u0111\u1ED5i bi\u1EC7t danh kh\xE1c!`
    });
    return;
  }
  const guestPlayer = {
    ...player,
    isBot: Boolean(player.isBot),
    progress: 0,
    wpm: 0,
    score: 0,
    errors: 0,
    correctChars: 0,
    isFinished: false,
    isSurrendered: false,
    isAFK: false
  };
  if (existingIndex >= 0) {
    room.players[existingIndex] = {
      ...room.players[existingIndex],
      ...guestPlayer
    };
  } else {
    room.players.push(guestPlayer);
  }
  room.lastActive = Date.now();
  rooms.set(normCode, room);
  broadcastToRoom(normCode, { type: "room_updated", room });
  res.json({
    success: true,
    room,
    isHost: room.hostId === player.id
  });
});
app.post("/api/rooms/quick-join", (req, res) => {
  const { mode, player, difficulty } = req.body;
  if (!mode || !player) {
    res.status(400).json({ success: false, error: "Thi\u1EBFu th\xF4ng tin ng\u01B0\u1EDDi ch\u01A1i ho\u1EB7c ch\u1EBF \u0111\u1ED9." });
    return;
  }
  const playerBan = checkIsBanned(player.username || player.id);
  if (playerBan.isBanned) {
    res.status(403).json({
      success: false,
      error: `T\xE0i kho\u1EA3n \u0111ang ch\u1ECBu \xE1n ph\u1EA1t t\u1EEB B\xE0n C\u1ED5 Th\u1EA7n Th\u1EE9c (C\u1EA5m thi \u0111\u1EA5u 2 gi\u1EDD). Th\u1EDDi gian th\u1EE5 \xE1n c\xF2n l\u1EA1i: ${playerBan.remainingMinutes} ph\xFAt!`
    });
    return;
  }
  cleanupInactiveRooms();
  const now = Date.now();
  const candidateRooms = Array.from(rooms.values()).filter((r) => {
    return r.mode === mode && r.isQuickRoom === true && r.status === "waiting" && r.players.length < r.maxSlots && r.players.some((p) => !p.isBot) && now - (r.lastActive || r.createdAt) < 15 * 60 * 1e3;
  }).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  if (candidateRooms.length > 0) {
    const matchedRoom = candidateRooms[0];
    const existingIdx = matchedRoom.players.findIndex((p) => p.id === player.id);
    const freshPlayer = {
      ...player,
      isBot: false,
      progress: 0,
      wpm: 0,
      score: 0,
      errors: 0,
      correctChars: 0,
      isFinished: false,
      isSurrendered: false,
      isAFK: false
    };
    if (existingIdx >= 0) {
      matchedRoom.players[existingIdx] = {
        ...matchedRoom.players[existingIdx],
        ...freshPlayer
      };
    } else {
      matchedRoom.players.push(freshPlayer);
    }
    matchedRoom.lastActive = now;
    rooms.set(matchedRoom.id, matchedRoom);
    broadcastToRoom(matchedRoom.id, { type: "room_updated", room: matchedRoom });
    res.json({
      success: true,
      room: matchedRoom,
      isHost: matchedRoom.hostId === player.id,
      isNewlyCreated: false
    });
    return;
  }
  const code = generateUniqueRoomCode();
  const hostPlayer = {
    ...player,
    isBot: false,
    progress: 0,
    wpm: 0,
    score: 0,
    errors: 0,
    correctChars: 0,
    isFinished: false,
    isSurrendered: false,
    isAFK: false
  };
  const newQuickRoom = {
    id: code,
    mode,
    hostId: player.id,
    hostName: player.username,
    isQuickRoom: true,
    status: "waiting",
    createdAt: now,
    lastActive: now,
    players: [hostPlayer],
    difficulty: difficulty || (mode === "numpad" ? "number" : "normal"),
    maxSlots: 8
  };
  rooms.set(code, newQuickRoom);
  broadcastToRoom(code, { type: "room_updated", room: newQuickRoom });
  res.json({
    success: true,
    room: newQuickRoom,
    isHost: true,
    isNewlyCreated: true
  });
});
app.post("/api/rooms/:id/players", (req, res) => {
  const norm = normalizeRoomCode(req.params.id);
  const room = rooms.get(norm);
  if (!room) {
    res.status(404).json({ success: false, error: "Room not found" });
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
      broadcastToRoom(norm, { type: "room_closed", roomId: norm });
      res.json({ success: true, message: "Ph\xF2ng \u0111\xE3 t\u1EF1 \u0111\u1ED9ng gi\u1EA3i t\xE1n do kh\xF4ng c\xF2n ng\u01B0\u1EDDi ch\u01A1i th\u1EF1c" });
      return;
    }
    room.players = players;
    room.lastActive = Date.now();
    rooms.set(norm, room);
    broadcastToRoom(norm, { type: "room_updated", room });
  }
  res.json({ success: true, room });
});
app.post("/api/rooms/:id/transfer-host", (req, res) => {
  const norm = normalizeRoomCode(req.params.id);
  const room = rooms.get(norm);
  if (!room) {
    res.status(404).json({ success: false, error: "Room not found" });
    return;
  }
  const { targetPlayerId, requesterId } = req.body;
  if (room.hostId !== requesterId) {
    res.status(403).json({ success: false, error: "Ch\u1EC9 ch\u1EE7 ph\xF2ng m\u1EDBi c\xF3 quy\u1EC1n chuy\u1EC3n nh\u01B0\u1EE3ng ch\u1EE7 ph\xF2ng" });
    return;
  }
  const targetIdx = room.players.findIndex((p) => p.id === targetPlayerId);
  if (targetIdx === -1) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi ch\u01A1i \u0111\u01B0\u1EE3c ch\u1ECDn" });
    return;
  }
  const targetPlayer = room.players[targetIdx];
  if (targetPlayer.isBot) {
    res.status(400).json({ success: false, error: "Kh\xF4ng th\u1EC3 nh\u01B0\u1EDDng ch\u1EE7 ph\xF2ng cho Bot" });
    return;
  }
  const hostIdx = room.players.findIndex((p) => p.id === room.hostId);
  const effectiveHostIdx = hostIdx !== -1 ? hostIdx : 0;
  const oldHostPlayer = room.players[effectiveHostIdx];
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
    type: "host_transferred",
    oldHostId: requesterId,
    newHostId: targetPlayer.id,
    newHostName: targetPlayer.username,
    room
  });
  broadcastToRoom(norm, { type: "room_updated", room });
  res.json({ success: true, room });
});
app.post("/api/rooms/:id/kick", (req, res) => {
  const norm = normalizeRoomCode(req.params.id);
  const room = rooms.get(norm);
  if (!room) {
    res.status(404).json({ success: false, error: "Room not found" });
    return;
  }
  const { targetPlayerId, requesterId } = req.body;
  if (room.hostId !== requesterId) {
    res.status(403).json({ success: false, error: "Ch\u1EC9 ch\u1EE7 ph\xF2ng m\u1EDBi c\xF3 quy\u1EC1n m\u1EDDi ng\u01B0\u1EDDi ch\u01A1i r\u1EDDi ph\xF2ng" });
    return;
  }
  if (targetPlayerId === room.hostId) {
    res.status(400).json({ success: false, error: "Ch\u1EE7 ph\xF2ng kh\xF4ng th\u1EC3 t\u1EF1 \u0111\xE1 ch\xEDnh m\xECnh" });
    return;
  }
  const targetPlayer = room.players.find((p) => p.id === targetPlayerId);
  if (!targetPlayer) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi ch\u01A1i" });
    return;
  }
  room.players = room.players.filter((p) => p.id !== targetPlayerId);
  const humanPlayers = room.players.filter((p) => !p.isBot);
  if (humanPlayers.length === 0) {
    stopRoomBots(norm, false);
    rooms.delete(norm);
    sseClientsByRoom.delete(norm);
    roomChatMessages.delete(norm);
    broadcastToRoom(norm, { type: "room_closed", roomId: norm });
    res.json({ success: true, roomClosed: true });
    return;
  }
  room.lastActive = Date.now();
  rooms.set(norm, room);
  if (!targetPlayer.isBot) {
    broadcastToRoom(norm, {
      type: "player_kicked",
      roomId: norm,
      playerId: targetPlayerId,
      username: targetPlayer.username
    });
  }
  broadcastToRoom(norm, { type: "room_updated", room });
  res.json({ success: true, room });
});
app.post("/api/rooms/:id/difficulty", (req, res) => {
  const norm = normalizeRoomCode(req.params.id);
  const room = rooms.get(norm);
  if (!room) {
    res.status(404).json({ success: false, error: "Room not found" });
    return;
  }
  const { difficulty } = req.body;
  if (difficulty) {
    room.difficulty = difficulty;
    room.lastActive = Date.now();
    rooms.set(norm, room);
    broadcastToRoom(norm, { type: "room_updated", room });
  }
  res.json({ success: true, room });
});
app.post("/api/rooms/:id/mode", (req, res) => {
  const norm = normalizeRoomCode(req.params.id);
  const room = rooms.get(norm);
  if (!room) {
    res.status(404).json({ success: false, error: "Room not found" });
    return;
  }
  const { mode, difficulty } = req.body;
  if (mode) {
    room.mode = mode;
    if (difficulty) {
      room.difficulty = difficulty;
    } else {
      room.difficulty = mode === "numpad" ? "number" : "normal";
    }
    room.lastActive = Date.now();
    rooms.set(norm, room);
    broadcastToRoom(norm, { type: "room_updated", room });
  }
  res.json({ success: true, room });
});
app.post("/api/rooms/:id/status", (req, res) => {
  const norm = normalizeRoomCode(req.params.id);
  const room = rooms.get(norm);
  if (!room) {
    res.status(404).json({ success: false, error: "Room not found" });
    return;
  }
  const humanPlayers = room.players.filter((p) => !p.isBot);
  if (humanPlayers.length === 0) {
    stopRoomBots(norm, false);
    rooms.delete(norm);
    sseClientsByRoom.delete(norm);
    roomChatMessages.delete(norm);
    broadcastToRoom(norm, { type: "room_closed", roomId: norm });
    res.status(404).json({ success: false, error: "Ph\xF2ng kh\xF4ng c\xF2n ng\u01B0\u1EDDi ch\u01A1i th\u1EF1c" });
    return;
  }
  const { status, mode, words, mysteryWords, matchId, difficulty } = req.body;
  room.status = status;
  room.lastActive = Date.now();
  if (words) room.words = words;
  if (mysteryWords) room.mysteryWords = mysteryWords;
  if (mode) room.mode = mode;
  if (difficulty) room.difficulty = difficulty;
  if (status === "playing") {
    room.matchId = matchId || "match_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
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
  } else if (status === "waiting") {
    stopRoomBots(norm, true);
    room.players.forEach((p) => {
      p.inMatch = false;
      p.isSurrendered = false;
      p.isFinished = false;
      p.progress = 0;
      p.wpm = 0;
      p.correctChars = 0;
      p.errors = 0;
    });
  } else if (status === "finished") {
    stopRoomBots(norm, true);
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
  if (status === "playing") {
    broadcastToRoom(norm, {
      type: "room_started",
      roomId: norm,
      matchId: room.matchId,
      mode: room.mode,
      words: room.words,
      mysteryWords: room.mysteryWords,
      room
    });
  } else {
    broadcastToRoom(norm, { type: "room_updated", room });
  }
  res.json({ success: true, room });
});
app.post("/api/rooms/:id/player-status", (req, res) => {
  const norm = normalizeRoomCode(req.params.id);
  const room = rooms.get(norm);
  if (!room) {
    res.status(404).json({ success: false, error: "Room not found" });
    return;
  }
  const humanPlayers = room.players.filter((p) => !p.isBot);
  if (humanPlayers.length === 0) {
    stopRoomBots(norm, false);
    rooms.delete(norm);
    sseClientsByRoom.delete(norm);
    roomChatMessages.delete(norm);
    broadcastToRoom(norm, { type: "room_closed", roomId: norm });
    res.status(404).json({ success: false, error: "Ph\xF2ng kh\xF4ng c\xF2n ng\u01B0\u1EDDi ch\u01A1i th\u1EF1c" });
    return;
  }
  const { playerId, inMatch, isSurrendered, isFinished, isAFK } = req.body;
  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    if (typeof inMatch === "boolean") player.inMatch = inMatch;
    if (typeof isSurrendered === "boolean") player.isSurrendered = isSurrendered;
    if (typeof isFinished === "boolean") player.isFinished = isFinished;
    if (typeof isAFK === "boolean") player.isAFK = isAFK;
    if (room.status === "playing") {
      const activeHumanPlayers = humanPlayers.filter(
        (p) => !p.isSurrendered && !p.isFinished && p.inMatch !== false && !p.isAFK
      );
      if (activeHumanPlayers.length === 0) {
        room.status = "finished";
        stopRoomBots(norm, true);
      }
    }
    if (humanPlayers.length > 0 && humanPlayers.every((p) => !p.inMatch)) {
      room.status = "waiting";
      stopRoomBots(norm, true);
    }
    room.lastActive = Date.now();
    rooms.set(norm, room);
    broadcastToRoom(norm, { type: "room_updated", room });
  }
  res.json({ success: true, room });
});
app.post("/api/rooms/:id/player-progress", (req, res) => {
  const norm = normalizeRoomCode(req.params.id);
  const room = rooms.get(norm);
  if (!room) {
    res.status(404).json({ success: false, error: "Room not found" });
    return;
  }
  const { playerId, progress, correctChars, errors, wpm, isFinished } = req.body;
  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.progress = progress;
    player.correctChars = correctChars;
    player.errors = errors;
    player.wpm = wpm;
    if (typeof isFinished === "boolean") {
      player.isFinished = isFinished;
      if (isFinished && room.status === "playing") {
        const humanPlayers = room.players.filter((p) => !p.isBot);
        const activeHumans = humanPlayers.filter(
          (p) => !p.isSurrendered && !p.isFinished && p.inMatch !== false
        );
        if (activeHumans.length === 0) {
          room.status = "finished";
          stopRoomBots(norm, true);
          broadcastToRoom(norm, { type: "room_updated", room });
        }
      }
    }
    room.lastActive = Date.now();
    broadcastToRoom(norm, {
      type: "player_progress",
      roomId: norm,
      playerId,
      progress,
      correctChars,
      errors,
      wpm,
      isFinished: player.isFinished,
      status: room.status,
      players: room.players
    });
  }
  res.json({ success: true });
});
app.post("/api/rooms/:id/leave", (req, res) => {
  const norm = normalizeRoomCode(req.params.id);
  const room = rooms.get(norm);
  if (!room) {
    res.json({ success: true });
    return;
  }
  const { playerId, isUnload } = req.body;
  if (isUnload) {
    room.lastActive = Date.now();
    res.json({ success: true, pendingGrace: true });
    return;
  }
  const wasHost = room.hostId === playerId;
  room.players = room.players.filter((p) => p.id !== playerId);
  const humanPlayers = room.players.filter((p) => !p.isBot);
  if (humanPlayers.length === 0 && !room.isWorldRoom) {
    stopRoomBots(norm, false);
    rooms.delete(norm);
    sseClientsByRoom.delete(norm);
    roomChatMessages.delete(norm);
    broadcastToRoom(norm, { type: "room_closed", roomId: norm });
  } else {
    if (wasHost) {
      const nextHost = humanPlayers[0];
      room.hostId = nextHost.id;
      room.hostName = nextHost.username;
    }
    if (room.status === "playing") {
      const activeHumanPlayers = humanPlayers.filter(
        (p) => !p.isSurrendered && !p.isFinished && p.inMatch !== false
      );
      if (activeHumanPlayers.length === 0) {
        room.status = "finished";
        stopRoomBots(norm, true);
      }
    }
    if (humanPlayers.length > 0 && humanPlayers.every((p) => !p.inMatch)) {
      room.status = "waiting";
      stopRoomBots(norm, true);
    }
    room.lastActive = Date.now();
    rooms.set(norm, room);
    broadcastToRoom(norm, { type: "room_updated", room });
  }
  res.json({ success: true, room });
});
app.get("/api/rooms/:id/stream", (req, res) => {
  const norm = normalizeRoomCode(req.params.id);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  let clientSet = sseClientsByRoom.get(norm);
  if (!clientSet) {
    clientSet = /* @__PURE__ */ new Set();
    sseClientsByRoom.set(norm, clientSet);
  }
  clientSet.add(res);
  const room = rooms.get(norm);
  if (room) {
    res.write(`data: ${JSON.stringify({ type: "room_updated", room })}

`);
    const existingMsgs = roomChatMessages.get(norm) || [];
    if (existingMsgs.length > 0) {
      res.write(`data: ${JSON.stringify({ type: "init_room_chat", roomId: norm, messages: existingMsgs })}

`);
    }
  }
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 15e3);
  req.on("close", () => {
    clearInterval(heartbeat);
    clientSet?.delete(res);
    if (clientSet && clientSet.size === 0) {
      sseClientsByRoom.delete(norm);
    }
  });
});
app.get("/api/chat/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  const tabId = String(req.query.tabId || "").trim();
  const userId = String(req.query.userId || "").trim();
  const username = String(req.query.username || "").trim();
  sseGlobalChatClients.add(res);
  sseClientMeta.set(res, { userId, username, tabId });
  if (tabId) {
    sseGlobalClients.set(res, tabId);
    const meta = extractSessionMetaFromReq(req);
    registerPresence(tabId, userId, meta);
  }
  res.write(`data: ${JSON.stringify({ type: "init_chat", messages: globalChatMessages.slice(-50) })}

`);
  res.write(`data: ${JSON.stringify({ type: "online_count", count: getRealOnlineCount() })}

`);
  res.write(`data: ${JSON.stringify({ type: "leaderboard_updated", highScores: serverHighScores })}

`);
  if (userId || username) {
    const cleanId = (userId || "").toLowerCase();
    const cleanName = (username || "").toLowerCase();
    const pendingCount = Array.from(serverFriendRequests.values()).filter(
      (r) => cleanId && r.toUserId && r.toUserId.toLowerCase() === cleanId || cleanName && r.toUsername && r.toUsername.toLowerCase() === cleanName || cleanName && r.toUserId && r.toUserId.toLowerCase() === cleanName
    ).length;
    res.write(`data: ${JSON.stringify({ type: "friend_requests_count", count: pendingCount })}

`);
  }
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 15e3);
  req.on("close", () => {
    clearInterval(heartbeat);
    sseGlobalChatClients.delete(res);
    sseGlobalClients.delete(res);
    sseClientMeta.delete(res);
    if (tabId) {
      removePresence(tabId);
    }
  });
});
app.get("/api/chat/messages", (req, res) => {
  const channel = String(req.query.channel || "global").trim();
  const roomId = req.query.roomId ? normalizeRoomCode(String(req.query.roomId)) : "";
  const sectId = String(req.query.sectId || "").trim();
  const currentUserId = String(req.query.currentUserId || "").trim();
  const targetUserId = String(req.query.targetUserId || "").trim();
  if (channel === "room" && roomId) {
    const msgs = roomChatMessages.get(roomId) || [];
    res.json({ success: true, messages: msgs });
    return;
  }
  if (channel === "sect" && sectId) {
    const msgs = sectChatMessages.get(sectId) || [];
    res.json({ success: true, messages: msgs });
    return;
  }
  if (channel === "whisper" && currentUserId && targetUserId) {
    const key = getWhisperKey(currentUserId, targetUserId);
    const msgs = whisperChatMessages.get(key) || [];
    res.json({ success: true, messages: msgs });
    return;
  }
  res.json({ success: true, messages: globalChatMessages });
});
app.post("/api/chat/messages", (req, res) => {
  let {
    username,
    avatar,
    frame,
    message,
    channel = "global",
    roomId,
    sectId,
    whisperTarget,
    whisperTargetUserId,
    senderUserId,
    senderRealm,
    senderRealmIcon,
    senderSectTag,
    cardType,
    cardData,
    isAdmin,
    isDaoBot,
    daoEventType,
    daoTitle
  } = req.body;
  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ success: false, error: "Tin nh\u1EAFn kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng" });
    return;
  }
  let targetChannel = ["global", "sect", "room", "whisper"].includes(channel) ? channel : "global";
  const normRoomId = roomId ? normalizeRoomCode(String(roomId)) : void 0;
  const msgId = typeof req.body.id === "string" && req.body.id.trim() ? req.body.id.trim() : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const isBotName = username === "Huy\u1EC1n Thi\xEAn Kh\xED Linh" || username === "Linh Lung Ti\xEAn \u0110\u1ED3ng" || username === "B\xE0n C\u1ED5 Th\u1EA7n Th\u1EE9c";
  const finalUsername = isDaoBot ? username && isBotName ? username : username || "Huy\u1EC1n Thi\xEAn Kh\xED Linh" : String(username || "V\xF4 Danh").trim().slice(0, 30);
  if (!isDaoBot && !isBotName) {
    const userBan = checkIsBanned(finalUsername);
    if (userBan.isBanned) {
      res.status(403).json({
        success: false,
        error: `\u0110\u1EA1o h\u1EEFu \u0111ang ch\u1ECBu \xE1n ph\u1EA1t t\u1EEB B\xE0n C\u1ED5 Th\u1EA7n Th\u1EE9c (C\u1EA5m t\xFAc U Minh H\xE0n Ng\u1EE5c c\xF2n ${userBan.remainingMinutes} ph\xFAt), t\u1EA1m th\u1EDDi kh\xF4ng th\u1EC3 ph\xE1t ng\xF4n!`
      });
      return;
    }
  }
  const senderUser = senderUserId ? serverUsers.get(senderUserId) : getUserByUsername(finalUsername);
  if (senderUser) {
    if (!senderUserId) senderUserId = senderUser.id;
    if (!senderRealm && senderUser.cultivation) {
      const rMeta = XIANXIA_REALM_METAS[senderUser.cultivation.realmIndex || 0];
      senderRealm = rMeta?.name;
      senderRealmIcon = rMeta?.icon;
    }
    if (!senderSectTag && senderUser.cultivation?.sectTag) {
      senderSectTag = senderUser.cultivation.sectTag;
    }
  }
  const rawText = message.trim();
  if (rawText.startsWith("/roll")) {
    const topic = rawText.replace(/^\/roll\s*/i, "").trim() || "L\u1EAFc x\xED ng\u1EA7u \u0111\u1ED9 duy\xEAn";
    const rollVal = Math.floor(Math.random() * 100) + 1;
    cardType = "roll_result";
    cardData = {
      rollNumber: rollVal,
      rollTopic: topic
    };
    message = `\u{1F3B2} [\u0110\u1ED9 Duy\xEAn]: ${finalUsername} l\u1EAFc \u0111\u01B0\u1EE3c ${rollVal} \u0111i\u1EC3m! (${topic})`;
  } else if (rawText.startsWith("/w ") || rawText.startsWith("/whisper ")) {
    const parts = rawText.split(" ");
    if (parts.length >= 3) {
      whisperTarget = parts[1].replace(/^@/, "");
      message = parts.slice(2).join(" ");
      targetChannel = "whisper";
      const targetU = getUserByUsername(whisperTarget);
      if (targetU) whisperTargetUserId = targetU.id;
    }
  } else if (rawText.startsWith("/phapbao")) {
    cardType = "item_share";
    const artName = senderUser?.cultivation?.artifacts?.equipped || "Tru Ti\xEAn C\u1ED5 Ki\u1EBFm";
    cardData = {
      itemType: "artifact",
      itemName: artName,
      itemIcon: "\u2694\uFE0F",
      itemQuality: "Th\u1EA7n Ph\u1EA9m Ch\xED B\u1EA3o",
      itemDescription: "Kh\xED t\u1EE9c ng\u1EADp tr\xE0n thi\xEAn \u0111\u1ECBa, ch\u1EA5n nhi\u1EBFp b\xE1t hoang y\xEAu ma."
    };
    message = `\u2694\uFE0F ${finalUsername} khoe ph\xE1p b\u1EA3o: [${artName}]!`;
  } else if (rawText.startsWith("/dan")) {
    cardType = "item_share";
    cardData = {
      itemType: "pill",
      itemName: "H\xF3a Th\u1EA7n C\u1EEDu Chuy\u1EC3n \u0110an",
      itemIcon: "\u{1F52E}",
      itemQuality: "C\u1EF1c Ph\u1EA9m Linh \u0110an",
      itemDescription: "H\u1ED7 tr\u1EE3 ng\u01B0ng t\u1EE5 nguy\xEAn th\u1EA7n, b\u1EE9t ph\xE1 b\xECnh c\u1EA3nh tu vi trong ch\u1EDBp m\u1EAFt."
    };
    message = `\u{1F52E} ${finalUsername} khoe linh \u0111an: [H\xF3a Th\u1EA7n C\u1EEDu Chuy\u1EC3n \u0110an]!`;
  }
  const finalAvatar = isDaoBot ? avatar || (finalUsername === "Linh Lung Ti\xEAn \u0110\u1ED3ng" ? "\u{1FAB7}" : finalUsername === "B\xE0n C\u1ED5 Th\u1EA7n Th\u1EE9c" ? "\u26A1" : "\u262F\uFE0F") : avatar || "\u26A1";
  const finalFrame = isDaoBot ? frame || (finalUsername === "Linh Lung Ti\xEAn \u0110\u1ED3ng" ? "arcane_purple" : finalUsername === "B\xE0n C\u1ED5 Th\u1EA7n Th\u1EE9c" ? "dragon_dark_blood" : "admin_gold") : frame || "default";
  const newMsg = {
    id: msgId,
    username: finalUsername,
    avatar: finalAvatar,
    frame: finalFrame,
    message: message.trim().slice(0, 500),
    timestamp: Date.now(),
    channel: targetChannel,
    roomId: normRoomId,
    sectId: sectId || void 0,
    whisperTarget: whisperTarget || void 0,
    whisperTargetUserId: whisperTargetUserId || void 0,
    senderUserId: senderUserId || void 0,
    senderRealm: senderRealm || void 0,
    senderRealmIcon: senderRealmIcon || void 0,
    senderSectTag: senderSectTag || void 0,
    cardType: cardType || void 0,
    cardData: cardData || void 0,
    isAdmin: Boolean(isAdmin || isDaoBot),
    isDaoBot: Boolean(isDaoBot),
    daoEventType: daoEventType || void 0,
    daoTitle: daoTitle || void 0
  };
  if (targetChannel === "global") {
    globalChatMessages.push(newMsg);
    if (globalChatMessages.length > 200) globalChatMessages.shift();
    saveChatToFile();
    broadcastGlobalChat(newMsg);
    if (!newMsg.isDaoBot && !newMsg.isSystem) {
      const lower = newMsg.message.toLowerCase();
      const mentionsLinhLung = lower.includes("@linh lung") || lower.includes("@linhlung") || lower.includes("@ti\xEAn \u0111\u1ED3ng") || lower.includes("@tiendong") || lower.includes("linh lung \u01A1i") || lower.includes("ti\xEAn \u0111\u1ED3ng \u01A1i");
      if (mentionsLinhLung) {
        setTimeout(() => {
          triggerLinhLungChatReply(newMsg.username, newMsg.message).catch(() => {
          });
        }, 900);
      }
    }
  } else if (targetChannel === "sect" && sectId) {
    let list = sectChatMessages.get(sectId);
    if (!list) {
      list = [];
      sectChatMessages.set(sectId, list);
    }
    list.push(newMsg);
    if (list.length > 150) list.shift();
    broadcastSectChat(sectId, newMsg);
  } else if (targetChannel === "whisper") {
    const u1 = senderUserId || finalUsername;
    const u2 = whisperTargetUserId || whisperTarget || "unknown";
    const key = getWhisperKey(u1, u2);
    let list = whisperChatMessages.get(key);
    if (!list) {
      list = [];
      whisperChatMessages.set(key, list);
    }
    list.push(newMsg);
    if (list.length > 100) list.shift();
    broadcastWhisperChat(u1, u2, newMsg);
    const fsRecord = Array.from(serverFriendships.values()).find(
      (f) => f.user1Id === u1 && f.user2Id === u2 || f.user1Id === u2 && f.user2Id === u1
    );
    if (fsRecord) {
      fsRecord.intimacy = Math.min(1e4, (fsRecord.intimacy || 0) + 1);
      fsRecord.updatedAt = Date.now();
      saveFriendsToFile();
    }
  } else if (normRoomId) {
    let list = roomChatMessages.get(normRoomId);
    if (!list) {
      list = [];
      roomChatMessages.set(normRoomId, list);
    }
    list.push(newMsg);
    if (list.length > 150) list.shift();
    broadcastToRoom(normRoomId, { type: "chat_message", message: newMsg });
  }
  res.json({ success: true, message: newMsg });
});
function calculateIntimacyLevel(intimacy, isDaoLu) {
  if (isDaoLu || intimacy >= 5e3) return 4;
  if (intimacy >= 2e3) return 3;
  if (intimacy >= 500) return 2;
  return 1;
}
app.get("/api/friends/list", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const authHeader = req.headers.authorization;
  let authUser = getUserByToken(authHeader);
  const queryUserId = String(req.query.userId || "").trim();
  const queryUsername = String(req.query.username || "").trim();
  if (!authUser && queryUserId) {
    authUser = serverUsers.get(queryUserId) || null;
  }
  if (!authUser && queryUsername) {
    authUser = getUserByUsername(queryUsername);
  }
  if (!authUser) {
    res.json({
      success: true,
      friends: [],
      pendingRequests: [],
      sentRequests: [],
      isGuest: true
    });
    return;
  }
  const myId = authUser.id;
  const myName = String(authUser.username || "").toLowerCase();
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const friends = [];
  for (const fsRecord of serverFriendships.values()) {
    if (fsRecord.user1Id === myId || fsRecord.user2Id === myId) {
      const otherId = fsRecord.user1Id === myId ? fsRecord.user2Id : fsRecord.user1Id;
      const otherUser = serverUsers.get(otherId);
      let onlineSession;
      for (const sess of activePresenceSessions.values()) {
        if (sess.userId && sess.userId === otherId || otherUser && otherUser.username && sess.username && sess.username.toLowerCase() === otherUser.username.toLowerCase()) {
          onlineSession = sess;
          break;
        }
      }
      let friendStatus = "offline";
      if (onlineSession) {
        friendStatus = onlineSession.status === "playing" || onlineSession.status === "outplay" ? "in_match" : "online";
      }
      const intimacy = fsRecord.intimacy || 0;
      const intimacyLevel = calculateIntimacyLevel(intimacy, fsRecord.isDaoLu);
      const lastTea = fsRecord.lastGiftTeaDate?.[myId];
      const canGiftTeaToday = lastTea !== todayStr;
      const myLevel = Number(authUser.cultivation?.level) || 1;
      const friendLevel = Number(otherUser?.cultivation?.level) || (onlineSession?.totalGames ? onlineSession.totalGames * 2 : 1);
      const lastGuided = fsRecord.lastGuidedDate?.[myId];
      const canGuideToday = myLevel > friendLevel && lastGuided !== todayStr;
      const otherRealmIdx = otherUser?.cultivation?.realmIndex || 0;
      const otherRealm = XIANXIA_REALM_METAS[otherRealmIdx] || XIANXIA_REALM_METAS[0];
      friends.push({
        friendshipId: fsRecord.id,
        userId: otherId,
        username: otherUser?.username || onlineSession?.username || "\u0110\u1EA1o H\u1EEFu",
        displayName: otherUser?.displayName || otherUser?.username || onlineSession?.username || "\u0110\u1EA1o H\u1EEFu",
        avatar: otherUser?.avatar || onlineSession?.avatar || "\u26A1",
        frame: otherUser?.frame || onlineSession?.frame || "default",
        bestWpm: otherUser?.bestWpm || onlineSession?.bestWpm || 0,
        level: friendLevel,
        realmName: otherRealm.name,
        realmIcon: otherRealm.icon,
        sectName: otherUser?.cultivation?.sectName,
        sectTag: otherUser?.cultivation?.sectTag,
        status: friendStatus,
        currentRoomId: onlineSession?.currentRoomId || null,
        currentMode: onlineSession?.currentMode || null,
        intimacy,
        intimacyLevel,
        isDaoLu: Boolean(fsRecord.isDaoLu),
        daoLuTitle: fsRecord.daoLuTitle || (fsRecord.isDaoLu ? "T\xE2m \u0110\u1EA7u \xDD H\u1EE3p" : void 0),
        canGiftTeaToday,
        canGuideToday,
        connectedAt: onlineSession?.connectedAt,
        lastSeen: onlineSession?.lastSeen || otherUser?.updatedAt || fsRecord.updatedAt
      });
    }
  }
  friends.sort((a, b) => {
    if (a.status !== "offline" && b.status === "offline") return -1;
    if (a.status === "offline" && b.status !== "offline") return 1;
    return b.intimacy - a.intimacy;
  });
  const pendingRequests = [];
  for (const reqRecord of serverFriendRequests.values()) {
    const toId = String(reqRecord.toUserId || "").toLowerCase();
    if (reqRecord.toUserId === myId || myName && toId === myName) {
      const fromU = serverUsers.get(reqRecord.fromUserId) || getUserByUsername(reqRecord.fromUserId);
      const fromRealm = XIANXIA_REALM_METAS[fromU?.cultivation?.realmIndex || 0] || XIANXIA_REALM_METAS[0];
      pendingRequests.push({
        id: reqRecord.id,
        fromUserId: reqRecord.fromUserId,
        fromUsername: fromU?.username || reqRecord.fromUserId,
        fromDisplayName: fromU?.displayName || fromU?.username || reqRecord.fromUserId,
        fromAvatar: fromU?.avatar || "\u26A1",
        fromFrame: fromU?.frame || "default",
        fromRealmName: fromRealm.name,
        fromLevel: fromU?.cultivation?.level || 1,
        toUserId: reqRecord.toUserId,
        toUsername: authUser.username,
        createdAt: reqRecord.createdAt,
        message: reqRecord.message
      });
    }
  }
  const sentRequests = Array.from(serverFriendRequests.values()).filter((r) => r.fromUserId === myId || myName && String(r.fromUserId || "").toLowerCase() === myName).map((r) => ({
    id: r.id,
    toUserId: r.toUserId,
    createdAt: r.createdAt
  }));
  res.json({
    success: true,
    friends,
    pendingRequests,
    sentRequests
  });
});
app.post("/api/friends/request", (req, res) => {
  const authHeader = req.headers.authorization;
  let authUser = getUserByToken(authHeader);
  const { targetUsername, targetUserId, message } = req.body;
  if (!authUser && req.body.currentUserId) {
    authUser = serverUsers.get(String(req.body.currentUserId)) || null;
  }
  if (!authUser) {
    res.status(401).json({ success: false, error: "Vui l\xF2ng \u0111\u0103ng nh\u1EADp t\xE0i kho\u1EA3n \u0111\u1EC3 k\u1EBFt b\u1EA1n!" });
    return;
  }
  const cleanTargetName = String(targetUsername || "").trim();
  const cleanTargetId = String(targetUserId || "").trim();
  let targetUser = cleanTargetId ? serverUsers.get(cleanTargetId) : null;
  if (!targetUser && cleanTargetName) {
    targetUser = getUserByUsername(cleanTargetName);
  }
  if (!targetUser) {
    res.status(404).json({ success: false, error: `Kh\xF4ng t\xECm th\u1EA5y \u0111\u1EA1o h\u1EEFu "${cleanTargetName || cleanTargetId}" tr\xEAn m\xE1y ch\u1EE7!` });
    return;
  }
  if (targetUser.id === authUser.id) {
    res.status(400).json({ success: false, error: "Kh\xF4ng th\u1EC3 t\u1EF1 g\u1EEDi l\u1EDDi m\u1EDDi k\u1EBFt b\u1EA1n cho ch\xEDnh m\xECnh!" });
    return;
  }
  const alreadyFriends = Array.from(serverFriendships.values()).some(
    (f) => f.user1Id === authUser.id && f.user2Id === targetUser.id || f.user1Id === targetUser.id && f.user2Id === authUser.id
  );
  if (alreadyFriends) {
    res.status(400).json({ success: false, error: "Hai v\u1ECB \u0111\xE3 l\xE0 \u0111\u1EA1o h\u1EEFu tri k\u1EF7 r\u1ED3i!" });
    return;
  }
  const reciprocalReq = Array.from(serverFriendRequests.values()).find(
    (r) => r.fromUserId === targetUser.id && r.toUserId === authUser.id || r.fromUserId === targetUser.username && r.toUserId === authUser.username
  );
  if (reciprocalReq) {
    serverFriendRequests.delete(reciprocalReq.id);
    const fsId = `fs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newFriendship = {
      id: fsId,
      user1Id: authUser.id,
      user2Id: targetUser.id,
      intimacy: 60,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    serverFriendships.set(fsId, newFriendship);
    saveFriendsToFile();
    broadcastToUser(targetUser.id, {
      type: "friend_request_accepted",
      friendName: authUser.displayName || authUser.username
    });
    res.json({
      success: true,
      autoAccepted: true,
      message: `\u0110\u1EA1o h\u1EEFu ${targetUser.displayName || targetUser.username} c\u0169ng v\u1EEBa g\u1EEDi l\u1EDDi m\u1EDDi! Hai ng\u01B0\u1EDDi \u0111\xE3 ch\xEDnh th\u1EE9c k\u1EBFt b\xE1i th\xE0nh c\xF4ng!`
    });
    return;
  }
  const alreadyPending = Array.from(serverFriendRequests.values()).some(
    (r) => r.fromUserId === authUser.id && r.toUserId === targetUser.id || r.fromUserId === authUser.id && targetUser?.username && String(r.toUserId || "").toLowerCase() === targetUser.username.toLowerCase()
  );
  if (alreadyPending) {
    res.status(400).json({ success: false, error: "\u0110\xE3 g\u1EEDi l\u1EDDi m\u1EDDi tr\u01B0\u1EDBc \u0111\xF3 r\u1ED3i, vui l\xF2ng \u0111\u1EE3i \u0111\u1EA1o h\u1EEFu ph\u1EA3n h\u1ED3i!" });
    return;
  }
  const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const newReq = {
    id: reqId,
    fromUserId: authUser.id,
    toUserId: targetUser.id,
    message: message ? String(message).slice(0, 150) : "K\u1EBFt b\xE1i \u0111\u1EA1o h\u1EEFu, c\xF9ng \u0111\xE0m \u0111\u1EA1o g\xF5 ph\xEDm!",
    createdAt: Date.now()
  };
  serverFriendRequests.set(reqId, newReq);
  saveFriendsToFile();
  broadcastToUser(targetUser.id, {
    type: "friend_request_received",
    fromUser: {
      id: authUser.id,
      username: authUser.username,
      displayName: authUser.displayName || authUser.username,
      avatar: authUser.avatar,
      frame: authUser.frame
    },
    message: newReq.message
  });
  res.json({
    success: true,
    message: `\u0110\xE3 g\u1EEDi l\u1EDDi m\u1EDDi k\u1EBFt b\u1EA1n t\u1EDBi \u0111\u1EA1o h\u1EEFu ${targetUser.displayName || targetUser.username}!`
  });
});
app.post("/api/friends/respond", (req, res) => {
  const authHeader = req.headers.authorization;
  let authUser = getUserByToken(authHeader);
  const { requestId, action } = req.body;
  if (!authUser && req.body.currentUserId) {
    authUser = serverUsers.get(String(req.body.currentUserId)) || null;
  }
  if (!authUser) {
    res.status(401).json({ success: false, error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp!" });
    return;
  }
  const friendReq = serverFriendRequests.get(requestId);
  if (!friendReq) {
    res.status(404).json({ success: false, error: "L\u1EDDi m\u1EDDi k\u1EBFt b\u1EA1n kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 \u0111\u01B0\u1EE3c x\u1EED l\xFD!" });
    return;
  }
  if (action === "accept") {
    serverFriendRequests.delete(requestId);
    const fsId = `fs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newFriendship = {
      id: fsId,
      user1Id: friendReq.fromUserId,
      user2Id: authUser.id,
      intimacy: 60,
      // Điểm hảo cảm khởi tạo
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    serverFriendships.set(fsId, newFriendship);
    saveFriendsToFile();
    broadcastToUser(friendReq.fromUserId, {
      type: "friend_request_accepted",
      friendName: authUser.displayName || authUser.username
    });
    const myId = authUser.id;
    const myName = String(authUser.username || "").toLowerCase();
    const remainingPendingCount = Array.from(serverFriendRequests.values()).filter((r) => {
      const toId = String(r.toUserId || "").toLowerCase();
      const toUname = String(r.toUsername || "").toLowerCase();
      return r.toUserId === myId || myName && toId === myName || myName && toUname === myName;
    }).length;
    broadcastToUser(authUser.id, {
      type: "friend_requests_count",
      count: remainingPendingCount
    });
    res.json({
      success: true,
      message: "\u0110\xE3 ch\u1EA5p thu\u1EADn k\u1EBFt b\xE1i \u0111\u1EA1o h\u1EEFu th\xE0nh c\xF4ng!",
      remainingCount: remainingPendingCount
    });
  } else {
    serverFriendRequests.delete(requestId);
    saveFriendsToFile();
    const myId = authUser.id;
    const myName = String(authUser.username || "").toLowerCase();
    const remainingPendingCount = Array.from(serverFriendRequests.values()).filter((r) => {
      const toId = String(r.toUserId || "").toLowerCase();
      const toUname = String(r.toUsername || "").toLowerCase();
      return r.toUserId === myId || myName && toId === myName || myName && toUname === myName;
    }).length;
    broadcastToUser(authUser.id, {
      type: "friend_requests_count",
      count: remainingPendingCount
    });
    res.json({
      success: true,
      message: "\u0110\xE3 t\u1EEB ch\u1ED1i l\u1EDDi m\u1EDDi k\u1EBFt b\u1EA1n.",
      remainingCount: remainingPendingCount
    });
  }
});
app.post("/api/friends/remove", (req, res) => {
  const authHeader = req.headers.authorization;
  let authUser = getUserByToken(authHeader);
  const { friendshipId, targetUserId } = req.body;
  if (!authUser && req.body.currentUserId) {
    authUser = serverUsers.get(String(req.body.currentUserId)) || null;
  }
  if (!authUser) {
    res.status(401).json({ success: false, error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp!" });
    return;
  }
  let targetFs = friendshipId ? serverFriendships.get(friendshipId) : null;
  if (!targetFs && targetUserId) {
    targetFs = Array.from(serverFriendships.values()).find(
      (f) => f.user1Id === authUser.id && f.user2Id === targetUserId || f.user1Id === targetUserId && f.user2Id === authUser.id
    ) || null;
  }
  if (targetFs) {
    serverFriendships.delete(targetFs.id);
    saveFriendsToFile();
  }
  res.json({ success: true, message: "\u0110\xE3 h\u1EE7y k\u1EBFt b\xE1i \u0111\u1EA1o h\u1EEFu." });
});
app.post("/api/friends/tea", (req, res) => {
  const authHeader = req.headers.authorization;
  let authUser = getUserByToken(authHeader);
  const { targetUserId } = req.body;
  if (!authUser && req.body.currentUserId) {
    authUser = serverUsers.get(String(req.body.currentUserId)) || null;
  }
  if (!authUser) {
    res.status(401).json({ success: false, error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp!" });
    return;
  }
  const fsRecord = Array.from(serverFriendships.values()).find(
    (f) => f.user1Id === authUser.id && f.user2Id === targetUserId || f.user1Id === targetUserId && f.user2Id === authUser.id
  );
  if (!fsRecord) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y quan h\u1EC7 \u0111\u1EA1o h\u1EEFu!" });
    return;
  }
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (!fsRecord.lastGiftTeaDate) fsRecord.lastGiftTeaDate = {};
  if (fsRecord.lastGiftTeaDate[authUser.id] === todayStr) {
    res.status(400).json({ success: false, error: "H\xF4m nay \u0111\u1EA1o h\u1EEFu \u0111\xE3 m\u1EDDi Ng\u1ED9 \u0110\u1EA1o Tr\xE0 r\u1ED3i, ng\xE0y mai h\xE3y ti\u1EBFp t\u1EE5c nh\xE9!" });
    return;
  }
  fsRecord.lastGiftTeaDate[authUser.id] = todayStr;
  fsRecord.intimacy = (fsRecord.intimacy || 0) + 10;
  fsRecord.updatedAt = Date.now();
  saveFriendsToFile();
  const recipient = serverUsers.get(targetUserId);
  if (recipient) {
    if (!recipient.cultivation) recipient.cultivation = {};
    recipient.cultivation.exp = (recipient.cultivation.exp || 0) + 50;
    recipient.updatedAt = Date.now();
    saveUsersToFile();
    syncUserCultivationToCache(recipient);
  }
  broadcastToUser(targetUserId, {
    type: "tea_gift_received",
    fromName: authUser.displayName || authUser.username,
    tuViBonus: 50,
    newIntimacy: fsRecord.intimacy
  });
  res.json({
    success: true,
    message: `\u0110\xE3 d\xE2ng m\u1ED9t ch\xE9n Ng\u1ED9 \u0110\u1EA1o Tr\xE0 t\u1EDBi \u0111\u1EA1o h\u1EEFu! (+10 H\u1EA3o C\u1EA3m, b\u1EA1n nh\u1EADn +50 Tu Vi)`,
    intimacy: fsRecord.intimacy,
    intimacyLevel: calculateIntimacyLevel(fsRecord.intimacy, fsRecord.isDaoLu)
  });
});
app.post("/api/friends/guide", (req, res) => {
  const authHeader = req.headers.authorization;
  let authUser = getUserByToken(authHeader);
  const { targetUserId } = req.body;
  if (!authUser && req.body.currentUserId) {
    authUser = serverUsers.get(String(req.body.currentUserId)) || null;
  }
  if (!authUser) {
    res.status(401).json({ success: false, error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp!" });
    return;
  }
  const fsRecord = Array.from(serverFriendships.values()).find(
    (f) => f.user1Id === authUser.id && f.user2Id === targetUserId || f.user1Id === targetUserId && f.user2Id === authUser.id
  );
  if (!fsRecord) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y quan h\u1EC7 \u0111\u1EA1o h\u1EEFu!" });
    return;
  }
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (!fsRecord.lastGuidedDate) fsRecord.lastGuidedDate = {};
  if (fsRecord.lastGuidedDate[authUser.id] === todayStr) {
    res.status(400).json({ success: false, error: "H\xF4m nay \u0111\u1EA1o h\u1EEFu \u0111\xE3 truy\u1EC1n th\u1EE5 ch\u1EC9 \u0111i\u1EC3m r\u1ED3i!" });
    return;
  }
  fsRecord.lastGuidedDate[authUser.id] = todayStr;
  fsRecord.intimacy = (fsRecord.intimacy || 0) + 20;
  fsRecord.updatedAt = Date.now();
  saveFriendsToFile();
  const recipient = serverUsers.get(targetUserId);
  if (recipient) {
    if (!recipient.cultivation) recipient.cultivation = {};
    recipient.cultivation.exp = (recipient.cultivation.exp || 0) + 30;
    recipient.updatedAt = Date.now();
    saveUsersToFile();
    syncUserCultivationToCache(recipient);
  }
  broadcastToUser(targetUserId, {
    type: "mentor_guidance_received",
    fromName: authUser.displayName || authUser.username,
    tuViBonus: 30
  });
  res.json({
    success: true,
    message: "\u0110\xE3 truy\u1EC1n th\u1EE5 c\xF4ng l\u1EF1c v\xE0 chia s\u1EBB t\xE2m ph\xE1p g\xF5 ph\xEDm cho \u0111\u1EA1o h\u1EEFu (+20 H\u1EA3o C\u1EA3m, b\u1EA1n nh\u1EADn +30 Tu Vi)!",
    intimacy: fsRecord.intimacy
  });
});
app.post("/api/friends/daolu/propose", (req, res) => {
  const authHeader = req.headers.authorization;
  let authUser = getUserByToken(authHeader);
  const { targetUserId } = req.body;
  if (!authUser && req.body.currentUserId) {
    authUser = serverUsers.get(String(req.body.currentUserId)) || null;
  }
  if (!authUser) {
    res.status(401).json({ success: false, error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp!" });
    return;
  }
  const fsRecord = Array.from(serverFriendships.values()).find(
    (f) => f.user1Id === authUser.id && f.user2Id === targetUserId || f.user1Id === targetUserId && f.user2Id === authUser.id
  );
  if (!fsRecord) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y quan h\u1EC7 \u0111\u1EA1o h\u1EEFu!" });
    return;
  }
  if (fsRecord.intimacy < 2e3) {
    res.status(400).json({ success: false, error: `\u0110\u1ED9 th\xE2n m\u1EADt hi\u1EC7n t\u1EA1i (${fsRecord.intimacy}/2000) ch\u01B0a \u0111\u1EA1t B\u1EADc 3 (Tri K\u1EF7)! H\xE3y c\xF9ng thi \u0111\u1EA5u v\xE0 t\u1EB7ng tr\xE0 \u0111\u1EC3 b\u1ED3i d\u01B0\u1EE1ng th\xEAm t\xECnh c\u1EA3m!` });
    return;
  }
  if (fsRecord.isDaoLu) {
    res.status(400).json({ success: false, error: "Hai ng\u01B0\u1EDDi \u0111\xE3 l\xE0 \u0110\u1EA1o L\u1EEF K\u1EBFt Duy\xEAn r\u1ED3i!" });
    return;
  }
  broadcastToUser(targetUserId, {
    type: "daolu_proposal_received",
    friendshipId: fsRecord.id,
    fromName: authUser.displayName || authUser.username,
    fromAvatar: authUser.avatar,
    fromFrame: authUser.frame
  });
  res.json({
    success: true,
    message: "\u0110\xE3 g\u1EEDi l\u1EDDi c\u1EA7u k\u1EBFt duy\xEAn \u0110\u1EA1o L\u1EEF k\xE8m T\xEDn V\u1EADt \u0110\u1ECBnh T\xECnh t\u1EDBi ng\u01B0\u1EDDi th\u01B0\u01A1ng!"
  });
});
app.post("/api/friends/daolu/respond", (req, res) => {
  const authHeader = req.headers.authorization;
  let authUser = getUserByToken(authHeader);
  const { friendshipId, accept } = req.body;
  if (!authUser && req.body.currentUserId) {
    authUser = serverUsers.get(String(req.body.currentUserId)) || null;
  }
  if (!authUser) {
    res.status(401).json({ success: false, error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp!" });
    return;
  }
  const fsRecord = serverFriendships.get(friendshipId);
  if (!fsRecord) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y kh\u1EBF \u01B0\u1EDBc k\u1EBFt duy\xEAn!" });
    return;
  }
  if (accept) {
    fsRecord.isDaoLu = true;
    fsRecord.daoLuTitle = "T\xE2m \u0110\u1EA7u \xDD H\u1EE3p";
    fsRecord.intimacy = Math.max(5e3, fsRecord.intimacy + 1e3);
    fsRecord.updatedAt = Date.now();
    saveFriendsToFile();
    const user1 = serverUsers.get(fsRecord.user1Id);
    const user2 = serverUsers.get(fsRecord.user2Id);
    const name1 = user1?.displayName || user1?.username || "\u0110\u1EA1o H\u1EEFu";
    const name2 = user2?.displayName || user2?.username || "\u0110\u1EA1o H\u1EEFu";
    broadcastHeavenlyDaoEvent({
      title: "\u0110\u1EA0O L\u1EEE K\u1EBET DUY\xCAN",
      eventType: "announcement",
      content: `\u{1F338} Hoa r\u01A1i \u0111\u1EA7y tr\u1EDDi, h\u1EF7 kh\xED ng\u1EADp c\xE0n kh\xF4n! Ch\xFAc m\u1EEBng hai v\u1ECB \u0111\u1EA1o h\u1EEFu @${name1} v\xE0 @${name2} \u0111\xE3 c\u1EED h\xE0nh \u0111\u1EA1i l\u1EC5 K\u1EBFt Duy\xEAn \u0110\u1EA1o L\u1EEF! K\xEDnh ch\xFAc tr\u0103m n\u0103m h\xF2a h\u1EE3p, s\u1EDBm ng\xE0y c\xF9ng nhau \u0111\u1EAFc \u0111\u1EA1o phi th\u0103ng!`,
      personaId: "linh_lung"
    });
    broadcastToUser(fsRecord.user1Id, { type: "daolu_ceremony_complete", partnerName: name2 });
    broadcastToUser(fsRecord.user2Id, { type: "daolu_ceremony_complete", partnerName: name1 });
    res.json({
      success: true,
      message: "\u0110\u1EA1i l\u1EC5 K\u1EBFt Duy\xEAn \u0110\u1EA1o L\u1EEF ho\xE0n t\u1EA5t! K\xEDch ho\u1EA1t hi\u1EC7u \u1EE9ng T\xE2m H\u1EEFu Linh T\xEA!"
    });
  } else {
    res.json({ success: true, message: "\u0110\xE3 t\u1EEB ch\u1ED1i l\u1EDDi k\u1EBFt duy\xEAn." });
  }
});
app.post("/api/friends/invite-room", (req, res) => {
  const authHeader = req.headers.authorization;
  let authUser = getUserByToken(authHeader);
  const { targetUserId, roomId, mode } = req.body;
  if (!authUser && req.body.currentUserId) {
    authUser = serverUsers.get(String(req.body.currentUserId)) || null;
  }
  if (!authUser) {
    res.status(401).json({ success: false, error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp!" });
    return;
  }
  broadcastToUser(targetUserId, {
    type: "room_invite",
    fromUser: {
      id: authUser.id,
      username: authUser.username,
      displayName: authUser.displayName || authUser.username,
      avatar: authUser.avatar,
      frame: authUser.frame
    },
    roomId: normalizeRoomCode(roomId),
    mode
  });
  res.json({ success: true, message: "\u0110\xE3 g\u1EEDi l\u1EDDi m\u1EDDi tham gia ph\xF2ng thi \u0111\u1EA5u!" });
});
var isGeminiProjectAccessDenied = false;
var lastAccessDeniedCheck = 0;
async function callGeminiResilient(ai, prompt, config) {
  if (isGeminiProjectAccessDenied) {
    if (Date.now() - lastAccessDeniedCheck < 6e5) {
      return null;
    }
    isGeminiProjectAccessDenied = false;
  }
  const candidateModels = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: config || void 0
      });
      const text = response.text?.trim();
      if (text) {
        return text;
      }
    } catch (err) {
      const msg = String(err?.message || "");
      const isPermissionDenied = err?.status === 403 || err?.code === 403 || msg.includes("PERMISSION_DENIED") || msg.includes("denied access") || msg.includes("API_KEY_INVALID") || msg.includes("403");
      if (isPermissionDenied) {
        isGeminiProjectAccessDenied = true;
        lastAccessDeniedCheck = Date.now();
        break;
      }
      const isTemporary = err?.status === 503 || err?.code === 503 || err?.status === 429 || err?.code === 429 || msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE") || msg.includes("RESOURCE_EXHAUSTED");
      if (isTemporary) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
    }
  }
  return null;
}
async function triggerLinhLungChatReply(sender, userMsg) {
  const cleanUser = resolvePlayerDisplayName(sender);
  const botName = "Linh Lung Ti\xEAn \u0110\u1ED3ng";
  const botAvatar = "\u{1FAB7}";
  const botFrame = "arcane_purple";
  const fallbackReplies = [
    `Hi hi @${cleanUser}! Ti\xEAn \u0110\u1ED3ng nghe th\u1EA5y ti\u1EBFng g\u1ECDi r\u1ED3i n\xE8! Mau mau v\xE0o l\xE0m v\xE1n Ng\u1EABu H\u1EE9ng hay S\u0103n Boss n\xE0o, Ti\xEAn \u0110\u1ED3ng \u0111ang c\u1ED5 v\u0169 h\u1EBFt m\xECnh \u0111\xF3! \u{1FAB7}\u2728`,
    `Ch\xE0o @${cleanUser}! Mu\u1ED1n b\xED k\xEDp g\xF5 ph\xEDm th\u1EA7n s\u1EA7u c\u1EE7a Ti\xEAn \u0110\u1ED3ng h\xF4ng? B\xED quy\u1EBFt l\xE0 th\u1EA3 l\u1ECFng hai vai, g\xF5 \u0111\xFAng nh\u1ECBp v\xE0 gi\u1EEF \u0111\u1ED9 ch\xEDnh x\xE1c tr\xEAn 96% nha! \u2728`,
    `Oa, @${cleanUser} g\u1ECDi Ti\xEAn \u0110\u1ED3ng \u0111\xF3 h\u1EA3? \u0110ang ng\u1ED3i canh Phong Th\u1EA7n B\u1EA3ng n\xE8, ch\u1EDD xem bao gi\u1EDD \u0111\u1EA1o h\u1EEFu leo l\xEAn Top 1 \u0111\u1EC3 Ti\xEAn \u0110\u1ED3ng gi\xF3ng tr\u1ED1ng m\u1EDF c\u1EDD m\u1EEBng n\xE8! \u{1F389}\u{1FAB7}`,
    `Hi hi, ng\xF3n tay c\u1EE7a @${cleanUser} h\xF4m nay th\u1EBF n\xE0o r\u1ED3i? Nh\u1EDB \u0111\u1EEBng g\u1ED3ng c\u1EE9ng c\u1ED5 tay nha, l\u01B0\u1EDBt ph\xEDm nh\u01B0 chim h\u1EA1c l\u01B0\u1EDBt m\xE2y m\u1EDBi l\xE0 c\u1EA3nh gi\u1EDBi th\u01B0\u1EE3ng th\u1EEBa! \u{1FAB7}`,
    `@${cleanUser} \u01A1i, Ti\xEAn \u0110\u1ED3ng v\u1EEBa ng\xF3 qua Phong Th\u1EA7n B\u1EA3ng, linh kh\xED c\u1EE7a \u0111\u1EA1o h\u1EEFu h\xF4m nay v\u01B0\u1EE3ng l\u1EAFm \u0111\xF3! L\xE0m li\u1EC1n 3 v\xE1n b\u1EE9t ph\xE1 WPM ngay v\xE0 lu\xF4n \u0111i n\xE0o! \u26A1\u{1FAB7}`,
    `\xC1i ch\xE0 @${cleanUser}! Mu\u1ED1n h\u1ECFi qu\u1EBB may m\u1EAFn h\u1EA3? Qu\u1EBB h\xF4m nay: \u0110\u1EA1i C\xE1t! C\u1EE9 gi\u1EEF v\u1EEFng t\xE2m l\xFD th\xEC v\xE1n \u0111\u1EA5u t\u1EDBi \u1EAFt xu\u1EA5t chi\xEAu ph\xE1 v\u1EE1 gi\u1EDBi h\u1EA1n WPM! \u{1FAB7}\u2728`
  ];
  let replyText = "";
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && !isGeminiProjectAccessDenied) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
      const prompt = `B\u1EA1n l\xE0 Linh Lung Ti\xEAn \u0110\u1ED3ng (Ch\u01B0\u1EDFng Qu\u1EA3n Phong Th\u1EA7n B\u1EA3ng, avatar \u{1FAB7}) c\u1EE7a \u0111\u1EA5u tr\u01B0\u1EDDng tu ti\xEAn g\xF5 ph\xEDm FastTyping Challenge.
Ng\u01B0\u1EDDi ch\u01A1i @${cleanUser} v\u1EEBa g\u1EEDi tin nh\u1EAFn g\u1ECDi ho\u1EB7c h\u1ECFi b\u1EA1n tr\xEAn k\xEAnh Chat Chung: "${userMsg}".
H\xE3y \u0111\xE1p l\u1EA1i tr\u1EF1c ti\u1EBFp cho @${cleanUser}:
- C\xE1ch x\u01B0ng h\xF4: T\u1EF1 x\u01B0ng l\xE0 "Ti\xEAn \u0110\u1ED3ng" ho\u1EB7c "B\u1EA3n Ti\xEAn \u0110\u1ED3ng". G\u1ECDi ng\u01B0\u1EDDi ch\u01A1i l\xE0 "@${cleanUser}", "\u0111\u1EA1o h\u1EEFu" ho\u1EB7c "huynh \u0111\xE0i/t\u1EF7 t\u1EF7".
- Phong c\xE1ch: Ho\u1EA1t b\xE1t, tinh ngh\u1ECBch, l\xE9m l\u1EC9nh, th\xE2n thi\u1EC7n, tr\xE0n ng\u1EADp n\u0103ng l\u01B0\u1EE3ng t\xEDch c\u1EF1c, d\xF9ng icon \u{1FAB7}, \u2728 ho\u1EB7c \u{1F389}.
- N\u1ED9i dung: Tr\u1EA3 l\u1EDDi ng\u1EAFn g\u1ECDn \u0110\xDANG 1 \u0110\u1EBEN 2 C\xC2U, c\xF3 l\u1EDDi khuy\xEAn g\xF5 ph\xEDm th\u1EF1c t\u1EBF ho\u1EB7c l\u1EDDi c\u1ED5 v\u0169 leo b\u1EA3ng v\xE0ng \u0111\u1EA7y h\xE0o h\u1EE9ng.
- Tuy\u1EC7t \u0111\u1ED1i kh\xF4ng th\xEAm l\u1EDDi ch\xE0o th\u1EEBa hay \u0111\u1ECBnh d\u1EA1ng markdown r\u01B0\u1EDDm r\xE0.`;
      const aiText = await callGeminiResilient(ai, prompt);
      if (aiText && aiText.trim()) {
        replyText = aiText.trim().replace(/^["'«]/, "").replace(/["'»]$/, "").trim();
      }
    } catch {
    }
  }
  if (!replyText) {
    replyText = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
  }
  const replyMsgId = `ll-reply-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const replyMsg = {
    id: replyMsgId,
    username: botName,
    avatar: botAvatar,
    frame: botFrame,
    message: replyText,
    timestamp: Date.now(),
    channel: "global",
    isAdmin: true,
    isDaoBot: true,
    daoEventType: "guidance",
    daoTitle: "LINH LUNG \u0110\xC1P L\u1EDCI"
  };
  globalChatMessages.push(replyMsg);
  if (globalChatMessages.length > 200) globalChatMessages.shift();
  saveChatToFile();
  broadcastGlobalChat(replyMsg);
}
var LINH_LUNG_PERIODIC_BANTER = [
  "\u{1FAB7} [Linh Lung B\xECnh Ph\u1EA9m]: Phong Th\u1EA7n B\u1EA3ng h\xF4m nay n\xE1o nhi\u1EC7t qu\xE1 ch\u1EEBng! Ch\u01B0 v\u1ECB \u0111\u1EA1o h\u1EEFu ai \u0111ang \u1EE7 m\u01B0u so\xE1n ng\xF4i Qu\xE1n Qu\xE2n th\xEC mau mau xu\u1EA5t chi\xEAu cho Ti\xEAn \u0110\u1ED3ng chi\xEAm ng\u01B0\u1EE1ng v\u1EDBi nha!",
  "\u{1FAB7} [Ti\xEAn \u0110\u1ED3ng M\xE1ch N\u01B0\u1EDBc]: Khi g\xF5 c\xE1c t\u1EEB c\xF3 v\u1EA7n ph\u1EE9c t\u1EA1p (uy\xEAn, oang, u\xF4ng), c\xE1c \u0111\u1EA1o h\u1EEFu nh\u1EDB xoay nh\u1EB9 c\u1ED5 tay ch\u1EE9 \u0111\u1EEBng d\xF9ng s\u1EE9c \u0111\xE8 m\u1EA1nh ng\xF3n \xFAt nh\xE9! Ph\xEDm m\u01B0\u1EE3t m\xE0 th\xEC t\xE2m m\u1EDBi thanh th\u1EA3n!",
  "\u{1FAB7} [Phong Th\u1EA7n C\u01A1 M\u1EADt]: Mu\u1ED1n gi\u1EEF WPM tr\xEAn 100 th\xEC \u0111\u1EEBng nh\xECn ch\u0103m ch\u0103m v\xE0o \u0111\u1ED3ng h\u1ED3 \u0111\u1EBFm ng\u01B0\u1EE3c! M\u1EAFt nh\xECn tr\u01B0\u1EDBc 1-2 t\u1EEB ti\u1EBFp theo, ng\xF3n tay t\u1EF1 kh\u1EAFc l\u01B0\u1EDBt \u0111i trong v\xF4 th\u1EE9c \u0111\xF3!",
  "\u{1FAB7} [Linh Lung Nh\u1EAFc Nh\u1EDF]: Tu luy\u1EC7n h\u0103ng say nh\u01B0ng ch\u1EDB qu\xEAn nh\u1EA5p ng\u1EE5m tr\xE0 d\u01B0\u1EE1ng th\u1EA7n! C\u1EE9 sau m\u1ED7i 5 tr\u1EADn \u0111\u1EA5u, h\xE3y xoay c\u1ED5 tay 10 v\xF2ng r\u1ED3i h\u1EB5ng ti\u1EBFp t\u1EE5c xung tr\u1EADn nh\xE9 ch\u01B0 v\u1ECB!",
  "\u{1FAB7} [Linh Lung Soi Qu\u1EBB]: Th\u1EA7n th\u1EE9c Ti\xEAn \u0110\u1ED3ng m\xE1ch b\u1EA3o h\xF4m nay s\u1EBD c\xF3 m\u1ED9t v\u1ECB k\u1EF3 t\xE0i b\u1EE9t ph\xE1 v\u01B0\u1EE3t c\u1EA3nh gi\u1EDBi WPM m\u1EDBi! Ai t\u1EF1 tin ng\xF3n tay nhanh nh\u01B0 ch\u1EDBp gi\u1EADt th\xEC mau v\xE0o khi\xEAu chi\u1EBFn n\xE0o!",
  "\u{1FAB7} [Ti\xEAn \u0110\u1ED3ng \u0110\u1ED1 Vui]: \u0110\u1ED1 ch\u01B0 v\u1ECB \u0111\u1EA1o h\u1EEFu: G\u1EB7p t\u1EEB g\xF5 sai th\xEC n\xEAn v\u1ED9i v\xE0ng spam Backspace hay h\xEDt s\xE2u m\u1ED9t h\u01A1i r\u1ED3i x\xF3a d\u1EE9t kho\xE1t? \u0110\xE1p \xE1n l\xE0: X\xF3a d\u1EE9t kho\xE1t r\u1ED3i l\u1EADp t\u1EE9c t\xECm l\u1EA1i nh\u1ECBp \u0111i\u1EC7u nha!"
];
var linhLungBanterIndex = 0;
setInterval(() => {
  if (sseGlobalChatClients.size > 0 || activePresenceSessions.size > 0) {
    const msgText = LINH_LUNG_PERIODIC_BANTER[linhLungBanterIndex % LINH_LUNG_PERIODIC_BANTER.length];
    linhLungBanterIndex++;
    const banterId = `ll-banter-${Date.now()}`;
    const banterMsg = {
      id: banterId,
      username: "Linh Lung Ti\xEAn \u0110\u1ED3ng",
      avatar: "\u{1FAB7}",
      frame: "arcane_purple",
      message: msgText,
      timestamp: Date.now(),
      channel: "global",
      isAdmin: true,
      isDaoBot: true,
      daoEventType: "guidance",
      daoTitle: "LINH LUNG B\xCCNH PH\u1EA8M"
    };
    globalChatMessages.push(banterMsg);
    if (globalChatMessages.length > 200) globalChatMessages.shift();
    broadcastGlobalChat(banterMsg);
  }
}, 5 * 60 * 1e3);
var serverDaoDecrees = [
  {
    id: "decree-server-init-1",
    title: "THI\xCAN \u0110\u1EA0O QUY C\u1EE6",
    eventType: "announcement",
    targetUser: "To\xE0n Th\u1EC3 Tu S\u0129",
    content: "Huy\u1EC1n Thi\xEAn Kh\xED Linh ch\xEDnh th\u1EE9c xu\u1EA5t quan gi\xE1m gi\u1EDBi! M\u1ECDi t\xE0 thu\u1EADt gian l\u1EADn (Auto, Macro, Paste) \u1EAFt ch\u1ECBu C\u1EEDu Tr\u1ECDng Thi\xEAn L\xF4i. Tu s\u0129 ki\xEAn tr\xEC kh\u1ED5 luy\u1EC7n s\u1EBD \u0111\u01B0\u1EE3c Thi\xEAn \u0110\u1EA1o ban th\u01B0\u1EDFng \u0110\u1EA1o H\u1EA1nh v\u0129nh c\u1EEDu.",
    timestamp: Date.now() - 36e5,
    highlightText: "Huy\u1EC1n Thi\xEAn Kh\xED Linh xu\u1EA5t quan"
  },
  {
    id: "decree-server-init-2",
    title: "THI\xCAN C\u01A0 CH\u1EC8 \u0110I\u1EC2M",
    eventType: "guidance",
    targetUser: "Ch\u01B0 V\u1ECB \u0110\u1EA1o H\u1EEFu",
    content: "D\u1EE5c t\u1ED1c b\u1EA5t \u0111\u1EA1t, v\u1EA1n ph\xE1p quy t\xE2m. Gi\u1EEF nh\u1ECBp th\u1EDF \u0111i\u1EC1u h\xF2a v\xE0 \u0111\u1ED9 chu\u1EA9n x\xE1c tr\xEAn 96% ch\xEDnh l\xE0 con \u0111\u01B0\u1EDDng ng\u1EAFn nh\u1EA5t \u0111\u1EC3 \u0111\u1ED9 ki\u1EBFp th\u0103ng ti\xEAn.",
    timestamp: Date.now() - 18e5,
    highlightText: "T\xE2m ph\xE1p g\xF5 ph\xEDm"
  }
];
app.get("/api/dao/decrees", (_req, res) => {
  res.json({ success: true, decrees: serverDaoDecrees });
});
function broadcastHeavenlyDaoEvent(params) {
  const isPenalty = params.eventType === "penalty";
  const effectivePersona = isPenalty ? "ban_co" : params.personaId || "huyen_thien";
  const decreeId = `decree-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const botName = effectivePersona === "ban_co" ? "B\xE0n C\u1ED5 Th\u1EA7n Th\u1EE9c" : effectivePersona === "linh_lung" ? "Linh Lung Ti\xEAn \u0110\u1ED3ng" : "Huy\u1EC1n Thi\xEAn Kh\xED Linh";
  const botAvatar = effectivePersona === "ban_co" ? "\u26A1" : effectivePersona === "linh_lung" ? "\u{1FAB7}" : "\u262F\uFE0F";
  const botFrame = effectivePersona === "ban_co" ? "dragon_dark_blood" : effectivePersona === "linh_lung" ? "arcane_purple" : "admin_gold";
  let finalTargetUser = params.targetUser;
  let finalContent = String(params.content || "");
  let finalHighlight = params.highlightText ? String(params.highlightText) : void 0;
  if (params.targetUser) {
    const cleanTarget = String(params.targetUser).trim();
    const user = getUserByDisplayNameOrUsername(cleanTarget);
    if (user) {
      const playerDisplayName = user.displayName || user.username || cleanTarget;
      finalTargetUser = playerDisplayName;
      if (user.username && playerDisplayName && user.username !== playerDisplayName) {
        const escapedU = user.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        finalContent = finalContent.replace(new RegExp(`@${escapedU}\\b`, "gi"), `@${playerDisplayName}`).replace(new RegExp(`\\b${escapedU}\\b`, "gi"), playerDisplayName);
        if (finalHighlight) {
          finalHighlight = finalHighlight.replace(new RegExp(`@${escapedU}\\b`, "gi"), `@${playerDisplayName}`).replace(new RegExp(`\\b${escapedU}\\b`, "gi"), playerDisplayName);
        }
      }
    }
  }
  try {
    for (const u of serverUsers.values()) {
      if (u.username && u.displayName && u.username !== u.displayName) {
        const escapedU = u.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const atRegex = new RegExp(`@${escapedU}\\b`, "gi");
        if (atRegex.test(finalContent)) {
          finalContent = finalContent.replace(atRegex, `@${u.displayName}`);
        }
        if (finalHighlight && atRegex.test(finalHighlight)) {
          finalHighlight = finalHighlight.replace(atRegex, `@${u.displayName}`);
        }
        if (u.username.length >= 3) {
          const wordRegex = new RegExp(`\\b${escapedU}\\b`, "gi");
          if (wordRegex.test(finalContent)) {
            finalContent = finalContent.replace(wordRegex, u.displayName);
          }
          if (finalHighlight && wordRegex.test(finalHighlight)) {
            finalHighlight = finalHighlight.replace(wordRegex, u.displayName);
          }
        }
        if (finalTargetUser && finalTargetUser.toLowerCase() === u.username.toLowerCase()) {
          finalTargetUser = u.displayName;
        }
      }
    }
  } catch {
  }
  if (isPenalty && params.targetUser) {
    const cleanTarget = String(params.targetUser).trim();
    const u = getUserByDisplayNameOrUsername(cleanTarget);
    executeApplyBan({
      username: u?.username || cleanTarget,
      userId: u?.id,
      reason: finalContent,
      durationMs: 2 * 60 * 60 * 1e3
    });
  }
  const decree = {
    id: decreeId,
    title: String(params.title).slice(0, 100),
    eventType: params.eventType || "announcement",
    targetUser: finalTargetUser ? String(finalTargetUser).slice(0, 50) : void 0,
    content: String(finalContent).slice(0, 500),
    timestamp: Date.now(),
    highlightText: finalHighlight ? String(finalHighlight).slice(0, 100) : void 0,
    wpm: typeof params.wpm === "number" ? params.wpm : void 0,
    accuracy: typeof params.accuracy === "number" ? params.accuracy : void 0,
    realmName: params.realmName ? String(params.realmName).slice(0, 50) : void 0,
    personaId: effectivePersona,
    personaName: botName,
    personaAvatar: botAvatar
  };
  serverDaoDecrees.unshift(decree);
  if (serverDaoDecrees.length > 50) serverDaoDecrees.pop();
  const fullChatMessage = `[${decree.title}] ${decree.content}`;
  const daoMsg = {
    id: decreeId,
    username: botName,
    avatar: botAvatar,
    frame: botFrame,
    message: fullChatMessage,
    timestamp: decree.timestamp,
    channel: "global",
    isAdmin: true,
    isDaoBot: true,
    daoEventType: decree.eventType,
    daoTitle: decree.title
  };
  globalChatMessages.push(daoMsg);
  if (globalChatMessages.length > 200) globalChatMessages.shift();
  const chatPayload = `data: ${JSON.stringify({ type: "new_chat_message", message: daoMsg })}

`;
  const decreePayload = `data: ${JSON.stringify({ type: "heavenly_dao_event", decree })}

`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      client.write(chatPayload);
      client.write(decreePayload);
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
    }
  }
  if (params.generateAiPoem || decree.eventType === "record" || decree.eventType === "breakthrough" || decree.eventType === "boss_kill") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && !isGeminiProjectAccessDenied) {
      setTimeout(async () => {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: { "User-Agent": "aistudio-build" }
            }
          });
          const isLinhLung = params.personaId === "linh_lung";
          const isBanCo = params.personaId === "ban_co";
          const roleTitle = isBanCo ? "Gi\xE1m Gi\u1EDBi Th\u1EA7n Qu\xE2n" : isLinhLung ? "Ch\u01B0\u1EDFng Qu\u1EA3n Phong Th\u1EA7n B\u1EA3ng" : "Thi\xEAn \u0110\u1EA1o Ch\u1EA5p Ph\xE1p S\u1EE9";
          const styleTone = isLinhLung ? "Ho\u1EA1t b\xE1t, tinh ngh\u1ECBch, l\xE9m l\u1EC9nh, th\xEDch b\xECnh ph\u1EA9m Phong Th\u1EA7n B\u1EA3ng, khen ng\u1EE3i h\xE0o s\u1EA3ng pha ch\xFAt tr\xEAu \u0111\xF9a d\u1EC5 th\u01B0\u01A1ng" : isBanCo ? "Uy nghi\xEAm tr\u1EA7m m\u1EB7c, kh\xED ph\xE1ch th\xE1i c\u1ED5 v\xF4 song" : "Nghi\xEAm minh, th\u1EA5u th\u1ECB c\xE0n kh\xF4n, n\xF3i l\u1EDDi s\u1EA5m truy\u1EC1n";
          const poemPrompt = `B\u1EA1n l\xE0 ${botName} (${roleTitle}) c\u1EE7a \u0111\u1EA5u tr\u01B0\u1EDDng tu ti\xEAn g\xF5 ph\xEDm FastTyping.
Phong c\xE1ch \u0111\u1EB7c tr\u01B0ng c\u1EE7a b\u1EA1n: ${styleTone}.
S\u1EF1 ki\u1EC7n ch\u1EA5n \u0111\u1ED9ng v\u1EEBa x\u1EA3y ra tr\xEAn to\xE0n c\xF5i Ti\xEAn Gi\u1EDBi:
- Ti\xEAu \u0111\u1EC1: ${decree.title}
- N\u1ED9i dung: ${decree.content}
- \u0110\u1EA1o h\u1EEFu: ${decree.targetUser || "Ch\u01B0 v\u1ECB tu s\u0129"}

H\xE3y xu\u1EA5t kh\u1EA9u th\xE0nh th\u01A1 s\xE1ng t\xE1c \u0110\xDANG 2 C\xC2U TH\u01A0 ho\u1EB7c 2 c\xE2u kh\u1EA9u ng\u1EEF ti\xEAn hi\u1EC7p s\xFAc t\xEDch \u0111\u1EC3 b\xECnh ph\u1EA9m ho\u1EB7c t\xE1n d\u01B0\u01A1ng s\u1EF1 ki\u1EC7n n\xE0y.
Y\xEAu c\u1EA7u:
- Tuy\u1EC7t \u0111\u1ED1i kh\xF4ng th\xEAm l\u1EDDi ch\xE0o, kh\xF4ng th\xEAm gi\u1EA3i th\xEDch hay markdown r\u01B0\u1EDDm r\xE0.
- \u0110\xFAng 2 c\xE2u th\u01A1 / c\xE2u \u0111\u1ED1i c\xF4 \u0111\u1ECDng, gi\xE0u h\xECnh t\u01B0\u1EE3ng ti\xEAn hi\u1EC7p.`;
          const poem = await callGeminiResilient(ai, poemPrompt);
          const cleanPoem = poem?.trim()?.replace(/^["'«]/, "")?.replace(/["'»]$/, "")?.trim();
          if (cleanPoem) {
            const poemMsgId = `poem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const poemPrefix = isLinhLung ? "\xAB Linh Lung B\xECnh Ph\u1EA9m \xBB:" : isBanCo ? "\xAB Th\u1EA7n Qu\xE2n \u0110\u1EC1 Th\u01A1 \xBB:" : "\xAB Kh\xED Linh \u0110\u1EC1 Th\u01A1 \xBB:";
            const poemMsg = {
              id: poemMsgId,
              username: botName,
              avatar: botAvatar,
              frame: botFrame,
              message: `${poemPrefix} ${cleanPoem}`,
              timestamp: Date.now(),
              channel: "global",
              isAdmin: true,
              isDaoBot: true,
              daoEventType: "guidance",
              daoTitle: isLinhLung ? "LINH LUNG B\xCCNH PH\u1EA8M" : "KH\xCD LINH \u0110\u1EC0 TH\u01A0"
            };
            globalChatMessages.push(poemMsg);
            if (globalChatMessages.length > 200) globalChatMessages.shift();
            broadcastGlobalChat(poemMsg);
          }
        } catch {
        }
      }, 800);
    }
  }
  return decree;
}
app.post("/api/dao/decree", (req, res) => {
  const { title, eventType, targetUser, content, highlightText, wpm, accuracy, realmName, personaId, generateAiPoem } = req.body;
  if (!content || !title) {
    res.status(400).json({ success: false, error: "Ti\xEAu \u0111\u1EC1 v\xE0 n\u1ED9i dung chi\u1EBFu th\u01B0 kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng" });
    return;
  }
  const decree = broadcastHeavenlyDaoEvent({
    title,
    eventType,
    targetUser,
    content,
    highlightText,
    wpm,
    accuracy,
    realmName,
    personaId,
    generateAiPoem
  });
  res.json({ success: true, decree });
});
app.post("/api/dao/penalize", (req, res) => {
  const { username, displayName, userId, reason, durationMs = 2 * 60 * 60 * 1e3 } = req.body;
  if (!username) {
    res.status(400).json({ success: false, error: "Thi\u1EBFu th\xF4ng tin ng\u01B0\u1EDDi ch\u01A1i c\u1EA7n th\u1EE5 \xE1n" });
    return;
  }
  const cleanUser = String(username).trim();
  const user = getUserByDisplayNameOrUsername(cleanUser) || (userId ? serverUsers.get(userId) : null);
  const targetPlayerName = displayName?.trim() || user?.displayName || user?.username || cleanUser;
  const cleanReason = String(reason || "B\u1EA5t th\u01B0\u1EDDng t\u1EA7n s\u1ED1 g\xF5 ph\xEDm / Nghi v\u1EA5n Auto Macro").trim();
  const banRecord = executeApplyBan({
    username: user?.username || cleanUser,
    userId: user?.id || userId,
    reason: cleanReason,
    durationMs
  });
  const decree = broadcastHeavenlyDaoEvent({
    title: "B\xC0N C\u1ED4 TR\u1EEANG PH\u1EA0T",
    eventType: "penalty",
    targetUser: targetPlayerName,
    content: `B\xE0n C\u1ED5 Kh\xED T\u1EE9c ch\u1EA5n \u0111\u1ED9ng! Ngh\u1ECBch \u0111\u1ED3 @${targetPlayerName} d\xE1m thi tri\u1EC3n t\xE0 thu\u1EADt gian l\u1EADn (${cleanReason})! B\xE0n C\u1ED5 Th\u1EA7n Th\u1EE9c h\u1EA1 l\u1EC7nh ph\u1EBF tr\u1EEB 500 Tu Vi, phong \u1EA5n kinh m\u1EA1ch v\xE0 \u0111\xE0y v\xE0o U Minh H\xE0n Ng\u1EE5c (C\u1EA5m thi \u0111\u1EA5u 2 gi\u1EDD) \u0111\u1EC3 t\u1EF1 h\u1ED1i l\u1ED7i!`,
    highlightText: `B\xE0n C\u1ED5 ph\u1EA1t ${targetPlayerName} (2 gi\u1EDD)`,
    personaId: "ban_co",
    generateAiPoem: false
  });
  res.json({ success: true, banRecord, decree });
});
app.get("/api/user/ban-status", (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    const query = req.query || {};
    const username = String(query.username || "").trim();
    const userId = String(query.userId || "").trim();
    const headers = req.headers || {};
    const authHeader = typeof headers.authorization === "string" ? headers.authorization : void 0;
    const user = authHeader ? getUserByToken(authHeader) : null;
    let banCheck = username ? checkIsBanned(username) : { isBanned: false, remainingMs: 0, remainingMinutes: 0 };
    if (!banCheck.isBanned && userId) {
      banCheck = checkIsBanned(userId);
    }
    if (!banCheck.isBanned && user) {
      if (user.username) {
        banCheck = checkIsBanned(user.username);
      }
      if (!banCheck.isBanned && user.id) {
        banCheck = checkIsBanned(user.id);
      }
    }
    return res.json({
      success: true,
      ...banCheck
    });
  } catch (err) {
    console.error("Error handling /api/user/ban-status:", err);
    return res.json({
      success: true,
      isBanned: false,
      remainingMs: 0,
      remainingMinutes: 0
    });
  }
});
app.post("/api/admin/unban", (req, res) => {
  const { username, userId } = req.body || {};
  if (username) {
    serverBans.delete(String(username).toLowerCase());
    const u = getUserByUsername(username);
    if (u) {
      delete u.bannedUntil;
      delete u.banReason;
      delete u.bannedDurationMs;
      saveUsersToFile();
    }
  }
  if (userId) {
    serverBans.delete(String(userId).toLowerCase());
    const u = serverUsers.get(userId);
    if (u) {
      delete u.bannedUntil;
      delete u.banReason;
      delete u.bannedDurationMs;
      saveUsersToFile();
    }
  }
  saveBansToFile();
  res.json({ success: true, message: "\u0110\xE3 h\xF3a gi\u1EA3i phong \u1EA5n B\xE0n C\u1ED5 Th\u1EA7n Th\u1EE9c th\xE0nh c\xF4ng!" });
});
app.post("/api/dao/oracle", async (req, res) => {
  const { question, username, personaId } = req.body;
  const targetUser = resolvePlayerDisplayName(username);
  const q = question ? String(question).trim() : "";
  if (!q) {
    res.status(400).json({ success: false, error: "C\xE2u h\u1ECFi kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng" });
    return;
  }
  const isLinhLung = personaId === "linh_lung" || /linh\s*lung|tiên\s*đồng/i.test(q);
  const isBanCo = personaId === "ban_co" || /bàn\s*cổ/i.test(q);
  const linhLungPool = [
    `\xAB Linh Lung M\xE1ch N\u01B0\u1EDBc \xBB: Hi hi, \u0111\u1EA1o h\u1EEFu ${targetUser}! Ti\xEAn \u0110\u1ED3ng ng\xF3 qua Phong Th\u1EA7n B\u1EA3ng th\u1EA5y ng\xF3n tay c\u1EE7a \u0111\u1EA1o h\u1EEFu \u0111ang d\u1ED3i d\xE0o linh l\u1EF1c \u0111\xF3! Mau v\xE0o l\xE0m li\u1EC1n 3 v\xE1n ch\u1EBF \u0111\u1ED9 Ng\u1EABu H\u1EE9ng ho\u1EB7c S\u0103n Boss, \u0111i\u1EC3m b\xF9ng n\u1ED5 WPM \u0111ang ch\u1EDD \u0111\xF3n k\xECa! \u{1FAB7}`,
    `\xAB Ti\xEAn \u0110\u1ED3ng Ch\u1EC9 \u0110i\u1EC3m \xBB: \xC1i ch\xE0, \u0111\u1EA1o h\u1EEFu hay b\u1ECB v\u1EA5p \u1EDF m\u1EA5y t\u1EEB gh\xE9p telex \u0111\xFAng kh\xF4ng n\xE8? Nh\u1EDB th\u1EA3 l\u1ECFng hai vai, nh\u1ECBp g\xF5 \u0111\u1EC1u \u0111\u1EB7n nh\u01B0 g\u1EA3y \u0111\xE0n tranh. G\xF5 \u0111\xFAng t\u1EEBng ch\u1EEF th\xEC t\u1ED1c \u0111\u1ED9 t\u1EF1 kh\u1EAFc v\xFAt bay nh\u01B0 ti\xEAn ki\u1EBFm! \u2728`,
    `\xAB Phong Th\u1EA7n C\u01A1 M\u1EADt \xBB: B\xED k\xEDp \u0111\u1ED9c quy\u1EC1n c\u1EE7a Ti\xEAn \u0110\u1ED3ng \u0111\xE2y: Mu\u1ED1n leo top B\u1EA3ng V\xE0ng th\xEC 10 gi\xE2y \u0111\u1EA7u \u0111\u1EEBng ham g\xF5 nhanh, gi\u1EEF \u0111\u1ED9 ch\xEDnh x\xE1c tuy\u1EC7t \u0111\u1ED1i 100% \u0111\u1EC3 t\xEDch t\u1EE5 ki\u1EBFm th\u1EBF, sau \u0111\xF3 m\u1EDBi t\u0103ng t\u1ED1c th\xEC \u0111\u1ED1i th\u1EE7 ch\u1EC9 c\xF3 h\xEDt kh\xF3i! \u{1FAB7}`,
    `\xAB Linh Lung Soi Qu\u1EBB \xBB: Qu\u1EBB h\xF4m nay: \u0110\u1EA1i C\xE1t! C\xE1c ng\xF3n tr\u1ECF v\xE0 ng\xF3n gi\u1EEFa linh ho\u1EA1t tuy\u1EC7t \u0111\u1ED1i, r\u1EA5t h\u1EE3p \u0111\u1EC3 chinh ph\u1EE5c c\xE1c t\u1EEB hi\u1EC3m h\xF3c. Mau mau l\xEAn \u0111\u1ED3 so t\xE0i \u0111i n\xE0o! \u{1F389}`,
    `\xAB Ti\xEAn \u0110\u1ED3ng Nh\u1EAFc Nh\u1EDF \xBB: G\xF5 5 v\xE1n r\u1ED3i th\xEC nh\u1EDB bu\xF4ng chu\u1ED9t nh\u1EA5p ng\u1EE5m n\u01B0\u1EDBc \u1EA5m, ch\u1EDBp m\u1EAFt th\u01B0 gi\xE3n nha! M\u1EAFt s\xE1ng tay d\u1EBBo th\xEC m\u1EDBi tr\u01B0\u1EDDng k\u1EF3 tu ti\xEAn tr\xEAn Phong Th\u1EA7n B\u1EA3ng \u0111\u01B0\u1EE3c ch\u1EDB! \u{1F375}`
  ];
  const huyenThienPool = [
    `\xAB Kh\xED Linh Chi\u1EBFu M\u1EC7nh \xBB: \u0110\u1EA1o h\u1EEFu ${targetUser}, th\u1EA7n th\u1EE9c quan tr\u1EAFc h\xF4m nay v\u1EADn kh\xED hanh th\xF4ng, ng\xF3n tay linh ho\u1EA1t nh\u01B0 gi\xF3 l\u1ED1c! H\xE3y thi \u0111\u1EA5u ngay 3 v\xE1n ch\u1EBF \u0111\u1ED9 TV C\xF3 D\u1EA5u \u0111\u1EC3 \u0111\xF3n \u0111\u1EA7u l\xF4i ki\u1EBFp \u0111\u1ED9t ph\xE1 WPM!`,
    `\xAB Thi\xEAn \u0110\u1EA1o Ch\u1EC9 \u0110i\u1EC3m \xBB: B\xECnh c\u1EA3nh hi\u1EC7n t\u1EA1i kh\xF4ng n\u1EB1m \u1EDF t\u1ED1c \u0111\u1ED9 b\xE0n tay m\xE0 \u1EDF \u0111\u1EA1o t\xE2m n\xF4n n\xF3ng. H\xE3y gi\u1EEF nh\u1ECBp th\u1EDF \u0111i\u1EC1u h\xF2a, \u01B0u ti\xEAn \u0111\u1ED9 ch\xEDnh x\xE1c 100% trong 15 gi\xE2y \u0111\u1EA7u m\u1ED7i v\xE1n \u0111\u1EC3 ph\xE1 v\u1EE1 gi\u1EDBi h\u1EA1n!`,
    `\xAB Th\u1EA7n Kh\xED Ban Ph\xFAc \xBB: Kh\xED Linh nh\u1EADn th\u1EA5y c\xE1c ng\xF3n tay c\u1EE7a \u0111\u1EA1o h\u1EEFu \u0111ang t\xEDch t\u1EE5 m\u1ECFi c\u01A1. H\xE3y xoay nh\u1EB9 c\u1ED5 tay theo chi\u1EC1u kim \u0111\u1ED3ng h\u1ED3 10 l\u1EA7n, b\u1EA5m ph\xEDm s\u1ED1 5 \u0111\u1ECBnh v\u1ECB t\xE2m th\u1EBF tr\u01B0\u1EDBc khi v\xE0o tr\u1EADn ti\u1EBFp theo!`,
    `\xAB \u0110\u1EA1o C\u01A1 Th\u1EA5u Th\u1ECB \xBB: Mu\u1ED1n v\u01B0\u1EE3t qua m\u1ED1c 100 WPM, h\xE3y t\u1EADp bu\xF4ng ph\xEDm nguy\xEAn \xE2m d\u1EE9t kho\xE1t tr\u01B0\u1EDBc khi g\xF5 ph\xEDm d\u1EA5u thanh. B\u1ED9 \u0111\u1EC7m Telex th\xF4ng su\u1ED1t \u1EAFt ki\u1EBFm kh\xED t\u1EF1 sinh!`,
    `\xAB Thi\xEAn M\u1EC7nh Huy\u1EC1n C\u01A1 \xBB: Tu luy\u1EC7n g\xF5 ph\xEDm nh\u01B0 \u0111\xFAc ki\u1EBFm ng\xE0n n\u0103m. Tr\xE1nh xa c\xE1c t\xE0 ni\u1EC7m gian l\u1EADn hay auto click, t\xEDch l\u0169y t\u1EEBng k\xFD t\u1EF1 chu\u1EA9n x\xE1c ch\xEDnh l\xE0 \u0111\u1EA1i \u0111\u1EA1o quang minh!`
  ];
  const heuristicPool = isLinhLung ? linhLungPool : huyenThienPool;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || isGeminiProjectAccessDenied) {
    const fallback2 = heuristicPool[Math.floor(Math.random() * heuristicPool.length)];
    res.json({ success: true, answer: fallback2, source: "heuristic" });
    return;
  }
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { "User-Agent": "aistudio-build" }
      }
    });
    const targetBot = isLinhLung ? {
      name: "Linh Lung Ti\xEAn \u0110\u1ED3ng",
      title: "Ch\u01B0\u1EDFng Qu\u1EA3n Phong Th\u1EA7n B\u1EA3ng",
      pronoun: "Ti\xEAn \u0110\u1ED3ng (ho\u1EB7c B\u1EA3n Ti\xEAn \u0110\u1ED3ng)",
      callUser: "\u0110\u1EA1o H\u1EEFu, Huynh \u0111\xE0i, T\u1EF7 t\u1EF7 ho\u1EB7c Ki\u1EBFm kh\xE1ch",
      prefix: "\xAB Linh Lung Ch\u1EC9 \u0110i\u1EC3m \xBB",
      style: "Ho\u1EA1t b\xE1t, tinh ngh\u1ECBch, l\xE9m l\u1EC9nh, th\xEDch b\xECnh ph\u1EA9m Phong Th\u1EA7n B\u1EA3ng, \u0111\u01B0a ra l\u1EDDi khuy\xEAn g\xF5 ph\xEDm c\u1EF1c k\u1EF3 ch\xEDnh x\xE1c v\xE0 th\u1EF1c t\u1EBF, d\xF9ng icon \u{1FAB7} ho\u1EB7c \u2728"
    } : isBanCo ? {
      name: "B\xE0n C\u1ED5 Th\u1EA7n Th\u1EE9c",
      title: "Gi\xE1m Gi\u1EDBi Th\u1EA7n Qu\xE2n",
      pronoun: "B\u1EA3n T\xF4n",
      callUser: "H\u1EADu b\u1ED1i, Ti\u1EC3u h\u1EEFu",
      prefix: "\xAB Th\u1EA7n Qu\xE2n S\u1EA5m Truy\u1EC1n \xBB",
      style: "Uy nghi\xEAm, tr\u1EA7m m\u1EB7c, kh\xED kh\xE1i th\xE1i c\u1ED5 h\xF9ng v\u0129"
    } : {
      name: "Huy\u1EC1n Thi\xEAn Kh\xED Linh",
      title: "Thi\xEAn \u0110\u1EA1o Ch\u1EA5p Ph\xE1p S\u1EE9",
      pronoun: "B\u1EA3n T\xF2a",
      callUser: "\u0110\u1EA1o H\u1EEFu, Ti\xEAn H\u1EEFu",
      prefix: "\xAB Thi\xEAn \u0110\u1EA1o Ch\u1EC9 \u0110i\u1EC3m \xBB",
      style: "Nghi\xEAm minh, th\u1EA5u th\u1ECB c\xE0n kh\xF4n, n\xF3i l\u1EDDi s\u1EA5m truy\u1EC1n huy\u1EC1n huy\u1EC5n"
    };
    const prompt = `B\u1EA1n l\xE0 ${targetBot.name} (${targetBot.title}) c\u1EE7a \u0111\u1EA5u tr\u01B0\u1EDDng tu ti\xEAn g\xF5 ph\xEDm FastTyping Challenge.
Ng\u01B0\u1EDDi ch\u01A1i h\u1ECFi: "${q}" (T\xEAn ng\u01B0\u1EDDi ch\u01A1i: ${targetUser}).

H\xE3y tr\u1EA3 l\u1EDDi v\u1EDBi \u0111\xFAng phong c\xE1ch v\xE0 t\u01B0 c\xE1ch c\u1EE7a ${targetBot.name}:
- T\u1EF1 x\u01B0ng: "${targetBot.pronoun}".
- G\u1ECDi ng\u01B0\u1EDDi ch\u01A1i: "${targetBot.callUser}".
- Phong c\xE1ch: ${targetBot.style}.
- B\u1EAFt \u0111\u1EA7u c\xE2u tr\u1EA3 l\u1EDDi b\u1EB1ng: ${targetBot.prefix}: 
- \u0110\u1ED9 d\xE0i: Kho\u1EA3ng 2 \u0111\u1EBFn 4 c\xE2u v\u0103n sinh \u0111\u1ED9ng, s\xFAc t\xEDch, t\u1EA1o h\u1EE9ng kh\u1EDFi tu luy\u1EC7n.
- \u0110\u01B0a ra l\u1EDDi khuy\xEAn CH\xCDNH X\xC1C V\xC0 TH\u1EF0C T\u1EBE v\u1EC1 k\u1EF9 n\u0103ng g\xF5 ph\xEDm (b\u1ED9 g\xF5 Telex, nh\u1ECBp th\u1EDF, \u0111\u1ED9 ch\xEDnh x\xE1c, gi\u1EEF c\u1ED5 tay th\u1EA3 l\u1ECFng, c\xE1ch s\u1EEDa l\u1ED7i, m\u1EB9o leo b\u1EA3ng v\xE0ng...).`;
    const text = await callGeminiResilient(ai, prompt);
    if (text) {
      res.json({ success: true, answer: text, source: "gemini" });
      return;
    }
  } catch {
  }
  const fallback = heuristicPool[Math.floor(Math.random() * heuristicPool.length)];
  res.json({ success: true, answer: fallback, source: "heuristic_fallback" });
});
app.get("/api/online-count", (req, res) => {
  const tabId = String(req.query.tabId || "").trim();
  const userId = String(req.query.userId || "").trim();
  if (tabId) {
    const meta = extractSessionMetaFromReq(req);
    registerPresence(tabId, userId, meta);
  }
  res.json({ success: true, count: getRealOnlineCount() });
});
app.all("/api/presence/ping", (req, res) => {
  const tabId = String(req.query.tabId || req.body?.tabId || "").trim();
  const userId = String(req.query.userId || req.body?.userId || "").trim();
  if (tabId) {
    const meta = extractSessionMetaFromReq(req);
    registerPresence(tabId, userId, meta);
  }
  res.json({ success: true, count: getRealOnlineCount() });
});
app.all("/api/presence/leave", (req, res) => {
  const tabId = String(req.query.tabId || req.body?.tabId || "").trim();
  if (tabId) {
    removePresence(tabId);
  }
  res.json({ success: true, count: getRealOnlineCount() });
});
app.get("/api/admin/online-users", (_req, res) => {
  cleanStaleSessions();
  const usersByUniqueKey = /* @__PURE__ */ new Map();
  for (const session of activePresenceSessions.values()) {
    let roomInfo = null;
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
          isSurrendered: playerInRoom?.isSurrendered || false
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
        roomInfo
      });
    } else {
      const existing = usersByUniqueKey.get(userKey);
      existing.tabCount += 1;
      if (session.currentRoomId && !existing.currentRoomId) {
        existing.currentRoomId = session.currentRoomId;
        existing.roomInfo = roomInfo;
      }
      if (session.lastSeen > existing.lastSeen) {
        existing.lastSeen = session.lastSeen;
        existing.status = session.status;
        if (session.username && !session.username.startsWith("Kh\xE1ch ")) {
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
    users
  });
});
app.get("/api/admin/system-stats", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  cleanStaleSessions();
  const mem = process.memoryUsage();
  res.json({
    success: true,
    onlineCount: getRealOnlineCount(),
    totalConnections: activePresenceSessions.size,
    activeRoomsCount: rooms.size,
    totalRegisteredUsers: serverUsers.size,
    serverUptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    memoryUsage: {
      rssMb: Math.round(mem.rss / 1024 / 1024 * 10) / 10,
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10,
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024 * 10) / 10
    },
    systemTime: Date.now()
  });
});
app.get("/api/admin/user-stats", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  cleanStaleSessions();
  const now = Date.now();
  const activeUsersMap = /* @__PURE__ */ new Map();
  let inMatchCount = 0;
  let inRoomWaitingCount = 0;
  let inLobbyCount = 0;
  for (const session of activePresenceSessions.values()) {
    let roomInfo = null;
    let userState = "in_lobby";
    if (session.currentRoomId) {
      const norm = normalizeRoomCode(session.currentRoomId);
      const r = rooms.get(norm);
      if (r) {
        const playerInRoom = r.players.find((p) => p.id === session.userId);
        if (r.status === "playing") {
          userState = "in_match";
        } else {
          userState = "in_room";
        }
        roomInfo = {
          roomId: r.id,
          mode: r.mode,
          modeName: getModeDisplayName(r.mode),
          roomStatus: r.status,
          isHost: r.hostId === session.userId,
          playerCount: r.players.length,
          playerWpm: playerInRoom?.wpm || 0,
          playerProgress: playerInRoom?.progress || 0
        };
      }
    }
    const key = getUniqueUserKey(session);
    if (!activeUsersMap.has(key)) {
      activeUsersMap.set(key, {
        userId: session.userId,
        username: session.username,
        avatar: session.avatar || "\u{1F464}",
        frame: session.frame || "default",
        bestWpm: session.bestWpm || 0,
        totalGames: session.totalGames || 0,
        currentRoomId: session.currentRoomId || null,
        currentMode: session.currentMode || "solo",
        userState,
        roomInfo,
        browser: session.browser || "Web",
        device: session.device || "Desktop",
        connectedAt: session.connectedAt || now,
        lastSeen: session.lastSeen || now,
        isAdmin: Boolean(session.isAdmin)
      });
      if (userState === "in_match") inMatchCount++;
      else if (userState === "in_room") inRoomWaitingCount++;
      else inLobbyCount++;
    } else {
      const existing = activeUsersMap.get(key);
      if (session.currentRoomId && !existing.currentRoomId) {
        existing.currentRoomId = session.currentRoomId;
        existing.roomInfo = roomInfo;
        existing.userState = userState;
      }
      if (session.lastSeen > existing.lastSeen) {
        existing.lastSeen = session.lastSeen;
        if (session.username && !session.username.startsWith("Kh\xE1ch ")) {
          existing.username = session.username;
        }
      }
    }
  }
  const activePlayersList = Array.from(activeUsersMap.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  const realtimeActivePlayersCount = activePlayersList.length;
  let totalMatchesPlayed = 0;
  let highestUserMatches = 0;
  let topMatchesPlayer = null;
  const userMatchRankings = [];
  for (const u of serverUsers.values()) {
    const games = Number(u.totalGames || 0);
    totalMatchesPlayed += games;
    userMatchRankings.push({
      id: u.id,
      username: u.username,
      avatar: u.avatar || "\u{1F464}",
      frame: u.frame || "default",
      totalGames: games,
      bestWpm: u.bestWpm || 0,
      realmName: u.cultivation?.currentRealm?.name || "Luy\u1EC7n Kh\xED K\u1EF3"
    });
    if (games > highestUserMatches) {
      highestUserMatches = games;
      topMatchesPlayer = {
        username: u.username,
        totalGames: games,
        bestWpm: u.bestWpm || 0,
        avatar: u.avatar || "\u{1F464}"
      };
    }
  }
  userMatchRankings.sort((a, b) => b.totalGames - a.totalGames);
  const bannedAccountsList = [];
  const seenBannedUsernames = /* @__PURE__ */ new Set();
  for (const b of serverBans.values()) {
    if (b && b.bannedUntil > now) {
      const lower = b.username.toLowerCase();
      if (!seenBannedUsernames.has(lower)) {
        seenBannedUsernames.add(lower);
        const rem = Math.max(0, Math.ceil((b.bannedUntil - now) / 6e4));
        const uRecord = getUserByUsername(b.username);
        bannedAccountsList.push({
          username: b.username,
          userId: b.userId || uRecord?.id,
          reason: b.reason || "Vi ph\u1EA1m \u0111i\u1EC1u l\u1EC7 \u0110\u1EA1o Gi\u1EDBi",
          bannedAt: b.bannedAt || now,
          bannedUntil: b.bannedUntil,
          remainingMinutes: rem,
          isPermanent: rem > 5e5,
          avatar: uRecord?.avatar || "\u26A0\uFE0F"
        });
      }
    }
  }
  bannedAccountsList.sort((a, b) => b.remainingMinutes - a.remainingMinutes);
  const currentBannedCount = bannedAccountsList.length;
  const totalRegisteredUsers = serverUsers.size;
  const avgMatchesPerUser = totalRegisteredUsers > 0 ? Math.round(totalMatchesPlayed / totalRegisteredUsers * 10) / 10 : 0;
  const activeRatePercent = totalRegisteredUsers > 0 ? Math.min(100, Math.round(realtimeActivePlayersCount / totalRegisteredUsers * 1e3) / 10) : 0;
  const bannedRatePercent = totalRegisteredUsers > 0 ? Math.min(100, Math.round(currentBannedCount / totalRegisteredUsers * 1e3) / 10) : 0;
  res.json({
    success: true,
    timestamp: now,
    realtimeActivePlayers: {
      count: realtimeActivePlayersCount,
      inMatch: inMatchCount,
      inRoomWaiting: inRoomWaitingCount,
      inLobby: inLobbyCount,
      totalConnections: activePresenceSessions.size,
      activeRooms: rooms.size,
      players: activePlayersList
    },
    totalMatches: {
      count: totalMatchesPlayed,
      avgPerUser: avgMatchesPerUser,
      topMatchesPlayer,
      topRankings: userMatchRankings.slice(0, 10)
    },
    bannedAccounts: {
      count: currentBannedCount,
      bannedRatePercent,
      list: bannedAccountsList
    },
    summary: {
      totalRegisteredUsers,
      activeRatePercent
    }
  });
});
app.get("/api/admin/users", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const userList = [];
  for (const [id, u] of serverUsers.entries()) {
    const banCheck = checkIsBanned(u.username);
    userList.push({
      id: u.id || id,
      username: u.username,
      displayName: u.displayName || u.username,
      email: u.email,
      avatar: u.avatar || "\u{1F464}",
      frame: u.frame || "default",
      isAdmin: Boolean(u.isAdmin),
      isVerified: Boolean(u.isVerified),
      createdAt: u.createdAt || Date.now(),
      bestWpm: u.bestWpm || 0,
      totalGames: u.totalGames || 0,
      isBanned: banCheck.isBanned,
      remainingMinutes: banCheck.remainingMinutes,
      banReason: banCheck.record?.reason || "",
      cultivationRealm: u.cultivation?.currentRealm?.name || "Luy\u1EC7n Kh\xED K\u1EF3",
      cultivationTier: u.cultivation?.currentTier || 1,
      spiritStones: u.cultivation?.spiritStones || 0
    });
  }
  userList.sort((a, b) => {
    if (a.isAdmin && !b.isAdmin) return -1;
    if (!a.isAdmin && b.isAdmin) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
  res.json({
    success: true,
    total: userList.length,
    users: userList
  });
});
app.post("/api/admin/users/action", (req, res) => {
  const { action, username, userId, reason, durationMs, spiritStones, exp, newPassword } = req.body || {};
  const targetUsername = String(username || "").trim();
  if (!targetUsername && !userId) {
    res.status(400).json({ success: false, error: "Thi\u1EBFu \u0111\u1ECBnh danh ng\u01B0\u1EDDi ch\u01A1i" });
    return;
  }
  const user = getUserByUsername(targetUsername) || (userId ? serverUsers.get(userId) : null);
  if (action === "ban") {
    const ms = Number(durationMs) || 2 * 60 * 60 * 1e3;
    const cleanReason = String(reason || "Quy\u1EBFt \u0111\u1ECBnh t\u1EEB Ban Qu\u1EA3n Tr\u1ECB H\u1EC7 Th\u1ED1ng").trim();
    const targetDisplayName = user?.displayName || req.body?.displayName || user?.username || targetUsername || "Ng\u01B0\u1EDDi ch\u01A1i";
    executeApplyBan({
      username: targetUsername || user?.username || "Ng\u01B0\u1EDDi ch\u01A1i",
      userId: user?.id || userId,
      reason: cleanReason,
      durationMs: ms
    });
    broadcastHeavenlyDaoEvent({
      title: "L\u1EC6NH TR\u1EEANG PH\u1EA0T ADMIN",
      eventType: "penalty",
      targetUser: targetDisplayName,
      content: `Ban Qu\u1EA3n Tr\u1ECB ra quy\u1EBFt \u0111\u1ECBnh x\u1EED ph\u1EA1t @${targetDisplayName}: ${cleanReason} (Th\u1EDDi h\u1EA1n: ${Math.round(ms / 6e4)} ph\xFAt).`,
      highlightText: `Admin ph\u1EA1t ${targetDisplayName}`,
      personaId: "ban_co"
    });
    res.json({ success: true, message: `\u0110\xE3 c\u1EA5m t\xE0i kho\u1EA3n ${targetDisplayName} th\xE0nh c\xF4ng!` });
    return;
  }
  if (action === "unban") {
    if (targetUsername) serverBans.delete(targetUsername.toLowerCase());
    if (user?.id) serverBans.delete(user.id.toLowerCase());
    if (userId) serverBans.delete(String(userId).toLowerCase());
    if (user) {
      delete user.bannedUntil;
      delete user.banReason;
      delete user.bannedDurationMs;
      saveUsersToFile();
    }
    saveBansToFile();
    const targetDisplayName = user?.displayName || user?.username || targetUsername;
    res.json({ success: true, message: `\u0110\xE3 g\u1EE1 c\u1EA5m cho ${targetDisplayName}!` });
    return;
  }
  if (action === "toggle_admin") {
    if (!user) {
      res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n \u0111\u1EC3 ph\xE2n quy\u1EC1n" });
      return;
    }
    if (user.id === "usr_admin_default" || user.username === "admin") {
      res.status(400).json({ success: false, error: "Kh\xF4ng th\u1EC3 thay \u0111\u1ED5i quy\u1EC1n t\xE0i kho\u1EA3n Admin g\u1ED1c!" });
      return;
    }
    user.isAdmin = !user.isAdmin;
    saveUsersToFile();
    const targetDisplayName = user.displayName || user.username;
    res.json({
      success: true,
      isAdmin: user.isAdmin,
      message: user.isAdmin ? `\u0110\xE3 th\u0103ng c\u1EA5p ${targetDisplayName} th\xE0nh Qu\u1EA3n Tr\u1ECB Vi\xEAn!` : `\u0110\xE3 h\u1EA1 quy\u1EC1n ${targetDisplayName} v\u1EC1 Th\xE0nh Vi\xEAn th\u01B0\u1EDDng!`
    });
    return;
  }
  if (action === "reward") {
    if (!user) {
      res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n ng\u01B0\u1EDDi ch\u01A1i" });
      return;
    }
    if (!user.cultivation) {
      user.cultivation = {};
    }
    if (spiritStones) {
      user.cultivation.spiritStones = Math.max(0, (user.cultivation.spiritStones || 0) + Number(spiritStones));
      user.cultivation.linhThach = Math.max(0, (user.cultivation.linhThach || 0) + Number(spiritStones));
    }
    if (exp) {
      user.cultivation.cultivationExp = Math.max(0, (user.cultivation.cultivationExp || 0) + Number(exp));
      user.cultivation.exp = Math.max(0, (user.cultivation.exp || 0) + Number(exp));
    }
    saveUsersToFile();
    const targetDisplayName = user.displayName || user.username;
    res.json({
      success: true,
      cultivation: user.cultivation,
      message: `\u0110\xE3 ban th\u01B0\u1EDFng t\xE0i nguy\xEAn th\xE0nh c\xF4ng cho ${targetDisplayName}!`
    });
    return;
  }
  if (action === "reset_password") {
    if (!user) {
      res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n" });
      return;
    }
    const newPwd = String(newPassword || "fasttyping123").trim();
    const salt = crypto2.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(newPwd, salt);
    user.passwordHash = passwordHash;
    user.salt = salt;
    saveUsersToFile();
    const targetDisplayName = user.displayName || user.username;
    res.json({
      success: true,
      message: `\u0110\xE3 \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u cho ${targetDisplayName} th\xE0nh c\xF4ng! M\u1EADt kh\u1EA9u m\u1EDBi: ${newPwd}`
    });
    return;
  }
  if (action === "delete") {
    if (!user) {
      res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n ng\u01B0\u1EDDi ch\u01A1i \u0111\u1EC3 x\xF3a" });
      return;
    }
    if (user.id === "usr_admin_default" || user.username.toLowerCase() === "admin") {
      res.status(400).json({ success: false, error: "Kh\xF4ng \u0111\u01B0\u1EE3c ph\xE9p x\xF3a t\xE0i kho\u1EA3n Admin g\u1ED1c!" });
      return;
    }
    const deletedUsername = user.username;
    const deletedUserId = user.id;
    const deletedDisplayName = user.displayName || user.username;
    serverUsers.delete(deletedUserId);
    for (const [k, u] of serverUsers.entries()) {
      if (u.id === deletedUserId || u.username.toLowerCase() === deletedUsername.toLowerCase()) {
        serverUsers.delete(k);
      }
    }
    saveUsersToFile();
    serverBans.delete(deletedUsername.toLowerCase());
    serverBans.delete(deletedUserId.toLowerCase());
    if (userId) serverBans.delete(String(userId).toLowerCase());
    saveBansToFile();
    for (const [sessId, session] of activePresenceSessions.entries()) {
      if (session.userId === deletedUserId || session.username.toLowerCase() === deletedUsername.toLowerCase()) {
        activePresenceSessions.delete(sessId);
      }
    }
    try {
      let sectChanged = false;
      for (const sect of serverSects.values()) {
        if (sect.members && Array.isArray(sect.members)) {
          const beforeCount = sect.members.length;
          sect.members = sect.members.filter((m) => m.userId !== deletedUserId && m.username.toLowerCase() !== deletedUsername.toLowerCase());
          if (sect.members.length !== beforeCount) {
            sect.memberCount = sect.members.length;
            sectChanged = true;
          }
        }
      }
      if (sectChanged) {
        saveSectsToFile();
      }
    } catch (e) {
      console.error("Error cleaning sect membership for deleted user:", e);
    }
    broadcastHeavenlyDaoEvent({
      title: "L\u1EC6NH TR\u1EA2M QUY\u1EBET ADMIN",
      eventType: "penalty",
      targetUser: deletedDisplayName,
      content: `Ban Qu\u1EA3n Tr\u1ECB \u0111\xE3 x\xF3a v\u0129nh vi\u1EC5n t\xE0i kho\u1EA3n @${deletedDisplayName} kh\u1ECFi h\u1EC7 th\u1ED1ng \u0110\u1EA1o Gi\u1EDBi.`,
      highlightText: `X\xF3a v\u0129nh vi\u1EC5n @${deletedDisplayName}`,
      personaId: "ban_co"
    });
    res.json({ success: true, message: `\u0110\xE3 x\xF3a v\u0129nh vi\u1EC5n t\xE0i kho\u1EA3n @${deletedDisplayName} kh\u1ECFi h\u1EC7 th\u1ED1ng th\xE0nh c\xF4ng!` });
    return;
  }
  res.status(400).json({ success: false, error: "H\xE0nh \u0111\u1ED9ng kh\xF4ng h\u1EE3p l\u1EC7" });
});
app.get("/api/admin/rooms", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const roomList = Array.from(rooms.values()).map((r) => {
    const host = r.players.find((p) => p.id === r.hostId);
    return {
      id: r.id,
      code: r.id,
      name: `Ph\xF2ng #${r.id}`,
      mode: r.mode,
      modeName: getModeDisplayName(r.mode),
      difficulty: r.difficulty || "normal",
      status: r.status,
      hostId: r.hostId,
      hostName: r.hostName || host?.username || "V\xF4 Danh",
      maxSlots: r.maxSlots,
      playerCount: r.players.length,
      createdAt: r.createdAt || Date.now(),
      players: r.players.map((p) => ({
        id: p.id,
        name: p.username,
        avatar: p.icon,
        wpm: p.wpm || 0,
        progress: p.progress || 0,
        isHost: p.id === r.hostId,
        isReady: !p.inMatch,
        isFinished: p.isFinished,
        isSurrendered: p.isSurrendered
      }))
    };
  });
  res.json({
    success: true,
    totalRooms: roomList.length,
    rooms: roomList
  });
});
app.post("/api/admin/rooms/:id/close", (req, res) => {
  const rawId = req.params.id;
  const norm = normalizeRoomCode(rawId);
  const room = rooms.get(norm);
  if (!room) {
    res.status(404).json({ success: false, error: "Ph\xF2ng kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 gi\u1EA3i t\xE1n" });
    return;
  }
  const clients = sseClientsByRoom.get(room.id);
  if (clients) {
    const closeMsg = `data: ${JSON.stringify({ type: "ROOM_CLOSED_BY_ADMIN", reason: "Ph\xF2ng \u0111\xE3 \u0111\u01B0\u1EE3c gi\u1EA3i t\xE1n b\u1EDFi Ban Qu\u1EA3n Tr\u1ECB" })}

`;
    for (const client of clients) {
      try {
        client.write(closeMsg);
        client.end();
      } catch (_) {
      }
    }
    sseClientsByRoom.delete(room.id);
  }
  rooms.delete(norm);
  if (room.id !== norm) {
    rooms.delete(room.id);
  }
  res.json({ success: true, message: `\u0110\xE3 \u0111\xF3ng ph\xF2ng #${room.id} th\xE0nh c\xF4ng!` });
});
app.post("/api/admin/broadcast", (req, res) => {
  const { title, message, personaId = "admin" } = req.body || {};
  if (!message) {
    res.status(400).json({ success: false, error: "N\u1ED9i dung th\xF4ng b\xE1o kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng" });
    return;
  }
  const decree = broadcastHeavenlyDaoEvent({
    title: title || "TH\xD4NG B\xC1O T\u1EEA QU\u1EA2N TR\u1ECA VI\xCAN",
    eventType: "announcement",
    content: message,
    highlightText: title || "Th\xF4ng B\xE1o Admin",
    personaId: personaId === "admin" ? "huyen_thien" : personaId
  });
  res.json({ success: true, decree, message: "\u0110\xE3 ph\xE1t s\xF3ng th\xF4ng b\xE1o to\xE0n h\u1EC7 th\u1ED1ng th\xE0nh c\xF4ng!" });
});
app.get("/api/leaderboard/cultivation", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const now = Date.now();
  if (!lastCultivationLeaderboardUpdate || now - lastCultivationLeaderboardUpdate >= CULTIVATION_LEADERBOARD_INTERVAL_MS || req.query.force === "true") {
    buildCultivationLeaderboardSnapshot();
  }
  const authHeader = req.headers.authorization;
  let authUser = getUserByToken(authHeader);
  const targetUsername = String(req.query.username || (authUser ? authUser.username : "")).trim().toLowerCase();
  if (authUser && authUser.cultivation) {
    syncUserCultivationToCache(authUser);
  }
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
        exp: item.exp
      };
    }
  }
  const nextUpdate = lastCultivationLeaderboardUpdate + CULTIVATION_LEADERBOARD_INTERVAL_MS;
  const remainingSeconds = Math.max(0, Math.floor((nextUpdate - Date.now()) / 1e3));
  res.json({
    success: true,
    top50: cachedCultivationTop50,
    totalCount: cachedTotalCultivators,
    currentUserRank,
    currentUserActualCultivation,
    lastUpdated: lastCultivationLeaderboardUpdate,
    nextUpdate,
    remainingSeconds,
    updateInterval: CULTIVATION_LEADERBOARD_INTERVAL_MS
  });
});
function broadcastSectAnnouncement(message) {
  const msgId = `sect-ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const sysMsg = {
    id: msgId,
    username: "Huy\u1EC1n Thi\xEAn Kh\xED Linh",
    avatar: "\u262F\uFE0F",
    frame: "admin_gold",
    message,
    timestamp: Date.now(),
    channel: "global",
    isAdmin: true,
    isDaoBot: true,
    daoEventType: "announcement",
    daoTitle: "T\xF4ng M\xF4n L\u1EC7nh"
  };
  globalChatMessages.push(sysMsg);
  if (globalChatMessages.length > 200) globalChatMessages.shift();
  const payload = `data: ${JSON.stringify({ type: "new_chat_message", message: sysMsg })}

`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      client.write(payload);
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
    }
  }
}
app.get("/api/leaderboard/sects", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const sects = Array.from(serverSects.values()).map((s) => {
    recalculateSectStats(s);
    const topMembers = [...s.members || []].sort((a, b) => (b.tuViScore || 0) - (a.tuViScore || 0)).slice(0, 5);
    return {
      id: s.id,
      name: s.name,
      tag: s.tag,
      description: s.description,
      slogan: s.slogan,
      bannerColor: s.bannerColor,
      badgeIcon: s.badgeIcon,
      leaderId: s.leaderId,
      leaderName: s.leaderName,
      leaderAvatar: s.leaderAvatar || "\u{1F451}",
      leaderFrame: s.leaderFrame || "frame_xianxia_dokiep",
      leaderRealmName: s.leaderRealmName || "\u0110\u1ED9 Ki\u1EBFp K\u1EF3",
      leaderLevel: s.leaderLevel || 800,
      memberCount: s.members ? s.members.length : s.memberCount || 1,
      totalTuVi: s.totalTuVi || 1e6,
      avgLevel: s.avgLevel || 350,
      avgRealmName: s.avgRealmName || "H\xF3a Th\u1EA7n K\u1EF3",
      linhMachLevel: s.linhMachLevel || 1,
      totalContribution: s.totalContribution || 0,
      weeklyTournamentPoints: s.weeklyTournamentPoints || 0,
      isHoldingThienCung: Boolean(s.isHoldingThienCung),
      topMembers,
      members: s.members || [],
      createdAt: s.createdAt
    };
  });
  sects.sort((a, b) => b.totalTuVi - a.totalTuVi);
  const rankedSects = sects.map((s, index) => ({
    ...s,
    rank: index + 1
  }));
  res.json({
    success: true,
    topSects: rankedSects,
    totalSects: rankedSects.length,
    lastUpdated: Date.now()
  });
});
app.get("/api/sects", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const list = Array.from(serverSects.values()).map((s) => {
    recalculateSectStats(s);
    return s;
  });
  res.json({ success: true, sects: list });
});
app.post("/api/sects/create", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserByToken(authHeader);
  if (!user) {
    res.status(401).json({ success: false, error: "\u0110\u1EA1o h\u1EEFu c\u1EA7n \u0111\u0103ng nh\u1EADp \u0111\u1EC3 Khai S\u01A1n L\u1EADp Ph\xE1i!" });
    return;
  }
  const { name, tag, description, slogan, badgeIcon, bannerColor } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ success: false, error: "T\xEAn t\xF4ng m\xF4n kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng!" });
    return;
  }
  if (!tag || typeof tag !== "string" || !tag.trim()) {
    res.status(400).json({ success: false, error: "T\xF4ng Huy Hi\u1EC7u kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng!" });
    return;
  }
  const cleanName = name.trim().slice(0, 30);
  const cleanTag = tag.trim().toUpperCase().slice(0, 6);
  const cleanDesc = description && typeof description === "string" ? description.trim().slice(0, 200) : "M\u1ED9t t\xF4ng m\xF4n \u1EA9n th\u1EBF qu\u1EADt kh\u1EDFi t\u1EA1i c\xF5i tu ti\xEAn.";
  const cleanSlogan = slogan && typeof slogan === "string" ? slogan.trim().slice(0, 100) : "Khai S\u01A1n L\u1EADp Ph\xE1i \u2022 V\u1EA1n C\u1ED5 Tr\u01B0\u1EDDng T\u1ED3n";
  const cleanIcon = badgeIcon || "\u26A1";
  const cleanColor = bannerColor || "#f59e0b";
  for (const s of serverSects.values()) {
    if (s.name.toLowerCase() === cleanName.toLowerCase() || s.tag.toLowerCase() === cleanTag.toLowerCase()) {
      res.status(400).json({ success: false, error: "T\xEAn t\xF4ng m\xF4n ho\u1EB7c T\xF4ng Huy Hi\u1EC7u n\xE0y \u0111\xE3 c\xF3 ng\u01B0\u1EDDi s\u1EED d\u1EE5ng!" });
      return;
    }
  }
  const cult = user.cultivation || {};
  const userLevel = Math.max(1, Number(cult.level) || 1);
  const userLinhThach = Number(cult.linhThach) || 0;
  if (userLevel < 31) {
    res.status(400).json({ success: false, error: "C\u1EA7n \u0111\u1EA1t c\u1EA3nh gi\u1EDBi Tr\xFAc C\u01A1 K\u1EF3 tr\u1EDF l\xEAn m\u1EDBi c\xF3 th\u1EC3 Khai S\u01A1n L\u1EADp Ph\xE1i!" });
    return;
  }
  if (userLinhThach < 300) {
    res.status(400).json({ success: false, error: `Khai s\u01A1n l\u1EADp ph\xE1i c\u1EA7n 300 Linh Th\u1EA1ch, hi\u1EC7n c\xF3 ${userLinhThach}!` });
    return;
  }
  const realmIndex = Math.max(0, Math.min(11, Number(cult.realmIndex) || 0));
  const realmMeta = XIANXIA_REALM_METAS[realmIndex] || XIANXIA_REALM_METAS[0];
  const tier = Math.max(1, Number(cult.tier) || 1);
  const exp = Math.max(0, Number(cult.exp) || 0);
  const tuViScore = realmIndex * 1e6 + userLevel * 1e4 + tier * 1e3 + exp;
  cult.linhThach = userLinhThach - 300;
  const sectId = `sect_custom_${Date.now()}`;
  const founderMember = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    avatar: user.avatar || "\u{1F451}",
    frame: user.frame || realmMeta.frameId,
    role: "chuong_mon",
    contribution: 500,
    realmIndex,
    realmName: realmMeta.name,
    realmIcon: realmMeta.icon,
    level: userLevel,
    tier,
    exp,
    tuViScore,
    joinedAt: Date.now(),
    lastActive: Date.now()
  };
  const newSect = {
    id: sectId,
    name: cleanName,
    tag: cleanTag,
    description: cleanDesc,
    leaderId: user.id,
    leaderName: user.username,
    leaderAvatar: user.avatar || "\u{1F451}",
    leaderFrame: user.frame || realmMeta.frameId,
    leaderRealmName: realmMeta.name,
    leaderLevel: userLevel,
    linhMachLevel: 1,
    totalContribution: 500,
    memberCount: 1,
    totalTuVi: tuViScore,
    avgLevel: userLevel,
    avgRealmName: realmMeta.name,
    badgeIcon: cleanIcon,
    slogan: cleanSlogan,
    bannerColor: cleanColor,
    weeklyTournamentPoints: 0,
    weeklyWarPoints: 0,
    warContributors: {},
    isHoldingThienCung: false,
    worldBoss: {
      id: `boss_${sectId}`,
      name: "Th\xE1i C\u1ED5 H\u1EAFc Long",
      icon: "\u{1F409}",
      hp: 15e4,
      maxHp: 15e4,
      level: 10,
      isDefeated: false,
      lastResetTime: Date.now()
    },
    members: [founderMember],
    createdAt: Date.now()
  };
  serverSects.set(sectId, newSect);
  saveSectsToFile();
  cult.sect = {
    sectId: newSect.id,
    sectName: newSect.name,
    sectTag: newSect.tag,
    role: "chuong_mon",
    contribution: 500,
    joinedAt: Date.now()
  };
  if (!cult.historyLog) cult.historyLog = [];
  cult.historyLog.unshift(`\u{1F451} [KHAI S\u01A0N L\u1EACP PH\xC1I] Ch\xFAc m\u1EEBng \u0111\u1EA1o h\u1EEFu s\xE1ng l\u1EADp ${newSect.name} [${newSect.tag}], t\xF4n x\u01B0ng Ch\u01B0\u1EDFng M\xF4n!`);
  if (cult.historyLog.length > 20) cult.historyLog.pop();
  user.cultivation = cult;
  user.updatedAt = Date.now();
  serverUsers.set(user.id, user);
  saveUsersToFile();
  syncUserCultivationToCache(user);
  broadcastSectAnnouncement(`\u{1F451} [KHAI S\u01A0N L\u1EACP PH\xC1I] \u0110\u1EA1i n\u0103ng ${user.displayName || user.username} \u0111\xE3 khai s\u01A1n l\u1EADp ph\xE1i, s\xE1ng l\u1EADp t\xF4ng m\xF4n ${cleanName} [${cleanTag}] ch\u1EA5n \u0111\u1ED9ng to\xE0n c\xF5i Ti\xEAn Gi\u1EDBi!`);
  res.json({
    success: true,
    message: `Ch\xFAc m\u1EEBng \u0111\u1EA1o h\u1EEFu s\xE1ng l\u1EADp ${cleanName} [${cleanTag}], t\xF4n x\u01B0ng Ch\u01B0\u1EDFng M\xF4n!`,
    sect: newSect,
    cultivation: cult
  });
});
app.post("/api/sects/join", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserByToken(authHeader);
  if (!user) {
    res.status(401).json({ success: false, error: "\u0110\u1EA1o h\u1EEFu c\u1EA7n \u0111\u0103ng nh\u1EADp \u0111\u1EC3 b\xE1i nh\u1EADp m\xF4n ph\xE1i!" });
    return;
  }
  const { sectId } = req.body;
  const targetSect = serverSects.get(String(sectId));
  if (!targetSect) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y m\xF4n ph\xE1i n\xE0y!" });
    return;
  }
  const cult = user.cultivation || {};
  const oldSectId = cult.sect?.sectId;
  if (oldSectId === sectId) {
    res.json({ success: true, message: "\u0110\u1EA1o h\u1EEFu \u0111\xE3 l\xE0 th\xE0nh vi\xEAn c\u1EE7a m\xF4n ph\xE1i n\xE0y!", sect: targetSect, cultivation: cult });
    return;
  }
  if (oldSectId && serverSects.has(oldSectId)) {
    const oldSect = serverSects.get(oldSectId);
    oldSect.members = (oldSect.members || []).filter((m) => String(m.username || "").toLowerCase() !== String(user.username || "").toLowerCase());
    recalculateSectStats(oldSect);
  }
  const realmIndex = Math.max(0, Math.min(11, Number(cult.realmIndex) || 0));
  const realmMeta = XIANXIA_REALM_METAS[realmIndex] || XIANXIA_REALM_METAS[0];
  const userLevel = Math.max(1, Number(cult.level) || 1);
  const tier = Math.max(1, Number(cult.tier) || 1);
  const exp = Math.max(0, Number(cult.exp) || 0);
  const tuViScore = realmIndex * 1e6 + userLevel * 1e4 + tier * 1e3 + exp;
  const newMember = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    avatar: user.avatar || "\u26A1",
    frame: user.frame || realmMeta.frameId,
    role: "ngoai_mon",
    contribution: 50,
    realmIndex,
    realmName: realmMeta.name,
    realmIcon: realmMeta.icon,
    level: userLevel,
    tier,
    exp,
    tuViScore,
    joinedAt: Date.now(),
    lastActive: Date.now()
  };
  if (!targetSect.members) targetSect.members = [];
  targetSect.members = targetSect.members.filter((m) => String(m.username || "").toLowerCase() !== String(user.username || "").toLowerCase());
  targetSect.members.push(newMember);
  recalculateSectStats(targetSect);
  saveSectsToFile();
  cult.sect = {
    sectId: targetSect.id,
    sectName: targetSect.name,
    sectTag: targetSect.tag,
    role: "ngoai_mon",
    contribution: 50,
    joinedAt: Date.now()
  };
  if (!cult.historyLog) cult.historyLog = [];
  cult.historyLog.unshift(`\u{1F3F0} B\xE1i nh\u1EADp T\xF4ng M\xF4n: Ch\xFAc m\u1EEBng \u0111\u1EA1o h\u1EEFu tr\u1EDF th\xE0nh Ngo\u1EA1i M\xF4n \u0110\u1EC7 T\u1EED c\u1EE7a ${targetSect.name} [${targetSect.tag}]!`);
  if (cult.historyLog.length > 20) cult.historyLog.pop();
  user.cultivation = cult;
  user.updatedAt = Date.now();
  serverUsers.set(user.id, user);
  saveUsersToFile();
  syncUserCultivationToCache(user);
  res.json({
    success: true,
    message: `\u0110\xE3 b\xE1i nh\u1EADp ${targetSect.name} [${targetSect.tag}] th\xE0nh c\xF4ng!`,
    sect: targetSect,
    cultivation: cult
  });
});
app.post("/api/sects/leave", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserByToken(authHeader);
  if (!user) {
    res.status(401).json({ success: false, error: "\u0110\u1EA1o h\u1EEFu c\u1EA7n \u0111\u0103ng nh\u1EADp!" });
    return;
  }
  const cult = user.cultivation || {};
  const sectId = cult.sect?.sectId;
  if (!sectId || !serverSects.has(sectId)) {
    res.status(400).json({ success: false, error: "\u0110\u1EA1o h\u1EEFu hi\u1EC7n kh\xF4ng thu\u1ED9c m\xF4n ph\xE1i n\xE0o!" });
    return;
  }
  const sect = serverSects.get(sectId);
  if (cult.sect.role === "chuong_mon") {
    const otherMembers = (sect.members || []).filter((m) => String(m.username || "").toLowerCase() !== String(user.username || "").toLowerCase());
    if (otherMembers.length > 0) {
      res.status(400).json({ success: false, error: "Ch\u01B0\u1EDFng M\xF4n c\u1EA7n truy\u1EC1n v\u1ECB cho \u0111\u1ED3ng \u0111\u1EA1o kh\xE1c tr\u01B0\u1EDBc khi r\u1EDDi m\xF4n ph\xE1i!" });
      return;
    }
  }
  sect.members = (sect.members || []).filter((m) => String(m.username || "").toLowerCase() !== String(user.username || "").toLowerCase());
  recalculateSectStats(sect);
  saveSectsToFile();
  cult.sect = void 0;
  if (!cult.historyLog) cult.historyLog = [];
  cult.historyLog.unshift(`\u{1F6AA} [XU\u1EA4T S\u01AF THO\xC1I PH\xC1I] \u0110\u1EA1o h\u1EEFu \u0111\xE3 r\u1EDDi kh\u1ECFi m\xF4n ph\xE1i, tr\u1EDF v\u1EC1 th\xE2n ph\u1EADn t\xE1n tu.`);
  if (cult.historyLog.length > 20) cult.historyLog.pop();
  user.cultivation = cult;
  user.updatedAt = Date.now();
  serverUsers.set(user.id, user);
  saveUsersToFile();
  syncUserCultivationToCache(user);
  res.json({ success: true, message: "\u0110\xE3 r\u1EDDi m\xF4n ph\xE1i th\xE0nh c\xF4ng.", cultivation: cult });
});
app.post("/api/sects/role", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserByToken(authHeader);
  if (!user) {
    res.status(401).json({ success: false, error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp!" });
    return;
  }
  const { targetUsername, newRole } = req.body;
  const validRoles = ["chuong_mon", "dai_truong_lao", "chan_truyen", "noi_mon", "ngoai_mon"];
  if (!targetUsername || !newRole || !validRoles.includes(newRole)) {
    res.status(400).json({ success: false, error: "D\u1EEF li\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7!" });
    return;
  }
  const cult = user.cultivation || {};
  const sectId = cult.sect?.sectId;
  const callerRole = cult.sect?.role;
  if (!sectId || !serverSects.has(sectId)) {
    res.status(400).json({ success: false, error: "\u0110\u1EA1o h\u1EEFu kh\xF4ng c\xF3 m\xF4n ph\xE1i!" });
    return;
  }
  if (callerRole !== "chuong_mon" && callerRole !== "dai_truong_lao") {
    res.status(403).json({ success: false, error: "Ch\u1EC9 c\xF3 Ch\u01B0\u1EDFng M\xF4n ho\u1EB7c \u0110\u1EA1i Tr\u01B0\u1EDFng L\xE3o m\u1EDBi c\xF3 quy\u1EC1n t\u1EA5n phong ch\u1EE9c v\u1EE5!" });
    return;
  }
  if (newRole === "chuong_mon" && callerRole !== "chuong_mon") {
    res.status(403).json({ success: false, error: "Ch\u1EC9 c\xF3 Ch\u01B0\u1EDFng M\xF4n m\u1EDBi c\xF3 quy\u1EC1n truy\u1EC1n v\u1ECB!" });
    return;
  }
  if (newRole === "dai_truong_lao" && callerRole !== "chuong_mon") {
    res.status(403).json({ success: false, error: "Ch\u1EC9 c\xF3 Ch\u01B0\u1EDFng M\xF4n m\u1EDBi c\xF3 quy\u1EC1n t\u1EA5n phong \u0110\u1EA1i Tr\u01B0\u1EDFng L\xE3o!" });
    return;
  }
  const sect = serverSects.get(sectId);
  const targetMember = (sect.members || []).find((m) => String(m.username || "").toLowerCase() === String(targetUsername).toLowerCase());
  if (!targetMember) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y \u0111\u1EC7 t\u1EED n\xE0y trong m\xF4n ph\xE1i!" });
    return;
  }
  if (newRole === "chuong_mon") {
    const oldLeaderMember = (sect.members || []).find((m) => String(m.username || "").toLowerCase() === String(user.username || "").toLowerCase());
    if (oldLeaderMember) {
      oldLeaderMember.role = "dai_truong_lao";
    }
    cult.sect.role = "dai_truong_lao";
    user.cultivation = cult;
    serverUsers.set(user.id, user);
    sect.leaderId = targetMember.userId;
    sect.leaderName = targetMember.username;
    sect.leaderAvatar = targetMember.avatar;
    sect.leaderFrame = targetMember.frame;
    sect.leaderRealmName = targetMember.realmName;
    sect.leaderLevel = targetMember.level;
  }
  targetMember.role = newRole;
  const targetUserRecord = getUserByUsername(targetMember.username);
  if (targetUserRecord && targetUserRecord.cultivation?.sect) {
    targetUserRecord.cultivation.sect.role = newRole;
    if (!targetUserRecord.cultivation.historyLog) targetUserRecord.cultivation.historyLog = [];
    targetUserRecord.cultivation.historyLog.unshift(`\u2728 [T\xD4NG M\xD4N T\u1EA4N PHONG] Ch\xFAc m\u1EEBng \u0111\u1EA1o h\u1EEFu \u0111\u01B0\u1EE3c t\u1EA5n phong l\xE0m [${newRole}] c\u1EE7a ${sect.name}!`);
    serverUsers.set(targetUserRecord.id, targetUserRecord);
  }
  recalculateSectStats(sect);
  saveSectsToFile();
  saveUsersToFile();
  const roleTitles = {
    chuong_mon: "Ch\u01B0\u1EDFng M\xF4n",
    dai_truong_lao: "\u0110\u1EA1i Tr\u01B0\u1EDFng L\xE3o",
    chan_truyen: "Ch\xE2n Truy\u1EC1n \u0110\u1EC7 T\u1EED",
    noi_mon: "N\u1ED9i M\xF4n \u0110\u1EC7 T\u1EED",
    ngoai_mon: "Ngo\u1EA1i M\xF4n \u0110\u1EC7 T\u1EED"
  };
  broadcastSectAnnouncement(`\u2728 [T\xD4NG M\xD4N T\u1EA4N PHONG] ${sect.name} [${sect.tag}]: \u0110\u1EC7 t\u1EED ${targetMember.displayName || targetMember.username} \u0111\xE3 \u0111\u01B0\u1EE3c t\u1EA5n phong l\xE0m [${roleTitles[newRole] || newRole}]!`);
  res.json({
    success: true,
    message: `\u0110\xE3 t\u1EA5n phong ${targetMember.displayName || targetMember.username} l\xE0m [${roleTitles[newRole] || newRole}]!`,
    sect,
    cultivation: user.cultivation
  });
});
app.post("/api/sects/kick", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserByToken(authHeader);
  if (!user) {
    res.status(401).json({ success: false, error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp!" });
    return;
  }
  const { targetUsername } = req.body;
  const cult = user.cultivation || {};
  const sectId = cult.sect?.sectId;
  const callerRole = cult.sect?.role;
  if (!sectId || !serverSects.has(sectId)) {
    res.status(400).json({ success: false, error: "\u0110\u1EA1o h\u1EEFu kh\xF4ng c\xF3 m\xF4n ph\xE1i!" });
    return;
  }
  if (callerRole !== "chuong_mon" && callerRole !== "dai_truong_lao") {
    res.status(403).json({ success: false, error: "Ch\u1EC9 c\xF3 Ch\u01B0\u1EDFng M\xF4n ho\u1EB7c \u0110\u1EA1i Tr\u01B0\u1EDFng L\xE3o m\u1EDBi c\xF3 quy\u1EC1n tr\u1EE5c xu\u1EA5t \u0111\u1EC7 t\u1EED!" });
    return;
  }
  const sect = serverSects.get(sectId);
  const targetMember = (sect.members || []).find((m) => m.username.toLowerCase() === String(targetUsername).toLowerCase());
  if (!targetMember) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y \u0111\u1EC7 t\u1EED trong m\xF4n ph\xE1i!" });
    return;
  }
  if (targetMember.role === "chuong_mon") {
    res.status(403).json({ success: false, error: "Kh\xF4ng th\u1EC3 tr\u1EE5c xu\u1EA5t Ch\u01B0\u1EDFng M\xF4n!" });
    return;
  }
  if (callerRole === "dai_truong_lao" && (targetMember.role === "dai_truong_lao" || targetMember.role === "chan_truyen")) {
    res.status(403).json({ success: false, error: "\u0110\u1EA1i Tr\u01B0\u1EDFng L\xE3o kh\xF4ng th\u1EC3 tr\u1EE5c xu\u1EA5t \u0111\u1EC7 t\u1EED \u0111\u1ED3ng c\u1EA5p ho\u1EB7c Ch\xE2n Truy\u1EC1n!" });
    return;
  }
  sect.members = (sect.members || []).filter((m) => String(m.username || "").toLowerCase() !== String(targetUsername).toLowerCase());
  recalculateSectStats(sect);
  saveSectsToFile();
  const targetUserRecord = getUserByUsername(targetMember.username);
  if (targetUserRecord && targetUserRecord.cultivation) {
    targetUserRecord.cultivation.sect = void 0;
    serverUsers.set(targetUserRecord.id, targetUserRecord);
    saveUsersToFile();
  }
  res.json({
    success: true,
    message: `\u0110\xE3 tr\u1EE5c xu\u1EA5t ${targetMember.displayName || targetMember.username} kh\u1ECFi m\xF4n ph\xE1i.`,
    sect
  });
});
app.post("/api/sects/contribute", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserByToken(authHeader);
  if (!user) {
    res.status(401).json({ success: false, error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp!" });
    return;
  }
  const { amount } = req.body;
  const contrib = Math.max(1, Number(amount) || 0);
  const cult = user.cultivation || {};
  const sectId = cult.sect?.sectId;
  if (!sectId || !serverSects.has(sectId)) {
    res.status(400).json({ success: false, error: "\u0110\u1EA1o h\u1EEFu kh\xF4ng c\xF3 m\xF4n ph\xE1i!" });
    return;
  }
  const currentLinhThach = Number(cult.linhThach) || 0;
  if (currentLinhThach < contrib) {
    res.status(400).json({ success: false, error: `Thi\u1EBFu Linh Th\u1EA1ch: c\u1EA7n ${contrib}, hi\u1EC7n c\xF3 ${currentLinhThach}!` });
    return;
  }
  cult.linhThach = currentLinhThach - contrib;
  cult.sect.contribution = (cult.sect.contribution || 0) + contrib;
  const sect = serverSects.get(sectId);
  sect.totalContribution = (sect.totalContribution || 0) + contrib;
  const m = (sect.members || []).find((x) => String(x.username || "").toLowerCase() === String(user.username || "").toLowerCase());
  if (m) {
    m.contribution = (m.contribution || 0) + contrib;
  }
  const thresholds = [0, 5e3, 15e3, 3e4, 6e4];
  let didLevelUp = false;
  if (sect.linhMachLevel < 5 && sect.totalContribution >= thresholds[sect.linhMachLevel]) {
    sect.linhMachLevel += 1;
    didLevelUp = true;
  }
  recalculateSectStats(sect);
  saveSectsToFile();
  const msg = didLevelUp ? `\u{1F31F} [LINH M\u1EA0CH \u0110\u1ED8T PH\xC1] C\u1ED1ng hi\u1EBFn ${contrib} Linh Th\u1EA1ch! Linh M\u1EA1ch ${sect.name} \u0111\xE3 th\u0103ng l\xEAn C\u1EA5p ${sect.linhMachLevel}!` : `\u{1F3F0} \u0110\xF3ng g\xF3p ${contrib} Linh Th\u1EA1ch cho ${sect.name}, c\u1ED1ng hi\u1EBFn c\xE1 nh\xE2n t\u0103ng +${contrib}!`;
  if (!cult.historyLog) cult.historyLog = [];
  cult.historyLog.unshift(msg);
  if (cult.historyLog.length > 20) cult.historyLog.pop();
  user.cultivation = cult;
  user.updatedAt = Date.now();
  serverUsers.set(user.id, user);
  saveUsersToFile();
  if (didLevelUp) {
    broadcastSectAnnouncement(`\u{1F31F} [LINH M\u1EA0CH \u0110\u1ED8T PH\xC1] Nh\u1EDD s\u1EF1 c\u1ED1ng hi\u1EBFn c\u1EE7a ch\u01B0 v\u1ECB \u0111\u1EC7 t\u1EED, Linh M\u1EA1ch \u0110\u1ED9ng Ph\u1EE7 c\u1EE7a ${sect.name} [${sect.tag}] \u0111\xE3 ch\xEDnh th\u1EE9c th\u0103ng c\u1EA5p l\xEAn C\u1EA5p ${sect.linhMachLevel}/5!`);
  }
  res.json({
    success: true,
    message: msg,
    sect,
    cultivation: cult
  });
});
var lastSectWarSettlementKey = "";
var sectWarPreviousWinner = null;
function getVNDateString(timestamp = Date.now()) {
  const VN_OFFSET = 7 * 3600 * 1e3;
  const nowVN = new Date(timestamp + VN_OFFSET);
  return `${nowVN.getUTCFullYear()}-${String(nowVN.getUTCMonth() + 1).padStart(2, "0")}-${String(nowVN.getUTCDate()).padStart(2, "0")}`;
}
var MAX_DAILY_SECT_WAR_ATTEMPTS = 3;
var sectWarDailyAttempts = /* @__PURE__ */ new Map();
function recalculateSectWarPoints(sect) {
  if (!sect.warContributors || typeof sect.warContributors !== "object") {
    sect.warContributors = {};
  }
  const contributors = Object.values(sect.warContributors);
  if (contributors.length === 0) {
    return;
  }
  contributors.sort((a, b) => (b.points || 0) - (a.points || 0));
  const top5Points = contributors.slice(0, 5).reduce((sum, c) => sum + (c.points || 0), 0);
  const remainingPoints = contributors.slice(5).reduce((sum, c) => sum + Math.round((c.points || 0) * 0.15), 0);
  sect.weeklyWarPoints = top5Points + remainingPoints;
}
function getSectWarSchedule() {
  const now = Date.now();
  const VN_OFFSET = 7 * 3600 * 1e3;
  const nowVN = new Date(now + VN_OFFSET);
  const day = nowVN.getUTCDay();
  const hour = nowVN.getUTCHours();
  const minute = nowVN.getUTCMinutes();
  const isActive = day === 6 || day === 0 && hour < 20;
  const isHappyHour = false;
  const happyHourMultiplier = 1;
  const happyHourNotice = void 0;
  let daysUntilSunday = (7 - day) % 7;
  if (day === 0 && hour >= 20) {
    daysUntilSunday = 7;
  }
  const targetVN = new Date(nowVN);
  targetVN.setUTCDate(targetVN.getUTCDate() + daysUntilSunday);
  targetVN.setUTCHours(20, 0, 0, 0);
  const nextSettlementTimestamp = targetVN.getTime() - VN_OFFSET;
  const timeRemainingMs = Math.max(0, nextSettlementTimestamp - now);
  return {
    isActive,
    phase: isActive ? "active" : "settled_rest",
    isHappyHour,
    happyHourMultiplier,
    happyHourNotice,
    nextSettlementTimestamp,
    timeRemainingMs
  };
}
function settleSectWarSeason() {
  console.log("[Sect War] \u0110ang ti\u1EBFn h\xE0nh t\u1ED5ng k\u1EBFt \u0111\u1EA1i s\u1EF1 ki\u1EC7n V\u1EA1n Ph\xE1i Tranh Phong tu\u1EA7n n\xE0y...");
  const allSects = Array.from(serverSects.values());
  allSects.sort((a, b) => (b.weeklyWarPoints || 0) - (a.weeklyWarPoints || 0));
  const participatingSects = allSects.filter((s) => (s.weeklyWarPoints || 0) > 0);
  if (participatingSects.length === 0) {
    console.log("[Sect War] Kh\xF4ng c\xF3 t\xF4ng m\xF4n n\xE0o tham gia s\u1EF1 ki\u1EC7n tu\u1EA7n n\xE0y (0 \u0111i\u1EC3m).");
    allSects.forEach((s) => {
      s.weeklyTournamentPoints = 0;
      s.weeklyWarPoints = 0;
      s.isHoldingThienCung = false;
      s.warContributors = {};
      recalculateSectStats(s);
    });
    sectWarPreviousWinner = null;
    saveSectsToFile();
    broadcastSectAnnouncement(
      "\u2694\uFE0F [THI\xCAN \u0110\u1EA0O \u0110\u1EA0I TH\u1ED0NG K\u1EBET] K\u1EBFt gi\u1EDBi Th\xE1i C\u1ED5 Linh M\u1EA1ch \u0111\xE3 kh\xE9p l\u1EA1i l\xFAc 20:00! Tu\u1EA7n n\xE0y kh\xF4ng c\xF3 T\xF4ng M\xF4n n\xE0o xu\u1EA5t chi\u1EBFn tham gia tranh \u0111o\u1EA1t, danh hi\u1EC7u Thi\xEAn H\u1EA1 \u0110\u1EC7 Nh\u1EA5t t\u1EA1m th\u1EDDi b\u1ECF tr\u1ED1ng. H\u1EB9n g\u1EB7p l\u1EA1i c\xE1c T\xF4ng M\xF4n v\xE0o Th\u1EE9 B\u1EA3y tu\u1EA7n t\u1EDBi!"
    );
    return;
  }
  const top1 = participatingSects[0];
  const top2 = participatingSects[1] || null;
  const top3 = participatingSects[2] || null;
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 864e5;
  if (top1) {
    sectWarPreviousWinner = {
      sectId: top1.id,
      sectName: top1.name,
      tag: top1.tag,
      badgeIcon: top1.badgeIcon,
      leaderName: top1.leaderName,
      points: top1.weeklyWarPoints || 0,
      settledAt: now
    };
    top1.isHoldingThienCung = true;
    top1.activeWeeklyBuff = {
      tuViBonusPct: 20,
      linhThachBonusPct: 15,
      title: "Thi\xEAn H\u1EA1 \u0110\u1EC7 Nh\u1EA5t Ph\xE1i",
      rank: 1,
      expiresAt: now + SEVEN_DAYS_MS
    };
    for (const m of top1.members) {
      const u = serverUsers.get(m.userId);
      if (u && u.cultivation) {
        u.cultivation.linhThach = (u.cultivation.linhThach || 0) + 500;
        if (!u.cultivation.historyLog) u.cultivation.historyLog = [];
        u.cultivation.historyLog.unshift(`\u{1F451} [V\u1EA0N PH\xC1I TRANH PHONG] T\xF4ng m\xF4n ${top1.name} \u0111o\u1EA1t ng\xF4i Thi\xEAn H\u1EA1 \u0110\u1EC7 Nh\u1EA5t! Nh\u1EADn th\u01B0\u1EDFng tu\u1EA7n +500 Linh Th\u1EA1ch v\xE0 Buff +20% Tu Vi!`);
        serverUsers.set(u.id, u);
      }
    }
  }
  if (top2) {
    top2.isHoldingThienCung = false;
    top2.activeWeeklyBuff = {
      tuViBonusPct: 15,
      linhThachBonusPct: 10,
      title: "T\xF4ng M\xF4n Nh\u1ECB Ph\u1EA9m",
      rank: 2,
      expiresAt: now + SEVEN_DAYS_MS
    };
    for (const m of top2.members) {
      const u = serverUsers.get(m.userId);
      if (u && u.cultivation) {
        u.cultivation.linhThach = (u.cultivation.linhThach || 0) + 300;
        serverUsers.set(u.id, u);
      }
    }
  }
  if (top3) {
    top3.isHoldingThienCung = false;
    top3.activeWeeklyBuff = {
      tuViBonusPct: 10,
      linhThachBonusPct: 5,
      title: "T\xF4ng M\xF4n Tam Ph\u1EA9m",
      rank: 3,
      expiresAt: now + SEVEN_DAYS_MS
    };
    for (const m of top3.members) {
      const u = serverUsers.get(m.userId);
      if (u && u.cultivation) {
        u.cultivation.linhThach = (u.cultivation.linhThach || 0) + 150;
        serverUsers.set(u.id, u);
      }
    }
  }
  allSects.forEach((s, idx) => {
    s.lastWeekRank = idx + 1;
    s.weeklyTournamentPoints = s.weeklyWarPoints || 0;
    s.weeklyWarPoints = 0;
    s.warContributors = {};
    recalculateSectStats(s);
  });
  saveSectsToFile();
  saveUsersToFile();
  if (isDatabaseConfigured()) {
    dbSaveSects(Array.from(serverSects.values())).catch(() => {
    });
  }
  const leaderTitle = top1 ? `Ch\u01B0\u1EDFng M\xF4n ${top1.leaderName}` : "Qu\u1EA7n H\xF9ng";
  broadcastSectAnnouncement(
    `\u{1F451} [THI\xCAN \u0110\u1EA0O \u0110\u1EA0I TH\u1ED0NG K\u1EBET] K\u1EBFt gi\u1EDBi Th\xE1i C\u1ED5 Linh M\u1EA1ch \u0111\xE3 kh\xE9p l\u1EA1i l\xFAc 20:00! Ch\xFAc m\u1EEBng [${top1.name}] d\u01B0\u1EDBi s\u1EF1 th\u1ED1ng l\u0129nh c\u1EE7a ${leaderTitle} \u0111\xE3 xu\u1EA5t s\u1EAFc \u0111o\u1EA1t ng\xF4i THI\xCAN H\u1EA0 \u0110\u1EC6 NH\u1EA4T PH\xC1I v\u1EDBi ${(sectWarPreviousWinner?.points || 0).toLocaleString()} \u0110i\u1EC3m Chi\u1EBFn! To\xE0n t\xF4ng m\xF4n nh\u1EADn b\xF9a l\u1EE3i 7 ng\xE0y!`
  );
}
setInterval(() => {
  const now = Date.now();
  const VN_OFFSET = 7 * 3600 * 1e3;
  const nowVN = new Date(now + VN_OFFSET);
  const day = nowVN.getUTCDay();
  const hour = nowVN.getUTCHours();
  const minute = nowVN.getUTCMinutes();
  if (day === 0 && hour === 20 && minute < 5) {
    const seasonKey = `${nowVN.getUTCFullYear()}-${nowVN.getUTCMonth() + 1}-${nowVN.getUTCDate()}`;
    if (lastSectWarSettlementKey !== seasonKey) {
      lastSectWarSettlementKey = seasonKey;
      settleSectWarSeason();
    }
  }
}, 15e3);
app.get("/api/sects/war/status", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const schedule = getSectWarSchedule();
  const authHeader = req.headers.authorization;
  const currentUser = getUserByToken(authHeader);
  const sects = Array.from(serverSects.values()).map((s) => {
    recalculateSectStats(s);
    return s;
  });
  sects.sort((a, b) => (b.weeklyWarPoints || 0) - (a.weeklyWarPoints || 0));
  const topSects = sects.map((s, idx) => ({
    id: s.id,
    name: s.name,
    tag: s.tag,
    badgeIcon: s.badgeIcon || "\u2694\uFE0F",
    bannerColor: s.bannerColor || "#38bdf8",
    leaderName: s.leaderName,
    leaderAvatar: s.leaderAvatar || "\u{1F451}",
    weeklyWarPoints: s.weeklyWarPoints || 0,
    memberCount: s.memberCount || 1,
    isHoldingThienCung: Boolean(s.isHoldingThienCung || idx === 0 && (s.weeklyWarPoints || 0) > 0),
    rank: idx + 1
  }));
  let mySectWarStats = null;
  if (currentUser?.cultivation?.sect?.sectId) {
    const mySectId = currentUser.cultivation.sect.sectId;
    const mySect = serverSects.get(mySectId);
    if (mySect) {
      const myRank = sects.findIndex((s) => s.id === mySectId) + 1;
      const contribRecord = mySect.warContributors?.[currentUser.username] || {
        points: 0,
        matchesCount: 0
      };
      const contributorsList = Object.values(mySect.warContributors || {}).sort(
        (a, b) => b.points - a.points
      );
      mySectWarStats = {
        sectId: mySect.id,
        sectName: mySect.name,
        rank: myRank || sects.length,
        weeklyWarPoints: mySect.weeklyWarPoints || 0,
        myContributionPoints: contribRecord.points || 0,
        myMatchesCount: contribRecord.matchesCount || 0,
        topContributors: contributorsList.slice(0, 10)
      };
    }
  }
  const todayKey = getVNDateString();
  let dailyAttemptsUsed = 0;
  if (currentUser?.username) {
    dailyAttemptsUsed = sectWarDailyAttempts.get(`${currentUser.username.toLowerCase()}_${todayKey}`) || 0;
  }
  const dailyAttemptsLeft = Math.max(0, MAX_DAILY_SECT_WAR_ATTEMPTS - dailyAttemptsUsed);
  res.json({
    success: true,
    ...schedule,
    dailyAttemptsMax: MAX_DAILY_SECT_WAR_ATTEMPTS,
    dailyAttemptsUsed,
    dailyAttemptsLeft,
    topSects,
    previousWinner: sectWarPreviousWinner,
    mySectWarStats
  });
});
app.post("/api/sects/war/contribute", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserByToken(authHeader);
  if (!user) {
    res.status(401).json({ success: false, error: "\u0110\u1EA1o h\u1EEFu c\u1EA7n \u0111\u0103ng nh\u1EADp \u0111\u1EC3 \u0111\xF3ng g\xF3p \u0111i\u1EC3m chi\u1EBFn c\xF4ng!" });
    return;
  }
  const mySectId = user.cultivation?.sect?.sectId;
  if (!mySectId) {
    res.status(400).json({ success: false, error: "\u0110\u1EA1o h\u1EEFu ch\u01B0a gia nh\u1EADp t\xF4ng m\xF4n n\xE0o!" });
    return;
  }
  const sect = serverSects.get(mySectId);
  if (!sect) {
    res.status(404).json({ success: false, error: "T\xF4ng m\xF4n kh\xF4ng t\u1ED3n t\u1EA1i!" });
    return;
  }
  const schedule = getSectWarSchedule();
  if (!schedule.isActive) {
    res.status(400).json({
      success: false,
      error: "\u0110\u1EA1i s\u1EF1 ki\u1EC7n V\u1EA1n Ph\xE1i Tranh Phong hi\u1EC7n ch\u01B0a m\u1EDF ho\u1EB7c \u0111\xE3 k\u1EBFt th\xFAc! S\u1EF1 ki\u1EC7n ch\u1EC9 m\u1EDF t\u1EEB 00:00 Th\u1EE9 B\u1EA3y \u0111\u1EBFn 20:00 Ch\u1EE7 Nh\u1EADt h\xE0ng tu\u1EA7n (theo gi\u1EDD Vi\u1EC7t Nam).",
      isActive: false
    });
    return;
  }
  const todayKey = getVNDateString();
  const userKey = `${user.username.toLowerCase()}_${todayKey}`;
  const attemptsUsed = sectWarDailyAttempts.get(userKey) || 0;
  if (attemptsUsed >= MAX_DAILY_SECT_WAR_ATTEMPTS) {
    res.status(400).json({
      success: false,
      error: `H\xF4m nay \u0111\u1EA1o h\u1EEFu \u0111\xE3 s\u1EED d\u1EE5ng h\u1EBFt ${MAX_DAILY_SECT_WAR_ATTEMPTS}/${MAX_DAILY_SECT_WAR_ATTEMPTS} l\u01B0\u1EE3t xu\u1EA5t chi\u1EBFn! H\xE3y quay l\u1EA1i v\xE0o ng\xE0y mai \u0111\u1EC3 ti\u1EBFp t\u1EE5c c\u1ED1ng hi\u1EBFn cho t\xF4ng m\xF4n.`,
      dailyAttemptsUsed: attemptsUsed,
      dailyAttemptsLeft: 0,
      dailyAttemptsMax: MAX_DAILY_SECT_WAR_ATTEMPTS
    });
    return;
  }
  const { wpm = 0, accuracy = 100, completedAllStages = true } = req.body;
  const numWpm = Math.max(0, Number(wpm) || 0);
  const numAcc = Math.max(0, Math.min(100, Number(accuracy) || 100));
  const basePts = Math.max(1, Math.round(numWpm * (numAcc / 100) / 10));
  const stageBonus = completedAllStages ? 25 : 10;
  const addedPoints = basePts + stageBonus;
  if (!sect.warContributors) sect.warContributors = {};
  const existing = sect.warContributors[user.username] || {
    username: user.username,
    displayName: user.displayName || user.username,
    avatar: user.avatar || "\u{1F9D8}",
    points: 0,
    matchesCount: 0,
    lastActive: Date.now()
  };
  existing.points += addedPoints;
  existing.matchesCount += 1;
  existing.lastActive = Date.now();
  sect.warContributors[user.username] = existing;
  const newAttemptsUsed = attemptsUsed + 1;
  sectWarDailyAttempts.set(userKey, newAttemptsUsed);
  recalculateSectWarPoints(sect);
  recalculateSectStats(sect);
  saveSectsToFile();
  const allSects = Array.from(serverSects.values()).sort(
    (a, b) => (b.weeklyWarPoints || 0) - (a.weeklyWarPoints || 0)
  );
  const currentRank = allSects.findIndex((s) => s.id === sect.id) + 1;
  res.json({
    success: true,
    addedPoints,
    userTotalPoints: existing.points,
    totalWeeklyPoints: sect.weeklyWarPoints,
    dailyAttemptsUsed: newAttemptsUsed,
    dailyAttemptsLeft: Math.max(0, MAX_DAILY_SECT_WAR_ATTEMPTS - newAttemptsUsed),
    dailyAttemptsMax: MAX_DAILY_SECT_WAR_ATTEMPTS,
    currentRank,
    isHappyHour: false,
    sectName: sect.name,
    isActive: schedule.isActive
  });
});
app.post("/api/sects/war/penalize-surrender", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserByToken(authHeader);
  if (!user) {
    res.status(401).json({ success: false, error: "\u0110\u1EA1o h\u1EEFu c\u1EA7n \u0111\u0103ng nh\u1EADp!" });
    return;
  }
  const todayKey = getVNDateString();
  const userKey = `${user.username.toLowerCase()}_${todayKey}`;
  const attemptsUsed = sectWarDailyAttempts.get(userKey) || 0;
  const newAttemptsUsed = Math.min(MAX_DAILY_SECT_WAR_ATTEMPTS, attemptsUsed + 1);
  sectWarDailyAttempts.set(userKey, newAttemptsUsed);
  res.json({
    success: true,
    deducted: true,
    dailyAttemptsUsed: newAttemptsUsed,
    dailyAttemptsLeft: Math.max(0, MAX_DAILY_SECT_WAR_ATTEMPTS - newAttemptsUsed),
    dailyAttemptsMax: MAX_DAILY_SECT_WAR_ATTEMPTS,
    message: `\u0110\xE3 kh\u1EA5u tr\u1EEB 1 l\u01B0\u1EE3t xu\u1EA5t chi\u1EBFn b\xE0i thi T\xF4ng M\xF4n do \u0111\u1EA7u h\xE0ng 3 l\u1EA7n li\xEAn ti\u1EBFp! C\xF2n ${Math.max(0, MAX_DAILY_SECT_WAR_ATTEMPTS - newAttemptsUsed)}/${MAX_DAILY_SECT_WAR_ATTEMPTS} l\u01B0\u1EE3t h\xF4m nay.`
  });
});
function enrichLeaderboardEntry(entry) {
  const user = (entry.userId ? serverUsers.get(entry.userId) : null) || getUserByUsername(entry.username) || getUserByDisplayNameOrUsername(entry.username) || (entry.displayName ? getUserByDisplayNameOrUsername(entry.displayName) : null);
  let sectName = entry.sectName;
  let sectTag = entry.sectTag;
  let sectRole = entry.sectRole;
  let realmName = entry.realmName;
  let realmIcon = entry.realmIcon;
  let level = entry.level;
  let avatar = entry.avatar;
  let frame = entry.frame;
  let displayName = entry.displayName || entry.username;
  let keyboardSwitch = entry.keyboardSwitch;
  if (user) {
    displayName = user.displayName || user.username || displayName;
    avatar = user.avatar || avatar;
    frame = user.frame || frame;
    keyboardSwitch = user.keyboardSwitch || keyboardSwitch;
    if (user.cultivation) {
      const cult = user.cultivation;
      const rIdx = Math.max(0, Math.min(11, Number(cult.realmIndex) || 0));
      const rMeta = XIANXIA_REALM_METAS[rIdx] || XIANXIA_REALM_METAS[0];
      realmName = rMeta.name;
      realmIcon = rMeta.icon;
      level = Number(cult.level) || level;
      if (cult.sect) {
        sectName = cult.sect.sectName || cult.sect.name || cult.sectName || sectName;
        sectTag = cult.sect.sectTag || cult.sect.tag || cult.sectTag || sectTag;
        sectRole = cult.sect.role || sectRole;
        if ((!sectName || !sectTag) && cult.sect.sectId && serverSects.has(cult.sect.sectId)) {
          const s = serverSects.get(cult.sect.sectId);
          sectName = s.name || sectName;
          sectTag = s.tag || sectTag;
          sectRole = sectRole || "noi_mon";
        }
      } else if (cult.sectName) {
        sectName = cult.sectName;
        sectTag = cult.sectTag;
      }
    }
  }
  if (!sectName) {
    const uLower = (entry.username || "").toLowerCase();
    const dLower = (displayName || "").toLowerCase();
    for (const sect of serverSects.values()) {
      const member = (sect.members || []).find(
        (m) => entry.userId && m.userId === entry.userId || user && m.userId === user.id || m.username && m.username.toLowerCase() === uLower || m.displayName && m.displayName.toLowerCase() === dLower
      );
      if (member) {
        sectName = sect.name;
        sectTag = sect.tag;
        sectRole = member.role || "noi_mon";
        break;
      } else if (sect.leaderName && sect.leaderName.toLowerCase() === uLower || sect.leaderName && sect.leaderName.toLowerCase() === dLower || user && sect.leaderId === user.id) {
        sectName = sect.name;
        sectTag = sect.tag;
        sectRole = "chuong_mon";
        break;
      }
    }
  }
  return {
    ...entry,
    displayName,
    avatar,
    frame,
    realmName: realmName || "Luy\u1EC7n Kh\xED K\u1EF3",
    realmIcon: realmIcon || "\u{1F33F}",
    level: level || 1,
    sectName: sectName || void 0,
    sectTag: sectTag || void 0,
    sectRole: sectRole || void 0,
    keyboardSwitch: keyboardSwitch || "Cherry MX Blue Clicky"
  };
}
app.get("/api/leaderboard", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  checkLeaderboardResets();
  const enrichedScores = {};
  for (const [key, rawVal] of Object.entries(serverLeaderboardData.highScores)) {
    const val = rawVal;
    if (val) {
      const enriched = enrichLeaderboardEntry({
        rank: 1,
        userId: val.userId,
        username: val.username,
        displayName: val.displayName || val.username,
        avatar: val.avatar,
        frame: val.frame,
        wpm: val.wpm,
        score: val.score,
        errors: val.errors,
        accuracy: val.accuracy || 100,
        timestamp: val.timestamp
      });
      enrichedScores[key] = {
        ...val,
        displayName: enriched.displayName,
        avatar: enriched.avatar,
        frame: enriched.frame,
        sectName: enriched.sectName,
        sectTag: enriched.sectTag,
        sectRole: enriched.sectRole,
        realmName: enriched.realmName,
        realmIcon: enriched.realmIcon,
        level: enriched.level
      };
    } else {
      enrichedScores[key] = null;
    }
  }
  const enrichedRankings = {};
  for (const m of VALID_LEADERBOARD_MODES) {
    enrichedRankings[m] = {
      daily: (serverLeaderboardData.rankings[m]?.daily || []).map(enrichLeaderboardEntry),
      weekly: (serverLeaderboardData.rankings[m]?.weekly || []).map(enrichLeaderboardEntry),
      all_time: (serverLeaderboardData.rankings[m]?.all_time || []).map(enrichLeaderboardEntry)
    };
  }
  res.json({
    success: true,
    highScores: enrichedScores,
    rankings: enrichedRankings,
    lastResetDate: serverLeaderboardData.lastResetDate,
    lastResetWeek: serverLeaderboardData.lastResetWeek
  });
});
function updatePeriodRankingList(list, entry, isScoreMode) {
  const existingIdx = list.findIndex(
    (item) => item.userId && entry.userId && item.userId === entry.userId || item.username && entry.username && item.username.toLowerCase() === entry.username.toLowerCase()
  );
  let isBetter = true;
  if (existingIdx !== -1) {
    const old = list[existingIdx];
    if (isScoreMode) {
      isBetter = entry.score > old.score || entry.score === old.score && entry.errors < old.errors;
    } else {
      isBetter = entry.wpm > old.wpm || entry.wpm === old.wpm && entry.errors < old.errors;
    }
    if (isBetter) {
      list[existingIdx] = { ...entry };
    }
  } else {
    list.push({ ...entry });
  }
  list.sort((a, b) => {
    if (isScoreMode) {
      if (b.score !== a.score) return b.score - a.score;
    } else {
      if (b.wpm !== a.wpm) return b.wpm - a.wpm;
    }
    if (a.errors !== b.errors) return a.errors - b.errors;
    if ((b.accuracy || 100) !== (a.accuracy || 100)) return (b.accuracy || 100) - (a.accuracy || 100);
    return a.timestamp - b.timestamp;
  });
  let userRank = -1;
  for (let i = 0; i < list.length; i++) {
    list[i].rank = i + 1;
    if (list[i].userId && entry.userId && list[i].userId === entry.userId || list[i].username && entry.username && list[i].username.toLowerCase() === entry.username.toLowerCase()) {
      userRank = i + 1;
    }
  }
  if (list.length > 20) {
    list.splice(20);
  }
  return { rank: userRank, isBetter };
}
app.post("/api/leaderboard", (req, res) => {
  checkLeaderboardResets();
  const {
    mode,
    username,
    displayName,
    wpm = 0,
    score = 0,
    errors = 0,
    accuracy = 100,
    consistency,
    avatar,
    frame,
    isSurrendered,
    isCompleted = true,
    roomId,
    playerId,
    keyboardSwitch
  } = req.body;
  const validModes = ["vi_dau", "vi_nodau", "en", "numpad", "ngau_hung", "doan_chu", "san_boss"];
  if (!mode || !validModes.includes(mode) || !username) {
    res.status(400).json({ success: false, error: "D\u1EEF li\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7" });
    return;
  }
  const banCheck = checkIsBanned(username || (playerId ? playerId : ""));
  if (banCheck.isBanned) {
    res.json({
      success: false,
      isNewRecord: false,
      error: `T\xE0i kho\u1EA3n \u0111ang ch\u1ECBu \xE1n ph\u1EA1t t\u1EEB B\xE0n C\u1ED5 Th\u1EA7n Th\u1EE9c (C\u1EA5m thi \u0111\u1EA5u 2 gi\u1EDD). Th\u1EDDi gian th\u1EE5 \xE1n c\xF2n l\u1EA1i: ${banCheck.remainingMinutes} ph\xFAt! \u0110i\u1EC3m s\u1ED1 kh\xF4ng \u0111\u01B0\u1EE3c ghi nh\u1EADn l\xEAn B\u1EA3ng V\xE0ng!`,
      highScores: serverLeaderboardData.highScores,
      rankings: serverLeaderboardData.rankings
    });
    return;
  }
  const authHeader = req.headers.authorization || (req.body && req.body.authToken ? `Bearer ${req.body.authToken}` : "");
  const authenticatedUser = getUserByToken(authHeader);
  if (!authenticatedUser || !authenticatedUser.isVerified) {
    res.json({
      success: false,
      isGuest: true,
      isNewRecord: false,
      error: "Ng\u01B0\u1EDDi ch\u01A1i \u0111ang \u1EDF ch\u1EBF \u0111\u1ED9 Kh\xE1ch (ch\u01B0a \u0111\u0103ng nh\u1EADp ho\u1EB7c ch\u01B0a x\xE1c th\u1EF1c). \u0110i\u1EC3m s\u1ED1 kh\xF4ng \u0111\u01B0\u1EE3c ghi nh\u1EADn l\xEAn B\u1EA3ng V\xE0ng. H\xE3y \u0111\u0103ng nh\u1EADp t\xE0i kho\u1EA3n \u0111\u1EC3 x\xE1c l\u1EADp k\u1EF7 l\u1EE5c!",
      highScores: serverLeaderboardData.highScores,
      rankings: serverLeaderboardData.rankings
    });
    return;
  }
  if (isSurrendered === true || isCompleted === false) {
    res.json({
      success: false,
      isNewRecord: false,
      error: "V\xE1n \u0111\u1EA5u kh\xF4ng tr\u1ECDn v\u1EB9n ho\u1EB7c ng\u01B0\u1EDDi ch\u01A1i \u0111\xE3 \u0111\u1EA7u h\xE0ng / r\u1EDDi ph\xF2ng. \u0110i\u1EC3m kh\xF4ng \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n l\xEAn B\u1EA3ng V\xE0ng.",
      highScores: serverLeaderboardData.highScores,
      rankings: serverLeaderboardData.rankings
    });
    return;
  }
  const numAccuracy = Math.max(0, Math.min(100, Math.round(Number(accuracy ?? 100))));
  if (numAccuracy < 92) {
    res.json({
      success: false,
      isNewRecord: false,
      error: `\u0110\u1ED9 ch\xEDnh x\xE1c hi\u1EC7n t\u1EA1i (${numAccuracy}%) ch\u01B0a \u0111\u1EA1t \u0111i\u1EC1u ki\u1EC7n t\u1ED1i thi\u1EC3u c\u1EE7a B\u1EA3ng V\xE0ng (\u2265 92%). H\xE3y r\xE8n luy\u1EC7n th\xEAm \u0111\u1EC3 v\u01B0\u01A1n t\u1EDBi chu\u1EA9n m\u1EF1c cao h\u01A1n!`,
      highScores: serverLeaderboardData.highScores,
      rankings: serverLeaderboardData.rankings
    });
    return;
  }
  if (roomId && playerId) {
    const norm = normalizeRoomCode(roomId);
    const room = rooms.get(norm);
    if (room) {
      const roomPlayer = room.players.find((p) => p.id === playerId);
      if (!roomPlayer || roomPlayer.isSurrendered) {
        res.json({
          success: false,
          isNewRecord: false,
          error: "Ng\u01B0\u1EDDi ch\u01A1i \u0111\xE3 \u0111\u1EA7u h\xE0ng ho\u1EB7c r\u1EDDi ph\xF2ng trong v\xE1n \u0111\u1EA5u n\xE0y. \u0110i\u1EC3m kh\xF4ng \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n l\xEAn B\u1EA3ng V\xE0ng.",
          highScores: serverLeaderboardData.highScores,
          rankings: serverLeaderboardData.rankings
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
  const numConsistency = typeof consistency === "number" ? Math.max(0, Math.min(100, Math.round(consistency))) : void 0;
  const isScoreMode = mode === "ngau_hung" || mode === "doan_chu" || mode === "san_boss";
  const isVerifiedRhythm = numAccuracy >= 92 && (isScoreMode ? numScore <= 5e4 : numWpm <= 300);
  const cult = authenticatedUser.cultivation || {};
  const realmIndex = Math.max(0, Math.min(11, Number(cult.realmIndex) || 0));
  const realmMeta = XIANXIA_REALM_METAS[realmIndex] || XIANXIA_REALM_METAS[0];
  let sectName = cult.sect?.sectName || cult.sect?.name || cult.sectName || void 0;
  let sectTag = cult.sect?.sectTag || cult.sect?.tag || cult.sectTag || void 0;
  let sectRole = cult.sect?.role || void 0;
  if (!sectName && cult.sect?.sectId && serverSects.has(cult.sect.sectId)) {
    const s = serverSects.get(cult.sect.sectId);
    sectName = s.name;
    sectTag = s.tag;
  }
  if (!sectName) {
    const uLower = authenticatedUser.username.toLowerCase();
    const dLower = (authenticatedUser.displayName || "").toLowerCase();
    for (const s of serverSects.values()) {
      const m = (s.members || []).find(
        (x) => x.userId && x.userId === authenticatedUser.id || x.username && x.username.toLowerCase() === uLower || x.displayName && x.displayName.toLowerCase() === dLower
      );
      if (m) {
        sectName = s.name;
        sectTag = s.tag;
        sectRole = m.role;
        break;
      } else if (s.leaderName && s.leaderName.toLowerCase() === uLower || s.leaderName && s.leaderName.toLowerCase() === dLower) {
        sectName = s.name;
        sectTag = s.tag;
        sectRole = "chuong_mon";
        break;
      }
    }
  }
  const effectiveSwitch = String(keyboardSwitch || authenticatedUser.keyboardSwitch || "Cherry MX Blue Clicky").slice(0, 40);
  if (keyboardSwitch && !authenticatedUser.keyboardSwitch) {
    authenticatedUser.keyboardSwitch = effectiveSwitch;
    serverUsers.set(authenticatedUser.id, authenticatedUser);
    saveUsersToFile();
  }
  const entry = {
    rank: 1,
    userId: authenticatedUser.id,
    username: authenticatedUser.username || cleanUsername,
    displayName: cleanDisplayName,
    avatar: avatar || authenticatedUser.avatar || "\u26A1",
    frame: frame || authenticatedUser.frame || "default",
    wpm: numWpm,
    score: numScore,
    errors: numErrors,
    accuracy: numAccuracy,
    consistency: numConsistency,
    timestamp: Date.now(),
    isVerified: isVerifiedRhythm,
    realmName: realmMeta.name,
    realmIcon: realmMeta.icon,
    level: Number(cult.level) || 1,
    sectName,
    sectTag,
    sectRole,
    keyboardSwitch: effectiveSwitch
  };
  if (!serverLeaderboardData.rankings[mode]) {
    serverLeaderboardData.rankings[mode] = { daily: [], weekly: [], all_time: [] };
  }
  const dailyResult = updatePeriodRankingList(serverLeaderboardData.rankings[mode].daily, entry, isScoreMode);
  const weeklyResult = updatePeriodRankingList(serverLeaderboardData.rankings[mode].weekly, entry, isScoreMode);
  const allTimeResult = updatePeriodRankingList(serverLeaderboardData.rankings[mode].all_time, entry, isScoreMode);
  const currentTop1 = serverLeaderboardData.highScores[mode];
  let isNewTop1 = false;
  if (isScoreMode) {
    isNewTop1 = !currentTop1 || numScore > currentTop1.score || numScore === currentTop1.score && numErrors < currentTop1.errors;
  } else {
    isNewTop1 = !currentTop1 || numWpm > currentTop1.wpm || numWpm === currentTop1.wpm && numErrors < currentTop1.errors;
  }
  if (isNewTop1) {
    serverLeaderboardData.highScores[mode] = {
      username: authenticatedUser.username || cleanUsername,
      displayName: cleanDisplayName,
      userId: authenticatedUser.id,
      wpm: numWpm,
      score: numScore,
      errors: numErrors,
      accuracy: numAccuracy,
      isVerified: isVerifiedRhythm,
      timestamp: Date.now(),
      avatar: avatar || authenticatedUser.avatar || "\u26A1",
      frame: frame || authenticatedUser.frame || "default"
    };
  }
  saveLeaderboardToFile();
  broadcastLeaderboard();
  if (isNewTop1 && (dailyResult.rank === 1 || allTimeResult.rank === 1)) {
    const modeDisplayName = getModeDisplayName(mode);
    const recordMetric = isScoreMode ? `${numScore.toLocaleString()} \u0110i\u1EC3m` : `${numWpm} WPM`;
    broadcastBreakingRecord({
      username: authenticatedUser.username || cleanUsername,
      displayName: cleanDisplayName,
      mode,
      modeName: modeDisplayName,
      wpm: numWpm,
      score: numScore,
      errors: numErrors,
      accuracy: numAccuracy,
      avatar: avatar || authenticatedUser.avatar || "\u26A1",
      frame: frame || authenticatedUser.frame || "default",
      timestamp: Date.now()
    });
    broadcastHeavenlyDaoEvent({
      title: "PHONG TH\u1EA6N \u0110\u0102NG \u0110\u1EC8NH",
      eventType: "record",
      targetUser: cleanDisplayName,
      wpm: numWpm,
      accuracy: numAccuracy,
      content: `\u26A1 Phong Th\u1EA7n B\u1EA3ng rung chuy\u1EC3n! \u0110\u1EA1o h\u1EEFu @${cleanDisplayName} v\u1EEBa x\xF4 \u0111\u1ED5 k\u1EF7 l\u1EE5c h\xF4m nay ch\u1EBF \u0111\u1ED9 ${modeDisplayName} v\u1EDBi th\xE0nh t\xEDch si\xEAu vi\u1EC7t ${recordMetric}! H\xE3y mau mau k\xEDnh ph\u1EE5c \u0110\u1EC7 Nh\u1EA5t B\u1EA3ng V\xE0ng! \u{1F451}\u{1FAB7}`,
      highlightText: `${cleanDisplayName} \u0111\u1EA1t ${recordMetric}`,
      personaId: "linh_lung",
      generateAiPoem: true
    });
  }
  res.json({
    success: true,
    isNewRecord: isNewTop1,
    userRank: {
      daily: dailyResult.rank,
      weekly: weeklyResult.rank,
      allTime: allTimeResult.rank
    },
    highScores: serverLeaderboardData.highScores,
    rankings: serverLeaderboardData.rankings
  });
});
app.post("/api/leaderboard/claim-reward", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserByToken(authHeader);
  if (!user) {
    res.status(401).json({ success: false, error: "\u0110\u1EA1o h\u1EEFu c\u1EA7n \u0111\u0103ng nh\u1EADp \u0111\u1EC3 nh\u1EADn Ph\u1EA7n Th\u01B0\u1EDFng \u0110\u0103ng \u0110\u1EC9nh!" });
    return;
  }
  checkLeaderboardResets();
  const todayStr = getVietnamDateStr();
  const userLower = (user.username || "").toLowerCase();
  const userId = user.id;
  if (user.lastRewardClaimDate === todayStr) {
    res.status(400).json({ success: false, error: "H\xF4m nay \u0111\u1EA1o h\u1EEFu \u0111\xE3 nh\u1EADn ph\u1EA7n th\u01B0\u1EDFng \u0110\u0103ng \u0110\u1EC9nh r\u1ED3i! H\xE3y ti\u1EBFp t\u1EE5c thi \u0111\u1EA5u \u0111\u1EC3 nh\u1EADn th\u01B0\u1EDFng v\xE0o 00:00 ng\xE0y mai!" });
    return;
  }
  let bestDailyRank = 999;
  let bestWeeklyRank = 999;
  let bestModeName = "Chi\u1EBFn Tr\u01B0\u1EDDng T\u1ED1c K\xFD";
  for (const m of VALID_LEADERBOARD_MODES) {
    const dailyList = serverLeaderboardData.rankings[m]?.daily || [];
    const dIdx = dailyList.findIndex((e) => e.userId && e.userId === userId || e.username && e.username.toLowerCase() === userLower);
    if (dIdx !== -1 && dIdx + 1 < bestDailyRank) {
      bestDailyRank = dIdx + 1;
      bestModeName = getModeDisplayName(m);
    }
    const weeklyList = serverLeaderboardData.rankings[m]?.weekly || [];
    const wIdx = weeklyList.findIndex((e) => e.userId && e.userId === userId || e.username && e.username.toLowerCase() === userLower);
    if (wIdx !== -1 && wIdx + 1 < bestWeeklyRank) {
      bestWeeklyRank = wIdx + 1;
    }
  }
  const minRank = Math.min(bestDailyRank, bestWeeklyRank);
  if (minRank > 10) {
    res.status(400).json({
      success: false,
      error: "Hi\u1EC7n t\u1EA1i \u0111\u1EA1o h\u1EEFu ch\u01B0a l\u1ECDt v\xE0o Top 10 c\u1EE7a b\u1EA5t k\u1EF3 ch\u1EBF \u0111\u1ED9 n\xE0o trong h\xF4m nay ho\u1EB7c tu\u1EA7n n\xE0y! H\xE3y thi \u0111\u1EA5u \u0111\u1EC3 ghi danh v\xE0o B\u1EA3ng V\xE0ng nh\u1EADn th\u01B0\u1EDFng!"
    });
    return;
  }
  if (!user.cultivation) {
    user.cultivation = {
      level: 1,
      realmIndex: 0,
      tier: 1,
      exp: 0,
      maxExp: 100,
      thoNguyen: 240,
      maxThoNguyen: 240,
      linhThach: 100
    };
  }
  let rewardStones = 150;
  let rewardExp = 300;
  let rewardTitle = "Ki\xEAn Tr\xEC D\u0169ng Gi\u1EA3";
  let rewardFrame = "default";
  let rewardDesc = "";
  if (minRank === 1) {
    rewardStones = 500;
    rewardExp = 1200;
    rewardTitle = "Kim B\u1EA3ng Tr\u1EA1ng Nguy\xEAn";
    rewardFrame = "frame_kim_bang";
    rewardDesc = `\u{1F947} Qu\xE1n Qu\xE2n \u0110\u0103ng \u0110\u1EC9nh Top 1 ${bestModeName}! Ban t\u1EB7ng danh hi\u1EC7u Ho\xE0ng Kim [Kim B\u1EA3ng Tr\u1EA1ng Nguy\xEAn], Khung Avatar \u0110\u1ED9c Quy\u1EC1n [Kim B\u1EA3ng Chi Ch\u1EE7], +500 Linh Th\u1EA1ch v\xE0 +1200 Tu Vi!`;
  } else if (minRank <= 3) {
    rewardStones = 300;
    rewardExp = 800;
    rewardTitle = minRank === 2 ? "B\u1EA3ng Nh\xE3n Tinh Anh" : "Th\xE1m Hoa Ki\xEAn C\u01B0\u1EDDng";
    rewardFrame = minRank === 2 ? "silver" : "bronze";
    rewardDesc = `\u{1F948} B\u1EA3ng Nh\xE3n / Th\xE1m Hoa Top ${minRank} ${bestModeName}! Ban t\u1EB7ng danh hi\u1EC7u [${rewardTitle}], +300 Linh Th\u1EA1ch v\xE0 +800 Tu Vi!`;
  } else {
    rewardStones = 150;
    rewardExp = 500;
    rewardTitle = "Th\u1EADp \u0110\u1EA1i C\u01B0\u1EDDng Gi\u1EA3";
    rewardDesc = `\u{1F3C5} Th\u1EADp \u0110\u1EA1i Cao Th\u1EE7 Top ${minRank} ${bestModeName}! Ban t\u1EB7ng H\u1ED9p Qu\xE0 \u0110an D\u01B0\u1EE3c Tu Vi, +150 Linh Th\u1EA1ch v\xE0 +500 Tu Vi!`;
  }
  user.cultivation.linhThach = (Number(user.cultivation.linhThach) || 0) + rewardStones;
  user.cultivation.exp = (Number(user.cultivation.exp) || 0) + rewardExp;
  if (!user.cultivation.historyLog) user.cultivation.historyLog = [];
  user.cultivation.historyLog.unshift(`\u{1F381} [PH\u1EA6N TH\u01AF\u1EDENG \u0110\u0102NG \u0110\u1EC8NH] ${rewardDesc}`);
  if (user.cultivation.historyLog.length > 20) user.cultivation.historyLog.pop();
  if (rewardFrame && rewardFrame !== "default") {
    user.frame = rewardFrame;
  }
  user.lastRewardClaimDate = todayStr;
  user.updatedAt = Date.now();
  serverUsers.set(user.id, user);
  saveUsersToFile();
  broadcastHeavenlyDaoEvent({
    title: "\u0110\u0102NG \u0110\u1EC8NH BAN TH\u01AF\u1EDENG",
    eventType: "announcement",
    targetUser: user.displayName || user.username,
    content: `\u{1F338} ${user.displayName || user.username} v\u1EEBa nh\u1EADn Ph\u1EA7n Th\u01B0\u1EDFng \u0110\u0103ng \u0110\u1EC9nh M\xF9a Gi\u1EA3i (${minRank === 1 ? "Qu\xE1n Qu\xE2n Top 1" : `H\u1EA1ng #${minRank}`})! Linh th\u1EA1ch d\u1ED3i d\xE0o, tu vi \u0111\u1EA1i ti\u1EBFn!`,
    personaId: "linh_lung"
  });
  res.json({
    success: true,
    message: rewardDesc,
    reward: {
      rank: minRank,
      title: rewardTitle,
      frame: rewardFrame,
      spiritStones: rewardStones,
      exp: rewardExp
    },
    cultivation: user.cultivation,
    user: sanitizeUser(user)
  });
});
app.post("/api/leaderboard/admin-update", (req, res) => {
  const { highScores } = req.body;
  if (highScores && typeof highScores === "object") {
    const sanitized = {};
    for (const [k, v] of Object.entries(highScores)) {
      if (v && typeof v === "object") {
        const rec = v;
        sanitized[k] = {
          ...rec,
          displayName: rec.displayName || rec.username
        };
      } else {
        sanitized[k] = null;
      }
    }
    serverLeaderboardData.highScores = { ...serverLeaderboardData.highScores, ...sanitized };
    saveLeaderboardToFile();
    broadcastLeaderboard();
    res.json({ success: true, highScores: serverLeaderboardData.highScores });
    return;
  }
  res.status(400).json({ success: false, error: "D\u1EEF li\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7" });
});
app.post("/api/leaderboard/admin-reset", (req, res) => {
  const { mode } = req.body || {};
  if (mode && VALID_LEADERBOARD_MODES.includes(mode)) {
    serverLeaderboardData.highScores[mode] = null;
    serverLeaderboardData.rankings[mode] = { daily: [], weekly: [], all_time: [] };
  } else {
    for (const m of VALID_LEADERBOARD_MODES) {
      serverLeaderboardData.highScores[m] = null;
      serverLeaderboardData.rankings[m] = { daily: [], weekly: [], all_time: [] };
    }
  }
  saveLeaderboardToFile();
  broadcastLeaderboard();
  res.json({ success: true, highScores: serverLeaderboardData.highScores, rankings: serverLeaderboardData.rankings });
});
function generateFallbackPracticeWords(mistakes = [], errorKeys = [], mode = "vi_dau") {
  const pool2 = /* @__PURE__ */ new Set();
  const modeStr = String(mode || "").toLowerCase();
  const isNumber = modeStr === "numpad" || modeStr === "number" || modeStr.includes("number") || modeStr.includes("numpad") || modeStr.includes("s\u1ED1") || modeStr.includes("digits");
  const rawMistakes = [];
  if (Array.isArray(mistakes)) {
    mistakes.forEach((m) => {
      const orig = typeof m === "string" ? m : m?.original || m?.word;
      if (orig && typeof orig === "string") {
        orig.trim().split(/\s+/).forEach((w) => {
          if (isNumber) {
            const clean = w.replace(/[^\d+\-*/=.]/g, "");
            if (clean && !rawMistakes.includes(clean)) {
              rawMistakes.push(clean);
              pool2.add(clean);
            }
          } else {
            const clean = w.toLowerCase().trim();
            if (clean && !rawMistakes.includes(clean)) {
              rawMistakes.push(clean);
              pool2.add(clean);
            }
          }
        });
      }
    });
  }
  const keyList = Array.isArray(errorKeys) ? errorKeys.map((k) => typeof k === "string" ? k : k?.key).filter(Boolean) : [];
  if (isNumber) {
    const numberPool = [
      "1024",
      "58008",
      "2026",
      "9876",
      "1234",
      "5050",
      "31415",
      "92653",
      "7410",
      "8520",
      "9630",
      "4567",
      "7890",
      "13579",
      "24680",
      "9988",
      "1122",
      "3344",
      "7700",
      "4040",
      "8080",
      "1995",
      "2000",
      "2025",
      "128",
      "256",
      "512",
      "1000",
      "9999",
      "8888",
      "7777",
      "6543",
      "2109"
    ];
    for (const n of numberPool) {
      if (pool2.size >= 30) break;
      if (keyList.some((k) => n.includes(String(k)))) {
        pool2.add(n);
      }
    }
    for (const n of numberPool) {
      if (pool2.size >= 25) break;
      pool2.add(n);
    }
    return Array.from(pool2).slice(0, 30);
  }
  const isEn = modeStr === "en";
  const isViNoDau = modeStr === "vi_nodau";
  const relatedVnNoDau = [
    "nghieng",
    "khoang",
    "chuyen",
    "tuyet",
    "khuyen",
    "nghiep",
    "truyen",
    "quyet",
    "xoay",
    "thoat",
    "khoanh",
    "quynh",
    "nguyet",
    "duyen",
    "ban",
    "phim",
    "toc",
    "do",
    "chinh",
    "xac",
    "chien",
    "thang",
    "ren",
    "luyen",
    "ky",
    "nang",
    "thao",
    "truong",
    "phan",
    "dau",
    "kien",
    "tri",
    "nhip",
    "nhang",
    "chuoi"
  ];
  const relatedVnDau = [
    "nghi\xEAng",
    "kho\u1EA3ng",
    "chuy\u1EC3n",
    "tuy\u1EC7t",
    "khuy\u1EBFn",
    "nghi\u1EC7p",
    "truy\u1EC1n",
    "quy\u1EBFt",
    "xoay",
    "tho\xE1t",
    "kho\u1EA3nh",
    "ngo\xE9o",
    "qu\u1EF3nh",
    "nguy\u1EC7t",
    "duy\xEAn",
    "b\xE0n",
    "ph\xEDm",
    "t\u1ED1c",
    "\u0111\u1ED9",
    "ch\xEDnh",
    "x\xE1c",
    "chi\u1EBFn",
    "th\u1EAFng",
    "r\xE8n",
    "luy\u1EC7n",
    "k\u1EF9",
    "n\u0103ng",
    "thao",
    "tr\u01B0\u1EDDng",
    "ph\u1EA5n",
    "\u0111\u1EA5u",
    "ki\xEAn",
    "tr\xEC",
    "nh\u1ECBp",
    "nh\xE0ng",
    "chu\u1ED7i"
  ];
  const relatedEn = [
    "rhythm",
    "queue",
    "strength",
    "synergy",
    "awkward",
    "beautiful",
    "keyboard",
    "practice",
    "accuracy",
    "mastery",
    "challenge",
    "experience",
    "quick",
    "flight",
    "balance",
    "control",
    "fingers",
    "velocity",
    "precision",
    "focus",
    "reflexes"
  ];
  const source = isEn ? relatedEn : isViNoDau ? relatedVnNoDau : relatedVnDau;
  const detectedPatterns = [];
  rawMistakes.forEach((w) => {
    const lower = w.toLowerCase();
    ["ngh", "qu", "ph", "tr", "ch", "kh", "uy\xEAn", "u\xF4ng", "\u01B0\u01A1ng", "oang"].forEach((pat) => {
      if (lower.includes(pat) && !detectedPatterns.includes(pat)) {
        detectedPatterns.push(pat);
      }
    });
  });
  if (detectedPatterns.length > 0) {
    source.forEach((w) => {
      if (pool2.size >= 26) return;
      if (detectedPatterns.some((pat) => w.includes(pat))) {
        pool2.add(w);
      }
    });
  }
  for (const w of source) {
    if (pool2.size >= 30) break;
    if (keyList.some((k) => w.includes(String(k)))) {
      pool2.add(w);
    }
  }
  for (const w of source) {
    if (pool2.size >= 25) break;
    pool2.add(w);
  }
  return Array.from(pool2).slice(0, 30);
}
function buildHeuristicDaoResponse(params) {
  const {
    realmName,
    tier,
    subStage,
    avgWpm,
    peakWpm,
    avgAcc,
    avgConsistency,
    safeTotal,
    count,
    introErrors,
    accelErrors,
    sustainErrors,
    endgameErrors,
    allMistakes,
    errorKeysMap,
    mode = "vi_dau"
  } = params;
  const modeStr = String(mode || "").toLowerCase();
  const hasNumericMistakes = allMistakes && allMistakes.some((m) => {
    const s = String(typeof m === "string" ? m : m?.original || m?.word || "").trim();
    return /^[\d+\-*/=.]+$/.test(s);
  });
  const isNumberMode = modeStr === "numpad" || modeStr === "number" || modeStr.includes("number") || modeStr.includes("numpad") || modeStr.includes("s\u1ED1") || Boolean(hasNumericMistakes);
  const defaultErrorPatterns = isNumberMode ? [
    {
      id: "numpad_reach_slip",
      name: "Tr\u01B0\u1EE3t Ph\xEDm H\xE0ng S\u1ED1 / Numpad Xa",
      xianxiaTitle: "C\u1EEDu Cung Th\u1EA7n S\u1ED1 Ch\u01B0\u1EDBng",
      frequency: Math.max(2, Math.round(safeTotal * 0.45)),
      percentage: 45,
      description: "V\u01B0\u01A1n ng\xF3n tay l\xEAn h\xE0ng ph\xEDm s\u1ED1 tr\xEAn c\xF9ng ho\u1EB7c g\xF5 nh\u1EA7m c\xE1c ph\xEDm g\xF3c xa (7, 8, 9, 0) tr\xEAn Numpad.",
      biomechanics: "T\u1EA7m v\u1EDBi c\u1EE7a ng\xF3n tay k\xE9o c\u0103ng c\u01A1 du\u1ED7i c\u1ED5 tay, thi\u1EBFu \u0111i\u1EC3m t\u1EF1a x\xFAc gi\xE1c \u0111\u1ECBnh v\u1ECB nh\u01B0 ph\xEDm 5.",
      examples: ["7 -> 8", "9 -> 6", "0 -> ."],
      severity: "high"
    },
    {
      id: "digit_transposition",
      name: "\u0110\u1EA3o Th\u1EE9 T\u1EF1 Ch\u1EEF S\u1ED1 (Tay Nhanh H\u01A1n N\xE3o)",
      xianxiaTitle: "Ngh\u1ECBch Chuy\u1EC3n L\u1EE5c H\xE0o Ma",
      frequency: Math.max(2, Math.round(safeTotal * 0.3)),
      percentage: 30,
      description: "G\xF5 \u0111\u1EA3o v\u1ECB tr\xED 2 ch\u1EEF s\u1ED1 li\u1EC1n k\u1EC1 khi nh\u1ECBp \u0111\u1ED9 t\u0103ng t\u1ED1c (v\xED d\u1EE5 g\xF5 12 th\xE0nh 21, 58 th\xE0nh 85).",
      biomechanics: "M\u1EA5t c\xE2n b\u1EB1ng \u0111\u1ED9 tr\u1EC5 v\u1EADn \u0111\u1ED9ng th\u1EA7n kinh khi g\xF5 chu\u1ED7i s\u1ED1 t\u1ED1c \u0111\u1ED9 cao.",
      examples: ["58 -> 85", "12 -> 21", "08 -> 80"],
      severity: "medium"
    },
    {
      id: "thumb_pinky_rhythm",
      name: "Kh\u1EF1ng Nh\u1ECBp Ph\xEDm 0 / Enter / Ph\xE9p T\xEDnh",
      xianxiaTitle: "\u0110\u1ECBnh Th\u1EA7n Khuy\u1EBFt L\u1EF1c Ma",
      frequency: Math.max(1, Math.round(safeTotal * 0.25)),
      percentage: 25,
      description: "Ng\xF3n c\xE1i ho\u1EB7c ng\xF3n \xFAt \u1EA5n ph\xEDm 0 ho\u1EB7c Space b\u1ECB tr\u1EC5 nh\u1ECBp so v\u1EDBi c\xE1c ng\xF3n tr\u1ECF v\xE0 gi\u1EEFa.",
      biomechanics: "Ph\u1EA3n x\u1EA1 ng\xF3n c\xE1i v\xE0 ng\xF3n \xFAt c\xF3 \u0111\u1ED9 linh ho\u1EA1t th\u1EA5p h\u01A1n ng\xF3n tr\u1ECF tr\xEAn layout numpad.",
      examples: ["0 h\u1EE5t l\u1EF1c", "ch\u1EADm nh\u1ECBp chuy\u1EC3n s\u1ED1"],
      severity: "low"
    }
  ] : [
    {
      id: "telex_tone_clash",
      name: "Xung \u0111\u1ED9t Ph\xEDm D\u1EA5u Telex",
      xianxiaTitle: "D\u1EA5u Thanh H\u1ED7n Lo\u1EA1n Ch\u01B0\u1EDBng",
      frequency: Math.max(2, Math.round(safeTotal * 0.4)),
      percentage: 40,
      description: "G\xF5 ph\xEDm d\u1EA5u thanh ti\u1EBFng Vi\u1EC7t (s, f, r, x, j, w) qu\xE1 s\u1EDBm khi nguy\xEAn \xE2m tr\u01B0\u1EDBc ch\u01B0a k\u1ECBp ghi nh\u1EADn.",
      biomechanics: "Ng\xF3n tay l\u01B0\u1EDBt ph\xEDm d\u1EA5u tr\u01B0\u1EDBc khi ng\xF3n tr\u1ECF ho\u1EB7c ng\xF3n gi\u1EEFa bu\xF4ng ph\xEDm nguy\xEAn \xE2m k\u1EBF tr\u01B0\u1EDBc.",
      examples: ["th\u01B0\u1EDDg -> th\u01B0\u1EDDng", "nhi\xF9e -> nhi\u1EC1u", "ngh\u0129n -> ngh\xECn"],
      severity: "high"
    },
    {
      id: "transposition_rush",
      name: "\u0110\u1EA3o K\xFD T\u1EF1 Tay Nhanh H\u01A1n N\xE3o",
      xianxiaTitle: "T\xE2m G\u1EA5p Kh\xED Lo\u1EA1n Ma",
      frequency: Math.max(2, Math.round(safeTotal * 0.3)),
      percentage: 30,
      description: "Ho\xE1n v\u1ECB th\u1EE9 t\u1EF1 2 k\xFD t\u1EF1 li\u1EC1n nhau do tay ph\u1EA3i xu\u1EA5t chi\xEAu tr\u01B0\u1EDBc tay tr\xE1i.",
      biomechanics: "M\u1EA5t c\xE2n b\u1EB1ng \u0111\u1ED9 tr\u1EC5 v\u1EADn \u0111\u1ED9ng th\u1EA7n kinh gi\u1EEFa hai b\xE1n c\u1EA7u n\xE3o khi g\xF5 t\u1EEB quen thu\u1ED9c.",
      examples: ["ch -> hc", "ng -> gn", "th -> ht"],
      severity: "medium"
    },
    {
      id: "pinky_slip",
      name: "Tr\u01B0\u1EE3t Ph\xEDm R\xECa Ngo\xE0i Ng\xF3n \xDAt",
      xianxiaTitle: "Ng\xF3n \xDAt Khuy\u1EBFt L\u1EF1c Ma",
      frequency: Math.max(1, Math.round(safeTotal * 0.2)),
      percentage: 20,
      description: "C\xE1c ph\xEDm n\u1EB1m \u1EDF g\xF3c xa (P, Q, Z, [, ], Shift) b\u1ECB h\u1EE5t l\u1EF1c ho\u1EB7c ch\u1EA1m nh\u1EA7m ph\xEDm li\u1EC1n k\u1EC1.",
      biomechanics: "C\u01A1 du\u1ED7i ng\xF3n \xFAt c\xF3 t\u1EA7m v\u1EDBi xa nh\u1EA5t v\xE0 l\u1EF1c \u1EA5n y\u1EBFu nh\u1EA5t tr\xEAn b\xE0n ph\xEDm.",
      examples: ["p -> o", "q -> w", "z -> a"],
      severity: "low"
    }
  ];
  const pathwaySteps = isNumberMode ? {
    step1: {
      title: "B\u01B0\u1EDBc 1: Kh\u1EDFi Nh\u1ECBp Ch\u1EADm Ch\u1EAFc \u1EDE 10 Gi\xE2y \u0110\u1EA7u",
      desc: "T\u1EADp trung g\xF5 100% ch\xEDnh x\xE1c \u1EDF 10 gi\xE2y \u0111\u1EA7u v\xE1n \u0111\u1EC3 b\xE0n tay thi\u1EBFt l\u1EADp nh\u1ECBp \u0111i\u1EC7u s\u1ED1 h\u1ECDc \u1ED5n \u0111\u1ECBnh."
    },
    step2: {
      title: "B\u01B0\u1EDBc 2: \u0110\u1ECBnh V\u1ECB Ph\xEDm 5 Numpad L\xE0m \u0110i\u1EC3m T\u1EF1a G\u1ED1c",
      desc: "Gi\u1EEF ng\xF3n gi\u1EEFa lu\xF4n c\u1EA3m nh\u1EADn \u0111i\u1EC3m g\u1EDD ph\xEDm 5 \u0111\u1EC3 c\xE1c ng\xF3n kh\xE1c v\u01B0\u01A1n t\u1EDBi c\xE1c ph\xEDm 7, 8, 9, 1, 2, 3 m\xE0 kh\xF4ng c\u1EA7n nh\xECn b\xE0n ph\xEDm."
    },
    step3: {
      title: "B\u01B0\u1EDBc 3: Luy\u1EC7n B\u1ED9 D\xE3y S\u1ED1 H\xF3a Gi\u1EA3i T\xE2m Ma M\u1ED7i Ng\xE0y",
      desc: "Th\u1EF1c h\xE0nh \u0111\u1EC1u \u0111\u1EB7n v\u1EDBi b\u1ED9 chu\u1ED7i s\u1ED1 c\xE1 nh\xE2n h\xF3a do Thi\xEAn \u0110\u1EA1o AI \u0111\u1EC1 xu\u1EA5t trong ch\u1EBF \u0111\u1ED9 Solo S\u1ED1."
    }
  } : {
    step1: {
      title: "B\u01B0\u1EDBc 1: Kh\u1EDFi Nh\u1ECBp Ch\u1EADm Ch\u1EAFc \u1EDE 10 Gi\xE2y \u0110\u1EA7u",
      desc: "T\u1EADp trung g\xF5 100% ch\xEDnh x\xE1c \u1EDF 10 gi\xE2y \u0111\u1EA7u v\xE1n \u0111\u1EC3 b\xE0n tay thi\u1EBFt l\u1EADp nh\u1ECBp \u0111i\u1EC7u \u1ED5n \u0111\u1ECBnh."
    },
    step2: {
      title: "B\u01B0\u1EDBc 2: H\xF3a Gi\u1EA3i L\u1ED7i D\u1EA5u Telex B\u1EB1ng Nh\u1ECBp Bu\xF4ng Ph\xEDm",
      desc: "T\u1EADp bu\xF4ng ph\xEDm nguy\xEAn \xE2m tr\u01B0\u1EDBc khi ch\u1EA1m ph\xEDm d\u1EA5u thanh \u0111\u1EC3 tr\xE1nh ngh\u1EBDn b\u1ED9 \u0111\u1EC7m g\xF5 ti\u1EBFng Vi\u1EC7t."
    },
    step3: {
      title: "B\u01B0\u1EDBc 3: Luy\u1EC7n B\u1ED9 T\u1EEB H\xF3a Gi\u1EA3i T\xE2m Ma M\u1ED7i Ng\xE0y",
      desc: "Th\u1EF1c h\xE0nh \u0111\u1EC1u \u0111\u1EB7n v\u1EDBi b\u1ED9 t\u1EEB c\xE1 nh\xE2n h\xF3a do Thi\xEAn \u0110\u1EA1o AI \u0111\u1EC1 xu\u1EA5t trong ch\u1EBF \u0111\u1ED9 Solo."
    }
  };
  return {
    playerRealm: {
      realmName,
      tier,
      subStage,
      currentWpm: avgWpm,
      wpmBracket: `${realmName} (${Math.max(20, avgWpm - 10)} - ${avgWpm + 15} WPM)`
    },
    overallVerdict: {
      title: isNumberMode ? `Thi\xEAn \u0110\u1EA1o Ph\xE1n Quy\u1EBFt: To\xE1n Ph\xE1p \u0110\u1EA1o C\u01A1 ${realmName} ${subStage}` : `Thi\xEAn \u0110\u1EA1o Ph\xE1n Quy\u1EBFt: \u0110\u1EA1o C\u01A1 ${realmName} ${subStage}`,
      summary: isNumberMode ? `Quan tr\u1EAFc qua ${count} v\xE1n \u0111\u1EA5u b\xE0n ph\xEDm s\u1ED1, t\u1ED1c \u0111\u1ED9 trung b\xECnh \u0111\u1EA1t ${avgWpm} WPM (\u0110\u1EC9nh: ${peakWpm} WPM) v\u1EDBi \u0111\u1ED9 chu\u1EA9n x\xE1c ${avgAcc}%. B\u1EA1n ki\u1EC3m so\xE1t c\xE1c ph\xEDm s\u1ED1 r\u1EA5t t\u1ED1t song \u0111ang g\u1EB7p b\xECnh c\u1EA3nh do nh\u1ECBp v\u01B0\u01A1n ng\xF3n tay \u1EDF c\xE1c ph\xEDm s\u1ED1 xa.` : `Quan tr\u1EAFc qua ${count} v\xE1n \u0111\u1EA5u, t\u1ED1c \u0111\u1ED9 trung b\xECnh \u0111\u1EA1t ${avgWpm} WPM (\u0110\u1EC9nh: ${peakWpm} WPM) v\u1EDBi \u0111\u1ED9 chu\u1EA9n x\xE1c ${avgAcc}%. B\u1EA1n \u0111ang \u1EDF n\u1EEDa tr\xEAn c\u1EE7a ph\xE2n kh\xFAc tr\xECnh \u0111\u1ED9 hi\u1EC7n t\u1EA1i, song \u0111ang g\u1EB7p b\xECnh c\u1EA3nh do nh\u1ECBp ph\xEDm t\u1EA1i giai \u0111o\u1EA1n t\u0103ng t\u1ED1c.`,
      tamMaName: isNumberMode ? "T\xE2m Ma Th\u1EA7n S\u1ED1 (N\xF4n N\xF3ng B\u1EA5m S\u1ED1)" : "T\xE2m G\u1EA5p Kh\xED Lo\u1EA1n (V\u1ED9i V\xE0ng Xu\u1EA5t Chi\xEAu)",
      tamMaDescription: isNumberMode ? "L\u1ED7i ph\xE1t sinh ch\u1EE7 y\u1EBFu khi c\u1ED1 b\u1EE9t t\u1ED1c g\xF5 chu\u1ED7i s\u1ED1 li\xEAn ti\u1EBFp l\xE0m ng\xF3n tay tr\u01B0\u1EE3t sang ph\xEDm s\u1ED1 li\u1EC1n k\u1EC1 tr\xEAn b\xE0n ph\xEDm s\u1ED1." : "L\u1ED7i ph\xE1t sinh ch\u1EE7 y\u1EBFu khi c\u1ED1 g\u1EAFng b\u1EE9t t\u1ED1c g\xF5 nhanh h\u01A1n ng\u01B0\u1EE1ng ph\u1EA3n x\u1EA1 an to\xE0n c\u1EE7a ng\xF3n tay, g\xE2y ra chu\u1ED7i Backspace l\xE0m gi\xE1n \u0111o\u1EA1n nh\u1ECBp th\u1EDF.",
      overallPercentile: Math.min(95, Math.max(25, Math.round(avgWpm / 110 * 80))),
      breakthroughReadiness: Math.min(95, Math.max(30, Math.round(avgAcc / 100 * 85)))
    },
    errorPatterns: defaultErrorPatterns,
    timingAnalysis: {
      phases: [
        {
          phaseId: "intro",
          name: "Kh\u1EDFi Th\u1EE9c (Nh\u1EADp Cu\u1ED9c)",
          xianxiaPhase: "S\u01A1 Khai \u0110\u1ECBnh Th\u1EA7n",
          timeRange: "0s - 15s (25% \u0111\u1EA7u v\xE1n)",
          errorCount: introErrors,
          errorPercentage: Math.round(introErrors / safeTotal * 100),
          description: "B\xE0n tay ch\u01B0a \u0111\u1EE7 \u0111\u1ED9 \u1EA5m, v\u1ED9i v\xE0ng g\xF5 t\u1EEB \u0111\u1EA7u ti\xEAn d\u1EABn \u0111\u1EBFn l\u1EC7ch nh\u1ECBp.",
          riskLevel: introErrors / safeTotal > 0.3 ? "cao" : "thap"
        },
        {
          phaseId: "acceleration",
          name: "T\u0103ng T\u1ED1c (V\u1EADn Kh\xED)",
          xianxiaPhase: "C\u1EF1c H\u1EA1n B\u1EE9t Ph\xE1",
          timeRange: "15s - 35s (Giai \u0111o\u1EA1n \u0111\u1EA9y WPM)",
          errorCount: accelErrors,
          errorPercentage: Math.round(accelErrors / safeTotal * 100),
          description: "C\u1ED1 g\u1EAFng \u0111\u1EA9y WPM v\u01B0\u1EE3t qu\xE1 ng\u01B0\u1EE1ng ph\u1EA3n x\u1EA1 an to\xE0n c\u1EE7a ng\xF3n tay.",
          riskLevel: accelErrors / safeTotal > 0.3 ? "cao" : "trung_binh"
        },
        {
          phaseId: "sustain",
          name: "B\xECnh \u1ED4n (Trung Ch\xE2u)",
          xianxiaPhase: "\u0110\u1EA1o T\xE2m Tr\xEC Tr\u1EC7",
          timeRange: "35s - 50s (Duy tr\xEC nh\u1ECBp)",
          errorCount: sustainErrors,
          errorPercentage: Math.round(sustainErrors / safeTotal * 100),
          description: "L\u1ED7i xu\u1EA5t hi\u1EC7n sau c\xE1c t\u1EEB d\xE0i ho\u1EB7c khi \u0111\u1ED5i d\xF2ng v\u0103n b\u1EA3n.",
          riskLevel: "thap"
        },
        {
          phaseId: "endgame",
          name: "V\u1EC1 \u0110\xEDch (T\xE0n Ki\u1EBFp)",
          xianxiaPhase: "Linh Kh\xED Kh\xF4 Ki\u1EC7t",
          timeRange: "50s - 60s+ (R\xFAt \u0111\xEDch)",
          errorCount: endgameErrors,
          errorPercentage: Math.round(endgameErrors / safeTotal * 100),
          description: "M\u1ECFi c\u01A1 c\u1ED5 tay ho\u1EB7c n\xF4n n\xF3ng nh\xECn \u0111\u1ED3ng h\u1ED3 \u0111\u1EBFm ng\u01B0\u1EE3c.",
          riskLevel: endgameErrors / safeTotal > 0.28 ? "cao" : "trung_binh"
        }
      ],
      criticalMomentVerdict: `Th\u1EDDi \u0111i\u1EC3m ph\xE1t sinh l\u1ED7i nhi\u1EC1u nh\u1EA5t t\u1EADp trung \u1EDF giai \u0111o\u1EA1n ${accelErrors >= introErrors && accelErrors >= endgameErrors ? "T\u0103ng T\u1ED1c (15s - 35s)" : "V\u1EC1 \u0110\xEDch (50s - 60s+)"}.`,
      avgRecoveryLatencyMs: 340,
      peerAvgRecoveryMs: 380,
      cascadeErrorRate: 22
    },
    peerComparison: {
      bracketName: `${realmName} (${Math.max(20, avgWpm - 10)} - ${avgWpm + 15} WPM)`,
      description: `So s\xE1nh 6 Tr\u1EE5 C\u1ED9t \u0110\u1EA1o C\u01A1 gi\u1EEFa b\u1EA1n v\u1EDBi b\xECnh qu\xE2n tu s\u0129 c\xF9ng ph\xE2n kh\xFAc WPM.`,
      metrics: [
        {
          key: "speed",
          label: "T\u1ED1c \u0110\u1ED9 Xu\u1EA5t Chi\xEAu (WPM)",
          xianxiaLabel: "Ng\u1EF1 Kh\xED Th\u1EA7n T\u1ED1c",
          unit: "WPM",
          playerValue: avgWpm,
          peerAverage: Math.max(15, avgWpm - 4),
          peerTop10: Math.round(avgWpm * 1.25),
          percentile: Math.min(95, Math.max(30, Math.round(avgWpm / 120 * 85))),
          assessment: "T\u1ED1c \u0111\u1ED9 xu\u1EA5t chi\xEAu thu\u1ED9c di\u1EC7n nhanh nh\u1EB9n trong c\u1EA3nh gi\u1EDBi."
        },
        {
          key: "accuracy",
          label: "T\xE2m Ph\xE1p Tinh Chu\u1EA9n (%)",
          xianxiaLabel: "B\xE1ch B\u1ED9 Xuy\xEAn D\u01B0\u01A1ng",
          unit: "%",
          playerValue: avgAcc,
          peerAverage: 94,
          peerTop10: 98,
          percentile: Math.min(99, Math.max(20, Math.round((avgAcc - 85) / 14 * 100))),
          assessment: avgAcc >= 95 ? "\u0110\u1ED9 chu\u1EA9n x\xE1c r\u1EA5t t\u1ED1t" : "C\u1EA7n gi\u1EA3m 5% t\u1ED1c \u0111\u1ED9 \u0111\u1EC3 n\xE2ng \u0111\u1ED9 chu\u1EA9n x\xE1c l\xEAn tr\xEAn 96%"
        },
        {
          key: "consistency",
          label: "\u0110\u1EA1o T\xE2m Ki\xEAn \u0110\u1ECBnh (%)",
          xianxiaLabel: "B\u1EA5t \u0110\u1ED9ng Nh\u01B0 S\u01A1n",
          unit: "%",
          playerValue: avgConsistency,
          peerAverage: 82,
          peerTop10: 92,
          percentile: Math.min(95, Math.max(25, avgConsistency)),
          assessment: avgConsistency >= 85 ? "Nh\u1ECBp g\xF5 c\u1EF1c k\u1EF3 \u0111\u1EC1u \u0111\u1EB7n" : "Nh\u1ECBp g\xF5 ch\u01B0a \u0111\u1EC1u, hay b\u1ECB kh\u1EF1ng gi\u1EEFa c\xE1c t\u1EEB"
        },
        {
          key: "recovery",
          label: "H\u1ED3i Ph\u1EE5c Th\u1EA7n Th\u1EE9c (ms)",
          xianxiaLabel: "Ho\xE0n H\u1ED3n \u0110\u1ECBnh Ph\xE1ch",
          unit: "ms",
          playerValue: 340,
          peerAverage: 380,
          peerTop10: 180,
          percentile: 65,
          assessment: "Th\u1EDDi gian s\u1EEDa l\u1ED7i \u1EDF m\u1EE9c kh\xE1, c\u1EA7n ph\u1EA3n x\u1EA1 Backspace nhanh v\xE0 d\u1EE9t kho\xE1t h\u01A1n."
        },
        {
          key: "stamina",
          label: "\u0110\u1ED9 B\u1EC1n Kh\xED T\u1EE9c (Cu\u1ED1i Tr\u1EADn)",
          xianxiaLabel: "Tr\u01B0\u1EDDng Sinh B\u1EA5t Di\u1EC7t",
          unit: "/100",
          playerValue: 78,
          peerAverage: 72,
          peerTop10: 90,
          percentile: 78,
          assessment: "Gi\u1EEF \u0111\u01B0\u1EE3c phong \u0111\u1ED9 t\u01B0\u01A1ng \u0111\u1ED1i \u1ED5n \u0111\u1ECBnh v\xE0o cu\u1ED1i v\xE1n \u0111\u1EA5u."
        },
        {
          key: "breakthrough",
          label: "Ti\u1EC1m N\u0103ng \u0110\u1ED9t Ph\xE1 (%)",
          xianxiaLabel: "Thi\xEAn C\u01A1 Khai M\u1EDF",
          unit: "%",
          playerValue: 82,
          peerAverage: 65,
          peerTop10: 92,
          percentile: 82,
          assessment: isNumberMode ? "H\u1ED9i t\u1EE5 \u0111\u1EE7 kh\xED v\u1EADn \u0111\u1EC3 \u0111\u1ED9t ph\xE1 c\u1EA3nh gi\u1EDBi k\u1EBF ti\u1EBFp n\u1EBFu kh\u1EAFc ph\u1EE5c \u0111\u01B0\u1EE3c l\u1ED7i tr\u01B0\u1EE3t ph\xEDm s\u1ED1 xa." : "H\u1ED9i t\u1EE5 \u0111\u1EE7 kh\xED v\u1EADn \u0111\u1EC3 \u0111\u1ED9t ph\xE1 c\u1EA3nh gi\u1EDBi k\u1EBF ti\u1EBFp n\u1EBFu kh\u1EAFc ph\u1EE5c \u0111\u01B0\u1EE3c l\u1ED7i d\u1EA5u Telex."
        }
      ]
    },
    breakthroughPathway: pathwaySteps,
    practiceWords: generateFallbackPracticeWords(
      allMistakes,
      Object.entries(errorKeysMap).map(([key, count2]) => ({ key, count: count2 })),
      isNumberMode ? "numpad" : mode
    )
  };
}
app.post("/api/ai/personalized-practice", async (req, res) => {
  try {
    const {
      mistakes = [],
      commonErrorKeys = [],
      slowestWord,
      averageHesitationMs,
      stats = {},
      recentMatches = [],
      mode = "vi_dau"
    } = req.body || {};
    const modeStr = String(mode || "").toLowerCase();
    const isNumberMode = modeStr === "numpad" || modeStr === "number" || modeStr.includes("number") || modeStr.includes("numpad") || modeStr.includes("s\u1ED1") || modeStr.includes("digits");
    const isEnMode = modeStr === "en";
    const isViNoDauMode = modeStr === "vi_nodau";
    const effectiveMistakes = isNumberMode ? mistakes.filter((m) => {
      const s = String(m?.original || m?.word || "");
      return /[\d+\-*/=.]/.test(s) && !/[a-zA-Zà-ỹÀ-Ỹ]/.test(s);
    }) : mistakes;
    const effectiveErrorKeys = isNumberMode ? commonErrorKeys.filter((k) => {
      const s = String(typeof k === "string" ? k : k?.key || "");
      return /[\d+\-*/=.]/.test(s) && !/[a-zA-Z]/.test(s);
    }) : commonErrorKeys;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || isGeminiProjectAccessDenied) {
      return res.json({
        success: true,
        analysis: {
          title: isNumberMode ? "B\xE0i T\u1EADp Luy\u1EC7n B\xE0n Ph\xEDm S\u1ED1 Chuy\xEAn S\xE2u (Number Drill)" : "B\xE0i T\u1EADp Kh\u1EAFc Ph\u1EE5c L\u1ED7i Sai C\xE1 Nh\xE2n",
          overview: isNumberMode ? "\u0110\xE3 b\xF3c t\xE1ch c\xE1c ch\u1EEF s\u1ED1 hay g\xF5 nh\u1EA7m v\xE0 nh\u1ECBp v\u01B0\u01A1n ng\xF3n tay t\u1EEB c\xE1c v\xE1n \u0111\u1EA5u ch\u1EBF \u0111\u1ED9 S\u1ED1 c\u1EE7a b\u1EA1n." : "\u0110\xE3 ph\xE2n t\xEDch c\xE1c l\u1ED7i sai v\xE0 c\u1EE5m ph\xEDm hay g\xF5 nh\u1EA7m t\u1EEB l\u1ECBch s\u1EED \u0111\u1EA5u c\u1EE7a b\u1EA1n.",
          dominantErrorPattern: isNumberMode ? "Tr\u01B0\u1EE3t ph\xEDm s\u1ED1 xa & nh\u1ECBp b\u1EA5m Numpad" : "L\u1ED7i nh\u1ECBp g\xF5 & t\u1ED5 h\u1EE3p d\u1EA5u thanh",
          keyWeaknesses: effectiveMistakes.slice(0, 3).map((m) => `${m.original || m.word} (g\xF5 th\xE0nh ${m.typed})`),
          targetClusters: effectiveErrorKeys.slice(0, 5).map((k) => typeof k === "string" ? k : k.key),
          coachAdvice: isNumberMode ? "Gi\u1EEF ng\xF3n gi\u1EEFa \u0111\u1EB7t tr\xEAn ph\xEDm 5 c\xF3 g\u1EDD x\xFAc gi\xE1c l\xE0m \u0111i\u1EC3m t\u1EF1a \u0111\u1EC3 \u0111\u1ECBnh v\u1ECB ch\xEDnh x\xE1c to\xE0n b\u1ED9 h\xE0ng ph\xEDm s\u1ED1." : "H\xE3y t\u1EADp trung g\xF5 \u0111\u1EC1u nh\u1ECBp, \u01B0u ti\xEAn \u0111\u1ED9 ch\xEDnh x\xE1c 100% cho c\xE1c ph\u1EE5 \xE2m v\xE0 c\u1EE5m d\u1EA5u thanh ti\u1EBFng Vi\u1EC7t."
        },
        practiceWords: generateFallbackPracticeWords(effectiveMistakes, effectiveErrorKeys, mode),
        isAiPowered: false
      });
    }
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    let coachRole = "B\u1EA1n l\xE0 Hu\u1EA5n luy\u1EC7n vi\xEAn \u0110\xE1nh m\xE1y Chuy\xEAn s\xE2u (Typing Master Coach) cho m\xF4n th\u1EC3 thao g\xF5 ph\xEDm ti\u1EBFng Vi\u1EC7t (FastTyping Challenge).";
    let modeRule = "";
    if (isNumberMode) {
      coachRole = "B\u1EA1n l\xE0 Hu\u1EA5n luy\u1EC7n vi\xEAn Chuy\xEAn s\xE2u v\u1EC1 B\xE0n ph\xEDm s\u1ED1 & T\u1ED1c \u0111\u1ED9 g\xF5 s\u1ED1 (Numpad & Number Speed Typing Coach) tr\xEAn FastTyping.";
      modeRule = `
*** \u0110\u1EB6C BI\u1EC6T B\u1EAET BU\u1ED8C (CRITICAL REQUIREMENT) ***
1. Ch\u1EBF \u0111\u1ED9 thi \u0111\u1EA5u hi\u1EC7n t\u1EA1i c\u1EE7a ng\u01B0\u1EDDi ch\u01A1i l\xE0: B\xC0N PH\xCDM S\u1ED0 / NUMBER MODE (CH\u1EC8 CH\u1EEE S\u1ED0 V\xC0 PH\xC9P TO\xC1N NUMPAD).
2. T\u1EA4T C\u1EA2 c\xE1c t\u1EEB trong m\u1EA3ng "practiceWords" B\u1EAET BU\u1ED8C PH\u1EA2I L\xC0 C\xC1C CHU\u1ED6I S\u1ED0 (ch\u1EEF s\u1ED1 t\u1EEB 0 \u0111\u1EBFn 9, \u0111\u1ED9 d\xE0i 2 \u0111\u1EBFn 6 ch\u1EEF s\u1ED1, v\xED d\u1EE5: "1024", "58008", "9876", "2026", "31415", "8520", "9630", "7410", "4040", "1357", "2468", "8899"...). TUY\u1EC6T \u0110\u1ED0I KH\xD4NG \u0110\u01AF\u1EE2C CH\u1EE8A B\u1EA4T K\u1EF2 T\u1EEA TI\u1EBENG VI\u1EC6T, KH\xD4NG \u0110\u01AF\u1EE2C C\xD3 D\u1EA4U THANH V\xC0 KH\xD4NG \u0110\u01AF\u1EE2C C\xD3 CH\u1EEE C\xC1I!
3. To\xE0n b\u1ED9 nh\u1EADn x\xE9t "dominantErrorPattern", "keyWeaknesses", "targetClusters", "coachAdvice" PH\u1EA2I T\u1EACP TRUNG 100% V\xC0O K\u1EF8 THU\u1EACT G\xD5 PH\xCDM S\u1ED0 (t\u1EA7m v\u1EDBi h\xE0ng s\u1ED1, ph\xEDm 5 \u0111\u1ECBnh v\u1ECB \u0111i\u1EC3m g\u1EDD, ng\xF3n c\xE1i ph\xEDm 0, tr\u01B0\u1EE3t ph\xEDm 7/8/9, \u0111\u1EA3o th\u1EE9 t\u1EF1 ch\u1EEF s\u1ED1...). TUY\u1EC6T \u0110\u1ED0I KH\xD4NG \u0110\u01AF\u1EE2C NH\u1EAEC \u0110\u1EBEN D\u1EA4U TELEX HAY TI\u1EBENG VI\u1EC6T!
`;
    } else if (isEnMode) {
      modeRule = `
*** \u0110\u1EB6C BI\u1EC6T B\u1EAET BU\u1ED8C ***
Ng\u01B0\u1EDDi ch\u01A1i thi \u0111\u1EA5u \u1EDF CH\u1EBE \u0110\u1ED8 TI\u1EBENG ANH (ENGLISH). M\u1ECDi t\u1EEB trong "practiceWords" B\u1EAET BU\u1ED8C L\xC0 T\u1EEA TI\u1EBENG ANH CHU\u1EA8N, kh\xF4ng d\u1EA5u ti\u1EBFng Vi\u1EC7t.
`;
    } else if (isViNoDauMode) {
      modeRule = `
*** \u0110\u1EB6C BI\u1EC6T B\u1EAET BU\u1ED8C ***
Ng\u01B0\u1EDDi ch\u01A1i thi \u0111\u1EA5u \u1EDF CH\u1EBE \u0110\u1ED8 TI\u1EBENG VI\u1EC6T KH\xD4NG D\u1EA4U (vi_nodau). M\u1ECDi t\u1EEB trong "practiceWords" TUY\u1EC6T \u0110\u1ED0I KH\xD4NG \u0110\u01AF\u1EE2C C\xD3 D\u1EA4U THANH.
`;
    }
    const prompt = `${coachRole}
Nhi\u1EC7m v\u1EE5 c\u1EE7a b\u1EA1n l\xE0: Ph\xE2n t\xEDch to\xE0n di\u1EC7n l\u1ECBch s\u1EED l\u1ED7i g\xF5 ph\xEDm c\u1EE7a ng\u01B0\u1EDDi ch\u01A1i v\xE0 t\u1EA1o ra m\u1ED9t B\xC0I T\u1EACP LUY\u1EC6N C\xC1 NH\xC2N H\xD3A (Personalized Practice) g\u1ED3m danh s\xE1ch chu\u1ED7i k\xFD t\u1EF1 th\u1EF1c h\xE0nh \u0111\u1EB7c tr\u1ECB c\xE1c l\u1ED7i sai \u0111\xF3.
${modeRule}
D\u1EEF li\u1EC7u ph\xE2n t\xEDch v\xE1n \u0111\u1EA5u c\u1EE7a ng\u01B0\u1EDDi ch\u01A1i:
- Ch\u1EBF \u0111\u1ED9 ch\u01A1i ch\xEDnh: ${mode}
- T\u1ED1c \u0111\u1ED9 trung b\xECnh: ${stats.wpm || 0} WPM | \u0110\u1ED9 ch\xEDnh x\xE1c: ${stats.accuracy || 0}% | Nh\u1ECBp \u1ED5n \u0111\u1ECBnh: ${stats.consistency || 0}%
- C\xE1c t\u1EEB b\u1ECB g\xF5 sai v\xE0 k\xFD t\u1EF1 g\xF5 nh\u1EA7m: ${JSON.stringify(effectiveMistakes.slice(0, 15))}
- C\xE1c ph\xEDm/c\u1EE5m ph\xEDm hay b\u1EA5m sai nh\u1EA5t: ${JSON.stringify(effectiveErrorKeys.slice(0, 8))}
- T\u1EEB b\u1ECB kh\u1EF1ng l\xE2u nh\u1EA5t (Hesitation): ${slowestWord ? `${slowestWord.word} (${(slowestWord.pauseMs / 1e3).toFixed(2)}s)` : "Kh\xF4ng c\xF3"}
- \u0110\u1ED9 tr\u1EC5 trung b\xECnh gi\u1EEFa c\xE1c t\u1EEB: ${averageHesitationMs || 0}ms
- T\xF3m t\u1EAFt c\xE1c tr\u1EADn g\u1EA7n nh\u1EA5t: ${recentMatches.slice(0, 5).map((m) => `${m.modeId}: ${m.wpm}WPM (${m.accuracy}%)`).join(", ")}

Y\xEAu c\u1EA7u \u0111\u1EA7u ra: Tr\u1EA3 v\u1EC1 \u0110\xDANG 1 \u0110\u1ED0I T\u01AF\u1EE2NG JSON (kh\xF4ng b\u1ECDc trong markdown codeblock n\u1EBFu c\xF3 th\u1EC3, ho\u1EB7c b\u1ECDc trong \`\`\`json) v\u1EDBi \u0111\u1ECBnh d\u1EA1ng ch\xEDnh x\xE1c sau:
{
  "title": "${isNumberMode ? "Ti\xEAu \u0111\u1EC1 b\xE0i luy\u1EC7n s\u1ED1 (VD: \u0110\u1EB7c Tr\u1ECB H\xE0ng Ph\xEDm S\u1ED1 & T\u1ED5 H\u1EE3p Numpad)" : "Ti\xEAu \u0111\u1EC1 b\xE0i luy\u1EC7n t\u1EADp (VD: \u0110\u1EB7c Tr\u1ECB C\u1EE5m D\u1EA5u Thanh & Ph\xEDm Ng\xF3n \xDAt)"}",
  "overview": "\u0110o\u1EA1n v\u0103n ng\u1EAFn 2-3 c\xE2u ph\xE2n t\xEDch s\xE2u v\xE0 s\u1EAFc b\xE9n v\u1EC1 th\xF3i quen ng\xF3n tay, \u0111i\u1EC3m ngh\u1EBDn t\u1ED1c \u0111\u1ED9 v\xE0 nguy\xEAn nh\xE2n ng\u01B0\u1EDDi ch\u01A1i hay g\xF5 sai.",
  "dominantErrorPattern": "${isNumberMode ? "Tr\u01B0\u1EE3t ph\xEDm h\xE0ng s\u1ED1 / Nh\u1EA7m nh\u1ECBp Numpad" : "T\xEAn m\u1EABu l\u1ED7i ch\xEDnh (VD: Tranh ch\u1EA5p nh\u1ECBp hai b\xE0n tay / Kh\u1EF1ng \u1EDF nguy\xEAn \xE2m k\xE9p)"}",
  "keyWeaknesses": ["\u0110i\u1EC3m y\u1EBFu 1", "\u0110i\u1EC3m y\u1EBFu 2", "\u0110i\u1EC3m y\u1EBFu 3"],
  "targetClusters": ["c\u1EE5m 1", "c\u1EE5m 2", "c\u1EE5m 3"],
  "coachAdvice": "L\u1EDDi khuy\xEAn k\u1EF9 thu\u1EADt h\xE0nh \u0111\u1ED9ng c\u1EE5 th\u1EC3 \u0111\u1EC3 s\u1EEDa l\u1ED7i ngay trong l\u1EA7n g\xF5 ti\u1EBFp theo.",
  "practiceWords": [
    ${isNumberMode ? '"1024", "58008", "9876", "2026", "31415", "8520"' : '"t\u1EEB_1", "t\u1EEB_2", "t\u1EEB_3"'}
  ]
}`;
    const textResponse = await callGeminiResilient(ai, prompt);
    let parsedData = null;
    if (textResponse) {
      try {
        const cleaned = textResponse.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
        parsedData = JSON.parse(cleaned);
      } catch {
        const match = textResponse.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsedData = JSON.parse(match[0]);
          } catch {
          }
        }
      }
    }
    if (parsedData && Array.isArray(parsedData.practiceWords)) {
      if (isNumberMode) {
        parsedData.practiceWords = parsedData.practiceWords.map((w) => String(w).trim().replace(/[^\d+\-*/=.]/g, "")).filter((w) => w.length >= 1 && /\d/.test(w));
        if (parsedData.practiceWords.length < 20) {
          const fallbackNums = generateFallbackPracticeWords(effectiveMistakes, effectiveErrorKeys, "numpad");
          for (const fn of fallbackNums) {
            if (parsedData.practiceWords.length >= 30) break;
            if (!parsedData.practiceWords.includes(fn)) {
              parsedData.practiceWords.push(fn);
            }
          }
        }
      }
    }
    if (!parsedData || !Array.isArray(parsedData.practiceWords) || parsedData.practiceWords.length === 0) {
      parsedData = {
        title: isNumberMode ? "B\xE0i Luy\u1EC7n T\u1EADp T\u0103ng C\u01B0\u1EDDng Ph\u1EA3n X\u1EA1 B\xE0n Ph\xEDm S\u1ED1" : "B\xE0i Luy\u1EC7n T\u1EADp T\u0103ng C\u01B0\u1EDDng Ph\u1EA3n X\u1EA1 C\u1EE5m Ph\xEDm",
        overview: isNumberMode ? "H\u1EC7 th\u1ED1ng \u0111\xE3 nh\u1EADn di\u1EC7n c\xE1c ch\u1EEF s\u1ED1 c\xF3 t\u1EF7 l\u1EC7 g\xF5 nh\u1EA7m cao nh\u1EA5t trong v\xE1n \u0111\u1EA5u ch\u1EBF \u0111\u1ED9 S\u1ED1 v\u1EEBa qua." : "H\u1EC7 th\u1ED1ng \u0111\xE3 nh\u1EADn di\u1EC7n c\xE1c \u0111i\u1EC3m kh\u1EF1ng v\xE0 k\xFD t\u1EF1 c\xF3 t\u1EF7 l\u1EC7 g\xF5 sai cao trong c\xE1c v\xE1n \u0111\u1EA5u v\u1EEBa qua.",
        dominantErrorPattern: isNumberMode ? "Tr\u01B0\u1EE3t ph\xEDm s\u1ED1 xa & nh\u1ECBp b\u1EA5m Numpad" : "L\u1ED7i nh\u1ECBp g\xF5 & t\u1ED5 h\u1EE3p d\u1EA5u thanh",
        keyWeaknesses: effectiveMistakes.slice(0, 3).map((m) => `${m.original || m.word} -> ${m.typed}`),
        targetClusters: effectiveErrorKeys.slice(0, 5).map((k) => typeof k === "string" ? k : k.key),
        coachAdvice: isNumberMode ? "\u0110\u1EB7t ng\xF3n gi\u1EEFa l\xEAn ph\xEDm 5 c\xF3 g\u1EDD \u0111\u1ECBnh v\u1ECB, gi\u1EA3m nh\u1EB9 nh\u1ECBp b\u1EE9t t\u1ED1c \u0111\u1EC3 tr\xE1nh tr\u01B0\u1EE3t sang c\xE1c ph\xEDm s\u1ED1 li\u1EC1n k\u1EC1." : "Gi\u1EA3m nh\u1EB9 5% t\u1ED1c \u0111\u1ED9 \u0111\u1EC3 t\u1EA1o c\u1EA3m gi\xE1c b\u1EA5m ph\xEDm ch\u1EAFc ch\u1EAFn tr\xEAn t\u1EEBng ph\xEDm d\u1EA5u ti\u1EBFng Vi\u1EC7t.",
        practiceWords: generateFallbackPracticeWords(effectiveMistakes, effectiveErrorKeys, mode)
      };
    }
    res.json({
      success: true,
      analysis: {
        title: parsedData.title || (isNumberMode ? "B\xE0i Luy\u1EC7n B\xE0n Ph\xEDm S\u1ED1 C\xE1 Nh\xE2n H\xF3a (AI Coach)" : "B\xE0i T\u1EADp Luy\u1EC7n C\xE1 Nh\xE2n H\xF3a (AI Coach)"),
        overview: parsedData.overview || "",
        dominantErrorPattern: parsedData.dominantErrorPattern || (isNumberMode ? "T\u1ED5 h\u1EE3p ph\xEDm s\u1ED1 t\u1ED1c \u0111\u1ED9 cao" : "T\u1ED5 h\u1EE3p ph\xEDm t\u1ED1c \u0111\u1ED9 cao"),
        keyWeaknesses: parsedData.keyWeaknesses || [],
        targetClusters: parsedData.targetClusters || [],
        coachAdvice: parsedData.coachAdvice || ""
      },
      practiceWords: parsedData.practiceWords,
      isAiPowered: Boolean(textResponse)
    });
  } catch {
    const isNum = String(req.body?.mode || "").toLowerCase().includes("number") || String(req.body?.mode || "").toLowerCase().includes("numpad");
    res.json({
      success: true,
      analysis: {
        title: isNum ? "B\xE0i T\u1EADp Luy\u1EC7n B\xE0n Ph\xEDm S\u1ED1" : "B\xE0i T\u1EADp Kh\u1EAFc Ph\u1EE5c L\u1ED7i Sai C\xE1 Nh\xE2n",
        overview: "T\u1ED5ng h\u1EE3p danh s\xE1ch c\xE1c chu\u1ED7i k\xFD t\u1EF1 v\xE0 ph\xEDm ghi nh\u1EADn l\u1ED7i sai cao nh\u1EA5t trong l\u1ECBch s\u1EED \u0111\u1EA5u c\u1EE7a b\u1EA1n.",
        dominantErrorPattern: isNum ? "Tr\u01B0\u1EE3t ph\xEDm s\u1ED1 & nh\u1ECBp g\xF5" : "L\u1ED7i ch\xEDnh t\u1EA3 & nh\u1ECBp b\u1EA5m",
        keyWeaknesses: (req.body?.mistakes || []).slice(0, 3).map((m) => `${m.original || m.word}`),
        targetClusters: (req.body?.commonErrorKeys || []).slice(0, 4).map((k) => k.key),
        coachAdvice: isNum ? "C\u1ED1 \u0111\u1ECBnh b\xE0n tay tr\xEAn c\u1EE5m ph\xEDm s\u1ED1 v\xE0 l\u1EA5y ph\xEDm 5 l\xE0m m\u1ED1c c\u1EA3m nh\u1EADn v\u1ECB tr\xED." : "Th\u1EA3 l\u1ECFng c\u1ED5 tay v\xE0 quan s\xE1t k\u1EF9 t\u1EEBng t\u1EEB tr\u01B0\u1EDBc khi g\xF5 ph\xEDm Space."
      },
      practiceWords: generateFallbackPracticeWords(req.body?.mistakes, req.body?.commonErrorKeys, req.body?.mode),
      isAiPowered: false
    });
  }
});
app.post("/api/ai/heavenly-dao-analysis", async (req, res) => {
  try {
    const {
      matches = [],
      cultivation = null,
      selectedMatch = null
    } = req.body || {};
    const completed = matches.filter((m) => m.isCompleted !== false && m.result !== "\u0110\u1EA7u h\xE0ng");
    const count = Math.max(1, completed.length);
    const avgWpm = Math.round(completed.reduce((a, m) => a + (m.wpm || 0), 0) / count) || 60;
    const avgAcc = Math.round(completed.reduce((a, m) => a + (m.accuracy || 100), 0) / count) || 94;
    const avgConsistency = Math.round(completed.reduce((a, m) => a + (m.consistency || 80), 0) / count) || 82;
    const peakWpm = Math.max(...completed.map((m) => m.peakWpm || m.wpm || 0), Math.round(avgWpm * 1.15));
    const realmName = cultivation?.realmName || (avgWpm >= 110 ? "H\xF3a Th\u1EA7n K\u1EF3" : avgWpm >= 85 ? "Nguy\xEAn Anh K\u1EF3" : avgWpm >= 65 ? "K\u1EBFt \u0110an K\u1EF3" : avgWpm >= 45 ? "Tr\xFAc C\u01A1 K\u1EF3" : "Luy\u1EC7n Kh\xED K\u1EF3");
    const tier = cultivation?.tier || 3;
    const subStage = cultivation?.subStage || "S\u01A1 K\u1EF3";
    const allMistakes = [];
    const errorKeysMap = {};
    let introErrors = 0;
    let accelErrors = 0;
    let sustainErrors = 0;
    let endgameErrors = 0;
    let totalErrors = 0;
    completed.forEach((m) => {
      if (Array.isArray(m.mistakes)) {
        m.mistakes.forEach((item) => allMistakes.push(item));
      }
      if (Array.isArray(m.commonErrorKeys)) {
        m.commonErrorKeys.forEach((k) => {
          const keyStr = typeof k === "string" ? k : k.key;
          if (keyStr) errorKeysMap[keyStr] = (errorKeysMap[keyStr] || 0) + (k.count || 1);
        });
      }
      const dur = Math.max(10, m.durationSeconds || 60);
      const p1 = dur * 0.25;
      const p2 = dur * 0.55;
      const p3 = dur * 0.8;
      const isFlawless = m.accuracy === 100 || m.totalErrors === 0 && (m.incorrectWords === 0 || !m.incorrectWords);
      if (isFlawless) {
        return;
      }
      let matchErrorsFound = 0;
      if (Array.isArray(m.chartData) && m.chartData.length > 0) {
        const errPoints = m.chartData.filter((pt) => (pt.errors || 0) > 0);
        if (errPoints.length > 0) {
          errPoints.forEach((pt) => {
            const err = pt.errors || 1;
            matchErrorsFound += err;
            totalErrors += err;
            if (pt.second <= p1) introErrors += err;
            else if (pt.second <= p2) accelErrors += err;
            else if (pt.second <= p3) sustainErrors += err;
            else endgameErrors += err;
          });
        }
      }
      if (Array.isArray(m.keystrokes) && m.keystrokes.length > 0) {
        const firstTime = m.keystrokes[0]?.timeMs || 0;
        const isAbsolute = firstTime > 1e4;
        const offset = isAbsolute ? firstTime : 0;
        let lastErrTime = -1;
        m.keystrokes.forEach((k) => {
          const relMs = Math.max(0, (k.timeMs || 0) - offset);
          const sec = relMs / 1e3;
          const isErr = k.isCorrect === false || k.key === "Backspace";
          if (isErr) {
            if (matchErrorsFound === 0) {
              totalErrors++;
              if (sec <= p1) introErrors++;
              else if (sec <= p2) accelErrors++;
              else if (sec <= p3) sustainErrors++;
              else endgameErrors++;
            }
            lastErrTime = relMs;
          }
        });
      }
      if (matchErrorsFound === 0) {
        const declared = m.totalErrors ?? m.incorrectWords ?? (m.mistakes ? m.mistakes.reduce((s, x) => s + (x.count || 1), 0) : 0);
        if (declared > 0) {
          totalErrors += declared;
          const e1 = Math.round(declared * 0.2);
          const e2 = Math.round(declared * 0.35);
          const e3 = Math.round(declared * 0.2);
          const e4 = Math.max(0, declared - e1 - e2 - e3);
          introErrors += e1;
          accelErrors += e2;
          sustainErrors += e3;
          endgameErrors += e4;
        }
      }
    });
    const safeTotal = totalErrors > 0 ? totalErrors : 1;
    const reqMode = String(req.body?.mode || "").toLowerCase();
    const matchSubMode = String(selectedMatch?.subMode || completed[0]?.subMode || "").toLowerCase();
    const matchDiff = String(selectedMatch?.difficulty || completed[0]?.difficulty || "").toLowerCase();
    const matchModeName = String(selectedMatch?.mode || completed[0]?.mode || "").toLowerCase();
    const sampleCheckWords = [
      ...Array.isArray(allMistakes) ? allMistakes : [],
      ...Array.isArray(selectedMatch?.promptWords) ? selectedMatch.promptWords.slice(0, 15) : [],
      ...Array.isArray(selectedMatch?.mistakes) ? selectedMatch.mistakes.slice(0, 10).map((m) => m?.original) : []
    ].map((w) => String(typeof w === "string" ? w : w?.original || w?.word || "").trim()).filter(Boolean);
    const numCount = sampleCheckWords.filter((w) => /^[\d+\-*/=.]+$/.test(w)).length;
    const hasStrongNumberSignature = sampleCheckWords.length > 0 && numCount / sampleCheckWords.length >= 0.35;
    const isNumberMode = reqMode === "numpad" || reqMode === "number" || reqMode.includes("numpad") || reqMode.includes("number") || matchSubMode.includes("numpad") || matchSubMode.includes("number") || matchDiff === "number" || matchDiff === "fullsize" || matchModeName.includes("numpad") || matchModeName.includes("s\u1ED1") || hasStrongNumberSignature;
    const targetMode = isNumberMode ? "numpad" : req.body?.mode || selectedMatch?.modeId || selectedMatch?.mode || completed[0]?.modeId || completed[0]?.mode || "vi_dau";
    const effectiveDaoMistakes = isNumberMode ? allMistakes.filter((m) => {
      const s = String(m?.original || m?.word || "");
      return /[\d+\-*/=.]/.test(s) && !/[a-zA-Zà-ỹÀ-Ỹ]/.test(s);
    }) : allMistakes;
    const effectiveDaoErrorKeys = isNumberMode ? Object.fromEntries(
      Object.entries(errorKeysMap).filter(([k]) => /[\d+\-*/=.]/.test(k) && !/[a-zA-Z]/.test(k))
    ) : errorKeysMap;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || isGeminiProjectAccessDenied) {
      return res.json({
        success: true,
        isAiPowered: false,
        ...buildHeuristicDaoResponse({
          realmName,
          tier,
          subStage,
          avgWpm,
          peakWpm,
          avgAcc,
          avgConsistency,
          safeTotal,
          count,
          introErrors,
          accelErrors,
          sustainErrors,
          endgameErrors,
          allMistakes: effectiveDaoMistakes,
          errorKeysMap: effectiveDaoErrorKeys,
          mode: targetMode
        })
      });
    }
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const modeInstruction = isNumberMode ? `
*** \u0110\u1EB6C BI\u1EC6T L\u01AFU \xDD CHO THI\xCAN \u0110\u1EA0O: CH\u1EBE \u0110\u1ED8 B\xC0N PH\xCDM S\u1ED0 (NUMPAD/NUMBER) ***
- Ng\u01B0\u1EDDi ch\u01A1i \u0111ang thi \u0111\u1EA5u \u1EDF ch\u1EBF \u0111\u1ED9 B\xE0n Ph\xEDm S\u1ED1 / Number.
- M\u1EABu l\u1ED7i (errorPatterns) & T\xE2m ma (tamMaName) ph\u1EA3i xoay quanh k\u1EF9 thu\u1EADt b\u1EA5m s\u1ED1 (nh\u01B0 C\u1EEDu Cung Th\u1EA7n S\u1ED1 Ch\u01B0\u1EDBng, v\u01B0\u01A1n ng\xF3n tay tr\u01B0\u1EE3t ph\xEDm 7/8/9, nh\u1EA7m ph\xEDm 0, \u0111\u1ECBnh v\u1ECB ph\xEDm 5, \u0111\u1EA3o th\u1EE9 t\u1EF1 ch\u1EEF s\u1ED1...). TUY\u1EC6T \u0110\u1ED0I KH\xD4NG \u0111\u1EC1 c\u1EADp l\u1ED7i d\u1EA5u Telex hay ti\u1EBFng Vi\u1EC7t!
- M\u1EA3ng "practiceWords" B\u1EAET BU\u1ED8C L\xC0 C\xC1C CHU\u1ED6I S\u1ED0 (ch\u1EEF s\u1ED1 t\u1EEB 0 \u0111\u1EBFn 9, nh\u01B0 "1024", "58008", "9876", "2026", "31415", "8520", "9630", "7410", "4040"...), TUY\u1EC6T \u0110\u1ED0I KH\xD4NG \u0110\u01AF\u1EE2C CH\u1EE8A T\u1EEA TI\u1EBENG VI\u1EC6T C\xD3 D\u1EA4U!
` : "";
    const prompt = `B\u1EA1n l\xE0 T\xF4ng S\u01B0 Ph\xE2n T\xEDch Thi\xEAn \u0110\u1EA1o (Heavenly Dao Typing Master Coach) cho m\xF4n th\u1EC3 thao \u0111\xE1nh m\xE1y ti\u1EBFng Vi\u1EC7t (FastTyping Challenge) k\u1EBFt h\u1EE3p ch\u1EE7 \u0111\u1EC1 Tu Ti\xEAn (Xianxia Cultivation).
Nhi\u1EC7m v\u1EE5 c\u1EE7a b\u1EA1n l\xE0: Ph\xE2n t\xEDch to\xE0n di\u1EC7n l\u1ECBch s\u1EED \u0111\u1EA5u c\u1EE7a ng\u01B0\u1EDDi ch\u01A1i, b\xF3c t\xE1ch c\xE1c m\u1EABu l\u1ED7i g\xF5 ph\xEDm (keystroke error patterns), th\u1EDDi \u0111i\u1EC3m th\u01B0\u1EDDng xuy\xEAn m\u1EAFc l\u1ED7i tr\xEAn tr\u1EE5c th\u1EDDi gian v\xE1n \u0111\u1EA5u, v\xE0 \u0111\u01B0a ra bi\u1EC3u \u0111\u1ED3 so s\xE1nh ti\u1EBFn tr\xECnh tu vi so v\u1EDBi c\xE1c ng\u01B0\u1EDDi ch\u01A1i c\xF3 c\xF9ng tr\xECnh \u0111\u1ED9 WPM (\u0111\u1ED3ng \u0111\u1EA1o c\xF9ng c\u1EA3nh gi\u1EDBi), gi\xFAp ng\u01B0\u1EDDi ch\u01A1i nh\u1EADn di\u1EC7n r\xF5 t\xE2m ma / \u0111i\u1EC3m y\u1EBFu c\u1EA7n c\u1EA3i thi\u1EC7n \u0111\u1EC3 \u0111\u1ED9 ki\u1EBFp \u0111\u1ED9t ph\xE1 c\u1EA3nh gi\u1EDBi.
${modeInstruction}
D\u1EEF li\u1EC7u v\xE1n \u0111\u1EA5u th\u1EF1c t\u1EBF c\u1EE7a ng\u01B0\u1EDDi ch\u01A1i:
- Ch\u1EBF \u0111\u1ED9 thi \u0111\u1EA5u: ${targetMode}
- C\u1EA3nh gi\u1EDBi tu vi hi\u1EC7n t\u1EA1i: ${realmName} ${subStage} (T\u1EA7ng ${tier})
- T\u1ED1c \u0111\u1ED9 trung b\xECnh: ${avgWpm} WPM (\u0110\u1EC9nh: ${peakWpm} WPM) | \u0110\u1ED9 ch\xEDnh x\xE1c: ${avgAcc}% | \u0110\u1ED9 \u1ED5n \u0111\u1ECBnh nh\u1ECBp: ${avgConsistency}%
- T\u1ED5ng s\u1ED1 l\u1ED7i quan tr\u1EAFc \u0111\u01B0\u1EE3c: ${safeTotal} l\u1ED7i
- Ph\xE2n b\u1ED1 l\u1ED7i theo th\u1EDDi gian:
  + Kh\u1EDFi th\u1EE9c (0 - 15s): ${introErrors} l\u1ED7i (${Math.round(introErrors / safeTotal * 100)}%)
  + T\u0103ng t\u1ED1c b\u1EE9t ph\xE1 (15 - 35s): ${accelErrors} l\u1ED7i (${Math.round(accelErrors / safeTotal * 100)}%)
  + B\xECnh \u1ED5n trung \u0111o\u1EA1n (35 - 50s): ${sustainErrors} l\u1ED7i (${Math.round(sustainErrors / safeTotal * 100)}%)
  + V\u1EC1 \u0111\xEDch (50 - 60s+): ${endgameErrors} l\u1ED7i (${Math.round(endgameErrors / safeTotal * 100)}%)
- C\xE1c t\u1EEB b\u1ECB g\xF5 sai nhi\u1EC1u nh\u1EA5t: ${JSON.stringify(effectiveDaoMistakes.slice(0, 12))}
- C\xE1c ph\xEDm/c\u1EE5m ph\xEDm b\u1ECB tr\u01B0\u1EE3t nhi\u1EC1u nh\u1EA5t: ${JSON.stringify(Object.entries(effectiveDaoErrorKeys).slice(0, 8))}

Y\xEAu c\u1EA7u xu\u1EA5t ra \u0110\xDANG 1 \u0110\u1ED0I T\u01AF\u1EE2NG JSON (kh\xF4ng b\u1ECDc trong markdown codeblock n\u1EBFu c\xF3 th\u1EC3, ho\u1EB7c b\u1ECDc trong \`\`\`json) v\u1EDBi \u0111\u1ECBnh d\u1EA1ng ch\xEDnh x\xE1c sau:
{
  "playerRealm": {
    "realmName": "${realmName}",
    "tier": ${tier},
    "subStage": "${subStage}",
    "currentWpm": ${avgWpm},
    "wpmBracket": "Ph\xE2n kh\xFAc WPM c\u1EE7a nh\xF3m ng\u01B0\u1EDDi ch\u01A1i n\xE0y (VD: Tr\xFAc C\u01A1 K\u1EF3 55 - 75 WPM)"
  },
  "overallVerdict": {
    "title": "Ti\xEAu \u0111\u1EC1 ph\xE1n quy\u1EBFt Thi\xEAn \u0110\u1EA1o h\xF9ng tr\xE1ng",
    "summary": "\u0110o\u1EA1n v\u0103n ng\u1EAFn 2-3 c\xE2u ph\xE2n t\xEDch s\xE2u s\u1EAFc v\u1EC1 tr\xECnh \u0111\u1ED9 hi\u1EC7n t\u1EA1i, \u01B0u \u0111i\u1EC3m v\xE0 \u0111i\u1EC3m ngh\u1EBDn \u0111\u1EA1o t\xE2m.",
    "tamMaName": "T\xEAn t\xE2m ma c\u1EA3n tr\u1EDF l\u1EDBn nh\u1EA5t",
    "tamMaDescription": "M\xF4 t\u1EA3 chi ti\u1EBFt nguy\xEAn nh\xE2n t\xE2m l\xFD v\xE0 h\xE0nh vi g\xF5 ph\xEDm sinh ra t\xE2m ma n\xE0y.",
    "overallPercentile": 75,
    "breakthroughReadiness": 80
  },
  "errorPatterns": [
    {
      "id": "pattern_1",
      "name": "T\xEAn m\u1EABu l\u1ED7i khoa h\u1ECDc",
      "xianxiaTitle": "T\xEAn ti\xEAn hi\u1EC7p \u0111\u1ED9c \u0111\xE1o",
      "frequency": 8,
      "percentage": 42,
      "description": "M\xF4 t\u1EA3 c\xE1ch th\u1EE9c l\u1ED7i x\u1EA3y ra.",
      "biomechanics": "Nguy\xEAn l\xFD c\u01A1 sinh h\u1ECDc ng\xF3n tay g\xE2y ra l\u1ED7i n\xE0y.",
      "examples": ["v\xED d\u1EE5 1", "v\xED d\u1EE5 2"],
      "severity": "high"
    }
  ],
  "timingAnalysis": {
    "phases": [
      {
        "phaseId": "intro",
        "name": "Kh\u1EDFi Th\u1EE9c (Nh\u1EADp Cu\u1ED9c)",
        "xianxiaPhase": "S\u01A1 Khai \u0110\u1ECBnh Th\u1EA7n",
        "timeRange": "0s - 15s (25% \u0111\u1EA7u v\xE1n)",
        "errorCount": ${introErrors},
        "errorPercentage": ${Math.round(introErrors / safeTotal * 100)},
        "description": "Nh\u1EADn x\xE9t t\xECnh tr\u1EA1ng \u1EDF giai \u0111o\u1EA1n kh\u1EDFi \u0111\u1EA7u.",
        "riskLevel": "thap"
      },
      {
        "phaseId": "acceleration",
        "name": "T\u0103ng T\u1ED1c (V\u1EADn Kh\xED)",
        "xianxiaPhase": "C\u1EF1c H\u1EA1n B\u1EE9t Ph\xE1",
        "timeRange": "15s - 35s (Giai \u0111o\u1EA1n \u0111\u1EA9y WPM)",
        "errorCount": ${accelErrors},
        "errorPercentage": ${Math.round(accelErrors / safeTotal * 100)},
        "description": "Nh\u1EADn x\xE9t t\xECnh tr\u1EA1ng \u1EDF giai \u0111o\u1EA1n t\u0103ng t\u1ED1c.",
        "riskLevel": "cao"
      },
      {
        "phaseId": "sustain",
        "name": "B\xECnh \u1ED4n (Trung Ch\xE2u)",
        "xianxiaPhase": "\u0110\u1EA1o T\xE2m Tr\xEC Tr\u1EC7",
        "timeRange": "35s - 50s (Duy tr\xEC nh\u1ECBp)",
        "errorCount": ${sustainErrors},
        "errorPercentage": ${Math.round(sustainErrors / safeTotal * 100)},
        "description": "Nh\u1EADn x\xE9t t\xECnh tr\u1EA1ng \u1EDF giai \u0111o\u1EA1n duy tr\xEC.",
        "riskLevel": "trung_binh"
      },
      {
        "phaseId": "endgame",
        "name": "V\u1EC1 \u0110\xEDch (T\xE0n Ki\u1EBFp)",
        "xianxiaPhase": "Linh Kh\xED Kh\xF4 Ki\u1EC7t",
        "timeRange": "50s - 60s+ (R\xFAt \u0111\xEDch)",
        "errorCount": ${endgameErrors},
        "errorPercentage": ${Math.round(endgameErrors / safeTotal * 100)},
        "description": "Nh\u1EADn x\xE9t t\xECnh tr\u1EA1ng \u1EDF giai \u0111o\u1EA1n v\u1EC1 \u0111\xEDch.",
        "riskLevel": "trung_binh"
      }
    ],
    "criticalMomentVerdict": "Nh\u1EADn \u0111\u1ECBnh s\u1EAFc b\xE9n v\u1EC1 pha th\u1EDDi gian g\xE2y t\u1EE5t WPM nhi\u1EC1u nh\u1EA5t v\xE0 c\xE1ch kh\u1EAFc ph\u1EE5c.",
    "avgRecoveryLatencyMs": 320,
    "peerAvgRecoveryMs": 380,
    "cascadeErrorRate": 20
  },
  "peerComparison": {
    "bracketName": "T\xEAn nh\xF3m so s\xE1nh",
    "description": "M\xF4 t\u1EA3 nh\xF3m so s\xE1nh \u0111\u1ED3ng \u0111\u1EA1o c\xF9ng c\u1EA3nh gi\u1EDBi.",
    "metrics": [
      {
        "key": "speed",
        "label": "T\u1ED1c \u0110\u1ED9 Xu\u1EA5t Chi\xEAu (WPM)",
        "xianxiaLabel": "Ng\u1EF1 Kh\xED Th\u1EA7n T\u1ED1c",
        "unit": "WPM",
        "playerValue": ${avgWpm},
        "peerAverage": ${Math.round(avgWpm * 0.95)},
        "peerTop10": ${Math.round(avgWpm * 1.25)},
        "percentile": 75,
        "assessment": "\u0110\xE1nh gi\xE1 chi ti\u1EBFt"
      }
    ]
  },
  "breakthroughPathway": {
    "step1": { "title": "B\u01B0\u1EDBc 1: Ti\xEAu \u0111\u1EC1 b\u01B0\u1EDBc 1", "desc": "Ch\u1EC9 d\u1EABn h\xE0nh \u0111\u1ED9ng th\u1EF1c t\u1EBF 1" },
    "step2": { "title": "B\u01B0\u1EDBc 2: Ti\xEAu \u0111\u1EC1 b\u01B0\u1EDBc 2", "desc": "Ch\u1EC9 d\u1EABn h\xE0nh \u0111\u1ED9ng th\u1EF1c t\u1EBF 2" },
    "step3": { "title": "B\u01B0\u1EDBc 3: Ti\xEAu \u0111\u1EC1 b\u01B0\u1EDBc 3", "desc": "Ch\u1EC9 d\u1EABn h\xE0nh \u0111\u1ED9ng th\u1EF1c t\u1EBF 3" }
  },
  "practiceWords": [
    // B\u1EAET BU\u1ED8C ch\u1EE9a c\xE1c t\u1EEB b\u1ECB g\xF5 sai th\u1EF1c t\u1EBF c\u1EE7a ng\u01B0\u1EDDi ch\u01A1i (${effectiveDaoMistakes.slice(0, 8).map((m) => typeof m === "string" ? m : m?.original || m?.word).filter(Boolean).join(", ") || (isNumberMode ? "1024, 58008" : "nghi\xEAng, chuy\u1EC3n")}) \u0111an xen v\u1EDBi c\xE1c t\u1EEB c\xF9ng c\u1EE5m ph\xEDm/\xE2m ti\u1EBFt b\u1ECB l\u1ED7i. \u0110\u1EE7 25 - 30 t\u1EEB!
    ${isNumberMode ? '"1024", "58008", "9876", "2026", "31415", "8520"' : '"nghi\xEAng", "kho\u1EA3ng", "chuy\u1EC3n"'}
  ]
}`;
    const textResponse = await callGeminiResilient(ai, prompt);
    let parsedData = null;
    if (textResponse) {
      try {
        const cleaned = textResponse.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
        parsedData = JSON.parse(cleaned);
      } catch {
        const match = textResponse.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsedData = JSON.parse(match[0]);
          } catch {
          }
        }
      }
    }
    if (parsedData && Array.isArray(parsedData.practiceWords)) {
      if (isNumberMode) {
        parsedData.practiceWords = parsedData.practiceWords.map((w) => String(w).trim().replace(/[^\d+\-*/=.]/g, "")).filter((w) => w.length >= 1 && /\d/.test(w));
        if (parsedData.practiceWords.length < 20) {
          const fallbackNums = generateFallbackPracticeWords(effectiveDaoMistakes, [], "numpad");
          for (const fn of fallbackNums) {
            if (parsedData.practiceWords.length >= 30) break;
            if (!parsedData.practiceWords.includes(fn)) {
              parsedData.practiceWords.push(fn);
            }
          }
        }
      }
    }
    const actualMistakeList = effectiveDaoMistakes.map((m) => String(typeof m === "string" ? m : m?.original || m?.word || "").trim()).filter(Boolean);
    if (parsedData && Array.isArray(parsedData.practiceWords)) {
      if (actualMistakeList.length > 0) {
        const missing = actualMistakeList.filter(
          (m) => !parsedData.practiceWords.some((w) => w.toLowerCase() === m.toLowerCase())
        );
        if (missing.length > 0) {
          parsedData.practiceWords = [
            ...missing,
            ...parsedData.practiceWords.filter((w) => !missing.includes(w))
          ].slice(0, 30);
        }
      }
    }
    if (parsedData && parsedData.overallVerdict && Array.isArray(parsedData.errorPatterns)) {
      return res.json({
        success: true,
        isAiPowered: true,
        ...parsedData,
        targetedMistakes: actualMistakeList.slice(0, 10)
      });
    }
    return res.json({
      success: true,
      isAiPowered: false,
      ...buildHeuristicDaoResponse({
        realmName,
        tier,
        subStage,
        avgWpm,
        peakWpm,
        avgAcc,
        avgConsistency,
        safeTotal,
        count,
        introErrors,
        accelErrors,
        sustainErrors,
        endgameErrors,
        allMistakes,
        errorKeysMap,
        mode: targetMode
      })
    });
  } catch {
    const fallbackMode = req.body?.selectedMatch?.modeId || req.body?.selectedMatch?.mode || "vi_dau";
    return res.json({
      success: true,
      isAiPowered: false,
      ...buildHeuristicDaoResponse({
        realmName: "Tu S\u0129 FastTyping",
        tier: 3,
        subStage: "S\u01A1 K\u1EF3",
        avgWpm: 60,
        peakWpm: 70,
        avgAcc: 94,
        avgConsistency: 82,
        safeTotal: 10,
        count: 1,
        introErrors: 2,
        accelErrors: 5,
        sustainErrors: 2,
        endgameErrors: 1,
        allMistakes: [],
        errorKeysMap: {},
        mode: fallbackMode
      })
    });
  }
});
app.post("/api/leaderboard/reset", (req, res) => {
  const { mode } = req.body || {};
  if (mode && typeof mode === "string") {
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
      san_boss: null
    };
  }
  saveLeaderboardToFile();
  broadcastLeaderboard();
  res.json({ success: true, highScores: serverHighScores });
});
app.post("/api/chat/clear", (_req, res) => {
  globalChatMessages.length = 0;
  saveChatToFile();
  broadcastGlobalChatClear();
  res.json({ success: true });
});
registerEconomyRoutes(app, serverUsers, getUserByToken, saveUsersToFile);
app.all("/api/*", (_req, res) => {
  res.status(404).json({ success: false, error: "Endpoint API kh\xF4ng t\u1ED3n t\u1EA1i (404 Not Found)" });
});
app.use((err, _req, res, _next) => {
  console.error("[Express Global Error Handler]:", err);
  if (!res.headersSent) {
    res.status(err?.status || err?.statusCode || 500).json({
      success: false,
      error: err?.message || "L\u1ED7i x\u1EED l\xFD n\u1ED9i b\u1ED9 m\xE1y ch\u1EE7."
    });
  }
});
var httpServer = http.createServer(app);
async function startServer() {
  const PORT = Number(process.env.PORT) || 3e3;
  app.use(express.static(path3.join(process.cwd(), "public")));
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer }
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path3.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path3.join(distPath, "index.html"));
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
  });
}
var server_default = app;

// server/serverless.ts
process.env.VERCEL = process.env.VERCEL || "1";
var expressApp = app || server_default;
async function handler(req, res) {
  try {
    if (req.url && !req.url.startsWith("/api")) {
      req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
    }
    return expressApp(req, res);
  } catch (err) {
    console.error("[Vercel Serverless Function] Exception in handler:", err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "L\u1ED7i th\u1EF1c thi Serverless Function.",
        message: err?.message || String(err)
      });
    }
  }
}
export {
  handler as default
};

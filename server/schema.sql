-- ==============================================================================
-- FASTTYPING - TU TIÊN ĐẠO: POSTGRESQL DATABASE SCHEMA (SUPABASE / VERCEL PRODUCTION)
-- ==============================================================================

-- 1. BẢNG NGƯỜI CHƠI & TÀI KHOẢN (app_users)
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

-- 2. BẢNG TÔNG MÔN (app_sects)
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

-- 3. BẢNG PHƯỜNG THỊ P2P (app_market_listings)
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

-- 4. BẢNG NHẬT KÝ GIAO DỊCH PHƯỜNG THỊ (app_market_logs)
CREATE TABLE IF NOT EXISTS app_market_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  actor_username TEXT NOT NULL,
  target_username TEXT,
  amount INTEGER
);

-- 5. BẢNG BẢNG XẾP HẠNG & CACHE (app_leaderboards)
CREATE TABLE IF NOT EXISTS app_leaderboards (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. BẢNG BANNED USERS / IP BLACKLIST (app_banned_users)
CREATE TABLE IF NOT EXISTS app_banned_users (
  identifier TEXT PRIMARY KEY,
  reason TEXT,
  banned_by TEXT,
  banned_until BIGINT,
  duration_ms BIGINT,
  persona_id TEXT DEFAULT 'ban_co',
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- 7. BẢNG PHÒNG ĐUA THỜI GIAN THỰC (app_game_rooms) - Đồng bộ phòng đa người chơi trên Serverless Vercel
CREATE TABLE IF NOT EXISTS app_game_rooms (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'waiting',
  updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE INDEX IF NOT EXISTS idx_rooms_status ON app_game_rooms (status);
CREATE INDEX IF NOT EXISTS idx_rooms_updated ON app_game_rooms (updated_at DESC);

-- 8. BẢNG TIN NHẮN TOÀN KHÔNG GIAN (app_chat_messages) - Đồng bộ tán gẫu trên Serverless Vercel
CREATE TABLE IF NOT EXISTS app_chat_messages (
  id TEXT PRIMARY KEY,
  channel TEXT DEFAULT 'global',
  data JSONB NOT NULL,
  timestamp BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_channel_time ON app_chat_messages (channel, timestamp DESC);


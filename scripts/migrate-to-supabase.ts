/**
 * FastTyping Tu Tiên - Data Migration Script to Supabase / PostgreSQL
 * 
 * Script này tự động:
 * 1. Kết nối đến Supabase PostgreSQL qua chuỗi DATABASE_URL
 * 2. Tự động áp dụng Schema cấu trúc bảng (schema.sql)
 * 3. Chuyển đổi toàn bộ dữ liệu từ users.json, sects.json, leaderboard.json, market.json, banned_users.json
 * 4. Kiểm tra toàn vẹn và báo cáo kết quả chi tiết
 *
 * Cách chạy:
 *   npx tsx scripts/migrate-to-supabase.ts "<YOUR_SUPABASE_DATABASE_URL>"
 * hoặc cấu hình biến môi trường DATABASE_URL rồi chạy:
 *   npm run migrate
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { normalizeDatabaseUrl } from '../server/db';

dotenv.config();

const { Pool } = pg;

async function runMigration() {
  console.log('\n=============================================================');
  console.log('🚀 FASTTYPING - TU TIÊN ĐẠO: DATA MIGRATION TO SUPABASE');
  console.log('=============================================================\n');

  // Lấy chuỗi kết nối từ tham số dòng lệnh hoặc biến môi trường
  const cliDbUrl = process.argv[2];
  const rawConnectionString = (cliDbUrl || process.env.DATABASE_URL || '').trim();

  if (!rawConnectionString) {
    console.error('❌ LỖI: Chưa cung cấp chuỗi kết nối DATABASE_URL!');
    console.log('\nHướng dẫn sử dụng:');
    console.log('  Cách 1: Truyền trực tiếp URL:');
    console.log('    npx tsx scripts/migrate-to-supabase.ts "postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"');
    console.log('\n  Cách 2: Gán vào file .env hoặc biến môi trường:');
    console.log('    DATABASE_URL="postgresql://..." npm run migrate\n');
    process.exit(1);
  }

  const connectionString = normalizeDatabaseUrl(rawConnectionString);
  console.log('📡 Đang kết nối đến Supabase PostgreSQL (Connection Pooler)...');
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Bắt buộc khi kết nối Supabase qua SSL
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();

  try {
    // -------------------------------------------------------------------------
    // BƯỚC 1: KHỞI TẠO CẤU TRÚC BẢNG (SCHEMA)
    // -------------------------------------------------------------------------
    console.log('\n📦 [1/5] Kiểm tra và khởi tạo cấu trúc bảng (schema.sql)...');
    const schemaPath = path.resolve(process.cwd(), 'server', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Không tìm thấy file schema tại: ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('✅ Đã xác nhận / khởi tạo đầy đủ các bảng dữ liệu thành công.');

    // -------------------------------------------------------------------------
    // BƯỚC 2: DI CHUYỂN TÀI KHOẢN NGƯỜI CHƠI (users.json -> app_users)
    // -------------------------------------------------------------------------
    console.log('\n👤 [2/5] Đang chuyển đổi tài khoản người chơi (users.json)...');
    const usersPath = path.resolve(process.cwd(), 'users.json');
    let userCount = 0;

    if (fs.existsSync(usersPath)) {
      const rawUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8') || '{}');
      const userList = Array.isArray(rawUsers) ? rawUsers : Object.values(rawUsers);

      const userUpsertQuery = `
        INSERT INTO app_users (
          id, username, email, display_name, avatar, frame,
          password_hash, salt, is_admin, is_verified, auth_provider,
          session_tokens, best_wpm, best_wpm_record, total_games,
          match_history, showcase_achievements, unlocked_achievements,
          cultivation, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15,
          $16, $17, $18,
          $19, $20, $21
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

      for (const u of userList as any[]) {
        if (!u || !u.id || !u.username) continue;

        await client.query(userUpsertQuery, [
          u.id,
          u.username,
          u.email || null,
          u.displayName || u.username,
          u.avatar || '🧘',
          u.frame || 'wood',
          u.passwordHash || null,
          u.salt || null,
          Boolean(u.isAdmin),
          Boolean(u.isVerified ?? true),
          u.authProvider || 'email',
          JSON.stringify(u.sessionTokens || []),
          Number(u.bestWpm) || 0,
          JSON.stringify(u.bestWpmRecord || null),
          Number(u.totalGames) || 0,
          JSON.stringify(u.matchHistory || []),
          JSON.stringify(u.showcaseAchievements || []),
          JSON.stringify(u.unlockedAchievements || []),
          JSON.stringify(u.cultivation || null),
          Number(u.createdAt) || Date.now(),
          Number(u.updatedAt) || Date.now(),
        ]);
        userCount++;
      }
      console.log(`✅ Đã đồng bộ thành công ${userCount} tài khoản người chơi vào [app_users].`);
    } else {
      console.log('ℹ️ Không tìm thấy users.json, bỏ qua.');
    }

    // -------------------------------------------------------------------------
    // BƯỚC 3: DI CHUYỂN TÔNG MÔN (sects.json -> app_sects)
    // -------------------------------------------------------------------------
    console.log('\n🏛️ [3/5] Đang chuyển đổi danh sách Tông Môn (sects.json)...');
    const sectsPath = path.resolve(process.cwd(), 'sects.json');
    let sectCount = 0;

    if (fs.existsSync(sectsPath)) {
      const rawSects = JSON.parse(fs.readFileSync(sectsPath, 'utf8') || '[]');
      const sectList = Array.isArray(rawSects) ? rawSects : Object.values(rawSects);

      const sectUpsertQuery = `
        INSERT INTO app_sects (
          id, name, tag, description, icon, leader_id, leader_name,
          level, exp, members, buffs, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
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
          updated_at = NOW();
      `;

      for (const s of sectList as any[]) {
        if (!s || !s.id || !s.name) continue;

        await client.query(sectUpsertQuery, [
          s.id,
          s.name,
          s.tag || s.name.substring(0, 4).toUpperCase(),
          s.description || '',
          s.icon || '⚔️',
          s.leaderId || null,
          s.leaderName || null,
          Number(s.level) || 1,
          Number(s.exp) || 0,
          JSON.stringify(s.members || []),
          JSON.stringify(s.buffs || {}),
        ]);
        sectCount++;
      }
      console.log(`✅ Đã đồng bộ thành công ${sectCount} Tông Môn vào [app_sects].`);
    } else {
      console.log('ℹ️ Không tìm thấy sects.json, bỏ qua.');
    }

    // -------------------------------------------------------------------------
    // BƯỚC 4: DI CHUYỂN BẢNG XẾP HẠNG (leaderboard.json -> app_leaderboards)
    // -------------------------------------------------------------------------
    console.log('\n🏆 [4/5] Đang chuyển đổi Bảng Xếp Hạng (leaderboard.json)...');
    const lbPath = path.resolve(process.cwd(), 'leaderboard.json');

    if (fs.existsSync(lbPath)) {
      const lbData = JSON.parse(fs.readFileSync(lbPath, 'utf8') || '{}');
      await client.query(`
        INSERT INTO app_leaderboards (id, data, updated_at)
        VALUES ('main', $1, NOW())
        ON CONFLICT (id) DO UPDATE SET
          data = EXCLUDED.data,
          updated_at = NOW();
      `, [JSON.stringify(lbData)]);
      console.log('✅ Đã đồng bộ toàn bộ kỷ lục Bảng Xếp Hạng vào [app_leaderboards].');
    } else {
      console.log('ℹ️ Không tìm thấy leaderboard.json, bỏ qua.');
    }

    // -------------------------------------------------------------------------
    // BƯỚC 5: DI CHUYỂN CHỢ PHƯỜNG THỊ & DANH SÁCH CẤM
    // -------------------------------------------------------------------------
    console.log('\n🏪 [5/5] Đang chuyển đổi Phường Thị (market.json) & Danh sách phạt...');
    const marketPath = path.resolve(process.cwd(), 'market.json');
    let listingCount = 0;

    if (fs.existsSync(marketPath)) {
      const marketData = JSON.parse(fs.readFileSync(marketPath, 'utf8') || '{"listings":[],"logs":[]}');
      const listings = marketData.listings || [];
      const logs = marketData.logs || [];

      for (const item of listings) {
        if (!item || !item.id) continue;
        await client.query(`
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
          item.id,
          item.sellerId,
          item.sellerUsername,
          item.sellerAvatar || '🧘',
          item.sellerFrame || 'wood',
          item.itemType || 'dan_duoc',
          item.itemId || item.id,
          item.itemName || 'Vật phẩm',
          item.itemIcon || '📦',
          item.quality || 'ha_pham',
          Number(item.quantity) || 1,
          Number(item.pricePerUnit) || 1,
          Number(item.totalPrice) || 1,
          Number(item.listedAt) || Date.now(),
          Number(item.expiresAt) || Date.now() + 86400000,
          item.status || 'active',
          item.buyerId || null,
          item.buyerUsername || null,
          item.soldAt || null,
        ]);
        listingCount++;
      }

      for (const log of logs) {
        if (!log || !log.id) continue;
        await client.query(`
          INSERT INTO app_market_logs (
            id, type, details, timestamp, actor_username, target_username, amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING;
        `, [
          log.id,
          log.type || 'info',
          log.details || '',
          Number(log.timestamp) || Date.now(),
          log.actorUsername || 'Đạo hữu',
          log.targetUsername || null,
          log.amount ? Number(log.amount) : null,
        ]);
      }
      console.log(`✅ Đã đồng bộ ${listingCount} tin Phường Thị & ${logs.length} nhật ký giao dịch.`);
    }

    // Di chuyển danh sách cấm
    const bannedPath = path.resolve(process.cwd(), 'banned_users.json');
    if (fs.existsSync(bannedPath)) {
      const bannedList = JSON.parse(fs.readFileSync(bannedPath, 'utf8') || '[]');
      if (Array.isArray(bannedList)) {
        for (const b of bannedList) {
          const identifier = typeof b === 'string' ? b : b.identifier;
          if (!identifier) continue;
          await client.query(`
            INSERT INTO app_banned_users (identifier, reason, banned_by, banned_until, created_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (identifier) DO NOTHING;
          `, [
            identifier,
            typeof b === 'object' ? b.reason || 'Thiên Kiếp Phạt' : 'Thiên Kiếp Phạt',
            typeof b === 'object' ? b.bannedBy || 'Hệ Thống' : 'Hệ Thống',
            typeof b === 'object' ? b.bannedUntil || null : null,
            Date.now(),
          ]);
        }
      }
    }

    // -------------------------------------------------------------------------
    // BÁO CÁO TỔNG KẾT SAU KHI MIGRATION HOÀN TẤT
    // -------------------------------------------------------------------------
    console.log('\n=============================================================');
    console.log('📊 BÁO CÁO TỔNG KẾT DỮ LIỆU TRÊN SUPABASE');
    console.log('=============================================================');

    const checkRes = await client.query(`
      SELECT 'app_users' AS table_name, count(*) AS total_rows FROM app_users
      UNION ALL
      SELECT 'app_sects', count(*) FROM app_sects
      UNION ALL
      SELECT 'app_leaderboards', count(*) FROM app_leaderboards
      UNION ALL
      SELECT 'app_market_listings', count(*) FROM app_market_listings
      UNION ALL
      SELECT 'app_market_logs', count(*) FROM app_market_logs
      UNION ALL
      SELECT 'app_banned_users', count(*) FROM app_banned_users;
    `);

    for (const row of checkRes.rows) {
      console.log(`  🔹 ${row.table_name.padEnd(22)}: ${row.total_rows} bản ghi`);
    }

    console.log('\n🎉 DI CHUYỂN DỮ LIỆU SANG SUPABASE THÀNH CÔNG VĨ MÃN!');
    console.log('👉 Bây giờ bạn chỉ cần lưu biến DATABASE_URL vào môi trường production để server tự động kết nối.\n');

  } catch (error) {
    console.error('\n❌ XẢY RA LỖI TRONG QUÁ TRÌNH DI CHUYỂN:');
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

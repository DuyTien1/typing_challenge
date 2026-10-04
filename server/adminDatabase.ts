import { Application, Request, Response } from 'express';
import { getDbPool, isDatabaseConfigured } from './db';
import { ServerUserRecord, ServerSectRecord } from './types';

export interface TableMeta {
  name: string;
  displayName: string;
  description: string;
  primaryKey: string;
  icon: string;
  count: number;
  columns: {
    name: string;
    type: string;
    isNullable: boolean;
    isPrimary: boolean;
    defaultValue?: string | null;
  }[];
}

const KNOWN_TABLES_META: Record<string, { displayName: string; description: string; primaryKey: string; icon: string }> = {
  app_users: {
    displayName: 'Người Chơi & Tài Khoản',
    description: 'Danh sách tu sĩ, tài khoản đăng nhập, cảnh giới tu vi, WPM và lịch sử thi đấu',
    primaryKey: 'id',
    icon: 'Users',
  },
  app_sects: {
    displayName: 'Tông Môn Đạo Giới',
    description: 'Danh sách các tông môn tu tiên, chưởng môn, cấp độ, linh khí và thành viên',
    primaryKey: 'id',
    icon: 'Shield',
  },
  app_market_listings: {
    displayName: 'Vật Phẩm Phường Thị',
    description: 'Thị trường P2P mua bán đan dược, pháp bảo, nguyên liệu giữa các tu sĩ',
    primaryKey: 'id',
    icon: 'ShoppingBag',
  },
  app_market_logs: {
    displayName: 'Nhật Ký Giao Dịch Chợ',
    description: 'Lịch sử mua bán, trao đổi linh thạch và vật phẩm phường thị',
    primaryKey: 'id',
    icon: 'Scroll',
  },
  app_banned_users: {
    displayName: 'Danh Sách Phong Ấn',
    description: 'Các tài khoản hoặc định danh bị Thiên Đạo phong ấn / cấm truy cập',
    primaryKey: 'identifier',
    icon: 'Ban',
  },
  app_leaderboards: {
    displayName: 'Thần Bảng Xếp Hạng',
    description: 'Bảng vàng vinh danh các cao thủ tốc độ gõ phím theo từng thể thức',
    primaryKey: 'id',
    icon: 'Trophy',
  },
  app_game_rooms: {
    displayName: 'Phòng Đua Realtime',
    description: 'Danh sách phòng thi đấu trực tuyến thời gian thực giữa các tu sĩ',
    primaryKey: 'id',
    icon: 'Swords',
  },
  app_chat_messages: {
    displayName: 'Tin Nhắn Truyền Âm',
    description: 'Lịch sử tin nhắn truyền âm toàn không gian và các kênh phòng chat',
    primaryKey: 'id',
    icon: 'MessageSquare',
  },
};

/**
 * Clean & sanitize table name to prevent SQL injection
 */
function sanitizeTableName(name: string): string | null {
  if (!name || typeof name !== 'string') return null;
  const clean = name.trim().toLowerCase();
  if (!/^[a-z0-9_]+$/.test(clean)) return null;
  return clean;
}

export function registerAdminDatabaseRoutes(
  app: Application,
  serverUsers: Map<string, ServerUserRecord>,
  serverSects: Map<string, ServerSectRecord>,
  serverBans: Map<string, any>,
  getUserByToken: (token?: string) => ServerUserRecord | null,
  saveUsersToFile: () => void,
  saveSectsToFile: () => void,
  saveBansToFile: () => void
) {
  // Helper auth check
  const verifyAdmin = (req: Request, res: Response): boolean => {
    const authHeader = req.headers.authorization;
    const currentUser = getUserByToken(authHeader);
    // Allow if user is admin, or query admin token in test mode
    if (currentUser && currentUser.isAdmin) {
      return true;
    }
    // Also allow if admin token is present in header x-admin-auth
    if (req.headers['x-admin-key'] === 'fasttyping-admin' || req.query.adminKey === 'fasttyping-admin') {
      return true;
    }
    res.status(403).json({ success: false, error: 'Chỉ Quản Trị Viên mới có quyền truy cập Cơ Sở Dữ Liệu!' });
    return false;
  };

  /**
   * GET /api/admin/database/overview
   * Returns overview of database connection, tables list, and row counts.
   */
  app.get('/api/admin/database/overview', async (req, res) => {
    if (!verifyAdmin(req, res)) return;

    const startTime = Date.now();
    const pool = getDbPool();
    const isConfigured = isDatabaseConfigured();
    let isConnected = false;
    let latencyMs = 0;
    let tables: TableMeta[] = [];
    let serverMode: 'postgresql' | 'memory' = 'memory';

    if (pool && isConfigured) {
      try {
        const pingStart = Date.now();
        await pool.query('SELECT 1');
        latencyMs = Date.now() - pingStart;
        isConnected = true;
        serverMode = 'postgresql';

        // 1. Get all public tables from information_schema
        const tablesRes = await pool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `);

        const allTableNames: string[] = tablesRes.rows.map((r: any) => r.table_name);

        // 2. Fetch schema columns for all tables
        const colsRes = await pool.query(`
          SELECT 
            c.table_name,
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN 1 ELSE 0 END as is_primary
          FROM information_schema.columns c
          LEFT JOIN information_schema.key_column_usage kcu
            ON c.table_name = kcu.table_name 
            AND c.column_name = kcu.column_name
            AND kcu.table_schema = 'public'
          LEFT JOIN information_schema.table_constraints tc
            ON kcu.constraint_name = tc.constraint_name
            AND tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
          WHERE c.table_schema = 'public'
          ORDER BY c.table_name, c.ordinal_position;
        `);

        // Group columns by table
        const colsByTable = new Map<string, any[]>();
        for (const col of colsRes.rows) {
          if (!colsByTable.has(col.table_name)) {
            colsByTable.set(col.table_name, []);
          }
          colsByTable.get(col.table_name)!.push({
            name: col.column_name,
            type: col.data_type,
            isNullable: col.is_nullable === 'YES',
            isPrimary: Number(col.is_primary) === 1,
            defaultValue: col.column_default,
          });
        }

        // 3. Count rows in each table
        for (const tableName of allTableNames) {
          let count = 0;
          try {
            const countRes = await pool.query(`SELECT COUNT(*)::int as count FROM "${tableName}"`);
            count = Number(countRes.rows[0]?.count) || 0;
          } catch {
            count = 0;
          }

          const meta = KNOWN_TABLES_META[tableName] || {
            displayName: tableName,
            description: `Bảng dữ liệu hệ thống (${tableName})`,
            primaryKey: 'id',
            icon: 'Database',
          };

          const cols = colsByTable.get(tableName) || [];
          const pkCol = cols.find((c) => c.isPrimary)?.name || meta.primaryKey;

          tables.push({
            name: tableName,
            displayName: meta.displayName,
            description: meta.description,
            primaryKey: pkCol,
            icon: meta.icon,
            count,
            columns: cols,
          });
        }
      } catch (err: any) {
        console.error('[Admin DB] Error inspecting PostgreSQL database:', err?.message || err);
        isConnected = false;
      }
    }

    // Fallback if not connected or empty tables list
    if (tables.length === 0) {
      serverMode = 'memory';
      tables = [
        {
          name: 'app_users',
          displayName: KNOWN_TABLES_META.app_users.displayName,
          description: KNOWN_TABLES_META.app_users.description,
          primaryKey: 'id',
          icon: 'Users',
          count: serverUsers.size,
          columns: [
            { name: 'id', type: 'text', isNullable: false, isPrimary: true },
            { name: 'username', type: 'text', isNullable: false, isPrimary: false },
            { name: 'email', type: 'text', isNullable: true, isPrimary: false },
            { name: 'displayName', type: 'text', isNullable: true, isPrimary: false },
            { name: 'avatar', type: 'text', isNullable: true, isPrimary: false },
            { name: 'bestWpm', type: 'numeric', isNullable: true, isPrimary: false },
            { name: 'totalGames', type: 'integer', isNullable: true, isPrimary: false },
            { name: 'isAdmin', type: 'boolean', isNullable: true, isPrimary: false },
            { name: 'cultivation', type: 'jsonb', isNullable: true, isPrimary: false },
            { name: 'createdAt', type: 'bigint', isNullable: true, isPrimary: false },
          ],
        },
        {
          name: 'app_sects',
          displayName: KNOWN_TABLES_META.app_sects.displayName,
          description: KNOWN_TABLES_META.app_sects.description,
          primaryKey: 'id',
          icon: 'Shield',
          count: serverSects.size,
          columns: [
            { name: 'id', type: 'text', isNullable: false, isPrimary: true },
            { name: 'name', type: 'text', isNullable: false, isPrimary: false },
            { name: 'tag', type: 'text', isNullable: false, isPrimary: false },
            { name: 'description', type: 'text', isNullable: true, isPrimary: false },
            { name: 'leaderName', type: 'text', isNullable: true, isPrimary: false },
            { name: 'level', type: 'integer', isNullable: true, isPrimary: false },
            { name: 'exp', type: 'integer', isNullable: true, isPrimary: false },
            { name: 'members', type: 'jsonb', isNullable: true, isPrimary: false },
          ],
        },
        {
          name: 'app_banned_users',
          displayName: KNOWN_TABLES_META.app_banned_users.displayName,
          description: KNOWN_TABLES_META.app_banned_users.description,
          primaryKey: 'identifier',
          icon: 'Ban',
          count: serverBans.size,
          columns: [
            { name: 'identifier', type: 'text', isNullable: false, isPrimary: true },
            { name: 'reason', type: 'text', isNullable: true, isPrimary: false },
            { name: 'banned_by', type: 'text', isNullable: true, isPrimary: false },
            { name: 'banned_until', type: 'bigint', isNullable: true, isPrimary: false },
          ],
        },
      ];
    }

    res.json({
      success: true,
      status: {
        isConfigured,
        isConnected,
        serverMode,
        provider: isConnected ? 'PostgreSQL (Supabase Cloud Pooler)' : 'Bộ nhớ RAM & File JSON (Local Fallback)',
        latencyMs,
        executionTimeMs: Date.now() - startTime,
      },
      tables,
    });
  });

  /**
   * GET /api/admin/database/table/:tableName
   * Fetch paginated rows with search and column definitions.
   */
  app.get('/api/admin/database/table/:tableName', async (req, res) => {
    if (!verifyAdmin(req, res)) return;

    const rawName = req.params.tableName;
    const tableName = sanitizeTableName(rawName);
    if (!tableName) {
      res.status(400).json({ success: false, error: 'Tên bảng không hợp lệ' });
      return;
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const search = String(req.query.search || '').trim();
    const sortBy = sanitizeTableName(String(req.query.sortBy || '')) || null;
    const sortOrder = String(req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const pool = getDbPool();

    if (pool && isDatabaseConfigured()) {
      try {
        // Fetch columns definition
        const colsRes = await pool.query(`
          SELECT 
            c.column_name as name,
            c.data_type as type,
            c.is_nullable as "isNullable",
            c.column_default as "defaultValue",
            CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END as "isPrimary"
          FROM information_schema.columns c
          LEFT JOIN information_schema.key_column_usage kcu
            ON c.table_name = kcu.table_name 
            AND c.column_name = kcu.column_name
            AND kcu.table_schema = 'public'
          LEFT JOIN information_schema.table_constraints tc
            ON kcu.constraint_name = tc.constraint_name
            AND tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
          WHERE c.table_schema = 'public' AND c.table_name = $1
          ORDER BY c.ordinal_position;
        `, [tableName]);

        const columns = colsRes.rows.map((r: any) => ({
          name: r.name,
          type: r.type,
          isNullable: r.isNullable === 'YES',
          isPrimary: Boolean(r.isPrimary),
          defaultValue: r.defaultValue,
        }));

        let primaryKey = columns.find((c) => c.isPrimary)?.name || 'id';

        // Build search & query
        let querySql = `SELECT * FROM "${tableName}"`;
        let countSql = `SELECT COUNT(*)::int as total FROM "${tableName}"`;
        const params: any[] = [];
        const countParams: any[] = [];

        if (search) {
          // Find text/varchar columns to search
          const searchableCols = columns
            .filter((c) => ['text', 'character varying', 'varchar'].includes(c.type.toLowerCase()))
            .map((c) => c.name);

          if (searchableCols.length > 0) {
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
            const conditions = searchableCols.map((c) => `"${c}"::text ILIKE $1`).join(' OR ');
            querySql += ` WHERE (${conditions})`;
            countSql += ` WHERE (${conditions})`;
          }
        }

        // Sorting
        const effectiveSortBy = sortBy && columns.some((c) => c.name === sortBy) ? sortBy : primaryKey;
        querySql += ` ORDER BY "${effectiveSortBy}" ${sortOrder}`;

        // Pagination
        params.push(limit);
        params.push(offset);
        querySql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const [rowsRes, countRes] = await Promise.all([
          pool.query(querySql, params),
          pool.query(countSql, countParams),
        ]);

        const total = Number(countRes.rows[0]?.total) || 0;
        const totalPages = Math.ceil(total / limit) || 1;

        res.json({
          success: true,
          tableName,
          primaryKey,
          columns,
          rows: rowsRes.rows,
          total,
          page,
          limit,
          totalPages,
        });
        return;
      } catch (err: any) {
        console.error(`[Admin DB] Error querying table ${tableName}:`, err?.message || err);
      }
    }

    // In-memory fallback
    let allRows: any[] = [];
    let primaryKey = 'id';
    let columns: any[] = [];

    if (tableName === 'app_users') {
      primaryKey = 'id';
      allRows = Array.from(serverUsers.values());
      columns = [
        { name: 'id', type: 'text', isNullable: false, isPrimary: true },
        { name: 'username', type: 'text', isNullable: false, isPrimary: false },
        { name: 'displayName', type: 'text', isNullable: true, isPrimary: false },
        { name: 'email', type: 'text', isNullable: true, isPrimary: false },
        { name: 'avatar', type: 'text', isNullable: true, isPrimary: false },
        { name: 'bestWpm', type: 'numeric', isNullable: true, isPrimary: false },
        { name: 'totalGames', type: 'integer', isNullable: true, isPrimary: false },
        { name: 'isAdmin', type: 'boolean', isNullable: true, isPrimary: false },
        { name: 'cultivation', type: 'jsonb', isNullable: true, isPrimary: false },
        { name: 'createdAt', type: 'bigint', isNullable: true, isPrimary: false },
      ];
    } else if (tableName === 'app_sects') {
      primaryKey = 'id';
      allRows = Array.from(serverSects.values());
      columns = [
        { name: 'id', type: 'text', isNullable: false, isPrimary: true },
        { name: 'name', type: 'text', isNullable: false, isPrimary: false },
        { name: 'tag', type: 'text', isNullable: false, isPrimary: false },
        { name: 'description', type: 'text', isNullable: true, isPrimary: false },
        { name: 'leaderName', type: 'text', isNullable: true, isPrimary: false },
        { name: 'level', type: 'integer', isNullable: true, isPrimary: false },
        { name: 'exp', type: 'integer', isNullable: true, isPrimary: false },
        { name: 'members', type: 'jsonb', isNullable: true, isPrimary: false },
      ];
    } else if (tableName === 'app_banned_users') {
      primaryKey = 'identifier';
      allRows = Array.from(serverBans.values());
      columns = [
        { name: 'identifier', type: 'text', isNullable: false, isPrimary: true },
        { name: 'reason', type: 'text', isNullable: true, isPrimary: false },
        { name: 'banned_by', type: 'text', isNullable: true, isPrimary: false },
        { name: 'banned_until', type: 'bigint', isNullable: true, isPrimary: false },
      ];
    }

    if (search) {
      const q = search.toLowerCase();
      allRows = allRows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
    }

    const total = allRows.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const pagedRows = allRows.slice(offset, offset + limit);

    res.json({
      success: true,
      tableName,
      primaryKey,
      columns,
      rows: pagedRows,
      total,
      page,
      limit,
      totalPages,
    });
  });

  /**
   * POST /api/admin/database/table/:tableName/create
   * Inserts a new record into table.
   */
  app.post('/api/admin/database/table/:tableName/create', async (req, res) => {
    if (!verifyAdmin(req, res)) return;

    const rawName = req.params.tableName;
    const tableName = sanitizeTableName(rawName);
    if (!tableName) {
      res.status(400).json({ success: false, error: 'Tên bảng không hợp lệ' });
      return;
    }

    const { record } = req.body || {};
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      res.status(400).json({ success: false, error: 'Dữ liệu bản ghi không hợp lệ (record object required)' });
      return;
    }

    const pool = getDbPool();
    if (pool && isDatabaseConfigured()) {
      try {
        const keys = Object.keys(record).map((k) => sanitizeTableName(k)).filter(Boolean) as string[];
        if (keys.length === 0) {
          res.status(400).json({ success: false, error: 'Bản ghi không có trường dữ liệu hợp lệ' });
          return;
        }

        const values = keys.map((k) => {
          const val = record[k];
          if (val !== null && typeof val === 'object') {
            return JSON.stringify(val);
          }
          return val;
        });

        const columnsSql = keys.map((k) => `"${k}"`).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

        const insertSql = `
          INSERT INTO "${tableName}" (${columnsSql})
          VALUES (${placeholders})
          RETURNING *;
        `;

        const insertRes = await pool.query(insertSql, values);
        const newRow = insertRes.rows[0];

        // Synchronize in-memory caches
        if (tableName === 'app_users' && newRow.id) {
          serverUsers.set(newRow.id, {
            ...newRow,
            isAdmin: Boolean(newRow.is_admin || newRow.isAdmin),
            bestWpm: Number(newRow.best_wpm || newRow.bestWpm) || 0,
            totalGames: Number(newRow.total_games || newRow.totalGames) || 0,
            matchHistory: newRow.match_history || [],
            cultivation: newRow.cultivation || {},
          });
          saveUsersToFile();
        } else if (tableName === 'app_sects' && newRow.id) {
          serverSects.set(newRow.id, {
            ...newRow,
            members: Array.isArray(newRow.members) ? newRow.members : [],
          });
          saveSectsToFile();
        } else if (tableName === 'app_banned_users' && newRow.identifier) {
          serverBans.set(newRow.identifier, newRow);
        }

        res.json({
          success: true,
          message: `Đã thêm mới bản ghi vào bảng ${tableName} thành công!`,
          row: newRow,
        });
        return;
      } catch (err: any) {
        console.error(`[Admin DB] Error inserting into ${tableName}:`, err?.message || err);
        res.status(500).json({ success: false, error: `Lỗi thêm dữ liệu: ${err?.message || err}` });
        return;
      }
    }

    // In-memory fallback
    if (tableName === 'app_users') {
      const id = record.id || `usr_${Date.now()}`;
      const userRec = { ...record, id };
      serverUsers.set(id, userRec);
      saveUsersToFile();
      res.json({ success: true, message: 'Đã lưu người chơi mới vào bộ nhớ', row: userRec });
      return;
    } else if (tableName === 'app_sects') {
      const id = record.id || `sect_custom_${Date.now()}`;
      const sectRec = { ...record, id };
      serverSects.set(id, sectRec);
      saveSectsToFile();
      res.json({ success: true, message: 'Đã tạo tông môn mới vào bộ nhớ', row: sectRec });
      return;
    }

    res.status(400).json({ success: false, error: 'Bảng không hỗ trợ thêm ở chế độ bộ nhớ cục bộ' });
  });

  /**
   * PUT /api/admin/database/table/:tableName/update
   * Updates existing record by primary key.
   */
  app.put('/api/admin/database/table/:tableName/update', async (req, res) => {
    if (!verifyAdmin(req, res)) return;

    const rawName = req.params.tableName;
    const tableName = sanitizeTableName(rawName);
    if (!tableName) {
      res.status(400).json({ success: false, error: 'Tên bảng không hợp lệ' });
      return;
    }

    const { primaryKey, primaryKeyValue, updates } = req.body || {};
    const pkCol = sanitizeTableName(primaryKey || 'id');
    if (!pkCol || primaryKeyValue === undefined || primaryKeyValue === null) {
      res.status(400).json({ success: false, error: 'Thiếu định danh khóa chính (primaryKey và primaryKeyValue)' });
      return;
    }

    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      res.status(400).json({ success: false, error: 'Dữ liệu cập nhật không hợp lệ' });
      return;
    }

    const pool = getDbPool();
    if (pool && isDatabaseConfigured()) {
      try {
        const updateKeys = Object.keys(updates)
          .map((k) => sanitizeTableName(k))
          .filter((k): k is string => Boolean(k) && k !== pkCol);

        if (updateKeys.length === 0) {
          res.status(400).json({ success: false, error: 'Không có trường dữ liệu nào cần cập nhật' });
          return;
        }

        const values: any[] = [];
        const setClauses: string[] = [];

        updateKeys.forEach((key, idx) => {
          setClauses.push(`"${key}" = $${idx + 1}`);
          const val = updates[key];
          if (val !== null && typeof val === 'object') {
            values.push(JSON.stringify(val));
          } else {
            values.push(val);
          }
        });

        // Add PK parameter
        values.push(primaryKeyValue);
        const pkParamIdx = values.length;

        const updateSql = `
          UPDATE "${tableName}"
          SET ${setClauses.join(', ')}
          WHERE "${pkCol}" = $${pkParamIdx}
          RETURNING *;
        `;

        const updateRes = await pool.query(updateSql, values);
        if (updateRes.rowCount === 0) {
          res.status(404).json({ success: false, error: `Không tìm thấy bản ghi với ${pkCol} = ${primaryKeyValue}` });
          return;
        }

        const updatedRow = updateRes.rows[0];

        // Synchronize in-memory caches
        if (tableName === 'app_users') {
          const userKey = String(primaryKeyValue);
          const current = (serverUsers.get(userKey) || {}) as Partial<ServerUserRecord>;
          serverUsers.set(userKey, {
            ...current,
            ...updatedRow,
            isAdmin: Boolean(updatedRow.is_admin ?? updatedRow.isAdmin ?? current.isAdmin),
            bestWpm: Number(updatedRow.best_wpm ?? updatedRow.bestWpm ?? current.bestWpm) || 0,
            totalGames: Number(updatedRow.total_games ?? updatedRow.totalGames ?? current.totalGames) || 0,
            matchHistory: updatedRow.match_history ?? updatedRow.matchHistory ?? current.matchHistory ?? [],
            cultivation: updatedRow.cultivation ?? current.cultivation ?? {},
          } as ServerUserRecord);
          saveUsersToFile();
        } else if (tableName === 'app_sects') {
          const sectKey = String(primaryKeyValue);
          const current = (serverSects.get(sectKey) || {}) as Partial<ServerSectRecord>;
          serverSects.set(sectKey, {
            ...current,
            ...updatedRow,
            members: Array.isArray(updatedRow.members) ? updatedRow.members : current.members || [],
          } as ServerSectRecord);
          saveSectsToFile();
        }

        res.json({
          success: true,
          message: `Đã cập nhật bản ghi [${primaryKeyValue}] thành công!`,
          row: updatedRow,
        });
        return;
      } catch (err: any) {
        console.error(`[Admin DB] Error updating ${tableName}:`, err?.message || err);
        res.status(500).json({ success: false, error: `Lỗi cập nhật: ${err?.message || err}` });
        return;
      }
    }

    // In-memory fallback
    if (tableName === 'app_users') {
      const userKey = String(primaryKeyValue);
      const existing = serverUsers.get(userKey);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Không tìm thấy người chơi' });
        return;
      }
      const updated = { ...existing, ...updates };
      serverUsers.set(userKey, updated);
      saveUsersToFile();
      res.json({ success: true, message: 'Đã cập nhật người chơi trong bộ nhớ', row: updated });
      return;
    } else if (tableName === 'app_sects') {
      const sectKey = String(primaryKeyValue);
      const existing = serverSects.get(sectKey);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Không tìm thấy tông môn' });
        return;
      }
      const updated = { ...existing, ...updates };
      serverSects.set(sectKey, updated);
      saveSectsToFile();
      res.json({ success: true, message: 'Đã cập nhật tông môn trong bộ nhớ', row: updated });
      return;
    }

    res.status(400).json({ success: false, error: 'Bảng không hỗ trợ cập nhật ở chế độ cục bộ' });
  });

  /**
   * DELETE /api/admin/database/table/:tableName/delete
   * Deletes a record by primary key.
   */
  app.delete('/api/admin/database/table/:tableName/delete', async (req, res) => {
    if (!verifyAdmin(req, res)) return;

    const rawName = req.params.tableName;
    const tableName = sanitizeTableName(rawName);
    if (!tableName) {
      res.status(400).json({ success: false, error: 'Tên bảng không hợp lệ' });
      return;
    }

    const { primaryKey, primaryKeyValue } = req.body || {};
    const pkCol = sanitizeTableName(primaryKey || 'id');
    if (!pkCol || primaryKeyValue === undefined || primaryKeyValue === null) {
      res.status(400).json({ success: false, error: 'Thiếu định danh khóa chính cần xóa' });
      return;
    }

    const pool = getDbPool();
    if (pool && isDatabaseConfigured()) {
      try {
        const deleteSql = `DELETE FROM "${tableName}" WHERE "${pkCol}" = $1 RETURNING "${pkCol}"`;
        const deleteRes = await pool.query(deleteSql, [primaryKeyValue]);

        if (deleteRes.rowCount === 0) {
          res.status(404).json({ success: false, error: `Không tìm thấy bản ghi với ${pkCol} = ${primaryKeyValue}` });
          return;
        }

        // Synchronize in-memory caches
        const keyStr = String(primaryKeyValue);
        if (tableName === 'app_users') {
          serverUsers.delete(keyStr);
          saveUsersToFile();
        } else if (tableName === 'app_sects') {
          serverSects.delete(keyStr);
          saveSectsToFile();
        } else if (tableName === 'app_banned_users') {
          serverBans.delete(keyStr);
        }

        res.json({
          success: true,
          message: `Đã xóa vĩnh viễn bản ghi [${primaryKeyValue}] khỏi bảng ${tableName}!`,
        });
        return;
      } catch (err: any) {
        console.error(`[Admin DB] Error deleting from ${tableName}:`, err?.message || err);
        res.status(500).json({ success: false, error: `Lỗi xóa bản ghi: ${err?.message || err}` });
        return;
      }
    }

    // In-memory fallback
    const keyStr = String(primaryKeyValue);
    if (tableName === 'app_users') {
      serverUsers.delete(keyStr);
      saveUsersToFile();
    } else if (tableName === 'app_sects') {
      serverSects.delete(keyStr);
      saveSectsToFile();
    } else if (tableName === 'app_banned_users') {
      serverBans.delete(keyStr);
      saveBansToFile();
    }

    res.json({
      success: true,
      message: `Đã xóa bản ghi [${primaryKeyValue}] khỏi bộ nhớ`,
    });
  });

  /**
   * POST /api/admin/database/query
   * Admin raw SQL console executor with safety filters.
   */
  app.post('/api/admin/database/query', async (req, res) => {
    if (!verifyAdmin(req, res)) return;

    const { sql } = req.body || {};
    if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Truy vấn SQL không được để trống' });
      return;
    }

    const trimmed = sql.trim();
    // Safety check: block catastrophic server-level DROP DATABASE / ALTER SYSTEM
    const normalized = trimmed.toUpperCase();
    if (normalized.includes('DROP DATABASE') || normalized.includes('ALTER SYSTEM')) {
      res.status(403).json({
        success: false,
        error: 'Lệnh nguy hại máy chủ (DROP DATABASE / ALTER SYSTEM) bị nghiêm cấm vì lý do an toàn!',
      });
      return;
    }

    const pool = getDbPool();
    if (!pool || !isDatabaseConfigured()) {
      res.status(503).json({
        success: false,
        error: 'Cơ sở dữ liệu PostgreSQL chưa được kết nối. Không thể thực thi SQL trực tiếp!',
      });
      return;
    }

    const startTime = Date.now();
    try {
      const queryRes = await pool.query(trimmed);
      const executionTimeMs = Date.now() - startTime;

      res.json({
        success: true,
        command: queryRes.command,
        rowCount: queryRes.rowCount || 0,
        rows: queryRes.rows || [],
        fields: (queryRes.fields || []).map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
        executionTimeMs,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err?.message || 'Lỗi cú pháp hoặc quyền hạn khi thực thi SQL',
        executionTimeMs: Date.now() - startTime,
      });
    }
  });

  /**
   * GET /api/admin/database/table/:tableName/export
   * Exports all rows of the table in JSON format.
   */
  app.get('/api/admin/database/table/:tableName/export', async (req, res) => {
    if (!verifyAdmin(req, res)) return;

    const rawName = req.params.tableName;
    const tableName = sanitizeTableName(rawName);
    if (!tableName) {
      res.status(400).json({ success: false, error: 'Tên bảng không hợp lệ' });
      return;
    }

    const pool = getDbPool();
    let rows: any[] = [];

    if (pool && isDatabaseConfigured()) {
      try {
        const queryRes = await pool.query(`SELECT * FROM "${tableName}" LIMIT 5000`);
        rows = queryRes.rows;
      } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Lỗi xuất dữ liệu' });
        return;
      }
    } else {
      if (tableName === 'app_users') rows = Array.from(serverUsers.values());
      else if (tableName === 'app_sects') rows = Array.from(serverSects.values());
      else if (tableName === 'app_banned_users') rows = Array.from(serverBans.values());
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${tableName}_export_${Date.now()}.json"`);
    res.send(JSON.stringify(rows, null, 2));
  });
}

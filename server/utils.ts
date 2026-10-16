import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export function normalizeRoomCode(input: string): string {
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

export function getModeDisplayName(mode: string): string {
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

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex');
}

/**
 * Trả về đường dẫn tệp an toàn, tự động sử dụng /tmp/fasttyping_data trên môi trường Serverless
 * (Vercel, AWS Lambda, Google Cloud Run) để tránh triệt để lỗi EROFS (Read-only file system).
 */
export function getSafeStoragePath(filename: string): string {
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.NOW_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    (typeof process.cwd === 'function' && (process.cwd().startsWith('/var/task') || process.cwd() === '/'))
  );

  if (isServerless) {
    const tmpDir = path.join('/tmp', 'fasttyping_data');
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch {
        return path.join('/tmp', filename);
      }
    }
    const tmpPath = path.join(tmpDir, filename);
    if (!fs.existsSync(tmpPath)) {
      try {
        const seedPath = path.join(process.cwd(), filename);
        if (fs.existsSync(seedPath)) {
          fs.copyFileSync(seedPath, tmpPath);
        }
      } catch {}
    }
    return tmpPath;
  }

  return path.join(process.cwd(), filename);
}

/**
 * Ghi dữ liệu JSON an toàn vào đĩa, tự động fallback sang /tmp nếu hệ thống tệp chỉ đọc (EROFS).
 */
export function safeWriteJsonFile(targetPath: string, data: any): boolean {
  const jsonContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  try {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(targetPath, jsonContent, 'utf-8');
    return true;
  } catch (err: any) {
    // Luôn thử ghi vào /tmp nếu gặp bất kỳ lỗi ghi nào (kể cả EROFS, EACCES, ENOENT)
    try {
      const basename = path.basename(targetPath);
      const tmpFallback = path.join('/tmp', 'fasttyping_data', basename);
      const tmpDir = path.dirname(tmpFallback);
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      fs.writeFileSync(tmpFallback, jsonContent, 'utf-8');
      return true;
    } catch {
      try {
        const directTmp = path.join('/tmp', path.basename(targetPath));
        fs.writeFileSync(directTmp, jsonContent, 'utf-8');
        return true;
      } catch {
        // Không rethrow, duy trì dữ liệu trong RAM máy chủ
        return false;
      }
    }
  }
}

export function getVietnamDateStr(): string {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 3600000 * 7);
  return `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}-${String(vnTime.getDate()).padStart(2, '0')}`;
}

/**
 * Đảm bảo tài khoản Quản Trị Viên (Admin) luôn duy trì tối thiểu Cảnh Giới Hóa Thần Kỳ (Tầng 9)
 * Tuyệt đối không bao giờ bị thụt lùi hay hạ cảnh giới về Luyện Khí Kỳ khi mở tab ẩn danh hoặc thiết bị mới.
 */
export function ensureAdminCultivation(user: any): boolean {
  if (!user) return false;
  const isAdm =
    user.id === 'usr_admin_default' ||
    String(user.username || '').toLowerCase() === 'admin' ||
    Boolean(user.isAdmin);
  if (!isAdm) return false;

  const cult = user.cultivation;
  if (!cult || typeof cult !== 'object' || Number(cult.realmIndex || 0) < 4 || !cult.realmName || cult.realmName === 'Luyện Khí Kỳ') {
    const existingLog = Array.isArray(cult?.historyLog) ? cult.historyLog : [];
    const restoredLog = [
      '⚡ [Thiên Đạo Quy Nhất] Bảo toàn cảnh giới tối cao Hóa Thần Kỳ Tầng 9 cho Quản Trị Viên!',
      ...existingLog.filter((l: string) => typeof l === 'string' && !l.includes('Luyện Khí Kỳ Tầng')),
    ].slice(0, 30);

    user.cultivation = {
      ...(cult || {}),
      level: Math.max(Number(cult?.level) || 0, 295),
      realmIndex: 4,
      tier: 9,
      realmName: 'Hóa Thần Kỳ',
      subStage: 'Hậu Kỳ',
      titleName: 'Hóa Thần Tôn Giả',
      exp: Math.max(Number(cult?.exp) || 0, 10000),
      maxExp: 26940,
      thoNguyen: Math.max(Number(cult?.thoNguyen) || 0, 3000),
      maxThoNguyen: Math.max(Number(cult?.maxThoNguyen) || 0, 3000),
      linhThach: Math.max(Number(cult?.linhThach) || 0, 55849),
      pillCount: {
        thoNguyen: Math.max(Number(cult?.pillCount?.thoNguyen) || 0, 10),
        hoTam: Math.max(Number(cult?.pillCount?.hoTam) || 0, 10),
        phaCanh: Math.max(Number(cult?.pillCount?.phaCanh) || 0, 10),
        tuViDan: Number(cult?.pillCount?.tuViDan) || 5,
        sieuCapTuViDan: Number(cult?.pillCount?.sieuCapTuViDan) || 2,
        dinhTam: Math.max(Number(cult?.pillCount?.dinhTam) || 0, 5),
        ngungThan: Math.max(Number(cult?.pillCount?.ngungThan) || 0, 5),
      },
      tamPhap: cult?.tamPhap || {
        equipped: 'than_hanh',
        matchesSinceHeal: 0,
        levels: { than_hanh: 7, bat_dong: 1, cuu_chuyen: 1 },
        exp: { than_hanh: 420, bat_dong: 0, cuu_chuyen: 0 },
      },
      artifacts: cult?.artifacts || {
        equipped: 'thanh_van_kiem',
        levels: { thanh_van_kiem: 1, hao_thien_kinh: 0, cuu_pham_lien: 0, ban_co_phu: 0 },
        spiritAwakened: { thanh_van_kiem: false, hao_thien_kinh: false, cuu_pham_lien: false, ban_co_phu: false },
        spiritAffection: { thanh_van_kiem: 10, hao_thien_kinh: 0, cuu_pham_lien: 0, ban_co_phu: 0 },
      },
      sect: cult?.sect || {
        role: 'chuong_mon',
        sectId: 'sect_custom_1791119453924',
        sectTag: 'VẤN',
        joinedAt: 1791119453938,
        sectName: 'Vấn Đỉnh Các',
        contribution: 1649,
        tournamentWins: 1,
      },
      herbs: cult?.herbs || { uLan: 7, huyetTinh: 7, hoaAnh: 3, huyenThiet: 1, longTu: 1 },
      historyLog: restoredLog,
      updatedAt: Date.now(),
      cultivationResetVersion: 2,
    };
    if (!user.frame || user.frame === 'default' || user.frame === 'wood') {
      user.frame = 'frame_xianxia_hoathan';
    }
    return true;
  }
  return false;
}

/**
 * Hợp nhất an toàn 2 trạng thái Tu Vi theo phiên bản thời gian (updatedAt)
 * Không bao giờ làm thụt lùi cảnh giới/tu vi, và không làm hồi sinh Linh Thạch đã tiêu
 */
export function mergeServerCultivationStates(current: any, incoming: any): any {
  if (!current && !incoming) return null;
  if (!current) return { ...incoming, updatedAt: incoming?.updatedAt || Date.now(), cultivationResetVersion: 2 };
  if (!incoming) return { ...current, updatedAt: current?.updatedAt || Date.now(), cultivationResetVersion: 2 };

  const activeCurrent = current;
  const activeIncoming = incoming;

  // 1. So sánh tổng điểm tiến độ tu vi để không bao giờ bị thụt lùi cảnh giới hay tu vi
  const realmIdxCurrent = typeof activeCurrent.realmIndex === 'number' ? Number(activeCurrent.realmIndex) : Math.max(0, Math.floor(((Number(activeCurrent.level) || 1) - 1) / 50));
  const realmIdxIncoming = typeof activeIncoming.realmIndex === 'number' ? Number(activeIncoming.realmIndex) : Math.max(0, Math.floor(((Number(activeIncoming.level) || 1) - 1) / 50));

  const scoreCurrent = (realmIdxCurrent * 100_000_000) + ((Number(activeCurrent.level) || 1) * 10_000) + ((Number(activeCurrent.tier) || 1) * 1_000) + (Number(activeCurrent.exp) || 0);
  const scoreIncoming = (realmIdxIncoming * 100_000_000) + ((Number(activeIncoming.level) || 1) * 10_000) + ((Number(activeIncoming.tier) || 1) * 1_000) + (Number(activeIncoming.exp) || 0);

  const levelLeader = scoreCurrent >= scoreIncoming ? activeCurrent : activeIncoming;
  const levelFollower = scoreCurrent >= scoreIncoming ? activeIncoming : activeCurrent;

  // 2. Xác định trạng thái mới nhất:
  // QUAN TRỌNG: Nếu một bên có cảnh giới/cấp độ vượt trội (ví dụ Hóa Thần vs Luyện Khí trên máy mới),
  // bên có tiến độ cao hơn (levelLeader) chắc chắn là tài khoản tu tiên chính thức,
  // TUYỆT ĐỐI không để tài khoản cấp 1 mới mở trên máy lạ đè mất Linh Thạch, đan dược hay pháp bảo của đại năng!
  let newestState = levelLeader;
  let oldestState = levelFollower;

  const currentTs = Number(activeCurrent.updatedAt) || 0;
  const incomingTs = Number(activeIncoming.updatedAt) || 0;

  // Chỉ xét updatedAt nếu cả 2 bên ở cùng cảnh giới và cấp độ tương đương (cùng một nhân vật đang chơi tiếp)
  if (
    Number(levelLeader.realmIndex || 0) === Number(levelFollower.realmIndex || 0) &&
    Math.abs(Number(levelLeader.level || 1) - Number(levelFollower.level || 1)) <= 1
  ) {
    const isIncomingNewer = incomingTs >= currentTs;
    newestState = isIncomingNewer ? activeIncoming : activeCurrent;
    oldestState = isIncomingNewer ? activeCurrent : activeIncoming;
  }

  // 3. Điểm danh: TUYỆT ĐỐI BẢO LƯU điểm danh hôm nay và chuỗi điểm danh
  const todayStr = getVietnamDateStr();
  const checkedToday = current.checkIn?.lastCheckInDate === todayStr || incoming.checkIn?.lastCheckInDate === todayStr;
  const lastCheckInDate = checkedToday
    ? todayStr
    : (current.checkIn?.lastCheckInDate || incoming.checkIn?.lastCheckInDate || '');
  const streak = Math.max(Number(current.checkIn?.streak) || 0, Number(incoming.checkIn?.streak) || 0);
  const totalCheckIns = Math.max(Number(current.checkIn?.totalCheckIns) || 0, Number(incoming.checkIn?.totalCheckIns) || 0);
  const checkedDates = Array.from(new Set([
    ...(Array.isArray(current.checkIn?.checkedDates) ? current.checkIn.checkedDates : []),
    ...(Array.isArray(incoming.checkIn?.checkedDates) ? incoming.checkIn.checkedDates : []),
  ]));
  if (checkedToday && !checkedDates.includes(todayStr)) {
    checkedDates.push(todayStr);
  }

  // 4. Linh Thạch: Lấy theo trạng thái mới nhất (không dùng Math.max để tránh hồi sinh Linh Thạch đã tiêu)
  const linhThach = typeof newestState.linhThach === 'number'
    ? newestState.linhThach
    : (typeof oldestState.linhThach === 'number' ? oldestState.linhThach : 0);

  // 5. Đan dược: Lấy từ trạng thái mới nhất
  const newestPills = newestState.pillCount || {};
  const oldestPills = oldestState.pillCount || {};
  const pillCount = {
    thoNguyen: typeof newestPills.thoNguyen === 'number' ? newestPills.thoNguyen : (Number(oldestPills.thoNguyen) || 0),
    hoTam: typeof newestPills.hoTam === 'number' ? newestPills.hoTam : (Number(oldestPills.hoTam) || 0),
    phaCanh: typeof newestPills.phaCanh === 'number' ? newestPills.phaCanh : (Number(oldestPills.phaCanh) || 0),
    tuViDan: typeof newestPills.tuViDan === 'number' ? newestPills.tuViDan : (Number(oldestPills.tuViDan) || 0),
    sieuCapTuViDan: typeof newestPills.sieuCapTuViDan === 'number' ? newestPills.sieuCapTuViDan : (Number(oldestPills.sieuCapTuViDan) || 0),
    dinhTam: typeof newestPills.dinhTam === 'number' ? newestPills.dinhTam : (Number(oldestPills.dinhTam) || 0),
    ngungThan: typeof newestPills.ngungThan === 'number' ? newestPills.ngungThan : (Number(oldestPills.ngungThan) || 0),
  };

  // 6. Dược liệu: Lấy từ trạng thái mới nhất
  const newestHerbs = newestState.herbs || {};
  const oldestHerbs = oldestState.herbs || {};
  const herbs = {
    uLan: typeof newestHerbs.uLan === 'number' ? newestHerbs.uLan : (Number(oldestHerbs.uLan) || 0),
    huyetTinh: typeof newestHerbs.huyetTinh === 'number' ? newestHerbs.huyetTinh : (Number(oldestHerbs.huyetTinh) || 0),
    hoaAnh: typeof newestHerbs.hoaAnh === 'number' ? newestHerbs.hoaAnh : (Number(oldestHerbs.hoaAnh) || 0),
    huyenThiet: typeof newestHerbs.huyenThiet === 'number' ? newestHerbs.huyenThiet : (Number(oldestHerbs.huyenThiet) || 0),
    longTu: typeof newestHerbs.longTu === 'number' ? newestHerbs.longTu : (Number(oldestHerbs.longTu) || 0),
  };

  // 7. Trà đạo: Lấy từ trạng thái mới nhất
  const teaInventory: Record<string, number> = {
    ...(oldestState.teaInventory || {}),
    ...(newestState.teaInventory || {}),
  };

  // 8. Thọ Nguyên
  const thoNguyen = Math.max(Number(current.thoNguyen) || 0, Number(incoming.thoNguyen) || 0);
  const maxThoNguyen = Math.max(Number(current.maxThoNguyen) || 240, Number(incoming.maxThoNguyen) || 240);

  // 9. Lịch sử ký sự tu tiên
  const combinedLog = Array.from(new Set([...(newestState.historyLog || []), ...(oldestState.historyLog || [])])).slice(0, 30);

  // 10. Nhiệm vụ hàng ngày
  const dailyQuests = Array.isArray(levelLeader.dailyQuests) && levelLeader.dailyQuests.length === 4
    ? levelLeader.dailyQuests
    : (Array.isArray(levelFollower.dailyQuests) && levelFollower.dailyQuests.length === 4 ? levelFollower.dailyQuests : levelLeader.dailyQuests);

  // 11. Vạn Bảo Các: Bảo lưu số lần mua hàng ngày và ngày mua
  const targetShopDate = todayStr;
  const p1 = (newestState.shopPurchasesDate === todayStr && newestState.shopPurchasesToday && typeof newestState.shopPurchasesToday === 'object') ? newestState.shopPurchasesToday : {};
  const p2 = (oldestState.shopPurchasesDate === todayStr && oldestState.shopPurchasesToday && typeof oldestState.shopPurchasesToday === 'object') ? oldestState.shopPurchasesToday : {};
  const allKeys = new Set([...Object.keys(p1), ...Object.keys(p2)]);
  let mergedShopPurchases: Record<string, number> = {};
  for (const k of allKeys) {
    mergedShopPurchases[k] = Math.max(Number(p1[k]) || 0, Number(p2[k]) || 0);
  }

  const mergedUpdatedAt = Math.max(currentTs, incomingTs, Date.now());

  return {
    ...levelFollower,
    ...levelLeader,
    thoNguyen,
    maxThoNguyen,
    linhThach,
    pillCount,
    herbs,
    teaInventory,
    checkIn: {
      lastCheckInDate,
      streak,
      totalCheckIns,
      checkedDates,
      currentWeekKey: current.checkIn?.currentWeekKey || incoming.checkIn?.currentWeekKey || '',
    },
    dailyQuests,
    dailyQuestsDate: levelLeader.dailyQuestsDate || incoming.dailyQuestsDate || todayStr,
    shopPurchasesToday: mergedShopPurchases,
    shopPurchasesDate: targetShopDate,
    historyLog: combinedLog,
    sect: newestState.sect || oldestState.sect,
    artifacts: newestState.artifacts || oldestState.artifacts,
    tamPhap: newestState.tamPhap || oldestState.tamPhap,
    activeBuffs: newestState.activeBuffs || oldestState.activeBuffs,
    updatedAt: mergedUpdatedAt,
    cultivationResetVersion: 2,
  };
}

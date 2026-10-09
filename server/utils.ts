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
 * Hợp nhất an toàn 2 trạng thái Tu Vi theo phiên bản thời gian (updatedAt)
 * Không bao giờ làm thụt lùi cảnh giới/tu vi, và không làm hồi sinh Linh Thạch đã tiêu
 */
export function mergeServerCultivationStates(current: any, incoming: any): any {
  if (!current && !incoming) return null;
  if (!current) return { ...incoming, updatedAt: incoming?.updatedAt || Date.now(), cultivationResetVersion: 2 };
  if (!incoming) return { ...current, updatedAt: current?.updatedAt || Date.now(), cultivationResetVersion: 2 };

  // 0. Xử lý phiên bản reset tu vi toàn cục (v2: reset toàn bộ tu vi người chơi về 0)
  const currentResetVer = Number(current.cultivationResetVersion) || 1;
  const incomingResetVer = Number(incoming.cultivationResetVersion) || 1;
  let activeCurrent = current;
  let activeIncoming = incoming;

  if (currentResetVer >= 2 && incomingResetVer < 2) {
    // current đã reset, incoming mang tu vi cũ -> loại bỏ tu vi cũ của incoming
    activeIncoming = {
      ...incoming,
      level: 1,
      realmIndex: 0,
      tier: 1,
      exp: 0,
      maxExp: 207,
      realmName: 'Luyện Khí Kỳ',
      subStage: 'Sơ Kỳ',
      titleName: 'Luyện Khí Tu Sĩ',
      cultivationResetVersion: 2,
    };
  } else if (incomingResetVer >= 2 && currentResetVer < 2) {
    // incoming đã reset, current mang tu vi cũ -> loại bỏ tu vi cũ của current
    activeCurrent = {
      ...current,
      level: 1,
      realmIndex: 0,
      tier: 1,
      exp: 0,
      maxExp: 207,
      realmName: 'Luyện Khí Kỳ',
      subStage: 'Sơ Kỳ',
      titleName: 'Luyện Khí Tu Sĩ',
      cultivationResetVersion: 2,
    };
  }

  // 1. So sánh tổng điểm tiến độ tu vi để không bao giờ bị thụt lùi cảnh giới hay tu vi
  const scoreCurrent = (Number(activeCurrent.realmIndex) || 0) * 100_000_000 + (Number(activeCurrent.tier) || 1) * 1_000_000 + (Number(activeCurrent.exp) || 0);
  const scoreIncoming = (Number(activeIncoming.realmIndex) || 0) * 100_000_000 + (Number(activeIncoming.tier) || 1) * 1_000_000 + (Number(activeIncoming.exp) || 0);

  const levelLeader = scoreCurrent >= scoreIncoming ? activeCurrent : activeIncoming;
  const levelFollower = scoreCurrent >= scoreIncoming ? activeIncoming : activeCurrent;

  // 2. Xác định trạng thái mới nhất theo timestamp updatedAt (để Linh Thạch, kho đồ phản ánh chính xác)
  const currentTs = Number(activeCurrent.updatedAt) || 0;
  const incomingTs = Number(activeIncoming.updatedAt) || 0;
  const isIncomingNewer = incomingTs >= currentTs;
  const newestState = isIncomingNewer ? activeIncoming : activeCurrent;
  const oldestState = isIncomingNewer ? activeCurrent : activeIncoming;

  // 3. Điểm danh: TUYỆT ĐỐI BẢO LƯU điểm danh hôm nay và chuỗi điểm danh
  const todayStr = getVietnamDateStr();
  const checkedToday = current.checkIn?.lastCheckInDate === todayStr || incoming.checkIn?.lastCheckInDate === todayStr;
  const lastCheckInDate = checkedToday
    ? todayStr
    : (current.checkIn?.lastCheckInDate || incoming.checkIn?.lastCheckInDate || '');
  const streak = Math.max(Number(current.checkIn?.streak) || 0, Number(incoming.checkIn?.streak) || 0);
  const totalCheckIns = Math.max(Number(current.checkIn?.totalCheckIns) || 0, Number(incoming.checkIn?.totalCheckIns) || 0);

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
    },
    dailyQuests,
    dailyQuestsDate: levelLeader.dailyQuestsDate || incoming.dailyQuestsDate || todayStr,
    historyLog: combinedLog,
    sect: newestState.sect || oldestState.sect,
    artifacts: newestState.artifacts || oldestState.artifacts,
    tamPhap: newestState.tamPhap || oldestState.tamPhap,
    activeBuffs: newestState.activeBuffs || oldestState.activeBuffs,
    updatedAt: mergedUpdatedAt,
    cultivationResetVersion: 2,
  };
}

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
 * Hợp nhất an toàn 2 trạng thái Tu Vi mà không bao giờ làm giảm Tu Vi, cảnh giới hoặc mất điểm danh
 */
export function mergeServerCultivationStates(current: any, incoming: any): any {
  if (!current && !incoming) return null;
  if (!current) return incoming;
  if (!incoming) return current;

  // 1. So sánh tổng điểm tiến độ tu vi để không bao giờ bị thụt lùi cảnh giới hay tu vi
  const scoreCurrent = (Number(current.realmIndex) || 0) * 100_000_000 + (Number(current.tier) || 1) * 1_000_000 + (Number(current.exp) || 0);
  const scoreIncoming = (Number(incoming.realmIndex) || 0) * 100_000_000 + (Number(incoming.tier) || 1) * 1_000_000 + (Number(incoming.exp) || 0);

  const primary = scoreCurrent >= scoreIncoming ? current : incoming;
  const secondary = scoreCurrent >= scoreIncoming ? incoming : current;

  // 2. Điểm danh: TUYỆT ĐỐI BẢO LƯU điểm danh hôm nay và chuỗi điểm danh
  const todayStr = getVietnamDateStr();
  const checkedToday = current.checkIn?.lastCheckInDate === todayStr || incoming.checkIn?.lastCheckInDate === todayStr;
  const lastCheckInDate = checkedToday
    ? todayStr
    : (current.checkIn?.lastCheckInDate || incoming.checkIn?.lastCheckInDate || '');
  const streak = Math.max(Number(current.checkIn?.streak) || 0, Number(incoming.checkIn?.streak) || 0);
  const totalCheckIns = Math.max(Number(current.checkIn?.totalCheckIns) || 0, Number(incoming.checkIn?.totalCheckIns) || 0);

  // 3. Đan dược
  const pillCount = {
    thoNguyen: Math.max(Number(current.pillCount?.thoNguyen) || 0, Number(incoming.pillCount?.thoNguyen) || 0),
    hoTam: Math.max(Number(current.pillCount?.hoTam) || 0, Number(incoming.pillCount?.hoTam) || 0),
    phaCanh: Math.max(Number(current.pillCount?.phaCanh) || 0, Number(incoming.pillCount?.phaCanh) || 0),
    tuViDan: Math.max(Number(current.pillCount?.tuViDan) || 0, Number(incoming.pillCount?.tuViDan) || 0),
    sieuCapTuViDan: Math.max(Number(current.pillCount?.sieuCapTuViDan) || 0, Number(incoming.pillCount?.sieuCapTuViDan) || 0),
    dinhTam: Math.max(Number(current.pillCount?.dinhTam) || 0, Number(incoming.pillCount?.dinhTam) || 0),
    ngungThan: Math.max(Number(current.pillCount?.ngungThan) || 0, Number(incoming.pillCount?.ngungThan) || 0),
  };

  if (scoreCurrent > scoreIncoming) {
    if (typeof current.pillCount?.tuViDan === 'number') pillCount.tuViDan = current.pillCount.tuViDan;
    if (typeof current.pillCount?.sieuCapTuViDan === 'number') pillCount.sieuCapTuViDan = current.pillCount.sieuCapTuViDan;
  } else if (scoreIncoming > scoreCurrent) {
    if (typeof incoming.pillCount?.tuViDan === 'number') pillCount.tuViDan = incoming.pillCount.tuViDan;
    if (typeof incoming.pillCount?.sieuCapTuViDan === 'number') pillCount.sieuCapTuViDan = incoming.pillCount.sieuCapTuViDan;
  }

  // 4. Dược liệu
  const herbs = {
    uLan: Math.max(Number(current.herbs?.uLan) || 0, Number(incoming.herbs?.uLan) || 0),
    huyetTinh: Math.max(Number(current.herbs?.huyetTinh) || 0, Number(incoming.herbs?.huyetTinh) || 0),
    hoaAnh: Math.max(Number(current.herbs?.hoaAnh) || 0, Number(incoming.herbs?.hoaAnh) || 0),
    huyenThiet: Math.max(Number(current.herbs?.huyenThiet) || 0, Number(incoming.herbs?.huyenThiet) || 0),
    longTu: Math.max(Number(current.herbs?.longTu) || 0, Number(incoming.herbs?.longTu) || 0),
  };

  // 5. Trà đạo
  const teaInventory: Record<string, number> = {
    ...(secondary.teaInventory || {}),
    ...(primary.teaInventory || {}),
  };
  for (const k of Object.keys(secondary.teaInventory || {})) {
    teaInventory[k] = Math.max(Number(primary.teaInventory?.[k]) || 0, Number(secondary.teaInventory?.[k]) || 0);
  }

  // 6. Linh Thạch
  const linhThach = Math.max(Number(current.linhThach) || 0, Number(incoming.linhThach) || 0);

  // 7. Thọ Nguyên
  const thoNguyen = Math.max(Number(current.thoNguyen) || 0, Number(incoming.thoNguyen) || 0);
  const maxThoNguyen = Math.max(Number(current.maxThoNguyen) || 240, Number(incoming.maxThoNguyen) || 240);

  // 8. Lịch sử ký sự tu tiên
  const combinedLog = Array.from(new Set([...(primary.historyLog || []), ...(secondary.historyLog || [])])).slice(0, 30);

  // 9. Nhiệm vụ hàng ngày
  const dailyQuests = Array.isArray(primary.dailyQuests) && primary.dailyQuests.length === 4
    ? primary.dailyQuests
    : (Array.isArray(secondary.dailyQuests) && secondary.dailyQuests.length === 4 ? secondary.dailyQuests : primary.dailyQuests);

  return {
    ...secondary,
    ...primary,
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
    dailyQuestsDate: primary.dailyQuestsDate || incoming.dailyQuestsDate || todayStr,
    historyLog: combinedLog,
    sect: primary.sect || secondary.sect,
    artifacts: primary.artifacts || secondary.artifacts,
    tamPhap: primary.tamPhap || secondary.tamPhap,
    activeBuffs: primary.activeBuffs || secondary.activeBuffs,
  };
}

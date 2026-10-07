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

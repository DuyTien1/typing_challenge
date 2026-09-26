/**
 * BÀN CỔ THẦN THỨC - HỆ THỐNG TRỪNG PHẠT & PHONG ẤN GIAN LẬN
 * Thời hạn cấm thi đấu (Ban duration): 2 giờ (2h = 7,200,000 ms)
 */

export const BAN_DURATION_MS = 2 * 60 * 60 * 1000; // 2 giờ
export const BAN_STORAGE_KEY = 'fasttyping_banco_ban_v1';

export interface ClientBanInfo {
  isBanned: boolean;
  bannedUntil: number;
  bannedAt: number;
  reason: string;
  personaId: 'ban_co';
}

export function getStoredBanInfo(): ClientBanInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BAN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.bannedUntil === 'number') {
      if (Date.now() < parsed.bannedUntil) {
        return {
          isBanned: true,
          bannedUntil: parsed.bannedUntil,
          bannedAt: parsed.bannedAt || Date.now(),
          reason: parsed.reason || 'Bất thường tần số gõ phím / Nghi vấn Auto Macro',
          personaId: 'ban_co',
        };
      } else {
        // Án phạt 2 giờ đã kết thúc - tự động giải trừ
        clearStoredBanInfo();
      }
    }
  } catch {
    // Ignore parse error
  }
  return null;
}

export function saveStoredBanInfo(bannedUntil: number, reason: string): ClientBanInfo {
  const info: ClientBanInfo = {
    isBanned: true,
    bannedUntil,
    bannedAt: Date.now(),
    reason: reason || 'Bất thường tần số gõ phím / Nghi vấn Auto Macro',
    personaId: 'ban_co',
  };
  try {
    localStorage.setItem(BAN_STORAGE_KEY, JSON.stringify(info));
  } catch {
    // Ignore storage errors
  }
  return info;
}

export function clearStoredBanInfo(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BAN_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function formatRemainingTime(ms: number): {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hStr = String(hours).padStart(2, '0');
  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');

  return {
    hours,
    minutes,
    seconds,
    formatted: hours > 0 ? `${hStr}:${mStr}:${sStr}` : `${mStr}:${sStr}`,
  };
}

export function checkClientBanStatus(): {
  isBanned: boolean;
  remainingMs: number;
  remainingMinutes: number;
  remainingSeconds: number;
  formatted: string;
  reason: string;
} {
  const info = getStoredBanInfo();
  if (!info) {
    return {
      isBanned: false,
      remainingMs: 0,
      remainingMinutes: 0,
      remainingSeconds: 0,
      formatted: '00:00:00',
      reason: '',
    };
  }

  const now = Date.now();
  if (now >= info.bannedUntil) {
    clearStoredBanInfo();
    return {
      isBanned: false,
      remainingMs: 0,
      remainingMinutes: 0,
      remainingSeconds: 0,
      formatted: '00:00:00',
      reason: '',
    };
  }

  const remainingMs = info.bannedUntil - now;
  const timeInfo = formatRemainingTime(remainingMs);

  return {
    isBanned: true,
    remainingMs,
    remainingMinutes: Math.max(1, Math.ceil(remainingMs / 60000)),
    remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
    formatted: timeInfo.formatted,
    reason: info.reason,
  };
}

/**
 * Kiểm tra trạng thái cấm đấu đồng bộ với Server
 */
export async function syncServerBanStatus(
  username?: string,
  userId?: string
): Promise<{
  isBanned: boolean;
  remainingMs: number;
  remainingMinutes: number;
  reason: string;
}> {
  try {
    const q = new URLSearchParams();
    if (username) q.set('username', username);
    if (userId) q.set('userId', userId);

    const res = await fetch(`/api/user/ban-status?${q.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.isBanned && data.record) {
        saveStoredBanInfo(data.record.bannedUntil, data.record.reason);
        return {
          isBanned: true,
          remainingMs: data.remainingMs,
          remainingMinutes: data.remainingMinutes,
          reason: data.record.reason,
        };
      } else if (data && !data.isBanned) {
        // Nếu server đã gỡ ban -> đồng bộ xóa ngay lập tức trên client
        clearStoredBanInfo();
      }
    }
  } catch {
    // Ignore network error, rely on local
  }

  const local = checkClientBanStatus();
  return {
    isBanned: local.isBanned,
    remainingMs: local.remainingMs,
    remainingMinutes: local.remainingMinutes,
    reason: local.reason,
  };
}

/**
 * Thực thi án phạt Bàn Cổ Thần Thức: Lưu cấm 2 giờ, trừ tu vi, phát chiếu thư và báo server
 */
export async function executeBanPenalty(params: {
  username: string;
  userId?: string;
  reason: string;
}): Promise<ClientBanInfo> {
  const bannedUntil = Date.now() + BAN_DURATION_MS;
  const reason = params.reason || 'Bất thường tần số gõ phím / Nghi vấn Auto Macro';

  // 1. Lưu Client
  const banInfo = saveStoredBanInfo(bannedUntil, reason);

  // 2. Gửi Server trừng phạt
  try {
    await fetch('/api/dao/penalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: params.username,
        userId: params.userId,
        reason,
        durationMs: BAN_DURATION_MS,
      }),
    });
  } catch {
    // Ignore server error
  }

  return banInfo;
}

/**
 * Gỡ án phạt (Admin hoặc hết hạn)
 */
export async function requestUnban(username: string, userId?: string): Promise<boolean> {
  clearStoredBanInfo();
  try {
    const res = await fetch('/api/admin/unban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, userId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

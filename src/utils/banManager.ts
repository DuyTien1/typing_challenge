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
  userId?: string,
  displayName?: string
): Promise<{
  isBanned: boolean;
  remainingMs: number;
  remainingMinutes: number;
  reason: string;
}> {
  const local = checkClientBanStatus();

  try {
    const q = new URLSearchParams();
    if (username) q.set('username', username.replace(/^@/, '').trim());
    if (userId) q.set('userId', userId.trim());
    if (displayName) q.set('displayName', displayName.replace(/^@/, '').trim());

    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('fasttyping_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } catch {}
    }

    const res = await fetch(`/api/user/ban-status?${q.toString()}`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data && data.isBanned) {
        const bannedUntil =
          data.record?.bannedUntil ||
          (data.remainingMs ? Date.now() + data.remainingMs : local.isBanned ? local.remainingMs + Date.now() : Date.now() + BAN_DURATION_MS);
        const reason =
          data.record?.reason ||
          data.reason ||
          local.reason ||
          'Quyết định từ Ban Quản Trị';
        saveStoredBanInfo(bannedUntil, reason);
        const remMs = Math.max(0, bannedUntil - Date.now());
        return {
          isBanned: true,
          remainingMs: data.remainingMs || remMs,
          remainingMinutes: data.remainingMinutes || Math.max(1, Math.ceil(remMs / 60000)),
          reason,
        };
      } else if (data && !data.isBanned) {
        // Chỉ xóa án phạt khi Server xác nhận Quản trị viên đã giải trừ rõ ràng (clearedByAdmin)
        // hoặc thời gian án phạt cục bộ đã thực sự hết hạn
        if (data.clearedByAdmin) {
          clearStoredBanInfo();
          return {
            isBanned: false,
            remainingMs: 0,
            remainingMinutes: 0,
            reason: '',
          };
        }
      }
    }
  } catch {
    // Bỏ qua lỗi kết nối mạng, duy trì dữ liệu án phạt lưu trữ cục bộ
  }

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
  displayName?: string;
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
        displayName: params.displayName,
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

/**
 * Utility theo dõi thời gian online / tọa thiền của tài khoản trên website
 */

const ONLINE_TIME_KEY_PREFIX = 'fasttyping_online_seconds_';

export function getAccountOnlineSeconds(userId?: string | null): number {
  if (typeof window === 'undefined' || !userId) return 0;
  try {
    const raw = localStorage.getItem(`${ONLINE_TIME_KEY_PREFIX}${userId}`);
    if (raw) {
      const val = parseInt(raw, 10);
      return isNaN(val) ? 0 : val;
    }
  } catch {
    // ignore
  }
  return 0;
}

export function saveAccountOnlineSeconds(seconds: number, userId?: string | null): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(`${ONLINE_TIME_KEY_PREFIX}${userId}`, Math.max(0, Math.floor(seconds)).toString());
  } catch {
    // ignore
  }
}

export function addAccountOnlineSeconds(secondsToAdd: number, userId?: string | null): number {
  if (typeof window === 'undefined' || !userId || secondsToAdd <= 0) return 0;
  const current = getAccountOnlineSeconds(userId);
  const updated = current + Math.floor(secondsToAdd);
  saveAccountOnlineSeconds(updated, userId);
  return updated;
}

export function formatOnlineDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 60) {
    return `${Math.max(0, Math.floor(totalSeconds))} giây`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes} phút`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} giờ`;
  }
  return `${hours} giờ ${remainingMinutes} phút`;
}

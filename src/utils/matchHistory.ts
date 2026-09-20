export type MatchResult = 'Thắng' | 'Thua' | 'Đầu hàng';

export interface MatchRecord {
  id: string;
  timestamp: number;
  mode: string;
  modeId: string;
  wpm: number;
  accuracy: number;
  result: MatchResult;
  score?: number;
  playType?: 'solo' | 'multiplayer';
  isCompleted?: boolean;
}

const STORAGE_KEY = 'fasttyping_match_history';
const MAX_HISTORY = 50;

/**
 * Lấy danh sách lịch sử đấu từ localStorage
 */
export function getStoredMatchHistory(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Lưu một trận đấu mới vào lịch sử đấu
 */
export function addMatchRecord(record: {
  mode: string;
  modeId: string;
  wpm: number;
  accuracy: number;
  result: MatchResult;
  score?: number;
  playType?: 'solo' | 'multiplayer';
  isCompleted?: boolean;
}): MatchRecord {
  const current = getStoredMatchHistory();
  const isCompleted = record.isCompleted !== undefined 
    ? record.isCompleted 
    : record.result !== 'Đầu hàng';

  const newRecord: MatchRecord = {
    id: `match_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    mode: record.mode,
    modeId: record.modeId,
    wpm: Math.max(0, Math.round(record.wpm || 0)),
    accuracy: Math.max(0, Math.min(100, Math.round(record.accuracy ?? 100))),
    result: record.result,
    score: record.score !== undefined ? Math.max(0, Math.round(record.score)) : undefined,
    playType: record.playType || 'solo',
    isCompleted,
  };

  const updated = [newRecord, ...current].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Không thể lưu lịch sử đấu vào localStorage', err);
  }

  return newRecord;
}

/**
 * Xóa toàn bộ lịch sử đấu
 */
export function clearMatchHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Không thể xóa lịch sử đấu', err);
  }
}

/**
 * Lấy tên hiển thị tiếng Việt thân thiện của chế độ
 */
export function getFriendlyModeName(modeId: string): string {
  switch (modeId) {
    case 'vi_dau':
      return 'Tiếng Việt có dấu';
    case 'vi_nodau':
      return 'Tiếng Việt không dấu';
    case 'en':
      return 'Tiếng Anh';
    case 'numpad':
      return 'Phím số Numpad';
    case 'ngau_hung':
      return 'Ngẫu Hứng';
    case 'doan_chu':
      return 'Đoán Chữ';
    case 'san_boss':
      return 'Săn Boss';
    case 'outplay':
      return 'Outplay';
    default:
      return 'Đua Tốc Độ';
  }
}

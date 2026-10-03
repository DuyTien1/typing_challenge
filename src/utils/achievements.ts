import { HighScoreRecord } from '../types';
import { MatchRecord } from './matchHistory';
import {
  getAccountOnlineSeconds,
  saveAccountOnlineSeconds,
  addAccountOnlineSeconds,
  formatOnlineDuration,
} from './onlineTracker';

export {
  getAccountOnlineSeconds,
  saveAccountOnlineSeconds,
  addAccountOnlineSeconds,
  formatOnlineDuration,
};

export type AchievementBranch =
  | 'speed'
  | 'accuracy'
  | 'matches'
  | 'pve'
  | 'numpad'
  | 'streak'
  | 'hidden'
  | 'online_time'
  | 'social'
  | 'cultivation';

export type XianxiaRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface XianxiaAchievement {
  id: string;
  name: string;
  branch: AchievementBranch;
  branchName: string;
  icon: string;
  title: string;          // Danh hiệu Tiên hiệp
  realm: string;          // Cảnh giới tu vi (Luyện Khí, Trúc Cơ, Kim Đan, etc.)
  req: string;            // Điều kiện hoàn thành
  rarity: XianxiaRarity;
  colorClass: string;     // Màu sắc huy hiệu
  borderClass: string;    // Viền phát sáng
  glowClass: string;      // Hiệu ứng nền
  badgeBg: string;        // Màu nền thẻ bài
  isHidden?: boolean;     // Thành tựu ẩn (Cơ duyên bí mật)
  secretHint?: string;    // Gợi ý mờ cho thành tựu ẩn
}

export const BRANCH_DEFINITIONS: Record<
  AchievementBranch,
  { name: string; desc: string; icon: string; color: string }
> = {
  speed: {
    name: 'Tật Phong Kiếm Quyết',
    desc: 'Luyện thủ pháp thần tốc, lướt phím tựa phi kiếm phá không',
    icon: '⚡',
    color: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  },
  accuracy: {
    name: 'Tâm Kiếm Vô Tạp',
    desc: 'Đạo tâm kiên định, không một niệm sai lầm tạp niệm',
    icon: '🧘',
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  },
  matches: {
    name: 'Bách Chiến Đăng Tiên',
    desc: 'Tích lũy linh lực qua từng trận phong ba chư thiên',
    icon: '📜',
    color: 'text-sky-400 border-sky-500/40 bg-sky-500/10',
  },
  pve: {
    name: 'Tru Ma & Bí Cảnh',
    desc: 'Chém yêu diệt quái, phá giải mê trận càn khôn',
    icon: '🐉',
    color: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
  },
  numpad: {
    name: 'Thần Số Trận Pháp',
    desc: 'Diễn giải Hà Đồ Lạc Thư, khống chế số trận tuyệt luân',
    icon: '🔢',
    color: 'text-teal-400 border-teal-500/40 bg-teal-500/10',
  },
  streak: {
    name: 'Bách Thắng Tranh Hùng',
    desc: 'Khí thế ngút trời, bất bại liên trảm chốn đấu trường',
    icon: '⚔️',
    color: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  },
  hidden: {
    name: 'Kỳ Ngộ Ẩn Thế',
    desc: 'Cơ duyên nghịch thiên, ngộ đạo từ những điều bí mật',
    icon: '🔮',
    color: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
  },
  online_time: {
    name: 'Động Phủ Tọa Thiền',
    desc: 'Tĩnh tọa ngưng thần, thổ nạp nhật nguyệt, tích lũy thời gian gắn bó tu hành cùng FastTyping',
    icon: '⏳',
    color: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10',
  },
  social: {
    name: 'Tông Môn Vạn Đạo',
    desc: 'Kết nghĩa kim lan, bái nhập tiên môn, chung vai sát cánh cùng chư vị đạo lữ',
    icon: '⛩️',
    color: 'text-pink-400 border-pink-500/40 bg-pink-500/10',
  },
  cultivation: {
    name: 'Đan Đạo & Khí Thần',
    desc: 'Dẫn hỏa luyện đan, rèn đúc chí bảo, siêu thoát phàm thai đắc chứng trường sinh',
    icon: '🏺',
    color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
  },
};

import {
  XIANXIA_ACHIEVEMENTS,
  REALM_ACHIEVEMENT_MAPPING,
} from '../data/achievementsList';

export {
  XIANXIA_ACHIEVEMENTS,
  REALM_ACHIEVEMENT_MAPPING,
};

const UNLOCKED_KEY_PREFIX = 'fasttyping_unlocked_achievements_';
const LEGACY_UNLOCKED_KEY = 'fasttyping_unlocked_achievements';
const SHOWCASE_KEY_PREFIX = 'fasttyping_showcase_achievements_';
const LEGACY_SHOWCASE_KEY = 'fasttyping_showcase_achievements';

/**
 * Lấy danh sách ID thành tựu đã mở khóa từ LocalStorage
 * CHỈ dành cho người chơi đã đăng nhập (cần truyền userId hoặc username)
 * Khách vãng lai (Guest / chưa đăng nhập) luôn trả về mảng rỗng []
 */
export function getStoredUnlockedAchievements(userId?: string | null): string[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(`${UNLOCKED_KEY_PREFIX}${userId}`);
    if (raw) return JSON.parse(raw);
    return [];
  } catch {
    return [];
  }
}

/**
 * Lưu danh sách ID thành tựu đã mở khóa vào LocalStorage
 * CHỈ lưu khi đã đăng nhập có userId hợp lệ
 */
export function setStoredUnlockedAchievements(ids: string[], userId?: string | null): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(`${UNLOCKED_KEY_PREFIX}${userId}`, JSON.stringify(Array.from(new Set(ids))));
    // Dọn dẹp legacy key để khách vãng lai không bị dính thành tựu cũ
    localStorage.removeItem(LEGACY_UNLOCKED_KEY);
  } catch {
    // ignore
  }
}

/**
 * Lấy tối đa 4 thành tựu được người chơi chọn trưng bày (Showcase)
 * KHÁCH VÃNG LAI: Luôn trả về mảng rỗng [] (không có quyền trưng bày thành tựu)
 */
export function getShowcaseAchievements(userId?: string | null): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = userId ? `${SHOWCASE_KEY_PREFIX}${userId}` : LEGACY_SHOWCASE_KEY;
    const raw = localStorage.getItem(key) || (userId ? localStorage.getItem(LEGACY_SHOWCASE_KEY) : null);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id) => Boolean(getAchievementById(id))).slice(0, 4);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Lưu tối đa 4 thành tựu được người chơi chọn trưng bày (Showcase)
 * CHỈ lưu khi người chơi đã đăng nhập có userId hợp lệ
 */
export function setShowcaseAchievements(ids: string[], userId?: string | null): string[] {
  if (!userId) return [];
  const sanitized = Array.from(new Set(ids.filter((id) => Boolean(getAchievementById(id))))).slice(0, 4);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${SHOWCASE_KEY_PREFIX}${userId}`, JSON.stringify(sanitized));
      localStorage.removeItem(LEGACY_SHOWCASE_KEY);
    } catch {
      // ignore
    }
  }
  return sanitized;
}

/**
 * Lấy thông tin cấu hình của 1 thành tựu bằng ID
 */
export function getAchievementById(id: string): XianxiaAchievement | undefined {
  return XIANXIA_ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Lấy danh sách ID thành tựu tương ứng với cảnh giới (<= realmIndex)
 */
export function getAchievementsUpToRealm(realmIndex: number): string[] {
  return Object.entries(REALM_ACHIEVEMENT_MAPPING)
    .filter(([_, rIdx]) => rIdx <= realmIndex)
    .map(([id]) => id);
}

/**
 * Mở khóa hàng loạt thành tựu cho người chơi (Admin tool hoặc sự kiện)
 */
export function unlockAchievementsForUser(achievementIds: string[], userId?: string | null): string[] {
  const accountKey = userId || 'Admin';
  const existing = new Set(getStoredUnlockedAchievements(accountKey));
  for (const id of achievementIds) {
    existing.add(id);
  }
  const updated = Array.from(existing);
  setStoredUnlockedAchievements(updated, accountKey);
  return updated;
}

/**
 * Đặt lại (Reset) toàn bộ thành tựu của tài khoản về trạng thái ban đầu
 */
export function resetAchievementsForUser(userId?: string | null): void {
  const accountKey = userId || 'Admin';
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${UNLOCKED_KEY_PREFIX}${accountKey}`);
    localStorage.removeItem(`${SHOWCASE_KEY_PREFIX}${accountKey}`);
  } catch {
    // ignore
  }
}

/**
 * Tính toán trạng thái mở khóa thành tựu của người chơi dựa trên toàn bộ chỉ số thực tế
 * ĐẢM BẢO QUY ĐỊNH: CHỈ NGƯỜI CHƠI ĐÃ ĐĂNG NHẬP MỚI CÓ THỂ HOÀN THÀNH THÀNH TỰU!
 */
export function calculatePlayerAchievements(params: {
  bestWpm: number;
  totalGames: number;
  username: string;
  frame?: string;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  userId?: string | null;
  matchHistory?: MatchRecord[];
  highScores?: Record<string, HighScoreRecord | null>;
  roomPlayerCount?: number;
  initialUnlocked?: string[];
  cultivationLevel?: number;
  cultivationRealmIndex?: number;
  cultivationState?: any;
  onlineSeconds?: number;
  friendsList?: any[];
}): {
  unlockedMap: Record<string, boolean>;
  unlockedList: XianxiaAchievement[];
  unlockedCount: number;
  totalCount: number;
  isLockedDueToGuest: boolean;
  newlyUnlockedList: XianxiaAchievement[];
} {
  const {
    bestWpm,
    totalGames,
    username,
    frame = 'default',
    isLoggedIn = false,
    isAdmin = false,
    userId = null,
    matchHistory = [],
    highScores = {},
    roomPlayerCount = 1,
    initialUnlocked = [],
    cultivationLevel,
    cultivationRealmIndex,
    cultivationState,
    onlineSeconds,
    friendsList = [],
  } = params;

  // QUY ĐỊNH CỐT LÕI: CHỈ NGƯỜI CHƠI ĐÃ ĐĂNG NHẬP HOẶC CÓ QUYỀN ADMIN MỚI CÓ THỂ HOÀN THÀNH THÀNH TỰU
  if (!isLoggedIn && !isAdmin) {
    const lockedMap: Record<string, boolean> = {};
    for (const ach of XIANXIA_ACHIEVEMENTS) {
      lockedMap[ach.id] = false;
    }
    return {
      unlockedMap: lockedMap,
      unlockedList: [],
      unlockedCount: 0,
      totalCount: XIANXIA_ACHIEVEMENTS.length,
      isLockedDueToGuest: true,
      newlyUnlockedList: [],
    };
  }

  // Tự động kiểm tra cảnh giới tu tiên từ bộ nhớ nếu không được truyền vào
  let effectiveRealmIndex = cultivationRealmIndex;
  let effectiveCult = cultivationState;
  if (typeof window !== 'undefined') {
    try {
      const rawCult = localStorage.getItem('fasttyping_cultivation_state_v1');
      if (rawCult) {
        const parsed = JSON.parse(rawCult);
        if (!effectiveCult) effectiveCult = parsed;
        if (effectiveRealmIndex === undefined && typeof parsed?.realmIndex === 'number') {
          effectiveRealmIndex = parsed.realmIndex;
        }
      }
    } catch {
      // ignore
    }
  }

  // Cache đã mở trước đó của riêng tài khoản người chơi này
  const accountKey = userId || username;
  const previouslyUnlocked = new Set([
    ...getStoredUnlockedAchievements(accountKey),
    ...initialUnlocked,
  ]);
  const newUnlocked = new Set<string>(previouslyUnlocked);

  // Tài khoản Admin hoặc admin mặc định: mở khóa toàn bộ thành tựu để quản trị và kiểm thử showcase
  if (isAdmin || (username && username.trim().toLowerCase() === 'admin') || userId === 'usr_admin_default') {
    for (const ach of XIANXIA_ACHIEVEMENTS) {
      newUnlocked.add(ach.id);
    }
  }

  // QUY TẮC CỐT LÕI: Lọc chỉ lấy các trận đấu ĐÃ HOÀN THÀNH HỢP LỆ
  const completedMatchHistory = matchHistory.filter(
    (m) => m.isCompleted !== false && m.result !== 'Đầu hàng' && m.result !== 'AFK'
  );

  // Thống kê từ lịch sử đấu: CHỈ tính từ các trận đấu ĐÃ HOÀN THÀNH
  const maxMatchWpm = Math.max(bestWpm, ...completedMatchHistory.map((m) => m.wpm || 0));
  const effectiveTotalMatches = Math.max(totalGames, completedMatchHistory.length);
  const accurate100Count = completedMatchHistory.filter((m) => m.accuracy === 100).length;
  const surrenderedCount = matchHistory.filter((m) => m.result === 'Đầu hàng' || m.result === 'AFK' || m.isCompleted === false).length;
  const uniqueModes = new Set(completedMatchHistory.map((m) => m.modeId || m.mode));

  // Kiểm tra chuỗi thắng
  let maxWinStreak = 0;
  let currentStreak = 0;
  for (const m of [...matchHistory].reverse()) {
    if (m.result === 'Thắng' && m.isCompleted !== false) {
      currentStreak++;
      if (currentStreak > maxWinStreak) maxWinStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  // Kiểm tra chuỗi ổn định độ chính xác >= 96%
  let steadyAccStreak = 0;
  let maxSteadyAccStreak = 0;
  for (const m of completedMatchHistory) {
    if (m.accuracy >= 96) {
      steadyAccStreak++;
      if (steadyAccStreak > maxSteadyAccStreak) maxSteadyAccStreak = steadyAccStreak;
    } else {
      steadyAccStreak = 0;
    }
  }

  // Kiểm tra giờ đêm (23h - 5h) & bình minh (5h - 7h)
  const now = new Date();
  const currentHour = now.getHours();
  const isNightTimeNow = currentHour >= 23 || currentHour < 5;
  const isDawnTimeNow = currentHour >= 5 && currentHour < 7;
  const hasNightMatch = completedMatchHistory.some((m) => {
    const d = new Date(m.timestamp);
    const h = d.getHours();
    return h >= 23 || h < 5;
  });
  const hasDawnMatch = completedMatchHistory.some((m) => {
    const d = new Date(m.timestamp);
    const h = d.getHours();
    return h >= 5 && h < 7;
  });

  // Kiểm tra số ván đấu trong cùng ngày hôm nay (15 ván)
  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const matchesTodayCount = completedMatchHistory.filter((m) => {
    const d = new Date(m.timestamp);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` === todayStr;
  }).length;

  // Thời gian online tích lũy (giây)
  const effectiveOnlineSeconds = onlineSeconds !== undefined ? onlineSeconds : getAccountOnlineSeconds(accountKey);

  // Số lượng bạn bè
  let effectiveFriendsCount = friendsList.length;
  let hasDaoLu = friendsList.some((f) => f.isDaoLu);
  if (effectiveFriendsCount === 0 && typeof window !== 'undefined') {
    try {
      const rawFriends = localStorage.getItem('fasttyping_friends_cache');
      if (rawFriends) {
        const parsed = JSON.parse(rawFriends);
        if (Array.isArray(parsed)) {
          effectiveFriendsCount = parsed.length;
          hasDaoLu = parsed.some((f: any) => f.isDaoLu);
        }
      }
    } catch {
      // ignore
    }
  }

  // Tương tác xã hội & chat
  let hasSentChat = false;
  let hasGiftedTea = false;
  if (typeof window !== 'undefined') {
    try {
      hasSentChat = Boolean(localStorage.getItem(`fasttyping_chat_sent_${accountKey}`));
      hasGiftedTea = Boolean(localStorage.getItem(`fasttyping_tea_gifted_${accountKey}`));
    } catch {
      // ignore
    }
  }

  // Kiểm tra Top 1 bảng xếp hạng
  let isLeaderboardTop1 = false;
  if (username) {
    const cleanUser = username.trim().toLowerCase();
    for (const rec of Object.values(highScores)) {
      if (rec && rec.username && rec.username.trim().toLowerCase() === cleanUser) {
        isLeaderboardTop1 = true;
        break;
      }
    }
  }

  // Đánh giá từng thành tựu
  for (const ach of XIANXIA_ACHIEVEMENTS) {
    if (newUnlocked.has(ach.id)) continue;

    let isMet = false;

    // 1. Tự động hoàn thành thành tựu nếu Cảnh Giới Tu Tiên đạt mức tương ứng
    if (effectiveRealmIndex !== undefined && REALM_ACHIEVEMENT_MAPPING[ach.id] !== undefined) {
      if (effectiveRealmIndex >= REALM_ACHIEVEMENT_MAPPING[ach.id]) {
        isMet = true;
      }
    }

    if (!isMet) {
      switch (ach.id) {
      // Tật Phong Kiếm Quyết (Speed)
      case 'speed_40':
        isMet = maxMatchWpm >= 40;
        break;
      case 'speed_50':
        isMet = maxMatchWpm >= 50;
        break;
      case 'speed_60':
        isMet = maxMatchWpm >= 60;
        break;
      case 'speed_70':
        isMet = maxMatchWpm >= 70;
        break;
      case 'speed_80':
        isMet = maxMatchWpm >= 80;
        break;
      case 'speed_90':
        isMet = maxMatchWpm >= 90;
        break;
      case 'speed_100':
        isMet = maxMatchWpm >= 100;
        break;
      case 'speed_110':
        isMet = maxMatchWpm >= 110;
        break;
      case 'speed_120':
        isMet = maxMatchWpm >= 120;
        break;
      case 'speed_130':
        isMet = maxMatchWpm >= 130;
        break;
      case 'speed_140':
        isMet = maxMatchWpm >= 140;
        break;
      case 'speed_150':
        isMet = maxMatchWpm >= 150;
        break;
      case 'speed_160':
        isMet = maxMatchWpm >= 160;
        break;
      case 'speed_180':
        isMet = maxMatchWpm >= 180;
        break;

      // Tâm Kiếm Vô Tạp (Accuracy)
      case 'acc_95':
        isMet = completedMatchHistory.some((m) => m.accuracy >= 95);
        break;
      case 'acc_98':
        isMet = completedMatchHistory.some((m) => m.accuracy >= 98);
        break;
      case 'acc_99':
        isMet = completedMatchHistory.some((m) => m.accuracy >= 99);
        break;
      case 'acc_100_once':
        isMet = accurate100Count >= 1;
        break;
      case 'acc_100_3x':
        isMet = accurate100Count >= 3;
        break;
      case 'acc_100_5x':
        isMet = accurate100Count >= 5;
        break;
      case 'acc_100_10x':
        isMet = accurate100Count >= 10;
        break;
      case 'acc_100_20x':
        isMet = accurate100Count >= 20;
        break;
      case 'acc_speed_combo':
        isMet = completedMatchHistory.some((m) => m.wpm >= 80 && m.accuracy === 100);
        break;
      case 'acc_streak_10':
        isMet = maxSteadyAccStreak >= 10;
        break;

      // Bách Chiến Đăng Tiên (Matches)
      case 'matches_1':
        isMet = effectiveTotalMatches >= 1;
        break;
      case 'matches_10':
        isMet = effectiveTotalMatches >= 10;
        break;
      case 'matches_30':
        isMet = effectiveTotalMatches >= 30;
        break;
      case 'matches_50':
        isMet = effectiveTotalMatches >= 50;
        break;
      case 'matches_75':
        isMet = effectiveTotalMatches >= 75;
        break;
      case 'matches_100':
        isMet = effectiveTotalMatches >= 100;
        break;
      case 'matches_150':
        isMet = effectiveTotalMatches >= 150;
        break;
      case 'matches_200':
        isMet = effectiveTotalMatches >= 200;
        break;
      case 'matches_300':
        isMet = effectiveTotalMatches >= 300;
        break;
      case 'matches_500':
        isMet = effectiveTotalMatches >= 500;
        break;
      case 'matches_750':
        isMet = effectiveTotalMatches >= 750;
        break;
      case 'matches_1000':
        isMet = effectiveTotalMatches >= 1000;
        break;

      // Tru Ma & Bí Cảnh (PvE & Special Modes)
      case 'pve_boss_win':
        isMet = completedMatchHistory.some((m) => m.modeId === 'san_boss' && m.result === 'Thắng');
        break;
      case 'pve_boss_hell':
        isMet = completedMatchHistory.some(
          (m) => m.modeId === 'san_boss' && m.result === 'Thắng' && (m.mode?.includes('Địa Ngục') || m.mode?.includes('Huyền Thoại'))
        );
        break;
      case 'pve_boss_5x':
        isMet = completedMatchHistory.filter((m) => m.modeId === 'san_boss' && m.result === 'Thắng').length >= 5;
        break;
      case 'pve_mystery_word':
        isMet = completedMatchHistory.some((m) => m.modeId === 'doan_chu' && (m.score || 0) > 0);
        break;
      case 'pve_mystery_5x':
        isMet = completedMatchHistory.filter((m) => m.modeId === 'doan_chu' && (m.score || 0) > 0).length >= 5;
        break;
      case 'pve_rush_high':
        isMet = completedMatchHistory.some((m) => m.modeId === 'ngau_hung' && ((m.score || 0) >= 100 || m.wpm >= 60));
        break;
      case 'pve_rush_master':
        isMet = completedMatchHistory.some((m) => m.modeId === 'ngau_hung' && (m.wpm >= 80 || (m.score || 0) >= 150));
        break;
      case 'pve_outplay_beat':
        isMet = completedMatchHistory.some((m) => m.modeId === 'outplay' && m.result === 'Thắng');
        break;
      case 'pve_outplay_streak':
        isMet = completedMatchHistory.filter((m) => m.modeId === 'outplay' && m.result === 'Thắng').length >= 3;
        break;

      // Thần Số Trận Pháp (Numpad)
      case 'numpad_intro':
        isMet = completedMatchHistory.some((m) => m.modeId === 'numpad');
        break;
      case 'numpad_40':
        isMet = completedMatchHistory.some((m) => m.modeId === 'numpad' && m.wpm >= 40);
        break;
      case 'numpad_50':
        isMet = completedMatchHistory.some((m) => m.modeId === 'numpad' && m.wpm >= 50);
        break;
      case 'numpad_60':
        isMet = completedMatchHistory.some((m) => m.modeId === 'numpad' && m.wpm >= 60);
        break;
      case 'numpad_75':
        isMet = completedMatchHistory.some((m) => m.modeId === 'numpad' && m.wpm >= 75);
        break;
      case 'numpad_90':
        isMet = completedMatchHistory.some((m) => m.modeId === 'numpad' && m.wpm >= 90);
        break;
      case 'numpad_100':
        isMet = completedMatchHistory.some((m) => m.modeId === 'numpad' && m.wpm >= 100);
        break;
      case 'numpad_120':
        isMet = completedMatchHistory.some((m) => m.modeId === 'numpad' && m.wpm >= 120);
        break;
      case 'numpad_10_matches':
        isMet = completedMatchHistory.filter((m) => m.modeId === 'numpad').length >= 10;
        break;

      // Bách Thắng Tranh Hùng (Streak & PvP)
      case 'pvp_first_win':
        isMet = completedMatchHistory.some((m) => m.playType === 'multiplayer' && m.result === 'Thắng');
        break;
      case 'pvp_wins_5':
        isMet = completedMatchHistory.filter((m) => m.playType === 'multiplayer' && m.result === 'Thắng').length >= 5;
        break;
      case 'pvp_streak_3':
        isMet = maxWinStreak >= 3;
        break;
      case 'pvp_streak_5':
        isMet = maxWinStreak >= 5;
        break;
      case 'pvp_wins_20':
        isMet = completedMatchHistory.filter((m) => m.playType === 'multiplayer' && m.result === 'Thắng').length >= 20;
        break;
      case 'pvp_streak_8':
        isMet = maxWinStreak >= 8;
        break;
      case 'pvp_streak_10':
        isMet = maxWinStreak >= 10;
        break;
      case 'pvp_room_8_top1':
        isMet = roomPlayerCount >= 6 && completedMatchHistory.some((m) => m.playType === 'multiplayer' && m.result === 'Thắng');
        break;

      // Kỳ Ngộ Ẩn Thế (Hidden)
      case 'hidden_room_full':
        isMet = roomPlayerCount >= 8;
        break;
      case 'hidden_comeback':
        isMet = completedMatchHistory.some((m) => m.playType === 'multiplayer' && m.result === 'Thắng');
        break;
      case 'hidden_midnight':
        isMet = isNightTimeNow || hasNightMatch;
        break;
      case 'hidden_dawn':
        isMet = isDawnTimeNow || hasDawnMatch;
        break;
      case 'hidden_flawless_fast':
        isMet = completedMatchHistory.some((m) => m.wpm >= 75 && m.accuracy === 100);
        break;
      case 'hidden_unyielding':
        isMet = effectiveTotalMatches >= 10 && surrenderedCount === 0;
        break;
      case 'hidden_top_glory':
        isMet = isLeaderboardTop1 || maxMatchWpm >= 110;
        break;
      case 'hidden_all_modes':
        isMet = uniqueModes.size >= 5;
        break;
      case 'hidden_aura_frame':
        isMet = frame !== 'default' && frame !== '';
        break;
      case 'hidden_verified_dao':
        isMet = isLoggedIn;
        break;
      case 'hidden_steady_heart':
        isMet = maxSteadyAccStreak >= 5;
        break;
      case 'hidden_lucky_wpm':
        isMet = completedMatchHistory.some((m) => [77, 88, 99, 100].includes(Math.round(m.wpm)));
        break;
      case 'hidden_endurance':
        isMet = matchesTodayCount >= 15;
        break;
      case 'hidden_speed_god':
        isMet = completedMatchHistory.some((m) => m.wpm >= 130 && m.accuracy >= 98);
        break;

      // NHÁNH MỚI 1: ĐỘNG PHỦ TỌA THIỀN (ONLINE TIME)
      case 'online_10m':
        isMet = effectiveOnlineSeconds >= 600;
        break;
      case 'online_30m':
        isMet = effectiveOnlineSeconds >= 1800;
        break;
      case 'online_1h':
        isMet = effectiveOnlineSeconds >= 3600;
        break;
      case 'online_3h':
        isMet = effectiveOnlineSeconds >= 10800;
        break;
      case 'online_6h':
        isMet = effectiveOnlineSeconds >= 21600;
        break;
      case 'online_12h':
        isMet = effectiveOnlineSeconds >= 43200;
        break;
      case 'online_24h':
        isMet = effectiveOnlineSeconds >= 86400;
        break;
      case 'online_50h':
        isMet = effectiveOnlineSeconds >= 180000;
        break;
      case 'online_100h':
        isMet = effectiveOnlineSeconds >= 360000;
        break;

      // NHÁNH MỚI 2: TÔNG MÔN VẠN ĐẠO (SOCIAL & SECT)
      case 'social_join_sect':
        isMet = Boolean(effectiveCult?.sect?.sectId || effectiveCult?.sectId);
        break;
      case 'social_first_friend':
        isMet = effectiveFriendsCount >= 1;
        break;
      case 'social_chat_world':
        isMet = hasSentChat;
        break;
      case 'social_gift_tea':
        isMet = hasGiftedTea;
        break;
      case 'social_dao_lu':
        isMet = hasDaoLu;
        break;
      case 'social_sect_war':
        isMet = Boolean(effectiveCult?.sect?.contribution > 0) || completedMatchHistory.some((m) => m.subMode === 'sect_tournament');
        break;
      case 'social_sect_officer':
        isMet = ['chuong_mon', 'dai_truong_lao'].includes(effectiveCult?.sect?.role);
        break;
      case 'social_friends_5':
        isMet = effectiveFriendsCount >= 5;
        break;

      // NHÁNH MỚI 3: ĐAN ĐẠO & KHÍ THẦN (CULTIVATION, ARTIFACTS & ALCHEMY)
      case 'cult_craft_pill':
        isMet = Boolean(effectiveCult?.historyLog?.some((log: string) => log.includes('Luyện Đan')) || effectiveCult?.pillCount?.hoTam > 0 || effectiveCult?.pillCount?.phaCanh > 0 || effectiveCult?.pillCount?.tuViDan > 0);
        break;
      case 'cult_upgrade_artifact':
        isMet = Boolean(effectiveCult?.artifacts && Object.values(effectiveCult.artifacts).some((art: any) => art && typeof art.level === 'number' && art.level > 1));
        break;
      case 'cult_breakthrough_trucco':
        isMet = (effectiveRealmIndex !== undefined && effectiveRealmIndex >= 1) || (effectiveCult?.level || 0) >= 31;
        break;
      case 'cult_breakthrough_kindan':
        isMet = (effectiveRealmIndex !== undefined && effectiveRealmIndex >= 2) || (effectiveCult?.level || 0) >= 71;
        break;
      case 'cult_breakthrough_nguyenanh':
        isMet = (effectiveRealmIndex !== undefined && effectiveRealmIndex >= 3) || (effectiveCult?.level || 0) >= 131;
        break;
      case 'cult_tuvi_10k':
        isMet = (effectiveCult?.exp || 0) >= 10000 || (effectiveCult?.level || 0) >= 30;
        break;
      case 'cult_tuvi_50k':
        isMet = (effectiveCult?.exp || 0) >= 50000 || (effectiveCult?.level || 0) >= 70;
        break;
      case 'cult_all_herbs':
        isMet = Boolean(
          effectiveCult?.herbs &&
          Object.values(effectiveCult.herbs).filter((c: any) => typeof c === 'number' && c > 0).length >= 5
        );
        break;
      case 'cult_high_pill':
        isMet = Boolean(effectiveCult?.activeBuffs?.pill || (effectiveCult?.pillCount?.sieuCapTuViDan || 0) > 0);
        break;
      }
    }

    if (isMet) {
      newUnlocked.add(ach.id);
    }
  }

  // Danh sách các thành tựu mới hoàn thành ngay trong lần tính toán này
  const newlyUnlockedList = XIANXIA_ACHIEVEMENTS.filter(
    (a) => newUnlocked.has(a.id) && !previouslyUnlocked.has(a.id)
  );

  // Lưu lại cache cho tài khoản đã đăng nhập
  setStoredUnlockedAchievements(Array.from(newUnlocked), accountKey);

  const unlockedMap: Record<string, boolean> = {};
  for (const ach of XIANXIA_ACHIEVEMENTS) {
    unlockedMap[ach.id] = newUnlocked.has(ach.id);
  }

  const unlockedList = XIANXIA_ACHIEVEMENTS.filter((a) => newUnlocked.has(a.id));

  return {
    unlockedMap,
    unlockedList,
    unlockedCount: unlockedList.length,
    totalCount: XIANXIA_ACHIEVEMENTS.length,
    isLockedDueToGuest: false,
    newlyUnlockedList,
  };
}

/**
 * Kiểm tra các thành tựu mới đạt được ngay sau khi kết thúc ván đấu
 * QUY TẮC CỐT LÕI:
 * 1. Người chơi chưa đăng nhập (Khách / Guest) và không phải Admin: TUYỆT ĐỐI KHÔNG TÍNH THÀNH TỰU
 * 2. Trận đấu chưa hoàn thành (đầu hàng, out phòng, ...): TUYỆT ĐỐI KHÔNG TÍNH THÀNH TỰU
 */
export function checkNewAchievementsOnMatchEnd(params: {
  bestWpm: number;
  totalGames: number;
  username: string;
  frame?: string;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  userId?: string | null;
  matchHistory?: MatchRecord[];
  highScores?: Record<string, HighScoreRecord | null>;
  roomPlayerCount?: number;
  initialUnlocked?: string[];
  cultivationLevel?: number;
  cultivationRealmIndex?: number;
  cultivationState?: any;
  onlineSeconds?: number;
  friendsList?: any[];
  isMatchCompleted?: boolean;
}): XianxiaAchievement[] {
  // Người chơi chưa đăng nhập hoặc trận đấu chưa hoàn thành (đầu hàng, out phòng) -> không bao giờ tính thành tựu
  if ((!params.isLoggedIn && !params.isAdmin) || params.isMatchCompleted === false) {
    return [];
  }
  const res = calculatePlayerAchievements(params);
  return res.newlyUnlockedList || [];
}

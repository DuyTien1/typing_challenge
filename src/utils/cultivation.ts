import { GameMode } from '../types';
import { getStoredAuthToken } from './auth';

export interface XianxiaRealmConfig {
  id: string;
  name: string;
  icon: string;
  badge: string;
  startLevel: number;
  endLevel: number;
  levelsPerTier: number;
  maxThoNguyen: number;
  baseBreakthroughRate: number; // Tỷ lệ thành công cơ bản (0 - 100)
  frameId: string;
  frameName: string;
  titleId: string;
  titleName: string;
  colorClass: string;
  borderClass: string;
  glowClass: string;
  bgGradient: string;
  desc: string;
}

export const XIANXIA_REALMS: XianxiaRealmConfig[] = [
  {
    id: 'luyen_khi',
    name: 'Luyện Khí Kỳ',
    icon: '🌿',
    badge: 'Khí',
    startLevel: 1,
    endLevel: 30,
    levelsPerTier: 3,
    maxThoNguyen: 240, // 240 điểm = 480 giờ (~20 ngày nếu không bổ sung)
    baseBreakthroughRate: 95,
    frameId: 'frame_xianxia_luyenkhi',
    frameName: 'Khung Thanh Mộc Phàm Trần',
    titleId: 'title_xianxia_luyenkhi',
    titleName: 'Luyện Khí Tu Sĩ',
    colorClass: 'text-emerald-400',
    borderClass: 'border-emerald-500',
    glowClass: 'from-emerald-500/30 to-green-600/20',
    bgGradient: 'from-emerald-950/60 via-slate-900 to-slate-950',
    desc: 'Khởi đầu nhập đạo, thổ nạp linh khí thiên địa, khai mở kinh mạch.',
  },
  {
    id: 'truc_co',
    name: 'Trúc Cơ Kỳ',
    icon: '🧱',
    badge: 'Cơ',
    startLevel: 31,
    endLevel: 70,
    levelsPerTier: 4,
    maxThoNguyen: 480, // ~40 ngày
    baseBreakthroughRate: 85,
    frameId: 'frame_xianxia_trucco',
    frameName: 'Khung Huyền Nham Trúc Cơ',
    titleId: 'title_xianxia_trucco',
    titleName: 'Trúc Cơ Chân Nhân',
    colorClass: 'text-cyan-400',
    borderClass: 'border-cyan-500',
    glowClass: 'from-cyan-500/30 to-blue-600/20',
    bgGradient: 'from-cyan-950/60 via-slate-900 to-slate-950',
    desc: 'Linh lực hóa dịch, đúc thành đạo cơ vững chãi bất động như sơn.',
  },
  {
    id: 'ket_dan',
    name: 'Kết Đan Kỳ',
    icon: '🔮',
    badge: 'Đan',
    startLevel: 71,
    endLevel: 130,
    levelsPerTier: 6,
    maxThoNguyen: 960, // ~80 ngày
    baseBreakthroughRate: 75,
    frameId: 'frame_xianxia_ketdan',
    frameName: 'Khung Kim Đan Cửu Chuyển',
    titleId: 'title_xianxia_ketdan',
    titleName: 'Kim Đan Tông Sư',
    colorClass: 'text-amber-400',
    borderClass: 'border-amber-400',
    glowClass: 'from-amber-500/40 via-yellow-400/30 to-orange-500/20',
    bgGradient: 'from-amber-950/60 via-slate-900 to-slate-950',
    desc: 'Đan hỏa ngưng tụ, kim đan cửu chuyển chiếu rọi thần thông.',
  },
  {
    id: 'nguyen_anh',
    name: 'Nguyên Anh Kỳ',
    icon: '👶',
    badge: 'Anh',
    startLevel: 131,
    endLevel: 210,
    levelsPerTier: 8,
    maxThoNguyen: 1800, // ~150 ngày
    baseBreakthroughRate: 65,
    frameId: 'frame_xianxia_nguyenanh',
    frameName: 'Khung Tử Phủ Nguyên Anh',
    titleId: 'title_xianxia_nguyenanh',
    titleName: 'Nguyên Anh Lão Quái',
    colorClass: 'text-purple-400',
    borderClass: 'border-purple-500',
    glowClass: 'from-purple-500/40 to-fuchsia-600/30',
    bgGradient: 'from-purple-950/60 via-slate-900 to-slate-950',
    desc: 'Phá đan sinh anh, thần hồn xuất khiếu, ngao du thái hư thiên địa.',
  },
  {
    id: 'hoa_than',
    name: 'Hóa Thần Kỳ',
    icon: '🌌',
    badge: 'Thần',
    startLevel: 211,
    endLevel: 310,
    levelsPerTier: 10,
    maxThoNguyen: 3000, // ~250 ngày
    baseBreakthroughRate: 55,
    frameId: 'frame_xianxia_hoathan',
    frameName: 'Khung Hóa Thần Ý Cảnh',
    titleId: 'title_xianxia_hoathan',
    titleName: 'Hóa Thần Tôn Giả',
    colorClass: 'text-indigo-400',
    borderClass: 'border-indigo-500',
    glowClass: 'from-indigo-500/40 to-sky-600/30',
    bgGradient: 'from-indigo-950/60 via-slate-900 to-slate-950',
    desc: 'Ngộ thấu ý cảnh thiên địa, pháp tắc hóa hình, cử thủ vạn vật thuận tòng.',
  },
  {
    id: 'luyen_hu',
    name: 'Luyện Hư Kỳ',
    icon: '🌀',
    badge: 'Hư',
    startLevel: 311,
    endLevel: 430,
    levelsPerTier: 12,
    maxThoNguyen: 4800, // ~400 ngày
    baseBreakthroughRate: 45,
    frameId: 'frame_xianxia_luyenhu',
    frameName: 'Khung Hư Không Vô Cực',
    titleId: 'title_xianxia_luyenhu',
    titleName: 'Luyện Hư Thần Quân',
    colorClass: 'text-blue-400',
    borderClass: 'border-blue-500',
    glowClass: 'from-blue-500/40 to-teal-500/30',
    bgGradient: 'from-blue-950/60 via-slate-900 to-slate-950',
    desc: 'Hóa thực vi hư, vạn vật giai không, dung hợp không gian phong bạo.',
  },
  {
    id: 'hop_the',
    name: 'Hợp Thể Kỳ',
    icon: '⚡',
    badge: 'Thể',
    startLevel: 431,
    endLevel: 570,
    levelsPerTier: 14,
    maxThoNguyen: 7200, // ~600 ngày
    baseBreakthroughRate: 35,
    frameId: 'frame_xianxia_hopthe',
    frameName: 'Khung Lôi Đình Hợp Thể',
    titleId: 'title_xianxia_hopthe',
    titleName: 'Hợp Thể Thánh Quân',
    colorClass: 'text-yellow-400',
    borderClass: 'border-yellow-400',
    glowClass: 'from-yellow-400/50 to-orange-500/30',
    bgGradient: 'from-yellow-950/60 via-slate-900 to-slate-950',
    desc: 'Nhục thân và thần hồn hợp nhất, lôi đình tẩy lễ, lực áp chư thiên.',
  },
  {
    id: 'dai_thua',
    name: 'Đại Thừa Kỳ',
    icon: '☀️',
    badge: 'Thừa',
    startLevel: 571,
    endLevel: 720,
    levelsPerTier: 15,
    maxThoNguyen: 10800, // ~900 ngày
    baseBreakthroughRate: 25,
    frameId: 'frame_xianxia_daithua',
    frameName: 'Khung Thái Dương Chí Tôn',
    titleId: 'title_xianxia_daithua',
    titleName: 'Đại Thừa Chí Tôn',
    colorClass: 'text-orange-400',
    borderClass: 'border-orange-500',
    glowClass: 'from-orange-500/50 to-red-600/30',
    bgGradient: 'from-orange-950/60 via-slate-900 to-slate-950',
    desc: 'Chạm đỉnh phàm trần giới, vạn tông quy phục, chuẩn bị nghênh tiếp thiên kiếp.',
  },
  {
    id: 'do_kiep',
    name: 'Độ Kiếp Kỳ',
    icon: '🌩️',
    badge: 'Kiếp',
    startLevel: 721,
    endLevel: 870,
    levelsPerTier: 15,
    maxThoNguyen: 15000, // ~1250 ngày
    baseBreakthroughRate: 18,
    frameId: 'frame_xianxia_dokiep',
    frameName: 'Khung Cửu Trọng Lôi Kiếp',
    titleId: 'title_xianxia_dokiep',
    titleName: 'Độ Kiếp Tiên Tôn',
    colorClass: 'text-rose-400',
    borderClass: 'border-rose-500',
    glowClass: 'from-rose-500/60 via-purple-500/40 to-red-600/40',
    bgGradient: 'from-rose-950/60 via-slate-900 to-slate-950',
    desc: 'Cửu sắc thiên lôi rèn luyện tiên khu, vượt qua ranh giới sinh tử nhập tiên môn.',
  },
  {
    id: 'kim_tien',
    name: 'Kim Tiên',
    icon: '🌟',
    badge: 'Kim',
    startLevel: 871,
    endLevel: 940,
    levelsPerTier: 7,
    maxThoNguyen: 30000, // ~2500 ngày
    baseBreakthroughRate: 12,
    frameId: 'frame_xianxia_kimtien',
    frameName: 'Khung Kim Thân Bất Hủ',
    titleId: 'title_xianxia_kimtien',
    titleName: 'Bất Hủ Kim Tiên',
    colorClass: 'text-yellow-300',
    borderClass: 'border-yellow-300',
    glowClass: 'from-yellow-300/60 via-amber-400/40 to-white/40',
    bgGradient: 'from-amber-950/70 via-slate-900 to-slate-950',
    desc: 'Kim thân bất hoại, thoát tục phi thăng, thọ dữ thiên tề trường cửu bất diệt.',
  },
  {
    id: 'dai_la',
    name: 'Đại La Tiên',
    icon: '🌠',
    badge: 'La',
    startLevel: 941,
    endLevel: 980,
    levelsPerTier: 4,
    maxThoNguyen: 60000, // ~5000 ngày
    baseBreakthroughRate: 6,
    frameId: 'frame_xianxia_daila',
    frameName: 'Khung Đại La Thần Đạo',
    titleId: 'title_xianxia_daila',
    titleName: 'Đại La Kim Tiên',
    colorClass: 'text-fuchsia-300',
    borderClass: 'border-fuchsia-400',
    glowClass: 'from-fuchsia-500/60 via-pink-400/50 to-indigo-500/40',
    bgGradient: 'from-fuchsia-950/70 via-slate-900 to-slate-950',
    desc: 'Siêu thoát tam giới, bất nhập ngũ hành, dạo bước trên dòng sông thời gian.',
  },
  {
    id: 'thien_ton',
    name: 'Thiên Tôn',
    icon: '👑',
    badge: 'Tôn',
    startLevel: 981,
    endLevel: 1000,
    levelsPerTier: 2,
    maxThoNguyen: 999999, // Vô Lượng Thọ
    baseBreakthroughRate: 100, // Cảnh giới tối cao
    frameId: 'frame_xianxia_thienton',
    frameName: 'Khung Hỗn Độn Thần Hoàng',
    titleId: 'title_xianxia_thienton',
    titleName: 'Hỗn Độn Thiên Tôn',
    colorClass: 'text-amber-200',
    borderClass: 'border-amber-300 ring-2 ring-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.9)]',
    glowClass: 'from-amber-400/70 via-red-500/40 to-yellow-300/60',
    bgGradient: 'from-amber-950/90 via-red-950/40 to-slate-950',
    desc: 'Vạn Đạo Chi Tổ, nắm giữ sinh tử luân hồi càn khôn, chí cao vô thượng.',
  },
];

export interface CultivationDailyQuest {
  id: string;
  name: string;
  desc: string;
  rewardExp: number;
  rewardPill?: 'thoNguyen' | 'hoTam' | 'phaCanh';
  progress: number;
  target: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface CultivationState {
  level: number; // 1 to 1000
  realmIndex: number; // 0 to 11
  tier: number; // 1 to 10
  exp: number; // Current Tu Vi in tier
  maxExp: number; // Required Tu Vi for this tier
  thoNguyen: number; // Current lifespan (decreases by 1 every 2 hours)
  maxThoNguyen: number;
  lastThoNguyenDecay: number; // Timestamp of last 2-hour decay calculation
  lastCultivateTime: number; // Timestamp of last match / quest (for 48h decay check)
  dailyExpEarned: number; // Match EXP earned today (capped at 2500)
  dailyExpDate: string; // YYYY-MM-DD
  pillCount: {
    thoNguyen: number; // Thọ Nguyên Đan (+5 Thọ Nguyên)
    hoTam: number; // Hộ Tâm Đan (chống rớt tầng khi thất bại)
    phaCanh: number; // Phá Cảnh Đan (+15% tỷ lệ)
    tuViDan?: number; // Tu Vi Đan (+1.000 Tu Vi)
    sieuCapTuViDan?: number; // Siêu Cấp Tu Vi Đan (+7.000 Tu Vi)
  };
  dailyQuests: CultivationDailyQuest[];
  dailyQuestsDate: string; // YYYY-MM-DD
  checkIn?: {
    lastCheckInDate: string; // YYYY-MM-DD
    streak: number; // số ngày điểm danh liên tiếp
    totalCheckIns: number;
  };
  historyLog: string[];
}

export const DAILY_MATCH_EXP_CAP = 2500;
export const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getSubStage(tier: number): 'Sơ Kỳ' | 'Trung Kỳ' | 'Hậu Kỳ' | 'Đại Viên Mãn' {
  if (tier <= 3) return 'Sơ Kỳ';
  if (tier <= 6) return 'Trung Kỳ';
  if (tier <= 9) return 'Hậu Kỳ';
  return 'Đại Viên Mãn';
}

/**
 * Calculate EXP required to complete a tier at given overall level
 * Smooth progressive curve from ~150 to ~25,000 EXP
 */
export function getRequiredExpForTier(level: number, realmIndex: number): number {
  const base = 120;
  const growth = Math.pow(1.004, level) * (level * 18);
  const realmBonus = realmIndex * 150;
  return Math.round(base + growth + realmBonus);
}

/**
 * Determine Realm Index and Tier from overall Level (1 - 1000)
 */
export function getRealmAndTierFromLevel(level: number): { realmIndex: number; tier: number } {
  const clampedLevel = Math.max(1, Math.min(1000, level));
  for (let i = 0; i < XIANXIA_REALMS.length; i++) {
    const realm = XIANXIA_REALMS[i];
    if (clampedLevel >= realm.startLevel && clampedLevel <= realm.endLevel) {
      const offsetInRealm = clampedLevel - realm.startLevel;
      const tier = Math.min(10, Math.floor(offsetInRealm / realm.levelsPerTier) + 1);
      return { realmIndex: i, tier };
    }
  }
  return { realmIndex: 11, tier: 10 };
}

/**
 * Get Level corresponding to the start of a specific Realm and Tier
 */
export function getLevelForRealmAndTier(realmIndex: number, tier: number): number {
  const realm = XIANXIA_REALMS[Math.max(0, Math.min(11, realmIndex))];
  const clampedTier = Math.max(1, Math.min(10, tier));
  const lvl = realm.startLevel + (clampedTier - 1) * realm.levelsPerTier;
  return Math.min(realm.endLevel, lvl);
}

/**
 * Create default Daily Quests
 */
export function createDefaultDailyQuests(): CultivationDailyQuest[] {
  return [
    {
      id: 'quest_meditation',
      name: 'Tọa Thiền Nhập Định',
      desc: 'Hoàn thành 1 bài thi đấu bất kỳ để ngưng tụ khí huyết',
      rewardExp: 300,
      rewardPill: 'thoNguyen',
      progress: 0,
      target: 1,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: 'quest_accuracy',
      name: 'Bách Phát Bách Trúng',
      desc: 'Đạt độ chính xác ≥ 96% trong 1 trận đấu để rèn luyện tâm kiếm',
      rewardExp: 450,
      rewardPill: 'thoNguyen',
      progress: 0,
      target: 1,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: 'quest_speed',
      name: 'Lôi Đình Xuất Kích',
      desc: 'Đạt WPM ≥ 50 trong 1 trận đấu để bứt phá tốc độ',
      rewardExp: 350,
      rewardPill: 'hoTam',
      progress: 0,
      target: 1,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: 'quest_arena',
      name: 'Trảm Yêu Phục Ma',
      desc: 'Tham gia 1 trận Săn Boss, Đoán Chữ hoặc Ngẫu Hứng',
      rewardExp: 500,
      rewardPill: 'phaCanh',
      progress: 0,
      target: 1,
      isCompleted: false,
      isClaimed: false,
    },
  ];
}

/**
 * Create initial cultivation state for a new player / guest
 */
export function createInitialCultivationState(): CultivationState {
  const initialRealm = XIANXIA_REALMS[0];
  const today = getTodayDateString();
  const maxExp = getRequiredExpForTier(1, 0);

  return {
    level: 1,
    realmIndex: 0,
    tier: 1,
    exp: 0,
    maxExp,
    thoNguyen: initialRealm.maxThoNguyen,
    maxThoNguyen: initialRealm.maxThoNguyen,
    lastThoNguyenDecay: Date.now(),
    lastCultivateTime: Date.now(),
    dailyExpEarned: 0,
    dailyExpDate: today,
    pillCount: {
      thoNguyen: 2,
      hoTam: 1,
      phaCanh: 1,
    },
    dailyQuests: createDefaultDailyQuests(),
    dailyQuestsDate: today,
    historyLog: ['Bắt đầu bước vào con đường tu tiên: Luyện Khí Kỳ Tầng 1 (Sơ Kỳ)'],
  };
}

const CULTIVATION_STORAGE_KEY = 'fasttyping_cultivation_state_v1';

/**
 * Load cultivation state with validation and auto-sync
 */
export function loadStoredCultivationState(): CultivationState {
  if (typeof window === 'undefined') return createInitialCultivationState();

  try {
    const raw = localStorage.getItem(CULTIVATION_STORAGE_KEY);
    if (!raw) {
      const fresh = createInitialCultivationState();
      saveStoredCultivationState(fresh);
      return fresh;
    }

    const parsed: Partial<CultivationState> = JSON.parse(raw);
    const today = getTodayDateString();

    const realmIndex = Math.max(0, Math.min(11, parsed.realmIndex ?? 0));
    const currentRealm = XIANXIA_REALMS[realmIndex];
    const level = Math.max(1, Math.min(1000, parsed.level ?? 1));
    const tier = Math.max(1, Math.min(10, parsed.tier ?? 1));
    const maxExp = getRequiredExpForTier(level, realmIndex);

    const state: CultivationState = {
      level,
      realmIndex,
      tier,
      exp: Math.max(0, parsed.exp ?? 0),
      maxExp,
      thoNguyen: typeof parsed.thoNguyen === 'number' ? parsed.thoNguyen : currentRealm.maxThoNguyen,
      maxThoNguyen: currentRealm.maxThoNguyen,
      lastThoNguyenDecay: parsed.lastThoNguyenDecay || Date.now(),
      lastCultivateTime: parsed.lastCultivateTime || Date.now(),
      dailyExpEarned: parsed.dailyExpDate === today ? (parsed.dailyExpEarned || 0) : 0,
      dailyExpDate: today,
      pillCount: {
        thoNguyen: parsed.pillCount?.thoNguyen ?? 2,
        hoTam: parsed.pillCount?.hoTam ?? 1,
        phaCanh: parsed.pillCount?.phaCanh ?? 1,
        tuViDan: parsed.pillCount?.tuViDan ?? 0,
        sieuCapTuViDan: parsed.pillCount?.sieuCapTuViDan ?? 0,
      },
      dailyQuests:
        parsed.dailyQuestsDate === today && Array.isArray(parsed.dailyQuests) && parsed.dailyQuests.length === 4
          ? parsed.dailyQuests.map((q) => {
              const def = createDefaultDailyQuests().find((d) => d.id === q.id);
              return def ? { ...q, rewardExp: def.rewardExp } : q;
            })
          : createDefaultDailyQuests(),
      dailyQuestsDate: today,
      checkIn: parsed.checkIn
        ? {
            lastCheckInDate: parsed.checkIn.lastCheckInDate || '',
            streak: Number(parsed.checkIn.streak) || 0,
            totalCheckIns: Number(parsed.checkIn.totalCheckIns) || 0,
          }
        : {
            lastCheckInDate: '',
            streak: 0,
            totalCheckIns: 0,
          },
      historyLog: Array.isArray(parsed.historyLog) ? parsed.historyLog.slice(-20) : [],
    };

    return state;
  } catch {
    return createInitialCultivationState();
  }
}

export async function syncCultivationToServer(state?: CultivationState): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const targetState = state || loadStoredCultivationState();
  const token = getStoredAuthToken();
  if (!token) return false;

  try {
    const res = await fetch('/api/cultivation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ cultivation: targetState }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function saveStoredCultivationState(state: CultivationState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CULTIVATION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }

  // Tự động đồng bộ ngầm tiến độ tu vi mới nhất lên máy chủ nếu người chơi đã đăng nhập
  syncCultivationToServer(state).catch(() => {});
}

/**
 * Handle Thọ Nguyên 2-hour decay & 48h Tâm ma decay & Luân Hồi
 * "thọ nguyên tôi muốn cứ 2 giờ trôi qua sẽ giảm 1."
 * "khi hết thọ nguyên người chơi sẽ bị đưa về tầng 1 của 2 cảnh giới trước đó."
 * "thêm hệ thống giảm tu vi nếu không tu luyện 1 cách hợp lý."
 */
export function processCultivationDecay(state: CultivationState): {
  updatedState: CultivationState;
  didDecayThoNguyen: boolean;
  didDecayTuVi: boolean;
  didLuanHoi: boolean;
  message?: string;
} {
  const now = Date.now();
  let updated = { ...state };
  let didDecayThoNguyen = false;
  let didDecayTuVi = false;
  let didLuanHoi = false;
  let message: string | undefined;

  // 1. Thọ Nguyên decay: cứ 2 giờ trôi qua giảm 1 điểm Thọ Nguyên (Ngoại trừ Thiên Tôn bất tử)
  if (updated.realmIndex < 11) {
    const elapsedMs = now - (updated.lastThoNguyenDecay || now);
    const decayUnits = Math.floor(elapsedMs / TWO_HOURS_MS);

    if (decayUnits > 0) {
      didDecayThoNguyen = true;
      updated.thoNguyen = Math.max(0, updated.thoNguyen - decayUnits);
      updated.lastThoNguyenDecay = (updated.lastThoNguyenDecay || now) + decayUnits * TWO_HOURS_MS;

      // 2. Check Luân Hồi khi hết Thọ Nguyên:
      // "khi hết thọ nguyên người chơi sẽ bị đưa về tầng 1 của 2 cảnh giới trước đó"
      if (updated.thoNguyen <= 0) {
        didLuanHoi = true;
        const oldRealmName = XIANXIA_REALMS[updated.realmIndex].name;
        const targetRealmIndex = Math.max(0, updated.realmIndex - 2);
        const targetRealm = XIANXIA_REALMS[targetRealmIndex];
        const targetLevel = targetRealm.startLevel;

        updated.realmIndex = targetRealmIndex;
        updated.tier = 1;
        updated.level = targetLevel;
        updated.exp = 0;
        updated.maxExp = getRequiredExpForTier(targetLevel, targetRealmIndex);
        updated.thoNguyen = targetRealm.maxThoNguyen; // Reset thọ nguyên cảnh giới mới
        updated.maxThoNguyen = targetRealm.maxThoNguyen;

        const logMsg = `⚠️ [TỌA HÓA LUÂN HỒI] Thọ nguyên cạn kiệt ở ${oldRealmName}! Đạo hạnh tiêu tán, rơi vào luân hồi về ${targetRealm.name} Tầng 1 (Sơ Kỳ)!`;
        updated.historyLog = [logMsg, ...updated.historyLog.slice(0, 19)];
        message = logMsg;
      }
    }
  }

  // 3. Giảm Tu Vi nếu không tu luyện hợp lý (Sau 48h không tu luyện, mỗi 24h giảm 3% Tu Vi của tầng)
  const inactiveMs = now - (updated.lastCultivateTime || now);
  const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  if (inactiveMs > FORTY_EIGHT_HOURS && updated.exp > 0) {
    const overdueDays = Math.floor((inactiveMs - FORTY_EIGHT_HOURS) / ONE_DAY_MS) + 1;
    const decayPercent = Math.min(30, overdueDays * 3); // 3% mỗi ngày quá hạn
    const expLost = Math.round((updated.maxExp * decayPercent) / 100);

    if (expLost > 0) {
      didDecayTuVi = true;
      const prevExp = updated.exp;
      updated.exp = Math.max(0, updated.exp - expLost);
      const actualLost = prevExp - updated.exp;
      if (actualLost > 0) {
        const logMsg = `💀 [TÂM MA XÂM LẤN] Bỏ bê tu luyện quá 48 giờ! Đạo tâm hao hụt, tổn thất ${actualLost.toLocaleString()} Tu Vi!`;
        updated.historyLog = [logMsg, ...updated.historyLog.slice(0, 19)];
        if (!message) message = logMsg;
      }
    }
  }

  return {
    updatedState: updated,
    didDecayThoNguyen,
    didDecayTuVi,
    didLuanHoi,
    message,
  };
}

/**
 * Add Tu Vi from finished match within daily cap & update daily quests
 */
export function addTuViFromMatch(
  state: CultivationState,
  match: {
    wpm: number;
    accuracy: number;
    mode: GameMode;
    score?: number;
  }
): {
  updatedState: CultivationState;
  expGained: number;
  hitDailyCap: boolean;
  leveledUp: boolean;
  readyForBreakthrough: boolean;
  newRealmOrTierNotice?: string;
} {
  const today = getTodayDateString();
  let updated = { ...state };

  // Reset daily cap if new day
  if (updated.dailyExpDate !== today) {
    updated.dailyExpDate = today;
    updated.dailyExpEarned = 0;
  }

  // Refresh cultivate timestamp (Xua tan tâm ma)
  updated.lastCultivateTime = Date.now();

  // 1. Calculate Match Tu Vi
  const baseMatchExp = Math.round(
    match.wpm * 1.6 +
      (match.score && match.score > 0 ? match.score * 0.12 : 0) +
      match.accuracy * 0.6 +
      25
  );

  const remainingDailyAllowance = Math.max(0, DAILY_MATCH_EXP_CAP - updated.dailyExpEarned);
  const actualExpGained = Math.min(baseMatchExp, remainingDailyAllowance);
  const hitDailyCap = actualExpGained < baseMatchExp;

  updated.dailyExpEarned += actualExpGained;

  // 2. Update Daily Quests Progress
  if (updated.dailyQuestsDate !== today) {
    updated.dailyQuestsDate = today;
    updated.dailyQuests = createDefaultDailyQuests();
  }

  updated.dailyQuests = updated.dailyQuests.map((q) => {
    let nextProgress = q.progress;
    if (q.id === 'quest_meditation') {
      nextProgress = Math.min(q.target, q.progress + 1);
    } else if (q.id === 'quest_accuracy' && match.accuracy >= 96) {
      nextProgress = 1;
    } else if (q.id === 'quest_speed' && match.wpm >= 50) {
      nextProgress = 1;
    } else if (
      q.id === 'quest_arena' &&
      (match.mode === 'san_boss' || match.mode === 'doan_chu' || match.mode === 'ngau_hung')
    ) {
      nextProgress = 1;
    }
    return {
      ...q,
      progress: nextProgress,
      isCompleted: nextProgress >= q.target,
    };
  });

  // 3. Apply EXP to current tier / level
  let leveledUp = false;
  let readyForBreakthrough = false;
  let newRealmOrTierNotice: string | undefined;

  // If in Tier 10 (Đại Viên Mãn), Tu Vi maxes out at 100% until Breakthrough
  if (updated.tier === 10) {
    const nextExp = updated.exp + actualExpGained;
    if (nextExp >= updated.maxExp) {
      updated.exp = updated.maxExp;
      readyForBreakthrough = true;
      newRealmOrTierNotice = `✨ Cảnh giới đã đạt Tầng 10 Đại Viên Mãn! Hãy chuẩn bị linh dược để tiến hành Độ Kiếp Đột Phá!`;
    } else {
      updated.exp = nextExp;
    }
  } else {
    // Normal Tier 1 -> 9 progress
    let newExp = updated.exp + actualExpGained;
    while (newExp >= updated.maxExp && updated.tier < 10) {
      newExp -= updated.maxExp;
      updated.tier += 1;
      leveledUp = true;
      updated.level = Math.min(1000, getLevelForRealmAndTier(updated.realmIndex, updated.tier));
      updated.maxExp = getRequiredExpForTier(updated.level, updated.realmIndex);

      const subStage = getSubStage(updated.tier);
      const realm = XIANXIA_REALMS[updated.realmIndex];
      newRealmOrTierNotice = `🎉 Chúc mừng tu sĩ thăng cấp lên ${realm.name} Tầng ${updated.tier} (${subStage})!`;
      updated.historyLog = [newRealmOrTierNotice, ...updated.historyLog.slice(0, 19)];

      if (updated.tier === 10) {
        readyForBreakthrough = true;
        break;
      }
    }
    updated.exp = Math.min(updated.maxExp, newExp);
  }

  return {
    updatedState: updated,
    expGained: actualExpGained,
    hitDailyCap,
    leveledUp,
    readyForBreakthrough,
    newRealmOrTierNotice,
  };
}

/**
 * Breakthrough Realm Attempt
 * "khi đột phá cảnh giới sẽ có tỷ lệ thất bại tăng dần khi cảnh giới lên cao khi đột phá thất bại sẽ về lại tầng 7."
 */
export function attemptRealmBreakthrough(
  state: CultivationState,
  usePhaCanh: boolean,
  useHoTam: boolean
): {
  success: boolean;
  updatedState: CultivationState;
  finalRate: number;
  message: string;
  unlockedFrameId?: string;
  unlockedTitleId?: string;
} {
  const currentRealm = XIANXIA_REALMS[state.realmIndex];
  if (state.realmIndex >= 11) {
    return {
      success: true,
      updatedState: state,
      finalRate: 100,
      message: 'Tu sĩ đã đạt Thiên Tôn cảnh giới tối cao vô thượng, đứng đầu vạn đạo!',
    };
  }

  if (state.tier < 10 || state.exp < state.maxExp) {
    return {
      success: false,
      updatedState: state,
      finalRate: currentRealm.baseBreakthroughRate,
      message: 'Chưa đạt Tầng 10 Đại Viên Mãn hoặc chưa tích lũy đủ 100% Tu Vi để độ kiếp!',
    };
  }

  let updated = { ...state };

  // Deduct pills if used
  let rateBonus = 0;
  if (usePhaCanh && updated.pillCount.phaCanh > 0) {
    updated.pillCount = { ...updated.pillCount, phaCanh: updated.pillCount.phaCanh - 1 };
    rateBonus += 15;
  }

  let isProtected = false;
  if (useHoTam && updated.pillCount.hoTam > 0) {
    updated.pillCount = { ...updated.pillCount, hoTam: updated.pillCount.hoTam - 1 };
    isProtected = true;
  }

  const finalRate = Math.min(100, currentRealm.baseBreakthroughRate + rateBonus);
  const roll = Math.random() * 100;
  const isSuccess = roll < finalRate;

  if (isSuccess) {
    // Breakthrough SUCCESS!
    const nextRealmIndex = state.realmIndex + 1;
    const nextRealm = XIANXIA_REALMS[nextRealmIndex];
    const newLevel = nextRealm.startLevel;

    updated.realmIndex = nextRealmIndex;
    updated.tier = 1;
    updated.level = newLevel;
    updated.exp = 0;
    updated.maxExp = getRequiredExpForTier(newLevel, nextRealmIndex);
    // Reset Thọ Nguyên to 100% for the new higher realm!
    updated.thoNguyen = nextRealm.maxThoNguyen;
    updated.maxThoNguyen = nextRealm.maxThoNguyen;

    const victoryMsg = `🌟 [ĐỘ KIẾP THÀNH CÔNG] Phá vỡ bình chướng, đăng tiên nhập cảnh! Đạt đến ${nextRealm.name} Tầng 1 (Sơ Kỳ)! Khai mở Khung & Danh Hiệu [${nextRealm.titleName}]!`;
    updated.historyLog = [victoryMsg, ...updated.historyLog.slice(0, 19)];

    return {
      success: true,
      updatedState: updated,
      finalRate,
      message: victoryMsg,
      unlockedFrameId: nextRealm.frameId,
      unlockedTitleId: nextRealm.titleId,
    };
  } else {
    // Breakthrough FAILED!
    // "khi đột phá thất bại sẽ về lại tầng 7"
    let failMsg = '';
    if (isProtected) {
      // Protected by Hộ Tâm Đan: retain Tier 10, only lose 25% exp
      updated.exp = Math.round(updated.maxExp * 0.75);
      failMsg = `🛡️ [ĐỘ KIẾP THẤT BẠI] Kiếp lôi cuồng bạo! Nhờ có Hộ Tâm Đan vỡ vụn bảo hộ kinh mạch, giữ nguyên Tầng 10 (chỉ mất 25% Tu Vi tích lũy)!`;
    } else {
      // Drop to Tier 7 (Hậu Kỳ)
      const demotedTier = 7;
      const demotedLevel = getLevelForRealmAndTier(updated.realmIndex, demotedTier);
      updated.tier = demotedTier;
      updated.level = demotedLevel;
      updated.exp = 0;
      updated.maxExp = getRequiredExpForTier(demotedLevel, updated.realmIndex);

      // Suffer minor thọ nguyên damage due to failed tribulation (e.g. 6 điểm thọ nguyên = 12h)
      if (updated.realmIndex < 11) {
        updated.thoNguyen = Math.max(1, updated.thoNguyen - 6);
      }

      failMsg = `⚡ [ĐỘ KIẾP THẤT BẠI] Tâm ma quấy nhiễu, lôi kiếp phản phệ! Căn cơ tổn hại bị đánh bật về ${currentRealm.name} Tầng 7 (Hậu Kỳ)!`;
    }

    updated.historyLog = [failMsg, ...updated.historyLog.slice(0, 19)];

    return {
      success: false,
      updatedState: updated,
      finalRate,
      message: failMsg,
    };
  }
}

/**
 * Claim daily quest reward
 */
export function claimDailyQuestReward(
  state: CultivationState,
  questId: string
): { updatedState: CultivationState; expGained: number; message: string } {
  let updated = { ...state };
  let expGained = 0;
  let message = '';

  const targetQuest = updated.dailyQuests.find((q) => q.id === questId);
  if (!targetQuest || !targetQuest.isCompleted || targetQuest.isClaimed) {
    return { updatedState: state, expGained: 0, message: 'Nhiệm vụ chưa hoàn thành hoặc đã nhận thưởng!' };
  }

  expGained = targetQuest.rewardExp;
  updated.exp = Math.min(updated.maxExp, updated.exp + expGained);

  if (targetQuest.rewardPill) {
    const pill = targetQuest.rewardPill;
    updated.pillCount = {
      ...updated.pillCount,
      [pill]: updated.pillCount[pill] + 1,
    };
  }

  updated.dailyQuests = updated.dailyQuests.map((q) =>
    q.id === questId ? { ...q, isClaimed: true } : q
  );

  // Check if all 4 are completed & claimed -> Grand Chest
  const allClaimed = updated.dailyQuests.every((q) => q.isClaimed);
  if (allClaimed) {
    updated.exp = Math.min(updated.maxExp, updated.exp + 1000);
    updated.thoNguyen = Math.min(updated.maxThoNguyen, updated.thoNguyen + 5);
    message = `🎁 Hoàn thành Đại Chu Thiên! Nhận thêm 1.000 Tu Vi và +5 Thọ Nguyên!`;
    updated.historyLog = [message, ...updated.historyLog.slice(0, 19)];
  } else {
    message = `✨ Nhận thưởng thành công: +${expGained} Tu Vi!`;
  }

  return { updatedState: updated, expGained, message };
}

/**
 * Helper: Apply Tu Vi Exp to Cultivation State with level up & Tier 10 ceiling
 */
export function applyTuViExpToState(
  state: CultivationState,
  amount: number,
  sourceLabel: string
): { updatedState: CultivationState; leveledUp: boolean; message: string } {
  let updated = { ...state };
  let leveledUp = false;
  let logMessages: string[] = [];

  if (updated.tier === 10) {
    const nextExp = updated.exp + amount;
    if (nextExp >= updated.maxExp) {
      updated.exp = updated.maxExp;
      logMessages.push(`✨ Cảnh giới đã đạt Tầng 10 Đại Viên Mãn (100% Tu Vi)! Hãy sẵn sàng đột phá!`);
    } else {
      updated.exp = nextExp;
    }
  } else {
    let newExp = updated.exp + amount;
    while (newExp >= updated.maxExp && updated.tier < 10) {
      newExp -= updated.maxExp;
      updated.tier += 1;
      leveledUp = true;
      updated.level = Math.min(1000, getLevelForRealmAndTier(updated.realmIndex, updated.tier));
      updated.maxExp = getRequiredExpForTier(updated.level, updated.realmIndex);

      const subStage = getSubStage(updated.tier);
      const realm = XIANXIA_REALMS[updated.realmIndex];
      const lvlMsg = `🎉 Chúc mừng tu sĩ thăng cấp lên ${realm.name} Tầng ${updated.tier} (${subStage})!`;
      logMessages.push(lvlMsg);

      if (updated.tier === 10) {
        logMessages.push(`✨ Đạt đỉnh Tầng 10 Đại Viên Mãn!`);
        break;
      }
    }
    updated.exp = Math.min(updated.maxExp, newExp);
  }

  const primaryMsg = `${sourceLabel}: +${amount.toLocaleString()} Tu Vi!`;
  updated.historyLog = [...logMessages.reverse(), primaryMsg, ...updated.historyLog].slice(0, 20);

  return { updatedState: updated, leveledUp, message: primaryMsg };
}

/**
 * Use Tu Vi Đan (+1.000 Tu Vi)
 */
export function useTuViPill(state: CultivationState): {
  success: boolean;
  updatedState: CultivationState;
  message: string;
} {
  const currentCount = state.pillCount.tuViDan || 0;
  if (currentCount <= 0) {
    return { success: false, updatedState: state, message: 'Không còn Tu Vi Đan trong túi!' };
  }

  let updated = { ...state };
  updated.pillCount = {
    ...updated.pillCount,
    tuViDan: currentCount - 1,
  };

  const result = applyTuViExpToState(updated, 1000, '🧪 Uống Tu Vi Đan');
  return { success: true, updatedState: result.updatedState, message: result.message };
}

/**
 * Use Siêu Cấp Tu Vi Đan (+7.000 Tu Vi)
 */
export function useSieuCapTuViPill(state: CultivationState): {
  success: boolean;
  updatedState: CultivationState;
  message: string;
} {
  const currentCount = state.pillCount.sieuCapTuViDan || 0;
  if (currentCount <= 0) {
    return { success: false, updatedState: state, message: 'Không còn Siêu Cấp Tu Vi Đan trong túi!' };
  }

  let updated = { ...state };
  updated.pillCount = {
    ...updated.pillCount,
    sieuCapTuViDan: currentCount - 1,
  };

  const result = applyTuViExpToState(updated, 7000, '🌟 Dược lực bộc phát: Uống Siêu Cấp Tu Vi Đan');
  return { success: true, updatedState: result.updatedState, message: result.message };
}

/**
 * Check-in calculation:
 * - Thứ 2 đến Thứ 7: Nhận 1 Tu Vi Đan (+1.000 Tu Vi)
 * - Chủ Nhật: Nhận 1 Hộ Tâm Đan
 * - Cứ 7 lần điểm danh liên tiếp không ngắt quãng: Nhận 1 Siêu Cấp Tu Vi Đan (+7.000 Tu Vi) + 1 Phá Cảnh Đan
 */
export function claimDailyCheckIn(state: CultivationState): {
  success: boolean;
  updatedState: CultivationState;
  message: string;
  rewardDetails: {
    dayOfWeekName: string;
    isSunday: boolean;
    streak: number;
    gotSuperBonus: boolean;
  };
} {
  const today = getTodayDateString();
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 1..6 is Mon..Sat

  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayOfWeekName = dayNames[dayOfWeek];
  const isSunday = dayOfWeek === 0;

  const currentCheckIn = state.checkIn || {
    lastCheckInDate: '',
    streak: 0,
    totalCheckIns: 0,
  };

  if (currentCheckIn.lastCheckInDate === today) {
    return {
      success: false,
      updatedState: state,
      message: 'Hôm nay đạo hữu đã điểm danh rồi, ngày mai hãy quay lại!',
      rewardDetails: {
        dayOfWeekName,
        isSunday,
        streak: currentCheckIn.streak,
        gotSuperBonus: false,
      },
    };
  }

  // Calculate streak: check if last check-in was yesterday
  let nextStreak = 1;
  if (currentCheckIn.lastCheckInDate) {
    const lastDate = new Date(currentCheckIn.lastCheckInDate + 'T00:00:00');
    const todayDate = new Date(today + 'T00:00:00');
    const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 1) {
      nextStreak = currentCheckIn.streak + 1;
    } else {
      nextStreak = 1; // Ngắt quãng -> đếm lại từ đầu
    }
  }

  let updated = { ...state };
  updated.pillCount = {
    ...updated.pillCount,
    thoNguyen: updated.pillCount.thoNguyen ?? 2,
    hoTam: updated.pillCount.hoTam ?? 1,
    phaCanh: updated.pillCount.phaCanh ?? 1,
    tuViDan: updated.pillCount.tuViDan ?? 0,
    sieuCapTuViDan: updated.pillCount.sieuCapTuViDan ?? 0,
  };

  let rewardsGranted: string[] = [];

  if (isSunday) {
    // Chủ nhật: Nhận 1 Hộ Tâm Đan
    updated.pillCount.hoTam += 1;
    rewardsGranted.push('1 Hộ Tâm Đan (Chủ Nhật)');
  } else {
    // Thứ 2 đến Thứ 7: Nhận 1 Tu Vi Đan (+1000 Tu Vi)
    updated.pillCount.tuViDan += 1;
    rewardsGranted.push('1 Tu Vi Đan (+1.000 Tu Vi)');
  }

  // Bonus: Cứ 7 lần điểm danh liên tiếp không ngắt quãng (7, 14, 21, ...)
  const gotSuperBonus = nextStreak > 0 && nextStreak % 7 === 0;
  if (gotSuperBonus) {
    updated.pillCount.sieuCapTuViDan += 1;
    updated.pillCount.phaCanh += 1;
    rewardsGranted.push('🌟 THƯỞNG 7 NGÀY LIÊN TIẾP: 1 Siêu Cấp Tu Vi Đan (+7.000 Tu Vi) & 1 Phá Cảnh Đan');
  }

  updated.checkIn = {
    lastCheckInDate: today,
    streak: nextStreak,
    totalCheckIns: (currentCheckIn.totalCheckIns || 0) + 1,
  };

  const message = `📅 Điểm danh ${dayOfWeekName} thành công (Chuỗi ${nextStreak} ngày)! Nhận: ${rewardsGranted.join(', ')}.`;
  updated.historyLog = [message, ...updated.historyLog.slice(0, 19)];

  return {
    success: true,
    updatedState: updated,
    message,
    rewardDetails: {
      dayOfWeekName,
      isSunday,
      streak: nextStreak,
      gotSuperBonus,
    },
  };
}

/**
 * Use Thọ Nguyên Đan (+5 Thọ Nguyên)
 */
export function useThoNguyenPill(state: CultivationState): {
  success: boolean;
  updatedState: CultivationState;
  message: string;
} {
  if (state.pillCount.thoNguyen <= 0) {
    return { success: false, updatedState: state, message: 'Không còn Thọ Nguyên Đan trong túi!' };
  }

  let updated = { ...state };
  updated.pillCount = {
    ...updated.pillCount,
    thoNguyen: updated.pillCount.thoNguyen - 1,
  };
  const restored = Math.min(updated.maxThoNguyen - updated.thoNguyen, 5);
  updated.thoNguyen = Math.min(updated.maxThoNguyen, updated.thoNguyen + 5);

  const msg = `🧪 Uống Thọ Nguyên Đan: Khí huyết dồi dào, thọ mệnh tăng thêm +${restored > 0 ? restored : 5} điểm!`;
  updated.historyLog = [msg, ...updated.historyLog.slice(0, 19)];

  return { success: true, updatedState: updated, message: msg };
}

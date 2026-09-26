import { 
  GameMode, 
  TamPhapType, 
  ArtifactType, 
  HerbType, 
  CultivationHerbs, 
  CultivationArtifacts, 
  CultivationTamPhap, 
  ActivePillBuffs,
  SectWorldBoss,
  SectInfo, 
  SectRole,
  CultivationSectMember,
  SectMemberRecord,
  SectLeaderboardEntry,
} from '../types';

export type { 
  TamPhapType, 
  ArtifactType, 
  HerbType, 
  CultivationHerbs, 
  CultivationArtifacts, 
  CultivationTamPhap, 
  ActivePillBuffs,
  SectWorldBoss,
  SectInfo, 
  SectRole,
  CultivationSectMember,
  SectMemberRecord,
  SectLeaderboardEntry,
};
import { getStoredAuthToken } from './auth';
import { getCultivationSync, saveCultivationToIndexedDB } from './leaderboardStorage';

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
  realmName?: string;
  subStage?: 'Sơ Kỳ' | 'Trung Kỳ' | 'Hậu Kỳ' | 'Đại Viên Mãn';
  titleName?: string;
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
    dinhTam?: number; // Định Tâm Đan (giảm 50% phạt WPM khi gõ sai trong 3 ván)
    ngungThan?: number; // Ngưng Thần Đan (+20% rơi dược liệu quý trong 3 ván)
  };
  dailyQuests: CultivationDailyQuest[];
  dailyQuestsDate: string; // YYYY-MM-DD
  checkIn?: {
    lastCheckInDate: string; // YYYY-MM-DD
    streak: number; // số ngày điểm danh liên tiếp
    totalCheckIns: number;
  };
  tamPhap?: CultivationTamPhap;
  herbs?: CultivationHerbs;
  artifacts?: CultivationArtifacts;
  activeBuffs?: ActivePillBuffs;
  sect?: CultivationSectMember;
  linhThach?: number;
  historyLog: string[];
}

// === CẤU HÌNH TÂM PHÁP CHỦ ĐẠO ===
export const TAM_PHAP_CONFIGS: Record<TamPhapType, {
  name: string;
  icon: string;
  shortDesc: string;
  style: string;
  fullDesc: string;
  tierEffects: string[];
  ultimateTitle: string;
  ultimateDesc: string;
}> = {
  than_hanh: {
    name: 'Thần Hành Thiên Lý Quyết',
    icon: '🗡️',
    shortDesc: 'Dành cho người gõ tốc độ cao',
    style: 'Cuồng Tốc (WPM Cao)',
    fullDesc: 'Duy trì WPM ≥ 90: Tăng 30% Linh Thạch, mỗi 50 WPM cộng dồn 1 tầng "Kiếm Khí Xung Thiên".',
    tierEffects: [
      'Tầng 1: WPM ≥ 90 nhận thêm +5% Linh Thạch',
      'Tầng 2: WPM ≥ 90 nhận thêm +10% Linh Thạch',
      'Tầng 3: WPM ≥ 90 nhận thêm +15% Linh Thạch, khởi động 1 tầng Kiếm Khí',
      'Tầng 4: WPM ≥ 90 nhận thêm +20% Linh Thạch',
      'Tầng 5: WPM ≥ 90 nhận thêm +25% Linh Thạch, +10% Tu Vi',
      'Tầng 6: WPM ≥ 90 nhận thêm +28% Linh Thạch, +15% Tu Vi',
      'Tầng 7: WPM ≥ 90 nhận thêm +30% Linh Thạch, +20% Tu Vi',
      'Tầng 8: WPM ≥ 90 nhận thêm +30% Linh Thạch, +25% Tu Vi',
      'Tầng 9: Đỉnh Cấp - Kích hoạt bí pháp Thuấn Tức Vạn Dặm (x2 Tu Vi)',
    ],
    ultimateTitle: 'Thuấn Tức Vạn Dặm (Tầng 9)',
    ultimateDesc: 'Hoàn thành ván đấu với WPM > 110 sẽ nhận GẤP ĐÔI Tu Vi (x2 Tu Vi).',
  },
  bat_dong: {
    name: 'Bất Động Càn Khôn Thuật',
    icon: '🛡️',
    shortDesc: 'Dành cho người gõ chuẩn xác',
    style: 'Chuẩn Tuyệt Đối (High Accuracy)',
    fullDesc: 'Accuracy 98% – 100%: Bảo lưu 100% thọ nguyên, 20% tỷ lệ rơi Thọ Nguyên Đan quý giá.',
    tierEffects: [
      'Tầng 1: Accuracy ≥ 98% bảo lưu thọ nguyên',
      'Tầng 2: Accuracy ≥ 98% tăng 5% tỷ lệ rơi Thọ Nguyên Đan',
      'Tầng 3: Accuracy ≥ 98% tăng 8% tỷ lệ rơi Thọ Nguyên Đan',
      'Tầng 4: Accuracy ≥ 98% tăng 12% tỷ lệ rơi Thọ Nguyên Đan',
      'Tầng 5: Accuracy ≥ 98% tăng 15% tỷ lệ rơi Thọ Nguyên Đan',
      'Tầng 6: Accuracy ≥ 98% tăng 18% tỷ lệ rơi Thọ Nguyên Đan',
      'Tầng 7: Accuracy ≥ 98% tăng 20% tỷ lệ rơi Thọ Nguyên Đan',
      'Tầng 8: Accuracy ≥ 98% tăng 20% tỷ lệ rơi Thọ Nguyên Đan + bảo vệ tầng',
      'Tầng 9: Đỉnh Cấp - Kích hoạt bí pháp Kim Cang Bất Hoại (Miễn trừ suy giảm 6h)',
    ],
    ultimateTitle: 'Kim Cang Bất Hoại (Tầng 9)',
    ultimateDesc: 'Ván đấu đạt 100% Accuracy kích hoạt miễn trừ hoàn toàn thời gian suy giảm thọ nguyên trong 6 giờ.',
  },
  cuu_chuyen: {
    name: 'Cửu Chuyển Hồi Xuân',
    icon: '⚡',
    shortDesc: 'Đả thông kinh mạch sinh mệnh',
    style: 'Bền Bỉ & Nhất Quán (Consistency)',
    fullDesc: 'Cứ mỗi 5 ván thi đấu hoàn thành liên tục: Tự động hồi phục 1 điểm Thọ Nguyên.',
    tierEffects: [
      'Tầng 1: Hoàn thành 5 ván hồi 1 Thọ Nguyên',
      'Tầng 2: Tăng độ ổn định kinh mạch',
      'Tầng 3: Tăng 5% Tu Vi khi duy trì phong độ',
      'Tầng 4: Tăng 10% Tu Vi khi duy trì phong độ',
      'Tầng 5: Đả thông huyệt đạo, giảm tiêu hao khí huyết',
      'Tầng 6: Tăng 15% Tu Vi nhất quán',
      'Tầng 7: Tăng 20% Tu Vi nhất quán',
      'Tầng 8: Tích lũy linh dược dưỡng thể',
      'Tầng 9: Đỉnh Cấp - Kích hoạt bí pháp Sinh Sinh Bất Tức (Tự động sửa lỗi đầu)',
    ],
    ultimateTitle: 'Sinh Sinh Bất Tức (Tầng 9)',
    ultimateDesc: 'Đả thông toàn bộ kinh mạch, tự động sửa lỗi gõ đầu tiên trong mỗi hiệp đấu.',
  },
};

// === CẤU HÌNH BẢN MỆNH PHÁP BẢO ===
export const ARTIFACT_CONFIGS: Record<ArtifactType, {
  name: string;
  icon: string;
  title: string;
  desc: string;
  visualEffect: string;
  spiritName: string;
  spiritTitle: string;
  spiritIcon: string;
  spiritAvatar: string;
  spiritGreeting: string;
  unlockedRealmIndex: number;
  unlockedRealmName: string;
}> = {
  thanh_van_kiem: {
    name: 'Thanh Vân Kiếm',
    icon: '⚔️',
    title: 'Kiếm Khí Tung Hoành',
    desc: 'Khi gõ phím, mỗi chữ hoàn thành phóng ra kiếm khí lam ngọc chém rạch màn hình cùng tiếng kiếm ngân sắc lạnh.',
    visualEffect: 'Vệt kiếm khí lam ngọc xé gió rạch ngang màn hình kèm âm thanh kim loại ngân vang thanh thúy.',
    spiritName: 'Kiếm Linh Thanh Vân',
    spiritTitle: 'Vạn Kiếm Quy Tông',
    spiritIcon: '🗡️',
    spiritAvatar: '🗡️',
    spiritGreeting: 'Chủ nhân! Kiếm khí đã thông suốt, mỗi nhịp phím gõ chuẩn xác chính là một đường kiếm khai thiên lập địa!',
    unlockedRealmIndex: 0,
    unlockedRealmName: 'Luyện Khí Kỳ',
  },
  hao_thien_kinh: {
    name: 'Hạo Thiên Kính',
    icon: '🪞',
    title: 'Thấu Thị Thiên Cơ',
    desc: 'Chiếu luồng sáng rực rỡ soi trước 2–3 từ tiếp theo, đổi màu các nguyên âm có dấu tiếng Việt giúp mắt người chơi phản xạ cực nhanh.',
    visualEffect: 'Chiếu rọi ánh kim quang soi tỏ 2-3 từ tiếp theo, phát sáng đặc biệt các nguyên âm tiếng Việt có dấu.',
    spiritName: 'Kính Linh Hạo Thiên',
    spiritTitle: 'Thiên Cơ Thần Nhãn',
    spiritIcon: '👁️',
    spiritAvatar: '👁️',
    spiritGreeting: 'Kính quang đã soi tỏ! Mọi từ khó và biến âm tiếng Việt phía trước đều hiện rõ như lòng bàn tay, chủ nhân mau xuất chiêu!',
    unlockedRealmIndex: 1,
    unlockedRealmName: 'Trúc Cơ Kỳ',
  },
  cuu_pham_lien: {
    name: 'Cửu Phẩm Hắc Liên',
    icon: '🪷',
    title: 'Hắc Liên Hộ Mạch',
    desc: 'Những cánh sen đen ma mị bay lượn quanh ô nhập liệu, hấp thụ hoàn toàn các ký tự gõ sai, bảo hộ tâm mạch.',
    visualEffect: 'Những cánh sen đen ma mị xoay tròn bảo vệ ô nhập liệu, kích hoạt khiên chắn hấp thụ từ gõ sai.',
    spiritName: 'Liên Hoa Tiên Tử',
    spiritTitle: 'Tịnh Thế Hộ Thần',
    spiritIcon: '🪷',
    spiritAvatar: '🪷',
    spiritGreeting: 'Hắc liên nở rộ, hộ vệ đan điền! Dù lỡ nhịp gõ sai thì cánh sen đen cũng sẽ chắn đỡ tâm ma, chủ nhân an tâm định thần!',
    unlockedRealmIndex: 2,
    unlockedRealmName: 'Kết Đan Kỳ',
  },
  ban_co_phu: {
    name: 'Bàn Cổ Khai Thiên Phủ',
    icon: '🪓',
    title: 'Chí Tôn Hồng Hoang',
    desc: 'Kích hoạt hiệu ứng rạn nứt mặt đất và sấm sét màu vàng kim mỗi khi hoàn thành dòng phím bứt phá, tăng 25% Tu Vi.',
    visualEffect: 'Hiệu ứng rạn nứt không gian và sấm sét hoàng kim chấn động mỗi khi hoàn thành dòng phím bạo kích.',
    spiritName: 'Phủ Linh Khai Thiên',
    spiritTitle: 'Hồng Hoang Cự Linh',
    spiritIcon: '⚡',
    spiritAvatar: '⚡',
    spiritGreeting: 'Rầm! Một rìu khai thiên, vạn dặm sơn hà quy phục! Bàn phím rung chuyển trước uy lực thái cổ của ngài!',
    unlockedRealmIndex: 4,
    unlockedRealmName: 'Hóa Thần Kỳ',
  },
};

// === CẤU HÌNH KỲ HOA DỊ THẢO ===
export const HERBS_CONFIGS: Record<HerbType, {
  name: string;
  icon: string;
  rarity: 'Phổ Thông' | 'Hiếm' | 'Trân Quý' | 'Cực Phẩm';
  colorClass: string;
  desc: string;
}> = {
  uLan: {
    name: 'Thiên Niên U Lan',
    icon: '🌸',
    rarity: 'Hiếm',
    colorClass: 'text-pink-400',
    desc: 'Dược thảo ngàn năm nơi hàn đầm tuyết cốc, thanh tâm định khí, chuyên luyện Thọ Nguyên Đan.',
  },
  huyetTinh: {
    name: 'Huyết Tinh Thảo',
    icon: '🌿',
    rarity: 'Phổ Thông',
    colorClass: 'text-emerald-400',
    desc: 'Ngưng tụ sinh mệnh chi lực từ tốc độ cao, kích thích khí huyết, tăng tốc luyện Tu Vi.',
  },
  hoaAnh: {
    name: 'Hóa Anh Quả',
    icon: '🍑',
    rarity: 'Trân Quý',
    colorClass: 'text-purple-400',
    desc: 'Quả tiên nghìn năm khai hoa kết trái, bảo vệ tâm mạch và bình cảnh đột phá.',
  },
  huyenThiet: {
    name: 'Huyền Thiết Tinh Hoa',
    icon: '💎',
    rarity: 'Trân Quý',
    colorClass: 'text-cyan-400',
    desc: 'Khoáng thạch trui rèn đan đỉnh và tôi rèn bản mệnh pháp bảo chí tôn.',
  },
  longTu: {
    name: 'Long Tu Thảo',
    icon: '🐉',
    rarity: 'Cực Phẩm',
    colorClass: 'text-amber-400',
    desc: 'Hấp thụ long khí đại địa ngàn năm, cực phẩm dược liệu trợ lực phá vỡ bình cảnh thiên kiếp.',
  },
};

// === CÔNG THỨC LUYỆN ĐAN BÁT QUÁI ===
export interface AlchemyRecipe {
  id: 'thoNguyen' | 'hoTam' | 'phaCanh' | 'dinhTam' | 'ngungThan' | 'vanNienTuVi';
  name: string;
  icon: string;
  pillKey: 'thoNguyen' | 'hoTam' | 'phaCanh' | 'dinhTam' | 'ngungThan' | 'sieuCapTuViDan';
  ingredients: Partial<Record<HerbType, number>>;
  desc: string;
  effectText: string;
  heatDifficulty: 'Dễ' | 'Trung Bình' | 'Khó' | 'Cực Khó';
}

export const ALCHEMY_RECIPES: AlchemyRecipe[] = [
  {
    id: 'thoNguyen',
    name: 'Thọ Nguyên Đan',
    icon: '🧪',
    pillKey: 'thoNguyen',
    ingredients: { uLan: 1, huyetTinh: 1 },
    desc: 'Kéo dài sinh mệnh, chống cạn kiệt thọ nguyên (+5 ~ +15 Thọ Nguyên)',
    effectText: '+5 Thọ Nguyên (Cực Phẩm: +15 Thọ Nguyên hoặc x3 số lượng)',
    heatDifficulty: 'Dễ',
  },
  {
    id: 'hoTam',
    name: 'Hộ Tâm Đan',
    icon: '🛡️',
    pillKey: 'hoTam',
    ingredients: { hoaAnh: 1, huyenThiet: 1 },
    desc: 'Giữ vững tu vi khi vượt kiếp thất bại, bảo toàn 100% tầng tu vi',
    effectText: 'Bảo hộ đan điền khi độ kiếp thất bại, không bị rớt tầng',
    heatDifficulty: 'Trung Bình',
  },
  {
    id: 'phaCanh',
    name: 'Phá Cảnh Đan',
    icon: '🔮',
    pillKey: 'phaCanh',
    ingredients: { longTu: 1, uLan: 1 },
    desc: 'Phá vỡ bình cảnh tu vi, gia tăng tỷ lệ độ kiếp thành công',
    effectText: '+15% tỷ lệ độ kiếp (Cực phẩm: +30%)',
    heatDifficulty: 'Khó',
  },
  {
    id: 'dinhTam',
    name: 'Định Tâm Đan',
    icon: '🧘',
    pillKey: 'dinhTam',
    ingredients: { uLan: 1, huyetTinh: 1 },
    desc: 'Ổn định tâm cảnh, giảm 50% ảnh hưởng tiêu cực của từ gõ sai vào WPM trong 3 ván tiếp theo',
    effectText: 'Trong 3 ván tiếp theo: Giảm 50% ảnh hưởng từ gõ sai vào WPM',
    heatDifficulty: 'Dễ',
  },
  {
    id: 'ngungThan',
    name: 'Ngưng Thần Đan',
    icon: '👁️',
    pillKey: 'ngungThan',
    ingredients: { uLan: 1, hoaAnh: 1 },
    desc: 'Khai mở thần thức, tăng 20% khả năng rơi linh thảo quý hiếm trong 3 ván thi đấu tiếp theo',
    effectText: 'Trong 3 ván tiếp theo: +20% tỷ lệ rơi dược liệu quý hiếm',
    heatDifficulty: 'Trung Bình',
  },
  {
    id: 'vanNienTuVi',
    name: 'Vạn Niên Tu Vi Đan',
    icon: '🌟',
    pillKey: 'sieuCapTuViDan',
    ingredients: { hoaAnh: 1, longTu: 1, huyenThiet: 1 },
    desc: 'Linh đan chí tôn ngưng tụ vạn năm thiên địa linh khí, tăng vọt Tu Vi',
    effectText: '+5.000 ~ +7.000 Tu Vi ngay lập tức',
    heatDifficulty: 'Cực Khó',
  },
];

// === TÔNG MÔN MẶC ĐỊNH & THẦN THÚ TRẤN GIỚI ===
export const DEFAULT_SECTS: SectInfo[] = [
  {
    id: 'sect_thuc_son',
    name: 'Thục Sơn Kiếm Phái',
    tag: 'Thục Sơn',
    description: 'Kiếm tu đệ nhất thiên hạ, vạn kiếm quy tông, ngự kiếm trảm yêu trừ ma.',
    leaderId: 'leader_thuc_son',
    leaderName: 'Độc Cô Kiếm Tôn',
    leaderAvatar: '⚔️',
    leaderFrame: 'frame_xianxia_dokiep',
    leaderRealmName: 'Độ Kiếp Kỳ',
    leaderLevel: 820,
    linhMachLevel: 3,
    totalContribution: 24500,
    memberCount: 48,
    totalTuVi: 40007000,
    avgLevel: 375,
    avgRealmName: 'Hóa Thần Kỳ',
    badgeIcon: '⚔️',
    slogan: 'Vạn Kiếm Quy Nhất • Trảm Phá Thái Hư',
    bannerColor: '#38bdf8',
    weeklyTournamentPoints: 840,
    isHoldingThienCung: true,
    worldBoss: {
      id: 'boss_hac_long',
      name: 'Thái Cổ Hắc Long',
      icon: '🐉',
      hp: 154000,
      maxHp: 200000,
      level: 10,
      isDefeated: false,
      lastResetTime: Date.now(),
    },
    members: [
      {
        userId: 'thuc_son_1',
        username: 'Độc Cô Kiếm Tôn',
        displayName: 'Độc Cô Kiếm Tôn',
        avatar: '⚔️',
        frame: 'frame_xianxia_dokiep',
        role: 'chuong_mon',
        contribution: 12000,
        realmIndex: 8,
        realmName: 'Độ Kiếp Kỳ',
        realmIcon: '🌩️',
        level: 820,
        tier: 8,
        exp: 820000,
        tuViScore: 8820000,
        joinedAt: Date.now() - 30 * 86400000,
      },
      {
        userId: 'thuc_son_2',
        username: 'Thanh Hư Chân Nhân',
        displayName: 'Thanh Hư Chân Nhân',
        avatar: '🧙‍♂️',
        frame: 'frame_xianxia_daithua',
        role: 'dai_truong_lao',
        contribution: 5800,
        realmIndex: 7,
        realmName: 'Đại Thừa Kỳ',
        realmIcon: '☀️',
        level: 650,
        tier: 6,
        exp: 650000,
        tuViScore: 7650000,
        joinedAt: Date.now() - 25 * 86400000,
      },
      {
        userId: 'thuc_son_3',
        username: 'Lăng Phong Kiếm Sĩ',
        displayName: 'Lăng Phong Kiếm Sĩ',
        avatar: '🗡️',
        frame: 'frame_xianxia_hopthe',
        role: 'chan_truyen',
        contribution: 2900,
        realmIndex: 6,
        realmName: 'Hợp Thể Kỳ',
        realmIcon: '⚡',
        level: 480,
        tier: 5,
        exp: 480000,
        tuViScore: 6480000,
        joinedAt: Date.now() - 20 * 86400000,
      },
      {
        userId: 'thuc_son_4',
        username: 'Vân Dao Kiếm Nữ',
        displayName: 'Vân Dao Kiếm Nữ',
        avatar: '🧝‍♀️',
        frame: 'frame_xianxia_hopthe',
        role: 'chan_truyen',
        contribution: 2400,
        realmIndex: 6,
        realmName: 'Hợp Thể Kỳ',
        realmIcon: '⚡',
        level: 450,
        tier: 4,
        exp: 450000,
        tuViScore: 6450000,
        joinedAt: Date.now() - 18 * 86400000,
      },
      {
        userId: 'thuc_son_5',
        username: 'Hàn Lập',
        displayName: 'Hàn Lập',
        avatar: '🌿',
        frame: 'frame_xianxia_hoathan',
        role: 'noi_mon',
        contribution: 850,
        realmIndex: 4,
        realmName: 'Hóa Thần Kỳ',
        realmIcon: '🌌',
        level: 270,
        tier: 4,
        exp: 270000,
        tuViScore: 4270000,
        joinedAt: Date.now() - 14 * 86400000,
      },
      {
        userId: 'thuc_son_6',
        username: 'Diệp Thần',
        displayName: 'Diệp Thần',
        avatar: '🔥',
        frame: 'frame_xianxia_hoathan',
        role: 'noi_mon',
        contribution: 720,
        realmIndex: 4,
        realmName: 'Hóa Thần Kỳ',
        realmIcon: '🌌',
        level: 240,
        tier: 3,
        exp: 240000,
        tuViScore: 4240000,
        joinedAt: Date.now() - 12 * 86400000,
      },
      {
        userId: 'thuc_son_7',
        username: 'Trương Đan',
        displayName: 'Trương Đan',
        avatar: '🧱',
        frame: 'frame_xianxia_trucco',
        role: 'ngoai_mon',
        contribution: 180,
        realmIndex: 1,
        realmName: 'Trúc Cơ Kỳ',
        realmIcon: '🧱',
        level: 55,
        tier: 2,
        exp: 55000,
        tuViScore: 1055000,
        joinedAt: Date.now() - 5 * 86400000,
      },
      {
        userId: 'thuc_son_8',
        username: 'Lục Tuyết',
        displayName: 'Lục Tuyết',
        avatar: '❄️',
        frame: 'frame_xianxia_trucco',
        role: 'ngoai_mon',
        contribution: 150,
        realmIndex: 1,
        realmName: 'Trúc Cơ Kỳ',
        realmIcon: '🧱',
        level: 42,
        tier: 1,
        exp: 42000,
        tuViScore: 1042000,
        joinedAt: Date.now() - 3 * 86400000,
      },
    ],
  },
  {
    id: 'sect_cuu_trong',
    name: 'Cửu Trọng Thiên',
    tag: 'Cửu Trọng',
    description: 'Chưởng quản lôi đình cửu thiên, uy trấn bát hoang lục hợp vô địch.',
    leaderId: 'leader_cuu_trong',
    leaderName: 'Cửu Thiên Thần Quân',
    leaderAvatar: '⚡',
    leaderFrame: 'frame_xianxia_dokiep',
    leaderRealmName: 'Độ Kiếp Kỳ',
    leaderLevel: 850,
    linhMachLevel: 4,
    totalContribution: 38900,
    memberCount: 62,
    totalTuVi: 35900000,
    avgLevel: 483,
    avgRealmName: 'Hợp Thể Kỳ',
    badgeIcon: '⚡',
    slogan: 'Lôi Đình Vạn Trượng • Chấn Nhiếp Bát Hoang',
    bannerColor: '#facc15',
    weeklyTournamentPoints: 780,
    isHoldingThienCung: false,
    worldBoss: {
      id: 'boss_hoa_phuong',
      name: 'Cửu Thiên Hỏa Phượng',
      icon: '🦅',
      hp: 195000,
      maxHp: 250000,
      level: 12,
      isDefeated: false,
      lastResetTime: Date.now(),
    },
    members: [
      {
        userId: 'cuu_trong_1',
        username: 'Cửu Thiên Thần Quân',
        displayName: 'Cửu Thiên Thần Quân',
        avatar: '⚡',
        frame: 'frame_xianxia_dokiep',
        role: 'chuong_mon',
        contribution: 15000,
        realmIndex: 8,
        realmName: 'Độ Kiếp Kỳ',
        realmIcon: '🌩️',
        level: 850,
        tier: 9,
        exp: 850000,
        tuViScore: 8850000,
        joinedAt: Date.now() - 35 * 86400000,
      },
      {
        userId: 'cuu_trong_2',
        username: 'Lôi Chấn Tử',
        displayName: 'Lôi Chấn Tử',
        avatar: '🌩️',
        frame: 'frame_xianxia_daithua',
        role: 'dai_truong_lao',
        contribution: 8200,
        realmIndex: 7,
        realmName: 'Đại Thừa Kỳ',
        realmIcon: '☀️',
        level: 680,
        tier: 7,
        exp: 680000,
        tuViScore: 7680000,
        joinedAt: Date.now() - 28 * 86400000,
      },
      {
        userId: 'cuu_trong_3',
        username: 'Phong Lôi Tiên Tử',
        displayName: 'Phong Lôi Tiên Tử',
        avatar: '🌪️',
        frame: 'frame_xianxia_hopthe',
        role: 'chan_truyen',
        contribution: 3200,
        realmIndex: 6,
        realmName: 'Hợp Thể Kỳ',
        realmIcon: '⚡',
        level: 490,
        tier: 5,
        exp: 490000,
        tuViScore: 6490000,
        joinedAt: Date.now() - 22 * 86400000,
      },
      {
        userId: 'cuu_trong_4',
        username: 'Thần Tiêu Kiếm Hiệp',
        displayName: 'Thần Tiêu Kiếm Hiệp',
        avatar: '🗡️',
        frame: 'frame_xianxia_hopthe',
        role: 'chan_truyen',
        contribution: 2600,
        realmIndex: 6,
        realmName: 'Hợp Thể Kỳ',
        realmIcon: '⚡',
        level: 460,
        tier: 4,
        exp: 460000,
        tuViScore: 6460000,
        joinedAt: Date.now() - 17 * 86400000,
      },
      {
        userId: 'cuu_trong_5',
        username: 'Lôi Bạo Cuồng Đao',
        displayName: 'Lôi Bạo Cuồng Đao',
        avatar: '⚔️',
        frame: 'frame_xianxia_luyenhu',
        role: 'noi_mon',
        contribution: 980,
        realmIndex: 5,
        realmName: 'Luyện Hư Kỳ',
        realmIcon: '🌀',
        level: 360,
        tier: 3,
        exp: 360000,
        tuViScore: 5360000,
        joinedAt: Date.now() - 10 * 86400000,
      },
      {
        userId: 'cuu_trong_6',
        username: 'Lôi Đình Tiểu Sinh',
        displayName: 'Lôi Đình Tiểu Sinh',
        avatar: '👦',
        frame: 'frame_xianxia_trucco',
        role: 'ngoai_mon',
        contribution: 120,
        realmIndex: 1,
        realmName: 'Trúc Cơ Kỳ',
        realmIcon: '🧱',
        level: 60,
        tier: 2,
        exp: 60000,
        tuViScore: 1060000,
        joinedAt: Date.now() - 4 * 86400000,
      },
    ],
  },
  {
    id: 'sect_van_kiem',
    name: 'Vạn Kiếm Quy Tông',
    tag: 'Vạn Kiếm',
    description: 'Kiếm ý thông thiên triệt địa, một kiếm phá vạn pháp khai mở thái hư.',
    leaderId: 'leader_van_kiem',
    leaderName: 'Vô Nhai Kiếm Thánh',
    leaderAvatar: '🗡️',
    leaderFrame: 'frame_xianxia_daithua',
    leaderRealmName: 'Đại Thừa Kỳ',
    leaderLevel: 710,
    linhMachLevel: 3,
    totalContribution: 29400,
    memberCount: 51,
    totalTuVi: 26065000,
    avgLevel: 413,
    avgRealmName: 'Hóa Thần Kỳ',
    badgeIcon: '🗡️',
    slogan: 'Nhất Kiếm Đoạt Mệnh • Khai Mở Càn Khôn',
    bannerColor: '#a855f7',
    weeklyTournamentPoints: 710,
    isHoldingThienCung: false,
    worldBoss: {
      id: 'boss_bach_ho',
      name: 'Thần Thú Bạch Hổ',
      icon: '🐯',
      hp: 140000,
      maxHp: 200000,
      level: 9,
      isDefeated: false,
      lastResetTime: Date.now(),
    },
    members: [
      {
        userId: 'van_kiem_1',
        username: 'Vô Nhai Kiếm Thánh',
        displayName: 'Vô Nhai Kiếm Thánh',
        avatar: '🗡️',
        frame: 'frame_xianxia_daithua',
        role: 'chuong_mon',
        contribution: 11000,
        realmIndex: 7,
        realmName: 'Đại Thừa Kỳ',
        realmIcon: '☀️',
        level: 710,
        tier: 8,
        exp: 710000,
        tuViScore: 7710000,
        joinedAt: Date.now() - 29 * 86400000,
      },
      {
        userId: 'van_kiem_2',
        username: 'Tàng Kiếm Lão Nhân',
        displayName: 'Tàng Kiếm Lão Nhân',
        avatar: '🧙‍♂️',
        frame: 'frame_xianxia_hopthe',
        role: 'dai_truong_lao',
        contribution: 6200,
        realmIndex: 6,
        realmName: 'Hợp Thể Kỳ',
        realmIcon: '⚡',
        level: 560,
        tier: 6,
        exp: 560000,
        tuViScore: 6560000,
        joinedAt: Date.now() - 21 * 86400000,
      },
      {
        userId: 'van_kiem_3',
        username: 'Kiếm Vô Ngấn',
        displayName: 'Kiếm Vô Ngấn',
        avatar: '⚔️',
        frame: 'frame_xianxia_luyenhu',
        role: 'chan_truyen',
        contribution: 2700,
        realmIndex: 5,
        realmName: 'Luyện Hư Kỳ',
        realmIcon: '🌀',
        level: 410,
        tier: 4,
        exp: 410000,
        tuViScore: 5410000,
        joinedAt: Date.now() - 15 * 86400000,
      },
      {
        userId: 'van_kiem_4',
        username: 'Mặc Kiếm Khách',
        displayName: 'Mặc Kiếm Khách',
        avatar: '🥷',
        frame: 'frame_xianxia_hoathan',
        role: 'noi_mon',
        contribution: 920,
        realmIndex: 4,
        realmName: 'Hóa Thần Kỳ',
        realmIcon: '🌌',
        level: 290,
        tier: 3,
        exp: 290000,
        tuViScore: 4290000,
        joinedAt: Date.now() - 9 * 86400000,
      },
      {
        userId: 'van_kiem_5',
        username: 'Tố Kiếm Đệ Tử',
        displayName: 'Tố Kiếm Đệ Tử',
        avatar: '🌸',
        frame: 'frame_xianxia_ketdan',
        role: 'ngoai_mon',
        contribution: 210,
        realmIndex: 2,
        realmName: 'Kết Đan Kỳ',
        realmIcon: '🔮',
        level: 95,
        tier: 2,
        exp: 95000,
        tuViScore: 2095000,
        joinedAt: Date.now() - 4 * 86400000,
      },
    ],
  },
  {
    id: 'sect_tieu_dao',
    name: 'Tiêu Dao Cung',
    tag: 'Tiêu Dao',
    description: 'Tiêu dao tự tại giữa đất trời, tâm như chỉ thủy, thân tự phù vân ngao du vạn dặm.',
    leaderId: 'leader_tieu_dao',
    leaderName: 'Tiêu Dao Tử',
    leaderAvatar: '🪷',
    leaderFrame: 'frame_xianxia_daithua',
    leaderRealmName: 'Đại Thừa Kỳ',
    leaderLevel: 690,
    linhMachLevel: 2,
    totalContribution: 16800,
    memberCount: 35,
    totalTuVi: 25978000,
    avgLevel: 395,
    avgRealmName: 'Hóa Thần Kỳ',
    badgeIcon: '🪷',
    slogan: 'Tiêu Dao Tự Tại • Đạo Pháp Tự Nhiên',
    bannerColor: '#34d399',
    weeklyTournamentPoints: 620,
    isHoldingThienCung: false,
    worldBoss: {
      id: 'boss_ky_lan',
      name: 'Hồng Hoang Kỳ Lân',
      icon: '🦄',
      hp: 120000,
      maxHp: 180000,
      level: 8,
      isDefeated: false,
      lastResetTime: Date.now(),
    },
    members: [
      {
        userId: 'tieu_dao_1',
        username: 'Tiêu Dao Tử',
        displayName: 'Tiêu Dao Tử',
        avatar: '🪷',
        frame: 'frame_xianxia_daithua',
        role: 'chuong_mon',
        contribution: 8500,
        realmIndex: 7,
        realmName: 'Đại Thừa Kỳ',
        realmIcon: '☀️',
        level: 690,
        tier: 7,
        exp: 690000,
        tuViScore: 7690000,
        joinedAt: Date.now() - 27 * 86400000,
      },
      {
        userId: 'tieu_dao_2',
        username: 'Cầm Họa Tiên Cô',
        displayName: 'Cầm Họa Tiên Cô',
        avatar: '🪕',
        frame: 'frame_xianxia_hopthe',
        role: 'dai_truong_lao',
        contribution: 5100,
        realmIndex: 6,
        realmName: 'Hợp Thể Kỳ',
        realmIcon: '⚡',
        level: 530,
        tier: 5,
        exp: 530000,
        tuViScore: 6530000,
        joinedAt: Date.now() - 20 * 86400000,
      },
      {
        userId: 'tieu_dao_3',
        username: 'Bạch Lộc Chân Quân',
        displayName: 'Bạch Lộc Chân Quân',
        avatar: '🦌',
        frame: 'frame_xianxia_luyenhu',
        role: 'chan_truyen',
        contribution: 2300,
        realmIndex: 5,
        realmName: 'Luyện Hư Kỳ',
        realmIcon: '🌀',
        level: 390,
        tier: 4,
        exp: 390000,
        tuViScore: 5390000,
        joinedAt: Date.now() - 14 * 86400000,
      },
      {
        userId: 'tieu_dao_4',
        username: 'Lưu Vân Đạo Trưởng',
        displayName: 'Lưu Vân Đạo Trưởng',
        avatar: '☁️',
        frame: 'frame_xianxia_hoathan',
        role: 'noi_mon',
        contribution: 880,
        realmIndex: 4,
        realmName: 'Hóa Thần Kỳ',
        realmIcon: '🌌',
        level: 280,
        tier: 3,
        exp: 280000,
        tuViScore: 4280000,
        joinedAt: Date.now() - 8 * 86400000,
      },
      {
        userId: 'tieu_dao_5',
        username: 'Thính Phong Tử',
        displayName: 'Thính Phong Tử',
        avatar: '🍃',
        frame: 'frame_xianxia_ketdan',
        role: 'ngoai_mon',
        contribution: 190,
        realmIndex: 2,
        realmName: 'Kết Đan Kỳ',
        realmIcon: '🔮',
        level: 88,
        tier: 2,
        exp: 88000,
        tuViScore: 2088000,
        joinedAt: Date.now() - 3 * 86400000,
      },
    ],
  },
];

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
    realmName: initialRealm.name,
    subStage: 'Sơ Kỳ',
    titleName: initialRealm.titleName,
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
      tuViDan: 0,
      sieuCapTuViDan: 0,
      dinhTam: 1,
      ngungThan: 1,
    },
    dailyQuests: createDefaultDailyQuests(),
    dailyQuestsDate: today,
    tamPhap: {
      equipped: 'than_hanh',
      matchesSinceHeal: 0,
      levels: { than_hanh: 1, bat_dong: 1, cuu_chuyen: 1 },
      exp: { than_hanh: 0, bat_dong: 0, cuu_chuyen: 0 },
    },
    herbs: {
      uLan: 2,
      huyetTinh: 3,
      hoaAnh: 1,
      huyenThiet: 1,
      longTu: 0,
    },
    artifacts: {
      equipped: 'thanh_van_kiem',
      levels: {
        thanh_van_kiem: 1,
        hao_thien_kinh: 0,
        cuu_pham_lien: 0,
        ban_co_phu: 0,
      },
      spiritAwakened: {
        thanh_van_kiem: false,
        hao_thien_kinh: false,
        cuu_pham_lien: false,
        ban_co_phu: false,
      },
      spiritAffection: {
        thanh_van_kiem: 10,
        hao_thien_kinh: 0,
        cuu_pham_lien: 0,
        ban_co_phu: 0,
      },
    },
    activeBuffs: {
      dinhTamMatchesRemaining: 0,
      ngungThanMatchesRemaining: 0,
      kimCangImmunityUntil: 0,
    },
    sect: {
      sectId: 'sect_thuc_son',
      sectName: 'Thục Sơn Kiếm Phái',
      sectTag: 'Thục Sơn',
      role: 'noi_mon',
      contribution: 150,
      joinedAt: Date.now(),
      tournamentWins: 0,
    },
    linhThach: 150,
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
    let parsed: Partial<CultivationState> | null = getCultivationSync();
    if (!parsed) {
      const raw = localStorage.getItem(CULTIVATION_STORAGE_KEY);
      if (raw) {
        parsed = JSON.parse(raw);
      }
    }
    if (!parsed) {
      const fresh = createInitialCultivationState();
      saveStoredCultivationState(fresh);
      return fresh;
    }
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
      realmName: currentRealm.name,
      subStage: getSubStage(tier),
      titleName: currentRealm.titleName,
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
        dinhTam: parsed.pillCount?.dinhTam ?? 1,
        ngungThan: parsed.pillCount?.ngungThan ?? 1,
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
      tamPhap: {
        equipped: parsed.tamPhap?.equipped !== undefined ? parsed.tamPhap.equipped : 'than_hanh',
        matchesSinceHeal: parsed.tamPhap?.matchesSinceHeal || 0,
        levels: {
          than_hanh: parsed.tamPhap?.levels?.than_hanh ?? 1,
          bat_dong: parsed.tamPhap?.levels?.bat_dong ?? 1,
          cuu_chuyen: parsed.tamPhap?.levels?.cuu_chuyen ?? 1,
        },
        exp: {
          than_hanh: parsed.tamPhap?.exp?.than_hanh ?? 0,
          bat_dong: parsed.tamPhap?.exp?.bat_dong ?? 0,
          cuu_chuyen: parsed.tamPhap?.exp?.cuu_chuyen ?? 0,
        },
      },
      herbs: {
        uLan: parsed.herbs?.uLan ?? 2,
        huyetTinh: parsed.herbs?.huyetTinh ?? 3,
        hoaAnh: parsed.herbs?.hoaAnh ?? 1,
        huyenThiet: parsed.herbs?.huyenThiet ?? 1,
        longTu: parsed.herbs?.longTu ?? 0,
      },
      artifacts: {
        equipped: parsed.artifacts?.equipped !== undefined ? parsed.artifacts.equipped : 'thanh_van_kiem',
        levels: {
          thanh_van_kiem: parsed.artifacts?.levels?.thanh_van_kiem ?? 1,
          hao_thien_kinh: parsed.artifacts?.levels?.hao_thien_kinh ?? 0,
          cuu_pham_lien: parsed.artifacts?.levels?.cuu_pham_lien ?? 0,
          ban_co_phu: parsed.artifacts?.levels?.ban_co_phu ?? 0,
        },
        spiritAwakened: {
          thanh_van_kiem: (parsed.artifacts?.levels?.thanh_van_kiem ?? 1) >= 5,
          hao_thien_kinh: (parsed.artifacts?.levels?.hao_thien_kinh ?? 0) >= 5,
          cuu_pham_lien: (parsed.artifacts?.levels?.cuu_pham_lien ?? 0) >= 5,
          ban_co_phu: (parsed.artifacts?.levels?.ban_co_phu ?? 0) >= 5,
        },
        spiritAffection: {
          thanh_van_kiem: parsed.artifacts?.spiritAffection?.thanh_van_kiem ?? 20,
          hao_thien_kinh: parsed.artifacts?.spiritAffection?.hao_thien_kinh ?? 0,
          cuu_pham_lien: parsed.artifacts?.spiritAffection?.cuu_pham_lien ?? 0,
          ban_co_phu: parsed.artifacts?.spiritAffection?.ban_co_phu ?? 0,
        },
      },
      activeBuffs: {
        dinhTamMatchesRemaining: parsed.activeBuffs?.dinhTamMatchesRemaining ?? 0,
        ngungThanMatchesRemaining: parsed.activeBuffs?.ngungThanMatchesRemaining ?? 0,
        kimCangImmunityUntil: parsed.activeBuffs?.kimCangImmunityUntil ?? 0,
      },
      sect: parsed.sect || {
        sectId: 'sect_thuc_son',
        sectName: 'Thục Sơn Kiếm Phái',
        sectTag: 'Thục Sơn',
        role: 'noi_mon',
        contribution: 150,
        joinedAt: Date.now(),
        tournamentWins: 0,
      },
      linhThach: parsed.linhThach ?? 150,
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
  
  // Lưu vào bộ nhớ đệm và IndexedDB nền (tránh nghẽn I/O trên Citrix VDI)
  saveCultivationToIndexedDB(state).catch(() => {});

  // Tự động đồng bộ ngầm tiến độ tu vi mới nhất lên máy chủ nếu người chơi đã đăng nhập
  syncCultivationToServer(state).catch(() => {});
}

/**
 * Hàm quản trị viên: Thiết lập trực tiếp cấp độ tu tiên (1 - 1000) hoặc Cảnh Giới & Tầng cho bản thân
 * Đảm bảo: Cảnh giới, tầng, thọ nguyên, EXP, danh hiệu sẽ cập nhật tương ứng chính xác tuyệt đối
 */
export function setCultivationLevelByAdmin(
  currentState: CultivationState,
  targetLevel: number,
  options?: {
    refillThoNguyen?: boolean;
    fillPills?: boolean;
    customTier?: number;
    addExp?: number;
  }
): CultivationState {
  const clampedLevel = Math.max(1, Math.min(1000, Math.round(targetLevel)));
  const { realmIndex, tier } = getRealmAndTierFromLevel(clampedLevel);
  const effectiveTier = options?.customTier ? Math.max(1, Math.min(10, Math.round(options.customTier))) : tier;
  const realm = XIANXIA_REALMS[realmIndex];
  const maxExp = getRequiredExpForTier(clampedLevel, realmIndex);

  const updatedPills = options?.fillPills
    ? {
        thoNguyen: Math.max(currentState.pillCount.thoNguyen, 99),
        hoTam: Math.max(currentState.pillCount.hoTam, 99),
        phaCanh: Math.max(currentState.pillCount.phaCanh, 99),
        tuViDan: Math.max(currentState.pillCount.tuViDan || 0, 99),
        sieuCapTuViDan: Math.max(currentState.pillCount.sieuCapTuViDan || 0, 99),
      }
    : currentState.pillCount;

  const newThoNguyen = options?.refillThoNguyen !== false
    ? realm.maxThoNguyen
    : Math.min(currentState.thoNguyen, realm.maxThoNguyen);

  const subStage = getSubStage(effectiveTier);
  const newLog = `⚡ [Admin Can Thiệp] Thiết lập cảnh giới: ${realm.name} Tầng ${effectiveTier} (${subStage}) - Cấp ${clampedLevel}/1000`;

  const updatedState: CultivationState = {
    ...currentState,
    level: clampedLevel,
    realmIndex,
    tier: effectiveTier,
    realmName: realm.name,
    subStage,
    titleName: realm.titleName,
    exp: options?.addExp !== undefined ? Math.min(maxExp - 1, Math.max(0, options.addExp)) : 0,
    maxExp,
    thoNguyen: newThoNguyen,
    maxThoNguyen: realm.maxThoNguyen,
    lastThoNguyenDecay: Date.now(),
    lastCultivateTime: Date.now(),
    pillCount: updatedPills,
    historyLog: [newLog, ...currentState.historyLog].slice(0, 30),
  };

  saveStoredCultivationState(updatedState);
  return updatedState;
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
  const isKimCangImmune = Boolean(
    updated.activeBuffs?.kimCangImmunityUntil && updated.activeBuffs.kimCangImmunityUntil > now
  );

  if (updated.realmIndex < 11) {
    if (isKimCangImmune) {
      // Kim Cang Bất Hoại (Tầng 9 Bất Động Càn Khôn): Miễn trừ suy giảm thọ nguyên
      updated.lastThoNguyenDecay = now;
    } else {
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
 * Nâng cấp GIAI ĐOẠN 2 & 3:
 * - Ngũ Hành Linh Thảo Drop Matrix chuyên biệt theo chế độ thi đấu
 * - Hiệu ứng Khai Thần Nhãn (Combo > 100 hoặc Accuracy 100%)
 * - Tâm Pháp Nội Tại Tầng 1 -> Tầng 9 (Thuấn Tức Vạn Dặm x2 Tu Vi, Kim Cang Bất Hoại, Sinh Sinh Bất Tức)
 * - Tác dụng Định Tâm Đan & Ngưng Thần Đan
 */
export function addTuViFromMatch(
  state: CultivationState,
  match: {
    wpm: number;
    accuracy: number;
    mode: GameMode;
    score?: number;
    maxCombo?: number;
    coupleBuff?: boolean;
  }
): {
  updatedState: CultivationState;
  expGained: number;
  hitDailyCap: boolean;
  leveledUp: boolean;
  readyForBreakthrough: boolean;
  newRealmOrTierNotice?: string;
  comboMultiplier: number;
  comboNotice?: string;
  tamPhapNotice?: string;
  droppedHerbs: HerbType[];
  droppedPills: string[];
  linhThachGained: number;
} {
  const today = getTodayDateString();
  let updated: CultivationState = {
    ...state,
    herbs: state.herbs || { uLan: 0, huyetTinh: 0, hoaAnh: 0, huyenThiet: 0, longTu: 0 },
    tamPhap: state.tamPhap || {
      equipped: 'than_hanh',
      matchesSinceHeal: 0,
      levels: { than_hanh: 1, bat_dong: 1, cuu_chuyen: 1 },
      exp: { than_hanh: 0, bat_dong: 0, cuu_chuyen: 0 },
    },
    artifacts: state.artifacts || {
      equipped: 'thanh_van_kiem',
      levels: { thanh_van_kiem: 1, hao_thien_kinh: 0, cuu_pham_lien: 0, ban_co_phu: 0 },
      spiritAwakened: { thanh_van_kiem: false, hao_thien_kinh: false, cuu_pham_lien: false, ban_co_phu: false },
      spiritAffection: { thanh_van_kiem: 10, hao_thien_kinh: 0, cuu_pham_lien: 0, ban_co_phu: 0 },
    },
    activeBuffs: state.activeBuffs || {
      dinhTamMatchesRemaining: 0,
      ngungThanMatchesRemaining: 0,
      kimCangImmunityUntil: 0,
    },
    sect: state.sect || {
      sectId: 'sect_thuc_son',
      sectName: 'Thục Sơn Kiếm Phái',
      sectTag: 'Thục Sơn',
      role: 'noi_mon',
      contribution: 150,
      joinedAt: Date.now(),
      tournamentWins: 0,
    },
    linhThach: state.linhThach ?? 150,
  };

  // Reset daily cap if new day
  if (updated.dailyExpDate !== today) {
    updated.dailyExpDate = today;
    updated.dailyExpEarned = 0;
  }

  // Refresh cultivate timestamp (Xua tan tâm ma)
  updated.lastCultivateTime = Date.now();

  // === 1. TÍNH TOÁN COMBO STREAK BẠO KÍCH TU VI (Nhập Định Đốn Ngộ) ===
  const maxCombo = match.maxCombo || 0;
  let comboMultiplier = 1.0;
  let comboNotice: string | undefined;

  if (maxCombo >= 200) {
    comboMultiplier = 2.0;
    comboNotice = `🔥 [ĐỐN NGỘ CỰC HẠN] Chuỗi bạo kích ${maxCombo} từ! Tu vi x2.0!`;
  } else if (maxCombo >= 100) {
    comboMultiplier = 1.5;
    comboNotice = `⚡ [ĐỐN NGỘ TRUNG GIAI] Chuỗi bạo kích ${maxCombo} từ! Tu vi x1.5!`;
  } else if (maxCombo >= 50) {
    comboMultiplier = 1.2;
    comboNotice = `✨ [ĐỐN NGỘ SƠ GIAI] Chuỗi bạo kích ${maxCombo} từ! Tu vi x1.2!`;
  }

  // === 2. TÂM PHÁP CHỦ ĐẠO TẦNG 1 - TẦNG 9 & HIỆU ỨNG ĐỈNH CẤP ===
  let extraBonusPercent = 0;
  let linhThachMultiplier = 1.0;
  let tamPhapNotice: string | undefined;
  let isDoubleExpByMantra = false;
  const droppedPills: string[] = [];

  const currentTamPhapLevels = {
    than_hanh: updated.tamPhap?.levels?.than_hanh ?? 1,
    bat_dong: updated.tamPhap?.levels?.bat_dong ?? 1,
    cuu_chuyen: updated.tamPhap?.levels?.cuu_chuyen ?? 1,
  };
  const currentTamPhapExp = {
    than_hanh: updated.tamPhap?.exp?.than_hanh ?? 0,
    bat_dong: updated.tamPhap?.exp?.bat_dong ?? 0,
    cuu_chuyen: updated.tamPhap?.exp?.cuu_chuyen ?? 0,
  };

  const equippedTamPhap = updated.tamPhap?.equipped;

  if (equippedTamPhap) {
    // Tăng kinh nghiệm tu luyện tâm pháp sau ván đấu
    const currentTier = currentTamPhapLevels[equippedTamPhap] || 1;
    if (currentTier < 9) {
      const addedTamPhapExp = Math.round(25 + match.wpm * 0.4 + match.accuracy * 0.3);
      const reqExpForTier = currentTier * 130;
      let nextExp = (currentTamPhapExp[equippedTamPhap] || 0) + addedTamPhapExp;
      let nextTier = currentTier;
      if (nextExp >= reqExpForTier) {
        nextExp -= reqExpForTier;
        nextTier = Math.min(9, currentTier + 1);
        const upMsg = `🎉 [TÂM PHÁP ĐỘT PHÁ] ${TAM_PHAP_CONFIGS[equippedTamPhap]?.name} đã thăng lên Tầng ${nextTier}${nextTier === 9 ? ' (ĐỈNH CẤP VIÊN MÃN)' : ''}!`;
        updated.historyLog = [upMsg, ...updated.historyLog.slice(0, 19)];
      }
      currentTamPhapLevels[equippedTamPhap] = nextTier;
      currentTamPhapExp[equippedTamPhap] = nextExp;
    }

    const effectiveTier = currentTamPhapLevels[equippedTamPhap];

    // 🗡️ THẦN HÀNH THIÊN LÝ: Cuồng Tốc
    if (equippedTamPhap === 'than_hanh') {
      if (match.wpm >= 90) {
        extraBonusPercent += 30; // +30% Tu Vi
        linhThachMultiplier += 0.3; // +30% Linh Thạch
        const kiemKhiStacks = Math.floor(match.wpm / 50);
        tamPhapNotice = `🗡️ Thần Hành Thiên Lý Tầng ${effectiveTier}: WPM ≥ 90 (+30% Linh Thạch & Tu Vi, ${kiemKhiStacks} tầng Kiếm Khí Xung Thiên)!`;
      }
      // Hiệu Ứng Đỉnh Cấp (Tầng 9): Thuấn Tức Vạn Dặm
      if (effectiveTier >= 9 && match.wpm > 110) {
        isDoubleExpByMantra = true;
        tamPhapNotice = `⚡ [THUẤN TỨC VẠN DẶM - TẦNG 9] Hoàn thành ván với WPM > 110: GẤP ĐÔI TU VI NHẬN ĐƯỢC!`;
      }
    }
    // 🛡️ BẤT ĐỘNG CÀN KHÔN: Chuẩn Tuyệt Đối
    else if (equippedTamPhap === 'bat_dong') {
      if (match.accuracy >= 98) {
        // 20% tỷ lệ rơi Thọ Nguyên Đan
        if (Math.random() < 0.2) {
          updated.pillCount.thoNguyen = (updated.pillCount.thoNguyen || 0) + 1;
          droppedPills.push('Thọ Nguyên Đan');
          tamPhapNotice = `🛡️ Bất Động Càn Khôn Tầng ${effectiveTier}: Chuẩn xác tuyệt đối, rơi 1 Thọ Nguyên Đan quý giá!`;
        } else {
          tamPhapNotice = `🛡️ Bất Động Càn Khôn Tầng ${effectiveTier}: Chuẩn xác 98-100%, bảo lưu toàn vẹn thọ nguyên!`;
        }
      }
      // Hiệu Ứng Đỉnh Cấp (Tầng 9): Kim Cang Bất Hoại
      if (effectiveTier >= 9 && match.accuracy >= 100) {
        const sixHoursMs = 6 * 60 * 60 * 1000;
        updated.activeBuffs = {
          ...updated.activeBuffs,
          kimCangImmunityUntil: Date.now() + sixHoursMs,
        };
        tamPhapNotice = `🛡️ [KIM CANG BẤT HOẠI - TẦNG 9] Accuracy 100%: Miễn trừ hoàn toàn thời gian suy giảm thọ nguyên trong 6 giờ!`;
      }
    }
    // ⚡ CỬU CHUYỂN HỒI XUÂN: Bền Bỉ & Nhất Quán
    else if (equippedTamPhap === 'cuu_chuyen') {
      const nextMatches = (updated.tamPhap?.matchesSinceHeal || 0) + 1;
      if (nextMatches >= 5) {
        updated.tamPhap = {
          ...updated.tamPhap,
          matchesSinceHeal: 0,
        };
        if (updated.thoNguyen < updated.maxThoNguyen) {
          updated.thoNguyen = Math.min(updated.maxThoNguyen, updated.thoNguyen + 1);
          tamPhapNotice = `⚡ Cửu Chuyển Hồi Xuân Tầng ${effectiveTier}: Đả thông kinh mạch 5 ván liên tiếp, hồi phục 1 Thọ Nguyên!`;
        } else {
          tamPhapNotice = `⚡ Cửu Chuyển Hồi Xuân Tầng ${effectiveTier}: Đả thông kinh mạch 5 ván thành công!`;
        }
      } else {
        updated.tamPhap = {
          ...updated.tamPhap,
          matchesSinceHeal: nextMatches,
        };
        if (effectiveTier >= 9) {
          tamPhapNotice = `⚡ Cửu Chuyển Hồi Xuân Tầng 9: Đang kích hoạt [Sinh Sinh Bất Tức] tự sửa lỗi đầu tiên!`;
        }
      }
    }
  }

  // Cập nhật cấp bậc tâm pháp đã tính
  updated.tamPhap = {
    equipped: equippedTamPhap || null,
    matchesSinceHeal: updated.tamPhap?.matchesSinceHeal || 0,
    levels: currentTamPhapLevels,
    exp: currentTamPhapExp,
  };

  // Buff Pháp Bảo
  const equippedArtifact = updated.artifacts?.equipped;
  if (equippedArtifact === 'cuu_pham_lien') {
    extraBonusPercent += 15; // Cửu Phẩm Hắc Liên +15% Tu Vi
  } else if (equippedArtifact === 'ban_co_phu') {
    extraBonusPercent += 25; // Bàn Cổ Khai Thiên Phủ +25% Tu Vi
  }

  // Buff Tông Môn Linh Mạch
  const sectId = updated.sect?.sectId;
  if (sectId) {
    const sects = getStoredSects();
    const currentSect = sects.find((s) => s.id === sectId);
    if (currentSect) {
      const lmLevel = currentSect.linhMachLevel || 1;
      const sectBuffs = [0, 5, 10, 15, 20, 30];
      extraBonusPercent += sectBuffs[Math.min(5, lmLevel)] || 5;

      // Cộng điểm cống hiến cho bản thân và tông môn
      const addedContribution = Math.round(15 + match.wpm * 0.1);
      updated.sect = {
        ...updated.sect,
        contribution: (updated.sect.contribution || 0) + addedContribution,
      };
      currentSect.totalContribution = (currentSect.totalContribution || 0) + addedContribution;
      saveStoredSects(sects);
    }
  }

  // Song Tu Đạo Lữ [Tâm Đầu Ý Hợp] (+15% Tu Vi sau trận)
  let daoLuNotice: string | undefined;
  if (match.coupleBuff) {
    extraBonusPercent += 15;
    daoLuNotice = '💖 [TÂM ĐẦU Ý HỢP] Kề vai tác chiến cùng Đạo Lữ: +15% Tu Vi & Tăng tốc hồi phục!';
  }

  // === 3. TÍNH TOÁN TU VI THỰC NHẬN ===
  const rawBaseExp = Math.round(
    match.wpm * 1.6 +
      (match.score && match.score > 0 ? match.score * 0.12 : 0) +
      match.accuracy * 0.6 +
      25
  );

  let totalMultiplier = comboMultiplier * (1 + extraBonusPercent / 100);
  if (isDoubleExpByMantra) {
    totalMultiplier *= 2; // Thuấn Tức Vạn Dặm x2
  }

  const baseMatchExp = Math.round(rawBaseExp * totalMultiplier);
  const remainingDailyAllowance = Math.max(0, DAILY_MATCH_EXP_CAP - updated.dailyExpEarned);
  const actualExpGained = Math.min(baseMatchExp, remainingDailyAllowance);
  const hitDailyCap = actualExpGained < baseMatchExp;

  updated.dailyExpEarned += actualExpGained;

  // Khấu trừ số ván hiệu lực của Định Tâm Đan & Ngưng Thần Đan (nếu đang bật)
  const hasDinhTam = (updated.activeBuffs?.dinhTamMatchesRemaining || 0) > 0;
  const hasNgungThan = (updated.activeBuffs?.ngungThanMatchesRemaining || 0) > 0;
  if (hasDinhTam || hasNgungThan) {
    updated.activeBuffs = {
      ...updated.activeBuffs,
      dinhTamMatchesRemaining: Math.max(0, (updated.activeBuffs?.dinhTamMatchesRemaining || 0) - 1),
      ngungThanMatchesRemaining: Math.max(0, (updated.activeBuffs?.ngungThanMatchesRemaining || 0) - 1),
    };
  }

  // === 4. THU THẬP KỲ HOA DỊ THẢO THEO MA TRẬN CHUYÊN BIỆT (HERB MATRIX) ===
  const droppedHerbs: HerbType[] = [];
  const baseLinhThach = Math.round((12 + Math.floor(match.wpm / 8)) * linhThachMultiplier);
  const linhThachGained = Math.max(5, baseLinhThach);
  updated.linhThach = (updated.linhThach || 0) + linhThachGained;

  const currentHerbs = { ...(updated.herbs || { uLan: 0, huyetTinh: 0, hoaAnh: 0, huyenThiet: 0, longTu: 0 }) };
  const ngungThanBonusRate = hasNgungThan ? 0.2 : 0;

  // Cơ Duyên Khí Vận: KHAI THẦN NHÃN (Combo > 100 hoặc Accuracy 100%)
  const isKhaiThanNhan = (maxCombo >= 100) || (match.accuracy >= 100);
  if (isKhaiThanNhan) {
    const rarePool: HerbType[] = ['longTu', 'hoaAnh', 'huyenThiet'];
    const chosenRare = rarePool[Math.floor(Math.random() * rarePool.length)];
    currentHerbs[chosenRare] = (currentHerbs[chosenRare] || 0) + 1;
    droppedHerbs.push(chosenRare);
    const reasonText = maxCombo >= 100 ? `Combo ${maxCombo} từ` : 'Chuẩn Xác 100%';
    const ktnNotice = `👁️ [KHAI THẦN NHÃN] Cơ duyên bùng nổ (${reasonText})! Chắc chắn thu hoạch linh thảo Cực Phẩm [${HERBS_CONFIGS[chosenRare]?.name}]!`;
    updated.historyLog = [ktnNotice, ...updated.historyLog.slice(0, 19)];
  }

  // 1. Chế độ Tiếng Việt có dấu / Dài: Xác suất cao rơi Thiên Niên U Lan & Long Tu Thảo
  if (match.mode === 'vi_dau' || match.mode === 'vi_nodau') {
    if (Math.random() < 0.70 + ngungThanBonusRate) {
      currentHerbs.uLan = (currentHerbs.uLan || 0) + 1;
      droppedHerbs.push('uLan');
    }
    if (Math.random() < 0.30 + ngungThanBonusRate) {
      currentHerbs.longTu = (currentHerbs.longTu || 0) + 1;
      droppedHerbs.push('longTu');
    }
  }

  // 2. Chế độ Tiếng Anh / Tốc độ cao (WPM > 90): Rơi Huyết Tinh Thảo (nuôi dưỡng huyết khí, tăng Tu Vi)
  if (match.mode === 'en' || match.wpm > 90) {
    if (Math.random() < 0.75 + ngungThanBonusRate) {
      currentHerbs.huyetTinh = (currentHerbs.huyetTinh || 0) + 1;
      droppedHerbs.push('huyetTinh');
    }
  }

  // 3. Chế độ Bàn phím số (Numpad) / Đoán Chữ: Rơi Huyền Thiết Tinh Hoa & Hóa Anh Quả
  if (match.mode === 'numpad' || match.mode === 'doan_chu') {
    if (Math.random() < 0.60 + ngungThanBonusRate) {
      currentHerbs.huyenThiet = (currentHerbs.huyenThiet || 0) + 1;
      droppedHerbs.push('huyenThiet');
    }
    if (Math.random() < 0.45 + ngungThanBonusRate) {
      currentHerbs.hoaAnh = (currentHerbs.hoaAnh || 0) + 1;
      droppedHerbs.push('hoaAnh');
    }
  }

  // Săn Boss / Ngẫu Hứng / Outplay
  if (match.mode === 'san_boss' || match.mode === 'ngau_hung' || match.mode === 'outplay') {
    if (Math.random() < 0.65) {
      const gPool: HerbType[] = ['uLan', 'huyetTinh', 'hoaAnh'];
      const g = gPool[Math.floor(Math.random() * gPool.length)];
      currentHerbs[g] = (currentHerbs[g] || 0) + 1;
      droppedHerbs.push(g);
    }
    if (match.mode === 'san_boss' && Math.random() < 0.35 + ngungThanBonusRate) {
      currentHerbs.longTu = (currentHerbs.longTu || 0) + 1;
      droppedHerbs.push('longTu');
    }
  }

  // Luôn đảm bảo người chơi nhận tối thiểu 1 thảo dược cơ bản mỗi ván
  if (droppedHerbs.length === 0) {
    const fallbackHerb: HerbType = match.wpm >= 75 ? 'huyetTinh' : 'uLan';
    currentHerbs[fallbackHerb] = (currentHerbs[fallbackHerb] || 0) + 1;
    droppedHerbs.push(fallbackHerb);
  }

  updated.herbs = currentHerbs;

  // === 5. CẬP NHẬT NHIỆM VỤ HÀNG NGÀY ===
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

  // === 6. ÁP DỤNG TU VI VÀO TẦNG / CẢNH GIỚI ===
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

  saveStoredCultivationState(updated);

  return {
    updatedState: updated,
    expGained: actualExpGained,
    hitDailyCap,
    leveledUp,
    readyForBreakthrough,
    newRealmOrTierNotice,
    comboMultiplier,
    comboNotice,
    tamPhapNotice: [tamPhapNotice, daoLuNotice].filter(Boolean).join(' • ') || undefined,
    droppedHerbs,
    droppedPills,
    linhThachGained,
  };
}

/**
 * ⚡ Phế trừ Tu Vi do Bàn Cổ Thần Thức trừng phạt gian lận (500 Tu Vi)
 */
export function deductTuViPenalty(state: CultivationState, penaltyExp: number = 500): CultivationState {
  const updated: CultivationState = { ...state };
  const currentExp = Number(updated.exp) || 0;
  updated.exp = Math.max(0, currentExp - penaltyExp);
  const notice = `⚡ Bàn Cổ Trừng Phạt: Phế trừ ${penaltyExp} Tu Vi và đày vào U Minh Hàn Ngục (Cấm thi đấu 2 giờ)!`;
  updated.historyLog = [notice, ...(updated.historyLog || []).slice(0, 19)];
  return updated;
}

/**
 * Breakthrough Realm Attempt
 * "khi đột phá cảnh giới sẽ có tỷ lệ thất bại tăng dần khi cảnh giới lên cao khi đột phá thất bại sẽ về lại tầng 7."
 */
export function attemptRealmBreakthrough(
  state: CultivationState,
  usePhaCanh: boolean,
  useHoTam: boolean,
  forcedSuccess?: boolean
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

  const finalRate = forcedSuccess ? 100 : Math.min(100, currentRealm.baseBreakthroughRate + rateBonus);
  const roll = Math.random() * 100;
  const isSuccess = forcedSuccess ? true : roll < finalRate;

  if (isSuccess) {
    // Breakthrough SUCCESS!
    const nextRealmIndex = state.realmIndex + 1;
    const nextRealm = XIANXIA_REALMS[nextRealmIndex];
    const newLevel = nextRealm.startLevel;

    updated.realmIndex = nextRealmIndex;
    updated.tier = 1;
    updated.level = newLevel;
    updated.realmName = nextRealm.name;
    updated.subStage = 'Sơ Kỳ';
    updated.titleName = nextRealm.titleName;
    updated.exp = 0;
    updated.maxExp = getRequiredExpForTier(newLevel, nextRealmIndex);
    // Reset Thọ Nguyên to 100% for the new higher realm!
    updated.thoNguyen = nextRealm.maxThoNguyen;
    updated.maxThoNguyen = nextRealm.maxThoNguyen;

    const victoryMsg = forcedSuccess
      ? `⚡ [NGHÊNH LÔI ĐẠI THÀNH CÔNG] Dũng khí ngút trời trảm phá lôi kiếp! Đột phá cảnh giới thành công lên ${nextRealm.name} Tầng 1 (Sơ Kỳ)! Khai mở Khung & Danh Hiệu [${nextRealm.titleName}]!`
      : `🌟 [ĐỘ KIẾP THÀNH CÔNG] Phá vỡ bình chướng, đăng tiên nhập cảnh! Đạt đến ${nextRealm.name} Tầng 1 (Sơ Kỳ)! Khai mở Khung & Danh Hiệu [${nextRealm.titleName}]!`;
    updated.historyLog = [victoryMsg, ...updated.historyLog.slice(0, 19)];

    saveStoredCultivationState(updated);

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
    saveStoredCultivationState(updated);

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

/**
 * Use Định Tâm Đan (Giảm 50% ảnh hưởng lỗi trong 3 ván tiếp theo)
 */
export function useDinhTamPill(state: CultivationState): {
  success: boolean;
  updatedState: CultivationState;
  message: string;
} {
  const currentCount = state.pillCount.dinhTam || 0;
  if (currentCount <= 0) {
    return { success: false, updatedState: state, message: 'Không còn Định Tâm Đan trong túi!' };
  }

  let updated = { ...state };
  updated.pillCount = {
    ...updated.pillCount,
    dinhTam: currentCount - 1,
  };
  const prevRemaining = updated.activeBuffs?.dinhTamMatchesRemaining || 0;
  updated.activeBuffs = {
    ...(updated.activeBuffs || {}),
    dinhTamMatchesRemaining: prevRemaining + 3,
  };

  const msg = `🧘 Uống Định Tâm Đan: Tâm cảnh tĩnh như gương sáng! Trong 3 ván tiếp theo giảm 50% ảnh hưởng từ gõ sai vào WPM!`;
  updated.historyLog = [msg, ...updated.historyLog.slice(0, 19)];
  saveStoredCultivationState(updated);

  return { success: true, updatedState: updated, message: msg };
}

/**
 * Use Ngưng Thần Đan (Tăng 20% khả năng rơi thảo dược quý trong 3 ván tiếp theo)
 */
export function useNgungThanPill(state: CultivationState): {
  success: boolean;
  updatedState: CultivationState;
  message: string;
} {
  const currentCount = state.pillCount.ngungThan || 0;
  if (currentCount <= 0) {
    return { success: false, updatedState: state, message: 'Không còn Ngưng Thần Đan trong túi!' };
  }

  let updated = { ...state };
  updated.pillCount = {
    ...updated.pillCount,
    ngungThan: currentCount - 1,
  };
  const prevRemaining = updated.activeBuffs?.ngungThanMatchesRemaining || 0;
  updated.activeBuffs = {
    ...(updated.activeBuffs || {}),
    ngungThanMatchesRemaining: prevRemaining + 3,
  };

  const msg = `👁️ Uống Ngưng Thần Đan: Thần thức mở rộng bao quát càn khôn! Trong 3 ván tiếp theo tăng 20% tỷ lệ thu hoạch dược liệu quý hiếm!`;
  updated.historyLog = [msg, ...updated.historyLog.slice(0, 19)];
  saveStoredCultivationState(updated);

  return { success: true, updatedState: updated, message: msg };
}

// =========================================================================
// === VẠN ĐẠO QUY TÔNG: LUYỆN ĐAN PHÒNG & HỎA HẦU (INTERACTIVE ALCHEMY) ===
// =========================================================================

/**
 * Khai Lò Luyện Đan Bát Quái
 * Tỷ lệ 20% luyện ra "Cực Phẩm Đan Dược" (Đan Văn Ngũ Sắc) công hiệu gấp 3!
 */
export function craftAlchemy(
  state: CultivationState,
  recipeId: 'thoNguyen' | 'hoTam' | 'phaCanh' | 'dinhTam' | 'ngungThan' | 'vanNienTuVi'
): {
  success: boolean;
  isSuperTier: boolean;
  exploded?: boolean;
  updatedState: CultivationState;
  message: string;
  pillObtained: string;
  quantity: number;
} {
  return craftAlchemyInteractive(state, recipeId, { isGoodRhythm: false, isOverheatFail: false });
}

/**
 * Luyện Đan Bát Quái tương tác hỏa hầu (Interactive Alchemy)
 * - isGoodRhythm: Gõ chuẩn ấn chú, nhịp độ chân hỏa ổn định -> Tăng vọt tỷ lệ Cực Phẩm Đan Dược (x3 số lượng)
 * - isOverheatFail: Gõ quá nhiều lỗi hoặc quá nhiệt -> Nguy cơ nổ lò (Đan phệ) làm mất một phần dược liệu!
 */
export function craftAlchemyInteractive(
  state: CultivationState,
  recipeId: 'thoNguyen' | 'hoTam' | 'phaCanh' | 'dinhTam' | 'ngungThan' | 'vanNienTuVi',
  options: {
    isGoodRhythm?: boolean;
    isOverheatFail?: boolean;
  } = {}
): {
  success: boolean;
  isSuperTier: boolean;
  exploded?: boolean;
  updatedState: CultivationState;
  message: string;
  pillObtained: string;
  quantity: number;
} {
  const recipe = ALCHEMY_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) {
    return {
      success: false,
      isSuperTier: false,
      updatedState: state,
      message: 'Không tìm thấy đan phương này!',
      pillObtained: '',
      quantity: 0,
    };
  }

  const currentHerbs = { ...(state.herbs || { uLan: 0, huyetTinh: 0, hoaAnh: 0, huyenThiet: 0, longTu: 0 }) };

  // Kiểm tra đủ nguyên liệu không
  for (const [herbKey, reqCount] of Object.entries(recipe.ingredients)) {
    const key = herbKey as HerbType;
    if ((currentHerbs[key] || 0) < (reqCount || 0)) {
      const herbConfig = HERBS_CONFIGS[key];
      return {
        success: false,
        isSuperTier: false,
        updatedState: state,
        message: `Thiếu thảo dược: cần ${reqCount} ${herbConfig?.name || key}, hiện có ${currentHerbs[key] || 0}!`,
        pillObtained: '',
        quantity: 0,
      };
    }
  }

  // Trường hợp NỔ LÒ (ĐAN PHỆ) do gõ ấn chú quá sai hoặc quá nhiệt:
  if (options.isOverheatFail) {
    // Hao tổn 1 thảo dược bất kỳ trong công thức
    const ingKeys = Object.keys(recipe.ingredients) as HerbType[];
    const lostHerb = ingKeys[Math.floor(Math.random() * ingKeys.length)];
    if (lostHerb && (currentHerbs[lostHerb] || 0) > 0) {
      currentHerbs[lostHerb] -= 1;
    }

    const explodeState: CultivationState = {
      ...state,
      herbs: currentHerbs,
    };

    const explodeMsg = `💥 [NỔ LÒ ĐAN PHỆ] Hỏa hầu mất khống chế, đan điền chấn động! Lò đan phát nổ làm tổn hao 1 ${HERBS_CONFIGS[lostHerb]?.name || 'thảo dược'}!`;
    explodeState.historyLog = [explodeMsg, ...explodeState.historyLog.slice(0, 19)];
    saveStoredCultivationState(explodeState);

    return {
      success: false,
      isSuperTier: false,
      exploded: true,
      updatedState: explodeState,
      message: explodeMsg,
      pillObtained: '',
      quantity: 0,
    };
  }

  // Khấu trừ nguyên liệu tiêu chuẩn
  for (const [herbKey, reqCount] of Object.entries(recipe.ingredients)) {
    const key = herbKey as HerbType;
    currentHerbs[key] = Math.max(0, (currentHerbs[key] || 0) - (reqCount || 0));
  }

  let updated: CultivationState = {
    ...state,
    herbs: currentHerbs,
    pillCount: { ...state.pillCount },
  };

  // Xác suất xuất hiện Cực Phẩm Đan Dược:
  // Nếu có nhịp gõ tốt (isGoodRhythm) -> Tỷ lệ lên tới 60%, bình thường 22%
  const superChance = options.isGoodRhythm ? 0.65 : 0.22;
  const isSuperTier = Math.random() < superChance;
  const quantity = isSuperTier ? 3 : 1;

  if (recipe.pillKey === 'thoNguyen') {
    updated.pillCount.thoNguyen = (updated.pillCount.thoNguyen || 0) + quantity;
  } else if (recipe.pillKey === 'hoTam') {
    updated.pillCount.hoTam = (updated.pillCount.hoTam || 0) + quantity;
  } else if (recipe.pillKey === 'phaCanh') {
    updated.pillCount.phaCanh = (updated.pillCount.phaCanh || 0) + quantity;
  } else if (recipe.pillKey === 'dinhTam') {
    updated.pillCount.dinhTam = (updated.pillCount.dinhTam || 0) + quantity;
  } else if (recipe.pillKey === 'ngungThan') {
    updated.pillCount.ngungThan = (updated.pillCount.ngungThan || 0) + quantity;
  } else if (recipe.pillKey === 'sieuCapTuViDan') {
    updated.pillCount.sieuCapTuViDan = (updated.pillCount.sieuCapTuViDan || 0) + quantity;
  }

  const resultMsg = isSuperTier
    ? `✨ [DỊ TƯỢNG BỘC PHÁT] Ấn chú thần sầu! Luyện thành công ${quantity} viên CỰC PHẨM ${recipe.name} (Đan Văn Ngũ Sắc x3 hiệu quả)!`
    : `🧪 [THÀNH ĐAN] Hỏa hầu điều hòa, luyện thành công ${quantity} viên ${recipe.name}!`;

  updated.historyLog = [resultMsg, ...updated.historyLog.slice(0, 19)];
  saveStoredCultivationState(updated);

  return {
    success: true,
    isSuperTier,
    exploded: false,
    updatedState: updated,
    message: resultMsg,
    pillObtained: recipe.name,
    quantity,
  };
}

// =========================================================================
// === VẠN ĐẠO QUY TÔNG: TÂM PHÁP & PHÁP BẢO (ARTIFACTS & MANTRA) ===
// =========================================================================

export function equipTamPhap(state: CultivationState, tamPhap: TamPhapType | null): CultivationState {
  const updated: CultivationState = {
    ...state,
    tamPhap: {
      equipped: tamPhap,
      matchesSinceHeal: state.tamPhap?.matchesSinceHeal || 0,
    },
  };
  const config = tamPhap ? TAM_PHAP_CONFIGS[tamPhap] : null;
  const msg = config
    ? `🗡️ Đạo tâm chuyển đổi: Đã vận hành tâm pháp ${config.name}!`
    : `Đã thu hồi tâm pháp.`;
  updated.historyLog = [msg, ...updated.historyLog.slice(0, 19)];
  saveStoredCultivationState(updated);
  return updated;
}

export function equipArtifact(state: CultivationState, artifact: ArtifactType | null): CultivationState {
  const updated: CultivationState = {
    ...state,
    artifacts: {
      equipped: artifact,
      levels: state.artifacts?.levels || {
        thanh_van_kiem: 1,
        hao_thien_kinh: 0,
        cuu_pham_lien: 0,
        ban_co_phu: 0,
      },
    },
  };
  const config = artifact ? ARTIFACT_CONFIGS[artifact] : null;
  const msg = config
    ? `⚔️ Bản mệnh tế luyện: Đã kích hoạt pháp bảo ${config.name}!`
    : `Đã thu hồi pháp bảo.`;
  updated.historyLog = [msg, ...updated.historyLog.slice(0, 19)];
  saveStoredCultivationState(updated);
  return updated;
}

export function upgradeArtifact(
  state: CultivationState,
  artifact: ArtifactType
): { success: boolean; updatedState: CultivationState; message: string } {
  const currentLevel = state.artifacts?.levels?.[artifact] ?? (artifact === 'thanh_van_kiem' ? 1 : 0);
  if (currentLevel >= 10) {
    return { success: false, updatedState: state, message: 'Pháp bảo đã đạt phẩm cấp tối đa (Cấp 10)!' };
  }

  const upgradeCostLinhThach = (currentLevel + 1) * 80;
  const upgradeCostHuyenThiet = Math.max(1, Math.floor(currentLevel / 2));

  const currentLinhThach = state.linhThach || 0;
  const currentHuyenThiet = state.herbs?.huyenThiet || 0;

  if (currentLinhThach < upgradeCostLinhThach) {
    return {
      success: false,
      updatedState: state,
      message: `Thiếu Linh Thạch: cần ${upgradeCostLinhThach}, hiện có ${currentLinhThach}!`,
    };
  }
  if (currentHuyenThiet < upgradeCostHuyenThiet) {
    return {
      success: false,
      updatedState: state,
      message: `Thiếu Huyền Thiết Tinh Hoa: cần ${upgradeCostHuyenThiet}, hiện có ${currentHuyenThiet}!`,
    };
  }

  const nextLevel = currentLevel + 1;
  const updated: CultivationState = {
    ...state,
    linhThach: currentLinhThach - upgradeCostLinhThach,
    herbs: {
      ...(state.herbs || { uLan: 0, huyetTinh: 0, hoaAnh: 0, huyenThiet: 0, longTu: 0 }),
      huyenThiet: currentHuyenThiet - upgradeCostHuyenThiet,
    },
    artifacts: {
      equipped: state.artifacts?.equipped || artifact,
      levels: {
        ...(state.artifacts?.levels || { thanh_van_kiem: 1, hao_thien_kinh: 0, cuu_pham_lien: 0, ban_co_phu: 0 }),
        [artifact]: nextLevel,
      },
    },
  };

  const config = ARTIFACT_CONFIGS[artifact];
  const msg = `🔥 Tôi luyện thành công: ${config.name} thăng hoa lên Cấp ${nextLevel}!`;
  updated.historyLog = [msg, ...updated.historyLog.slice(0, 19)];
  saveStoredCultivationState(updated);

  return { success: true, updatedState: updated, message: msg };
}

// =========================================================================
// === VẠN ĐẠO QUY TÔNG: TÔNG MÔN ĐẠI CHIẾN & ĐỘNG PHỦ (SECTS SYSTEM) ===
// =========================================================================

const SECTS_STORAGE_KEY = 'fasttyping_xianxia_sects_v1';

export function calculateSectTotalTuVi(sect: SectInfo): number {
  if (Array.isArray(sect.members) && sect.members.length > 0) {
    const sum = sect.members.reduce((acc, m) => acc + (m.tuViScore || 0), 0);
    if (sum > 0) return sum;
  }
  return sect.totalTuVi || 1000000;
}

export function getStoredSects(): SectInfo[] {
  if (typeof window === 'undefined') return DEFAULT_SECTS;
  try {
    const raw = localStorage.getItem(SECTS_STORAGE_KEY);
    if (!raw) {
      saveStoredSects(DEFAULT_SECTS);
      return DEFAULT_SECTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure all sects have members array and totalTuVi
      return parsed.map((s: SectInfo) => {
        const defaultMatch = DEFAULT_SECTS.find((d) => d.id === s.id);
        const members = s.members && s.members.length > 0 ? s.members : defaultMatch?.members || [];
        const totalTuVi = calculateSectTotalTuVi({ ...s, members });
        return {
          ...s,
          members,
          totalTuVi,
          leaderAvatar: s.leaderAvatar || defaultMatch?.leaderAvatar || '⚔️',
          leaderFrame: s.leaderFrame || defaultMatch?.leaderFrame || 'frame_xianxia_dokiep',
          leaderRealmName: s.leaderRealmName || defaultMatch?.leaderRealmName || 'Đại Thừa Kỳ',
          leaderLevel: s.leaderLevel || defaultMatch?.leaderLevel || 500,
          avgLevel: s.avgLevel || defaultMatch?.avgLevel || 350,
          avgRealmName: s.avgRealmName || defaultMatch?.avgRealmName || 'Hóa Thần Kỳ',
        };
      });
    }
    return DEFAULT_SECTS;
  } catch {
    return DEFAULT_SECTS;
  }
}

export function saveStoredSects(sects: SectInfo[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SECTS_STORAGE_KEY, JSON.stringify(sects));
  } catch {}
}

/**
 * Lấy Bảng Xếp Hạng Tông Môn sắp xếp theo Tổng Tu Vi Thành Viên (Sect Cultivation Leaderboard)
 */
export function getSectsLeaderboard(): SectLeaderboardEntry[] {
  const sects = getStoredSects();

  const enriched = sects.map((s) => {
    const totalTuVi = calculateSectTotalTuVi(s);
    const members = s.members || [];
    const count = Math.max(members.length, s.memberCount || 1);
    const avgLvl = members.length > 0
      ? Math.round(members.reduce((acc, m) => acc + (m.level || 1), 0) / members.length)
      : s.avgLevel || 350;

    const realmIndexAvg = members.length > 0
      ? Math.round(members.reduce((acc, m) => acc + (m.realmIndex || 0), 0) / members.length)
      : 4;
    const avgRealmName = XIANXIA_REALMS[realmIndexAvg]?.name || 'Hóa Thần Kỳ';

    // Top members in sect
    const topMembers = [...members].sort((a, b) => (b.tuViScore || 0) - (a.tuViScore || 0)).slice(0, 5);

    return {
      id: s.id,
      name: s.name,
      tag: s.tag,
      description: s.description,
      slogan: s.slogan,
      bannerColor: s.bannerColor,
      badgeIcon: s.badgeIcon,
      leaderId: s.leaderId,
      leaderName: s.leaderName,
      leaderAvatar: s.leaderAvatar || '👑',
      leaderFrame: s.leaderFrame || 'frame_xianxia_dokiep',
      leaderRealmName: s.leaderRealmName || 'Độ Kiếp Kỳ',
      leaderLevel: s.leaderLevel || 800,
      memberCount: count,
      totalTuVi,
      avgLevel: avgLvl,
      avgRealmName,
      linhMachLevel: s.linhMachLevel || 1,
      totalContribution: s.totalContribution || 0,
      weeklyTournamentPoints: s.weeklyTournamentPoints || 0,
      isHoldingThienCung: Boolean(s.isHoldingThienCung),
      topMembers,
      members,
      createdAt: s.createdAt,
    };
  });

  // Sắp xếp thứ hạng dựa trên Tổng Tu Vi Thành Viên giảm dần
  enriched.sort((a, b) => b.totalTuVi - a.totalTuVi);

  return enriched.map((s, index) => ({
    ...s,
    rank: index + 1,
  }));
}

export function joinSect(
  state: CultivationState,
  sectId: string,
  username: string = 'Đạo Hữu',
  userAvatar: string = '⚡',
  userFrame: string = 'default'
): CultivationState {
  const sects = getStoredSects();
  const targetSect = sects.find((s) => s.id === sectId);
  if (!targetSect) return state;

  const oldSectId = state.sect?.sectId;
  const realmMeta = XIANXIA_REALMS[state.realmIndex] || XIANXIA_REALMS[0];
  const userTuVi = (state.realmIndex * 1_000_000) + (state.level * 10_000) + (state.tier * 1_000) + (state.exp || 0);

  const updatedSects = sects.map((s) => {
    let currentMembers = s.members ? [...s.members] : [];

    // Nếu rời tông môn cũ
    if (s.id === oldSectId && s.id !== sectId) {
      currentMembers = currentMembers.filter((m) => String(m.username || '').toLowerCase() !== String(username || '').toLowerCase());
      const newTuVi = currentMembers.reduce((acc, m) => acc + (m.tuViScore || 0), 0);
      return {
        ...s,
        memberCount: Math.max(1, currentMembers.length),
        members: currentMembers,
        totalTuVi: newTuVi,
      };
    }

    // Nếu bái nhập tông môn mới
    if (s.id === sectId) {
      const existingMember = currentMembers.find((m) => String(m.username || '').toLowerCase() === String(username || '').toLowerCase());
      if (!existingMember) {
        currentMembers.push({
          userId: `usr_${username}_${Date.now()}`,
          username,
          displayName: username,
          avatar: userAvatar,
          frame: userFrame,
          role: 'ngoai_mon', // Tân đệ tử luôn khởi đầu từ Ngoại Môn
          contribution: 50,
          realmIndex: state.realmIndex,
          realmName: realmMeta.name,
          realmIcon: realmMeta.icon,
          level: state.level,
          tier: state.tier,
          exp: state.exp || 0,
          tuViScore: userTuVi,
          joinedAt: Date.now(),
        });
      }
      const newTuVi = currentMembers.reduce((acc, m) => acc + (m.tuViScore || 0), 0);
      return {
        ...s,
        memberCount: currentMembers.length,
        members: currentMembers,
        totalTuVi: newTuVi,
      };
    }

    return s;
  });

  saveStoredSects(updatedSects);

  const updated: CultivationState = {
    ...state,
    sect: {
      sectId: targetSect.id,
      sectName: targetSect.name,
      sectTag: targetSect.tag,
      role: 'ngoai_mon',
      contribution: state.sect?.sectId === sectId ? state.sect.contribution : 50,
      joinedAt: Date.now(),
    },
  };

  const msg = `🏰 Bái nhập Tông Môn: Chúc mừng đạo hữu trở thành Ngoại Môn Đệ Tử của ${targetSect.name} [${targetSect.tag}]!`;
  updated.historyLog = [msg, ...updated.historyLog.slice(0, 19)];
  saveStoredCultivationState(updated);
  return updated;
}

export function leaveSect(
  state: CultivationState,
  username: string = 'Đạo Hữu'
): { success: boolean; updatedState: CultivationState; message: string } {
  if (!state.sect?.sectId) {
    return { success: false, updatedState: state, message: 'Đạo hữu hiện tại không thuộc môn phái nào!' };
  }

  const sects = getStoredSects();
  const currentSect = sects.find((s) => s.id === state.sect?.sectId);

  // Nếu là Chưởng Môn và phái vẫn còn đệ tử khác, không được tùy tiện bỏ phái mà phải truyền ngôi
  if (state.sect.role === 'chuong_mon' && currentSect) {
    const otherMembers = (currentSect.members || []).filter((m) => String(m.username || '').toLowerCase() !== String(username || '').toLowerCase());
    if (otherMembers.length > 0) {
      return {
        success: false,
        updatedState: state,
        message: 'Chưởng Môn là nguyên thủ một phái! Cần truyền vị Chưởng Môn cho đồng đạo khác trước khi thoái ẩn.',
      };
    }
  }

  // Loại bỏ người chơi khỏi danh sách môn phái
  const updatedSects = sects.map((s) => {
    if (s.id === state.sect?.sectId) {
      const filtered = (s.members || []).filter((m) => String(m.username || '').toLowerCase() !== String(username || '').toLowerCase());
      const newTuVi = filtered.reduce((acc, m) => acc + (m.tuViScore || 0), 0);
      return {
        ...s,
        memberCount: Math.max(0, filtered.length),
        members: filtered,
        totalTuVi: newTuVi,
      };
    }
    return s;
  });

  saveStoredSects(updatedSects);

  const updated: CultivationState = {
    ...state,
    sect: undefined,
  };

  const msg = `🚪 [XUẤT SƯ THOÁI PHÁI] Đạo hữu đã rời khỏi môn phái, trở về thân phận tán tu tự tại.`;
  updated.historyLog = [msg, ...updated.historyLog.slice(0, 19)];
  saveStoredCultivationState(updated);

  return { success: true, updatedState: updated, message: msg };
}

export function updateSectMemberRole(
  state: CultivationState,
  targetUsername: string,
  newRole: SectRole
): { success: boolean; message: string; updatedSects: SectInfo[] } {
  const currentRole = state.sect?.role;
  const sectId = state.sect?.sectId;

  if (!sectId) {
    return { success: false, message: 'Đạo hữu không có môn phái!', updatedSects: getStoredSects() };
  }

  // Kiểm tra quyền hạn
  if (currentRole !== 'chuong_mon' && currentRole !== 'dai_truong_lao') {
    return { success: false, message: 'Chỉ có Chưởng Môn hoặc Đại Trưởng Lão mới có quyền tấn phong/bãi miễn chức vị!', updatedSects: getStoredSects() };
  }

  if (newRole === 'chuong_mon' && currentRole !== 'chuong_mon') {
    return { success: false, message: 'Chỉ có Chưởng Môn tiền nhiệm mới có thể truyền vị Chưởng Môn!', updatedSects: getStoredSects() };
  }

  if (newRole === 'dai_truong_lao' && currentRole !== 'chuong_mon') {
    return { success: false, message: 'Chỉ có Chưởng Môn mới có quyền bổ nhiệm Đại Trưởng Lão!', updatedSects: getStoredSects() };
  }

  const sects = getStoredSects();
  const targetSect = sects.find((s) => s.id === sectId);
  if (!targetSect) {
    return { success: false, message: 'Không tìm thấy môn phái!', updatedSects: sects };
  }

  const members = targetSect.members || [];
  const targetMember = members.find((m) => String(m.username || '').toLowerCase() === String(targetUsername || '').toLowerCase());
  if (!targetMember) {
    return { success: false, message: 'Không tìm thấy đệ tử này trong môn phái!', updatedSects: sects };
  }

  // Tấn phong
  targetMember.role = newRole;

  // Nếu truyền ngôi Chưởng Môn, Chưởng Môn cũ chuyển thành Đại Trưởng Lão
  if (newRole === 'chuong_mon') {
    targetSect.leaderId = targetMember.userId;
    targetSect.leaderName = targetMember.username;
    targetSect.leaderAvatar = targetMember.avatar;
    targetSect.leaderFrame = targetMember.frame;
    targetSect.leaderRealmName = targetMember.realmName;
    targetSect.leaderLevel = targetMember.level;
  }

  saveStoredSects(sects);
  const roleName = SECT_ROLES_CONFIG[newRole].title;
  return {
    success: true,
    message: `✨ Đã tấn phong đệ tử ${targetMember.displayName || targetMember.username} làm [${roleName}]!`,
    updatedSects: sects,
  };
}

export function kickSectMember(
  state: CultivationState,
  targetUsername: string
): { success: boolean; message: string; updatedSects: SectInfo[] } {
  const currentRole = state.sect?.role;
  const sectId = state.sect?.sectId;

  if (!sectId) {
    return { success: false, message: 'Đạo hữu không có môn phái!', updatedSects: getStoredSects() };
  }

  if (currentRole !== 'chuong_mon' && currentRole !== 'dai_truong_lao') {
    return { success: false, message: 'Chỉ có Chưởng Môn hoặc Đại Trưởng Lão mới có quyền trục xuất đệ tử!', updatedSects: getStoredSects() };
  }

  const sects = getStoredSects();
  const targetSect = sects.find((s) => s.id === sectId);
  if (!targetSect) {
    return { success: false, message: 'Không tìm thấy môn phái!', updatedSects: sects };
  }

  const member = (targetSect.members || []).find((m) => String(m.username || '').toLowerCase() === String(targetUsername || '').toLowerCase());
  if (!member) {
    return { success: false, message: 'Không tìm thấy đệ tử trong môn phái!', updatedSects: sects };
  }

  if (member.role === 'chuong_mon') {
    return { success: false, message: 'Không thể trục xuất Chưởng Môn!', updatedSects: sects };
  }

  if (currentRole === 'dai_truong_lao' && (member.role === 'dai_truong_lao' || member.role === 'chan_truyen')) {
    return { success: false, message: 'Đại Trưởng Lão không thể trục xuất đệ tử đồng cấp hoặc Chân Truyền!', updatedSects: sects };
  }

  targetSect.members = (targetSect.members || []).filter((m) => String(m.username || '').toLowerCase() !== String(targetUsername || '').toLowerCase());
  targetSect.memberCount = targetSect.members.length;
  targetSect.totalTuVi = calculateSectTotalTuVi(targetSect);

  saveStoredSects(sects);
  return {
    success: true,
    message: `⚡ Đã trục xuất ${member.displayName || member.username} khỏi môn phái!`,
    updatedSects: sects,
  };
}

export function contributeToSect(
  state: CultivationState,
  sectId: string,
  amount: number
): { success: boolean; updatedState: CultivationState; message: string } {
  const currentLinhThach = state.linhThach || 0;
  if (currentLinhThach < amount) {
    return {
      success: false,
      updatedState: state,
      message: `Thiếu Linh Thạch: cần ${amount}, hiện có ${currentLinhThach}!`,
    };
  }

  const sects = getStoredSects();
  const targetSect = sects.find((s) => s.id === sectId);
  if (!targetSect) {
    return { success: false, updatedState: state, message: 'Tông môn không tồn tại!' };
  }

  targetSect.totalContribution = (targetSect.totalContribution || 0) + amount;

  // Tự động kiểm tra thăng cấp Linh Mạch nếu tích lũy đủ
  const lmThresholds = [0, 5000, 15000, 30000, 60000];
  const nextLevel = Math.min(5, (targetSect.linhMachLevel || 1) + 1);
  let didLinhMachLevelUp = false;
  if (targetSect.linhMachLevel < 5 && targetSect.totalContribution >= lmThresholds[targetSect.linhMachLevel]) {
    targetSect.linhMachLevel = nextLevel;
    didLinhMachLevelUp = true;
  }
  saveStoredSects(sects);

  const updated: CultivationState = {
    ...state,
    linhThach: currentLinhThach - amount,
    sect: {
      ...(state.sect || { sectId: targetSect.id, sectName: targetSect.name, role: 'ngoai_mon', contribution: 0 }),
      contribution: (state.sect?.contribution || 0) + amount,
    },
  };

  const msg = didLinhMachLevelUp
    ? `🌟 [LINH MẠCH ĐỘT PHÁ] Đóng góp ${amount} Linh Thạch! Linh Mạch ${targetSect.name} đã thăng lên Cấp ${targetSect.linhMachLevel}!`
    : `🏰 Đóng góp ${amount} Linh Thạch cho ${targetSect.name}, cống hiến cá nhân tăng +${amount}!`;

  updated.historyLog = [msg, ...updated.historyLog.slice(0, 19)];
  saveStoredCultivationState(updated);

  return { success: true, updatedState: updated, message: msg };
}

export function createSect(
  state: CultivationState,
  name: string,
  tag: string,
  desc: string,
  icon: string,
  username: string,
  userAvatar: string = '👑',
  userFrame: string = 'default'
): { success: boolean; updatedState: CultivationState; message: string; newSect?: SectInfo } {
  // Yêu cầu tối thiểu: Cảnh giới Trúc Cơ trở lên (level >= 31) và 300 Linh Thạch
  if (state.level < 31) {
    return { success: false, updatedState: state, message: 'Cần đạt cảnh giới Trúc Cơ Kỳ trở lên mới có thể Khai Sơn Lập Phái!' };
  }
  const cost = 300;
  if ((state.linhThach || 0) < cost) {
    return { success: false, updatedState: state, message: `Khai sơn lập phái cần ${cost} Linh Thạch, đạo hữu chưa đủ!` };
  }

  const sects = getStoredSects();
  if (sects.some((s) => s.name.toLowerCase() === name.trim().toLowerCase() || s.tag.toLowerCase() === tag.trim().toLowerCase())) {
    return { success: false, updatedState: state, message: 'Tên hoặc Tông Huy Hiệu này đã có môn phái sử dụng!' };
  }

  const realmMeta = XIANXIA_REALMS[state.realmIndex] || XIANXIA_REALMS[0];
  const userTuVi = (state.realmIndex * 1_000_000) + (state.level * 10_000) + (state.tier * 1_000) + (state.exp || 0);

  const founderMember: SectMemberRecord = {
    userId: `founder_${Date.now()}`,
    username,
    displayName: username,
    avatar: userAvatar,
    frame: userFrame,
    role: 'chuong_mon',
    contribution: 500,
    realmIndex: state.realmIndex,
    realmName: realmMeta.name,
    realmIcon: realmMeta.icon,
    level: state.level,
    tier: state.tier,
    exp: state.exp || 0,
    tuViScore: userTuVi,
    joinedAt: Date.now(),
  };

  const newSect: SectInfo = {
    id: `sect_custom_${Date.now()}`,
    name: name.trim(),
    tag: tag.trim().toUpperCase(),
    description: desc.trim() || 'Một tông môn ẩn thế quật khởi tại cõi tu tiên.',
    leaderId: founderMember.userId,
    leaderName: username,
    leaderAvatar: userAvatar,
    leaderFrame: userFrame,
    leaderRealmName: realmMeta.name,
    leaderLevel: state.level,
    linhMachLevel: 1,
    totalContribution: 500,
    memberCount: 1,
    totalTuVi: userTuVi,
    avgLevel: state.level,
    avgRealmName: realmMeta.name,
    badgeIcon: icon || '⚡',
    slogan: 'Khai Sơn Lập Phái • Vạn Cổ Trường Tồn',
    bannerColor: '#f59e0b',
    weeklyTournamentPoints: 100,
    isHoldingThienCung: false,
    members: [founderMember],
    createdAt: Date.now(),
  };

  sects.push(newSect);
  saveStoredSects(sects);

  const updated: CultivationState = {
    ...state,
    linhThach: (state.linhThach || 0) - cost,
    sect: {
      sectId: newSect.id,
      sectName: newSect.name,
      sectTag: newSect.tag,
      role: 'chuong_mon',
      contribution: 500,
      joinedAt: Date.now(),
    },
  };

  const msg = `👑 [KHAI SƠN LẬP PHÁI] Chúc mừng đạo hữu sáng lập ${newSect.name} [${newSect.tag}], tôn xưng Chưởng Môn!`;
  updated.historyLog = [msg, ...updated.historyLog.slice(0, 19)];
  saveStoredCultivationState(updated);

  return { success: true, updatedState: updated, message: msg, newSect };
}

// === CẤU HÌNH THỨ BẬC TÔNG MÔN (SECT HIERARCHY) ===
export const SECT_ROLES_CONFIG: Record<
  SectRole,
  {
    title: string;
    badge: string;
    rankLevel: number;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    glowClass: string;
    privilege: string;
    minContribution: number;
    isOfficer: boolean;
  }
> = {
  chuong_mon: {
    title: 'Chưởng Môn',
    badge: '👑',
    rankLevel: 5,
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-400/60',
    glowClass: 'shadow-[0_0_15px_rgba(251,191,36,0.35)]',
    privilege: 'Đứng đầu môn phái, tấn phong/bãi miễn chức vụ, mở Vây Quét & Tỷ Võ',
    minContribution: 0,
    isOfficer: true,
  },
  dai_truong_lao: {
    title: 'Đại Trưởng Lão',
    badge: '⭐',
    rankLevel: 4,
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-400/60',
    glowClass: 'shadow-[0_0_12px_rgba(168,85,247,0.3)]',
    privilege: 'Hộ trì linh mạch, đốc thúc đệ tử, quyền thăng cấp Chân Truyền & Nội Môn',
    minContribution: 2000,
    isOfficer: true,
  },
  chan_truyen: {
    title: 'Chân Truyền Đệ Tử',
    badge: '⚡',
    rankLevel: 3,
    colorClass: 'text-cyan-400',
    bgClass: 'bg-cyan-500/10',
    borderClass: 'border-cyan-400/60',
    glowClass: 'shadow-[0_0_10px_rgba(6,182,212,0.25)]',
    privilege: 'Hưởng 120% linh khí từ Linh Mạch, đại diện xuất chiến Tỷ Võ chính',
    minContribution: 1000,
    isOfficer: false,
  },
  noi_mon: {
    title: 'Nội Môn Đệ Tử',
    badge: '🛡️',
    rankLevel: 2,
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-400/60',
    glowClass: '',
    privilege: 'Hưởng 100% linh khí từ Linh Mạch, tham gia Vây Quét Thần Thú Trấn Giới',
    minContribution: 400,
    isOfficer: false,
  },
  ngoai_mon: {
    title: 'Ngoại Môn Đệ Tử',
    badge: '🌿',
    rankLevel: 1,
    colorClass: 'text-slate-400',
    bgClass: 'bg-slate-800/40',
    borderClass: 'border-slate-600',
    glowClass: '',
    privilege: 'Mới bái nhập môn phái, làm nhiệm vụ cống hiến để thăng Nội Môn',
    minContribution: 0,
    isOfficer: false,
  },
};

/**
 * Tấn công Thần Thú Trấn Giới Tông Môn (World Boss)
 */
export function attackSectWorldBoss(
  state: CultivationState,
  sectId: string,
  damage: number
): {
  success: boolean;
  bossDefeated: boolean;
  remainingHp: number;
  maxHp: number;
  damageDealt: number;
  updatedState: CultivationState;
  message: string;
  rewards?: {
    linhThach: number;
    tuVi: number;
    herbs: HerbType[];
    pills: string[];
  };
} {
  const sects = getStoredSects();
  const sect = sects.find((s) => s.id === sectId);
  if (!sect) {
    return {
      success: false,
      bossDefeated: false,
      remainingHp: 0,
      maxHp: 0,
      damageDealt: 0,
      updatedState: state,
      message: 'Không tìm thấy Tông Môn!',
    };
  }

  // Khởi tạo Boss nếu chưa có
  if (!sect.worldBoss) {
    sect.worldBoss = {
      id: `boss_${sect.id}`,
      name: 'Thái Cổ Hắc Long',
      icon: '🐉',
      hp: 180000,
      maxHp: 180000,
      level: 10,
      isDefeated: false,
      lastResetTime: Date.now(),
    };
  }

  const wb = sect.worldBoss;
  const actualDamage = Math.max(100, Math.round(damage));
  wb.hp = Math.max(0, wb.hp - actualDamage);

  let bossDefeated = false;
  let rewards: {
    linhThach: number;
    tuVi: number;
    herbs: HerbType[];
    pills: string[];
  } | undefined;

  let updatedState = { ...state };

  if (wb.hp <= 0 && !wb.isDefeated) {
    wb.isDefeated = true;
    wb.hp = 0;
    bossDefeated = true;

    // Phần thưởng tiêu diệt Boss cho đệ tử xuất kích
    rewards = {
      linhThach: 120,
      tuVi: 1500,
      herbs: ['longTu', 'huyenThiet'],
      pills: ['Siêu Cấp Tu Vi Đan', 'Hộ Tâm Đan'],
    };

    updatedState.linhThach = (updatedState.linhThach || 0) + rewards.linhThach;
    updatedState.exp = Math.min(updatedState.maxExp, (updatedState.exp || 0) + rewards.tuVi);
    updatedState.herbs = {
      ...(updatedState.herbs || { uLan: 0, huyetTinh: 0, hoaAnh: 0, huyenThiet: 0, longTu: 0 }),
      longTu: (updatedState.herbs?.longTu || 0) + 1,
      huyenThiet: (updatedState.herbs?.huyenThiet || 0) + 1,
    };
    updatedState.pillCount = {
      ...updatedState.pillCount,
      sieuCapTuViDan: (updatedState.pillCount?.sieuCapTuViDan || 0) + 1,
      hoTam: (updatedState.pillCount?.hoTam || 0) + 1,
    };

    const killMsg = `🐉 [TRẢM SÁT THẦN THÚ] Toàn môn phái chấn động! Đã trảm sát ${wb.name}, nhận thưởng +${rewards.tuVi} Tu Vi, 1 Long Tu Thảo, 1 Huyền Thiết & 1 Siêu Cấp Tu Vi Đan!`;
    updatedState.historyLog = [killMsg, ...updatedState.historyLog.slice(0, 19)];
  }

  saveStoredSects(sects);
  saveStoredCultivationState(updatedState);

  const statusMsg = bossDefeated
    ? `🎉 Đã tiêu diệt ${wb.name}!`
    : `⚡ Gây ${actualDamage.toLocaleString()} sát thương lên ${wb.name}! (Còn ${wb.hp.toLocaleString()}/${wb.maxHp.toLocaleString()} HP)`;

  return {
    success: true,
    bossDefeated,
    remainingHp: wb.hp,
    maxHp: wb.maxHp,
    damageDealt: actualDamage,
    updatedState,
    message: statusMsg,
    rewards,
  };
}

/**
 * Đóng góp điểm Tỷ Võ Tông Môn (Relay / Tournament Score)
 */
export function contributeTournamentScore(
  state: CultivationState,
  sectId: string,
  wpmScore: number
): {
  success: boolean;
  updatedState: CultivationState;
  newTournamentPoints: number;
  isLeading: boolean;
  message: string;
} {
  const sects = getStoredSects();
  const currentSect = sects.find((s) => s.id === sectId);
  if (!currentSect) {
    return {
      success: false,
      updatedState: state,
      newTournamentPoints: 0,
      isLeading: false,
      message: 'Không tìm thấy Tông Môn!',
    };
  }

  const addedPoints = Math.max(10, Math.round(wpmScore * 0.5));
  currentSect.weeklyTournamentPoints = (currentSect.weeklyTournamentPoints || 0) + addedPoints;

  // Kiểm tra xem tông môn có dẫn đầu toàn cõi để chiếm cứ "Thiên Cung Long Mạch"
  const maxPoints = Math.max(...sects.map((s) => s.weeklyTournamentPoints || 0));
  const isLeading = currentSect.weeklyTournamentPoints >= maxPoints;

  sects.forEach((s) => {
    s.isHoldingThienCung = s.id === currentSect.id && isLeading;
  });

  saveStoredSects(sects);

  let updated = { ...state };
  updated.sect = {
    ...(updated.sect || { sectId: currentSect.id, sectName: currentSect.name, role: 'noi_mon', contribution: 0 }),
    tournamentWins: (updated.sect?.tournamentWins || 0) + 1,
    contribution: (updated.sect?.contribution || 0) + addedPoints,
  };

  const leadNotice = isLeading
    ? `👑 [THIÊN CUNG LONG MẠCH] ${currentSect.name} đã vươn lên dẫn đầu Đại Hội Tỷ Võ và chiếm cứ Thiên Cung Long Mạch!`
    : `⚔️ Xuất chiến Tỷ Võ: Đóng góp +${addedPoints} điểm cho ${currentSect.name}!`;

  updated.historyLog = [leadNotice, ...updated.historyLog.slice(0, 19)];
  saveStoredCultivationState(updated);

  return {
    success: true,
    updatedState: updated,
    newTournamentPoints: currentSect.weeklyTournamentPoints,
    isLeading,
    message: leadNotice,
  };
}

/**
 * Tương tác trò chuyện với Khí Linh của Bản Mệnh Pháp Bảo
 */
export function interactWithArtifactSpirit(
  state: CultivationState,
  artifactKey: ArtifactType
): {
  message: string;
  updatedState: CultivationState;
} {
  const artConfig = ARTIFACT_CONFIGS[artifactKey];
  const currentAffection = state.artifacts?.spiritAffection?.[artifactKey] ?? 10;
  const newAffection = Math.min(100, currentAffection + 5);

  const updated: CultivationState = {
    ...state,
    artifacts: {
      ...(state.artifacts || { equipped: artifactKey, levels: { thanh_van_kiem: 1, hao_thien_kinh: 0, cuu_pham_lien: 0, ban_co_phu: 0 } }),
      spiritAffection: {
        ...(state.artifacts?.spiritAffection || { thanh_van_kiem: 0, hao_thien_kinh: 0, cuu_pham_lien: 0, ban_co_phu: 0 }),
        [artifactKey]: newAffection,
      },
    },
  };

  saveStoredCultivationState(updated);
  return {
    message: artConfig.spiritGreeting,
    updatedState: updated,
  };
}

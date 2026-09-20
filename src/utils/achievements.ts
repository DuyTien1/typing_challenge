import { HighScoreRecord } from '../types';
import { MatchRecord } from './matchHistory';

export type AchievementBranch =
  | 'speed'
  | 'accuracy'
  | 'matches'
  | 'pve'
  | 'numpad'
  | 'streak'
  | 'hidden';

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
};

export const XIANXIA_ACHIEVEMENTS: XianxiaAchievement[] = [
  // ==================== NHÁNH 1: TẬT PHONG KIẾM QUYẾT (WPM) ====================
  {
    id: 'speed_40',
    name: 'Ngự Kiếm Sơ Nhập',
    branch: 'speed',
    branchName: 'Tật Phong Kiếm Quyết',
    icon: '🗡️',
    title: 'Kiếm Đồng Nhập Môn',
    realm: 'Luyện Khí Tầng 1',
    req: 'Đạt tốc độ 40+ WPM ở bất kỳ chế độ chơi nào',
    rarity: 'common',
    colorClass: 'text-slate-200',
    borderClass: 'border-slate-500/60',
    glowClass: 'from-slate-600/20 to-slate-800/10',
    badgeBg: 'bg-slate-800/80 text-slate-200 border-slate-600',
  },
  {
    id: 'speed_60',
    name: 'Phong Hành Bộ Pháp',
    branch: 'speed',
    branchName: 'Tật Phong Kiếm Quyết',
    icon: '🍃',
    title: 'Ngự Phong Kiếm Khách',
    realm: 'Trúc Cơ Kỳ',
    req: 'Đạt tốc độ 60+ WPM ở bất kỳ chế độ chơi nào',
    rarity: 'rare',
    colorClass: 'text-emerald-300',
    borderClass: 'border-emerald-500/70',
    glowClass: 'from-emerald-500/25 via-teal-500/15 to-transparent',
    badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60',
  },
  {
    id: 'speed_80',
    name: 'Truy Phong Đoạt Mệnh',
    branch: 'speed',
    branchName: 'Tật Phong Kiếm Quyết',
    icon: '🌪️',
    title: 'Vô Ảnh Kiếm Tôn',
    realm: 'Kim Đan Kỳ',
    req: 'Đạt tốc độ 80+ WPM ở bất kỳ chế độ chơi nào',
    rarity: 'epic',
    colorClass: 'text-sky-300',
    borderClass: 'border-sky-500/80 shadow-[0_0_12px_rgba(56,189,248,0.35)]',
    glowClass: 'from-sky-500/30 via-cyan-500/15 to-transparent',
    badgeBg: 'bg-sky-950/80 text-sky-300 border-sky-400/70',
  },
  {
    id: 'speed_100',
    name: 'Lôi Đình Điện Trảm',
    branch: 'speed',
    branchName: 'Tật Phong Kiếm Quyết',
    icon: '⚡',
    title: 'Lôi Đình Kiếm Tiên',
    realm: 'Nguyên Anh Kỳ',
    req: 'Đạt tốc độ 100+ WPM ở bất kỳ chế độ chơi nào',
    rarity: 'legendary',
    colorClass: 'text-purple-300',
    borderClass: 'border-purple-400 shadow-[0_0_16px_rgba(192,132,252,0.45)]',
    glowClass: 'from-purple-600/30 via-fuchsia-500/20 to-transparent',
    badgeBg: 'bg-purple-950/80 text-purple-200 border-purple-400/80',
  },
  {
    id: 'speed_120',
    name: 'Thuấn Di Thần Thông',
    branch: 'speed',
    branchName: 'Tật Phong Kiếm Quyết',
    icon: '✨',
    title: 'Tật Phong Tiên Tôn',
    realm: 'Hóa Thần Kỳ',
    req: 'Đạt tốc độ 120+ WPM ở bất kỳ chế độ chơi nào',
    rarity: 'legendary',
    colorClass: 'text-amber-300',
    borderClass: 'border-amber-400 ring-1 ring-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.5)]',
    glowClass: 'from-amber-500/35 via-yellow-400/20 to-orange-500/20',
    badgeBg: 'bg-amber-950/90 text-amber-200 border-amber-400',
  },
  {
    id: 'speed_140',
    name: 'Phá Toái Hư Không',
    branch: 'speed',
    branchName: 'Tật Phong Kiếm Quyết',
    icon: '🌌',
    title: 'Thần Tốc Kiếm Đế',
    realm: 'Độ Kiếp Kỳ',
    req: 'Đạt tốc độ 140+ WPM ở bất kỳ chế độ chơi nào',
    rarity: 'mythic',
    colorClass: 'text-rose-300',
    borderClass: 'border-rose-400 ring-2 ring-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.6)]',
    glowClass: 'from-rose-600/40 via-red-500/25 to-amber-500/20',
    badgeBg: 'bg-rose-950/90 text-rose-200 border-rose-400',
  },
  {
    id: 'speed_160',
    name: 'Hỗn Độn Vô Cực',
    branch: 'speed',
    branchName: 'Tật Phong Kiếm Quyết',
    icon: '👑',
    title: 'Hỗn Độn Kiếm Tổ',
    realm: 'Đại Thừa Chí Tôn',
    req: 'Đạt tốc độ thần thánh 160+ WPM',
    rarity: 'mythic',
    colorClass: 'text-yellow-200',
    borderClass: 'border-yellow-300 ring-2 ring-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.8)]',
    glowClass: 'from-yellow-500/40 via-amber-400/30 to-red-500/30',
    badgeBg: 'bg-yellow-950/90 text-yellow-100 border-yellow-300',
  },

  // ==================== NHÁNH 2: TÂM KIẾM VÔ TẠP (ACCURACY) ====================
  {
    id: 'acc_95',
    name: 'Tâm Như Chỉ Thủy',
    branch: 'accuracy',
    branchName: 'Tâm Kiếm Vô Tạp',
    icon: '💧',
    title: 'Tĩnh Tâm Cư Sĩ',
    realm: 'Tĩnh Niệm Sơ Giai',
    req: 'Đạt độ chính xác ≥ 95% trong một ván đấu hoàn chỉnh',
    rarity: 'common',
    colorClass: 'text-teal-200',
    borderClass: 'border-teal-500/60',
    glowClass: 'from-teal-600/20 to-teal-900/10',
    badgeBg: 'bg-teal-950/80 text-teal-200 border-teal-500/60',
  },
  {
    id: 'acc_98',
    name: 'Minh Kính Chỉ Thủy',
    branch: 'accuracy',
    branchName: 'Tâm Kiếm Vô Tạp',
    icon: '🪞',
    title: 'Chân Đạo Hành Giả',
    realm: 'Minh Tâm Trung Giai',
    req: 'Đạt độ chính xác ≥ 98% trong một ván đấu hoàn chỉnh',
    rarity: 'rare',
    colorClass: 'text-cyan-300',
    borderClass: 'border-cyan-500/70',
    glowClass: 'from-cyan-500/25 to-blue-900/10',
    badgeBg: 'bg-cyan-950/80 text-cyan-200 border-cyan-400/70',
  },
  {
    id: 'acc_100_once',
    name: 'Vạn Kiếm Quy Nhất',
    branch: 'accuracy',
    branchName: 'Tâm Kiếm Vô Tạp',
    icon: '🎯',
    title: 'Vô Tạp Chân Quân',
    realm: 'Viên Mãn Thuần Khiết',
    req: 'Đạt độ chính xác 100% tuyệt đối không gõ sai ký tự nào',
    rarity: 'epic',
    colorClass: 'text-emerald-300',
    borderClass: 'border-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.4)]',
    glowClass: 'from-emerald-500/30 to-teal-500/15',
    badgeBg: 'bg-emerald-950/80 text-emerald-200 border-emerald-400',
  },
  {
    id: 'acc_100_3x',
    name: 'Đạo Tâm Bất Diệt',
    branch: 'accuracy',
    branchName: 'Tâm Kiếm Vô Tạp',
    icon: '🛡️',
    title: 'Bất Diệt Kiếm Thánh',
    realm: 'Bất Diệt Đạo Cốt',
    req: 'Tích lũy 3 ván đấu đạt 100% độ chính xác trong lịch sử',
    rarity: 'legendary',
    colorClass: 'text-blue-300',
    borderClass: 'border-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.5)]',
    glowClass: 'from-blue-600/35 to-indigo-600/20',
    badgeBg: 'bg-blue-950/90 text-blue-200 border-blue-400',
  },
  {
    id: 'acc_100_10x',
    name: 'Luyện Thần Hóa Hư',
    branch: 'accuracy',
    branchName: 'Tâm Kiếm Vô Tạp',
    icon: '💎',
    title: 'Thiên Đạo Vô Khuyết Giả',
    realm: 'Vô Cực Hoàn Hảo',
    req: 'Tích lũy 10 ván đấu đạt 100% độ chính xác trong lịch sử',
    rarity: 'mythic',
    colorClass: 'text-fuchsia-300',
    borderClass: 'border-fuchsia-400 ring-2 ring-fuchsia-400/50 shadow-[0_0_24px_rgba(232,121,249,0.6)]',
    glowClass: 'from-fuchsia-600/40 via-purple-500/25 to-indigo-500/20',
    badgeBg: 'bg-fuchsia-950/90 text-fuchsia-200 border-fuchsia-400',
  },

  // ==================== NHÁNH 3: BÁCH CHIẾN ĐĂNG TIÊN (SỐ TRẬN) ====================
  {
    id: 'matches_10',
    name: 'Luyện Khí Trúc Cơ',
    branch: 'matches',
    branchName: 'Bách Chiến Đăng Tiên',
    icon: '🌱',
    title: 'Tu Tiên Tân Tú',
    realm: 'Luyện Khí Viên Mãn',
    req: 'Hoàn thành 10 trận thi đấu',
    rarity: 'common',
    colorClass: 'text-slate-300',
    borderClass: 'border-slate-500/60',
    glowClass: 'from-slate-700/20 to-slate-900/10',
    badgeBg: 'bg-slate-800/80 text-slate-300 border-slate-600',
  },
  {
    id: 'matches_30',
    name: 'Kim Đan Tụ Đỉnh',
    branch: 'matches',
    branchName: 'Bách Chiến Đăng Tiên',
    icon: '🔮',
    title: 'Kim Đan Đạo Trưởng',
    realm: 'Kim Đan Viên Mãn',
    req: 'Hoàn thành 30 trận thi đấu',
    rarity: 'rare',
    colorClass: 'text-amber-300',
    borderClass: 'border-amber-500/70',
    glowClass: 'from-amber-500/25 to-yellow-500/15',
    badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-500/60',
  },
  {
    id: 'matches_75',
    name: 'Nguyên Anh Hóa Hình',
    branch: 'matches',
    branchName: 'Bách Chiến Đăng Tiên',
    icon: '🧘‍♂️',
    title: 'Nguyên Anh Lão Tổ',
    realm: 'Nguyên Anh Hóa Thần',
    req: 'Hoàn thành 75 trận thi đấu',
    rarity: 'epic',
    colorClass: 'text-purple-300',
    borderClass: 'border-purple-500/80 shadow-[0_0_12px_rgba(168,85,247,0.35)]',
    glowClass: 'from-purple-500/30 to-violet-500/15',
    badgeBg: 'bg-purple-950/80 text-purple-200 border-purple-400/70',
  },
  {
    id: 'matches_150',
    name: 'Hóa Thần Chi Cảnh',
    branch: 'matches',
    branchName: 'Bách Chiến Đăng Tiên',
    icon: '⚡',
    title: 'Hóa Thần Chân Nhân',
    realm: 'Hóa Thần Xuất Thế',
    req: 'Hoàn thành 150 trận thi đấu',
    rarity: 'legendary',
    colorClass: 'text-orange-300',
    borderClass: 'border-orange-400 shadow-[0_0_16px_rgba(251,146,60,0.5)]',
    glowClass: 'from-orange-500/35 to-amber-500/20',
    badgeBg: 'bg-orange-950/90 text-orange-200 border-orange-400',
  },
  {
    id: 'matches_300',
    name: 'Độ Kiếp Phi Thăng',
    branch: 'matches',
    branchName: 'Bách Chiến Đăng Tiên',
    icon: '🌌',
    title: 'Cửu Trọng Tiên Tôn',
    realm: 'Cửu Trọng Thiên Kiếp',
    req: 'Hoàn thành 300 trận thi đấu',
    rarity: 'mythic',
    colorClass: 'text-sky-200',
    borderClass: 'border-sky-300 ring-2 ring-sky-400/60 shadow-[0_0_22px_rgba(56,189,248,0.6)]',
    glowClass: 'from-sky-600/40 via-blue-500/25 to-indigo-500/20',
    badgeBg: 'bg-sky-950/90 text-sky-100 border-sky-300',
  },
  {
    id: 'matches_500',
    name: 'Vạn Cổ Trường Tồn',
    branch: 'matches',
    branchName: 'Bách Chiến Đăng Tiên',
    icon: '👑',
    title: 'Vạn Kiếp Thần Đế',
    realm: 'Bất Hủ Bất Diệt',
    req: 'Hoàn thành 500 trận thi đấu chấn động tam giới',
    rarity: 'mythic',
    colorClass: 'text-amber-200',
    borderClass: 'border-amber-300 ring-2 ring-amber-400 shadow-[0_0_28px_rgba(251,191,36,0.7)]',
    glowClass: 'from-amber-500/45 via-yellow-400/30 to-red-500/25',
    badgeBg: 'bg-amber-950/90 text-amber-100 border-amber-300',
  },

  // ==================== NHÁNH 4: TRU MA & BÍ CẢNH (BOSS & CHẾ ĐỘ PHỤ) ====================
  {
    id: 'pve_boss_win',
    name: 'Trảm Yêu Phục Ma',
    branch: 'pve',
    branchName: 'Tru Ma & Bí Cảnh',
    icon: '🐉',
    title: 'Trấn Ma Tiên Sứ',
    realm: 'Bí Cảnh Trấn Phục',
    req: 'Đánh bại Boss Ma Long trong Chế độ Săn Boss',
    rarity: 'epic',
    colorClass: 'text-red-400',
    borderClass: 'border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]',
    glowClass: 'from-red-600/30 to-orange-600/15',
    badgeBg: 'bg-red-950/80 text-red-200 border-red-500/70',
  },
  {
    id: 'pve_boss_hell',
    name: 'Thí Ma Đoạt Đỉnh',
    branch: 'pve',
    branchName: 'Tru Ma & Bí Cảnh',
    icon: '🔥',
    title: 'Tru Tiên Thí Ma Giả',
    realm: 'Ma Giới Thí Thần',
    req: 'Hạ gục Boss ở độ khó Huyền Thoại hoặc Địa Ngục',
    rarity: 'mythic',
    colorClass: 'text-rose-300',
    borderClass: 'border-rose-500 ring-2 ring-rose-500 shadow-[0_0_22px_rgba(244,63,94,0.6)]',
    glowClass: 'from-rose-700/40 via-red-600/25 to-amber-500/20',
    badgeBg: 'bg-rose-950/90 text-rose-200 border-rose-400',
  },
  {
    id: 'pve_mystery_word',
    name: 'Thiên Cơ Thần Toán',
    branch: 'pve',
    branchName: 'Tru Ma & Bí Cảnh',
    icon: '🔮',
    title: 'Thiên Cơ Đạo Sĩ',
    realm: 'Thiên Cơ Thông Hiểu',
    req: 'Giải đố chuẩn xác từ khóa bí ẩn trong Chế độ Đoán Chữ',
    rarity: 'rare',
    colorClass: 'text-purple-300',
    borderClass: 'border-purple-500/70',
    glowClass: 'from-purple-500/25 to-fuchsia-500/15',
    badgeBg: 'bg-purple-950/80 text-purple-200 border-purple-400/60',
  },
  {
    id: 'pve_rush_high',
    name: 'Cực Tốc Lôi Đình',
    branch: 'pve',
    branchName: 'Tru Ma & Bí Cảnh',
    icon: '🌪️',
    title: 'Bá Vương Chớp Nhoáng',
    realm: 'Cực Tốc Thần Thông',
    req: 'Hoàn thành vòng thi Chế độ Ngẫu Hứng (Rush) xuất sắc',
    rarity: 'epic',
    colorClass: 'text-orange-300',
    borderClass: 'border-orange-500/80 shadow-[0_0_14px_rgba(249,115,22,0.4)]',
    glowClass: 'from-orange-500/30 to-amber-500/15',
    badgeBg: 'bg-orange-950/80 text-orange-200 border-orange-400/70',
  },
  {
    id: 'pve_outplay_beat',
    name: 'Chiến Thắng Tâm Ma',
    branch: 'pve',
    branchName: 'Tru Ma & Bí Cảnh',
    icon: '🎯',
    title: 'Tâm Ma Phá Giải Giả',
    realm: 'Đột Phá Bản Thân',
    req: 'Chiến thắng bóng ma của chính mình trong Chế độ Outplay',
    rarity: 'legendary',
    colorClass: 'text-cyan-300',
    borderClass: 'border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.5)]',
    glowClass: 'from-cyan-500/35 to-blue-500/20',
    badgeBg: 'bg-cyan-950/90 text-cyan-200 border-cyan-400',
  },

  // ==================== NHÁNH 5: THẦN SỐ TRẬN PHÁP (NUMPAD) ====================
  {
    id: 'numpad_intro',
    name: 'Khởi Động Bát Quái',
    branch: 'numpad',
    branchName: 'Thần Số Trận Pháp',
    icon: '🔢',
    title: 'Bát Quái Học Đồ',
    realm: 'Trận Đồ Sơ Khởi',
    req: 'Hoàn thành 1 ván chế độ Bàn Phím Số (Numpad)',
    rarity: 'common',
    colorClass: 'text-teal-200',
    borderClass: 'border-teal-500/60',
    glowClass: 'from-teal-600/20 to-teal-800/10',
    badgeBg: 'bg-teal-950/80 text-teal-200 border-teal-500/60',
  },
  {
    id: 'numpad_50',
    name: 'Lạc Thư Biến Huyễn',
    branch: 'numpad',
    branchName: 'Thần Số Trận Pháp',
    icon: '🧮',
    title: 'Lạc Thư Trận Sư',
    realm: 'Biến Huyễn Nhập Đạo',
    req: 'Đạt tốc độ 50+ WPM ở Chế độ Bàn Phím Số (Numpad)',
    rarity: 'rare',
    colorClass: 'text-emerald-300',
    borderClass: 'border-emerald-500/70',
    glowClass: 'from-emerald-500/25 to-teal-500/15',
    badgeBg: 'bg-emerald-950/80 text-emerald-200 border-emerald-400/60',
  },
  {
    id: 'numpad_75',
    name: 'Hà Đồ Huyền Cơ',
    branch: 'numpad',
    branchName: 'Thần Số Trận Pháp',
    icon: '📜',
    title: 'Trận Đạo Tông Sư',
    realm: 'Hà Đồ Huyền Môn',
    req: 'Đạt tốc độ 75+ WPM ở Chế độ Bàn Phím Số (Numpad)',
    rarity: 'epic',
    colorClass: 'text-teal-300',
    borderClass: 'border-teal-400 shadow-[0_0_14px_rgba(45,212,191,0.4)]',
    glowClass: 'from-teal-500/30 to-cyan-500/15',
    badgeBg: 'bg-teal-950/80 text-teal-200 border-teal-400',
  },
  {
    id: 'numpad_100',
    name: 'Thiên Đạo Số Quyết',
    branch: 'numpad',
    branchName: 'Thần Số Trận Pháp',
    icon: '⚡',
    title: 'Số Đạo Tiên Quân',
    realm: 'Thiên Số Chí Tôn',
    req: 'Đạt tốc độ thần tốc 100+ WPM ở Chế độ Bàn Phím Số (Numpad)',
    rarity: 'legendary',
    colorClass: 'text-amber-300',
    borderClass: 'border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.5)]',
    glowClass: 'from-amber-500/35 to-yellow-500/20',
    badgeBg: 'bg-amber-950/90 text-amber-200 border-amber-400',
  },

  // ==================== NHÁNH 6: BÁCH THẮNG TRANH HÙNG (CHIẾN TÍCH PHÒNG ĐẤU) ====================
  {
    id: 'pvp_first_win',
    name: 'Sơ Lộ Phong Mang',
    branch: 'streak',
    branchName: 'Bách Thắng Tranh Hùng',
    icon: '🗡️',
    title: 'Kiếm Xuất Giang Hồ',
    realm: 'Tụ Khí Tranh Tài',
    req: 'Chiến thắng 1 ván đấu nhiều người trong phòng chờ',
    rarity: 'rare',
    colorClass: 'text-sky-300',
    borderClass: 'border-sky-500/70',
    glowClass: 'from-sky-500/25 to-blue-500/15',
    badgeBg: 'bg-sky-950/80 text-sky-200 border-sky-400/60',
  },
  {
    id: 'pvp_streak_3',
    name: 'Tam Liên Tuyệt Đỉnh',
    branch: 'streak',
    branchName: 'Bách Thắng Tranh Hùng',
    icon: '🔥',
    title: 'Tam Liên Kiếm Vương',
    realm: 'Khí Thế Như Hồng',
    req: 'Đạt chuỗi thắng 3 trận liên tiếp trong lịch sử đấu',
    rarity: 'epic',
    colorClass: 'text-orange-300',
    borderClass: 'border-orange-400 shadow-[0_0_14px_rgba(251,146,60,0.4)]',
    glowClass: 'from-orange-500/30 to-red-500/15',
    badgeBg: 'bg-orange-950/80 text-orange-200 border-orange-400',
  },
  {
    id: 'pvp_streak_5',
    name: 'Ngũ Liên Bất Bại',
    branch: 'streak',
    branchName: 'Bách Thắng Tranh Hùng',
    icon: '⚔️',
    title: 'Bách Chiến Bất Bại',
    realm: 'Độc Cô Cầu Bại',
    req: 'Đạt chuỗi thắng 5 trận liên tiếp trong lịch sử đấu',
    rarity: 'legendary',
    colorClass: 'text-red-300',
    borderClass: 'border-red-400 shadow-[0_0_18px_rgba(248,113,113,0.5)]',
    glowClass: 'from-red-600/35 to-orange-500/20',
    badgeBg: 'bg-red-950/90 text-red-200 border-red-400',
  },
  {
    id: 'pvp_streak_8',
    name: 'Thiên Hạ Độc Tôn',
    branch: 'streak',
    branchName: 'Bách Thắng Tranh Hùng',
    icon: '👑',
    title: 'Thiên Hạ Đệ Nhất Kiêm',
    realm: 'Chư Thiên Độc Tôn',
    req: 'Đạt chuỗi thắng áp đảo 8 trận liên tiếp',
    rarity: 'mythic',
    colorClass: 'text-amber-200',
    borderClass: 'border-amber-300 ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.65)]',
    glowClass: 'from-amber-500/40 via-yellow-400/25 to-red-500/25',
    badgeBg: 'bg-amber-950/90 text-amber-100 border-amber-300',
  },

  // ==================== NHÁNH 7: KỲ NGỘ ẨN THẾ (NHIỀU THÀNH TỰU ẨN TIÊN HIỆP) ====================
  {
    id: 'hidden_room_full',
    name: 'Cửu Tiên Tề Tụ',
    branch: 'hidden',
    branchName: 'Kỳ Ngộ Ẩn Thế',
    icon: '🏯',
    title: 'Chúng Tiên Minh Chủ',
    realm: 'Vạn Tiên Triều Bái',
    req: 'Tham gia hoặc làm chủ một phòng thi đấu đầy đủ 8/8 người chơi',
    rarity: 'legendary',
    colorClass: 'text-purple-300',
    borderClass: 'border-purple-400 shadow-[0_0_18px_rgba(192,132,252,0.5)]',
    glowClass: 'from-purple-600/35 to-indigo-600/20',
    badgeBg: 'bg-purple-950/90 text-purple-200 border-purple-400',
    isHidden: true,
    secretHint: 'Cơ duyên: Nơi đạo hữu tề tựu đông đảo nhất chốn nhân gian...',
  },
  {
    id: 'hidden_comeback',
    name: 'Nghịch Thiên Cải Mệnh',
    branch: 'hidden',
    branchName: 'Kỳ Ngộ Ẩn Thế',
    icon: '⚡',
    title: 'Nghịch Thiên Chân Nhân',
    realm: 'Phá Toái Kiếp Nạn',
    req: 'Lội ngược dòng giành chiến thắng ngoạn mục ở ván đấu đối kháng nhiều người',
    rarity: 'legendary',
    colorClass: 'text-amber-300',
    borderClass: 'border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.5)]',
    glowClass: 'from-amber-500/35 to-red-500/20',
    badgeBg: 'bg-amber-950/90 text-amber-200 border-amber-400',
    isHidden: true,
    secretHint: 'Cơ duyên: Trong hiểm cảnh sinh cơ, chuyển bại thành thắng...',
  },
  {
    id: 'hidden_midnight',
    name: 'Dạ Lộ Tu Tiên',
    branch: 'hidden',
    branchName: 'Kỳ Ngộ Ẩn Thế',
    icon: '🌙',
    title: 'Dạ Du Tiên Tôn',
    realm: 'Dạ Hành Hóa Cảnh',
    req: 'Luyện kiếm vào khung giờ đêm khuya huyền bí (từ 23:00 đến 05:00 sáng)',
    rarity: 'rare',
    colorClass: 'text-indigo-300',
    borderClass: 'border-indigo-400 shadow-[0_0_14px_rgba(129,140,248,0.4)]',
    glowClass: 'from-indigo-600/30 to-purple-900/20',
    badgeBg: 'bg-indigo-950/90 text-indigo-200 border-indigo-400',
    isHidden: true,
    secretHint: 'Cơ duyên: Khi vạn vật chìm vào giấc ngủ, tiếng gõ phím vẫn vang rền...',
  },
  {
    id: 'hidden_flawless_fast',
    name: 'Bất Động Minh Vương',
    branch: 'hidden',
    branchName: 'Kỳ Ngộ Ẩn Thế',
    icon: '🗿',
    title: 'Minh Vương Bất Động',
    realm: 'Kiên Bất Khả Tồi',
    req: 'Hoàn thành ván đấu với tốc độ trên 75 WPM và độ chính xác 100% không tì vết',
    rarity: 'legendary',
    colorClass: 'text-emerald-300',
    borderClass: 'border-emerald-400 ring-1 ring-emerald-400/50 shadow-[0_0_20px_rgba(52,211,153,0.5)]',
    glowClass: 'from-emerald-500/35 to-teal-500/20',
    badgeBg: 'bg-emerald-950/90 text-emerald-100 border-emerald-400',
    isHidden: true,
    secretHint: 'Cơ duyên: Vừa nhanh như chớp, vừa chuẩn xác không một hạt bụi...',
  },
  {
    id: 'hidden_unyielding',
    name: 'Bất Khuất Đạo Tâm',
    branch: 'hidden',
    branchName: 'Kỳ Ngộ Ẩn Thế',
    icon: '🛡️',
    title: 'Bất Khuất Đạo Giả',
    realm: 'Vững Như Bàn Thạch',
    req: 'Thi đấu ít nhất 10 trận mà không từng một lần bấm Đầu hàng',
    rarity: 'epic',
    colorClass: 'text-blue-300',
    borderClass: 'border-blue-400 shadow-[0_0_14px_rgba(96,165,250,0.4)]',
    glowClass: 'from-blue-600/30 to-sky-600/15',
    badgeBg: 'bg-blue-950/90 text-blue-200 border-blue-400',
    isHidden: true,
    secretHint: 'Cơ duyên: Dù phong ba bão táp, kiếm ý quyết không rời tay...',
  },
  {
    id: 'hidden_top_glory',
    name: 'Kỳ Lân Xuất Thế',
    branch: 'hidden',
    branchName: 'Kỳ Ngộ Ẩn Thế',
    icon: '🐉',
    title: 'Thiên Bảng Đệ Nhất Nhân',
    realm: 'Bảng Vàng Đề Danh',
    req: 'Đạt danh hiệu Top 1 Quán Quân bảng xếp hạng hoặc WPM vượt 110 WPM',
    rarity: 'mythic',
    colorClass: 'text-amber-200',
    borderClass: 'border-amber-300 ring-2 ring-amber-400 shadow-[0_0_28px_rgba(251,191,36,0.7)]',
    glowClass: 'from-amber-500/40 via-yellow-400/30 to-red-500/25',
    badgeBg: 'bg-amber-950/90 text-amber-100 border-amber-300',
    isHidden: true,
    secretHint: 'Cơ duyên: Tên khắc trên bia đá chấn động chư thiên vạn giới...',
  },
  {
    id: 'hidden_all_modes',
    name: 'Toàn Năng Tông Sư',
    branch: 'hidden',
    branchName: 'Kỳ Ngộ Ẩn Thế',
    icon: '📚',
    title: 'Bách Khoa Tiên Quân',
    realm: 'Vạn Pháp Thông Suốt',
    req: 'Trải nghiệm thi đấu ở ít nhất 5 chế độ chơi khác nhau trong hệ thống',
    rarity: 'epic',
    colorClass: 'text-teal-300',
    borderClass: 'border-teal-400 shadow-[0_0_14px_rgba(45,212,191,0.4)]',
    glowClass: 'from-teal-500/30 to-emerald-500/15',
    badgeBg: 'bg-teal-950/90 text-teal-200 border-teal-400',
    isHidden: true,
    secretHint: 'Cơ duyên: Đi khắp các bí cảnh, lĩnh hội đủ các chiêu pháp...',
  },
  {
    id: 'hidden_aura_frame',
    name: 'Kim Thân Hộ Thể',
    branch: 'hidden',
    branchName: 'Kỳ Ngộ Ẩn Thế',
    icon: '✨',
    title: 'Kim Thân Bất Hoại',
    realm: 'Thánh Thể Xuất Khiếu',
    req: 'Sở hữu và trang bị khung hào quang cấp Huyền Thoại hoặc Thần Thoại',
    rarity: 'rare',
    colorClass: 'text-yellow-300',
    borderClass: 'border-yellow-400 shadow-[0_0_14px_rgba(250,204,21,0.4)]',
    glowClass: 'from-yellow-500/30 to-amber-500/15',
    badgeBg: 'bg-yellow-950/90 text-yellow-200 border-yellow-400',
    isHidden: true,
    secretHint: 'Cơ duyên: Hào quang rực rỡ tỏa sáng quanh thần hồn đại năng...',
  },
  {
    id: 'hidden_verified_dao',
    name: 'Chính Tông Tiên Cốt',
    branch: 'hidden',
    branchName: 'Kỳ Ngộ Ẩn Thế',
    icon: '📜',
    title: 'Chính Tông Đạo Trưởng',
    realm: 'Ghi Tên Tiên Tịch',
    req: 'Tạo tài khoản và đăng nhập chính thức trên hệ thống FastTyping',
    rarity: 'common',
    colorClass: 'text-emerald-300',
    borderClass: 'border-emerald-500/60',
    glowClass: 'from-emerald-600/20 to-teal-800/10',
    badgeBg: 'bg-emerald-950/80 text-emerald-200 border-emerald-500/60',
    isHidden: true,
    secretHint: 'Cơ duyên: Bái nhập môn phái, ghi danh vào bảng vàng tiên tịch...',
  },
  {
    id: 'hidden_steady_heart',
    name: 'Bình Thản Như Nước',
    branch: 'hidden',
    branchName: 'Kỳ Ngộ Ẩn Thế',
    icon: '🌊',
    title: 'Đạo Tâm Vững Bàn Thạch',
    realm: 'Tâm Cảnh Như Gương',
    req: 'Đạt chuỗi 5 ván đấu liên tiếp với độ chính xác đều từ 96% trở lên',
    rarity: 'legendary',
    colorClass: 'text-sky-300',
    borderClass: 'border-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.5)]',
    glowClass: 'from-sky-500/35 to-blue-500/20',
    badgeBg: 'bg-sky-950/90 text-sky-200 border-sky-400',
    isHidden: true,
    secretHint: 'Cơ duyên: Không nóng không vội, từng phím gõ đều trầm ổn như núi cao...',
  },
];

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
 * Lấy tối đa 3 thành tựu được người chơi chọn trưng bày (Showcase)
 * KHÁCH VÃNG LAI: Luôn trả về mảng rỗng [] (không có quyền trưng bày thành tựu)
 */
export function getShowcaseAchievements(userId?: string | null): string[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(`${SHOWCASE_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 3);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Lưu tối đa 3 thành tựu được người chơi chọn trưng bày (Showcase)
 * CHỈ lưu khi người chơi đã đăng nhập có userId hợp lệ
 */
export function setShowcaseAchievements(ids: string[], userId?: string | null): string[] {
  if (!userId) return [];
  const sanitized = Array.from(new Set(ids)).slice(0, 3);
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
 * Tính toán trạng thái mở khóa thành tựu của người chơi dựa trên toàn bộ chỉ số thực tế
 * ĐẢM BẢO QUY ĐỊNH: CHỈ NGƯỜI CHƠI ĐÃ ĐĂNG NHẬP MỚI CÓ THỂ HOÀN THÀNH THÀNH TỰU!
 */
export function calculatePlayerAchievements(params: {
  bestWpm: number;
  totalGames: number;
  username: string;
  frame?: string;
  isLoggedIn?: boolean;
  userId?: string | null;
  matchHistory?: MatchRecord[];
  highScores?: Record<string, HighScoreRecord | null>;
  roomPlayerCount?: number;
  initialUnlocked?: string[];
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
    userId = null,
    matchHistory = [],
    highScores = {},
    roomPlayerCount = 1,
    initialUnlocked = [],
  } = params;

  // QUY ĐỊNH CỐT LÕI: CHỈ NGƯỜI CHƠI ĐÃ ĐĂNG NHẬP MỚI CÓ THỂ HOÀN THÀNH THÀNH TỰU
  // Nếu chưa đăng nhập (Khách / Guest), toàn bộ thành tựu đều ở trạng thái KHÓA (0/35)
  if (!isLoggedIn) {
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

  // Cache đã mở trước đó của riêng tài khoản người chơi này
  const accountKey = userId || username;
  const previouslyUnlocked = new Set([
    ...getStoredUnlockedAchievements(accountKey),
    ...initialUnlocked,
  ]);
  const newUnlocked = new Set<string>(previouslyUnlocked);

  // Thống kê từ lịch sử đấu
  const maxMatchWpm = Math.max(bestWpm, ...matchHistory.map((m) => m.wpm || 0));
  const effectiveTotalMatches = Math.max(totalGames, matchHistory.length);
  const accurate100Count = matchHistory.filter((m) => m.accuracy === 100).length;
  const surrenderedCount = matchHistory.filter((m) => m.result === 'Đầu hàng').length;
  const uniqueModes = new Set(matchHistory.map((m) => m.modeId || m.mode));

  // Kiểm tra chuỗi thắng
  let maxWinStreak = 0;
  let currentStreak = 0;
  for (const m of [...matchHistory].reverse()) {
    if (m.result === 'Thắng') {
      currentStreak++;
      if (currentStreak > maxWinStreak) maxWinStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  // Kiểm tra chuỗi 5 ván ổn định độ chính xác >= 96%
  let steadyAccStreak = 0;
  let maxSteadyAccStreak = 0;
  for (const m of matchHistory) {
    if (m.accuracy >= 96) {
      steadyAccStreak++;
      if (steadyAccStreak > maxSteadyAccStreak) maxSteadyAccStreak = steadyAccStreak;
    } else {
      steadyAccStreak = 0;
    }
  }

  // Kiểm tra giờ đêm (23h - 5h)
  const now = new Date();
  const currentHour = now.getHours();
  const isNightTimeNow = currentHour >= 23 || currentHour < 5;
  const hasNightMatch = matchHistory.some((m) => {
    const d = new Date(m.timestamp);
    const h = d.getHours();
    return h >= 23 || h < 5;
  });

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

    switch (ach.id) {
      // Tật Phong Kiếm Quyết
      case 'speed_40':
        isMet = maxMatchWpm >= 40;
        break;
      case 'speed_60':
        isMet = maxMatchWpm >= 60;
        break;
      case 'speed_80':
        isMet = maxMatchWpm >= 80;
        break;
      case 'speed_100':
        isMet = maxMatchWpm >= 100;
        break;
      case 'speed_120':
        isMet = maxMatchWpm >= 120;
        break;
      case 'speed_140':
        isMet = maxMatchWpm >= 140;
        break;
      case 'speed_160':
        isMet = maxMatchWpm >= 160;
        break;

      // Tâm Kiếm Vô Tạp
      case 'acc_95':
        isMet = matchHistory.some((m) => m.accuracy >= 95);
        break;
      case 'acc_98':
        isMet = matchHistory.some((m) => m.accuracy >= 98);
        break;
      case 'acc_100_once':
        isMet = accurate100Count >= 1;
        break;
      case 'acc_100_3x':
        isMet = accurate100Count >= 3;
        break;
      case 'acc_100_10x':
        isMet = accurate100Count >= 10;
        break;

      // Bách Chiến Đăng Tiên
      case 'matches_10':
        isMet = effectiveTotalMatches >= 10;
        break;
      case 'matches_30':
        isMet = effectiveTotalMatches >= 30;
        break;
      case 'matches_75':
        isMet = effectiveTotalMatches >= 75;
        break;
      case 'matches_150':
        isMet = effectiveTotalMatches >= 150;
        break;
      case 'matches_300':
        isMet = effectiveTotalMatches >= 300;
        break;
      case 'matches_500':
        isMet = effectiveTotalMatches >= 500;
        break;

      // Tru Ma & Bí Cảnh
      case 'pve_boss_win':
        isMet = matchHistory.some((m) => m.modeId === 'san_boss' && m.result === 'Thắng');
        break;
      case 'pve_boss_hell':
        isMet = matchHistory.some(
          (m) => m.modeId === 'san_boss' && m.result === 'Thắng' && (m.mode.includes('Địa Ngục') || m.mode.includes('Huyền Thoại'))
        );
        break;
      case 'pve_mystery_word':
        isMet = matchHistory.some((m) => m.modeId === 'doan_chu' && (m.score || 0) > 0);
        break;
      case 'pve_rush_high':
        isMet = matchHistory.some((m) => m.modeId === 'ngau_hung' && ((m.score || 0) >= 100 || m.wpm >= 60));
        break;
      case 'pve_outplay_beat':
        isMet = matchHistory.some((m) => m.modeId === 'outplay' && m.result === 'Thắng');
        break;

      // Thần Số Trận Pháp (Numpad)
      case 'numpad_intro':
        isMet = matchHistory.some((m) => m.modeId === 'numpad');
        break;
      case 'numpad_50':
        isMet = matchHistory.some((m) => m.modeId === 'numpad' && m.wpm >= 50);
        break;
      case 'numpad_75':
        isMet = matchHistory.some((m) => m.modeId === 'numpad' && m.wpm >= 75);
        break;
      case 'numpad_100':
        isMet = matchHistory.some((m) => m.modeId === 'numpad' && m.wpm >= 100);
        break;

      // Bách Thắng Tranh Hùng
      case 'pvp_first_win':
        isMet = matchHistory.some((m) => m.playType === 'multiplayer' && m.result === 'Thắng');
        break;
      case 'pvp_streak_3':
        isMet = maxWinStreak >= 3;
        break;
      case 'pvp_streak_5':
        isMet = maxWinStreak >= 5;
        break;
      case 'pvp_streak_8':
        isMet = maxWinStreak >= 8;
        break;

      // Kỳ Ngộ Ẩn Thế (Thành tựu ẩn)
      case 'hidden_room_full':
        isMet = roomPlayerCount >= 8;
        break;
      case 'hidden_comeback':
        isMet = matchHistory.some((m) => m.playType === 'multiplayer' && m.result === 'Thắng');
        break;
      case 'hidden_midnight':
        isMet = isNightTimeNow || hasNightMatch;
        break;
      case 'hidden_flawless_fast':
        isMet = matchHistory.some((m) => m.wpm >= 75 && m.accuracy === 100);
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
 */
export function checkNewAchievementsOnMatchEnd(params: {
  bestWpm: number;
  totalGames: number;
  username: string;
  frame?: string;
  isLoggedIn?: boolean;
  userId?: string | null;
  matchHistory?: MatchRecord[];
  highScores?: Record<string, HighScoreRecord | null>;
  roomPlayerCount?: number;
  initialUnlocked?: string[];
}): XianxiaAchievement[] {
  if (!params.isLoggedIn) return [];
  const res = calculatePlayerAchievements(params);
  return res.newlyUnlockedList || [];
}

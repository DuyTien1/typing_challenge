import React from 'react';
import { XIANXIA_REALMS, loadStoredCultivationState } from './cultivation';
import { getLeaderboardSync } from './leaderboardStorage';

export type FrameRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface AvatarFrameConfig {
  id: string;
  name: string;
  desc: string;
  previewColor: string;
  tag: string;
  rarity: FrameRarity;
  badge?: string;
  borderClass: string;
  boxClass?: string;
  glowClass?: string;
  isConic?: boolean;
  unlockReq: string;
  category?: 'progression' | 'champion' | 'special' | 'xianxia';
  topMode?: string;
  topModeName?: string;
  unlockCondition?: {
    minWpm?: number;
    minGames?: number;
    reqAdmin?: boolean;
  };
}

export const AVATAR_FRAMES: AvatarFrameConfig[] = [
  {
    id: 'default',
    name: 'Khung Cổ Điển',
    desc: 'Viền kim loại tối giản, tinh tế và thanh lịch',
    previewColor: '#64748b',
    tag: 'CƠ BẢN',
    rarity: 'common',
    borderClass: 'border-slate-700 bg-slate-900',
    unlockReq: 'Có sẵn cho tất cả người chơi',
    category: 'progression',
  },
  {
    id: 'flame',
    name: 'Hỏa Long Rực Cháy',
    desc: 'Ngọn lửa nhiệt huyết bốc cháy thiêu rụi mọi phím bấm',
    previewColor: '#f43f5e',
    tag: 'HIẾM',
    rarity: 'rare',
    badge: '🔥',
    borderClass: 'border-rose-500',
    boxClass: 'frame-flame-box',
    glowClass: 'bg-gradient-to-tr from-rose-500/40 via-red-500/30 to-amber-500/30',
    unlockReq: 'Đạt 40+ WPM hoặc đấu 3 trận',
    category: 'progression',
    unlockCondition: { minWpm: 40, minGames: 3 },
  },
  {
    id: 'lightning',
    name: 'Lôi Thần Sấm Sét',
    desc: 'Tia chớp hoàng kim bứt phá vận tốc âm thanh',
    previewColor: '#facc15',
    tag: 'SỬ THI',
    rarity: 'epic',
    badge: '⚡',
    borderClass: 'border-yellow-400',
    boxClass: 'frame-lightning-box',
    glowClass: 'bg-gradient-to-tr from-yellow-500/40 via-amber-400/30 to-lime-500/20',
    unlockReq: 'Đạt 60+ WPM hoặc đấu 8 trận',
    category: 'progression',
    unlockCondition: { minWpm: 60, minGames: 8 },
  },
  {
    id: 'matrix',
    name: 'Ma Trận Lục Bảo',
    desc: 'Dòng mã nguồn Hacker màu ngọc lục bảo huyền bí',
    previewColor: '#34d399',
    tag: 'HIẾM',
    rarity: 'rare',
    badge: '💻',
    borderClass: 'border-emerald-400',
    boxClass: 'frame-matrix-box',
    glowClass: 'bg-gradient-to-tr from-emerald-500/40 via-teal-400/30 to-green-600/30',
    unlockReq: 'Đạt 75+ WPM hoặc đấu 12 trận',
    category: 'progression',
    unlockCondition: { minWpm: 75, minGames: 12 },
  },
  {
    id: 'cosmic',
    name: 'Tinh Vân Vũ Trụ',
    desc: 'Hào quang xanh thiên thanh sâu thẳm giữa dải ngân hà',
    previewColor: '#38bdf8',
    tag: 'SỬ THI',
    rarity: 'epic',
    badge: '🌌',
    borderClass: 'border-sky-400',
    boxClass: 'frame-cosmic-box',
    glowClass: 'bg-gradient-to-tr from-sky-500/40 via-cyan-400/30 to-blue-600/30',
    unlockReq: 'Đạt 90+ WPM hoặc đấu 15 trận',
    category: 'progression',
    unlockCondition: { minWpm: 90, minGames: 15 },
  },
  {
    id: 'arcane',
    name: 'Bí Thuật Cổ Xưa',
    desc: 'Pháp trận tử quang ma thuật bí truyền của cổ đại',
    previewColor: '#c084fc',
    tag: 'TRUYỀN THUYẾT',
    rarity: 'legendary',
    badge: '🔮',
    borderClass: 'border-purple-400',
    boxClass: 'frame-arcane-box',
    glowClass: 'bg-gradient-to-tr from-purple-500/40 via-fuchsia-400/30 to-indigo-500/30',
    unlockReq: 'Đạt 110+ WPM hoặc đấu 25 trận',
    category: 'progression',
    unlockCondition: { minWpm: 110, minGames: 25 },
  },
  {
    id: 'dragon',
    name: 'Huyết Long Cuồng Nộ',
    desc: 'Khí chất rồng thiêng đỏ thẫm uy nghi trấn áp đối thủ',
    previewColor: '#dc2626',
    tag: 'TRUYỀN THUYẾT',
    rarity: 'legendary',
    badge: '🐉',
    borderClass: 'border-red-600',
    boxClass: 'frame-dragon-box',
    glowClass: 'bg-gradient-to-tr from-red-600/40 via-orange-500/30 to-amber-600/30',
    unlockReq: 'Đạt 130+ WPM hoặc đấu 40 trận',
    category: 'progression',
    unlockCondition: { minWpm: 130, minGames: 40 },
  },
  {
    id: 'admin_gold',
    name: 'Khung Admin Hoàng Kim',
    desc: 'Hào quang Conic 360 độ xoay đa sắc hoàng kim tối thượng đặc quyền Quản Trị Viên',
    previewColor: '#fbbf24',
    tag: 'ADMIN VIP',
    rarity: 'mythic',
    badge: '👑',
    borderClass: 'border-amber-300 ring-2 ring-amber-400/90 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-admin-box',
    isConic: true,
    unlockReq: 'Đăng nhập mật khẩu Quản Trị Viên (Admin)',
    category: 'special',
    unlockCondition: { reqAdmin: true },
  },
  // === KHUNG DÀNH CHO QUÁN QUÂN TOP 1 CÁC CHẾ ĐỘ MULTIPLAYER ===
  {
    id: 'top_vi_dau',
    name: 'Khung Quán Quân VI Có Dấu',
    desc: 'Đại Sư Thanh Điệu - Hào quang Hỏa Diệm rực cháy phong vương dành riêng cho Top 1 Tiếng Việt Có Dấu',
    previewColor: '#f43f5e',
    tag: 'TOP 1 VI CÓ DẤU',
    rarity: 'mythic',
    badge: '🔥',
    borderClass: 'border-rose-500 ring-2 ring-rose-500/80 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-top-vi-dau-box',
    glowClass: 'bg-gradient-to-tr from-rose-600/50 via-red-500/40 to-amber-500/30',
    unlockReq: 'Đạt Top 1 Bảng Vàng Kỷ Lục chế độ Tiếng Việt Có Dấu',
    category: 'champion',
    topMode: 'vi_dau',
    topModeName: 'Tiếng Việt Có Dấu',
  },
  {
    id: 'top_vi_nodau',
    name: 'Khung Quán Quân VI Không Dấu',
    desc: 'Thần Phong Lướt Phím - Hào quang Lôi Bão cuồng nộ sấm sét hoàng kim dành riêng cho Top 1 Tiếng Việt Không Dấu',
    previewColor: '#facc15',
    tag: 'TOP 1 VI KHÔNG DẤU',
    rarity: 'mythic',
    badge: '⚡',
    borderClass: 'border-yellow-400 ring-2 ring-yellow-400/80 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-top-vi-nodau-box',
    glowClass: 'bg-gradient-to-tr from-yellow-500/50 via-amber-400/40 to-lime-500/30',
    unlockReq: 'Đạt Top 1 Bảng Vàng Kỷ Lục chế độ Tiếng Việt Không Dấu',
    category: 'champion',
    topMode: 'vi_nodau',
    topModeName: 'Tiếng Việt Không Dấu',
  },
  {
    id: 'top_en',
    name: 'Khung Quán Quân Tiếng Anh',
    desc: 'Ngữ Vương Oxford - Hào quang Lam Ngọc tinh tú sâu thẳm dành riêng cho Top 1 Tiếng Anh',
    previewColor: '#38bdf8',
    tag: 'TOP 1 TIẾNG ANH',
    rarity: 'mythic',
    badge: '🌐',
    borderClass: 'border-sky-400 ring-2 ring-sky-400/80 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-top-en-box',
    glowClass: 'bg-gradient-to-tr from-sky-500/50 via-cyan-400/40 to-blue-600/30',
    unlockReq: 'Đạt Top 1 Bảng Vàng Kỷ Lục chế độ Tiếng Anh',
    category: 'champion',
    topMode: 'en',
    topModeName: 'Tiếng Anh',
  },
  {
    id: 'top_numpad',
    name: 'Khung Quán Quân Bàn Phím Số',
    desc: 'Chiến Thần 58008 - Dòng mã nguồn Lục Bảo điện toán số học tương lai dành riêng cho Top 1 Bàn Phím Số',
    previewColor: '#34d399',
    tag: 'TOP 1 NUMPAD',
    rarity: 'mythic',
    badge: '🔢',
    borderClass: 'border-emerald-400 ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-top-numpad-box',
    glowClass: 'bg-gradient-to-tr from-emerald-500/50 via-teal-400/40 to-green-600/30',
    unlockReq: 'Đạt Top 1 Bảng Vàng Kỷ Lục chế độ Bàn Phím Số',
    category: 'champion',
    topMode: 'numpad',
    topModeName: 'Bàn Phím Số',
  },
  {
    id: 'top_ngau_hung',
    name: 'Khung Quán Quân Ngẫu Hứng',
    desc: 'Bá Vương Chớp Nhoáng - Cuồng phong Cam Lửa bùng nổ phản xạ tốc độ đỉnh cao dành riêng cho Top 1 Ngẫu Hứng Rush',
    previewColor: '#fb923c',
    tag: 'TOP 1 NGẪU HỨNG',
    rarity: 'mythic',
    badge: '🌪️',
    borderClass: 'border-orange-400 ring-2 ring-orange-400/80 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-top-ngau-hung-box',
    glowClass: 'bg-gradient-to-tr from-orange-500/50 via-amber-400/40 to-red-500/30',
    unlockReq: 'Đạt Top 1 Bảng Vàng Kỷ Lục chế độ Ngẫu Hứng Chớp Nhoáng',
    category: 'champion',
    topMode: 'ngau_hung',
    topModeName: 'Ngẫu Hứng',
  },
  {
    id: 'top_doan_chu',
    name: 'Khung Quán Quân Đoán Ô Chữ',
    desc: 'Thám Tử Trí Tuệ - Pháp trận Tử Quang Huyền Bí khai mở mọi ẩn số kỳ bí dành riêng cho Top 1 Đoán Chữ',
    previewColor: '#c084fc',
    tag: 'TOP 1 ĐOÁN CHỮ',
    rarity: 'mythic',
    badge: '🔮',
    borderClass: 'border-purple-400 ring-2 ring-purple-400/80 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-top-doan-chu-box',
    glowClass: 'bg-gradient-to-tr from-purple-500/50 via-fuchsia-400/40 to-indigo-500/30',
    unlockReq: 'Đạt Top 1 Bảng Vàng Kỷ Lục chế độ Đoán Chữ Bí Ẩn',
    category: 'champion',
    topMode: 'doan_chu',
    topModeName: 'Đoán Chữ',
  },
  {
    id: 'top_san_boss',
    name: 'Khung Quán Quân Săn Boss Hắc Long',
    desc: 'Dũng Sĩ Diệt Hắc Long - Huyết Long Ma Vương rực lửa đẫm khí phách trảm Boss dành riêng cho Top 1 Săn Boss',
    previewColor: '#ef4444',
    tag: 'TOP 1 SĂN BOSS',
    rarity: 'mythic',
    badge: '🐉',
    borderClass: 'border-red-500 ring-2 ring-red-500/80 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-top-san-boss-box',
    glowClass: 'bg-gradient-to-tr from-red-600/60 via-orange-500/40 to-amber-500/30',
    unlockReq: 'Đạt Top 1 Bảng Vàng Kỷ Lục sát thương chế độ Săn Boss Ma Vương',
    category: 'champion',
    topMode: 'san_boss',
    topModeName: 'Săn Boss',
  },
  {
    id: 'top_outplay',
    name: 'Khung Quán Quân Outplay Yourself',
    desc: 'Kẻ Vượt Giới Hạn - Cực quang Cyan thời không bứt phá mọi kỷ lục bản thân dành riêng cho Top 1 Outplay',
    previewColor: '#22d3ee',
    tag: 'TOP 1 OUTPLAY',
    rarity: 'mythic',
    badge: '🎯',
    borderClass: 'border-cyan-400 ring-2 ring-cyan-400/80 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-top-outplay-box',
    glowClass: 'bg-gradient-to-tr from-cyan-500/50 via-blue-400/40 to-teal-400/30',
    unlockReq: 'Đạt Top 1 Bảng Vàng Kỷ Lục chế độ Outplay Yourself',
    category: 'champion',
    topMode: 'outplay',
    topModeName: 'Outplay Yourself',
  },
  // === 12 KHUNG CẢNH GIỚI TU TIÊN ĐẬM CHẤT TIÊN HIỆP ===
  {
    id: 'frame_xianxia_luyenkhi',
    name: 'Khung Thanh Mộc Phàm Trần',
    desc: 'Luyện Khí Sơ Tâm - Hơi thở mộc diệp thanh phong thuần khiết của người mới bước chân vào tiên lộ',
    previewColor: '#10b981',
    tag: 'LUYỆN KHÍ',
    rarity: 'rare',
    badge: '🌿',
    borderClass: 'border-emerald-500 ring-1 ring-emerald-400/70 ring-offset-1 ring-offset-slate-950',
    boxClass: 'frame-xianxia-luyenkhi-box',
    glowClass: 'bg-gradient-to-tr from-emerald-600/40 to-green-500/30',
    unlockReq: 'Đạt Cảnh Giới Luyện Khí Kỳ (Level 1 - 30)',
    category: 'xianxia',
  },
  {
    id: 'frame_xianxia_trucco',
    name: 'Khung Huyền Nham Trúc Cơ',
    desc: 'Trúc Cơ Đạo Cơ - Lam ngọc ngưng tụ thành tảng đá ngầm vững chãi bất động giữa biển linh khí',
    previewColor: '#06b6d4',
    tag: 'TRÚC CƠ',
    rarity: 'rare',
    badge: '🧱',
    borderClass: 'border-cyan-400 ring-2 ring-cyan-500/70 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-xianxia-trucco-box',
    glowClass: 'bg-gradient-to-tr from-cyan-600/40 to-blue-500/30',
    unlockReq: 'Đạt Cảnh Giới Trúc Cơ Kỳ (Level 31 - 70)',
    category: 'xianxia',
  },
  {
    id: 'frame_xianxia_ketdan',
    name: 'Khung Kim Đan Cửu Chuyển',
    desc: 'Kim Đan Huyễn Diệu - Ánh hoàng kim đan hỏa cửu chuyển rực rỡ chiếu rọi linh đài',
    previewColor: '#fbbf24',
    tag: 'KẾT ĐAN',
    rarity: 'epic',
    badge: '🔮',
    borderClass: 'border-amber-400 ring-2 ring-amber-400/80 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-xianxia-ketdan-box',
    glowClass: 'bg-gradient-to-tr from-amber-500/50 via-yellow-400/40 to-orange-500/30',
    unlockReq: 'Đạt Cảnh Giới Kết Đan Kỳ (Level 71 - 130)',
    category: 'xianxia',
  },
  {
    id: 'frame_xianxia_nguyenanh',
    name: 'Khung Tử Phủ Nguyên Anh',
    desc: 'Tử Phủ Thần Hồn - Tử khí đông lai ngưng tụ nguyên anh chân thân xuất khiếu du ngoạn',
    previewColor: '#a855f7',
    tag: 'NGUYÊN ANH',
    rarity: 'epic',
    badge: '👶',
    borderClass: 'border-purple-500 ring-2 ring-purple-400/80 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-xianxia-nguyenanh-box',
    glowClass: 'bg-gradient-to-tr from-purple-600/50 via-fuchsia-500/40 to-pink-500/30',
    unlockReq: 'Đạt Cảnh Giới Nguyên Anh Kỳ (Level 131 - 210)',
    category: 'xianxia',
  },
  {
    id: 'frame_xianxia_hoathan',
    name: 'Khung Hóa Thần Ý Cảnh',
    desc: 'Hóa Thần Chi Nhãn - Tinh vân huyền bí ngưng tụ thiên địa ý cảnh, vạn pháp tự nhiên sinh diệt',
    previewColor: '#818cf8',
    tag: 'HÓA THẦN',
    rarity: 'legendary',
    badge: '🌌',
    borderClass: 'border-indigo-400 ring-2 ring-indigo-400/80 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-xianxia-hoathan-box',
    glowClass: 'bg-gradient-to-tr from-indigo-600/60 via-sky-500/40 to-blue-600/30',
    unlockReq: 'Đạt Cảnh Giới Hóa Thần Kỳ (Level 211 - 310)',
    category: 'xianxia',
  },
  {
    id: 'frame_xianxia_luyenhu',
    name: 'Khung Hư Không Vô Cực',
    desc: 'Hư Không Vô Cực - Xoáy không gian sâu thẳm hóa thực vi hư, siêu thoát trói buộc vật chất',
    previewColor: '#60a5fa',
    tag: 'LUYỆN HƯ',
    rarity: 'legendary',
    badge: '🌀',
    borderClass: 'border-blue-400 ring-2 ring-blue-500/80 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-xianxia-luyenhu-box',
    glowClass: 'bg-gradient-to-tr from-blue-600/60 via-cyan-500/40 to-teal-500/30',
    unlockReq: 'Đạt Cảnh Giới Luyện Hư Kỳ (Level 311 - 430)',
    category: 'xianxia',
  },
  {
    id: 'frame_xianxia_hopthe',
    name: 'Khung Lôi Đình Hợp Thể',
    desc: 'Thiên Lôi Hợp Nhất - Sấm sét hoàng kim rền vang kết hợp nhục thân cùng chân linh thành một thể',
    previewColor: '#facc15',
    tag: 'HỢP THỂ',
    rarity: 'legendary',
    badge: '⚡',
    borderClass: 'border-yellow-400 ring-2 ring-yellow-400/90 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-xianxia-hopthe-box',
    glowClass: 'bg-gradient-to-tr from-yellow-500/60 via-amber-400/50 to-orange-500/40',
    unlockReq: 'Đạt Cảnh Giới Hợp Thể Kỳ (Level 431 - 570)',
    category: 'xianxia',
  },
  {
    id: 'frame_xianxia_daithua',
    name: 'Khung Thái Dương Chí Tôn',
    desc: 'Đại Thừa Đỉnh Phong - Mặt trời cam rực rỡ thiêu đốt phàm trần giới, khí phách vạn cổ quy tông',
    previewColor: '#fb923c',
    tag: 'ĐẠI THỪA',
    rarity: 'mythic',
    badge: '☀️',
    borderClass: 'border-orange-500 ring-2 ring-orange-400/90 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-xianxia-daithua-box',
    glowClass: 'bg-gradient-to-tr from-orange-600/70 via-red-500/50 to-amber-500/40',
    unlockReq: 'Đạt Cảnh Giới Đại Thừa Kỳ (Level 571 - 720)',
    category: 'xianxia',
  },
  {
    id: 'frame_xianxia_dokiep',
    name: 'Khung Cửu Trọng Lôi Kiếp',
    desc: 'Huyết Kiếp Cửu Trọng - Lôi kiếp hồng tử cuồng nộ rèn đúc tiên cốt, một bước đạp qua sinh tử',
    previewColor: '#f43f5e',
    tag: 'ĐỘ KIẾP',
    rarity: 'mythic',
    badge: '🌩️',
    borderClass: 'border-rose-500 ring-2 ring-rose-400/90 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-xianxia-dokiep-box',
    glowClass: 'bg-gradient-to-tr from-rose-600/70 via-purple-600/50 to-red-500/50',
    unlockReq: 'Đạt Cảnh Giới Độ Kiếp Kỳ (Level 721 - 870)',
    category: 'xianxia',
  },
  {
    id: 'frame_xianxia_kimtien',
    name: 'Khung Kim Thân Bất Hủ',
    desc: 'Kim Tiên Bất Diệt - Kim quang thuần khiết vô hạ, thọ dữ thiên tề, ngạo thị vạn cổ hồng trần',
    previewColor: '#fef08a',
    tag: 'KIM TIÊN',
    rarity: 'mythic',
    badge: '🌟',
    borderClass: 'border-yellow-200 ring-2 ring-yellow-300 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-xianxia-kimtien-box',
    glowClass: 'bg-gradient-to-tr from-yellow-300/80 via-amber-300/60 to-white/70',
    unlockReq: 'Đạt Cảnh Giới Kim Tiên (Level 871 - 940)',
    category: 'xianxia',
  },
  {
    id: 'frame_xianxia_daila',
    name: 'Khung Đại La Thần Đạo',
    desc: 'Đại La Tiên Vực - Ánh sáng hồng tử huyền ảo siêu thoát thời không, bất nhập ngũ hành',
    previewColor: '#e879f9',
    tag: 'ĐẠI LA TIÊN',
    rarity: 'mythic',
    badge: '🌠',
    borderClass: 'border-fuchsia-400 ring-2 ring-pink-400 ring-offset-2 ring-offset-slate-950',
    boxClass: 'frame-xianxia-daila-box',
    glowClass: 'bg-gradient-to-tr from-fuchsia-500/80 via-pink-400/60 to-indigo-400/50',
    unlockReq: 'Đạt Cảnh Giới Đại La Tiên (Level 941 - 980)',
    category: 'xianxia',
  },
  {
    id: 'frame_xianxia_thienton',
    name: 'Khung Hỗn Độn Thần Hoàng',
    desc: 'Chí Tôn Vạn Cổ - Thái Cực Hỗn Độn luân chuyển càn khôn, chấp chưởng số mệnh chư thiên vạn giới',
    previewColor: '#fbbf24',
    tag: 'THIÊN TÔN',
    rarity: 'mythic',
    badge: '👑',
    borderClass: 'border-amber-300 ring-4 ring-amber-400/90 ring-offset-2 ring-offset-slate-950 shadow-[0_0_30px_rgba(251,191,36,0.9)]',
    boxClass: 'frame-xianxia-thienton-box',
    glowClass: 'bg-gradient-to-tr from-amber-400/90 via-red-500/60 to-yellow-200/90',
    unlockReq: 'Đạt Cảnh Giới Tối Cao: Hỗn Độn Thiên Tôn (Level 981 - 1000)',
    category: 'xianxia',
  },
];

export interface PlayerFrameStats {
  username?: string;
  bestWpm?: number;
  totalGames?: number;
  isAdmin?: boolean;
  highScores?: Record<string, { username?: string; wpm?: number; score?: number } | null>;
}

export function checkIsAdmin(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return (
      localStorage.getItem('fasttyping_is_admin') === 'true' ||
      sessionStorage.getItem('fasttyping_is_admin') === 'true'
    );
  } catch {
    return false;
  }
}

export function setAdminStatus(val: boolean) {
  try {
    if (typeof window === 'undefined') return;
    if (val) {
      localStorage.setItem('fasttyping_is_admin', 'true');
      sessionStorage.setItem('fasttyping_is_admin', 'true');
      addCustomOwnedFrame('admin_gold');
    } else {
      localStorage.removeItem('fasttyping_is_admin');
      sessionStorage.removeItem('fasttyping_is_admin');
    }
  } catch {
    // ignore
  }
}

export function getCustomOwnedFrames(): string[] {
  try {
    const raw = localStorage.getItem('fasttyping_owned_frames');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function addCustomOwnedFrame(frameId: string) {
  try {
    const current = getCustomOwnedFrames();
    if (!current.includes(frameId)) {
      current.push(frameId);
      localStorage.setItem('fasttyping_owned_frames', JSON.stringify(current));
    }
  } catch {
    // ignore
  }
}

/**
 * Check if a player owns a specific frame
 */
export function isFrameOwned(frameId: string, stats?: PlayerFrameStats): boolean {
  if (!frameId || frameId === 'default') return true;

  const userIsAdmin = Boolean(stats?.isAdmin || checkIsAdmin());

  // Root Admin has full access to every frame
  if (userIsAdmin) return true;

  // Currently stored frame is always kept accessible to prevent lock-out
  const activeFrame = getStoredFrame();
  if (activeFrame === frameId) return true;

  // Explicitly unlocked in custom owned list
  const customList = getCustomOwnedFrames();
  if (customList.includes(frameId)) return true;

  const frame = getFrameConfig(frameId);
  if (!frame) return false;

  // Check automated champion condition for top multiplayer frames
  if (frame.category === 'champion' || frame.topMode || frameId.startsWith('top_')) {
    const targetMode = frame.topMode || frameId.replace('top_', '');

    // 1. Resolve current high scores: from stats or IndexedDB/memory cache (Non-blocking)
    const currentHighScores = stats?.highScores || getLeaderboardSync();

    // 2. Resolve current player username: from stats or localStorage
    const currentUsername = (
      stats?.username ||
      (() => {
        try {
          return localStorage.getItem('fasttyping_username') || '';
        } catch {
          return '';
        }
      })()
    ).trim().toLowerCase();

    if (currentHighScores && currentUsername) {
      const topRecord = currentHighScores[targetMode];
      if (
        topRecord &&
        topRecord.username &&
        topRecord.username.trim().toLowerCase() === currentUsername
      ) {
        return true;
      }
    }
    return false;
  }

  // Check Xianxia cultivation realm requirement
  if (frame.category === 'xianxia' || frameId.startsWith('frame_xianxia_')) {
    const realmIdx = XIANXIA_REALMS.findIndex((r) => r.frameId === frameId);
    if (realmIdx >= 0) {
      const cultivation = loadStoredCultivationState();
      return cultivation.realmIndex >= realmIdx;
    }
    return false;
  }

  // Check automated milestone requirements
  if (!frame.unlockCondition) return false;

  const { minWpm, minGames, reqAdmin } = frame.unlockCondition;
  if (reqAdmin && !userIsAdmin) return false;

  const playerWpm = stats?.bestWpm || 0;
  const playerGames = stats?.totalGames || 0;

  if (minWpm && playerWpm >= minWpm) return true;
  if (minGames && playerGames >= minGames) return true;

  return false;
}

export function getStoredFrame(): string {
  try {
    return localStorage.getItem('fasttyping_user_frame') || 'default';
  } catch {
    return 'default';
  }
}

export function setStoredFrame(frameId: string) {
  try {
    localStorage.setItem('fasttyping_user_frame', frameId);
  } catch {
    // ignore
  }
}

export function getFrameConfig(frameId?: string): AvatarFrameConfig {
  return AVATAR_FRAMES.find((f) => f.id === frameId) || AVATAR_FRAMES[0];
}

/**
 * Render Avatar with frame wrapper
 */
export const AvatarWithFrame: React.FC<{
  icon: string;
  frameId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
  isLocked?: boolean;
  realmIndex?: number;
  showRealmAura?: boolean;
}> = ({
  icon,
  frameId = 'default',
  size = 'md',
  className = '',
  showBadge = true,
  isLocked = false,
  realmIndex,
  showRealmAura = true,
}) => {
  const frame = getFrameConfig(frameId);

  const sizeMap = {
    sm: { box: 'w-10 h-10 text-xl', badge: 'w-4 h-4 text-[10px]' },
    md: { box: 'w-12 h-12 text-2xl', badge: 'w-4 h-4 text-[10px]' },
    lg: { box: 'w-16 h-16 text-3xl', badge: 'w-5 h-5 text-xs' },
    xl: { box: 'w-20 h-20 text-4xl', badge: 'w-6 h-6 text-sm' },
  }[size];

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* Xianxia Realm Aura Halo */}
      {!isLocked && showRealmAura && typeof realmIndex === 'number' && realmIndex >= 0 && realmIndex <= 11 && (
        <div
          className={`realm-aura-glow realm-aura-${realmIndex}`}
          title={XIANXIA_REALMS[realmIndex]?.name}
        />
      )}

      {/* Conic Ring for admin_gold / mythic */}
      {!isLocked && frame.isConic && (
        <>
          <div className="admin-conic-glow" />
          <div className="admin-conic-sharp" />
        </>
      )}

      {/* Ambient Glow */}
      {!isLocked && frame.glowClass && !frame.isConic && (
        <div
          className={`absolute -inset-1.5 rounded-2xl ${frame.glowClass} blur-[8px] opacity-75 pointer-events-none transition-opacity`}
        />
      )}

      {/* Main Avatar Container */}
      <div
        className={`relative ${sizeMap.box} rounded-2xl bg-slate-950 flex items-center justify-center border-2 transition-transform select-none z-10 ${
          isLocked
            ? 'border-slate-800 bg-slate-950/60 opacity-50 grayscale'
            : `${frame.borderClass} ${frame.boxClass || ''}`
        }`}
      >
        <span className="relative z-10 flex items-center justify-center leading-none pointer-events-none select-none">
          {icon}
        </span>

        {/* Insignia Badge on Corner */}
        {showBadge && !isLocked && frame.badge && (
          <div
            className={`absolute -top-1.5 -right-1.5 ${sizeMap.badge} rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-lg z-30 pointer-events-none`}
            title={frame.name}
          >
            <span className="leading-none">{frame.badge}</span>
          </div>
        )}
      </div>
    </div>
  );
};

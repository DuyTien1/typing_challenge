import React, { useState } from 'react';
import { Player, HighScoreRecord, PlayerTitle } from '../types';
import { Crown, Shield, Flame, Zap, Globe, Hash, Sparkles, Trophy, HelpCircle, Swords, Target } from 'lucide-react';
import { AvatarWithFrame } from './frames';
import { getAchievementById } from './achievements';
import { XIANXIA_REALMS, loadStoredCultivationState, getSubStage } from './cultivation';

export const ADMIN_TITLE: PlayerTitle = {
  id: 'admin',
  name: 'QUẢN TRỊ VIÊN TỐI CAO',
  badge: '👑',
  type: 'admin',
  modeName: 'Hệ Thống FastTyping',
  colorClass: 'text-amber-400',
  borderClass: 'border-amber-400 ring-2 ring-amber-400/80 ring-offset-2 ring-offset-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.65)]',
  glowClass: 'bg-gradient-to-tr from-amber-500/30 via-yellow-400/20 to-red-500/20',
  description: 'Nắm giữ quyền năng tối thượng: toàn quyền điều chỉnh thời gian thi đấu, kiểm soát tỷ lệ từ khó và chiêu thức Boss Hắc Long.',
  statLabel: 'Quyền Hạn',
  statValue: 'Toàn quyền Quản Trị Hệ Thống (Root Admin)',
  tag: 'ADMIN HỆ THỐNG',
};

export const CHAMPION_TITLES: Record<string, Omit<PlayerTitle, 'statValue'>> = {
  vi_dau: {
    id: 'top_vi_dau',
    name: 'ĐẠI SƯ THANH ĐIỆU',
    badge: '🔥',
    type: 'champion',
    mode: 'vi_dau',
    modeName: 'Tiếng Việt Có Dấu',
    colorClass: 'text-rose-400',
    borderClass: 'border-rose-500 ring-2 ring-rose-500/80 ring-offset-2 ring-offset-slate-950 shadow-[0_0_18px_rgba(244,63,94,0.65)]',
    glowClass: 'bg-gradient-to-tr from-rose-500/30 via-red-500/20 to-amber-500/20',
    description: 'Bậc thầy bộ gõ Telex & VNI, gõ thanh điệu sắc bén chuẩn xác như ngọn lửa bùng cháy thiêu đốt đấu trường.',
    statLabel: 'Kỷ lục Quán Quân',
    tag: 'TOP 1 VI CÓ DẤU',
  },
  vi_nodau: {
    id: 'top_vi_nodau',
    name: 'THẦN PHONG LƯỚT PHÍM',
    badge: '⚡',
    type: 'champion',
    mode: 'vi_nodau',
    modeName: 'Tiếng Việt Không Dấu',
    colorClass: 'text-yellow-400',
    borderClass: 'border-yellow-400 ring-2 ring-yellow-400/80 ring-offset-2 ring-offset-slate-950 shadow-[0_0_18px_rgba(250,204,21,0.65)]',
    glowClass: 'bg-gradient-to-tr from-yellow-500/30 via-amber-400/20 to-lime-500/20',
    description: 'Tốc độ lướt phím tựa như tia chớp, bứt phá mọi rào cản tốc độ và thống trị bảng vàng thần tốc.',
    statLabel: 'Kỷ lục Quán Quân',
    tag: 'TOP 1 VI KHÔNG DẤU',
  },
  en: {
    id: 'top_en',
    name: 'NGỮ VƯƠNG OXFORD',
    badge: '🌐',
    type: 'champion',
    mode: 'en',
    modeName: 'Tiếng Anh (English)',
    colorClass: 'text-sky-400',
    borderClass: 'border-sky-400 ring-2 ring-sky-400/80 ring-offset-2 ring-offset-slate-950 shadow-[0_0_18px_rgba(56,189,248,0.65)]',
    glowClass: 'bg-gradient-to-tr from-sky-500/30 via-cyan-400/20 to-blue-600/20',
    description: 'Thông thạo từ vựng Oxford học thuật, phản xạ ngoại ngữ mượt mà và chuẩn xác hàng đầu máy chủ.',
    statLabel: 'Kỷ lục Quán Quân',
    tag: 'TOP 1 TIẾNG ANH',
  },
  numpad: {
    id: 'top_numpad',
    name: 'CHIẾN THẦN 58008',
    badge: '🔢',
    type: 'champion',
    mode: 'numpad',
    modeName: 'Bàn Phím Số (Numpad)',
    colorClass: 'text-emerald-400',
    borderClass: 'border-emerald-400 ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-slate-950 shadow-[0_0_18px_rgba(52,211,153,0.65)]',
    glowClass: 'bg-gradient-to-tr from-emerald-500/30 via-teal-400/20 to-green-600/20',
    description: 'Thao tác dãy phím số bên phải nhanh như tia laser máy quét, giải mã phép tính cơ khí không một vết lỗi.',
    statLabel: 'Kỷ lục Quán Quân',
    tag: 'TOP 1 NUMPAD',
  },
  ngau_hung: {
    id: 'top_ngau_hung',
    name: 'BÁ VƯƠNG CHỚP NHOÁNG',
    badge: '🌪️',
    type: 'champion',
    mode: 'ngau_hung',
    modeName: 'Ngẫu Hứng (Rush)',
    colorClass: 'text-orange-400',
    borderClass: 'border-orange-400 ring-2 ring-orange-400/80 ring-offset-2 ring-offset-slate-950 shadow-[0_0_18px_rgba(251,146,60,0.65)]',
    glowClass: 'bg-gradient-to-tr from-orange-500/30 via-amber-400/20 to-red-500/20',
    description: 'Phản xạ thần tốc trong từng nhịp 5 giây chớp nhoáng, duy trì chuỗi thắng bứt phá áp đảo.',
    statLabel: 'Kỷ lục Quán Quân',
    tag: 'TOP 1 NGẪU HỨNG',
  },
  doan_chu: {
    id: 'top_doan_chu',
    name: 'THÁM TỬ TRÍ TUỆ',
    badge: '🔮',
    type: 'champion',
    mode: 'doan_chu',
    modeName: 'Đoán Chữ (Mystery)',
    colorClass: 'text-purple-400',
    borderClass: 'border-purple-400 ring-2 ring-purple-400/80 ring-offset-2 ring-offset-slate-950 shadow-[0_0_18px_rgba(192,132,252,0.65)]',
    glowClass: 'bg-gradient-to-tr from-purple-500/30 via-fuchsia-400/20 to-indigo-500/20',
    description: 'Trực giác nhạy bén, phá vỡ gợi ý bí ẩn và đoán chính xác từ khóa khi đối thủ còn ngơ ngác.',
    statLabel: 'Kỷ lục Quán Quân',
    tag: 'TOP 1 ĐOÁN CHỮ',
  },
  san_boss: {
    id: 'top_san_boss',
    name: 'DŨNG SĨ DIỆT HẮC LONG',
    badge: '🐉',
    type: 'champion',
    mode: 'san_boss',
    modeName: 'Săn Boss (Raid)',
    colorClass: 'text-red-500',
    borderClass: 'border-red-500 ring-2 ring-red-500/80 ring-offset-2 ring-offset-slate-950 shadow-[0_0_22px_rgba(239,68,68,0.75)]',
    glowClass: 'bg-gradient-to-tr from-red-600/30 via-orange-500/20 to-amber-500/20',
    description: 'Chiến binh quả cảm giáng sấm sét xé toạc khiên giáp Ma Vương Hắc Long, bảo vệ hòa bình đấu trường.',
    statLabel: 'Kỷ lục Sát Thương',
    tag: 'TOP 1 SĂN BOSS',
  },
  outplay: {
    id: 'top_outplay',
    name: 'KẺ VƯỢT GIỚI HẠN',
    badge: '🎯',
    type: 'champion',
    mode: 'outplay',
    modeName: 'Outplay Yourself',
    colorClass: 'text-cyan-400',
    borderClass: 'border-cyan-400 ring-2 ring-cyan-400/80 ring-offset-2 ring-offset-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.65)]',
    glowClass: 'bg-gradient-to-tr from-cyan-500/30 via-blue-400/20 to-teal-400/20',
    description: 'Vượt qua bóng ma của chính mình sau từng vòng đấu, không ngừng vượt qua giới hạn của bản thân.',
    statLabel: 'Kỷ lục Quán Quân',
    tag: 'TOP 1 OUTPLAY',
  },
};

/**
 * Identify title for a player based on Admin login or Top 1 leaderboard status.
 */
export function getPlayerTitle(
  player: Player,
  highScores: Record<string, HighScoreRecord | null>,
  isAdminUser: boolean,
  isCurrentPlayer: boolean
): PlayerTitle | null {
  // 1. Current user logged in as Admin, or player named 'admin' / 'administrator'
  if ((isCurrentPlayer && isAdminUser) || player.username.toLowerCase() === 'admin' || player.username.toLowerCase() === 'quantrivien') {
    return ADMIN_TITLE;
  }

  // 2. Check if player username matches any top 1 in highScores
  for (const [modeKey, record] of Object.entries(highScores)) {
    if (
      record &&
      ((record.username && record.username.trim().toLowerCase() === player.username.trim().toLowerCase()) ||
        (record.displayName && record.displayName.trim().toLowerCase() === player.username.trim().toLowerCase()))
    ) {
      const template = CHAMPION_TITLES[modeKey];
      if (template) {
        const unit = modeKey === 'san_boss' ? 'DMG' : (modeKey === 'ngau_hung' || modeKey === 'doan_chu') ? 'Điểm' : 'WPM';
        const value = record.score > 0 ? `${record.score} ${unit}` : `${record.wpm} ${unit}`;
        return {
          ...template,
          statValue: value,
        };
      }
    }
  }

  // 3. Tiên Hiệp Achievement Title (from showcase achievements)
  // CHỈ dành cho người chơi đã đăng nhập! Khách vãng lai và Bot không có danh hiệu thành tựu
  if (player.isLoggedIn && player.showcaseAchievements && player.showcaseAchievements.length > 0 && !player.isBot) {
    const primaryId = player.showcaseAchievements[0];
    const ach = getAchievementById(primaryId);
    if (ach) {
      return {
        id: `xianxia_${ach.id}`,
        name: ach.title,
        badge: ach.icon,
        type: 'xianxia',
        modeName: ach.realm,
        colorClass: ach.colorClass,
        borderClass: ach.borderClass,
        glowClass: ach.glowClass,
        description: `Thành tựu: ${ach.name} - ${ach.req}`,
        statLabel: 'Cảnh Giới',
        statValue: ach.realm,
        tag: ach.title,
      };
    }
  }

  // 4. Danh Hiệu Cảnh Giới Tu Tiên (12 Cảnh Giới: Luyện Khí -> Thiên Tôn)
  let cultInfo = player.cultivation;
  if (!cultInfo && isCurrentPlayer) {
    const cult = loadStoredCultivationState();
    const realm = XIANXIA_REALMS[cult.realmIndex] || XIANXIA_REALMS[0];
    cultInfo = {
      level: cult.level,
      realmIndex: cult.realmIndex,
      tier: cult.tier,
      realmName: realm.name,
      subStage: getSubStage(cult.tier),
      thoNguyen: cult.thoNguyen,
      maxThoNguyen: cult.maxThoNguyen,
    };
  }

  if (cultInfo && !player.isBot) {
    const realm = XIANXIA_REALMS[cultInfo.realmIndex] || XIANXIA_REALMS[0];
    return {
      id: realm.titleId,
      name: realm.titleName,
      badge: realm.icon,
      type: 'xianxia',
      modeName: `${realm.name} • Tầng ${cultInfo.tier} [${cultInfo.subStage}]`,
      colorClass: realm.colorClass,
      borderClass: realm.borderClass,
      glowClass: realm.glowClass,
      description: `Cảnh giới: ${realm.name} Tầng ${cultInfo.tier} (${cultInfo.subStage}) - Lv.${cultInfo.level}/1000. ${realm.desc}`,
      statLabel: 'Thọ Nguyên',
      statValue: `${cultInfo.thoNguyen}/${cultInfo.maxThoNguyen} Điểm`,
      tag: realm.titleName,
    };
  }

  return null;
}

/**
 * Avatar Frame Component with dynamic glowing border, crown insignia and rich hover popover!
 */
export const AvatarTitleFrame: React.FC<{
  player: Player;
  highScores: Record<string, HighScoreRecord | null>;
  isAdminUser: boolean;
  isCurrentPlayer: boolean;
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ player, highScores, isAdminUser, isCurrentPlayer, size = 'md', onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const title = getPlayerTitle(player, highScores, isAdminUser, isCurrentPlayer);

  // Effective frame: prioritize user-selected player.frame, fallback to champion frame for top players, admin_gold for admin, or default
  const effectiveFrame =
    player.frame && player.frame !== 'default'
      ? player.frame
      : title
      ? (title.type === 'admin' ? 'admin_gold' : title.id)
      : (player.frame || 'default');

  if (!title) {
    return (
      <div
        onClick={onClick}
        className="relative cursor-pointer transition-transform hover:scale-105 select-none"
      >
        <AvatarWithFrame icon={player.icon} frameId={effectiveFrame} size={size} />
      </div>
    );
  }

  const isBossChampion = title.id === 'top_san_boss';
  const isAdmin = title.type === 'admin';

  return (
    <div
      className="relative group cursor-pointer select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        if (onClick) {
          onClick(e);
        } else {
          setIsHovered((prev) => !prev);
        }
      }}
    >
      {/* 1. Admin Aura or Ambient Halo */}
      {isAdmin && (
        <>
          <div className="admin-conic-glow" />
          <div className="admin-conic-sharp" />
        </>
      )}
      {!isAdmin && (
        <div
          className={`absolute -inset-1.5 rounded-2xl ${title.glowClass} blur-[8px] opacity-80 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
        />
      )}

      {/* Main Avatar with chosen frame */}
      <div className="relative transition-all duration-200 group-hover:scale-105 z-10">
        <AvatarWithFrame icon={player.icon} frameId={effectiveFrame} size={size} />

        {/* Top-Right Badge/Insignia */}
        <div
          className={`absolute -top-2 -right-2 rounded-full flex items-center justify-center shadow-lg z-30 transition-transform group-hover:scale-110 ${
            isAdmin
              ? 'w-5 h-5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black ring-2 ring-white/90 shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse'
              : isBossChampion
              ? 'w-5 h-5 bg-gradient-to-r from-red-600 to-orange-500 text-white ring-1.5 ring-amber-300 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
              : 'w-4.5 h-4.5 bg-slate-900 border border-amber-400/80 text-amber-400 text-[10px]'
          }`}
          title={title.name}
        >
          {isAdmin ? (
            <Crown className="w-3 h-3 fill-black text-black" />
          ) : (
            <span className="text-[11px] leading-none">{title.badge}</span>
          )}
        </div>

        {/* Admin Crown Floating on top */}
        {isAdmin && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center pointer-events-none animate-bounce">
            <span className="text-xs drop-shadow-[0_0_8px_rgba(251,191,36,1)]">👑</span>
          </div>
        )}
      </div>

      {/* Rich Popover Tooltip on Hover */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 w-68 sm:w-76 pointer-events-none animate-fadeIn">
          <div
            className={`relative p-3.5 rounded-2xl bg-slate-950/95 border shadow-2xl backdrop-blur-md text-left space-y-2 ring-1 ring-white/10 ${
              isAdmin
                ? 'border-amber-400/80 shadow-[0_0_30px_rgba(251,191,36,0.4)]'
                : 'border-slate-700/80'
            }`}
          >
            {/* Header: Title Tag & Name */}
            <div className="flex items-center justify-between gap-1.5">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  isAdmin
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-400/80 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {isAdmin && <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />}
                {title.tag}
              </span>
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                {title.badge} {title.type === 'admin' ? 'Quản Trị Tối Cao' : title.type === 'xianxia' ? 'Danh Hiệu Tiên Hiệp' : 'Quán Quân'}
              </span>
            </div>

            {/* Title Full Name */}
            <div
              className={`text-sm font-black tracking-wide ${
                isAdmin
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                  : title.colorClass
              }`}
            >
              {title.name}
            </div>

            {/* Mode & Record Info */}
            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Màn chơi:</span>
                <span className="font-bold text-white">{title.modeName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{title.statLabel}:</span>
                <span className="font-mono font-black text-amber-400">{title.statValue}</span>
              </div>
            </div>

            {/* Lore Description */}
            <p className="text-[11px] text-slate-300 leading-relaxed italic">
              &ldquo;{title.description}&rdquo;
            </p>

            {/* Card Arrow pointing down to avatar */}
            <div
              className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 rotate-45 border-r border-b ${
                isAdmin ? 'border-amber-400/80' : 'border-slate-700/80'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

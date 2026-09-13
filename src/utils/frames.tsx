import React from 'react';

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
    unlockCondition: { reqAdmin: true },
  },
];

export interface PlayerFrameStats {
  bestWpm?: number;
  totalGames?: number;
  isAdmin?: boolean;
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

  // Check automated milestone requirements
  const frame = getFrameConfig(frameId);
  if (!frame || !frame.unlockCondition) return false;

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
}> = ({ icon, frameId = 'default', size = 'md', className = '', showBadge = true, isLocked = false }) => {
  const frame = getFrameConfig(frameId);

  const sizeMap = {
    sm: { box: 'w-10 h-10 text-xl', badge: 'w-4 h-4 text-[10px]' },
    md: { box: 'w-12 h-12 text-2xl', badge: 'w-4 h-4 text-[10px]' },
    lg: { box: 'w-16 h-16 text-3xl', badge: 'w-5 h-5 text-xs' },
    xl: { box: 'w-20 h-20 text-4xl', badge: 'w-6 h-6 text-sm' },
  }[size];

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
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
        <span className="relative z-20 flex items-center justify-center leading-none pointer-events-none select-none">
          {icon}
        </span>

        {/* Insignia Badge on Corner */}
        {showBadge && !isLocked && frame.badge && (
          <div
            className={`absolute -top-1.5 -right-1.5 ${sizeMap.badge} rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-lg z-20 pointer-events-none`}
            title={frame.name}
          >
            <span className="leading-none">{frame.badge}</span>
          </div>
        )}
      </div>
    </div>
  );
};

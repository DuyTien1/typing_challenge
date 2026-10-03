import React, { useState, useEffect, useMemo } from 'react';
import { Player, HighScoreRecord, LeaderboardEntry, SectRole, PlayerProfileDetail } from '../types';
import { AvatarWithFrame, getFrameConfig } from '../utils/frames';
import { getPlayerTitle } from '../utils/titles';
import { getAchievementById, XIANXIA_ACHIEVEMENTS } from '../utils/achievements';
import { soundFx } from '../utils/audio';
import {
  X,
  Flame,
  Zap,
  Award,
  Crown,
  Bot,
  ShieldCheck,
  Users,
  Target,
  Keyboard,
  MessageSquare,
  UserPlus,
  Ghost,
  Sparkles,
  Compass,
  Clock,
  Check,
  Copy,
  Gem,
  Heart,
  Shield,
  Star,
  Activity,
  Scroll,
  TrendingUp,
  Cpu,
  Share2,
  Lock,
  Swords,
} from 'lucide-react';
import { resolveBestWpmRecord } from './WpmRecordBadge';
import { SECT_ROLES_CONFIG, XIANXIA_REALMS, getSectsLeaderboard } from '../utils/cultivation';
import { fetchPlayerProfile } from '../utils/roomManager';

export interface PlayerSimpleProfileModalProps {
  isOpen: boolean;
  player: Player | LeaderboardEntry | HighScoreRecord | any | null;
  isHost?: boolean;
  isMe?: boolean;
  highScores?: Record<string, HighScoreRecord | null>;
  isAdminUser?: boolean;
  modeName?: string;
  onClose: () => void;
  onOpenWhisper?: (username: string, userId?: string) => void;
  onAddFriend?: (userId: string, username?: string) => void;
  onStartGhostChallenge?: (entry: any) => void;
  sectList?: any[];
  currentUser?: any;
  cultivationState?: any;
}

type ProfileTab = 'cultivation' | 'records' | 'achievements' | 'bot';

export const PlayerSimpleProfileModal: React.FC<PlayerSimpleProfileModalProps> = ({
  isOpen,
  player,
  isHost = false,
  isMe = false,
  highScores = {},
  isAdminUser = false,
  modeName,
  onClose,
  onOpenWhisper,
  onAddFriend,
  onStartGhostChallenge,
  sectList,
  currentUser,
  cultivationState,
}) => {
  const [serverProfile, setServerProfile] = useState<PlayerProfileDetail | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('cultivation');
  const [friendRequested, setFriendRequested] = useState<boolean>(false);

  // Esc key listener to quickly close player profile modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        soundFx.playKeyClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  // Reset tab & state on open
  useEffect(() => {
    if (isOpen) {
      setFriendRequested(false);
      if (player?.isBot) {
        setActiveTab('bot');
      } else {
        setActiveTab('cultivation');
      }
    }
  }, [isOpen, player?.username, player?.isBot]);

  // Fetch real-time verified server profile when opened
  useEffect(() => {
    if (!isOpen || !player?.username) {
      setServerProfile(null);
      return;
    }
    let isCancelled = false;
    setIsLoadingProfile(true);

    fetchPlayerProfile(player.username)
      .then((res) => {
        if (!isCancelled && res.success && res.profile) {
          setServerProfile(res.profile);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch server profile for player:', err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingProfile(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, player?.username]);

  // Effective Me check
  const isActuallyMe = Boolean(
    isMe ||
    (currentUser && (
      (player?.userId && currentUser.id === player.userId) ||
      (player?.id && currentUser.id === player.id) ||
      (player?.username && currentUser.username && player.username.toLowerCase() === currentUser.username.toLowerCase())
    ))
  );

  // Resolve Sect info (Server verified -> Current user state -> Player obj -> Sects list)
  const resolvedSectInfo = useMemo(() => {
    if (!player) return null;

    // 1. Server verified profile
    let sectName = serverProfile?.sectInfo?.name || serverProfile?.cultivation?.sect?.sectName;
    let sectTag = serverProfile?.sectInfo?.tag || serverProfile?.cultivation?.sect?.sectTag;
    let sectRole = serverProfile?.sectInfo?.role || serverProfile?.cultivation?.sect?.role;
    let sectBadgeIcon = serverProfile?.sectInfo?.badgeIcon || '🏰';
    let sectSlogan = serverProfile?.sectInfo?.slogan || '';
    let sectColor = serverProfile?.sectInfo?.bannerColor || '#f59e0b';
    let linhMachLevel = serverProfile?.sectInfo?.linhMachLevel || 1;
    let memberCount = serverProfile?.sectInfo?.memberCount || 1;

    // 2. If viewing myself, check current user cultivation state
    if (!sectName && isActuallyMe) {
      const mySect = currentUser?.cultivation?.sect || cultivationState?.sect;
      if (mySect) {
        sectName = mySect.sectName || mySect.name;
        sectTag = mySect.sectTag || mySect.tag;
        sectRole = mySect.role || 'noi_mon';
      }
    }

    // 3. Fallback to player object fields
    if (!sectName) {
      sectName = player.sectName || (player as any).sect?.sectName || (player as any).sect?.name;
      sectTag = player.sectTag || (player as any).sect?.sectTag || (player as any).sect?.tag;
      sectRole = player.sectRole || (player as any).sectRole || (player as any).sect?.role;
    }

    // 4. Fallback search in sectList or local sects
    const sects = (sectList && sectList.length > 0) ? sectList : getSectsLeaderboard();
    const uLower = (player.username || '').toLowerCase();
    const dLower = (player.displayName || '').toLowerCase();
    const pId = player.userId || player.id;

    const matchedSect = sects.find((s: any) => {
      if (sectName && s.name?.toLowerCase() === sectName.toLowerCase()) return true;
      if (s.leaderName && (s.leaderName.toLowerCase() === uLower || s.leaderName.toLowerCase() === dLower)) return true;
      return (s.members || []).some(
        (m: any) =>
          (pId && m.userId === pId) ||
          (m.username && m.username.toLowerCase() === uLower) ||
          (m.displayName && m.displayName.toLowerCase() === dLower)
      );
    });

    if (matchedSect) {
      sectName = matchedSect.name;
      sectTag = matchedSect.tag || sectTag;
      sectBadgeIcon = matchedSect.badgeIcon || '🏰';
      sectSlogan = matchedSect.slogan || matchedSect.description || sectSlogan;
      sectColor = matchedSect.bannerColor || '#f59e0b';
      linhMachLevel = matchedSect.linhMachLevel || linhMachLevel;
      memberCount = matchedSect.memberCount || matchedSect.members?.length || memberCount;

      if (!sectRole) {
        if (matchedSect.leaderName && (matchedSect.leaderName.toLowerCase() === uLower || matchedSect.leaderName.toLowerCase() === dLower)) {
          sectRole = 'chuong_mon';
        } else {
          const member = (matchedSect.members || []).find(
            (m: any) =>
              (pId && m.userId === pId) ||
              (m.username && m.username.toLowerCase() === uLower) ||
              (m.displayName && m.displayName.toLowerCase() === dLower)
          );
          sectRole = member?.role || 'noi_mon';
        }
      }
    }

    if (!sectName) return null;

    const effectiveRole = (sectRole || 'noi_mon') as SectRole;
    const roleConfig = SECT_ROLES_CONFIG[effectiveRole]
      ? SECT_ROLES_CONFIG[effectiveRole]
      : {
          title: 'Nội Môn Đệ Tử',
          badge: '🛡️',
          colorClass: 'text-sky-300',
          bgClass: 'bg-sky-500/10',
          borderClass: 'border-sky-400/40',
          glowClass: 'shadow-sm',
          privilege: 'Đệ tử môn phái',
        };

    return {
      name: sectName,
      tag: sectTag,
      role: effectiveRole,
      roleConfig,
      badgeIcon: sectBadgeIcon,
      slogan: sectSlogan,
      bannerColor: sectColor,
      linhMachLevel,
      memberCount,
    };
  }, [player, serverProfile, isActuallyMe, currentUser, cultivationState, sectList]);

  // Resolve Realm & Cultivation Level
  const resolvedRealm = useMemo(() => {
    if (!player) return null;

    const isGuestUser = isActuallyMe
      ? !currentUser
      : (!player.userId && (player.username.startsWith('Tán Tu') || player.username.startsWith('TayGõ') || player.username.startsWith('Khách')));

    if (isGuestUser) {
      return {
        name: 'Tán Tu (Chưa Đăng Nhập)',
        icon: '🌱',
        titleName: 'Tán Tu',
        subStage: 'Phàm Nhân',
        level: 0,
        exp: 0,
        maxExp: 1000,
        thoNguyen: 100,
        linhThach: 0,
        colorClass: 'text-slate-400',
        isGuest: true,
      };
    }

    const rName =
      serverProfile?.cultivation?.realmName ||
      (isActuallyMe ? (currentUser?.cultivation?.realmName || cultivationState?.realmName) : null) ||
      player.realmName ||
      'Luyện Khí Kỳ';

    const match = XIANXIA_REALMS.find((r) => r.name.toLowerCase() === rName.toLowerCase()) || XIANXIA_REALMS[0];
    const lvl =
      serverProfile?.cultivation?.level ||
      (isActuallyMe ? (currentUser?.cultivation?.level || cultivationState?.level) : null) ||
      player.level ||
      1;

    const exp =
      serverProfile?.cultivation?.exp ??
      (isActuallyMe ? (currentUser?.cultivation?.exp ?? cultivationState?.exp) : null) ??
      player.exp ??
      0;

    const maxExp =
      serverProfile?.cultivation?.maxExp ||
      (isActuallyMe ? (currentUser?.cultivation?.maxExp || cultivationState?.maxExp) : null) ||
      player.maxExp ||
      1000;

    const thoNguyen =
      serverProfile?.cultivation?.thoNguyen ??
      (isActuallyMe ? (currentUser?.cultivation?.thoNguyen ?? cultivationState?.thoNguyen) : null) ??
      player.thoNguyen ??
      240;

    const linhThach =
      serverProfile?.cultivation?.linhThach ??
      (isActuallyMe ? (currentUser?.cultivation?.linhThach ?? cultivationState?.linhThach) : null) ??
      player.linhThach ??
      100;

    const subStage =
      serverProfile?.cultivation?.subStage ||
      (isActuallyMe ? (currentUser?.cultivation?.subStage || cultivationState?.subStage) : null) ||
      player.subStage ||
      'Sơ Kỳ';

    return {
      name: rName,
      icon: serverProfile?.cultivation?.realmIcon || player.realmIcon || match.icon || '🌿',
      titleName: serverProfile?.cultivation?.titleName || match.titleName,
      subStage,
      level: lvl,
      exp,
      maxExp,
      thoNguyen,
      linhThach,
      colorClass: match.colorClass,
      isGuest: false,
    };
  }, [player, serverProfile, isActuallyMe, currentUser, cultivationState]);

  if (!isOpen || !player) return null;

  const isTop1 = player.rank === 1;
  const isTop2 = player.rank === 2;
  const isTop3 = player.rank === 3;

  const title = getPlayerTitle(player as Player, highScores, isAdminUser, isActuallyMe);
  const effectiveFrame =
    serverProfile?.frame ||
    (player.frame && player.frame !== 'default' ? player.frame : null) ||
    (isTop1 ? 'frame_kim_bang' : null) ||
    (title ? (title.type === 'admin' ? 'admin_gold' : title.id) : (player.frame || 'default'));

  const frameConfig = getFrameConfig(effectiveFrame);

  // Outplay / Best WPM record
  const outplayRecord = resolveBestWpmRecord({
    bestWpm: serverProfile?.bestWpm || player.bestWpm || player.wpm,
    bestWpmRecord: serverProfile?.bestWpmRecord || player.bestWpmRecord,
    username: player.username,
    isBot: player.isBot,
    isMe: isActuallyMe,
  });

  const bestWpmValue =
    player.isBot
      ? (player.botTargetWpm || 65)
      : outplayRecord?.wpm || serverProfile?.bestWpm || player.bestWpm || player.wpm || 0;

  const bestWpmDisplay = player.isBot
    ? `~${bestWpmValue} WPM`
    : bestWpmValue > 0
    ? `${bestWpmValue} WPM`
    : isActuallyMe
    ? 'Chưa lập kỷ lục'
    : 'Chưa có kỷ lục';

  const totalGamesDisplay =
    player.isBot
      ? 'Hệ thống AI'
      : serverProfile?.totalGames !== undefined
      ? `${serverProfile.totalGames} trận`
      : player.totalGames !== undefined
      ? `${player.totalGames} trận`
      : '10+ trận';

  const accuracyDisplay =
    serverProfile?.accuracy !== undefined
      ? `${serverProfile.accuracy}%`
      : player.accuracy !== undefined
      ? `${player.accuracy}%`
      : '98.5%';

  const keyboardSwitchDisplay =
    serverProfile?.keyboardSwitch ||
    player.keyboardSwitch ||
    'Cherry MX Blue Clicky';

  // Showcase achievements
  const showcaseList: string[] =
    serverProfile?.showcaseAchievements && serverProfile.showcaseAchievements.length > 0
      ? serverProfile.showcaseAchievements
      : player.showcaseAchievements && player.showcaseAchievements.length > 0
      ? player.showcaseAchievements
      : ['speed_100', 'pve_boss_win', 'pvp_first_win'];

  const unlockedCount =
    serverProfile?.unlockedAchievementsCount ||
    serverProfile?.unlockedAchievements?.length ||
    (player.unlockedAchievements ? player.unlockedAchievements.length : 8);

  const isVerified = Boolean(serverProfile?.isVerified ?? (player.isVerified !== false));
  const isOnline = Boolean(serverProfile?.isOnline ?? (!player.isBot));

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    soundFx.playKeyClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2200);
    }
  };

  // Copy full profile summary card
  const handleCopyPlayerSummaryCard = () => {
    soundFx.playKeyClick();
    const realmStr = resolvedRealm ? `${resolvedRealm.name} (Cấp ${resolvedRealm.level})` : 'Tu Tiên Giả';
    const sectStr = resolvedSectInfo ? `${resolvedSectInfo.name} [${resolvedSectInfo.tag}]` : 'Tiêu Dao Tán Tu';
    const cardText = `📜 [FastTyping] Đạo Hữu: ${player.displayName || player.username} (@${player.username})\n⚡ Kỷ Lục: ${bestWpmDisplay} | Độ chuẩn xác: ${accuracyDisplay}\n🔮 Cảnh Giới: ${realmStr}\n🏰 Tông Môn: ${sectStr}\n⌨️ Switch: ${keyboardSwitchDisplay}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cardText);
      setCopiedField('card');
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  // Top banner ambient theme gradient
  const headerBgStyle = isTop1
    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(30, 27, 75, 0.95) 100%)'
    : isTop2
    ? 'linear-gradient(135deg, rgba(148, 163, 184, 0.35) 0%, rgba(15, 23, 42, 0.95) 100%)'
    : isTop3
    ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.35) 0%, rgba(15, 23, 42, 0.95) 100%)'
    : resolvedSectInfo?.bannerColor
    ? `linear-gradient(135deg, ${resolvedSectInfo.bannerColor}40 0%, rgba(15, 23, 42, 0.95) 100%)`
    : 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(15, 23, 42, 0.95) 100%)';

  // Mode records map
  const modeRecords = serverProfile?.modeRecords || {};
  const standardModes = [
    { key: 'vi_dau', name: 'Tiếng Việt (Có Dấu)', icon: '🇻🇳' },
    { key: 'vi_nodau', name: 'Tiếng Việt (Không Dấu)', icon: '🔡' },
    { key: 'en', name: 'Tiếng Anh (English)', icon: '🌐' },
    { key: 'numpad', name: 'Bàn Phím Số (Numpad)', icon: '🔢' },
    { key: 'outplay', name: 'Khiêu Chiến Bóng Ma', icon: '👻' },
    { key: 'san_boss', name: 'Săn Boss Cổ Ma', icon: '👹' },
  ];

  return (
    <div
      id="player-preview-profile-modal-backdrop"
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundFx.playKeyClick();
          onClose();
        }
      }}
    >
      <div
        id="player-preview-profile-modal-card"
        className="w-full max-w-xl bg-slate-900/98 border border-amber-500/40 rounded-3xl shadow-2xl relative text-left overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
      >
        {/* Top Decorative Aura Banner */}
        <div
          className="relative px-5 pt-4 pb-3 border-b border-slate-800/90 shrink-0 overflow-hidden"
          style={{ background: headerBgStyle }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute -top-12 -right-12 w-52 h-52 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300 block leading-tight">
                    HỒ SƠ XEM TRƯỚC ĐẠO HỮU
                  </span>
                  {isTop1 ? (
                    <span className="px-2 py-0.5 rounded-full bg-yellow-400 text-black text-[10px] font-black uppercase shadow-md flex items-center gap-1">
                      <span>👑</span> Quán Quân Kim Bảng
                    </span>
                  ) : isTop2 ? (
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-900 text-[10px] font-black uppercase shadow-md flex items-center gap-1">
                      <span>🥈</span> Bạc Tinh Anh
                    </span>
                  ) : isTop3 ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black uppercase shadow-md flex items-center gap-1">
                      <span>🥉</span> Đồng Kiên Cường
                    </span>
                  ) : player.rank ? (
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 text-[10px] font-mono font-bold">
                      Hạng #{player.rank}
                    </span>
                  ) : null}
                </div>
                <span className="text-[11px] text-slate-300/80 leading-none">
                  Tiên Hiệp Bảng • Thông tin tu vi, tông môn & kỷ lục tốc độ
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Quick share / copy player card */}
              <button
                type="button"
                onClick={handleCopyPlayerSummaryCard}
                className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60"
                title="Sao chép thẻ tóm tắt đạo hữu"
              >
                {copiedField === 'card' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onClose();
                }}
                className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700/60"
                title="Đóng (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* HERO PROFILE BANNER: Avatar + Name + Title + Badges */}
        <div className="px-4 sm:px-5 pt-4 pb-3 bg-slate-950/80 border-b border-slate-800/80 shrink-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Avatar & Frame */}
            <div className="relative shrink-0">
              <div className="relative">
                <AvatarWithFrame
                  icon={serverProfile?.avatar || player.avatar || player.icon || '⚡'}
                  frameId={effectiveFrame}
                  size="xl"
                  showBadge={!isHost}
                />
              </div>

              {isHost ? (
                <span
                  className="absolute -top-3 -right-2 text-2xl select-none filter drop-shadow animate-bounce"
                  title="Chủ phòng đấu"
                >
                  👑
                </span>
              ) : isTop1 ? (
                <span
                  className="absolute -top-3 -right-2 text-2xl select-none filter drop-shadow animate-bounce"
                  title="Quán Quân Bảng Vàng"
                >
                  👑
                </span>
              ) : isTop2 ? (
                <span
                  className="absolute -top-2.5 -right-2 text-xl select-none filter drop-shadow"
                  title="Top 2 Bạc Tinh Anh"
                >
                  🥈
                </span>
              ) : isTop3 ? (
                <span
                  className="absolute -top-2.5 -right-2 text-xl select-none filter drop-shadow"
                  title="Top 3 Đồng Kiên Cường"
                >
                  🥉
                </span>
              ) : player.isBot ? (
                <div
                  className="absolute -bottom-1 -right-1 p-1 rounded-full bg-cyan-500 text-black shadow-lg z-30 flex items-center justify-center font-bold"
                  title="AI Bot Luyện Tập"
                >
                  <Bot className="w-3.5 h-3.5" />
                </div>
              ) : null}
            </div>

            {/* Name & Identity Details */}
            <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white truncate max-w-full">
                  {serverProfile?.displayName || player.displayName || player.username}
                </h3>

                {isActuallyMe && (
                  <span className="text-[10px] bg-amber-400 text-black font-extrabold px-2 py-0.5 rounded-full shadow">
                    Bạn
                  </span>
                )}

                {player.isBot && (
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-2 py-0.5 rounded-full border border-cyan-500/40 flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    AI BOT
                  </span>
                )}

                {isVerified && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold"
                    title="Kỷ lục đã xác thực: Nhịp gõ chuẩn mực ≥ 92%, không vi phạm quy chuẩn"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Đã xác thực</span>
                  </span>
                )}
              </div>

              {/* Username + Copy */}
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-400 font-mono flex-wrap">
                <span>@{player.username}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(player.username, 'username')}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Sao chép tên đăng nhập"
                >
                  {copiedField === 'username' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>

                {(serverProfile?.userId || player.userId || player.id) && (
                  <span className="text-slate-500 text-[11px]">
                    • ID: <span className="font-mono text-slate-400">{(serverProfile?.userId || player.userId || player.id).slice(-8)}</span>
                  </span>
                )}
              </div>

              {/* Roles, Title & Online Status */}
              <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 flex-wrap text-xs">
                {title ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border border-amber-400/40 text-amber-300 shadow-sm">
                    <span>{title.badge}</span>
                    <span>{title.name}</span>
                  </span>
                ) : (
                  <span className="text-slate-300 font-medium">
                    {isHost ? '👑 Chủ phòng đấu' : player.isBot ? '🤖 Bot Luyện Tập' : '⚔️ Tuyển Thủ Thi Đấu'}
                  </span>
                )}

                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                  <Award className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>{frameConfig.name}</span>
                </span>

                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'}`} />
                  <span>{isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Segmented Tabs */}
          <div className="flex items-center gap-1 pt-3.5 border-t border-slate-800/80 mt-3 overflow-x-auto scrollbar-none">
            {player.isBot ? (
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setActiveTab('bot');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Thông Số AI Bot</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setActiveTab('cultivation');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'cultivation'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tu Vi & Tông Môn</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setActiveTab('records');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'records'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-sky-400" />
                  <span>Kỷ Lục & Tốc Độ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setActiveTab('achievements');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'achievements'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-purple-400" />
                  <span>Huy Hiệu ({unlockedCount})</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {isLoadingProfile && !serverProfile && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between animate-pulse">
              <span>Đang đồng bộ hồ sơ máy chủ thời gian thực...</span>
              <Activity className="w-4 h-4 animate-spin text-amber-400" />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: TU VI & TÔNG MÔN                                                   */}
          {/* ========================================================================= */}
          {activeTab === 'cultivation' && (
            <div className="space-y-3.5 animate-fadeIn">
              {/* TWO MAIN CARDS: CẢNH GIỚI TU VI & TÔNG MÔN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. CẢNH GIỚI TU VI CARD */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/30 border border-amber-500/40 text-left flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-400/90 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Cảnh Giới Tu Vi</span>
                    </span>
                    <span className="text-xl shrink-0">{resolvedRealm?.icon || '🌿'}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-black text-amber-300">
                        {resolvedRealm?.name || 'Luyện Khí Kỳ'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                        Cấp {resolvedRealm?.level || 1}/1000
                      </span>
                      <span className="text-[11px] text-slate-300 font-semibold">
                        ({resolvedRealm?.subStage || 'Sơ Kỳ'})
                      </span>
                    </div>

                    {/* Progress bar to next level */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Linh khí ngưng tụ</span>
                        <span className="text-amber-300 font-bold">
                          {Math.round(((resolvedRealm?.exp || 0) / (resolvedRealm?.maxExp || 1000)) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                          style={{
                            width: `${Math.min(100, Math.max(5, ((resolvedRealm?.exp || 0) / (resolvedRealm?.maxExp || 1000)) * 100))}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-slate-500">
                        <span>{resolvedRealm?.exp || 0} Exp</span>
                        <span>{resolvedRealm?.maxExp || 1000} Exp</span>
                      </div>
                    </div>

                    {/* Thọ nguyên & Linh thạch */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs text-slate-300 font-mono">
                      <span className="flex items-center gap-1.5" title="Thọ nguyên còn lại">
                        <Heart className="w-3.5 h-3.5 text-rose-400" />
                        <span>Thọ: <strong className="text-white">{resolvedRealm?.thoNguyen || 240}</strong> năm</span>
                      </span>
                      <span className="flex items-center gap-1.5" title="Linh thạch tích lũy">
                        <Gem className="w-3.5 h-3.5 text-cyan-400" />
                        <span><strong className="text-cyan-300">{resolvedRealm?.linhThach || 0}</strong> Linh Thạch</span>
                      </span>
                    </div>

                    {resolvedRealm?.isGuest && (
                      <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 font-normal leading-relaxed">
                        Tán tu chỉ có thể tham gia thi đấu rèn luyện tốc ký, không thể nhận Tu Vi, Linh Thạch, Thành Tựu hay bất kỳ vật phẩm tu tiên nào.
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. TÔNG MÔN CARD */}
                <div
                  className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between shadow-sm relative overflow-hidden ${
                    resolvedSectInfo
                      ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/30 border-purple-500/40'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-black tracking-wider text-purple-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>Môn Phái / Tông Môn</span>
                    </span>
                    <span className="text-xl shrink-0">
                      {resolvedSectInfo ? resolvedSectInfo.badgeIcon : '☁️'}
                    </span>
                  </div>

                  {resolvedSectInfo ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black text-purple-200">
                          {resolvedSectInfo.name}
                        </span>
                        {resolvedSectInfo.tag && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                            [{resolvedSectInfo.tag}]
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${resolvedSectInfo.roleConfig.bgClass} ${resolvedSectInfo.roleConfig.colorClass} ${resolvedSectInfo.roleConfig.borderClass}`}
                        >
                          <span>{resolvedSectInfo.roleConfig.badge}</span>
                          <span>{resolvedSectInfo.roleConfig.title}</span>
                        </span>

                        <span className="text-[11px] text-slate-400 font-mono">
                          Linh Mạch Cấp {resolvedSectInfo.linhMachLevel} • {resolvedSectInfo.memberCount} đệ tử
                        </span>
                      </div>

                      {resolvedSectInfo.slogan ? (
                        <p className="text-[11px] text-slate-300 italic line-clamp-2 pt-1 border-t border-slate-800">
                          &ldquo;{resolvedSectInfo.slogan}&rdquo;
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-800">
                          Chưa lập khẩu hiệu môn phái
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 my-auto">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">☁️</span>
                        <span className="text-sm font-black text-slate-200">Tiêu Dao Tán Tu</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Chưa bái nhập bất kỳ tông môn nào • Tự do ngao du tứ hải, độc lập ngưng tụ tu vi thiên đạo.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* HARDWARE & MECHANICAL SWITCH CARD */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <Keyboard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Trang Bị Switch Phím Cơ</span>
                    <strong className="text-cyan-300 font-mono text-xs">{keyboardSwitchDisplay}</strong>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <span>Âm gõ: </span>
                  <span className="text-emerald-400 font-semibold">Cực phẩm</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: KỶ LỤC & TỐC ĐỘ                                                    */}
          {/* ========================================================================= */}
          {activeTab === 'records' && (
            <div className="space-y-3.5 animate-fadeIn">
              {/* TOP 3 HIGHLIGHT CARDS */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                {/* Kỷ lục Tốc độ */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-amber-500/40 shadow-inner">
                  <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center justify-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kỷ Lục WPM</span>
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-1 truncate">
                    {bestWpmDisplay}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                    {player.errors !== undefined ? `${player.errors} lỗi gần nhất` : 'Chuẩn mực cao'}
                  </span>
                </div>

                {/* Độ chuẩn xác */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-emerald-500/40 shadow-inner">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-center gap-1">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Chuẩn Xác</span>
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
                    {accuracyDisplay}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                    {player.consistency ? `Ổn định: ${player.consistency}%` : 'Nhịp gõ chuẩn xác'}
                  </span>
                </div>

                {/* Trận đã đấu */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-sky-500/40 shadow-inner">
                  <span className="text-[10px] uppercase font-bold text-sky-400 flex items-center justify-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-sky-400" />
                    <span>Trận Đã Đấu</span>
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono mt-1 truncate">
                    {totalGamesDisplay}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                    Đấu trường liên server
                  </span>
                </div>
              </div>

              {/* MODE-BY-MODE PERFORMANCE GRID */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                    <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                    Chi Tiết Thành Tích Các Chế Độ
                  </span>
                  <span className="text-[10px] text-slate-500">Xác thực hệ thống</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {standardModes.map((mode) => {
                    const rec = modeRecords[mode.key];
                    const hasRecord = rec && rec.wpm > 0;
                    return (
                      <div
                        key={mode.key}
                        className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">{mode.icon}</span>
                          <span className="text-slate-300 font-medium truncate">{mode.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          {hasRecord ? (
                            <span className="font-mono font-black text-amber-400">{rec.wpm} WPM</span>
                          ) : (
                            <span className="text-slate-500 font-mono text-[11px]">---</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: HUY HIỆU & VINH DANH                                              */}
          {/* ========================================================================= */}
          {activeTab === 'achievements' && (
            <div className="space-y-3.5 animate-fadeIn">
              {/* SHOWCASE ACHIEVEMENTS (4 SLOTS) */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-purple-500/40 space-y-3 shadow-sm">
                <div className="text-xs uppercase font-black text-purple-300 flex items-center justify-between border-b border-purple-500/20 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-400" />
                    <span>Huy Hiệu Vinh Danh Trưng Bày</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-normal">
                    {Math.min(showcaseList.filter((id) => Boolean(getAchievementById(id))).length, 4)}/4 Khung Trưng Bày
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {showcaseList
                    .filter((id) => Boolean(getAchievementById(id)))
                    .slice(0, 4)
                    .map((achId) => {
                      const ach = getAchievementById(achId);
                      if (!ach) return null;
                      return (
                        <div
                          key={achId}
                          className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center ${ach.badgeBg} ${ach.borderClass} shadow-sm transition-transform hover:scale-105`}
                          title={`${ach.name}: ${ach.req} (${ach.realm})`}
                        >
                          <span className="text-2xl mb-1">{ach.icon}</span>
                          <span className="text-[11px] font-black leading-tight truncate max-w-full text-white">
                            {ach.title}
                          </span>
                          <span className="text-[9px] text-amber-300 font-mono leading-none mt-1 truncate max-w-full">
                            {ach.realm}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* OVERALL ACHIEVEMENTS STATS */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tiến Độ Lĩnh Ngộ Tiên Đạo Huy Hiệu</span>
                  </span>
                  <span className="font-mono font-bold text-amber-400 text-xs">
                    {unlockedCount} / {XIANXIA_ACHIEVEMENTS.length}
                  </span>
                </div>

                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(8, (unlockedCount / XIANXIA_ACHIEVEMENTS.length) * 100))}%`,
                    }}
                  />
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  Người chơi đã lĩnh ngộ <strong>{unlockedCount}</strong> huy hiệu trong tổng số <strong>{XIANXIA_ACHIEVEMENTS.length}</strong> bí kíp tiên đạo từ các trận đấu PVP, Săn Boss và Bàn phím số.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: THÔNG SỐ AI BOT (IF BOT)                                           */}
          {/* ========================================================================= */}
          {activeTab === 'bot' && player.isBot && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/40 space-y-3">
                <div className="flex items-center gap-2 border-b border-cyan-500/30 pb-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    Cấu Hình Nhân Bản AI Bot Luyện Tập
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Mục tiêu tốc độ</span>
                    <strong className="text-cyan-300 font-mono text-base">~{player.botTargetWpm || 65} WPM</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Độ dao động tự nhiên</span>
                    <strong className="text-emerald-400 font-mono text-base">±5 WPM (Jitter)</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Tần số phản hồi</span>
                    <strong className="text-amber-300 font-mono text-base">60 FPS Interpolation</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Thuật toán</span>
                    <strong className="text-purple-300 text-xs">Human Typing Simulation</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-800">
                  Bot này được thiết kế để hỗ trợ luyện tập tốc độ gõ phím mọi lúc ngay cả khi chưa có tuyển thủ cùng phòng. Bot phản hồi nhịp gõ mượt mà và tự điều chỉnh theo cấp độ phòng.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/95 shrink-0 space-y-2">
          {/* Ghost Race if available */}
          {onStartGhostChallenge && !player.isBot && (
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onStartGhostChallenge(player);
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-98 cursor-pointer"
            >
              <Ghost className="w-4 h-4 text-cyan-200 animate-pulse" />
              <span>Đua Cùng Bóng Ma (Khiêu Chiến Kỷ Lục)</span>
            </button>
          )}

          {/* Social Quick Actions */}
          <div className="flex items-center gap-2">
            {!isActuallyMe && !player.isBot && onOpenWhisper && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onOpenWhisper(player.username, player.userId || player.id);
                  onClose();
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Mở kênh nhắn tin riêng"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Truyền Âm Mật Đàm</span>
              </button>
            )}

            {!isActuallyMe && !player.isBot && onAddFriend && (player.userId || player.id) && (
              <button
                type="button"
                disabled={friendRequested}
                onClick={() => {
                  soundFx.playKeyClick();
                  onAddFriend(player.userId || player.id, player.username);
                  setFriendRequested(true);
                }}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  friendRequested
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                }`}
                title="Gửi lời mời kết bạn"
              >
                {friendRequested ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã Gửi Lời Mời</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Kết Bái Đạo Hữu</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onClose();
              }}
              className={`py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer ${
                !isActuallyMe && !player.isBot && (onOpenWhisper || onAddFriend) ? 'w-auto' : 'w-full'
              }`}
            >
              Đóng (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

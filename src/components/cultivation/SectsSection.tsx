import React, { useState, useEffect, useMemo } from 'react';
import {
  CultivationState,
  SectInfo,
  SectMemberRecord,
  SectRole,
  getStoredSects,
  saveStoredSects,
  joinSect,
  contributeToSect,
  createSect,
  attackSectWorldBoss,
  contributeTournamentScore,
  isSectWarEventActive,
  SECT_ROLES_CONFIG,
  calculateSectTotalTuVi,
  updateSectMemberRole,
  kickSectMember,
  leaveSect,
  XIANXIA_REALMS,
  getConsecutiveSectSurrenders,
} from '../../utils/cultivation';
import { soundFx } from '../../utils/audio';
import {
  serverCreateSect,
  serverJoinSect,
  serverLeaveSect,
  serverUpdateMemberRole,
  serverKickSectMember,
  serverContributeToSect,
  fetchServerSects,
  fetchSectWarStatus,
} from '../../utils/roomManager';
import { SectWarStatus } from '../../types';
import { AvatarWithFrame } from '../../utils/frames';
import {
  Users,
  Crown,
  Zap,
  Shield,
  Sparkles,
  Coins,
  Plus,
  ChevronRight,
  Award,
  Swords,
  Flame,
  Crosshair,
  Trophy,
  LogOut,
  ArrowUpCircle,
  UserMinus,
  CheckCircle,
  Eye,
  X,
  Info,
  Clock,
  RefreshCw,
  Calendar,
  AlertCircle,
  ArrowRight,
  Star,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Medal,
} from 'lucide-react';

interface SectsSectionProps {
  state: CultivationState;
  onUpdateState: (newState: CultivationState) => void;
  username?: string;
  userAvatar?: string;
  userFrame?: string;
  onStartSectBoss?: (sectId: string, sectName: string) => void;
  onStartSectTournament?: (sectId: string, sectName: string) => void;
}

export const SectsSection: React.FC<SectsSectionProps> = ({
  state,
  onUpdateState,
  username = 'Đạo Hữu',
  userAvatar = '⚡',
  userFrame = 'default',
  onStartSectBoss,
  onStartSectTournament,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'boss' | 'tournament'>('overview');
  const [sects, setSects] = useState<SectInfo[]>(() => getStoredSects());
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showAllContributors, setShowAllContributors] = useState(false);

  // Inspector modal for any sect
  const [inspectSect, setInspectSect] = useState<SectInfo | null>(null);

  // Promotion / Role appointment modal
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<SectMemberRecord | null>(null);
  const [targetNewRole, setTargetNewRole] = useState<SectRole>('noi_mon');

  // World boss attack damage simulation
  const [isAttackingBoss, setIsAttackingBoss] = useState(false);

  // Create Sect inputs
  const [newSectName, setNewSectName] = useState('');
  const [newSectTag, setNewSectTag] = useState('');
  const [newSectDesc, setNewSectDesc] = useState('');
  const [newSectSlogan, setNewSectSlogan] = useState('');
  const [newSectIcon, setNewSectIcon] = useState('⚔️');
  const [newSectColor, setNewSectColor] = useState('#38bdf8');

  // Vạn Phái Tranh Phong (Sự kiện cuối tuần T7 & CN • Tổng kết 20:00 CN)
  const [warStatus, setWarStatus] = useState<SectWarStatus | null>(null);
  const [timeLeftFormatted, setTimeLeftFormatted] = useState<string>('');
  const [isLoadingWar, setIsLoadingWar] = useState(false);

  const loadWarStatus = async () => {
    setIsLoadingWar(true);
    try {
      const res = await fetchSectWarStatus();
      if (res) {
        setWarStatus(res);
      }
    } finally {
      setIsLoadingWar(false);
    }
  };

  // Fetch updated sects and war status from server on mount
  useEffect(() => {
    fetchServerSects().then((res) => {
      if (res && res.success && Array.isArray(res.sects)) {
        setSects(res.sects);
        saveStoredSects(res.sects);
      }
    });
    loadWarStatus();
  }, []);

  // Poll war status when viewing tournament tab
  useEffect(() => {
    if (activeTab === 'tournament') {
      loadWarStatus();
      const interval = setInterval(loadWarStatus, 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Live countdown to Sunday 20:00
  useEffect(() => {
    if (!warStatus?.nextSettlementTimestamp) return;

    const tick = () => {
      const diff = Math.max(0, warStatus.nextSettlementTimestamp - Date.now());
      if (diff <= 0) {
        setTimeLeftFormatted('00:00:00 (Đang Tổng Kết)');
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      if (days > 0) {
        setTimeLeftFormatted(
          `${days} ngày ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      } else {
        setTimeLeftFormatted(
          `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [warStatus?.nextSettlementTimestamp]);

  const mySectId = state.sect?.sectId;
  const mySect = sects.find((s) => s.id === mySectId);

  // 5-Tier Hierarchy for current user
  const userRoleKey = state.sect?.role || 'ngoai_mon';
  const roleConfig = SECT_ROLES_CONFIG[userRoleKey] || SECT_ROLES_CONFIG.ngoai_mon;
  const isOfficer = roleConfig.isOfficer; // Chưởng Môn hoặc Đại Trưởng Lão
  const isChuongMon = userRoleKey === 'chuong_mon';

  // Linh Mạch Buff Table
  const linhMachBuffs = [
    { level: 1, name: 'Hạ Phẩm Linh Mạch', buffExp: '+5% Tu Vi', buffThoNguyen: 'Tiêu chuẩn', req: '5,000' },
    { level: 2, name: 'Trung Phẩm Linh Mạch', buffExp: '+10% Tu Vi', buffThoNguyen: 'Tiêu chuẩn', req: '15,000' },
    { level: 3, name: 'Thượng Phẩm Linh Mạch', buffExp: '+15% Tu Vi', buffThoNguyen: 'Chậm hơn 25%', req: '30,000' },
    { level: 4, name: 'Cực Phẩm Linh Mạch', buffExp: '+20% Tu Vi', buffThoNguyen: 'Chậm hơn 40%', req: '60,000' },
    { level: 5, name: 'Thần Thú Long Mạch', buffExp: '+30% Tu Vi', buffThoNguyen: 'Chậm hơn 50%', req: 'Đỉnh Cấp' },
  ];

  // Bái nhập môn phái
  const handleJoin = async (sectId: string) => {
    soundFx.playKeyClick();
    const updated = joinSect(state, sectId, username, userAvatar, userFrame);
    onUpdateState(updated);

    // Call server API
    const res = await serverJoinSect(sectId);
    if (res.success && res.sect) {
      const serverSectsList = await fetchServerSects();
      if (serverSectsList.success) setSects(serverSectsList.sects);
    } else {
      setSects(getStoredSects());
    }

    soundFx.playVictory();
    setNotice(`Đã bái nhập môn phái thành công! Bắt đầu từ thân phận Ngoại Môn Đệ Tử.`);
  };

  // Rời môn phái
  const handleLeave = async () => {
    soundFx.playKeyClick();
    setShowLeaveConfirm(false);

    const res = leaveSect(state, username);
    if (!res.success) {
      soundFx.playError();
      setNotice(res.message);
      return;
    }

    onUpdateState(res.updatedState);
    await serverLeaveSect();
    const serverSectsList = await fetchServerSects();
    if (serverSectsList.success) setSects(serverSectsList.sects);
    else setSects(getStoredSects());

    soundFx.playShieldBreak();
    setNotice(res.message);
  };

  // Cống hiến Linh Thạch bồi dưỡng Linh Mạch
  const handleContribute = async (amount: number) => {
    if (!mySectId) return;
    soundFx.playKeyClick();
    const res = contributeToSect(state, mySectId, amount);
    if (res.success) {
      soundFx.playArtifactAura();
      onUpdateState(res.updatedState);
      setNotice(res.message);

      // Server sync
      await serverContributeToSect(amount);
      const serverSectsList = await fetchServerSects();
      if (serverSectsList.success) setSects(serverSectsList.sects);
      else setSects(getStoredSects());
    } else {
      soundFx.playError();
      setNotice(res.message);
    }
  };

  // Tấn phong chức vụ đệ tử
  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForRole || !mySectId) return;

    soundFx.playKeyClick();
    const res = updateSectMemberRole(state, selectedMemberForRole.username, targetNewRole);
    if (res.success) {
      soundFx.playVictory();
      setNotice(res.message);
      setSects(res.updatedSects);

      // Server sync
      await serverUpdateMemberRole(selectedMemberForRole.username, targetNewRole);
      const serverSectsList = await fetchServerSects();
      if (serverSectsList.success) setSects(serverSectsList.sects);

      setSelectedMemberForRole(null);
    } else {
      soundFx.playError();
      setNotice(res.message);
    }
  };

  // Trục xuất đệ tử
  const handleKickMember = async (targetUsername: string) => {
    if (!confirm(`Đạo hữu có chắc chắn muốn trục xuất đệ tử ${targetUsername} khỏi môn phái?`)) return;

    soundFx.playKeyClick();
    const res = kickSectMember(state, targetUsername);
    if (res.success) {
      soundFx.playShieldBreak();
      setNotice(res.message);
      setSects(res.updatedSects);

      // Server sync
      await serverKickSectMember(targetUsername);
      const serverSectsList = await fetchServerSects();
      if (serverSectsList.success) setSects(serverSectsList.sects);
    } else {
      soundFx.playError();
      setNotice(res.message);
    }
  };

  // Vây Quét Thần Thú Tông Môn
  const handleAttackBoss = () => {
    if (!mySectId || isAttackingBoss) return;
    if (onStartSectBoss) {
      soundFx.playSwordClash();
      onStartSectBoss(mySectId, mySect?.name || 'Tông Môn');
      return;
    }

    setIsAttackingBoss(true);
    soundFx.playSwordClash();

    const playerDamage = 2500 + (state.level || 1) * 80 + Math.floor(Math.random() * 800);

    setTimeout(() => {
      const res = attackSectWorldBoss(state, mySectId, playerDamage);
      setIsAttackingBoss(false);
      setSects(getStoredSects());

      if (res.bossDefeated) {
        soundFx.playVictory();
      } else {
        soundFx.playThunderCrack();
      }
      setNotice(res.message);
      onUpdateState(res.updatedState);
    }, 600);
  };

  // Đóng góp điểm Đại Hội Tỷ Võ
  const handleContributeTournament = () => {
    if (!mySectId) return;

    // Kiểm tra nghiêm ngặt giờ mở sự kiện Vạn Phái Tranh Phong
    if (!isSectWarEventActive(warStatus)) {
      soundFx.playError();
      setNotice('⚠️ Hiện tại không phải là giờ sự kiện Vạn Phái Tranh Phong! Sự kiện chỉ mở từ 00:00 Thứ Bảy đến 20:00 Chủ Nhật hàng tuần.');
      return;
    }

    if (warStatus && warStatus.dailyAttemptsLeft !== undefined && warStatus.dailyAttemptsLeft <= 0) {
      soundFx.playError();
      setNotice('⚠️ Hôm nay đạo hữu đã sử dụng hết 3/3 lượt xuất chiến! Hãy quay lại vào ngày mai (00:00) để tiếp tục cống hiến.');
      return;
    }
    if (onStartSectTournament) {
      soundFx.playGuzhengNote(2);
      onStartSectTournament(mySectId, mySect?.name || 'Tông Môn');
      return;
    }

    soundFx.playGuzhengNote(2);
    const sampleWpm = 85;
    const res = contributeTournamentScore(state, mySectId, sampleWpm);
    setSects(getStoredSects());
    setNotice(res.message);
    onUpdateState(res.updatedState);
  };

  // Khai Sơn Lập Phái
  const handleCreateSectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectName.trim() || !newSectTag.trim()) return;

    soundFx.playKeyClick();

    // 1. Gọi Server API trước
    const serverRes = await serverCreateSect({
      name: newSectName.trim(),
      tag: newSectTag.trim(),
      description: newSectDesc.trim(),
      slogan: newSectSlogan.trim(),
      badgeIcon: newSectIcon,
      bannerColor: newSectColor,
    });

    if (!serverRes.success) {
      soundFx.playError();
      setNotice(serverRes.error || serverRes.message || 'Khai sơn lập phái thất bại trên máy chủ!');
      return;
    }

    // 2. Server phản hồi thành công -> Cập nhật trạng thái và thông báo người chơi
    soundFx.playVictory();
    setShowCreateModal(false);
    setNotice(serverRes.message || `Chúc mừng đạo hữu sáng lập ${newSectName} [${newSectTag}], tôn xưng Chưởng Môn!`);

    if (serverRes.cultivation) {
      onUpdateState({ ...state, ...serverRes.cultivation });
    } else {
      const res = createSect(
        state,
        newSectName,
        newSectTag,
        newSectDesc,
        newSectIcon,
        username,
        userAvatar,
        userFrame
      );
      if (res.success) {
        onUpdateState(res.updatedState);
      }
    }

    // 3. Tải lại danh sách Tông Môn từ Server
    const serverSectsList = await fetchServerSects();
    if (serverSectsList.success && Array.isArray(serverSectsList.sects)) {
      setSects(serverSectsList.sects);
      saveStoredSects(serverSectsList.sects);
    } else if (serverRes.sect) {
      setSects((prev) => [serverRes.sect!, ...prev]);
    }
  };

  // Sort sects by total member cultivation
  const rankedSects = [...sects].sort((a, b) => {
    const tuViA = calculateSectTotalTuVi(a);
    const tuViB = calculateSectTotalTuVi(b);
    return tuViB - tuViA;
  });

  // Dữ liệu Vạn Phái Tranh Phong cho Tông Môn hiện tại
  const top1WarSect = warStatus?.topSects?.find((s) => (s.weeklyWarPoints || 0) > 0) ||
    (warStatus?.topSects && warStatus.topSects.length > 0 ? warStatus.topSects[0] : null) ||
    (rankedSects.length > 0 ? rankedSects[0] : null);
  const mySectWarStats = warStatus?.mySectWarStats;
  const mySectWarPoints = mySectWarStats?.weeklyWarPoints ?? (mySect as any)?.weeklyWarPoints ?? mySect?.weeklyTournamentPoints ?? 0;
  const top1WarPoints = Math.max(1, top1WarSect?.weeklyWarPoints || (top1WarSect as any)?.weeklyTournamentPoints || 0);
  const isTop1InWar = (mySect && top1WarSect && mySect.id === top1WarSect.id && top1WarPoints > 0) || (Boolean(mySect?.isHoldingThienCung) && mySectWarPoints > 0);
  const warProgressPct = top1WarPoints > 1 && mySectWarPoints > 0 ? Math.min(100, Math.max(4, Math.round((mySectWarPoints / top1WarPoints) * 100))) : 0;
  const warPointGap = Math.max(0, top1WarPoints - mySectWarPoints);

  // Mốc Thần Tích Vạn Phái Tranh Phong (Milestones)
  const SECT_WAR_MILESTONES = [
    { points: 300, name: 'Sơ Khởi Khí' },
    { points: 800, name: 'Quy Nhất Kiếm' },
    { points: 2000, name: 'Bát Hoang Trận' },
    { points: 4500, name: 'Đỉnh Phong Các' },
    { points: 8000, name: 'Thái Cổ Long Mạch' },
  ];

  // Danh sách Đại Công Thần Đóng Góp Nhiều Nhất (Contributors Leaderboard)
  const topContributors = useMemo(() => {
    if (warStatus?.mySectWarStats?.topContributors && warStatus.mySectWarStats.topContributors.length > 0) {
      return warStatus.mySectWarStats.topContributors;
    }
    const rawContributors = (mySect as any)?.warContributors;
    if (rawContributors && typeof rawContributors === 'object') {
      const list = Object.values(rawContributors) as Array<{
        username: string;
        displayName?: string;
        avatar?: string;
        points: number;
        matchesCount: number;
        lastActive: number;
      }>;
      if (list.length > 0) {
        return list.sort((a, b) => (b.points || 0) - (a.points || 0));
      }
    }
    if (mySect?.members && mySect.members.length > 0) {
      return mySect.members
        .map((m, idx) => ({
          username: m.username,
          displayName: m.displayName || m.username,
          avatar: m.avatar || '⚡',
          points: Math.max(0, Math.round(m.contribution * 0.45) - idx * 25),
          matchesCount: Math.max(1, Math.floor(m.contribution / 110)),
          lastActive: m.lastActive || Date.now() - idx * 3600000,
        }))
        .filter((c) => c.points > 0)
        .sort((a, b) => b.points - a.points);
    }
    return [];
  }, [warStatus, mySect]);

  // Phân bổ điểm công bằng: Top 5 chủ lực (100%) và Thành viên dự bị (15%)
  const top5PointsSum = topContributors.slice(0, 5).reduce((sum, c) => sum + (c.points || 0), 0);
  const remainingPointsSum = Math.max(0, mySectWarPoints - top5PointsSum);
  const myContributionPoints =
    warStatus?.mySectWarStats?.myContributionPoints ??
    (topContributors.find((c) => c.username.toLowerCase() === username.toLowerCase())?.points ?? 0);
  const myMatchesCount =
    warStatus?.mySectWarStats?.myMatchesCount ??
    (topContributors.find((c) => c.username.toLowerCase() === username.toLowerCase())?.matchesCount ?? 0);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('overview');
              setNotice(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Động Phủ & Bảng Vàng</span>
          </button>

          <button
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('members');
              setNotice(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'members'
                ? 'bg-cyan-400 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Đệ Tử & Chức Vị</span>
            {mySect?.members && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950/80 text-[10px] font-mono text-cyan-300">
                {mySect.members.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('boss');
              setNotice(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'boss'
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🐉</span>
            <span>Vây Quét Thần Thú</span>
          </button>

          <button
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('tournament');
              setNotice(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tournament'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Vạn Phái Tranh Phong</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                warStatus?.isActive
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {warStatus?.isActive ? 'ĐANG ĐẤU' : 'T7-CN'}
            </span>
          </button>
        </div>

        {/* Linh Thạch Balance */}
        <div className="flex items-center gap-1 text-amber-300 font-mono font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30 text-xs">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>{(state.linhThach || 0).toLocaleString()} Linh Thạch</span>
        </div>
      </div>

      {/* Notice Toast */}
      {notice && (
        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Current Sect Status Banner */}
      {mySect && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl p-2.5 rounded-2xl bg-slate-950 border border-amber-500/40 shadow-inner">
                {mySect.badgeIcon}
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-amber-300">
                    {mySect.name} [{mySect.tag}]
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase flex items-center gap-1 ${roleConfig.colorClass} ${roleConfig.borderClass} ${roleConfig.bgClass}`}
                  >
                    <span>{roleConfig.badge}</span>
                    <span>{roleConfig.title}</span>
                  </span>
                  {mySect.isHoldingThienCung && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/50 animate-pulse">
                      👑 Thiên Cung Long Mạch
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 italic mt-0.5 leading-relaxed">
                  &ldquo;{mySect.slogan || mySect.description}&rdquo;
                </p>
                <div className="text-[11px] text-cyan-300 mt-1">
                  Đặc quyền thứ bậc: <em>{roleConfig.privilege}</em>
                </div>
              </div>
            </div>

            {/* Total Cultivation & Disciples Count */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng Tu Vi Môn Phái</div>
                <div className="text-base font-mono font-black text-amber-400 flex items-center justify-end gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{calculateSectTotalTuVi(mySect).toLocaleString()}</span>
                </div>
              </div>
              <div className="text-right pl-3 border-l border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đệ Tử Đồng Môn</div>
                <div className="text-sm font-mono font-black text-emerald-400">
                  {mySect.members?.length || mySect.memberCount} Vị
                </div>
              </div>
            </div>
          </div>

          {/* Linh Mạch Tier Info Bar & Actions */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="font-bold text-slate-300">Linh Mạch Động Phủ:</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                Cấp {mySect.linhMachLevel}/5 ({linhMachBuffs[mySect.linhMachLevel - 1]?.name})
              </span>
              <span className="text-slate-400">
                (Buff: <strong className="text-amber-400">{linhMachBuffs[mySect.linhMachLevel - 1]?.buffExp}</strong>)
              </span>
            </div>

            {/* Quick Contribute & Leave Sect */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">Cống hiến:</span>
              <button
                onClick={() => handleContribute(50)}
                disabled={(state.linhThach || 0) < 50}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
              >
                +50
              </button>
              <button
                onClick={() => handleContribute(200)}
                disabled={(state.linhThach || 0) < 200}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
              >
                +200
              </button>
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Rời khỏi tông môn"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Rời phái</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BẢNG ĐIỀU KHIỂN CHIẾN CÔNG VẠN PHÁI TRANH PHONG & ĐẠI CÔNG THẦN TÔNG MÔN */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-950 border border-amber-500/40 shadow-2xl space-y-4">
            {/* Header: Title, Live Status, Daily Attempts & Quick Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-inner">
                  <Swords className="w-5 h-5 text-amber-400" />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-400 uppercase tracking-wide flex items-center gap-1.5">
                      <span>Vạn Phái Tranh Phong</span>
                      <span className="text-xs font-normal text-amber-400/80">| Chiến Công Môn Phái</span>
                    </h4>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        warStatus?.isActive
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 animate-pulse'
                          : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${warStatus?.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      <span>{warStatus?.isActive ? 'ĐANG MỞ (T7 & CN)' : 'ĐÃ CHỐT SỔ'}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-mono text-[10px] font-bold">
                      🎯 Còn {warStatus?.dailyAttemptsLeft ?? 3}/3 lượt hôm nay
                    </span>
                    {getConsecutiveSectSurrenders(username) > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 font-mono text-[10px] font-bold" title="Đầu hàng 3 lần liên tiếp sẽ bị trừ 1 lượt bài thi (tự động reset khi hoàn thành bài mới)">
                        ⚠️ Đầu hàng: {getConsecutiveSectSurrenders(username)}/3
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Thử thách 3 ải đơn liên hoàn (Tiếng Việt ➔ Tiếng Anh ➔ Số) • Chốt sổ trao thưởng lúc <strong>20:00 Chủ Nhật</strong>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    loadWarStatus();
                  }}
                  disabled={isLoadingWar}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                  title="Làm mới tiến trình chiến công"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWar ? 'animate-spin text-amber-400' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={handleContributeTournament}
                  disabled={!isSectWarEventActive(warStatus) || (warStatus?.dailyAttemptsLeft !== undefined && warStatus.dailyAttemptsLeft <= 0)}
                  className={`px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-md flex items-center gap-1.5 transition-transform active:scale-95 ${
                    !isSectWarEventActive(warStatus) || (warStatus?.dailyAttemptsLeft !== undefined && warStatus.dailyAttemptsLeft <= 0)
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                      : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-500/20'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {!isSectWarEventActive(warStatus)
                      ? 'Chưa Đến Giờ Sự Kiện'
                      : warStatus?.dailyAttemptsLeft !== undefined && warStatus.dailyAttemptsLeft <= 0
                      ? 'Hết Lượt (0/3)'
                      : `Xuất Chiến 3 Ải (${warStatus?.dailyAttemptsLeft ?? 3}/3)`}
                  </span>
                </button>
              </div>
            </div>

            {/* THANH TIẾN TRÌNH TRỰC QUAN TỔNG ĐÓNG GÓP TOÀN TÔNG MÔN */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-3 relative overflow-hidden shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tổng Tích Lũy Điểm Chiến Tông Môn:</span>
                  </span>
                  <span className="text-base sm:text-lg font-mono font-black text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                    {mySectWarPoints.toLocaleString()} <span className="text-xs font-normal text-slate-400">Điểm</span>
                  </span>
                  {isTop1InWar ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>Chiếm Giữ Thiên Cung (#1)</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                      Hạng #{mySectWarStats?.rank || (rankedSects.findIndex((s) => s.id === mySect.id) + 1)}
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-mono text-slate-400">
                  {isTop1InWar ? (
                    <span className="text-amber-300 font-bold">👑 Thiên Hạ Đệ Nhất Phái (+20% Tu Vi Tuần)</span>
                  ) : (
                    <span>
                      Cách Top 1 (<strong className="text-slate-200">{top1WarSect?.name || 'Đệ Nhất Phái'}</strong>):{' '}
                      <strong className="text-rose-400">-{warPointGap.toLocaleString()}đ</strong> ({warProgressPct}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Thanh tiến trình đồ họa sắc nét */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-900/90 rounded-full h-3.5 p-0.5 overflow-hidden border border-slate-700/80 relative shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-700 relative overflow-hidden ${
                      isTop1InWar
                        ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.8)]'
                        : 'bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                    }`}
                    style={{ width: `${warProgressPct}%` }}
                  >
                    {/* Shimmer light bar effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                  </div>
                </div>

                {/* Milestone Indicators */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-0.5 pt-0.5">
                  {SECT_WAR_MILESTONES.map((m, idx) => {
                    const isPassed = mySectWarPoints >= m.points;
                    return (
                      <div
                        key={m.points}
                        className={`flex flex-col items-center text-center ${
                          isPassed ? 'text-amber-300 font-bold' : 'text-slate-500'
                        } ${idx > 2 ? 'hidden sm:flex' : ''}`}
                      >
                        <span className="flex items-center gap-0.5">
                          {isPassed ? '✓' : '◈'} {m.points.toLocaleString()}đ
                        </span>
                        <span className="text-[9px] opacity-75">{m.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3 Thẻ thống kê cơ chế công bằng: Top 5 Chủ Lực, Dự Bị, Cá Nhân */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider block">
                      🌟 Top 5 Chủ Lực (100%)
                    </span>
                    <span className="text-xs font-mono font-black text-amber-300">
                      +{top5PointsSum.toLocaleString()} Điểm
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Nòng cốt</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-cyan-400/90 font-bold uppercase tracking-wider block">
                      👥 Quân Số Dự Bị (15%)
                    </span>
                    <span className="text-xs font-mono font-black text-cyan-300">
                      +{remainingPointsSum.toLocaleString()} Điểm
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Đoàn kết</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-emerald-400/90 font-bold uppercase tracking-wider block">
                      👤 Bạn Đóng Góp
                    </span>
                    <span className="text-xs font-mono font-black text-emerald-300">
                      +{myContributionPoints.toLocaleString()} Điểm ({myMatchesCount} trận)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {mySectWarPoints > 0 ? `${Math.min(100, Math.round((myContributionPoints / mySectWarPoints) * 100))}% tổng` : '0%'}
                  </span>
                </div>
              </div>
            </div>

            {/* DANH SÁCH THÀNH VIÊN ĐÓNG GÓP NHIỀU NHẤT (BẢNG CÔNG THẦN TÔNG MÔN) */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <h5 className="text-xs font-black text-white uppercase tracking-wider">
                    Đại Công Thần Tông Môn (Bảng Đóng Góp Cao Nhất)
                  </h5>
                  <span className="px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                    {topContributors.length} Đệ tử
                  </span>
                </div>

                {topContributors.length > 6 && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setShowAllContributors((prev) => !prev);
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{showAllContributors ? 'Thu gọn (Top 6)' : `Xem tất cả (${topContributors.length})`}</span>
                    {showAllContributors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {topContributors.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                  <span className="text-2xl block">⚔️</span>
                  <p className="text-xs text-slate-400 font-medium">
                    Chưa có đệ tử nào xuất chiến hôm nay. Hãy là người tiên phong xuất chiến 3 ải để ghi danh Bảng Vàng Tông Môn!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(showAllContributors ? topContributors : topContributors.slice(0, 6)).map((c, idx) => {
                    const isMe = c.username.toLowerCase() === username.toLowerCase();
                    const isTop1 = idx === 0;
                    const isTop2 = idx === 1;
                    const isTop3 = idx === 2;
                    const contribShare = mySectWarPoints > 0 ? Math.min(100, Math.round((c.points / mySectWarPoints) * 100)) : 0;
                    const memberInfo = mySect.members?.find((m) => m.username.toLowerCase() === c.username.toLowerCase());
                    const roleInfo = memberInfo?.role ? SECT_ROLES_CONFIG[memberInfo.role] : undefined;

                    return (
                      <div
                        key={c.username}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                          isMe
                            ? 'bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/30'
                            : isTop1
                            ? 'bg-gradient-to-r from-amber-500/15 via-yellow-500/5 to-slate-950 border-amber-400/60 shadow-[0_0_10px_rgba(251,191,36,0.15)]'
                            : isTop2
                            ? 'bg-slate-900/90 border-slate-400/50'
                            : isTop3
                            ? 'bg-slate-900/80 border-amber-700/50'
                            : 'bg-slate-950/70 border-slate-800/80'
                        }`}
                      >
                        {/* Left: Medal + Avatar + Name + Role */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                              isTop1
                                ? 'bg-amber-400 text-slate-950 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                                : isTop2
                                ? 'bg-slate-300 text-slate-950'
                                : isTop3
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${idx + 1}`}
                          </span>

                          <div className="relative shrink-0">
                            <span className="text-xl">{c.avatar || '🧘'}</span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white truncate max-w-[110px] sm:max-w-[130px]">
                                {c.displayName || c.username}
                              </span>
                              {isMe && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-300 text-[9px] font-bold border border-cyan-400">
                                  Bạn
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              {roleInfo && (
                                <span className={`font-semibold ${roleInfo.colorClass}`}>
                                  {roleInfo.title}
                                </span>
                              )}
                              <span>•</span>
                              <span>{c.matchesCount || 1} ván</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Points & Share bar */}
                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-black text-amber-300">
                            +{c.points.toLocaleString()}đ
                          </div>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <div className="w-12 bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                              <div
                                className={`h-full rounded-full ${isTop1 ? 'bg-amber-400' : 'bg-cyan-400'}`}
                                style={{ width: `${contribShare}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-slate-400">{contribShare}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. OVERVIEW & LEADERBOARD TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Bảng Vàng Tông Môn Đệ Nhất Thiên Hạ</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                Xếp hạng thực tế dựa trên <strong>Tổng Tu Vi của toàn thể thành viên</strong>
              </span>
            </div>

            <button
              onClick={() => {
                soundFx.playKeyClick();
                setShowCreateModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs flex items-center gap-1.5 hover:brightness-110 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Khai Sơn Lập Phái</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {rankedSects.length === 0 ? (
              <div className="col-span-full p-8 rounded-3xl bg-slate-950/70 border border-slate-800 text-center space-y-3">
                <span className="text-4xl block">🏛️</span>
                <h4 className="text-base font-black text-amber-300">Chưa Có Tông Môn Nào Được Thành Lập</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Cõi tu tiên chưa có bất kỳ môn phái nào. Hãy là bậc tiên phong đầu tiên <strong>Khai Sơn Lập Phái</strong> để quy tụ quần hùng và ghi danh vào sử sách!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setShowCreateModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 hover:brightness-110 shadow-md cursor-pointer mt-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Khai Sơn Lập Phái Ngay</span>
                </button>
              </div>
            ) : (
              rankedSects.map((sect, idx) => {
              const isMySect = sect.id === mySectId;
              const totalTuVi = calculateSectTotalTuVi(sect);
              const isTop1 = idx === 0;
              const isTop2 = idx === 1;
              const isTop3 = idx === 2;

              return (
                <div
                  key={sect.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isTop1
                      ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.25)]'
                      : isMySect
                      ? 'bg-slate-900/90 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2 rounded-xl bg-slate-900 border border-slate-800">
                          {sect.badgeIcon}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-amber-400">
                              {isTop1 ? '👑 #1' : isTop2 ? '🥈 #2' : isTop3 ? '🥉 #3' : `#${idx + 1}`}
                            </span>
                            <h4 className="text-sm font-black text-white">{sect.name}</h4>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                              {sect.tag}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Chưởng Môn: <strong>{sect.leaderName}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-full block">
                          Linh Mạch Cấp {sect.linhMachLevel}
                        </span>
                        {sect.isHoldingThienCung && (
                          <span className="text-[10px] font-bold text-amber-300 mt-1 block">
                            👑 Thiên Cung
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 mt-2 mb-3">
                      &ldquo;{sect.slogan || sect.description}&rdquo;
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs gap-2">
                    <div className="text-slate-400 text-[11px]">
                      <span>
                        Tổng Tu Vi: <strong className="text-amber-300 font-mono font-bold">{totalTuVi.toLocaleString()}</strong>
                      </span>
                      <span className="mx-1.5">•</span>
                      <span>{sect.members?.length || sect.memberCount} đệ tử</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playKeyClick();
                          setInspectSect(sect);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        title="Xem đệ tử tông môn"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden sm:inline">Chi tiết</span>
                      </button>

                      {isMySect ? (
                        <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                          Đang Tham Gia
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoin(sect.id)}
                          className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          Bái Nhập Phái
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      )}

      {/* 2. MEMBERS & HIERARCHY TAB (ĐỆ TỬ & CHỨC VỊ) */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {!mySect ? (
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-4">
              <span className="text-5xl block">🏕️</span>
              <h3 className="text-base font-black text-white">Đạo Hữu Hiện Đang Là Tán Tu</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Chưa gia nhập môn phái nào. Hãy bái nhập một môn phái trên Bảng Vàng hoặc tự mình Khai Sơn Lập Phái để quy tụ đệ tử thiên hạ!
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs uppercase cursor-pointer"
                >
                  Khai Sơn Lập Phái
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                >
                  Xem Bảng Vàng
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Hierarchy Guide Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Hệ Thống 5 Bậc Chức Vị Tông Môn</span>
                  </h4>
                  {isOfficer && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Quyền Chưởng Quản: Tấn Phong & Trục Xuất
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {Object.entries(SECT_ROLES_CONFIG).map(([roleKey, cfg]) => {
                    const isMyRole = userRoleKey === roleKey;
                    return (
                      <div
                        key={roleKey}
                        className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                          isMyRole
                            ? 'bg-slate-900 border-amber-400 shadow-sm'
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-base">{cfg.badge}</span>
                            <span className={`font-bold ${cfg.colorClass}`}>{cfg.title}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2">
                            {cfg.privilege}
                          </p>
                        </div>
                        {isMyRole && (
                          <span className="mt-1.5 text-[9px] font-black text-amber-400 uppercase">
                            Chức vị của bạn
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <span>Danh Sách Đệ Tử ({mySect.members?.length || 0} Vị)</span>
                  <span>Tổng Tu Vi: {calculateSectTotalTuVi(mySect).toLocaleString()}</span>
                </div>

                <div className="space-y-2">
                  {(!mySect.members || mySect.members.length === 0) ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      Chưa có đệ tử trong danh sách.
                    </div>
                  ) : (
                    // Sort by rank level (5 to 1), then by tuViScore
                    [...mySect.members]
                      .sort((a, b) => {
                        const rankA = SECT_ROLES_CONFIG[a.role]?.rankLevel || 1;
                        const rankB = SECT_ROLES_CONFIG[b.role]?.rankLevel || 1;
                        if (rankB !== rankA) return rankB - rankA;
                        return (b.tuViScore || 0) - (a.tuViScore || 0);
                      })
                      .map((member, idx) => {
                        const mRoleConfig = SECT_ROLES_CONFIG[member.role] || SECT_ROLES_CONFIG.ngoai_mon;
                        const isMe = String(member.username || '').toLowerCase() === String(username || '').toLowerCase();
                        const canManage = isOfficer && (!isMe || !isChuongMon);

                        return (
                          <div
                            key={`${member.userId}-${idx}`}
                            className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              member.role === 'chuong_mon'
                                ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border-amber-400/60 shadow-sm'
                                : member.role === 'dai_truong_lao'
                                ? 'bg-slate-950/90 border-purple-500/40'
                                : member.role === 'chan_truyen'
                                ? 'bg-slate-950/80 border-cyan-500/40'
                                : isMe
                                ? 'bg-slate-900/90 border-cyan-400'
                                : 'bg-slate-950/60 border-slate-800'
                            }`}
                          >
                            {/* Member info */}
                            <div className="flex items-center gap-3 min-w-0">
                              <AvatarWithFrame
                                icon={member.avatar || '⚡'}
                                frameId={member.frame || 'default'}
                                size="sm"
                              />

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-xs sm:text-sm font-bold truncate ${isMe ? 'text-amber-300 font-black' : 'text-white'}`}>
                                    {member.displayName || member.username}
                                  </span>
                                  {isMe && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[9px] font-black uppercase">
                                      Bạn
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${mRoleConfig.colorClass} ${mRoleConfig.borderClass} ${mRoleConfig.bgClass} uppercase font-mono`}>
                                    {mRoleConfig.badge} {mRoleConfig.title}
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span>{member.realmIcon} {member.realmName} Cấp {member.level}</span>
                                  <span className="text-slate-600">•</span>
                                  <span>Cống hiến: <strong className="text-amber-300">{member.contribution.toLocaleString()}</strong></span>
                                  <span className="text-slate-600">•</span>
                                  <span>Tu vi đóng góp: <strong className="text-cyan-300 font-mono">{(member.tuViScore || 0).toLocaleString()}</strong></span>
                                </div>
                              </div>
                            </div>

                            {/* Officer Management Actions */}
                            {canManage && (
                              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundFx.playKeyClick();
                                    setSelectedMemberForRole(member);
                                    setTargetNewRole(member.role);
                                  }}
                                  className="px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  title="Tấn phong / bãi miễn chức vụ"
                                >
                                  <ArrowUpCircle className="w-3.5 h-3.5" />
                                  <span>Tấn Phong</span>
                                </button>

                                {member.role !== 'chuong_mon' && (
                                  <button
                                    type="button"
                                    onClick={() => handleKickMember(member.username)}
                                    className="px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                    title="Trục xuất khỏi tông môn"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                    <span>Trục Xuất</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. WORLD BOSS (VÂY QUÉT THẦN THÚ) TAB */}
      {activeTab === 'boss' && (
        <div className="p-6 rounded-3xl bg-gradient-to-b from-red-950/40 via-slate-900 to-slate-950 border border-red-500/40 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-500/30 pb-4">
            <div>
              <h3 className="text-lg font-black text-red-300 uppercase tracking-wide flex items-center gap-2">
                <span>🐉</span>
                <span>Thần Thú Trấn Giới • Thái Cổ Hắc Long</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Toàn thể đệ tử tông môn cùng xuất chiến tiêu hao huyết lượng thần thú! Hạ gục để nhận Thảo Dược Hiếm & Siêu Cấp Tu Vi Đan!
              </p>
            </div>
            <div className="px-3 py-1 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-bold">
              Bí Cảnh Tông Môn
            </div>
          </div>

          {/* Boss Stage */}
          <div className="text-center py-4 space-y-4">
            <div className="text-7xl animate-pulse">🐉</div>
            <h4 className="text-xl font-black text-white">Thái Cổ Hắc Long (Cấp 10)</h4>

            {/* Boss HP Bar */}
            {(() => {
              const wb = mySect?.worldBoss || {
                hp: 145000,
                maxHp: 180000,
                isDefeated: false,
              };
              const pct = Math.max(0, Math.min(100, Math.round((wb.hp / wb.maxHp) * 100)));

              return (
                <div className="max-w-md mx-auto space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-red-400">Sinh Lực Thần Thú:</span>
                    <span className="text-white">
                      {wb.hp.toLocaleString()} / {wb.maxHp.toLocaleString()} HP ({pct}%)
                    </span>
                  </div>
                  <div className="h-4 bg-slate-950 rounded-full border border-red-500/50 overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Attack Button */}
            <div className="pt-2">
              <button
                onClick={handleAttackBoss}
                disabled={!mySect || isAttackingBoss}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-red-600/30 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {isAttackingBoss ? 'Đang Xuất Chiêu Trảm Long...' : '⚔️ Xuất Kích Vây Quét Thần Thú'}
              </button>
            </div>
          </div>

          {/* Boss Rewards Box */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">
              Phần Thưởng Trảm Sát Toàn Môn Phái:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="block text-base">💰</span>
                <span className="font-bold text-amber-300">+120 Linh Thạch</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="block text-base">✨</span>
                <span className="font-bold text-cyan-300">+1.500 Tu Vi</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="block text-base">🌿</span>
                <span className="font-bold text-emerald-300">1 Long Tu & 1 Huyền Thiết</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="block text-base">🧪</span>
                <span className="font-bold text-purple-300">1 Siêu Cấp Tu Vi Đan</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. VẠN PHÁI TRANH PHONG (SỰ KIỆN CUỐI TUẦN T7 & CN • TỔNG KẾT 20H CHỦ NHẬT) */}
      {activeTab === 'tournament' && (
        <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 shadow-2xl space-y-6">
          {/* Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-500/30 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300">
                  <Swords className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-400 uppercase tracking-wide flex items-center gap-2">
                    <span>Vạn Phái Tranh Phong • Thái Cổ Linh Mạch</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Sự kiện cuối tuần diễn ra liên tục <strong>Thứ 7 & Chủ Nhật</strong> • Chốt sổ & trao thưởng lúc <strong>20:00 Chủ Nhật hàng tuần</strong>!
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  soundFx.playKeyClick();
                  loadWarStatus();
                }}
                disabled={isLoadingWar}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                title="Làm mới bảng xếp hạng"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingWar ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleContributeTournament}
                disabled={!mySect || !isSectWarEventActive(warStatus) || (warStatus?.dailyAttemptsLeft !== undefined && warStatus.dailyAttemptsLeft <= 0)}
                className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-1.5 transition-transform active:scale-95 ${
                  !mySect || !isSectWarEventActive(warStatus) || (warStatus?.dailyAttemptsLeft !== undefined && warStatus.dailyAttemptsLeft <= 0)
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950'
                }`}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>
                  {!isSectWarEventActive(warStatus)
                    ? 'Chưa Mở Sự Kiện (T7 & CN)'
                    : warStatus?.dailyAttemptsLeft !== undefined && warStatus.dailyAttemptsLeft <= 0
                    ? 'Hôm Nay Hết Lượt (0/3)'
                    : `Xuất Chiến 3 Ải (${warStatus?.dailyAttemptsLeft ?? 3}/3 lượt)`}
                </span>
              </button>
            </div>
          </div>

          {/* Trạng thái Sự Kiện & Đồng Hồ Đếm Ngược Live Countdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Cột 1: Trạng thái kết giới */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
              warStatus?.isActive
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              <div className={`w-3.5 h-3.5 rounded-full ${
                warStatus?.isActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
              }`} />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-75 block">Trạng Thái Kết Giới</span>
                <span className="text-sm font-black">
                  {warStatus?.isActive ? '🟢 Đang Mở (T7 & CN)' : '🟡 Đang Nghỉ Ngơi (Đã Chốt)'}
                </span>
              </div>
            </div>

            {/* Cột 2: Đồng hồ đếm ngược đến 20:00 Chủ Nhật */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-300 flex items-center gap-3.5 shadow-inner">
              <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400/80 block">
                  {warStatus?.isActive ? 'Thời Gian Đến Giờ Chốt Sổ (20:00 CN)' : 'Mở Lại Vào Thứ Bảy Tuần Sau'}
                </span>
                <span className="text-sm font-mono font-black tracking-wide text-white">
                  {timeLeftFormatted || 'Đang tính toán...'}
                </span>
              </div>
            </div>

            {/* Cột 3: Lượt xuất chiến trong ngày (Tối đa 3 lần/ngày) */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
              (warStatus?.dailyAttemptsLeft ?? 3) > 0
                ? 'bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              <Crosshair className={`w-5 h-5 ${(warStatus?.dailyAttemptsLeft ?? 3) > 0 ? 'text-cyan-400 animate-pulse' : 'text-slate-600'}`} />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-75 block">Lượt Xuất Chiến Hôm Nay</span>
                <span className="text-sm font-mono font-black">
                  {(warStatus?.dailyAttemptsLeft ?? 3) > 0
                    ? `🎯 Còn ${warStatus?.dailyAttemptsLeft ?? 3}/3 Lượt`
                    : '🔒 Đã dùng hết 3/3 lượt'}
                </span>
              </div>
            </div>
          </div>

          {/* Banner Thể Lệ Vạn Phái Tranh Phong 3 Ải & Cân Bằng Điểm Số */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="uppercase tracking-wide text-[11px]">Thể Lệ Xuất Chiến 3 Ải & Cơ Chế Điểm Cân Bằng Mới:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px] text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="font-bold text-amber-300 block">🎯 Chơi Đơn 3 Ải Liên Hoàn:</span>
                <p className="text-slate-400">Vượt qua lần lượt: 30 từ Tiếng Việt có dấu ➔ 30 từ Tiếng Anh ➔ 25 chuỗi Phím Số. Đếm ngược 3s chuẩn bị.</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="font-bold text-cyan-300 block">🎫 Giới Hạn 3 Lượt / Ngày:</span>
                <p className="text-slate-400">Mỗi đệ tử tối đa 3 lượt/ngày trong suốt sự kiện. Chỉ khi xuất chiến tại đây mới được cộng điểm Tông Môn!</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-300 block">⚖️ Cân Bằng Quân Số:</span>
                <p className="text-slate-400">Điểm Bang = <strong>Top 5 thành viên cao nhất</strong> + <strong>15% điểm của các thành viên còn lại</strong>. Bang ít người có cao thủ vẫn cạnh tranh sòng phẳng!</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="font-bold text-rose-300 block">🚫 Không Giờ Vàng:</span>
                <p className="text-slate-400">Loại bỏ hoàn toàn cơ chế giờ vàng. Đạo hữu tự do xuất chiến bất cứ lúc nào trong ngày mà điểm số luôn chuẩn xác và tối đa!</p>
              </div>
            </div>
          </div>

          {/* Vinh Danh Quán Quân Tuần Trước / Chiếm Giữ Thiên Cung */}
          {warStatus?.previousWinner && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-400/60 flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{warStatus.previousWinner.badgeIcon || '👑'}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono">
                      QUÁN QUÂN TUẦN TRƯỚC
                    </span>
                    <span className="text-base font-black text-amber-300">
                      {warStatus.previousWinner.sectName} [{warStatus.previousWinner.tag}]
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Thống Lĩnh: <strong>{warStatus.previousWinner.leaderName}</strong> • Tích Lũy:{' '}
                    <strong className="text-amber-400 font-mono">
                      {warStatus.previousWinner.points.toLocaleString()} Điểm Chiến
                    </strong>
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-lg border border-amber-400/30 inline-block">
                  ✨ Đang hưởng Buff +20% Tu Vi & +15% Linh Thạch
                </span>
              </div>
            </div>
          )}

          {/* Khi chưa có Tông Môn */}
          {!mySect && (
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-amber-500/30 text-center space-y-3">
              <span className="text-4xl block">🏛️</span>
              <h5 className="text-sm font-bold text-amber-300">Đạo Hữu Chưa Gia Nhập Hoặc Sáng Lập Tông Môn</h5>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Đại sự kiện Vạn Phái Tranh Phong là chiến trường quy tụ sức mạnh của các Tông Môn. Hãy <strong>Khai Sơn Lập Phái</strong> hoặc <strong>Gia Nhập môn phái</strong> để cùng các đồng môn xuất chiến và giành ngôi Thiên Hạ Đệ Nhất!
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setShowCreateModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 hover:brightness-110 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Khai Sơn Lập Phái Ngay</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setActiveTab('overview');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Xem Bảng Tông Môn</span>
                </button>
              </div>
            </div>
          )}

          {/* Thống kê đóng góp & Tiến độ trực quan Tông Môn của tôi */}
          {mySect && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-cyan-500/40 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">
                        Chiến Báo Bang Hội: <strong className="text-cyan-300">{mySect.name}</strong> [{mySect.tag}]
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-black border border-cyan-500/40">
                        Hạng #{mySectWarStats?.rank || (rankedSects.findIndex((s) => s.id === mySect.id) + 1)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Tổng Điểm Bang: <strong className="text-amber-400 font-mono">{mySectWarPoints.toLocaleString()}</strong> Điểm Chiến
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-300">
                    Cá nhân: <strong className="text-emerald-400 font-bold">+{myContributionPoints.toLocaleString()}đ</strong> ({myMatchesCount} trận)
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-cyan-300 font-bold">
                    Chiếm {mySectWarPoints > 0 ? Math.min(100, Math.round((myContributionPoints / mySectWarPoints) * 100)) : 0}% tổng phái
                  </span>
                </div>
              </div>

              {/* Progress bar towards Top 1 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tiến độ bám đuổi Top 1 ({top1WarSect?.name || 'Đệ Nhất Phái'}):</span>
                  </span>
                  <span className="font-mono text-amber-300 font-bold">
                    {isTop1InWar ? '👑 Đang dẫn đầu' : `-${warPointGap.toLocaleString()}đ (${warProgressPct}%)`}
                  </span>
                </div>

                <div className="w-full bg-slate-900 rounded-full h-3 p-0.5 overflow-hidden border border-slate-700/80 relative shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isTop1InWar
                        ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                        : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                    }`}
                    style={{ width: `${warProgressPct}%` }}
                  />
                </div>
              </div>

              {/* Danh sách MVP Đệ tử cống hiến nội bộ */}
              {topContributors.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Đại Công Thần Tông Môn (MVP Tuần):</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Top 5 góp 100% • Thành viên còn lại góp 15%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {topContributors.slice(0, 6).map((c, i) => {
                      const isMe = c.username.toLowerCase() === username.toLowerCase();
                      const memberInfo = mySect.members?.find((m) => m.username.toLowerCase() === c.username.toLowerCase());
                      const roleInfo = memberInfo?.role ? SECT_ROLES_CONFIG[memberInfo.role] : undefined;

                      return (
                        <div
                          key={c.username}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                            isMe
                              ? 'bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                              : i === 0
                              ? 'bg-amber-500/15 border-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,0.2)]'
                              : i === 1
                              ? 'bg-slate-900 border-slate-500/50'
                              : i === 2
                              ? 'bg-slate-900 border-amber-700/50'
                              : 'bg-slate-900/80 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-xs font-bold shrink-0">
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                            </span>
                            <span className="text-base">{c.avatar || '🧘'}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-slate-200 truncate max-w-[100px]">
                                  {c.displayName || c.username}
                                </span>
                                {isMe && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/30 text-cyan-300 font-bold">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              {roleInfo && (
                                <span className={`text-[10px] block ${roleInfo.colorClass}`}>
                                  {roleInfo.title}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-cyan-300 font-bold text-xs block">
                              +{c.points}đ
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {c.matchesCount || 1} trận
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bảng Xếp Hạng Vạn Phái Tuần Này */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Bảng Vàng Vạn Phái Tranh Phong (Cập nhật thời gian thực)</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                Chốt kết quả: <strong>20:00 Chủ Nhật</strong>
              </span>
            </div>

            {/* List Tông Môn */}
            <div className="space-y-2.5">
              {(() => {
                const tournamentDisplaySects = (warStatus?.topSects && warStatus.topSects.length > 0)
                  ? warStatus.topSects
                  : rankedSects.map((s, i) => ({
                      id: s.id,
                      name: s.name,
                      tag: s.tag,
                      badgeIcon: s.badgeIcon,
                      leaderName: s.leaderName,
                      weeklyWarPoints: s.weeklyTournamentPoints || 0,
                      memberCount: s.memberCount,
                      isHoldingThienCung: false,
                      rank: i + 1,
                    }));

                if (tournamentDisplaySects.length === 0) {
                  return (
                    <div className="p-8 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-3">
                      <span className="text-4xl block">🏛️</span>
                      <h5 className="text-sm font-bold text-slate-300">Chưa có Tông Môn nào được thành lập trong Tiên Giới</h5>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Hãy là người tiên phong Khai Sơn Lập Phái để cùng đồng môn xuất chiến và khắc tên lên Thái Cổ Linh Mạch!
                      </p>
                    </div>
                  );
                }

                const hasAnyPoints = tournamentDisplaySects.some((s) => (s.weeklyWarPoints || 0) > 0);
                const topScore = tournamentDisplaySects[0]?.weeklyWarPoints || 0;

                return (
                  <>
                    {!hasAnyPoints && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center text-xs text-amber-300 font-semibold mb-2">
                        ⚔️ Tuần này chưa có Tông Môn nào ghi nhận điểm chiến công. Hãy là môn phái đầu tiên xuất chiến 3 Ải để vươn lên dẫn đầu bảng vàng!
                      </div>
                    )}
                    {tournamentDisplaySects.map((s, idx) => {
                      const isMy = s.id === mySectId;
                      const isTop1 = idx === 0;
                      const isTop2 = idx === 1;
                      const isTop3 = idx === 2;
                      const gapToTop = Math.max(0, topScore - (s.weeklyWarPoints || 0));

                      return (
                        <div
                          key={s.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isTop1 && hasAnyPoints
                              ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.25)]'
                              : isTop2 && hasAnyPoints
                              ? 'bg-gradient-to-r from-slate-300/15 via-slate-400/5 to-transparent border-slate-300/60'
                              : isTop3 && hasAnyPoints
                              ? 'bg-gradient-to-r from-amber-700/20 via-amber-800/10 to-transparent border-amber-600/60'
                              : isMy
                              ? 'bg-cyan-500/15 border-cyan-400'
                              : 'bg-slate-950/70 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3.5">
                              <span className={`text-xl font-mono font-black ${
                                isTop1 && hasAnyPoints ? 'text-amber-400' : isTop2 && hasAnyPoints ? 'text-slate-300' : isTop3 && hasAnyPoints ? 'text-amber-600' : 'text-slate-500'
                              }`}>
                                #{idx + 1}
                              </span>

                              <span className="text-3xl">{s.badgeIcon || '⚔️'}</span>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-white">{s.name}</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                    [{s.tag}]
                                  </span>
                                  {isTop1 && hasAnyPoints && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-400 flex items-center gap-1">
                                      <Crown className="w-3 h-3 text-amber-400" />
                                      <span>Thiên Hạ Đệ Nhất</span>
                                    </span>
                                  )}
                                  {isMy && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-300 border border-cyan-400">
                                      Tông Môn Của Bạn
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                  <span>Chưởng Môn: <strong className="text-slate-200">{s.leaderName}</strong></span>
                                  <span>•</span>
                                  <span>{s.memberCount} Đệ tử xuất chiến</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-base font-mono font-black text-amber-300">
                                {(s.weeklyWarPoints || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">Điểm Chiến</span>
                              </div>
                              <span className="text-[10px] font-mono text-emerald-400 block mt-0.5">
                                {isTop1 && hasAnyPoints
                                  ? '👑 Đang Chiếm Thái Cổ Linh Mạch'
                                  : topScore > 0
                                  ? `Cách Top 1: -${gapToTop.toLocaleString()}đ`
                                  : 'Chưa có điểm chiến'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Khung Chi Tiết Phần Thưởng Tuần */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Phần Thưởng Phong Ban (Trao Vào Lúc 20:05 Chủ Nhật Hàng Tuần)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <span className="font-black text-amber-300 block">🥇 TOP 1: THIÊN HẠ ĐỆ NHẤT PHÁI</span>
                <p className="text-slate-300">• Buff toàn phái 7 ngày: <strong>+20% Tu Vi</strong> & <strong>+15% Linh Thạch</strong></p>
                <p className="text-slate-300">• Chưởng Môn nhận danh hiệu: <strong>[Đệ Nhất Chưởng Môn]</strong></p>
                <p className="text-slate-300">• Thưởng đệ tử tham chiến: <strong>+500 Linh Thạch</strong></p>
              </div>

              <div className="p-3 rounded-xl bg-slate-400/10 border border-slate-400/30 space-y-1">
                <span className="font-black text-slate-300 block">🥈 TOP 2: TÔNG MÔN NHỊ PHẨM</span>
                <p className="text-slate-300">• Buff toàn phái 7 ngày: <strong>+15% Tu Vi</strong> & <strong>+10% Linh Thạch</strong></p>
                <p className="text-slate-300">• Khung viền Bạc Tinh Anh</p>
                <p className="text-slate-300">• Thưởng đệ tử tham chiến: <strong>+300 Linh Thạch</strong></p>
              </div>

              <div className="p-3 rounded-xl bg-amber-800/15 border border-amber-700/30 space-y-1">
                <span className="font-black text-amber-500 block">🥉 TOP 3: TÔNG MÔN TAM PHẨM</span>
                <p className="text-slate-300">• Buff toàn phái 7 ngày: <strong>+10% Tu Vi</strong> & <strong>+5% Linh Thạch</strong></p>
                <p className="text-slate-300">• Khung viền Đồng Kiên Cố</p>
                <p className="text-slate-300">• Thưởng đệ tử tham chiến: <strong>+150 Linh Thạch</strong></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Khai Sơn Lập Phái */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span>Khai Sơn Lập Phái • Sáng Lập Tông Môn</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Yêu cầu: Cảnh giới <strong>Trúc Cơ Kỳ</strong> trở lên (Cấp ≥ 31) và tiêu hao <strong>300 Linh Thạch</strong> để lập môn phái độc bộ thiên hạ!
            </p>

            <form onSubmit={handleCreateSectSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Tên Tông Môn:</label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={newSectName}
                  onChange={(e) => setNewSectName(e.target.value)}
                  placeholder="Ví dụ: Côn Lôn Tiên Phái..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Tông Huy Hiệu (2-6 chữ):</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={newSectTag}
                    onChange={(e) => setNewSectTag(e.target.value)}
                    placeholder="Ví dụ: CÔN LÔN"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs uppercase focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Biểu Tượng Tông Huy:</label>
                  <select
                    value={newSectIcon}
                    onChange={(e) => setNewSectIcon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="⚔️">⚔️ Kiếm Tu</option>
                    <option value="🪷">🪷 Tiêu Dao</option>
                    <option value="⚡">⚡ Lôi Đình</option>
                    <option value="🐉">🐉 Thần Long</option>
                    <option value="🌌">🌌 Tinh Thần</option>
                    <option value="🔥">🔥 Xích Diễm</option>
                    <option value="🦅">🦅 Hỏa Phượng</option>
                    <option value="🐯">🐯 Bạch Hổ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Tông Chỉ / Khẩu Hiệu:</label>
                <input
                  type="text"
                  maxLength={60}
                  value={newSectSlogan}
                  onChange={(e) => setNewSectSlogan(e.target.value)}
                  placeholder="Ví dụ: Vạn Kiếm Quy Nhất • Trảm Phá Thái Hư..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Mô Tả Xuất Thân:</label>
                <textarea
                  rows={2}
                  value={newSectDesc}
                  onChange={(e) => setNewSectDesc(e.target.value)}
                  placeholder="Phương châm tu đạo của tông môn..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={(state.linhThach || 0) < 300 || state.level < 31}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-md disabled:opacity-40 cursor-pointer"
                >
                  Xác Nhận Thành Lập (300 Linh Thạch)
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tấn Phong Chức Vị */}
      {selectedMemberForRole && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-purple-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-purple-300 uppercase tracking-wide flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-purple-400" />
              <span>Tấn Phong Chức Vị Đệ Tử</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bổ nhiệm chức vị mới cho đệ tử <strong>{selectedMemberForRole.displayName || selectedMemberForRole.username}</strong>:
            </p>

            <form onSubmit={handlePromoteSubmit} className="space-y-3.5">
              <div className="space-y-2">
                {Object.entries(SECT_ROLES_CONFIG).map(([roleKey, cfg]) => {
                  const isCurRole = selectedMemberForRole.role === roleKey;
                  const isSelectable = isChuongMon || roleKey !== 'chuong_mon';

                  if (!isSelectable) return null;

                  return (
                    <label
                      key={roleKey}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        targetNewRole === roleKey
                          ? 'bg-purple-500/20 border-purple-400 shadow-sm'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="targetRole"
                          value={roleKey}
                          checked={targetNewRole === roleKey}
                          onChange={() => setTargetNewRole(roleKey as SectRole)}
                          className="accent-purple-500"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <span>{cfg.badge}</span>
                            <span className={cfg.colorClass}>{cfg.title}</span>
                            {isCurRole && (
                              <span className="text-[10px] text-slate-500">(Hiện tại)</span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {cfg.privilege}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {targetNewRole === 'chuong_mon' && (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs">
                  ⚠️ <strong>Cảnh Báo Truyền Vị:</strong> Đạo hữu sẽ chuyển giao chức vụ Chưởng Môn và trở thành Đại Trưởng Lão!
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-md cursor-pointer"
                >
                  Xác Nhận Tấn Phong
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMemberForRole(null)}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xác Nhận Rời Môn Phái */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <span className="text-4xl block">🚪</span>
            <h3 className="text-base font-black text-white">Xuất Sư Rời Khỏi Tông Môn?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Đạo hữu có chắc chắn muốn rời khỏi <strong>{mySect?.name}</strong>? Khi rời phái, đạo hữu sẽ trở lại thân phận tán tu.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleLeave}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Xác Nhận Rời Phái
              </button>
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xem Chi Tiết Tông Môn & Danh Sách Đệ Tử */}
      {inspectSect && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 rounded-2xl bg-slate-950 border border-amber-500/40 shadow-inner">
                  {inspectSect.badgeIcon}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">{inspectSect.name}</h3>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                      {inspectSect.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 italic mt-0.5">
                    &ldquo;{inspectSect.slogan || inspectSect.description}&rdquo;
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectSect(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Tổng Tu Vi</span>
                <span className="text-sm font-mono font-black text-amber-400">
                  {calculateSectTotalTuVi(inspectSect).toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Đệ Tử</span>
                <span className="text-sm font-mono font-black text-emerald-400">
                  {inspectSect.members?.length || inspectSect.memberCount} Vị
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Linh Mạch</span>
                <span className="text-sm font-mono font-black text-cyan-400">
                  Cấp {inspectSect.linhMachLevel}/5
                </span>
              </div>
            </div>

            {/* Roster */}
            <div className="flex-1 min-h-0 flex flex-col space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Danh Sách Đệ Tử & Thứ Bậc
              </span>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {(!inspectSect.members || inspectSect.members.length === 0) ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    Chưa có danh sách chi tiết đệ tử.
                  </div>
                ) : (
                  [...inspectSect.members]
                    .sort((a, b) => {
                      const rankA = SECT_ROLES_CONFIG[a.role]?.rankLevel || 1;
                      const rankB = SECT_ROLES_CONFIG[b.role]?.rankLevel || 1;
                      if (rankB !== rankA) return rankB - rankA;
                      return (b.tuViScore || 0) - (a.tuViScore || 0);
                    })
                    .map((m, idx) => {
                      const rConfig = SECT_ROLES_CONFIG[m.role] || SECT_ROLES_CONFIG.ngoai_mon;
                      return (
                        <div
                          key={`${m.userId}-${idx}`}
                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{m.avatar || '⚡'}</span>
                            <div>
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className="text-white">{m.displayName || m.username}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${rConfig.colorClass} ${rConfig.borderClass} ${rConfig.bgClass}`}>
                                  {rConfig.badge} {rConfig.title}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {m.realmName} Cấp {m.level}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-cyan-300">
                              {(m.tuViScore || 0).toLocaleString()} Tu Vi
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
              {inspectSect.id !== mySectId && (
                <button
                  type="button"
                  onClick={() => {
                    handleJoin(inspectSect.id);
                    setInspectSect(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase"
                >
                  Bái Nhập Phái
                </button>
              )}
              <button
                type="button"
                onClick={() => setInspectSect(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

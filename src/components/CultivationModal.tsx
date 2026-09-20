import React, { useState, useEffect, useRef } from 'react';
import {
  XIANXIA_REALMS,
  CultivationState,
  getSubStage,
  attemptRealmBreakthrough,
  claimDailyQuestReward,
  claimDailyCheckIn,
  useThoNguyenPill,
  useTuViPill,
  useSieuCapTuViPill,
  getTodayDateString,
  TWO_HOURS_MS,
  DAILY_MATCH_EXP_CAP,
} from '../utils/cultivation';
import { soundFx } from '../utils/audio';
import { AvatarWithFrame, setStoredFrame } from '../utils/frames';
import {
  X,
  Sparkles,
  Zap,
  Clock,
  Shield,
  Award,
  ChevronRight,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Scroll,
  HelpCircle,
  CalendarCheck,
  Gift,
  Crown,
  Check,
} from 'lucide-react';

interface CultivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: CultivationState;
  onUpdateState: (newState: CultivationState) => void;
  userAvatar?: string;
  userFrame?: string;
  onSelectFrame?: (frameId: string) => void;
}

export const CultivationModal: React.FC<CultivationModalProps> = ({
  isOpen,
  onClose,
  state,
  onUpdateState,
  userAvatar = '⚡',
  userFrame = 'default',
  onSelectFrame,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'checkin' | 'quests' | 'realms' | 'history'>('overview');
  const bodyRef = useRef<HTMLDivElement>(null);
  const [usePhaCanh, setUsePhaCanh] = useState(false);
  const [useHoTam, setUseHoTam] = useState(false);
  const [breakthroughNotice, setBreakthroughNotice] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [checkInNotice, setCheckInNotice] = useState<string | null>(null);
  const [pillNotice, setPillNotice] = useState<string | null>(null);
  const [nextDecayRemainingSec, setNextDecayRemainingSec] = useState<number>(7200);
  const [showDay7RewardInfo, setShowDay7RewardInfo] = useState(false);

  const currentRealm = XIANXIA_REALMS[state.realmIndex] || XIANXIA_REALMS[0];
  const nextRealm = state.realmIndex < 11 ? XIANXIA_REALMS[state.realmIndex + 1] : null;
  const subStage = getSubStage(state.tier);
  const expPercent = Math.min(100, Math.round((state.exp / Math.max(1, state.maxExp)) * 100));
  const isReadyBreakthrough = state.tier === 10 && state.exp >= state.maxExp && state.realmIndex < 11;
  const thoNguyenPercent = Math.min(100, Math.round((state.thoNguyen / Math.max(1, state.maxThoNguyen)) * 100));
  const todayStr = getTodayDateString();
  const hasCheckedInToday = state.checkIn?.lastCheckInDate === todayStr;

  // Reset scroll to top when switching tabs to ensure consistent view
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [activeTab]);

  // 2-hour countdown timer calculation
  useEffect(() => {
    if (!isOpen) return;

    const updateCountdown = () => {
      const now = Date.now();
      const last = state.lastThoNguyenDecay || now;
      const elapsed = (now - last) % TWO_HOURS_MS;
      const remainingMs = TWO_HOURS_MS - elapsed;
      setNextDecayRemainingSec(Math.max(0, Math.floor(remainingMs / 1000)));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isOpen, state.lastThoNguyenDecay]);

  if (!isOpen) return null;

  const formatCountdown = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}h ` : ''}${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  };

  // Handle Breakthrough
  const handleBreakthrough = () => {
    soundFx.playKeyClick();
    const result = attemptRealmBreakthrough(state, usePhaCanh, useHoTam);
    onUpdateState(result.updatedState);

    if (result.success) {
      soundFx.playVictory();
      setBreakthroughNotice({ success: true, message: result.message });
      if (result.unlockedFrameId) {
        onSelectFrame?.(result.unlockedFrameId);
        setStoredFrame(result.unlockedFrameId);
      }
    } else {
      soundFx.playError();
      setBreakthroughNotice({ success: false, message: result.message });
    }
  };

  // Handle Quest Claim
  const handleClaimQuest = (questId: string) => {
    soundFx.playKeyClick();
    const result = claimDailyQuestReward(state, questId);
    if (result.expGained > 0) {
      soundFx.playSuccess();
      onUpdateState(result.updatedState);
    }
  };

  // Handle Pill Consumption
  const handleUseThoNguyenPill = () => {
    soundFx.playKeyClick();
    const result = useThoNguyenPill(state);
    if (result.success) {
      soundFx.playSuccess();
      setPillNotice(result.message);
      onUpdateState(result.updatedState);
    }
  };

  const handleUseTuViPill = () => {
    soundFx.playKeyClick();
    const result = useTuViPill(state);
    if (result.success) {
      soundFx.playSuccess();
      setPillNotice(result.message);
      onUpdateState(result.updatedState);
    }
  };

  const handleUseSieuCapTuViPill = () => {
    soundFx.playKeyClick();
    const result = useSieuCapTuViPill(state);
    if (result.success) {
      soundFx.playVictory();
      setPillNotice(result.message);
      onUpdateState(result.updatedState);
    }
  };

  // Handle Daily Check-in
  const handleCheckIn = () => {
    soundFx.playKeyClick();
    const result = claimDailyCheckIn(state);
    if (result.success) {
      soundFx.playVictory();
      setCheckInNotice(result.message);
      onUpdateState(result.updatedState);
    } else {
      soundFx.playKeyClick();
      setCheckInNotice(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-4xl h-[88vh] max-h-[820px] min-h-[520px] flex flex-col bg-slate-900 border border-amber-500/40 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden">
        {/* Header with Realm Banner (Fixed at top) */}
        <div className={`relative shrink-0 px-6 py-5 bg-gradient-to-r ${currentRealm.bgGradient} border-b border-amber-500/30 flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <AvatarWithFrame icon={userAvatar} frameId={userFrame} size="lg" />
              <span className="absolute -bottom-1 -right-1 z-20 text-base bg-slate-950/95 border border-amber-400 rounded-full px-1.5 py-0.5 shadow-lg flex items-center justify-center leading-none pointer-events-none select-none">
                {currentRealm.icon}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-amber-300 tracking-wide flex items-center gap-2">
                  <span>{currentRealm.name}</span>
                  <span className="text-xs sm:text-sm font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40">
                    Tầng {state.tier} • {subStage}
                  </span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2 mt-0.5">
                <span className="font-bold text-amber-400">Danh hiệu: {currentRealm.titleName}</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400 font-mono font-bold">Cấp {state.level}/1000</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSelectFrame?.(currentRealm.frameId);
                setStoredFrame(currentRealm.frameId);
                soundFx.playSuccess();
              }}
              title="Trang bị khung avatar của cảnh giới hiện tại"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Trang Bị Khung Cảnh Giới
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation (Fixed under header) */}
        <div className="shrink-0 flex border-b border-slate-800 bg-slate-950/60 px-6 gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Linh Đài Tu Luyện', icon: Sparkles },
            { id: 'checkin', label: 'Điểm Danh Hàng Ngày', icon: CalendarCheck },
            { id: 'quests', label: 'Nhiệm Vụ Hàng Ngày', icon: Award },
            { id: 'realms', label: '12 Cảnh Giới Tiên Lộ', icon: Flame },
            { id: 'history', label: 'Ký Sự Đạo Lộ', icon: Scroll },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const showCheckInBadge = tab.id === 'checkin' && !hasCheckedInToday;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 ${
                  isActive
                    ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {showCheckInBadge && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body (Scrollable, consistent remaining height) */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Daily Check-in Quick Bar if not claimed */}
              {!hasCheckedInToday && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-purple-500/15 border border-amber-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/25 border border-amber-400/60 flex items-center justify-center text-lg shrink-0">
                      📅
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-amber-300">Chưa Điểm Danh Hôm Nay!</h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                          Chưa nhận
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Điểm danh ngay hôm nay để nhận <strong>{new Date().getDay() === 0 ? '1 Hộ Tâm Đan' : '1 Tu Vi Đan (+1.000 Tu Vi)'}</strong> và tích lũy chuỗi 7 ngày liên tiếp!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('checkin')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 hover:brightness-110 shadow-sm shrink-0 flex items-center gap-1.5"
                  >
                    <span>Đến Điểm Danh</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Tu Vi & Thọ Nguyên Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tu Vi Indicator */}
                <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Tu Vi Tầng Hiện Tại
                    </span>
                    <span className="text-sm font-mono font-black text-amber-300">
                      {state.exp.toLocaleString()} / {state.maxExp.toLocaleString()} ({expPercent}%)
                    </span>
                  </div>

                  <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                      style={{ width: `${expPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/60">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      Đấu trường hôm nay:
                    </span>
                    <span className="font-mono font-bold text-slate-200">
                      {state.dailyExpEarned.toLocaleString()} / {DAILY_MATCH_EXP_CAP.toLocaleString()} Tu Vi
                    </span>
                  </div>
                </div>

                {/* Thọ Nguyên Indicator */}
                <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-rose-400" />
                      Thọ Nguyên Mệnh Số
                    </span>
                    <span className={`text-sm font-mono font-black ${thoNguyenPercent < 25 ? 'text-rose-400 animate-pulse' : 'text-emerald-300'}`}>
                      {state.thoNguyen.toLocaleString()} / {state.maxThoNguyen.toLocaleString()} ({thoNguyenPercent}%)
                    </span>
                  </div>

                  <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        thoNguyenPercent < 25
                          ? 'bg-gradient-to-r from-rose-600 to-red-500 shadow-[0_0_12px_rgba(244,63,94,0.7)]'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      }`}
                      style={{ width: `${thoNguyenPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/60">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      Cứ 2 giờ giảm 1 (còn: <span className="font-mono font-bold text-cyan-300">{formatCountdown(nextDecayRemainingSec)}</span>)
                    </span>
                    <button
                      onClick={handleUseThoNguyenPill}
                      disabled={state.pillCount.thoNguyen <= 0}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      Dùng Đan ({state.pillCount.thoNguyen})
                    </button>
                  </div>
                </div>
              </div>

              {/* Warning note if Longevity is low */}
              {state.thoNguyen <= 10 && state.realmIndex < 11 && (
                <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/50 flex items-start gap-3 text-xs text-rose-200">
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-rose-300 block font-bold mb-0.5">CẢNH BÁO THỌ NGUYÊN NGUY KỊCH!</strong>
                    Khi Thọ Nguyên về 0, tu sĩ sẽ rơi vào Luân Hồi và bị đưa về Tầng 1 của 2 cảnh giới trước đó! Hãy dùng Thọ Nguyên Đan ngay hoặc hoàn thành nhiệm vụ ngày để kéo dài thọ mệnh!
                  </div>
                </div>
              )}

              {/* Breakthrough Panel */}
              <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold">
                      ⚡
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-100">
                        {state.realmIndex >= 11
                          ? 'Cảnh Giới Tối Cao Vô Thượng'
                          : isReadyBreakthrough
                          ? `Độ Kiếp Đột Phá: ${currentRealm.name} ➔ ${nextRealm?.name}`
                          : `Tiến Độ Cảnh Giới: Tầng ${state.tier}/10`}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {state.realmIndex >= 11
                          ? 'Đã đạt đỉnh cao Thiên Tôn, thọ dữ thiên tề bất tử bất diệt'
                          : isReadyBreakthrough
                          ? 'Đã đạt Đại Viên Mãn 100% Tu Vi! Có thể dẫn hạ thiên kiếp để phá cảnh'
                          : `Cần đạt Tầng 10 Đại Viên Mãn (100% Tu Vi) để mở cổng độ kiếp sang ${nextRealm?.name}`}
                      </p>
                    </div>
                  </div>

                  {nextRealm && (
                    <div className="text-right hidden sm:block">
                      <span className="text-xs text-slate-400 block">Tỷ lệ cơ bản</span>
                      <span className="text-sm font-black text-amber-300">{currentRealm.baseBreakthroughRate}%</span>
                    </div>
                  )}
                </div>

                {/* Breakthrough controls when ready */}
                {isReadyBreakthrough && nextRealm && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Phá Cảnh Đan */}
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={usePhaCanh}
                          onChange={(e) => setUsePhaCanh(e.target.checked)}
                          disabled={state.pillCount.phaCanh <= 0}
                          className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-amber-300 block">Dùng Phá Cảnh Đan (+15% tỷ lệ)</span>
                          <span className="text-slate-400">Túi đồ: {state.pillCount.phaCanh} viên</span>
                        </div>
                      </label>

                      {/* Hộ Tâm Đan */}
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={useHoTam}
                          onChange={(e) => setUseHoTam(e.target.checked)}
                          disabled={state.pillCount.hoTam <= 0}
                          className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-sky-300 block">Dùng Hộ Tâm Đan (Chống rớt tầng 7)</span>
                          <span className="text-slate-400">Túi đồ: {state.pillCount.hoTam} viên</span>
                        </div>
                      </label>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <div className="text-xs text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <span>Đột phá thất bại nếu không dùng Hộ Tâm Đan sẽ bị đánh bật về <strong>Tầng 7 (Hậu Kỳ)</strong>!</span>
                      </div>

                      <button
                        onClick={handleBreakthrough}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4 fill-slate-950" />
                        Tiến Hành Độ Kiếp ({Math.min(100, currentRealm.baseBreakthroughRate + (usePhaCanh ? 15 : 0))}%)
                      </button>
                    </div>
                  </div>
                )}

                {/* Breakthrough Notification popup */}
                {breakthroughNotice && (
                  <div
                    className={`mt-4 p-4 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                      breakthroughNotice.success
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {breakthroughNotice.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                      )}
                      <span>{breakthroughNotice.message}</span>
                    </div>
                    <button
                      onClick={() => setBreakthroughNotice(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Pill Notification popup */}
                {pillNotice && (
                  <div className="mt-4 p-3.5 rounded-xl border bg-amber-950/40 border-amber-500/60 text-amber-200 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{pillNotice}</span>
                    </div>
                    <button
                      onClick={() => setPillNotice(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Inventory / Pill Bag */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  Túi Đan Dược Tu Tiên
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Thọ Nguyên Đan */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Thọ Nguyên Đan</span>
                      <span className="text-[11px] text-slate-400">+5 Điểm Thọ Nguyên</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-300 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                        {state.pillCount.thoNguyen}
                      </span>
                      {state.pillCount.thoNguyen > 0 && (
                        <button
                          onClick={handleUseThoNguyenPill}
                          className="text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors"
                        >
                          Dùng
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Phá Cảnh Đan */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Phá Cảnh Đan</span>
                      <span className="text-[11px] text-slate-400">+15% Tỷ Lệ Đột Phá</span>
                    </div>
                    <span className="font-mono font-bold text-amber-300 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                      {state.pillCount.phaCanh}
                    </span>
                  </div>

                  {/* Hộ Tâm Đan */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Hộ Tâm Đan</span>
                      <span className="text-[11px] text-slate-400">Chống rớt về tầng 7</span>
                    </div>
                    <span className="font-mono font-bold text-sky-300 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                      {state.pillCount.hoTam}
                    </span>
                  </div>

                  {/* Tu Vi Đan */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-amber-300 block">Tu Vi Đan</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">Điểm danh T2-T7</span>
                      </div>
                      <span className="text-[11px] text-slate-400">+1.000 Tu Vi lập tức</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-300 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                        {state.pillCount.tuViDan || 0}
                      </span>
                      {(state.pillCount.tuViDan || 0) > 0 && (
                        <button
                          onClick={handleUseTuViPill}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-colors"
                        >
                          Uống
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Siêu Cấp Tu Vi Đan */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-purple-500/40 flex items-center justify-between sm:col-span-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-purple-300 block">🌟 Siêu Cấp Tu Vi Đan</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">7 ngày liên tiếp</span>
                      </div>
                      <span className="text-[11px] text-slate-400">+7.000 Tu Vi bộc phát</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-300 bg-slate-950 px-2 py-1 rounded-lg border border-purple-500/30">
                        {state.pillCount.sieuCapTuViDan || 0}
                      </span>
                      {(state.pillCount.sieuCapTuViDan || 0) > 0 && (
                        <button
                          onClick={handleUseSieuCapTuViPill}
                          className="text-[11px] font-bold px-3 py-1 rounded-lg bg-purple-500/25 text-purple-200 hover:bg-purple-500/40 border border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-colors"
                        >
                          Uống (+7K)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DAILY CHECK-IN TAB */}
          {activeTab === 'checkin' && (() => {
            const rawStreak = state.checkIn?.streak || 0;
            const currentCycleStep = rawStreak > 0 ? (rawStreak % 7 === 0 ? 7 : rawStreak % 7) : 0;
            const currentDayOfWeek = new Date().getDay();
            const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

            return (
              <div className="space-y-5">
                {/* Notice Alert if check-in action triggered */}
                {checkInNotice && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-amber-400/60 text-xs sm:text-sm text-amber-200 flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(245,158,11,0.2)] animate-fadeIn">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{checkInNotice}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCheckInNotice(null)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* 7 Days of the Week Schedule - Direct Click to Check-in */}
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 px-1 gap-1">
                    <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Lịch Thưởng Trong Tuần
                      <span className="text-[11px] font-normal normal-case text-slate-400">
                        (Nhấn trực tiếp vào ngày hôm nay để điểm danh)
                      </span>
                    </span>
                    <span className="text-right">
                      Hôm nay: <strong className="text-amber-300 font-bold">{dayNames[currentDayOfWeek]}</strong>
                      {!hasCheckedInToday ? (
                        <span className="ml-1.5 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/40 animate-pulse">
                          Chưa Điểm Danh
                        </span>
                      ) : (
                        <span className="ml-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                          Đã Hoàn Thành
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                    {[
                      { day: 1, name: 'Thứ Hai', reward: '+1 Tu Vi Đan', sub: '+1.000 Tu Vi', icon: '🧪', color: 'border-slate-800' },
                      { day: 2, name: 'Thứ Ba', reward: '+1 Tu Vi Đan', sub: '+1.000 Tu Vi', icon: '🧪', color: 'border-slate-800' },
                      { day: 3, name: 'Thứ Tư', reward: '+1 Tu Vi Đan', sub: '+1.000 Tu Vi', icon: '🧪', color: 'border-slate-800' },
                      { day: 4, name: 'Thứ Năm', reward: '+1 Tu Vi Đan', sub: '+1.000 Tu Vi', icon: '🧪', color: 'border-slate-800' },
                      { day: 5, name: 'Thứ Sáu', reward: '+1 Tu Vi Đan', sub: '+1.000 Tu Vi', icon: '🧪', color: 'border-slate-800' },
                      { day: 6, name: 'Thứ Bảy', reward: '+1 Tu Vi Đan', sub: '+1.000 Tu Vi', icon: '🧪', color: 'border-slate-800' },
                      { day: 0, name: 'Chủ Nhật', reward: '+1 Hộ Tâm Đan', sub: 'Chống rớt tầng', icon: '🛡️', color: 'border-sky-500/40 bg-sky-950/20' },
                    ].map((item) => {
                      const isToday = currentDayOfWeek === item.day;

                      return (
                        <button
                          key={item.day}
                          type="button"
                          id={`checkin-day-${item.day}`}
                          onClick={() => {
                            if (isToday) {
                              if (!hasCheckedInToday) {
                                handleCheckIn();
                              } else {
                                soundFx.playKeyClick();
                                setCheckInNotice('Hôm nay đạo hữu đã điểm danh rồi, ngày mai hãy quay lại nhé!');
                              }
                            } else {
                              soundFx.playKeyClick();
                              setCheckInNotice(`Hôm nay là ${dayNames[currentDayOfWeek]}. Đạo hữu hãy nhấn vào thẻ [${dayNames[currentDayOfWeek]}] để điểm danh!`);
                            }
                          }}
                          className={`p-3 rounded-2xl border flex flex-col justify-between text-left transition-all relative select-none cursor-pointer group ${
                            isToday
                              ? hasCheckedInToday
                                ? 'bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                                : 'bg-gradient-to-b from-amber-500/25 via-slate-950/90 to-amber-500/15 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/50 scale-[1.03] hover:scale-[1.05] active:scale-95'
                              : 'bg-slate-950/70 hover:bg-slate-900/80 hover:border-slate-700 ' + item.color
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span
                                className={`text-[11px] font-bold ${
                                  isToday
                                    ? hasCheckedInToday
                                      ? 'text-emerald-300 font-black'
                                      : 'text-amber-300 font-black'
                                    : 'text-slate-400 group-hover:text-slate-200'
                                }`}
                              >
                                {item.name}
                              </span>

                              {isToday && (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                                    hasCheckedInToday
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-amber-400 text-slate-950 shadow-xs animate-bounce'
                                  }`}
                                >
                                  {hasCheckedInToday ? (
                                    <>
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      ĐÃ NHẬN
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-2.5 h-2.5 fill-slate-950" />
                                      ĐIỂM DANH
                                    </>
                                  )}
                                </span>
                              )}
                            </div>

                            <div className="text-xl my-1 flex items-center justify-between">
                              <span className="transition-transform group-hover:scale-110">{item.icon}</span>
                              {isToday && !hasCheckedInToday && (
                                <span className="text-[10px] text-amber-300 font-black px-1.5 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/50">
                                  Bấm Nhận
                                </span>
                              )}
                            </div>

                            <div
                              className={`text-xs font-bold mt-1 ${
                                isToday
                                  ? hasCheckedInToday
                                    ? 'text-emerald-200'
                                    : 'text-amber-200'
                                  : 'text-slate-200'
                              }`}
                            >
                              {item.reward}
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between">
                            <span>{item.sub}</span>
                            {isToday && hasCheckedInToday && (
                              <span className="text-[9px] text-emerald-400 font-bold">✓ Xong</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 7-Step Circular Progress Bar (Thanh tiến độ 7 Ngày liên tiếp) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-purple-500/40 space-y-4 shadow-[0_0_25px_rgba(168,85,247,0.1)]">
                  {/* Progress Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-purple-200 flex items-center gap-2">
                          Tiến Độ Chuỗi Điểm Danh 7 Ngày
                          {currentCycleStep === 7 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/50 animate-pulse">
                              ĐẠI VIÊN MÃN
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Mỗi ngày điểm danh thanh tiến độ sẽ tăng thêm 1 ngày. Chạm Ngày 7 nhận thưởng lớn!
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-xs text-slate-400">Chuỗi hiện tại:</span>
                      <span className="px-3 py-1 rounded-xl bg-purple-950/60 border border-purple-500/40 text-xs font-mono font-black text-purple-300 shadow-xs">
                        {rawStreak} Ngày ({currentCycleStep}/7 Ngày)
                      </span>
                    </div>
                  </div>

                  {/* 7-Step Progress Track & Nodes */}
                  <div className="pt-4 pb-2 px-1 sm:px-3">
                    <div className="relative">
                      {/* Connecting Line Track - Aligned to circle centers */}
                      <div className="absolute top-5 sm:top-6 -translate-y-1/2 left-5 sm:left-6 right-5 sm:right-6 h-1.5 sm:h-2 bg-slate-800/90 rounded-full pointer-events-none">
                        {/* Glowing Filled Track */}
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-purple-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_14px_rgba(245,158,11,0.6)]"
                          style={{
                            width: `${
                              currentCycleStep <= 1
                                ? 0
                                : Math.min(100, ((Math.min(7, currentCycleStep) - 1) / 6) * 100)
                            }%`,
                          }}
                        />
                      </div>

                      {/* 7 Circular Nodes Sitting Over Track */}
                      <div className="relative z-10 flex items-start justify-between">
                        {[1, 2, 3, 4, 5, 6, 7].map((step) => {
                          const isReached = currentCycleStep >= step;
                          const isLastStep = step === 7;

                          if (isLastStep) {
                            // Ngày thứ 7: Icon đặc biệt có hiệu ứng hover hiển thị thông tin phần thưởng
                            return (
                              <div
                                key={step}
                                className="relative group flex flex-col items-center select-none"
                              >
                                {/* Tooltip on Hover / Click - Right-aligned to never get clipped */}
                                <div
                                  className={`absolute bottom-full mb-3 right-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible ${
                                    showDay7RewardInfo ? '!opacity-100 !visible' : ''
                                  } transition-all duration-200 z-50 w-64 sm:w-72 max-w-[calc(100vw-50px)] pointer-events-auto`}
                                >
                                  <div className="p-3.5 rounded-2xl bg-slate-950/95 border-2 border-purple-500/80 shadow-[0_15px_35px_rgba(0,0,0,0.9),0_0_25px_rgba(168,85,247,0.35)] backdrop-blur-md">
                                    <div className="flex items-center justify-between pb-2 border-b border-purple-500/30">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl">👑</span>
                                        <div>
                                          <div className="text-xs font-black text-purple-200">
                                            Phần Thưởng Đại Viên Mãn
                                          </div>
                                          <div className="text-[10px] text-amber-400 font-semibold">
                                            Hoàn thành 7 ngày điểm danh liên tiếp
                                          </div>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowDay7RewardInfo(false);
                                        }}
                                        className="sm:hidden text-slate-400 hover:text-white p-0.5"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    <div className="py-2.5 space-y-1.5 text-xs">
                                      <div className="flex items-center justify-between p-2 rounded-xl bg-purple-950/50 border border-purple-500/30">
                                        <div className="flex items-center gap-2">
                                          <span className="text-base">🧪</span>
                                          <span className="text-purple-200 font-bold">1 Siêu Cấp Tu Vi Đan</span>
                                        </div>
                                        <span className="text-[11px] font-mono text-purple-300 font-black">+7.000 Tu Vi</span>
                                      </div>

                                      <div className="flex items-center justify-between p-2 rounded-xl bg-amber-950/50 border border-amber-500/30">
                                        <div className="flex items-center gap-2">
                                          <span className="text-base">⚡</span>
                                          <span className="text-amber-200 font-bold">1 Phá Cảnh Đan</span>
                                        </div>
                                        <span className="text-[11px] font-mono text-amber-300 font-black">+15% Tỷ Lệ</span>
                                      </div>
                                    </div>

                                    <div className="text-[10px] text-slate-300 text-center pt-1.5 border-t border-slate-800/80">
                                      {isReached ? (
                                        <span className="text-purple-300 font-bold">
                                          ✨ Đạo hữu đã đạt mốc này trong chuỗi 7 ngày hiện tại!
                                        </span>
                                      ) : (
                                        <span>
                                          Cần thêm <strong className="text-amber-300 font-bold">{7 - currentCycleStep}</strong> ngày điểm danh liên tiếp để nhận.
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {/* Triangle Arrow - Aligned to right pointing down to Crown icon */}
                                  <div className="w-3 h-3 bg-slate-950 border-r-2 border-b-2 border-purple-500/80 rotate-45 ml-auto mr-4 sm:mr-5 -mt-1.5 shadow-sm" />
                                </div>

                                {/* Fixed height/width box to guarantee circle vertical center at y = 20px / 24px */}
                                <div className="h-10 sm:h-12 w-10 sm:w-12 flex items-center justify-center">
                                  <button
                                    type="button"
                                    id="step-7-special-icon"
                                    onClick={() => setShowDay7RewardInfo((prev) => !prev)}
                                    title="Xem chi tiết phần thưởng Ngày 7"
                                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-300 relative cursor-pointer outline-hidden ${
                                      isReached
                                        ? 'bg-gradient-to-br from-purple-500 via-fuchsia-500 to-amber-400 text-white font-black shadow-[0_0_25px_rgba(168,85,247,0.8)] border-2 border-amber-300 ring-2 ring-purple-400/50 scale-110 animate-pulse'
                                        : 'bg-slate-900 border-2 border-purple-500/60 text-purple-300 group-hover:border-purple-400 group-hover:scale-110 group-hover:shadow-[0_0_18px_rgba(168,85,247,0.5)] ring-1 ring-purple-500/20'
                                    }`}
                                  >
                                    <Crown
                                      className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${
                                        isReached
                                          ? 'text-amber-200 fill-amber-300'
                                          : 'text-purple-300 group-hover:scale-110 group-hover:text-purple-200'
                                      }`}
                                    />
                                  </button>
                                </div>

                                <span
                                  className={`text-[10px] sm:text-[11px] font-bold mt-1 select-none whitespace-nowrap ${
                                    isReached ? 'text-purple-300 font-black' : 'text-purple-400/90'
                                  }`}
                                >
                                  Ngày 7 👑
                                </span>
                              </div>
                            );
                          }

                          // Nodes 1 to 6
                          return (
                            <div key={step} className="flex flex-col items-center select-none">
                              {/* Fixed height/width box to guarantee circle vertical center at y = 20px / 24px */}
                              <div className="h-10 sm:h-12 w-10 sm:w-12 flex items-center justify-center">
                                <div
                                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 relative ${
                                    isReached
                                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.6)] border-2 border-yellow-200 scale-105'
                                      : 'bg-slate-900 text-slate-500 border-2 border-slate-700/80'
                                  }`}
                                >
                                  {isReached ? (
                                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                                  ) : (
                                    step
                                  )}
                                </div>
                              </div>
                              <span
                                className={`text-[10px] sm:text-[11px] font-medium mt-1 select-none whitespace-nowrap ${
                                  isReached ? 'text-amber-300 font-bold' : 'text-slate-500'
                                }`}
                              >
                                Ngày {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* DAILY QUESTS TAB */}
          {activeTab === 'quests' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-300">Tu Luyện Hàng Ngày</h3>
                  <p className="text-xs text-slate-400">
                    Hoàn thành bài tập gõ mỗi ngày để ngưng tụ Tu Vi và Đan Dược kéo dài thọ mệnh. Tự động làm mới lúc 00:00!
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {state.dailyQuests.filter((q) => q.isClaimed).length} / {state.dailyQuests.length} Đã nhận
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {state.dailyQuests.map((quest) => {
                  const isDone = quest.isCompleted;
                  const isClaimed = quest.isClaimed;

                  return (
                    <div
                      key={quest.id}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100">{quest.name}</h4>
                          {isClaimed && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              ĐÃ NHẬN
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{quest.desc}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="text-amber-400 font-bold">+{quest.rewardExp} Tu Vi</span>
                          {quest.rewardPill === 'thoNguyen' && (
                            <span className="text-rose-300">+1 Thọ Nguyên Đan</span>
                          )}
                          {quest.rewardPill === 'phaCanh' && (
                            <span className="text-amber-300">+1 Phá Cảnh Đan</span>
                          )}
                          {quest.rewardPill === 'hoTam' && (
                            <span className="text-sky-300">+1 Hộ Tâm Đan</span>
                          )}
                        </div>
                      </div>

                      <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-xs font-mono text-slate-400">
                          {quest.progress} / {quest.target}
                        </div>
                        <button
                          onClick={() => handleClaimQuest(quest.id)}
                          disabled={!isDone || isClaimed}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isClaimed
                              ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                              : isDone
                              ? 'bg-amber-400 text-slate-950 hover:brightness-110 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {isClaimed ? 'Đã Nhận' : isDone ? 'Nhận Thưởng' : 'Chưa Xong'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rương Thưởng Hoàn Thành Đại Chu Thiên (Kích hoạt khi nhận đủ 4 nhiệm vụ) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-emerald-500/15 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-xl shrink-0">
                    🎁
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-amber-300">Rương Thưởng Đại Chu Thiên</h4>
                      {state.dailyQuests.every((q) => q.isClaimed) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          ĐÃ NHẬN HÔM NAY
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Nhận đủ cả 4 nhiệm vụ để tự động kích hoạt thêm: <span className="text-amber-400 font-bold">+1.000 Tu Vi</span> và <span className="text-rose-300 font-bold">+5 Thọ Nguyên</span>!
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-xs font-mono font-bold text-amber-400/90 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-amber-500/30">
                  {state.dailyQuests.filter((q) => q.isClaimed).length} / 4 Hoàn Tất
                </div>
              </div>
            </div>
          )}

          {/* 12 REALMS ROADMAP TAB */}
          {activeTab === 'realms' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                Lộ trình 12 Cảnh Giới Tu Tiên tương ứng 1000 cấp độ. Mỗi cảnh giới gồm 10 tầng (Sơ Kỳ 1-3, Trung Kỳ 4-6, Hậu Kỳ 7-9, Đại Viên Mãn 10) với Khung Avatar và Danh Hiệu độc bản!
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {XIANXIA_REALMS.map((realm, idx) => {
                  const isCurrent = state.realmIndex === idx;
                  const isPassed = state.realmIndex > idx;
                  const isLocked = state.realmIndex < idx;

                  return (
                    <div
                      key={realm.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-amber-950/20 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                          : isPassed
                          ? 'bg-slate-950/60 border-emerald-500/40'
                          : 'bg-slate-950/40 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{realm.icon}</span>
                          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{realm.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded-full">
                                ĐANG Ở ĐÂY
                              </span>
                            )}
                            {isPassed && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/40">
                                ĐÃ QUA
                              </span>
                            )}
                          </h4>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400">
                          Lv.{realm.startLevel} - {realm.endLevel}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">{realm.desc}</p>

                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
                        <span className="text-slate-400">
                          Thọ nguyên: <strong className="text-slate-200">{realm.maxThoNguyen.toLocaleString()}</strong>
                        </span>
                        <span className="text-amber-400 font-bold">
                          Khung: {realm.frameName}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* HISTORY LOG TAB */}
          {activeTab === 'history' && (
            <div className="space-y-2">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                Nhật ký ghi lại các cột mốc thăng cấp, độ kiếp, trừ thọ nguyên và biến cố tâm ma.
              </div>

              <div className="space-y-2">
                {state.historyLog.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">Chưa có ghi chép tu luyện nào.</div>
                ) : (
                  state.historyLog.map((log, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 font-mono flex items-start gap-2"
                    >
                      <span className="text-amber-400 font-bold flex-shrink-0">📜</span>
                      <span>{log}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

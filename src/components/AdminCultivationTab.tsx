import React, { useState, useEffect, useMemo } from 'react';
import {
  CultivationState,
  XIANXIA_REALMS,
  getRealmAndTierFromLevel,
  getLevelForRealmAndTier,
  getSubStage,
  loadStoredCultivationState,
  saveStoredCultivationState,
  setCultivationLevelByAdmin,
} from '../utils/cultivation';
import {
  getAchievementsUpToRealm,
  unlockAchievementsForUser,
  resetAchievementsForUser,
  XIANXIA_ACHIEVEMENTS,
} from '../utils/achievements';
import { soundFx } from '../utils/audio';
import {
  Sparkles,
  Crown,
  Zap,
  Award,
  Heart,
  RotateCcw,
  ArrowUpRight,
  Layers,
  Activity,
  Package,
  CheckCircle2,
} from 'lucide-react';

interface AdminCultivationTabProps {
  cultivationState?: CultivationState;
  onUpdateCultivationState?: (nextState: CultivationState) => void;
  onSyncAchievements?: (unlockedIds: string[]) => void;
  currentUsername?: string;
  currentUser?: { id?: string; username?: string } | null;
  showToast: (msg: string) => void;
}

export const AdminCultivationTab: React.FC<AdminCultivationTabProps> = ({
  cultivationState,
  onUpdateCultivationState,
  onSyncAchievements,
  currentUsername = 'Admin',
  currentUser,
  showToast,
}) => {
  // Lấy trạng thái hiện tại
  const current = cultivationState || loadStoredCultivationState();

  // State điều khiển cấp độ tra cứu / mô phỏng
  const [targetLevel, setTargetLevel] = useState<number>(current.level || 1);
  const [selectedRealmIdx, setSelectedRealmIdx] = useState<number>(current.realmIndex || 0);
  const [selectedTier, setSelectedTier] = useState<number>(current.tier || 1);
  const [unbanInput, setUnbanInput] = useState<string>('');

  // Đồng bộ khi cultivationState bên ngoài thay đổi
  useEffect(() => {
    if (cultivationState) {
      setTargetLevel(cultivationState.level);
      setSelectedRealmIdx(cultivationState.realmIndex);
      setSelectedTier(cultivationState.tier);
    }
  }, [cultivationState?.level, cultivationState?.realmIndex, cultivationState?.tier]);

  // Thông tin tính toán theo targetLevel
  const previewInfo = useMemo(() => {
    const clamped = Math.max(1, Math.min(1000, Math.round(targetLevel)));
    const { realmIndex, tier } = getRealmAndTierFromLevel(clamped);
    const realm = XIANXIA_REALMS[realmIndex];
    const subStage = getSubStage(tier);
    const achievementsToUnlock = getAchievementsUpToRealm(realmIndex);

    return {
      clamped,
      realmIndex,
      tier,
      realm,
      subStage,
      achievementsToUnlock,
      achievementsCount: achievementsToUnlock.length,
    };
  }, [targetLevel]);

  // Handler khi thay đổi cấp độ qua số
  const handleLevelChange = (lvl: number) => {
    const clamped = Math.max(1, Math.min(1000, Math.round(lvl)));
    setTargetLevel(clamped);
    const { realmIndex, tier } = getRealmAndTierFromLevel(clamped);
    setSelectedRealmIdx(realmIndex);
    setSelectedTier(tier);
  };

  // Handler khi chọn 1 trong 12 cảnh giới
  const handleRealmSelect = (rIdx: number) => {
    soundFx.playKeyClick();
    setSelectedRealmIdx(rIdx);
    const newLvl = getLevelForRealmAndTier(rIdx, selectedTier);
    setTargetLevel(newLvl);
  };

  // Handler khi chọn tầng (1 - 10)
  const handleTierSelect = (tier: number) => {
    soundFx.playKeyClick();
    setSelectedTier(tier);
    const newLvl = getLevelForRealmAndTier(selectedRealmIdx, tier);
    setTargetLevel(newLvl);
  };

  // Thực hiện gán / chuyển cấp độ tu tiên cho bản thân (tự do chuyển bất kỳ cấp độ 1 - 1000, đồng bộ tức thì với Linh Đài Tu Tiên)
  const handleApplyLevel = (lvlToApply: number) => {
    const clamped = Math.max(1, Math.min(1000, Math.round(lvlToApply)));
    const { realmIndex, tier } = getRealmAndTierFromLevel(clamped);

    const nextState = setCultivationLevelByAdmin(current, clamped, {
      customTier: tier,
      refillThoNguyen: true,
    });

    if (onUpdateCultivationState) {
      onUpdateCultivationState(nextState);
    } else {
      saveStoredCultivationState(nextState);
    }

    setTargetLevel(nextState.level);
    setSelectedRealmIdx(nextState.realmIndex);
    setSelectedTier(nextState.tier);

    soundFx.playVictory();
    soundFx.playAchievementUnlock();
    showToast(
      `🎉 Đã chuyển thành công sang Cấp ${nextState.level} • ${XIANXIA_REALMS[nextState.realmIndex].name} Tầng ${nextState.tier} (${getSubStage(nextState.tier)})! Đã đồng bộ với Linh Đài Tu Tiên.`
    );
  };

  // Mở khóa toàn bộ 41 thành tựu tiên hiệp
  const handleUnlockAllAchievements = () => {
    const allIds = XIANXIA_ACHIEVEMENTS.map((a) => a.id);
    const accountKey = currentUser?.id || currentUsername || 'Admin';
    unlockAchievementsForUser(allIds, accountKey);
    if (onSyncAchievements) {
      onSyncAchievements(allIds);
    }
    soundFx.playVictory();
    soundFx.playAchievementUnlock();
    showToast(`👑 Đã mở khóa TOÀN BỘ ${allIds.length} Thành Tựu Tiên Hiệp cho ${accountKey}!`);
  };

  // Mở khóa thành tựu theo cảnh giới hiện tại
  const handleUnlockCurrentRealmAchievements = () => {
    const achIds = getAchievementsUpToRealm(current.realmIndex);
    const accountKey = currentUser?.id || currentUsername || 'Admin';
    unlockAchievementsForUser(achIds, accountKey);
    if (onSyncAchievements) {
      onSyncAchievements(achIds);
    }
    soundFx.playVictory();
    showToast(`🏆 Đã mở khóa ${achIds.length} thành tựu tương ứng với cảnh giới hiện tại!`);
  };

  // Khôi phục / Đặt lại thành tựu về mặc định
  const handleResetAchievements = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại (khóa lại) toàn bộ thành tựu của tài khoản này không?')) {
      const accountKey = currentUser?.id || currentUsername || 'Admin';
      resetAchievementsForUser(accountKey);
      if (onSyncAchievements) {
        onSyncAchievements([]);
      }
      soundFx.playKeyClick();
      showToast(`🔄 Đã đặt lại thành tựu của tài khoản ${accountKey} về ban đầu!`);
    }
  };

  // Tiện ích: Bơm đầy đan dược
  const handleFillAllPills = () => {
    const updatedPills = {
      thoNguyen: 99,
      hoTam: 99,
      phaCanh: 99,
      tuViDan: 99,
      sieuCapTuViDan: 99,
    };
    const nextState: CultivationState = {
      ...current,
      pillCount: updatedPills,
    };
    if (onUpdateCultivationState) {
      onUpdateCultivationState(nextState);
    } else {
      saveStoredCultivationState(nextState);
    }
    soundFx.playVictory();
    showToast('💊 Đã bơm đầy 99 Đan Dược tất cả các loại vào Túi Trữ Vật!');
  };

  // Tiện ích: Hồi đầy thọ nguyên
  const handleRefillThoNguyenNow = () => {
    const realm = XIANXIA_REALMS[current.realmIndex];
    const nextState: CultivationState = {
      ...current,
      thoNguyen: realm.maxThoNguyen,
      maxThoNguyen: realm.maxThoNguyen,
    };
    if (onUpdateCultivationState) {
      onUpdateCultivationState(nextState);
    } else {
      saveStoredCultivationState(nextState);
    }
    soundFx.playVictory();
    showToast(`💖 Đã hồi đầy 100% Thọ Nguyên (${realm.maxThoNguyen}/${realm.maxThoNguyen})!`);
  };

  // Tiện ích: Thêm Tu Vi EXP
  const handleAddExp = (amount: number) => {
    const nextExp = Math.min(current.maxExp - 1, current.exp + amount);
    const nextState: CultivationState = {
      ...current,
      exp: nextExp,
    };
    if (onUpdateCultivationState) {
      onUpdateCultivationState(nextState);
    } else {
      saveStoredCultivationState(nextState);
    }
    soundFx.playKeyClick();
    showToast(`✨ Đã thêm +${amount.toLocaleString()} Tu Vi EXP cho bản thân!`);
  };

  const currentRealmConfig = XIANXIA_REALMS[current.realmIndex] || XIANXIA_REALMS[0];
  const currentSubStage = getSubStage(current.tier);

  return (
    <div className="space-y-6 animate-fadeIn pb-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. THẺ THÔNG TIN TRẠNG THÁI TU VI HIỆN TẠI CỦA ADMIN */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/20 border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          {/* Avatar & Insignia Cảnh Giới */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex flex-col items-center justify-center text-amber-300">
                <span className="text-xl font-bold">{currentRealmConfig.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">
                  {currentRealmConfig.badge}
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-black text-white tracking-wide">
                  {currentRealmConfig.name}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                  Tầng {current.tier} • {currentSubStage}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-mono font-bold">
                  Cấp {current.level} / 1000
                </span>
              </div>

              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span className="text-amber-400 font-semibold">{currentUsername}</span>
                <span className="text-slate-600">•</span>
                <span>Danh hiệu: <strong className="text-white">{currentRealmConfig.titleName}</strong></span>
              </p>
            </div>
          </div>

          {/* Chỉ số Thọ Nguyên & Tu Vi EXP */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* Thọ Nguyên */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Heart className="w-4 h-4 fill-rose-500/30 text-rose-400" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Thọ Nguyên</div>
                <div className="font-mono font-black text-rose-300">
                  {current.thoNguyen} <span className="text-slate-500 font-normal">/ {current.maxThoNguyen}</span>
                </div>
              </div>
            </div>

            {/* Tu Vi EXP */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tu Vi EXP</div>
                <div className="font-mono font-black text-emerald-300">
                  {current.exp.toLocaleString()} <span className="text-slate-500 font-normal">/ {current.maxExp.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Đan Dược */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Package className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Túi Đan Dược</div>
                <div className="text-purple-300 font-bold text-[11px]">
                  Thọ: {current.pillCount?.thoNguyen || 0} | Hộ: {current.pillCount?.hoTam || 0} | Phá: {current.pillCount?.phaCanh || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. BẢNG THIẾT LẬP CẤP ĐỘ TU TIÊN CHO BẢN THÂN */}
      {/* ------------------------------------------------------------- */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="pb-3 border-b border-slate-800">
          <h4 className="text-sm font-black text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Thiết Lập Cấp Độ Tu Tiên Cho Bản Thân (1 - 1000)</span>
          </h4>
        </div>

        {/* Khung nhập số và thanh trượt trực quan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Ô nhập số trực tiếp */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Nhập cấp độ (1 - 1000):</span>
              <span className="text-[11px] text-amber-400 font-mono font-black">Lv. {targetLevel}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="input-admin-cultivation-level"
                type="number"
                min={1}
                max={1000}
                value={targetLevel}
                onChange={(e) => handleLevelChange(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold text-center text-sm outline-none focus:ring-2 focus:ring-amber-400"
              />
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleLevelChange(targetLevel + 10)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 hover:text-white"
                  title="+10 Cấp"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => handleLevelChange(targetLevel - 10)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 hover:text-white"
                  title="-10 Cấp"
                >
                  -10
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              <span className="text-[10px] text-slate-500">Nhanh:</span>
              {[1, 50, 150, 500, 750, 981, 1000].map((quickLvl) => (
                <button
                  key={quickLvl}
                  type="button"
                  onClick={() => handleLevelChange(quickLvl)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    targetLevel === quickLvl
                      ? 'bg-amber-500 text-black'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {quickLvl === 1 ? 'Lv.1' : quickLvl}
                </button>
              ))}
            </div>
          </div>

          {/* Thanh trượt kéo mượt mà */}
          <div className="md:col-span-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Kéo thanh trượt để chỉnh nhanh:</span>
              <span className="text-emerald-400 font-bold">{previewInfo.realm.name} (Tầng {previewInfo.tier})</span>
            </div>
            <input
              id="slider-admin-cultivation-level"
              type="range"
              min={1}
              max={1000}
              value={targetLevel}
              onChange={(e) => handleLevelChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>Lv.1 (Luyện Khí)</span>
              <span>Lv.211 (Hóa Thần)</span>
              <span>Lv.571 (Đại Thừa)</span>
              <span>Lv.721 (Độ Kiếp)</span>
              <span className="text-amber-400 font-bold">Lv.1000 (Thiên Tôn)</span>
            </div>
          </div>
        </div>

        {/* BẢNG CHỌN TRỰC QUAN THEO 12 CẢNH GIỚI TIÊN HIỆP */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Hoặc Chọn Nhanh Theo 12 Cảnh Giới:</span>
            </span>
            <span className="text-[11px] text-slate-400">Nhấp vào thẻ cảnh giới để tự động đặt cấp độ bắt đầu</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {XIANXIA_REALMS.map((realm, idx) => {
              const isSelected = previewInfo.realmIndex === idx;
              return (
                <button
                  key={realm.id}
                  id={`btn-select-realm-${idx}`}
                  type="button"
                  onClick={() => handleRealmSelect(idx)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/50'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">{realm.icon}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {realm.startLevel}-{realm.endLevel}
                    </span>
                  </div>

                  <div className="mt-1.5 min-w-0">
                    <div className={`text-xs font-black truncate ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                      {realm.name}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      Thọ: {realm.maxThoNguyen}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chọn tầng của cảnh giới (Tầng 1 -> 10) */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-400">Chọn Tầng (Cảnh giới {previewInfo.realm.name}):</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tierNum) => {
                const isSelectedTier = previewInfo.tier === tierNum;
                return (
                  <button
                    key={tierNum}
                    type="button"
                    onClick={() => handleTierSelect(tierNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelectedTier
                        ? 'bg-amber-500 text-black shadow-sm font-black ring-1 ring-amber-300'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {tierNum}
                  </button>
                );
              })}
              <span className="text-[11px] text-amber-400 font-bold ml-1">
                ({previewInfo.subStage})
              </span>
            </div>
          </div>
        </div>

        {/* THÔNG TIN XEM TRƯỚC CẢNH GIỚI VÀ THÀNH TỰU TƯƠNG ỨNG */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>Thông Tin Cảnh Giới Mô Phỏng Tra Cứu:</span>
            </div>
            <div className="text-base font-black text-white flex items-center gap-2 flex-wrap">
              <span className="text-amber-400">{previewInfo.realm.icon} {previewInfo.realm.name}</span>
              <span className="text-slate-400">•</span>
              <span>Tầng {previewInfo.tier} ({previewInfo.subStage})</span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-400 font-mono text-sm">Cấp {previewInfo.clamped}/1000</span>
            </div>
            <div className="text-xs text-slate-400">
              Thọ nguyên tối đa: <strong className="text-rose-300">{previewInfo.realm.maxThoNguyen} điểm</strong> | Danh hiệu: <strong className="text-amber-300">{previewInfo.realm.titleName}</strong>
            </div>
          </div>

          {/* Badge thông báo thành tựu tương ứng */}
          <div className="px-3.5 py-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 shrink-0">
            <div className="font-bold flex items-center gap-1.5">
              <Award className="w-4 h-4 text-purple-400" />
              <span>Thành tựu liên quan:</span>
            </div>
            <div className="text-[11px] text-purple-300 mt-0.5">
              Tương ứng <strong>{previewInfo.achievementsCount} / {XIANXIA_ACHIEVEMENTS.length}</strong> thành tựu tiên hiệp
            </div>
          </div>
        </div>

        {/* NÚT LƯU & ÁP DỤNG CẤP ĐỘ CHO BẢN THÂN */}
        <div className="pt-2">
          <button
            id="btn-apply-cultivation-level"
            type="button"
            onClick={() => handleApplyLevel(previewInfo.clamped)}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all hover:scale-[1.005] cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
            <span>Lưu & Áp Dụng Ngay Cấp Độ {previewInfo.clamped} ({previewInfo.realm.name} Tầng {previewInfo.tier}) Cho Bản Thân</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. TIỆN ÍCH THÀNH TỰU & TÀI NGUYÊN TU TIÊN DÀNH CHO ADMIN */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hộp công cụ Thành Tựu */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-purple-400" />
              <span>Quản Lý Thành Tựu Tiên Hiệp</span>
            </h4>
            <span className="text-[10px] text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
              Tổng 41 Thành Tựu
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleUnlockAllAchievements}
              className="px-3 py-2.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 text-purple-300" />
              <span>Mở Khóa TẤT CẢ 41 Thành Tựu</span>
            </button>

            <button
              type="button"
              onClick={handleUnlockCurrentRealmAchievements}
              className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Mở Theo Cảnh Giới Hiện Tại</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetAchievements}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-700 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Khóa Lại / Reset Thành Tựu Về Mặc Định</span>
          </button>
        </div>

        {/* Hộp công cụ Thọ Nguyên & Đan Dược */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Tài Nguyên Tu Vi & Đan Dược</span>
            </h4>
            <span className="text-[10px] text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              Admin Quick Tools
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleRefillThoNguyenNow}
              className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-500 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>Hồi Đầy 100% Thọ Nguyên</span>
            </button>

            <button
              type="button"
              onClick={handleFillAllPills}
              className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-purple-950/50 border border-slate-700 hover:border-purple-500 text-purple-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5 text-purple-400" />
              <span>Bơm Đầy 99 Đan Dược Mọi Loại</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleAddExp(10000)}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-700 text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>+10.000 Tu Vi EXP</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddExp(50000)}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-700 text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>+50.000 Tu Vi EXP</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. BÀN CỔ THẦN THỨC - QUẢN LÝ PHONG ẤN & HÓA GIẢI ÁN PHẠT (UNBAN) */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-500/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <h4 className="text-xs font-black text-rose-300 uppercase tracking-wider">
              Bàn Cổ Thần Thức • Quản Lý Án Phạt U Minh Hàn Ngục
            </h4>
          </div>
          <span className="text-[10px] text-red-300 bg-red-950/80 px-2 py-0.5 rounded border border-red-500/40 font-bold">
            Án phạt: 2 Giờ
          </span>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          Người chơi bị phát hiện can thiệp macro / auto sẽ tự động bị Bàn Cổ Thần Thức phế trừ 500 Tu Vi và cấm thi đấu trong 2 giờ. Quản trị viên có thể nhập tên người chơi để hóa giải phong ấn sớm nếu cần:
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            id="admin-unban-username-input"
            value={unbanInput}
            onChange={(e) => setUnbanInput(e.target.value)}
            placeholder="Nhập username hoặc displayName cần gỡ án phạt..."
            className="flex-1 w-full h-10 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-red-400 transition-colors"
          />
          <button
            type="button"
            onClick={async () => {
              const u = unbanInput.trim();
              if (!u) {
                showToast('⚠️ Vui lòng nhập tên người chơi cần gỡ án phạt!');
                return;
              }
              try {
                const res = await fetch('/api/admin/unban', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username: u }),
                });
                if (res.ok) {
                  soundFx.playLevelUp();
                  showToast(`⚡ Đã hóa giải phong ấn Bàn Cổ Thần Thức cho @${u}!`);
                  setUnbanInput('');
                } else {
                  showToast('❌ Không thể gỡ án phạt. Vui lòng thử lại!');
                }
              } catch {
                showToast('❌ Lỗi kết nối máy chủ!');
              }
            }}
            className="w-full sm:w-auto h-10 px-5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-red-900/40 active:scale-95 shrink-0"
          >
            <span>⚡</span>
            <span>Hóa Giải Phong Ấn (Unban)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

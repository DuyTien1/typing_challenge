import React, { useState, useMemo } from 'react';
import { 
  XianxiaAchievement, 
  AchievementBranch, 
  BRANCH_DEFINITIONS, 
  XIANXIA_ACHIEVEMENTS, 
  calculatePlayerAchievements, 
  getShowcaseAchievements, 
  setShowcaseAchievements,
  getAchievementById
} from '../utils/achievements';
import { MatchRecord } from '../utils/matchHistory';
import { HighScoreRecord } from '../types';
import { soundFx } from '../utils/audio';
import { Sparkles, Trophy, Check, X, Lock, HelpCircle, ShieldCheck, Flame, Zap } from 'lucide-react';

interface AchievementsSectionProps {
  bestWpm: number;
  totalGames: number;
  username: string;
  frame?: string;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  userId?: string;
  matchHistory?: MatchRecord[];
  highScores?: Record<string, HighScoreRecord | null>;
  showcaseAchievements?: string[];
  onShowcaseChange?: (newShowcase: string[]) => void;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
}

const RARITY_LABELS: Record<string, { label: string; color: string }> = {
  common: { label: 'Phàm Phẩm', color: 'text-slate-300 border-slate-500/50 bg-slate-800/80' },
  rare: { label: 'Hoàng Giai', color: 'text-emerald-300 border-emerald-500/50 bg-emerald-950/80' },
  epic: { label: 'Huyền Giai', color: 'text-sky-300 border-sky-500/50 bg-sky-950/80' },
  legendary: { label: 'Địa Giai', color: 'text-purple-300 border-purple-500/50 bg-purple-950/80' },
  mythic: { label: 'Thiên Giai / Chí Tôn', color: 'text-amber-300 border-amber-500/60 bg-amber-950/85' },
};

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  bestWpm,
  totalGames,
  username,
  frame = 'default',
  isLoggedIn = false,
  isAdmin = false,
  userId,
  matchHistory = [],
  highScores = {},
  showcaseAchievements: propShowcase,
  onShowcaseChange,
  onOpenAuthModal,
}) => {
  const effectiveIsLoggedIn = isLoggedIn || isAdmin;
  const [selectedBranch, setSelectedBranch] = useState<AchievementBranch | 'all'>('all');
  const [showcase, setShowcase] = useState<string[]>(() => {
    if (!effectiveIsLoggedIn) return []; // Khách vãng lai không có thành tựu
    if (propShowcase && propShowcase.length > 0) return propShowcase.slice(0, 3);
    return getShowcaseAchievements(userId || (isAdmin ? 'Admin' : undefined));
  });
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Đồng bộ showcase khi trạng thái đăng nhập hoặc props thay đổi
  React.useEffect(() => {
    if (!effectiveIsLoggedIn) {
      setShowcase([]);
    } else if (propShowcase && propShowcase.length > 0) {
      setShowcase(propShowcase.slice(0, 3));
    } else {
      setShowcase(getShowcaseAchievements(userId || (isAdmin ? 'Admin' : undefined)));
    }
  }, [effectiveIsLoggedIn, propShowcase, userId, isAdmin]);

  // Tính toán trạng thái mở khóa của toàn bộ thành tựu (CHỈ khi đã đăng nhập hoặc có quyền Admin)
  const { unlockedMap, unlockedCount, totalCount, isLockedDueToGuest } = useMemo(() => {
    return calculatePlayerAchievements({
      bestWpm,
      totalGames,
      username,
      frame,
      isLoggedIn: effectiveIsLoggedIn,
      isAdmin,
      userId,
      matchHistory,
      highScores,
    });
  }, [bestWpm, totalGames, username, frame, effectiveIsLoggedIn, isAdmin, userId, matchHistory, highScores]);

  // Gợi ý thành tựu khả dĩ tiếp theo
  const nextSuggestions = useMemo(() => {
    if (!isLoggedIn) return [];
    const list: { ach: XianxiaAchievement; reason: string }[] = [];
    for (const ach of XIANXIA_ACHIEVEMENTS) {
      if (unlockedMap[ach.id]) continue;
      if (ach.branch === 'speed' && bestWpm >= 30) {
        list.push({ ach, reason: `Cần thêm ${parseInt(ach.id.replace('speed_', '')) - bestWpm} WPM nữa` });
      } else if (ach.branch === 'matches' && totalGames >= 5) {
        list.push({ ach, reason: `Chỉ còn ${parseInt(ach.id.replace('matches_', '')) - totalGames} trận đấu` });
      } else if (ach.branch === 'accuracy') {
        list.push({ ach, reason: 'Nâng cao độ chính xác trong trận đấu tiếp theo' });
      }
      if (list.length >= 2) break;
    }
    return list;
  }, [unlockedMap, bestWpm, totalGames, isLoggedIn]);

  // Bộ lọc danh sách thành tựu hiển thị
  const filteredAchievements = useMemo(() => {
    if (selectedBranch === 'all') return XIANXIA_ACHIEVEMENTS;
    return XIANXIA_ACHIEVEMENTS.filter((a) => a.branch === selectedBranch);
  }, [selectedBranch]);

  // Xử lý bật/tắt trang bị vào Showcase (Tối đa 3)
  const handleToggleShowcase = (achId: string) => {
    soundFx.playKeyClick();
    if (!isLoggedIn) {
      setFeedbackMsg('Cần đăng nhập để kích hoạt thành tựu!');
      setTimeout(() => setFeedbackMsg(null), 3500);
      return;
    }

    if (!unlockedMap[achId]) {
      setFeedbackMsg('Đạo hữu chưa lĩnh ngộ thành tựu này!');
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }

    let nextShowcase: string[];
    if (showcase.includes(achId)) {
      // Bỏ chọn
      nextShowcase = showcase.filter((id) => id !== achId);
      setFeedbackMsg('Đã gỡ thành tựu khỏi đài trưng bày hồ sơ.');
    } else {
      // Thêm mới
      if (showcase.length < 3) {
        nextShowcase = [...showcase, achId];
        setFeedbackMsg(`Đã trưng bày thành công (${nextShowcase.length}/3)!`);
      } else {
        // Đã đủ 3, thay thế vị trí thứ 3
        nextShowcase = [showcase[0], showcase[1], achId];
        setFeedbackMsg('Đã đổi vị trí thứ 3 trong đài trưng bày!');
      }
    }

    setShowcase(nextShowcase);
    setShowcaseAchievements(nextShowcase, userId);
    if (onShowcaseChange) {
      onShowcaseChange(nextShowcase);
    }
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleRemoveFromSlot = (achId: string) => {
    soundFx.playKeyClick();
    if (!isLoggedIn) return;
    const nextShowcase = showcase.filter((id) => id !== achId);
    setShowcase(nextShowcase);
    setShowcaseAchievements(nextShowcase, userId);
    if (onShowcaseChange) {
      onShowcaseChange(nextShowcase);
    }
    setFeedbackMsg('Đã gỡ thành tựu khỏi vị trí trưng bày.');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const percentUnlocked = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="space-y-4 text-left">
      {/* THÔNG BÁO 1 DÒNG: CẦN ĐĂNG NHẬP ĐỂ KÍCH HOẠT THÀNH TỰU */}
      {!isLoggedIn && (
        <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium truncate">Cần đăng nhập để kích hoạt thành tựu</span>
          </div>
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onOpenAuthModal('login');
              }}
              className="text-amber-400 hover:text-amber-300 font-bold underline text-xs cursor-pointer whitespace-nowrap shrink-0 transition-colors"
            >
              Đăng nhập ngay
            </button>
          )}
        </div>
      )}

      {/* 1. ĐÀI DANH VỌNG TRƯNG BÀY (SHOWCASE - TỐI ĐA 3 THÀNH TỰU) */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/40 border border-purple-500/30 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <span>Đài Danh Vọng Hồ Sơ</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40 font-mono">
                  {showcase.length}/3 Thành Tựu
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                {isLoggedIn 
                  ? 'Chọn tối đa 3 danh hiệu Tiên Hiệp đã lĩnh ngộ để hiển thị trên hồ sơ và phòng chờ'
                  : 'Yêu cầu đăng nhập tài khoản để trang bị danh hiệu lên đài danh vọng'}
              </p>
            </div>
          </div>
          {feedbackMsg && (
            <span className="text-[11px] font-bold text-amber-300 animate-fadeIn px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40">
              {feedbackMsg}
            </span>
          )}
        </div>

        {/* 3 Showcase Slots */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[0, 1, 2].map((slotIdx) => {
            const achId = showcase[slotIdx];
            const ach = achId ? getAchievementById(achId) : null;
            const slotTitle = slotIdx === 0 ? 'Thần Vị Chủ Đạo' : `Hộ Đạo Vị #${slotIdx + 1}`;

            if (!isLoggedIn) {
              return (
                <div
                  key={slotIdx}
                  className="p-3 rounded-xl border border-dashed border-amber-500/30 bg-amber-950/10 flex flex-col items-center justify-center text-center min-h-[90px] transition-colors"
                >
                  <Lock className="w-4 h-4 text-amber-400/70 mb-1" />
                  <span className="text-xs text-amber-300/80 font-bold mb-0.5">
                    {slotTitle}
                  </span>
                  <span className="text-[10px] text-slate-400 italic">
                    Khóa ở chế độ Khách (Đăng nhập để mở)
                  </span>
                </div>
              );
            }

            if (!ach) {
              return (
                <div
                  key={slotIdx}
                  className="p-3 rounded-xl border border-dashed border-slate-700/80 bg-slate-900/40 flex flex-col items-center justify-center text-center min-h-[90px] transition-colors"
                >
                  <span className="text-xs text-slate-500 font-bold mb-1">
                    {slotTitle}
                  </span>
                  <span className="text-[10px] text-slate-500 italic">
                    Chưa chọn danh hiệu (Bấm thành tựu bên dưới để chọn)
                  </span>
                </div>
              );
            }

            return (
              <div
                key={slotIdx}
                className={`p-3 rounded-xl border relative flex flex-col justify-between ${ach.badgeBg} ${ach.borderClass} shadow-md transition-all hover:scale-[1.02]`}
              >
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveFromSlot(ach.id)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/40 hover:bg-rose-500/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Gỡ khỏi vị trí này"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xl">{ach.icon}</span>
                    <div className="min-w-0 flex-1 pr-4">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-amber-300 font-mono block leading-none truncate">
                        {slotTitle}
                      </span>
                      <h5 className="text-xs font-black text-white truncate mt-0.5">
                        {ach.title}
                      </h5>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-300 leading-tight line-clamp-2 mt-1">
                    {ach.name} • <span className="text-amber-300 font-medium">{ach.realm}</span>
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400">
                  <span className="font-mono">{ach.branchName}</span>
                  <span className="text-emerald-300 font-bold flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> Đang hiển thị
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. TIẾN ĐỘ TU VI & GỢI Ý ĐỘT PHÁ */}
      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white">
              Cảnh Giới Lĩnh Ngộ Tiên Đạo
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isLoggedIn ? (
              <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" /> Khóa ở chế độ Khách (0%)
              </span>
            ) : (
              <span className="text-xs font-mono font-bold text-amber-300">
                {unlockedCount} / {totalCount} ({percentUnlocked}%)
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-amber-400 to-emerald-400 transition-all duration-500 rounded-full"
            style={{ width: `${isLoggedIn ? Math.max(4, percentUnlocked) : 0}%` }}
          />
        </div>

        {/* Quick Suggestion Box */}
        {!isLoggedIn ? (
          <div className="pt-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="text-amber-400/90 italic flex items-center gap-1">
              <span>💡</span> Đăng nhập tài khoản để bắt đầu mở khóa các thành tựu và ghi danh vào bảng vàng tiên tịch!
            </span>
            {onOpenAuthModal && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onOpenAuthModal('login');
                }}
                className="text-amber-300 hover:text-amber-200 font-bold underline cursor-pointer shrink-0"
              >
                Đăng nhập ngay &rarr;
              </button>
            )}
          </div>
        ) : nextSuggestions.length > 0 ? (
          <div className="pt-1 flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
            <span className="text-amber-400 font-bold flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3" /> Gợi ý tiếp theo:
            </span>
            {nextSuggestions.map(({ ach, reason }) => (
              <span
                key={ach.id}
                className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 flex items-center gap-1 truncate"
                title={`${ach.name}: ${ach.req}`}
              >
                <span>{ach.icon}</span>
                <strong className="text-white font-medium">{ach.name}</strong>
                <span className="text-amber-300/90 font-mono text-[10px]">({reason})</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* 3. BỘ LỌC NHÁNH THÀNH TỰU (TẬT PHONG, TÂM KIẾM, BÁCH CHIẾN, TRU MA, THẦN SỐ, BÁCH THẮNG, KỲ NGỘ) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setSelectedBranch('all');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
            selectedBranch === 'all'
              ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
          }`}
        >
          Tất cả ({totalCount})
        </button>
        {(Object.keys(BRANCH_DEFINITIONS) as AchievementBranch[]).map((brKey) => {
          const br = BRANCH_DEFINITIONS[brKey];
          const countInBranch = XIANXIA_ACHIEVEMENTS.filter((a) => a.branch === brKey).length;
          const unlockedInBranch = XIANXIA_ACHIEVEMENTS.filter(
            (a) => a.branch === brKey && unlockedMap[a.id]
          ).length;
          const isSelected = selectedBranch === brKey;

          return (
            <button
              key={brKey}
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setSelectedBranch(brKey);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>{br.icon}</span>
              <span>{br.name}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-purple-800 text-purple-200' : 'bg-slate-800 text-slate-400'}`}>
                {unlockedInBranch}/{countInBranch}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. DANH SÁCH CÁC THÀNH TỰU TIÊN HIỆP (GRID) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1">
        {filteredAchievements.map((ach) => {
          const isUnlocked = unlockedMap[ach.id];
          const isShowcased = showcase.includes(ach.id);
          const rarityInfo = RARITY_LABELS[ach.rarity] || RARITY_LABELS.common;
          const isHiddenAndLocked = ach.isHidden && !isUnlocked;

          return (
            <div
              key={ach.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                isUnlocked
                  ? `${ach.badgeBg} ${ach.borderClass} shadow-md hover:scale-[1.01]`
                  : isHiddenAndLocked
                  ? 'bg-slate-950/80 border-purple-900/40 opacity-75'
                  : 'bg-slate-950/90 border-slate-800/90 opacity-80'
              }`}
            >
              <div>
                {/* Header: Icon + Name + Realm + Rarity Tag */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                        isUnlocked
                          ? 'bg-black/40 border border-white/20 shadow-inner'
                          : isHiddenAndLocked
                          ? 'bg-purple-950/60 border border-purple-800/40 text-purple-400'
                          : 'bg-slate-900 border border-slate-800 text-slate-600'
                      }`}
                    >
                      {isHiddenAndLocked ? '🔮' : ach.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4
                          className={`text-xs font-black truncate ${
                            isUnlocked ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          {isHiddenAndLocked ? '??? (Cơ Duyên Chưa Tỏ)' : ach.name}
                        </h4>
                        {ach.isHidden && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-400/40 font-bold">
                            ẨN THẾ
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-amber-300 font-medium truncate">
                        {isHiddenAndLocked ? 'Cơ Duyên Bí Mật' : ach.realm}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${rarityInfo.color}`}
                  >
                    {rarityInfo.label}
                  </span>
                </div>

                {/* Danh Hiệu Tiên Hiệp khi mở khóa */}
                <div className="mb-2 p-2 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-400">Danh hiệu:</span>
                  <span className={`font-black tracking-wide ${isUnlocked ? ach.colorClass : 'text-slate-500'}`}>
                    {isHiddenAndLocked ? '??? (Thiên Cơ Bất Khả Lộ)' : ach.title}
                  </span>
                </div>

                {/* Yêu cầu hoàn thành */}
                <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                  {isHiddenAndLocked ? (
                    <span className="italic text-purple-300/80">
                      {ach.secretHint || 'Chưa ngộ đạo - Hãy tự mình khám phá trong thế giới tu tiên'}
                    </span>
                  ) : (
                    ach.req
                  )}
                </p>
              </div>

              {/* Footer: Trạng thái & Nút Trưng Bày */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                {isUnlocked ? (
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Đã Lĩnh Ngộ
                  </span>
                ) : !isLoggedIn ? (
                  <span className="text-[11px] font-bold text-amber-400/90 flex items-center gap-1" title="Chỉ người chơi đã đăng nhập mới có thể hoàn thành thành tựu">
                    <Lock className="w-3 h-3 text-amber-400" /> Chưa Đăng Nhập
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Chưa Đạt
                  </span>
                )}

                {isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => handleToggleShowcase(ach.id)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      isShowcased
                        ? 'bg-amber-400 text-black shadow-md shadow-amber-400/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-400/50'
                    }`}
                  >
                    {isShowcased ? (
                      <>
                        <Check className="w-3 h-3" /> Đang Trưng Bày
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-amber-400" /> Trưng Bày ({showcase.length}/3)
                      </>
                    )}
                  </button>
                ) : !isLoggedIn && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      if (onOpenAuthModal) onOpenAuthModal('login');
                      else setFeedbackMsg('Chỉ người chơi đã đăng nhập mới có thể hoàn thành thành tựu!');
                    }}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Lock className="w-3 h-3" /> Cần đăng nhập
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CultivationState,
  loadStoredCultivationState,
  saveStoredCultivationState,
  processCultivationDecay,
  addTuViFromMatch,
  getSubStage,
  ensureDailySync,
  HerbType,
  XIANXIA_REALMS,
} from '../utils/cultivation';
import { GameMode, Player, UserAccount, FriendRecord, HeavenlyDaoDecree } from '../types';
import { announceBreakthrough } from '../utils/heavenlyDaoBot';
import { getStoredAuthToken } from '../utils/auth';

export interface CultivationMatchHarvest {
  gainedExp: number;
  comboMultiplier?: number;
  notices?: string[];
  droppedHerbs?: HerbType[];
  droppedPill?: string;
  gainedLinhThach?: number;
}

export interface UseCultivationEngineProps {
  onBreakthroughNotice?: (decree: HeavenlyDaoDecree) => void;
}

export function useCultivationEngine(props?: UseCultivationEngineProps) {
  const [cultivationState, setCultivationState] = useState<CultivationState>(() => loadStoredCultivationState());
  const cultivationStateRef = useRef<CultivationState>(cultivationState);
  cultivationStateRef.current = cultivationState;

  const [isCultivationOpen, setIsCultivationOpen] = useState(false);
  const [isTribulationOpen, setIsTribulationOpen] = useState(false);
  const [cultivationMatchHarvest, setCultivationMatchHarvest] = useState<CultivationMatchHarvest | null>(null);

  const onBreakthroughNoticeRef = useRef(props?.onBreakthroughNotice);
  onBreakthroughNoticeRef.current = props?.onBreakthroughNotice;

  // Process cultivation lifespan, daily quests reset on new day, and inactivity decay
  useEffect(() => {
    // 1. Initial daily sync (nhiệm vụ hàng ngày reset đồng bộ với ngày mới / điểm danh)
    const syncRes = ensureDailySync(cultivationState);
    const res = processCultivationDecay(syncRes.updatedState);
    if (
      syncRes.didResetQuests ||
      res.updatedState.thoNguyen !== cultivationState.thoNguyen ||
      res.updatedState.exp !== cultivationState.exp ||
      res.updatedState.realmIndex !== cultivationState.realmIndex ||
      res.updatedState.dailyQuestsDate !== cultivationState.dailyQuestsDate
    ) {
      setCultivationState(res.updatedState);
      cultivationStateRef.current = res.updatedState;
      saveStoredCultivationState(res.updatedState);
    }

    const checkAndSyncDayTurnover = () => {
      setCultivationState((prev) => {
        const intervalSync = ensureDailySync(prev);
        const checkRes = processCultivationDecay(intervalSync.updatedState);
        if (
          intervalSync.didResetQuests ||
          checkRes.updatedState.thoNguyen !== prev.thoNguyen ||
          checkRes.updatedState.exp !== prev.exp ||
          checkRes.updatedState.dailyQuestsDate !== prev.dailyQuestsDate
        ) {
          saveStoredCultivationState(checkRes.updatedState);
          cultivationStateRef.current = checkRes.updatedState;
          return checkRes.updatedState;
        }
        return prev;
      });
    };

    // Periodic check every 30s for day turnover & 2-hour thọ nguyên decay
    const interval = setInterval(checkAndSyncDayTurnover, 30000);

    // Kích hoạt đồng bộ ngay khi người chơi quay lại tab (sau khi ngủ máy hoặc qua nửa đêm)
    window.addEventListener('visibilitychange', checkAndSyncDayTurnover);
    window.addEventListener('focus', checkAndSyncDayTurnover);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', checkAndSyncDayTurnover);
      window.removeEventListener('focus', checkAndSyncDayTurnover);
    };
  }, []);

  // Đồng bộ nhiệm vụ hàng ngày và điểm danh ngay khi trạng thái nạp từ tài khoản đăng nhập
  useEffect(() => {
    const syncRes = ensureDailySync(cultivationState);
    if (syncRes.didResetQuests) {
      setCultivationState(syncRes.updatedState);
      cultivationStateRef.current = syncRes.updatedState;
      saveStoredCultivationState(syncRes.updatedState);
    }
  }, [cultivationState.dailyQuestsDate, cultivationState.checkIn?.lastCheckInDate]);

  // Award Tu Vi from completed match
  const awardMatchHarvest = useCallback(
    (params: {
      modeId: string;
      wpm: number;
      accuracy: number;
      score?: number;
      maxCombo?: number;
      currentUser: UserAccount | null;
      players: Player[];
      friendsList?: FriendRecord[];
    }) => {
      const userNow = params.currentUser;
      if (!userNow) return null;

      const currentList = params.players && params.players.length > 0 ? params.players : [];
      const daoLuPartner = params.friendsList?.find((f) => f.isDaoLu);
      const hasCoupleBuff =
        !!daoLuPartner &&
        currentList.some(
          (p) =>
            (daoLuPartner.userId && p.id === daoLuPartner.userId) ||
            p.username.toLowerCase() === daoLuPartner.username.toLowerCase()
        );

      const prevState = cultivationStateRef.current;
      const cultRes = addTuViFromMatch(prevState, {
        wpm: params.wpm,
        accuracy: params.accuracy,
        mode: (params.modeId as GameMode) || 'vi_dau',
        score: params.score,
        maxCombo: params.maxCombo,
        coupleBuff: hasCoupleBuff,
      });

      cultivationStateRef.current = cultRes.updatedState;
      saveStoredCultivationState(cultRes.updatedState);
      setCultivationState(cultRes.updatedState);

      const notices = [cultRes.comboNotice, cultRes.tamPhapNotice].filter(Boolean) as string[];
      setCultivationMatchHarvest({
        gainedExp: cultRes.expGained,
        comboMultiplier: cultRes.comboMultiplier,
        notices,
        droppedHerbs: cultRes.droppedHerbs,
        droppedPill: cultRes.droppedPills?.[0],
        gainedLinhThach: cultRes.linhThachGained,
      });

      // Đột phá cảnh giới hoặc thăng tầng Tu Vi: Huyền Thiên Khí Linh phát chiếu thư dị tượng
      if (cultRes.leveledUp) {
        const currentRealm = XIANXIA_REALMS[cultRes.updatedState.realmIndex];
        announceBreakthrough(
          userNow.displayName || userNow.username,
          currentRealm?.name || 'Tu Chân',
          getSubStage(cultRes.updatedState.tier),
          cultRes.updatedState.tier,
          false
        )
          .then((dec) => {
            if (onBreakthroughNoticeRef.current) {
              onBreakthroughNoticeRef.current(dec);
            }
          })
          .catch(() => {});
      }

      const token = getStoredAuthToken();
      if (token || userNow) {
        fetch('/api/cultivation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(userNow?.username ? { 'x-username': userNow.username } : {}),
            ...(userNow?.id ? { 'x-user-id': userNow.id } : {}),
          },
          body: JSON.stringify({
            cultivation: cultRes.updatedState,
            username: userNow?.username,
            userId: userNow?.id,
          }),
        }).catch(() => {});
      }

      return cultRes;
    },
    []
  );

  // Directly add Tu Vi (e.g., from gifts, tea, mentor guidance) - Strictly blocked for Tán Tu / unauthenticated players
  const addDirectTuVi = useCallback((bonus: number) => {
    const token = getStoredAuthToken();
    if (!token) return;

    setCultivationState((prev) => {
      const updated = {
        ...prev,
        exp: (prev.exp || 0) + bonus,
      };
      saveStoredCultivationState(updated);
      cultivationStateRef.current = updated;
      return updated;
    });
  }, []);

  const openCultivation = useCallback(() => setIsCultivationOpen(true), []);
  const closeCultivation = useCallback(() => setIsCultivationOpen(false), []);
  const openTribulation = useCallback(() => setIsTribulationOpen(true), []);
  const closeTribulation = useCallback(() => setIsTribulationOpen(false), []);

  return {
    cultivationState,
    setCultivationState,
    cultivationStateRef,
    isCultivationOpen,
    setIsCultivationOpen,
    isTribulationOpen,
    setIsTribulationOpen,
    cultivationMatchHarvest,
    setCultivationMatchHarvest,
    awardMatchHarvest,
    addDirectTuVi,
    openCultivation,
    closeCultivation,
    openTribulation,
    closeTribulation,
  };
}

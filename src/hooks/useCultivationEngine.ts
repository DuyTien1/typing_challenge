import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CultivationState,
  loadStoredCultivationState,
  saveStoredCultivationState,
  processCultivationDecay,
  addTuViFromMatch,
  getSubStage,
  HerbType,
  XIANXIA_REALMS,
} from '../utils/cultivation';
import { GameMode, Player, UserAccount, FriendRecord, HeavenlyDaoDecree } from '../types';
import { announceBreakthrough } from '../utils/heavenlyDaoBot';

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

  // Process cultivation lifespan and inactivity decay
  useEffect(() => {
    const res = processCultivationDecay(cultivationState);
    if (
      res.updatedState.thoNguyen !== cultivationState.thoNguyen ||
      res.updatedState.exp !== cultivationState.exp ||
      res.updatedState.realmIndex !== cultivationState.realmIndex
    ) {
      setCultivationState(res.updatedState);
      cultivationStateRef.current = res.updatedState;
      saveStoredCultivationState(res.updatedState);
    }

    // Periodic check every 60s for 2-hour thọ nguyên decay
    const interval = setInterval(() => {
      setCultivationState((prev) => {
        const checkRes = processCultivationDecay(prev);
        if (
          checkRes.updatedState.thoNguyen !== prev.thoNguyen ||
          checkRes.updatedState.exp !== prev.exp
        ) {
          saveStoredCultivationState(checkRes.updatedState);
          cultivationStateRef.current = checkRes.updatedState;
          return checkRes.updatedState;
        }
        return prev;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

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
          cultRes.updatedState.tier
        )
          .then((dec) => {
            if (onBreakthroughNoticeRef.current) {
              onBreakthroughNoticeRef.current(dec);
            }
          })
          .catch(() => {});
      }

      const token = typeof window !== 'undefined' ? sessionStorage.getItem('fasttyping_token') : null;
      if (token) {
        fetch('/api/cultivation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ cultivation: cultRes.updatedState }),
        }).catch(() => {});
      }

      return cultRes;
    },
    []
  );

  // Directly add Tu Vi (e.g., from gifts, tea, mentor guidance)
  const addDirectTuVi = useCallback((bonus: number) => {
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

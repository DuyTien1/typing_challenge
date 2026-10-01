import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Player, BossState, KeystrokeEvent, PerformanceChartPoint, BossBattleStats } from '../types';
import { soundFx } from '../utils/audio';
import { calculateBossDamageServer } from '../utils/antiCheat';
import { normalizeChartTimeline } from '../utils/chartHelper';
import { MonkeytypeCaret } from './MonkeytypeCaret';
import { loadStoredCultivationState } from '../utils/cultivation';
import { getStoredFrame } from '../utils/frames';
import { ArtifactInputVfxFrame } from './vfx/ArtifactInputVfxFrame';
import bossBannerImg from '../assets/images/boss_hac_long_maton_1790868641608.jpg';
import { 
  ShieldAlert, 
  Bomb, 
  RotateCcw, 
  Zap, 
  Clock, 
  ShieldCheck,
  AlertTriangle,
  MousePointerClick,
  Home,
  Flag,
  Flame,
  Swords,
  Crown,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Activity
} from 'lucide-react';

interface BossArenaProps {
  words: string[];
  boss: BossState;
  players: Player[];
  currentPlayerId: string;
  onDealDamage: (damage: number, errors: number, playerId?: string) => void;
  onSelfDestruct: () => void;
  onFinish: (
    isVictory: boolean,
    totalDamage: number,
    errors: number,
    chartData?: PerformanceChartPoint[],
    stats?: BossBattleStats
  ) => void;
  onSurrender?: () => void;
  onAFK?: () => void;
  onRestart: () => void;
  onHome?: () => void;
  isMultiplayer?: boolean;
}

const SKILL_DETAILS: Record<
  'shield' | 'shake' | 'smoke' | 'reverse' | 'capslock',
  { name: string; icon: string; border: string; bg: string; text: string; desc: string; tip: string }
> = {
  shield: {
    name: 'KHIÊN HẮC GIÁP',
    icon: '🛡️',
    border: 'border-sky-500/80',
    bg: 'bg-sky-500/20',
    text: 'text-sky-300',
    desc: 'Boss ngưng tụ Hắc Giáp cực dày! Nếu không phá vỡ kịp thời, Boss sẽ hấp thụ ma lực để hồi phục sinh mệnh!',
    tip: 'Mau dồn sát thương phá giáp trước khi Boss hồi máu!',
  },
  shake: {
    name: 'RUNG LẮC ĐỊA CHẤN',
    icon: '⚡',
    border: 'border-yellow-500/80',
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-300',
    desc: 'Mặt đất rung chuyển dữ dội! Địa chấn gây nhiễu loạn tâm thần, gõ sai ký tự sẽ bị phạt trừ 1 giây thời gian!',
    tip: 'Gõ cẩn thận từng ký tự, tránh gõ sai để không bị trừ thời gian!',
  },
  smoke: {
    name: 'MÀN KHÓI MÙ HẮC ÁM',
    icon: '💨',
    border: 'border-slate-500/80',
    bg: 'bg-slate-700/30',
    text: 'text-slate-300',
    desc: 'Sương độc quỷ vực che mờ tầm nhìn! Các ký tự phía sau bị sương mù bao phủ, chỉ hé lộ khi bạn gõ tới!',
    tip: 'Tập trung vào ký tự sáng hiện tại để tiến bước trong sương mù!',
  },
  reverse: {
    name: 'ĐẢO NGƯỢC KÝ TỰ',
    icon: '🔄',
    border: 'border-purple-500/80',
    bg: 'bg-purple-500/20',
    text: 'text-purple-300',
    desc: 'Không gian nghịch chuyển ma pháp! Bắt buộc phải gõ ngược từ phải sang trái để phá giải ma trận!',
    tip: 'Gõ từ chữ cái cuối cùng sang chữ cái đầu tiên theo chiều mũi tên!',
  },
  capslock: {
    name: 'LỜI NGUYỀN IN HOA',
    icon: '🔠',
    border: 'border-amber-500/80',
    bg: 'bg-amber-500/20',
    text: 'text-amber-300',
    desc: 'Thần uy áp chế linh hồn! Bắt buộc phải bật phím CAPSLOCK hoặc giữ Shift để gõ toàn bộ bằng CHỮ HOA!',
    tip: 'Bật phím CapsLock trên bàn phím ngay lập tức!',
  },
};

export const BossArena: React.FC<BossArenaProps> = ({
  words,
  boss: initialBoss,
  players,
  currentPlayerId,
  onDealDamage,
  onSelfDestruct,
  onFinish,
  onSurrender,
  onAFK,
  onRestart,
  onHome,
  isMultiplayer = false,
}) => {
  const [boss, setBoss] = useState<BossState>(initialBoss);
  const [inRoomCountdown, setInRoomCountdown] = useState<number | null>(() => {
    return isMultiplayer ? 3 : null;
  });

  // Countdown timer in room before match starts
  useEffect(() => {
    if (inRoomCountdown === null) return;

    if (inRoomCountdown > 0) {
      soundFx.playCountdown(false);
      const timer = setTimeout(() => {
        setInRoomCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (inRoomCountdown === 0) {
      soundFx.playCountdown(true);
      const timer = setTimeout(() => {
        setInRoomCountdown(null);
        inputRef.current?.focus();
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [inRoomCountdown]);

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [totalDamageDealt, setTotalDamageDealt] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const [combo, setCombo] = useState(0);
  const [floatingDamages, setFloatingDamages] = useState<{ id: number; text: string; isCrit: boolean; isShieldBreak?: boolean }[]>([]);
  const [combatLogs, setCombatLogs] = useState<string[]>([
    '⚔️ Trận chiến bắt đầu! Hắc Long Ma Vương giáng thế!'
  ]);
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [smokeEffect, setSmokeEffect] = useState(false);
  const [reverseEffect, setReverseEffect] = useState(false);
  const [capslockEffect, setCapslockEffect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(initialBoss.duration || 150);
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);
  const [isSurrendered, setIsSurrendered] = useState(false);
  const currentPlayerData = players.find((p) => p.id === currentPlayerId);
  const isPlayerAFK = !!currentPlayerData?.isAFK;
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const showSurrenderModalRef = useRef(false);

  // Inactivity tracking for Multiplayer (AFK after 30s with no keyboard activity)
  const lastActivityTimeRef = useRef<number>(Date.now());
  const recordActivity = useCallback(() => {
    lastActivityTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!isMultiplayer || inRoomCountdown !== null || isSurrendered || isPlayerAFK || timeLeft <= 0 || isFinishedRef.current) {
      return;
    }

    lastActivityTimeRef.current = Date.now();

    const afkInterval = setInterval(() => {
      if (isSurrendered || isPlayerAFK || timeLeft <= 0 || isFinishedRef.current) return;
      const idleTime = Date.now() - lastActivityTimeRef.current;
      if (idleTime >= 30000) {
        setIsSurrendered(true);
        if (onAFK) {
          onAFK();
        } else if (onSurrender) {
          onSurrender();
        }
      }
    }, 1000);

    return () => clearInterval(afkInterval);
  }, [isMultiplayer, inRoomCountdown, isSurrendered, isPlayerAFK, timeLeft, onAFK, onSurrender]);

  // Monkeytype Caret State & Focus
  const [caretPos, setCaretPos] = useState<{ x: number; y: number; height?: number } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [lastKeystrokeTime, setLastKeystrokeTime] = useState<number>(0);
  const [isFocused, setIsFocused] = useState(true);
  const typingTimeoutRef = useRef<number | null>(null);
  const wordContainerRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const lastWordTimestampRef = useRef<number>(performance.now());
  const keystrokesRef = useRef<KeystrokeEvent[]>([]);
  const startTimeRef = useRef<number>(performance.now());
  const performanceTimelineRef = useRef<PerformanceChartPoint[]>([]);

  // Surrender action handlers with Esc + Enter support
  const openSurrenderModal = useCallback(() => {
    if (isSurrendered || timeLeft <= 0 || isFinishedRef.current) return;
    soundFx.playKeyClick(false);
    showSurrenderModalRef.current = true;
    setShowSurrenderModal(true);
  }, [isSurrendered, timeLeft]);

  const confirmSurrender = useCallback(() => {
    soundFx.playError();
    showSurrenderModalRef.current = false;
    setShowSurrenderModal(false);
    setIsSurrendered(true);
    onSurrender?.();
  }, [onSurrender]);

  const cancelSurrender = useCallback(() => {
    soundFx.playKeyClick(false);
    showSurrenderModalRef.current = false;
    setShowSurrenderModal(false);
    setTimeout(() => {
      if (!isSurrendered) {
        inputRef.current?.focus();
        setIsFocused(true);
      }
    }, 50);
  }, [isSurrendered]);

  // Auto focus & global keypress capture with Esc + Enter surrender
  useEffect(() => {
    if (!isSurrendered) {
      inputRef.current?.focus();
    }
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      recordActivity();
      // 1. Modal is open: Enter to confirm surrender, Esc to cancel
      if (showSurrenderModalRef.current || showSurrenderModal) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          confirmSurrender();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cancelSurrender();
          return;
        }
        return;
      }

      // 2. Tab shortcut to quickly restart in solo mode
      if (e.key === 'Tab' && !isMultiplayer) {
        e.preventDefault();
        e.stopPropagation();
        soundFx.playKeyClick();
        onRestart();
        return;
      }

      // 3. Modal is NOT open: Esc to trigger surrender modal
      if (e.key === 'Escape') {
        if (!isSurrendered && onSurrender && timeLeft > 0 && !isFinishedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          openSurrenderModal();
          return;
        }
      }

      // 4. Auto focus input
      if (
        !isSurrendered &&
        document.activeElement !== inputRef.current &&
        !['Tab', 'Alt', 'Control', 'Meta', 'Escape'].includes(e.key) &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (
          activeTag === 'select' ||
          activeTag === 'button' ||
          (activeTag === 'input' && document.activeElement !== inputRef.current) ||
          document.activeElement?.closest('select, input, button, [role="menu"]')
        ) {
          return;
        }
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleWindowKeyDown, true);
    return () => window.removeEventListener('keydown', handleWindowKeyDown, true);
  }, [isSurrendered, timeLeft, onSurrender, openSurrenderModal, confirmSurrender, cancelSurrender, showSurrenderModal, isMultiplayer, onRestart, recordActivity]);

  // Countdown timer refs & handlers
  const isFinishedRef = useRef(false);
  const totalDamageRef = useRef(totalDamageDealt);
  const totalErrorsRef = useRef(totalErrors);
  const bossHpRef = useRef(boss.hp);
  const onFinishRef = useRef(onFinish);

  // Performance & combat capability stats tracking
  const critCountRef = useRef(0);
  const totalAttacksRef = useRef(0);
  const maxComboRef = useRef(0);
  const shieldBreaksRef = useRef(0);

  const getBossBattleStats = useCallback((isVictory: boolean, finalDmg: number, chartData?: PerformanceChartPoint[]): BossBattleStats => {
    const battleDurationSec = Math.max(1, Math.round((performance.now() - startTimeRef.current) / 1000));
    const dps = Math.round(finalDmg / Math.max(1, battleDurationSec));
    const critRate = totalAttacksRef.current > 0 ? Math.round((critCountRef.current / totalAttacksRef.current) * 100) : 0;

    return {
      isVictory,
      totalDamage: finalDmg,
      bossMaxHp: boss.maxHp,
      bossRemainingHp: Math.max(0, bossHpRef.current),
      battleDurationSec,
      dps,
      maxCombo: maxComboRef.current,
      critCount: critCountRef.current,
      critRate,
      shieldBreaks: shieldBreaksRef.current,
      totalErrors: totalErrorsRef.current,
      chartData,
    };
  }, [boss.maxHp]);

  useEffect(() => {
    totalDamageRef.current = totalDamageDealt;
  }, [totalDamageDealt]);

  useEffect(() => {
    totalErrorsRef.current = totalErrors;
  }, [totalErrors]);

  const bossRef = useRef(boss);
  useEffect(() => {
    bossRef.current = boss;
  }, [boss]);

  const skillTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const clearAllSkillTimeouts = useCallback(() => {
    skillTimeoutsRef.current.forEach((t) => clearTimeout(t));
    skillTimeoutsRef.current = [];
  }, []);

  useEffect(() => {
    bossHpRef.current = boss.hp;
  }, [boss.hp]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Countdown timer: decrement pure timeLeft & sample performance timeline
  useEffect(() => {
    if (inRoomCountdown !== null) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));

      if (!isFinishedRef.current) {
        const elapsedSec = Math.max(1, Math.round((performance.now() - startTimeRef.current) / 1000));
        const liveWpm = Math.max(0, Math.round((totalDamageRef.current / 5) / (elapsedSec / 60)));
        performanceTimelineRef.current.push({
          second: elapsedSec,
          playerWpm: liveWpm,
          errors: 0,
          errorPlot: null,
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [inRoomCountdown]);

  // When timeLeft reaches 0, trigger onFinish safely in useEffect
  useEffect(() => {
    if (timeLeft <= 0 && !isFinishedRef.current) {
      isFinishedRef.current = true;
      clearAllSkillTimeouts();
      setScreenShake(false);
      setSmokeEffect(false);
      setReverseEffect(false);
      setCapslockEffect(false);
      const victory = bossHpRef.current <= 0;
      const elapsedSec = Math.max(1, (performance.now() - startTimeRef.current) / 1000);
      const finalWpm = Math.max(0, Math.round((totalDamageRef.current / 5) / (elapsedSec / 60)));
      const chartData = normalizeChartTimeline(performanceTimelineRef.current, elapsedSec, finalWpm);
      const stats = getBossBattleStats(victory, totalDamageRef.current, chartData);
      onFinishRef.current(victory, totalDamageRef.current, totalErrorsRef.current, chartData, stats);
    }
  }, [timeLeft, getBossBattleStats, clearAllSkillTimeouts]);

  // When Boss HP reaches 0, trigger victory onFinish safely in useEffect
  useEffect(() => {
    if (boss.hp <= 0 && !isFinishedRef.current) {
      isFinishedRef.current = true;
      clearAllSkillTimeouts();
      setScreenShake(false);
      setSmokeEffect(false);
      setReverseEffect(false);
      setCapslockEffect(false);
      const elapsedSec = Math.max(1, (performance.now() - startTimeRef.current) / 1000);
      const finalDmg = totalDamageRef.current;
      const finalWpm = Math.max(0, Math.round((finalDmg / 5) / (elapsedSec / 60)));
      const chartData = normalizeChartTimeline(performanceTimelineRef.current, elapsedSec, finalWpm);
      const stats = getBossBattleStats(true, finalDmg, chartData);
      onFinishRef.current(true, finalDmg, totalErrorsRef.current, chartData, stats);
    }
  }, [boss.hp, getBossBattleStats, clearAllSkillTimeouts]);

  // Boss Skill cyclical loop
  useEffect(() => {
    if (inRoomCountdown !== null) return;
    const intervalSec = Math.max(4, boss.skillInterval || 9);
    const intervalMs = intervalSec * 1000;

    const skillInterval = setInterval(() => {
      if (isFinishedRef.current || bossHpRef.current <= 0) return;
      const currentBoss = bossRef.current;
      if (currentBoss.isStunned || currentBoss.isShieldActive) return;

      const rates = currentBoss.skillRates || {
        shield: 25,
        shake: 20,
        smoke: 20,
        reverse: 15,
        capslock: 20,
      };

      const skills: ('shield' | 'shake' | 'smoke' | 'reverse' | 'capslock')[] = [
        'shield',
        'shake',
        'smoke',
        'reverse',
        'capslock',
      ];

      const totalWeight =
        (rates.shield || 0) +
        (rates.shake || 0) +
        (rates.smoke || 0) +
        (rates.reverse || 0) +
        (rates.capslock || 0);

      let randomVal = Math.random() * (totalWeight > 0 ? totalWeight : 100);
      let selected: 'shield' | 'shake' | 'smoke' | 'reverse' | 'capslock' = 'shield';

      for (const skill of skills) {
        const weight = rates[skill] || 0;
        if (randomVal <= weight) {
          selected = skill;
          break;
        }
        randomVal -= weight;
      }

      const warningDurationSec = currentBoss.skillWarningDuration || 1.8;

      // 1. WARNING PHASE
      setBoss((prev) => ({
        ...prev,
        skillWarning: { skill: selected, countdown: Math.ceil(warningDurationSec) },
      }));

      let countdownLeft = Math.ceil(warningDurationSec);
      const countdownInterval = setInterval(() => {
        countdownLeft -= 1;
        if (countdownLeft > 0) {
          setBoss((prev) => (prev.skillWarning ? {
            ...prev,
            skillWarning: { ...prev.skillWarning, countdown: countdownLeft },
          } : prev));
        } else {
          clearInterval(countdownInterval);
        }
      }, 1000);
      skillTimeoutsRef.current.push(countdownInterval as unknown as NodeJS.Timeout);

      // 2. SKILL ACTIVATION PHASE
      const activateTimeout = setTimeout(() => {
        clearInterval(countdownInterval);
        if (isFinishedRef.current || bossHpRef.current <= 0) {
          setBoss((prev) => ({ ...prev, skillWarning: null }));
          return;
        }

        setBoss((prev) => ({ ...prev, skillWarning: null, activeSkill: selected }));

        if (selected === 'shield') {
          soundFx.playBossShield();
          const hpPerP = currentBoss.shieldHpPerPlayer || 60;
          const shieldValue = Math.max(40, Math.round(players.length * hpPerP));
          setBoss((prev) => ({
            ...prev,
            shield: shieldValue,
            maxShield: shieldValue,
            isShieldActive: true,
          }));
          setCombatLogs((prev) => [
            `🛡️ Boss kích hoạt KHIÊN HẮC GIÁP (${shieldValue} HP)! Mau dồn sát thương phá giáp trong ${currentBoss.shieldDuration}s!`,
            ...prev.slice(0, 7),
          ]);

          const shieldTimeout = setTimeout(() => {
            let shieldLost = false;
            let healedAmount = 0;
            setBoss((prev) => {
              if (prev.isShieldActive && prev.shield > 0) {
                healedAmount = Math.round(prev.shield * 1.2);
                shieldLost = true;
                return {
                  ...prev,
                  hp: Math.min(prev.maxHp, prev.hp + healedAmount),
                  shield: 0,
                  isShieldActive: false,
                  activeSkill: prev.activeSkill === 'shield' ? null : prev.activeSkill,
                };
              }
              return {
                ...prev,
                activeSkill: prev.activeSkill === 'shield' ? null : prev.activeSkill,
              };
            });
            if (shieldLost) {
              soundFx.playBossHeal();
              setCombo(0);
              setCombatLogs((l) => [
                `⚠️ Không phá kịp Khiên Hắc Giáp! Boss hấp thụ ma lực hồi ${healedAmount} HP và chấn nát Combo của bạn!`,
                ...l.slice(0, 7),
              ]);
            }
          }, (currentBoss.shieldDuration || 5.5) * 1000);
          skillTimeoutsRef.current.push(shieldTimeout);
        } else if (selected === 'shake') {
          soundFx.playBossSkillRoar();
          setScreenShake(true);
          setCombatLogs((prev) => [
            '🌋 Boss giậm đất kích hoạt ĐỊA CHẤN CUỒNG NỘ! Mặt đất rung chuyển dữ dội, gõ sai sẽ bị trừ 1s!',
            ...prev.slice(0, 7),
          ]);
          const shakeTimeout = setTimeout(() => {
            setScreenShake(false);
            setBoss((prev) => ({ ...prev, activeSkill: prev.activeSkill === 'shake' ? null : prev.activeSkill }));
          }, (currentBoss.shakeDuration || 4.5) * 1000);
          skillTimeoutsRef.current.push(shakeTimeout);
        } else if (selected === 'smoke') {
          soundFx.playBossSmoke();
          setSmokeEffect(true);
          setCombatLogs((prev) => [
            '💨 Boss phun ra MÀN KHÓI MÙ ĐỘC DƯỢC! Ký tự bị che mờ, chỉ hé lộ khi bạn gõ tới!',
            ...prev.slice(0, 7),
          ]);
          const smokeTimeout = setTimeout(() => {
            setSmokeEffect(false);
            setBoss((prev) => ({ ...prev, activeSkill: prev.activeSkill === 'smoke' ? null : prev.activeSkill }));
          }, (currentBoss.smokeDuration || 4.5) * 1000);
          skillTimeoutsRef.current.push(smokeTimeout);
        } else if (selected === 'reverse') {
          soundFx.playBossReverse();
          setReverseEffect(true);
          setCurrentInput('');
          setCombatLogs((prev) => [
            '🌀 KHÔNG GIAN NGHỊCH CHUYỂN! Các ký tự bị đảo ngược từ phải sang trái!',
            ...prev.slice(0, 7),
          ]);
          const reverseTimeout = setTimeout(() => {
            setReverseEffect(false);
            setCurrentInput('');
            setBoss((prev) => ({ ...prev, activeSkill: prev.activeSkill === 'reverse' ? null : prev.activeSkill }));
          }, (currentBoss.reverseDuration || 5) * 1000);
          skillTimeoutsRef.current.push(reverseTimeout);
        } else if (selected === 'capslock') {
          soundFx.playBossSkillRoar();
          setCapslockEffect(true);
          setCurrentInput('');
          setCombatLogs((prev) => [
            '🔠 THẦN UY ÁP CHẾ! Lời nguyền bắt buộc bật CAPSLOCK hoặc giữ Shift để gõ HOA!',
            ...prev.slice(0, 7),
          ]);
          const capslockTimeout = setTimeout(() => {
            setCapslockEffect(false);
            setCurrentInput('');
            setBoss((prev) => ({ ...prev, activeSkill: prev.activeSkill === 'capslock' ? null : prev.activeSkill }));
          }, (currentBoss.capslockDuration || 5) * 1000);
          skillTimeoutsRef.current.push(capslockTimeout);
        }
      }, warningDurationSec * 1000);
      skillTimeoutsRef.current.push(activateTimeout);
    }, intervalMs);

    return () => {
      clearInterval(skillInterval);
      clearAllSkillTimeouts();
    };
  }, [
    inRoomCountdown,
    boss.skillInterval,
    boss.skillWarningDuration,
    boss.shieldHpPerPlayer,
    boss.shieldDuration,
    boss.shakeDuration,
    boss.smokeDuration,
    boss.reverseDuration,
    boss.capslockDuration,
    players.length,
    clearAllSkillTimeouts,
  ]);

  // Bot Attack Simulation in Boss Arena
  const botKey = players
    .filter((p) => p.isBot)
    .map((p) => `${p.id}:${p.botTargetWpm}`)
    .join('|');

  useEffect(() => {
    if (inRoomCountdown !== null) return;
    const botPlayers = players.filter((p) => p.isBot && !p.isSurrendered);
    if (botPlayers.length === 0) return;

    const botIntervals: NodeJS.Timeout[] = [];

    botPlayers.forEach((bot) => {
      const targetWpm = bot.botTargetWpm || 65;
      const attackIntervalMs = Math.max(1200, Math.min(2600, Math.round((60 / targetWpm) * 1700)));

      const timer = setInterval(() => {
        if (isFinishedRef.current) return;

        const baseDmg = Math.max(6, Math.round((targetWpm / 60) * 10 + (Math.random() * 4 - 2)));

        let isCrit = false;
        let shieldBroken = false;
        let actualDmg = baseDmg;

        setBoss((prev) => {
          if (prev.hp <= 0) return prev;

          isCrit = prev.isStunned || Math.random() < 0.15;
          let dmg = isCrit ? Math.round(baseDmg * 1.5) : baseDmg;
          actualDmg = dmg;
          let currentShield = prev.shield;
          let currentHp = prev.hp;
          let isStunned = prev.isStunned;
          let isShieldActive = prev.isShieldActive;

          if (prev.isShieldActive && currentShield > 0) {
            if (currentShield <= dmg) {
              dmg -= currentShield;
              currentShield = 0;
              isShieldActive = false;
              isStunned = true;
              shieldBroken = true;
            } else {
              currentShield -= dmg;
              dmg = 0;
            }
          }

          if (dmg > 0) {
            currentHp = Math.max(0, currentHp - dmg);
          }

          return {
            ...prev,
            shield: currentShield,
            hp: currentHp,
            isShieldActive,
            isStunned,
          };
        });

        if (shieldBroken) {
          soundFx.playShieldBreak();
          setCombatLogs((l) => [
            `⚡ [${bot.username}] ĐÃ PHÁ VỠ KHIÊN BOSS! Boss bị Choáng!`,
            ...l.slice(0, 7),
          ]);
          setTimeout(() => {
            setBoss((b) => ({ ...b, isStunned: false }));
          }, boss.stunDuration * 1000);
        }

        const dmgId = Date.now() + Math.random();
        setFloatingDamages((f) => [
          ...f,
          { id: dmgId, text: `-${baseDmg} (${bot.username})`, isCrit },
        ]);
        setTimeout(() => {
          setFloatingDamages((f) => f.filter((d) => d.id !== dmgId));
        }, 900);

        onDealDamage(baseDmg, 0, bot.id);
      }, attackIntervalMs);

      botIntervals.push(timer);
    });

    return () => {
      botIntervals.forEach((t) => clearInterval(t));
    };
  }, [inRoomCountdown, botKey, boss.stunDuration, onDealDamage]);

  // Server-side damage calculation & submission
  const commitBossWord = useCallback(() => {
    if (isSurrendered) return;
    const typedWord = currentInput.trim();
    let targetWord = words[currentWordIndex] || '';

    if (reverseEffect) {
      targetWord = targetWord.split('').reverse().join('');
    }
    if (capslockEffect) {
      targetWord = targetWord.toUpperCase();
    }

    if (!typedWord) return;

    const damageResult = calculateBossDamageServer(
      targetWord,
      typedWord,
      combo,
      boss.isStunned,
      lastWordTimestampRef.current
    );
    lastWordTimestampRef.current = performance.now();

    if (damageResult.warning) {
      setCheatWarning(damageResult.warning);
      setTimeout(() => setCheatWarning(null), 3000);
    }

    if (damageResult.isValid) {
      const dmg = damageResult.damage;
      const isCrit = damageResult.isCrit;
      const nextCombo = damageResult.nextCombo;

      totalAttacksRef.current += 1;
      if (isCrit) {
        critCountRef.current += 1;
      }
      maxComboRef.current = Math.max(maxComboRef.current, nextCombo);

      soundFx.playBossHit();

      // Floating damage animation
      const dmgId = Date.now() + Math.random();
      setFloatingDamages((prev) => [
        ...prev,
        { id: dmgId, text: `-${dmg}${isCrit ? ' CRIT!' : ''}`, isCrit },
      ]);
      setTimeout(() => {
        setFloatingDamages((prev) => prev.filter((d) => d.id !== dmgId));
      }, 900);

      // Apply to Shield then HP
      let shieldBroken = false;
      setBoss((prev) => {
        let currentShield = prev.shield;
        let currentHp = prev.hp;
        let isStunned = prev.isStunned;
        let isShieldActive = prev.isShieldActive;
        let remainingDmg = dmg;

        if (prev.isShieldActive && currentShield > 0) {
          if (currentShield <= remainingDmg) {
            remainingDmg -= currentShield;
            currentShield = 0;
            isShieldActive = false;
            isStunned = true;
            shieldBroken = true;
          } else {
            currentShield -= remainingDmg;
            remainingDmg = 0;
          }
        }

        if (remainingDmg > 0) {
          currentHp = Math.max(0, currentHp - remainingDmg);
        }

        return {
          ...prev,
          shield: currentShield,
          hp: currentHp,
          isShieldActive,
          isStunned,
        };
      });

      if (shieldBroken) {
        shieldBreaksRef.current += 1;
        soundFx.playShieldBreak();
        setCombatLogs((l) => [
          `⚡ KHIÊN HẮC GIÁP ĐÃ VỠ! Boss bị Choáng trong ${boss.stunDuration}s (Nhận x1.5 sát thương)!`,
          ...l.slice(0, 7),
        ]);

        const stunTimeout = setTimeout(() => {
          setBoss((b) => ({ ...b, isStunned: false }));
        }, (boss.stunDuration || 3) * 1000);
        skillTimeoutsRef.current.push(stunTimeout);
      }

      totalDamageRef.current = totalDamageDealt + damageResult.damage;
      setCombo(nextCombo);
      setTotalDamageDealt((d) => d + damageResult.damage);
      onDealDamage(damageResult.damage, totalErrors);
    } else {
      soundFx.playError();
      setCombo(0);
      setTotalErrors((err) => err + 1);
      if (screenShake) {
        setTimeLeft((prev) => Math.max(1, prev - 1));
        setCombatLogs((l) => [
          '💥 ĐỊA CHẤN TÁC ĐỘNG: Gõ sai khi mặt đất rung chuyển bị trừ 1s thời gian!',
          ...l.slice(0, 7),
        ]);
      }
      const elapsedSec = Math.max(1, Math.round((performance.now() - startTimeRef.current) / 1000));
      const liveWpm = Math.max(0, Math.round((totalDamageRef.current / 5) / (elapsedSec / 60)));
      performanceTimelineRef.current.push({
        second: elapsedSec,
        playerWpm: liveWpm,
        errors: 1,
        errorPlot: liveWpm,
      });
    }

    setCurrentWordIndex((idx) => (idx + 1) % words.length);
    setCurrentInput('');
  }, [
    currentInput,
    words,
    currentWordIndex,
    reverseEffect,
    capslockEffect,
    screenShake,
    combo,
    boss.isStunned,
    boss.stunDuration,
    totalDamageDealt,
    totalErrors,
    onDealDamage,
    isSurrendered,
  ]);

  // Composition API Listeners (Vietnamese IME)
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    if (isSurrendered) return;
    isComposingRef.current = false;
    const val = e.currentTarget.value;
    setCurrentInput(val);
    
    setIsTyping(true);
    setLastKeystrokeTime(performance.now());
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 500);

    soundFx.playKeyClick(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    recordActivity();
    if (timeLeft <= 0 || inRoomCountdown !== null || isSurrendered || isPlayerAFK) return;
    const val = e.target.value;
    const now = performance.now();
    setLastKeystrokeTime(now);

    keystrokesRef.current.push({
      key: val.slice(-1) || 'Backspace',
      time: now,
    });

    setIsTyping(true);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 500);

    if (!isComposingRef.current && (val.endsWith(' ') || val.endsWith('\n'))) {
      soundFx.playKeyClick(true);
      commitBossWord();
      return;
    }

    setCurrentInput(val);
    if (!isComposingRef.current) {
      soundFx.playKeyClick(false);
    }
  };

  const hpPercent = Math.max(0, Math.round((boss.hp / boss.maxHp) * 100));
  const shieldPercent = boss.maxShield > 0 ? Math.round((boss.shield / boss.maxShield) * 100) : 0;

  // Boss Phase Progression
  const bossPhase = useMemo(() => {
    if (hpPercent <= 25) {
      return { stage: 3, name: 'Giai Đoạn III: Diệt Thế Ma Thần', badge: 'CUỒNG BẠO TỘC ĐỘ', color: 'text-rose-400 border-rose-500/50 bg-rose-500/15' };
    }
    if (hpPercent <= 50) {
      return { stage: 2, name: 'Giai Đoạn II: Ma Huyết Cuồng Nộ', badge: 'MA KHÍ BỐC CAO', color: 'text-amber-400 border-amber-500/50 bg-amber-500/15' };
    }
    return { stage: 1, name: 'Giai Đoạn I: Hắc Long Giáng Thế', badge: 'THÁI CỔ MA THẦN', color: 'text-slate-300 border-slate-700 bg-slate-800/60' };
  }, [hpPercent]);

  let currentTargetWord = words[currentWordIndex] || '';
  if (reverseEffect) {
    currentTargetWord = currentTargetWord.split('').reverse().join('');
  }
  if (capslockEffect) {
    currentTargetWord = currentTargetWord.toUpperCase();
  }

  // Next 3 preview words for predictive reading ahead
  const upcomingWords = useMemo(() => {
    return [
      words[(currentWordIndex + 1) % words.length],
      words[(currentWordIndex + 2) % words.length],
      words[(currentWordIndex + 3) % words.length],
    ];
  }, [words, currentWordIndex]);

  // Caret tracking calculation
  const updateCaret = useCallback(() => {
    if (!wordContainerRef.current) return;
    const container = wordContainerRef.current;
    const containerRect = container.getBoundingClientRect();

    const wordEl = container.querySelector('[data-boss-active-word="true"]') as HTMLElement | null;
    if (!wordEl) return;

    const wordRect = wordEl.getBoundingClientRect();
    let targetRect: DOMRect | null = null;
    let isAfter = false;

    if (currentInput.length === 0) {
      const firstChar = wordEl.querySelector('[data-char-idx="0"]');
      targetRect = firstChar ? firstChar.getBoundingClientRect() : wordRect;
    } else if (currentInput.length < currentTargetWord.length) {
      const targetChar = wordEl.querySelector(`[data-char-idx="${currentInput.length}"]`);
      if (targetChar) {
        targetRect = targetChar.getBoundingClientRect();
      }
    } else {
      const extraChar = wordEl.querySelector('[data-char-extra-last="true"]');
      if (extraChar) {
        targetRect = extraChar.getBoundingClientRect();
        isAfter = true;
      } else {
        const lastChar = wordEl.querySelector(`[data-char-idx="${currentTargetWord.length - 1}"]`);
        if (lastChar) {
          targetRect = lastChar.getBoundingClientRect();
          isAfter = true;
        }
      }
    }

    if (targetRect) {
      const x = isAfter ? targetRect.right - containerRect.left : targetRect.left - containerRect.left;
      const y = targetRect.top - containerRect.top;
      const height = Math.max(26, Math.min(48, targetRect.height || 36));
      setCaretPos({ x, y, height });
    }
  }, [currentInput, currentTargetWord]);

  useEffect(() => {
    window.addEventListener('resize', updateCaret);
    return () => {
      window.removeEventListener('resize', updateCaret);
    };
  }, [updateCaret]);

  useEffect(() => {
    updateCaret();
  }, [currentInput, currentTargetWord, updateCaret]);

  // Live combat metrics
  const elapsedSeconds = Math.max(1, Math.round((performance.now() - startTimeRef.current) / 1000));
  const currentDps = Math.round(totalDamageDealt / elapsedSeconds);
  const currentCritRate = totalAttacksRef.current > 0 ? Math.round((critCountRef.current / totalAttacksRef.current) * 100) : 0;

  // Find top damage dealer (MVP)
  const topPlayerId = useMemo(() => {
    if (players.length === 0) return currentPlayerId;
    let max = -1;
    let mvpId = currentPlayerId;
    players.forEach((p) => {
      const score = p.id === currentPlayerId ? totalDamageDealt : (p.score || 0);
      if (score > max) {
        max = score;
        mvpId = p.id;
      }
    });
    return mvpId;
  }, [players, currentPlayerId, totalDamageDealt]);

  return (
    <div
      className={`w-full max-w-5xl mx-auto space-y-4 select-none transition-all duration-200 relative ${
        screenShake ? 'animate-boss-earthquake ring-4 ring-yellow-500/50 rounded-3xl shadow-[0_0_50px_rgba(234,179,8,0.4)]' : ''
      }`}
      onClick={() => {
        if (!isSurrendered) inputRef.current?.focus();
      }}
    >
      {/* 1. TOP TACTICAL HUD HEADER */}
      <div className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex items-center justify-between gap-3">
        {/* Left: Navigation and Mode */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onHome && (
            <button
              id="btn-boss-home"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                soundFx.playKeyClick();
                onHome();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
              title="Rời trận đấu trở về trang chủ"
            >
              <Home className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Trang Chủ</span>
            </button>
          )}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-red-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-500 animate-pulse" />
              <span>Hàng Phục Ma Tôn</span>
            </span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">
              {isMultiplayer ? 'Đồng Đội Hợp Lực Săn Boss' : 'Đơn Đả Độc Đấu Diệt Ma'}
            </span>
          </div>
        </div>

        {/* Center: Live Status Indicator */}
        <div className="hidden md:flex items-center justify-center flex-1">
          {inRoomCountdown !== null ? (
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Sẵn sàng • Trận chiến bắt đầu sau {inRoomCountdown}s</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-red-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span>Đang Chiến Đấu • {boss.name}</span>
            </div>
          )}
        </div>

        {/* Right: Timer & Quick Restart */}
        <div className="flex items-center gap-3 shrink-0">
          {!isMultiplayer && (
            <button
              id="btn-boss-restart-top"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                soundFx.playKeyClick();
                onRestart();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
              title="Làm lại ván mới từ đầu (Phím tắt: Tab)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Làm Lại</span>
              <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-900 border border-slate-700 text-amber-300">Tab</kbd>
            </button>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <Clock className={`w-4 h-4 ${timeLeft <= 20 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
            <span className="text-[10px] text-slate-400 font-bold uppercase hidden sm:inline">Còn lại:</span>
            <span className={`font-mono font-black text-lg sm:text-xl tabular-nums leading-none ${
              timeLeft <= 20 ? 'text-rose-400 animate-pulse' : 'text-white'
            }`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* 2. CINEMATIC BOSS SHOWPIECE CARD */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-2xl relative overflow-hidden transition-all duration-300 ${
        boss.isShieldActive
          ? 'border-sky-400/80 shadow-[0_0_40px_rgba(56,189,248,0.35)]'
          : hpPercent <= 25
          ? 'border-red-500/80 animate-boss-enrage shadow-[0_0_45px_rgba(239,68,68,0.4)]'
          : 'border-red-900/50 shadow-[0_0_30px_rgba(153,27,27,0.25)]'
      }`}>
        {/* Atmospheric Boss Art Background with Measured Contrast Scrim */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={bossBannerImg}
            alt="Hắc Long Ma Tôn"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-30 scale-105 filter blur-[0.5px] transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-900/60" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent" />
        </div>

        {/* Content Overlays */}
        <div className="relative z-10 space-y-4">
          {/* Boss Header Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl border-2 flex items-center justify-center text-4xl sm:text-5xl shadow-xl shrink-0 transition-transform ${
                boss.isStunned
                  ? 'bg-amber-500/20 border-amber-400 rotate-6 animate-bounce'
                  : boss.isShieldActive
                  ? 'bg-sky-500/20 border-sky-400 animate-pulse'
                  : hpPercent <= 25
                  ? 'bg-red-600/30 border-red-500 scale-105 shadow-red-500/40'
                  : 'bg-red-950/50 border-red-500/60'
              }`}>
                🐉
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide drop-shadow-md">
                    {boss.name}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${bossPhase.color}`}>
                    {bossPhase.badge}
                  </span>
                  {boss.isStunned && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md animate-bounce">
                      <Sparkles className="w-3 h-3" />
                      CHOÁNG VÁNG (+50% DMG)
                    </span>
                  )}
                  {boss.isShieldActive && (
                    <span className="px-2 py-0.5 rounded-full bg-sky-500 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md animate-pulse">
                      <ShieldCheck className="w-3 h-3" />
                      KHIÊN HẮC GIÁP
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>Cổ Ma Chí Tôn • Thập Vạn Niên Ma Khí</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-amber-400 font-semibold">{bossPhase.name}</span>
                </div>
              </div>
            </div>

            {/* Quick Boss Stats summary */}
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              <div className="text-left sm:text-right">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Huyết Lượng Còn</div>
                <div className="font-mono font-black text-xl sm:text-2xl text-red-400 tabular-nums">
                  {boss.hp.toLocaleString()} <span className="text-xs text-slate-500 font-normal">HP</span>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-800 hidden sm:block" />
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Tỷ Lệ Sinh Mệnh</div>
                <div className="font-mono font-black text-xl sm:text-2xl text-amber-400 tabular-nums">
                  {hpPercent}%
                </div>
              </div>
            </div>
          </div>

          {/* Cinematic Multi-layered HP Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-red-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-500" />
                <span>HUYẾT LƯỢNG BOSS (HP)</span>
              </span>
              <span className="font-mono text-slate-300 tabular-nums">
                <strong className="text-red-400">{boss.hp.toLocaleString()}</strong> / {boss.maxHp.toLocaleString()}
              </span>
            </div>
            <div className="h-6 w-full bg-slate-950/90 rounded-2xl border border-red-900/60 p-0.5 overflow-hidden relative shadow-inner">
              {/* Background tick marks at 25%, 50%, 75% */}
              <div className="absolute inset-0 flex justify-between px-[25%] pointer-events-none z-10 opacity-30">
                <div className="w-px h-full bg-white/40" />
                <div className="w-px h-full bg-white/40" />
              </div>
              {/* Ghost health bar behind */}
              <div
                className="h-full rounded-xl bg-red-400/40 transition-all duration-700 ease-out"
                style={{ width: `${hpPercent}%` }}
              />
              {/* Primary active health bar */}
              <div
                className="absolute top-0.5 left-0.5 bottom-0.5 rounded-xl bg-gradient-to-r from-red-700 via-rose-500 to-amber-500 transition-all duration-200 shadow-lg shadow-red-500/30"
                style={{ width: `calc(${hpPercent}% - 4px)` }}
              />
            </div>
          </div>

          {/* Khiên Hắc Giáp Bar (Active Shield) */}
          {boss.isShieldActive && (
            <div className="space-y-1.5 pt-1 animate-fadeIn">
              <div className="flex justify-between text-xs font-bold text-sky-300">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-sky-400 animate-spin" />
                  <span>KHIÊN PHÒNG HỘ (KHIÊN HẮC GIÁP)</span>
                </span>
                <span className="font-mono text-sky-300 tabular-nums">
                  <strong>{boss.shield.toLocaleString()}</strong> / {boss.maxShield.toLocaleString()} ({shieldPercent}%)
                </span>
              </div>
              <div className="h-3.5 w-full bg-slate-950/90 rounded-xl border border-sky-800/80 p-0.5 overflow-hidden relative shadow-inner">
                <div
                  className="h-full rounded-lg bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-300 transition-all duration-200 shadow-md shadow-sky-500/40"
                  style={{ width: `${shieldPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-sky-300/80 italic">
                💡 Boss đang kích hoạt ma giáp bảo hộ. Toàn đội hãy dồn hỏa lực đập tan khiên trước khi hết thời gian!
              </p>
            </div>
          )}

          {/* High Priority Tactical Skill Warning Alert */}
          {boss.skillWarning && (
            <div className={`p-3.5 rounded-2xl border shadow-xl flex items-center justify-between gap-3 animate-pulse transition-all ${
              SKILL_DETAILS[boss.skillWarning.skill as keyof typeof SKILL_DETAILS]?.border || 'border-amber-500/80'
            } ${
              SKILL_DETAILS[boss.skillWarning.skill as keyof typeof SKILL_DETAILS]?.bg || 'bg-amber-500/20'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl shrink-0 animate-bounce">
                  {SKILL_DETAILS[boss.skillWarning.skill as keyof typeof SKILL_DETAILS]?.icon || '⚠️'}
                </span>
                <div>
                  <div className={`text-xs sm:text-sm font-black tracking-wide ${
                    SKILL_DETAILS[boss.skillWarning.skill as keyof typeof SKILL_DETAILS]?.text || 'text-amber-300'
                  }`}>
                    CẢNH BÁO: BOSS SẮP TUNG CHIÊU [{SKILL_DETAILS[boss.skillWarning.skill as keyof typeof SKILL_DETAILS]?.name || boss.skillWarning.skill.toUpperCase()}]!
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    {SKILL_DETAILS[boss.skillWarning.skill as keyof typeof SKILL_DETAILS]?.tip}
                  </div>
                </div>
              </div>
              <div className="shrink-0 px-3.5 py-1.5 rounded-xl bg-slate-950/90 border border-white/20 font-mono font-black text-base text-amber-300 shadow-inner flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>{boss.skillWarning.countdown}s</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. PLAYER COMBAT PERFORMANCE HUD (4 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Card 1: Tổng sát thương */}
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-red-400" />
            <span>Sát Thương Đã Gây</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums">
              {totalDamageDealt.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-semibold">DMG</span>
          </div>
        </div>

        {/* Card 2: DPS tốc độ xuất chiêu */}
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tốc Độ Xuất Chiêu (DPS)</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono tabular-nums">
              {currentDps.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-semibold">DMG/s</span>
          </div>
        </div>

        {/* Card 3: Chuỗi liên kích Combo */}
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span>Chuỗi Liên Kích</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-yellow-400 font-mono tabular-nums">
              {combo}
            </span>
            <span className="text-xs text-slate-400 font-semibold">Combo</span>
          </div>
        </div>

        {/* Card 4: Tỷ lệ Bạo Kích */}
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bạo Kích (Crit Rate)</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tabular-nums">
              {currentCritRate}%
            </span>
            <span className="text-xs text-slate-400 font-semibold">({critCountRef.current} phát)</span>
          </div>
        </div>
      </div>

      {/* 4. ACTIVE DEBUFF BADGES BANNER */}
      {(reverseEffect || capslockEffect || smokeEffect || screenShake) && (
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-wrap items-center justify-between gap-2 text-xs animate-fadeIn">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
              <span>⚠️</span>
              <span>Hiệu Ứng Bất Lợi Đang Tác Động:</span>
            </span>

            {reverseEffect && (
              <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 border border-purple-500/60 text-purple-300 font-bold flex items-center gap-1.5 animate-pulse">
                <span>🔄</span>
                <span>ĐẢO NGƯỢC KÝ TỰ</span>
              </span>
            )}
            {capslockEffect && (
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/60 text-amber-300 font-bold flex items-center gap-1.5 animate-pulse">
                <span>🔠</span>
                <span>LỜI NGUYỀN IN HOA</span>
              </span>
            )}
            {smokeEffect && (
              <span className="px-2.5 py-1 rounded-xl bg-slate-700/40 border border-slate-500/60 text-slate-300 font-bold flex items-center gap-1.5 animate-pulse">
                <span>💨</span>
                <span>MÀN KHÓI MÙ</span>
              </span>
            )}
            {screenShake && (
              <span className="px-2.5 py-1 rounded-xl bg-yellow-500/20 border border-yellow-500/60 text-yellow-300 font-bold flex items-center gap-1.5 animate-pulse">
                <span>🌋</span>
                <span>ĐỊA CHẤN CUỒNG NỘ</span>
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            {reverseEffect ? 'Gõ từ phải sang trái ◀' : capslockEffect ? 'Giữ Shift hoặc bật CapsLock 🔠' : screenShake ? 'Gõ sai bị phạt -1s ⚡' : 'Sương mù che ký tự 💨'}
          </div>
        </div>
      )}

      {/* Floating combat numbers canvas overlay */}
      <div className="relative h-8 flex justify-center items-center pointer-events-none">
        {floatingDamages.map((dmg) => (
          <span
            key={dmg.id}
            className={`absolute font-black text-xl animate-boss-damage-float ${
              dmg.isCrit
                ? 'text-yellow-300 text-2xl drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                : 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]'
            }`}
          >
            {dmg.text}
          </span>
        ))}
      </div>

      {/* Anti-cheat warning */}
      {cheatWarning && (
        <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/60 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 animate-bounce">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{cheatWarning}</span>
        </div>
      )}

      {/* 5. VIRTUAL TYPING ARENA (MONKEYTYPE SMOOTHNESS) */}
      <div className={`p-6 sm:p-7 rounded-3xl bg-slate-900/95 border shadow-2xl relative transition-all duration-300 ${
        reverseEffect ? 'border-purple-500/90 animate-boss-reverse bg-purple-950/25 shadow-[0_0_35px_rgba(168,85,247,0.35)]' :
        capslockEffect ? 'border-amber-500/90 animate-boss-capslock bg-amber-950/25 shadow-[0_0_35px_rgba(245,158,11,0.35)]' :
        smokeEffect ? 'border-slate-600/80 bg-slate-950/90 shadow-[0_0_30px_rgba(100,116,139,0.3)]' :
        screenShake ? 'border-yellow-500/80 bg-yellow-950/20 shadow-[0_0_30px_rgba(234,179,8,0.3)]' :
        'border-slate-800'
      }`}>
        {/* Word Display Area with smooth stream */}
        <div
          ref={wordContainerRef}
          onClick={() => {
            if (!isSurrendered) {
              inputRef.current?.focus();
              setIsFocused(true);
            }
          }}
          className="relative text-center min-h-[190px] sm:min-h-[210px] flex flex-col items-center justify-center py-6 px-4 my-1 rounded-2xl bg-slate-950/70 border border-slate-800/80 overflow-hidden cursor-text select-none"
        >
          {/* 3s Countdown Overlay for Multiplayer */}
          {inRoomCountdown !== null && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xs rounded-2xl select-none p-4">
              <div
                key={inRoomCountdown}
                className={`font-mono font-black text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.7)] animate-pulse leading-none select-none ${
                  inRoomCountdown === 0
                    ? 'text-3xl sm:text-5xl lg:text-6xl tracking-wider uppercase'
                    : 'text-6xl sm:text-7xl lg:text-8xl'
                }`}
              >
                {inRoomCountdown === 0 ? 'XUẤT PHÁT!' : inRoomCountdown}
              </div>
              <div className="mt-3 px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-300 font-mono text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2 shadow-sm whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span>{inRoomCountdown === 0 ? 'Tấn công Ma Tôn!' : 'Chuẩn bị xuất chiêu...'}</span>
              </div>
            </div>
          )}

          {/* Monkeytype Unfocused Overlay */}
          {!isFocused && inRoomCountdown === null && !isSurrendered && (
            <div
              onClick={() => {
                if (!isSurrendered) {
                  inputRef.current?.focus();
                  setIsFocused(true);
                }
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] z-40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200"
            >
              <MousePointerClick className="w-7 h-7 text-red-400 animate-bounce" />
              <span className="text-sm sm:text-base font-bold text-white tracking-wide">
                Nhấp chuột hoặc gõ phím bất kỳ để tập trung tung chiêu (Focus)
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Con trỏ đang tạm dừng • Nhấp để kích hoạt lại bàn phím
              </span>
            </div>
          )}

          {/* Smooth Monkeytype Caret */}
          {!isSurrendered && (
            <MonkeytypeCaret
              caretPos={caretPos}
              isTyping={isTyping}
              isFocused={isFocused}
              colorClass="bg-red-400"
              glowColor="rgba(248, 113, 113, 0.95)"
            />
          )}

          {/* Typing Stream: Previous Word | Current Focal Target | Next Upcoming Word */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 max-w-full">
            {/* Previous Word (ONLY shown when index > 0, NEVER on index 0) */}
            {currentWordIndex > 0 && (
              <span className="hidden sm:inline-block text-base sm:text-lg font-['JetBrains_Mono',monospace] text-slate-500/50 select-none line-through shrink-0 max-w-[130px] truncate">
                {words[currentWordIndex - 1]}
              </span>
            )}

            {/* Current Target Word */}
            <span
              data-boss-active-word="true"
              className="relative inline-flex items-center px-4 py-2 rounded-2xl bg-red-500/10 border border-red-500/30 text-3xl sm:text-4xl lg:text-5xl font-black font-['JetBrains_Mono',monospace] tracking-wider shadow-inner shrink-0"
            >
              {currentTargetWord.split('').map((char, charIdx) => {
                const typedChar = currentInput[charIdx];
                const isTyped = charIdx < currentInput.length;
                const isCurrentChar = charIdx === currentInput.length;
                const isObscuredBySmoke = smokeEffect && charIdx > currentInput.length;

                let charClass = 'text-slate-500';
                if (isTyped) {
                  charClass = typedChar === char
                    ? 'text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : 'text-rose-400 font-bold underline decoration-rose-500 decoration-2';
                } else if (isCurrentChar) {
                  charClass = smokeEffect
                    ? 'text-white font-black drop-shadow-[0_0_12px_rgba(255,255,255,0.95)] scale-110'
                    : 'text-white font-bold drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]';
                } else if (isObscuredBySmoke) {
                  charClass = 'text-slate-600/30 blur-[3.5px] select-none';
                }

                return (
                  <span
                    key={charIdx}
                    data-char-idx={charIdx}
                    className={`relative ${charClass} transition-colors duration-75`}
                  >
                    {char}
                  </span>
                );
              })}

              {/* Excess characters */}
              {currentInput.length > currentTargetWord.length && (
                <span
                  data-char-extra-last="true"
                  className="absolute left-full top-0 ml-1.5 text-rose-400 bg-rose-500/25 px-1.5 py-0.5 rounded-md text-2xl underline decoration-rose-500 font-bold z-10 whitespace-nowrap"
                >
                  {currentInput.slice(currentTargetWord.length)}
                </span>
              )}
            </span>

            {/* Next word inline preview */}
            {words[(currentWordIndex + 1) % words.length] && (
              <span className="hidden md:inline-block text-base sm:text-lg font-['JetBrains_Mono',monospace] text-slate-400/70 select-none shrink-0 max-w-[140px] truncate">
                {words[(currentWordIndex + 1) % words.length]}
              </span>
            )}
          </div>

          {/* Quick Context Guidance Shelf (Shows upcoming words cleanly without clipping) */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px] font-medium shrink-0">Chữ chuẩn bị:</span>
            <span className="font-mono font-bold text-amber-300 bg-slate-900 px-3 py-1 rounded-xl border border-amber-500/30 shadow-xs shrink-0 whitespace-nowrap">
              {words[(currentWordIndex + 1) % words.length]}
            </span>
            {words[(currentWordIndex + 2) % words.length] && (
              <span className="font-mono text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-xl border border-slate-800/80 hidden sm:inline-block shrink-0 whitespace-nowrap">
                {words[(currentWordIndex + 2) % words.length]}
              </span>
            )}
            {words[(currentWordIndex + 3) % words.length] && (
              <span className="font-mono text-slate-500 bg-slate-900/40 px-2.5 py-1 rounded-xl border border-slate-800/50 hidden md:inline-block shrink-0 whitespace-nowrap">
                {words[(currentWordIndex + 3) % words.length]}
              </span>
            )}
            {reverseEffect && (
              <span className="text-[11px] text-purple-300 font-bold ml-1 bg-purple-950/60 px-2.5 py-1 rounded-xl border border-purple-500/40 shrink-0 whitespace-nowrap">
                ◀ Gõ ngược: "{words[currentWordIndex]}"
              </span>
            )}
          </div>
        </div>

        {/* Input Box with Cultivation Artifact VFX Frame */}
        <div className="mt-4 flex flex-nowrap items-center gap-2 sm:gap-3">
          <div className="flex-1 min-w-0 flex items-center h-12">
            <ArtifactInputVfxFrame
              userFrame={players.find((p) => p.id === currentPlayerId)?.frame || getStoredFrame()}
              cultivationState={loadStoredCultivationState()}
              combo={combo}
              isTyping={isTyping}
              isError={currentInput.length > 0 && !(currentTargetWord || '').startsWith(currentInput)}
              lastKeystroke={lastKeystrokeTime}
              className="w-full h-12"
            >
              <input
                id="boss-typing-input"
                ref={inputRef}
                type="text"
                value={currentInput}
                onChange={handleInputChange}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onPaste={(e) => e.preventDefault()}
                disabled={timeLeft <= 0 || inRoomCountdown !== null || isSurrendered || isPlayerAFK}
                readOnly={isSurrendered || isPlayerAFK}
                placeholder={
                  isPlayerAFK
                    ? "Bạn đã bị tính là AFK do không thao tác bàn phím trong 30 giây."
                    : isSurrendered
                    ? "Bạn đã đầu hàng. Đang theo dõi trận săn boss..."
                    : inRoomCountdown !== null
                    ? `Trận chiến bắt đầu sau ${inRoomCountdown === 0 ? 'giây lát' : `${inRoomCountdown}s`}...`
                    : "Gõ từ trên và bấm Cách (Space) để xuất chiêu sát thương..."
                }
                className={`w-full h-12 px-4 rounded-xl bg-slate-950/90 border ${
                  isPlayerAFK
                    ? 'border-amber-500/40 text-amber-500/80 cursor-not-allowed'
                    : isSurrendered
                    ? 'border-rose-500/40 text-slate-500 cursor-not-allowed'
                    : 'border-slate-800 text-white'
                } font-['JetBrains_Mono',monospace] text-base sm:text-lg outline-none focus:ring-1 focus:ring-red-500 shadow-inner`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </ArtifactInputVfxFrame>
          </div>

          {/* Self-Destruct Action Button */}
          {!isSurrendered && (
            <button
              id="btn-boss-self-destruct"
              type="button"
              onClick={() => {
                soundFx.playBossHit();
                onSelfDestruct();
              }}
              className="h-12 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 transition-all hover:scale-102 active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
              title={`Hy sinh bản thân để gây ~${Math.round(boss.maxHp * 0.28).toLocaleString()} sát thương tự bạo lên Boss`}
            >
              <Bomb className="w-4 h-4 text-amber-300" />
              <span>TỰ BẠO</span>
            </button>
          )}

          {/* Surrender Button */}
          {!isSurrendered && onSurrender && (
            <button
              id="btn-boss-surrender"
              type="button"
              onClick={openSurrenderModal}
              className="h-12 px-3 sm:px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              title="Đầu hàng ván đấu này (Phím tắt: Esc)"
            >
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">Đầu Hàng</span>
              <kbd className="hidden md:inline-block text-[10px] font-mono px-1 py-0.5 rounded bg-rose-950/80 border border-rose-800/60 text-rose-300">Esc</kbd>
            </button>
          )}
        </div>
      </div>

      {/* Surrender / AFK Banner if active */}
      {(isSurrendered || isPlayerAFK) && (
        <div className={`p-4 rounded-2xl ${
          isPlayerAFK ? 'bg-amber-500/10 border border-amber-500/40 text-amber-300' : 'bg-rose-500/10 border border-rose-500/40'
        } text-center space-y-2 animate-fadeIn`}>
          <div className={`flex items-center justify-center gap-2 font-bold text-sm ${
            isPlayerAFK ? 'text-amber-300' : 'text-rose-300'
          }`}>
            {isPlayerAFK ? (
              <>
                <span className="text-lg">💤</span>
                <span>Bạn đã bị tính là AFK do không thao tác bàn phím trong 30 giây.</span>
              </>
            ) : (
              <>
                <Flag className="w-4 h-4 text-rose-400" />
                <span>Bạn đã đầu hàng ván săn boss này.</span>
              </>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Ô gõ đã bị khóa. Bạn vẫn có thể tiếp tục quan sát trận săn boss cho đến khi kết thúc, hoặc chuyển tiếp:
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            {onRestart && (
              <button
                id="btn-surrender-boss-restart"
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onRestart();
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isMultiplayer ? 'Đấu Lại (Về Phòng Chờ)' : 'Chơi Ván Mới'}</span>
              </button>
            )}
            {onHome && (
              <button
                id="btn-surrender-boss-home"
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onHome();
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Home className="w-4 h-4 text-sky-400" />
                <span>Trang Chủ</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6. RAID TEAM ROSTER (ĐỘI HÌNH SĂN BOSS) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs text-slate-200">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Đội Hình Săn Boss ({players.length} Đạo Hữu)</span>
          </span>
          <span className="text-[11px] text-slate-400">
            Tổng sát thương toàn đội: <strong className="text-red-400 font-mono font-bold">{(boss.maxHp - boss.hp).toLocaleString()} DMG</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {players.map((p) => {
            const isMe = p.id === currentPlayerId;
            const dmg = isMe ? totalDamageDealt : (p.score || 0);
            const isMvp = p.id === topPlayerId && dmg > 0;
            const playerDmgPercent = boss.maxHp > 0 ? Math.min(100, Math.round((dmg / boss.maxHp) * 100)) : 0;

            return (
              <div
                key={p.id}
                className={`p-3 rounded-2xl border flex flex-col justify-between gap-2 transition-all relative overflow-hidden ${
                  isMe
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                {isMvp && (
                  <div className="absolute top-1.5 right-2 flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-full border border-amber-500/40">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>MVP</span>
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  <div className="text-2xl shrink-0">
                    {p.icon || '🧙'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold truncate ${isMe ? 'text-amber-300' : 'text-slate-200'}`}>
                        {p.username}
                      </span>
                      {p.isBot && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                          BOT
                        </span>
                      )}
                      {isMe && (
                        <span className="text-[10px] text-amber-400/90 font-bold shrink-0">(Bạn)</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>
                        {p.isAFK ? (
                          <span className="text-amber-400 font-bold">AFK</span>
                        ) : p.isSurrendered ? (
                          <span className="text-rose-400">Đã tự bạo</span>
                        ) : (
                          <span className="text-emerald-400">Đang tấn công</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contribution bar */}
                <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400 text-[10px]">Đóng góp:</span>
                    <span className="font-bold text-red-400 tabular-nums">
                      {dmg.toLocaleString()} <span className="text-[9px] text-slate-500 font-normal">DMG ({playerDmgPercent}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isMe ? 'bg-amber-400' : 'bg-red-500'
                      }`}
                      style={{ width: `${playerDmgPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. COMBAT CHRONICLE / LOGS ACCORDION */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setIsLogExpanded((prev) => !prev)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-850 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              Nhật Ký Chiến Đấu
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              ({combatLogs.length} diễn biến mới nhất)
            </span>
          </div>
          <div className="text-slate-400 flex items-center gap-1 text-[11px]">
            <span>{isLogExpanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
            {isLogExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {isLogExpanded && (
          <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-slate-800/60 font-mono text-[11px] max-h-40 overflow-y-auto">
            {combatLogs.map((log, i) => (
              <div key={i} className="text-slate-300 flex items-start gap-1.5 leading-relaxed">
                <span className="text-slate-600 shrink-0">›</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 8. SURRENDER CONFIRMATION MODAL */}
      {showSurrenderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-rose-500/50 p-6 text-center space-y-4 shadow-2xl shadow-rose-950/50">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 text-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Xác Nhận Đầu Hàng?</h3>
              <p className="text-xs text-slate-400 mt-1">
                {isMultiplayer
                  ? 'Bạn sẽ dừng trận săn boss ngay và có thể trở lại phòng chờ để chuẩn bị cho ván kế tiếp.'
                  : 'Bạn sẽ dừng trận săn boss ngay lập tức.'}
              </p>
              <div className="mt-3 text-[11px] text-amber-400/90 font-mono bg-amber-500/10 border border-amber-500/20 rounded-xl py-1.5 px-2 inline-block">
                Nhấn <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Enter</span> để xác nhận &bull; <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Esc</span> để hủy
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                id="btn-cancel-boss-surrender"
                type="button"
                onClick={cancelSurrender}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Hủy (Esc)
              </button>
              <button
                id="btn-confirm-boss-surrender"
                type="button"
                onClick={confirmSurrender}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 cursor-pointer transition-colors"
              >
                Đầu Hàng (Enter)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

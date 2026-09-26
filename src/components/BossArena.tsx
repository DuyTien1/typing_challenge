import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player, BossState, KeystrokeEvent, PerformanceChartPoint, BossBattleStats } from '../types';
import { soundFx } from '../utils/audio';
import { calculateBossDamageServer } from '../utils/antiCheat';
import { normalizeChartTimeline } from '../utils/chartHelper';
import { MonkeytypeCaret } from './MonkeytypeCaret';
import { loadStoredCultivationState } from '../utils/cultivation';
import { getStoredFrame } from '../utils/frames';
import { ArtifactInputVfxFrame } from './vfx/ArtifactInputVfxFrame';
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
  Flag
} from 'lucide-react';

interface BossArenaProps {
  words: string[];
  boss: BossState;
  players: Player[];
  currentPlayerId: string;
  onDealDamage: (damage: number, errors: number, playerId?: string) => void;
  onSelfDestruct: () => void;
  onFinish: (isVictory: boolean, totalDamage: number, errors: number, chartData?: PerformanceChartPoint[], stats?: BossBattleStats) => void;
  onSurrender?: () => void;
  onRestart: () => void;
  onHome?: () => void;
  isMultiplayer?: boolean;
}

const SKILL_DETAILS: Record<
  'shield' | 'shake' | 'smoke' | 'reverse' | 'capslock',
  { name: string; icon: string; border: string; bg: string; text: string; desc: string }
> = {
  shield: {
    name: 'KHIÊN HẮC GIÁP',
    icon: '🛡️',
    border: 'border-sky-500/80',
    bg: 'bg-sky-500/20',
    text: 'text-sky-300',
    desc: 'Boss tạo ma giáp cực dày! Mau dồn sát thương phá giáp trước khi Boss hồi máu!',
  },
  shake: {
    name: 'RUNG LẮC ĐỊA CHẤN',
    icon: '⚡',
    border: 'border-yellow-500/80',
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-300',
    desc: 'Mặt đất rung chuyển dữ dội! Gõ sai ký tự trong cơn địa chấn sẽ bị phạt trừ 1s!',
  },
  smoke: {
    name: 'MÀN KHÓI MÙ HẮC ÁM',
    icon: '💨',
    border: 'border-slate-500/80',
    bg: 'bg-slate-700/30',
    text: 'text-slate-300',
    desc: 'Sương độc bao phủ che mờ ký tự! Mỗi chữ cái chỉ hé lộ khi bạn gõ tới!',
  },
  reverse: {
    name: 'ĐẢO NGƯỢC KÝ TỰ',
    icon: '🔄',
    border: 'border-purple-500/80',
    bg: 'bg-purple-500/20',
    text: 'text-purple-300',
    desc: 'Không gian nghịch chuyển! Bắt buộc phải gõ ngược từ phải sang trái!',
  },
  capslock: {
    name: 'LỜI NGUYỀN IN HOA',
    icon: '🔠',
    border: 'border-amber-500/80',
    bg: 'bg-amber-500/20',
    text: 'text-amber-300',
    desc: 'Thần uy áp chế! Bắt buộc bật phím CAPSLOCK hoặc giữ Shift để gõ HOA!',
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
  onRestart,
  onHome,
  isMultiplayer = false,
}) => {
  const [boss, setBoss] = useState<BossState>(initialBoss);
  const [inRoomCountdown, setInRoomCountdown] = useState<number | null>(() => {
    return isMultiplayer ? 3 : null;
  });

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
  const [floatingDamages, setFloatingDamages] = useState<{ id: number; text: string; isCrit: boolean }[]>([]);
  const [combatLogs, setCombatLogs] = useState<string[]>([
    '⚔️ Trận chiến bắt đầu! Hắc Long Ma Vương giáng thế!'
  ]);
  const [screenShake, setScreenShake] = useState(false);
  const [smokeEffect, setSmokeEffect] = useState(false);
  const [reverseEffect, setReverseEffect] = useState(false);
  const [capslockEffect, setCapslockEffect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(initialBoss.duration || 150);
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);
  const [isSurrendered, setIsSurrendered] = useState(false);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const showSurrenderModalRef = useRef(false);

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

      // 2. Modal is NOT open: Esc to trigger surrender modal
      if (e.key === 'Escape') {
        if (!isSurrendered && onSurrender && timeLeft > 0 && !isFinishedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          openSurrenderModal();
          return;
        }
      }

      // 3. Auto focus input
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
  }, [isSurrendered, timeLeft, onSurrender, openSurrenderModal, confirmSurrender, cancelSurrender, showSurrenderModal]);

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

  // Boss Skill cyclical loop - Enhanced and Robust
  useEffect(() => {
    if (inRoomCountdown !== null) return;
    const intervalSec = Math.max(4, boss.skillInterval || 9);
    const intervalMs = intervalSec * 1000;

    const skillInterval = setInterval(() => {
      if (isFinishedRef.current || bossHpRef.current <= 0) return;
      const currentBoss = bossRef.current;
      // If boss is currently stunned or has an active shield, wait for next cycle
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

      // Weighted random selection
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
          const hpPerP = currentBoss.shieldHpPerPlayer || 120;
          const shieldValue = Math.max(80, Math.round(players.length * hpPerP));
          setBoss((prev) => ({
            ...prev,
            shield: shieldValue,
            maxShield: shieldValue,
            isShieldActive: true,
          }));
          setCombatLogs((prev) => [
            `🛡️ Boss kích hoạt KHIÊN HẮC GIÁP (${shieldValue} HP)! Mau dồn sát thương phá giáp trong ${currentBoss.shieldDuration}s!`,
            ...prev.slice(0, 5),
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
              setCombo(0); // Shockwave knocks combo
              setCombatLogs((l) => [
                `⚠️ Không phá kịp Khiên Hắc Giáp! Boss hấp thụ ma lực hồi ${healedAmount} HP và chấn nát Combo của bạn!`,
                ...l.slice(0, 5),
              ]);
            }
          }, (currentBoss.shieldDuration || 5.5) * 1000);
          skillTimeoutsRef.current.push(shieldTimeout);
        } else if (selected === 'shake') {
          soundFx.playBossSkillRoar();
          setScreenShake(true);
          setCombatLogs((prev) => [
            '🌋 Boss giậm đất kích hoạt ĐỊA CHẤN CUỒNG NỘ! Mặt đất rung chuyển dữ dội, gõ sai sẽ bị trừ 1s!',
            ...prev.slice(0, 5),
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
            ...prev.slice(0, 5),
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
            ...prev.slice(0, 5),
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
            ...prev.slice(0, 5),
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

  // Stable bot key so player score changes don't re-trigger or tear down intervals
  const botKey = players
    .filter((p) => p.isBot)
    .map((p) => `${p.id}:${p.botTargetWpm}`)
    .join('|');

  // Bot Attack Simulation in Boss Arena
  useEffect(() => {
    if (inRoomCountdown !== null) return;
    const botPlayers = players.filter((p) => p.isBot && !p.isSurrendered);
    if (botPlayers.length === 0) return;

    const botIntervals: NodeJS.Timeout[] = [];

    botPlayers.forEach((bot) => {
      const targetWpm = bot.botTargetWpm || 65;
      // Realistic attack interval based on typing speed:
      // At 60 WPM, 1 word per sec. Attack every 1.2s to 2.2s
      const attackIntervalMs = Math.max(1200, Math.min(2600, Math.round((60 / targetWpm) * 1700)));

      const timer = setInterval(() => {
        if (isFinishedRef.current) return;

        // Base damage scaled with bot WPM + small variance
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
            ...l.slice(0, 5),
          ]);
          setTimeout(() => {
            setBoss((b) => ({ ...b, isStunned: false }));
          }, boss.stunDuration * 1000);
        }

        // Floating damage animation for bot
        const dmgId = Date.now() + Math.random();
        setFloatingDamages((f) => [
          ...f,
          { id: dmgId, text: `-${baseDmg} (${bot.username})`, isCrit },
        ]);
        setTimeout(() => {
          setFloatingDamages((f) => f.filter((d) => d.id !== dmgId));
        }, 900);

        // Add to combat logs occasionally
        setCombatLogs((l) => [
          `⚔️ [${bot.username}] tấn công gây ${actualDmg} DMG!`,
          ...l.slice(0, 5),
        ]);

        // Award damage to bot
        onDealDamage(baseDmg, 0, bot.id);
      }, attackIntervalMs);

      botIntervals.push(timer);
    });

    return () => {
      botIntervals.forEach((t) => clearInterval(t));
    };
  }, [inRoomCountdown, botKey, boss.stunDuration, onDealDamage]);

  // Giải pháp 4: Thẩm định sát thương Boss Server-Side
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
      let dmg = damageResult.damage;
      const isCrit = damageResult.isCrit;
      const nextCombo = damageResult.nextCombo;

      // Track capability metrics
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
            isStunned = true; // Stunned!
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
          ...l.slice(0, 5),
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
          ...l.slice(0, 5),
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
    onFinish,
    onDealDamage,
  ]);

  // Composition API Listeners (Giải pháp 1: Vietnamese IME)
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
    if (timeLeft <= 0 || inRoomCountdown !== null || isSurrendered) return;
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

  let currentTargetWord = words[currentWordIndex] || '';
  if (reverseEffect) {
    currentTargetWord = currentTargetWord.split('').reverse().join('');
  }
  if (capslockEffect) {
    currentTargetWord = currentTargetWord.toUpperCase();
  }

  // Cập nhật vị trí con trỏ Monkeytype cho Boss Arena
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

  return (
    <div
      className={`w-full max-w-5xl mx-auto space-y-5 select-none transition-all duration-200 relative ${
        screenShake ? 'animate-boss-earthquake ring-4 ring-yellow-500/50 rounded-3xl shadow-[0_0_50px_rgba(234,179,8,0.4)]' : ''
      }`}
      onClick={() => {
        if (!isSurrendered) inputRef.current?.focus();
      }}
    >
      {/* Epic Boss Bar & Status */}
      <div className={`p-5 rounded-2xl bg-gradient-to-b from-red-950/60 via-slate-900 to-slate-950 border ${
        boss.isShieldActive
          ? 'border-sky-400 animate-boss-shield shadow-[0_0_30px_rgba(56,189,248,0.4)]'
          : 'border-red-500/30'
      } shadow-2xl relative overflow-hidden transition-all duration-300`}>
        {/* Boss Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-2xl bg-red-900/40 border-2 border-red-500/60 flex items-center justify-center text-4xl shadow-lg shadow-red-500/30 animate-pulse">
              🐉
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-wide">
                  {boss.name}
                </h3>
                {boss.isStunned && (
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-black text-[10px] font-black uppercase animate-bounce">
                    CHOÁNG (x1.5 DMG)
                  </span>
                )}
                {boss.isShieldActive && (
                  <span className="px-2 py-0.5 rounded bg-sky-500 text-black text-[10px] font-black uppercase flex items-center gap-1 animate-pulse">
                    <ShieldCheck className="w-3 h-3" /> KHIÊN HẮC GIÁP
                  </span>
                )}
              </div>
              <p className="text-xs text-red-300/80">
                Thủ lĩnh Rồng Ma Quỷ Vực • Server-Authoritative Raid Combat
              </p>
            </div>
          </div>

          {/* Time Left & Damage */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center gap-1.5 font-mono text-xs text-slate-300">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">Sát thương của bạn</div>
              <div className="text-lg font-black text-amber-400 font-mono">
                {totalDamageDealt} DMG
              </div>
            </div>
          </div>
        </div>

        {/* Boss HP Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-red-300">
            <span>MÁU BOSS (HP)</span>
            <span className="font-mono">
              {boss.hp} / {boss.maxHp} ({hpPercent}%)
            </span>
          </div>
          <div className="h-6 w-full bg-slate-950 rounded-xl border border-red-900/60 p-0.5 overflow-hidden relative shadow-inner">
            <div
              className="h-full rounded-lg bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-300 shadow-md"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Boss Shield Bar (if active) */}
        {boss.isShieldActive && (
          <div className="mt-3 space-y-1.5 animate-fadeIn">
            <div className="flex justify-between text-xs font-bold text-sky-300">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                GIÁP PHÒNG HỘ (KHIÊN HẮC GIÁP)
              </span>
              <span className="font-mono">
                {boss.shield} / {boss.maxShield}
              </span>
            </div>
            <div className="h-3 w-full bg-slate-950 rounded-lg border border-sky-900/60 p-0.5 overflow-hidden">
              <div
                className="h-full rounded-md bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-200"
                style={{ width: `${shieldPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Skill Warning Alert */}
        {boss.skillWarning && (
          <div className={`mt-3 p-3 rounded-xl border ${
            SKILL_DETAILS[boss.skillWarning.skill as keyof typeof SKILL_DETAILS]?.border || 'border-amber-500/80'
          } ${
            SKILL_DETAILS[boss.skillWarning.skill as keyof typeof SKILL_DETAILS]?.bg || 'bg-amber-500/20'
          } flex items-center justify-between gap-3 shadow-lg animate-pulse transition-all`}>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl animate-bounce">
                {SKILL_DETAILS[boss.skillWarning.skill as keyof typeof SKILL_DETAILS]?.icon || '⚠️'}
              </span>
              <div>
                <div className={`text-xs sm:text-sm font-black tracking-wide ${
                  SKILL_DETAILS[boss.skillWarning.skill as keyof typeof SKILL_DETAILS]?.text || 'text-amber-300'
                }`}>
                  CẢNH BÁO: BOSS SẮP TUNG CHIÊU [{SKILL_DETAILS[boss.skillWarning.skill as keyof typeof SKILL_DETAILS]?.name || boss.skillWarning.skill.toUpperCase()}]!
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {SKILL_DETAILS[boss.skillWarning.skill as keyof typeof SKILL_DETAILS]?.desc}
                </div>
              </div>
            </div>
            <div className="shrink-0 px-3 py-1 rounded-lg bg-black/60 border border-white/20 font-mono font-black text-sm sm:text-base text-amber-300 shadow-inner">
              {boss.skillWarning.countdown}s
            </div>
          </div>
        )}
      </div>

      {/* Floating combat numbers */}
      <div className="relative h-6 flex justify-center items-center pointer-events-none">
        {floatingDamages.map((dmg) => (
          <span
            key={dmg.id}
            className={`absolute font-black text-xl animate-floatUp ${
              dmg.isCrit ? 'text-amber-300 text-2xl drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'text-rose-400'
            }`}
          >
            {dmg.text}
          </span>
        ))}
      </div>

      {/* Anti-cheat warning */}
      {cheatWarning && (
        <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/60 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 animate-bounce">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{cheatWarning}</span>
        </div>
      )}

      {/* Word Box & Input Area */}
      <div className={`p-6 rounded-2xl bg-[#141824] border shadow-2xl relative transition-all duration-300 ${
        reverseEffect ? 'border-purple-500/90 animate-boss-reverse bg-purple-950/25 shadow-[0_0_35px_rgba(168,85,247,0.35)]' :
        capslockEffect ? 'border-amber-500/90 animate-boss-capslock bg-amber-950/25 shadow-[0_0_35px_rgba(245,158,11,0.35)]' :
        smokeEffect ? 'border-slate-600/80 bg-slate-950/90 shadow-[0_0_30px_rgba(100,116,139,0.3)]' :
        screenShake ? 'border-yellow-500/80 bg-yellow-950/20 shadow-[0_0_30px_rgba(234,179,8,0.3)]' :
        'border-slate-800'
      }`}>
        {/* Active Debuff Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {reverseEffect && (
            <span className="px-2.5 py-1 rounded-lg bg-purple-500/25 border border-purple-500/70 text-purple-200 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <span>🔄</span>
              <span>ĐẢO CHIỀU KÝ TỰ</span>
            </span>
          )}
          {capslockEffect && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/25 border border-amber-500/70 text-amber-200 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <span>🔠</span>
              <span>LỜI NGUYỀN IN HOA</span>
            </span>
          )}
          {smokeEffect && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-700/50 border border-slate-500/70 text-slate-200 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <span>💨</span>
              <span>MÀN KHÓI MÙ</span>
            </span>
          )}
          {screenShake && (
            <span className="px-2.5 py-1 rounded-lg bg-yellow-500/25 border border-yellow-500/70 text-yellow-200 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <span>⚡</span>
              <span>ĐỊA CHẤN CUỒNG NỘ</span>
            </span>
          )}
          {boss.isShieldActive && (
            <span className="px-2.5 py-1 rounded-lg bg-sky-500/25 border border-sky-500/70 text-sky-200 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <span>🛡️</span>
              <span>KHIÊN HẮC GIÁP</span>
            </span>
          )}
          <span className="text-xs text-slate-400 ml-auto font-mono">
            Combo: <b className="text-yellow-400">{combo}x</b>
          </span>
        </div>

        {/* Informative banners for active skill effects */}
        {reverseEffect && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-purple-950/60 border border-purple-500/50 text-purple-300 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 font-mono">
            <span className="flex items-center gap-1.5">
              <span>◀</span>
              <span>Hãy gõ ngược từ phải sang trái:</span>
              <span className="text-white font-black bg-purple-800/60 px-1.5 py-0.5 rounded border border-purple-400/40">
                {currentTargetWord}
              </span>
            </span>
            <span className="text-purple-400/80 text-[11px] hidden sm:inline">
              (Từ gốc: "{words[currentWordIndex]}")
            </span>
          </div>
        )}
        {capslockEffect && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-300 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 font-mono animate-bounce">
            <span className="flex items-center gap-1.5">
              <span>⚠️</span>
              <span>BẬT PHÍM CAPSLOCK HOẶC GIỮ PHÍM SHIFT ĐỂ GÕ TOÀN BỘ CHỮ HOA!</span>
            </span>
            <span className="text-black bg-amber-400 px-2 py-0.5 rounded text-[11px] font-black uppercase">
              CAPSLOCK ON
            </span>
          </div>
        )}
        {screenShake && (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-yellow-950/60 border border-yellow-500/50 text-yellow-300 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 font-mono">
            <span className="flex items-center gap-1.5">
              <span>🌋</span>
              <span>Mặt đất rung chuyển dữ dội! Gõ sai sẽ bị phạt trừ 1 giây thời gian!</span>
            </span>
            <span className="text-yellow-400 text-[11px] font-mono">
              -1s KHI SAI
            </span>
          </div>
        )}
        {smokeEffect && (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-600/70 text-slate-300 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 font-mono">
            <span className="flex items-center gap-1.5">
              <span>💨</span>
              <span>Màn khói mù hắc ám! Các ký tự phía sau bị che mờ, chỉ hé lộ chữ cái hiện tại!</span>
            </span>
            <span className="text-slate-400 text-[11px] font-mono">
              SƯƠNG KHÓI
            </span>
          </div>
        )}

        {/* Word Preview Stream with Monkeytype Character-by-Character Focus */}
        <div 
          ref={wordContainerRef}
          onClick={() => {
            if (!isSurrendered) {
              inputRef.current?.focus();
              setIsFocused(true);
            }
          }}
          className="relative text-center py-6 px-4 my-2 rounded-xl bg-slate-950/60 border border-slate-800/80 overflow-hidden cursor-text select-none"
        >
          {/* Multiplayer In-Room 3s Countdown Overlay */}
          {inRoomCountdown !== null && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-[2px] rounded-xl select-none">
              <div
                key={inRoomCountdown}
                className="text-7xl sm:text-8xl font-black text-amber-400 font-mono drop-shadow-[0_0_30px_rgba(251,191,36,0.7)] animate-pulse"
              >
                {inRoomCountdown === 0 ? 'XUẤT PHÁT!' : inRoomCountdown}
              </div>
              <div className="mt-3 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-300 font-mono text-xs tracking-wider uppercase">
                {inRoomCountdown === 0 ? 'Tấn công Boss!' : 'Chuẩn bị xuất chiêu...'}
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
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] z-40 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
            >
              <MousePointerClick className="w-6 h-6 text-red-400 animate-bounce" />
              <span className="text-sm font-bold text-white tracking-wide">
                Nhấp chuột hoặc gõ phím để tập trung tung chiêu (Focus)
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Con trỏ Monkeytype đang tạm dừng
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
              glowColor="rgba(248, 113, 113, 0.9)"
            />
          )}

          <div className="flex items-center justify-center gap-4 sm:gap-6 overflow-hidden">
            {/* Previous word preview (dimmed) */}
            <span className="hidden sm:inline-block text-base sm:text-lg font-['JetBrains_Mono',monospace] text-slate-600 opacity-40 select-none">
              {words[(currentWordIndex - 1 + words.length) % words.length]}
            </span>

            {/* Current Active Target Word */}
            <span
              data-boss-active-word="true"
              className="relative inline-flex items-center px-3 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-3xl sm:text-4xl font-black font-['JetBrains_Mono',monospace] tracking-wider"
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
                    : 'text-white font-bold drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]';
                } else if (isObscuredBySmoke) {
                  charClass = 'text-slate-600/30 blur-[3px] select-none';
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

              {/* Excess characters - absolute to avoid shifting word characters */}
              {currentInput.length > currentTargetWord.length && (
                <span
                  data-char-extra-last="true"
                  className="absolute left-full top-0 ml-1 text-rose-400 bg-rose-500/25 px-1 rounded text-2xl underline decoration-rose-500 font-bold z-10 whitespace-nowrap"
                >
                  {currentInput.slice(currentTargetWord.length)}
                </span>
              )}
            </span>

            {/* Next word preview */}
            <span className="hidden sm:inline-block text-base sm:text-lg font-['JetBrains_Mono',monospace] text-slate-500 opacity-60 select-none">
              {words[(currentWordIndex + 1) % words.length]}
            </span>
          </div>

          <div className="mt-3 text-xs text-slate-400 font-medium">
            Từ tiếp theo: <span className="text-slate-300 font-mono font-bold">{words[(currentWordIndex + 1) % words.length]}</span>
          </div>
        </div>

        {/* Input with Composition API & Canvas VFX Engine */}
        <div className="mt-4 flex items-center gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <ArtifactInputVfxFrame
              userFrame={players.find((p) => p.id === currentPlayerId)?.frame || getStoredFrame()}
              cultivationState={loadStoredCultivationState()}
              combo={combo}
              isTyping={isTyping}
              isError={currentInput.length > 0 && !(words[currentWordIndex] || '').startsWith(currentInput)}
              lastKeystroke={lastKeystrokeTime}
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
                disabled={timeLeft <= 0 || inRoomCountdown !== null || isSurrendered}
                readOnly={isSurrendered}
                placeholder={
                  isSurrendered
                    ? "Bạn đã đầu hàng. Đang theo dõi trận săn boss..."
                    : inRoomCountdown !== null
                    ? `Trận chiến bắt đầu sau ${inRoomCountdown === 0 ? 'giây lát' : `${inRoomCountdown}s`}...`
                    : "Gõ từ trên và bấm Cách (Space) để xuất chiêu..."
                }
                className={`w-full h-12 px-4 rounded-xl bg-slate-950/90 border ${
                  isSurrendered
                    ? 'border-rose-500/40 text-slate-500 cursor-not-allowed'
                    : 'border-slate-800 text-white'
                } font-['JetBrains_Mono',monospace] text-base sm:text-lg outline-none focus:ring-1 focus:ring-red-500 shadow-inner`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </ArtifactInputVfxFrame>
          </div>

          {/* Self-destruct button */}
          {!isSurrendered && (
            <button
              id="btn-boss-self-destruct"
              type="button"
              onClick={() => {
                soundFx.playBossHit();
                onSelfDestruct();
              }}
              className="h-12 px-3 sm:px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
              title="Lao vào Boss tự bạo gây sát thương khổng lồ"
            >
              <Bomb className="w-4 h-4" />
              <span>TỰ BẠO</span>
            </button>
          )}

          {/* Surrender button */}
          {!isSurrendered && onSurrender && (
            <button
              id="btn-boss-surrender"
              type="button"
              onClick={openSurrenderModal}
              className="h-12 px-3 sm:px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              title="Đầu hàng ván đấu này (Esc + Enter)"
            >
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">Đầu Hàng</span>
            </button>
          )}
        </div>
      </div>

      {/* Surrender Banner */}
      {isSurrendered && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-center space-y-2 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-center gap-2 text-rose-300 font-bold text-sm">
            <Flag className="w-4 h-4 text-rose-400" />
            <span>Bạn đã đầu hàng ván săn boss này.</span>
          </div>
          <p className="text-xs text-slate-400">
            Ô gõ đã bị khóa. Bạn vẫn có thể tiếp tục xem trận săn boss cho đến khi kết thúc, hoặc bấm nút bên dưới để chuyển tiếp:
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

      {/* Raid Team Scoreboard / Damage Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Đội Hình Săn Boss ({players.length} dũng sĩ)
          </span>
          <span className="text-[11px] text-slate-500">
            Tổng sát thương đã gây: <strong className="text-red-400 font-mono">{boss.maxHp - boss.hp} DMG</strong>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {players.map((p) => {
            const isMe = p.id === currentPlayerId;
            const dmg = isMe ? totalDamageDealt : (p.score || 0);
            return (
              <div
                key={p.id}
                className={`p-3 rounded-xl border flex flex-col justify-between gap-1.5 transition-all ${
                  isMe
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/30'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base">{p.icon}</span>
                    <span className="text-xs font-semibold text-white truncate flex items-center gap-1">
                      {p.username}
                      {p.isBot && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          BOT
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400">
                    {p.isSurrendered ? 'Đã tự bạo' : isMe ? 'Bạn' : p.isBot ? `${p.botTargetWpm || 60} WPM` : 'Đồng đội'}
                  </span>
                  <span className="font-mono text-xs font-black text-rose-400">
                    {dmg} <span className="text-[10px] text-slate-400 font-normal">DMG</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Combat Log Drawer */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono space-y-1">
        <div className="text-slate-500 font-sans font-bold uppercase text-[10px]">Nhật Ký Chiến Đấu</div>
        {combatLogs.map((log, i) => (
          <div key={i} className="text-slate-400">
            {log}
          </div>
        ))}
      </div>

      {/* Surrender Confirmation Modal with Esc & Enter Support */}
      {showSurrenderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-rose-500/50 p-6 text-center space-y-4 shadow-2xl shadow-rose-950/50">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Xác Nhận Đầu Hàng?</h3>
              <p className="text-xs text-slate-400 mt-1">
                {isMultiplayer
                  ? 'Bạn sẽ dừng trận săn boss ngay và có thể trở lại phòng chờ để chuẩn bị cho ván kế tiếp.'
                  : 'Bạn sẽ dừng trận săn boss ngay lập tức.'}
              </p>
              <div className="mt-2 text-[11px] text-amber-400/90 font-mono bg-amber-500/10 border border-amber-500/20 rounded-lg py-1 px-2 inline-block">
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

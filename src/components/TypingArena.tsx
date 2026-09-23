import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Player, KeystrokeEvent, PerformanceChartPoint } from '../types';
import { soundFx } from '../utils/audio';
import { calculateConsistency, validateWordSubmission } from '../utils/antiCheat';
import { normalizeChartTimeline } from '../utils/chartHelper';
import { MonkeytypeCaret } from './MonkeytypeCaret';
import { GhostCaret } from './GhostCaret';
import { CustomNumberInput } from './CustomNumberInput';
import {
  OutplayPaceMode,
  OutplaySubMode,
  GhostPoint,
  saveGhostRun,
  getStoredGhostRecord,
  calculateGhostCharIndex,
  mapLinearCharToWord,
} from '../utils/outplayGhost';
import { generateOutplayWords } from '../data/wordBanks';
import { 
  RotateCcw, 
  Flag, 
  Flame, 
  Clock, 
  Zap, 
  Gauge, 
  Activity, 
  Sparkles,
  AlertTriangle,
  MousePointerClick,
  Trophy,
  Home,
  Ghost,
  ChevronDown,
  Target,
  FileText,
  Keyboard,
  CheckCircle2,
  Eye,
} from 'lucide-react';

interface TypingArenaProps {
  words: string[];
  duration: number; // in seconds
  players: Player[];
  currentPlayerId: string;
  onUpdateProgress: (progress: number, correctChars: number, errors: number, wpm: number) => void;
  onFinish: (
    correctChars: number,
    errors: number,
    keystrokes: KeystrokeEvent[],
    consistency?: number,
    extraStats?: {
      lastWpm?: number;
      sessionBestWpm?: number;
      ghostDiff?: {
        ghostWpm: number;
        wpmDiff: number;
        leadChars: number;
        paceLabel: string;
      };
      finalWpm?: number;
      elapsedSeconds?: number;
      chartData?: PerformanceChartPoint[];
      wordResults?: {
        word: string;
        typed: string;
        isCorrect: boolean;
      }[];
      promptWords?: string[];
    }
  ) => void;
  onSurrender: () => void;
  onRestart: () => void;
  onHome?: () => void;
  modeName: string;
  isOutplay?: boolean;
  isMultiplayer?: boolean;
  lastGameWpm?: number;
  sessionBestWpm?: number;
  conditionStats?: Record<string, { lastWpm: number; bestWpm: number }>;
  onUpdateSessionStats?: (lastWpm: number, sessionBestWpm: number) => void;
  onUpdateConditionStats?: (conditionKey: string, lastWpm: number, bestWpm: number) => void;
  savedPaceMode?: OutplayPaceMode;
  onPaceModeChange?: (newPace: OutplayPaceMode) => void;
  savedCustomWpm?: number;
  onCustomWpmChange?: (newWpm: number) => void;
}

const VOCAB_OPTIONS: { id: OutplaySubMode; label: string; flag: string }[] = [
  { id: 'vi_dau', label: 'Tiếng Việt có dấu', flag: '🇻🇳' },
  { id: 'vi_nodau', label: 'Tiếng Việt không dấu', flag: '🇻🇳' },
  { id: 'en', label: 'Tiếng Anh', flag: '🇬🇧' },
  { id: 'numpad_number', label: 'Numpad (Số)', flag: '🔢' },
  { id: 'numpad_fullsize', label: 'Numpad (Phép tính)', flag: '⌨️' },
];

const GHOST_OPTIONS: { id: OutplayPaceMode; label: string }[] = [
  { id: 'last', label: 'Ghost: Ván trước' },
  { id: 'pb', label: 'Ghost: Kỷ lục PB' },
  { id: 'custom', label: 'Ghost: Tùy chỉnh' },
  { id: 'off', label: 'Tắt Ghost' },
];

interface WordItemProps {
  word: string;
  absIdx: number;
  status: 'pending' | 'correct' | 'incorrect';
  isCurrent: boolean;
  isPast: boolean;
  currentInput: string;
  pastTypedWord?: string;
}

const WordItem = React.memo<WordItemProps>(
  ({
    word,
    absIdx,
    status,
    isCurrent,
    isPast,
    currentInput,
    pastTypedWord,
  }) => {
    return (
      <div
        data-word-idx={absIdx}
        className={`relative h-[48px] flex items-center whitespace-nowrap select-none ${
          isCurrent ? 'z-10' : ''
        }`}
      >
        {word.split('').map((char, charIdx) => {
          let color = 'var(--theme-sub, #64748b)';
          let fontWeight = '400';
          let textDecoration = 'none';
          let opacity = '1';
          let textShadow = 'none';

          if (isPast) {
            if (status === 'correct') {
              color = 'var(--theme-sub, #64748b)';
              opacity = '0.55';
            } else {
              color = 'var(--theme-error, #ef4444)';
              opacity = '0.75';
              textDecoration = 'line-through';
            }
          } else if (isCurrent) {
            const typedChar = currentInput[charIdx];
            const isTyped = charIdx < currentInput.length;
            if (isTyped) {
              if (typedChar === char) {
                color = 'var(--theme-text, #f8fafc)';
                fontWeight = '700';
                textShadow = '0 0 4px var(--theme-main, rgba(251,191,36,0.6))';
              } else {
                color = 'var(--theme-error, #ef4444)';
                fontWeight = '700';
                textDecoration = 'underline';
              }
            } else if (charIdx === currentInput.length) {
              color = 'var(--theme-main, #fbbf24)';
              fontWeight = '600';
            } else {
              color = 'var(--theme-sub, #64748b)';
            }
          }

          return (
            <span
              key={charIdx}
              data-char-idx={charIdx}
              style={{
                color,
                fontWeight,
                textDecoration,
                opacity,
                textShadow,
              }}
              className="relative tracking-wide transition-colors duration-75"
            >
              {char}
            </span>
          );
        })}

        {/* Ký tự thừa của từ đã gõ sai trước đó */}
        {isPast && status === 'incorrect' && pastTypedWord && pastTypedWord.length > word.length && (
          <span 
            style={{
              color: 'var(--theme-error, #ef4444)',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
            }}
            className="px-0.5 rounded text-sm line-through opacity-70 ml-0.5"
          >
            {pastTypedWord.slice(word.length)}
          </span>
        )}

        {/* Extra excess characters typed - placed inline so caret correctly follows */}
        {isCurrent && currentInput.length > word.length && (
          <span
            data-char-extra-last="true"
            style={{
              color: 'var(--theme-error, #ef4444)',
              backgroundColor: 'rgba(239, 68, 68, 0.25)',
              textDecoration: 'underline',
            }}
            className="px-0.5 rounded text-lg font-bold ml-0.5"
          >
            {currentInput.slice(word.length)}
          </span>
        )}
      </div>
    );
  },
  (prev, next) => {
    if (prev.isCurrent !== next.isCurrent) return false;
    if (prev.status !== next.status) return false;
    if (prev.word !== next.word) return false;
    if (prev.isPast !== next.isPast) return false;
    if (prev.pastTypedWord !== next.pastTypedWord) return false;
    if (next.isCurrent) {
      return prev.currentInput === next.currentInput;
    }
    return true;
  }
);

export const TypingArena: React.FC<TypingArenaProps> = ({
  words,
  duration,
  players,
  currentPlayerId,
  onUpdateProgress,
  onFinish,
  onSurrender,
  onRestart,
  onHome,
  modeName,
  isOutplay = false,
  isMultiplayer = false,
  lastGameWpm: propLastGameWpm = 0,
  sessionBestWpm: propSessionBestWpm = 0,
  conditionStats: propConditionStats,
  onUpdateSessionStats,
  onUpdateConditionStats,
  savedPaceMode,
  onPaceModeChange,
  savedCustomWpm,
  onCustomWpmChange,
}) => {
  // Outplay Mode Persistent Settings (Monkeytype Architecture)
  const [outplaySubMode, setOutplaySubMode] = useState<OutplaySubMode>(() => {
    try {
      const saved = localStorage.getItem('fasttyping_outplay_submode');
      return (saved as OutplaySubMode) || 'vi_dau';
    } catch {
      return 'vi_dau';
    }
  });
  const [outplayTestType, setOutplayTestType] = useState<'time' | 'words'>(() => {
    try {
      const saved = localStorage.getItem('fasttyping_outplay_test_type');
      return (saved as 'time' | 'words') || 'time';
    } catch {
      return 'time';
    }
  });
  const [outplayDuration, setOutplayDuration] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fasttyping_outplay_duration');
      return saved ? parseInt(saved, 10) : 60;
    } catch {
      return 60;
    }
  });
  const [outplayWordCount, setOutplayWordCount] = useState<10 | 25 | 50 | 100>(() => {
    try {
      const saved = localStorage.getItem('fasttyping_outplay_word_count');
      return saved ? (parseInt(saved, 10) as 10 | 25 | 50 | 100) : 25;
    } catch {
      return 25;
    }
  });
  const [outplayPaceMode, setOutplayPaceMode] = useState<OutplayPaceMode>(() => {
    if (savedPaceMode && ['last', 'pb', 'custom', 'off'].includes(savedPaceMode)) {
      return savedPaceMode;
    }
    try {
      const saved = localStorage.getItem('fasttyping_outplay_pacemode');
      if (saved && ['last', 'pb', 'custom', 'off'].includes(saved)) {
        return saved as OutplayPaceMode;
      }
    } catch {}
    return 'last';
  });
  const [outplayCustomWpm, setOutplayCustomWpm] = useState<number>(() => {
    if (savedCustomWpm !== undefined && savedCustomWpm > 0) {
      return savedCustomWpm;
    }
    try {
      const saved = localStorage.getItem('fasttyping_outplay_custom_wpm');
      return saved ? parseInt(saved, 10) : 80;
    } catch {
      return 80;
    }
  });

  // Keep state in sync with parent prop if provided
  useEffect(() => {
    if (savedPaceMode && ['last', 'pb', 'custom', 'off'].includes(savedPaceMode)) {
      setOutplayPaceMode(savedPaceMode);
    }
  }, [savedPaceMode]);

  useEffect(() => {
    if (savedCustomWpm !== undefined && savedCustomWpm > 0) {
      setOutplayCustomWpm(savedCustomWpm);
    }
  }, [savedCustomWpm]);

  // In-memory Condition Statistics for HUD Realtime tracking (No local/session storage)
  const [internalConditionStats, setInternalConditionStats] = useState<Record<string, { lastWpm: number; bestWpm: number }>>({});
  
  // Condition Key logic:
  // In 'time' mode: key by duration and vocab (e.g. time_15_vi_dau, time_60_en)
  // In 'words' mode: key by word count and vocab (e.g. words_25_vi_dau, words_50_en)
  const currentConditionKey = isOutplay
    ? (outplayTestType === 'time'
        ? `time_${outplayDuration}_${outplaySubMode}`
        : `words_${outplayWordCount}_${outplaySubMode}`)
    : `${modeName}_time_${duration}`;

  const activeConditionStats = propConditionStats || internalConditionStats;
  const currentConditionStat = activeConditionStats[currentConditionKey];

  // In Outplay mode: Only load scores if this exact condition pair was already played in this room.
  // If not, leave empty (0 -> rendered as '---' in HUD).
  const lastGameWpm = isOutplay
    ? (currentConditionStat && currentConditionStat.lastWpm > 0 ? currentConditionStat.lastWpm : 0)
    : (currentConditionStat && currentConditionStat.lastWpm > 0 ? currentConditionStat.lastWpm : (propLastGameWpm || 0));

  const sessionBestWpm = isOutplay
    ? (currentConditionStat && currentConditionStat.bestWpm > 0 ? currentConditionStat.bestWpm : 0)
    : (currentConditionStat && currentConditionStat.bestWpm > 0 ? currentConditionStat.bestWpm : (propSessionBestWpm || 0));

  // In-room countdown for multiplayer: starts at 3 when entering the room
  const [inRoomCountdown, setInRoomCountdown] = useState<number | null>(() => {
    return isMultiplayer && !isOutplay ? 3 : null;
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
        startTimePerfRef.current = performance.now();
        lastWordTimestampRef.current = performance.now();
        inputRef.current?.focus();
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [inRoomCountdown]);

  // Outplay state: Timer does not start until the first keystroke
  const [hasStartedTyping, setHasStartedTyping] = useState<boolean>(!isOutplay);

  // Active words: in Outplay mode words can be re-generated on Monkeytype config change
  const [activeWords, setActiveWords] = useState<string[]>(() => {
    if (isOutplay) {
      const count = outplayTestType === 'words' ? outplayWordCount : 250;
      return generateOutplayWords(outplaySubMode, count, {
        punctuation: false,
        numbers: false,
      });
    }
    return words;
  });

  // Effective words and duration
  const effectiveWords = isOutplay ? activeWords : words;
  const effectiveDuration = isOutplay ? outplayDuration : duration;

  // Sync external words when not in outplay
  useEffect(() => {
    if (!isOutplay) {
      setActiveWords(words);
      setWordStatuses(new Array(words.length).fill('pending'));
    }
  }, [words, isOutplay]);

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [wordStatuses, setWordStatuses] = useState<('correct' | 'incorrect' | 'pending')[]>(() =>
    new Array(effectiveWords.length).fill('pending')
  );
  const [correctChars, setCorrectChars] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const [timeLeft, setTimeLeft] = useState(effectiveDuration);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [liveConsistency, setLiveConsistency] = useState(100);
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);

  // Surrender Modal & State
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const showSurrenderModalRef = useRef(false);
  const currentPlayerData = players.find((p) => p.id === currentPlayerId);
  const isPlayerSurrendered = !!currentPlayerData?.isSurrendered;

  // Finished & Spectating State for Multiplayer
  const [hasUserFinished, setHasUserFinished] = useState(false);
  const isUserFinished = hasUserFinished || !!currentPlayerData?.isFinished;
  const activeCompetitors = players.filter(
    (p) => p.id !== currentPlayerId && !p.isBot && !p.isSurrendered && !p.isFinished && p.inMatch !== false
  );
  const remainingActiveCount = activeCompetitors.length;
  const finishedPlayersList = players.filter((p) => p.isFinished);
  const myPlacement = finishedPlayersList.findIndex((p) => p.id === currentPlayerId) + 1 || Math.max(1, finishedPlayersList.length);

  // Monkeytype Caret State & Focus
  const [caretPos, setCaretPos] = useState<{ x: number; y: number; height?: number } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const typingTimeoutRef = useRef<number | null>(null);

  // Custom Dropdowns Popover States (Eliminates OS select blur glitches)
  const [isVocabOpen, setIsVocabOpen] = useState(false);
  const [isGhostOpen, setIsGhostOpen] = useState(false);
  const vocabDropdownRef = useRef<HTMLDivElement>(null);
  const ghostDropdownRef = useRef<HTMLDivElement>(null);

  // Performance timeline for post-match chart
  const performanceTimelineRef = useRef<PerformanceChartPoint[]>([]);
  const lastSampledSecRef = useRef<number>(-1);

  // Custom ghost WPM input ref & state buffer (prevents focus loss and typing glitches)
  const customWpmInputRef = useRef<HTMLInputElement>(null);
  const [customWpmInputVal, setCustomWpmInputVal] = useState<string | null>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (vocabDropdownRef.current && !vocabDropdownRef.current.contains(e.target as Node)) {
        setIsVocabOpen(false);
      }
      if (ghostDropdownRef.current && !ghostDropdownRef.current.contains(e.target as Node)) {
        setIsGhostOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ghost Caret State (for Outplay mode)
  const [ghostCaretPos, setGhostCaretPos] = useState<{ x: number; y: number; height?: number } | null>(null);
  const [ghostInfo, setGhostInfo] = useState<{ refWpm: number; isAvailable: boolean }>({ refWpm: 0, isAvailable: false });
  const [ghostLeadDelta, setGhostLeadDelta] = useState<number>(0);
  const ghostJourneyRef = useRef<GhostPoint[]>([]);

  // Stored ghost replay record for the current configuration
  const activeGhostRecord = useMemo(() => {
    if (!isOutplay || outplayPaceMode === 'custom') return null;
    return getStoredGhostRecord(
      outplayPaceMode,
      outplaySubMode,
      outplayTestType === 'time' ? outplayDuration : outplayWordCount,
      outplayTestType
    );
  }, [isOutplay, outplayPaceMode, outplaySubMode, outplayDuration, outplayWordCount, outplayTestType]);

  // Line scrolling offset for Virtual 3-Line System
  const [lineOffsetY, setLineOffsetY] = useState(0);

  // Refs
  const isComposingRef = useRef(false);
  const keystrokesRef = useRef<KeystrokeEvent[]>([]);
  const startTimePerfRef = useRef<number>(performance.now());
  const lastWordTimestampRef = useRef<number>(performance.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const wordsStreamRef = useRef<HTMLDivElement>(null);
  const lastProgressUpdateRef = useRef<number>(0);
  const wordHistoryRef = useRef<
    {
      typedWord: string;
      isCorrect: boolean;
      prevCombo: number;
      addedCorrectChars: number;
    }[]
  >([]);

  // Reset word history when words change
  useEffect(() => {
    wordHistoryRef.current = [];
  }, [effectiveWords]);

  // Reset Internal Arena Game State (Monkeytype Outplay switcher)
  const handleResetOutplay = useCallback(
    (
      newSub = outplaySubMode,
      newDur = outplayDuration,
      newType = outplayTestType,
      newWordCount = outplayWordCount,
      keepExistingWords = false
    ) => {
      soundFx.playKeyClick(false);
      let newWords = activeWords;
      if (!keepExistingWords || !activeWords || activeWords.length === 0) {
        const count = newType === 'words' ? newWordCount : 250;
        newWords = generateOutplayWords(newSub, count, {
          punctuation: false,
          numbers: false,
        });
        setActiveWords(newWords);
      }
      setCurrentWordIndex(0);
      setCurrentInput('');
      setWordStatuses(new Array(newWords.length).fill('pending'));
      setCorrectChars(0);
      setTotalErrors(0);
      setTimeLeft(newDur);
      setCombo(0);
      setMaxCombo(0);
      setLiveConsistency(100);
      setHasStartedTyping(false);
      setCaretPos(null);
      setGhostCaretPos(null);
      setGhostLeadDelta(0);
      isFinishedRef.current = false;
      ghostJourneyRef.current = [];
      wordHistoryRef.current = [];
      keystrokesRef.current = [];
      performanceTimelineRef.current = [];
      setIsVocabOpen(false);
      setIsGhostOpen(false);
      startTimePerfRef.current = performance.now();
      setIsFocused(true);
      setTimeout(() => {
        inputRef.current?.focus();
        setIsFocused(true);
      }, 20);
    },
    [outplaySubMode, outplayDuration, outplayTestType, outplayWordCount, activeWords]
  );

  // Monkeytype Setting Handlers
  const handleSubModeChange = (newSub: OutplaySubMode) => {
    setOutplaySubMode(newSub);
    try {
      localStorage.setItem('fasttyping_outplay_submode', newSub);
    } catch {}
    handleResetOutplay(newSub, outplayDuration, outplayTestType, outplayWordCount);
  };

  const handleTestTypeChange = (newType: 'time' | 'words') => {
    setOutplayTestType(newType);
    try {
      localStorage.setItem('fasttyping_outplay_test_type', newType);
    } catch {}
    handleResetOutplay(outplaySubMode, outplayDuration, newType, outplayWordCount);
  };

  const handleDurationChange = (newDur: number) => {
    setOutplayDuration(newDur);
    try {
      localStorage.setItem('fasttyping_outplay_duration', newDur.toString());
    } catch {}
    handleResetOutplay(outplaySubMode, newDur, 'time', outplayWordCount, true);
  };

  const handleWordCountChange = (newCount: 10 | 25 | 50 | 100) => {
    setOutplayWordCount(newCount);
    try {
      localStorage.setItem('fasttyping_outplay_word_count', newCount.toString());
    } catch {}
    handleResetOutplay(outplaySubMode, outplayDuration, 'words', newCount);
  };

  const handlePaceModeChange = (newPace: OutplayPaceMode) => {
    setOutplayPaceMode(newPace);
    try {
      localStorage.setItem('fasttyping_outplay_pacemode', newPace);
    } catch {}
    onPaceModeChange?.(newPace);
    setGhostCaretPos(null);
  };

  const handleCustomWpmChange = (wpm: number) => {
    const clamped = Math.max(20, Math.min(300, wpm || 60));
    setOutplayCustomWpm(clamped);
    try {
      localStorage.setItem('fasttyping_outplay_custom_wpm', clamped.toString());
    } catch {}
    onCustomWpmChange?.(clamped);
  };

  // Surrender action handlers
  const openSurrenderModal = useCallback(() => {
    if (isPlayerSurrendered || timeLeft <= 0) return;
    soundFx.playKeyClick(false);
    showSurrenderModalRef.current = true;
    setShowSurrenderModal(true);
  }, [isPlayerSurrendered, timeLeft]);

  const confirmSurrender = useCallback(() => {
    soundFx.playError();
    showSurrenderModalRef.current = false;
    setShowSurrenderModal(false);

    // Clear last game WPM for current condition, but keep session best WPM
    setInternalConditionStats((prev) => ({
      ...prev,
      [currentConditionKey]: {
        lastWpm: 0,
        bestWpm: sessionBestWpm || 0,
      },
    }));
    onUpdateConditionStats?.(currentConditionKey, 0, sessionBestWpm || 0);
    onUpdateSessionStats?.(0, sessionBestWpm || 0);

    onSurrender();

    if (isOutplay) {
      // In Outplay mode: player can continue typing immediately with a clean slate
      handleResetOutplay(outplaySubMode, outplayDuration, outplayTestType, outplayWordCount, true);
      setTimeout(() => {
        inputRef.current?.focus();
        setIsFocused(true);
      }, 50);
    }
  }, [
    onSurrender,
    isOutplay,
    sessionBestWpm,
    currentConditionKey,
    onUpdateConditionStats,
    onUpdateSessionStats,
    handleResetOutplay,
    outplaySubMode,
    outplayDuration,
    outplayTestType,
    outplayWordCount,
  ]);

  const cancelSurrender = useCallback(() => {
    soundFx.playKeyClick(false);
    showSurrenderModalRef.current = false;
    setShowSurrenderModal(false);
    setTimeout(() => {
      inputRef.current?.focus();
      setIsFocused(true);
    }, 50);
  }, []);

  // Initial focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard shortcut listener: Esc opens surrender modal, Enter confirms; Esc cancels; auto focus
  useEffect(() => {
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      // If user is editing the custom ghost WPM input, do not steal or intercept keystrokes!
      if (document.activeElement === customWpmInputRef.current) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          customWpmInputRef.current?.blur();
          inputRef.current?.focus();
        }
        return;
      }

      // 1. Modal is open: Enter to confirm, Esc to cancel
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

      // If custom dropdowns are open, handle Escape to close them
      if (isVocabOpen || isGhostOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsVocabOpen(false);
          setIsGhostOpen(false);
          inputRef.current?.focus();
        }
        return;
      }

      // 2. Modal is NOT open: Esc to trigger surrender modal
      if (e.key === 'Escape') {
        if (!isPlayerSurrendered && timeLeft > 0) {
          e.preventDefault();
          e.stopPropagation();
          openSurrenderModal();
          return;
        }
      }

      // 3. Auto focus input on typing if not surrendered and not interacting with form controls or dropdowns
      if (
        !isPlayerSurrendered &&
        !isVocabOpen &&
        !isGhostOpen &&
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
  }, [showSurrenderModal, isPlayerSurrendered, timeLeft, openSurrenderModal, confirmSurrender, cancelSurrender, isVocabOpen, isGhostOpen]);

  // Refs to hold latest values for finish callback safely without triggering render-phase updates
  const isFinishedRef = useRef(false);
  const correctCharsRef = useRef(correctChars);
  const totalErrorsRef = useRef(totalErrors);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    correctCharsRef.current = correctChars;
  }, [correctChars]);

  useEffect(() => {
    totalErrorsRef.current = totalErrors;
  }, [totalErrors]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Centralized timeline point recorder (10s intervals, error events, finish events)
  const recordTimelinePoint = useCallback(
    (specificSec?: number, isErrorEvent: boolean = false) => {
      if (isFinishedRef.current) return;
      const now = performance.now();
      const elapsedSec =
        specificSec !== undefined
          ? Math.max(1, specificSec)
          : Math.max(1, Math.round((now - startTimePerfRef.current) / 1000));
      const elapsedMin = elapsedSec / 60;
      const currentWpm = Math.max(0, Math.round((correctCharsRef.current / 5) / Math.max(0.016, elapsedMin)));
      const ghostWpm = activeGhostRecord?.wpm ?? (outplayPaceMode === 'custom' ? outplayCustomWpm : 0);
      // Session best WPM is strictly for Outplay Yourself mode as the static session record
      const outplaySessionBest = isOutplay && sessionBestWpm && sessionBestWpm > 0 ? sessionBestWpm : undefined;

      const currentErrors = totalErrorsRef.current;
      const prevRecordedErrors = performanceTimelineRef.current.reduce((sum, p) => sum + p.errors, 0);
      const errorsThisSec = Math.max(0, currentErrors - prevRecordedErrors);

      const existingIdx = performanceTimelineRef.current.findIndex((p) => p.second === elapsedSec);
      if (existingIdx >= 0) {
        const existing = performanceTimelineRef.current[existingIdx];
        existing.playerWpm = currentWpm;
        if (ghostWpm > 0) existing.ghostWpm = ghostWpm;
        if (outplaySessionBest) existing.sessionBestWpm = outplaySessionBest;
        if (isErrorEvent || errorsThisSec > 0) {
          existing.errors += Math.max(1, errorsThisSec);
          existing.errorPlot = currentWpm;
        }
      } else {
        performanceTimelineRef.current.push({
          second: elapsedSec,
          playerWpm: currentWpm,
          ghostWpm: ghostWpm > 0 ? ghostWpm : undefined,
          sessionBestWpm: outplaySessionBest,
          errors: isErrorEvent ? Math.max(1, errorsThisSec) : errorsThisSec,
          errorPlot: isErrorEvent || errorsThisSec > 0 ? currentWpm : null,
        });
        performanceTimelineRef.current.sort((a, b) => a.second - b.second);
      }
    },
    [activeGhostRecord, outplayPaceMode, outplayCustomWpm, isOutplay, sessionBestWpm]
  );

  // Performance chart timeline sampling: every 10s intervals + event triggers
  useEffect(() => {
    if (!hasStartedTyping || isPlayerSurrendered) return;

    const timelineInterval = setInterval(() => {
      if (isFinishedRef.current) return;
      const now = performance.now();
      const elapsedSec = Math.max(1, Math.round((now - startTimePerfRef.current) / 1000));
      if (elapsedSec !== lastSampledSecRef.current) {
        lastSampledSecRef.current = elapsedSec;
        recordTimelinePoint(elapsedSec, false);
      }
    }, 1000);

    return () => clearInterval(timelineInterval);
  }, [hasStartedTyping, isPlayerSurrendered, recordTimelinePoint]);

  // Timer countdown:
  // In Outplay mode: Only runs after user presses their first keystroke!
  // In Multiplayer mode: Only runs after inRoomCountdown finishes!
  useEffect(() => {
    if (isPlayerSurrendered) return;
    if (inRoomCountdown !== null) return; // Wait for in-room countdown!
    if (isOutplay && !hasStartedTyping) return; // Wait for first keypress!
    if (isOutplay && outplayTestType === 'words') return; // Words mode finishes on words completed

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStartedTyping, isPlayerSurrendered, isOutplay, outplayTestType, inRoomCountdown]);

  // When timeLeft reaches 0 (time mode), trigger onFinish safely in useEffect
  useEffect(() => {
    if (isOutplay && outplayTestType === 'words') return;
    if (timeLeft <= 0 && !isFinishedRef.current) {
      isFinishedRef.current = true;
      setHasUserFinished(true);
      const elapsedSeconds = Math.max(0.1, (performance.now() - startTimePerfRef.current) / 1000);
      const consistency = calculateConsistency(keystrokesRef.current, effectiveDuration);
      const elapsedMins = elapsedSeconds / 60;
      const finalWpm = Math.round((correctCharsRef.current / 5) / elapsedMins);
      const finalAcc = Math.round(
        (correctCharsRef.current / Math.max(1, correctCharsRef.current + totalErrorsRef.current * 5)) * 100
      );

      // Save ghost run if in Outplay mode, user typed, and pace is not off
      if (isOutplay && hasStartedTyping && ghostJourneyRef.current.length > 0 && outplayPaceMode !== 'off') {
        saveGhostRun(
          outplaySubMode,
          outplayDuration,
          finalWpm,
          finalAcc,
          ghostJourneyRef.current,
          'time'
        );
      }

      // Update condition stats
      const nextSessionBest = isOutplay ? Math.max(sessionBestWpm || 0, finalWpm) : finalWpm;
      setInternalConditionStats((prev) => ({
        ...prev,
        [currentConditionKey]: {
          lastWpm: finalWpm,
          bestWpm: nextSessionBest,
        },
      }));
      onUpdateConditionStats?.(currentConditionKey, finalWpm, nextSessionBest);
      onUpdateSessionStats?.(finalWpm, isOutplay ? nextSessionBest : 0);

      const ghostWpm = activeGhostRecord?.wpm ?? (outplayPaceMode === 'custom' ? outplayCustomWpm : 0);

      // Add final point to timeline
      const finalSec = Math.max(1, Math.round(elapsedSeconds));
      recordTimelinePoint(finalSec, false);

      const normalizedChart = normalizeChartTimeline(
        performanceTimelineRef.current,
        elapsedSeconds,
        finalWpm,
        isOutplay ? nextSessionBest : undefined,
        ghostWpm > 0 ? ghostWpm : undefined
      );

      const wordResults = effectiveWords.slice(0, currentWordIndex + (currentInput.trim() ? 1 : 0)).map((w, idx) => ({
        word: w,
        typed: wordHistoryRef.current[idx]?.typedWord ?? (idx === currentWordIndex ? currentInput.trim() : ''),
        isCorrect: wordHistoryRef.current[idx]?.isCorrect ?? false,
      }));

      onFinishRef.current(
        correctCharsRef.current,
        totalErrorsRef.current,
        keystrokesRef.current,
        consistency,
        {
          lastWpm: (lastGameWpm && lastGameWpm > 0) ? lastGameWpm : undefined,
          sessionBestWpm: isOutplay ? nextSessionBest : undefined,
          finalWpm,
          elapsedSeconds,
          chartData: normalizedChart,
          wordResults,
          promptWords: effectiveWords.slice(0, Math.max(10, currentWordIndex + 1)),
          ghostDiff: isOutplay && outplayPaceMode !== 'off' && ghostWpm > 0 ? {
            ghostWpm,
            wpmDiff: finalWpm - ghostWpm,
            leadChars: ghostLeadDelta,
            paceLabel: outplayPaceMode === 'last' ? 'Ván trước' : outplayPaceMode === 'pb' ? 'Kỷ lục cá nhân' : `Mục tiêu ${outplayCustomWpm} WPM`,
          } : undefined,
        }
      );
    }
  }, [
    timeLeft,
    isOutplay,
    outplayTestType,
    hasStartedTyping,
    activeGhostRecord,
    outplayPaceMode,
    outplayCustomWpm,
    outplaySubMode,
    outplayDuration,
    ghostLeadDelta,
    lastGameWpm,
    sessionBestWpm,
    onUpdateSessionStats,
    recordTimelinePoint,
  ]);

  // Monkeytype Caret & Virtual 3-Line System
  const LINE_HEIGHT = 48;

  const updateCaretAndLines = useCallback(() => {
    if (isUserFinished || isPlayerSurrendered) {
      setCaretPos(null);
      return;
    }
    if (!wordsStreamRef.current || !wordsContainerRef.current) return;
    const streamEl = wordsStreamRef.current;
    const streamRect = streamEl.getBoundingClientRect();

    const currentWord = effectiveWords[currentWordIndex] || '';
    const wordEl = streamEl.querySelector(`[data-word-idx="${currentWordIndex}"]`) as HTMLElement | null;
    if (!wordEl) return;

    const wordRect = wordEl.getBoundingClientRect();
    let targetRect: DOMRect | null = null;
    let isAfter = false;

    if (currentInput.length === 0) {
      // Start of active word: first character
      const firstCharEl = wordEl.querySelector(`[data-char-idx="0"]`);
      if (firstCharEl) {
        targetRect = firstCharEl.getBoundingClientRect();
      } else {
        targetRect = wordRect;
      }
    } else if (currentInput.length < currentWord.length) {
      // Active character index focus
      const charEl = wordEl.querySelector(`[data-char-idx="${currentInput.length}"]`);
      if (charEl) {
        targetRect = charEl.getBoundingClientRect();
      }
    } else {
      // Typed all characters or extra excess characters
      const extraCharEl = wordEl.querySelector(`[data-char-extra-last="true"]`);
      if (extraCharEl) {
        targetRect = extraCharEl.getBoundingClientRect();
        isAfter = true;
      } else {
        const lastCharEl = wordEl.querySelector(`[data-char-idx="${currentWord.length - 1}"]`);
        if (lastCharEl) {
          targetRect = lastCharEl.getBoundingClientRect();
          isAfter = true;
        }
      }
    }

    if (targetRect) {
      const x = isAfter ? targetRect.right - streamRect.left : targetRect.left - streamRect.left;
      const y = targetRect.top - streamRect.top;
      const height = Math.max(24, Math.min(36, targetRect.height || 28));

      setCaretPos({ x, y, height });

      // Monkeytype Virtual 3-Line System:
      const firstWordEl = streamEl.querySelector('[data-word-idx="0"]') as HTMLElement | null;
      const firstWordTop = firstWordEl ? firstWordEl.offsetTop : 0;
      const currentWordTop = wordEl.offsetTop;
      const lineIndex = Math.max(0, Math.round((currentWordTop - firstWordTop) / LINE_HEIGHT));

      const targetScrollLine = lineIndex >= 2 ? lineIndex - 1 : 0;
      setLineOffsetY(targetScrollLine * LINE_HEIGHT);
    }
  }, [currentWordIndex, currentInput, effectiveWords]);

  // Setup ResizeObserver and window resize ONCE on mount / container change
  useEffect(() => {
    const handleResize = () => {
      updateCaretAndLines();
    };
    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | null = null;
    if (wordsContainerRef.current) {
      ro = new ResizeObserver(handleResize);
      ro.observe(wordsContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
    };
  }, [updateCaretAndLines]);

  // Update caret & line scroll whenever active word or input changes
  useEffect(() => {
    updateCaretAndLines();
  }, [currentWordIndex, currentInput, updateCaretAndLines]);

  // Outplay Ghost / Pace Caret Realtime Simulation Loop (Optimized for Virtual Environments & Citrix)
  useEffect(() => {
    if (!isOutplay || !hasStartedTyping || isPlayerSurrendered) {
      setGhostCaretPos(null);
      return;
    }

    let animId: number;
    let lastTickTime = 0;
    let lastLeadCalcTime = 0;
    let lastGhostWordIdx = -1;
    let lastGhostCharIdx = -1;
    let lastRefWpm = -1;
    let lastIsAvail: boolean | null = null;

    const updateGhost = (timestamp: number) => {
      // Throttle ghost tick to ~25fps (every 40ms) to avoid saturating virtualized CPU & display encoders
      if (timestamp - lastTickTime >= 40) {
        lastTickTime = timestamp;

        if (wordsStreamRef.current) {
          const elapsedMs = performance.now() - startTimePerfRef.current;
          const ghostRes = calculateGhostCharIndex(
            outplayPaceMode,
            outplayCustomWpm,
            elapsedMs,
            activeGhostRecord
          );

          if (lastRefWpm !== ghostRes.referenceWpm || lastIsAvail !== ghostRes.isAvailable) {
            lastRefWpm = ghostRes.referenceWpm;
            lastIsAvail = ghostRes.isAvailable;
            setGhostInfo({ refWpm: ghostRes.referenceWpm, isAvailable: ghostRes.isAvailable });
          }

          if (!ghostRes.isAvailable) {
            setGhostCaretPos(null);
          } else {
            const mapped = mapLinearCharToWord(effectiveWords, ghostRes.charIdx);

            // Only query DOM when ghost character advances
            if (mapped.wordIdx !== lastGhostWordIdx || mapped.charIdx !== lastGhostCharIdx) {
              lastGhostWordIdx = mapped.wordIdx;
              lastGhostCharIdx = mapped.charIdx;

              const streamEl = wordsStreamRef.current;
              const streamRect = streamEl.getBoundingClientRect();
              const gWordEl = streamEl.querySelector(`[data-word-idx="${mapped.wordIdx}"]`) as HTMLElement | null;

              if (gWordEl) {
                let gRect: DOMRect | null = null;
                let isAfter = false;

                if (mapped.isSpaceOrEnd) {
                  const lastCharEl = gWordEl.querySelector(
                    `[data-char-idx="${effectiveWords[mapped.wordIdx]?.length ? effectiveWords[mapped.wordIdx].length - 1 : 0}"]`
                  );
                  if (lastCharEl) {
                    gRect = lastCharEl.getBoundingClientRect();
                    isAfter = true;
                  } else {
                    gRect = gWordEl.getBoundingClientRect();
                    isAfter = true;
                  }
                } else {
                  const charEl = gWordEl.querySelector(`[data-char-idx="${mapped.charIdx}"]`);
                  if (charEl) {
                    gRect = charEl.getBoundingClientRect();
                  } else {
                    gRect = gWordEl.getBoundingClientRect();
                  }
                }

                if (gRect) {
                  const gx = isAfter ? gRect.right - streamRect.left : gRect.left - streamRect.left;
                  const gy = gRect.top - streamRect.top;
                  const gHeight = Math.max(24, Math.min(36, gRect.height || 28));
                  setGhostCaretPos({ x: gx, y: gy, height: gHeight });
                }
              }
            }

            // Calculate lead delta (Player chars - Ghost chars) throttled every 250ms
            if (timestamp - lastLeadCalcTime >= 250) {
              lastLeadCalcTime = timestamp;
              const playerLinear =
                effectiveWords.slice(0, currentWordIndex).reduce((sum, w) => sum + w.length + 1, 0) +
                currentInput.length;
              setGhostLeadDelta(Math.round(playerLinear - ghostRes.charIdx));
            }
          }
        }
      }

      animId = requestAnimationFrame(updateGhost);
    };

    animId = requestAnimationFrame(updateGhost);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    isOutplay,
    hasStartedTyping,
    isPlayerSurrendered,
    outplayPaceMode,
    outplayCustomWpm,
    activeGhostRecord,
    effectiveWords,
    currentWordIndex,
    currentInput,
  ]);

  // Re-focus helper
  const handleArenaClick = () => {
    inputRef.current?.focus();
    setIsFocused(true);
  };

  // Spacebar Commit Word
  const commitCurrentWord = useCallback(() => {
    const typedWord = currentInput.trim();
    const targetWord = effectiveWords[currentWordIndex] || '';

    if (!typedWord && currentInput.length === 0) return;

    const now = performance.now();

    // Anti-Cheat word validation
    const validation = validateWordSubmission(
      targetWord,
      typedWord,
      lastWordTimestampRef.current,
      now
    );
    lastWordTimestampRef.current = now;

    if (validation.isFlagged && validation.warning) {
      setCheatWarning(validation.warning);
      setTimeout(() => setCheatWarning(null), 3000);
    }

    const isCorrect = validation.isCorrect;
    const newStatuses = [...wordStatuses];
    newStatuses[currentWordIndex] = isCorrect ? 'correct' : 'incorrect';
    setWordStatuses(newStatuses);

    let newCorrectChars = correctChars;
    let newErrors = totalErrors;
    let newCombo = combo;

    const addedChars = isCorrect ? targetWord.length + 1 : 0;
    if (isCorrect) {
      newCorrectChars += addedChars; // +1 space
      newCombo += 1;
      if (newCombo > maxCombo) setMaxCombo(newCombo);
      soundFx.playWordComplete();
    } else {
      newErrors += 1;
      newCombo = 0;
      soundFx.playError();
      recordTimelinePoint(undefined, true);
    }

    // Save history for Backspace correction
    wordHistoryRef.current[currentWordIndex] = {
      typedWord,
      isCorrect,
      prevCombo: combo,
      addedCorrectChars: addedChars,
    };

    setCorrectChars(newCorrectChars);
    setTotalErrors(newErrors);
    setCombo(newCombo);

    // Live consistency
    const currentConsistency = calculateConsistency(keystrokesRef.current);
    setLiveConsistency(currentConsistency);

    const nextIndex = currentWordIndex + 1;
    setCurrentWordIndex(nextIndex);
    setCurrentInput('');

    // Millisecond-accurate WPM
    const elapsedMinutes = Math.max(0.01, (now - startTimePerfRef.current) / 60000);
    const liveWpm = Math.round(newCorrectChars / 5 / elapsedMinutes);
    const targetWordCount = Math.max(
      1,
      isOutplay && outplayTestType === 'words'
        ? outplayWordCount
        : effectiveWords.length > 0
        ? effectiveWords.length
        : 150
    );
    const progress = Math.min(100, Math.round((nextIndex / targetWordCount) * 100));

    lastProgressUpdateRef.current = now;
    onUpdateProgress(progress, newCorrectChars, newErrors, liveWpm);

    // Completed all target words
    if (nextIndex >= targetWordCount && !isFinishedRef.current) {
      isFinishedRef.current = true;
      setHasUserFinished(true);

      const finalAcc = Math.round((newCorrectChars / Math.max(1, newCorrectChars + newErrors * 5)) * 100);

      // Save ghost run if in Outplay mode, user typed, and pace is not off
      if (isOutplay && hasStartedTyping && ghostJourneyRef.current.length > 0 && outplayPaceMode !== 'off') {
        saveGhostRun(
          outplaySubMode,
          outplayWordCount,
          liveWpm,
          finalAcc,
          ghostJourneyRef.current,
          'words'
        );
      }

      // Update condition stats
      const nextSessionBest = isOutplay ? Math.max(sessionBestWpm || 0, liveWpm) : liveWpm;
      setInternalConditionStats((prev) => ({
        ...prev,
        [currentConditionKey]: {
          lastWpm: liveWpm,
          bestWpm: nextSessionBest,
        },
      }));
      onUpdateConditionStats?.(currentConditionKey, liveWpm, nextSessionBest);
      onUpdateSessionStats?.(liveWpm, isOutplay ? nextSessionBest : 0);

      const ghostWpm = activeGhostRecord?.wpm ?? (outplayPaceMode === 'custom' ? outplayCustomWpm : 0);
      const elapsedSeconds = Math.max(0.1, (now - startTimePerfRef.current) / 1000);
      const finalConsistency = calculateConsistency(keystrokesRef.current, elapsedSeconds);

      // Add final point to timeline
      const finalSec = Math.max(1, Math.round(elapsedSeconds));
      recordTimelinePoint(finalSec, false);

      const normalizedChart = normalizeChartTimeline(
        performanceTimelineRef.current,
        elapsedSeconds,
        liveWpm,
        isOutplay ? nextSessionBest : undefined,
        ghostWpm > 0 ? ghostWpm : undefined
      );

      const wordResults = effectiveWords.slice(0, nextIndex).map((w, idx) => ({
        word: w,
        typed: wordHistoryRef.current[idx]?.typedWord ?? '',
        isCorrect: wordHistoryRef.current[idx]?.isCorrect ?? false,
      }));

      onFinish(newCorrectChars, newErrors, keystrokesRef.current, finalConsistency, {
        lastWpm: (lastGameWpm && lastGameWpm > 0) ? lastGameWpm : undefined,
        sessionBestWpm: isOutplay ? nextSessionBest : undefined,
        finalWpm: liveWpm,
        elapsedSeconds,
        chartData: normalizedChart,
        wordResults,
        promptWords: effectiveWords.slice(0, Math.max(10, nextIndex)),
        ghostDiff: isOutplay && outplayPaceMode !== 'off' && ghostWpm > 0 ? {
          ghostWpm,
          wpmDiff: liveWpm - ghostWpm,
          leadChars: ghostLeadDelta,
          paceLabel: outplayPaceMode === 'last' ? 'Ván trước' : outplayPaceMode === 'pb' ? 'Kỷ lục cá nhân' : `Mục tiêu ${outplayCustomWpm} WPM`,
        } : undefined,
      });
    }
  }, [
    currentInput,
    effectiveWords,
    currentWordIndex,
    wordStatuses,
    correctChars,
    totalErrors,
    combo,
    maxCombo,
    onUpdateProgress,
    onFinish,
    isOutplay,
    outplayTestType,
    outplayWordCount,
    hasStartedTyping,
    outplaySubMode,
    outplayDuration,
    outplayPaceMode,
    outplayCustomWpm,
    activeGhostRecord,
    ghostLeadDelta,
    lastGameWpm,
    sessionBestWpm,
    onUpdateSessionStats,
  ]);

  // Outplay start typing helper: starts timer & records baseline immediately
  const startTypingIfNeeded = useCallback(() => {
    if (isOutplay && !hasStartedTyping) {
      setHasStartedTyping(true);
      const now = performance.now();
      startTimePerfRef.current = now;
      lastWordTimestampRef.current = now;
      ghostJourneyRef.current = [{ t: 0, charIdx: 0 }];
    }
  }, [isOutplay, hasStartedTyping]);

  // Composition API Listeners (Vietnamese IME)
  const handleCompositionStart = () => {
    isComposingRef.current = true;
    startTypingIfNeeded();
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    startTypingIfNeeded();
    const val = e.currentTarget.value;
    setCurrentInput(val);

    // Record key event
    keystrokesRef.current.push({
      key: val.slice(-1) || 'IME_Char',
      time: performance.now(),
    });

    setIsTyping(true);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 500);

    soundFx.playKeyClick(false);
  };

  // Main Input Change Handler - Live feedback per character
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUserFinished || isPlayerSurrendered || timeLeft <= 0) return;
    const val = e.target.value;
    const now = performance.now();

    // Outplay mode: Start timer immediately on first character!
    startTypingIfNeeded();

    // Record sub-millisecond keystroke
    keystrokesRef.current.push({
      key: val.slice(-1) || 'Backspace',
      time: now,
    });

    // Record ghost journey snapshot
    if (isOutplay) {
      const linear =
        effectiveWords.slice(0, currentWordIndex).reduce((sum, w) => sum + w.length + 1, 0) + val.length;
      const elapsed = Math.round(now - startTimePerfRef.current);
      ghostJourneyRef.current.push({ t: elapsed, charIdx: linear });
    }

    setIsTyping(true);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 500);

    // If space pressed and not composing Vietnamese tones
    if (!isComposingRef.current && (val.endsWith(' ') || val.endsWith('\n'))) {
      soundFx.playKeyClick(true);
      commitCurrentWord();
      return;
    }

    setCurrentInput(val);
    if (!isComposingRef.current) {
      soundFx.playKeyClick(false);
    }

    // Realtime live WPM and progress feedback
    const targetWord = effectiveWords[currentWordIndex] || '';
    let matchingCharsInVal = 0;
    for (let i = 0; i < val.length && i < targetWord.length; i++) {
      if (val[i] === targetWord[i]) matchingCharsInVal++;
      else break;
    }
    const currentLiveCorrect = correctChars + matchingCharsInVal;
    const nowElapsedMin = Math.max(0.003, (now - startTimePerfRef.current) / 60000);
    const charLiveWpm = Math.max(0, Math.round((currentLiveCorrect / 5) / nowElapsedMin));
    const targetWordCount = Math.max(
      1,
      isOutplay && outplayTestType === 'words'
        ? outplayWordCount
        : effectiveWords.length > 0
        ? effectiveWords.length
        : 150
    );
    // Stable monotonic progress based on completed words, advancing smoothly when space is pressed
    const stableProg = Math.min(100, Math.round((currentWordIndex / targetWordCount) * 100));

    // Throttle progress notification to parent (App.tsx) during typing to avoid root re-renders
    if (now - lastProgressUpdateRef.current >= 150) {
      lastProgressUpdateRef.current = now;
      onUpdateProgress(stableProg, currentLiveCorrect, totalErrors, charLiveWpm);
    }
  };

  // Backspace key handler
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isUserFinished || isPlayerSurrendered || timeLeft <= 0) {
      e.preventDefault();
      return;
    }
    if (inRoomCountdown !== null) {
      e.preventDefault();
      return;
    }

    // Start Outplay timer immediately on first keypress (including printable characters, backspace, IME keys)
    if (
      isOutplay &&
      !hasStartedTyping &&
      !['Tab', 'Alt', 'Control', 'Meta', 'Escape', 'Shift', 'CapsLock'].includes(e.key)
    ) {
      startTypingIfNeeded();
    }

    if (e.key === 'Backspace') {
      if (isComposingRef.current) return;

      if (currentInput.length === 0) {
        if (currentWordIndex > 0) {
          const prevIndex = currentWordIndex - 1;
          const prevStatus = wordStatuses[prevIndex];

          if (prevStatus === 'incorrect') {
            e.preventDefault();

            const prevHist = wordHistoryRef.current[prevIndex];
            const restoredInput = prevHist?.typedWord ?? '';

            const newErrors = Math.max(0, totalErrors - 1);
            setTotalErrors(newErrors);

            const newStatuses = [...wordStatuses];
            newStatuses[prevIndex] = 'pending';
            setWordStatuses(newStatuses);

            setCurrentWordIndex(prevIndex);
            setCurrentInput(restoredInput);

            soundFx.playKeyClick(false);
            setIsTyping(true);
            if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 500);

            keystrokesRef.current.push({
              key: 'Backspace',
              time: performance.now(),
            });

            setTimeout(() => {
              if (inputRef.current) {
                const len = restoredInput.length;
                inputRef.current.setSelectionRange(len, len);
              }
            }, 0);

            const targetWordCount = Math.max(
              1,
              isOutplay && outplayTestType === 'words'
                ? outplayWordCount
                : effectiveWords.length > 0
                ? effectiveWords.length
                : 150
            );
            const progress = Math.min(100, Math.round((prevIndex / targetWordCount) * 100));
            const elapsed = Math.max(0.003, (performance.now() - startTimePerfRef.current) / 60000);
            const liveWpmVal = Math.round(correctChars / 5 / elapsed);
            lastProgressUpdateRef.current = performance.now();
            onUpdateProgress(progress, correctChars, newErrors, liveWpmVal);
          }
        }
      }
    }
  };

  // Sub-millisecond Live WPM & Accuracy (Calculated with matching characters of current word)
  const currentTargetWord = effectiveWords[currentWordIndex] || '';
  let matchingCharsInCurrent = 0;
  for (let i = 0; i < currentInput.length && i < currentTargetWord.length; i++) {
    if (currentInput[i] === currentTargetWord[i]) matchingCharsInCurrent++;
    else break;
  }
  const totalLiveCorrect = correctChars + matchingCharsInCurrent;
  const elapsedMinutes = Math.max(0.003, (performance.now() - startTimePerfRef.current) / 60000);
  const liveWpm = hasStartedTyping ? Math.max(0, Math.round(totalLiveCorrect / 5 / elapsedMinutes)) : 0;
  const accuracy = Math.max(
    0,
    Math.round((totalLiveCorrect / Math.max(1, totalLiveCorrect + totalErrors * 5)) * 100)
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 select-none relative">
      {/* Multiplayer Finished & Spectating Announcement Banner */}
      {isMultiplayer && isUserFinished && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-slate-900/95 to-amber-500/15 border-2 border-emerald-500/50 shadow-2xl space-y-3 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                🏁
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-white text-base sm:text-lg tracking-wide">
                    BẠN ĐÃ VỀ ĐÍCH THÀNH CÔNG!
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black font-mono border border-emerald-500/40">
                    Hạng #{myPlacement > 0 ? myPlacement : 1}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Tốc độ của bạn: <strong className="text-amber-400 font-mono font-bold">{currentPlayerData?.wpm || liveWpm} WPM</strong> • Độ chính xác: <strong className="text-emerald-400 font-mono font-bold">{currentPlayerData?.accuracy ?? accuracy}%</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-500/10 px-3.5 py-1.5 rounded-xl border border-amber-500/30 shrink-0">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span>
                {remainingActiveCount > 0
                  ? `Đang theo dõi: còn ${remainingActiveCount} tuyển thủ đang đua`
                  : 'Tất cả đấu thủ đã hoàn thành'}
              </span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-300">
            <Eye className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
            <span>
              <strong>Chế độ theo dõi trực tiếp:</strong> Bạn đang trực tiếp quan sát các người chơi còn lại thi đấu. Bảng tổng kết chung sẽ tự động hiển thị đầy đủ ngay khi người cuối cùng kết thúc phần thi!
            </span>
          </div>
        </div>
      )}
      {/* 1. MONKEYTYPE CONFIGURATION BAR (Single Row, No Jumping) */}
      {isOutplay && (
        <div className="space-y-2.5">
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className={`mx-auto w-full max-w-4xl px-3 py-1.5 sm:py-0 min-h-[44px] sm:h-12 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 relative z-30 overflow-visible transition-opacity duration-200 ${
              isTyping && hasStartedTyping ? 'opacity-35 hover:opacity-100' : 'opacity-100'
            }`}
          >
            {/* Group 1: Kiểu chơi (Thời gian vs Từ ngữ) */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                id="btn-monkey-mode-time"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTestTypeChange('time');
                }}
                className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  outplayTestType === 'time'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>thời gian</span>
              </button>

              <button
                id="btn-monkey-mode-words"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTestTypeChange('words');
                }}
                className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  outplayTestType === 'words'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>số chữ</span>
              </button>
            </div>

            <div className="h-4 w-px bg-slate-800 shrink-0 hidden sm:block" />

            {/* Group 2: Số lượng (15, 30, 60, 120 HOẶC 10, 25, 50, 100) - Fixed width/height pills */}
            <div className="flex items-center gap-1 shrink-0">
              {outplayTestType === 'time' ? (
                [15, 30, 60, 120].map((t) => (
                  <button
                    key={t}
                    id={`btn-monkey-dur-${t}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDurationChange(t);
                    }}
                    className={`h-7 px-2.5 min-w-[34px] flex items-center justify-center rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      outplayDuration === t
                        ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                    }`}
                  >
                    {t}
                  </button>
                ))
              ) : (
                [10, 25, 50, 100].map((w) => (
                  <button
                    key={w}
                    id={`btn-monkey-wordcount-${w}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWordCountChange(w as 10 | 25 | 50 | 100);
                    }}
                    className={`h-7 px-2.5 min-w-[34px] flex items-center justify-center rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      outplayWordCount === w
                        ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                    }`}
                  >
                    {w}
                  </button>
                ))
              )}
            </div>

            <div className="h-4 w-px bg-slate-800 shrink-0 hidden sm:block" />

            {/* Group 3: Dropdown Chọn Bộ Từ Vựng (Custom Popover - Overflow Safe) */}
            <div className="relative shrink-0" ref={vocabDropdownRef}>
              <button
                id="select-monkey-vocab"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsGhostOpen(false);
                  setIsVocabOpen((prev) => !prev);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`h-7 px-2.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer shadow-inner ${
                  isVocabOpen
                    ? 'bg-slate-800 border-amber-400 text-amber-300 ring-1 ring-amber-400/40'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white'
                }`}
              >
                <span>{VOCAB_OPTIONS.find((v) => v.id === outplaySubMode)?.flag}</span>
                <span>{VOCAB_OPTIONS.find((v) => v.id === outplaySubMode)?.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isVocabOpen ? 'rotate-180 text-amber-400' : 'text-slate-400'}`} />
              </button>

              {isVocabOpen && (
                <div
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="absolute left-0 top-full mt-2 w-56 py-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md"
                >
                  {VOCAB_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubModeChange(item.id);
                        setIsVocabOpen(false);
                        inputRef.current?.focus();
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                        outplaySubMode === item.id
                          ? 'bg-amber-400/15 text-amber-300 font-bold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="text-sm">{item.flag}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-slate-800 shrink-0 hidden sm:block" />

            {/* Group 4: Tốc độ con trỏ quá khứ (Ghost Pace Popover - Overflow Safe) */}
            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <div className="relative shrink-0" ref={ghostDropdownRef}>
                <button
                  id="select-monkey-ghost"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsVocabOpen(false);
                    setIsGhostOpen((prev) => !prev);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`h-7 px-2 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                    isGhostOpen
                      ? 'bg-slate-800 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/40'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-cyan-300 hover:text-cyan-200'
                  }`}
                >
                  <Ghost className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{GHOST_OPTIONS.find((g) => g.id === outplayPaceMode)?.label || 'Ghost: Ván trước'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isGhostOpen ? 'rotate-180 text-cyan-400' : 'text-slate-400'}`} />
                </button>

                {isGhostOpen && (
                  <div
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-2 w-52 py-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md"
                  >
                    {GHOST_OPTIONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePaceModeChange(item.id);
                          setIsGhostOpen(false);
                          if (item.id === 'custom') {
                            setTimeout(() => {
                              customWpmInputRef.current?.focus();
                              customWpmInputRef.current?.select();
                            }, 50);
                          } else {
                            inputRef.current?.focus();
                          }
                        }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          outplayPaceMode === item.id
                            ? 'bg-cyan-500/15 text-cyan-300 font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span>{item.label}</span>
                        {outplayPaceMode === item.id && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {outplayPaceMode === 'custom' && (
                <div
                  className="flex items-center gap-1.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      const finalVal = customWpmInputVal !== null ? Number(customWpmInputVal) : outplayCustomWpm;
                      handleCustomWpmChange(finalVal);
                      setCustomWpmInputVal(null);
                      inputRef.current?.focus();
                      setIsFocused(true);
                    }
                  }}
                >
                  <CustomNumberInput
                    ref={customWpmInputRef}
                    id="input-custom-ghost-wpm"
                    size="sm"
                    min={20}
                    max={300}
                    step={5}
                    value={customWpmInputVal !== null ? Number(customWpmInputVal) : outplayCustomWpm}
                    onChange={(val) => {
                      setCustomWpmInputVal(String(val));
                      handleCustomWpmChange(val);
                    }}
                    onBlur={() => {
                      setCustomWpmInputVal(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        const finalVal = customWpmInputVal !== null ? Number(customWpmInputVal) : outplayCustomWpm;
                        handleCustomWpmChange(finalVal);
                        setCustomWpmInputVal(null);
                        inputRef.current?.focus();
                        setIsFocused(true);
                      }
                    }}
                    className="w-24"
                    focusBorderColor="focus-within:border-cyan-400"
                  />
                  <span className="text-[10px] text-cyan-400/80 font-mono font-bold">WPM</span>
                </div>
              )}
            </div>
          </div>

          {/* Redesigned Arena Status & Match Timer Banner */}
          <div className="mx-auto w-full max-w-4xl px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex items-center justify-between gap-4">
            {/* Left: Trang Chủ Button */}
            <div className="flex items-center gap-2">
              {onHome && (
                <button
                  id="btn-outplay-home"
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    onHome();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/80 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95 shrink-0"
                  title="Rời phòng trở về trang chủ"
                >
                  <Home className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Trang Chủ</span>
                </button>
              )}
            </div>

            {/* Center: Readiness / Active status */}
            <div className="flex-1 flex items-center justify-center">
              {!hasStartedTyping ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium animate-pulse">
                  <Keyboard className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">Sẵn sàng • Nhấn phím bất kỳ để bắt đầu tính giờ</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>Đang thi đấu trực tiếp</span>
                </div>
              )}
            </div>

            {/* Right: Match Timer / Progress */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {outplayTestType === 'time' ? 'Thời gian' : 'Tiến độ'}
                </div>
                <div className="font-mono font-black text-2xl sm:text-3xl leading-none mt-0.5 select-none">
                  {outplayTestType === 'time' ? (
                    <span className={timeLeft <= 5 && hasStartedTyping ? 'text-rose-400 animate-pulse' : 'text-amber-400'}>
                      {timeLeft}s
                    </span>
                  ) : (
                    <span className="text-amber-400">
                      {currentWordIndex} <span className="text-slate-600 text-lg">/</span> {outplayWordCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner thông báo đã về đích & đang quan sát trực tiếp các đối thủ còn lại */}
      {isUserFinished && isMultiplayer && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-emerald-950/70 border-2 border-emerald-500/50 shadow-xl shadow-emerald-950/50 space-y-2 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl shrink-0">
                🏁
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>BẠN ĐÃ VỀ ĐÍCH THÀNH CÔNG!</span>
                  {myPlacement > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                      Hạng #{myPlacement}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-300">
                  {remainingActiveCount > 0
                    ? `Đang trực tiếp theo dõi ${remainingActiveCount} đối thủ còn lại hoàn thành chặng đua.`
                    : 'Tất cả đối thủ đã hoàn thành chặng đua! Đang chuyển sang bảng tổng kết...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {remainingActiveCount > 0 ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-bold animate-pulse">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
                  </span>
                  <span>Chế độ quan sát (Spectating) • Đang đua: {remainingActiveCount}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                  <span>🎉 Đang tổng kết ván đấu...</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <span>💡 Hệ thống sẽ tự động tổng kết kết quả toàn bộ phòng cùng một lúc khi người cuối cùng về đích!</span>
            <span className="font-mono text-emerald-400 font-bold ml-2 shrink-0">
              Tốc độ của bạn: {liveWpm} WPM
            </span>
          </div>
        </div>
      )}

      {/* 2. STANDARD RACE TRACK & PROGRESS LANES (Hidden strictly in Outplay Yourself mode) */}
      {!isOutplay && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Flame className="w-4 h-4" /> Đường Đua Trực Tiếp: {modeName}
            </span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-slate-300 font-mono">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                {inRoomCountdown !== null ? (
                  <span className="text-amber-400 font-bold animate-pulse">
                    Đếm ngược: {inRoomCountdown === 0 ? 'XUẤT PHÁT!' : `${inRoomCountdown}s`}
                  </span>
                ) : (
                  <span>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Lanes */}
          <div className="space-y-2 pt-1">
            {players.map((p) => {
              const isMe = p.id === currentPlayerId;
              const isSurrendered = !!p.isSurrendered;
              const isFinished = !!p.isFinished;
              return (
                <div 
                  key={p.id} 
                  className={`relative flex items-center gap-3 transition-all duration-300 ${
                    isSurrendered ? 'opacity-40 grayscale' : isFinished ? 'opacity-100' : ''
                  }`}
                >
                  <div className="w-28 text-[11px] font-bold truncate text-right flex items-center justify-end gap-1">
                    {isSurrendered && <span title="Đã đầu hàng">🏳️</span>}
                    {isFinished && <span title="Đã về đích" className="text-emerald-400 font-bold">🏁</span>}
                    <span className={isSurrendered ? 'line-through text-slate-500' : isFinished ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                      {p.username}
                    </span>
                    {isMe && <span className="text-amber-400 font-bold">*</span>}
                  </div>
                  <div 
                    className={`flex-1 h-7 bg-slate-950/80 rounded-lg border relative overflow-hidden flex items-center px-1 transition-colors ${
                      isSurrendered 
                        ? 'border-slate-800 bg-slate-900/40' 
                        : isFinished 
                        ? 'border-emerald-500/50 bg-emerald-950/20' 
                        : 'border-slate-800/80'
                    }`}
                  >
                    {/* Track Progress Fill */}
                    <div
                      className={`h-full rounded-md transition-all duration-300 ${
                        isSurrendered
                          ? 'bg-slate-700/50 border-r border-slate-600 opacity-50'
                          : isFinished
                          ? 'bg-gradient-to-r from-emerald-500/20 via-emerald-400/30 to-emerald-400/40 border-r-2 border-emerald-400'
                          : isMe
                          ? 'bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-400/40 border-r-2 border-amber-400'
                          : 'bg-slate-800/40 border-r border-slate-600/60'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(2, isFinished ? 100 : p.progress))}%` }}
                    />

                    {/* Player Avatar positioned on track */}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 transition-all duration-300 text-lg flex items-center ${
                        isSurrendered ? 'filter grayscale opacity-40' : ''
                      }`}
                      style={{
                        left: `calc(${Math.min(95, Math.max(2, isFinished ? 100 : p.progress))}% - 14px)`,
                      }}
                    >
                      <span>{p.icon}</span>
                    </div>

                    {/* Finish line marker */}
                    <div className="absolute right-2 text-xs opacity-60">🏁</div>
                  </div>

                  <div className="w-24 text-right font-mono text-[11px]">
                    {isSurrendered ? (
                      <span className="text-[10px] font-bold text-rose-400/90 tracking-tight">
                        ĐẦU HÀNG
                      </span>
                    ) : isFinished ? (
                      <div className="flex flex-col items-end leading-tight">
                        <span className="text-[10px] font-black text-emerald-400 tracking-tight flex items-center gap-0.5">
                          VỀ ĐÍCH
                        </span>
                        <span className="text-[10px] text-slate-300 font-mono font-bold">
                          {p.wpm} <span className="text-[9px] text-slate-500">WPM</span>
                        </span>
                      </div>
                    ) : (
                      <>
                        <span className={`font-bold ${isMe ? 'text-amber-400' : 'text-slate-300'}`}>
                          {p.wpm}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-0.5">WPM</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Stats HUD (Session Focused: Tốc độ, Số lỗi, Tốc độ ván trước, Tốc độ cao nhất phiên) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Tốc Độ (WPM) */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center shadow-md">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span>Tốc Độ (WPM)</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono mt-0.5">{liveWpm}</div>
        </div>

        {/* 2. Số Lỗi */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center shadow-md">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Số Lỗi</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono mt-0.5">{totalErrors}</div>
        </div>

        {/* 3. Tốc Độ Ván Trước */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center shadow-md">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span>Ván Trước</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-400 font-mono mt-0.5">
            {lastGameWpm && lastGameWpm > 0 ? (
              <span>
                {lastGameWpm} <span className="text-xs font-normal text-slate-400">WPM</span>
              </span>
            ) : (
              <span className="text-slate-500 font-sans font-medium text-lg">---</span>
            )}
          </div>
        </div>

        {/* 4. Tốc Độ Cao Nhất Phiên Này */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center shadow-md">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span>Cao Nhất</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-yellow-400 font-mono mt-0.5">
            {sessionBestWpm && sessionBestWpm > 0 ? (
              <span>
                {sessionBestWpm} <span className="text-xs font-normal text-slate-400">WPM</span>
              </span>
            ) : (
              <span className="text-slate-500 font-sans font-medium text-lg">---</span>
            )}
          </div>
        </div>
      </div>

      {/* Anti-Cheat Warning Toast */}
      {cheatWarning && (
        <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/60 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 animate-bounce">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{cheatWarning}</span>
        </div>
      )}

      {/* Virtual 3-Line System Display Container (Monkeytype 3-Line Viewport) */}
      <div 
        onClick={handleArenaClick}
        className="p-6 rounded-2xl border shadow-2xl relative overflow-hidden cursor-text transition-colors duration-200"
        style={{
          backgroundColor: 'var(--theme-card, #131722)',
          borderColor: 'var(--theme-border, #1e293b)',
        }}
      >
        {/* Multiplayer In-Room 3s Countdown Overlay */}
        {inRoomCountdown !== null && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-[2px] rounded-2xl select-none">
            <div
              key={inRoomCountdown}
              className="text-8xl sm:text-9xl font-black text-amber-400 font-mono drop-shadow-[0_0_35px_rgba(251,191,36,0.7)] animate-pulse"
            >
              {inRoomCountdown === 0 ? 'XUẤT PHÁT!' : inRoomCountdown}
            </div>
            <div className="mt-4 px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-300 font-mono text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>{inRoomCountdown === 0 ? 'Bắt đầu ván đấu!' : 'Chuẩn bị bàn phím...'}</span>
            </div>
          </div>
        )}

        {/* Monkeytype Unfocused Overlay - ONLY during an active test where typing has started */}
        {!isFocused && hasStartedTyping && !isPlayerSurrendered && timeLeft > 0 && !isVocabOpen && !isGhostOpen && inRoomCountdown === null && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleArenaClick();
            }}
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] z-40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200"
          >
            <MousePointerClick className="w-7 h-7 text-amber-400 animate-bounce" />
            <span className="text-sm sm:text-base font-bold text-white tracking-wide">
              Nhấp chuột hoặc gõ phím bất kỳ để tập trung (Focus)
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Bấm để tiếp tục theo dõi con trỏ Monkeytype từng ký tự
            </span>
          </div>
        )}

        {/* 3-Line Clipped Window Container */}
        <div
          ref={wordsContainerRef}
          className="relative overflow-hidden h-[144px] text-xl sm:text-2xl select-none"
          style={{ fontFamily: 'var(--typing-font, "JetBrains Mono", monospace)' }}
        >
          {/* Virtual Shifting Stream */}
          <div
            ref={wordsStreamRef}
            className="relative flex flex-wrap transition-transform duration-150 ease-out"
            style={{
              transform: `translateY(-${lineOffsetY}px)`,
              rowGap: '0px',
              columnGap: '16px',
            }}
          >
            {/* Monkeytype Smooth Caret */}
            {!isPlayerSurrendered && (
              <MonkeytypeCaret
                caretPos={caretPos}
                isTyping={isTyping}
                isFocused={isFocused}
              />
            )}

            {/* Outplay Ghost / Pace Caret (Past Session Replay / Custom Target) */}
            {isOutplay && !isPlayerSurrendered && ghostCaretPos && (
              <GhostCaret
                caretPos={ghostCaretPos}
                label={
                  outplayPaceMode === 'pb'
                    ? 'PB'
                    : outplayPaceMode === 'last'
                    ? 'Ván trước'
                    : 'Mục tiêu'
                }
                wpm={ghostInfo.refWpm}
              />
            )}

            {effectiveWords.map((word, absIdx) => (
              <WordItem
                key={absIdx}
                word={word}
                absIdx={absIdx}
                status={wordStatuses[absIdx]}
                isCurrent={absIdx === currentWordIndex}
                isPast={absIdx < currentWordIndex}
                currentInput={absIdx === currentWordIndex ? currentInput : ''}
                pastTypedWord={wordHistoryRef.current[absIdx]?.typedWord}
              />
            ))}
          </div>
        </div>

        {/* Controlled Hidden/Focused Input with Composition API */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              id="typing-input-box"
              ref={inputRef}
              type="text"
              value={currentInput}
              disabled={isUserFinished || isPlayerSurrendered || timeLeft <= 0 || inRoomCountdown !== null}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onFocus={() => setIsFocused(true)}
              onBlur={(e) => {
                const related = e.relatedTarget as HTMLElement | null;
                if (related && related.closest('select, button, input')) {
                  return;
                }
                if (hasStartedTyping && timeLeft > 0) {
                  setIsFocused(false);
                }
              }}
              onPaste={(e) => e.preventDefault()}
              placeholder={
                isUserFinished
                  ? `🏁 Bạn đã về đích thành công! Đang trực tiếp theo dõi ${remainingActiveCount} đấu thủ còn lại...`
                  : isPlayerSurrendered
                  ? "Bạn đã đầu hàng ván đấu này."
                  : inRoomCountdown !== null
                  ? `Trận đấu sẽ bắt đầu sau ${inRoomCountdown === 0 ? 'giây lát' : `${inRoomCountdown}s`}...`
                  : isOutplay && !hasStartedTyping
                  ? "Gõ phím bất kỳ để bắt đầu tính giờ..."
                  : "Nhập chữ ở đây và bấm Cách (Space) để qua từ..."
              }
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-amber-500/50 text-white font-['JetBrains_Mono',monospace] text-base sm:text-lg outline-none focus:ring-2 focus:ring-amber-400/60 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Action buttons - Harmonized h-12 height */}
          {isOutplay && (
            <button
              id="btn-arena-restart"
              type="button"
              disabled={isMultiplayer && isUserFinished}
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isMultiplayer && isUserFinished) return;
                handleResetOutplay();
                inputRef.current?.focus();
                setIsFocused(true);
              }}
              title="Gõ lại từ đầu"
              className="h-12 w-12 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}

          {isUserFinished ? (
            <div className="h-12 px-3 sm:px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 select-none">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Đã Về Đích</span>
            </div>
          ) : (
            <button
              id="btn-arena-surrender"
              type="button"
              onClick={openSurrenderModal}
              disabled={isPlayerSurrendered || timeLeft <= 0}
              title="Đầu hàng (Phím tắt: Esc)"
              className="h-12 px-3 sm:px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">Đầu Hàng (Esc)</span>
            </button>
          )}
        </div>

        {/* Engine indicators footer */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-emerald-400">
            <Sparkles className="w-3 h-3" /> Virtual 3-Line Engine • 0% Drop-Frame
          </span>
        </div>
      </div>

      {/* Surrendered Notice Banner for Current Player - Placed at the very bottom of the screen */}
      {isPlayerSurrendered && (
        <div className="fixed bottom-4 inset-x-4 max-w-2xl mx-auto z-40 p-4 rounded-2xl bg-slate-900/95 border-2 border-rose-500/60 shadow-2xl backdrop-blur-md text-center space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-center gap-2 text-rose-300 font-bold text-sm">
            <Flag className="w-4 h-4 text-rose-400" />
            <span>Bạn đã đầu hàng ván đấu này.</span>
          </div>
          <p className="text-xs text-slate-400">
            {isMultiplayer
              ? 'Bạn có thể nhấn "Đấu lại" để trở lại phòng chờ (avatar của bạn sẽ sáng lên) hoặc về trang chủ để rời phòng.'
              : 'Bạn có thể xem bảng kết quả, chơi lại ván mới hoặc quay về trang chủ ngay.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              id="btn-surrender-restart-game"
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
            {onHome && (
              <button
                id="btn-surrender-home"
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
            {!isMultiplayer && (
              <button
                id="btn-surrender-view-summary"
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  if (!isFinishedRef.current) {
                    isFinishedRef.current = true;
                    const elapsedSeconds = Math.max(0.1, (performance.now() - startTimePerfRef.current) / 1000);
                    const normalizedChart = normalizeChartTimeline(
                      performanceTimelineRef.current,
                      elapsedSeconds,
                      liveWpm,
                      isOutplay ? sessionBestWpm : undefined
                    );
                    onFinish(correctChars, totalErrors, keystrokesRef.current, liveConsistency, {
                      lastWpm: (lastGameWpm && lastGameWpm > 0) ? lastGameWpm : undefined,
                      sessionBestWpm: isOutplay ? sessionBestWpm : undefined,
                      finalWpm: liveWpm,
                      elapsedSeconds,
                      chartData: normalizedChart,
                    });
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Xem Bảng Xếp Hạng</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Surrender Confirmation Modal with Esc & Enter Support */}
      {showSurrenderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-5 text-center relative overflow-hidden">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Flag className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-white">Xác Nhận Đầu Hàng?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bạn có chắc chắn muốn bỏ cuộc ván đấu này không? Sau khi xác nhận, bạn có thể xem bảng kết quả, chơi ván mới hoặc quay về trang chủ.
              </p>
            </div>

            <div className="py-2.5 px-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-amber-300/90 flex items-center justify-center gap-2">
              <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-white font-bold">Enter</span>
              <span>Xác nhận nhanh</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-white font-bold">Esc</span>
              <span>Hủy & gõ tiếp</span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                id="btn-cancel-surrender"
                type="button"
                onClick={cancelSurrender}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Hủy Bỏ (Esc)
              </button>
              <button
                id="btn-confirm-surrender"
                type="button"
                onClick={confirmSurrender}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer"
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

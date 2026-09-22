import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MysteryWordItem, Player, MysteryWordGameStats, MysteryWordRoundResult } from '../types';
import { soundFx } from '../utils/audio';
import { MonkeytypeCaret } from './MonkeytypeCaret';
import { Lightbulb, Clock, Trophy, ArrowRight, MousePointerClick, Flag, RotateCcw, Home, AlertTriangle } from 'lucide-react';

interface MysteryWordArenaProps {
  roundItems: MysteryWordItem[];
  totalRounds: number;
  revealIntervalSec: number;
  roundDurationSec: number;
  players: Player[];
  currentPlayerId: string;
  onFinishRound: (round: number, scoreEarned: number, correct: boolean, playerId?: string) => void;
  onFinishGame: (stats?: MysteryWordGameStats) => void;
  onSurrender?: () => void;
  onRestart?: () => void;
  onHome?: () => void;
  isMultiplayer?: boolean;
}

export const MysteryWordArena: React.FC<MysteryWordArenaProps> = ({
  roundItems,
  totalRounds,
  revealIntervalSec,
  roundDurationSec,
  players,
  currentPlayerId,
  onFinishRound,
  onFinishGame,
  onSurrender,
  onRestart,
  onHome,
  isMultiplayer = false,
}) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [revealedChars, setRevealedChars] = useState<(string | null)[]>([]);
  const [guessInput, setGuessInput] = useState('');
  const [roundTimeLeft, setRoundTimeLeft] = useState(roundDurationSec);
  const [isRoundSolved, setIsRoundSolved] = useState(false);
  const [solvedMessage, setSolvedMessage] = useState<string | null>(null);
  const [roundScore, setRoundScore] = useState(0);
  const [isSurrendered, setIsSurrendered] = useState(false);
  const [hasFinishedGame, setHasFinishedGame] = useState(false);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const showSurrenderModalRef = useRef(false);
  const [roundSolvers, setRoundSolvers] = useState<{ id: string; rank: number; pts: number; name: string }[]>([]);

  const isRoundSolvedRef = useRef(false);
  const revealedCharsRef = useRef<(string | null)[]>([]);

  // Performance & deduction capability stats tracking
  const historyRef = useRef<MysteryWordRoundResult[]>([]);
  const roundStartTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    isRoundSolvedRef.current = isRoundSolved;
  }, [isRoundSolved]);

  useEffect(() => {
    revealedCharsRef.current = revealedChars;
  }, [revealedChars]);

  // Monkeytype Caret State & Focus
  const [caretPos, setCaretPos] = useState<{ x: number; y: number; height?: number } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const typingTimeoutRef = useRef<number | null>(null);
  const wordContainerRef = useRef<HTMLDivElement>(null);

  const currentItem = roundItems[currentRound - 1] || { word: '', hint: '' };
  const targetWord = currentItem.word.trim();
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);

  // Surrender action handlers with Esc + Enter support
  const openSurrenderModal = useCallback(() => {
    if (isSurrendered) return;
    soundFx.playKeyClick(false);
    showSurrenderModalRef.current = true;
    setShowSurrenderModal(true);
  }, [isSurrendered]);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Modal is open: Enter to confirm surrender, Escape to cancel
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
        if (!isSurrendered && onSurrender) {
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
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isSurrendered, onSurrender, openSurrenderModal, confirmSurrender, cancelSurrender, showSurrenderModal]);

  // Cập nhật vị trí con trỏ Monkeytype từng ký tự trong ô phán đoán
  const updateCaret = useCallback(() => {
    if (!wordContainerRef.current || isRoundSolved) return;
    const container = wordContainerRef.current;
    const containerRect = container.getBoundingClientRect();

    const streamEl = container.querySelector('[data-mystery-stream="true"]') as HTMLElement | null;
    if (!streamEl) return;

    let targetRect: DOMRect | null = null;
    let isAfter = false;

    if (guessInput.length === 0) {
      targetRect = streamEl.getBoundingClientRect();
      const x = 16;
      const y = targetRect.top - containerRect.top;
      setCaretPos({ x, y, height: 28 });
      return;
    }

    const lastChar = streamEl.querySelector(`[data-char-idx="${guessInput.length - 1}"]`);
    if (lastChar) {
      targetRect = lastChar.getBoundingClientRect();
      isAfter = true;
    }

    if (targetRect) {
      const x = isAfter ? targetRect.right - containerRect.left : targetRect.left - containerRect.left;
      const y = targetRect.top - containerRect.top;
      const height = Math.max(24, Math.min(36, targetRect.height || 28));
      setCaretPos({ x, y, height });
    }
  }, [guessInput, isRoundSolved]);

  useEffect(() => {
    window.addEventListener('resize', updateCaret);
    return () => {
      window.removeEventListener('resize', updateCaret);
    };
  }, [updateCaret]);

  useEffect(() => {
    updateCaret();
  }, [guessInput, isRoundSolved, updateCaret]);

  const finishEntireGame = useCallback(() => {
    const history = historyRef.current;
    const correctGuesses = history.filter((h) => h.isCorrect).length;
    const accuracyRate = totalRounds > 0 ? Math.round((correctGuesses / totalRounds) * 100) : 0;
    const totalScore = history.reduce((sum, h) => sum + h.pts, 0);
    const totalBonusLetters = history.reduce((sum, h) => sum + h.hiddenCount, 0);
    const correctSolves = history.filter((h) => h.isCorrect && h.solveTimeSec);
    const fastestGuessSec = correctSolves.length > 0 ? Math.min(...correctSolves.map((h) => h.solveTimeSec!)) : null;

    const stats: MysteryWordGameStats = {
      totalRounds,
      correctGuesses,
      accuracyRate,
      totalScore,
      totalBonusLetters,
      fastestGuessSec,
      roundHistory: [...history],
    };
    setHasFinishedGame(true);
    onFinishGame(stats);
  }, [totalRounds, onFinishGame]);

  const nextRound = useCallback(() => {
    if (currentRound >= totalRounds) {
      finishEntireGame();
    } else {
      setCurrentRound((r) => r + 1);
    }
  }, [currentRound, totalRounds, finishEntireGame]);

  // Initialize round
  useEffect(() => {
    setIsRoundSolved(false);
    isRoundSolvedRef.current = false;
    setSolvedMessage(null);
    setGuessInput('');
    setRoundTimeLeft(roundDurationSec);
    roundStartTimeRef.current = performance.now();

    // Initial revealed array preserving spaces
    const initialRevealed = targetWord.split('').map((c) => (c === ' ' ? ' ' : null));
    setRevealedChars(initialRevealed);
    revealedCharsRef.current = initialRevealed;

    // Auto reveal letters progressively
    const unrevealedIndices: number[] = [];
    targetWord.split('').forEach((c, idx) => {
      if (c !== ' ') unrevealedIndices.push(idx);
    });

    const revealTimer = setInterval(() => {
      if (isRoundSolvedRef.current) return;
      if (unrevealedIndices.length > 0) {
        const randIdx = Math.floor(Math.random() * unrevealedIndices.length);
        const charIdx = unrevealedIndices.splice(randIdx, 1)[0];
        const char = targetWord[charIdx];

        setRevealedChars((prev) => {
          const updated = [...prev];
          updated[charIdx] = char;
          revealedCharsRef.current = updated;
          return updated;
        });
      }
    }, revealIntervalSec * 1000);

    // Round countdown
    const countdownTimer = setInterval(() => {
      if (isRoundSolvedRef.current) return;
      setRoundTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    if (!isSurrendered) {
      inputRef.current?.focus();
    }

    return () => {
      clearInterval(revealTimer);
      clearInterval(countdownTimer);
    };
  }, [currentRound, targetWord, revealIntervalSec, roundDurationSec]);

  // Stable bot key so player score changes don't cancel active bot deduction timers
  const botKey = players
    .filter((p) => p.isBot)
    .map((p) => `${p.id}:${p.botTargetWpm}`)
    .join('|');

  // Bot deduction simulation in Mystery Word
  useEffect(() => {
    if (!targetWord) return;
    const botPlayers = players.filter((p) => p.isBot);
    if (botPlayers.length === 0) return;

    const botTimeouts: NodeJS.Timeout[] = [];
    botPlayers.forEach((bot) => {
      const wpm = bot.botTargetWpm || 65;
      // High chance of bot finding the answer as letters unlock
      const willSolve = Math.random() < Math.min(0.92, 0.65 + (wpm / 150) * 0.25);
      if (!willSolve) return;

      // Realistic delay: bots deduce answer after letters start revealing
      const baseDelay = Math.max(5.5, Math.min(roundDurationSec - 3, 20 - (wpm / 120) * 11));
      const jitter = (Math.random() * 4) - 2;
      const finalDelaySec = Math.max(4.5, Math.min(roundDurationSec - 2, baseDelay + jitter));
      const delayMs = Math.round(finalDelaySec * 1000);

      const timer = setTimeout(() => {
        if (isRoundSolvedRef.current) return;
        isRoundSolvedRef.current = true;
        setIsRoundSolved(true);

        // Fully reveal the word
        setRevealedChars(targetWord.split(''));

        // Calculate points based on remaining hidden characters
        const hiddenCount = revealedCharsRef.current.filter((c) => c === null).length;
        const points = Math.max(3, 5 + hiddenCount);

        setRoundSolvers([{ id: bot.id, rank: 1, pts: points, name: bot.username }]);
        setSolvedMessage(`🤖 ${bot.username} đã đoán đúng từ bí mật: "${targetWord}" (+${points} điểm)!`);
        onFinishRound(currentRound, points, false, bot.id);

        historyRef.current.push({
          round: currentRound,
          word: targetWord,
          category: currentItem.hint,
          isCorrect: false,
          solverName: bot.username,
          pts: 0,
          hiddenCount: 0,
        });

        if (currentRound >= totalRounds) {
          finishEntireGame();
        } else {
          setTimeout(() => {
            nextRound();
          }, 2500);
        }
      }, delayMs);

      botTimeouts.push(timer);
    });

    return () => {
      botTimeouts.forEach((t) => clearTimeout(t));
    };
  }, [currentRound, targetWord, botKey, roundDurationSec, onFinishRound, nextRound, totalRounds, finishEntireGame, currentItem.hint]);

  // Round timeout handler triggered safely when roundTimeLeft reaches 0 (vòng cuối thì kết thúc và tổng kết ngay)
  useEffect(() => {
    if (roundTimeLeft <= 0 && !isRoundSolvedRef.current) {
      isRoundSolvedRef.current = true;
      setIsRoundSolved(true);

      historyRef.current.push({
        round: currentRound,
        word: targetWord,
        category: currentItem.hint,
        isCorrect: false,
        solverName: 'Hết giờ',
        pts: 0,
        hiddenCount: 0,
      });

      if (currentRound >= totalRounds) {
        finishEntireGame();
      } else {
        setRevealedChars(targetWord.split(''));
        setSolvedMessage(`Hết giờ! Đáp án chính xác là: "${targetWord}"`);
        const timer = setTimeout(() => {
          nextRound();
        }, 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [roundTimeLeft, targetWord, nextRound, currentRound, totalRounds, finishEntireGame, currentItem.hint]);

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRoundSolvedRef.current || !guessInput.trim() || isSurrendered) return;

    const guess = guessInput.trim().toLowerCase();
    const correct = targetWord.toLowerCase();

    if (guess === correct) {
      isRoundSolvedRef.current = true;
      setIsRoundSolved(true);
      soundFx.playVictory();

      // Reveal all letters
      setRevealedChars(targetWord.split(''));

      // Count remaining hidden letters for bonus
      const hiddenCount = revealedCharsRef.current.filter((c) => c === null).length;
      const points = 5 + hiddenCount;
      setRoundScore((s) => s + points);

      const myPlayer = players.find((p) => p.id === currentPlayerId);
      setRoundSolvers([{ id: currentPlayerId, rank: 1, pts: points, name: myPlayer?.username || 'Bạn' }]);
      setSolvedMessage(`🎉 CHÍNH XÁC! Bạn nhận được +${points} điểm (${hiddenCount} chữ chưa mở)!`);
      onFinishRound(currentRound, points, true, currentPlayerId);

      const solveTimeSec = parseFloat(Math.max(0.5, (performance.now() - roundStartTimeRef.current) / 1000).toFixed(1));
      historyRef.current.push({
        round: currentRound,
        word: targetWord,
        category: currentItem.hint,
        isCorrect: true,
        solverName: myPlayer?.username || 'Bạn',
        pts: points,
        hiddenCount,
        solveTimeSec,
      });

      if (currentRound >= totalRounds) {
        finishEntireGame();
      } else {
        setTimeout(() => {
          nextRound();
        }, 2000);
      }
    } else {
      soundFx.playError();
      setGuessInput('');
    }
  };

  const handleSurrenderClick = () => {
    openSurrenderModal();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 select-none">
      {/* Top Header info */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center font-black">
            {currentRound}
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">
              Vòng {currentRound} / {totalRounds}
            </h3>
            <p className="text-xs text-slate-400">Đoán Chữ Bí Mật</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-sm text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{roundTimeLeft}s</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-bold text-amber-400 font-mono bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <Trophy className="w-4 h-4" />
            <span>{roundScore} đ</span>
          </div>

          {!isSurrendered && onSurrender && (
            <button
              id="btn-mystery-surrender"
              type="button"
              onClick={handleSurrenderClick}
              className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Đầu hàng ván đấu này (Esc + Enter)"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Đầu Hàng</span>
            </button>
          )}
        </div>
      </div>

      {/* Surrendered Banner */}
      {isSurrendered && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-center space-y-2 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-center gap-2 text-rose-300 font-bold text-sm">
            <Flag className="w-4 h-4 text-rose-400" />
            <span>Bạn đã đầu hàng ván đoán chữ này.</span>
          </div>
          <p className="text-xs text-slate-400">
            Ô gõ đã bị khóa. Bạn vẫn có thể tiếp tục xem các người chơi khác đoán từ cho đến khi kết thúc trận đấu, hoặc bấm nút bên dưới để chuyển tiếp:
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            {onRestart && (
              <button
                id="btn-surrender-mystery-restart"
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
                id="btn-surrender-mystery-home"
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

      {/* Banner thông báo hoàn thành tất cả câu đố & đang quan sát trực tiếp */}
      {hasFinishedGame && isMultiplayer && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-emerald-950/70 border-2 border-emerald-500/50 shadow-xl shadow-emerald-950/50 space-y-2 animate-fadeIn mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl shrink-0">
                🏁
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>BẠN ĐÃ HOÀN THÀNH TẤT CẢ CÂU ĐỐ!</span>
                </h3>
                <p className="text-xs text-slate-300">
                  Đang trực tiếp quan sát các đấu thủ còn lại giải ô chữ. Bảng tổng kết sẽ tự động mở ra khi người cuối cùng kết thúc!
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-bold animate-pulse">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
              </span>
              <span>Chế độ quan sát (Spectating)</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800/80">
            💡 Hệ thống sẽ tự động tổng kết kết quả toàn bộ phòng cùng một lúc khi tất cả người chơi hoàn thành phần thi!
          </div>
        </div>
      )}

      {/* Main Guess Box */}
      <div className="p-8 rounded-2xl bg-[#141824] border border-slate-800 shadow-2xl space-y-6 text-center">
        {/* Hint Banner */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-semibold">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Gợi ý chủ đề: {currentItem.hint || 'Không có gợi ý'}</span>
        </div>

        {/* Mystery Letters */}
        <div className="flex flex-wrap items-center justify-center gap-2 py-4">
          {revealedChars.map((char, idx) => {
            if (char === ' ') {
              return <span key={idx} className="w-6 inline-block" />;
            }
            return (
              <div
                key={idx}
                className={`w-10 h-12 sm:w-12 sm:h-14 rounded-xl border-2 flex items-center justify-center font-['JetBrains_Mono',monospace] text-2xl sm:text-3xl font-black transition-all ${
                  char
                    ? 'bg-slate-800 border-amber-400/80 text-white shadow-md scale-105'
                    : 'bg-slate-900/60 border-slate-700/60 text-transparent'
                }`}
              >
                {char || '?'}
              </div>
            );
          })}
        </div>

        {/* Feedback Alert */}
        {solvedMessage && (
          <div className="text-sm font-bold text-emerald-400 animate-bounce">
            {solvedMessage}
          </div>
        )}

        {/* Live Guess Typing Stream with Monkeytype Caret */}
        <div
          ref={wordContainerRef}
          onClick={() => {
            inputRef.current?.focus();
            setIsFocused(true);
          }}
          className="relative max-w-md mx-auto p-4 px-6 rounded-xl bg-slate-950/80 border border-purple-500/40 min-h-[64px] flex items-center justify-start cursor-text select-none overflow-hidden"
        >
          {/* Monkeytype Unfocused Overlay */}
          {!isFocused && !isRoundSolved && !isSurrendered && (
            <div
              onClick={() => {
                if (!isSurrendered) {
                  inputRef.current?.focus();
                  setIsFocused(true);
                }
              }}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] z-40 flex items-center justify-center gap-2 cursor-pointer"
            >
              <MousePointerClick className="w-5 h-5 text-purple-400 animate-bounce" />
              <span className="text-xs font-bold text-white tracking-wide">
                Nhấp chuột hoặc gõ phím để nhập câu trả lời (Focus)
              </span>
            </div>
          )}

          {!isSurrendered && (
            <MonkeytypeCaret
              caretPos={caretPos}
              isTyping={isTyping}
              isFocused={isFocused}
              colorClass="bg-purple-400"
              glowColor="rgba(192, 132, 252, 0.85)"
            />
          )}

          <div
            data-mystery-stream="true"
            className="inline-flex items-center text-2xl font-black font-['JetBrains_Mono',monospace] tracking-wider text-white"
          >
            {guessInput.length === 0 ? (
              <span className="text-slate-500 text-sm font-normal italic">
                Gõ câu trả lời của bạn...
              </span>
            ) : (
              guessInput.split('').map((char, charIdx) => {
                const isCurrent = charIdx === guessInput.length - 1;
                return (
                  <span
                    key={charIdx}
                    data-char-idx={charIdx}
                    className={`relative ${
                      isCurrent ? 'text-purple-300 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]' : 'text-slate-200'
                    }`}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                );
              })
            )}
          </div>
        </div>

        {/* Guess Form */}
        <form
          onSubmit={(e) => {
            if (isComposingRef.current) {
              e.preventDefault();
              return;
            }
            handleGuessSubmit(e);
          }}
          className="max-w-md mx-auto flex items-center gap-2"
        >
          <input
            id="input-mystery-guess"
            ref={inputRef}
            type="text"
            value={guessInput}
            onChange={(e) => {
              if (isSurrendered) return;
              setGuessInput(e.target.value);
              setIsTyping(true);
              if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 500);
            }}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={(e) => {
              if (isSurrendered) return;
              isComposingRef.current = false;
              setGuessInput(e.currentTarget.value);
              setIsTyping(true);
              if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 500);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isRoundSolved || isSurrendered || hasFinishedGame}
            readOnly={isSurrendered || hasFinishedGame}
            placeholder={
              hasFinishedGame
                ? "🏁 Bạn đã hoàn thành tất cả câu đố! Đang theo dõi các đối thủ còn lại..."
                : isSurrendered
                ? "Bạn đã đầu hàng. Đang theo dõi các người chơi khác..."
                : isRoundSolved
                ? "Vòng này đã giải xong! Đang chuyển vòng..."
                : "Nhập phán đoán của bạn và bấm Enter..."
            }
            className={`flex-1 min-w-0 h-12 px-4 rounded-xl bg-slate-950 border ${
              isSurrendered
                ? 'border-rose-500/40 text-slate-500 cursor-not-allowed'
                : 'border-purple-500/50 text-white'
            } font-medium text-base outline-none focus:ring-2 focus:ring-purple-400`}
            autoComplete="off"
            spellCheck="false"
          />
          <button
            id="btn-submit-mystery-guess"
            type="submit"
            disabled={isRoundSolved || isSurrendered}
            className="h-12 px-4 sm:px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/30 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
          >
            <span>ĐOÁN</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Live scoreboard / Danh Sách Người Chơi */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-300">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Danh Sách Người Chơi ({players.length})
          </span>
          <span className="text-[11px] text-slate-500">
            Vòng {currentRound} / {totalRounds}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {players.map((p) => {
            const isMe = p.id === currentPlayerId;
            const solver = roundSolvers.find((s) => s.id === p.id);
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
                  <span className="font-mono text-xs font-bold text-amber-400">{p.score || 0}đ</span>
                </div>
                {p.isSurrendered ? (
                  <div className="text-[10px] font-bold text-rose-400 text-right">
                    Đã đầu hàng
                  </div>
                ) : solver ? (
                  <div className="text-[11px] font-bold text-emerald-400 flex items-center justify-end gap-1">
                    {solver.rank === 1 && `🥇 Đoán đúng (+${solver.pts}đ)`}
                    {solver.rank > 1 && `✓ Đoán đúng (+${solver.pts}đ)`}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 text-right">
                    {isRoundSolved
                      ? 'Chưa giải được'
                      : p.isBot
                      ? `Đang suy đoán (~${p.botTargetWpm || 60} WPM)...`
                      : isMe
                      ? 'Đang nhập...'
                      : 'Đang suy đoán...'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
                  ? 'Bạn sẽ dừng trận đoán chữ ngay và có thể trở lại phòng chờ để chuẩn bị cho ván kế tiếp.'
                  : 'Bạn sẽ dừng trận đoán chữ ngay lập tức.'}
              </p>
              <div className="mt-2 text-[11px] text-amber-400/90 font-mono bg-amber-500/10 border border-amber-500/20 rounded-lg py-1 px-2 inline-block">
                Nhấn <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Enter</span> để xác nhận &bull; <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Esc</span> để hủy
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                id="btn-cancel-mystery-surrender"
                type="button"
                onClick={cancelSurrender}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Hủy (Esc)
              </button>
              <button
                id="btn-confirm-mystery-surrender"
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

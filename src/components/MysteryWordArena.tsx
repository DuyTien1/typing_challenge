import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MysteryWordItem, Player } from '../types';
import { soundFx } from '../utils/audio';
import { MonkeytypeCaret } from './MonkeytypeCaret';
import { Lightbulb, Clock, Trophy, ArrowRight, MousePointerClick } from 'lucide-react';

interface MysteryWordArenaProps {
  roundItems: MysteryWordItem[];
  totalRounds: number;
  revealIntervalSec: number;
  roundDurationSec: number;
  players: Player[];
  currentPlayerId: string;
  onFinishRound: (round: number, scoreEarned: number, correct: boolean) => void;
  onFinishGame: () => void;
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
}) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [revealedChars, setRevealedChars] = useState<(string | null)[]>([]);
  const [guessInput, setGuessInput] = useState('');
  const [roundTimeLeft, setRoundTimeLeft] = useState(roundDurationSec);
  const [isRoundSolved, setIsRoundSolved] = useState(false);
  const [solvedMessage, setSolvedMessage] = useState<string | null>(null);
  const [roundScore, setRoundScore] = useState(0);

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

  // Auto focus & global keypress capture
  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement !== inputRef.current &&
        !['Tab', 'Alt', 'Control', 'Meta', 'Escape'].includes(e.key) &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    updateCaret();
    const rafId = requestAnimationFrame(updateCaret);
    window.addEventListener('resize', updateCaret);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateCaret);
    };
  }, [guessInput, isRoundSolved, updateCaret]);

  const nextRound = useCallback(() => {
    if (currentRound >= totalRounds) {
      onFinishGame();
    } else {
      setCurrentRound((r) => r + 1);
    }
  }, [currentRound, totalRounds, onFinishGame]);

  // Initialize round
  useEffect(() => {
    setIsRoundSolved(false);
    setSolvedMessage(null);
    setGuessInput('');
    setRoundTimeLeft(roundDurationSec);

    // Initial revealed array preserving spaces
    const initialRevealed = targetWord.split('').map((c) => (c === ' ' ? ' ' : null));
    setRevealedChars(initialRevealed);

    // Auto reveal letters progressively
    const unrevealedIndices: number[] = [];
    targetWord.split('').forEach((c, idx) => {
      if (c !== ' ') unrevealedIndices.push(idx);
    });

    const revealTimer = setInterval(() => {
      if (unrevealedIndices.length > 0) {
        const randIdx = Math.floor(Math.random() * unrevealedIndices.length);
        const charIdx = unrevealedIndices.splice(randIdx, 1)[0];
        const char = targetWord[charIdx];

        setRevealedChars((prev) => {
          const updated = [...prev];
          updated[charIdx] = char;
          return updated;
        });
      }
    }, revealIntervalSec * 1000);

    // Round countdown
    const countdownTimer = setInterval(() => {
      setRoundTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    inputRef.current?.focus();

    return () => {
      clearInterval(revealTimer);
      clearInterval(countdownTimer);
    };
  }, [currentRound, targetWord, revealIntervalSec, roundDurationSec]);

  // Round timeout handler triggered safely when roundTimeLeft reaches 0
  useEffect(() => {
    if (roundTimeLeft <= 0 && !isRoundSolved) {
      setSolvedMessage(`Hết giờ! Đáp án chính xác là: "${targetWord}"`);
      const timer = setTimeout(() => {
        nextRound();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [roundTimeLeft, isRoundSolved, targetWord, nextRound]);

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRoundSolved || !guessInput.trim()) return;

    const guess = guessInput.trim().toLowerCase();
    const correct = targetWord.toLowerCase();

    if (guess === correct) {
      soundFx.playVictory();
      setIsRoundSolved(true);

      // Count remaining hidden letters for bonus
      const hiddenCount = revealedChars.filter((c) => c === null).length;
      const points = 5 + hiddenCount;
      setRoundScore((s) => s + points);

      setSolvedMessage(`🎉 CHÍNH XÁC! Bạn nhận được +${points} điểm (${hiddenCount} chữ chưa mở)!`);
      onFinishRound(currentRound, points, true);

      setTimeout(() => {
        nextRound();
      }, 2000);
    } else {
      soundFx.playError();
      setGuessInput('');
    }
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

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-sm text-slate-300">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{roundTimeLeft}s</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-bold text-amber-400 font-mono">
            <Trophy className="w-4 h-4" />
            <span>{roundScore} đ</span>
          </div>
        </div>
      </div>

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
          {!isFocused && !isRoundSolved && (
            <div
              onClick={() => {
                inputRef.current?.focus();
                setIsFocused(true);
              }}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] z-40 flex items-center justify-center gap-2 cursor-pointer"
            >
              <MousePointerClick className="w-5 h-5 text-purple-400 animate-bounce" />
              <span className="text-xs font-bold text-white tracking-wide">
                Nhấp chuột hoặc gõ phím để nhập câu trả lời (Focus)
              </span>
            </div>
          )}

          <MonkeytypeCaret
            caretPos={caretPos}
            isTyping={isTyping}
            isFocused={isFocused}
            colorClass="bg-purple-400"
            glowColor="rgba(192, 132, 252, 0.85)"
          />

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
              setGuessInput(e.target.value);
              setIsTyping(true);
              if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 500);
            }}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={(e) => {
              isComposingRef.current = false;
              setGuessInput(e.currentTarget.value);
              setIsTyping(true);
              if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 500);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isRoundSolved}
            placeholder="Nhập phán đoán của bạn và bấm Enter..."
            className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-purple-500/50 text-white font-medium text-base outline-none focus:ring-2 focus:ring-purple-400"
            autoComplete="off"
            spellCheck="false"
          />
          <button
            id="btn-submit-mystery-guess"
            type="submit"
            disabled={isRoundSolved}
            className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <span>ĐOÁN</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

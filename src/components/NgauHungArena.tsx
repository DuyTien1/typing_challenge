import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player } from '../types';
import { soundFx } from '../utils/audio';
import { MonkeytypeCaret } from './MonkeytypeCaret';
import { Zap, Clock, Trophy, MousePointerClick } from 'lucide-react';

interface NgauHungArenaProps {
  words: string[];
  totalRounds: number;
  roundDurationSec: number;
  intermissionDurationSec: number;
  players: Player[];
  currentPlayerId: string;
  onFinishGame: () => void;
  onUpdateScore: (points: number) => void;
}

export const NgauHungArena: React.FC<NgauHungArenaProps> = ({
  words,
  totalRounds,
  roundDurationSec,
  intermissionDurationSec,
  players,
  currentPlayerId,
  onFinishGame,
  onUpdateScore,
}) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [roundTimeLeft, setRoundTimeLeft] = useState(roundDurationSec);
  const [isIntermission, setIsIntermission] = useState(false);
  const [intermissionLeft, setIntermissionLeft] = useState(intermissionDurationSec);
  const [inputVal, setInputVal] = useState('');
  const [userFinishedThisRound, setUserFinishedThisRound] = useState(false);
  const [roundPlacement, setRoundPlacement] = useState<number | null>(null);

  // Monkeytype Caret State & Focus
  const [caretPos, setCaretPos] = useState<{ x: number; y: number; height?: number } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const typingTimeoutRef = useRef<number | null>(null);
  const wordContainerRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const targetWord = words[currentRound - 1] || '';

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

  // Cập nhật vị trí con trỏ Monkeytype từng ký tự
  const updateCaret = useCallback(() => {
    if (!wordContainerRef.current || isIntermission) return;
    const container = wordContainerRef.current;
    const containerRect = container.getBoundingClientRect();

    const wordEl = container.querySelector('[data-ngauhung-word="true"]') as HTMLElement | null;
    if (!wordEl) return;

    const wordRect = wordEl.getBoundingClientRect();
    let targetRect: DOMRect | null = null;
    let isAfter = false;

    if (inputVal.length === 0) {
      const firstChar = wordEl.querySelector('[data-char-idx="0"]');
      targetRect = firstChar ? firstChar.getBoundingClientRect() : wordRect;
    } else if (inputVal.length < targetWord.length) {
      const targetChar = wordEl.querySelector(`[data-char-idx="${inputVal.length}"]`);
      if (targetChar) {
        targetRect = targetChar.getBoundingClientRect();
      }
    } else {
      const extraChar = wordEl.querySelector('[data-char-extra-last="true"]');
      if (extraChar) {
        targetRect = extraChar.getBoundingClientRect();
        isAfter = true;
      } else {
        const lastChar = wordEl.querySelector(`[data-char-idx="${targetWord.length - 1}"]`);
        if (lastChar) {
          targetRect = lastChar.getBoundingClientRect();
          isAfter = true;
        }
      }
    }

    if (targetRect) {
      const x = isAfter ? targetRect.right - containerRect.left : targetRect.left - containerRect.left;
      const y = targetRect.top - containerRect.top;
      const height = Math.max(28, Math.min(52, targetRect.height || 42));
      setCaretPos({ x, y, height });
    }
  }, [inputVal, targetWord, isIntermission]);

  useEffect(() => {
    updateCaret();
    const rafId = requestAnimationFrame(updateCaret);
    window.addEventListener('resize', updateCaret);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateCaret);
    };
  }, [inputVal, targetWord, isIntermission, updateCaret]);

  // Round Active Countdown
  useEffect(() => {
    if (isIntermission) return;

    setUserFinishedThisRound(false);
    setRoundPlacement(null);
    setInputVal('');
    setRoundTimeLeft(roundDurationSec);
    inputRef.current?.focus();

    const timer = setInterval(() => {
      setRoundTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [currentRound, isIntermission, roundDurationSec]);

  // Trigger intermission safely when round time ends
  useEffect(() => {
    if (!isIntermission && roundTimeLeft <= 0) {
      setIsIntermission(true);
      setIntermissionLeft(intermissionDurationSec);
    }
  }, [roundTimeLeft, isIntermission, intermissionDurationSec]);

  // Intermission Countdown
  useEffect(() => {
    if (!isIntermission) return;

    const intTimer = setInterval(() => {
      setIntermissionLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(intTimer);
  }, [isIntermission]);

  // Handle intermission finish
  useEffect(() => {
    if (isIntermission && intermissionLeft <= 0) {
      if (currentRound >= totalRounds) {
        onFinishGame();
      } else {
        setCurrentRound((r) => r + 1);
        setIsIntermission(false);
      }
    }
  }, [isIntermission, intermissionLeft, currentRound, totalRounds, onFinishGame]);

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    const val = e.currentTarget.value;
    setInputVal(val);
    
    setIsTyping(true);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 500);

    soundFx.playKeyClick(false);
    checkFinishWord(val);
  };

  const checkFinishWord = (val: string) => {
    if (val.trim() === targetWord) {
      soundFx.playVictory();
      setUserFinishedThisRound(true);
      const place = 1;
      const pts = place === 1 ? 3 : place === 2 ? 2 : 1;
      setRoundPlacement(place);
      onUpdateScore(pts);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isIntermission || userFinishedThisRound) return;
    const val = e.target.value;
    setInputVal(val);

    setIsTyping(true);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 500);

    if (!isComposingRef.current) {
      soundFx.playKeyClick(false);
      checkFinishWord(val);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 select-none">
      {/* Round & Timer Header */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 flex items-center justify-center font-black">
            <Zap className="w-5 h-5 fill-yellow-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">
              Vòng {currentRound} / {totalRounds}
            </h3>
            <p className="text-xs text-slate-400">Ngẫu Hứng - Đua 1 Từ Nhanh Nhất</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-sm text-slate-300">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{isIntermission ? `Nghỉ: ${intermissionLeft}s` : `${roundTimeLeft}s`}</span>
          </div>
        </div>
      </div>

      {/* Main Rush Word Box with Monkeytype Focus */}
      <div 
        ref={wordContainerRef}
        onClick={() => {
          inputRef.current?.focus();
          setIsFocused(true);
        }}
        className="p-8 rounded-2xl bg-[#141824] border border-slate-800 shadow-2xl space-y-6 text-center relative overflow-hidden cursor-text"
      >
        {/* Monkeytype Unfocused Overlay */}
        {!isFocused && !isIntermission && !userFinishedThisRound && (
          <div
            onClick={() => {
              inputRef.current?.focus();
              setIsFocused(true);
            }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] z-40 flex flex-col items-center justify-center gap-2 cursor-pointer"
          >
            <MousePointerClick className="w-6 h-6 text-yellow-400 animate-bounce" />
            <span className="text-sm font-bold text-white tracking-wide">
              Nhấp chuột hoặc gõ phím để tập trung gõ từ (Focus)
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Con trỏ Monkeytype đang tạm dừng
            </span>
          </div>
        )}

        {isIntermission ? (
          <div className="py-8 space-y-3">
            <div className="text-xl font-bold text-amber-400 animate-pulse">
              Vòng tiếp theo sẽ bắt đầu sau: {intermissionLeft}s...
            </div>
            <p className="text-xs text-slate-400">Hãy đặt tay sẵn sàng lên bàn phím!</p>
          </div>
        ) : (
          <div className="space-y-6 relative">
            {/* Smooth Monkeytype Caret */}
            <MonkeytypeCaret
              caretPos={caretPos}
              isTyping={isTyping}
              isFocused={isFocused}
              colorClass="bg-yellow-400"
              glowColor="rgba(250, 204, 21, 0.85)"
            />

            <div className="text-4xl sm:text-5xl font-black font-['JetBrains_Mono',monospace] tracking-wider py-4 flex items-center justify-center">
              <span
                data-ngauhung-word="true"
                className="relative inline-flex items-center px-4 py-2 rounded-2xl bg-yellow-500/10 border border-yellow-500/30"
              >
                {targetWord.split('').map((char, charIdx) => {
                  const typedChar = inputVal[charIdx];
                  const isTyped = charIdx < inputVal.length;
                  const isCurrentChar = charIdx === inputVal.length;

                  let charClass = 'text-slate-500';
                  if (isTyped) {
                    charClass = typedChar === char
                      ? 'text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : 'text-rose-400 font-bold underline decoration-rose-500 decoration-2';
                  } else if (isCurrentChar) {
                    charClass = 'text-white font-bold drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]';
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

                {/* Excess characters - absolute to keep target characters stationary */}
                {inputVal.length > targetWord.length && (
                  <span
                    data-char-extra-last="true"
                    className="absolute left-full top-0 ml-1 text-rose-400 bg-rose-500/25 px-1 rounded text-3xl underline decoration-rose-500 font-bold z-10 whitespace-nowrap"
                  >
                    {inputVal.slice(targetWord.length)}
                  </span>
                )}
              </span>
            </div>

            {userFinishedThisRound && (
              <div className="text-base font-bold text-emerald-400 flex items-center justify-center gap-2 animate-bounce">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span>Bạn đã hoàn thành vòng #{currentRound}! (+3 điểm)</span>
              </div>
            )}

            <div className="max-w-md mx-auto">
              <input
                id="input-ngauhung-word"
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={handleInputChange}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={userFinishedThisRound}
                placeholder="Gõ từ trên thật nhanh..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-yellow-500/50 text-white font-['JetBrains_Mono',monospace] text-xl text-center outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>
        )}
      </div>

      {/* Live scoreboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {players.map((p, idx) => (
          <div
            key={p.id}
            className={`p-3 rounded-xl border flex items-center justify-between ${
              p.id === currentPlayerId ? 'bg-amber-500/10 border-amber-500/40' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span>{p.icon}</span>
              <span className="text-xs font-semibold text-white truncate">{p.username}</span>
            </div>
            <span className="font-mono text-xs font-bold text-amber-400">{p.score || 0}đ</span>
          </div>
        ))}
      </div>
    </div>
  );
};

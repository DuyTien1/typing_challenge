import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player } from '../types';
import { soundFx } from '../utils/audio';
import { MonkeytypeCaret } from './MonkeytypeCaret';
import { Zap, Clock, Trophy, MousePointerClick, Flag, RotateCcw, Home } from 'lucide-react';

interface NgauHungArenaProps {
  words: string[];
  totalRounds: number;
  roundDurationSec: number;
  intermissionDurationSec: number;
  players: Player[];
  currentPlayerId: string;
  onFinishGame: () => void;
  onUpdateScore: (points: number, playerId?: string) => void;
  onSurrender?: () => void;
  onRestart?: () => void;
  onHome?: () => void;
  isMultiplayer?: boolean;
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
  onSurrender,
  onRestart,
  onHome,
  isMultiplayer = false,
}) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [roundTimeLeft, setRoundTimeLeft] = useState(roundDurationSec);
  const [isIntermission, setIsIntermission] = useState(false);
  const [intermissionLeft, setIntermissionLeft] = useState(intermissionDurationSec);
  const [inputVal, setInputVal] = useState('');
  const [userFinishedThisRound, setUserFinishedThisRound] = useState(false);
  const [roundPlacement, setRoundPlacement] = useState<number | null>(null);
  const [roundFinishers, setRoundFinishers] = useState<{ id: string; rank: number; pts: number; name: string }[]>([]);
  const [isSurrendered, setIsSurrendered] = useState(false);
  const finishersRef = useRef<string[]>([]);

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
    setRoundFinishers([]);
    finishersRef.current = [];
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

  // Stable key for bot list so scores updating doesn't cancel active timers
  const botKey = players
    .filter((p) => p.isBot)
    .map((p) => `${p.id}:${p.botTargetWpm}`)
    .join('|');

  // Bot realistic racing simulation in Ngau Hung
  useEffect(() => {
    if (isIntermission || !targetWord) return;
    const botPlayers = players.filter((p) => p.isBot);
    if (botPlayers.length === 0) return;

    const botTimeouts: NodeJS.Timeout[] = [];
    botPlayers.forEach((bot) => {
      const targetWpm = bot.botTargetWpm || 65;
      // Formula: Average typing speed in chars per second is (WPM * 5) / 60
      const cps = Math.max(2, (targetWpm * 5) / 60);
      const typingTimeSec = targetWord.length / cps;
      // Realistic reaction time: 0.5s to 1.2s plus slight variability
      const reactionSec = 0.5 + (Math.random() * 0.7);
      const totalSec = Math.max(1.6, Math.min(roundDurationSec - 0.5, typingTimeSec + reactionSec));
      const delayMs = Math.round(totalSec * 1000);

      const timer = setTimeout(() => {
        if (finishersRef.current.includes(bot.id)) return;
        finishersRef.current.push(bot.id);
        const rank = finishersRef.current.length;
        const pts = rank === 1 ? 3 : rank === 2 ? 2 : rank === 3 ? 1 : 0;
        setRoundFinishers((prev) => [...prev, { id: bot.id, rank, pts, name: bot.username }]);
        if (pts > 0) {
          onUpdateScore(pts, bot.id);
        }
      }, delayMs);

      botTimeouts.push(timer);
    });

    return () => {
      botTimeouts.forEach((t) => clearTimeout(t));
    };
  }, [currentRound, isIntermission, targetWord, botKey, roundDurationSec, onUpdateScore]);

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
    if (val.trim() === targetWord && !userFinishedThisRound) {
      soundFx.playVictory();
      setUserFinishedThisRound(true);
      finishersRef.current.push(currentPlayerId);
      const place = finishersRef.current.length;
      const pts = place === 1 ? 3 : place === 2 ? 2 : place === 3 ? 1 : 0;
      setRoundPlacement(place);
      const myPlayer = players.find((p) => p.id === currentPlayerId);
      setRoundFinishers((prev) => [...prev, { id: currentPlayerId, rank: place, pts, name: myPlayer?.username || 'Bạn' }]);
      if (pts > 0) {
        onUpdateScore(pts, currentPlayerId);
      }
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-sm text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{isIntermission ? `Nghỉ: ${intermissionLeft}s` : `${roundTimeLeft}s`}</span>
          </div>

          {!isSurrendered && onSurrender && (
            <button
              id="btn-ngauhung-surrender"
              type="button"
              onClick={() => {
                setIsSurrendered(true);
                soundFx.playError();
                onSurrender();
              }}
              className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Đầu hàng ván đấu này"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Đầu Hàng</span>
            </button>
          )}

          {onRestart && (
            <button
              id="btn-ngauhung-restart"
              type="button"
              onClick={() => {
                soundFx.playKeyClick(false);
                onRestart();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              title={isMultiplayer ? 'Đấu lại (Về phòng chờ)' : 'Đấu lại'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {onHome && (
            <button
              id="btn-ngauhung-home"
              type="button"
              onClick={() => {
                soundFx.playKeyClick(false);
                onHome();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              title="Về Trang Chủ"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Surrender Banner */}
      {isSurrendered && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-center space-y-2 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-center gap-2 text-rose-300 font-bold text-sm">
            <Flag className="w-4 h-4 text-rose-400" />
            <span>Bạn đã đầu hàng ván đấu này.</span>
          </div>
          <p className="text-xs text-slate-400">
            {isMultiplayer
              ? 'Bạn có thể nhấn "Đấu lại" để trở lại phòng chờ (avatar của bạn sẽ sáng lên) hoặc về trang chủ để rời phòng.'
              : 'Bạn có thể chơi lại ván mới hoặc quay về trang chủ ngay.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            {onRestart && (
              <button
                id="btn-surrender-ngauhung-restart"
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
                id="btn-surrender-ngauhung-home"
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
                <span>
                  {roundPlacement === 1 ? '🥇 Xuất sắc! Bạn về đích Hạng 1 (+3 điểm)!' :
                   roundPlacement === 2 ? '🥈 Tuyệt vời! Bạn về đích Hạng 2 (+2 điểm)!' :
                   roundPlacement === 3 ? '🥉 Tốt lắm! Bạn về đích Hạng 3 (+1 điểm)!' :
                   `Bạn đã hoàn thành vòng #${currentRound}!`}
                </span>
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
        {players.map((p) => {
          const finisher = roundFinishers.find((f) => f.id === p.id);
          return (
            <div
              key={p.id}
              className={`p-3 rounded-xl border flex flex-col justify-between gap-1.5 transition-all ${
                p.id === currentPlayerId
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/5'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span>{p.icon}</span>
                  <span className="text-xs font-semibold text-white truncate flex items-center gap-1">
                    {p.username}
                    {p.isBot && <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 font-mono">BOT</span>}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-amber-400">{p.score || 0}đ</span>
              </div>
              {p.isSurrendered ? (
                <div className="text-[10px] font-bold text-rose-400 text-right">
                  Đã đầu hàng
                </div>
              ) : finisher ? (
                <div className="text-[11px] font-bold text-emerald-400 flex items-center justify-end gap-1">
                  {finisher.rank === 1 && '🥇 Top 1 (+3đ)'}
                  {finisher.rank === 2 && '🥈 Top 2 (+2đ)'}
                  {finisher.rank === 3 && '🥉 Top 3 (+1đ)'}
                  {finisher.rank > 3 && '✓ Hoàn thành'}
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 text-right">
                  {isIntermission ? 'Hết giờ' : 'Đang đua tốc độ...'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

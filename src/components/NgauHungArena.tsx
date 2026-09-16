import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player } from '../types';
import { soundFx } from '../utils/audio';
import { Zap, Clock, Trophy, Flag, RotateCcw, Home, AlertTriangle } from 'lucide-react';

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
  const [inRoomCountdown, setInRoomCountdown] = useState<number | null>(3);
  const [roundTimeLeft, setRoundTimeLeft] = useState(roundDurationSec);
  const [isIntermission, setIsIntermission] = useState(false);
  const [intermissionLeft, setIntermissionLeft] = useState(intermissionDurationSec);
  const [inputVal, setInputVal] = useState('');
  const [userFinishedThisRound, setUserFinishedThisRound] = useState(false);
  const [roundPlacement, setRoundPlacement] = useState<number | null>(null);
  const [roundFinishers, setRoundFinishers] = useState<{ id: string; rank: number; pts: number; name: string }[]>([]);
  const [isSurrendered, setIsSurrendered] = useState(false);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const showSurrenderModalRef = useRef(false);
  const finishersRef = useRef<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const targetWord = words[currentRound - 1] || '';

  // In-room 3s countdown before Round 1 starts
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
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [inRoomCountdown]);

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

      // 3. Auto focus input (only when not surrendered)
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

  // Round Active Countdown
  useEffect(() => {
    if (inRoomCountdown !== null || isIntermission) return;

    setUserFinishedThisRound(false);
    setRoundPlacement(null);
    setRoundFinishers([]);
    finishersRef.current = [];
    setInputVal('');
    setRoundTimeLeft(roundDurationSec);
    if (!isSurrendered) {
      inputRef.current?.focus();
    }

    const timer = setInterval(() => {
      setRoundTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [currentRound, isIntermission, roundDurationSec, isSurrendered, inRoomCountdown]);

  // Trigger intermission safely when round time ends
  useEffect(() => {
    if (inRoomCountdown === null && !isIntermission && roundTimeLeft <= 0) {
      setIsIntermission(true);
      setIntermissionLeft(intermissionDurationSec);
    }
  }, [roundTimeLeft, isIntermission, intermissionDurationSec, inRoomCountdown]);

  // Intermission Countdown (Đếm ngược 3s nghỉ trước khi qua màn mới)
  useEffect(() => {
    if (!isIntermission) return;

    const intTimer = setInterval(() => {
      setIntermissionLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(intTimer);
  }, [isIntermission]);

  // Handle intermission finish: chuyển ngay sang màn mới mà không đếm ngược thêm
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
    if (inRoomCountdown !== null || isIntermission || !targetWord) return;
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
    if (isSurrendered) return;
    isComposingRef.current = false;
    const val = e.currentTarget.value;
    setInputVal(val);
    soundFx.playKeyClick(false);
    checkFinishWord(val);
  };

  const checkFinishWord = (val: string) => {
    if (isSurrendered) return;
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

      // Khi người chơi (hoặc tất cả người chơi thực) đã hoàn thành vòng:
      // Chuyển ngay sang 3s nghỉ giải lao, không bắt đợi hết thời gian của vòng
      const activeHumans = players.filter((p) => !p.isBot && !p.isSurrendered);
      const allHumansFinished = activeHumans.every(
        (p) => p.id === currentPlayerId || finishersRef.current.includes(p.id)
      );

      if (allHumansFinished || !isMultiplayer) {
        setIsIntermission(true);
        setIntermissionLeft(intermissionDurationSec);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isIntermission || userFinishedThisRound || isSurrendered) return;
    const val = e.target.value;
    setInputVal(val);

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
              onClick={openSurrenderModal}
              className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Đầu hàng ván đấu này (Esc + Enter)"
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
            Ô gõ đã bị khóa. Bạn vẫn có thể tiếp tục xem các người chơi khác thi đấu cho đến khi kết thúc trận đấu, hoặc bấm nút bên dưới để chuyển tiếp:
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

      {/* Main Rush Word Box */}
      <div 
        onClick={() => {
          if (!isSurrendered && inRoomCountdown === null) {
            inputRef.current?.focus();
          }
        }}
        className="p-8 rounded-2xl bg-[#141824] border border-slate-800 shadow-2xl space-y-6 text-center relative overflow-hidden min-h-[260px] flex flex-col justify-center"
      >
        {/* Đếm ngược 3s trước khi bắt đầu chơi */}
        {inRoomCountdown !== null && (
          <div className="absolute inset-0 z-20 bg-[#141824]/95 backdrop-blur-sm flex flex-col items-center justify-center select-none animate-fadeIn">
            <div
              key={inRoomCountdown}
              className="text-7xl sm:text-8xl font-black text-amber-400 font-['JetBrains_Mono',monospace] animate-ping drop-shadow-[0_0_25px_rgba(251,191,36,0.6)]"
            >
              {inRoomCountdown === 0 ? 'BẮT ĐẦU!' : inRoomCountdown}
            </div>
            <div className="mt-4 text-slate-300 text-sm font-semibold tracking-wider uppercase flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>{inRoomCountdown === 0 ? 'Vào vòng 1 ngay!' : 'Chuẩn bị phím...'}</span>
            </div>
          </div>
        )}

        {isIntermission ? (
          <div className="py-8 space-y-3">
            <div className="text-2xl font-black text-amber-400 font-['JetBrains_Mono',monospace] animate-pulse">
              Nghỉ giải lao: {intermissionLeft}s...
            </div>
            <p className="text-xs text-slate-400 font-medium">Vòng mới sẽ tự động bắt đầu ngay sau khi hết 3s nghỉ!</p>
          </div>
        ) : (
          <div className="space-y-6 relative">
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
                  } else if (isCurrentChar && !isSurrendered) {
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
                disabled={inRoomCountdown !== null || userFinishedThisRound || isSurrendered}
                readOnly={isSurrendered}
                placeholder={
                  inRoomCountdown !== null
                    ? `Bắt đầu sau ${inRoomCountdown}s...`
                    : isSurrendered
                    ? "Bạn đã đầu hàng. Đang theo dõi trận đấu..."
                    : userFinishedThisRound
                    ? "Đã hoàn thành vòng này! Nghỉ ngơi chờ vòng mới..."
                    : "Gõ từ trên thật nhanh..."
                }
                className={`w-full px-4 py-3 rounded-xl bg-slate-950 border ${
                  isSurrendered
                    ? 'border-rose-500/40 text-slate-500 cursor-not-allowed'
                    : 'border-yellow-500/50 text-white'
                } font-['JetBrains_Mono',monospace] text-xl text-center outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner`}
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
                  ? 'Bạn sẽ dừng trận đấu ngẫu hứng ngay và có thể trở lại phòng chờ để chuẩn bị cho ván kế tiếp.'
                  : 'Bạn sẽ dừng ván đấu ngẫu hứng ngay lập tức.'}
              </p>
              <div className="mt-2 text-[11px] text-amber-400/90 font-mono bg-amber-500/10 border border-amber-500/20 rounded-lg py-1 px-2 inline-block">
                Nhấn <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Enter</span> để xác nhận &bull; <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Esc</span> để hủy
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                id="btn-cancel-ngauhung-surrender"
                type="button"
                onClick={cancelSurrender}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Hủy (Esc)
              </button>
              <button
                id="btn-confirm-ngauhung-surrender"
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

import React, { useState, useEffect } from 'react';
import { Player, GameMode, NgauHungGameStats, MysteryWordGameStats, BossBattleStats } from '../types';
import { soundFx } from '../utils/audio';
import { RotateCcw, Home, Users, Clock } from 'lucide-react';
import { NgauHungResultView } from './gameover/NgauHungResultView';
import { MysteryWordResultView } from './gameover/MysteryWordResultView';
import { BossResultView } from './gameover/BossResultView';
import { RaceResultView } from './gameover/RaceResultView';

interface GameOverModalProps {
  players: Player[];
  currentPlayerId: string;
  gameMode?: GameMode;
  isBossMode?: boolean;
  isBossVictory?: boolean;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
  onBackToWaitingRoom?: () => void;
  onAutoTimeoutLeave?: () => void;
  modeName: string;
  isSolo?: boolean;
  isOutplay?: boolean;
  ngauHungStats?: NgauHungGameStats | null;
  mysteryWordStats?: MysteryWordGameStats | null;
  bossBattleStats?: BossBattleStats | null;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  players,
  currentPlayerId,
  gameMode,
  isBossMode = false,
  isBossVictory = false,
  onPlayAgain,
  onBackToLobby,
  onBackToWaitingRoom,
  onAutoTimeoutLeave,
  modeName,
  isSolo = false,
  isOutplay = false,
  ngauHungStats = null,
  mysteryWordStats = null,
  bossBattleStats = null,
}) => {
  const isSpecialArenaMode =
    isBossMode ||
    gameMode === 'san_boss' ||
    gameMode === 'doan_chu' ||
    gameMode === 'ngau_hung';

  // 10s auto-leave countdown for multiplayer: nếu trong 10s không nhấn chơi lại/về phòng chờ thì xóa người chơi khỏi phòng
  const [countdown, setCountdown] = useState(10);
  const onAutoTimeoutLeaveRef = React.useRef(onAutoTimeoutLeave);

  useEffect(() => {
    onAutoTimeoutLeaveRef.current = onAutoTimeoutLeave;
  }, [onAutoTimeoutLeave]);

  useEffect(() => {
    if (isSolo) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isSolo]);

  useEffect(() => {
    if (!isSolo && countdown === 0) {
      onAutoTimeoutLeaveRef.current?.();
    }
  }, [isSolo, countdown]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 relative my-auto">
        {/* Top celebratory banner tailored for each mode */}
        <div className="text-center space-y-1.5">
          {isBossMode || gameMode === 'san_boss' ? (
            <div>
              <div className="text-5xl mb-2">{isBossVictory ? '🏆' : '💀'}</div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {isBossVictory ? 'HẮC LONG ĐÃ BỊ ĐÁNH BẠI!' : 'ĐỘI HÌNH ĐÃ THẤT THỦ!'}
              </h2>
              <p className="text-xs text-slate-400">
                {isBossVictory
                  ? 'Tinh thần chiến đấu tuyệt vời đã giải cứu đấu trường!'
                  : 'Boss quá hùng mạnh, hãy rèn luyện thêm để phục thù!'}
              </p>
            </div>
          ) : gameMode === 'ngau_hung' ? (
            <div>
              <div className="text-4xl sm:text-5xl mb-1.5">⚡</div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                HOÀN THÀNH ĐẤU TRƯỜNG NGẪU HỨNG!
              </h2>
              <p className="text-xs text-slate-400">
                Tốc độ phản xạ chớp nhoáng & khả năng dứt điểm từng vòng đấu
              </p>
            </div>
          ) : gameMode === 'doan_chu' ? (
            <div>
              <div className="text-4xl sm:text-5xl mb-1.5">🔍</div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                TỔNG KẾT ĐOÁN CHỮ BÍ MẬT!
              </h2>
              <p className="text-xs text-slate-400">
                Khả năng suy luận từ vựng & trực giác ngôn ngữ siêu tốc
              </p>
            </div>
          ) : (
            <div>
              <div className="text-4xl sm:text-5xl mb-1.5">{isSolo ? '🎯' : '🏁'}</div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {isSolo ? 'HOÀN THÀNH BÀI THI!' : 'HOÀN THÀNH CHẶNG ĐUA!'}
              </h2>
              <p className="text-xs text-slate-400">
                Chế độ: <span className="text-amber-400 font-bold">{modeName}</span>
                {isSolo && (
                  <span className="ml-1.5 px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px] font-bold border border-slate-700">
                    Solo / Outplay
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Dynamic Mode-Specific Summary Content */}
        {gameMode === 'ngau_hung' ? (
          <NgauHungResultView
            stats={ngauHungStats}
            players={players}
            currentPlayerId={currentPlayerId}
            isSolo={isSolo}
          />
        ) : gameMode === 'doan_chu' ? (
          <MysteryWordResultView
            stats={mysteryWordStats}
            players={players}
            currentPlayerId={currentPlayerId}
            isSolo={isSolo}
          />
        ) : isBossMode || gameMode === 'san_boss' ? (
          <BossResultView
            stats={bossBattleStats}
            players={players}
            currentPlayerId={currentPlayerId}
            isVictory={isBossVictory}
            isSolo={isSolo}
          />
        ) : (
          <RaceResultView
            players={players}
            currentPlayerId={currentPlayerId}
            isSolo={isSolo}
            isOutplay={isOutplay}
          />
        )}

        {/* 10s Countdown Bar for Multiplayer */}
        {!isSolo && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs text-amber-300">
              <div className="flex items-center gap-2 font-medium">
                <Clock className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                <span>Tự động rời phòng chờ nếu không thao tác tiếp:</span>
              </div>
              <div className="font-mono font-black text-sm bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-500/40 text-amber-300 shrink-0">
                {countdown}s
              </div>
            </div>
            {/* Smooth animated progress bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${Math.max(0, (countdown / 10) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Buttons */}
        <div className="pt-2 flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          <button
            id="btn-modal-back-lobby"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onBackToLobby();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Trang Chủ</span>
          </button>

          {!isSolo && !isSpecialArenaMode && onBackToWaitingRoom && (
            <button
              id="btn-modal-back-waiting-room"
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onBackToWaitingRoom();
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Phòng Chờ</span>
            </button>
          )}

          <button
            id="btn-modal-play-again"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onPlayAgain();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-102 active:scale-98 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isSolo ? 'Chơi Lại Solo' : 'Đua Tiếp'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};



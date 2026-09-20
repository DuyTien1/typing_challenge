import React, { useState, useEffect } from 'react';
import { Player, GameMode, NgauHungGameStats, MysteryWordGameStats, BossBattleStats } from '../types';
import { soundFx } from '../utils/audio';
import { RotateCcw, Home, Clock, Sparkles, Zap } from 'lucide-react';
import { NgauHungResultView } from './gameover/NgauHungResultView';
import { MysteryWordResultView } from './gameover/MysteryWordResultView';
import { BossResultView } from './gameover/BossResultView';
import { RaceResultView } from './gameover/RaceResultView';
import { CultivationState, XIANXIA_REALMS, getSubStage } from '../utils/cultivation';
import { XianxiaAchievement } from '../utils/achievements';

interface GameOverModalProps {
  players: Player[];
  currentPlayerId: string;
  gameMode?: GameMode;
  isBossMode?: boolean;
  isBossVictory?: boolean;
  isLoggedIn?: boolean;
  onOpenAuthModal?: () => void;
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
  cultivationState?: CultivationState;
  onOpenCultivation?: () => void;
  newlyUnlockedAchievements?: XianxiaAchievement[];
  onOpenProfileAchievements?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  players,
  currentPlayerId,
  gameMode,
  isBossMode = false,
  isBossVictory = false,
  isLoggedIn = false,
  onOpenAuthModal,
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
  cultivationState,
  onOpenCultivation,
  newlyUnlockedAchievements = [],
  onOpenProfileAchievements,
}) => {
  const isSpecialArenaMode =
    isBossMode ||
    gameMode === 'san_boss' ||
    gameMode === 'doan_chu' ||
    gameMode === 'ngau_hung';

  // 15s auto-leave countdown for multiplayer: nếu trong 15s không nhấn chơi lại/về phòng chờ thì xóa người chơi khỏi phòng và giữ ở giao diện tổng kết
  const [countdown, setCountdown] = useState(15);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const onAutoTimeoutLeaveRef = React.useRef(onAutoTimeoutLeave);
  const hasTriggeredTimeoutRef = React.useRef(false);

  useEffect(() => {
    onAutoTimeoutLeaveRef.current = onAutoTimeoutLeave;
  }, [onAutoTimeoutLeave]);

  useEffect(() => {
    if (isSolo) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSolo]);

  useEffect(() => {
    if (isSolo) return;
    if (countdown === 0 && !hasTriggeredTimeoutRef.current) {
      hasTriggeredTimeoutRef.current = true;
      setHasTimedOut(true);
      onAutoTimeoutLeaveRef.current?.();
    }
  }, [countdown, isSolo]);

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

        {/* Cultivation Advancement Mini Bar */}
        {cultivationState && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            {(() => {
              const realm = XIANXIA_REALMS[cultivationState.realmIndex] || XIANXIA_REALMS[0];
              const subStage = getSubStage(cultivationState.tier);
              const expPercent = Math.min(100, Math.round((cultivationState.exp / Math.max(1, cultivationState.maxExp)) * 100));

              return (
                <>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-2xl p-2 rounded-xl bg-slate-950 border border-amber-500/40 shrink-0">
                      {realm.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-amber-300">
                          {realm.name} • Tầng {cultivationState.tier} [{subStage}]
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30">
                          Cấp {cultivationState.level}/1000
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <div className="w-24 sm:w-32 h-2 bg-slate-950 rounded-full border border-slate-700/80 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
                            style={{ width: `${expPercent}%` }}
                          />
                        </div>
                        <span className="font-mono text-amber-400">{expPercent}%</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-emerald-400 font-mono">
                          ⏳ Thọ: {cultivationState.thoNguyen}
                        </span>
                      </div>
                    </div>
                  </div>

                  {onOpenCultivation && (
                    <button
                      onClick={() => {
                        soundFx.playKeyClick();
                        onOpenCultivation();
                      }}
                      className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Linh Đài Tu Tiên
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* 15s Countdown Bar for Multiplayer */}
        {!isSolo && countdown > 0 && (
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
            {/* Smooth animated progress bar scaled to 15s */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${Math.max(0, (countdown / 15) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Guest Warning Banner if not logged in */}
        {!isLoggedIn && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-left animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-amber-300">Chế độ Khách: Chưa ghi nhận vào Bảng Vàng</div>
                <p className="text-[11px] text-slate-300">Đăng nhập tài khoản để lưu kỷ lục chính thức và tùy biến hồ sơ!</p>
              </div>
            </div>
            <button
              id="btn-gameover-login-cta"
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                if (onOpenAuthModal) onOpenAuthModal();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs shrink-0 shadow-md shadow-amber-400/20 transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
            >
              Đăng nhập ngay
            </button>
          </div>
        )}

        {/* Modal Buttons - Evenly sized 2-column grid */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            id="btn-modal-back-lobby"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onBackToLobby();
            }}
            className="w-full h-11 sm:h-12 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Trang Chủ</span>
          </button>

          <button
            id="btn-modal-play-again"
            type="button"
            disabled={!isSolo && (countdown === 0 || hasTimedOut)}
            onClick={() => {
              if (!isSolo && (countdown === 0 || hasTimedOut)) return;
              soundFx.playKeyClick();
              onPlayAgain();
            }}
            className={`w-full h-11 sm:h-12 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              !isSolo && (countdown === 0 || hasTimedOut)
                ? 'bg-slate-800/50 border border-slate-800 text-slate-500 cursor-not-allowed opacity-40 shadow-none'
                : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black shadow-lg shadow-amber-500/20 hover:scale-102 active:scale-98 cursor-pointer'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isSolo ? 'Chơi Lại Solo' : 'Chơi Tiếp'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};



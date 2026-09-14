import React, { useState, useEffect } from 'react';
import { GameMode, DifficultyLevel, Player, HighScoreRecord } from '../types';
import { soundFx } from '../utils/audio';
import { AvatarTitleFrame, getPlayerTitle } from '../utils/titles';
import { PlayerSimpleProfileModal } from './PlayerSimpleProfileModal';
import { 
  Users, 
  ArrowLeft, 
  Copy, 
  Check, 
  Play, 
  UserPlus, 
  UserMinus, 
  Crown, 
  Sparkles,
  MessageSquare,
  CheckCircle2,
  Volume2,
  BookOpen,
  Info,
  Clock,
  Shield,
  RotateCcw
} from 'lucide-react';

interface WaitingRoomViewProps {
  mode: GameMode;
  modeName: string;
  difficulty: DifficultyLevel;
  onSelectDifficulty: (diff: DifficultyLevel) => void;
  players: Player[];
  currentPlayerId: string;
  onAddBot: () => void;
  onRemoveBot: () => void;
  onStartGame: () => void;
  onLeaveWaitingRoom: () => void;
  currentUsername: string;
  currentAvatar: string;
  onChangeAvatar: (emoji: string) => void;
  onChangeUsername: (name: string) => void;
  highScores?: Record<string, HighScoreRecord | null>;
  isAdmin?: boolean;
  roomId?: string;
  isHost?: boolean;
  hostId?: string;
}

interface PlayerSpeech {
  emoji: string;
  text: string;
  timestamp: number;
}

const CHEER_EMOJIS = [
  { emoji: '🔥', text: 'Chiến thôi anh em!', shortLabel: 'Chiến!' },
  { emoji: '⚡', text: 'Nhanh như chớp!', shortLabel: 'Tốc độ' },
  { emoji: '🐉', text: 'Quyết chiến Boss!', shortLabel: 'Quyết đấu' },
  { emoji: '🎯', text: 'Chuẩn 100% nhé!', shortLabel: 'Chuẩn xác' },
  { emoji: '🚀', text: 'Tăng tốc nào!', shortLabel: 'Tăng tốc' },
  { emoji: '👋', text: 'Chào cả phòng!', shortLabel: 'Xin chào' },
  { emoji: '💪', text: 'Quyết tâm vô địch!', shortLabel: 'Cố lên' },
  { emoji: '👑', text: 'Tôi sẽ giành top 1!', shortLabel: 'Top 1' },
];

export const WaitingRoomView: React.FC<WaitingRoomViewProps> = ({
  mode,
  modeName,
  difficulty,
  onSelectDifficulty,
  players,
  currentPlayerId,
  onAddBot,
  onRemoveBot,
  onStartGame,
  onLeaveWaitingRoom,
  currentUsername,
  currentAvatar,
  onChangeAvatar,
  onChangeUsername,
  highScores = {},
  isAdmin = false,
  roomId,
  isHost,
  hostId,
}) => {
  const [playerSpeeches, setPlayerSpeeches] = useState<Record<string, PlayerSpeech>>({});
  const [lastCheerTime, setLastCheerTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);
  const [inspectedPlayer, setInspectedPlayer] = useState<Player | null>(null);

  // Compute active room ID & Host status: nếu chủ phòng bị xóa/thay đổi thì slot kế tiếp được đôn lên làm chủ phòng
  const firstHumanId = players.find((p) => !p.isBot)?.id || players[0]?.id;
  const effectiveHostId = hostId || firstHumanId;
  const userIsHost = isHost !== undefined ? isHost : (effectiveHostId === currentPlayerId);
  const activeRoomId = roomId || ('VN-' + Math.abs((mode.length * 3791) % 9000 + 1000));

  // Periodic tick to clean up old speeches
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Occasional bot reactions to make the room lively (increased delay to 20s)
  useEffect(() => {
    const botTalkTimer = setInterval(() => {
      const bots = players.filter((p) => p.isBot);
      if (bots.length === 0) return;
      const randomBot = bots[Math.floor(Math.random() * bots.length)];
      const randomCheer = CHEER_EMOJIS[Math.floor(Math.random() * CHEER_EMOJIS.length)];

      setPlayerSpeeches((prev) => ({
        ...prev,
        [randomBot.id]: {
          emoji: randomCheer.emoji,
          text: randomCheer.text,
          timestamp: Date.now(),
        },
      }));
    }, 20000);

    return () => clearInterval(botTalkTimer);
  }, [players]);

  const handleCopyRoomId = () => {
    soundFx.playKeyClick();
    navigator.clipboard?.writeText?.(activeRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReaction = (emoji: string, text?: string) => {
    const now = Date.now();
    if (now - lastCheerTime < 1500) {
      return; // Cooldown 1.5s to prevent fast spamming
    }
    setLastCheerTime(now);
    soundFx.playKeyClick();
    const matched = CHEER_EMOJIS.find((c) => c.emoji === emoji);
    const speechText = text || matched?.text || 'Đang cổ vũ!';

    setPlayerSpeeches((prev) => ({
      ...prev,
      [currentPlayerId]: {
        emoji,
        text: speechText,
        timestamp: now,
      },
    }));
  };

  // Difficulty options
  const getDifficultyOptions = () => {
    if (mode === 'numpad') {
      return [
        { id: 'number' as DifficultyLevel, name: 'Chỉ Chữ Số (Number)', icon: '🔢', color: 'text-sky-400 border-sky-500/40' },
        { id: 'fullsize' as DifficultyLevel, name: 'Fullsize (+ - * / 58008)', icon: '🖩', color: 'text-amber-400 border-amber-500/40' },
      ];
    }
    if (mode === 'ngau_hung') {
      return [
        { id: 'normal' as DifficultyLevel, name: 'Bình Thường (7s - 15 Vòng)', icon: '🟡', color: 'text-yellow-400 border-yellow-500/40' },
        { id: 'legendary' as DifficultyLevel, name: 'Huyền Thoại (5s - 20 Vòng)', icon: '👑', color: 'text-rose-400 border-rose-500/40' },
      ];
    }
    if (mode === 'doan_chu') {
      return [
        { id: 'normal' as DifficultyLevel, name: 'Bình Thường (30s, Gợi ý, TV Không Dấu)', icon: '🟡', color: 'text-yellow-400 border-yellow-500/40' },
        { id: 'hard' as DifficultyLevel, name: 'Khó (14s, TV Có Dấu & EN)', icon: '🔴', color: 'text-orange-400 border-orange-500/40' },
        { id: 'legendary' as DifficultyLevel, name: 'Huyền Thoại (10s, Ẩn gợi ý)', icon: '👑', color: 'text-rose-400 border-rose-500/40' },
      ];
    }
    if (mode === 'san_boss') {
      return [
        { id: 'normal' as DifficultyLevel, name: 'Bình Thường (HP: 550+500/người, 150s)', icon: '🟡', color: 'text-yellow-400 border-yellow-500/40' },
        { id: 'hard' as DifficultyLevel, name: 'Khó (HP: 650+600/người, 130s)', icon: '🔴', color: 'text-orange-400 border-orange-500/40' },
        { id: 'hell' as DifficultyLevel, name: 'Địa Ngục (HP: 750+700/người, 120s)', icon: '💀', color: 'text-rose-500 border-rose-500/50' },
      ];
    }
    return [
      { id: 'normal' as DifficultyLevel, name: 'Tiêu Chuẩn (150 từ - 300s)', icon: '🏁', color: 'text-emerald-400 border-emerald-500/40' },
    ];
  };

  // Detailed Competition Rules based on mode
  const getModeRules = () => {
    switch (mode) {
      case 'san_boss':
        return [
          { title: 'Hợp Lực Diệt Boss', desc: 'HP Hắc Long Ma Vương tự động nhân theo số lượng người chơi trong phòng.' },
          { title: 'Phá Khiên Làm Choáng', desc: 'Khi Boss bật khiên giáp tím, hãy gõ dồn dập phá khiên để Boss bị choáng và chịu x1.5 sát thương!' },
          { title: 'Kháng Debuff', desc: 'Boss sẽ phản kích gây hiệu ứng Khói mù che khuất và Rung lắc màn hình.' },
          { title: 'Cơ Chế Tự Bạo', desc: 'Nếu bấm Đầu Hàng, nhân vật sẽ biến thành tia năng lượng tự bạo gây sát thương cảm tử lên Boss.' },
        ];
      case 'doan_chu':
        return [
          { title: 'Mở Ký Tự Theo Chu Kỳ', desc: 'Các chữ cái trong từ vựng sẽ lần lượt được lật mở theo từng giây.' },
          { title: 'Gợi Ý Chủ Đề', desc: 'Xem kỹ gợi ý danh từ/địa danh/ngành nghề để phỏng đoán đáp án nhanh nhất.' },
          { title: 'Điểm Thưởng Phán Đoán', desc: 'Đoán đúng khi còn nhiều ký tự ẩn sẽ được cộng thưởng WPM và điểm số kỷ lục.' },
        ];
      case 'ngau_hung':
        return [
          { title: 'Đua 1 Từ Chớp Nhoáng', desc: 'Mỗi vòng chỉ có duy nhất 1 từ xuất hiện. Người gõ xong đầu tiên nhận điểm cao nhất.' },
          { title: 'Số Vòng Thi Đấu', desc: 'Chế độ Bình Thường gồm 15 vòng (7s/vòng), chế độ Huyền Thoại gồm 20 vòng (5s/vòng).' },
          { title: 'Độ Chuẩn Xác Cao', desc: 'Chỉ cần gõ sai 1 ký tự sẽ mất nhịp và đánh mất vị trí dẫn đầu.' },
        ];
      case 'numpad':
        return [
          { title: 'Luyện Bàn Phím Số', desc: 'Thi đấu gõ cụm số liên tục bằng Numpad bên phải bàn phím.' },
          { title: 'Độ Khó Fullsize', desc: 'Bao gồm các phép tính cộng trừ nhân chia và mã số Easter Egg huyền thoại 58008.' },
        ];
      default:
        return [
          { title: 'Đua Tốc Độ Thời Gian Thực', desc: 'Mọi người chơi xuất phát cùng lúc sau 3 giây đếm ngược.' },
          { title: 'Giao Diện 3 Dòng', desc: 'Dòng chữ tự động cuộn mượt mà theo chuẩn thi đấu quốc tế.' },
          { title: 'Hỗ Trợ Bộ Gõ & Sửa Lỗi', desc: 'Tương thích Telex / VNI. Bấm Backspace khi ô trống để quay lại sửa từ bị sai trước đó.' },
        ];
    }
  };

  const difficulties = getDifficultyOptions();
  const rules = getModeRules();
  const maxSlots = 8;
  const emptySlotsCount = Math.max(0, maxSlots - players.length);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 animate-fadeIn">
      {/* Top Header Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#131926] to-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            id="btn-leave-waiting-room"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onLeaveWaitingRoom();
            }}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Rời phòng chờ về trang chủ"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Rời Phòng</span>
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> PHÒNG MULTIPLAYER
              </span>
              <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                Mã: {activeRoomId}
              </span>
              {userIsHost ? (
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-400" /> Chủ Phòng
                </span>
              ) : (
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-sky-400" /> Thành Viên
                </span>
              )}
              <button
                id="btn-copy-room-id"
                type="button"
                onClick={handleCopyRoomId}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="Sao chép mã phòng"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1 flex items-center gap-2">
              <span>{modeName}</span>
            </h2>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{players.length}/{maxSlots} Người chơi</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-400 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sẵn sàng</span>
          </div>
        </div>
      </div>

      {/* Difficulty Switcher (Host only settings) */}
      {difficulties.length > 1 && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Cấu hình độ khó phòng (Chủ phòng):</span>
            </label>
            <span className="text-[11px] text-slate-500">Áp dụng cho mọi người chơi trong phòng</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {difficulties.map((diff) => {
              const active = difficulty === diff.id;
              return (
                <button
                  id={`btn-room-diff-${diff.id}`}
                  type="button"
                  key={diff.id}
                  onClick={() => {
                    soundFx.playKeyClick();
                    onSelectDifficulty(diff.id);
                  }}
                  className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    active
                      ? `bg-slate-800/90 ${diff.color} ring-2 ring-amber-400/50 shadow-md`
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="text-xl">{diff.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-white truncate">
                      {diff.name}
                    </div>
                  </div>
                  {active && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Slots (Left) & Competition Rules + Profile (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Player Slots Grid with Top Header Bar including Start Match */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* HEADER BAR: SLOTS COUNT + BOT CONTROLS + START MATCH BUTTON INLINE */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Vị Trí Người Chơi
                </h3>
                <span className="text-amber-400 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded text-xs font-black">
                  {players.length}/{maxSlots}
                </span>
              </div>
            </div>

            {/* Quick Bot Controls & Start Match Button (Host only) */}
            {userIsHost ? (
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-room-add-bot"
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    onAddBot();
                  }}
                  disabled={players.length >= maxSlots}
                  className="py-1.5 px-2.5 sm:px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Thêm Bot vào phòng chờ (tối đa 8 slot)"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">+ Thêm Bot</span>
                  <span className="sm:hidden">+ Bot</span>
                </button>

                <button
                  id="btn-room-remove-bot"
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    onRemoveBot();
                  }}
                  disabled={players.filter((p) => p.isBot).length === 0}
                  className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Bớt 1 Bot"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>

                {/* START MATCH BUTTON: Inline horizontally with player count */}
                <button
                  id="btn-room-start-match"
                  type="button"
                  onClick={() => {
                    soundFx.playCountdown(true);
                    onStartGame();
                  }}
                  className="py-1.5 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all hover:scale-102 active:scale-98 cursor-pointer shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>BẮT ĐẦU TRẬN ĐẤU</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 text-xs font-semibold select-none shadow-sm">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>Chờ chủ phòng xuất phát...</span>
              </div>
            )}
          </div>

          {/* Ongoing Match Notice (when room is persisted and players are still racing or returned) */}
          {players.some((p) => p.inMatch) && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300 animate-fadeIn">
              <div className="flex items-center gap-2 font-medium">
                <Clock className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                <span>
                  Ván đấu đang diễn ra. Có <strong>{players.filter((p) => p.inMatch).length}</strong> người chơi đang thi đấu (avatar xám).
                </span>
              </div>
              <span className="text-[10px] font-bold bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 text-amber-200 shrink-0">
                Đang chờ kết thúc
              </span>
            </div>
          )}

          {/* Slots Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {players.map((p, idx) => {
              const isMe = p.id === currentPlayerId;
              const isPlayerHost = p.id === effectiveHostId;
              const isPlayerInMatch = p.inMatch === true;
              const speech = playerSpeeches[p.id];
              const isSpeaking = !!speech && (Date.now() - speech.timestamp < 7000);
              const playerTitle = getPlayerTitle(p, highScores, isAdmin, isMe);

              return (
                <div
                  key={p.id}
                  id={`player-slot-${idx}`}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 relative transition-all ${
                    isPlayerInMatch
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                      : isSpeaking
                      ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400 shadow-xl shadow-amber-500/20 z-10 scale-101'
                      : isMe
                      ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-400/40 shadow-md'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Floating Speech Bubble Badge directly above this player's position */}
                  {isSpeaking && (
                    <div className="absolute -top-3.5 left-4 sm:left-6 z-20 animate-bounce pointer-events-none">
                      <div className="relative bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-400 text-black font-black text-xs px-2.5 py-1 rounded-xl shadow-xl flex items-center gap-1.5 ring-2 ring-slate-900 border border-yellow-200">
                        <span className="text-sm leading-none">{speech.emoji}</span>
                        <span className="text-[11px] font-black truncate max-w-[130px] sm:max-w-[170px]">
                          {speech.text}
                        </span>
                        {/* Speech Bubble Tail */}
                        <div className="absolute -bottom-1 left-4 w-2.5 h-2.5 bg-yellow-400 rotate-45 border-r border-b border-amber-600/30" />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className={`relative cursor-pointer group/avatar ${
                        isPlayerInMatch
                          ? 'grayscale opacity-45 contrast-75'
                          : 'grayscale-0 opacity-100 transition-all duration-300 drop-shadow-md'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        soundFx.playKeyClick();
                        setInspectedPlayer(p);
                      }}
                      title={
                        isPlayerInMatch
                          ? `${p.username} đang trong ván đấu`
                          : `Nhấp để xem hồ sơ của ${p.username}`
                      }
                    >
                      {/* Avatar with Dynamic Title Frame & Hover Popover */}
                      <AvatarTitleFrame
                        player={p}
                        highScores={highScores}
                        isAdminUser={isAdmin}
                        isCurrentPlayer={isMe}
                        size="md"
                        onClick={(e) => {
                          e.stopPropagation();
                          soundFx.playKeyClick();
                          setInspectedPlayer(p);
                        }}
                      >
                        <div className="flex items-center justify-center">
                          {p.icon}
                        </div>
                      </AvatarTitleFrame>

                      {/* Speaking badge indicator on avatar */}
                      {isSpeaking ? (
                        <div className="absolute -bottom-1 -right-1 bg-amber-500 text-black p-0.5 rounded-full shadow-md animate-pulse z-20" title="Đang nói chuyện">
                          <MessageSquare className="w-3 h-3 fill-black" />
                        </div>
                      ) : isPlayerHost && !playerTitle ? (
                        <div className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-amber-500 text-black shadow-sm z-20" title="Chủ phòng">
                          <Crown className="w-3 h-3 fill-black" />
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            soundFx.playKeyClick();
                            setInspectedPlayer(p);
                          }}
                          className="text-xs font-black text-white hover:text-amber-400 cursor-pointer transition-colors truncate max-w-[120px] sm:max-w-[140px]"
                          title={`Xem hồ sơ ${p.username}`}
                        >
                          {p.username}
                        </span>
                        {isMe && (
                          <span className="text-[10px] bg-amber-400 text-black font-extrabold px-1.5 py-0.2 rounded shrink-0">
                            Bạn
                          </span>
                        )}
                        {playerTitle && (
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded border uppercase tracking-wider shrink-0 cursor-help ${
                              playerTitle.type === 'admin'
                                ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.3)]'
                                : 'bg-rose-500/20 border-rose-400/60 text-rose-300 shadow-[0_0_6px_rgba(244,63,94,0.3)]'
                            }`}
                            title={`Hover vào avatar để xem chi tiết danh hiệu ${playerTitle.name}`}
                          >
                            {playerTitle.tag}
                          </span>
                        )}
                        {p.isBot && !playerTitle && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700 shrink-0">
                            Bot
                          </span>
                        )}
                      </div>

                      {isSpeaking ? (
                        <div className="text-[11px] text-amber-300 font-bold flex items-center gap-1 mt-0.5 animate-pulse">
                          <Volume2 className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate max-w-[130px] sm:max-w-[160px]">
                            &ldquo;{speech.text}&rdquo;
                          </span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {isPlayerHost ? (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <Crown className="w-3 h-3 text-amber-400" /> Chủ phòng (Slot #{idx + 1})
                            </span>
                          ) : (
                            <span>Slot #{idx + 1}</span>
                          )}
                          {p.isBot && (
                            <span className="text-cyan-400 font-medium">
                              ~{p.botTargetWpm} WPM
                            </span>
                          )}
                          {!p.isBot && !isMe && !isPlayerHost && (
                            <span className="text-slate-400 font-medium">Khách</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isSpeaking ? (
                      <span className="text-[10px] font-extrabold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1 shadow-sm animate-pulse">
                        <MessageSquare className="w-2.5 h-2.5" /> Đang nói
                      </span>
                    ) : isPlayerInMatch ? (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-amber-400 animate-spin" /> Đang thi đấu...
                      </span>
                    ) : p.isSurrendered ? (
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 shadow-sm">
                        <RotateCcw className="w-2.5 h-2.5 text-amber-400" /> Đã về phòng chờ
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Sẵn sàng
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty Slots */}
            {Array.from({ length: emptySlotsCount }).map((_, i) => (
              <div
                key={`empty-${i}`}
                id={`empty-slot-${i}`}
                onClick={() => {
                  if (userIsHost && players.length < maxSlots) {
                    soundFx.playKeyClick();
                    onAddBot();
                  }
                }}
                className={`p-3.5 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 select-none transition-all ${
                  userIsHost
                    ? 'border-slate-800/80 bg-slate-950/30 hover:border-amber-500/60 hover:bg-amber-500/5 cursor-pointer text-slate-500 hover:text-amber-300'
                    : 'border-slate-800/50 bg-slate-950/20 cursor-default text-slate-600'
                }`}
                title={userIsHost ? 'Bấm vào đây để thêm 1 Bot vào slot này' : 'Chờ người chơi tham gia'}
              >
                {userIsHost ? (
                  <UserPlus className="w-4 h-4 text-amber-400/80" />
                ) : (
                  <Users className="w-4 h-4 text-slate-700" />
                )}
                <span className="text-xs font-semibold">
                  Slot #{players.length + i + 1}: {userIsHost ? 'Trống • Bấm để thêm Bot' : 'Chờ người chơi tham gia...'}
                </span>
              </div>
            ))}
          </div>

          {/* CHEER & TALK: COMPACTED NEATLY IN EXACTLY 2 LINES */}
          <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
            {/* Line 1: Header + subtitle */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Cổ vũ & Nói chuyện nhanh:
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Bấm icon để hiện bóng thoại trực tiếp trên vị trí người chơi
              </span>
            </div>
            {/* Line 2: Single compact row of 8 cheer buttons */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {CHEER_EMOJIS.map((item) => (
                <button
                  key={item.emoji}
                  id={`btn-reaction-${item.emoji}`}
                  type="button"
                  onClick={() => handleReaction(item.emoji, item.text)}
                  className="py-1 px-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700/70 flex items-center justify-center gap-1 text-xs font-semibold transition-all hover:border-amber-400/50 hover:text-white cursor-pointer truncate"
                  title={item.text}
                >
                  <span className="text-sm leading-none">{item.emoji}</span>
                  <span className="text-[10px] font-bold text-slate-300 truncate">{item.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Competition Rules & Host Profile */}
        <div className="space-y-4">
          {/* 1. COMPETITION RULES (QUY TẮC THI ĐẤU) IN WAITING ROOM */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Quy Tắc Thi Đấu: {modeName}</span>
              </h4>
              <span className="text-[10px] text-amber-400 font-extrabold bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/30">
                Multiplayer
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {rules.map((rule, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                  <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>{rule.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-3 leading-relaxed">
                    {rule.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
              <span>Chủ phòng có thể bổ sung tối đa 8 bot để cùng luyện tập thi đấu trước khi bấm Bắt đầu!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Profile Modal for inspecting any player in the waiting room */}
      <PlayerSimpleProfileModal
        isOpen={!!inspectedPlayer}
        player={inspectedPlayer}
        isHost={inspectedPlayer ? players[0]?.id === inspectedPlayer.id : false}
        isMe={inspectedPlayer ? inspectedPlayer.id === currentPlayerId : false}
        highScores={highScores || {}}
        isAdminUser={Boolean(isAdmin)}
        onClose={() => setInspectedPlayer(null)}
      />
    </div>
  );
};

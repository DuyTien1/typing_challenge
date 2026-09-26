import React, { useState, useEffect, useRef } from 'react';
import { 
  ChatMessage, 
  ChatChannel, 
  ChatCardType, 
  ChatCardData 
} from '../types';
import { soundFx } from '../utils/audio';
import { AvatarWithFrame } from '../utils/frames';
import { 
  Send, 
  X, 
  MessageSquare, 
  Sparkles, 
  Crown, 
  Trash2, 
  Users, 
  Swords, 
  Castle, 
  Smile, 
  Dice5, 
  Trophy, 
  ShieldCheck, 
  Heart,
  ChevronRight,
  ExternalLink,
  Flame,
  Award
} from 'lucide-react';

interface ChatDrawerProps {
  messages: ChatMessage[];
  currentUsername: string;
  currentUserAvatar?: string;
  currentUserFrame?: string;
  currentUserId?: string;
  currentRoomId?: string | null;
  currentSectId?: string;
  currentSectName?: string;
  currentSectTag?: string;
  currentRealmName?: string;
  currentRealmIcon?: string;
  bestWpm?: number;
  bestWpmRecord?: any;
  cultivationState?: any;
  isAdmin?: boolean;
  onSendMessage: (params: {
    message: string;
    channel: ChatChannel;
    whisperTarget?: string;
    whisperTargetUserId?: string;
    cardType?: ChatCardType;
    cardData?: ChatCardData;
  }) => void;
  onClearChat?: () => void;
  onClose: () => void;
  onOpenCultivation?: () => void;
  onAcceptBattleChallenge?: (challenge: ChatCardData) => void;
  initialChannel?: ChatChannel;
  initialWhisperTarget?: { username: string; userId: string };
  onOpenFriends?: () => void;
}

const SLASH_COMMANDS = [
  { cmd: '/roll', desc: 'Lắc xí ngầu độ duyên (1-100)', icon: '🎲', insert: '/roll ' },
  { cmd: '/w', desc: 'Mật đàm riêng tới đạo hữu (/w <tên> <nội dung>)', icon: '✉️', insert: '/w ' },
  { cmd: '/phapbao', desc: 'Khoe thần binh pháp bảo bản mệnh', icon: '⚔️', insert: '/phapbao' },
  { cmd: '/dan', desc: 'Khoe đan dược cực phẩm vừa luyện', icon: '🔮', insert: '/dan' },
  { cmd: '/pvp', desc: 'Phát chiến thư khiêu chiến 1v1', icon: '⚡', insert: '/pvp' },
];

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  messages,
  currentUsername,
  currentUserAvatar,
  currentUserFrame,
  currentUserId,
  currentRoomId,
  currentSectId,
  currentSectName,
  currentSectTag,
  currentRealmName,
  currentRealmIcon,
  bestWpm = 0,
  bestWpmRecord,
  cultivationState,
  isAdmin = false,
  onSendMessage,
  onClearChat,
  onClose,
  onOpenCultivation,
  onAcceptBattleChallenge,
  initialChannel = 'global',
  initialWhisperTarget,
  onOpenFriends,
}) => {
  const [activeChannel, setActiveChannel] = useState<ChatChannel>(initialChannel);
  const [inputText, setInputText] = useState('');
  const [spamCooldown, setSpamCooldown] = useState(0);
  const [whisperTargetUser, setWhisperTargetUser] = useState<{ username: string; userId: string } | null>(initialWhisperTarget || null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [challengeMode, setChallengeMode] = useState<string>('vi_dau');
  const [challengeStake, setChallengeStake] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Sync initial target if provided
  useEffect(() => {
    if (initialWhisperTarget) {
      setWhisperTargetUser(initialWhisperTarget);
      setActiveChannel('whisper');
    }
  }, [initialWhisperTarget]);

  const xianxiaEmojis = [
    { icon: '🍵', title: 'Uống trà ngộ đạo', text: '🍵 [Uống trà ngộ đạo]' },
    { icon: '⚡', title: 'Thiên kiếp giáng lâm', text: '⚡ [Thiên kiếp giáng lâm]' },
    { icon: '💥', title: 'Tẩu hỏa nhập ma', text: '💥 [Tẩu hỏa nhập ma]' },
    { icon: '🧘', title: 'Bế quan tu luyện', text: '🧘 [Bế quan tu luyện]' },
    { icon: '👑', title: 'Độc bá thiên hạ', text: '👑 [Độc bá thiên hạ]' },
    { icon: '⚔️', title: 'Vạn kiếm quy tông', text: '⚔️ [Vạn kiếm quy tông]' },
    { icon: '🪷', title: 'Tâm như chỉ thủy', text: '🪷 [Tâm như chỉ thủy]' },
    { icon: '🐉', title: 'Long ngâm cửu thiên', text: '🐉 [Long ngâm cửu thiên]' },
    { icon: '🍶', title: 'Nâng chén tiêu sầu', text: '🍶 [Nâng chén tiêu sầu]' },
    { icon: '🔮', title: 'Kết đan viên mãn', text: '🔮 [Kết đan viên mãn]' },
    { icon: '📜', title: 'Thiên đạo chiếu thư', text: '📜 [Thiên đạo chiếu thư]' },
    { icon: '🛡️', title: 'Kim cang bất hoại', text: '🛡️ [Kim cang bất hoại]' },
  ];

  const quickMessages = [
    '🪷 @Linh Lung Tiên Đồng xin quẻ may mắn hôm nay!',
    '🪷 @Linh Lung Tiên Đồng chỉ bí kíp leo top với!',
    '🔥 Gõ nhanh quá mọi người!',
    '👏 Chúc mừng đạo hữu bứt phá WPM!',
    '⚔️ Ai dám vào solo kèo 1v1 phân định cao thấp không?',
    '💨 Tốc độ bàn thờ luôn!',
    'GG! Trận đấu kịch tính!',
    '🍵 Uống ngụm trà ngộ đạo dưỡng thần thôi nào!',
    '/roll Thử độ duyên hôm nay',
  ];

  // Auto-scroll to bottom when new messages arrive or channel changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel, whisperTargetUser]);

  // Click outside to close emoji picker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };
    if (isEmojiPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEmojiPickerOpen]);

  // Esc key listener to quickly close chat drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        soundFx.playKeyClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || spamCooldown > 0) return;

    if (activeChannel === 'room' && !currentRoomId) {
      soundFx.playError();
      return;
    }

    if (activeChannel === 'sect' && !currentSectId) {
      soundFx.playError();
      return;
    }

    if (activeChannel === 'whisper' && !whisperTargetUser) {
      soundFx.playError();
      return;
    }

    // Check slash commands
    const clean = text.trim();
    let cardType: ChatCardType | undefined;
    let cardData: ChatCardData | undefined;

    if (clean.startsWith('/roll')) {
      const topic = clean.replace(/^\/roll\s*/i, '').trim() || 'Lắc xí ngầu độ duyên';
      cardType = 'roll_result';
      cardData = {
        rollNumber: Math.floor(Math.random() * 100) + 1,
        rollTopic: topic,
      };
    } else if (clean.startsWith('/phapbao')) {
      cardType = 'item_share';
      const artName = cultivationState?.artifacts?.equipped || 'Hỗn Độn Chí Bảo';
      cardData = {
        itemType: 'artifact',
        itemName: artName,
        itemIcon: '⚔️',
        itemQuality: 'Thần Phẩm Chí Bảo',
        itemDescription: 'Pháp bảo uy chấn tam giới, lướt phím như phong lôi bạt hải.',
      };
    } else if (clean.startsWith('/dan')) {
      cardType = 'item_share';
      cardData = {
        itemType: 'pill',
        itemName: 'Hóa Thần Cửu Chuyển Đan',
        itemIcon: '🔮',
        itemQuality: 'Cực Phẩm Linh Đan',
        itemDescription: 'Hỗ trợ ngưng tụ nguyên thần, bứt phá bình cảnh tu vi trong chớp mắt.',
      };
    }

    onSendMessage({
      message: clean,
      channel: activeChannel,
      whisperTarget: whisperTargetUser?.username,
      whisperTargetUserId: whisperTargetUser?.userId,
      cardType,
      cardData,
    });

    setInputText('');
    soundFx.playKeyClick();

    // 1s cooldown for smooth typing chat
    setSpamCooldown(1);
    const cd = setInterval(() => {
      setSpamCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cd);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Quick Action: Khoe Kỷ Lục WPM
  const handleShareRecord = () => {
    if (bestWpm <= 0) {
      soundFx.playError();
      return;
    }
    soundFx.playKeyClick();
    const modeName = bestWpmRecord?.modeName || 'Đấu Trường';
    onSendMessage({
      message: `🏆 Đạo hữu ${currentUsername} khoe kỷ lục WPM cao nhất: ${bestWpm} WPM (${modeName})!`,
      channel: activeChannel,
      whisperTarget: whisperTargetUser?.username,
      whisperTargetUserId: whisperTargetUser?.userId,
      cardType: 'record_share',
      cardData: {
        recordWpm: bestWpm,
        recordAccuracy: bestWpmRecord?.accuracy || 98,
        recordModeName: modeName,
        recordTime: bestWpmRecord?.timestamp || Date.now(),
      },
    });
  };

  // Quick Action: Khoe Pháp Bảo
  const handleShareArtifact = () => {
    soundFx.playKeyClick();
    const artName = cultivationState?.artifacts?.equipped || 'Tru Tiên Cổ Kiếm';
    onSendMessage({
      message: `⚔️ Đạo hữu ${currentUsername} khoe pháp bảo trấn phái: [${artName}]!`,
      channel: activeChannel,
      whisperTarget: whisperTargetUser?.username,
      whisperTargetUserId: whisperTargetUser?.userId,
      cardType: 'item_share',
      cardData: {
        itemType: 'artifact',
        itemName: artName,
        itemIcon: '⚔️',
        itemQuality: 'Thần Phẩm Chí Bảo',
        itemDescription: 'Pháp bảo thượng cổ uy chấn thiên hạ, ngưng tụ kiếm ý cửu thiên.',
      },
    });
  };

  // Quick Action: Gửi Chiến Thư 1v1
  const handleSendBattleChallenge = () => {
    soundFx.playKeyClick();
    const modeTitle = 
      challengeMode === 'vi_dau' ? 'Tiếng Việt Có Dấu' :
      challengeMode === 'vi_nodau' ? 'Tiếng Việt Không Dấu' :
      challengeMode === 'en' ? 'Tiếng Anh (English)' :
      challengeMode === 'doan_chu' ? 'Đoán Chữ (Mystery)' :
      challengeMode === 'ngau_hung' ? 'Ngẫu Hứng (Rush)' : 'Săn Boss Hắc Long';

    const challengeRoom = currentRoomId || `VN-${Math.floor(1000 + Math.random() * 9000)}`;

    onSendMessage({
      message: `⚔️ [CHIẾN THƯ 1V1] ${currentUsername} phát chiến thư tỷ võ chế độ ${modeTitle}! Ai dám vào tiếp chiêu?`,
      channel: activeChannel,
      whisperTarget: whisperTargetUser?.username,
      whisperTargetUserId: whisperTargetUser?.userId,
      cardType: 'battle_challenge',
      cardData: {
        challengeRoomId: challengeRoom,
        challengeMode,
        challengeModeTitle: modeTitle,
        challengeStake,
        challengeHostName: currentUsername,
        challengeStatus: 'pending',
      },
    });
    setIsChallengeModalOpen(false);
  };

  // Filter messages based on active channel
  const filteredMessages = messages.filter((m) => {
    if (activeChannel === 'room') {
      return m.channel === 'room' && (!currentRoomId || !m.roomId || m.roomId === currentRoomId);
    }
    if (activeChannel === 'sect') {
      return m.channel === 'sect' && (!currentSectId || m.sectId === currentSectId);
    }
    if (activeChannel === 'whisper') {
      if (!whisperTargetUser) return false;
      const cleanMe = String(currentUsername || '').toLowerCase();
      const cleanTarget = String(whisperTargetUser.username || '').toLowerCase();
      const sender = (m.username || '').toLowerCase();
      const target = (m.whisperTarget || '').toLowerCase();
      return (
        m.channel === 'whisper' &&
        ((sender === cleanMe && target === cleanTarget) || (sender === cleanTarget && target === cleanMe))
      );
    }
    return m.channel === 'global';
  });

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-110 bg-slate-900/98 backdrop-blur-md border-l border-slate-800 shadow-2xl flex flex-col animate-slideInRight text-left select-text">
      
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/40 text-sky-400 shadow-sm shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm text-white tracking-wide flex items-center gap-2 truncate">
              THIÊN THƯ TRUYỀN ÂM
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
            </h3>
            <p className="text-[10px] text-slate-400 truncate">Kênh chat đa tầng & truyền âm nhập mật thời gian thực</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isAdmin && onClearChat && activeChannel === 'global' && (
            <button
              id="btn-admin-clear-chat"
              type="button"
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn xóa sạch kênh chat toàn server?')) {
                  onClearChat();
                }
              }}
              title="Xóa chat toàn server (Admin)"
              className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            id="btn-close-chat"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Multi-Channel Switch Tabs */}
      <div className="grid grid-cols-4 p-1.5 border-b border-slate-800 gap-1 bg-slate-950 text-xs">
        {/* Tab 1: Thế Giới */}
        <button
          id="btn-channel-global"
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveChannel('global');
          }}
          className={`py-1.5 px-1 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
            activeChannel === 'global'
              ? 'bg-sky-500/20 border border-sky-400/60 text-sky-300 shadow-sm'
              : 'text-slate-400 hover:bg-slate-800/80 border border-transparent'
          }`}
          title="Kênh Thế Giới (Vạn Giới Truyền Âm)"
        >
          <span className="text-sm">🌐</span>
          <span className="text-[10px] font-bold">Thế Giới</span>
        </button>

        {/* Tab 2: Tông Môn */}
        <button
          id="btn-channel-sect"
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveChannel('sect');
          }}
          className={`py-1.5 px-1 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
            activeChannel === 'sect'
              ? 'bg-amber-500/20 border border-amber-400/60 text-amber-300 shadow-sm'
              : 'text-slate-400 hover:bg-slate-800/80 border border-transparent'
          }`}
          title="Kênh Tông Môn (Bí Mật Phái Môn)"
        >
          <span className="text-sm">🏰</span>
          <span className="text-[10px] font-bold truncate max-w-full px-1">
            {currentSectTag ? `[${currentSectTag}]` : 'Tông Môn'}
          </span>
        </button>

        {/* Tab 3: Phòng Đấu */}
        <button
          id="btn-channel-room"
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveChannel('room');
          }}
          className={`py-1.5 px-1 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
            activeChannel === 'room'
              ? 'bg-purple-500/20 border border-purple-400/60 text-purple-300 shadow-sm'
              : 'text-slate-400 hover:bg-slate-800/80 border border-transparent'
          }`}
          title="Kênh Phòng Đấu / Sàn Đấu"
        >
          <span className="text-sm">⚔️</span>
          <span className="text-[10px] font-bold truncate max-w-full px-1">
            {currentRoomId ? currentRoomId : 'Phòng Đấu'}
          </span>
        </button>

        {/* Tab 4: Mật Đàm */}
        <button
          id="btn-channel-whisper"
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveChannel('whisper');
          }}
          className={`py-1.5 px-1 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer relative ${
            activeChannel === 'whisper'
              ? 'bg-pink-500/20 border border-pink-400/60 text-pink-300 shadow-sm'
              : 'text-slate-400 hover:bg-slate-800/80 border border-transparent'
          }`}
          title="Kênh Mật Đàm (Truyền Âm Nhập Mật 1-1)"
        >
          <span className="text-sm">✉️</span>
          <span className="text-[10px] font-bold truncate max-w-full px-1">
            {whisperTargetUser ? whisperTargetUser.username : 'Mật Đàm'}
          </span>
        </button>
      </div>

      {/* Whisper Sub-Bar: target select / open friends */}
      {activeChannel === 'whisper' && (
        <div className="p-2 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-pink-400 font-bold">Mật đàm với:</span>
            <span className="font-black text-white px-2 py-0.5 rounded bg-pink-500/20 border border-pink-500/40 truncate">
              @{whisperTargetUser ? whisperTargetUser.username : 'Chưa chọn đạo hữu'}
            </span>
          </div>
          {onOpenFriends && (
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onOpenFriends();
              }}
              className="text-[10px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Users className="w-3 h-3 text-emerald-400" />
              <span>Sổ Tay Bạn Bè</span>
            </button>
          )}
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 custom-scrollbar">
        {activeChannel === 'room' && !currentRoomId ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto text-xl">
              ⚔️
            </div>
            <p className="text-xs font-bold text-slate-300">Chưa tham gia phòng đấu</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Hãy tạo phòng mới hoặc nhập mã phòng thi đấu để kích hoạt kênh trò chuyện riêng tư với đối thủ!
            </p>
          </div>
        ) : activeChannel === 'sect' && !currentSectId ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-xl">
              🏰
            </div>
            <p className="text-xs font-bold text-slate-300">Chưa gia nhập Tông Môn</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Kênh Tông Môn chỉ dành cho đệ tử môn phái trao đổi chiến thuật. Hãy bái nhập hoặc lập phái để mở khóa kênh này!
            </p>
            {onOpenCultivation && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onOpenCultivation();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold cursor-pointer transition-all active:scale-95"
              >
                Vào Động Phủ Tông Môn
              </button>
            )}
          </div>
        ) : activeChannel === 'whisper' && !whisperTargetUser ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-pink-400 flex items-center justify-center mx-auto text-xl">
              ✉️
            </div>
            <p className="text-xs font-bold text-slate-300">Chưa chọn đạo hữu để mật đàm</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Hãy mở Sổ Tay Đạo Hữu hoặc gõ lệnh <code>/w &lt;tên&gt; &lt;nội dung&gt;</code> để bắt đầu truyền âm nhập mật 1-1!
            </p>
            {onOpenFriends && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onOpenFriends();
                }}
                className="px-4 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 text-xs font-bold cursor-pointer transition-all active:scale-95"
              >
                Mở Danh Sách Đạo Hữu
              </button>
            )}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-500 space-y-1">
            <p>Chưa có tin nhắn nào trong kênh này.</p>
            <p className="text-[11px] text-slate-600">Hãy gửi lời chào đầu tiên hoặc thử gõ lệnh /roll!</p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.username === currentUsername;
            const isMsgAdmin = msg.isAdmin || msg.frame === 'admin_gold';

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 group transition-opacity ${
                  msg.isSystem ? 'justify-center my-2' : ''
                }`}
              >
                {/* Dao Bot Display */}
                {msg.isDaoBot || msg.username === 'Huyền Thiên Khí Linh' || msg.username === 'Linh Lung Tiên Đồng' || msg.username === 'Bàn Cổ Thần Thức' ? (
                  (() => {
                    const isLinhLung = msg.username === 'Linh Lung Tiên Đồng' || msg.avatar === '🪷';
                    return (
                      <div className={`w-full p-3.5 rounded-2xl border shadow-lg space-y-2 my-1 transition-all ${
                        isLinhLung
                          ? 'bg-gradient-to-r from-purple-950/80 via-pink-950/60 to-slate-950 border-purple-400/80 shadow-purple-950/50'
                          : 'bg-gradient-to-r from-amber-950/70 via-purple-950/70 to-slate-950 border-amber-400/60 shadow-purple-950/40'
                      }`}>
                        <div className={`flex items-center justify-between gap-2 border-b pb-1.5 ${
                          isLinhLung ? 'border-pink-500/25' : 'border-purple-500/25'
                        }`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-xl border flex items-center justify-center text-sm shadow-sm shrink-0 ${
                              isLinhLung
                                ? 'bg-gradient-to-tr from-purple-500/40 to-pink-500/40 border-purple-400/80 shadow-purple-500/25'
                                : 'bg-gradient-to-tr from-amber-400/40 to-purple-600/40 border-amber-400/60'
                            }`}>
                              <span className={isLinhLung ? "animate-[bounce_3s_infinite]" : (msg.avatar === '☯️' ? "animate-[spin_10s_linear_infinite]" : "")}>
                                {msg.avatar || (isLinhLung ? '🪷' : '☯️')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-black ${isLinhLung ? 'text-pink-300' : 'text-amber-300'}`}>
                                {msg.username || 'Khí Linh'}
                              </span>
                              <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full border ${
                                isLinhLung
                                  ? 'bg-purple-500/20 text-purple-200 border-purple-400/50'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                              }`}>
                                {isLinhLung ? 'PHONG THẦN BẢNG' : 'THIÊN ĐẠO'}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-100 text-xs leading-relaxed font-sans pl-0.5">
                          {msg.message}
                        </p>
                      </div>
                    );
                  })()
                ) : msg.isSystem ? (
                  <div className="w-full p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 shadow-sm">
                    <div className="shrink-0">
                      <AvatarWithFrame icon={msg.avatar || '🤖'} frameId={msg.frame || 'admin_gold'} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold mb-0.5">
                        <span>{msg.username}</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString('vi-VN')}</span>
                      </div>
                      <p className="text-slate-200 text-[11px]">{msg.message}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* User Avatar */}
                    <div className="shrink-0 pt-0.5">
                      <AvatarWithFrame
                        icon={msg.avatar || '⚡'}
                        frameId={msg.frame || (isMsgAdmin ? 'admin_gold' : 'default')}
                        size="sm"
                      />
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0">
                      {/* Name, Realm badge, Sect tag, Time */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span
                          className={`text-xs font-black truncate flex items-center gap-1 ${
                            isMsgAdmin ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'text-white'
                          }`}
                        >
                          {isMsgAdmin && <Crown className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                          {msg.username}
                        </span>

                        {/* Cảnh giới & Tông môn tags */}
                        {msg.senderRealm && (
                          <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-slate-800 text-amber-400 border border-slate-700 flex items-center gap-0.5">
                            <span>{msg.senderRealmIcon || '🌿'}</span>
                            <span>{msg.senderRealm}</span>
                          </span>
                        )}

                        {msg.senderSectTag && (
                          <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                            [{msg.senderSectTag}]
                          </span>
                        )}

                        {isMe && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            Bạn
                          </span>
                        )}

                        <span className="text-[10px] text-slate-500 ml-auto font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Chat bubble & Interactive Cards */}
                      {msg.cardType === 'battle_challenge' && msg.cardData ? (
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-950/80 via-slate-900 to-amber-950/60 border-2 border-amber-400/80 text-white shadow-xl space-y-2.5 my-1">
                          <div className="flex items-center justify-between border-b border-amber-500/30 pb-1.5">
                            <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                              <Swords className="w-4 h-4 text-amber-400" />
                              CHIẾN THƯ TỶ VÕ 1V1
                            </span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Phòng: {msg.cardData.challengeRoomId}
                            </span>
                          </div>
                          <div className="text-xs space-y-1">
                            <div className="flex items-center justify-between text-slate-300">
                              <span>Chế độ thi đấu:</span>
                              <strong className="text-amber-200">{msg.cardData.challengeModeTitle || 'Tiếng Việt'}</strong>
                            </div>
                            <div className="flex items-center justify-between text-slate-300">
                              <span>Tiền cược:</span>
                              <span className="text-emerald-400 font-bold">
                                {msg.cardData.challengeStake ? `${msg.cardData.challengeStake} Linh Thạch` : 'Giao lưu kết bạn'}
                              </span>
                            </div>
                          </div>
                          {!isMe && onAcceptBattleChallenge && (
                            <button
                              type="button"
                              onClick={() => {
                                soundFx.playVictory();
                                onAcceptBattleChallenge(msg.cardData!);
                              }}
                              className="w-full py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <Swords className="w-3.5 h-3.5" />
                              <span>Nhận Lời Khiêu Chiến Ngay</span>
                            </button>
                          )}
                        </div>
                      ) : msg.cardType === 'record_share' && msg.cardData ? (
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-950/70 via-slate-900 to-teal-950/60 border border-emerald-500/50 text-white shadow-lg space-y-2 my-1">
                          <div className="flex items-center justify-between border-b border-emerald-500/30 pb-1">
                            <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                              <Trophy className="w-4 h-4 text-amber-400" />
                              KHOE KỶ LỤC WPM ĐỈNH CAO
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {msg.cardData.recordModeName}
                            </span>
                          </div>
                          <div className="flex items-center justify-around py-1">
                            <div className="text-center">
                              <div className="text-xl font-black text-emerald-400 font-mono">
                                {msg.cardData.recordWpm}
                              </div>
                              <div className="text-[10px] text-slate-400 uppercase font-bold">WPM Tốc Độ</div>
                            </div>
                            <div className="w-px h-8 bg-slate-800" />
                            <div className="text-center">
                              <div className="text-xl font-black text-amber-300 font-mono">
                                {msg.cardData.recordAccuracy || 98}%
                              </div>
                              <div className="text-[10px] text-slate-400 uppercase font-bold">Độ Chuẩn Xác</div>
                            </div>
                          </div>
                        </div>
                      ) : msg.cardType === 'item_share' && msg.cardData ? (
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-950/70 via-slate-900 to-indigo-950/60 border border-purple-500/50 text-white shadow-lg space-y-1.5 my-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 text-lg flex items-center justify-center shrink-0">
                              {msg.cardData.itemIcon || '⚔️'}
                            </div>
                            <div>
                              <div className="text-xs font-black text-purple-200">
                                {msg.cardData.itemName}
                              </div>
                              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                {msg.cardData.itemQuality || 'Thần Phẩm'}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-300 italic pl-1">
                            "{msg.cardData.itemDescription}"
                          </p>
                        </div>
                      ) : msg.cardType === 'roll_result' && msg.cardData ? (
                        <div className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-sky-500/40 text-white shadow-sm flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl animate-spin">🎲</span>
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">{msg.cardData.rollTopic || 'Độ Duyên'}</div>
                              <div className="text-xs font-semibold text-slate-200">{msg.message}</div>
                            </div>
                          </div>
                          <div className="text-xl font-black text-amber-300 font-mono pr-2">
                            {msg.cardData.rollNumber}
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`p-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-md ${
                            isMe
                              ? 'bg-sky-600/25 border border-sky-400/40 text-slate-100 rounded-tl-sm'
                              : isMsgAdmin
                              ? 'bg-amber-950/30 border border-amber-500/40 text-amber-100 rounded-tl-sm'
                              : activeChannel === 'whisper'
                              ? 'bg-pink-950/30 border border-pink-500/30 text-pink-100 rounded-tl-sm'
                              : 'bg-slate-800/90 border border-slate-700/80 text-slate-200 rounded-tl-sm'
                          }`}
                        >
                          {msg.message}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Interactive Sharing Toolbar */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/90 flex items-center justify-between gap-1 overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={handleShareRecord}
          title="Khoe kỷ lục WPM cao nhất"
          className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <Trophy className="w-3 h-3 text-amber-400" />
          <span>Khoe Kỷ Lục</span>
        </button>

        <button
          type="button"
          onClick={() => setIsChallengeModalOpen(true)}
          title="Phát chiến thư khiêu chiến 1v1"
          className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <Swords className="w-3 h-3" />
          <span>Chiến Thư 1v1</span>
        </button>

        <button
          type="button"
          onClick={handleShareArtifact}
          title="Khoe pháp bảo trấn phái"
          className="text-[10px] px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <Flame className="w-3 h-3 text-purple-400" />
          <span>Khoe Bảo Vật</span>
        </button>

        <button
          type="button"
          onClick={() => handleSend('/roll Thử độ duyên ngộ đạo')}
          title="Lắc xí ngầu độ duyên (1-100)"
          className="text-[10px] px-2 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <Dice5 className="w-3 h-3 text-sky-400" />
          <span>/roll</span>
        </button>

        <div className="relative shrink-0" ref={emojiPickerRef}>
          <button
            type="button"
            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
            title="Emoji Tu Tiên & Nhãn Dán"
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition-all"
          >
            <Smile className="w-4 h-4 text-amber-400" />
          </button>

          {/* Emoji Popover */}
          {isEmojiPickerOpen && (
            <div className="absolute bottom-9 right-0 w-64 p-2.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 animate-slideDown text-left">
              <div className="text-[10px] uppercase font-bold text-amber-400 mb-1.5 flex items-center gap-1">
                <span>🪷</span>
                <span>Biểu Cảm Tiên Giới</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {xianxiaEmojis.map((e, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      handleSend(e.text);
                      setIsEmojiPickerOpen(false);
                    }}
                    title={e.title}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 hover:border-amber-400/60 border border-slate-700 text-lg flex items-center justify-center cursor-pointer transition-all active:scale-90"
                  >
                    {e.icon}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Challenge 1v1 Dialog Popover */}
      {isChallengeModalOpen && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/95 space-y-2.5 animate-slideDown">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
              <Swords className="w-4 h-4" />
              PHÁT CHIẾN THƯ KHIÊU CHIẾN 1V1
            </span>
            <button
              type="button"
              onClick={() => setIsChallengeModalOpen(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Chế độ thi đấu:</label>
              <select
                value={challengeMode}
                onChange={(e) => setChallengeMode(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none"
              >
                <option value="vi_dau">Tiếng Việt Có Dấu</option>
                <option value="vi_nodau">Tiếng Việt Không Dấu</option>
                <option value="en">Tiếng Anh (English)</option>
                <option value="ngau_hung">Ngẫu Hứng (Rush)</option>
                <option value="doan_chu">Đoán Chữ (Mystery)</option>
                <option value="san_boss">Săn Boss Hắc Long</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Cược Linh Thạch:</label>
              <select
                value={challengeStake}
                onChange={(e) => setChallengeStake(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none"
              >
                <option value={0}>0 (Tỷ võ giao lưu)</option>
                <option value={10}>10 Linh Thạch</option>
                <option value={30}>30 Linh Thạch</option>
                <option value={50}>50 Linh Thạch</option>
                <option value={100}>100 Linh Thạch</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendBattleChallenge}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Phát Chiến Thư Lên Kênh Chat</span>
          </button>
        </div>
      )}

      {/* Slash Command Autocomplete Popover */}
      {inputText.startsWith('/') && !inputText.includes(' ') && (
        <div className="p-2 border-t border-slate-800 bg-slate-900/95 space-y-1 animate-slideDown shadow-xl">
          <div className="text-[10px] uppercase font-bold text-amber-400 px-2 py-0.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Gợi Ý Lệnh / Nhanh</span>
          </div>
          <div className="space-y-0.5 max-h-36 overflow-y-auto custom-scrollbar">
            {SLASH_COMMANDS.filter((s) => s.cmd.toLowerCase().startsWith(inputText.toLowerCase())).map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setInputText(item.insert);
                  document.getElementById('input-chat-message')?.focus();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-xs flex items-center justify-between group transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{item.icon}</span>
                  <span className="font-mono font-bold text-sky-400 group-hover:text-amber-400 transition-colors">
                    {item.cmd}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-300">
                  {item.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Whisper Typing Indicator */}
      {activeChannel === 'whisper' && whisperTargetUser && (
        <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800/80 text-[11px] text-pink-400/90 italic flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-1.5">
            <span>✨</span>
            <span>Mật đàm an toàn cùng @{whisperTargetUser.username}</span>
          </div>
          {inputText.trim().length > 0 ? (
            <span className="flex items-center gap-1 text-[10px] not-italic font-medium text-pink-300">
              <span>Đang soạn tin</span>
              <span className="flex gap-0.5 items-center ml-0.5">
                <span className="w-1 h-1 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 bg-pink-400 rounded-full animate-bounce" />
              </span>
            </span>
          ) : (
            <span className="flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-ping" />
              <span className="text-[10px] not-italic font-mono font-bold text-pink-300">Sẵn sàng</span>
            </span>
          )}
        </div>
      )}

      {/* Input & Send form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2"
      >
        <input
          id="input-chat-message"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            activeChannel === 'room' && !currentRoomId
              ? 'Vào phòng để chat phòng...'
              : activeChannel === 'sect' && !currentSectId
              ? 'Gia nhập môn phái để chat...'
              : activeChannel === 'whisper' && !whisperTargetUser
              ? 'Chọn đạo hữu để mật đàm...'
              : spamCooldown > 0
              ? `Đợi ${spamCooldown}s...`
              : activeChannel === 'global'
              ? 'Toàn server (gõ /roll, /pvp...)'
              : activeChannel === 'sect'
              ? 'Chat Tông Môn...'
              : activeChannel === 'whisper'
              ? `Mật đàm tới @${whisperTargetUser?.username}...`
              : 'Chat phòng đấu...'
          }
          disabled={
            spamCooldown > 0 || 
            (activeChannel === 'room' && !currentRoomId) ||
            (activeChannel === 'sect' && !currentSectId) ||
            (activeChannel === 'whisper' && !whisperTargetUser)
          }
          maxLength={150}
          className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700/80 text-white outline-none focus:ring-1 focus:ring-sky-400 disabled:opacity-40"
        />
        <button
          id="btn-send-chat"
          type="submit"
          disabled={
            !inputText.trim() || 
            spamCooldown > 0 || 
            (activeChannel === 'room' && !currentRoomId) ||
            (activeChannel === 'sect' && !currentSectId) ||
            (activeChannel === 'whisper' && !whisperTargetUser)
          }
          className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black disabled:opacity-30 transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center shrink-0"
          title="Gửi tin nhắn"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { soundFx } from '../utils/audio';
import { AvatarWithFrame } from '../utils/frames';
import { Send, X, MessageSquare, Sparkles, Crown, Trash2, Users } from 'lucide-react';

interface ChatDrawerProps {
  messages: ChatMessage[];
  currentUsername: string;
  currentUserAvatar?: string;
  currentUserFrame?: string;
  currentRoomId?: string | null;
  isAdmin?: boolean;
  onSendMessage: (msg: string, channel: 'global' | 'room') => void;
  onClearChat?: () => void;
  onClose: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  messages,
  currentUsername,
  currentUserAvatar,
  currentUserFrame,
  currentRoomId,
  isAdmin = false,
  onSendMessage,
  onClearChat,
  onClose,
}) => {
  const [activeChannel, setActiveChannel] = useState<'global' | 'room'>('global');
  const [inputText, setInputText] = useState('');
  const [spamCooldown, setSpamCooldown] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickMessages = [
    '🔥 Gõ nhanh quá mọi người!',
    '👏 Chúc mừng người anh em!',
    '⚔️ Tập trung phá khiên Boss nào!',
    '💨 Tốc độ bàn thờ luôn!',
    'GG! Trận đấu kịch tính!',
    '🦾 Cố lên nào!',
    '🚀 Ai solo kèo 1v1 không?',
  ];

  // Auto-scroll to bottom when new messages arrive or channel changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel]);

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

    onSendMessage(text.trim(), activeChannel);
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

  const filteredMessages = messages.filter((m) => {
    if (activeChannel === 'room') {
      return m.channel === 'room' && (!currentRoomId || !m.roomId || m.roomId === currentRoomId);
    }
    return m.channel === 'global';
  });

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-105 bg-slate-900/98 backdrop-blur-md border-l border-slate-800 shadow-2xl flex flex-col animate-slideInRight text-left select-text">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 shadow-sm">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white tracking-wide flex items-center gap-2">
              KÊNH TRÒ CHUYỆN
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            </h3>
            <p className="text-[10px] text-slate-400">Thời gian thực qua toàn bộ máy chủ</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
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

      {/* Channel Switch Tabs */}
      <div className="flex p-2 border-b border-slate-800 gap-2 bg-slate-950">
        <button
          id="btn-channel-global"
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveChannel('global');
          }}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeChannel === 'global'
              ? 'bg-sky-500/20 border border-sky-400/60 text-sky-300 shadow-md'
              : 'text-slate-400 hover:bg-slate-800/80 border border-transparent'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          Toàn Server (Global)
        </button>

        <button
          id="btn-channel-room"
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveChannel('room');
          }}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeChannel === 'room'
              ? 'bg-amber-500/20 border border-amber-400/60 text-amber-300 shadow-md'
              : 'text-slate-400 hover:bg-slate-800/80 border border-transparent'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{currentRoomId ? `Phòng (${currentRoomId})` : 'Phòng Đấu'}</span>
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 custom-scrollbar">
        {activeChannel === 'room' && !currentRoomId ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-300">Chưa tham gia phòng đấu</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Hãy tạo phòng mới hoặc nhập mã phòng thi đấu để kích hoạt kênh trò chuyện riêng tư với đối thủ!
            </p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-500 space-y-1">
            <p>Chưa có tin nhắn nào trong kênh này.</p>
            <p className="text-[11px] text-slate-600">Hãy gửi lời chào đầu tiên hoặc dùng tin nhắn nhanh!</p>
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
                {/* Dao Bot (Huyền Thiên Khí Linh / Tam Đại Khí Linh) Special Celestial Display */}
                {msg.isDaoBot || msg.username === 'Huyền Thiên Khí Linh' || msg.username === 'Linh Lung Tiên Đồng' || msg.username === 'Bàn Cổ Thần Thức' ? (
                  <div className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/70 via-purple-950/70 to-slate-950 border border-amber-400/60 shadow-lg shadow-purple-950/40 space-y-2 my-1">
                    <div className="flex items-center justify-between gap-2 border-b border-purple-500/25 pb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-400/40 to-purple-600/40 border border-amber-400/60 flex items-center justify-center text-sm shadow-sm shrink-0">
                          <span className={msg.avatar === '☯️' ? "animate-[spin_10s_linear_infinite]" : ""}>{msg.avatar || '☯️'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-amber-300">{msg.username || 'Huyền Thiên Khí Linh'}</span>
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                            THIÊN ĐẠO
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
                    {/* Full Avatar with User's Chosen Frame */}
                    <div className="shrink-0 pt-0.5">
                      <AvatarWithFrame
                        icon={msg.avatar || '⚡'}
                        frameId={msg.frame || (isMsgAdmin ? 'admin_gold' : 'default')}
                        size="sm"
                      />
                    </div>

                    {/* Content Section: Name, Tag, Timestamp, Message Bubble */}
                    <div className="flex-1 min-w-0">
                      {/* Name & Meta info */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span
                          className={`text-xs font-black truncate flex items-center gap-1 ${
                            isMsgAdmin ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'text-white'
                          }`}
                        >
                          {isMsgAdmin && <Crown className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                          {msg.username}
                        </span>

                        {isMsgAdmin && (
                          <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            ADMIN
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
                            second: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Chat bubble */}
                      <div
                        className={`p-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-md ${
                          isMe
                            ? 'bg-sky-600/25 border border-sky-400/40 text-slate-100 rounded-tl-sm'
                            : isMsgAdmin
                            ? 'bg-amber-950/30 border border-amber-500/40 text-amber-100 rounded-tl-sm'
                            : 'bg-slate-800/90 border border-slate-700/80 text-slate-200 rounded-tl-sm'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Chat Presets */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/70">
        <div className="text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Tin nhắn nhanh</span>
        </div>
        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar">
          {quickMessages.map((text, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(text)}
              className="text-[10px] px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all active:scale-95 cursor-pointer"
            >
              {text}
            </button>
          ))}
        </div>
      </div>

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
              : spamCooldown > 0
              ? `Đợi ${spamCooldown}s...`
              : activeChannel === 'global'
              ? 'Nhắn tin toàn server...'
              : 'Nhắn tin phòng đấu...'
          }
          disabled={spamCooldown > 0 || (activeChannel === 'room' && !currentRoomId)}
          maxLength={150}
          className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700/80 text-white outline-none focus:ring-1 focus:ring-sky-400 disabled:opacity-40"
        />
        <button
          id="btn-send-chat"
          type="submit"
          disabled={!inputText.trim() || spamCooldown > 0 || (activeChannel === 'room' && !currentRoomId)}
          className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black disabled:opacity-30 transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center"
          title="Gửi tin nhắn"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

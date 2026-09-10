import React, { useState } from 'react';
import { ChatMessage } from '../types';
import { soundFx } from '../utils/audio';
import { Send, X, MessageSquare, Sparkles } from 'lucide-react';

interface ChatDrawerProps {
  messages: ChatMessage[];
  currentUsername: string;
  onSendMessage: (msg: string, channel: 'global' | 'room') => void;
  onClose: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  messages,
  currentUsername,
  onSendMessage,
  onClose,
}) => {
  const [activeChannel, setActiveChannel] = useState<'global' | 'room'>('global');
  const [inputText, setInputText] = useState('');
  const [spamCooldown, setSpamCooldown] = useState(0);

  const quickMessages = [
    '🔥 Gõ nhanh quá mọi người!',
    '👏 Chúc mừng người anh em!',
    '⚔️ Tập trung phá khiên Boss nào!',
    '💨 Khói mù mịt không thấy đường gõ!',
    'GG! Trận đấu kịch tính!',
    '🦾 Cố lên nào!',
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || spamCooldown > 0) return;

    onSendMessage(text.trim(), activeChannel);
    setInputText('');
    soundFx.playKeyClick();

    // 2s cooldown for pleasant typing chat
    setSpamCooldown(2);
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

  const filteredMessages = messages.filter((m) => m.channel === activeChannel);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-slideInRight">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-sky-400" />
          <h3 className="font-bold text-sm text-white">KÊNH TRÒ CHUYỆN</h3>
        </div>
        <button
          id="btn-close-chat"
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            onClose();
          }}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
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
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeChannel === 'global'
              ? 'bg-sky-500/20 border border-sky-400/40 text-sky-300'
              : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          Toàn Server (Global)
        </button>
        <button
          id="btn-channel-room"
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveChannel('room');
          }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeChannel === 'room'
              ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300'
              : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          Phòng Đấu Hiện Tại
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.username === currentUsername;
            return (
              <div
                key={msg.id}
                className={`p-2.5 rounded-xl text-xs space-y-1 ${
                  msg.isSystem
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                    : isMe
                    ? 'bg-sky-500/15 border border-sky-500/30 text-white ml-6'
                    : 'bg-slate-800/80 border border-slate-700/60 text-slate-300 mr-6'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span className="font-bold text-white flex items-center gap-1">
                    {msg.username} {isMe && '(Bạn)'}
                  </span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString('vi-VN')}</span>
                </div>
                <div className="text-slate-200 break-words">{msg.message}</div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Chat Presets */}
      <div className="p-2 border-t border-slate-800 bg-slate-950/60">
        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Tin nhắn nhanh</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {quickMessages.map((text, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(text)}
              className="text-[10px] px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
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
            spamCooldown > 0 ? `Đợi ${spamCooldown}s...` : 'Nhập tin nhắn...'
          }
          disabled={spamCooldown > 0}
          maxLength={100}
          className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-1 focus:ring-sky-400 disabled:opacity-50"
        />
        <button
          id="btn-send-chat"
          type="submit"
          disabled={!inputText.trim() || spamCooldown > 0}
          className="p-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Radio, 
  Send, 
  Trash2, 
  Sparkles, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquare,
  Flame,
  Volume2
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface AdminBroadcastTabProps {
  onClearChat?: () => void;
  showToast: (msg: string) => void;
}

export const AdminBroadcastTab: React.FC<AdminBroadcastTabProps> = ({
  onClearChat,
  showToast,
}) => {
  const [title, setTitle] = useState('CHIẾU THƯ TỪ BAN QUẢN TRỊ');
  const [content, setContent] = useState('');
  const [personaId, setPersonaId] = useState<'admin' | 'huyen_thien' | 'ban_co' | 'linh_lung'>('admin');
  const [sending, setSending] = useState(false);

  const TEMPLATES = [
    {
      label: '⚡ Cảnh Báo Gian Lận',
      title: 'BÀN CỔ CẢNH BÁO TÀ THUẬT',
      persona: 'ban_co' as const,
      text: 'Thiên Đạo bất khả khi! Bàn Cổ Thần Thức cảnh báo toàn thể tu sĩ: Mọi hành vi dùng Auto phím, Macro giả lập hoặc dán văn bản sẽ lập tức bị phong ấn kinh mạch và đày vào U Minh Hàn Ngục!',
    },
    {
      label: '🛠️ Thông Báo Bảo Trì',
      title: 'BẢO TRÌ NÂNG CẤP TIÊN GIỚI',
      persona: 'admin' as const,
      text: 'Hệ thống FastTyping Arena sẽ tiến hành nâng cấp linh đài trong 15 phút tới. Chư vị đạo hữu vui lòng hoàn thành ván đấu hiện tại để bảo toàn điểm số và tu vi.',
    },
    {
      label: '🌟 Sự Kiện x2 Tu Vi',
      title: 'THIÊN CƠ KHAI MỞ - X2 TU VI',
      persona: 'linh_lung' as const,
      text: 'Linh Lung Tiên Đồng chúc mừng chư vị đạo hữu! Giờ vàng tu luyện đã mở, tất cả các trận thi đấu hoàn thành đạt trên 70 WPM sẽ nhận gấp đôi Linh Thạch và Tu Vi!',
    },
    {
      label: '☯️ Huyền Thiên Huấn Lệnh',
      title: 'HUYỀN THIÊN KHÍ LINH XUẤT THẾ',
      persona: 'huyen_thien' as const,
      text: 'Huyền Thiên Khí Linh giáng thế giám sát bảng vàng! Các đạo hữu hãy vững tay phím, điều tức nhịp thở, giữ vững phong độ đỉnh cao để đề danh trên Kim Bảng!',
    },
  ];

  const handleSendBroadcast = async () => {
    if (!content.trim()) {
      showToast('Vui lòng nhập nội dung thông báo');
      return;
    }

    soundFx.playKeyClick();
    try {
      setSending(true);
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message: content.trim(),
          personaId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Đã phát sóng thông báo đỏ tới toàn thể người chơi!');
        setContent('');
      } else {
        showToast(data.error || 'Lỗi phát sóng');
      }
    } catch {
      showToast('Lỗi kết nối khi gửi thông báo');
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn XÓA SẠCH toàn bộ tin nhắn trong Kênh Chat Toàn Server?')) {
      return;
    }
    soundFx.playKeyClick();
    try {
      const res = await fetch('/api/chat/clear', { method: 'POST' });
      if (res.ok) {
        if (onClearChat) onClearChat();
        showToast('Đã dọn dẹp sạch sẽ toàn bộ kênh chat!');
      }
    } catch {
      showToast('Lỗi khi xóa chat');
    }
  };

  return (
    <div className="space-y-6">
      {/* Broadcast Composer */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-lg space-y-4">
        <div>
          <h4 className="text-xs font-black uppercase text-amber-400 tracking-wide flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>Phát Chiếu Thư & Thông Báo Khẩn Toàn Server (Broadcast)</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Thông điệp sẽ xuất hiện ngay trên biểu ngữ đỏ chạy chữ toàn màn hình và truyền vào Kênh Chat của tất cả người chơi đang online.
          </p>
        </div>

        {/* Persona Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-2">
            Chọn Thực Thể Phát Ngôn:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setPersonaId('admin');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                personaId === 'admin'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xl">👑</span>
              <div className="min-w-0">
                <div className="font-bold text-xs">Ban Quản Trị</div>
                <div className="text-[10px] text-slate-400">Admin Tối Cao</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setPersonaId('huyen_thien');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                personaId === 'huyen_thien'
                  ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-md ring-1 ring-purple-400/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xl">☯️</span>
              <div className="min-w-0">
                <div className="font-bold text-xs">Huyền Thiên Khí Linh</div>
                <div className="text-[10px] text-slate-400">Chấp Pháp Sứ</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setPersonaId('ban_co');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                personaId === 'ban_co'
                  ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-md ring-1 ring-rose-400/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xl">⚡</span>
              <div className="min-w-0">
                <div className="font-bold text-xs">Bàn Cổ Thần Thức</div>
                <div className="text-[10px] text-slate-400">Giám Giới Thần Quân</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setPersonaId('linh_lung');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                personaId === 'linh_lung'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md ring-1 ring-emerald-400/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xl">🪷</span>
              <div className="min-w-0">
                <div className="font-bold text-xs">Linh Lung Tiên Đồng</div>
                <div className="text-[10px] text-slate-400">Sứ Giả Cổ Vũ</div>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Templates */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Mẫu Chiếu Thư Soạn Sẵn:
          </label>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setTitle(tmpl.title);
                  setContent(tmpl.text);
                  setPersonaId(tmpl.persona);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Tiêu Đề Chiếu Thư:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
              placeholder="VD: THÔNG BÁO TỪ BAN QUẢN TRỊ..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Nội Dung Phát Sóng:
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
              placeholder="Nhập nội dung cần truyền đạt đến toàn bộ người chơi..."
            />
          </div>
        </div>

        {/* Send Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSendBroadcast}
            disabled={sending || !content.trim()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-yellow-500 hover:from-rose-500 hover:to-yellow-400 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-950/40 transition-all hover:scale-102 cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Đang Phát Sóng...' : 'Phát Chiếu Thư Toàn Server'}</span>
          </button>
        </div>
      </div>

      {/* Chat Moderation Section */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-300 tracking-wide flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Kiểm Duyệt & Dọn Dẹp Kênh Chat Máy Chủ</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Dọn dẹp nhanh các đoạn chat rác, thông tin nhạy cảm hoặc spam trong phòng chat công cộng.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearChat}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/60 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Xóa Sạch Toàn Bộ Tin Nhắn Chat</span>
          </button>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="font-bold text-slate-300 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Hệ Thống Lọc Từ Khóa & Tự Động Giám Sát:</span>
          </div>
          <p>
            Mọi tin nhắn chứa từ ngữ khiêu dâm, lăng mạ hoặc xúc phạm sẽ tự động kích hoạt cảnh báo của Huyền Thiên Khí Linh. Admin có thể trực tiếp cấm chat hoặc cấm thi đấu người chơi trong tab Quản Lý Người Chơi.
          </p>
        </div>
      </div>
    </div>
  );
};

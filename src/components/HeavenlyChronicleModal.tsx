import React, { useState, useEffect } from 'react';
import {
  HeavenlyDaoDecree,
  HeavenlyDaoEventType,
} from '../types';
import {
  getStoredDaoDecrees,
  subscribeToDaoDecrees,
  announceGuidance,
  DAO_BOT_NAME,
  DAO_BOT_TITLE,
  DAO_BOT_AVATAR,
  DAO_BOT_PERSONAS,
} from '../utils/heavenlyDaoBot';
import { DaoDecreeModal } from './DaoDecreeModal';
import {
  X,
  Scroll,
  Sparkles,
  Zap,
  Award,
  Flame,
  Send,
  RotateCcw,
  CheckCircle2,
  Clock,
  MessageCircle,
  HelpCircle,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface HeavenlyChronicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
}

export const HeavenlyChronicleModal: React.FC<HeavenlyChronicleModalProps> = ({
  isOpen,
  onClose,
  currentUsername,
}) => {
  const [decrees, setDecrees] = useState<HeavenlyDaoDecree[]>([]);
  const [activeTab, setActiveTab] = useState<'chronicle' | 'oracle' | 'personas'>('chronicle');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedDecreeForModal, setSelectedDecreeForModal] = useState<HeavenlyDaoDecree | null>(null);

  // Oracle states - Default to Linh Lung Tiên Đồng for active, lively interaction
  const [selectedPersona, setSelectedPersona] = useState<'linh_lung' | 'huyen_thien' | 'ban_co'>('linh_lung');
  const [oracleQuestion, setOracleQuestion] = useState('');
  const [oracleAnswer, setOracleAnswer] = useState<string | null>(null);
  const [isAskingOracle, setIsAskingOracle] = useState(false);

  // Sync decrees
  useEffect(() => {
    if (!isOpen) return;
    setDecrees(getStoredDaoDecrees());

    const unsubscribe = subscribeToDaoDecrees((newDecree) => {
      setDecrees((prev) => [newDecree, ...prev.filter((d) => d.id !== newDecree.id)]);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Escape key listener to close chronicle modal or decree details
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (selectedDecreeForModal) {
          setSelectedDecreeForModal(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, selectedDecreeForModal]);

  if (!isOpen) return null;

  const filteredDecrees = decrees.filter((d) => {
    if (filterType === 'all') return true;
    return d.eventType === filterType;
  });

  const getEventBadge = (type: HeavenlyDaoEventType) => {
    switch (type) {
      case 'penalty':
        return {
          icon: <Zap className="w-3.5 h-3.5 text-rose-400" />,
          label: 'Thiên Lôi Phạt Tội',
          color: 'text-rose-400 border-rose-500/40 bg-rose-950/40',
        };
      case 'breakthrough':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
          label: 'Thiên Địa Dị Tượng',
          color: 'text-purple-300 border-purple-500/40 bg-purple-950/40',
        };
      case 'record':
        return {
          icon: <Award className="w-3.5 h-3.5 text-amber-400" />,
          label: 'Kim Bảng Đề Danh',
          color: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
        };
      case 'boss_kill':
        return {
          icon: <Flame className="w-3.5 h-3.5 text-red-400" />,
          label: 'Ma Thần Quỵ Phục',
          color: 'text-red-300 border-red-500/40 bg-red-950/40',
        };
      default:
        return {
          icon: <span className="text-xs">🧘</span>,
          label: 'Thiên Cơ Chỉ Điểm',
          color: 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40',
        };
    }
  };

  const handleAskOracle = async (preset?: string) => {
    const q = preset || oracleQuestion.trim();
    if (!q) return;

    soundFx.playKeyClick();
    setIsAskingOracle(true);
    setOracleAnswer(null);

    // Call server oracle or generate local Dao prophecy
    try {
      const res = await fetch('/api/dao/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, username: currentUsername, personaId: selectedPersona }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.answer) {
          setOracleAnswer(data.answer);
          setIsAskingOracle(false);
          return;
        }
      }
    } catch {
      // Fallback below
    }

    // Heuristic Prophecy Pool
    setTimeout(() => {
      if (selectedPersona === 'linh_lung') {
        const linhLungAnswers = [
          `« Linh Lung Mách Nước »: Hi hi, đạo hữu ${currentUsername}! Tiên Đồng ngó qua Phong Thần Bảng thấy ngón tay của đạo hữu đang dồi dào linh lực đó! Mau vào làm liền 3 ván chế độ Ngẫu Hứng hoặc Săn Boss, điểm bùng nổ WPM đang chờ đón kìa! 🪷`,
          `« Tiên Đồng Chỉ Điểm »: Ái chà, đạo hữu hay bị vấp ở mấy từ ghép telex đúng không nè? Nhớ thả lỏng hai vai, nhịp gõ đều đặn như gảy đàn tranh. Gõ đúng từng chữ thì tốc độ tự khắc vút bay như tiên kiếm! ✨`,
          `« Phong Thần Cơ Mật »: Bí kíp độc quyền của Tiên Đồng đây: Muốn leo top Bảng Vàng thì 10 giây đầu đừng ham gõ nhanh, giữ độ chính xác tuyệt đối 100% để tích tụ kiếm thế, sau đó mới tăng tốc thì đối thủ chỉ có hít khói! 🪷`,
          `« Linh Lung Soi Quẻ »: Quẻ hôm nay: Đại Cát! Các ngón trỏ và ngón giữa linh hoạt tuyệt đối, rất hợp để chinh phục các từ hiểm hóc. Mau mau lên đồ so tài đi nào! 🎉`,
          `« Tiên Đồng Nhắc Nhở »: Gõ 5 ván rồi thì nhớ buông chuột nhấp ngụm nước ấm, chớp mắt thư giãn nha! Mắt sáng tay dẻo thì mới trường kỳ tu tiên trên Phong Thần Bảng được chớ! 🍵`,
        ];
        setOracleAnswer(linhLungAnswers[Math.floor(Math.random() * linhLungAnswers.length)]);
      } else {
        const heuristicAnswers = [
          `« Khí Linh Chiếu Mệnh »: Đạo hữu ${currentUsername}, thần thức quan trắc hôm nay vận khí hanh thông, ngón tay linh hoạt như gió lốc! Hãy thi đấu ngay 3 ván chế độ TV Có Dấu để đón đầu lôi kiếp đột phá WPM!`,
          `« Thiên Đạo Chỉ Điểm »: Bình cảnh hiện tại không nằm ở tốc độ bàn tay mà ở đạo tâm nôn nóng. Hãy giữ nhịp thở điều hòa, ưu tiên độ chính xác 100% trong 15 giây đầu mỗi ván để phá vỡ giới hạn!`,
          `« Thần Khí Ban Phúc »: Khí Linh nhận thấy các ngón tay của đạo hữu đang tích tụ mỏi cơ. Hãy xoay nhẹ cổ tay theo chiều kim đồng hồ 10 lần, bấm phím số 5 định vị tâm thế trước khi vào trận tiếp theo!`,
          `« Đạo Cơ Thấu Thị »: Muốn vượt qua mốc 100 WPM, hãy tập buông phím nguyên âm dứt khoát trước khi gõ phím dấu thanh. Bộ đệm Telex thông suốt ắt kiếm khí tự sinh!`,
        ];
        setOracleAnswer(heuristicAnswers[Math.floor(Math.random() * heuristicAnswers.length)]);
      }
      setIsAskingOracle(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl h-[88vh] sm:h-[680px] max-h-[720px] min-h-[500px] flex flex-col rounded-3xl bg-slate-950 border border-purple-500/40 shadow-2xl shadow-purple-950/50 overflow-hidden">
        {/* Top Header Card with Dao Theme */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-purple-950/80 to-amber-950/70 border-b border-purple-500/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/30 via-purple-500/40 to-slate-900 border border-amber-400/60 flex items-center justify-center text-2xl shadow-lg shadow-purple-500/25 shrink-0">
              <span className="animate-[spin_12s_linear_infinite]">☯️</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  HUYỀN THIÊN KHÍ LINH
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  {DAO_BOT_TITLE}
                </span>
              </div>
              <p className="text-xs text-slate-300 hidden sm:block">
                Hệ thống giám giới, chưởng quản quy củ, ban thưởng đột phá & ghi chép đại sự toàn server
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            title="Đóng (Phím Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center p-2.5 bg-slate-900/90 border-b border-slate-800 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('chronicle');
            }}
            className={`h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'chronicle'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Scroll className="w-3.5 h-3.5" />
            <span>Biên Niên Sử Thiên Đạo ({decrees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('oracle');
            }}
            className={`h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'oracle'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 text-white font-black shadow-md shadow-purple-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Thỉnh Cầu Thiên Cơ (Hỏi Khí Linh)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveTab('personas');
            }}
            className={`h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'personas'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-cyan-300" />
            <span>Tam Đại Khí Linh</span>
          </button>
        </div>

        {/* TAB 1: CHRONICLE STREAM */}
        {activeTab === 'chronicle' && (
          <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-5 space-y-3.5 overflow-hidden">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 text-xs">
              <span className="text-slate-400 text-[11px] font-semibold mr-1 shrink-0">Bộ lọc:</span>
              {[
                { id: 'all', label: 'Tất cả chiếu thư' },
                { id: 'breakthrough', label: '🌟 Đột Phá' },
                { id: 'record', label: '👑 Kỷ Lục' },
                { id: 'penalty', label: '⚡ Phạt Gian Lận' },
                { id: 'boss_kill', label: '🐉 Diệt Boss' },
                { id: 'guidance', label: '🧘 Chỉ Điểm' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setFilterType(f.id);
                  }}
                  className={`h-7 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    filterType === f.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Decree Cards List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
              {filteredDecrees.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-xl">
                    📜
                  </div>
                  <div className="text-sm font-bold text-slate-300">Chưa có chiếu thư nào trong mục này</div>
                  <p className="text-xs text-slate-400">
                    Khi người chơi thi đấu, lập kỷ lục hoặc đột phá, Khí Linh sẽ lập tức công bố vào Biên Niên Sử!
                  </p>
                </div>
              ) : (
                filteredDecrees.map((decree) => {
                  const badge = getEventBadge(decree.eventType);
                  const timeStr = new Date(decree.timestamp).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const dateStr = new Date(decree.timestamp).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                  });

                  return (
                    <div
                      key={decree.id}
                      className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all space-y-2 group shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase flex items-center gap-1.5 ${badge.color}`}
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>

                          <span className="text-xs font-black text-amber-300 font-mono">
                            [{decree.title}]
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{timeStr} • {dateStr}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playKeyClick();
                              setSelectedDecreeForModal(decree);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Mở toàn văn Thiên Đạo Chiếu Thư"
                          >
                            <Scroll className="w-3 h-3" />
                            <span>Chiếu Thư</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed font-sans pl-1">
                        {decree.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DAO ORACLE (HỎI KHÍ LINH) */}
        {activeTab === 'oracle' && (
          <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-5 overflow-hidden">
            {/* Scrollable Upper Area */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1.5 custom-scrollbar">
              {/* Persona Selector Pill Tabs */}
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 pl-2 shrink-0">Chọn Khí Linh:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setSelectedPersona('linh_lung');
                    }}
                    className={`h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedPersona === 'linh_lung'
                        ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-purple-500 text-white shadow-md shadow-purple-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>🪷</span>
                    <span>Linh Lung Tiên Đồng</span>
                    <span className="text-[10px] opacity-80 font-normal hidden sm:inline">(Phong Thần Bảng)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setSelectedPersona('huyen_thien');
                    }}
                    className={`h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedPersona === 'huyen_thien'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>☯️</span>
                    <span>Huyền Thiên Khí Linh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setSelectedPersona('ban_co');
                    }}
                    className={`h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedPersona === 'ban_co'
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>⚡</span>
                    <span>Bàn Cổ Thần Thức</span>
                  </button>
                </div>
              </div>

              {/* Hero Advice Container */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-2.5 shadow-md ${
                selectedPersona === 'linh_lung'
                  ? 'bg-gradient-to-r from-purple-950/70 via-pink-950/40 to-slate-950 border-purple-500/50 shadow-purple-950/40'
                  : 'bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border-purple-500/40'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedPersona === 'linh_lung' ? '🪷' : (selectedPersona === 'ban_co' ? '⚡' : '☯️')}</span>
                  <h3 className="text-sm font-black text-purple-200 uppercase tracking-wide">
                    {selectedPersona === 'linh_lung'
                      ? 'Linh Lung Tiên Đồng • Chưởng Quản Phong Thần Bảng'
                      : (selectedPersona === 'ban_co' ? 'Bàn Cổ Thần Thức • Giám Giới Thần Quân' : 'Huyền Thiên Khí Linh • Thiên Đạo Chấp Pháp Sứ')}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedPersona === 'linh_lung'
                    ? 'Tiên Đồng xin chào đạo hữu! Muốn xem bí quyết leo top Phong Thần Bảng, soi quẻ may mắn hay mẹo luyện ngón tay thần tốc nào? Cứ chọn câu hỏi bên dưới hoặc tự gõ câu hỏi nha, Tiên Đồng chỉ điểm tận tình!'
                    : 'Đạo hữu đang gặp bình cảnh tốc độ? Hãy chọn một câu hỏi gợi ý bên dưới hoặc tự nhập câu hỏi để Khí Linh khai mở tuệ nhãn chỉ điểm pháp môn thích hợp nhất.'}
                </p>

                {/* Preset Question Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {(selectedPersona === 'linh_lung'
                    ? [
                        '🪷 Soi quẻ vận khí & tốc độ hôm nay',
                        '🪷 Chỉ điểm bí kíp leo top Phong Thần Bảng',
                        '🪷 Mẹo gõ Telex tiếng Việt không bị vấp',
                        '🪷 Cách thả lỏng cổ tay sau 5 ván đấu',
                        '🪷 Bí kíp bấm phím số Numpad thần tốc',
                        '🪷 Tuyệt chiêu vượt ải Săn Boss & Đoán Chữ',
                      ]
                    : [
                        'Bói quẻ vận khí & tốc độ hôm nay',
                        'Chỉ điểm cách vượt qua bình cảnh WPM',
                        'Khắc phục tật gõ vội làm hỏng nhịp',
                        'Bí kíp thả lỏng ngón út bàn phím',
                      ]
                  ).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAskOracle(preset)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between group active:scale-95 ${
                        selectedPersona === 'linh_lung'
                          ? 'bg-purple-950/40 hover:bg-purple-900/50 border-purple-500/30 hover:border-purple-400 text-purple-100 hover:text-white'
                          : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-purple-500/40 text-slate-200 hover:text-purple-300'
                      }`}
                    >
                      <span>{preset}</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0 ml-1.5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Answer Display */}
              {isAskingOracle && (
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                  <div className="w-8 h-8 mx-auto animate-spin text-xl">
                    {selectedPersona === 'linh_lung' ? '🪷' : (selectedPersona === 'ban_co' ? '⚡' : '☯️')}
                  </div>
                  <div className="text-xs font-bold text-amber-300">
                    {selectedPersona === 'linh_lung'
                      ? 'Linh Lung Tiên Đồng đang lật mở Phong Thần Bảng chiêm bái...'
                      : (selectedPersona === 'ban_co' ? 'Bàn Cổ Thần Thức đang ngưng tụ ý niệm...' : 'Huyền Thiên Khí Linh đang khai mở Thần Thức chiêm bái...')}
                  </div>
                </div>
              )}

              {oracleAnswer && !isAskingOracle && (
                <div className={`p-4 sm:p-5 rounded-2xl border text-xs space-y-2.5 shadow-lg animate-fadeIn ${
                  selectedPersona === 'linh_lung'
                    ? 'bg-purple-950/40 border-purple-400/60 shadow-purple-950/50'
                    : 'bg-amber-950/25 border-amber-500/40'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 text-purple-300">
                      <span>{selectedPersona === 'linh_lung' ? '🪷' : '📜'}</span>
                      <span>{selectedPersona === 'linh_lung' ? 'Lời Tiên Đồng Mách Nước' : 'Lời Sấm Truyền Từ Khí Linh'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setOracleAnswer(null)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-slate-100 leading-relaxed italic text-xs bg-slate-950/70 p-3.5 rounded-xl border border-purple-500/30 font-sans">
                    {oracleAnswer}
                  </p>
                </div>
              )}

              {!oracleAnswer && !isAskingOracle && (
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <span>{selectedPersona === 'linh_lung' ? '🪷' : '🔮'}</span>
                  <span>Chọn câu hỏi phía trên hoặc tự nhập thắc mắc bên dưới để nhận lời chỉ điểm</span>
                </div>
              )}
            </div>

            {/* Fixed Input Bar at bottom */}
            <div className="pt-3 mt-2 border-t border-slate-800/80 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={oracleQuestion}
                onChange={(e) => setOracleQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskOracle();
                }}
                placeholder={
                  selectedPersona === 'linh_lung'
                    ? "Hỏi Linh Lung Tiên Đồng về bí kíp leo bảng vàng, mẹo gõ telex, quẻ hôm nay..."
                    : "Hỏi Khí Linh điều bạn thắc mắc về tu vi, WPM, bí kíp..."
                }
                className="flex-1 h-10 px-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-400 outline-none focus:border-purple-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => handleAskOracle()}
                disabled={isAskingOracle || !oracleQuestion.trim()}
                className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shrink-0 ${
                  selectedPersona === 'linh_lung'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-md shadow-purple-500/25'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Thỉnh Giáo</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: TAM ĐẠI KHÍ LINH (BOT PERSONAS) */}
        {activeTab === 'personas' && (
          <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/50 via-slate-900 to-blue-950/50 border border-cyan-500/30 shrink-0">
              <h3 className="text-xs sm:text-sm font-black text-cyan-300 uppercase tracking-wide flex items-center gap-2">
                <span>Tam Đại Khí Linh Tiên Giới</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Ba vị Khí Linh thần thức luân phiên giám giới, sấm truyền đạo cơ và bình phẩm các trận thư hùng đỉnh cao trong giới gõ phím.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {Object.values(DAO_BOT_PERSONAS).map((persona) => (
                <div
                  key={persona.id}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-400/50 transition-all space-y-3 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-amber-400/60 flex items-center justify-center text-2xl shadow-inner shrink-0">
                      <span>{persona.avatar}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-amber-300 truncate">
                        {persona.name}
                      </h4>
                      <span className="text-[10px] font-bold text-cyan-400 block truncate">
                        {persona.title}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {persona.style}
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-400">
                    <div>
                      <span className="text-slate-500">Tự xưng:</span>{' '}
                      <span className="text-amber-300 font-bold">{persona.selfPronoun}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Cách gọi đạo hữu:</span>{' '}
                      <span className="text-slate-200">Chư vị Đạo Hữu, Tiên Hữu, Tiểu bối</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Standalone Dao Decree Popup Modal */}
      <DaoDecreeModal
        decree={selectedDecreeForModal}
        isOpen={Boolean(selectedDecreeForModal)}
        onClose={() => setSelectedDecreeForModal(null)}
      />
    </div>
  );
};

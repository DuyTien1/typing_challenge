import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  RefreshCw, 
  DoorClosed, 
  Users, 
  Clock, 
  Radio, 
  AlertCircle, 
  Play, 
  Crown,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface PlayerInRoom {
  id: string;
  name: string;
  avatar: string;
  wpm: number;
  progress: number;
  isHost: boolean;
  isReady: boolean;
  isFinished: boolean;
  isSurrendered: boolean;
}

interface AdminRoomData {
  id: string;
  code: string;
  name: string;
  mode: string;
  modeName: string;
  difficulty: string;
  status: 'waiting' | 'in-game' | 'finished';
  hostId: string;
  hostName: string;
  maxSlots: number;
  playerCount: number;
  createdAt: number;
  players: PlayerInRoom[];
}

interface AdminRoomsTabProps {
  showToast: (msg: string) => void;
}

export const AdminRoomsTab: React.FC<AdminRoomsTabProps> = ({ showToast }) => {
  const [rooms, setRooms] = useState<AdminRoomData[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'waiting' | 'in-game'>('all');

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/rooms');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.rooms)) {
          setRooms(data.rooms);
        }
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    if (!autoRefresh) return;
    const interval = setInterval(fetchRooms, 3500);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleCloseRoom = async (room: AdminRoomData) => {
    if (!window.confirm(`Bạn có chắc chắn muốn giải tán phòng "${room.name || room.code}"? Các người chơi trong phòng sẽ được thông báo ngay lập tức.`)) {
      return;
    }
    soundFx.playKeyClick();
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}/close`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Đã giải tán phòng thành công!');
        fetchRooms();
      } else {
        showToast(data.error || 'Lỗi khi đóng phòng');
      }
    } catch {
      showToast('Lỗi kết nối khi đóng phòng');
    }
  };

  const filteredRooms = rooms.filter((r) => {
    if (filterStatus === 'waiting' && r.status !== 'waiting') return false;
    if (filterStatus === 'in-game' && r.status !== 'in-game') return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Control Header */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-black uppercase text-amber-400 tracking-wide flex items-center gap-2">
            <Swords className="w-4 h-4 text-sky-400" />
            <span>Giám Sát Trận Đấu & Phòng Chơi Trực Tuyến</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Theo dõi tiến độ realtime của từng đấu thủ trong mọi phòng thi đấu và cưỡng chế giải tán phòng kẹt.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterStatus === 'all' ? 'bg-amber-500 text-black shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất Cả ({rooms.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('in-game')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterStatus === 'in-game' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Đang Đua ({rooms.filter(r => r.status === 'in-game').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('waiting')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterStatus === 'waiting' ? 'bg-emerald-500 text-black shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Chờ ({rooms.filter(r => r.status === 'waiting').length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              autoRefresh 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
            title={autoRefresh ? 'Tắt tự động cập nhật' : 'Bật tự động cập nhật 3.5s'}
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse text-emerald-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              fetchRooms();
            }}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Làm mới ngay"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Rooms List */}
      {filteredRooms.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 text-xs flex flex-col items-center gap-2">
          <DoorClosed className="w-8 h-8 text-slate-600 mb-1" />
          <span>Hiện không có phòng thi đấu nào đang mở hoặc phù hợp với bộ lọc.</span>
          <span className="text-[10px] text-slate-600">Khi người chơi tạo phòng Solo, 1v1 hoặc Đấu trường, phòng sẽ hiển thị tại đây.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRooms.map((room) => {
            const isInGame = room.status === 'in-game';
            return (
              <div
                key={room.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all shadow-md space-y-3"
              >
                {/* Room Header Info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs truncate">
                        {room.name || `Phòng #${room.code}`}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-amber-400 font-bold">
                        #{room.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                        isInGame 
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse' 
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isInGame ? 'bg-sky-400' : 'bg-emerald-400'}`} />
                        <span>{isInGame ? 'Đang Đua' : 'Đang Đợi'}</span>
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-amber-300 font-semibold">{room.modeName}</span>
                      <span>•</span>
                      <span>Host: <strong className="text-white">{room.hostName}</strong></span>
                      <span>•</span>
                      <span>Độ khó: <span className="uppercase text-slate-300">{room.difficulty}</span></span>
                      <span>•</span>
                      <span>{room.playerCount}/{room.maxSlots} người</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCloseRoom(room)}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    title="Giải tán phòng cưỡng chế"
                  >
                    <DoorClosed className="w-3.5 h-3.5" />
                    <span>Giải Tán</span>
                  </button>
                </div>

                {/* Player Progress Bars in this Room */}
                <div className="space-y-2 pt-2 border-t border-slate-900">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Đấu Thủ Trong Phòng:
                  </div>

                  <div className="space-y-1.5">
                    {room.players.map((p) => {
                      const isHost = p.id === room.hostId;
                      return (
                        <div
                          key={p.id}
                          className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-sm shrink-0">{p.avatar || '👤'}</span>
                              <span className="font-semibold text-white truncate text-[11px]">
                                {p.name}
                              </span>
                              {isHost && (
                                <Crown className="w-3 h-3 text-amber-400 shrink-0" title="Chủ Phòng" />
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] shrink-0 font-mono">
                              <span className="text-amber-400 font-bold">{p.wpm} WPM</span>
                              <span className="text-slate-400">{Math.round(p.progress || 0)}%</span>
                              {p.isFinished && (
                                <span className="text-emerald-400 font-bold">XONG</span>
                              )}
                              {p.isSurrendered && (
                                <span className="text-rose-400 font-bold">ĐẦU HÀNG</span>
                              )}
                            </div>
                          </div>

                          {/* Progress Line */}
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                p.isFinished 
                                  ? 'bg-emerald-400' 
                                  : (p.isSurrendered ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400')
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, p.progress || 0))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

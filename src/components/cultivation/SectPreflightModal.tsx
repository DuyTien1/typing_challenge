import React, { useState, useEffect } from 'react';
import {
  SectInfo,
  SectWarStatus,
  SectWarPreflightResult,
} from '../../types';
import { soundFx } from '../../utils/audio';
import { serverSectWarPreflight } from '../../utils/roomManager';
import {
  Swords,
  Shield,
  Zap,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Flame,
  Award,
} from 'lucide-react';

interface SectPreflightModalProps {
  isOpen: boolean;
  onClose: () => void;
  mySect: SectInfo;
  warStatus: SectWarStatus | null;
  onConfirmStart: (isPractice: boolean, preflightToken?: string) => void;
}

export const SectPreflightModal: React.FC<SectPreflightModalProps> = ({
  isOpen,
  onClose,
  mySect,
  warStatus,
  onConfirmStart,
}) => {
  const [loading, setLoading] = useState(true);
  const [preflightData, setPreflightData] = useState<SectWarPreflightResult | null>(null);
  const [selectedMode, setSelectedMode] = useState<'official' | 'practice'>('official');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    serverSectWarPreflight({ sectId: mySect.id })
      .then((res) => {
        setPreflightData(res);
        if (!res.isEventActive || res.dailyAttemptsLeft <= 0) {
          setSelectedMode('practice');
        } else {
          setSelectedMode('official');
        }
      })
      .catch(() => {
        setSelectedMode('practice');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, mySect.id]);

  if (!isOpen) return null;

  const isEventOpen = preflightData?.isEventActive ?? warStatus?.isActive ?? false;
  const attemptsLeft = preflightData?.dailyAttemptsLeft ?? warStatus?.dailyAttemptsLeft ?? 3;
  const canChooseOfficial = isEventOpen && attemptsLeft > 0;

  const handleStart = () => {
    soundFx.playGuzhengNote(3);
    const isPractice = selectedMode === 'practice' || !canChooseOfficial;
    onConfirmStart(isPractice, preflightData?.preflightToken);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#111827] via-[#0d131f] to-[#070b12] border-2 border-amber-500/50 rounded-3xl shadow-[0_0_40px_rgba(245,158,11,0.3)] p-5 sm:p-6 text-white space-y-4 my-auto overflow-hidden">
        {/* Close button */}
        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900/80 hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider">
            <Swords className="w-3.5 h-3.5" />
            <span>Tiền Trạm Bắt Tay • Đồng Bộ Môn Phái</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 uppercase">
            Xác Nhận Xuất Chiến 3 Ải
          </h3>
          <p className="text-xs text-slate-300">
            Hệ thống đã xác nhận đệ tử thuộc môn phái <strong className="text-amber-300">{mySect.name}</strong> [{mySect.tag}]
          </p>
        </div>

        {/* Handshake Status Card */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5 font-bold">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Đồng bộ máy chủ:</span>
            </span>
            <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Khớp Tông Môn ID</span>
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-slate-400 font-bold">Trạng thái kết giới:</span>
            <span className="font-bold">
              {isEventOpen ? (
                <span className="text-emerald-300">🟢 Khai Mở (Cuối Tuần)</span>
              ) : (
                <span className="text-amber-400">🟡 Thao Diễn Võ Trường (Ngày Thường)</span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-slate-400 font-bold">Chiến lệnh xuất trận hôm nay:</span>
            <span className="font-mono font-bold text-amber-300">
              {attemptsLeft > 0 ? `Còn ${attemptsLeft}/3 Lượt` : 'Đã hết 3/3 lượt'}
            </span>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Chọn Hình Thức Vào Trận:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Option 1: Official War (Chính Thức Xuất Chiến) */}
            <button
              type="button"
              disabled={!canChooseOfficial}
              onClick={() => {
                soundFx.playKeyClick();
                setSelectedMode('official');
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                selectedMode === 'official' && canChooseOfficial
                  ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/50'
                  : !canChooseOfficial
                  ? 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-amber-300 text-xs flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Chính Thức Xuất Trận</span>
                </span>
                {canChooseOfficial ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    -{1} Lượt
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                    Khóa
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                {canChooseOfficial
                  ? 'Cộng điểm trực tiếp vào BXH Tông Môn và đóng góp thành tích cá nhân.'
                  : !isEventOpen
                  ? 'Sự kiện chỉ mở vào Thứ 7 & Chủ Nhật hàng tuần.'
                  : 'Đã sử dụng hết 3/3 lượt hôm nay.'}
              </p>
            </button>

            {/* Option 2: Practice Mode (Thao Diễn Luyện Tập) */}
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setSelectedMode('practice');
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedMode === 'practice' || !canChooseOfficial
                  ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-2 ring-cyan-400/50'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-cyan-300 text-xs flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Thao Diễn Võ Trường</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Vô Hạn
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Rèn luyện tự do 3 Ải liên hoàn không giới hạn số lần, không tiêu hao lượt lệnh bài.
              </p>
            </button>
          </div>
        </div>

        {/* 3 Stages Preview */}
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>QUY TRÌNH 3 ẢI LIÊN HOÀN (85 TỪ):</span>
            <span className="text-amber-400 font-mono">+25đ Thưởng Hoàn Thành</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
              <span className="text-base block">🇻🇳</span>
              <span className="font-bold text-emerald-300 text-[11px] block">Ải 1: Tiếng Việt</span>
              <span className="text-[10px] text-slate-400 font-mono">30 từ có dấu</span>
            </div>

            <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
              <span className="text-base block">🇬🇧</span>
              <span className="font-bold text-cyan-300 text-[11px] block">Ải 2: Tiếng Anh</span>
              <span className="text-[10px] text-slate-400 font-mono">30 từ quốc tế</span>
            </div>

            <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30">
              <span className="text-base block">🔢</span>
              <span className="font-bold text-amber-300 text-[11px] block">Ải 3: Phím Số</span>
              <span className="text-[10px] text-slate-400 font-mono">25 chuỗi số</span>
            </div>
          </div>
        </div>

        {/* Confirm Action Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={handleStart}
            className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-xl ${
              selectedMode === 'official' && canChooseOfficial
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-500/30'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/30'
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>
              {selectedMode === 'official' && canChooseOfficial
                ? `Chính Thức Xuất Chiến (Còn ${attemptsLeft}/3 Lượt)`
                : 'Bắt Đầu Thao Diễn Võ Trường'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

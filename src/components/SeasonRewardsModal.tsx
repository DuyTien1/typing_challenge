import React, { useState } from 'react';
import { claimSeasonReward } from '../utils/roomManager';
import { soundFx } from '../utils/audio';
import { Trophy, Gift, Crown, Sparkles, Check, X, ShieldAlert, Award } from 'lucide-react';
import { UserAccount } from '../types';

interface SeasonRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onClaimSuccess?: (rewardData: any) => void;
}

export const SeasonRewardsModal: React.FC<SeasonRewardsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onClaimSuccess,
}) => {
  const [claiming, setClaiming] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setStatusMsg(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        soundFx.playKeyClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClaim = async () => {
    if (!currentUser) {
      setStatusMsg({ type: 'error', text: 'Tán tu chỉ có thể thi đấu, không thể nhận phần thưởng. Hãy đăng nhập tài khoản chính thức!' });
      return;
    }
    setClaiming(true);
    setStatusMsg(null);
    soundFx.playKeyClick();
    try {
      const res = await claimSeasonReward();
      if (res && res.success) {
        soundFx.playVictory();
        setStatusMsg({
          type: 'success',
          text: res.message || 'Chúc mừng đạo hữu đã nhận thành công Phần Thưởng Đăng Đỉnh!',
        });
        if (onClaimSuccess) {
          onClaimSuccess(res);
        }
      } else {
        soundFx.playError();
        setStatusMsg({
          type: 'error',
          text: res?.error || 'Chưa đủ điều kiện nhận thưởng hoặc đã nhận hôm nay.',
        });
      }
    } catch (err: any) {
      soundFx.playError();
      setStatusMsg({ type: 'error', text: err?.message || 'Lỗi kết nối máy chủ.' });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundFx.playKeyClick();
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative text-left space-y-4 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/30 via-yellow-400/20 to-amber-500/30 text-amber-300 border border-amber-500/40">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                <span>PHẦN THƯỞNG ĐĂNG ĐỈNH BẢNG VÀNG</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Mùa Giải
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Tự động kết toán và trao thưởng vào 00:00 hàng ngày
              </p>
            </div>
          </div>
          <button
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

        {/* Reward Tiers List */}
        <div className="space-y-2.5">
          {/* Top 1 */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-yellow-950/30 to-slate-950/80 border border-amber-500/50 shadow-md shadow-amber-500/10 flex items-start gap-3">
            <div className="text-2xl p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 select-none">
              👑
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-black uppercase text-amber-300">
                  🥇 QUÁN QUÂN TOP 1 (HÀNG NGÀY / TUẦN)
                </span>
                <span className="text-xs font-bold font-mono text-amber-400">+500 Linh Thạch</span>
              </div>
              <p className="text-xs text-slate-200 mt-1">
                Danh hiệu độc quyền hoàng kim <b>« Kim Bảng Trạng Nguyên »</b> hoặc <b>« Thần Tốc Tôn Giả »</b>, Khung Avatar đặc biệt hào quang <b>« Kim Bảng Chi Chủ »</b> và +1200 Tu Vi.
              </p>
            </div>
          </div>

          {/* Top 2 - 3 */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-800/40 via-slate-900/30 to-slate-950/80 border border-slate-600/50 flex items-start gap-3">
            <div className="text-2xl p-2 rounded-xl bg-slate-700/30 border border-slate-500/40 select-none">
              🥈
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold uppercase text-slate-200">
                  🥈 TOP 2 - TOP 3 (BẢNG NHÃN & THÁM HOA)
                </span>
                <span className="text-xs font-bold font-mono text-slate-300">+300 Linh Thạch</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Danh hiệu Bạc / Đồng <b>« Bảng Nhãn Tinh Anh »</b> & <b>« Thám Hoa Kiên Cường »</b>, Khung Avatar Bạc/Đồng và +800 Tu Vi.
              </p>
            </div>
          </div>

          {/* Top 4 - 10 */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <div className="text-2xl p-2 rounded-xl bg-amber-950/30 border border-amber-800/40 select-none">
              🏅
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold uppercase text-amber-400">
                  🏅 TOP 4 - TOP 10 (THẬP ĐẠI CƯỜNG GIẢ)
                </span>
                <span className="text-xs font-bold font-mono text-amber-500">+150 Linh Thạch</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Hộp quà Đan Dược Tu Vi (Đại Hoàn Đan), Danh hiệu <b>« Thập Đại Cường Giả »</b> và +500 Tu Vi.
              </p>
            </div>
          </div>
        </div>

        {/* Status Message if any */}
        {statusMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Claim Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleClaim}
            disabled={claiming || !currentUser}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Gift className={`w-4 h-4 ${claiming ? 'animate-spin' : ''}`} />
            <span>
              {!currentUser
                ? 'Đăng Nhập Để Nhận Thưởng'
                : claiming
                ? 'Đang kết toán phần thưởng...'
                : 'Nhận Phần Thưởng Đăng Đỉnh Ngay'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

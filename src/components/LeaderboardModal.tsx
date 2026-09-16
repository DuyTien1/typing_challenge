import React, { useState } from 'react';
import { HighScoreRecord, GameMode } from '../types';
import { soundFx } from '../utils/audio';
import { Trophy, Clock, X, Flame } from 'lucide-react';
import { AvatarWithFrame } from '../utils/frames';

interface LeaderboardModalProps {
  highScores: Record<string, HighScoreRecord | null>;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  highScores,
  onClose,
}) => {
  const [selectedTab, setSelectedTab] = useState<string>('vi_dau');

  const tabs = [
    { id: 'vi_dau', name: 'Tiếng Việt Có Dấu', unit: 'WPM' },
    { id: 'vi_nodau', name: 'Tiếng Việt Không Dấu', unit: 'WPM' },
    { id: 'en', name: 'Tiếng Anh', unit: 'WPM' },
    { id: 'numpad', name: 'Bàn Phím Số', unit: 'WPM' },
    { id: 'ngau_hung', name: 'Ngẫu Hứng', unit: 'Điểm' },
    { id: 'doan_chu', name: 'Đoán Chữ', unit: 'Điểm' },
    { id: 'san_boss', name: 'Săn Boss', unit: 'DMG' },
  ];

  const currentScore = highScores[selectedTab];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">BẢNG VÀNG KỶ LỤC TRONG NGÀY</h3>
              <p className="text-xs text-slate-400">Tự động đặt lại lúc 00:00 (GMT+7)</p>
            </div>
          </div>
          <button
            id="btn-close-leaderboard"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          {tabs.map((tab) => (
            <button
              id={`tab-leaderboard-${tab.id}`}
              type="button"
              key={tab.id}
              onClick={() => {
                soundFx.playKeyClick();
                setSelectedTab(tab.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedTab === tab.id
                  ? 'bg-amber-500 text-black shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Current Highscore Display */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 text-center space-y-4 shadow-inner">
          {currentScore ? (
            <div className="space-y-3">
              <div className="relative inline-flex items-center justify-center pt-2">
                <AvatarWithFrame
                  icon={currentScore.avatar || '⚡'}
                  frameId={currentScore.frame || 'default'}
                  size="lg"
                />
                <span className="absolute -top-1.5 -right-2 text-2xl filter drop-shadow-md select-none animate-bounce">
                  👑
                </span>
              </div>
              <div>
                <div className="text-xs text-amber-400 uppercase tracking-widest font-bold">
                  Quán Quân Đang Nắm Giữ
                </div>
                <div className="text-xl font-black text-white mt-0.5">
                  {currentScore.username}
                </div>
              </div>

              <div className="flex justify-center items-baseline gap-2 font-mono">
                <span className="text-4xl font-black text-amber-400">
                  {currentScore.score > 0 ? currentScore.score : currentScore.wpm}
                </span>
                <span className="text-sm font-bold text-slate-400">
                  {tabs.find((t) => t.id === selectedTab)?.unit}
                </span>
              </div>

              <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800 font-mono">
                <span>Số lỗi: <b className="text-rose-400">{currentScore.errors}</b></span>
                <span>•</span>
                <span>
                  Thiết lập: {new Date(currentScore.timestamp).toLocaleTimeString('vi-VN')}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8 space-y-2 text-slate-400">
              <Flame className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold">Chưa có kỷ lục nào trong ngày hôm nay!</p>
              <p className="text-xs text-slate-500">
                Hãy là người đầu tiên thi đấu và ghi danh vào Bảng Vàng!
              </p>
            </div>
          )}
        </div>

        {/* Rule banner */}
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
          <span className="text-sm select-none">⚖️</span>
          <span>
            <b>Điều kiện vinh danh:</b> Ván đấu phải diễn ra trọn vẹn từ đầu đến cuối. Người chơi đầu hàng hoặc rời phòng (out) sẽ không được ghi danh dù đủ điểm.
          </span>
        </div>

        {/* Footer info */}
        <div className="text-center">
          <button
            id="btn-dismiss-leaderboard"
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

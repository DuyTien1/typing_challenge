import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  History,
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Flame,
  Zap,
  Target,
  Clock,
  Activity,
  AlertTriangle,
  Lightbulb,
  Keyboard,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
  Award,
  Sparkles,
  BarChart2,
  Filter,
  Trash2,
} from 'lucide-react';
import {
  MatchRecord,
  getFriendlyModeName,
  getModeIcon,
  generateTypingAdvice,
  analyzeMatchMistakes,
} from '../utils/matchHistory';
import { soundFx } from '../utils/audio';

interface MatchHistoryModalProps {
  isOpen: boolean;
  history: MatchRecord[];
  onClose: () => void;
  onClearHistory?: () => void;
  onPracticeMistakes?: (mistakeWords: string[]) => void;
  onRetryMatch?: (record: MatchRecord) => void;
}

export const MatchHistoryModal: React.FC<MatchHistoryModalProps> = ({
  isOpen,
  history,
  onClose,
  onClearHistory,
  onPracticeMistakes,
  onRetryMatch,
}) => {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'replay' | 'analytics' | 'errors' | 'coach'>('replay');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [copiedReport, setCopiedReport] = useState(false);

  // Replay Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [replayProgressSec, setReplayProgressSec] = useState<number>(0);
  const replayTimerRef = useRef<number | null>(null);

  // Filtered completed matches list (strictly max 20)
  const filteredMatches = useMemo(() => {
    let list = history.filter((m) => m.isCompleted !== false && m.result !== 'Đầu hàng');
    if (filterMode !== 'all') {
      list = list.filter((m) => m.modeId === filterMode);
    }
    return list.slice(0, 20);
  }, [history, filterMode]);

  // Set initial selected match
  useEffect(() => {
    if (filteredMatches.length > 0) {
      if (!selectedMatchId || !filteredMatches.some((m) => m.id === selectedMatchId)) {
        setSelectedMatchId(filteredMatches[0].id);
      }
    } else {
      setSelectedMatchId(null);
    }
  }, [filteredMatches, selectedMatchId]);

  const selectedMatch = useMemo(() => {
    return history.find((m) => m.id === selectedMatchId) || filteredMatches[0] || null;
  }, [history, selectedMatchId, filteredMatches]);

  // Total duration of selected match
  const matchDuration = useMemo(() => {
    if (!selectedMatch) return 60;
    if (selectedMatch.durationSeconds && selectedMatch.durationSeconds > 0) {
      return selectedMatch.durationSeconds;
    }
    if (selectedMatch.chartData && selectedMatch.chartData.length > 0) {
      return selectedMatch.chartData[selectedMatch.chartData.length - 1].second || 60;
    }
    return 60;
  }, [selectedMatch]);

  // Reset replay progress when selecting a new match
  useEffect(() => {
    setIsPlaying(false);
    setReplayProgressSec(0);
    if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }
  }, [selectedMatchId]);

  // Replay playback loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = 50; // 20 updates per second
      replayTimerRef.current = window.setInterval(() => {
        setReplayProgressSec((prev) => {
          const step = (intervalMs / 1000) * playbackSpeed;
          const next = prev + step;
          if (next >= matchDuration) {
            setIsPlaying(false);
            return matchDuration;
          }
          return next;
        });
      }, intervalMs);
    } else {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    }
    return () => {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, matchDuration]);

  // Replay derived state: Words completed at current progress
  const replayState = useMemo(() => {
    if (!selectedMatch) {
      return {
        currentWordIndex: 0,
        currentWpm: 0,
        currentAccuracy: 100,
        words: [],
        wordStatuses: [],
      };
    }

    const words = selectedMatch.promptWords || selectedMatch.wordLogs?.map((w) => w.word) || [];
    const totalWords = words.length > 0 ? words.length : Math.max(1, Math.round(selectedMatch.wpm * (matchDuration / 60)));

    // Proportion of timeline
    const fraction = matchDuration > 0 ? Math.min(1, Math.max(0, replayProgressSec / matchDuration)) : 0;
    const currentWordIndex = Math.min(words.length, Math.floor(fraction * words.length));

    // Current WPM interpolated from chartData
    let currentWpm = selectedMatch.wpm;
    if (selectedMatch.chartData && selectedMatch.chartData.length > 0) {
      const currentSec = Math.round(replayProgressSec);
      const exactPoint = selectedMatch.chartData.find((p) => p.second === currentSec);
      if (exactPoint) {
        currentWpm = exactPoint.wpm;
      } else {
        const sorted = [...selectedMatch.chartData].sort((a, b) => a.second - b.second);
        const nextPoint = sorted.find((p) => p.second >= currentSec);
        currentWpm = nextPoint ? nextPoint.wpm : selectedMatch.wpm;
      }
    }

    return {
      currentWordIndex,
      currentWpm: Math.round(currentWpm),
      currentAccuracy: selectedMatch.accuracy,
      words,
    };
  }, [selectedMatch, replayProgressSec, matchDuration]);

  // Aggregate stats across the 20 matches
  const aggregateStats = useMemo(() => {
    if (filteredMatches.length === 0) {
      return { avgWpm: 0, avgAcc: 0, bestWpm: 0, totalWords: 0, winCount: 0 };
    }
    const sumWpm = filteredMatches.reduce((acc, m) => acc + (m.wpm || 0), 0);
    const sumAcc = filteredMatches.reduce((acc, m) => acc + (m.accuracy || 100), 0);
    const bestWpm = Math.max(...filteredMatches.map((m) => m.wpm || 0));
    const totalWords = filteredMatches.reduce((acc, m) => acc + (m.totalWords || m.promptWords?.length || Math.round(m.wpm * 0.75)), 0);
    const winCount = filteredMatches.filter((m) => m.result === 'Thắng' || m.result === 'Top 1').length;

    return {
      avgWpm: Math.round(sumWpm / filteredMatches.length),
      avgAcc: Math.round(sumAcc / filteredMatches.length),
      bestWpm,
      totalWords,
      winCount,
    };
  }, [filteredMatches]);

  // Mistakes analysis for selected match
  const selectedMatchMistakes = useMemo(() => {
    if (!selectedMatch) return [];
    if (selectedMatch.mistakes && selectedMatch.mistakes.length > 0) {
      return selectedMatch.mistakes;
    }
    if (selectedMatch.wordLogs && selectedMatch.wordLogs.length > 0) {
      return analyzeMatchMistakes(selectedMatch.wordLogs, selectedMatch.promptWords, selectedMatch.keystrokes).mistakes;
    }
    return [];
  }, [selectedMatch]);

  // Typing Advice from Coach
  const adviceList = useMemo(() => {
    if (!selectedMatch) return [];
    return generateTypingAdvice(selectedMatch);
  }, [selectedMatch]);

  // Copy Analysis Report to clipboard
  const handleCopyReport = () => {
    if (!selectedMatch) return;
    const reportText = `🏆 BÁO CÁO PHÂN TÍCH TRẬN ĐẤU FASTTYPING
Chế độ: ${selectedMatch.mode}
Tốc độ: ${selectedMatch.wpm} WPM (Đỉnh: ${selectedMatch.peakWpm || selectedMatch.wpm} WPM)
Độ chính xác: ${selectedMatch.accuracy}%
Thời gian: ${matchDuration}s | Độ ổn định: ${selectedMatch.consistency || 85}%
Lỗi sai: ${selectedMatchMistakes.length} từ
Lời khuyên: ${adviceList[0]?.tip || 'Luyện tập đều đặn để giữ nhịp bàn phím!'}`;

    navigator.clipboard.writeText(reportText).then(() => {
      soundFx.playKeyClick();
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    });
  };

  // Keyboard shortcut listener: Esc to close, Space to toggle replay play/pause
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.code === 'Space' && activeTab === 'replay') {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          soundFx.playKeyClick();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl h-[90vh] max-h-[850px] min-h-[580px] flex flex-col rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl shadow-black overflow-hidden">
        {/* TOP HEADER */}
        <div className="p-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-900 via-[#131926] to-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-black shadow-lg shadow-emerald-500/20 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  LỊCH SỬ ĐẤU & PHÂN TÍCH KỸ NĂNG
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Tối đa 20 ván gần nhất
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Xem lại replay mô phỏng, chẩn đoán lỗi sai thường gặp và lời khuyên huấn luyện viên
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onClearHistory && history.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử đấu?')) {
                    soundFx.playKeyClick();
                    onClearHistory();
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Xóa toàn bộ lịch sử đấu"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Xóa Lịch Sử</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
              title="Đóng (Phím Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 20-MATCH AGGREGATE SUMMARY STRIP */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between gap-4 overflow-x-auto shrink-0">
          <div className="flex items-center gap-4 sm:gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400">Tốc độ TB:</span>
              <span className="font-black text-emerald-300 font-mono text-sm">{aggregateStats.avgWpm} WPM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-sky-400" />
              <span className="text-slate-400">Độ chính xác TB:</span>
              <span className="font-bold text-sky-300 font-mono text-sm">{aggregateStats.avgAcc}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Kỷ lục 20 ván:</span>
              <span className="font-black text-amber-400 font-mono text-sm">{aggregateStats.bestWpm} WPM</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-purple-400" />
              <span className="text-slate-400">Tổng từ đã gõ:</span>
              <span className="font-bold text-purple-300 font-mono">{aggregateStats.totalWords} từ</span>
            </div>
          </div>

          {/* Mode Filter Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterMode}
              onChange={(e) => {
                soundFx.playKeyClick();
                setFilterMode(e.target.value);
              }}
              className="bg-slate-900 border border-slate-700/80 text-slate-300 text-xs rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-amber-400"
            >
              <option value="all">Tất cả chế độ ({history.filter((m) => m.isCompleted !== false && m.result !== 'Đầu hàng').length})</option>
              <option value="vi_dau">🇻🇳 TV Có Dấu</option>
              <option value="vi_nodau">⚡ TV Không Dấu</option>
              <option value="en">🇬🇧 Tiếng Anh</option>
              <option value="numpad">🔢 Phím Số</option>
              <option value="outplay">👑 Outplay</option>
              <option value="san_boss">🐉 Săn Boss</option>
              <option value="doan_chu">🔍 Đoán Chữ</option>
              <option value="ngau_hung">🟡 Ngẫu Hứng</option>
            </select>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMNS (Left: 20 matches list, Right: Detail & Replay) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 grid-rows-[220px_1fr] lg:grid-rows-1 overflow-hidden min-h-0">
          {/* LEFT COLUMN: LIST OF COMPLETED MATCHES (4 Cols) */}
          <div className="lg:col-span-4 border-r border-slate-800/80 flex flex-col bg-slate-950/60 overflow-hidden">
            <div className="p-3 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>DANH SÁCH VÁN ĐẤU ({filteredMatches.length}/20)</span>
              <span className="text-[11px] text-slate-400">Bấm để xem replay</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y-0">
              {filteredMatches.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-2xl">
                    ⌨️
                  </div>
                  <div className="font-bold text-white text-sm">Chưa có ván đấu nào hoàn thành</div>
                  <p className="text-xs text-slate-400">
                    Hãy tham gia thi đấu hoặc luyện tập để hệ thống tự động ghi lại 20 trận gần nhất kèm replay và phân tích!
                  </p>
                </div>
              ) : (
                filteredMatches.map((match, idx) => {
                  const isSelected = match.id === selectedMatchId;
                  const modeIcon = getModeIcon(match.modeId);
                  const modeName = getFriendlyModeName(match.modeId);
                  const dateStr = new Date(match.timestamp).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <button
                      key={match.id}
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setSelectedMatchId(match.id);
                      }}
                      className={`w-full text-left p-2.5 rounded-2xl transition-all border flex items-center justify-between gap-3 cursor-pointer group ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-400/80 shadow-md ring-1 ring-amber-400/30'
                          : 'bg-slate-900/60 hover:bg-slate-800/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                          {modeIcon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">{modeName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">#{filteredMatches.length - idx}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>{dateStr}</span>
                            <span>•</span>
                            <span className={match.result === 'Thắng' || match.result === 'Top 1' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                              {match.result}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-amber-400 font-mono leading-none">
                          {match.wpm} <span className="text-[10px] text-slate-400 font-normal">WPM</span>
                        </div>
                        <div className="text-[11px] text-sky-400 font-medium mt-0.5">
                          {match.accuracy}% CX
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: SELECTED MATCH REPLAY & DEEP ANALYTICS (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col bg-slate-950 overflow-hidden min-h-0">
            {selectedMatch ? (
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                {/* MATCH SUB-HEADER: TABS */}
                <div className="p-3 sm:px-5 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setActiveTab('replay');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeTab === 'replay'
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Trình Phát Replay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setActiveTab('analytics');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeTab === 'analytics'
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>Phân Tích Chi Tiết</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setActiveTab('errors');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer relative ${
                        activeTab === 'errors'
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Lỗi Thường Gặp</span>
                      {selectedMatchMistakes.length > 0 && (
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-mono flex items-center justify-center">
                          {selectedMatchMistakes.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setActiveTab('coach');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeTab === 'coach'
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Lời Khuyên & Kỹ Năng</span>
                    </button>
                  </div>

                  {/* Quick Action Button: Copy Report */}
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    title="Sao chép báo cáo trận đấu"
                  >
                    {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReport ? 'Đã sao chép' : 'Sao chép báo cáo'}</span>
                  </button>
                </div>

                {/* TAB CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-0">
                  {/* TAB 1: INTERACTIVE REPLAY PLAYER */}
                  {activeTab === 'replay' && (
                    <div className="space-y-4">
                      {/* Replay Control Hub Bar */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                        {/* Play/Pause/Reset Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playKeyClick();
                              setIsPlaying(!isPlaying);
                            }}
                            className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-md shadow-amber-500/20"
                          >
                            {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black" />}
                            <span>{isPlaying ? 'Tạm Dừng' : 'Phát Replay'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playKeyClick();
                              setIsPlaying(false);
                              setReplayProgressSec(0);
                            }}
                            className="h-10 w-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                            title="Phát lại từ đầu"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          {/* Speed Selectors */}
                          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                            {[0.75, 1, 1.5, 2].map((spd) => (
                              <button
                                key={spd}
                                type="button"
                                onClick={() => {
                                  soundFx.playKeyClick();
                                  setPlaybackSpeed(spd);
                                }}
                                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                                  playbackSpeed === spd
                                    ? 'bg-amber-500 text-black font-bold'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {spd}x
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Live Meters */}
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400">Tốc độ tức thời</div>
                            <div className="text-base font-black text-amber-400 leading-tight">
                              {replayState.currentWpm} WPM
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400">Thời gian</div>
                            <div className="text-sm font-bold text-white">
                              {Math.round(replayProgressSec)}s / {matchDuration}s
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Scrubber Slider */}
                      <div className="space-y-1">
                        <input
                          type="range"
                          min={0}
                          max={matchDuration}
                          step={0.1}
                          value={replayProgressSec}
                          onChange={(e) => {
                            setReplayProgressSec(parseFloat(e.target.value));
                          }}
                          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>00:00</span>
                          <span>{Math.round(replayProgressSec)}s ({Math.round((replayProgressSec / matchDuration) * 100)}%)</span>
                          <span>{matchDuration}s</span>
                        </div>
                      </div>

                      {/* Live Text Canvas: Replay simulation */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 min-h-[180px] max-h-[260px] overflow-y-auto space-y-2 select-none shadow-inner font-mono text-sm sm:text-base leading-relaxed">
                        {replayState.words.length === 0 ? (
                          <div className="text-slate-400 italic text-center py-8">
                            Dữ liệu văn bản trận này đã được tổng hợp thành bảng thống kê chi tiết bên tab "Phân Tích Chi Tiết".
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-x-2 gap-y-1.5">
                            {replayState.words.map((word, idx) => {
                              const isPast = idx < replayState.currentWordIndex;
                              const isCurrent = idx === replayState.currentWordIndex;
                              const log = selectedMatch.wordLogs?.[idx];
                              const isIncorrect = log && !log.isCorrect;

                              return (
                                <span
                                  key={idx}
                                  className={`relative px-1 rounded transition-colors ${
                                    isCurrent
                                      ? 'bg-amber-500/20 text-amber-300 font-bold border-b-2 border-amber-400'
                                      : isPast
                                      ? isIncorrect
                                        ? 'text-rose-400 line-through bg-rose-500/10'
                                        : 'text-emerald-400 font-medium'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {word}
                                  {isPast && isIncorrect && log?.typed && (
                                    <span className="text-[10px] text-rose-300 bg-rose-950 px-1 rounded ml-1 border border-rose-800">
                                      {log.typed}
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Quick Rematch / Practice Mistakes Banner */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Bạn muốn cải thiện thành tích của bài thi đấu này?</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedMatchMistakes.length > 0 && onPracticeMistakes && (
                            <button
                              type="button"
                              onClick={() => {
                                soundFx.playKeyClick();
                                const mistakesList = selectedMatchMistakes.map((m) => m.original);
                                onPracticeMistakes(mistakesList);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Luyện {selectedMatchMistakes.length} từ sai</span>
                            </button>
                          )}

                          {onRetryMatch && (
                            <button
                              type="button"
                              onClick={() => {
                                soundFx.playKeyClick();
                                onRetryMatch(selectedMatch);
                                onClose();
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5 fill-black" />
                              <span>Thử thách lại bài này</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: DEEP ANALYTICS & WPM CURVE */}
                  {activeTab === 'analytics' && (
                    <div className="space-y-4">
                      {/* Metric 4 Cards Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-amber-400" />
                            <span>Tốc độ trung bình</span>
                          </div>
                          <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                            {selectedMatch.wpm} <span className="text-xs text-slate-400 font-normal">WPM</span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-rose-400" />
                            <span>Tốc độ đỉnh (Peak)</span>
                          </div>
                          <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
                            {selectedMatch.peakWpm || Math.round(selectedMatch.wpm * 1.15)}{' '}
                            <span className="text-xs text-slate-400 font-normal">WPM</span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Target className="w-3.5 h-3.5 text-sky-400" />
                            <span>Độ chính xác</span>
                          </div>
                          <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono">
                            {selectedMatch.accuracy}%
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Tính ổn định</span>
                          </div>
                          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                            {selectedMatch.consistency || 85}%
                          </div>
                        </div>
                      </div>

                      {/* Performance Timeline SVG Chart */}
                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-amber-400" />
                            Biến Thiên Tốc Độ WPM Theo Thời Gian
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            Thời lượng: {matchDuration} giây
                          </span>
                        </div>

                        {selectedMatch.chartData && selectedMatch.chartData.length > 1 ? (
                          <div className="h-44 w-full relative">
                            {/* Render SVG timeline */}
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>

                              {/* Grid lines */}
                              <line x1="0" y1="30" x2="500" y2="30" stroke="#334155" strokeDasharray="3,3" strokeWidth="0.5" />
                              <line x1="0" y1="75" x2="500" y2="75" stroke="#334155" strokeDasharray="3,3" strokeWidth="0.5" />
                              <line x1="0" y1="120" x2="500" y2="120" stroke="#334155" strokeDasharray="3,3" strokeWidth="0.5" />

                              {/* Points & Polyline */}
                              {(() => {
                                const maxWpm = Math.max(80, ...selectedMatch.chartData!.map((p) => p.wpm || 0)) * 1.15;
                                const maxSec = matchDuration || 60;
                                const points = selectedMatch.chartData!.map((p) => {
                                  const x = (p.second / maxSec) * 500;
                                  const y = 140 - ((p.wpm || 0) / maxWpm) * 120;
                                  return `${x},${y}`;
                                });

                                const areaPoints = `0,150 ${points.join(' ')} 500,150`;

                                return (
                                  <>
                                    <polygon points={areaPoints} fill="url(#wpmGradient)" />
                                    <polyline
                                      fill="none"
                                      stroke="#f59e0b"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      points={points.join(' ')}
                                    />
                                    {selectedMatch.chartData!.map((p, i) => {
                                      const x = (p.second / maxSec) * 500;
                                      const y = 140 - ((p.wpm || 0) / maxWpm) * 120;
                                      return (
                                        <circle
                                          key={i}
                                          cx={x}
                                          cy={y}
                                          r="3.5"
                                          fill="#fbbf24"
                                          stroke="#0f172a"
                                          strokeWidth="1.5"
                                        />
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </svg>
                          </div>
                        ) : (
                          <div className="h-32 flex items-center justify-center text-slate-500 text-xs italic">
                            Dữ liệu đồ thị WPM được biểu diễn dựa trên tốc độ hoàn thành bài: {selectedMatch.wpm} WPM.
                          </div>
                        )}
                      </div>

                      {/* Fatigue & Pacing Diagnostic */}
                      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
                        <div className="font-bold text-slate-300 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-sky-400" />
                          <span>Phân Tích Nhịp Thở & Thể Lực Đánh Máy:</span>
                        </div>
                        <p className="text-slate-400 leading-relaxed">
                          {selectedMatch.consistency && selectedMatch.consistency >= 85
                            ? '✅ Nhịp gõ phân bố rất đều từ đầu đến cuối trận. Bạn không có dấu hiệu mỏi tay hay bị đuối tốc độ về cuối.'
                            : '⚠️ Có sự chênh lệch nhịp gõ giữa các giai đoạn. Hãy chú ý thả lỏng vai và giữ tư thế ngồi thẳng lưng để duy trì tốc độ cao khi gõ bài dài.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: COMMON MISTAKES & ERROR PATTERNS */}
                  {activeTab === 'errors' && (
                    <div className="space-y-4">
                      {/* Summary pill */}
                      <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span className="text-rose-200 font-semibold">
                            {selectedMatchMistakes.length > 0
                              ? `Phát hiện ${selectedMatchMistakes.length} từ gõ sai trong ván này.`
                              : 'Ván đấu hoàn hảo! Không có từ nào bị gõ sai.'}
                          </span>
                        </div>
                        {selectedMatchMistakes.length > 0 && onPracticeMistakes && (
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playKeyClick();
                              const mistakesList = selectedMatchMistakes.map((m) => m.original);
                              onPracticeMistakes(mistakesList);
                              onClose();
                            }}
                            className="px-3 py-1 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <span>Luyện ngay các từ này</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Mistake words comparison table */}
                      {selectedMatchMistakes.length > 0 ? (
                        <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/60 divide-y divide-slate-800">
                          <div className="p-2.5 bg-slate-900 text-xs font-bold text-slate-400 grid grid-cols-12 gap-2">
                            <span className="col-span-4">Từ Chuẩn</span>
                            <span className="col-span-4">Bạn Đã Gõ</span>
                            <span className="col-span-4">Phân Loại Lỗi</span>
                          </div>
                          {selectedMatchMistakes.map((m, i) => (
                            <div key={i} className="p-2.5 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-800/40">
                              <span className="col-span-4 font-mono font-bold text-emerald-400">{m.original}</span>
                              <span className="col-span-4 font-mono text-rose-400 line-through">{m.typed}</span>
                              <span className="col-span-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-amber-300 border border-slate-700">
                                  {m.label}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 space-y-2">
                          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                          <div className="font-bold text-white">Độ chính xác 100%</div>
                          <p className="text-xs text-slate-400">
                            Bạn đã gõ chính xác toàn bộ các từ trong bài. Tiếp tục phát huy nhé!
                          </p>
                        </div>
                      )}

                      {/* Hesitation Analysis */}
                      {selectedMatch.slowestWord && (
                        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                          <div className="font-bold text-amber-400 flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>Từ bị khựng lâu nhất (Hesitation):</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-300">
                            <span>
                              Từ: <strong className="text-white font-mono text-sm px-1.5 py-0.5 bg-slate-800 rounded">"{selectedMatch.slowestWord.word}"</strong>
                            </span>
                            <span className="text-slate-400 font-mono">
                              Thời gian khựng: ~{(selectedMatch.slowestWord.pauseMs / 1000).toFixed(2)}s
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Mẹo: Tập quét mắt trước 1 từ để não bộ tiếp nhận từ mới trước khi ngón tay chạm phím.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: TYPING COACH & ACTIONABLE SKILL MASTERIES */}
                  {activeTab === 'coach' && (
                    <div className="space-y-4">
                      {/* Coach Intro Banner */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-transparent border border-amber-500/30 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-lg shrink-0">
                          🥋
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-black uppercase tracking-wider text-amber-400">
                            HUẤN LUYỆN VIÊN ĐÁNH MÁY CHUYÊN SÂU
                          </div>
                          <div className="text-xs text-slate-300 leading-relaxed">
                            Dựa trên phân tích nhịp gõ, độ trễ và các lỗi sai thực tế trong ván đấu này, dưới đây là các lời khuyên giúp bạn bứt phá tốc độ gõ phím:
                          </div>
                        </div>
                      </div>

                      {/* Actionable Tips Cards */}
                      <div className="space-y-2.5">
                        {adviceList.map((tip, idx) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex items-start gap-3">
                            <span className="text-xl shrink-0 mt-0.5">{tip.icon}</span>
                            <div className="space-y-1 min-w-0">
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                <span>{tip.title}</span>
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed">{tip.tip}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Skill Mastery Training Suite Actions */}
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-400" />
                          <span>Hành Động Khắc Phục Điểm Yếu:</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {selectedMatchMistakes.length > 0 && onPracticeMistakes && (
                            <button
                              type="button"
                              onClick={() => {
                                soundFx.playKeyClick();
                                const mistakesList = selectedMatchMistakes.map((m) => m.original);
                                onPracticeMistakes(mistakesList);
                                onClose();
                              }}
                              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all cursor-pointer group"
                            >
                              <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5 group-hover:text-rose-200">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Luyện tập riêng các từ sai</span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                Tạo bài thi đấu chứa chính xác các từ đã gõ sai trong ván này để khắc phục ngay.
                              </div>
                            </button>
                          )}

                          {onRetryMatch && (
                            <button
                              type="button"
                              onClick={() => {
                                soundFx.playKeyClick();
                                onRetryMatch(selectedMatch);
                                onClose();
                              }}
                              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all cursor-pointer group"
                            >
                              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5 group-hover:text-amber-200">
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Thử thách lại bài này</span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                Tải lại đúng văn bản này để so sánh trực tiếp kết quả mới với WPM ván này.
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
                Chọn một ván đấu ở danh sách bên trái để xem phân tích chi tiết.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

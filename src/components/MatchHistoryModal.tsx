import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Compass,
  ArrowRight,
  Brain,
  Timer,
  Layers,
  Search,
} from 'lucide-react';
import { GameMode } from '../types';
import {
  MatchRecord,
  getFriendlyModeName,
  getModeIcon,
  generateTypingAdvice,
  analyzeMatchMistakes,
  aggregateHistoryMistakes,
  AiPersonalizedPracticeResult,
  detectMatchCategory,
} from '../utils/matchHistory';
import { generateAlgorithmicDrill } from '../utils/aiPersonalizedDrill';
import {
  HeavenlyDaoAnalysisResult,
  fetchHeavenlyDaoAnalysis,
  generateHeuristicDaoAnalysis,
  generateDaoSpecializedDrillWords,
} from '../utils/heavenlyDaoAnalysis';
import { loadStoredCultivationState } from '../utils/cultivation';
import { HeavenlyDaoDashboard } from './HeavenlyDaoDashboard';
import { soundFx } from '../utils/audio';

interface MatchHistoryModalProps {
  isOpen: boolean;
  history: MatchRecord[];
  onClose: () => void;
  onClearHistory?: () => void;
  onPracticeMistakes?: (mistakeWords: string[], modeOverride?: any) => void;
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
  const [activeTab, setActiveTab] = useState<'replay' | 'analytics' | 'errors' | 'ai_practice' | 'heavenly_dao'>('replay');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedPracticeWords, setCopiedPracticeWords] = useState(false);

  // Hover state for interactive chart tooltip
  const [hoveredChartPoint, setHoveredChartPoint] = useState<{ second: number; wpm: number; errors?: number; x: number; y: number } | null>(null);

  // AI Personalized Practice States & Selected Mode
  const [aiDrillMode, setAiDrillMode] = useState<GameMode>('vi_dau');
  const [aiPracticeResult, setAiPracticeResult] = useState<AiPersonalizedPracticeResult | null>(null);
  const [isLoadingAiPractice, setIsLoadingAiPractice] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Heavenly Dao Analysis States
  const [daoAnalysisResult, setDaoAnalysisResult] = useState<HeavenlyDaoAnalysisResult | null>(null);
  const [isLoadingDaoAnalysis, setIsLoadingDaoAnalysis] = useState(false);
  const [daoError, setDaoError] = useState<string | null>(null);

  // Replay Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [replayProgressSec, setReplayProgressSec] = useState<number>(0);
  const replayTimerRef = useRef<number | null>(null);

  // Filtered completed matches list (strictly max 20)
  const filteredMatches = useMemo(() => {
    let list = history.filter((m) => m.isCompleted !== false && m.result !== 'Đầu hàng' && m.result !== 'AFK');
    if (filterMode !== 'all') {
      list = list.filter((m) => m.modeId === filterMode);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => {
        const modeName = getFriendlyModeName(m.modeId).toLowerCase();
        return modeName.includes(q) || String(m.wpm).includes(q) || (m.result && m.result.toLowerCase().includes(q));
      });
    }
    return list.slice(0, 20);
  }, [history, filterMode, searchQuery]);

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

  // Sync AI Drill Mode with the selected match or active filter
  useEffect(() => {
    if (selectedMatch) {
      const category = detectMatchCategory(selectedMatch);
      setAiDrillMode(category.resolvedModeId as GameMode);
    } else if (filterMode !== 'all') {
      setAiDrillMode(filterMode as GameMode);
    }
  }, [selectedMatch, filterMode]);

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

  // Reset replay progress and Dao analysis when selecting a new match
  useEffect(() => {
    setIsPlaying(false);
    setReplayProgressSec(0);
    setHoveredChartPoint(null);
    if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    setDaoAnalysisResult(null);
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
      };
    }

    const words = selectedMatch.promptWords || selectedMatch.wordLogs?.map((w) => w.word) || [];

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

  // Aggregate mistakes across entire match history (up to 20 matches)
  const historyAggregate = useMemo(() => {
    return aggregateHistoryMistakes(history);
  }, [history]);

  // Generate AI Personalized Practice with explicit mode support
  const handleGenerateAiPractice = async (forceRefresh = false, targetModeOverride?: GameMode) => {
    const matchCat = detectMatchCategory(selectedMatch);
    const activeMode = (targetModeOverride || (matchCat.isNumberMode ? 'numpad' : matchCat.isEnMode ? 'en' : matchCat.isViNoDauMode ? 'vi_nodau' : aiDrillMode || 'vi_dau')) as GameMode;
    if (targetModeOverride) {
      setAiDrillMode(targetModeOverride);
    }

    if (aiPracticeResult && !forceRefresh && !targetModeOverride) {
      setActiveTab('ai_practice');
      return;
    }

    setIsLoadingAiPractice(true);
    setAiError(null);
    setActiveTab('ai_practice');

    const isNum = activeMode === 'numpad' || matchCat.isNumberMode;

    let sourceMistakes =
      selectedMatchMistakes.length > 0
        ? [...selectedMatchMistakes, ...historyAggregate.allMistakes.slice(0, 10)]
        : historyAggregate.allMistakes;

    if (isNum) {
      sourceMistakes = sourceMistakes.filter((m) => {
        const orig = String(m?.original || '');
        return /[\d+\-*/=.]/.test(orig) && !/[a-zA-Zà-ỹÀ-Ỹ]/.test(orig);
      });
    }

    let sourceKeys =
      selectedMatch?.commonErrorKeys && selectedMatch.commonErrorKeys.length > 0
        ? [...selectedMatch.commonErrorKeys, ...historyAggregate.allErrorKeys.slice(0, 6)]
        : historyAggregate.allErrorKeys;

    if (isNum) {
      sourceKeys = sourceKeys.filter((k) => {
        const keyStr = String(k?.key || '');
        return /[\d+\-*/=.]/.test(keyStr) && !/[a-zA-Z]/.test(keyStr);
      });
    }

    try {
      const payload = {
        mistakes: sourceMistakes.slice(0, 15),
        commonErrorKeys: sourceKeys.slice(0, 8),
        slowestWord: isNum ? undefined : (selectedMatch?.slowestWord || historyAggregate.slowestWords[0] || null),
        averageHesitationMs: selectedMatch?.averageHesitationMs || 320,
        stats: {
          wpm: selectedMatch?.wpm || historyAggregate.avgWpm,
          accuracy: selectedMatch?.accuracy || historyAggregate.avgAccuracy,
          consistency: selectedMatch?.consistency || historyAggregate.avgConsistency,
        },
        recentMatches: filteredMatches.slice(0, 5).map((m) => ({
          modeId: m.modeId,
          wpm: m.wpm,
          accuracy: m.accuracy,
        })),
        mode: activeMode,
      };

      const res = await fetch('/api/ai/personalized-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Không thể kết nối đến máy chủ AI');
      }

      const data: AiPersonalizedPracticeResult = await res.json();
      if (data.success) {
        if (isNum && Array.isArray(data.practiceWords)) {
          data.practiceWords = data.practiceWords
            .map((w) => String(w).trim().replace(/[^\d+\-*/=.]/g, ''))
            .filter((w) => w.length >= 1 && /\d/.test(w));
          if (data.practiceWords.length < 20) {
            const numFallbacks = [
              '1024', '58008', '2026', '9876', '1234', '5050', '31415', '92653',
              '7410', '8520', '9630', '4567', '7890', '13579', '24680', '9988',
              '1122', '3344', '7700', '4040', '8080', '1995', '2000', '2025'
            ];
            for (const n of numFallbacks) {
              if (data.practiceWords.length >= 30) break;
              if (!data.practiceWords.includes(n)) {
                data.practiceWords.push(n);
              }
            }
          }
        }
        setAiPracticeResult(data);
      } else {
        throw new Error('Dữ liệu phân tích AI không hợp lệ');
      }
    } catch (err: any) {
      console.warn('Lỗi phân tích AI, chuyển sang giải thuật phân tích cục bộ thông minh:', err);
      try {
        const algorithmicResult = generateAlgorithmicDrill(
          sourceMistakes,
          sourceKeys,
          isNum ? ['1024', '58008', '2026', '9876'] : historyAggregate.frequentErrorWords,
          activeMode
        );
        setAiPracticeResult({
          success: true,
          isAiPowered: false,
          analysis: {
            title: algorithmicResult.title,
            overview: algorithmicResult.diagnosis,
            dominantErrorPattern: isNum
              ? 'Trượt phím số xa & nhịp bấm Numpad'
              : (algorithmicResult.focalClusters[0]?.label || 'Lỗi nhịp phím & thanh điệu'),
            keyWeaknesses: algorithmicResult.coachingAdvice.slice(0, 3),
            targetClusters: algorithmicResult.focalClusters.map((c) => c.label),
            coachAdvice: algorithmicResult.coachingAdvice[0] || (isNum ? 'Giữ phím 5 Numpad có gờ làm điểm tựa định vị.' : 'Tập trung duy trì nhịp gõ đều đặn.'),
          },
          practiceWords: algorithmicResult.drillWords,
        });
      } catch {
        setAiError(err.message || 'Không thể tạo bài tập luyện AI lúc này.');
      }
    } finally {
      setIsLoadingAiPractice(false);
    }
  };

  // Launch AI Practice Solo Game
  const handleStartAiSoloGame = () => {
    if (!aiPracticeResult || !aiPracticeResult.practiceWords || aiPracticeResult.practiceWords.length === 0) return;
    soundFx.playKeyClick();
    if (onPracticeMistakes) {
      const matchCat = detectMatchCategory(selectedMatch);
      const hasNumbers = aiPracticeResult.practiceWords.some((w) => /^[\d+\-*/=.]+$/.test(w.trim()));
      const mode = (matchCat.isNumberMode || hasNumbers
        ? 'numpad'
        : (aiDrillMode || matchCat.resolvedModeId)) as GameMode;
      onPracticeMistakes(aiPracticeResult.practiceWords, mode);
      onClose();
    }
  };

  // Copy practice words to clipboard
  const handleCopyPracticeWords = () => {
    if (!aiPracticeResult?.practiceWords || aiPracticeResult.practiceWords.length === 0) return;
    navigator.clipboard.writeText(aiPracticeResult.practiceWords.join(' ')).then(() => {
      soundFx.playKeyClick();
      setCopiedPracticeWords(true);
      setTimeout(() => setCopiedPracticeWords(false), 2000);
    });
  };

  // Launch Heavenly Dao Analysis (AI + Cultivation Biomechanics)
  const handleOpenHeavenlyDao = async (forceRefresh = false) => {
    setActiveTab('heavenly_dao');
    if (daoAnalysisResult && !forceRefresh) return;

    setIsLoadingDaoAnalysis(true);
    setDaoError(null);
    try {
      const cultivationState = loadStoredCultivationState();
      const dataset = filteredMatches.length > 0 ? filteredMatches : history;
      const result = await fetchHeavenlyDaoAnalysis(dataset, cultivationState, selectedMatch);
      setDaoAnalysisResult(result);
    } catch (err: any) {
      console.warn('Lỗi khi tải Phân Tích Thiên Đạo:', err);
      setDaoError(err.message || 'Không thể lấy dữ liệu phân tích Thiên Đạo.');
      const cultivationState = loadStoredCultivationState();
      const dataset = filteredMatches.length > 0 ? filteredMatches : history;
      setDaoAnalysisResult(generateHeuristicDaoAnalysis(dataset, cultivationState, selectedMatch));
    } finally {
      setIsLoadingDaoAnalysis(false);
    }
  };

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

  // Mode filters list with labels & icons
  const MODE_FILTERS = [
    { id: 'all', label: 'Tất cả' },
    { id: 'vi_dau', label: 'TV Có Dấu' },
    { id: 'vi_nodau', label: 'TV Không Dấu' },
    { id: 'en', label: 'Tiếng Anh' },
    { id: 'numpad', label: 'Phím Số' },
    { id: 'outplay', label: 'Outplay' },
    { id: 'san_boss', label: 'Săn Boss' },
    { id: 'doan_chu', label: 'Đoán Chữ' },
    { id: 'ngau_hung', label: 'Ngẫu Hứng' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[900px] min-h-[620px] flex flex-col rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* ========================================================================= */}
        {/* ZONE 1: TOP BAR WITH CLEAN TYPOGRAPHY & KEY METRICS */}
        {/* ========================================================================= */}
        <header className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          {/* Brand & Context */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Lịch Sử Đấu & Phân Tích Kỹ Năng
                </h1>
                <span className="text-slate-500">/</span>
                <span className="text-xs text-slate-400">20 trận gần nhất</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>Tự động đối chiếu sai sót</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>Phân tích tốc độ WPM</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-cyan-400">Huấn luyện AI 3.8</span>
              </div>
            </div>
          </div>

          {/* Quick 20-Match Metrics Summary Bar */}
          <div className="hidden lg:flex items-center gap-5 text-xs font-mono">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-sans">Tốc độ TB</span>
              <span className="font-bold text-emerald-400 text-sm tabular-nums">{aggregateStats.avgWpm} WPM</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-sans">Độ chính xác TB</span>
              <span className="font-bold text-sky-400 text-sm tabular-nums">{aggregateStats.avgAcc}%</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-sans">Kỷ lục 20 ván</span>
              <span className="font-bold text-amber-400 text-sm tabular-nums">{aggregateStats.bestWpm} WPM</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-sans">Tổng số từ</span>
              <span className="font-bold text-purple-300 text-sm tabular-nums">{aggregateStats.totalWords}</span>
            </div>
          </div>

          {/* Right Header Actions */}
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
                className="h-8.5 px-3 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Xóa toàn bộ lịch sử đấu"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xóa Lịch Sử</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onClose();
              }}
              className="h-8.5 w-8.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng (Phím Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* FILTER & SEARCH STRIP */}
        {/* ========================================================================= */}
        <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Segmented Mode Filters */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar max-w-full">
            {MODE_FILTERS.map((m) => {
              const isActive = filterMode === m.id;
              const count = m.id === 'all'
                ? history.filter((x) => x.isCompleted !== false && x.result !== 'Đầu hàng' && x.result !== 'AFK').length
                : history.filter((x) => x.modeId === m.id && x.isCompleted !== false && x.result !== 'Đầu hàng' && x.result !== 'AFK').length;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setFilterMode(m.id);
                  }}
                  className={`h-7.5 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <span>{m.label}</span>
                  {count > 0 && (
                    <span className="text-[10px] font-mono opacity-60">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search or Quick Navigation */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm trận hoặc WPM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7.5 pl-8 pr-3 w-40 sm:w-48 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-600 transition-colors font-mono"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN BODY: TWO-PANE MASTER-DETAIL LAYOUT */}
        {/* ========================================================================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 grid-rows-[220px_1fr] lg:grid-rows-1 overflow-hidden min-h-0">
          
          {/* ===================================================================== */}
          {/* LEFT PANE: MATCH FEED (4 Columns) */}
          {/* ===================================================================== */}
          <aside className="lg:col-span-4 border-r border-slate-800/80 flex flex-col bg-slate-950/60 overflow-hidden">
            <div className="p-3 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">
                Danh sách ({filteredMatches.length} ván)
              </span>
              <span className="text-[11px] text-slate-500">
                Chọn để phân tích
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y-0">
              {filteredMatches.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-xl">
                    ⌨️
                  </div>
                  <div className="font-medium text-slate-300 text-xs">Không tìm thấy ván đấu nào</div>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Hãy tham gia thi đấu để hệ thống tự động ghi nhận và phân tích chi tiết dữ liệu 20 ván gần nhất.
                  </p>
                </div>
              ) : (
                filteredMatches.map((match, idx) => {
                  const isSelected = match.id === selectedMatchId;
                  const modeIcon = getModeIcon(match.modeId);
                  const modeName = getFriendlyModeName(match.modeId);
                  const matchDate = new Date(match.timestamp);
                  const dateStr = matchDate.toLocaleTimeString('vi-VN', {
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
                      className={`w-full text-left p-3 rounded-xl transition-all border flex items-center justify-between gap-3 cursor-pointer group ${
                        isSelected
                          ? 'bg-slate-900 border-l-4 border-l-amber-400 border-slate-800 text-white shadow-sm'
                          : 'bg-transparent hover:bg-slate-900/50 border-transparent hover:border-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-sm shrink-0">
                          {modeIcon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">
                            {modeName}
                          </div>
                          {/* Unboxed Metadata Line */}
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono">{dateStr}</span>
                            <span aria-hidden="true" className="text-slate-600">·</span>
                            <span className={
                              match.result === 'Thắng' || match.result === 'Top 1'
                                ? 'text-emerald-400 font-medium'
                                : match.result === 'AFK'
                                ? 'text-amber-400'
                                : 'text-slate-400'
                            }>
                              {match.result || 'Hoàn thành'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Primary WPM & Accuracy */}
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-amber-400 font-mono tabular-nums leading-none">
                          {match.wpm} <span className="text-[10px] text-slate-500 font-normal">WPM</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-1">
                          {match.accuracy}% CX
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* ===================================================================== */}
          {/* RIGHT PANE: SELECTED MATCH DETAIL & SKILL ANALYSIS (8 Columns) */}
          {/* ===================================================================== */}
          <main className="lg:col-span-8 flex flex-col bg-slate-950 overflow-hidden min-h-0">
            {selectedMatch ? (
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                
                {/* SUB-HEADER: ACTIONABLE TABS */}
                <div className="p-3 sm:px-5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setActiveTab('replay');
                      }}
                      className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                        activeTab === 'replay'
                          ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Xem Lại Replay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setActiveTab('analytics');
                      }}
                      className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                        activeTab === 'analytics'
                          ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>Phân Tích Kỹ Năng</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setActiveTab('errors');
                      }}
                      className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                        activeTab === 'errors'
                          ? 'bg-slate-800 text-rose-400 border border-slate-700 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Lỗi Sai</span>
                      {selectedMatchMistakes.length > 0 && (
                        <span className="font-mono text-[10px] text-rose-400 ml-0.5 font-bold">
                          ({selectedMatchMistakes.length})
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        handleGenerateAiPractice();
                      }}
                      className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                        activeTab === 'ai_practice'
                          ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Luyện Tập AI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        handleOpenHeavenlyDao();
                      }}
                      className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                        activeTab === 'heavenly_dao'
                          ? 'bg-slate-800 text-purple-300 border border-slate-700 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5 text-purple-400" />
                      <span>Thiên Đạo</span>
                    </button>
                  </div>

                  {/* Header Utility Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyReport}
                      className="h-8 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
                      title="Sao chép kết quả trận đấu vào clipboard"
                    >
                      {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span className="hidden sm:inline">{copiedReport ? 'Đã sao chép' : 'Sao chép'}</span>
                    </button>

                    {onRetryMatch && (
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playKeyClick();
                          onRetryMatch(selectedMatch);
                          onClose();
                        }}
                        className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Tải lại nguyên văn bản để thử thách lại"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Đấu Lại Bài Này</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* TAB VIEWPORT CONTAINER */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
                  
                  {/* ============================================================= */}
                  {/* TAB 1: REPLAY PLAYER & LIVE TIMELINE */}
                  {/* ============================================================= */}
                  {activeTab === 'replay' && (
                    <div className="space-y-4">
                      {/* Replay Control Bar */}
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playKeyClick();
                              setIsPlaying(!isPlaying);
                            }}
                            className="h-9 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            <span>{isPlaying ? 'Tạm Dừng' : 'Phát Replay'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playKeyClick();
                              setIsPlaying(false);
                              setReplayProgressSec(0);
                            }}
                            className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                            title="Phát lại từ đầu"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* Speed Selector */}
                          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs font-mono ml-2">
                            {[0.75, 1, 1.5, 2].map((spd) => (
                              <button
                                key={spd}
                                type="button"
                                onClick={() => {
                                  soundFx.playKeyClick();
                                  setPlaybackSpeed(spd);
                                }}
                                className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                                  playbackSpeed === spd
                                    ? 'bg-slate-800 text-amber-300 font-bold'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {spd}x
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Telemetry Display */}
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-sans">Tốc độ tức thời</span>
                            <span className="text-sm font-bold text-amber-400 tabular-nums">
                              {replayState.currentWpm} WPM
                            </span>
                          </div>
                          <div className="h-6 w-px bg-slate-800" />
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-sans">Thời gian</span>
                            <span className="text-sm font-medium text-slate-200 tabular-nums">
                              {Math.round(replayProgressSec)}s / {matchDuration}s
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Scrubber Range Slider */}
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
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>00:00</span>
                          <span>{Math.round(replayProgressSec)}s ({Math.round((replayProgressSec / matchDuration) * 100)}%)</span>
                          <span>{matchDuration}s</span>
                        </div>
                      </div>

                      {/* Interactive Text Canvas */}
                      <div className="p-4 sm:p-5 rounded-xl bg-slate-900 border border-slate-800 min-h-[190px] max-h-[280px] overflow-y-auto space-y-2 select-none font-mono text-sm leading-relaxed">
                        {replayState.words.length === 0 ? (
                          <div className="text-slate-400 italic text-center py-10 text-xs font-sans">
                            Dữ liệu bài gõ đã được ghi nhận. Bạn có thể xem biểu đồ và phân tích chi tiết ở tab "Phân Tích Kỹ Năng".
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
                                    <span className="text-[10px] text-rose-300 bg-rose-950 px-1 rounded ml-1 border border-rose-800 font-mono">
                                      {log.typed}
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Practice Mistakes Quick Remind Banner */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Bạn muốn bứt phá thành tích của bài thi đấu này?</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedMatchMistakes.length > 0 && onPracticeMistakes && (
                            <button
                              type="button"
                              onClick={() => {
                                soundFx.playKeyClick();
                                const category = detectMatchCategory(selectedMatch);
                                const specialized = generateDaoSpecializedDrillWords(history, selectedMatch, category.resolvedModeId);
                                const hasNumbers = specialized.practiceWords.some((w) => /^[\d+\-*/=.]+$/.test(w.trim()));
                                const targetMode: GameMode =
                                  category.isNumberMode || hasNumbers ? 'numpad' : category.resolvedModeId;
                                onPracticeMistakes(specialized.practiceWords, targetMode);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
                              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Đấu Lại Ngay</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ============================================================= */}
                  {/* TAB 2: DEEP SKILL ANALYSIS & PERFORMANCE CURVE */}
                  {/* ============================================================= */}
                  {activeTab === 'analytics' && (
                    <div className="space-y-4">
                      {/* Metric 4-Card Overview */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-amber-400" />
                            <span>Tốc độ trung bình</span>
                          </div>
                          <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
                            {selectedMatch.wpm} <span className="text-xs text-slate-500 font-normal">WPM</span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-rose-400" />
                            <span>Tốc độ đỉnh phong</span>
                          </div>
                          <div className="text-2xl font-bold text-rose-400 font-mono tabular-nums">
                            {selectedMatch.peakWpm || Math.round(selectedMatch.wpm * 1.15)}{' '}
                            <span className="text-xs text-slate-500 font-normal">WPM</span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-sky-400" />
                            <span>Độ chính xác</span>
                          </div>
                          <div className="text-2xl font-bold text-sky-400 font-mono tabular-nums">
                            {selectedMatch.accuracy}%
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Độ ổn định nhịp</span>
                          </div>
                          <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
                            {selectedMatch.consistency || 85}%
                          </div>
                        </div>
                      </div>

                      {/* Interactive High-Fidelity SVG Speed Chart */}
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <div className="font-semibold text-slate-200 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-amber-400" />
                            <span>Biến Thiên Tốc Độ WPM Theo Từng Giây</span>
                          </div>
                          <div className="text-slate-400 font-mono text-[11px]">
                            Thời lượng: {matchDuration} giây
                          </div>
                        </div>

                        {/* Chart Render */}
                        {(() => {
                          const chartPoints = (selectedMatch.chartData && selectedMatch.chartData.length > 1)
                            ? selectedMatch.chartData
                            : [
                                { second: 0, wpm: Math.round(selectedMatch.wpm * 0.7) },
                                { second: Math.round(matchDuration * 0.25), wpm: Math.round(selectedMatch.wpm * 0.95) },
                                { second: Math.round(matchDuration * 0.5), wpm: selectedMatch.peakWpm || Math.round(selectedMatch.wpm * 1.1) },
                                { second: Math.round(matchDuration * 0.75), wpm: selectedMatch.wpm },
                                { second: matchDuration, wpm: selectedMatch.wpm },
                              ];

                          const maxWpmValue = Math.max(70, ...chartPoints.map((p) => p.wpm || 0), selectedMatch.peakWpm || 0);
                          const yUpperBound = Math.ceil((maxWpmValue + 15) / 20) * 20;
                          const chartWidth = 600;
                          const chartHeight = 160;
                          const padLeft = 40;
                          const padRight = 20;
                          const padTop = 15;
                          const padBottom = 25;
                          const innerWidth = chartWidth - padLeft - padRight;
                          const innerHeight = chartHeight - padTop - padBottom;

                          const getX = (sec: number) => padLeft + (sec / matchDuration) * innerWidth;
                          const getY = (wpm: number) => padTop + innerHeight - (wpm / yUpperBound) * innerHeight;

                          const ptsString = chartPoints.map((p) => `${getX(p.second)},${getY(p.wpm)}`).join(' ');
                          const areaString = `${getX(0)},${chartHeight - padBottom} ${ptsString} ${getX(matchDuration)},${chartHeight - padBottom}`;

                          // Ticks
                          const yTicks = [0, Math.round(yUpperBound * 0.33), Math.round(yUpperBound * 0.66), yUpperBound];
                          const xStep = matchDuration <= 60 ? 15 : matchDuration <= 120 ? 30 : 60;
                          const xTicks: number[] = [];
                          for (let s = 0; s <= matchDuration; s += xStep) {
                            xTicks.push(s);
                          }
                          if (!xTicks.includes(matchDuration)) xTicks.push(matchDuration);

                          return (
                            <div className="w-full relative select-none">
                              <svg
                                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                className="w-full h-44 overflow-visible"
                                onMouseLeave={() => setHoveredChartPoint(null)}
                              >
                                <defs>
                                  <linearGradient id="historyWpmGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                                  </linearGradient>
                                </defs>

                                {/* Y Gridlines & Labels */}
                                {yTicks.map((yVal, i) => {
                                  const yPos = getY(yVal);
                                  return (
                                    <g key={i}>
                                      <line
                                        x1={padLeft}
                                        y1={yPos}
                                        x2={chartWidth - padRight}
                                        y2={yPos}
                                        stroke="#1e293b"
                                        strokeWidth="0.8"
                                        strokeDasharray="2,3"
                                      />
                                      <text
                                        x={padLeft - 8}
                                        y={yPos + 3}
                                        textAnchor="end"
                                        className="fill-slate-500 font-mono text-[9px] tabular-nums"
                                      >
                                        {yVal}
                                      </text>
                                    </g>
                                  );
                                })}

                                {/* X Gridlines & Labels */}
                                {xTicks.map((xVal, i) => {
                                  const xPos = getX(xVal);
                                  return (
                                    <g key={i}>
                                      <line
                                        x1={xPos}
                                        y1={padTop}
                                        x2={xPos}
                                        y2={chartHeight - padBottom}
                                        stroke="#1e293b"
                                        strokeWidth="0.8"
                                        strokeDasharray="2,3"
                                      />
                                      <text
                                        x={xPos}
                                        y={chartHeight - padBottom + 14}
                                        textAnchor="middle"
                                        className="fill-slate-500 font-mono text-[9px] tabular-nums"
                                      >
                                        {xVal}s
                                      </text>
                                    </g>
                                  );
                                })}

                                {/* Average WPM line */}
                                <line
                                  x1={padLeft}
                                  y1={getY(selectedMatch.wpm)}
                                  x2={chartWidth - padRight}
                                  y2={getY(selectedMatch.wpm)}
                                  stroke="#38bdf8"
                                  strokeWidth="1"
                                  strokeDasharray="4,4"
                                />

                                {/* Area & Line */}
                                <polygon points={areaString} fill="url(#historyWpmGrad)" />
                                <polyline
                                  fill="none"
                                  stroke="#f59e0b"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={ptsString}
                                />

                                {/* Points */}
                                {chartPoints.map((p, idx) => {
                                  const cx = getX(p.second);
                                  const cy = getY(p.wpm);
                                  const isPeak = p.wpm === maxWpmValue;

                                  return (
                                    <g
                                      key={idx}
                                      className="cursor-pointer"
                                      onMouseEnter={() => setHoveredChartPoint({ second: p.second, wpm: p.wpm, errors: p.errors, x: cx, y: cy })}
                                    >
                                      <circle
                                        cx={cx}
                                        cy={cy}
                                        r={isPeak ? 4.5 : 2.5}
                                        fill={isPeak ? '#fbbf24' : '#f59e0b'}
                                        stroke="#090d16"
                                        strokeWidth="1.5"
                                      />
                                    </g>
                                  );
                                })}

                                {/* Hover Crosshair & Details */}
                                {hoveredChartPoint && (
                                  <g pointerEvents="none">
                                    <line
                                      x1={hoveredChartPoint.x}
                                      y1={padTop}
                                      x2={hoveredChartPoint.x}
                                      y2={chartHeight - padBottom}
                                      stroke="#94a3b8"
                                      strokeWidth="0.8"
                                      strokeDasharray="2,2"
                                    />
                                    <circle
                                      cx={hoveredChartPoint.x}
                                      cy={hoveredChartPoint.y}
                                      r="5"
                                      fill="#fbbf24"
                                      stroke="#ffffff"
                                      strokeWidth="2"
                                    />
                                  </g>
                                )}
                              </svg>

                              {/* Hover Tooltip Box */}
                              {hoveredChartPoint && (
                                <div
                                  className="absolute -top-3 p-2 rounded-lg bg-slate-950 border border-slate-700 shadow-xl text-xs font-mono z-20 pointer-events-none transform -translate-x-1/2"
                                  style={{ left: `${(hoveredChartPoint.x / chartWidth) * 100}%` }}
                                >
                                  <div className="text-slate-400 text-[10px]">Giây {hoveredChartPoint.second}s</div>
                                  <div className="text-amber-400 font-bold">{hoveredChartPoint.wpm} WPM</div>
                                  {hoveredChartPoint.errors && hoveredChartPoint.errors > 0 ? (
                                    <div className="text-rose-400 text-[10px]">+{hoveredChartPoint.errors} lỗi</div>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Biomechanics & Pacing Analysis */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-sky-400" />
                            <span>Đánh Giá Nhịp Thở & Thể Lực Cơ Ngón Tay</span>
                          </div>
                          <p className="text-slate-400 leading-relaxed text-[11px]">
                            {selectedMatch.consistency && selectedMatch.consistency >= 85
                              ? 'Nhịp gõ phân bố rất đều đặn từ đầu đến cuối trận. Không phát hiện dấu hiệu mỏi cơ bàn tay hay sụt giảm nhịp thở lúc về đích.'
                              : 'Có sự chênh lệch nhịp gõ giữa các giai đoạn. Hãy chú ý thả lỏng khớp cổ tay và giữ tư thế ngồi thẳng lưng để duy trì tốc độ cao khi gõ bài dài.'}
                          </p>
                        </div>

                        {selectedMatch.slowestWord ? (
                          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                            <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                              <Timer className="w-3.5 h-3.5" />
                              <span>Điểm Khựng Lâu Nhất (Cognitive Hesitation)</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-300 text-[11px] font-mono">
                              <span>
                                Từ: <strong className="text-white">"{selectedMatch.slowestWord.word}"</strong>
                              </span>
                              <span className="text-slate-400">
                                Dừng ~{(selectedMatch.slowestWord.pauseMs / 1000).toFixed(2)}s
                              </span>
                            </div>
                            <p className="text-slate-400 text-[11px] leading-relaxed">
                              Khắc phục: Tập quét mắt trước 1 từ để não bộ tiếp nhận mặt chữ mới trước khi ngón tay chạm phím.
                            </p>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Phản Xạ Liên Tục</span>
                            </div>
                            <p className="text-slate-400 text-[11px] leading-relaxed">
                              Không có điểm khựng bất thường trong bài thi đấu. Các ngón tay luân chuyển vị trí mượt mà.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Coach Actionable Recommendations */}
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <Lightbulb className="w-4 h-4 text-amber-400" />
                          <span>Lời Khuyên Huấn Luyện Viên Đánh Máy:</span>
                        </div>
                        <div className="space-y-2">
                          {adviceList.map((tip, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-xs">
                              <span className="text-base shrink-0 mt-0.5">{tip.icon}</span>
                              <div className="space-y-0.5">
                                <div className="font-semibold text-slate-200">{tip.title}</div>
                                <p className="text-slate-400 text-[11px] leading-relaxed">{tip.tip}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ============================================================= */}
                  {/* TAB 3: COMMON MISTAKES & ERROR BREAKDOWN */}
                  {/* ============================================================= */}
                  {activeTab === 'errors' && (
                    <div className="space-y-4">
                      {/* Summary Banner */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span className="text-slate-200">
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
                              const category = detectMatchCategory(selectedMatch);
                              const specialized = generateDaoSpecializedDrillWords(history, selectedMatch, category.resolvedModeId);
                              const hasNumbers = specialized.practiceWords.some((w) => /^[\d+\-*/=.]+$/.test(w.trim()));
                              const targetMode: GameMode =
                                category.isNumberMode || hasNumbers ? 'numpad' : category.resolvedModeId;
                              onPracticeMistakes(specialized.practiceWords, targetMode);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Luyện riêng {selectedMatchMistakes.length} từ sai</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Error Comparison Table */}
                      {selectedMatchMistakes.length > 0 ? (
                        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900 divide-y divide-slate-800">
                          <div className="px-4 py-2.5 bg-slate-950 text-xs font-semibold text-slate-400 grid grid-cols-12 gap-2">
                            <span className="col-span-4">Từ Chuẩn</span>
                            <span className="col-span-4">Bạn Đã Gõ</span>
                            <span className="col-span-4">Phân Loại Lỗi</span>
                          </div>
                          {selectedMatchMistakes.map((m, i) => (
                            <div key={i} className="px-4 py-2 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-800/40">
                              <span className="col-span-4 font-mono font-bold text-emerald-400">{m.original}</span>
                              <span className="col-span-4 font-mono text-rose-400 line-through">{m.typed}</span>
                              <span className="col-span-4 text-slate-400 text-[11px]">
                                {m.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                          <div className="font-semibold text-white text-xs">Độ chính xác 100%</div>
                          <p className="text-[11px] text-slate-500">
                            Bạn đã gõ chính xác toàn bộ văn bản trong ván này.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ============================================================= */}
                  {/* TAB 4: AI PERSONALIZED PRACTICE */}
                  {/* ============================================================= */}
                  {activeTab === 'ai_practice' && (
                    <div className="space-y-4">
                      {/* Mode Filter for Drill */}
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-medium">Chế độ mục tiêu:</span>
                          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                            {[
                              { id: 'numpad', label: '🔢 Phím Số' },
                              { id: 'vi_dau', label: '🇻🇳 Có Dấu' },
                              { id: 'vi_nodau', label: '⚡ Không Dấu' },
                              { id: 'en', label: '🇬🇧 Tiếng Anh' },
                            ].map((m) => {
                              const isActive = aiDrillMode === m.id;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    soundFx.playKeyClick();
                                    setAiDrillMode(m.id as GameMode);
                                    handleGenerateAiPractice(true, m.id as GameMode);
                                  }}
                                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                                    isActive
                                      ? 'bg-slate-800 text-cyan-300 font-bold'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {m.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            soundFx.playKeyClick();
                            handleGenerateAiPractice(true);
                          }}
                          disabled={isLoadingAiPractice}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${isLoadingAiPractice ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
                          <span>{isLoadingAiPractice ? 'Đang tạo...' : 'Tạo Lại Bài Mới'}</span>
                        </button>
                      </div>

                      {/* Loading State */}
                      {isLoadingAiPractice && (
                        <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-3">
                          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" />
                          <div className="text-xs font-semibold text-slate-200">
                            AI đang bóc tách mẫu lỗi & tạo bài tập riêng cho bạn...
                          </div>
                          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                            Đang đối chiếu các chuỗi gõ sai và tổng hợp danh sách từ đặc trị giúp tái tạo trí nhớ cơ bắp.
                          </p>
                        </div>
                      )}

                      {/* Error State */}
                      {aiError && !isLoadingAiPractice && (
                        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-3">
                          <span>{aiError}</span>
                          <button
                            type="button"
                            onClick={() => handleGenerateAiPractice(true)}
                            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-medium"
                          >
                            Thử lại
                          </button>
                        </div>
                      )}

                      {/* Content State */}
                      {aiPracticeResult && !isLoadingAiPractice && (
                        <div className="space-y-4">
                          {/* Diagnostic Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                              <span className="text-[11px] text-slate-500 font-medium block">Mẫu Lỗi Chi Phối</span>
                              <span className="text-sm font-bold text-rose-300 block">
                                {aiPracticeResult.analysis?.dominantErrorPattern || 'Trượt phím & nhịp bàn tay'}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                              <span className="text-[11px] text-slate-500 font-medium block">Cụm Phím Cần Tăng Cường</span>
                              <div className="flex flex-wrap gap-1">
                                {(aiPracticeResult.analysis?.targetClusters && aiPracticeResult.analysis.targetClusters.length > 0
                                  ? aiPracticeResult.analysis.targetClusters
                                  : ['ngh', 'uyên', 'iêng', 'dấu ngã']
                                ).map((cl, i) => (
                                  <span key={i} className="text-xs font-mono font-bold text-amber-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                    {cl}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                              <span className="text-[11px] text-slate-500 font-medium block">Điểm Khựng Nghiêm Trọng</span>
                              <span className="text-xs font-mono font-medium text-cyan-300 block truncate">
                                {selectedMatch?.slowestWord
                                  ? `"${selectedMatch.slowestWord.word}" (~${(selectedMatch.slowestWord.pauseMs / 1000).toFixed(2)}s)`
                                  : 'Nhịp gõ khá đồng đều'}
                              </span>
                            </div>
                          </div>

                          {/* Coach Advice */}
                          {aiPracticeResult.analysis?.coachAdvice && (
                            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
                              <span className="font-semibold text-emerald-400 block">Kỹ thuật khắc phục đề xuất:</span>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                {aiPracticeResult.analysis.coachAdvice}
                              </p>
                            </div>
                          )}

                          {/* Practice Words Bank */}
                          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="text-xs font-semibold text-white">
                                Danh Sách Từ Luyện Tập ({aiPracticeResult.practiceWords.length} từ)
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleCopyPracticeWords}
                                  className="h-8 px-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                                >
                                  {copiedPracticeWords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                                  <span>{copiedPracticeWords ? 'Đã sao chép' : 'Sao chép'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={handleStartAiSoloGame}
                                  className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>Vào Luyện Solo Ngay</span>
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 p-3.5 rounded-lg bg-slate-950 border border-slate-800 max-h-48 overflow-y-auto">
                              {aiPracticeResult.practiceWords.map((word, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs select-all"
                                >
                                  {word}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ============================================================= */}
                  {/* TAB 5: HEAVENLY DAO CULTIVATION DASHBOARD */}
                  {/* ============================================================= */}
                  {activeTab === 'heavenly_dao' && (
                    <HeavenlyDaoDashboard
                      analysis={
                        daoAnalysisResult ||
                        generateHeuristicDaoAnalysis(
                          filteredMatches.length > 0 ? filteredMatches : history,
                          loadStoredCultivationState(),
                          selectedMatch
                        )
                      }
                      isLoading={isLoadingDaoAnalysis}
                      onRefresh={() => handleOpenHeavenlyDao(true)}
                      onStartPractice={(words) => {
                        if (onPracticeMistakes) {
                          const category = detectMatchCategory(selectedMatch);
                          const hasNumbers = words.some((w) => /^[\d+\-*/=.]+$/.test(w.trim()));
                          const targetMode: GameMode =
                            category.isNumberMode || hasNumbers
                              ? 'numpad'
                              : category.isEnMode
                              ? 'en'
                              : category.isViNoDauMode
                              ? 'vi_nodau'
                              : 'vi_dau';
                          onPracticeMistakes(words, targetMode);
                          onClose();
                        }
                      }}
                    />
                  )}

                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
                Chọn một ván đấu ở danh sách bên trái để xem phân tích chi tiết.
              </div>
            )}
          </main>

        </div>
      </div>
    </div>
  );
};

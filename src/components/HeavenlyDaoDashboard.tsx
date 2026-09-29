import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  RotateCcw,
  Play,
  ShieldAlert,
  Flame,
  Clock,
  Compass,
  Zap,
  Target,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
  Copy,
  Check,
  Brain,
  Timer,
  HeartPulse,
} from 'lucide-react';
import {
  HeavenlyDaoAnalysisResult,
  ErrorTimingPhase,
} from '../utils/heavenlyDaoAnalysis';
import { soundFx } from '../utils/audio';

interface HeavenlyDaoDashboardProps {
  analysis: HeavenlyDaoAnalysisResult;
  isLoading: boolean;
  onRefresh: () => void;
  onStartPractice: (words: string[]) => void;
}

export const HeavenlyDaoDashboard: React.FC<HeavenlyDaoDashboardProps> = ({
  analysis,
  isLoading,
  onRefresh,
  onStartPractice,
}) => {
  const [selectedPillarKey, setSelectedPillarKey] = useState<string | null>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('acceleration');
  const [activeSubView, setActiveSubView] = useState<'overview' | 'timing' | 'patterns' | 'radar' | 'drill'>('overview');
  const [copiedWords, setCopiedWords] = useState(false);

  const {
    playerRealm,
    overallVerdict,
    errorPatterns,
    timingAnalysis,
    peerComparison,
    breakthroughPathway,
    practiceWords,
    targetedMistakes,
    targetedClusters,
    practiceDrillTitle,
    practiceDrillNote,
    isAiPowered,
  } = analysis;

  // Selected metric details for the interactive radar
  const selectedMetric = useMemo(() => {
    if (!selectedPillarKey) return peerComparison.metrics[0];
    return peerComparison.metrics.find((m) => m.key === selectedPillarKey) || peerComparison.metrics[0];
  }, [selectedPillarKey, peerComparison.metrics]);

  // Selected phase details for interactive timing analysis
  const selectedPhase = useMemo(() => {
    return (
      timingAnalysis.phases.find((p) => p.phaseId === selectedPhaseId) ||
      timingAnalysis.phases[1] ||
      timingAnalysis.phases[0]
    );
  }, [selectedPhaseId, timingAnalysis.phases]);

  // Total errors in timing analysis
  const totalTimingErrors = useMemo(() => {
    return timingAnalysis.phases.reduce((sum, p) => sum + p.errorCount, 0);
  }, [timingAnalysis.phases]);

  // Recovery latency status assessment
  const recoveryLatencyStatus = useMemo(() => {
    const lat = timingAnalysis.avgRecoveryLatencyMs;
    if (totalTimingErrors === 0) {
      return {
        label: 'Tuyệt Đỉnh Vô Ngã',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/30',
        desc: 'Không một lần khựng lại vì không mắc bất kỳ sai sót nào trong ván đấu.',
      };
    }
    if (lat <= 220) {
      return {
        label: 'Phản Xạ Xuất Quỷ Nhập Thần',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/30',
        desc: 'Hoàn hồn chớp nhoáng, gần như lập tức sửa lỗi và tái lập nhịp gõ chính xác.',
      };
    }
    if (lat <= 360) {
      return {
        label: 'Khá Ổn Định',
        color: 'text-sky-400',
        bg: 'bg-sky-500/15',
        border: 'border-sky-500/30',
        desc: 'Độ trễ phục hồi tương đương tu sĩ cùng cảnh giới, cần tinh chỉnh thao tác Backspace dứt khoát hơn.',
      };
    }
    if (lat <= 480) {
      return {
        label: 'Tâm Thức Hơi Chậm',
        color: 'text-amber-400',
        bg: 'bg-amber-500/15',
        border: 'border-amber-500/30',
        desc: 'Mỗi khi gõ sai, bạn bị sững sờ khoảng 0.4s trước khi bắt đầu sửa, làm tụt 6 - 10 WPM.',
      };
    }
    return {
      label: 'Tâm Ma Đình Trệ',
      color: 'text-rose-400',
      bg: 'bg-rose-500/15',
      border: 'border-rose-500/30',
      desc: 'Thời gian khựng lại quá lâu sau lỗi sai, dẫn đến việc mất nhịp thở và tụt dốc toàn ván.',
    };
  }, [timingAnalysis.avgRecoveryLatencyMs, totalTimingErrors]);

  // Compute Radar Chart Polygon Coordinates (6 vertices)
  const radarData = useMemo(() => {
    const size = 300;
    const center = size / 2;
    const radius = 105;
    const totalAxes = 6;

    const getCoord = (valueRatio: number, index: number) => {
      const angle = (Math.PI * 2 * index) / totalAxes - Math.PI / 2;
      const r = radius * Math.min(1.05, Math.max(0.15, valueRatio));
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return { x, y };
    };

    // Axes definitions
    const axes = peerComparison.metrics.map((m, i) => {
      const outer = getCoord(1, i);
      const labelCoord = getCoord(1.28, i);
      return {
        ...m,
        index: i,
        outerX: outer.x,
        outerY: outer.y,
        labelX: labelCoord.x,
        labelY: labelCoord.y,
      };
    });

    // Player Points (based on percentile 0 - 100)
    const playerPoints = peerComparison.metrics
      .map((m, i) => {
        const ratio = m.percentile / 100;
        const pt = getCoord(ratio, i);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');

    // Peer Average Points (normalized baseline ~ 50% percentile)
    const peerPoints = peerComparison.metrics
      .map((_, i) => {
        const pt = getCoord(0.5, i);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');

    // Top 10% Master Points (~ 90% percentile)
    const top10Points = peerComparison.metrics
      .map((_, i) => {
        const pt = getCoord(0.9, i);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');

    return {
      size,
      center,
      radius,
      axes,
      playerPoints,
      peerPoints,
      top10Points,
    };
  }, [peerComparison.metrics]);

  return (
    <div className="space-y-4 animate-fadeIn select-text">
      {/* 1. CELESTIAL HEADER COMMAND DECK */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-[#0e1726] to-slate-950 border border-slate-800 p-5 shadow-2xl">
        {/* Subtle ambient lighting */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-52 h-52 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="relative w-13 h-13 sm:w-15 sm:h-15 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 p-[1.5px] shrink-0 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center text-2xl sm:text-3xl">
                ☯️
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight uppercase flex items-center gap-2">
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                    Phân Tích Thiên Đạo
                  </span>
                  <span className="text-slate-500 font-normal">/</span>
                  <span className="text-slate-300 font-medium lowercase text-sm">đạo cơ & thần thức</span>
                </h2>
                <span className="text-[11px] text-slate-400 font-mono">
                  {isAiPowered ? 'Gemini 3.8 Flash' : 'Thiên Đạo Trí Tuệ Tự Động'}
                </span>
              </div>

              {/* Unboxed Metadata Strip */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="text-amber-400 font-medium">
                  Cảnh giới: <strong className="text-white font-semibold">{playerRealm.realmName} {playerRealm.subStage}</strong> (Tầng {playerRealm.tier})
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-300">
                  Phân khúc: <span className="font-mono text-cyan-300">{playerRealm.wpmBracket}</span>
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-300">
                  Tốc độ trung bình: <strong className="font-mono text-emerald-400 tabular-nums">{playerRealm.currentWpm} WPM</strong>
                </span>
              </div>

              <p className="text-xs text-slate-300/90 leading-relaxed pt-1 max-w-3xl">
                {overallVerdict.summary}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 self-stretch lg:self-auto">
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onRefresh();
              }}
              disabled={isLoading}
              className="h-9 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95 whitespace-nowrap"
              title="Phân tích lại dữ liệu từ lịch sử ván đấu"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
              <span>{isLoading ? 'Đang quan trắc...' : 'Thỉnh Giáo Lại'}</span>
            </button>

            {practiceWords && practiceWords.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onStartPractice(practiceWords);
                }}
                className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Luyện Hóa Giải Tâm Ma ({practiceWords.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Dual Progress Telemetry Cards */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-400">Vị thế trong phân khúc WPM:</span>
            </div>
            <div className="flex items-center gap-1 font-mono">
              <span className="text-emerald-400 font-bold tabular-nums">Vượt {overallVerdict.overallPercentile}%</span>
              <span className="text-slate-500 text-[11px]">đồng đạo</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-slate-400">Khí tức sẵn sàng đột phá:</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${overallVerdict.breakthroughReadiness}%` }}
                />
              </div>
              <span className="font-mono font-bold text-cyan-300 text-xs tabular-nums">
                {overallVerdict.breakthroughReadiness}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-VIEW SEGMENTED CONTROLS */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950/90 rounded-xl border border-slate-800/90 text-xs">
        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveSubView('overview');
          }}
          className={`h-8 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeSubView === 'overview'
              ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Tổng Quan Đạo Cơ</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveSubView('timing');
          }}
          className={`h-8 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeSubView === 'timing'
              ? 'bg-slate-800 text-amber-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Thời Điểm Lỗi & Hồi Khí</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveSubView('patterns');
          }}
          className={`h-8 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeSubView === 'patterns'
              ? 'bg-slate-800 text-rose-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Mẫu Lỗi & Tâm Ma ({errorPatterns.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveSubView('radar');
          }}
          className={`h-8 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeSubView === 'radar'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>Lục Trụ Tu Vi (Radar)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveSubView('drill');
          }}
          className={`h-8 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeSubView === 'drill'
              ? 'bg-slate-800 text-emerald-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Target className="w-3.5 h-3.5 text-emerald-400" />
          <span>Bộ Từ Đặc Trị ({practiceWords.length})</span>
        </button>
      </div>

      {/* 3. CORE SECTION: PHÂN BỔ THỜI ĐIỂM MẮC LỖI & ĐỘ TRỄ HỒI PHỤC THẦN THỨC */}
      {(activeSubView === 'overview' || activeSubView === 'timing') && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
          {/* Section Header with Telemetry Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="space-y-1">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Phân Bổ Thời Điểm Mắc Lỗi & Độ Trễ Hồi Phục Thần Thức</span>
              </div>
              <p className="text-xs text-slate-300 leading-normal max-w-2xl">
                {timingAnalysis.criticalMomentVerdict}
              </p>
            </div>

            {/* Total Analyzed Errors Count */}
            <div className="flex items-center gap-3 text-xs shrink-0 font-mono">
              <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                <span className="text-slate-500 mr-1.5">Tổng số lỗi:</span>
                <strong className={totalTimingErrors === 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {totalTimingErrors}
                </strong>
                <span className="text-slate-500 ml-1">lỗi</span>
              </div>
            </div>
          </div>

          {/* TELEMETRY METRIC BENCHMARK STRIP */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Metric 1: Độ Trễ Hồi Phục Thần Thức (ms) */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                  <span>Độ trễ hồi phục sau lỗi</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${recoveryLatencyStatus.bg} ${recoveryLatencyStatus.color} ${recoveryLatencyStatus.border} border`}>
                  {recoveryLatencyStatus.label}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-white tabular-nums">
                  ~{timingAnalysis.avgRecoveryLatencyMs}
                </span>
                <span className="text-xs text-slate-400 font-mono">ms / phím</span>
              </div>

              {/* Comparative horizontal gauge */}
              <div className="space-y-1 pt-1">
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full ${
                      timingAnalysis.avgRecoveryLatencyMs <= 250
                        ? 'bg-emerald-400'
                        : timingAnalysis.avgRecoveryLatencyMs <= 400
                        ? 'bg-sky-400'
                        : 'bg-rose-400'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(15, Math.round((600 - timingAnalysis.avgRecoveryLatencyMs) / 5)))}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Đỉnh phong: ~180ms</span>
                  <span className="text-slate-400">Đồng đạo: ~{timingAnalysis.peerAvgRecoveryMs}ms</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                {recoveryLatencyStatus.desc}
              </p>
            </div>

            {/* Metric 2: Tỷ Lệ Lỗi Dây Chuyền (Cascade Error Rate) */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lỗi dây chuyền (&lt; 800ms)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">Tâm lý dao động</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-amber-300 tabular-nums">
                  {timingAnalysis.cascadeErrorRate}%
                </span>
                <span className="text-xs text-slate-400 font-mono">tổng lỗi</span>
              </div>

              <div className="space-y-1 pt-1">
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      timingAnalysis.cascadeErrorRate <= 15
                        ? 'bg-emerald-400'
                        : timingAnalysis.cascadeErrorRate <= 30
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, timingAnalysis.cascadeErrorRate * 2.5)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>0% (Hoàn hảo)</span>
                  <span className="text-slate-400">An toàn: &lt; 20%</span>
                  <span className="text-rose-400">Báo động: &gt; 35%</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                {timingAnalysis.cascadeErrorRate > 25
                  ? 'Khi vừa gõ sai, bạn có xu hướng vội vàng bấm Backspace làm trượt thêm 1 - 2 phím kế tiếp.'
                  : 'Khả năng kiểm soát tâm lý sau lỗi khá tốt, ít bị cuốn vào vòng lặp gõ sai liên hoàn.'}
              </p>
            </div>

            {/* Metric 3: Giai Đoạn Cần Chú Ý Nhất */}
            {(() => {
              const worst = [...timingAnalysis.phases].sort((a, b) => b.errorCount - a.errorCount)[0];
              return (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Điểm nghẽn thời gian</span>
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400">Pha gõ yếu nhất</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-white truncate">
                      {totalTimingErrors === 0 ? 'Toàn Pha An Toàn' : worst.name.split(' (')[0]}
                    </span>
                    {totalTimingErrors > 0 && (
                      <span className="text-xs font-mono font-bold text-rose-400">
                        ({worst.errorPercentage}%)
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">
                    Mốc thời gian: <strong className="text-slate-200">{worst.timeRange}</strong>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-normal pt-1 border-t border-slate-800/80">
                    {totalTimingErrors === 0
                      ? 'Đạo hữu phân phối lực tay đều đặn qua từng giây thi đấu, không có giai đoạn suy giảm.'
                      : `Tập trung kiểm soát tốc độ ở giai đoạn này sẽ lập tức cải thiện ${Math.round(worst.errorPercentage * 0.4)}% hiệu suất toàn trận.`}
                  </p>
                </div>
              );
            })()}
          </div>

          {/* VISUAL INTERACTIVE CHRONOGRAM TIMELINE BAR */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-cyan-400" />
                <span>Trục Thời Gian Thi Đấu & Mật Độ Phát Sinh Lỗi:</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Nhấp vào từng giai đoạn bên dưới để xem phân tích cơ sinh học
              </span>
            </div>

            {/* Segmented Phase Chronogram Bar */}
            <div className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800 p-1 flex gap-1 overflow-hidden">
              {timingAnalysis.phases.map((ph, idx) => {
                const isSelected = selectedPhase.phaseId === ph.phaseId;
                const isHigh = ph.riskLevel === 'cao';
                const isMed = ph.riskLevel === 'trung_binh';
                // Segment widths: 25%, 30%, 25%, 20%
                const widths = ['25%', '30%', '25%', '20%'];

                return (
                  <button
                    key={ph.phaseId}
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setSelectedPhaseId(ph.phaseId);
                    }}
                    style={{ width: widths[idx] || '25%' }}
                    className={`h-full rounded-lg transition-all flex items-center justify-between px-2.5 text-xs font-mono relative cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-cyan-400 shadow-md'
                        : 'hover:opacity-90'
                    } ${
                      isHigh
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                        : isMed
                        ? 'bg-amber-950/50 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    <span className="truncate text-[11px] font-bold">
                      {idx + 1}. {ph.name.split(' (')[0]}
                    </span>
                    <span className="font-bold shrink-0 text-[11px] tabular-nums">
                      {ph.errorCount} lỗi ({ph.errorPercentage}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 PHASES DETAILED EXPANDED CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {timingAnalysis.phases.map((ph) => {
              const isSelected = selectedPhase.phaseId === ph.phaseId;
              const isHigh = ph.riskLevel === 'cao';
              const isMed = ph.riskLevel === 'trung_binh';

              return (
                <div
                  key={ph.phaseId}
                  onClick={() => {
                    soundFx.playKeyClick();
                    setSelectedPhaseId(ph.phaseId);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-400 ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-500/10'
                      : isHigh
                      ? 'bg-slate-950/70 border-rose-500/30 hover:border-rose-500/60'
                      : isMed
                      ? 'bg-slate-950/70 border-amber-500/30 hover:border-amber-500/60'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tight">
                        {ph.xianxiaPhase}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          ph.errorCount === 0
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isHigh
                            ? 'bg-rose-500/25 text-rose-300'
                            : isMed
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/15 text-emerald-300'
                        }`}
                      >
                        {ph.errorCount === 0 ? 'Hoàn Hảo' : isHigh ? 'Điểm Nghẽn' : isMed ? 'Cảnh Báo' : 'An Toàn'}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-white leading-tight">
                      {ph.name}
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono">
                      {ph.timeRange}
                    </div>
                  </div>

                  {/* Error proportion bar */}
                  <div className="space-y-1 pt-1">
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ph.errorCount === 0
                            ? 'bg-emerald-400'
                            : isHigh
                            ? 'bg-rose-500'
                            : isMed
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, ph.errorPercentage * 2.2)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Số lỗi: <strong className="text-white">{ph.errorCount}</strong></span>
                      <span className={`font-bold tabular-nums ${isHigh ? 'text-rose-400' : 'text-slate-300'}`}>
                        {ph.errorPercentage}% tổng lỗi
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-normal pt-1.5 border-t border-slate-800/80">
                    {ph.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Deep-Dive Actionable Remedy for the Selected Phase */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span>Phương Pháp Hóa Giải Giai Đoạn [{selectedPhase.name}]:</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Khung thời gian: {selectedPhase.timeRange}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-300 text-[11px]">
                  🔬 Cơ Chế Thần Kinh - Cơ Ngón Tay:
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {selectedPhase.physiologicalCause || 'Độ trễ vận động thần kinh giữa hai bán cầu não và phản xạ xúc giác ngón tay.'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="font-semibold text-emerald-400 text-[11px]">
                  💡 Chiến Thuật Xuất Chiêu Khắc Phục:
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {selectedPhase.remedy || 'Chủ động điều hòa nhịp thở, không vội bung sức và luôn nhìn trước 1 từ.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. RADAR CHART & 6 PILLARS VIEW */}
      {(activeSubView === 'overview' || activeSubView === 'radar') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* RADAR SVG GRAPH (6 COLS) */}
          <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Biểu Đồ Lục Đại Trụ Cột Đạo Cơ</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Bách Phân Vị Chuẩn Hóa
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Đối chiếu tương quan giữa bạn với bình quân tu sĩ cùng phân khúc WPM và đỉnh phong 10% cao thủ.
              </p>
            </div>

            {/* SVG RADAR GRAPH */}
            <div className="py-2 flex items-center justify-center relative select-none">
              <svg
                width={radarData.size}
                height={radarData.size}
                className="overflow-visible max-w-full"
                viewBox={`0 0 ${radarData.size} ${radarData.size}`}
              >
                <defs>
                  <linearGradient id="playerRadarGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.15" />
                  </linearGradient>
                </defs>

                {/* Concentric Web Grid (4 rings) */}
                {[0.25, 0.5, 0.75, 1.0].map((ringLevel, rIdx) => {
                  const ringRadius = radarData.radius * ringLevel;
                  return (
                    <circle
                      key={rIdx}
                      cx={radarData.center}
                      cy={radarData.center}
                      r={ringRadius}
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth={rIdx === 3 ? 1.2 : 0.6}
                      strokeDasharray={rIdx === 3 ? 'none' : '3,3'}
                    />
                  );
                })}

                {/* Axes radiating out from center */}
                {radarData.axes.map((ax, i) => (
                  <line
                    key={i}
                    x1={radarData.center}
                    y1={radarData.center}
                    x2={ax.outerX}
                    y2={ax.outerY}
                    stroke="#334155"
                    strokeWidth="0.8"
                  />
                ))}

                {/* Top 10% Master Polygon (Dashed Gold) */}
                <polygon
                  points={radarData.top10Points}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  strokeDasharray="4,3"
                  strokeOpacity="0.65"
                />

                {/* Peer Average Polygon (Dashed Slate/Purple) */}
                <polygon
                  points={radarData.peerPoints}
                  fill="#6366f1"
                  fillOpacity="0.06"
                  stroke="#a855f7"
                  strokeWidth="1.5"
                  strokeDasharray="2,2"
                  strokeOpacity="0.65"
                />

                {/* Player Polygon (Solid Cyan/Emerald Glow) */}
                <polygon
                  points={radarData.playerPoints}
                  fill="url(#playerRadarGrad)"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />

                {/* Axis Labels & Interactive Dots */}
                {radarData.axes.map((ax, i) => {
                  const isSelected = selectedMetric.key === ax.key;
                  const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                  const ptRadius = radarData.radius * (ax.percentile / 100);
                  const nodeX = radarData.center + ptRadius * Math.cos(angle);
                  const nodeY = radarData.center + ptRadius * Math.sin(angle);

                  return (
                    <g
                      key={i}
                      className="cursor-pointer group"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setSelectedPillarKey(ax.key);
                      }}
                    >
                      <circle
                        cx={nodeX}
                        cy={nodeY}
                        r={isSelected ? 5.5 : 4}
                        fill={isSelected ? '#38bdf8' : '#67e8f9'}
                        stroke="#0f172a"
                        strokeWidth="2"
                        className="transition-all group-hover:scale-125"
                      />

                      <text
                        x={ax.labelX}
                        y={ax.labelY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className={`text-[10px] font-bold tracking-tight transition-colors ${
                          isSelected ? 'fill-cyan-300 font-black' : 'fill-slate-300 group-hover:fill-white'
                        }`}
                      >
                        {ax.xianxiaLabel}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Radar Legend */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                <span>Bản Thân ({overallVerdict.overallPercentile}%)</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-400 font-medium">
                <span className="w-2.5 h-0.5 bg-purple-400 inline-block border-b border-purple-400 border-dashed" />
                <span>Bình Quân Cùng Cảnh Giới</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="w-2.5 h-0.5 bg-amber-400 inline-block border-b border-amber-400 border-dashed" />
                <span>Đỉnh Phong 10% Cao Thủ</span>
              </div>
            </div>
          </div>

          {/* 6 PILLAR METRIC DETAILS (6 COLS) */}
          <div className="lg:col-span-6 space-y-3 flex flex-col justify-between">
            {/* Selected Pillar Highlight Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-cyan-500/30 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="text-cyan-300 font-mono font-bold text-[11px]">
                  {selectedMetric.xianxiaLabel}
                </span>
                <span className="text-slate-400 text-[11px]">
                  Bách phân vị: <strong className="text-cyan-400 font-mono tabular-nums">{selectedMetric.percentile}%</strong>
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <div className="text-sm font-bold text-white">{selectedMetric.label}</div>
                <div className="text-xl font-black font-mono text-cyan-300 tabular-nums">
                  {selectedMetric.playerValue} <span className="text-xs font-normal text-slate-400">{selectedMetric.unit}</span>
                </div>
              </div>

              {/* Progress comparison bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden relative">
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-purple-400 z-10"
                    style={{ left: '50%' }}
                    title="Bình quân cùng cảnh giới (50%)"
                  />
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10"
                    style={{ left: '90%' }}
                    title="Đỉnh phong 10% cao thủ (90%)"
                  />
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${selectedMetric.percentile}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Cần rèn luyện</span>
                  <span className="text-purple-300">Bình quân: {selectedMetric.peerAverage} {selectedMetric.unit}</span>
                  <span className="text-amber-300">Đỉnh phong: {selectedMetric.peerTop10} {selectedMetric.unit}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 italic pt-1">
                💡 Đánh giá Thiên Đạo: {selectedMetric.assessment}
              </p>
            </div>

            {/* Grid of the 6 pillars */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {peerComparison.metrics.map((m) => {
                const isSelected = selectedMetric.key === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setSelectedPillarKey(m.key);
                    }}
                    className={`p-3 rounded-xl text-left transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-400 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tight truncate">
                      {m.xianxiaLabel}
                    </div>
                    <div className="text-sm font-black text-white font-mono my-0.5 tabular-nums">
                      {m.playerValue} <span className="text-[10px] font-normal text-slate-400">{m.unit}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
                      <span>Đồng đạo: {m.peerAverage}</span>
                      <span className={m.percentile >= 50 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                        {m.percentile}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. PATTERNS & PSYCHOLOGICAL BOTTLENECK (TÂM MA) */}
      {(activeSubView === 'overview' || activeSubView === 'patterns') && (
        <div className="space-y-3">
          {/* Header Card with Tâm Ma Highlight */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-950 border border-rose-500/30 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-rose-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Tâm Ma Cốt Lõi Cần Trảm: {overallVerdict.tamMaName}</span>
              </span>
              <span className="text-[10px] font-mono text-rose-400">
                Căn Nguyên Tụt Nhịp
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {overallVerdict.tamMaDescription}
            </p>
          </div>

          {/* Cards for each keystroke error pattern */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {errorPatterns.map((pat) => (
              <div
                key={pat.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-2 flex flex-col justify-between shadow-lg"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-400 text-xs font-mono">
                      {pat.xianxiaTitle}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider ${
                        pat.severity === 'high'
                          ? 'text-rose-400 font-bold'
                          : pat.severity === 'medium'
                          ? 'text-amber-400 font-bold'
                          : 'text-cyan-400'
                      }`}
                    >
                      {pat.severity === 'high' ? 'Nghiêm trọng' : pat.severity === 'medium' ? 'Trung bình' : 'Nhẹ'}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white">{pat.name}</div>
                  <p className="text-xs text-slate-300 leading-normal">{pat.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
                  <div className="text-[11px] text-slate-400">
                    <strong className="text-slate-300">Cơ chế:</strong> {pat.biomechanics}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-500">Ví dụ:</span>
                    {pat.examples.map((ex, exIdx) => (
                      <span
                        key={exIdx}
                        className="px-2 py-0.5 rounded bg-slate-950 font-mono text-[11px] text-rose-300 border border-slate-800"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                    <span>Tần suất ghi nhận:</span>
                    <span className="font-bold text-amber-400 tabular-nums">
                      {pat.frequency} lần ({pat.percentage}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. 3-STEP ACTIONABLE BREAKTHROUGH PATHWAY */}
      {(activeSubView === 'overview' || activeSubView === 'timing') && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-[#0e1726] to-slate-950 border border-slate-800 space-y-3 shadow-xl">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Thiên Cơ Đột Phá: Lộ Trình 3 Bước Khắc Phục Điểm Yếu</span>
            </h3>
            <p className="text-xs text-slate-400">
              Thực hiện đúng 3 bước chỉ dẫn này trước mỗi ván đấu để nhanh chóng khai thông kinh mạch ngón tay.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <span>🧘</span>
                <span>{breakthroughPathway.step1.title}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {breakthroughPathway.step1.desc}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <span>⚡</span>
                <span>{breakthroughPathway.step2.title}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {breakthroughPathway.step2.desc}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span>🎯</span>
                <span>{breakthroughPathway.step3.title}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {breakthroughPathway.step3.desc}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 7. TARGETED PRACTICE DRILL WORDS */}
      {(activeSubView === 'overview' || activeSubView === 'drill') && practiceWords && practiceWords.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="text-emerald-300">
                    {practiceDrillTitle || (targetedMistakes && targetedMistakes.length > 0 ? `Bộ Từ Đặc Trị ${targetedMistakes.length} Lỗi Sai Thực Tế` : 'Bộ Từ Luyện Phản Xạ Cơ Ngón Tay')}
                  </span>
                  <span className="text-slate-500 font-normal">/</span>
                  <span className="text-slate-400 font-mono text-[11px]">{practiceWords.length} chuỗi mục tiêu</span>
                </h4>
              </div>
              <p className="text-xs text-slate-300">
                {practiceDrillNote || 'Thiên Đạo đã bóc tách chính xác các từ bạn gõ sai hoặc ngập ngừng để tạo chuỗi bài tập đặc trị này.'}
              </p>
            </div>

            {/* Actions: Copy & Play */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(practiceWords.join(' ')).then(() => {
                    soundFx.playKeyClick();
                    setCopiedWords(true);
                    setTimeout(() => setCopiedWords(false), 2000);
                  });
                }}
                className="h-9 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                title="Sao chép toàn bộ danh sách để tự luyện tập"
              >
                {copiedWords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedWords ? 'Đã Sao Chép' : 'Sao Chép'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onStartPractice(practiceWords);
                }}
                className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Vào Luyện Bài Này Ngay</span>
              </button>
            </div>
          </div>

          {/* Targeted Weakness Clusters & Mistakes Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80 text-xs">
            {targetedMistakes && targetedMistakes.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-rose-400 font-mono">Từ sai đã khoanh vùng:</span>
                {targetedMistakes.map((w, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 font-mono text-[11px]"
                  >
                    ✕ {w}
                  </span>
                ))}
              </div>
            )}

            {targetedClusters && targetedClusters.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-amber-400 font-mono">Cụm âm/phím khắc phục:</span>
                {targetedClusters.map((c, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[11px] font-medium"
                  >
                    ⚡ {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Word Preview */}
          <div className="flex flex-wrap gap-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800 max-h-48 overflow-y-auto">
            {practiceWords.map((word, idx) => {
              const isMistakeWord = targetedMistakes?.some(
                (m) => m.toLowerCase() === word.toLowerCase()
              );
              return (
                <span
                  key={idx}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all select-all ${
                    isMistakeWord
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-200 font-mono font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                  title={isMistakeWord ? 'Từ bạn từng gõ sai trong trận đấu' : 'Từ rèn luyện bổ trợ cùng cụm phím'}
                >
                  {isMistakeWord && <span className="text-rose-400 mr-1 font-black">●</span>}
                  {word}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

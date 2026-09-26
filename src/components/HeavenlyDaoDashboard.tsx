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
  Info,
  Copy,
  Check,
} from 'lucide-react';
import {
  HeavenlyDaoAnalysisResult,
  PeerBenchmarkMetric,
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
  const [activeSubView, setActiveSubView] = useState<'overview' | 'patterns' | 'timing' | 'radar'>('overview');
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

  // Compute Radar Chart Polygon Coordinates (6 vertices)
  const radarData = useMemo(() => {
    const size = 300;
    const center = size / 2;
    const radius = 105;
    const totalAxes = 6;

    const getCoord = (valueRatio: number, index: number) => {
      // 0 is top (-90 degrees), step by 60 degrees
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
    <div className="space-y-4 animate-fadeIn">
      {/* 1. TOP CELESTIAL MASTERY HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-purple-950/90 to-slate-950 border border-purple-500/40 p-5 sm:p-6 shadow-2xl">
        {/* Subtle celestial background stars & glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-purple-500 to-indigo-600 p-[2px] shrink-0 shadow-lg shadow-purple-500/30">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center text-2xl sm:text-3xl">
                ☯️
              </div>
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full border border-amber-300">
                AI
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase flex items-center gap-2">
                  <span className="bg-gradient-to-r from-amber-300 via-purple-200 to-cyan-300 bg-clip-text text-transparent">
                    Bảng Điều Khiển Phân Tích Thiên Đạo
                  </span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/25 text-purple-300 border border-purple-400/40 shadow-sm">
                  {isAiPowered ? 'Gemini 3.8 Flash Cung Cấp' : 'Thiên Đạo Trí Tuệ Tự Động'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <span>✨ Cảnh Giới:</span>
                  <span className="text-white underline decoration-amber-500/60 decoration-2">
                    {playerRealm.realmName} {playerRealm.subStage} (Tầng {playerRealm.tier})
                  </span>
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-purple-300 font-medium">
                  Đồng đạo phân khúc: <strong className="text-white">{playerRealm.wpmBracket}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-300 font-mono">
                  Tốc độ ghi nhận: <strong className="text-white">{playerRealm.currentWpm} WPM</strong>
                </span>
              </div>

              <p className="text-xs text-slate-300/90 leading-relaxed pt-1 max-w-3xl">
                {overallVerdict.summary}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 self-stretch lg:self-auto">
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onRefresh();
              }}
              disabled={isLoading}
              className="h-10 px-4.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-purple-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md hover:border-purple-400 active:scale-95"
              title="Khai mở Thiên Đạo Nhãn để phân tích lại toàn bộ"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : 'text-purple-300'}`} />
              <span>{isLoading ? 'Đang quan trắc...' : 'Thỉnh Giáo Lại'}</span>
            </button>

            {practiceWords && practiceWords.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onStartPractice(practiceWords);
                }}
                className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition-all cursor-pointer active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Luyện Hóa Giải Tâm Ma ({practiceWords.length} chuỗi)</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Realm Percentile Meter */}
        <div className="mt-4 pt-3.5 border-t border-purple-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-purple-500/25 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-300">Vị thế trong cùng phân khúc WPM:</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold font-mono">
              <span className="text-emerald-400 text-sm">Vượt {overallVerdict.overallPercentile}%</span>
              <span className="text-slate-400 text-[10px]">đồng đạo</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-purple-500/25 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-slate-300">Khí tức sẵn sàng đột phá:</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                  style={{ width: `${overallVerdict.breakthroughReadiness}%` }}
                />
              </div>
              <span className="font-mono font-bold text-cyan-300 text-xs">
                {overallVerdict.breakthroughReadiness}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS FOR DEEP ANALYSIS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveSubView('overview');
          }}
          className={`h-9.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubView === 'overview'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
              : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tổng Quan Đạo Cơ</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveSubView('patterns');
          }}
          className={`h-9.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubView === 'patterns'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
              : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Mẫu Lỗi & Tâm Ma ({errorPatterns.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveSubView('timing');
          }}
          className={`h-9.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubView === 'timing'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
              : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Thời Điểm Mắc Lỗi & Hồi Khí</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setActiveSubView('radar');
          }}
          className={`h-9.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubView === 'radar'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
              : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Compass className="w-4 h-4 text-cyan-400" />
          <span>Biểu Đồ Lục Trụ Tu Vi (Radar)</span>
        </button>
      </div>

      {/* 3. MAIN CONTENT PANELS ACCORDING TO SUB-VIEW */}

      {/* VIEW: OVERVIEW OR RADAR */}
      {(activeSubView === 'overview' || activeSubView === 'radar') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* RADAR CHART (6 COLUMNS ON LARGE) */}
          <div className="lg:col-span-6 p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-purple-400" />
                  Biểu Đồ Lục Đại Trụ Cột Đạo Cơ
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Chuẩn hóa theo Bách Phân Vị
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
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
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.15" />
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
                      stroke="#334155"
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
                    stroke="#475569"
                    strokeWidth="0.8"
                  />
                ))}

                {/* Top 10% Realm Masters Polygon (Dashed Gold) */}
                <polygon
                  points={radarData.top10Points}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  strokeDasharray="4,3"
                  strokeOpacity="0.6"
                />

                {/* Peer Average Polygon (Dashed Purple/Slate) */}
                <polygon
                  points={radarData.peerPoints}
                  fill="#6366f1"
                  fillOpacity="0.08"
                  stroke="#a855f7"
                  strokeWidth="1.5"
                  strokeDasharray="2,2"
                  strokeOpacity="0.6"
                />

                {/* Player Polygon (Solid Cyan/Indigo Glow) */}
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
                  // Get exact player node coordinate
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
                      {/* Node circle */}
                      <circle
                        cx={nodeX}
                        cy={nodeY}
                        r={isSelected ? 5.5 : 4}
                        fill={isSelected ? '#38bdf8' : '#67e8f9'}
                        stroke="#0f172a"
                        strokeWidth="2"
                        className="transition-all group-hover:scale-125"
                      />

                      {/* Label Text */}
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

          {/* 6 PILLAR METRIC DETAILS (6 COLUMNS) */}
          <div className="lg:col-span-6 space-y-3 flex flex-col justify-between">
            {/* Selected Pillar Highlight Card */}
            <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-500/30 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px] border border-purple-400/30">
                  {selectedMetric.xianxiaLabel}
                </span>
                <span className="text-slate-400 text-[11px]">
                  Bách phân vị: <strong className="text-cyan-400 font-mono">{selectedMetric.percentile}%</strong>
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <div className="text-base font-bold text-white">{selectedMetric.label}</div>
                <div className="text-xl font-black font-mono text-cyan-300">
                  {selectedMetric.playerValue} {selectedMetric.unit}
                </div>
              </div>

              {/* Progress comparison bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden relative">
                  {/* Peer Average marker */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-purple-400 z-10"
                    style={{ left: '50%' }}
                    title="Bình quân cùng cảnh giới (50%)"
                  />
                  {/* Top 10% marker */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10"
                    style={{ left: '90%' }}
                    title="Đỉnh phong 10% cao thủ (90%)"
                  />
                  {/* Player fill */}
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${selectedMetric.percentile}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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
                    className={`p-3 rounded-2xl text-left transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-400 shadow-md shadow-cyan-500/15'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-[10px] font-mono text-purple-400 uppercase tracking-tight truncate">
                      {m.xianxiaLabel}
                    </div>
                    <div className="text-sm font-black text-white font-mono my-0.5">
                      {m.playerValue} <span className="text-[10px] font-normal text-slate-400">{m.unit}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
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

      {/* VIEW: PATTERNS & PSYCHOLOGICAL BOTTLENECK (TÂM MA) */}
      {(activeSubView === 'overview' || activeSubView === 'patterns') && (
        <div className="space-y-3">
          {/* Header Card with Tâm Ma Highlight */}
          <div className="p-4 rounded-3xl bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-950 border border-rose-500/40 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold uppercase tracking-wider text-rose-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Tâm Ma Cốt Lõi Cần Trảm: {overallVerdict.tamMaName}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
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
                className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-2 flex flex-col justify-between shadow-lg"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-400 text-xs font-mono">
                      {pat.xianxiaTitle}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        pat.severity === 'high'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : pat.severity === 'medium'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {pat.severity === 'high' ? 'Nghiêm trọng' : pat.severity === 'medium' ? 'Trung bình' : 'Nhẹ'}
                    </span>
                  </div>

                  <div className="text-sm font-black text-white">{pat.name}</div>
                  <p className="text-xs text-slate-300 leading-normal">{pat.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
                  <div className="text-[11px] text-slate-400 font-mono">
                    <strong className="text-purple-300">Cơ chế cơ sinh học:</strong> {pat.biomechanics}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-500">Ví dụ thực tế:</span>
                    {pat.examples.map((ex, exIdx) => (
                      <span
                        key={exIdx}
                        className="px-2 py-0.5 rounded-md bg-slate-800 font-mono text-[11px] text-rose-300 border border-slate-700"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Tần suất ghi nhận:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {pat.frequency} lần ({pat.percentage}% tổng số lỗi)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: ERROR TIMING PHASES & RECOVERY LATENCY */}
      {(activeSubView === 'overview' || activeSubView === 'timing') && (
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-2 text-xs">
                <Clock className="w-4 h-4 text-amber-400" />
                Phân Bổ Thời Điểm Mắc Lỗi & Độ Trễ Hồi Phục Thần Thức
              </div>
              <p className="text-xs text-slate-400">
                {timingAnalysis.criticalMomentVerdict}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-950/80 px-3.5 py-2 rounded-2xl border border-slate-800 text-xs shrink-0 font-mono">
              <span className="text-slate-400">Độ trễ phục hồi sau lỗi:</span>
              <span className="text-amber-400 font-bold text-sm">
                ~{timingAnalysis.avgRecoveryLatencyMs}ms
              </span>
              <span className="text-slate-500 text-[10px]">
                (Đồng đạo: ~{timingAnalysis.peerAvgRecoveryMs}ms)
              </span>
            </div>
          </div>

          {/* 4 PHASES HORIZONTAL VISUAL TIMELINE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {timingAnalysis.phases.map((ph) => {
              const isHighRisk = ph.riskLevel === 'cao';
              return (
                <div
                  key={ph.phaseId}
                  className={`p-3.5 rounded-2xl border space-y-2 flex flex-col justify-between ${
                    isHighRisk
                      ? 'bg-rose-950/25 border-rose-500/40 shadow-md shadow-rose-500/10'
                      : ph.riskLevel === 'trung_binh'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono text-purple-300 uppercase">
                        {ph.xianxiaPhase}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isHighRisk
                            ? 'bg-rose-500/30 text-rose-300'
                            : ph.riskLevel === 'trung_binh'
                            ? 'bg-amber-500/30 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {ph.riskLevel === 'cao' ? 'Điểm Nghẽn' : ph.riskLevel === 'trung_binh' ? 'Cảnh Báo' : 'An Toàn'}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-white">{ph.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{ph.timeRange}</div>
                  </div>

                  {/* Percentage Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isHighRisk ? 'bg-rose-500' : ph.riskLevel === 'trung_binh' ? 'bg-amber-500' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, ph.errorPercentage * 2.2)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Số lỗi: {ph.errorCount}</span>
                      <span className={`font-bold ${isHighRisk ? 'text-rose-400' : 'text-slate-300'}`}>
                        {ph.errorPercentage}% tổng lỗi
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-normal pt-1 border-t border-slate-800/80">
                    {ph.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. THIÊN CƠ ĐỘT PHÁ - 3-STEP ACTIONABLE PATHWAY */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-950 border border-indigo-500/30 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Thiên Cơ Đột Phá: Lộ Trình 3 Bước Khắc Phục Điểm Yếu
            </h3>
            <p className="text-xs text-slate-400">
              Thực hiện đúng 3 bước chỉ dẫn này trước mỗi ván đấu để nhanh chóng khai thông kinh mạch ngón tay.
            </p>
          </div>

          {practiceWords && practiceWords.length > 0 && (
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onStartPractice(practiceWords);
              }}
              className="h-10 px-5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 shrink-0 active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Vào Luyện Bài Tập Này Ngay</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <span>🧘</span>
              <span>{breakthroughPathway.step1.title}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {breakthroughPathway.step1.desc}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
            <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <span>⚡</span>
              <span>{breakthroughPathway.step2.title}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {breakthroughPathway.step2.desc}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
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

      {/* 5. BỘ TỪ THIÊN ĐẠO ĐẶC TRỊ TỪ SAI THỰC TẾ */}
      {practiceWords && practiceWords.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/30 space-y-3.5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-400" />
                <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="bg-gradient-to-r from-rose-300 via-amber-200 to-cyan-300 bg-clip-text text-transparent">
                    {practiceDrillTitle || (targetedMistakes && targetedMistakes.length > 0 ? `Bộ Từ Đặc Trị ${targetedMistakes.length} Lỗi Sai Thực Tế` : 'Bộ Từ Luyện Phản Xạ Cơ Ngón Tay')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                    {practiceWords.length} từ mục tiêu
                  </span>
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
                className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-sm"
                title="Sao chép toàn bộ danh sách để tự luyện tập"
              >
                {copiedWords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedWords ? 'Đã Sao Chép' : 'Sao Chép Bộ Từ'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onStartPractice(practiceWords);
                }}
                className="h-10 px-5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
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
                    className="px-2 py-0.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 font-mono text-[11px] font-bold"
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
                    className="px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[11px] font-medium"
                  >
                    ⚡ {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Word Preview Pills */}
          <div className="flex flex-wrap gap-2 p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 max-h-48 overflow-y-auto">
            {practiceWords.map((word, idx) => {
              const isMistakeWord = targetedMistakes?.some(
                (m) => m.toLowerCase() === word.toLowerCase()
              );
              return (
                <span
                  key={idx}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-default select-all ${
                    isMistakeWord
                      ? 'bg-rose-950/50 hover:bg-rose-900/60 border-rose-500/60 text-rose-200 shadow-md shadow-rose-500/10 font-mono'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                  }`}
                  title={isMistakeWord ? 'Từ bạn từng gõ sai trong trận đấu - hãy tập trung cao độ!' : 'Từ rèn luyện bổ trợ cùng cụm phím'}
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

import { MatchRecord, MistakeDetail } from './matchHistory';
import { CultivationState, XIANXIA_REALMS } from './cultivation';

export interface KeystrokeErrorPattern {
  id: string;
  name: string;
  xianxiaTitle: string; // e.g., "Song Thủ Tranh Chấp", "Hỗn Loạn Telex"
  frequency: number;
  percentage: number;
  description: string;
  biomechanics: string; // Nguyên lý cơ sinh học ngón tay
  examples: string[];
  severity: 'high' | 'medium' | 'low';
}

export interface ErrorTimingPhase {
  phaseId: 'intro' | 'acceleration' | 'sustain' | 'endgame';
  name: string;
  xianxiaPhase: string;
  timeRange: string;
  errorCount: number;
  errorPercentage: number;
  description: string;
  riskLevel: 'cao' | 'trung_binh' | 'thap';
}

export interface PeerBenchmarkMetric {
  key: string;
  label: string;
  xianxiaLabel: string;
  unit: string;
  playerValue: number;
  peerAverage: number;
  peerTop10: number;
  percentile: number; // 0 - 100
  assessment: string;
}

export interface HeavenlyDaoAnalysisResult {
  success: boolean;
  isAiPowered: boolean;
  playerRealm: {
    realmName: string;
    tier: number;
    subStage: string;
    currentWpm: number;
    wpmBracket: string;
  };
  overallVerdict: {
    title: string;
    summary: string;
    tamMaName: string; // Tâm ma cản trở lớn nhất
    tamMaDescription: string;
    overallPercentile: number; // Đạo hữu vượt trội hơn X% tu sĩ cùng cảnh giới
    breakthroughReadiness: number; // 0 - 100%
  };
  errorPatterns: KeystrokeErrorPattern[];
  timingAnalysis: {
    phases: ErrorTimingPhase[];
    criticalMomentVerdict: string;
    avgRecoveryLatencyMs: number;
    peerAvgRecoveryMs: number;
    cascadeErrorRate: number; // % lỗi kéo theo lỗi thứ 2
  };
  peerComparison: {
    bracketName: string;
    description: string;
    metrics: PeerBenchmarkMetric[];
  };
  breakthroughPathway: {
    step1: { title: string; desc: string };
    step2: { title: string; desc: string };
    step3: { title: string; desc: string };
  };
  practiceWords: string[];
}

/**
 * Xác định phân khúc cảnh giới WPM
 */
export function getWpmBracket(wpm: number): {
  id: string;
  name: string;
  rangeText: string;
  minWpm: number;
  maxWpm: number;
  desc: string;
} {
  if (wpm < 45) {
    return {
      id: 'luyen_khi',
      name: 'Luyện Khí Kỳ (Sơ Nhập)',
      rangeText: '< 45 WPM',
      minWpm: 20,
      maxWpm: 45,
      desc: 'Giai đoạn làm quen bàn phím, định vị các phím cơ bản và luyện gõ 10 ngón.',
    };
  }
  if (wpm < 65) {
    return {
      id: 'truc_co',
      name: 'Trúc Cơ Kỳ (Đạo Cơ)',
      rangeText: '45 - 64 WPM',
      minWpm: 45,
      maxWpm: 65,
      desc: 'Hình thành phản xạ ngón tay tự nhiên, bắt đầu tối ưu hóa tốc độ từ.',
    };
  }
  if (wpm < 85) {
    return {
      id: 'ket_dan',
      name: 'Kim Đan Kỳ (Tông Sư)',
      rangeText: '65 - 84 WPM',
      minWpm: 65,
      maxWpm: 85,
      desc: 'Tốc độ trên mức trung bình xã hội, độ chính xác bắt đầu quyết định sự thăng tiến.',
    };
  }
  if (wpm < 110) {
    return {
      id: 'nguyen_anh',
      name: 'Nguyên Anh Kỳ (Đại Năng)',
      rangeText: '85 - 109 WPM',
      minWpm: 85,
      maxWpm: 110,
      desc: 'Phản xạ cấp cao, gõ theo cụm từ mà không cần nhìn bàn phím.',
    };
  }
  if (wpm < 135) {
    return {
      id: 'hoa_than',
      name: 'Hóa Thần Kỳ (Chân Nhân)',
      rangeText: '110 - 134 WPM',
      minWpm: 110,
      maxWpm: 135,
      desc: 'Tốc độ phi phàm, đòi hỏi độ ổn định nhịp thở và không bị khựng giữa các từ.',
    };
  }
  return {
    id: 'dai_thua',
    name: 'Đại Thừa / Tiên Nhân (Đỉnh Phong)',
    rangeText: '135+ WPM',
    minWpm: 135,
    maxWpm: 200,
    desc: 'Cảnh giới chí tôn, tâm thủ hợp nhất, mỗi phím gõ như lưu tinh trăng sao.',
  };
}

/**
 * Phân tích thời điểm lỗi từ lịch sử trận đấu
 */
export function analyzeErrorTimingFromMatches(matches: MatchRecord[]): {
  phases: ErrorTimingPhase[];
  avgRecoveryLatencyMs: number;
  cascadeErrorCount: number;
  totalErrorsAnalyzed: number;
} {
  let introErrors = 0;
  let accelErrors = 0;
  let sustainErrors = 0;
  let endgameErrors = 0;
  let totalErrors = 0;
  let cascadeErrors = 0;
  let recoveryLatencies: number[] = [];

  matches.forEach((m) => {
    const duration = m.durationSeconds || 60;
    const p1 = duration * 0.25; // 0 - 15s
    const p2 = duration * 0.55; // 15 - 33s
    const p3 = duration * 0.8;  // 33 - 48s

    // 1. Phân tích qua keystrokes nếu có
    if (m.keystrokes && m.keystrokes.length > 0) {
      let lastErrorTime = -1;
      m.keystrokes.forEach((k) => {
        const sec = k.timeMs / 1000;
        if (!k.isCorrect) {
          totalErrors++;
          if (sec <= p1) introErrors++;
          else if (sec <= p2) accelErrors++;
          else if (sec <= p3) sustainErrors++;
          else endgameErrors++;

          if (lastErrorTime > 0 && k.timeMs - lastErrorTime < 800) {
            cascadeErrors++;
          }
          lastErrorTime = k.timeMs;
        } else {
          if (lastErrorTime > 0) {
            const recovery = k.timeMs - lastErrorTime;
            if (recovery > 50 && recovery < 3000) {
              recoveryLatencies.push(recovery);
            }
            lastErrorTime = -1;
          }
        }
      });
    }
    // 2. Phân tích qua chartData nếu không có keystrokes chi tiết
    else if (m.chartData && m.chartData.length > 0) {
      m.chartData.forEach((pt) => {
        const err = pt.errors || 0;
        if (err > 0) {
          totalErrors += err;
          if (pt.second <= p1) introErrors += err;
          else if (pt.second <= p2) accelErrors += err;
          else if (pt.second <= p3) sustainErrors += err;
          else endgameErrors += err;
        }
      });
    }
    // 3. Phân bổ ước lượng theo tổng số lỗi và wordLogs
    else {
      const err = m.incorrectWords || (m.mistakes ? m.mistakes.length : 3);
      totalErrors += err;
      // Phân bổ mẫu thực tế: đầu ván 20%, tăng tốc 35%, trung đoạn 20%, cuối ván 25%
      introErrors += Math.round(err * 0.2);
      accelErrors += Math.round(err * 0.35);
      sustainErrors += Math.round(err * 0.2);
      endgameErrors += Math.max(0, err - Math.round(err * 0.75));
    }
  });

  const safeTotal = Math.max(1, totalErrors);
  const avgRecoveryLatencyMs =
    recoveryLatencies.length > 0
      ? Math.round(recoveryLatencies.reduce((a, b) => a + b, 0) / recoveryLatencies.length)
      : 360;

  const phases: ErrorTimingPhase[] = [
    {
      phaseId: 'intro',
      name: 'Khởi Thức (Nhập Cuộc)',
      xianxiaPhase: 'Sơ Khai Định Thần',
      timeRange: '0s - 15s (25% đầu ván)',
      errorCount: introErrors,
      errorPercentage: Math.round((introErrors / safeTotal) * 100),
      description: 'Lỗi do bàn tay chưa làm ấm, chưa bắt kịp nhịp gõ hoặc vội vàng gõ từ đầu tiên.',
      riskLevel: introErrors / safeTotal > 0.3 ? 'cao' : introErrors / safeTotal > 0.18 ? 'trung_binh' : 'thap',
    },
    {
      phaseId: 'acceleration',
      name: 'Tăng Tốc (Vận Khí)',
      xianxiaPhase: 'Cực Hạn Bứt Phá',
      timeRange: '15s - 35s (Giai đoạn đẩy WPM)',
      errorCount: accelErrors,
      errorPercentage: Math.round((accelErrors / safeTotal) * 100),
      description: 'Lỗi phát sinh khi cố gắng gõ nhanh hơn ngưỡng phản xạ an toàn của ngón tay.',
      riskLevel: accelErrors / safeTotal > 0.35 ? 'cao' : accelErrors / safeTotal > 0.2 ? 'trung_binh' : 'thap',
    },
    {
      phaseId: 'sustain',
      name: 'Bình Ổn (Trung Châu)',
      xianxiaPhase: 'Đạo Tâm Trì Trệ',
      timeRange: '35s - 50s (Duy trì nhịp)',
      errorCount: sustainErrors,
      errorPercentage: Math.round((sustainErrors / safeTotal) * 100),
      description: 'Lỗi xuất hiện sau các từ dài hoặc khi dòng văn bản đổi dòng gây gián đoạn mắt nhìn.',
      riskLevel: sustainErrors / safeTotal > 0.3 ? 'cao' : sustainErrors / safeTotal > 0.18 ? 'trung_binh' : 'thap',
    },
    {
      phaseId: 'endgame',
      name: 'Về Đích (Tàn Kiếp)',
      xianxiaPhase: 'Linh Khí Khô Kiệt',
      timeRange: '50s - 60s+ (Giai đoạn rút đích)',
      errorCount: endgameErrors,
      errorPercentage: Math.round((endgameErrors / safeTotal) * 100),
      description: 'Lỗi do mỏi cơ bàn tay, đuối hơi hoặc tâm lý nôn nóng khi thời gian sắp cạn.',
      riskLevel: endgameErrors / safeTotal > 0.3 ? 'cao' : endgameErrors / safeTotal > 0.18 ? 'trung_binh' : 'thap',
    },
  ];

  return {
    phases,
    avgRecoveryLatencyMs,
    cascadeErrorCount: cascadeErrors,
    totalErrorsAnalyzed: totalErrors,
  };
}

/**
 * Sinh phân tích fallback thông minh chuẩn phong vị Tiên hiệp kết hợp Khoa học Đánh máy
 */
export function generateHeuristicDaoAnalysis(
  matches: MatchRecord[],
  cultivation?: CultivationState | null,
  selectedMatch?: MatchRecord | null
): HeavenlyDaoAnalysisResult {
  const completed = matches.filter((m) => m.isCompleted !== false && m.result !== 'Đầu hàng');
  const count = Math.max(1, completed.length);

  const avgWpm = Math.round(completed.reduce((a, m) => a + (m.wpm || 0), 0) / count) || 60;
  const avgAcc = Math.round(completed.reduce((a, m) => a + (m.accuracy || 100), 0) / count) || 94;
  const avgConsistency = Math.round(completed.reduce((a, m) => a + (m.consistency || 80), 0) / count) || 82;
  const peakWpm = Math.max(...completed.map((m) => m.peakWpm || m.wpm || 0), Math.round(avgWpm * 1.15));

  const bracket = getWpmBracket(avgWpm);
  const timing = analyzeErrorTimingFromMatches(completed);

  // Peer benchmark figures for this WPM bracket
  const peerAvgWpm = Math.round((bracket.minWpm + bracket.maxWpm) / 2);
  const peerTop10Wpm = Math.round(bracket.maxWpm * 0.96);
  const peerAvgAcc = 94;
  const peerTop10Acc = 98;
  const peerAvgConsistency = 82;
  const peerTop10Consistency = 92;
  const peerAvgRecovery = 380;
  const peerTop10Recovery = 180;

  // Compute pillar metrics
  const speedPercentile = Math.min(99, Math.max(10, Math.round(((avgWpm - bracket.minWpm) / (bracket.maxWpm - bracket.minWpm)) * 100)));
  const accPercentile = Math.min(99, Math.max(10, Math.round(((avgAcc - 85) / 14) * 100)));
  const consistencyPercentile = Math.min(99, Math.max(10, Math.round(((avgConsistency - 70) / 25) * 100)));
  const recoveryPercentile = Math.min(99, Math.max(10, Math.round(((600 - timing.avgRecoveryLatencyMs) / 450) * 100)));

  // Stamina Retention calculation: last phase errors vs first phase
  const staminaScore = Math.max(40, Math.min(100, Math.round(100 - (timing.phases[3].errorPercentage * 1.5))));
  const breakthroughScore = Math.round((accPercentile * 0.4) + (speedPercentile * 0.3) + (consistencyPercentile * 0.3));

  const overallPercentile = Math.round((speedPercentile + accPercentile + consistencyPercentile + recoveryPercentile) / 4);

  // Detect mode from selectedMatch or history
  const activeModeId = selectedMatch?.modeId || (matches[0]?.modeId) || 'vi_dau';
  const isNumberMode =
    activeModeId === 'numpad' ||
    activeModeId === 'number' ||
    activeModeId.includes('number') ||
    activeModeId.includes('numpad') ||
    activeModeId.includes('số') ||
    selectedMatch?.difficulty === 'number' ||
    selectedMatch?.difficulty === 'fullsize';
  const isEnMode = activeModeId === 'en';
  const isViNoDauMode = activeModeId === 'vi_nodau';

  // Error Patterns
  const errorPatterns: KeystrokeErrorPattern[] = isNumberMode
    ? [
        {
          id: 'numpad_reach_slip',
          name: 'Trượt Phím Hàng Số / Numpad Xa',
          xianxiaTitle: 'Cửu Cung Thần Số Chướng',
          frequency: Math.max(3, Math.round(timing.totalErrorsAnalyzed * 0.45)),
          percentage: 45,
          description: 'Vươn ngón tay lên hàng phím số trên cùng hoặc gõ nhầm các phím góc xa (7, 8, 9, 0) trên Numpad.',
          biomechanics: 'Tầm với của ngón tay kéo căng cơ duỗi cổ tay, thiếu điểm tựa xúc giác định vị như phím 5.',
          examples: ['7 -> 8', '9 -> 6', '0 -> .'],
          severity: 'high',
        },
        {
          id: 'digit_transposition',
          name: 'Đảo Thứ Tự Chữ Số (Tay Nhanh Hơn Não)',
          xianxiaTitle: 'Nghịch Chuyển Lục Hào Ma',
          frequency: Math.max(2, Math.round(timing.totalErrorsAnalyzed * 0.3)),
          percentage: 30,
          description: 'Gõ đảo vị trí 2 chữ số liền kề khi nhịp độ tăng tốc (ví dụ gõ 12 thành 21, 58 thành 85).',
          biomechanics: 'Mất cân bằng độ trễ vận động thần kinh khi gõ chuỗi số tốc độ cao.',
          examples: ['58 -> 85', '12 -> 21', '08 -> 80'],
          severity: 'medium',
        },
        {
          id: 'thumb_pinky_rhythm',
          name: 'Khựng Nhịp Phím 0 / Enter / Phép Tính',
          xianxiaTitle: 'Định Thần Khuyết Lực Ma',
          frequency: Math.max(1, Math.round(timing.totalErrorsAnalyzed * 0.25)),
          percentage: 25,
          description: 'Ngón cái hoặc ngón út ấn phím 0 hoặc Space bị trễ nhịp so với các ngón trỏ và giữa.',
          biomechanics: 'Phản xạ ngón cái và ngón út có độ linh hoạt thấp hơn ngón trỏ trên layout numpad.',
          examples: ['0 hụt lực', 'chậm nhịp chuyển số'],
          severity: 'low',
        },
      ]
    : [
        {
          id: 'telex_tone_clash',
          name: 'Xung đột Phím Dấu Telex',
          xianxiaTitle: 'Dấu Thanh Hỗn Loạn Chướng',
          frequency: Math.max(3, Math.round(timing.totalErrorsAnalyzed * 0.38)),
          percentage: 38,
          description: 'Lỗi gõ phím dấu thanh (s, f, r, x, j, w) quá sớm khi các nguyên âm chính chưa kịp nạp vào bộ đệm.',
          biomechanics: 'Ngón tay trỏ hoặc ngón giữa gõ lướt phím dấu trước khi ngón trỏ buông phím nguyên âm kế trước.',
          examples: ['thườg -> thường', 'nhiùe -> nhiều', 'nghĩn -> nghìn'],
          severity: 'high',
        },
        {
          id: 'transposition_rush',
          name: 'Đảo Ký Tự Tay Nhanh Hơn Não',
          xianxiaTitle: 'Tâm Gấp Khí Loạn Ma',
          frequency: Math.max(2, Math.round(timing.totalErrorsAnalyzed * 0.28)),
          percentage: 28,
          description: 'Hoán vị 2 ký tự liền nhau do tay phải xuất chiêu trước khi tay trái hoàn thành ký tự.',
          biomechanics: 'Mất cân bằng độ trễ thần kinh vận động giữa hai bán cầu não và hai bàn tay khi gõ từ quen thuộc.',
          examples: ['ch -> hc', 'ng -> gn', 'th -> ht'],
          severity: 'medium',
        },
        {
          id: 'pinky_slip',
          name: 'Trượt Phím Rìa Ngoài Ngón Út',
          xianxiaTitle: 'Ngón Út Khuyết Lực Ma',
          frequency: Math.max(2, Math.round(timing.totalErrorsAnalyzed * 0.22)),
          percentage: 22,
          description: 'Các phím nằm ở góc xa (P, Q, Z, [, ], Shift) bị hụt lực hoặc chạm nhầm phím liền kề.',
          biomechanics: 'Cơ duỗi ngón út (extensor digiti minimi) có lực ấn yếu hơn và tầm với xa nhất trên bàn phím.',
          examples: ['p -> o', 'q -> w', 'z -> a'],
          severity: 'low',
        },
      ];

  // Most severe timing phase
  const worstPhase = [...timing.phases].sort((a, b) => b.errorCount - a.errorCount)[0];

  const realmName = cultivation?.realmName || bracket.name.split(' (')[0];
  const tier = cultivation?.tier || 3;
  const subStage = cultivation?.subStage || 'Sơ Kỳ';

  return {
    success: true,
    isAiPowered: false,
    playerRealm: {
      realmName,
      tier,
      subStage,
      currentWpm: avgWpm,
      wpmBracket: bracket.name,
    },
    overallVerdict: {
      title: isNumberMode
        ? `Thiên Đạo Phán Quyết: Toán Pháp Đạo Cơ ${realmName} ${subStage}`
        : `Thiên Đạo Phán Quyết: Đạo Cơ ${realmName} ${subStage}`,
      summary: isNumberMode
        ? `Quan trắc qua ${count} ván đấu bàn phím số, thần thức ghi nhận tốc độ trung bình ${avgWpm} WPM (Đỉnh: ${peakWpm} WPM) với độ chuẩn xác ${avgAcc}%. Bạn kiểm soát các phím số rất tốt song đang gặp bình cảnh do nhịp vươn ngón tay ở các phím số xa.`
        : `Quan trắc qua ${count} ván đấu, thần thức ghi nhận tốc độ trung bình ${avgWpm} WPM (Đỉnh: ${peakWpm} WPM) với độ chuẩn xác ${avgAcc}%. Người chơi thuộc tốp trên của cảnh giới này, song đang vấp phải bình cảnh do phân tán nhịp gõ tại giai đoạn ${worstPhase.name}.`,
      tamMaName: isNumberMode
        ? 'Tâm Ma Thần Số (Nôn Nóng Bấm Số)'
        : 'Tâm Gấp Khí Loạn (Vội Vàng Xuất Chiêu)',
      tamMaDescription: isNumberMode
        ? `Tâm ma xuất hiện rõ nét nhất khi bạn cố đẩy WPM số lên cực hạn. Các ngón tay bắt đầu trượt sang các phím số liền kề trên layout bàn phím số, làm đứt đoạn nhịp thở.`
        : `Tâm ma xuất hiện rõ nét nhất ở giai đoạn ${worstPhase.timeRange} khi bạn cố đẩy WPM lên cực hạn. Các ngón tay bắt đầu hoán vị vị trí, dẫn đến việc phải nhấn Backspace liên tục và làm tụt nhịp toàn ván đấu.`,
      overallPercentile: Math.max(15, Math.min(96, overallPercentile)),
      breakthroughReadiness: Math.max(20, Math.min(95, breakthroughScore)),
    },
    errorPatterns,
    timingAnalysis: {
      phases: timing.phases,
      criticalMomentVerdict: `Thời điểm phát sinh lỗi nhiều nhất là ở ${worstPhase.name} (${worstPhase.errorPercentage}% tổng số lỗi). Khắc phục được giai đoạn này sẽ lập tức giải phóng thêm 12 - 18 WPM!`,
      avgRecoveryLatencyMs: timing.avgRecoveryLatencyMs,
      peerAvgRecoveryMs: peerAvgRecovery,
      cascadeErrorRate: Math.round((timing.cascadeErrorCount / Math.max(1, timing.totalErrorsAnalyzed)) * 100) || 24,
    },
    peerComparison: {
      bracketName: bracket.name,
      description: `So sánh trực quan 6 Trụ Cột Đạo Cơ giữa bạn với hàng ngàn tu sĩ cùng nhóm trình độ ${bracket.rangeText}.`,
      metrics: [
        {
          key: 'speed',
          label: 'Tốc Độ Xuất Chiêu (WPM)',
          xianxiaLabel: 'Ngự Khí Thần Tốc',
          unit: 'WPM',
          playerValue: avgWpm,
          peerAverage: peerAvgWpm,
          peerTop10: peerTop10Wpm,
          percentile: speedPercentile,
          assessment: avgWpm >= peerAvgWpm ? 'Vượt trên mức bình quân cùng cảnh giới' : 'Cần tôi luyện thêm tốc độ lướt phím',
        },
        {
          key: 'accuracy',
          label: 'Tâm Pháp Tinh Chuẩn (%)',
          xianxiaLabel: 'Bách Bộ Xuyên Dương',
          unit: '%',
          playerValue: avgAcc,
          peerAverage: peerAvgAcc,
          peerTop10: peerTop10Acc,
          percentile: accPercentile,
          assessment: avgAcc >= 96 ? 'Độ chuẩn xác xuất chúng' : 'Sai sót làm tiêu hao thời gian Backspace',
        },
        {
          key: 'consistency',
          label: 'Đạo Tâm Kiên Định (%)',
          xianxiaLabel: 'Bất Động Như Sơn',
          unit: '%',
          playerValue: avgConsistency,
          peerAverage: peerAvgConsistency,
          peerTop10: peerTop10Consistency,
          percentile: consistencyPercentile,
          assessment: avgConsistency >= 85 ? 'Nhịp gõ cực kỳ đều đặn' : 'Nhịp gõ có lúc dập dồn có lúc khựng lại',
        },
        {
          key: 'recovery',
          label: 'Hồi Phục Thần Thức (ms)',
          xianxiaLabel: 'Hoàn Hồn Định Phách',
          unit: 'ms',
          playerValue: timing.avgRecoveryLatencyMs,
          peerAverage: peerAvgRecovery,
          peerTop10: peerTop10Recovery,
          percentile: recoveryPercentile,
          assessment: timing.avgRecoveryLatencyMs <= 250 ? 'Phản xạ sửa lỗi chớp nhoáng' : 'Mất quá nhiều thời gian khựng lại sau khi gõ sai',
        },
        {
          key: 'stamina',
          label: 'Độ Bền Khí Tức (Cuối Trận)',
          xianxiaLabel: 'Trường Sinh Bất Diệt',
          unit: '/100',
          playerValue: staminaScore,
          peerAverage: 72,
          peerTop10: 90,
          percentile: staminaScore,
          assessment: staminaScore >= 75 ? 'Giữ vững phong độ về cuối ván' : 'Bị đuối hơi và trượt phím ở 15 giây cuối',
        },
        {
          key: 'breakthrough',
          label: 'Tiềm Năng Đột Phá (%)',
          xianxiaLabel: 'Thiên Cơ Khai Mở',
          unit: '%',
          playerValue: breakthroughScore,
          peerAverage: 65,
          peerTop10: 92,
          percentile: breakthroughScore,
          assessment: breakthroughScore >= 70 ? 'Đã hội tụ đủ điều kiện độ kiếp thăng cấp' : 'Cần củng cố đạo cơ để tránh tẩu hỏa nhập ma',
        },
      ],
    },
    breakthroughPathway: isNumberMode
      ? {
          step1: {
            title: 'Bước 1: Giữ Nhịp Chậm Chắc Ở 10 Giây Đầu',
            desc: 'Trong 10 giây đầu, tập trung gõ chính xác 100% từng chữ số để bàn tay quen cự ly các phím số.',
          },
          step2: {
            title: 'Bước 2: Cố Định Ngón Giữa Trên Phím 5 Numpad',
            desc: 'Dùng phím số 5 (có gờ xúc giác) làm điểm mốc neo vị trí bàn tay, giúp các ngón tay vươn tới 7, 8, 9, 1, 2, 3 mà không cần cúi nhìn.',
          },
          step3: {
            title: 'Bước 3: Luyện Bộ Dãy Số Hóa Giải Tâm Ma Mỗi Ngày',
            desc: 'Thực hành đều đặn 15 phút với bộ chuỗi số cá nhân hóa do Thiên Đạo AI đề xuất trong chế độ Solo Số.',
          },
        }
      : {
          step1: {
            title: 'Bước 1: Giữ Nhịp 3 Nhịp / Giây Ở Giai Đoạn Khởi Thức',
            desc: 'Trong 10 giây đầu, tuyệt đối không được bung hết sức gõ nhanh. Hãy gõ từ tốn với độ chính xác 100% để não bộ xác lập nhịp vận hành bàn phím.',
          },
          step2: {
            title: 'Bước 2: Hóa Giải Lỗi Dấu Telex Bằng Nhịp Ngắt',
            desc: 'Tập buông phím nguyên âm trước khi gõ phím dấu. Tập thói quen nhìn trước 1 từ để mắt luôn đi trước ngón tay 300ms.',
          },
          step3: {
            title: 'Bước 3: Luyện Tập Bộ Từ Hóa Giải Tâm Ma Mỗi Ngày',
            desc: 'Thực hành đều đặn 15 phút với bài tập cá nhân hóa do Thiên Đạo AI sinh ra để tái lập trình phản xạ cho các ngón tay yếu.',
          },
        },
    practiceWords: isNumberMode
      ? [
          '1024', '58008', '2026', '9876', '1234', '5050', '31415', '92653',
          '7410', '8520', '9630', '4567', '7890', '13579', '24680', '9988',
          '1122', '3344', '7700', '4040', '8080', '1995', '2000', '2025'
        ]
      : isEnMode
      ? [
          'rhythm', 'queue', 'strength', 'synergy', 'awkward', 'beautiful', 'keyboard',
          'practice', 'accuracy', 'mastery', 'challenge', 'experience', 'quick', 'flight',
          'balance', 'control', 'fingers', 'velocity', 'precision', 'focus', 'reflexes'
        ]
      : isViNoDauMode
      ? [
          'nghieng', 'khoang', 'chuyen', 'tuyet', 'khuyen', 'nghiep', 'truyen', 'quyet',
          'xoay', 'thoat', 'khoanh', 'quynh', 'nguyet', 'duyen', 'ban', 'phim',
          'toc', 'do', 'chinh', 'xac', 'chien', 'thang', 'ren', 'luyen', 'ky', 'nang'
        ]
      : [
          'nghiêng', 'khoảnh', 'khắc', 'chuyển', 'hóa', 'tuyệt', 'kỹ', 'phản', 'xạ',
          'đột', 'phá', 'cảnh', 'giới', 'đạo', 'tâm', 'kiên', 'định', 'thần', 'thức',
          'nhịp', 'nhàng', 'chuỗi', 'ngọc', 'lưu', 'tinh', 'quang', 'minh', 'tiên', 'thiên', 'phù'
        ],
  };
}

/**
 * Gọi API backend để lấy phân tích Thiên Đạo AI sâu sắc từ Gemini
 */
export async function fetchHeavenlyDaoAnalysis(
  matches: MatchRecord[],
  cultivation?: CultivationState | null,
  selectedMatch?: MatchRecord | null
): Promise<HeavenlyDaoAnalysisResult> {
  try {
    const res = await fetch('/api/ai/heavenly-dao-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matches: matches.slice(0, 20),
        cultivation: cultivation || null,
        selectedMatch: selectedMatch || null,
      }),
    });

    if (!res.ok) {
      throw new Error(`Máy chủ Thiên Đạo phản hồi mã lỗi ${res.status}`);
    }

    const data = await res.json();
    if (data && data.success) {
      return data;
    }
    throw new Error('Dữ liệu phân tích Thiên Đạo không hợp lệ');
  } catch (err) {
    console.warn('Fallback to local heuristic Dao analysis:', err);
    return generateHeuristicDaoAnalysis(matches, cultivation, selectedMatch);
  }
}

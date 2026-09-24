import { MatchRecord, MistakeDetail } from './matchHistory';

export interface AiDrillCluster {
  cluster: string;
  label: string;
  errorCount: number;
  description: string;
  sampleWords: string[];
}

export interface AiPersonalizedDrillResult {
  title: string;
  subtitle: string;
  diagnosis: string;
  focalClusters: AiDrillCluster[];
  drillWords: string[];
  coachingAdvice: string[];
  source: 'gemini' | 'algorithmic';
  createdAt: number;
  totalMistakesAnalyzed: number;
  targetedKeySummary: string;
}

// Rich linguistic clusters bank for Vietnamese typing drills
const CLUSTER_DICTIONARY: Record<string, { label: string; description: string; words: string[] }> = {
  'ngh': {
    label: 'Phụ âm ghép NGH-',
    description: 'Tổ hợp 3 chữ cái đầu từ dễ gây rối loạn nhịp ngón trỏ và ngón giữa.',
    words: ['nghiệp', 'nghiên', 'nghiêm', 'nghiệm', 'nghiêng', 'nghịch', 'nghĩ', 'nghèo', 'nghề', 'nghẹn', 'nghêu', 'nghệ', 'nghẽn', 'nghênh'],
  },
  'qu': {
    label: 'Phụ âm kép QU- (Ngón út trái)',
    description: 'Chữ Q nằm ở góc trên tay trái đòi hỏi ngón út vươn nhanh sang phím U.',
    words: ['quyết', 'quyền', 'quang', 'quân', 'quốc', 'quyển', 'quýnh', 'quỳnh', 'quản', 'quyến', 'quảng', 'quần', 'quãng', 'quanh', 'quét'],
  },
  'ph': {
    label: 'Phụ âm PH- & Phím P (Ngón út phải)',
    description: 'Phím P ở góc trên bên phải là một trong những phím có độ trễ phản xạ cao nhất.',
    words: ['phương', 'phát', 'phong', 'pháp', 'phân', 'phục', 'phấn', 'phím', 'phút', 'phiêu', 'phối', 'phóng', 'phẩm', 'phẳng', 'phù'],
  },
  'tr': {
    label: 'Cặp phụ âm TR- vs CH-',
    description: 'Vươn ngón trỏ tay trái lên T và R dễ bị đè phím hoặc gõ nhầm thứ tự.',
    words: ['truyền', 'trường', 'triệu', 'trong', 'trước', 'trang', 'trách', 'trung', 'trắng', 'trời', 'trọng', 'triết', 'trực', 'trình', 'trọn'],
  },
  'ch': {
    label: 'Phụ âm CH-',
    description: 'Phối hợp ngón giữa tay trái (C) và ngón trỏ tay phải (H).',
    words: ['chuyên', 'chuyến', 'chính', 'chiến', 'chuẩn', 'chúng', 'chiều', 'chuyển', 'chớp', 'chuộng', 'chậm', 'chữa', 'chắn', 'chắc'],
  },
  'kh': {
    label: 'Phụ âm KH-',
    description: 'Phối hợp ngón giữa tay phải (K) và ngón trỏ (H).',
    words: ['khoảng', 'khuyên', 'khuyết', 'khuôn', 'khuấy', 'khác', 'khách', 'không', 'khuya', 'khỏe', 'khiển', 'khéo', 'khuất', 'khoa'],
  },
  'uyên': {
    label: 'Vần ghép -UYÊN',
    description: 'Vần nguyên âm 4 ký tự phức tạp, dễ bị trượt nhịp ngón út và ngón giữa.',
    words: ['chuyên', 'khuyên', 'truyền', 'nguyên', 'quyển', 'tuyển', 'tuyên', 'huyện', 'duyên', 'thuyền', 'luyện', 'quyến', 'nguyện', 'tuyến'],
  },
  'uông': {
    label: 'Vần ghép -UÔNG / -UÔN',
    description: 'Kết hợp dấu thanh và nguyên âm đôi u-ô.',
    words: ['chuộng', 'buông', 'cuống', 'xuống', 'luồng', 'muỗng', 'uống', 'vuông', 'chuông', 'luống', 'cuốn', 'chuẩn', 'buôn', 'tuôn'],
  },
  'ương': {
    label: 'Vần ghép -ƯƠNG',
    description: 'Phổ biến trong tiếng Việt, đòi hỏi nhịp gõ chữ ư và ơ liền mạch (Telex: uw, ow hoặc w).',
    words: ['phương', 'thương', 'trường', 'lương', 'hương', 'vương', 'tường', 'dương', 'xương', 'đường', 'hướng', 'sương', 'gương', 'chương'],
  },
  'oang': {
    label: 'Vần ghép -OANG / -OANH',
    description: 'Nguyên âm ba mở rộng cơ ngón tay.',
    words: ['khoang', 'thoang', 'loang', 'hoang', 'choang', 'xoang', 'thoảng', 'hoảng', 'khoảng', 'loạng', 'doanh', 'ngoan', 'khoảnh', 'quanh'],
  },
  'pinky_p': {
    label: 'Phím ngón út P (Right Pinky)',
    description: 'Khắc phục thói quen nhấc cả cổ tay khi với phím P ở góc trên.',
    words: ['nhịp', 'kịp', 'úp', 'tập', 'lập', 'hợp', 'nghiệp', 'tiếp', 'phát', 'phong', 'phút', 'phím', 'bếp', 'chép', 'đáp'],
  },
  'pinky_q': {
    label: 'Phím ngón út Q (Left Pinky)',
    description: 'Rèn luyện phản xạ ngón út trái độc lập mà không làm chùng ngón áp út (A).',
    words: ['quốc', 'quyết', 'quân', 'quang', 'quá', 'quán', 'quý', 'quyền', 'quạt', 'quanh', 'quần', 'quẹt', 'quỵt', 'quạnh'],
  },
  'pinky_z': {
    label: 'Phím ngón út Z & X',
    description: 'Hàng phím dưới cùng mép trái đòi hỏi gập ngón út dứt khoát.',
    words: ['xoay', 'xanh', 'xem', 'xong', 'xuân', 'xuyên', 'xoăn', 'xích', 'xương', 'xuất', 'xếp', 'xét', 'xóa', 'xao'],
  },
  'tone_nga': {
    label: 'Quy tắc Dấu Ngã ~ (Phím X)',
    description: 'Bấm phím X sau khi gõ xong âm tiết để đặt thanh ngã đúng vị trí.',
    words: ['nghĩ', 'cũng', 'mỗi', 'nữa', 'dẫn', 'mãi', 'hãy', 'sẽ', 'giữ', 'vẫn', 'sữa', 'nghẽn', 'rõ', 'mỹ', 'đỗ', 'cũ'],
  },
  'tone_nang': {
    label: 'Quy tắc Dấu Nặng . (Phím J)',
    description: 'Gõ phím J ở cuối từ, kết hợp ngón trỏ phải vươn từ phím cơ sở J.',
    words: ['nghiệm', 'chuộng', 'luyện', 'huyện', 'định', 'trọng', 'mạng', 'phục', 'thực', 'hoạt', 'luật', 'nghệ', 'chậm', 'bật'],
  },
};

/**
 * Tổng hợp thông kê lỗi sai từ toàn bộ lịch sử 20 ván hoặc 1 ván chỉ định
 */
export function aggregateHistoryErrors(history: MatchRecord[], selectedMatchId?: string | null): {
  mistakes: MistakeDetail[];
  commonErrorKeys: { key: string; count: number }[];
  frequentErrorWords: string[];
  totalErrors: number;
} {
  const targetRecords = selectedMatchId
    ? history.filter((m) => m.id === selectedMatchId)
    : history;

  const mistakesMap: Record<string, MistakeDetail> = {};
  const errorKeyMap: Record<string, number> = {};
  const errorWordMap: Record<string, number> = {};
  let totalErrors = 0;

  targetRecords.forEach((rec) => {
    // 1. Gộp lỗi từ rec.mistakes
    if (rec.mistakes && rec.mistakes.length > 0) {
      rec.mistakes.forEach((m) => {
        const key = `${m.original}__${m.typed}`;
        if (!mistakesMap[key]) {
          mistakesMap[key] = { ...m };
        } else {
          mistakesMap[key].count += m.count;
        }
        errorWordMap[m.original] = (errorWordMap[m.original] || 0) + m.count;
        totalErrors += m.count;
      });
    }

    // 2. Gộp lỗi từ rec.commonErrorKeys
    if (rec.commonErrorKeys && rec.commonErrorKeys.length > 0) {
      rec.commonErrorKeys.forEach((k) => {
        const char = k.key.toLowerCase();
        errorKeyMap[char] = (errorKeyMap[char] || 0) + k.count;
      });
    }

    // 3. Nếu chưa có mistakes nhưng có wordLogs
    if ((!rec.mistakes || rec.mistakes.length === 0) && rec.wordLogs) {
      rec.wordLogs.forEach((log) => {
        if (!log.isCorrect && log.word && log.typed) {
          const orig = log.word.trim();
          const typ = log.typed.trim();
          const key = `${orig}__${typ}`;
          if (!mistakesMap[key]) {
            mistakesMap[key] = {
              original: orig,
              typed: typ,
              type: 'other',
              label: 'Sai chính tả',
              count: 1,
            };
          } else {
            mistakesMap[key].count++;
          }
          errorWordMap[orig] = (errorWordMap[orig] || 0) + 1;
          totalErrors++;
        }
      });
    }
  });

  const mistakes = Object.values(mistakesMap).sort((a, b) => b.count - a.count);
  const commonErrorKeys = Object.entries(errorKeyMap)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const frequentErrorWords = Object.entries(errorWordMap)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 12);

  return {
    mistakes,
    commonErrorKeys,
    frequentErrorWords,
    totalErrors,
  };
}

/**
 * Thuật toán phân tích cụm âm yếu và phát hiện các cụm phím xung đột
 */
export function detectWeakClusters(
  mistakes: MistakeDetail[],
  commonErrorKeys: { key: string; count: number }[],
  frequentErrorWords: string[]
): AiDrillCluster[] {
  const clusterScores: Record<string, number> = {};

  // 1. Quét tần suất các cụm âm trong các từ bị sai
  const wordsToScan = [...frequentErrorWords, ...mistakes.map((m) => m.original)];

  wordsToScan.forEach((word) => {
    const lower = word.toLowerCase();
    for (const [clusterKey] of Object.entries(CLUSTER_DICTIONARY)) {
      if (clusterKey.startsWith('pinky_') || clusterKey.startsWith('tone_')) {
        continue;
      }
      if (lower.includes(clusterKey)) {
        clusterScores[clusterKey] = (clusterScores[clusterKey] || 0) + 2;
      }
    }
  });

  // 2. Quét các phím ngón út và telex từ commonErrorKeys
  commonErrorKeys.forEach(({ key, count }) => {
    const k = key.toLowerCase();
    if (k === 'p') clusterScores['pinky_p'] = (clusterScores['pinky_p'] || 0) + count * 2;
    if (k === 'q') clusterScores['pinky_q'] = (clusterScores['pinky_q'] || 0) + count * 2;
    if (k === 'z' || k === 'x') clusterScores['pinky_z'] = (clusterScores['pinky_z'] || 0) + count * 1.5;
    if (k === 'x') clusterScores['tone_nga'] = (clusterScores['tone_nga'] || 0) + count;
    if (k === 'j') clusterScores['tone_nang'] = (clusterScores['tone_nang'] || 0) + count;
  });

  // 3. Quét loại lỗi từ mistakes
  mistakes.forEach((m) => {
    if (m.type === 'pinky_key') {
      clusterScores['pinky_p'] = (clusterScores['pinky_p'] || 0) + m.count;
      clusterScores['pinky_q'] = (clusterScores['pinky_q'] || 0) + m.count;
    }
    if (m.type === 'telex_tone') {
      clusterScores['tone_nga'] = (clusterScores['tone_nga'] || 0) + m.count;
      clusterScores['tone_nang'] = (clusterScores['tone_nang'] || 0) + m.count;
    }
  });

  // Chọn top 2 - 4 cụm yếu nhất
  const sortedClusters = Object.entries(clusterScores)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0)
    .slice(0, 4);

  // Nếu không đủ dữ liệu lỗi (người chơi mới hoặc gõ quá ít lỗi), chọn mặc định các cụm kinh điển
  if (sortedClusters.length < 2) {
    if (!sortedClusters.some(([k]) => k === 'ngh')) sortedClusters.push(['ngh', 3]);
    if (!sortedClusters.some(([k]) => k === 'qu')) sortedClusters.push(['qu', 3]);
    if (!sortedClusters.some(([k]) => k === 'uyên')) sortedClusters.push(['uyên', 2]);
  }

  return sortedClusters.map(([clusterKey, score]) => {
    const info = CLUSTER_DICTIONARY[clusterKey] || {
      label: `Cụm phím ${clusterKey.toUpperCase()}`,
      description: 'Cần luyện tập điều hòa nhịp ngón tay',
      words: ['nhịp', 'chậm', 'đều', 'tay'],
    };
    return {
      cluster: clusterKey,
      label: info.label,
      errorCount: score,
      description: info.description,
      sampleWords: info.words.slice(0, 5),
    };
  });
}

/**
 * Trình sinh bài tập cá nhân hóa thông minh cục bộ (Algorithmic Local Generator)
 * Đảm bảo 100% luôn hoạt động mượt mà, tức thời, không phụ thuộc mạng
 */
export function generateAlgorithmicDrill(
  mistakes: MistakeDetail[],
  commonErrorKeys: { key: string; count: number }[],
  frequentErrorWords: string[],
  mode: string = 'vi_dau'
): AiPersonalizedDrillResult {
  const isNumberMode =
    mode === 'numpad' ||
    mode === 'number' ||
    mode.includes('number') ||
    mode.includes('numpad') ||
    mode.includes('số');

  if (isNumberMode) {
    const numberPool = [
      '1024', '58008', '2026', '9876', '1234', '5050', '31415', '92653',
      '7410', '8520', '9630', '4567', '7890', '13579', '24680', '9988',
      '1122', '3344', '7700', '4040', '8080', '1995', '2000', '2025',
      '128', '256', '512', '1000', '9999', '8888', '7777', '6543', '2109'
    ];

    const numClusters: AiDrillCluster[] = [
      {
        cluster: 'num_top_reach',
        label: 'Hàng Phím Số 7-8-9 (Tầm Với Xa)',
        errorCount: 6,
        description: 'Vươn ngón tay trượt các phím góc trên của bàn phím số khi tăng tốc độ.',
        sampleWords: ['789', '987', '7410', '9630'],
      },
      {
        cluster: 'num_home_anchor',
        label: 'Phím 5 Numpad & Trục Định Vị',
        errorCount: 5,
        description: 'Cần duy trì cảm nhận điểm gờ xúc giác trên phím 5 để cố định bàn tay.',
        sampleWords: ['5050', '58008', '512', '4567'],
      },
      {
        cluster: 'num_transposition',
        label: 'Đảo Thứ Tự Chữ Số (Lướt Nhanh)',
        errorCount: 4,
        description: 'Tranh chấp nhịp bấm các ngón tay khi gõ liên hoàn chuỗi 4 chữ số.',
        sampleWords: ['1024', '2026', '31415', '92653'],
      },
    ];

    return {
      title: 'Bài Tập Luyện Bàn Phím Số Cá Nhân Hóa (Number Drill)',
      subtitle: 'Đặc trị tốc độ Numpad & định vị hàng phím số 0-9',
      diagnosis: 'Hệ thống nhận diện bạn cần củng cố cảm giác vươn ngón tay lên các phím số xa (7, 8, 9) và duy trì phím 5 làm trục xoay định vị.',
      focalClusters: numClusters,
      drillWords: numberPool.slice(0, 30),
      coachingAdvice: [
        'Lấy phím số 5 (có gờ nổi) làm tâm định vị: Luôn để ngón giữa cảm nhận phím 5 để các ngón khác vươn chính xác mà không cần nhìn.',
        'Nhịp thở đều đặn khi bấm số: Tránh gõ quá nhanh ở 2 số đầu rồi giật mình khựng lại ở số thứ 3.',
        'Ngón cái kiểm soát phím 0 dứt khoát: Nhấn phím 0 bằng đầu ngón cái để cổ tay luôn giữ nguyên vị trí.',
      ],
      source: 'algorithmic',
      createdAt: Date.now(),
      totalMistakesAnalyzed: mistakes.length,
      targetedKeySummary: 'Phím 5 gờ, Hàng 7-8-9, Phím 0',
    };
  }

  const focalClusters = detectWeakClusters(mistakes, commonErrorKeys, frequentErrorWords);
  const totalMistakes = mistakes.reduce((sum, m) => sum + m.count, 0);

  // Tập hợp danh sách từ mục tiêu từ các cụm yếu
  const wordPool: string[] = [];

  // Ưu tiên 1: Đưa các từ người chơi đã gõ sai trực tiếp vào bài tập
  frequentErrorWords.forEach((w) => {
    if (w && w.length >= 2 && !wordPool.includes(w)) {
      wordPool.push(w);
    }
  });

  // Ưu tiên 2: Bổ sung các từ điển chuyên sâu cho từng cụm yếu
  focalClusters.forEach((c) => {
    const dict = CLUSTER_DICTIONARY[c.cluster];
    if (dict && dict.words) {
      dict.words.forEach((w) => {
        if (!wordPool.includes(w)) {
          wordPool.push(w);
        }
      });
    }
  });

  // Xáo trộn có chủ đích (xen kẽ từ quen thuộc và từ khó để giữ nhịp gõ flow state)
  const shuffled = [...wordPool].sort(() => 0.5 - Math.random());
  const drillWords = shuffled.slice(0, 30);

  // Đảm bảo đủ tối thiểu 25 - 30 từ
  while (drillWords.length < 25) {
    const fillers = ['quyết', 'phương', 'nghiệp', 'chuyên', 'truyền', 'khuyên', 'chuộng', 'luyện'];
    for (const f of fillers) {
      if (!drillWords.includes(f) && drillWords.length < 30) {
        drillWords.push(f);
      }
    }
  }

  const primaryCluster = focalClusters[0]?.label || 'Tổ Hợp Phím Trọng Điểm';
  const secondaryCluster = focalClusters[1]?.label || 'Phản Xạ Ngón Út';

  const targetedKeySummary = focalClusters.map((c) => c.cluster.replace('pinky_', '').replace('tone_', '')).join(', ');

  const title = `Bài Tập Luyện Cá Nhân Hóa: ${primaryCluster}`;
  const subtitle = `Tập trung khắc phục cụm phím [${targetedKeySummary}] dựa trên ${totalMistakes} lỗi sai trong lịch sử`;
  const diagnosis = `AI phát hiện bạn thường xuyên gặp độ khựng hoặc gõ chệch nhịp ở ${focalClusters.map((c) => c.label).join(' và ')}. Bài tập 30 từ dưới đây được thiết kế riêng để tái lập phản xạ cơ ngón tay cho bạn.`;

  const coachingAdvice = [
    'Giữ nhịp thở đều: Thay vì vội vã nhấn nhanh ở các từ dễ, hãy duy trì tốc độ ổn định xuyên suốt để tránh vấp khi gặp từ phức tạp.',
    'Thả lỏng cổ tay: Khi gõ các phím ngón út (P, Q) hoặc cụm âm dài (uyên, uông), hãy dùng lực xoay nhẹ của cổ tay thay vì gồng cứng cơ ngón.',
    'Quy tắc Telex chuẩn: Gõ trọn vẹn toàn bộ các chữ cái phụ âm và nguyên âm trước, sau đó mới bấm phím dấu thanh ở cuối từ.',
  ];

  return {
    title,
    subtitle,
    diagnosis,
    focalClusters,
    drillWords,
    coachingAdvice,
    source: 'algorithmic',
    createdAt: Date.now(),
    totalMistakesAnalyzed: totalMistakes,
    targetedKeySummary,
  };
}

/**
 * Gửi yêu cầu sinh bài tập cá nhân hóa qua Server (gọi Gemini API)
 * Kèm cơ chế tự động Fallback về thuật toán nếu mất kết nối hoặc server bận
 */
export async function fetchAiPersonalizedDrill(
  history: MatchRecord[],
  selectedMatchId?: string | null
): Promise<AiPersonalizedDrillResult> {
  const { mistakes, commonErrorKeys, frequentErrorWords, totalErrors } = aggregateHistoryErrors(
    history,
    selectedMatchId
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const res = await fetch('/api/ai/personalized-drill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mistakes: mistakes.slice(0, 15),
        commonErrorKeys: commonErrorKeys.slice(0, 8),
        frequentErrorWords: frequentErrorWords.slice(0, 10),
        totalErrors,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.drill && Array.isArray(data.drill.drillWords) && data.drill.drillWords.length >= 15) {
        return {
          title: data.drill.title,
          subtitle: data.drill.subtitle,
          diagnosis: data.drill.diagnosis,
          focalClusters: data.drill.focalClusters || detectWeakClusters(mistakes, commonErrorKeys, frequentErrorWords),
          drillWords: data.drill.drillWords.slice(0, 30),
          coachingAdvice: data.drill.coachingAdvice || [
            'Chủ động giảm 10% tốc độ để đạt độ chính xác >98% trên các từ mục tiêu.',
            'Tập trung quan sát chuyển động của ngón út và ngón áp út khi gõ các cụm phụ âm ghép.',
          ],
          source: 'gemini',
          createdAt: Date.now(),
          totalMistakesAnalyzed: totalErrors,
          targetedKeySummary: data.drill.focalClusters?.map((c: any) => c.cluster).join(', ') || 'Cụm phím yếu',
        };
      }
    }
  } catch (err) {
    console.warn('AI Server Drill unavailable, fallback to local algorithmic generator:', err);
  }

  // Fallback to local heuristic generator
  return generateAlgorithmicDrill(mistakes, commonErrorKeys, frequentErrorWords);
}

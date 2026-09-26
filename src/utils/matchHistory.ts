export type MatchResult = 'Thắng' | 'Thua' | 'Đầu hàng' | 'Hoàn thành' | 'Top 1' | 'Top 2' | 'Top 3';

export interface MatchWordLog {
  word: string;
  typed: string;
  isCorrect: boolean;
  timeMs?: number;
}

export interface MistakeDetail {
  original: string;
  typed: string;
  type: 'telex_tone' | 'transposition' | 'pinky_key' | 'number_key' | 'missing_char' | 'extra_char' | 'other';
  label: string;
  count: number;
}

export interface MatchReplayEvent {
  key: string;
  timeMs: number;
  isCorrect: boolean;
}

export interface MatchRecord {
  id: string;
  timestamp: number;
  mode: string;
  modeId: string;
  subMode?: string;
  difficulty?: string;
  wpm: number;
  accuracy: number;
  result: MatchResult;
  score?: number;
  playType?: 'solo' | 'multiplayer';
  isCompleted?: boolean;
  durationSeconds?: number;
  totalWords?: number;
  correctWords?: number;
  incorrectWords?: number;
  correctChars?: number;
  totalErrors?: number;
  consistency?: number;
  rank?: number;
  totalParticipants?: number;
  // Replay & Detailed Analytics Data
  promptWords?: string[];
  wordLogs?: MatchWordLog[];
  keystrokes?: MatchReplayEvent[];
  chartData?: { second: number; wpm: number; errors?: number; acc?: number }[];
  mistakes?: MistakeDetail[];
  commonErrorKeys?: { key: string; count: number }[];
  peakWpm?: number;
  averageHesitationMs?: number;
  slowestWord?: { word: string; pauseMs: number };
}

import {
  getMatchHistorySync,
  saveMatchHistoryToIndexedDB,
  clearMatchHistoryFromIndexedDB,
} from './leaderboardStorage';

export const MAX_COMPLETED_HISTORY = 20;

/**
 * Lấy danh sách lịch sử đấu từ bộ nhớ đệm / IndexedDB (chỉ giữ tối đa 20 ván hoàn thành gần nhất)
 */
export function getStoredMatchHistory(): MatchRecord[] {
  const all = getMatchHistorySync() as MatchRecord[];
  // Lọc chỉ giữ các trận đấu đã hoàn thành (isCompleted: true và không đầu hàng)
  const completed = all.filter((r) => r.isCompleted !== false && r.result !== 'Đầu hàng');
  return completed.slice(0, MAX_COMPLETED_HISTORY);
}

/**
 * Phân tích danh sách lỗi sai và phân loại nguyên nhân mắc lỗi
 */
export function analyzeMatchMistakes(
  wordLogs: MatchWordLog[],
  promptWords?: string[],
  keystrokes?: MatchReplayEvent[]
): {
  mistakes: MistakeDetail[];
  commonErrorKeys: { key: string; count: number }[];
  slowestWord?: { word: string; pauseMs: number };
  averageHesitationMs: number;
} {
  const mistakesMap: Record<string, MistakeDetail> = {};
  const errorKeyMap: Record<string, number> = {};

  // Phân tích từng từ bị gõ sai
  wordLogs.forEach((log) => {
    if (!log.isCorrect && log.word && log.typed) {
      const orig = log.word.trim();
      const typ = log.typed.trim();
      const key = `${orig}__${typ}`;

      let type: MistakeDetail['type'] = 'other';
      let label = 'Sai chính tả';

      // 1. Kiểm tra dấu thanh tiếng Việt (Telex)
      const vietnameseTones = /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/i;
      if (vietnameseTones.test(orig) || vietnameseTones.test(typ)) {
        type = 'telex_tone';
        label = 'Dấu thanh Telex (s, f, r, x, j, w)';
      }
      // 2. Kiểm tra đảo ký tự (transposition)
      else if (orig.length === typ.length && orig.length >= 2) {
        let diffCount = 0;
        for (let i = 0; i < orig.length; i++) {
          if (orig[i] !== typ[i]) diffCount++;
        }
        if (diffCount === 2) {
          type = 'transposition';
          label = 'Đảo ký tự (tay nhanh hơn nhịp)';
        }
      }
      // 3. Phím ngón út (P, Q, Z, [, ], ;, ', ...)
      const pinkyChars = /[pqzPZXQ\[\];'\/\\]/;
      if (pinkyChars.test(orig) || pinkyChars.test(typ)) {
        type = 'pinky_key';
        label = 'Phím ngón út (P, Q, Z, ký tự mép)';
      }
      // 4. Phím số
      else if (/\d/.test(orig) || /\d/.test(typ)) {
        type = 'number_key';
        label = 'Hàng phím số / Phép tính';
      }
      // 5. Thừa / thiếu ký tự
      else if (typ.length < orig.length) {
        type = 'missing_char';
        label = 'Bỏ sót ký tự';
      } else if (typ.length > orig.length) {
        type = 'extra_char';
        label = 'Gõ thừa ký tự';
      }

      if (!mistakesMap[key]) {
        mistakesMap[key] = {
          original: orig,
          typed: typ,
          type,
          label,
          count: 1,
        };
      } else {
        mistakesMap[key].count++;
      }
    }
  });

  // Phân tích phím gõ sai từ keystrokes
  if (keystrokes && keystrokes.length > 0) {
    keystrokes.forEach((k) => {
      if (!k.isCorrect && k.key && k.key.length === 1) {
        const char = k.key.toLowerCase();
        errorKeyMap[char] = (errorKeyMap[char] || 0) + 1;
      }
    });
  }

  // Phân tích độ khựng (Hesitation) giữa các từ
  let slowestWord: { word: string; pauseMs: number } | undefined = undefined;
  let totalHesitation = 0;
  let hesitationCount = 0;

  for (let i = 1; i < wordLogs.length; i++) {
    const prev = wordLogs[i - 1];
    const curr = wordLogs[i];
    if (prev.timeMs !== undefined && curr.timeMs !== undefined && curr.timeMs > prev.timeMs) {
      const delta = curr.timeMs - prev.timeMs;
      totalHesitation += delta;
      hesitationCount++;
      if (!slowestWord || delta > slowestWord.pauseMs) {
        slowestWord = { word: curr.word, pauseMs: Math.round(delta) };
      }
    }
  }

  const averageHesitationMs = hesitationCount > 0 ? Math.round(totalHesitation / hesitationCount) : 0;

  const mistakes = Object.values(mistakesMap).sort((a, b) => b.count - a.count);
  const commonErrorKeys = Object.entries(errorKeyMap)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    mistakes,
    commonErrorKeys,
    slowestWord,
    averageHesitationMs,
  };
}

/**
 * Sinh lời khuyên huấn luyện viên đánh máy dựa trên thông số trận đấu
 */
export function generateTypingAdvice(record: Partial<MatchRecord>): {
  title: string;
  category: 'speed' | 'accuracy' | 'consistency' | 'technique' | 'mastery';
  icon: string;
  tip: string;
}[] {
  const tips: {
    title: string;
    category: 'speed' | 'accuracy' | 'consistency' | 'technique' | 'mastery';
    icon: string;
    tip: string;
  }[] = [];

  const wpm = record.wpm || 0;
  const acc = record.accuracy || 100;
  const consistency = record.consistency || 80;
  const mistakes = record.mistakes || [];

  // Lời khuyên 1: Độ chính xác & Backspace
  if (acc < 93) {
    tips.push({
      title: 'Quy tắc Độ chính xác trên 95%',
      category: 'accuracy',
      icon: '🎯',
      tip: 'Độ chính xác hiện tại (' + acc + '%) đang làm giảm tốc độ ròng do phải sửa lỗi. Hãy chủ động giảm 10% tốc độ để đạt độ chính xác >95%, nhịp gõ của bạn sẽ tự động tăng vọt!',
    });
  } else {
    tips.push({
      title: 'Độ chính xác xuất sắc',
      category: 'accuracy',
      icon: '✨',
      tip: 'Bạn giữ độ chính xác rất tốt (' + acc + '%). Hãy tự tin tăng dần nhịp bấm ngón tay để đẩy WPM lên ngưỡng kỷ lục mới!',
    });
  }

  // Lời khuyên 2: Nhịp gõ & Tính ổn định
  if (consistency < 75) {
    tips.push({
      title: 'Giữ nhịp gõ đều đặn (Rhythm)',
      category: 'consistency',
      icon: '🎵',
      tip: 'Biểu đồ nhịp gõ có sự trồi sụt. Hãy tưởng tượng bàn phím như một phím đàn piano: bấm nhịp nhàng từng âm thay vì gõ vội 1 từ rồi dừng lại khựng ở từ kế tiếp.',
    });
  } else {
    tips.push({
      title: 'Độ ổn định đáng nể',
      category: 'consistency',
      icon: '⚡',
      tip: 'Tính ổn định đạt ' + consistency + '%, bạn duy trì nhịp thở và kiểm soát bàn tay rất mượt mà trong suốt bài thi đấu.',
    });
  }

  // Lời khuyên 3: Kỹ thuật nhìn trước (Look-Ahead Technique)
  tips.push({
    title: 'Kỹ thuật quét trước từ (Look-Ahead)',
    category: 'technique',
    icon: '👀',
    tip: 'Trong khi ngón tay đang hoàn thành 2 chữ cái cuối của từ hiện tại, mắt bạn nên quét trước sang từ tiếp theo để não bộ chuẩn bị sẵn tư thế ngón.',
  });

  // Lời khuyên 4: Phân tích lỗi cụ thể
  const telexMistakes = mistakes.filter((m) => m.type === 'telex_tone');
  const pinkyMistakes = mistakes.filter((m) => m.type === 'pinky_key');
  const transpositionMistakes = mistakes.filter((m) => m.type === 'transposition');

  if (telexMistakes.length > 0) {
    tips.push({
      title: 'Hoàn thiện gõ dấu tiếng Việt',
      category: 'technique',
      icon: '🇻🇳',
      tip: 'Phát hiện lỗi ở quy tắc dấu thanh. Hãy nhớ quy tắc Telex chuẩn: gõ toàn bộ chữ cái trước rồi mới gõ phím dấu ở cuối từ (ví dụ: t-r-u-o-n-g-f -> trường).',
    });
  } else if (transpositionMistakes.length > 0) {
    tips.push({
      title: 'Khắc phục lỗi đảo vị trí chữ',
      category: 'speed',
      icon: '🔀',
      tip: 'Tay trái và tay phải của bạn đang tranh chấp nhịp gõ. Hãy thả lỏng cổ tay và đặt ngón tay cái nhẹ nhàng trên thanh Spacebar để cân bằng.',
    });
  } else if (pinkyMistakes.length > 0) {
    tips.push({
      title: 'Rèn luyện lực ngón út',
      category: 'mastery',
      icon: '🤙',
      tip: 'Ngón út thường yếu hơn ngón trỏ và ngón giữa. Hãy thử bài tập nhấn phím P, Q, Z nhẹ nhàng bằng cổ tay thay vì gồng ngón út.',
    });
  }

  return tips;
}

/**
 * Lưu một trận đấu mới vào lịch sử đấu (tối đa 20 ván hoàn thành gần nhất)
 */
export function addMatchRecord(record: {
  mode: string;
  modeId: string;
  subMode?: string;
  difficulty?: string;
  wpm: number;
  accuracy: number;
  result: MatchResult;
  score?: number;
  playType?: 'solo' | 'multiplayer';
  isCompleted?: boolean;
  durationSeconds?: number;
  totalWords?: number;
  correctWords?: number;
  incorrectWords?: number;
  correctChars?: number;
  totalErrors?: number;
  consistency?: number;
  rank?: number;
  totalParticipants?: number;
  promptWords?: string[];
  wordLogs?: MatchWordLog[];
  keystrokes?: MatchReplayEvent[];
  chartData?: { second: number; wpm: number; errors?: number; acc?: number }[];
  mistakes?: MistakeDetail[];
  commonErrorKeys?: { key: string; count: number }[];
  peakWpm?: number;
}): MatchRecord {
  const current = getStoredMatchHistory();
  const isCompleted = record.isCompleted !== undefined 
    ? record.isCompleted 
    : record.result !== 'Đầu hàng';

  // Tự động phân tích lỗi sai nếu có wordLogs
  let analyzedMistakes = record.mistakes || [];
  let analyzedErrorKeys = record.commonErrorKeys || [];
  let slowestWordInfo: { word: string; pauseMs: number } | undefined = undefined;
  let avgHesitation = 0;

  if (record.wordLogs && record.wordLogs.length > 0 && analyzedMistakes.length === 0) {
    const analysis = analyzeMatchMistakes(record.wordLogs, record.promptWords, record.keystrokes);
    analyzedMistakes = analysis.mistakes;
    analyzedErrorKeys = analysis.commonErrorKeys;
    slowestWordInfo = analysis.slowestWord;
    avgHesitation = analysis.averageHesitationMs;
  }

  // Tính peak WPM nếu chưa có
  let calculatedPeakWpm = record.peakWpm;
  if (!calculatedPeakWpm && record.chartData && record.chartData.length > 0) {
    calculatedPeakWpm = Math.max(...record.chartData.map((p) => p.wpm || 0));
  }
  if (!calculatedPeakWpm) {
    calculatedPeakWpm = Math.round(record.wpm * 1.15);
  }

  const newRecord: MatchRecord = {
    id: `match_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    mode: record.mode,
    modeId: record.modeId,
    subMode: record.subMode,
    difficulty: record.difficulty,
    wpm: Math.max(0, Math.round(record.wpm || 0)),
    accuracy: Math.max(0, Math.min(100, Math.round(record.accuracy ?? 100))),
    result: record.result,
    score: record.score !== undefined ? Math.max(0, Math.round(record.score)) : undefined,
    playType: record.playType || 'solo',
    isCompleted,
    durationSeconds: record.durationSeconds,
    totalWords: record.totalWords || (record.promptWords ? record.promptWords.length : undefined),
    correctWords: record.correctWords || (record.wordLogs ? record.wordLogs.filter((w) => w.isCorrect).length : undefined),
    incorrectWords: record.incorrectWords || (record.wordLogs ? record.wordLogs.filter((w) => !w.isCorrect).length : undefined),
    correctChars: record.correctChars,
    totalErrors: record.totalErrors,
    consistency: record.consistency,
    rank: record.rank,
    totalParticipants: record.totalParticipants,
    promptWords: record.promptWords,
    wordLogs: record.wordLogs,
    keystrokes: record.keystrokes,
    chartData: record.chartData,
    mistakes: analyzedMistakes,
    commonErrorKeys: analyzedErrorKeys,
    peakWpm: calculatedPeakWpm,
    averageHesitationMs: avgHesitation,
    slowestWord: slowestWordInfo,
  };

  // QUY TẮC: Chỉ lưu tối đa 20 ván hoàn thành gần nhất
  // Không lưu các ván đầu hàng hoặc out sớm
  if (!isCompleted) {
    return newRecord;
  }

  const updated = [newRecord, ...current].slice(0, MAX_COMPLETED_HISTORY);
  saveMatchHistoryToIndexedDB(updated).catch(() => {});

  return newRecord;
}

/**
 * Xóa toàn bộ lịch sử đấu
 */
export function clearMatchHistory(): void {
  clearMatchHistoryFromIndexedDB().catch(() => {});
}

/**
 * Lấy tên hiển thị tiếng Việt thân thiện của chế độ
 */
export function getFriendlyModeName(modeId: string): string {
  switch (modeId) {
    case 'vi_dau':
      return 'Tiếng Việt có dấu';
    case 'vi_nodau':
      return 'Tiếng Việt không dấu';
    case 'en':
      return 'Tiếng Anh (English)';
    case 'numpad':
      return 'Bàn phím số Numpad';
    case 'ngau_hung':
      return 'Ngẫu Hứng (Rush)';
    case 'doan_chu':
      return 'Đoán Chữ (Mystery)';
    case 'san_boss':
      return 'Săn Boss Hắc Long';
    case 'outplay':
      return 'Outplay Yourself';
    default:
      return 'Đua Tốc Độ';
  }
}

/**
 * Lấy icon biểu tượng theo từng chế độ
 */
export function getModeIcon(modeId: string): string {
  switch (modeId) {
    case 'vi_dau':
      return '🇻🇳';
    case 'vi_nodau':
      return '⚡';
    case 'en':
      return '🇬🇧';
    case 'numpad':
      return '🔢';
    case 'ngau_hung':
      return '🟡';
    case 'doan_chu':
      return '🔍';
    case 'san_boss':
      return '🐉';
    case 'outplay':
      return '👑';
    default:
      return '⌨️';
  }
}

/**
 * Nhận diện chính xác thể loại từ vựng của ván đấu (Numpad/Số, Tiếng Anh, Không Dấu, Có Dấu)
 * Hỗ trợ nhận diện toàn diện cả chế độ Outplay Yourself (với các subMode numpad_number, numpad_fullsize...)
 * cũng như kiểm tra trực tiếp chữ ký số/từ vựng thực tế trong promptWords / mistakes / wordLogs.
 */
export function detectMatchCategory(
  match?: MatchRecord | null,
  modeOverride?: string
): {
  isNumberMode: boolean;
  isEnMode: boolean;
  isViNoDauMode: boolean;
  resolvedModeId: 'numpad' | 'en' | 'vi_nodau' | 'vi_dau';
} {
  const activeMode = String(modeOverride || match?.subMode || match?.modeId || match?.mode || '').toLowerCase();
  const diff = String(match?.difficulty || '').toLowerCase();

  // Kiểm tra mẫu từ vựng thực tế của ván đấu để bóc tách chính xác ngay cả khi ván đấu cũ chưa lưu subMode
  const sampleWords: string[] = [
    ...(match?.promptWords?.slice(0, 15) || []),
    ...(match?.wordLogs?.slice(0, 15).map((l) => l.word) || []),
    ...(match?.mistakes?.slice(0, 10).map((m) => m.original) || []),
  ]
    .filter(Boolean)
    .map((w) => String(w).trim());

  const numWordsCount = sampleWords.filter((w) => /^[\d+\-*/=.]+$/.test(w)).length;
  const hasStrongNumberSignature = sampleWords.length > 0 && numWordsCount / sampleWords.length >= 0.35;

  const isNumberMode =
    activeMode === 'numpad' ||
    activeMode === 'number' ||
    activeMode.includes('numpad') ||
    activeMode.includes('number') ||
    activeMode.includes('số') ||
    diff === 'number' ||
    diff === 'fullsize' ||
    hasStrongNumberSignature;

  const isEnMode =
    !isNumberMode &&
    (activeMode === 'en' ||
      activeMode.includes('tiếng anh') ||
      activeMode.includes('english') ||
      (sampleWords.length >= 5 && sampleWords.every((w) => /^[a-zA-Z',.\-!?]+$/.test(w))));

  const isViNoDauMode =
    !isNumberMode &&
    !isEnMode &&
    (activeMode === 'vi_nodau' ||
      activeMode.includes('không dấu') ||
      activeMode.includes('nodau'));

  const resolvedModeId: 'numpad' | 'en' | 'vi_nodau' | 'vi_dau' = isNumberMode
    ? 'numpad'
    : isEnMode
    ? 'en'
    : isViNoDauMode
    ? 'vi_nodau'
    : 'vi_dau';

  return { isNumberMode, isEnMode, isViNoDauMode, resolvedModeId };
}

export interface AiPersonalizedAnalysis {
  title: string;
  overview: string;
  dominantErrorPattern: string;
  keyWeaknesses: string[];
  targetClusters: string[];
  coachAdvice: string;
}

export interface AiPersonalizedPracticeResult {
  success: boolean;
  analysis: AiPersonalizedAnalysis;
  practiceWords: string[];
  isAiPowered: boolean;
}

/**
 * Tổng hợp toàn bộ các lỗi sai, phím sai và thời gian khựng từ toàn bộ 20 ván đấu
 */
export function aggregateHistoryMistakes(historyList: MatchRecord[]): {
  allMistakes: MistakeDetail[];
  allErrorKeys: { key: string; count: number }[];
  slowestWords: { word: string; pauseMs: number }[];
  avgWpm: number;
  avgAccuracy: number;
  avgConsistency: number;
} {
  const completed = historyList.filter((m) => m.isCompleted !== false && m.result !== 'Đầu hàng');
  const mistakeMap: Record<string, MistakeDetail> = {};
  const errorKeyMap: Record<string, number> = {};
  const slowestWords: { word: string; pauseMs: number }[] = [];

  let totalWpm = 0;
  let totalAcc = 0;
  let totalConsistency = 0;

  completed.forEach((m) => {
    totalWpm += m.wpm || 0;
    totalAcc += m.accuracy || 100;
    totalConsistency += m.consistency || 80;

    if (m.slowestWord) {
      slowestWords.push(m.slowestWord);
    }

    if (m.mistakes && m.mistakes.length > 0) {
      m.mistakes.forEach((item) => {
        const key = `${item.original}__${item.typed}`;
        if (!mistakeMap[key]) {
          mistakeMap[key] = { ...item };
        } else {
          mistakeMap[key].count += item.count;
        }
      });
    }

    if (m.commonErrorKeys && m.commonErrorKeys.length > 0) {
      m.commonErrorKeys.forEach((k) => {
        errorKeyMap[k.key] = (errorKeyMap[k.key] || 0) + k.count;
      });
    }
  });

  const allMistakes = Object.values(mistakeMap).sort((a, b) => b.count - a.count);
  const allErrorKeys = Object.entries(errorKeyMap)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  slowestWords.sort((a, b) => b.pauseMs - a.pauseMs);

  const count = Math.max(1, completed.length);
  return {
    allMistakes,
    allErrorKeys,
    slowestWords: slowestWords.slice(0, 5),
    avgWpm: Math.round(totalWpm / count),
    avgAccuracy: Math.round(totalAcc / count),
    avgConsistency: Math.round(totalConsistency / count),
  };
}


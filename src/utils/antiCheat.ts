import { KeystrokeEvent } from '../types';

export interface ValidationResult {
  isValid: boolean;
  verifiedWpm: number;
  consistency: number;
  reason?: string;
  isFlaggedBot?: boolean;
}

/**
 * Monkeytype Kogasa consistency mapping function:
 * Converts coefficient of variation (stddev / avg) of raw WPM into a 0 - 100% score.
 * Formula from Monkeytype (frontend/src/ts/utils/numbers.ts):
 * kogasa(x) = 100 * (1 - tanh(x + x^3/3 + x^5/5))
 */
export function kogasa(x: number): number {
  if (x <= 0) return 100;
  const x3 = Math.pow(x, 3) / 3;
  const x5 = Math.pow(x, 5) / 5;
  const val = 100 * (1 - Math.tanh(x + x3 + x5));
  return Math.max(0, Math.min(100, Math.round(val)));
}

/**
 * Tính toán chỉ số Consistency theo chuẩn Monkeytype (github.com/monkeytypegame/monkeytype):
 * 1. Thu thập tốc độ gõ thô (raw WPM) theo từng giây (mỗi giây = số ký tự / 5 * 60).
 * 2. Tính giá trị trung bình (mean) và độ lệch chuẩn (stdDev) của raw WPM theo từng giây.
 * 3. Tính hệ số biến thiên: cv = stdDev / mean.
 * 4. Áp dụng hàm ánh xạ phi tuyến tính Kogasa của Monkeytype: kogasa(cv) = 100 * (1 - tanh(cv + cv^3/3 + cv^5/5)).
 */
export function calculateConsistency(
  keystrokes: { time: number }[],
  durationSeconds?: number
): number {
  if (!keystrokes || keystrokes.length < 3) return 100;

  const startTime = keystrokes[0].time;
  const lastTime = keystrokes[keystrokes.length - 1].time;
  const elapsedMs = Math.max(1, lastTime - startTime);
  const elapsedSec = Math.max(1, Math.ceil(elapsedMs / 1000));

  // Determine total 1-second bins: ensure it is always a safe, non-negative integer
  const safeDuration =
    durationSeconds && Number.isFinite(durationSeconds) && durationSeconds > 0
      ? Math.ceil(durationSeconds)
      : elapsedSec;
  const totalSec = Math.max(1, Math.min(3600, Math.floor(safeDuration)));

  // If the test has less than 2 seconds of data (e.g. at the start), compute based on inter-keystroke interval CV
  if (totalSec < 2) {
    const intervals: number[] = [];
    for (let i = 1; i < keystrokes.length; i++) {
      const dt = keystrokes[i].time - keystrokes[i - 1].time;
      if (dt > 0 && dt < 4000) intervals.push(dt);
    }
    if (intervals.length < 2) return 100;
    const mean = intervals.reduce((acc, v) => acc + v, 0) / intervals.length;
    if (mean <= 0) return 0;
    const variance = intervals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    return kogasa(stdDev / mean);
  }

  // Group keystrokes into 1-second bins (Monkeytype rawPerSecond array)
  const buckets = new Array(totalSec).fill(0);
  for (const ks of keystrokes) {
    const sec = Math.floor((ks.time - startTime) / 1000);
    if (sec >= 0 && sec < totalSec) {
      buckets[sec]++;
    }
  }

  // Convert character count in each second to raw WPM (characters / 5 * 60 = characters * 12)
  const rawPerSecond = buckets.map((count) => count * 12);

  const n = rawPerSecond.length;
  const mean = rawPerSecond.reduce((acc, v) => acc + v, 0) / n;
  if (mean <= 0) return 0;

  const variance = rawPerSecond.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;

  return kogasa(cv);
}

/**
 * Giải pháp 4: Server-Side Validation (Phòng Đấu & Chống Hack)
 * Thẩm định mốc thời gian, WPM sinh học và tính nhất quán
 */
export function validateKeystrokes(
  keystrokes: KeystrokeEvent[],
  correctChars: number,
  durationSeconds: number
): ValidationResult {
  if (!Array.isArray(keystrokes) || keystrokes.length === 0) {
    return { isValid: false, verifiedWpm: 0, consistency: 0, reason: 'Không có dữ liệu gõ phím' };
  }

  const consistency = calculateConsistency(keystrokes);

  // Check consecutive intervals
  const intervals: number[] = [];
  for (let i = 1; i < keystrokes.length; i++) {
    const dt = keystrokes[i].time - keystrokes[i - 1].time;
    if (dt >= 0) intervals.push(dt);
  }

  if (intervals.length > 10) {
    // Detect unnatural machine speed (< 12ms dominates)
    const superFastCount = intervals.filter((dt) => dt < 12).length;
    if (superFastCount / intervals.length > 0.35) {
      return {
        isValid: false,
        verifiedWpm: 0,
        consistency: 0,
        isFlaggedBot: true,
        reason: 'Phát hiện tốc độ gõ máy tự động không tự nhiên (<12ms/phím)',
      };
    }

    // Variance check: bots have zero natural variance
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
    if (variance < 3.0 && mean < 55) {
      return {
        isValid: false,
        verifiedWpm: 0,
        consistency: 0,
        isFlaggedBot: true,
        reason: 'Phát hiện chuỗi phím có độ trễ cố định (Auto Typer Bot)',
      };
    }
  }

  // Calculate true biological elapsed time from keystrokes or durationSeconds
  let effectiveSeconds = durationSeconds > 0 ? durationSeconds : 60;
  if (keystrokes.length >= 2) {
    const elapsedFromKeystrokes = (keystrokes[keystrokes.length - 1].time - keystrokes[0].time) / 1000;
    if (elapsedFromKeystrokes >= 0.5) {
      effectiveSeconds = elapsedFromKeystrokes;
    }
  }
  const timeMinutes = Math.max(0.01, effectiveSeconds / 60);
  const verifiedWpm = Math.round(correctChars / 5 / timeMinutes);

  // Human biological limit: WPM > 320 is flaggable without special pro credentials
  if (verifiedWpm > 320) {
    return {
      isValid: false,
      verifiedWpm: 320,
      consistency,
      isFlaggedBot: true,
      reason: 'Tốc độ gõ vượt quá giới hạn sinh học người thật (>320 WPM)',
    };
  }

  return { isValid: true, verifiedWpm, consistency };
}

/**
 * Giải pháp 4: Thẩm định từ vựng gõ (Word Submission Validation)
 * Server lưu mốc thời gian và thẩm định tốc độ gõ từng từ
 */
export function validateWordSubmission(
  expectedWord: string,
  typedWord: string,
  lastWordTimestamp: number,
  clientTimestamp: number = performance.now()
): {
  isCorrect: boolean;
  timeTakenMs: number;
  wordWpm: number;
  isFlagged: boolean;
  warning?: string;
} {
  const isCorrect = typedWord.trim() === expectedWord.trim();
  const timeTakenMs = Math.max(10, clientTimestamp - lastWordTimestamp);
  const wordWpm = Math.round((expectedWord.length / 5) / (timeTakenMs / 60000));

  let isFlagged = false;
  let warning: string | undefined;

  // Words with length >= 6 typed in < 50ms (~1400+ WPM) or WPM > 350
  if (expectedWord.length >= 6 && timeTakenMs < 50) {
    isFlagged = true;
    warning = 'Tốc độ gõ bất thường (Instant word macro detected)!';
  } else if (wordWpm > 350) {
    isFlagged = true;
    warning = 'Tốc độ gõ vượt ngưỡng sinh lý bình thường (>350 WPM)!';
  }

  return {
    isCorrect,
    timeTakenMs,
    wordWpm,
    isFlagged,
    warning,
  };
}

/**
 * Giải pháp 4: Thẩm định sát thương Boss phía Server (Server-Authoritative Boss Damage)
 * Server tự tính toán Sát thương dựa trên từ vựng đúng và hệ số Combo
 */
export function calculateBossDamageServer(
  expectedWord: string,
  typedWord: string,
  currentCombo: number,
  isBossStunned: boolean,
  lastWordTimestamp: number
): {
  isValid: boolean;
  damage: number;
  isCrit: boolean;
  nextCombo: number;
  warning?: string;
} {
  const validation = validateWordSubmission(expectedWord, typedWord, lastWordTimestamp);

  if (!validation.isCorrect) {
    return {
      isValid: false,
      damage: 0,
      isCrit: false,
      nextCombo: 0,
    };
  }

  if (validation.isFlagged) {
    return {
      isValid: false,
      damage: 0,
      isCrit: false,
      nextCombo: 0,
      warning: validation.warning,
    };
  }

  const nextCombo = currentCombo + 1;
  
  // Combo multiplier formula
  let multiplier = 1.0;
  if (nextCombo >= 10) {
    multiplier = 2.0;
  } else if (nextCombo >= 6) {
    multiplier = 1.5;
  } else if (nextCombo >= 3) {
    multiplier = 1.2;
  }

  // Base damage = (word length + 1) * 3
  let baseDamage = (expectedWord.length + 1) * 3;
  let damage = Math.floor(baseDamage * multiplier);
  
  const isCrit = isBossStunned || nextCombo >= 5;
  if (isCrit) {
    damage = Math.round(damage * 1.5);
  }

  return {
    isValid: true,
    damage,
    isCrit,
    nextCombo,
  };
}

import { KeystrokeEvent } from '../types';

export interface ValidationResult {
  isValid: boolean;
  verifiedWpm: number;
  consistency: number;
  reason?: string;
  isFlaggedBot?: boolean;
}

/**
 * Giải pháp 3: Tính toán chỉ số Consistency chuyên sâu (Monkeytype Standard)
 * Consistency = max(0, 100 * (1 - (sigma / mu)))
 * mu: mean interval in milliseconds
 * sigma: standard deviation of keystroke intervals
 */
export function calculateConsistency(keystrokes: { time: number }[]): number {
  if (!keystrokes || keystrokes.length < 5) return 100;

  const intervals: number[] = [];
  for (let i = 1; i < keystrokes.length; i++) {
    const dt = keystrokes[i].time - keystrokes[i - 1].time;
    if (dt > 0 && dt < 4000) { // filter out pauses longer than 4s
      intervals.push(dt);
    }
  }

  if (intervals.length < 3) return 100;

  const mean = intervals.reduce((acc, v) => acc + v, 0) / intervals.length;
  if (mean <= 0) return 0;

  const variance = intervals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);

  // Consistency % score
  const score = Math.max(0, Math.round(100 * (1 - stdDev / mean)));
  return Math.min(100, score);
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

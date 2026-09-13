// Utility for Outplay Yourself mode: Ghost / Pace Caret tracking & replay
// Inspired by Monkeytype Pace Caret (last, pb, custom)

export type OutplayPaceMode = 'off' | 'last' | 'pb' | 'custom';
export type OutplaySubMode = 'numpad_number' | 'numpad_fullsize' | 'vi_nodau' | 'vi_dau' | 'en';

export interface GhostPoint {
  t: number; // ms elapsed since first keystroke
  charIdx: number; // linear character index typed
}

export interface GhostReplayRecord {
  subMode: OutplaySubMode;
  duration: number;
  wpm: number;
  accuracy: number;
  journey: GhostPoint[];
  timestamp: number;
}

function getLastKey(subMode: OutplaySubMode, amount: number, testType: 'time' | 'words' = 'time'): string {
  return `fasttyping_ghost_last_${testType}_${subMode}_${amount}`;
}

function getPbKey(subMode: OutplaySubMode, amount: number, testType: 'time' | 'words' = 'time'): string {
  return `fasttyping_ghost_pb_${testType}_${subMode}_${amount}`;
}

export function saveGhostRun(
  subMode: OutplaySubMode,
  durationOrWords: number,
  wpm: number,
  accuracy: number,
  journey: GhostPoint[],
  testType: 'time' | 'words' = 'time'
): void {
  if (journey.length === 0 || wpm <= 0) return;

  const record: GhostReplayRecord = {
    subMode,
    duration: durationOrWords,
    wpm,
    accuracy,
    journey,
    timestamp: Date.now(),
  };

  // 1. Always save as last run
  try {
    localStorage.setItem(getLastKey(subMode, durationOrWords, testType), JSON.stringify(record));
  } catch (e) {
    console.error('Failed to save ghost last run', e);
  }

  // 2. Save as PB if WPM is higher
  try {
    const existingPb = getStoredGhostRecord('pb', subMode, durationOrWords, testType);
    if (!existingPb || wpm > existingPb.wpm) {
      localStorage.setItem(getPbKey(subMode, durationOrWords, testType), JSON.stringify(record));
    }
  } catch (e) {
    console.error('Failed to save ghost PB run', e);
  }
}

export function getStoredGhostRecord(
  paceMode: 'last' | 'pb',
  subMode: OutplaySubMode,
  durationOrWords: number,
  testType: 'time' | 'words' = 'time'
): GhostReplayRecord | null {
  try {
    const key = paceMode === 'pb' ? getPbKey(subMode, durationOrWords, testType) : getLastKey(subMode, durationOrWords, testType);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as GhostReplayRecord;
  } catch (e) {
    return null;
  }
}

export function calculateGhostCharIndex(
  paceMode: OutplayPaceMode,
  customWpm: number,
  elapsedMs: number,
  activeRecord: GhostReplayRecord | null
): { charIdx: number; isAvailable: boolean; referenceWpm: number } {
  if (paceMode === 'off') {
    return { charIdx: 0, isAvailable: false, referenceWpm: 0 };
  }

  if (paceMode === 'custom') {
    // 1 word = 5 characters (Monkeytype standard)
    const charsPerMs = (customWpm * 5) / 60000;
    const charIdx = elapsedMs * charsPerMs;
    return { charIdx, isAvailable: true, referenceWpm: customWpm };
  }

  // If last or pb, we require a stored record
  if (!activeRecord || !activeRecord.journey || activeRecord.journey.length === 0) {
    // Ván đầu tiên khi chưa có số liệu -> không hiển thị con trỏ quá khứ
    return { charIdx: 0, isAvailable: false, referenceWpm: 0 };
  }

  const { journey, wpm } = activeRecord;

  if (elapsedMs <= journey[0].t) {
    return { charIdx: journey[0].charIdx, isAvailable: true, referenceWpm: wpm };
  }

  if (elapsedMs >= journey[journey.length - 1].t) {
    return { charIdx: journey[journey.length - 1].charIdx, isAvailable: true, referenceWpm: wpm };
  }

  // Binary search to find segment
  let low = 0;
  let high = journey.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (journey[mid].t <= elapsedMs) {
      if (mid === journey.length - 1 || journey[mid + 1].t > elapsedMs) {
        const p1 = journey[mid];
        const p2 = journey[mid + 1];
        const span = p2.t - p1.t || 1;
        const frac = (elapsedMs - p1.t) / span;
        const charIdx = p1.charIdx + frac * (p2.charIdx - p1.charIdx);
        return { charIdx, isAvailable: true, referenceWpm: wpm };
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return { charIdx: 0, isAvailable: true, referenceWpm: wpm };
}

export function mapLinearCharToWord(
  words: string[],
  targetLinearChar: number
): {
  wordIdx: number;
  charIdx: number;
  isSpaceOrEnd: boolean;
} {
  let acc = 0;
  for (let w = 0; w < words.length; w++) {
    const wordLen = words[w].length;
    if (targetLinearChar < acc + wordLen) {
      return {
        wordIdx: w,
        charIdx: Math.max(0, Math.floor(targetLinearChar - acc)),
        isSpaceOrEnd: false,
      };
    }
    acc += wordLen;
    if (targetLinearChar <= acc + 1) {
      return {
        wordIdx: w,
        charIdx: Math.max(0, wordLen - 1),
        isSpaceOrEnd: true,
      };
    }
    acc += 1;
  }

  const lastWordIdx = Math.max(0, words.length - 1);
  return {
    wordIdx: lastWordIdx,
    charIdx: words[lastWordIdx]?.length ? words[lastWordIdx].length - 1 : 0,
    isSpaceOrEnd: true,
  };
}

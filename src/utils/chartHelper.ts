import { PerformanceChartPoint } from '../types';

/**
 * Calculates optimal standard time milestones (ticks) strictly between 8 and 15
 * based on match duration, independent of any event-based milestones.
 */
export function getStandardTimeTicks(duration: number): { step: number; ticks: number[] } {
  const maxSec = Math.max(1, Math.round(duration));

  // Candidate standard steps in seconds (including fractions for short matches)
  const candidateSteps = [
    0.2, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60,
  ];

  let bestStep = 1;
  let bestScore = Infinity;

  for (const step of candidateSteps) {
    const count = Math.floor(maxSec / step);
    if (count >= 8 && count <= 15) {
      // Score heuristic: prefer count closest to 10-11, bonus for dividing evenly
      const countDist = Math.abs(count - 11);
      const remainder = Number((maxSec % step).toFixed(2));
      const score = countDist * 2 + (remainder === 0 ? 0 : 1);
      if (score < bestScore) {
        bestScore = score;
        bestStep = step;
      }
    }
  }

  // Fallback if no candidate in candidateSteps gave 8..15
  if (bestScore === Infinity) {
    // Target 10 ticks
    const targetCount = 10;
    const rawStep = maxSec / targetCount;
    if (rawStep >= 1) {
      bestStep = Math.max(1, Math.round(rawStep));
    } else {
      bestStep = Number(rawStep.toFixed(1)) || 0.5;
    }
  }

  const ticks: number[] = [];
  for (let t = bestStep; t <= maxSec + 0.001; t += bestStep) {
    ticks.push(Number(t.toFixed(1)));
  }

  // If ticks count still outside 8..15 due to rounding, normalize directly
  if (ticks.length < 8) {
    const refinedStep = Number((maxSec / 10).toFixed(2)) || 1;
    const refinedTicks: number[] = [];
    for (let t = refinedStep; t <= maxSec + 0.001; t += refinedStep) {
      refinedTicks.push(Number(t.toFixed(1)));
    }
    return { step: refinedStep, ticks: refinedTicks.slice(0, 15) };
  } else if (ticks.length > 15) {
    const refinedStep = Number((maxSec / 12).toFixed(2)) || 1;
    const refinedTicks: number[] = [];
    for (let t = refinedStep; t <= maxSec + 0.001; t += refinedStep) {
      refinedTicks.push(Number(t.toFixed(1)));
    }
    return { step: refinedStep, ticks: refinedTicks.slice(0, 15) };
  }

  return { step: bestStep, ticks };
}

/**
 * Ensures chart dataset has clean data points across all standard milestones
 * and preserves any event milestones (errors, finish) without counting them towards
 * standard ticks. Guarantees smooth player speed line rendering.
 */
export function normalizeChartTimeline(
  rawPoints: PerformanceChartPoint[],
  totalDuration: number,
  finalWpm: number,
  sessionBestWpm?: number,
  ghostWpm?: number
): PerformanceChartPoint[] {
  const safeDuration = Math.max(1, Math.round(totalDuration));
  const { ticks: standardTicks } = getStandardTimeTicks(safeDuration);

  // Map of raw recorded points to calculate accurate speed & identify events
  const rawMap = new Map<number, PerformanceChartPoint>();
  const eventPoints: PerformanceChartPoint[] = [];

  for (const p of rawPoints) {
    const secKey = Number(p.second.toFixed(1));
    const existing = rawMap.get(secKey);
    if (!existing) {
      rawMap.set(secKey, { ...p, second: secKey });
    } else {
      existing.playerWpm = p.playerWpm || existing.playerWpm;
      existing.errors += p.errors || 0;
      if (existing.errors > 0) {
        existing.errorPlot = existing.playerWpm;
      }
    }

    // Identify events (errors)
    if (p.errors > 0 || p.errorPlot !== null) {
      eventPoints.push({ ...p, second: secKey });
    }
  }

  // Sorted list of raw sampled seconds for smooth interpolation
  const sortedRawSecs = Array.from(rawMap.keys()).sort((a, b) => a - b);

  // Helper to interpolate player WPM at a given second
  const getInterpolatedWpm = (sec: number): number => {
    if (rawMap.has(sec)) {
      return rawMap.get(sec)!.playerWpm;
    }
    if (sortedRawSecs.length === 0) {
      return Math.round(finalWpm);
    }
    // Find surrounding recorded points
    const prevSecs = sortedRawSecs.filter((s) => s <= sec);
    const nextSecs = sortedRawSecs.filter((s) => s > sec);

    if (prevSecs.length === 0 && nextSecs.length > 0) {
      return rawMap.get(nextSecs[0])!.playerWpm;
    }
    if (nextSecs.length === 0 && prevSecs.length > 0) {
      return rawMap.get(prevSecs[prevSecs.length - 1])!.playerWpm;
    }
    if (prevSecs.length > 0 && nextSecs.length > 0) {
      const prevSec = prevSecs[prevSecs.length - 1];
      const nextSec = nextSecs[0];
      const prevWpm = rawMap.get(prevSec)!.playerWpm;
      const nextWpm = rawMap.get(nextSec)!.playerWpm;
      const ratio = (sec - prevSec) / Math.max(0.001, nextSec - prevSec);
      return Math.round(prevWpm + (nextWpm - prevWpm) * ratio);
    }
    return Math.round(finalWpm);
  };

  // Build the final dataset map
  const finalPointMap = new Map<number, PerformanceChartPoint>();

  // 1. Standard milestones (strictly from standardTicks)
  for (const stdSec of standardTicks) {
    const wpm = getInterpolatedWpm(stdSec);
    const existingRaw = rawMap.get(stdSec);
    const errorsAtTick = existingRaw?.errors || 0;

    finalPointMap.set(stdSec, {
      second: stdSec,
      playerWpm: wpm,
      ghostWpm: ghostWpm && ghostWpm > 0 ? ghostWpm : undefined,
      sessionBestWpm: sessionBestWpm && sessionBestWpm > 0 ? sessionBestWpm : undefined,
      errors: errorsAtTick,
      errorPlot: errorsAtTick > 0 ? wpm : null,
    });
  }

  // 2. Event milestones: Preserve error events at their exact timestamp (not counting as standard ticks)
  for (const ev of eventPoints) {
    const secKey = Number(ev.second.toFixed(1));
    const existing = finalPointMap.get(secKey);
    if (!existing) {
      // Add event point with interpolated speed so the speed curve passes through it
      const wpm = ev.playerWpm > 0 ? ev.playerWpm : getInterpolatedWpm(secKey);
      finalPointMap.set(secKey, {
        second: secKey,
        playerWpm: wpm,
        ghostWpm: ghostWpm && ghostWpm > 0 ? ghostWpm : undefined,
        sessionBestWpm: sessionBestWpm && sessionBestWpm > 0 ? sessionBestWpm : undefined,
        errors: ev.errors,
        errorPlot: wpm,
      });
    } else {
      existing.errors = Math.max(existing.errors, ev.errors);
      existing.errorPlot = existing.playerWpm;
    }
  }

  // 3. Ensure starting milestone at second 0
  if (!finalPointMap.has(0)) {
    const firstWpm = sortedRawSecs.length > 0 ? rawMap.get(sortedRawSecs[0])!.playerWpm : Math.round(finalWpm);
    finalPointMap.set(0, {
      second: 0,
      playerWpm: 0,
      ghostWpm: ghostWpm && ghostWpm > 0 ? ghostWpm : undefined,
      sessionBestWpm: sessionBestWpm && sessionBestWpm > 0 ? sessionBestWpm : undefined,
      errors: 0,
      errorPlot: null,
    });
  }

  // 4. Ensure final completion point at safeDuration
  const endSec = Number(safeDuration.toFixed(1));
  if (!finalPointMap.has(endSec)) {
    finalPointMap.set(endSec, {
      second: endSec,
      playerWpm: Math.round(finalWpm),
      ghostWpm: ghostWpm && ghostWpm > 0 ? ghostWpm : undefined,
      sessionBestWpm: sessionBestWpm && sessionBestWpm > 0 ? sessionBestWpm : undefined,
      errors: 0,
      errorPlot: null,
    });
  }

  // Sort and apply metadata to all points
  const result = Array.from(finalPointMap.values()).sort((a, b) => a.second - b.second);
  return result.map((p) => ({
    ...p,
    ghostWpm: ghostWpm && ghostWpm > 0 ? ghostWpm : p.ghostWpm,
    sessionBestWpm: sessionBestWpm && sessionBestWpm > 0 ? sessionBestWpm : p.sessionBestWpm,
  }));
}

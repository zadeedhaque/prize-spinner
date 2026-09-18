import type { WheelSegment } from "./wheelMath";

/**
 * Weighted random selection for a normal spin.
 *
 * Prizes marked `awardOnlyByTrigger` (the $100 jackpot) are excluded
 * entirely: they stay visible on the wheel but cannot come up by chance, so
 * the remaining prizes share out 100% of the odds in proportion to their
 * weights. For every other prize, chance of winning still equals its share
 * of the wheel among the winnable slices.
 */
export function pickWeightedSegment(segments: WheelSegment[]): WheelSegment {
  const winnable = segments.filter((s) => !s.prize.awardOnlyByTrigger);
  if (winnable.length === 0) {
    throw new Error("Every prize is marked awardOnlyByTrigger — a normal spin has nothing to land on.");
  }

  const totalWeight = winnable.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const segment of winnable) {
    roll -= segment.weight;
    if (roll <= 0) {
      return segment;
    }
  }
  // Floating point fallback: extremely unlikely, but guarantees a return.
  return winnable[winnable.length - 1];
}

/** Finds the segment for a specific prize id (used by the guaranteed-win trigger). */
export function findSegmentByPrizeId(segments: WheelSegment[], prizeId: string): WheelSegment | undefined {
  return segments.find((s) => s.prize.id === prizeId);
}

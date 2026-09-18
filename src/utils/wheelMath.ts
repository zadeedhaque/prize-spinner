import type { Prize } from "../config/prizes";
import { LANDING_MARGIN_DEGREES, MAX_ROTATIONS, MIN_ROTATIONS } from "../config/settings";

/**
 * A prize with its computed slot on the wheel, derived once from the prize
 * list's weights. Angle convention used throughout this file and the wheel
 * SVG: 0 degrees = 12 o'clock (top), increasing CLOCKWISE. The pointer is
 * fixed at the top (screen angle 0), and the wheel itself rotates under it.
 */
export interface WheelSegment {
  prize: Prize;
  index: number;
  weight: number;
  /** Share of the circle, 0-1. Equal to win probability under normal play. */
  probability: number;
  startAngle: number;
  endAngle: number;
  centerAngle: number;
  angleSpan: number;
}

/** Computes each prize's segment geometry from its weight. Pure + cheap: call once per prize-list change. */
export function computeSegments(prizeList: Prize[]): WheelSegment[] {
  const totalWeight = prizeList.reduce((sum, p) => sum + p.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("Total prize weight must be greater than 0.");
  }

  let cursor = 0;
  return prizeList.map((prize, index) => {
    const angleSpan = (prize.weight / totalWeight) * 360;
    const startAngle = cursor;
    const endAngle = cursor + angleSpan;
    cursor = endAngle;
    return {
      prize,
      index,
      weight: prize.weight,
      probability: prize.weight / totalWeight,
      startAngle,
      endAngle,
      centerAngle: (startAngle + endAngle) / 2,
      angleSpan,
    };
  });
}

/** Point on a circle of radius r centered at (cx, cy) for our angle convention (0 = top, clockwise). */
export function polarPoint(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

/** SVG path `d` string for a pie slice from startAngle to endAngle at radius r, centered at (cx, cy). */
export function describeSegmentPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarPoint(cx, cy, r, startAngle);
  const end = polarPoint(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

/**
 * Computes the final CSS rotation (in degrees, can be much larger than 360)
 * that should be applied to the wheel so that, starting from
 * `currentRotation`, it spins forward several full turns and stops with the
 * pointer (fixed at screen angle 0 / top) landing precisely inside
 * `segment`, at least `LANDING_MARGIN_DEGREES` away from either edge.
 *
 * This is exact math, not a guess-and-hope animation: we solve for the
 * rotation whose value mod 360 places the segment under the pointer, then
 * add whole spins on top for visual drama.
 */
export function computeTargetRotation(segment: WheelSegment, currentRotation: number): number {
  const margin = Math.min(LANDING_MARGIN_DEGREES, segment.angleSpan / 2 - 0.5);
  const safeMargin = Math.max(margin, 0);
  // Random point inside the segment, kept clear of both edges.
  const usableSpan = Math.max(segment.angleSpan - safeMargin * 2, 0);
  const landingAngle = segment.startAngle + safeMargin + Math.random() * usableSpan;

  // After rotating the wheel by R degrees clockwise, the point that was at
  // angle `landingAngle` now sits at screen angle (landingAngle + R) mod 360.
  // We need that to equal 0 (under the fixed top pointer).
  const requiredMod = (360 - (landingAngle % 360)) % 360;

  const currentMod = ((currentRotation % 360) + 360) % 360;
  const deltaToTarget = (requiredMod - currentMod + 360) % 360;

  const extraSpins = randomIntInclusive(MIN_ROTATIONS, MAX_ROTATIONS) * 360;

  return currentRotation + extraSpins + deltaToTarget;
}

function randomIntInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * The angle an element is actually rendering right now, expressed as an
 * absolute rotation continuing forward from `lastRotation`.
 *
 * Needed because the idle rotation is a CSS animation: React's `rotation`
 * state says where the wheel last stopped, while the element has drifted on
 * since. Reading the live angle lets a spin start from what the player can
 * see rather than snapping back.
 */
export function readVisualRotation(element: Element | null, lastRotation: number): number {
  if (!element) return lastRotation;
  try {
    const { transform } = getComputedStyle(element);
    if (!transform || transform === "none") return lastRotation;

    const matrix = new DOMMatrixReadOnly(transform);
    const shown = (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
    // A matrix only reveals -180..180, so step forward to the equivalent
    // absolute angle at or after lastRotation.
    const delta = (((shown - lastRotation) % 360) + 360) % 360;
    return lastRotation + delta;
  } catch {
    // If the matrix can't be read, spin from the last known value instead —
    // the landing position stays exact either way.
    return lastRotation;
  }
}

/** Given an absolute wheel rotation, finds which segment currently sits under the fixed top pointer. */
export function segmentAtRotation(segments: WheelSegment[], rotation: number): WheelSegment | undefined {
  const rotMod = ((rotation % 360) + 360) % 360;
  // Inverse of the rotation math above: the angle currently at the pointer
  // (screen angle 0) originated from wheel-local angle (360 - rotMod) % 360.
  const localAngle = (360 - rotMod) % 360;
  return segments.find((s) => localAngle >= s.startAngle && localAngle < s.endAngle) ?? segments[0];
}

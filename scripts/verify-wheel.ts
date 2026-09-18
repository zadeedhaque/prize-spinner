/**
 * Verifies the wheel's core invariants against the real application modules.
 *
 *   npm run verify
 *
 * Run this after editing prizes or weights: it re-checks that segment sizes
 * follow the weights, that the weighted picker matches those same weights,
 * and — most importantly — that the spin always stops with the pointer
 * inside the intended segment.
 *
 * Bundled with esbuild (already present as Vite's own dependency) and run in
 * Node, so there is no test framework to install.
 */
import { prizes } from "../src/config/prizes";
import {
  FORCED_SPIN_TRIGGERS,
  GUARANTEED_PRIZE_ID,
  LANDING_MARGIN_DEGREES,
  MAX_ROTATIONS,
  MIN_ROTATIONS,
} from "../src/config/settings";
import { describeShortcut } from "../src/utils/keyboard";
import { findSegmentByPrizeId, pickWeightedSegment } from "../src/utils/random";
import { computeSegments, computeTargetRotation, segmentAtRotation } from "../src/utils/wheelMath";

let failures = 0;

function check(label: string, passed: boolean, detail = "") {
  const mark = passed ? "PASS" : "FAIL";
  if (!passed) failures += 1;
  console.log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ""}`);
}

const segments = computeSegments(prizes);

console.log("\nSegment geometry (derived from weights)");
console.log("  prize                      weight   angle     share");
for (const s of segments) {
  console.log(
    `  ${s.prize.name.padEnd(24)} ${String(s.weight).padStart(4)}   ${s.angleSpan
      .toFixed(2)
      .padStart(6)}°   ${(s.probability * 100).toFixed(2).padStart(5)}%`
  );
}

console.log("\nGeometry invariants");
const totalAngle = segments.reduce((sum, s) => sum + s.angleSpan, 0);
check("segments fill exactly 360°", Math.abs(totalAngle - 360) < 1e-9, `${totalAngle}°`);

const noGaps = segments.every((s, i) => i === 0 || Math.abs(s.startAngle - segments[i - 1].endAngle) < 1e-9);
check("no gaps or overlaps between segments", noGaps);

const jackpot = findSegmentByPrizeId(segments, GUARANTEED_PRIZE_ID);
check("guaranteed prize id exists in the prize list", Boolean(jackpot), GUARANTEED_PRIZE_ID);

// A trigger pointing at a prize id that doesn't exist would fall through to a
// normal random spin without saying anything, so fail loudly here instead.
const unknownTriggers = FORCED_SPIN_TRIGGERS.filter(
  (entry) => !findSegmentByPrizeId(segments, entry.prizeId)
);
check(
  "every forced-spin trigger points at a real prize",
  unknownTriggers.length === 0,
  FORCED_SPIN_TRIGGERS.map(
    (entry) => `${describeShortcut(entry.shortcut)} -> ${entry.prizeId}`
  ).join(", ")
);

if (jackpot) {
  const smallest = segments.reduce((min, s) => (s.angleSpan < min.angleSpan ? s : min));
  check("jackpot has the smallest segment on the wheel", smallest.prize.id === jackpot.prize.id);
}

const byId = (id: string) => segments.find((s) => s.prize.id === id);
const voucherOrder = ["voucher-5", "voucher-10", "voucher-15", "voucher-50", "voucher-100-ultimate"]
  .map(byId)
  .filter((s): s is NonNullable<typeof s> => Boolean(s));
check(
  "voucher slices shrink as their value rises",
  voucherOrder.every((s, i) => i === 0 || voucherOrder[i - 1].angleSpan > s.angleSpan),
  voucherOrder.map((s) => `${s.prize.name.replace(" Voucher", "")} ${s.angleSpan.toFixed(1)}°`).join(" > ")
);
const v100 = byId("voucher-100-ultimate");

console.log("\nLanding accuracy (2000 spins per segment)");
let worstClearance = Infinity;
let landingErrors = 0;
let rotationErrors = 0;
for (const segment of segments) {
  for (let i = 0; i < 2000; i += 1) {
    const from = Math.random() * 5000;
    const target = computeTargetRotation(segment, from);

    // Which segment ends up under the fixed top pointer?
    if (segmentAtRotation(segments, target)?.prize.id !== segment.prize.id) landingErrors += 1;

    // Whole turns travelled must stay within the configured range.
    const turns = (target - from) / 360;
    if (turns < MIN_ROTATIONS || turns > MAX_ROTATIONS + 1) rotationErrors += 1;

    // How far the landing point sits from the nearest segment edge.
    const landedLocal = (360 - (((target % 360) + 360) % 360)) % 360;
    const clearance = Math.min(landedLocal - segment.startAngle, segment.endAngle - landedLocal);
    worstClearance = Math.min(worstClearance, clearance);
  }
}
check("every spin lands inside its intended segment", landingErrors === 0, `${landingErrors} misses`);
check(
  "every spin travels between MIN_ROTATIONS and MAX_ROTATIONS+1 turns",
  rotationErrors === 0,
  `${rotationErrors} out of range`
);
const expectedMargin = Math.min(LANDING_MARGIN_DEGREES, (v100?.angleSpan ?? 0) / 2 - 0.5);
check(
  "landing never touches a segment boundary",
  worstClearance > 0,
  `worst clearance ${worstClearance.toFixed(2)}° (thinnest segment allows ${expectedMargin.toFixed(2)}°)`
);

console.log("\nWeighted randomness (500,000 draws)");
const draws = 500_000;
const counts = new Map<string, number>();
for (let i = 0; i < draws; i += 1) {
  const picked = pickWeightedSegment(segments);
  counts.set(picked.prize.id, (counts.get(picked.prize.id) ?? 0) + 1);
}
// Trigger-only prizes are excluded from the draw, so the winnable slices
// share out 100% of the odds between them.
const winnableWeight = segments
  .filter((s) => !s.prize.awardOnlyByTrigger)
  .reduce((sum, s) => sum + s.weight, 0);

let worstDrift = 0;
for (const s of segments) {
  const expected = s.prize.awardOnlyByTrigger ? 0 : s.weight / winnableWeight;
  const observed = (counts.get(s.prize.id) ?? 0) / draws;
  worstDrift = Math.max(worstDrift, Math.abs(observed - expected));
  console.log(
    `  ${s.prize.name.padEnd(24)} expected ${(expected * 100).toFixed(2).padStart(5)}%   observed ${(
      observed * 100
    )
      .toFixed(2)
      .padStart(5)}%${s.prize.awardOnlyByTrigger ? "   (trigger only)" : ""}`
  );
}
check(
  "observed frequencies match the winnable slices' weights",
  worstDrift < 0.005,
  `worst drift ${(worstDrift * 100).toFixed(3)} percentage points`
);

const triggerOnly = segments.filter((s) => s.prize.awardOnlyByTrigger);
check(
  "trigger-only prizes never come up on a normal spin",
  triggerOnly.length > 0 && triggerOnly.every((s) => (counts.get(s.prize.id) ?? 0) === 0),
  triggerOnly.map((s) => `${s.prize.name}: ${counts.get(s.prize.id) ?? 0} hits`).join(", ")
);
check(
  "the guaranteed prize is itself trigger-only",
  Boolean(jackpot?.prize.awardOnlyByTrigger),
  "otherwise it could also be won by chance"
);

console.log(
  failures === 0 ? "\nAll wheel invariants hold.\n" : `\n${failures} check(s) failed.\n`
);
process.exit(failures === 0 ? 0 : 1);

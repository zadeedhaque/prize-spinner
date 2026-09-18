/**
 * ============================================================================
 *  PRIZE CONFIGURATION
 * ============================================================================
 * This is the ONLY file you need to touch to change what's on the wheel.
 *
 * HOW IT WORKS
 * - Each prize has a `weight`. The wheel calculates each segment's angle as
 *     (weight / totalWeight) * 360degrees
 *   and the same weights drive the random pick, so slice size and chance of
 *   winning are one number — there is no separate "probability" to keep in
 *   sync.
 * - The one exception is a prize marked `awardOnlyByTrigger` (the $100
 *   jackpot): it is drawn on the wheel at its weight so players can see it,
 *   but a normal spin can never land on it. It is only awarded by the secret
 *   shortcut in settings.ts, and the other prizes share out 100% of the real
 *   odds between them.
 * - Segments are drawn in array order, starting at the top and going
 *   clockwise.
 * - `id` must be unique and is used internally (e.g. by the guaranteed-win
 *   trigger in src/config/settings.ts, which points at a prize id).
 *
 * TO ADD A PRIZE: copy a block, give it a new unique `id`, set its weight.
 * TO REMOVE A PRIZE: delete its block.
 * TO RESIZE A PRIZE: change its `weight`. Bigger weight = bigger slice = more
 *   likely to be picked. Nothing else needs to change.
 * TO RECOLOR: change `color` (any valid CSS color).
 * TO RELABEL: change `label` (an array of 1-2 short lines shown on the wheel).
 *
 * Segments below `SMALL_SEGMENT_ANGLE_DEG` (see settings.ts) are too thin to
 * hold text inside the slice, and automatically render as a bright sliver
 * with their label on a badge near the hub instead, so tiny/rare prizes
 * (like the jackpot) stay readable no matter how small their weight makes
 * them.
 */

export type PrizeType = "discount" | "voucher" | "tryagain";

export interface Prize {
  /** Unique, stable identifier. Referenced by settings.ts for forced wins. */
  id: string;
  /** Full display name, used on the result screen. */
  name: string;
  /** Category, purely informational / for future logic (e.g. analytics). */
  type: PrizeType;
  /** Numeric value of the prize (percent for discounts, dollars for vouchers). */
  value: number;
  /** Relative weight -> controls the slice's size, and its share of the odds. */
  weight: number;
  /** Wheel slice fill color. */
  color: string;
  /** Text color used on top of this slice. */
  textColor: string;
  /** Short lines of text rendered on the wheel segment (1-2 lines). */
  label: string[];
  /** Marks the rare/jackpot prize for special visual + celebration treatment. */
  isJackpot?: boolean;
  /**
   * When true, a normal spin can NEVER land here — this prize is only ever
   * awarded by the secret trigger in settings.ts. It still takes up its
   * `weight` worth of the wheel so players can see it; the other prizes
   * share out all of the real chances between them.
   */
  awardOnlyByTrigger?: boolean;
}

export const prizes: Prize[] = [
  /**
   * Weights are set so the winnable slices come out at round numbers:
   * they add up to 200, so weight/2 is the percentage chance.
   *   5% Discount 30% | 10% 20% | 15% 10% | 20% 10% | Try Again 20%
   *   $5 5% | $10 3% | $15 2%
   * The two trigger-only vouchers ($50, $100) sit outside that total: they
   * take up their weight in wheel space but never come up by chance.
   */
  {
    id: "discount-5",
    name: "5% Discount",
    type: "discount",
    value: 5,
    weight: 60,
    color: "#1d8a52",
    textColor: "#ffffff",
    label: ["5%", "DISCOUNT"],
  },
  {
    // Placed here, far around the wheel from the $100, so the two thin
    // slices' hub badges never sit on top of each other.
    id: "voucher-50",
    name: "$50 Voucher",
    type: "voucher",
    value: 50,
    weight: 2,
    color: "#e9eff2",
    textColor: "#12291d",
    label: ["$50", "VOUCHER"],
    awardOnlyByTrigger: true,
  },
  {
    id: "discount-10",
    name: "10% Discount",
    type: "discount",
    value: 10,
    weight: 40,
    color: "#0f9b8e",
    textColor: "#ffffff",
    label: ["10%", "DISCOUNT"],
  },
  {
    id: "discount-15",
    name: "15% Discount",
    type: "discount",
    value: 15,
    weight: 20,
    color: "#0b5d3a",
    textColor: "#ffffff",
    label: ["15%", "DISCOUNT"],
  },
  {
    id: "discount-20",
    name: "20% Discount",
    type: "discount",
    value: 20,
    weight: 20,
    color: "#f5efdd",
    textColor: "#123524",
    label: ["20%", "DISCOUNT"],
  },
  {
    id: "try-again",
    name: "Try Again",
    type: "tryagain",
    value: 0,
    weight: 40,
    color: "#1f6f63",
    textColor: "#eafff7",
    label: ["TRY", "AGAIN"],
  },
  {
    id: "voucher-5",
    name: "$5 Voucher",
    type: "voucher",
    value: 5,
    weight: 10,
    color: "#f5efdd",
    textColor: "#123524",
    label: ["$5", "VOUCHER"],
  },
  {
    id: "voucher-10",
    name: "$10 Voucher",
    type: "voucher",
    value: 10,
    weight: 6,
    color: "#2fbf6a",
    textColor: "#07240f",
    label: ["$10", "VOUCHER"],
  },
  {
    id: "voucher-15",
    name: "$15 Voucher",
    type: "voucher",
    value: 15,
    weight: 4,
    color: "#0d9488",
    textColor: "#ffffff",
    label: ["$15", "VOUCHER"],
  },
  {
    id: "voucher-100-ultimate",
    name: "$100 Ultimate Voucher",
    type: "voucher",
    value: 100,
    weight: 1,
    color: "#ffd76b",
    textColor: "#3a2a00",
    label: ["$100", "ULTIMATE"],
    isJackpot: true,
    // Only ever awarded by its trigger, never by chance.
    awardOnlyByTrigger: true,
  },
];

/**
 * ============================================================================
 *  APPLICATION SETTINGS
 * ============================================================================
 * Central place for everything that isn't a prize. Change any value here
 * without touching component code.
 */

/** Total spin animation time in milliseconds. */
export const SPIN_DURATION = 5000;

/** The wheel always completes at least this many full rotations before landing. */
export const MIN_ROTATIONS = 5;

/** ...and never more than this many. A random value in between is chosen per spin. */
export const MAX_ROTATIONS = 8;

/**
 * Easing curve for the spin. This specific bezier gives the profile a real
 * wheel has: a brief wind-up, a long fast middle, then a dramatic, drawn-out
 * deceleration that ends at exactly zero velocity on the target segment.
 */
export const SPIN_EASING = "cubic-bezier(0.15, 0.06, 0.02, 1)";

/**
 * Safety margin (in degrees) kept clear from each segment's boundary when
 * picking the exact landing point. Prevents the pointer from ever appearing
 * to stop right on a dividing line between two segments.
 */
export const LANDING_MARGIN_DEGREES = 3;

/**
 * How a slice gets labelled, by how much room it has (see WheelSegment.tsx):
 *   angle >= TWO_LINE_MIN_ANGLE_DEG  -> two lines, e.g. "$5" / "VOUCHER"
 *   angle >= BADGE_MAX_ANGLE_DEG     -> one line, e.g. just "$15"
 *   anything thinner                 -> bright sliver + a badge near the hub
 *
 * Raise BADGE_MAX_ANGLE_DEG if labels ever look cramped inside their slice;
 * lower it if badges start crowding each other near the hub.
 */
export const TWO_LINE_MIN_ANGLE_DEG = 13;
export const BADGE_MAX_ANGLE_DEG = 5;

/**
 * How long one idle revolution takes, in seconds. The wheel turns slowly on
 * its own while it waits for a player, and hands that motion off to the spin
 * seamlessly. Larger = slower.
 */
export const IDLE_SPIN_SECONDS = 45;

/**
 * ----------------------------------------------------------------------------
 * SECRET / ADMIN FORCED-RESULT TRIGGERS
 * ----------------------------------------------------------------------------
 * Each entry pairs a keyboard shortcut with a prize id. Pressing the shortcut
 * arms that prize for the next spin, and only that spin — the spin itself
 * looks and sounds completely normal. Anything not armed is a normal weighted
 * random spin.
 *
 * Add, remove or re-key these freely; `prizeId` must match an id in
 * prizes.ts (npm run verify fails if one doesn't).
 *
 * A prize also marked `awardOnlyByTrigger` there — the $100 and the $50 —
 * can be won ONLY this way; a normal spin never lands on it. The others
 * ($5/$10/$15, Try Again) carry no such flag, so their shortcut merely
 * guarantees a prize that is also winnable by chance.
 *
 * DEVELOPER / SECURITY NOTE (read this before relying on it for anything):
 * These are a convenience for a staff member running the promotion locally
 * (awarding the jackpot to a VIP guest, or forcing a retry for a photo
 * moment). They are NOT a security mechanism. The shortcuts are defined here,
 * in plain text, and ship to every visitor's browser inside the JavaScript
 * bundle — anyone who opens devtools can find them in seconds. Never use this
 * pattern to gate anything that genuinely matters (payments, admin auth);
 * that needs a real backend.
 */
export const FORCED_SPIN_TRIGGERS = [
  { shortcut: { key: "P", ctrl: true, alt: true }, prizeId: "voucher-100-ultimate" },
  { shortcut: { key: "O", ctrl: true, alt: true }, prizeId: "voucher-50" },
  { shortcut: { key: "I", ctrl: true, alt: true }, prizeId: "voucher-15" },
  { shortcut: { key: "U", ctrl: true, alt: true }, prizeId: "voucher-10" },
  { shortcut: { key: "Y", ctrl: true, alt: true }, prizeId: "voucher-5" },
  { shortcut: { key: "L", ctrl: true, alt: true }, prizeId: "try-again" },
] as const;

/**
 * ----------------------------------------------------------------------------
 * TYPED FALLBACK CODES (for machines where the chords don't arrive)
 * ----------------------------------------------------------------------------
 * A Ctrl+Alt chord is not reliably deliverable to a web page on Windows.
 * Windows desktop shortcuts use Ctrl+Alt+<letter> for their global hotkey
 * field, and vendor utilities (graphics, mouse/keyboard drivers, screen
 * capture, meeting apps) and browser extensions register the same
 * combinations system-wide. Whoever claims one first swallows it, and the
 * browser never sees a keydown at all — no amount of application code can
 * recover a key that never arrives.
 *
 * So every trigger also has a typed code: press the digits in order, with no
 * modifiers, while the wheel is waiting. Digits are bound to nothing else,
 * can't be captured as a global hotkey, and are layout-independent. The
 * buffer clears after SEQUENCE_RESET_MS of not typing, so a code has to be
 * entered deliberately.
 *
 * Same warning as the chords above: this ships in plain text inside the
 * JavaScript bundle and is a staff convenience, not a security control.
 */
export const FORCED_SPIN_SEQUENCES = [
  { sequence: "100", prizeId: "voucher-100-ultimate" },
  { sequence: "050", prizeId: "voucher-50" },
  { sequence: "015", prizeId: "voucher-15" },
  { sequence: "010", prizeId: "voucher-10" },
  { sequence: "005", prizeId: "voucher-5" },
  { sequence: "000", prizeId: "try-again" },
] as const;

/** A typed code has to be finished within this long of a gap between keys. */
export const SEQUENCE_RESET_MS = 2000;

/**
 * When a trigger arms the next spin, show a small dot in the bottom-right
 * corner until that spin starts. Without it there is no way to tell an armed
 * spin from a shortcut the machine swallowed — which is exactly the failure
 * this was added to diagnose. Set to false for a completely invisible arm.
 */
export const SHOW_ARMED_INDICATOR = true;

/**
 * The prize the wheel can't award on its own. Kept as a named export because
 * prizes.ts, the jackpot celebration and scripts/verify-wheel.ts all refer to
 * it; it must stay in FORCED_SPIN_TRIGGERS above to remain winnable at all.
 */
export const GUARANTEED_PRIZE_ID = "voucher-100-ultimate";

/** How many past results the "Previous records" table keeps (oldest are dropped). */
export const MAX_RECORDS = 100;

/**
 * ----------------------------------------------------------------------------
 * LOGO
 * ----------------------------------------------------------------------------
 * Drop a file at public/logo.png (any reasonable image size, transparent PNG
 * recommended) and it is picked up automatically — no code changes needed.
 * If the file is missing, a polished text placeholder is shown instead.
 */
// Optional chaining so these paths also resolve when the module is imported
// outside Vite (e.g. by the verification script under scripts/).
const BASE = import.meta.env?.BASE_URL ?? "/";

export const LOGO_PATH = `${BASE}logo.png`;

/**
 * ----------------------------------------------------------------------------
 * AUDIO
 * ----------------------------------------------------------------------------
 * Master switch — set to false to disable all sound regardless of which
 * files are present. Individual files are optional: if a file listed below
 * doesn't exist at that path, that sound simply stays silent, the rest of
 * the app is unaffected, and nothing is logged as an error to the user.
 * Drop your own files into public/audio/ using these exact names.
 */
export const AUDIO_ENABLED = true;

export const AUDIO_PATHS = {
  start: `${BASE}audio/start.mp3`,
  spin: `${BASE}audio/spin.mp3`,
  tick: `${BASE}audio/tick.mp3`,
  win: `${BASE}audio/win.mp3`,
  jackpot: `${BASE}audio/jackpot.mp3`,
} as const;

/** localStorage keys used for optional, non-critical persistence. */
export const STORAGE_KEYS = {
  lastResult: "prizeSpinner.lastResult",
  totalSpins: "prizeSpinner.totalSpins",
  records: "prizeSpinner.records",
} as const;

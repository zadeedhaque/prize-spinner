/** A keyboard shortcut description, e.g. Ctrl + Alt + P. */
export interface Shortcut {
  /** Single letter ("P") or a KeyboardEvent.code ("Digit1", "F9"). */
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

/**
 * True when the event matches the shortcut, modifiers included.
 *
 * `event.code` (the physical key) is preferred over `event.key`, because Alt
 * changes `event.key` on several layouts — Alt+P gives "π" on macOS and dead
 * keys on some Windows layouts — while `code` stays "KeyP".
 *
 * But `code` is not always there to match against. An active IME (a Windows
 * machine set up for a non-Latin language), an on-screen or virtual
 * keyboard, a remote-desktop/KVM session and some automation paths all
 * deliver keydowns with `code` empty or generic. Those events used to fail
 * the check silently, so the shortcut simply did nothing — hence the
 * `event.key` fallback below.
 *
 * NOTE: this powers the guaranteed-win trigger and is deliberately not a
 * security mechanism — see the comment on FORCED_SPIN_TRIGGERS in
 * src/config/settings.ts.
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  if (!matchesKey(event, shortcut.key)) return false;

  // Windows and Linux layouts that have AltGr (UK, German, Nordic, Polish,
  // and others) report AltGr as Ctrl+Alt. Browsers set ctrlKey and altKey
  // for it and also flag it through getModifierState("AltGraph") — accept
  // either spelling so a Ctrl+Alt shortcut works on those keyboards too.
  const altGraph =
    typeof event.getModifierState === "function" && event.getModifierState("AltGraph");
  const ctrl = event.ctrlKey || altGraph;
  const alt = event.altKey || altGraph;

  if (ctrl !== Boolean(shortcut.ctrl)) return false;
  if (alt !== Boolean(shortcut.alt)) return false;
  if (event.metaKey !== Boolean(shortcut.meta)) return false;
  // Shift is only checked when the shortcut has an opinion about it: some
  // layouts fold Shift into a Ctrl+Alt combination on their own.
  if (shortcut.shift !== undefined && event.shiftKey !== shortcut.shift) return false;

  return true;
}

/**
 * Characters that AltGr (which Windows spells as Ctrl+Alt) produces instead
 * of a plain letter on US-International and the layouts that follow it.
 *
 * These are the layouts this app actually tripped over: on one of them
 * Ctrl+Alt+P arrives as "ö", Ctrl+Alt+O as "ó"/"Ó" and Ctrl+Alt+I as "í",
 * so the letter in `event.key` is no help on its own.
 *
 * Mapped explicitly rather than by stripping accents, because stripping
 * would fold "ö" to "o" and quietly arm the Ctrl+Alt+O prize when someone
 * pressed Ctrl+Alt+P. Every entry here points at exactly one shortcut.
 */
const ALT_GRAPH_CHARS: Record<string, string> = {
  ö: "p",
  ó: "o",
  í: "i",
  "i̍": "i",
  ú: "u",
  ü: "y",
  ø: "l",
};

/** Same map with both Unicode spellings of each character, built once. */
const ALT_GRAPH_LOOKUP = new Map<string, string>();
for (const [char, letter] of Object.entries(ALT_GRAPH_CHARS)) {
  for (const form of [char.normalize("NFC"), char.normalize("NFD")]) {
    ALT_GRAPH_LOOKUP.set(form, letter);
    ALT_GRAPH_LOOKUP.set(form.toUpperCase(), letter);
  }
}

/**
 * Matches the shortcut's key, trying three descriptions of "which key was
 * pressed" in order of reliability. Any one of them is enough.
 *
 *   1. `event.code` — the physical key. Right whenever the browser sets it.
 *   2. `event.keyCode` — the legacy virtual key code. Deprecated, but every
 *      desktop browser still sets it, and on Windows it survives layouts
 *      that rewrite everything else.
 *   3. `event.key` — the character produced, translated back through
 *      ALT_GRAPH_CHARS above.
 *
 * Steps 2 and 3 exist because a Ctrl+Alt chord is frequently not delivered
 * as a clean chord at all. `code` goes missing on an IME, an on-screen
 * keyboard or a remote-desktop session; `key` becomes an accented character
 * on any AltGr layout, or the literal string "Dead" when the layout treats
 * the combination as a dead key.
 */
function matchesKey(event: KeyboardEvent, key: string): boolean {
  const isSingleChar = key.length === 1;
  const expectedCode = isSingleChar ? `Key${key.toUpperCase()}` : key;

  if (event.code && event.code === expectedCode) return true;
  // Named keys ("Digit1", "F9") have nothing sensible to fall back on.
  if (!isSingleChar) return false;

  const upper = key.toUpperCase();
  if (/^[A-Z0-9]$/.test(upper) && event.keyCode === upper.charCodeAt(0)) return true;

  const typed = (event.key ?? "").normalize("NFC");
  if (!typed || typed === "Dead") return false;

  const lower = key.toLowerCase();
  return typed.toLowerCase() === lower || ALT_GRAPH_LOOKUP.get(typed) === lower;
}

/** Human-readable form of a shortcut, for developer logs and the README. */
export function describeShortcut(shortcut: Shortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.alt) parts.push("Alt");
  if (shortcut.shift) parts.push("Shift");
  if (shortcut.meta) parts.push("Meta");
  parts.push(shortcut.key.toUpperCase());
  return parts.join(" + ");
}

/**
 * Remembers the last few plain characters typed, so a modifier-free code
 * (e.g. "100") can be used as a trigger.
 *
 * This exists because a Ctrl+Alt chord is not reliably deliverable to a web
 * page on Windows: desktop-shortcut hotkeys, vendor utilities (graphics,
 * mouse and keyboard drivers, screen capture) and browser extensions all
 * claim Ctrl+Alt+<letter> combinations globally, and whoever claims one
 * first swallows it before the browser sees it. A sequence of ordinary
 * digits cannot be intercepted that way.
 *
 * Keys pressed with a modifier are ignored, and the buffer resets after
 * `resetMs` of inactivity so unrelated typing can't drift into a match.
 */
export interface SequenceTracker {
  /** Feeds one keydown in; returns the buffer of recently typed characters. */
  push(event: KeyboardEvent): string;
  clear(): void;
}

export function createSequenceTracker(options: {
  resetMs: number;
  maxLength: number;
}): SequenceTracker {
  let buffer = "";
  let lastAt = 0;

  return {
    push(event) {
      if (event.ctrlKey || event.altKey || event.metaKey) return buffer;

      const char = event.key;
      if (!char || char.length !== 1) return buffer;

      const now = Date.now();
      if (now - lastAt > options.resetMs) buffer = "";
      lastAt = now;

      buffer = (buffer + char.toLowerCase()).slice(-options.maxLength);
      return buffer;
    },
    clear() {
      buffer = "";
      lastAt = 0;
    },
  };
}

/** True when the event target is a field where the user is genuinely typing text. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

/** Normalised check for the space bar across browsers/layouts. */
export function isSpaceKey(event: KeyboardEvent): boolean {
  return event.code === "Space" || event.key === " " || event.key === "Spacebar";
}

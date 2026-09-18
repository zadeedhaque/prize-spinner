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
 * Matched on `event.code` (the physical key) rather than `event.key`,
 * because Alt changes `event.key` on several layouts — Alt+P gives "π" on
 * macOS and dead keys on some Windows layouts — while `code` stays "KeyP".
 *
 * NOTE: this powers the guaranteed-win trigger and is deliberately not a
 * security mechanism — see the comment on SECRET_TRIGGER in
 * src/config/settings.ts.
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  const expectedCode = shortcut.key.length === 1 ? `Key${shortcut.key.toUpperCase()}` : shortcut.key;

  return (
    event.code === expectedCode &&
    event.ctrlKey === Boolean(shortcut.ctrl) &&
    event.altKey === Boolean(shortcut.alt) &&
    event.shiftKey === Boolean(shortcut.shift) &&
    event.metaKey === Boolean(shortcut.meta)
  );
}

/** Human-readable form of a shortcut, for developer logs. */
export function describeShortcut(shortcut: Shortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.alt) parts.push("Alt");
  if (shortcut.shift) parts.push("Shift");
  if (shortcut.meta) parts.push("Meta");
  parts.push(shortcut.key.toUpperCase());
  return parts.join(" + ");
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

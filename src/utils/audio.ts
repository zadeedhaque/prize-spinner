import { AUDIO_ENABLED, AUDIO_PATHS } from "../config/settings";

type SoundName = keyof typeof AUDIO_PATHS;

/**
 * Minimal sound manager built on plain HTMLAudioElement — no dependency
 * needed for a handful of one-shot / looping clips. Every operation is
 * defensive: a missing audio file (404), an unsupported format, or a
 * browser autoplay block all fail silently and never throw or log an error
 * that the user would see. Playback only ever starts after `unlock()` is
 * called, which the app does on the very first keypress, satisfying
 * browsers' "audio needs a user gesture" autoplay policies.
 */
class SoundManager {
  private elements = new Map<SoundName, HTMLAudioElement>();
  /** Sounds whose file could not be loaded: never requested again. */
  private missing = new Set<SoundName>();
  private unlocked = false;

  private get(name: SoundName): HTMLAudioElement {
    let el = this.elements.get(name);
    if (!el) {
      el = new Audio(AUDIO_PATHS[name]);
      el.preload = "auto";
      // A file that isn't there is a supported setup, not an error — mark it
      // so a rapidly retriggered sound (the spin tick) doesn't keep asking.
      el.addEventListener("error", () => this.missing.add(name));
      this.elements.set(name, el);
    }
    return el;
  }

  /** Call once, synchronously inside a real user gesture (keydown/click). */
  unlock() {
    if (this.unlocked || !AUDIO_ENABLED) return;
    this.unlocked = true;
    for (const name of Object.keys(AUDIO_PATHS) as SoundName[]) {
      const el = this.get(name);
      el.volume = 0;
      el.play()
        .then(() => {
          el.pause();
          el.currentTime = 0;
          el.volume = 1;
        })
        .catch(() => {
          el.volume = 1;
        });
    }
  }

  play(name: SoundName, options: { loop?: boolean; volume?: number } = {}) {
    if (!AUDIO_ENABLED || this.missing.has(name)) return;
    try {
      const el = this.get(name);
      el.loop = Boolean(options.loop);
      el.volume = options.volume ?? 1;
      el.currentTime = 0;
      void el.play().catch(() => {
        /* file missing or blocked — silently no-op */
      });
    } catch {
      /* ignore */
    }
  }

  stop(name: SoundName) {
    const el = this.elements.get(name);
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
}

export const soundManager = new SoundManager();

/**
 * Plays the tick sound repeatedly for the duration of a spin, with the gap
 * between ticks widening as the wheel slows — the audible equivalent of the
 * deceleration curve. Returns a cancel function.
 *
 * The cadence is derived from the spin duration rather than from actual
 * segment-boundary crossings: it sounds indistinguishable and costs nothing
 * per frame, whereas solving the easing curve for every boundary crossing
 * would add real work during the animation.
 */
export function scheduleSpinTicks(durationMs: number): () => void {
  if (!AUDIO_ENABLED) return () => {};

  const minGap = 55;
  const maxGap = 420;
  let cancelled = false;
  let timer: number | undefined;
  const start = performance.now();

  const step = () => {
    if (cancelled) return;
    const progress = Math.min((performance.now() - start) / durationMs, 1);
    if (progress >= 1) return;

    soundManager.play("tick", { volume: 0.5 });
    // Ease the gap out so ticks bunch up early and stretch out at the end.
    const gap = minGap + (maxGap - minGap) * Math.pow(progress, 3);
    timer = window.setTimeout(step, gap);
  };

  step();

  return () => {
    cancelled = true;
    if (timer !== undefined) window.clearTimeout(timer);
  };
}

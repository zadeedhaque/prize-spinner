interface InstructionsProps {
  /** Key cap label, e.g. "SPACE" or "ENTER". */
  keyLabel: string;
  /** Text shown after the key cap, e.g. "TO SPIN". */
  action: string;
  /** Pulsing draws the eye on idle screens; steady suits in-game hints. */
  emphasis?: "pulse" | "steady";
  /** Optional smaller line above the main hint. */
  hint?: string;
}

/**
 * Reusable animated keyboard instruction line used across every screen.
 * Built from spans only so it can also be nested inside a <button> without
 * producing invalid HTML.
 */
export function Instructions({ keyLabel, action, emphasis = "pulse", hint }: InstructionsProps) {
  return (
    <span className={`instructions instructions--${emphasis}`}>
      {hint ? <span className="instructions__hint">{hint}</span> : null}
      <span className="instructions__line">
        <span className="keycap">{keyLabel}</span>
        <span className="instructions__action">{action}</span>
      </span>
    </span>
  );
}

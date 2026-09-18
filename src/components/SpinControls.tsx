import { Instructions } from "./Instructions";

interface SpinControlsProps {
  /** Disables input and swaps the copy while the wheel is turning. */
  spinning: boolean;
  onSpin: () => void;
}

/** Primary spin control. Keyboard is the main path; the button mirrors it. */
export function SpinControls({ spinning, onSpin }: SpinControlsProps) {
  return (
    <div className="controls">
      <button
        type="button"
        className={`btn btn--spin${spinning ? " btn--busy" : ""}`}
        onClick={onSpin}
        disabled={spinning}
        aria-live="polite"
      >
        {spinning ? (
          <span className="instructions instructions--steady">
            <span className="instructions__line">
              <span className="instructions__action">SPINNING&hellip;</span>
            </span>
          </span>
        ) : (
          <Instructions keyLabel="SPACE" action="TO SPIN" />
        )}
      </button>
    </div>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Instructions } from "./Instructions";
import { Logo } from "./Logo";

const MAX_NAME_LENGTH = 24;

interface NameEntryProps {
  /** The prize just won, shown so the player knows what they're claiming. */
  prizeName: string;
  onSubmit: (name: string) => void;
  onSkip: () => void;
}

/**
 * The claim card, shown after a win. Nothing is asked before a spin, so this
 * is the only place a name is collected — and Esc walks away without giving
 * one, in which case the prize is still logged, just unnamed.
 *
 * The field always starts empty: the card is mounted fresh each round, so
 * one player's name is never left sitting in the box for the next.
 */
export function NameEntry({ prizeName, onSubmit, onSkip }: NameEntryProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus as soon as the screen appears so the player can just type.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim().replace(/\s+/g, " ");

    if (!trimmed) {
      setError("Type a name to claim it, or press ESC to skip.");
      setShake(true);
      inputRef.current?.focus();
      return;
    }

    setError(null);
    onSubmit(trimmed);
  };

  return (
    <section className="screen screen--name" aria-labelledby="name-title">
      <div className="signup">
        <p className="signup__promo">Download our app</p>

        <form
          className={`panel panel--form${shake ? " panel--shake" : ""}`}
          onSubmit={handleSubmit}
          onAnimationEnd={() => setShake(false)}
          noValidate
        >
          <Logo size="sm" />

          <h1 id="name-title" className="title title--lg">
            YOU WON!
          </h1>
          <p className="subtitle">
            <span className="signup__prize">{prizeName}</span>
          </p>
          <p className="subtitle">Who should we put it under?</p>

          <div className="field">
            <label className="field__label" htmlFor="player-name">
              Player name
            </label>
            <input
              id="player-name"
              ref={inputRef}
              className={`field__input${error ? " field__input--invalid" : ""}`}
              type="text"
              value={value}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="off"
              spellCheck={false}
              placeholder="Type your name"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "name-error" : "name-help"}
              onChange={(event) => {
                setValue(event.target.value);
                if (error) setError(null);
              }}
            />
            <span className="field__counter" aria-hidden="true">
              {value.trim().length}/{MAX_NAME_LENGTH}
            </span>
          </div>

          <p id="name-error" className="field__error" role="alert">
            {error ?? ""}
          </p>

          <button type="submit" className="btn btn--primary btn--lg">
            <Instructions keyLabel="ENTER" action="TO CLAIM" hint="TYPE YOUR NAME" />
          </button>

          <button type="button" className="btn btn--ghost" onClick={onSkip}>
            <span className="btn__label">Esc &mdash; skip, back to the wheel</span>
          </button>

          <p id="name-help" className="footnote">
            Your name is only used to personalise this game on this device.
          </p>
        </form>

        <p className="signup__caption">sign up to play</p>
      </div>

      <p className="legal">Terms &amp; conditions*</p>
    </section>
  );
}

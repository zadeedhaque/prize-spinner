import type { Prize } from "../config/prizes";
import { Confetti } from "./Confetti";
import { Instructions } from "./Instructions";
import { Logo } from "./Logo";

interface ResultScreenProps {
  prize: Prize;
  onContinue: () => void;
}

/**
 * Result screen. Three treatments, chosen from the prize itself: jackpot
 * (gold, maximum celebration), a normal win, and "try again".
 *
 * A win fills the screen — logo, gold headline, the figure at poster size,
 * then a ticket naming the prize. No name appears here: nothing is asked of
 * a player before they spin, so the prize is revealed first and claimed by
 * name on the next screen.
 */
export function ResultScreen({ prize, onContinue }: ResultScreenProps) {
  const isJackpot = Boolean(prize.isJackpot);
  const isTryAgain = prize.type === "tryagain";
  const variant = isJackpot ? "jackpot" : isTryAgain ? "retry" : "win";

  const figure = prize.type === "discount" ? `${prize.value}%` : `$${prize.value}`;
  const ticketLabel = prize.type === "discount" ? "BAAZAR DISCOUNT" : "BAAZAR VOUCHER";

  return (
    <div
      className={`result result--${variant}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-heading"
    >
      {!isTryAgain ? <Confetti variant={isJackpot ? "jackpot" : "normal"} /> : null}

      <div className="result__panel">
        {isTryAgain ? (
          <>
            <Logo size="sm" />
            <p id="result-heading" className="result__kicker result__kicker--retry">
              BETTER LUCK NEXT TIME!
            </p>
            <p className="result__figure result__figure--retry">TRY AGAIN</p>
            <p className="result__note">No prize this time &mdash; the wheel is yours again.</p>
          </>
        ) : (
          <>
            <Logo size="md" />

            <p id="result-heading" className={`result__kicker gold-3d${isJackpot ? " result__kicker--jackpot" : ""}`}>
              {isJackpot ? "JACKPOT!" : "CONGRATULATIONS!"}
            </p>

            <p className="result__lead">YOU WON</p>

            <p className="result__figure gold-3d">{figure}</p>

            <div className="ticket">
              <span className="ticket__brand">baazar</span>
              <span className="ticket__label">{ticketLabel}</span>
            </div>

            <p className="result__note">
              {isJackpot
                ? "That's the biggest prize on the wheel!"
                : "Please see the Baazar team to claim."}
            </p>
          </>
        )}

        <button type="button" className="btn btn--claim" onClick={onContinue} autoFocus>
          <Instructions keyLabel="SPACE" action={isTryAgain ? "TO SPIN AGAIN" : "TO CLAIM"} />
        </button>
      </div>
    </div>
  );
}

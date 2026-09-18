import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Background } from "./components/Background";
import { Instructions } from "./components/Instructions";
import { Logo } from "./components/Logo";
import { NameEntry } from "./components/NameEntry";
import { PlayerInfo } from "./components/PlayerInfo";
import { PrizeWheel } from "./components/PrizeWheel";
import { Records } from "./components/Records";
import { ResultScreen } from "./components/ResultScreen";
import { SpinControls } from "./components/SpinControls";
import { prizes, type Prize } from "./config/prizes";
import { FORCED_SPIN_TRIGGERS, SPIN_DURATION, STORAGE_KEYS } from "./config/settings";
import { scheduleSpinTicks, soundManager } from "./utils/audio";
import { describeShortcut, isSpaceKey, isTypingTarget, matchesShortcut } from "./utils/keyboard";
import { findSegmentByPrizeId, pickWeightedSegment } from "./utils/random";
import { appendRecord, clearRecords, loadRecords, type SpinRecord } from "./utils/records";
import { loadValue, saveValue } from "./utils/storage";
import { computeSegments, computeTargetRotation, readVisualRotation } from "./utils/wheelMath";

/**
 * Application states. Every input is validated against the current one.
 *
 * The wheel is home: the app opens on it, already turning, and returns to it
 * after every round. Nothing is asked of a player before they spin — the
 * name is collected afterwards, against the prize they actually won, and
 * Esc skips even that.
 *
 *   READY ──space──> SPINNING ──> RESULT ──space──┬─> READY      (Try Again)
 *     │                                           └─> NAME_ENTRY ──> READY
 *     └──R──> RECORDS ──space/esc──> READY
 */
type Phase = "READY" | "SPINNING" | "RESULT" | "NAME_ENTRY" | "RECORDS";

/** Reduced spin time for visitors who ask for less motion. */
const REDUCED_MOTION_DURATION = 1200;

export default function App() {
  // Geometry is derived from the prize list's weights exactly once.
  const segments = useMemo(() => computeSegments(prizes), []);

  const [phase, setPhase] = useState<Phase>("READY");
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<Prize | null>(null);
  const [attempt, setAttempt] = useState(1);
  const [totalSpins, setTotalSpins] = useState(0);
  const [records, setRecords] = useState<SpinRecord[]>([]);

  /**
   * Mirrors `phase` synchronously. React state updates are async, so two
   * keydown events in the same tick could both observe a stale phase and
   * start two spins — this ref makes the guard immediate.
   */
  const phaseRef = useRef<Phase>("READY");
  /** Mirrors `rotation` so each spin can build on the last without stale state. */
  const rotationRef = useRef(0);
  /**
   * Prize id armed by a secret shortcut, consumed by (and only by) the next
   * spin. Null means the next spin is a normal weighted random one.
   */
  const forcedPrizeId = useRef<string | null>(null);
  /** The rotating <g>, so a spin can start from the live idle angle. */
  const rotorRef = useRef<SVGGElement>(null);
  const spinTimer = useRef<number | undefined>(undefined);
  const handoffFrame = useRef<number | undefined>(undefined);
  const cancelTicks = useRef<(() => void) | undefined>(undefined);

  const reduceMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const spinDuration = reduceMotion ? REDUCED_MOTION_DURATION : SPIN_DURATION;

  const goTo = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // Restore optional persisted values. Absent or unreadable storage is fine.
  useEffect(() => {
    const storedSpins = Number(loadValue(STORAGE_KEYS.totalSpins));
    if (Number.isFinite(storedSpins) && storedSpins > 0) setTotalSpins(storedSpins);

    setRecords(loadRecords());
  }, []);

  // Clear timers if the component ever unmounts mid-spin.
  useEffect(
    () => () => {
      if (spinTimer.current !== undefined) window.clearTimeout(spinTimer.current);
      if (handoffFrame.current !== undefined) window.cancelAnimationFrame(handoffFrame.current);
      cancelTicks.current?.();
    },
    []
  );

  const logSpin = useCallback((prize: Prize, name: string) => {
    setRecords((current) =>
      appendRecord(current, {
        name,
        prize: prize.name,
        at: Date.now(),
        jackpot: prize.isJackpot,
        tryAgain: prize.type === "tryagain",
      })
    );
  }, []);

  const spin = useCallback(() => {
    if (phaseRef.current !== "READY") return;

    // Forced-result trigger: if one is armed, take that prize instead of a
    // weighted roll. The jackpot is also marked `awardOnlyByTrigger`, so for
    // that prize this is the only path that reaches it at all. Everything
    // after this point — animation, timing, sound, result — is identical.
    const forced = forcedPrizeId.current
      ? findSegmentByPrizeId(segments, forcedPrizeId.current)
      : undefined;
    const target = forced ?? pickWeightedSegment(segments);

    // Consume the trigger so it only ever affects this one spin.
    forcedPrizeId.current = null;
    if (import.meta.env.DEV) delete document.body.dataset.spinnerArmed;

    // Start from where the idle rotation has actually drifted to, then solve
    // for the rotation that parks this segment under the pointer.
    const from = readVisualRotation(rotorRef.current, rotationRef.current);
    const to = computeTargetRotation(target, from);
    rotationRef.current = to;

    // Commit that live angle first, with idling now off: this frozen frame is
    // what the spin transition animates away from, so handing over from the
    // idle animation never jumps.
    setWinner(null);
    setRotation(from);
    goTo("SPINNING");

    // Next frame: start the actual travel, which the browser animates as a
    // transition from the frozen angle.
    handoffFrame.current = window.requestAnimationFrame(() => {
      handoffFrame.current = undefined;
      setRotation(to);
    });

    soundManager.play("spin", { loop: true, volume: 0.55 });
    cancelTicks.current = scheduleSpinTicks(spinDuration);

    // The result is timed from the keypress, not from inside that frame
    // callback: browsers pause animation frames in a background tab, and a
    // spin must never be left hanging because the player switched away.
    spinTimer.current = window.setTimeout(() => {
      cancelTicks.current?.();
      soundManager.stop("spin");
      soundManager.play(target.prize.isJackpot ? "jackpot" : "win");

      if (handoffFrame.current !== undefined) {
        // The frame never came (hidden tab), so land the wheel here instead.
        window.cancelAnimationFrame(handoffFrame.current);
        handoffFrame.current = undefined;
      }
      setRotation(to);
      setWinner(target.prize);
      setTotalSpins((count) => {
        const next = count + 1;
        saveValue(STORAGE_KEYS.totalSpins, String(next));
        return next;
      });
      saveValue(STORAGE_KEYS.lastResult, target.prize.name);

      // Try Again wins nothing and nobody is asked to claim it, so it is
      // logged here and now. A real prize waits for the name card.
      if (target.prize.type === "tryagain") {
        logSpin(target.prize, "");
      }

      goTo("RESULT");
    }, spinDuration);
  }, [goTo, logSpin, segments, spinDuration]);

  /**
   * Leaving the result screen. Try Again hands the wheel straight back for
   * another spin; a real prize goes to the name card to be claimed.
   */
  const leaveResult = useCallback(() => {
    if (phaseRef.current !== "RESULT") return;

    if (winner?.type === "tryagain") {
      setWinner(null);
      setAttempt((value) => value + 1);
      goTo("READY");
      return;
    }

    goTo("NAME_ENTRY");
  }, [goTo, winner]);

  /** Finishes a round, logging the prize under `name` ("" when skipped). */
  const claimPrize = useCallback(
    (name: string) => {
      if (phaseRef.current !== "NAME_ENTRY") return;
      if (winner) logSpin(winner, name);
      setWinner(null);
      setAttempt(1);
      goTo("READY");
    },
    [goTo, logSpin, winner]
  );

  const showRecords = useCallback(() => {
    if (phaseRef.current !== "READY") return;
    goTo("RECORDS");
  }, [goTo]);

  const hideRecords = useCallback(() => {
    if (phaseRef.current !== "RECORDS") return;
    goTo("READY");
  }, [goTo]);

  // Single global key handler: routes keys by current phase, and watches for
  // the guaranteed-win shortcut. Typing in a text field is never intercepted.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Audio can only start inside a real gesture; the first keypress is it.
      soundManager.unlock();

      const trigger = FORCED_SPIN_TRIGGERS.find((entry) =>
        matchesShortcut(event, entry.shortcut)
      );
      if (trigger) {
        // Claim the combo so the browser doesn't also act on it.
        event.preventDefault();
        forcedPrizeId.current = trigger.prizeId;
        if (import.meta.env.DEV) {
          document.body.dataset.spinnerArmed = trigger.prizeId;
          console.debug(
            `[prize-spinner] ${describeShortcut(trigger.shortcut)} — "${trigger.prizeId}" armed for the next spin`
          );
        }
        return;
      }

      const current = phaseRef.current;

      // Esc: leave the name card without giving one, and step out of records.
      if (event.key === "Escape") {
        if (current === "NAME_ENTRY") claimPrize("");
        else if (current === "RECORDS") hideRecords();
        return;
      }

      if (isTypingTarget(event.target)) return;

      if (isSpaceKey(event)) {
        // Always swallow space so the page never scrolls behind the game.
        event.preventDefault();
        if (current === "READY") spin();
        else if (current === "RESULT") leaveResult();
        else if (current === "RECORDS") hideRecords();
        // SPINNING and NAME_ENTRY deliberately ignore space here.
        return;
      }

      if (event.code === "KeyR" && !event.ctrlKey && !event.altKey && !event.metaKey) {
        if (current === "READY") showRecords();
        return;
      }

      if (event.key === "Enter" && current === "NAME_ENTRY") {
        // Focus was lost from the field — put it back so Enter does something
        // useful instead of nothing.
        document.getElementById("player-name")?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [claimPrize, hideRecords, leaveResult, showRecords, spin]);

  const showWheel = phase === "READY" || phase === "SPINNING" || phase === "RESULT";

  return (
    <div className={`app app--${phase.toLowerCase()}${winner?.isJackpot ? " app--jackpot" : ""}`}>
      <Background />

      {phase === "RECORDS" ? (
        <Records records={records} onBack={hideRecords} onClear={() => setRecords(clearRecords())} />
      ) : null}

      {phase === "NAME_ENTRY" && winner ? (
        <NameEntry prizeName={winner.name} onSubmit={claimPrize} onSkip={() => claimPrize("")} />
      ) : null}

      {showWheel ? (
        <section className="screen screen--game">
          {/* Darkens everything but the wheel while it spins. */}
          <div className="stage-dim" aria-hidden="true" />

          <header className="game__header">
            <h1 className="visually-hidden">Spin &amp; Win prize wheel</h1>
            <div className="game__brand">
              <Logo size="md" />
            </div>
            <p className="game__card gold-3d">SPIN &amp; WIN!</p>
            <p className="game__hook">
              WIN <span className="game__hook-value">$100</span>
            </p>
            <PlayerInfo
              attempt={attempt}
              totalSpins={totalSpins}
              lastResult={records[0]?.prize ?? null}
            />
          </header>

          <main className="game__stage">
            <PrizeWheel
              segments={segments}
              rotation={rotation}
              spinning={phase === "SPINNING"}
              idle={phase === "READY"}
              winnerPrizeId={winner?.id ?? null}
              durationMs={spinDuration}
              rotorRef={rotorRef}
            />
          </main>

          <footer className="game__footer">
            {phase === "RESULT" ? (
              <Instructions
                keyLabel="SPACE"
                action={winner?.type === "tryagain" ? "TO SPIN AGAIN" : "TO CLAIM"}
                emphasis="steady"
              />
            ) : (
              <SpinControls spinning={phase === "SPINNING"} onSpin={spin} />
            )}
            <p className="game__odds">
              One spin per person. Event terms apply. &nbsp;·&nbsp; Press R for previous records
            </p>
          </footer>
        </section>
      ) : null}

      {phase === "RESULT" && winner ? (
        <ResultScreen prize={winner} onContinue={leaveResult} />
      ) : null}
    </div>
  );
}

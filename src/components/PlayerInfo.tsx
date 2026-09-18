interface PlayerInfoProps {
  /** 1 on a fresh turn; higher once a Try Again has earned another spin. */
  attempt: number;
  totalSpins: number;
  lastResult: string | null;
}

/**
 * The running totals. On a vertical setup these sit as plain lines in the
 * bottom-left corner; on a wide one they stay in the header.
 */
export function PlayerInfo({ attempt, totalSpins, lastResult }: PlayerInfoProps) {
  return (
    <div className="player">
      <div className="player__meta">
        <span className="chip">
          TOTAL <strong>{totalSpins}</strong>
        </span>
        <span className="chip chip--muted">
          LAST <strong>{lastResult ?? "—"}</strong>
        </span>
        <span className={`chip${attempt > 1 ? " chip--retry" : ""}`}>
          ATTEMPT <strong>{attempt}</strong>
        </span>
      </div>
    </div>
  );
}

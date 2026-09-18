import { Logo } from "./Logo";
import type { SpinRecord } from "../utils/records";

interface RecordsProps {
  records: SpinRecord[];
  onBack: () => void;
  onClear: () => void;
}

/**
 * The "Previous records" screen: every logged spin, newest first. Rendered as
 * a real table so it reads correctly for screen readers and can be scrolled
 * on a long event day.
 */
export function Records({ records, onBack, onClear }: RecordsProps) {
  return (
    <section className="screen screen--records" aria-labelledby="records-title">
      <div className="panel panel--records">
        <header className="records__header">
          <Logo size="sm" />
          <h1 id="records-title" className="title title--lg">
            PREVIOUS RECORDS
          </h1>
          <p className="subtitle">
            {records.length === 0
              ? "Nothing here yet — play a round to start the log."
              : `${records.length} spin${records.length === 1 ? "" : "s"} logged on this device`}
          </p>
        </header>

        {records.length > 0 ? (
          <div className="records__scroll">
            <table className="records__table">
              <thead>
                <tr>
                  <th scope="col" className="records__col-num">
                    #
                  </th>
                  <th scope="col">Player</th>
                  <th scope="col">Prize</th>
                  <th scope="col" className="records__col-time">
                    When
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr
                    key={`${record.at}-${index}`}
                    className={record.jackpot ? "records__row--jackpot" : undefined}
                  >
                    <td className="records__col-num">{records.length - index}</td>
                    {/* Empty when the player skipped the claim card. */}
                    <td className="records__name">{record.name || "—"}</td>
                    <td>
                      <span
                        className={`records__prize${record.jackpot ? " records__prize--jackpot" : ""}${
                          record.tryAgain ? " records__prize--retry" : ""
                        }`}
                      >
                        {record.prize}
                      </span>
                    </td>
                    <td className="records__col-time">{formatWhen(record.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="records__empty">
            Results are saved on this device only. Nothing is uploaded anywhere.
          </p>
        )}

        <div className="records__actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={onBack} autoFocus>
            <span className="instructions instructions--steady">
              <span className="instructions__line">
                <span className="keycap">SPACE</span>
                <span className="instructions__action">BACK TO MENU</span>
              </span>
            </span>
          </button>
          {records.length > 0 ? (
            <button type="button" className="btn btn--ghost btn--danger" onClick={onClear}>
              <span className="btn__label">Clear records</span>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function formatWhen(at: number): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

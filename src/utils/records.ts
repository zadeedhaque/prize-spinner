import { MAX_RECORDS, STORAGE_KEYS } from "../config/settings";
import { loadValue, saveValue } from "./storage";

/** One logged spin: who played and what they got. */
export interface SpinRecord {
  name: string;
  prize: string;
  /** Epoch milliseconds, so the list can be shown newest first. */
  at: number;
  jackpot?: boolean;
  tryAgain?: boolean;
}

/**
 * Reads the record log. Anything unreadable or malformed (hand-edited
 * storage, an older format) is treated as "no records" rather than breaking
 * the menu.
 */
export function loadRecords(): SpinRecord[] {
  const raw = loadValue(STORAGE_KEYS.records);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord);
  } catch {
    return [];
  }
}

/** Prepends a record (newest first) and persists the trimmed list. */
export function appendRecord(records: SpinRecord[], record: SpinRecord): SpinRecord[] {
  const next = [record, ...records].slice(0, MAX_RECORDS);
  saveValue(STORAGE_KEYS.records, JSON.stringify(next));
  return next;
}

export function clearRecords(): SpinRecord[] {
  saveValue(STORAGE_KEYS.records, JSON.stringify([]));
  return [];
}

function isRecord(value: unknown): value is SpinRecord {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SpinRecord>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.prize === "string" &&
    typeof candidate.at === "number"
  );
}

import { useState } from "react";
import { LOGO_PATH } from "../config/settings";

interface LogoProps {
  /** Visual scale of the logo slot. "hub" scales with the wheel around it. */
  size?: "sm" | "md" | "lg" | "hub";
}

/**
 * Remembered across instances: once the logo file is known to be absent,
 * later screens render the built-in wordmark without re-requesting it.
 */
let logoUnavailable = false;

/**
 * Renders public/logo.png when that file exists, and otherwise falls back to
 * the built-in "baazar" wordmark below. Dropping the real asset at
 * public/logo.png makes it take over automatically, with no code change.
 */
export function Logo({ size = "sm" }: LogoProps) {
  const [failed, setFailed] = useState(logoUnavailable);

  if (failed) {
    return (
      <div className={`logo logo--${size}`}>
        <BaazarWordmark />
      </div>
    );
  }

  return (
    <div className={`logo logo--${size}`}>
      <img
        src={LOGO_PATH}
        alt="baazar"
        onError={() => {
          logoUnavailable = true;
          setFailed(true);
        }}
        draggable={false}
      />
    </div>
  );
}

/**
 * The "baazar" wordmark: the distinctive leaf-and-"b" monogram drawn as
 * vector paths, followed by "aazar" set in Poppins — a geometric sans with
 * the same single-storey "a" as the original mark.
 *
 * It paints in `currentColor`, so the surrounding CSS picks the colour: the
 * app tints it with the theme green, and being vector there is no photo
 * background to strip and nothing to go soft on a large display. If Poppins
 * hasn't loaded (offline), the text falls back to the nearest geometric sans
 * available and the mark is unaffected.
 */
function BaazarWordmark() {
  return (
    <span className="wordmark">
      <svg
        className="wordmark__mark"
        viewBox="0 0 236 206"
        role="img"
        aria-label="baazar"
        fill="currentColor"
      >
        {/* Leaf: two arcs meeting in a point at each tip. The second subpath
            is a hairline slit cut out by fill-rule="evenodd", which is what
            gives the original mark its outlined leaf. */}
        <path
          fillRule="evenodd"
          d="M122 4C58 44 18 120 18 200C92 168 118 92 122 4Z
             M104 56C66 88 38 138 32 182C74 154 96 108 104 56Z"
        />
        {/* Stem of the "b", topped by the leaf's tip. */}
        <rect x="88" y="4" width="34" height="196" />
        {/* Bowl of the "b" — a ring overlapping the stem. */}
        <circle cx="168" cy="142" r="42" fill="none" stroke="currentColor" strokeWidth="32" />
      </svg>
      <span className="wordmark__text">aazar</span>
    </span>
  );
}

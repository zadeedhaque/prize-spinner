import { memo, useMemo, type RefObject } from "react";
import { IDLE_SPIN_SECONDS, SPIN_EASING } from "../config/settings";
import type { WheelSegment as Segment } from "../utils/wheelMath";
import { polarPoint } from "../utils/wheelMath";
import { Logo } from "./Logo";
import { InnerBadge, needsBadge, WheelSegment, type WheelGeometry } from "./WheelSegment";

/**
 * Wheel geometry, in SVG user units. The SVG scales to its container via
 * viewBox, so these are fixed and the whole wheel is resolution independent.
 */
const VIEW = 460;
const GEOMETRY: WheelGeometry = {
  cx: VIEW / 2,
  cy: VIEW / 2,
  radius: 170,
  // Roomy enough for the logo to sit legibly inside the hub.
  hubRadius: 62,
  ringRadius: 185,
};
const RING_STROKE = 28;
const BULB_RADIUS = 185;
const BULB_COUNT = 48;

interface PrizeWheelProps {
  segments: Segment[];
  /** Absolute accumulated rotation in degrees. */
  rotation: number;
  spinning: boolean;
  /** Turn slowly on its own, while waiting for a player to spin. */
  idle: boolean;
  /** Prize id to highlight once the wheel has stopped. */
  winnerPrizeId: string | null;
  /** Spin length in ms (shortened when the visitor prefers reduced motion). */
  durationMs: number;
  /** Gives App access to the rotating group, to read its live angle. */
  rotorRef: RefObject<SVGGElement>;
}

/**
 * The wheel. Drawn as SVG (crisp at any size, exact arc geometry, real text
 * nodes for accessibility) and rotated with a single CSS transform on one
 * group, so the browser animates it on the compositor: no per-frame React
 * renders and no geometry recalculation during a spin. All slice geometry is
 * memoised and only recomputed when the prize list changes.
 *
 * Idle motion is a CSS keyframe animation starting at `--idle-from` (the
 * current rotation), so it picks up exactly where the last spin stopped. The
 * spin itself is a CSS transition; App hands one off to the other by reading
 * the live angle through `rotorRef` and committing it before animating.
 */
export const PrizeWheel = memo(function PrizeWheel({
  segments,
  rotation,
  spinning,
  idle,
  winnerPrizeId,
  durationMs,
  rotorRef,
}: PrizeWheelProps) {
  const bulbs = useMemo(
    () =>
      Array.from({ length: BULB_COUNT }, (_, i) => {
        const angle = (360 / BULB_COUNT) * i;
        const point = polarPoint(GEOMETRY.cx, GEOMETRY.cy, BULB_RADIUS, angle);
        return { id: i, ...point };
      }),
    []
  );

  const winnerLabel = segments.find((s) => s.prize.id === winnerPrizeId)?.prize.name;

  return (
    <div className={`wheel${spinning ? " wheel--spinning" : ""}`}>
      <div className="wheel__glow" aria-hidden="true" />
      {/* Slow glint travelling around the face. */}
      <div className="wheel__sheen" aria-hidden="true" />

      <svg
        className="wheel__svg"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        role="img"
        aria-label={
          winnerLabel
            ? `Prize wheel. Result: ${winnerLabel}.`
            : `Prize wheel with ${segments.length} prizes.`
        }
      >
        <defs>
          <radialGradient id="jackpotGradient" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fff8dd" />
            <stop offset="55%" stopColor="#ffd76b" />
            <stop offset="100%" stopColor="#e6a520" />
          </radialGradient>
          <linearGradient id="ringGradient" x1="12%" y1="0%" x2="88%" y2="100%">
            <stop offset="0%" stopColor="#8a5f08" />
            <stop offset="18%" stopColor="#ffe9a8" />
            <stop offset="38%" stopColor="#e3ab1d" />
            <stop offset="58%" stopColor="#9a6c0b" />
            <stop offset="78%" stopColor="#ffe08a" />
            <stop offset="100%" stopColor="#b8820f" />
          </linearGradient>
          <radialGradient id="hubGradient" cx="38%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#fff6cf" />
            <stop offset="42%" stopColor="#ffd76b" />
            <stop offset="100%" stopColor="#b8820f" />
          </radialGradient>
          <linearGradient id="pointerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff6d8" />
            <stop offset="50%" stopColor="#ffd76b" />
            <stop offset="100%" stopColor="#e09b12" />
          </linearGradient>
          <filter id="sliceShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Outer cabinet ring */}
        <circle
          cx={GEOMETRY.cx}
          cy={GEOMETRY.cy}
          r={GEOMETRY.ringRadius}
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth={RING_STROKE}
        />
        <circle
          cx={GEOMETRY.cx}
          cy={GEOMETRY.cy}
          r={GEOMETRY.ringRadius + RING_STROKE / 2}
          fill="none"
          className="wheel__ring-edge"
        />
        <circle
          cx={GEOMETRY.cx}
          cy={GEOMETRY.cy}
          r={GEOMETRY.ringRadius - RING_STROKE / 2}
          fill="none"
          className="wheel__ring-edge"
        />

        {/* Cabinet bulbs — static so they twinkle independently of the spin */}
        <g className="wheel__bulbs">
          {bulbs.map((bulb, index) => (
            <circle
              key={bulb.id}
              cx={bulb.x}
              cy={bulb.y}
              r={3.4}
              className={`wheel__bulb${index % 3 === 0 ? " wheel__bulb--gold" : ""}`}
              // Staggered by position, so the lights chase around the rim.
              style={{ animationDelay: `${((index / BULB_COUNT) * 2.2).toFixed(2)}s` }}
            />
          ))}
        </g>

        {/* Rotating wheel face */}
        <g
          ref={rotorRef}
          className={`wheel__rotor${idle ? " wheel__rotor--idle" : ""}`}
          style={
            idle
              ? {
                  // The animation owns `transform` while idling, starting
                  // from where the wheel already is.
                  transformOrigin: `${GEOMETRY.cx}px ${GEOMETRY.cy}px`,
                  animationDuration: `${IDLE_SPIN_SECONDS}s`,
                  ["--idle-from" as string]: `${rotation}deg`,
                }
              : {
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: `${GEOMETRY.cx}px ${GEOMETRY.cy}px`,
                  transition: spinning ? `transform ${durationMs}ms ${SPIN_EASING}` : "none",
                }
          }
        >
          <circle
            cx={GEOMETRY.cx}
            cy={GEOMETRY.cy}
            r={GEOMETRY.radius}
            fill="#08160f"
            filter="url(#sliceShadow)"
          />
          {segments.map((segment) => (
            <WheelSegment
              key={segment.prize.id}
              segment={segment}
              geometry={GEOMETRY}
              isWinner={winnerPrizeId === segment.prize.id}
              dimmed={Boolean(winnerPrizeId) && winnerPrizeId !== segment.prize.id}
            />
          ))}
          {/* Badges for sliver-thin slices, drawn above every slice so a
              neighbouring slice can't paint over them. */}
          {segments.filter(needsBadge).map((segment) => (
            <InnerBadge key={`badge-${segment.prize.id}`} segment={segment} geometry={GEOMETRY} />
          ))}
          <circle
            cx={GEOMETRY.cx}
            cy={GEOMETRY.cy}
            r={GEOMETRY.radius}
            fill="none"
            className="wheel__face-edge"
          />
        </g>

        {/* Hub (static: stays upright while the wheel turns). The logo that
            sits inside it is an HTML overlay below, so it reuses the same
            file-or-wordmark fallback as every other logo on screen. */}
        <g className="wheel__hub">
          <circle cx={GEOMETRY.cx} cy={GEOMETRY.cy} r={GEOMETRY.hubRadius} fill="url(#hubGradient)" />
          <circle
            cx={GEOMETRY.cx}
            cy={GEOMETRY.cy}
            r={GEOMETRY.hubRadius - 8}
            fill="#07160e"
            className="wheel__hub-inner"
          />
        </g>

        {/* Fixed pointer at the top — the wheel turns under this */}
        <g className="wheel__pointer">
          <path
            d={`M ${GEOMETRY.cx} ${GEOMETRY.cy - GEOMETRY.radius + 14}
                L ${GEOMETRY.cx - 22} ${GEOMETRY.cy - GEOMETRY.radius - 30}
                L ${GEOMETRY.cx + 22} ${GEOMETRY.cy - GEOMETRY.radius - 30} Z`}
            fill="url(#pointerGradient)"
            className="wheel__pointer-shape"
          />
          <circle
            cx={GEOMETRY.cx}
            cy={GEOMETRY.cy - GEOMETRY.radius - 34}
            r={13}
            fill="url(#pointerGradient)"
            className="wheel__pointer-cap"
          />
          <circle
            cx={GEOMETRY.cx}
            cy={GEOMETRY.cy - GEOMETRY.radius - 34}
            r={5}
            className="wheel__pointer-pin"
          />
        </g>
      </svg>

      {/* Logo in the hub. Sized as a share of the wheel so it scales with it. */}
      <div className="wheel__hub-logo">
        <Logo size="hub" />
      </div>
    </div>
  );
});

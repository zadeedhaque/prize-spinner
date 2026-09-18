import { BADGE_MAX_ANGLE_DEG, TWO_LINE_MIN_ANGLE_DEG } from "../config/settings";
import { describeSegmentPath, polarPoint, type WheelSegment as Segment } from "../utils/wheelMath";

export interface WheelGeometry {
  cx: number;
  cy: number;
  /** Radius of the coloured prize area. */
  radius: number;
  /** Radius of the central hub, labels stay outside it. */
  hubRadius: number;
  /** Mid-line radius of the decorative outer ring (where rim plates sit). */
  ringRadius: number;
}

interface WheelSegmentProps {
  segment: Segment;
  geometry: WheelGeometry;
  isWinner: boolean;
  dimmed: boolean;
}

/**
 * One prize slice, plus its label.
 *
 * Three labelling strategies, chosen automatically from how much room the
 * slice actually has, so text never overflows into a neighbouring slice:
 *
 * 1. Roomy slices: two lines running radially outward from the hub, e.g.
 *    "$5" over "VOUCHER". Font size comes from the arc length that slice
 *    actually offers, so narrower slices get smaller — but still
 *    proportionate — type.
 * 2. Narrow slices: the headline only ("$15"), at the largest size that
 *    fits. Dropping the second word buys enough room to keep the label
 *    inside its own slice.
 * 3. Slivers thinner than BADGE_MAX_ANGLE_DEG (the trigger-only $50 and
 *    $100, around 2-4 degrees): no text fits at all, so the slice becomes a
 *    bright sliver with a full-radius marker line and its label moves to a
 *    badge in the empty band between the hub and where the other slices'
 *    text begins. The badge can be far wider than the sliver without
 *    covering another prize's text. (An outer-rim badge was the first
 *    attempt, but the fixed pointer sits exactly there and hid it at the
 *    moment of winning.)
 *
 * Badges are the one strategy that can collide with each other, so keep
 * sliver-thin prizes apart in the prize list — see the note on the $50.
 */
/**
 * True when a slice is too thin for any text and needs a hub badge instead.
 * PrizeWheel draws those badges in their own layer above every slice —
 * inside the segment group they would be painted over by whichever slice
 * comes next in the list.
 */
export function needsBadge(segment: Segment): boolean {
  return segment.angleSpan < BADGE_MAX_ANGLE_DEG;
}

export function WheelSegment({ segment, geometry, isWinner, dimmed }: WheelSegmentProps) {
  const { cx, cy, radius, hubRadius } = geometry;
  const { startAngle, endAngle, angleSpan, prize } = segment;

  const isThin = needsBadge(segment);
  const singleLine = angleSpan < TWO_LINE_MIN_ANGLE_DEG;
  const path = describeSegmentPath(cx, cy, radius, startAngle, endAngle);
  const fill = prize.isJackpot ? "url(#jackpotGradient)" : prize.color;

  const classNames = [
    "wheel__segment",
    prize.isJackpot ? "wheel__segment--jackpot" : "",
    isWinner ? "wheel__segment--winner" : "",
    dimmed ? "wheel__segment--dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <g className={classNames}>
      <path d={path} fill={fill} className="wheel__slice" />
      {isThin ? (
        <ThinLabel segment={segment} geometry={geometry} />
      ) : (
        <RadialLabel segment={segment} geometry={geometry} singleLine={singleLine} />
      )}
      {/* Divider drawn per-segment at its start edge keeps slices crisp. */}
      <line
        x1={polarPoint(cx, cy, hubRadius * 0.9, startAngle).x}
        y1={polarPoint(cx, cy, hubRadius * 0.9, startAngle).y}
        x2={polarPoint(cx, cy, radius, startAngle).x}
        y2={polarPoint(cx, cy, radius, startAngle).y}
        className="wheel__divider"
      />
      {isWinner ? <path d={path} fill="none" className="wheel__winner-outline" /> : null}
    </g>
  );
}

function RadialLabel({
  segment,
  geometry,
  singleLine,
}: {
  segment: Segment;
  geometry: WheelGeometry;
  singleLine: boolean;
}) {
  const { cx, cy, radius, hubRadius } = geometry;
  const { centerAngle, angleSpan, prize } = segment;

  const textRadius = hubRadius + (radius - hubRadius) * 0.56;
  // Tangential space this slice actually offers where the text sits.
  const arcSpace = 2 * Math.PI * textRadius * (angleSpan / 360);

  // With only one line to place, the headline can use most of that space.
  const primarySize = singleLine
    ? clamp(arcSpace * 0.72, 9, 22)
    : clamp(arcSpace * 0.44, 11, 31);
  const secondarySize = Math.max(primarySize * 0.5, 7.5);
  const gap = primarySize * 0.16;
  const blockHeight = singleLine ? primarySize : primarySize + gap + secondarySize;

  const [line1, line2] = [prize.label[0] ?? prize.name, singleLine ? undefined : prize.label[1]];

  return (
    // rotate(centerAngle - 90) maps the local +x axis onto this slice's
    // radius, so the text reads along the radius rather than across the
    // slice — which is what lets narrow slices hold real words.
    <g transform={`rotate(${centerAngle - 90} ${cx} ${cy})${flipTransform(centerAngle, cx + textRadius, cy)}`}>
      <text
        x={cx + textRadius}
        y={cy - blockHeight / 2 + primarySize / 2}
        className="wheel__label wheel__label--primary"
        fill={prize.textColor}
        fontSize={primarySize}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {line1}
      </text>
      {line2 ? (
        <text
          x={cx + textRadius}
          y={cy + blockHeight / 2 - secondarySize / 2}
          className="wheel__label wheel__label--secondary"
          fill={prize.textColor}
          fontSize={secondarySize}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {line2}
        </text>
      ) : null}
    </g>
  );
}

/** Marker line that makes a hair-thin slice visible at a glance. */
function ThinLabel({ segment, geometry }: { segment: Segment; geometry: WheelGeometry }) {
  const { cx, cy, radius, hubRadius } = geometry;
  const inner = polarPoint(cx, cy, hubRadius, segment.centerAngle);
  const outer = polarPoint(cx, cy, radius, segment.centerAngle);

  return (
    <line
      x1={inner.x}
      y1={inner.y}
      x2={outer.x}
      y2={outer.y}
      className="wheel__thin-marker"
      stroke={segment.prize.isJackpot ? "#fff6d8" : "#ffffff"}
    />
  );
}

/**
 * Label badge for a thin slice, placed in the inner band between the hub and
 * the other slices' text. Nothing else is drawn there, so the badge may be
 * much wider than the sliver it belongs to.
 */
export function InnerBadge({ segment, geometry }: { segment: Segment; geometry: WheelGeometry }) {
  const { cx, cy, hubRadius } = geometry;
  const { centerAngle, prize } = segment;

  const badgeWidth = 56;
  const badgeHeight = 27;
  const badgeY = cy - (hubRadius + 25);

  const [line1, line2] = [prize.label[0] ?? prize.name, prize.label[1]];

  // A flipped badge rotates a half turn about its own centre, which would
  // otherwise put the second line above the first — so pre-swap the offsets.
  const flipped = ((centerAngle + 90) % 360) > 180;
  const line1Y = flipped ? badgeY + 5 : badgeY - 5;
  const line2Y = flipped ? badgeY - 7.5 : badgeY + 7.5;

  // Tangential (not radial) orientation, so the badge reads horizontally
  // when its slice is at the top — exactly where it sits when it wins.
  return (
    <g
      transform={`rotate(${centerAngle} ${cx} ${cy})${flipTransform(
        (centerAngle + 90) % 360,
        cx,
        badgeY
      )}`}
      className={`wheel__plate${prize.isJackpot ? " wheel__plate--jackpot" : ""}`}
    >
      <rect
        x={cx - badgeWidth / 2}
        y={badgeY - badgeHeight / 2}
        width={badgeWidth}
        height={badgeHeight}
        rx={7}
        className="wheel__plate-bg"
        fill={prize.isJackpot ? "url(#jackpotGradient)" : prize.color}
      />
      <text
        x={cx}
        y={line1Y}
        className="wheel__plate-text wheel__plate-text--primary"
        fill={prize.textColor}
        fontSize={13}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {line1}
      </text>
      {line2 ? (
        <text
          x={cx}
          y={line2Y}
          className="wheel__plate-text"
          fill={prize.textColor}
          fontSize={7}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {line2}
        </text>
      ) : null}
    </g>
  );
}

/**
 * Slices on the wheel's left half would otherwise render their radial text
 * upside down. Rotating those labels 180 degrees about their own centre
 * makes them read inward instead of outward, so every label is right side up
 * when its slice is at rest near the pointer.
 */
function flipTransform(centerAngle: number, pivotX: number, pivotY: number): string {
  return centerAngle > 180 ? ` rotate(180 ${pivotX} ${pivotY})` : "";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

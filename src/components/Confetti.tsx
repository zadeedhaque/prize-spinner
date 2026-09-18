import { useMemo } from "react";

const NORMAL_COLORS = ["#22c55e", "#84cc16", "#0f9b8e", "#ffffff", "#ffd76b"];
const JACKPOT_COLORS = ["#ffd76b", "#ffb703", "#fff4cf", "#ffffff", "#f6c445"];

interface ConfettiProps {
  /** Jackpot bursts get more pieces and an all-gold palette. */
  variant?: "normal" | "jackpot";
}

/**
 * CSS-only confetti burst. Each piece is a single small element animated
 * with transform + opacity, so the whole burst stays on the compositor.
 * Piece count is capped deliberately to keep big-screen playback smooth.
 */
export function Confetti({ variant = "normal" }: ConfettiProps) {
  const count = variant === "jackpot" ? 320 : 150;
  const colors = variant === "jackpot" ? JACKPOT_COLORS : NORMAL_COLORS;

  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: colors[i % colors.length],
        delay: Math.random() * 1.6,
        duration: 2.6 + Math.random() * 2.2,
        drift: -140 + Math.random() * 280,
        spin: 360 + Math.random() * 720,
        width: 6 + Math.random() * 6,
        height: 10 + Math.random() * 12,
        round: Math.random() > 0.75,
      })),
    // Re-randomising on every mount is the point: each win looks different.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count]
  );

  return (
    <div className={`confetti confetti--${variant}`} aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti__piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: `${p.width}px`,
            height: `${p.round ? p.width : p.height}px`,
            borderRadius: p.round ? "50%" : "1px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--drift" as string]: `${p.drift}px`,
            ["--spin" as string]: `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}

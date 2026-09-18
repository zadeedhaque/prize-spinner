import { useMemo } from "react";

const PARTICLE_COUNT = 18;

/**
 * Decorative animated backdrop: blurred green blobs, light streaks and a
 * small number of drifting particles. Kept cheap on purpose —
 * a fixed handful of CSS-animated elements (transform/opacity only, which
 * the compositor handles) rather than a canvas loop or hundreds of nodes.
 */
export function Background() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        duration: 14 + Math.random() * 16,
        delay: -Math.random() * 30,
        drift: -40 + Math.random() * 80,
      })),
    []
  );

  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop__blob backdrop__blob--one" />
      <div className="backdrop__blob backdrop__blob--two" />
      <div className="backdrop__blob backdrop__blob--three" />
      <div className="backdrop__streak backdrop__streak--one" />
      <div className="backdrop__streak backdrop__streak--two" />
      <div className="backdrop__particles">
        {particles.map((p) => (
          <span
            key={p.id}
            className="backdrop__particle"
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              ["--drift" as string]: `${p.drift}px`,
            }}
          />
        ))}
      </div>
      <div className="backdrop__vignette" />
    </div>
  );
}

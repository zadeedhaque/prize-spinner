# Spin & Win — Promotional Prize Wheel

A flashy, keyboard-driven prize wheel for retail and event promotions. Runs
entirely in the browser: no backend, no database, no login.

The wheel's slices are **not** equal. Each prize has a `weight` that controls
both how big its slice is and how likely it is to be picked, so what a player
sees is exactly what they get — a slice that looks like 1% of the wheel wins
1% of the time.

---

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Then open the URL Vite prints (usually <http://localhost:5173>).

Other scripts:

```bash
npm run build
```

```bash
npm run preview
```

```bash
npm run verify
```

`verify` re-checks the wheel's invariants against the real application code —
segment sizes follow the weights, the jackpot is the smallest slice, the
weighted picker matches the visual sizes, and 18,000 simulated spins all stop
inside their intended segment. Run it after changing prizes or weights.

---

## How to play

**One spin per player.** Landing on *Try Again* is the only result that earns
another go; any real prize ends that player's turn and hands the machine back
to the menu for the next person.

| Screen     | Key                               | What happens                              |
| ---------- | --------------------------------- | ----------------------------------------- |
| Menu       | <kbd>Space</kbd>                  | Start a turn                              |
| Menu       | *Previous records* button         | Open the log of past spins                |
| Records    | <kbd>Space</kbd> / <kbd>Esc</kbd> | Back to the menu                          |
| Sign-up    | type your name, <kbd>Enter</kbd>  | Continue to the wheel (the field always starts empty) |
| Wheel      | <kbd>Space</kbd>                  | Spin (it drifts slowly until you do)      |
| Spinning   | —                                 | Input ignored until it stops              |
| Result     | <kbd>Space</kbd>                  | Try Again → spin again; a prize → menu    |

Every action also has a visible button, so a mouse or touchscreen works too.

### Previous records

Every spin is logged with the player's name, the prize and the time, and the
table is reachable from the menu's **Previous records** button. The log lives
in this browser's `localStorage` — nothing is uploaded — keeps the most recent
`MAX_RECORDS` entries, and the screen has a *Clear records* button.

### Idle motion

While the wheel is waiting for a player it turns slowly on its own, one
revolution every `IDLE_SPIN_SECONDS`. Pressing Space takes over from wherever
that drift has reached, so the spin never snaps back to a starting position,
and the landing stays exact.

---

## Customising

Everything you are likely to change lives in two files.

### Prizes, weights and colours — `src/config/prizes.ts`

```js
{
  id: "voucher-15",          // unique, referenced by the guaranteed-win setting
  name: "$15 Voucher",       // full name, shown on the result screen
  type: "voucher",           // "discount" | "voucher" | "tryagain"
  value: 15,                 // percent for discounts, dollars for vouchers
  weight: 5,                 // slice size AND win probability
  color: "#0d9488",          // slice fill (any CSS colour)
  textColor: "#ffffff",      // text on top of the slice
  label: ["$15", "VOUCHER"], // 1-2 short lines drawn on the wheel
  isJackpot: false,          // gold treatment + jackpot celebration
}
```

- **Add a prize:** copy a block, give it a new unique `id`.
- **Remove a prize:** delete its block.
- **Resize a prize:** change `weight`. Bigger weight = bigger slice = more
  likely. Nothing else needs updating: angles, probabilities and the landing
  maths are all derived from the weights at runtime.
- **Reorder:** move blocks around. Slices are drawn in array order, starting at
  the top and going clockwise.
- **Recolour:** change `color` / `textColor`.

The shipped weights make the winnable slices add up to 200, so a prize's
chance is simply its weight halved:

| Prize                 | Weight |   Slice | Chance |
| --------------------- | -----: | ------: | -----: |
| 5% Discount           |     60 | 106.40° |    30% |
| 10% Discount          |     40 |  70.94° |    20% |
| Try Again             |     40 |  70.94° |    20% |
| 15% Discount          |     20 |  35.47° |    10% |
| 20% Discount          |     20 |  35.47° |    10% |
| $5 Voucher            |     10 |  17.73° |     5% |
| $10 Voucher           |      6 |  10.64° |     3% |
| $15 Voucher           |      4 |   7.09° |     2% |
| $50 Voucher           |      2 |   3.55° |  0% — trigger only |
| $100 Ultimate Voucher |      1 |   1.77° |  0% — trigger only |

Because Try Again sends the player back for another spin, what a player
actually *leaves with* is that table minus Try Again, redistributed: 37.5%
a 5% discount, 25% a 10% discount, 12.5% each 15%/20%, and 12.5% a voucher
($5 6.25%, $10 3.75%, $15 2.5%).

### Everything else — `src/config/settings.ts`

| Setting                     | Default                 | What it does                                        |
| --------------------------- | ----------------------- | --------------------------------------------------- |
| `SPIN_DURATION`             | `5000`                  | Spin length in ms                                   |
| `MIN_ROTATIONS` / `MAX_ROTATIONS` | `5` / `8`         | Whole turns before landing (random in range)         |
| `SPIN_EASING`               | cubic-bezier            | Accelerate → hold → dramatic slow-down               |
| `LANDING_MARGIN_DEGREES`    | `3`                     | Keeps the pointer clear of slice boundaries          |
| `TWO_LINE_MIN_ANGLE_DEG`    | `13`                    | Above this a slice gets two label lines, below it one|
| `BADGE_MAX_ANGLE_DEG`       | `5`                     | Below this a slice is a sliver + a badge near the hub|
| `IDLE_SPIN_SECONDS`         | `45`                    | Seconds per revolution while the wheel idles         |
| `FORCED_SPIN_TRIGGERS`      | Ctrl+Alt+P, Ctrl+Alt+L  | Shortcut → prize pairs for forced results (see below)|
| `FORCED_SPIN_SEQUENCES`     | `100`, `000`            | Typed codes doing the same, for machines that swallow the chords |
| `GUARANTEED_PRIZE_ID`       | `"voucher-100-ultimate"`| The prize that can *only* be won by trigger          |
| `MAX_RECORDS`               | `100`                   | How many past spins the records table keeps          |
| `LOGO_PATH`                 | `public/logo.png`       | Logo file, with automatic fallback                   |
| `AUDIO_ENABLED`             | `true`                  | Master sound switch                                  |
| `AUDIO_PATHS`               | `public/audio/*.mp3`    | Sound file locations                                 |
| `STORAGE_KEYS`              | —                       | localStorage keys                                    |

Theme colours (background, greens, gold, glows, fonts, radii) are CSS custom
properties in `src/styles/tokens.css`.

### The logo

The app ships with the **baazar** wordmark drawn as vector paths in
`src/components/Logo.tsx`: the leaf-and-"b" monogram plus "aazar" set in
Poppins. Being vector, it has no background to strip, stays sharp on a large
display, and takes its colour from CSS (`.wordmark` in
`src/styles/base.css`, currently the theme green) rather than having a colour
baked in.

The logo appears in three places: the menu, centred at the top of the wheel
screen, and inside the wheel's hub (sized as a share of the wheel, so it
scales with it).

To use your own asset instead, drop it at **`public/logo.png`** — it is picked
up automatically in all three places, with no code change, and the built-in
wordmark becomes the fallback for when that file is missing. Use a transparent PNG; a logo on a
photo background will show that background as a box. For a different filename
or format, change `LOGO_PATH` in `src/config/settings.ts`.

### Adding audio

Drop files into `public/audio/` using the names in
[`public/audio/README.md`](public/audio/README.md): `start.mp3`, `spin.mp3`,
`tick.mp3`, `win.mp3`, `jackpot.mp3`. Each one is optional — a missing file
stays silent and is only requested once. Nothing is loaded from the internet.

Browsers block audio until the user interacts with the page, so playback is
unlocked on the player's first keypress.

---

## Forced results (staff feature)

**The $100 and $50 vouchers cannot be won by chance.** Both are marked
`awardOnlyByTrigger` in `prizes.ts`, so a normal spin never lands on them no
matter how long the wheel runs — they stay on the wheel purely so players can
see what is at stake, and the other prizes share out 100% of the real odds.

Each trigger below forces the next spin's result. Every one has two
spellings: a keyboard chord, and a code typed on the number keys.

| Shortcut | Or type | Next spin lands on |
| -------- | ------- | ------------------ |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>P</kbd> | type `100` | `$100 Ultimate Voucher` — trigger only |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>O</kbd> | type `050` | `$50 Voucher` — trigger only |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>I</kbd> | type `015` | `$15 Voucher` |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>U</kbd> | type `010` | `$10 Voucher` |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Y</kbd> | type `005` | `$5 Voucher` |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>L</kbd> | type `000` | `Try Again` (gives the player another spin) |

Use either spelling before the player hits Space. Every spin that isn't armed
is a normal weighted random spin.

- The spin looks completely normal: same animation, same duration, same
  sounds, and the wheel physically comes to rest aligned with the $100 slice.
- Nothing in the UI reveals that the result was forced, beyond a small dim
  dot in the bottom-right corner while a spin is armed (see below).
- It applies to **one** spin only, then clears itself.
- The typed codes need no modifiers. Press the digits in order, within two
  seconds of each other, while the wheel is waiting; anything else you press
  clears the buffer.

### If the chords don't work (typically Windows)

A Ctrl+Alt chord is not reliably deliverable to a web page on Windows. The
Windows shortcut-key field on desktop shortcuts produces exactly
Ctrl+Alt+<kbd>letter</kbd> combinations, and graphics/mouse/keyboard vendor
utilities, screen-capture tools, meeting apps and browser extensions register
the same combinations system-wide. Whoever claims one first swallows it, and
the browser never receives a keydown — no application code can recover a key
that never arrives.

That is what the typed codes are for: digits can't be taken as a global
hotkey, so `100` works where <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>P</kbd>
is intercepted.

**If the chord types a character** (Ctrl+Alt+P gives `ö`, Ctrl+Alt+O gives
`Ó`, Ctrl+Alt+I gives `í`), the machine is on a US-International-style
layout, where Ctrl+Alt *is* AltGr and every one of these combinations is a
real character. The keypress does reach the page, just describing itself as
a letter nobody asked for. Those characters are now mapped back to their
shortcuts explicitly, in `ALT_GRAPH_CHARS` in `src/utils/keyboard.ts` — add
to that map if a layout produces something not listed there.

To tell the two failure modes apart, open devtools on the machine in question
and run:

```js
addEventListener('keydown', e => console.log(e.key, e.code, e.ctrlKey, e.altKey));
```

Press the chord. Nothing logged means something outside the browser is eating
it — use the typed code (or re-key the chord in `settings.ts` to a
combination nothing else claims). A line that logs with an empty `code` comes
from an IME, an on-screen keyboard or a remote-desktop session; those are now
matched on `event.key` as well, so they work.

**Confirming an arm.** While a spin is armed, a small dim gold dot sits in the
bottom-right corner and `document.body.dataset.spinnerArmed` holds the prize
id, in production as well as dev. Both clear the moment the spin starts. Set
`SHOW_ARMED_INDICATOR` to `false` in `settings.ts` for no dot at all.

To change any of this, edit `FORCED_SPIN_TRIGGERS` and `FORCED_SPIN_SEQUENCES`
in `src/config/settings.ts` — a `{ shortcut: { key, ctrl, alt, shift, meta },
prizeId }` pair and a `{ sequence, prizeId }` pair respectively, both free to
add to or remove from. `npm run verify` fails if either points at a prize id
that doesn't exist, if a chord has no typed fallback, or if one code is the
tail of another (which would shadow it).

Note the difference between the two kinds: `Try Again` and the $5/$10/$15
vouchers are ordinary prizes that also come up by chance, so their shortcuts
only *guarantee* them. The `$50` and `$100` are additionally flagged
`awardOnlyByTrigger` in `prizes.ts`, which is what makes them unwinnable any
other way. To make another prize exclusive like that, add the flag to it.

> **This is not security.** The trigger is a convenience for whoever is
> running the promotion. It ships in plain text inside the JavaScript bundle,
> so anyone who opens devtools can find it in seconds. Never use this pattern
> to protect anything that actually matters.

---

## How the wheel works

- **Geometry** (`src/utils/wheelMath.ts`) — angles come from the weights:
  `angle = weight / totalWeight × 360°`. Angle `0°` is 12 o'clock, increasing
  clockwise; the pointer is fixed at the top and the wheel rotates under it.
- **Selection** (`src/utils/random.ts`) — weighted random pick over the same
  weights, so probability equals visual size for every winnable slice.
  Prizes flagged `awardOnlyByTrigger` are excluded from the draw entirely.
- **Exact landing** — `computeTargetRotation` solves for the rotation whose
  value mod 360 places the chosen slice under the pointer, then adds 5–8 whole
  turns on top for drama. It is not a random spin that hopes to land well: the
  stopping point is computed up front, with a margin so it never rests on a
  dividing line.
- **Suspense** — while the wheel turns, a scrim darkens the header, footer
  and screen edges while the wheel itself (which sits above the scrim) stays
  bright and pushes in slightly, then holds through the result.
- **Rendering** (`src/components/PrizeWheel.tsx`) — SVG for crisp arcs and real
  text at any size. Geometry is computed once and the spin is a single CSS
  transform on one group, so it animates on the compositor with no React
  re-renders or geometry maths per frame.
- **Thin slices** (`src/components/WheelSegment.tsx`) — labels come in three
  tiers, picked from the room a slice actually has: two lines of radial text,
  one line for narrow slices ("$15"), or — for slivers under
  `BADGE_MAX_ANGLE_DEG` like the $50 and $100 — a bright marker line plus a
  badge in the empty band near the hub. Badges are drawn in their own layer
  above every slice, and sliver-thin prizes are kept apart in the prize list
  so two badges never land on top of each other.

### State machine

```text
MENU ──→ NAME_ENTRY ──→ READY ──→ SPINNING ──→ RESULT ──┬─→ MENU   (a prize: turn over)
 └─→ RECORDS ─→ MENU                                    └─→ READY  (Try Again: one more spin)
```

Keys are validated against the current state, so extra <kbd>Space</kbd>
presses during a spin are ignored and cannot start a second spin or skip the
animation.

The spin's result is timed from the keypress rather than from inside an
animation frame, because browsers pause animation frames in a background tab —
a player who switches away mid-spin comes back to a finished result, not a
stalled wheel.

---

## Accessibility

- Fully keyboard operable; buttons mirror every key action.
- Visible focus rings, `aria-live` result announcement, labelled wheel and
  form field, inline validation wired up with `aria-invalid` /
  `aria-describedby`.
- `prefers-reduced-motion` disables the ambient background, confetti and pulse
  animations, and shortens the spin to ~1.2s. The wheel still turns, because
  the rotation is the information.

---

## Project structure

```text
prize-spinner/
├── index.html
├── package.json
├── vite.config.ts
├── scripts/
│   └── verify-wheel.ts        # npm run verify
├── public/
│   ├── logo.png               # optional — overrides the built-in wordmark
│   └── audio/                 # optional sound files
└── src/
    ├── main.tsx
    ├── App.tsx                # state machine + keyboard routing
    ├── components/
    │   ├── Background.tsx     Confetti.tsx   Instructions.tsx
    │   ├── Logo.tsx           Menu.tsx       NameEntry.tsx
    │   ├── PlayerInfo.tsx     PrizeWheel.tsx Records.tsx
    │   ├── ResultScreen.tsx   SpinControls.tsx
    │   └── WheelSegment.tsx
    ├── config/
    │   ├── prizes.ts          # prizes, weights, colours
    │   └── settings.ts        # timing, secret trigger, logo, audio
    ├── utils/
    │   ├── audio.ts           keyboard.ts   random.ts
    │   ├── records.ts         storage.ts    wheelMath.ts
    └── styles/
        ├── tokens.css         base.css      backdrop.css
        ├── screens.css        wheel.css     result.css
```

**Stack:** React 18 + TypeScript + Vite, with SVG for the wheel. No other
runtime dependencies — the confetti, particles, weighted randomness and wheel
maths are all local code, so there is nothing extra to audit or update.

`localStorage` holds the records table (names, prizes, timestamps) plus the
spin count. Every read and write is guarded, and a malformed or unreadable log is
treated as empty — the app works identically with storage unavailable or
blocked, it just forgets between visits.

---

## Deploying to GitHub Pages

The build is fully static and `vite.config.ts` sets `base: "./"`, so assets
resolve from any subpath — no routing to configure (the app has no routes).

```bash
npm run build
```

Publish the `dist/` folder: either push it to a `gh-pages` branch, or in
**Settings → Pages** pick GitHub Actions and use a workflow that runs
`npm ci && npm run build` and uploads `dist/`. Any other static host (Netlify,
Vercel, S3, a USB stick opened over a local server) works the same way.

---

## Troubleshooting

**`npm install` fails on esbuild's postinstall.** Some sandboxed or redirected
Windows paths (OneDrive, MSIX/Store app containers) block the postinstall from
running its version check. Either move the project to a plain path such as
`C:\dev\prize-spinner`, or install with:

```bash
npm install --ignore-scripts
```

**`npm run dev` serves a blank page and logs `Failed to load url /src/main.tsx`.**
Same root cause as above: the dev server resolves the project's real path and
some redirected Windows paths (OneDrive, MSIX/Store app containers) don't
resolve back. Move the project to a plain path such as `C:\dev\prize-spinner`.
`npm run build` is unaffected, so `npm run build && npm run preview` also works
as a stopgap.

**No sound.** Expected until you add files to `public/audio/` — see
[that folder's README](public/audio/README.md). Also confirm
`AUDIO_ENABLED` is `true`, and remember browsers need the first keypress before
any audio can play.

**The logo shows the built-in "baazar" wordmark.** That is the intended
fallback: `public/logo.png` is missing or failed to load. Drop your own
transparent PNG there to override it.

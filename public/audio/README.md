# Audio assets (optional)

Drop your own sound files into this folder using these exact names. Every one
is optional — the app runs perfectly with this folder empty, and any missing
file simply stays silent.

| File         | When it plays                                          |
| ------------ | ------------------------------------------------------ |
| `start.mp3`  | Player presses SPACE on the welcome screen              |
| `spin.mp3`   | Loops while the wheel is turning                        |
| `tick.mp3`   | Repeatedly during the spin, slowing down as it decelerates |
| `win.mp3`    | A normal prize is revealed                              |
| `jackpot.mp3`| The $100 Ultimate Voucher is revealed                    |

Notes:

- `.mp3` is expected by default. To use another format, change the filenames in
  `AUDIO_PATHS` in `src/config/settings.ts`.
- Set `AUDIO_ENABLED = false` in that same file to mute everything regardless
  of which files are present.
- Keep `tick.mp3` very short (under ~120ms) — it is retriggered many times per
  spin.
- Browsers block audio until the user interacts with the page. The app handles
  this by unlocking playback on the player's first keypress, so the first
  sound you hear is the one tied to that press.
- All paths are local. Nothing is fetched from the internet.

# Avenue at night, round 3: thumbnails, reset, living lamps, three-state dots

**Date:** 2026-09-24
**Status:** Approved in chat by Henry ("Go")
**Builds on:** round 1 (`2026-09-24-avenue-night-design.md`) and round 2 (`2026-09-24-avenue-night-2-design.md`); their rules still apply unless this file says otherwise.

## Decisions (Henry, 24 Sep, multiple choice)

| Question | Decision |
|---|---|
| Foundations video thumbnails | Must look as they do on YouTube |
| Reset | Two resets, "Reset Calling" and "Reset Launch", each behind a confirm dialog that says exactly what is wiped. Cannot be undone |
| Growth and Multiply lamps | Once started, the lamp pulses slowly and its label reads "Ongoing" instead of "Walked". Before starting it is dim like any stop ahead |
| Step markers | Just a dot (no stem line). Three states: **off** (not started), **in progress** (pulsing), **done** (solid light) |
| Where the dots apply | Calling steps, Launch steps, Arena months, Foundations modules (not Multiply rungs) |
| The step you are on | Label only: bright and underlined. No blue ring |
| What counts as in progress | Started but not finished: Calling or Launch, at least one answer saved but the step not complete; Foundations, at least one episode watched but the module not ticked; Arena, the month in play mid-run |
| Church health names | Must persist across time and sessions (verify; fix only if they do not) |

## 1. Video thumbnails

- `EpisodeCarousel` loads `https://img.youtube.com/vi/{id}/maxresdefault.jpg` (1280x720, 16:9, what YouTube shows), in a 16:9 box with `object-cover`.
- Fallback on error, in order: `sddefault.jpg`, then `hqdefault.jpg` (the 4:3 ones carry black bars, which `object-cover` in a 16:9 box crops away). YouTube returns a 120x90 grey placeholder with HTTP 404 for a missing maxres image, so the `onError` handler catches it; additionally treat a loaded image with `naturalWidth <= 120` as missing and fall back.
- Nothing else in the carousel changes.

## 2. Reset Calling and Reset Launch

- New endpoint `DELETE /api/worksheets?kind=calling|launch`: starts with `requireLeader(request)`, takes the caller's email only from the verified session, validates `kind` against the existing worksheet kinds, and deletes only that leader's row for that kind via `getSupabaseAdmin()`. Returns `{ ok: true }`; any error is returned loud (500 with the message). No other table is touched.
- What that clears: every answer in that worksheet, including (Calling) the APEST results and AI reflection and (Launch) the Arena run, because they are stored inside the worksheet. The confirm dialog lists these.
- Where the buttons live: at the bottom of the Calling Profile and Launch Plan pages (screen only, hidden in print), and a quiet text button in the hub's Calling and Launch blocks.
- Confirm dialog: native `<dialog>`, title "Reset Calling?" or "Reset Launch?", the list of what is wiped, "This can't be undone.", a red-free destructive button ("Yes, reset Calling") and "Cancel" (focused by default). Escape cancels.
- After a successful reset the page reloads that worksheet (the existing `useWorksheet` read path) so the hub, lamps and profile show the empty state. If a debounced save is pending, it is flushed or cancelled before the delete so an old answer cannot be written back after the reset.
- Tests: the route's validation (bad kind is 400, missing auth is 401 via `requireLeader`) and a `scripts/check-auth.mjs` style check against the dev server with an `@example.invalid` fixture (create answers, reset, read back empty, other kind untouched).

## 3. Living lamps for Growth and Multiply

- `avenueStops` gains a fourth status, `ongoing`, used only by Growth and Multiply once they would previously have been `walked`. `STATUS_LABEL.ongoing = "Ongoing"`. "Here" is still the first stop that is neither walked nor ongoing.
- Map, phone street and dashboard draw an `ongoing` lamp lit like a walked lamp, with a slow pulse on the glow (about 4 s cycle, opacity and halo scale only). Under `prefers-reduced-motion` it is a steady, slightly softer glow.
- The status line counts ongoing stops as lit ("Two streetlights on.") exactly as today.
- The phase-walked moments stay as they are (first check-in, first apprentice at rung 1).

## 4. Three-state dots

- `LampSteps` renders one dot per step with no stem. State comes from a new `status: "off" | "progress" | "done"` per step (replacing the boolean `done`). Done: solid warm lamp dot with its glow. In progress: the same warm dot pulsing (about 2.4 s, opacity and glow). Off: dim hollow dot. The current step is marked by its label: `--ink`, underlined; no blue ring. Reduced motion: in progress is a steady half-strength warm dot.
- The same three-state dot is used for Foundations module ticks (off / progress / done; the tick button behaviour is unchanged) and the Arena month street.
- Pure functions decide the state, with unit tests: `callingSectionStatus(id, data)`, `launchStepStatus(id, data)` (started = any saved answer in that section, done = the existing completion rule), `moduleStatus(module, watchedEpisodes)` (done = ticked, progress = at least one episode watched), `arenaMonthStatus(i, state)`.
- The step glow on completion (round 1) still plays when a dot goes to done.

## 5. Church health names

- Verify in the browser with a fixture leader: name someone under each metric, reload, sign in again in a fresh tab, and see them still listed. Also check the counts and closed summary survive.
- If anything does not persist, fix it as a bug in its own task; otherwise record the verification.
- **Verified 24 Sep (controller):** names added with the "Add ... to My People" button are in `leader_people`, survive a reload, and come back through a fresh, separate session via `GET /api/people`. Storage is fine.
- **Found:** in `PersonPicker`, typing a name does nothing until the leader taps the "Add ... to My People" suggestion. Enter does not add, and leaving the field drops the typed name silently. This is the likely cause of "names not staying". Fix (own task): pressing Enter adds the exact typed name (same POST as the button; if an existing person matches exactly, tag them instead, as the existing suggestion does); when the field holds unsaved text and loses focus, show a quiet line under it: "Not saved yet. Press Enter or tap Add." Same API, no data change.

## 6. Out of scope

- Any other change to saving, auth, API calls or protected hooks (the reset endpoint and the save-flush it needs are the only exceptions).
- Multiply rung dots.

## 7. Testing and safety

- Unit tests for every pure status function and the route validation; counts only go up from 268.
- Reset gets its own security-focused review (auth, email from session only, cannot delete another leader's or another kind's row).
- Controller browser checks at 375 px and desktop; motion on and reduced-motion reasoning by CSS review.
- `npx tsc --noEmit`, `npm test`, lint at or below 54, `npm run build`, `check-auth` all passed, `npm run guard` clean, no em dashes.
- Branch `feat/avenue-night-3`; nothing pushed until Henry says push.

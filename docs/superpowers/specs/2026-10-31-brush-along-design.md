# Brush Along — design spec (game #6, milestone 6)

Date: 2026-10-31 · Status: implemented — milestone 6, pending review · Base spec: `2026-10-08-cozy-nook-design.md` · Branch: `milestone-6`

## Goal

Game #6 of Cozy Nook: **pre-writing and fine-motor practice for ages 5–8** in the same cozy garden world — offline-first PWA, four languages (it / ro / en / de), no reading required. The kid drags a brush along a dotted guide; ink fills the path; finishing every stroke completes a small garden scene that comes alive.

The name is the verb: brush along the path. There is no wrong stroke — only uncovered path.

## Owner decisions (locked)

- **Core mechanic = tracing.** Drag a brush/finger along a dotted guide. No free painting, no coloring, no brush-size choices.
- **Every level builds a garden scene.** Each stroke is a real part of the picture (rain, grass, fence, ladder, rays, kite, hills, flower, butterfly, rainbow). Finish the strokes and the scene animates.
- **Build approach = SVG + sampled coverage.** Strokes are sampled into points; pure rules track coverage within tolerance. No canvas, no pixel work.
- **Forgiving by design.** Wide tolerance, no direction requirement, no timer, no score, no failure state. Drifting off pauses the ink; lifting keeps progress.

## Core loop

1. Level loads: the scene's backdrop is drawn as soft outlines, and the first stroke's dotted guide appears with a small brush resting at its start.
2. The kid drags. Every pointer segment is checked against the stroke's sample points; samples within tolerance become painted. Painted samples render as a thick round-capped line in the scene's paint color.
3. Drifting away from the guide simply stops painting; the ink stays where it is. Lifting the finger keeps coverage and the kid can resume anywhere, in either direction.
4. At **85% coverage** the stroke completes: it snaps to a clean solid line, sparkles, plays the correct chime, and Muguri cheers. The next stroke's guide appears after a short beat.
5. After the last stroke, the scene payoff plays (rain falls, ribbons flutter, flower blooms…), then the family's LevelComplete card, save and unlock.
6. Replay resets the scene and all strokes.

There is no lose state: unfinished strokes stay, hints escalate, and the final hint stage paints the stroke for the kid.

## Curriculum

Pre-writing order: vertical → horizontal → cross → diagonal → curve → circle → loop → combined. One scene per level, 3–5 strokes.

| Level | Scene     | Stroke practice                   | Strokes | Payoff             |
| ----- | --------- | --------------------------------- | ------: | ------------------ |
| 1     | Rain      | long vertical lines               |       3 | rain falls         |
| 2     | Grass     | short vertical lines              |       4 | grass sways        |
| 3     | Fence     | horizontal lines                  |       3 | a flower pops up   |
| 4     | Ladder    | vertical + horizontal (cross)     |       5 | Muguri climbs      |
| 5     | Sun rays  | diagonal lines                    |       4 | sun brightens      |
| 6     | Kite      | crossed diagonals + a curved tail |       3 | ribbons flutter    |
| 7     | Hills     | long curves                       |       3 | the path glows     |
| 8     | Flower    | curves + a circle center          |       4 | flower blooms      |
| 9     | Butterfly | loops                             |       3 | butterfly flutters |
| 10    | Rainbow   | arcs + a spiral                   |       4 | rainbow sparkles   |

### Scene decomposition (builder call, pinned)

| Level | Backdrop (not painted)      | Painted strokes                                                                  | Color                    |
| ----- | --------------------------- | -------------------------------------------------------------------------------- | ------------------------ |
| 1     | cloud, ground strip         | 3 verticals at x = 30 / 50 / 70, y 30→72                                         | blue                     |
| 2     | ground strip                | 4 short verticals at x = 25 / 40 / 55 / 70, y 82→64                              | leaf                     |
| 3     | two fence posts             | 3 horizontals x 15→85 at y = 45 / 57 / 69                                        | wood                     |
| 4     | tree trunk                  | 2 vertical rails at x = 42 / 58, y 22→82; 3 rungs x 42→58 at y = 38 / 52 / 66    | wood                     |
| 5     | sun disc at (50, 52), r 18  | 4 diagonals from r 22 to r 40 at 45° / 135° / 225° / 315°                        | gold                     |
| 6     | kite diamond body           | 2 crossed frame lines inside the body; 1 curved tail down to (56, 84)            | accent                   |
| 7     | sky and ground              | 3 long curves across the bottom at three heights                                 | leaf                     |
| 8     | pot and soft petal outlines | stem curve (50, 78)→(50, 55); two leaf curves; circle center at (50, 45), r 5    | berry                    |
| 9     | butterfly body              | left wing loop, right wing loop, one flight-trail loop below                     | purple                   |
| 10    | cloud at the lower left     | 3 arcs centered (50, 85) with radii 28 / 36 / 44; one 2-turn spiral in the cloud | red / gold / blue / teal |

**Rainbow color model:** one stroke is one solid color. The rainbow's three arcs are red, gold and blue bands drawn inside each other, which reads as a rainbow without per-point gradients; the spiral is the cloud's teal curl. No stroke needs multi-color rendering.

## Stroke model (pure, testable)

- A stroke is a **polyline of sampled points** in a 0–100 normalized space, produced by shape helpers: `line`, `bezier`, `arc`, `circle`, `loop`, `spiral`. Sampling is dense enough (≈1 unit spacing) to look smooth and to make coverage meaningful.
- Each stroke carries: `points`, `color`, `width` and `tolerance`; the first sample is the start point. The guide and the painted line render from the same points, so what the kid sees is exactly what is measured.
- **Coverage:** `paintedSamples / totalSamples`. Painting checks the distance from each unpainted sample to the **pointer segment** (not just the pointer point), so fast drags cannot skip samples.
- **Tolerance** is generous: 7 units (≈24 px on a 340 px card). A stroke completes at 85% coverage; the last 15% is forgiven.
- **No direction:** any start point and either direction count. The ghost brush demonstrates the intended stroke, but it is teaching, not gating.
- Level configs are validated at test time: stroke count 3–5, every stroke ≥ 12 samples, tolerance > 0, completion threshold < 1, no duplicate scene ids.

## Session

- Phases: `tracing` → `celebrating` (stroke) → `tracing` (next stroke) → `complete`.
- State: active stroke index, painted sample bits per stroke, per-stroke help count, idle flag.
- `paint(from, to)` marks samples; `coverage` and `strokeComplete` derive from state; `advance()` moves to the next stroke or completes the level; `replay()` regenerates coverage.
- The page owns every timer (idle demo, stroke beat, scene payoff, reveal).

## Hints

Family philosophy: never stuck, never punished.

- **Idle 4 s:** a ghost brush traces the active stroke once, slowly. Repeats after another 8 s idle. Non-interactive; the kid can ignore it and keep painting.
- **Muguri help button**, per stroke:
  - press 1 — start dot pulses and the ghost repeats;
  - press 2 — a wide glowing band shows the tolerance corridor and the ghost traces slower;
  - press 3 — the stroke auto-paints, sparkles, and completes.
- Help count resets on each new stroke. The help button is always on screen; the caption stays secondary.

## Scene art

- One `BrushScene.svelte` renders the backdrop and payoff by `scene` id, using the garden palette and simple hand-built shapes: cloud, ground tuft, fence posts, tree, sun disc, kite body, hills, flower pot, butterfly body, rainbow cloud.
- Completed strokes are the foreground art. The backdrop stays outline-soft until the scene completes, then fills with color and plays its payoff; reduced motion shows the final state without loops.
- The brush cursor is a small inline SVG that follows the pointer while drawing and rests at the start dot otherwise.
- No raster; no new character art beyond Muguri's existing poses.

## Plumbing

- **Registry:** `{ id: 'brush-along', href: '/play/brush-along', accent: 'leaf', icon: 'brush' }`; `GameId` and the icon union gain the member.
- **Routes:** `/play/brush-along` (map) and `/play/brush-along/[level]` (board), mirroring the family.
- **Module:** `src/lib/games/brush-along/rules.ts`, `rules.test.ts`, `session.svelte.ts`, `session.test.ts`, `BrushBoard.svelte`, `BrushScene.svelte`.
- **Save:** untouched — per-game progress and unlocking reuse `save.ts`.
- **Audio:** reuse `tap` (one soft cue per stroke), `correct` (stroke and scene complete), `hint`, `celebrate`, `unlock`. Drifting off the line is silent — no wrong cue. No new music.
- **i18n:** ~12 new keys × 4 locales — game name/description, trace prompt, three hint lines, scene names, stroke progress label, completion caption. Stroke labels are generic ("Stroke 2 of 3"); the scene name carries the picture.
- **Accessibility:** the board has a localized label carrying the scene name; each stroke exposes its progress via a polite live region; the help button can complete any stroke, so a caregiver can finish a level; keyboard users can reach and use the help button; reduced motion honored. Tracing itself requires pointer/motor control — stated as a known limitation.

## Non-goals

Free painting, color picking, brush sizes, letters or numbers, canvas, multi-touch, scores, stars, timers, two-player, voice narration, games #7+.

## Verification

- **Gate:** `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint` clean.
- **Rules tests:** sampling density and bounds; segment-distance painting; fast-drag interpolation; tolerance band; 85% completion; painted samples persist; direction independence; level-table validation.
- **Session tests:** paint → coverage → completion; next stroke; final scene → complete; replay; help escalation; auto-paint completes; help resets per stroke.
- **Browser pass (390 × 844):** trace a stroke with pointer moves, confirm ink and completion; drift off and confirm no failure; lift/resume; idle ghost; help stages; scene payoff; complete, save, unlock; replay; locked deep link; four locales; reduced motion; no console errors; no overflow.
- **Owner trial:** finger feel, tolerance and stroke size on a real phone before merge.

## Open questions

None — resolved by owner: tracing; garden scenes; SVG sampled coverage.

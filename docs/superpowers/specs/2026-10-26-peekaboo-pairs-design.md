# Peekaboo Pairs — design spec (game #5, milestone 5)

Date: 2026-10-26 · Status: implemented — milestone 5, pending review · Base spec: `2026-10-08-cozy-nook-design.md` · Branch: `milestone-5`

## Goal

Game #5 of Cozy Nook: a **memory matching game for ages 5–8** in the same cozy garden world — offline-first PWA, four languages (it / ro / en / de), no reading required to play. Kids flip two cards at a time, remember where each picture lives, and clear the board by finding every pair.

The name is the mechanic: every board begins with a **peekaboo** — all cards face up for a moment — then they flip down and the remembering starts. The peek shortens as levels rise, so early levels teach the board and late levels lean on memory.

## Owner decisions (locked)

- **Core mechanic = classic memory** — flip two cards, find a pair. Identical pictures, not related pairs.
- **Peek on every board** — the whole board reveals for a beat before play, never a one-card-at-a-time reveal, never peek-on-demand. Peek time shrinks with level.
- **One theme per level** — fruits, balloons, friends, then mixed decks. Reuses existing art; no new character art.
- **Build approach = house pattern + calibration panel** — pure rules + session + view + route, plus a dev-only panel to tune grid density, card gap and peek duration on a real phone. Panel is removed before merge; chosen values are baked into the level table.

## Core loop

1. Board appears face-down inside the garden frame. Progress dots show the board index (3 boards per level, mirroring the family's round dots).
2. **Peek:** all cards flip face-up together for `peekMs`, a soft "Peekaboo!"-style rise from Muguri, then flip down in a short stagger (~40 ms per card). Taps during the peek do nothing; the peek is not skippable.
3. **Play:** the kid taps one card to flip it up, then a second.
   - **Match:** both cards stay up with a sparkle and the correct chime; Muguri cheers. A short beat (~500 ms) then play continues.
   - **Mismatch:** both cards flip back after ~800 ms with a gentle wiggle and the soft wrong chime. No penalty, no move counter, no timer.
4. **Board clear:** remaining cards do a small celebratory bounce; ~900 ms beat; next board. Progress dot fills.
5. **Level complete:** last board clear → existing LevelComplete card, confetti, music sting, save/unlock, replay/next-level actions exactly as the other games.
6. **Wrong input can never wedge the board:** tapping an already-up card is ignored; tapping a third card before the mismatch resolves is ignored until the pair resolves.

## Curriculum

Theme pools come from shipped art: **fruits** (`Fruit.svelte`, 10 kinds), **balloons** (`Balloon.svelte`, 12 colors), **friends** (6 avatars + Muguri + Mimo). No new asset components.

| Level | Theme               | Pairs | Grid (cols × rows) | Peek (ms) | Near pairs |
| ----- | ------------------- | ----: | ------------------ | --------: | ---------- |
| 1     | Fruit               |     2 | 2 × 2              |      3000 | no         |
| 2     | Fruit               |     3 | 3 × 2              |      2800 | no         |
| 3     | Fruit               |     4 | 4 × 2              |      2600 | no         |
| 4     | Balloons            |     4 | 4 × 2              |      2400 | no         |
| 5     | Balloons            |     6 | 3 × 4              |      2200 | no         |
| 6     | Friends             |     6 | 3 × 4              |      2000 | no         |
| 7     | Friends             |     8 | 4 × 4              |      1800 | no         |
| 8     | Mixed fruit+balloon |     8 | 4 × 4              |      1500 | max 1      |
| 9     | Mixed all           |    10 | 4 × 5              |      1300 | max 1      |
| 10    | Mixed all           |    10 | 4 × 5              |      1100 | max 2      |

**Near groups** (deliberately similar pictures, separated below L8 and allowed above):

- balloons: `blue / light-blue / dark-blue`, `green / light-green / dark-green`, `red / pink`
- fruits: `lemon / banana` (yellow), `apple / cherry` (red), `orange / peach`

Below L8, a board never contains two members of the same near group. At L8+ a board may contain at most one near pair (two at L10) — the point is discrimination, not punishment.

Grid choice is constrained by the portrait phone: 4 columns maximum at 390 px, rows may grow to 5. Card minimum tap area ≥ 64 px. Cards are square-ish; the grid is centered in the existing field frame.

## Generation rules (seeded, deterministic, unit-tested)

- Each board holds exactly `pairs × 2` cards: every chosen picture appears exactly twice.
- Pictures are drawn without replacement from the level's theme pool; pools are large enough for every level (10 fruits, 12 balloons, 8 friends).
- **No near-group duplication below L8**, enforced after sampling. At L8+, near pairs are a bonus, never forced when the pool cannot supply them.
- No board repeats the previous board's theme selection beyond the level's theme definition; mixed levels vary the mix.
- A seeded PRNG makes every board reproducible in tests; the page seeds from `Date.now()` in production.
- The level table is validated at test time: pairs ≥ 2, `pairs × 2 === cols × rows`, peek strictly decreasing, theme pool ≥ pairs, near rules respected across a large seeded sample.

### Generation details (builder calls)

- **One seed per level.** `generateLevel(level, seed)` returns all three boards, derived in order from one PRNG stream — mirroring `feelings-faces`. The page seeds once per level from `Date.now()`. `generateBoard` stays internal. Determinism test: same level + seed → identical boards, twice.
- **Mixed compositions.** L8 is exactly 4 fruits + 4 balloons per board. L9–10 use at least two themes per board, and across the three boards every available theme appears at least once. Consecutive boards on mixed levels never repeat the same theme split when an alternative is possible.
- **Consecutive boards may share pictures**, but never the identical picture set when the pool has alternatives. No strict cross-board disjointness, and no identical-set rule on L7 — its friend pool is exactly 8, so every 8-pair board uses the whole pool and only the shuffle differs.
- **Near rules are cross-theme.** A yellow balloon next to a lemon is confusable. Cross-theme groups: `yellow balloon / lemon / banana`, `red or pink balloon / apple / cherry`, `orange balloon / orange / peach`, `green balloon / pear`. These count against the same per-board budget (0 below L8, ≤ 1 at L8–9, ≤ 2 at L10).
- **Hint thresholds are per board.** Mismatch counters and hint stage reset when a new board starts; the 2 / 4 / 6 thresholds apply to the current board only.
- **Card back is one-off** and symmetric: both card faces render inside the same fixed-footprint element; the flip is a `rotateY` and reads correctly in either direction. No shared flip component.

## Hints

Family philosophy: never stuck, never punished, no timer, no red X.

- **Nudge (2 mismatches on a board):** every face-down card wiggles gently once.
- **Strong (4 mismatches):** one card belonging to a remaining pair glows for a moment.
- **Reveal (6 mismatches):** one card of a remaining pair flips face-up for ~1.2 s, then flips back. A hint, never a free pair.
- The Muguri help button stays on screen and advances the hint stage manually, matching games #1–#4.
- Mismatch counts reset per board; hint stage never carries into the next board.

## Calibration panel (temporary, dev-only)

- Visible only in dev builds with `?calibrate=1`; production and the merged commit do not render it.
- Sliders/number inputs for: peek duration (600–4000 ms), card gap (4–20 px), grid columns/rows, and a **replay board** button.
- Shows the resulting card size in px so we can confirm the ≥ 64 px tap target.
- Owner tunes on a real phone; the chosen numbers are written into `LEVELS`; the panel code is deleted before merge.

## Art & reuse

No new art components. Card faces render the shipped `Fruit`, `Balloon`, `Avatar`, `Muguri` and `Mimo` components.

- **Card back:** one small inline SVG leaf motif on cream, with a warm rim — designed in `MemoryBoard.svelte`, consistent with `ART-STYLE.md` (paper cream, leaf rim, cocoa ink). No raster.
- **Flip:** CSS 3D `rotateY` with `backface-visibility: hidden`, ~320 ms, `--cn-ease`; the card keeps a fixed footprint so the grid never reflows. Reduced motion: crossfade instead of rotation.
- **Peek:** all cards flip together, then down with a 40 ms stagger; reduced motion: simple fade.
- **Muguri:** idle during play, cheer on a match, a small "peek" rise at board start. No new poses required beyond the existing cheer.
- **Home tile:** new `pairs` icon branch — two overlapping card backs with a leaf — plus the `TITLES`/`DESCS` map entries (the lesson from games #3–4).

## Plumbing

- **Registry:** `{ id: 'peekaboo-pairs', href: '/play/peekaboo-pairs', accent: 'berry', icon: 'pairs' }`; `GameId` and the icon union gain the new members.
- **Routes:** `/play/peekaboo-pairs` (level map) and `/play/peekaboo-pairs/[level]` (field), mirroring the family.
- **Module:** `src/lib/games/peekaboo-pairs/rules.ts`, `rules.test.ts`, `session.svelte.ts`, and the view component `MemoryBoard.svelte`.
- **Save:** untouched — per-`gameId` progress and level unlocking reuse `save.ts` exactly.
- **Audio:** reuse `tap` (flip), `correct` (match), `wrong` (mismatch), `hint`, `celebrate`, `unlock`. No new music, no TTS.
- **i18n:** new keys in all four locales — game name/description, peek/remember/find/tap prompts, three hint lines, 10 fruit names (singular, for card labels), 8 friend names, and a card-back label. Balloon names reuse the existing `color_*` keys. ~24 keys × 4 languages.
- **Accessibility:** each card is a button; a face-up card announces its localized picture name, a face-down card announces only "face-down card" plus its position (so the answer is never leaked); `aria-pressed` reflects the up state; the grid has a label; peek state is announced once via the existing polite live region; focus ring visible; reduced motion uses an opacity crossfade and static hint rings instead of the flip, wiggle and glow animations.

## Non-goals

Timers, move limits, scores, stars, multiplayer, drag interaction, related-pair matching, new character art, new music, voice narration, games #6–7.

## Verification

- **Gate:** `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint` — all clean.
- **Rules tests:** board size and pair multiplicity; seeded determinism; theme pool respected; near-group separation below L8 and allowance above; level-table validity (grid area, monotonic peek, pool size); hint thresholds.
- **Session tests:** flip/tap sequencing, match keeps cards, mismatch schedules a flip-back, third-tap lock, board advance, complete phase, replay.
- **Browser pass (mobile 390 × 844):** peek shows every face then flips down; match and mismatch paths; hints at 2/4/6 mismatches; board advance and progress dots; level complete, save and unlock; replay and next level; deep link to a locked level; all four locales; reduced motion; calibration panel hidden without the flag.
- **Owner trial:** real-phone density and peek feel on the feature branch before merge.

## Open questions

None — resolved by owner: classic memory; peek every board; one theme per level; house pattern + temporary calibration panel.

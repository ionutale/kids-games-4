# Color Match — design spec (game #2, milestone 2)

Date: 2026-10-11 · Status: awaiting owner review · Base spec: `2026-10-08-cozy-nook-design.md` · Branch: `milestone-2`

## Goal

Game #2 of Cozy Nook: a **color-recognition game for ages 4–7** in the same cozy garden world — offline-first PWA, four languages (it / ro / en / de), **no reading required** to play. Kids match a shown target color by tapping the right balloon.

**Owner decisions (locked):**

- Core interaction: **tap the match** (same tap language as Counting — safest for 4-year-olds).
- Objects: **balloons** floating in the garden sky; Muguri presents the target balloon.

## Core loop

- **Round anatomy:** prompt area shows Muguri (hint pose) presenting a big **target balloon** plus the question text with the color's name in the local language ("Which balloon is red?"). The field below holds **N balloon choices** floating with a gentle bob (staggered), each a distinct color.
- **Correct:** tapped balloon and target balloon do the overshoot bounce, sparkles burst, "Yes!" — then the round advances (same timing as Counting).
- **Wrong:** gentle wiggle + sad face for ~1 s, then the round stays open for a retry. Never punishing, never red.
- **Level** = 5 rounds. Completing all rounds → LevelComplete card + confetti → next level unlocks. Level map, progress dots, celebrations mirror Counting exactly.

## Curriculum

| Level | Colors                                                   | Choices |
| ----- | -------------------------------------------------------- | ------- |
| 1     | red vs yellow                                            | 2       |
| 2     | + blue                                                   | 3       |
| 3     | + green                                                  | 3       |
| 4     | + orange                                                 | 3       |
| 5     | + purple                                                 | 3       |
| 6     | + pink (7-color rotation)                                | 3       |
| 7     | core colors, bigger choice set                           | 4       |
| 8     | light vs dark shades (light/dark blue, light/dark green) | 4       |
| 9     | near-neighbors (red/orange/pink · blue/teal/green)       | 4       |
| 10    | everything mixed                                         | 4       |

**Generation rules** (seeded/deterministic, tested like Counting's):

- Exactly N choices per round (N by level: 2 / 3 / 4), all distinct colors, the target's color present exactly once.
- No consecutive rounds with the same target color.
- Counting's "exactly 3 choices" rule was counting-specific — Color Match ramps 2 → 3 → 4.

**Color set:** red, yellow, blue, green, orange, purple, pink + shade variants (light/dark blue, light/dark green). Hues must read as their name (red is not pink) — that is the teaching point. Teal (the sky's hue) appears **only as a distractor** in near-neighbor rounds — never a target; its name key exists solely for accessibility labels (12 names). Hexes are tuned in the art pass (garden-friendly, not neon) and **choices within a round always differ in lightness** so color-blind kids can still solve by luminance.

## Prompt & feedback details

- Question: parametrized message `color_question(color)` — e.g. EN "Which balloon is red?", IT "Quale palloncino è rosso?", RO "Care balon este roșu?", DE "Welcher Luftballon ist rot?".
- Color names are explicit per language (no word composition — German "hellblau/dunkelblau" vs Italian "azzurro chiaro" compose differently): 7 base + 4 shade names = 11 names × 4 languages.
- Balloons get faces: **happy** on correct, **sad** on wrong, plain otherwise — the same face grammar as fruits/avatars (`ART-STYLE.md`).
- Audio: existing tap / correct / wrong / celebrate sfx and the existing music scenes are reused **as-is** — no new music in this wave.

## Reuse & plumbing (verified in code)

- `src/lib/games/registry.ts` — add `{ id: 'color-match', href: '/play/color-match', accent: 'berry', icon: 'color' }`; extend the `GameId` union. The registry already anticipates this entry (`icon: 'color'`, `accent: 'berry'`).
- Home screen iterates `GAMES` → the second tile appears automatically; the "Coming soon" placeholder stays for future games.
- `src/lib/storage/save.ts` — progress is **already keyed by gameId** (`progress[profileId][gameId]`); zero storage changes. Use gameId `'color-match'`.
- Routes mirror Counting: `/play/color-match` (level map) and `/play/color-match/[level]` (field).
- `rules.ts` + `rules.test.ts` mirror Counting's (seeded RNG, curriculum table, choice generation, uniqueness rules).
- `session.svelte.ts` mirrors Counting's session pattern.
- i18n: new message keys ×4 languages (paraglide; the existing key-parity test enforces completeness).
- **New art:** `Balloon.svelte` — color via props, size, mood (plain/happy/sad), internal bob; overshoot bounce / wiggle via the existing motion tokens. Artist: DeepSeek V4.1 Flash per `ART-STYLE.md`. **No new Muguri pose needed** (hint pose presents the target).
- Level map page mirrors Counting's (duplication by intent — extract shared components only if trivial and clearly beneficial).

## Accessibility & motion

- Luminance separation within a round's choices + localized color names + aria labels ("Balloon — red") as secondary cues.
- Tap targets ≥ 64 px; balloons bob gently (staggered) and everything is disabled under the global `prefers-reduced-motion` rule.
- Decorations never countable; no patterns on balloons (color purity is the lesson).

## Non-goals

Voice narration; balloon patterns; new music; drag interaction; stars/badges; games 3+; remote sync.

## Verification

- Gate per wave: `check` / `test` / `build` / `lint`; browser pass (play a level, correct + wrong paths, celebration, map unlock, offline sanity).
- Tests: rules (choice count/distinctness, target present, curriculum per level, shade levels), registry entry, i18n key parity, progress isolation between the two games.
- Screenshots of `Balloon.svelte` at the size ladder (28 / 64 / 120 / 512) for owner review.

## Open questions

None — resolved by owner: tap-the-match mechanic, balloons as the objects.

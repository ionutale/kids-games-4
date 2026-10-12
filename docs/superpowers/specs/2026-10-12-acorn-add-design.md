# Acorn Addition — design spec (game #3, milestone 3)

Date: 2026-10-12 · Status: awaiting owner review · Base spec: `2026-10-08-cozy-nook-design.md` · Branch: `milestone-3`

## Goal

Game #3 of Cozy Nook: **addition taught visually for ages 4–7** in the same cozy garden world — offline-first PWA, four languages (it / ro / en / de), no reading required to play. Kids watch acorns gather and tap the total.

**Owner decision (locked):** core mechanic = **animated gathering** — acorns hop from the second patch into the first, then the kid taps the total.

## Core loop

- **Round anatomy:** two acorn patches appear (left `a` acorns, right `b` acorns) with a soft "+" between them. After a short beat the **gathering plays automatically**: the right patch's acorns hop one by one (staggered ~250 ms, overshoot landing) into the left patch until one pile of `a + b` remains; the "+" fades as the last acorn lands.
- **Answer choices fade in when the gathering completes** — the kid watches first, then answers: the question "How many acorns in all?" plus **3 numeral choices** (reusing the existing cream `NumeralBubble`). Tapping the field before then is harmless.
- **Count-along:** tapping the pile makes each acorn bounce once in order (~120 ms stagger) — counting-rhythm practice, no state change.
- **Correct:** sparkles at the pile + acorns hop + "Yes!" — then the round advances (family timing). **Wrong:** that choice wiggles + the pile's acorns look sad for ~1 s, retry — never punishing, never red.
- **Level** = 5 rounds; level map, unlock, progress dots, LevelComplete + confetti mirror the family exactly.

## Curriculum

| Level | Sums | Notes                           |
| ----- | ---- | ------------------------------- |
| 1     | 2–4  | pure visual                     |
| 2     | 3–5  | pure visual                     |
| 3     | 4–6  | numeral chip appears            |
| 4     | 5–7  | near-miss distractors from here |
| 5     | 6–8  |                                 |
| 6     | 7–9  |                                 |
| 7     | 8–10 |                                 |
| 8     | 5–10 | mixed review                    |
| 9     | 8–12 |                                 |
| 10    | 8–12 | mixed review                    |

**Generation rules** (seeded/deterministic, tested like Counting's and Color Match's):

- Groups `a, b ≥ 1`; `a + b` inside the level's range; **no consecutive identical `(a, b)` pairs**; unique pairs within a level when the pool allows.
- **3 choices always**; distractors are near-misses from level 4 (`±1` preferred, then `±2`), all within a sane range and never negative.
- **Numeral chip** `a + b` (language-neutral, e.g. "3 + 2") shown from level 3 — the bridge from pictures to symbols.

## Prompt & feedback details

- Question: `addition_question` — "How many acorns in all?" / "Quante ghiande in tutto?" / "Câte ghinde în total?" / "Wie viele Eicheln sind es insgesamt?".
- Hints: the family's 3-stage system (nudge → strong → reveal) with addition-worded texts; the correct numeral bubble glows at stage ≥ 2 and pulses at stage ≥ 3.
- Audio: **reuse** tap (one soft tap per landing — counting rhythm), correct / wrong / hint / unlock / celebrate. No new music.

## Reuse & plumbing (verified patterns)

- `src/lib/games/registry.ts` — add `{ id: 'acorn-add', href: '/play/acorn-add', accent: 'accent', icon: 'logic' }`; the home screen shows it automatically (message maps in the home page need the two new entries — learned from the Color Match browser pass).
- `save.ts` — progress is already keyed by gameId; zero storage changes. Use gameId `'acorn-add'`.
- Routes mirror Color Match: `/play/acorn-add` (map) + `/play/acorn-add/[level]` (field).
- `rules.ts` + `rules.test.ts` and `session.svelte.ts` mirror the family's modules.
- **New art:** `Acorn.svelte` (cap + body + happy/plain/sad faces per `ART-STYLE.md`) by **DeepSeek V4.1 Flash**; the "+" is inline SVG. Acorn positions (patch spots + travel offsets) come from the rules.
- i18n: ~8 new keys × 4 languages (name, desc, question, tap-hint, three hint texts, count-along label).
- Accessibility: **reduced motion → acorns appear already gathered** (no hops, no count-along); aria labels on choices and the pile; 64 px taps; decorations never countable.

## Non-goals

Voice narration; new music; drag interaction; subtraction; stars/badges; games 4+; remote sync.

## Verification

- Gate per wave: `check` / `test` / `build` / `lint`; browser pass (full level, wrong + correct paths, count-along, gather replay on revisit, unlock, deep-link to a locked level).
- Rules tests: sum range per level, groups ≥ 1, pair uniqueness / no consecutive repeats, near-miss distractor rules, numeral-chip threshold, determinism.
- Screenshots of `Acorn.svelte` at the size ladder (28 / 64 / 120 / 512) plus in-game stills for owner review.

## Open questions

None — resolved by owner: animated gathering.

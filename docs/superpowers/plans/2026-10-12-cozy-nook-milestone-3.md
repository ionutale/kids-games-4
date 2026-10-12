# Cozy Nook — Milestone 3 Implementation Plan: Acorn Addition

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking. **Orchestrator-adapted:** implementers never run git commands; the orchestrator runs the authoritative gate and commits each validated task.

**Goal:** Ship Acorn Addition — game #3 of Cozy Nook: ten levels of animated-gathering addition for ages 4–7, in four languages, riding on the existing shell (registry, save, audio, i18n, motion tokens).

**Architecture:** One new pure module (`acorn-add/rules.ts`, seeded and unit-tested like the family), a thin runes session mirroring Color Match's, two route pages mirroring the family's map + field, one new art component (`Acorn.svelte`), one registry entry — progress already keys by gameId, so storage, PWA, audio and celebrations are untouched.

**Tech Stack:** unchanged — SvelteKit 3 · Svelte 5 (runes) · TypeScript strict · Vite 8 · Vitest 4 · pnpm · Paraglide i18n (it/ro/en/de) · procedural WebAudio.

**Spec:** docs/superpowers/specs/2026-10-12-acorn-add-design.md

## Global Constraints

- Node ≥ 26. **pnpm only.** `.npmrc` has `engine-strict=true`.
- Svelte 5 **runes mode** everywhere; `$props()`, `$state()`, `$derived()`, `$effect()`, `onclick`, snippets. No legacy syntax, no stores.
- Imports via the package `imports` map with explicit extensions: `#lib/<path>.js` (never `$lib`). Messages: `{ m }` from `#lib/paraglide/messages.js`; components as `#lib/components/<name>.svelte`.
- **User-visible strings only via Paraglide messages.** The numeral chip ("3 + 2") is language-neutral and is rendered as numerals, not text.
- **No network at runtime.** localStorage only. No new dependencies. No new music (reuse sfx + scenes).
- **Art per `ART-STYLE.md`.** SVG inline hexes; no SVG filters/blur; gradients only.
- Colors/spacing/type via tokens `var(--cn-*)` in CSS; SVG presentation attributes carry inline hexes.
- Tap targets ≥ 56 px (acorn field + choice buttons ≥ 64 px). Portrait, safe-area aware. `prefers-reduced-motion` respected — **and the gathering must not depend on animation completion for state** (choices appear via a timer, never an `animationend`).
- **Do not** run git commands, add dependencies, touch files outside your task's list, or dispatch subagents.
- **Verification (current ruling):** implementers verify with `pnpm exec svelte-check --tsconfig ./tsconfig.json` (0 errors) + targeted `pnpm exec vitest run <file>` where the task has tests. The orchestrator runs the authoritative gate (`check` / `test` / `build` / `lint`) per wave and commits.
- Reference projects are **read-only** (`kids-games-3`, `restaurant-manager-game`); never modify them.

## Review Focus

1. **Reduced motion:** acorns appear already gathered (no hop state stuck), count-along inert, choices still fade in — the `gathered` flag comes from a timer, not `animationend` (Task 6; browser check in Task 7).
2. **Double-tap safety:** choices are hidden until gathering completes; `answer()` is phase-guarded so rapid taps never skip two rounds or double-fire celebrations (Tasks 3, 6).
3. **Text fit:** the longest strings — "Wie viele Eicheln sind es insgesamt?", "Quante ghiande in tutto?", "Privește ghindele cum se adună și atinge totalul." — render unclipped at 320 px width (Task 2 values; Task 6 layout; Task 7 browser check).
4. **Counting clarity:** pile acorns keep a min-distance (no overlapping stacks), decorations never look countable, and the "+" reads as an operator, not a thing to count (Task 1 layout tests; Tasks 5, 6).
5. **Locked deep-link:** `/play/acorn-add/7` with no progress lands safely on the level map (Task 6 validation; browser pass in Task 7).

---

### Task 1: Addition rules + registry entry

**Files:**

- Create: `src/lib/games/acorn-add/rules.ts`, `src/lib/games/acorn-add/rules.test.ts`
- Modify: `src/lib/games/registry.ts`, `src/lib/games/registry.test.ts`

**Interfaces:**

- Consumes: family patterns from `src/lib/games/counting/rules.ts` and `src/lib/games/color-match/rules.ts` (seeded RNG, level configs, option generation). A 6-line local `mulberry32` duplicate is fine — do NOT import across game modules.
- Produces (exact, consumed by Tasks 3, 4, 5, 6):

```ts
export interface AdditionLevelConfig {
	level: number;
	min: number;
	max: number;
	chip: boolean;
}

export const MAX_LEVEL = 10;
export const ROUNDS_PER_LEVEL = 5;
export const CHOICES = 3;

export const LEVELS: AdditionLevelConfig[] = [
	{ level: 1, min: 2, max: 4, chip: false },
	{ level: 2, min: 3, max: 5, chip: false },
	{ level: 3, min: 4, max: 6, chip: true },
	{ level: 4, min: 5, max: 7, chip: true },
	{ level: 5, min: 6, max: 8, chip: true },
	{ level: 6, min: 7, max: 9, chip: true },
	{ level: 7, min: 8, max: 10, chip: true },
	{ level: 8, min: 5, max: 10, chip: true },
	{ level: 9, min: 8, max: 12, chip: true },
	{ level: 10, min: 8, max: 12, chip: true }
];

export interface AcornSpot {
	x: number;
	y: number;
	size: number;
	tilt: number;
}
export interface TravelSpot extends AcornSpot {
	fromX: number;
	fromY: number;
	delay: number;
}

export interface Round {
	a: number; // left patch count (resting acorns)
	b: number; // right patch count (traveling acorns)
	sum: number; // a + b
	left: AcornSpot[]; // the a resting acorns at their final pile positions
	travels: TravelSpot[]; // the b traveling acorns at their final pile positions + start offsets
	options: number[]; // exactly 3 unique numbers incl. sum
}

export function getLevelConfig(level: number): AdditionLevelConfig | undefined;
export function generateLevel(level: number, seed?: number): Round[];
export function hintStage(misses: number, manualHints: number, idle: boolean): 0 | 1 | 2 | 3; // identical thresholds to the family: 3 if misses≥6||manual≥3; 2 if misses≥4||manual≥2; 1 if misses≥2||manual≥1||idle; else 0
export function makePairs(config: AdditionLevelConfig, rand: () => number): [number, number][];
export function makeOptions(config: AdditionLevelConfig, sum: number, rand: () => number): number[];
export function layoutPile(count: number, zone: 'left' | 'right', rand: () => number): AcornSpot[];
```

Registry: `export type GameId = 'counting' | 'color-match' | 'acorn-add';` and append to `GAMES`:
`{ id: 'acorn-add', titleKey: 'game_acorn_add_name', descKey: 'game_acorn_add_desc', href: '/play/acorn-add', accent: 'accent', icon: 'logic' }`.

**Rules decisions to pin in the implementation:**

- `makePairs`: all pairs `a, b ≥ 1` with `min ≤ a + b ≤ max` form the pool; return 5 pairs from a shuffled bag — **never the same pair consecutively**; **unique pairs within a level when the pool ≥ 5** (mirror the family's `pickTargets`/`pickCounts` shape).
- `makeOptions`: exactly 3 unique numbers including `sum`. Level < 4: distractors random within `[1, max + 1]` (≥ 1, ≠ sum). Level ≥ 4: **near-miss, closest first** — ±1 then ±2 (never below 1); mirror counting's tight-distractor approach.
- `layoutPile`: jittered 2-column grid with **pairwise min-distance ≥ 16** (% of field); `size` 0.9–1.15; `tilt` −10..10. Zones: `left` → x 12–48, y 28–72; `right` → x 60–90, y 26–68.
- `generateLevel`: 5 rounds; default seed `level * 1013`; deterministic. Per round: pair → `sum`; `pile = layoutPile(sum, 'left', rand)`; `left = pile.slice(0, a)`; `rightSpots = layoutPile(b, 'right', rand)`; `travels = pile.slice(a).map((spot, i) => ({ ...spot, fromX: rightSpots[i].x, fromY: rightSpots[i].y, delay: i }))`; `options = makeOptions(...)`.

- [ ] **Step 1: write the failing tests** (`rules.test.ts`): LEVELS shape (chip false on L1–2, true L3+; ranges per the table); `makePairs` — all pairs within `min..max`, groups ≥ 1, no consecutive repeats, unique when pool ≥ 5; `makeOptions` — length 3, contains `sum`, unique, all ≥ 1; L4+ distractors are ±1/±2 from the sum when available; `layoutPile` — length matches, bounds per zone, min pairwise distance ≥ 16, size/tilt ranges; `generateLevel` — length 5, determinism (`generateLevel(5, 1234)` twice deep-equals), `left.length === a`, `travels.length === b`, `sum === a + b` within range, travels' `fromX` within 60–90, delays `0..4`; `hintStage` boundaries (0/2/4/6 misses; 1/2/3 manual; idle → 1). Registry: update the existing `toEqual` brief test to the three-entry array; `getGame('acorn-add')` returns the new entry.
- [ ] **Step 2: run the tests to verify they fail** — `pnpm exec vitest run src/lib/games/acorn-add/rules.test.ts src/lib/games/registry.test.ts` → module-not-found / assertion failures.
- [ ] **Step 3: implement** `rules.ts` + the registry changes (exact values above).
- [ ] **Step 4: run the tests to verify they pass** — same command → all green.
- [ ] **Step 5: verify types** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors.

### Task 2: i18n messages (it/ro/en/de)

**Files:**

- Modify: `messages/it.json`, `messages/ro.json`, `messages/en.json`, `messages/de.json`

**Interfaces:**

- Consumes: nothing new — **hints are fully reused**: `hint_nudge` ("Count slowly, one by one."), `hint_strong`, and `hint_reveal({ count })` (count = the sum). `tap_number` ("Tap the right number") is reused for the bottom line.
- Produces: 4 new keys below in all four locales, consumed by Tasks 4, 6. The parity test (`src/lib/i18n.test.ts`) enforces identical key/placeholder sets.

- [ ] **Step 1: add the keys.** Exact values (add inside each JSON object; keep existing keys untouched):

| Key                    | it                                          | ro                                                | en                                         | de                                                             |
| ---------------------- | ------------------------------------------- | ------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| `game_acorn_add_name`  | Aggiungi le ghiande                         | Adună ghindele                                    | Acorn Addition                             | Eicheln sammeln                                                |
| `game_acorn_add_desc`  | Guarda le ghiande unirsi e tocca il totale. | Privește ghindele cum se adună și atinge totalul. | Watch the acorns gather and tap the total. | Schau, wie die Eicheln zusammenkommen, und tippe die Summe an. |
| `addition_question`    | Quante ghiande in tutto?                    | Câte ghinde în total?                             | How many acorns in all?                    | Wie viele Eicheln sind es insgesamt?                           |
| `addition_count_along` | Conta le ghiande                            | Numără ghindele                                   | Count the acorns                           | Zähle die Eicheln                                              |

- [ ] **Step 2: verify** — `pnpm exec vitest run src/lib/i18n.test.ts` → parity passes; `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors.

### Task 3: Addition session module

**Files:**

- Create: `src/lib/games/acorn-add/session.svelte.ts`

**Interfaces:**

- Consumes: Task 1's `generateLevel`, `hintStage`, `Round` from `#lib/games/acorn-add/rules.js` (game modules stay independent — never import across game modules).
- Produces (exact, consumed by Task 6): mirror `src/lib/games/color-match/session.svelte.ts` (read it first):

```ts
export type AcornPhase = 'playing' | 'celebrating' | 'complete';
export interface AcornSession {
	readonly rounds: Round[];
	readonly roundIndex: number;
	readonly misses: number;
	readonly manualHints: number;
	readonly phase: AcornPhase;
	readonly round: Round;
	readonly hint: 0 | 1 | 2 | 3;
	readonly isLast: boolean;
	answer(value: number): boolean; // wrong → misses++ and false; correct → 'celebrating' and true; ignored unless 'playing'
	help(): void;
	markIdle(): void;
	advance(): void;
	replay(): void;
}
export function createAcornSession(level: number): AcornSession;
```

Pure state transitions only — the page owns every timer (gathering beat, celebrate delay, wrong flash, count-along wave). No timers, no DOM, no audio inside.

- [ ] **Step 1: implement** the factory with `$state` runes exactly as specified.
- [ ] **Step 2: verify** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors.

### Task 4: Level map route + home tile

**Files:**

- Create: `src/routes/play/acorn-add/+page.svelte` (level map)
- Modify: `src/routes/+page.svelte` (tile icon branch + TITLES/DESCS message maps)

**Interfaces:**

- Consumes: Tasks 1 (registry), 2 (messages); save module (`loadSave`, `getCleared`, `isLevelOpen`, `MAX_LEVEL`); `Muguri`, `IconButton`, `Acorn` (Task 5); audio singleton. Reference: `src/routes/play/color-match/+page.svelte` (mirror it — same states, interactions and CSS treatments).
- Produces: navigable map for `gameId 'acorn-add'`; home tile complete (icon **and** name/description).

- [ ] **Step 1: map page.** Mirror Color Match's map page with `gameId 'acorn-add'`, title `m.game_acorn_add_name()` + desc `m.game_acorn_add_desc()`, `Muguri pose="idle"`, back → `/`, `audio.playMusic('game')` on mount, ten level tiles (locked/open/done + `new` pill on `cleared + 1`, locked tap → wiggle + `m.locked_detail({ n })`, open tap → `goto('/play/acorn-add/' + n)`), progress line.
- [ ] **Step 2: home tile.** In `src/routes/+page.svelte`: import `Acorn` and add the branch `{:else if game.icon === 'logic'}<Acorn size={64} />` before the `{:else}` fallback; **and add the two entries to the `TITLES` / `DESCS` maps** (`game_acorn_add_name` / `game_acorn_add_desc`) — the Color Match browser pass proved this map is easy to miss.
- [ ] **Step 3: verify** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors.

### Task 5: Acorn art component — **artist: DeepSeek V4.1 Flash**

**Files:**

- Create: `src/lib/components/art/Acorn.svelte`

**Interfaces:**

- Consumes: `ART-STYLE.md` (face grammar, palette intent, techniques); `Fruit.svelte` and `Balloon.svelte` (read for the face grammar and inline-hex pattern).
- Produces (consumed by Tasks 4, 6): props `{ size?: number (default 72); mood?: 'happy' | 'plain' | 'sad' (default 'happy'); class?: string }`.

**Art brief:**

- Static SVG like `Fruit.svelte` (motion lives on containers): acorn body (warm amber/tan, soft ellipse), cap (deeper brown, gentle scalloped edge), tiny stem; `aria-hidden="true"`, `focusable="false"`, `viewBox="0 0 100 100"`.
- Palette: wood/gold family per `ART-STYLE.md` — warm, garden-friendly, not neon; cap deeper than body; highlight soft. Inline hexes in SVG attributes.
- Face grammar exactly per `ART-STYLE.md`: `happy` = ink-dot eyes with spark highlights + arc smile + blush; `sad` = tilted brows, droop, frown, one sky-blue tear; `plain` = no expressive features. The face sits on the body, clear of the cap.
- Must read at 28 px (silhouette) and stay charming at 512 px. No SVG filters; gradients allowed.

- [ ] **Step 1: implement** `Acorn.svelte` per the brief.
- [ ] **Step 2: verify** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors. Report the final hex values (body / cap / deep / highlight) so the orchestrator can review them against the palette intent.

### Task 6: Field route — the game screen

**Files:**

- Create: `src/routes/play/acorn-add/[level]/+page.svelte`

**Interfaces:**

- Consumes: Tasks 1–5 (rules, session, messages, `Acorn`, `NumeralBubble`, registry); save module; `Sparkles`, `LevelComplete`, `Confetti`, `Muguri`, `IconButton`, `MuteButton`; audio singleton. Reference: `src/routes/play/color-match/[level]/+page.svelte` (mirror its structure and behaviors — header, dots, prompt, help button, idle timer, hint bubble, wrong/correct flow, celebration, unlock, deep-link validation).
- Produces: the complete playable loop for one level.

**Behaviors to pin:**

- **Route validation:** parse `level` (1..10); invalid or `!isLevelOpen(getCleared(save, profileId, 'acorn-add'), level)` → `goto('/play/acorn-add')`.
- **Top bar:** back → map, `m.level({ n })`, `MuteButton`; five progress dots.
- **Prompt row:** `Muguri pose="hint"` + question `m.addition_question()` + the numeral chip `{round.a} + {round.b}` shown only when `config.chip` (level ≥ 3) + help button (Muguri head `IconButton`) → `session.help()` + `playSfx('hint')`.
- **Field:** garden background copied from the family's field (gradient + ground shade + swaying tufts — decorations `aria-hidden`, `pointer-events:none`, non-countable). Renders the pile: `round.left` acorns at their spots + `round.travels` acorns **rendered at their final spots** with a start offset.
- **Gathering animation:** the field element uses `bind:clientWidth` / `bind:clientHeight`; each traveling acorn gets inline `--sx`/`--sy` px computed from `(fromX − x) / 100 * fieldWidth` (same for height) and a one-shot hop animation (`translate(var(--sx), var(--sy))` → `translate(0,0)` with the overshoot token) triggered ~500 ms after the round starts, `animation-delay: delay * 250ms`. The "+" between the patches fades as the gathering ends. **A timer (not `animationend`) flips `gathered = true`** ≈ `500 + b * 250 + 350` ms; under `prefers-reduced-motion` the wait is 300 ms flat (acorns snap to final positions because the global rule neuters animations). `gathered` resets on round change and `replay()`.
- **Choices:** three `NumeralBubble`s (reuse) fade in when `gathered`; `state` mapping: `correct` on the right answer, `wrong` wiggle on a wrong tap, `glow` at `hint ≥ 2`, `pulse` at `hint ≥ 3` — only the correct bubble. Answer via `session.answer(value)`; correct → `playSfx('correct')`, `Sparkles` at the pile, acorns hop (cheering class), `m.correct()`, `advance()` after ~1100 ms; wrong → `playSfx('wrong')`, wiggle + acorns `sad` ~1 s, `m.try_again()`, retry.
- **Count-along:** the pile is a ≥ 64 px button (`aria-label={m.addition_count_along()}`); tapping it bounces each pile acorn once in order (`animation-delay: i * 120ms`), the class removed after the total duration by a timer; inert under reduced motion (animations neutered). Never changes session state.
- **Hints:** family bubble under the prompt with `hint_nudge` / `hint_strong` / `hint_reveal({ count: round.sum })` per `session.hint`.
- **Idle timer:** 10 s without interaction → `markIdle()` (reset each round and on any tap).
- **Level complete:** last round's `advance()` → `phase 'complete'`: `clearLevel(save, profileId, 'acorn-add', level)` + persist + `playSfx('unlock')` + `LevelComplete` overlay (next / replay / all levels).
- **Bottom line:** `m.tap_number()`; `audio.playMusic('game')` on mount.

- [ ] **Step 1: implement** the page per the pinned behaviors (mirror the family's file structure and CSS conventions).
- [ ] **Step 2: verify** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors.

### Task 7: Polish, browser verification, docs

**Files:**

- Modify: `ART-STYLE.md` (asset map: add the Acorn row)
- Modify: `docs/superpowers/specs/2026-10-12-acorn-add-design.md` (flip status to shipped)

**Interfaces:**

- Consumes: everything.

- [ ] **Step 1: browser pass (orchestrator):** home shows three tiles (acorn icon + correct name/desc!); play L1: watch the gathering, count-along tap, wrong → sad + wiggle → retry, hint glow after 2 misses, correct → sparkles + "Yes!"; five rounds → LevelComplete + confetti → unlock; map shows L2 "New!"; deep-link `/play/acorn-add/7` → map; reduced-motion spot check (choices still appear); 4-language spot check; 320 px width check of the longest strings.
- [ ] **Step 2: screenshots** at the size ladder (28/64/120/512) + in-game stills (mid-gather, pile, celebration) for owner review.
- [ ] **Step 3: docs** — `ART-STYLE.md` asset map gains `Acorn.svelte (3 moods)`; spec status → shipped.
- [ ] **Step 4: authoritative gate** — `pnpm check` / `pnpm test` / `pnpm build` / `pnpm lint` all green; commit naming the artist.

---

## Deliberately deferred

- Voice narration (milestone 1.5) — message keys stay structured for later mapping.
- Pitched landing sounds (a rising scale per hop) — reuse `tap` for now.
- Drag interaction, subtraction, stars/badges, games 4+, remote sync, analytics — out of scope.

## Owner directives (amendments carried)

- **Free-models-first orchestrator protocol:** dispatch Muse Spark 1.3 Free / LongCat 2.5 Free / Step 5 Free (best fit per task); validate + reprompt on failure; **when free quota is exhausted → DeepSeek V4.1 Flash (`opencode-go`)**. Art tasks → DeepSeek per the artist directive. Every task's report names its model.
- **Acorn Addition owner decision:** core mechanic = **animated gathering**.
- Motion tokens (`--cn-ease-overshoot`, `--cn-ease-snap`, `--cn-t-arrive`, `--cn-t-pop`, `--cn-stagger`) and the sunlit-garden palette are available; `ART-STYLE.md` is the standing art bible.

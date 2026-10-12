# Cozy Nook — Milestone 2 Implementation Plan: Color Match

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking. **Orchestrator-adapted:** implementers never run git commands; the orchestrator runs the authoritative gate and commits each validated task.

**Goal:** Ship Color Match — game #2 of Cozy Nook: ten levels of tap-the-matching-balloon color play for ages 4–7, in four languages, riding on the existing shell (registry, save, audio, i18n, motion tokens).

**Architecture:** One new pure module (`color-match/rules.ts`, seeded and unit-tested like Counting's), a thin runes session mirroring Counting's, two route pages mirroring Counting's map + field, one new art component (`Balloon.svelte`), and one registry entry — progress already keys by gameId, so storage, PWA, audio and celebrations are untouched.

**Tech Stack:** unchanged — SvelteKit 3 · Svelte 5 (runes) · TypeScript strict · Vite 8 · Vitest 4 · pnpm · Paraglide i18n (it/ro/en/de) · procedural WebAudio.

**Spec:** docs/superpowers/specs/2026-10-11-color-match-design.md

## Global Constraints

- Node ≥ 26. **pnpm only.** `.npmrc` has `engine-strict=true`.
- Svelte 5 **runes mode** everywhere; `$props()`, `$state()`, `$derived()`, `$effect()`, `onclick`, snippets. No legacy syntax, no stores.
- Imports via the package `imports` map with explicit extensions: `#lib/<path>.js` (never `$lib`). Messages: `{ m }` from `#lib/paraglide/messages.js`; components as `#lib/components/<name>.svelte`.
- **User-visible strings only via Paraglide messages** — no hardcoded copy. Placeholders (`{color}`) must survive translation.
- **No network at runtime.** localStorage only. No new dependencies. No new music (reuse sfx + scenes).
- **Art per `ART-STYLE.md`** (principles, palette, motion tokens, face grammar, size ladder). SVG inline hexes mirror intent; **no SVG filters/blur**; gradients only.
- Colors/spacing/type via tokens `var(--cn-*)` in CSS; SVG presentation attributes carry inline hexes (established cross-browser pattern).
- Tap targets ≥ 56 px (balloon buttons ≥ 64 px). Portrait, safe-area aware. `prefers-reduced-motion` respected for every animation.
- Counting's "exactly 3 choices" rule is counting-specific; Color Match uses **2 / 3 / 4 by level** per the spec's curriculum table.
- **Do not** run git commands, add dependencies, touch files outside your task's list, or dispatch subagents.
- **Verification (current ruling):** implementers verify with `pnpm exec svelte-check --tsconfig ./tsconfig.json` (0 errors in their files) + targeted `pnpm exec vitest run <file>` where the task has tests. The orchestrator runs the authoritative gate (`check` / `test` / `build` / `lint`) per wave and commits.
- Reference projects are **read-only** (`kids-games-3`, `restaurant-manager-game`); never modify them.

## Review Focus

1. **Locked deep-link:** `/play/color-match/7` with no progress lands safely on the level map (Task 6 validation; browser pass in Task 7).
2. **Double-tap safety:** rapid taps never skip two rounds or double-fire celebrations — phase guards in `answer()`/`advance()` (Task 3) plus disabled states in the field (Task 6).
3. **Text fit:** the longest questions — "Welcher Luftballon ist dunkelblau?", "Quale palloncino è verde chiaro?", "Care balon este albastru închis?" — render unclipped at 320 px width (Task 2 values; Task 6 layout; Task 7 browser check).
4. **Reduced motion:** bob/wiggle/sparkles/confetti degrade gracefully and no phase gets stuck (Task 6 + Task 7).
5. **Wrong-retry loop:** sad mood + wiggle clear after ~1 s and retry always stays possible; the hint glow never marks two balloons (Task 6).

---

### Task 1: Color rules + registry entry

**Files:**

- Create: `src/lib/games/color-match/rules.ts`, `src/lib/games/color-match/rules.test.ts`
- Modify: `src/lib/games/registry.ts`, `src/lib/games/registry.test.ts`
- Modify: `src/lib/storage/save.test.ts` (add one two-game isolation test)

**Interfaces:**

- Consumes: Task 1 (milestone-1 build); port the seeded-RNG pattern from `src/lib/games/counting/rules.ts` (a 6-line local `mulberry32` duplicate is fine — do NOT import across game modules).
- Produces (exact, consumed by Tasks 3, 4, 5, 6):

```ts
export type ColorId =
	| 'red'
	| 'yellow'
	| 'blue'
	| 'green'
	| 'orange'
	| 'purple'
	| 'pink'
	| 'light-blue'
	| 'dark-blue'
	| 'light-green'
	| 'dark-green'
	| 'teal';
export type HueFamily = 'red' | 'yellow' | 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'teal';
export type Tone = 'light' | 'mid' | 'deep';

export const COLORS: Record<ColorId, { hue: HueFamily; tone: Tone }> = {
	red: { hue: 'red', tone: 'mid' },
	yellow: { hue: 'yellow', tone: 'mid' },
	blue: { hue: 'blue', tone: 'mid' },
	green: { hue: 'green', tone: 'mid' },
	orange: { hue: 'orange', tone: 'mid' },
	purple: { hue: 'purple', tone: 'mid' },
	pink: { hue: 'pink', tone: 'mid' },
	teal: { hue: 'teal', tone: 'light' },
	'light-blue': { hue: 'blue', tone: 'light' },
	'dark-blue': { hue: 'blue', tone: 'deep' },
	'light-green': { hue: 'green', tone: 'light' },
	'dark-green': { hue: 'green', tone: 'deep' }
};

export const SIBLING: Partial<Record<ColorId, ColorId>> = {
	'light-blue': 'dark-blue',
	'dark-blue': 'light-blue',
	'light-green': 'dark-green',
	'dark-green': 'light-green'
};

export const NEIGHBORS: Partial<Record<ColorId, ColorId[]>> = {
	red: ['orange', 'pink', 'purple'],
	orange: ['red', 'yellow', 'pink'],
	yellow: ['orange', 'green'],
	pink: ['red', 'purple'],
	purple: ['pink', 'blue'],
	blue: ['purple', 'teal', 'light-blue'],
	green: ['teal', 'yellow', 'light-green'],
	'light-blue': ['blue', 'dark-blue'],
	'dark-blue': ['blue', 'light-blue'],
	'light-green': ['green', 'dark-green'],
	'dark-green': ['green', 'light-green']
};

export type ColorMode = 'plain' | 'shades' | 'near' | 'mixed';
export interface ColorLevelConfig {
	level: number;
	targets: ColorId[];
	choices: number;
	mode: ColorMode;
}

export const MAX_LEVEL = 10;
export const ROUNDS_PER_LEVEL = 5;

export const LEVELS: ColorLevelConfig[] = [
	{ level: 1, targets: ['red', 'yellow'], choices: 2, mode: 'plain' },
	{ level: 2, targets: ['red', 'yellow', 'blue'], choices: 3, mode: 'plain' },
	{ level: 3, targets: ['red', 'yellow', 'blue', 'green'], choices: 3, mode: 'plain' },
	{ level: 4, targets: ['red', 'yellow', 'blue', 'green', 'orange'], choices: 3, mode: 'plain' },
	{
		level: 5,
		targets: ['red', 'yellow', 'blue', 'green', 'orange', 'purple'],
		choices: 3,
		mode: 'plain'
	},
	{
		level: 6,
		targets: ['red', 'yellow', 'blue', 'green', 'orange', 'purple', 'pink'],
		choices: 3,
		mode: 'plain'
	},
	{
		level: 7,
		targets: ['red', 'yellow', 'blue', 'green', 'orange', 'purple', 'pink'],
		choices: 4,
		mode: 'plain'
	},
	{
		level: 8,
		targets: ['light-blue', 'dark-blue', 'light-green', 'dark-green'],
		choices: 4,
		mode: 'shades'
	},
	{ level: 9, targets: ['red', 'orange', 'pink', 'blue', 'green'], choices: 4, mode: 'near' },
	{
		level: 10,
		targets: ['red', 'yellow', 'blue', 'green', 'orange', 'purple', 'pink'],
		choices: 4,
		mode: 'mixed'
	}
];

export interface BalloonSpot {
	color: ColorId;
	x: number;
	y: number;
	size: number;
	tilt: number;
	delay: number;
}
export interface Round {
	target: ColorId;
	options: ColorId[];
	balloons: BalloonSpot[];
}

export function getLevelConfig(level: number): ColorLevelConfig | undefined;
export function generateLevel(level: number, seed?: number): Round[];
export function makeOptions(
	config: ColorLevelConfig,
	target: ColorId,
	rand: () => number
): ColorId[];
export function layoutBalloons(options: ColorId[], rand: () => number): BalloonSpot[];
export function hintStage(misses: number, manualHints: number, idle: boolean): 0 | 1 | 2 | 3;
```

Registry: `export type GameId = 'counting' | 'color-match';` and append to `GAMES`:
`{ id: 'color-match', titleKey: 'game_color_match_name', descKey: 'game_color_match_desc', href: '/play/color-match', accent: 'berry', icon: 'color' }`.

**Rules decisions to pin in the implementation:**

- `generateLevel`: 5 rounds; default seed `level * 1013`; deterministic (same seed ⇒ deep-equal). Targets drawn as a shuffled bag from `config.targets`: **never the same target consecutively**; **unique targets within a level when `targets.length >= ROUNDS_PER_LEVEL`**. Each round: `options = makeOptions(...)`, `balloons = layoutBalloons(options, rand)`.
- `makeOptions`: exactly `config.choices` distinct ids, target included exactly once. Distractor pool by mode: `plain` → other `config.targets`; `shades` → **must include `SIBLING[target]`**, rest from other-hue families; `near` → at least `choices - 2` distractors from `NEIGHBORS[target]` (teal allowed as distractor), rest from `config.targets`; `mixed` → any id except target (shades and teal allowed). **All modes:** no two options share the same `(hue, tone)` pair; widen the pool rather than violating the constraint.
- `layoutBalloons`: one spot per option, in order; `x` spread 8–92 (evenly spaced + small jitter, min pairwise horizontal distance ≥ 20); `y` 14–64; `size` 0.9–1.15; `tilt` −8..8; `delay` 0..4 (index-based stagger).
- `hintStage`: identical thresholds to Counting — `3` if `misses>=6 || manualHints>=3`; `2` if `misses>=4 || manualHints>=2`; `1` if `misses>=2 || manualHints>=1 || idle`; else `0`.

- [ ] **Step 1: write the failing tests** (`rules.test.ts`): LEVELS shape (10 entries; L1 `{['red','yellow'],2,'plain'}`; L6 seven targets / 3 choices; L7 four choices; L8 shade targets + `'shades'`; L9 `'near'` targets exclude teal; L10 `'mixed'`); `generateLevel` length 5, determinism (`generateLevel(5, 1234)` twice deep-equals), every `target` ∈ config targets, `options.length === choices`, target present exactly once, options unique, no `(hue,tone)` duplicates among options, no consecutive same target, unique targets when pool ≥ 5; per-mode `makeOptions` assertions (shades → sibling present; near → ≥2 NEIGHBORS members; mixed → distinct); `layoutBalloons` bounds + min distance + size/tilt ranges; `hintStage` boundaries (0/2/4/6 misses; 1/2/3 manual; idle → 1). Save: two-game isolation — `clearLevel(…, 'counting', …)` leaves `getCleared(…, 'color-match')` untouched and vice versa. Registry: update the existing `toEqual` brief test to the two-entry array; `getGame('color-match')` returns the new entry.
- [ ] **Step 2: run the tests to verify they fail** — `pnpm exec vitest run src/lib/games/color-match/rules.test.ts src/lib/games/registry.test.ts` → module-not-found / assertion failures.
- [ ] **Step 3: implement** `rules.ts` + the registry changes (exact values above).
- [ ] **Step 4: run the tests to verify they pass** — same command → all green.
- [ ] **Step 5: verify types** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors.

### Task 2: i18n messages (it/ro/en/de)

**Files:**

- Modify: `messages/it.json`, `messages/ro.json`, `messages/en.json`, `messages/de.json`

**Interfaces:**

- Consumes: Task 1's `ColorId` values (one message key per color, including teal for accessibility labels).
- Produces: the 19 new keys below in all four locales, consumed by Tasks 4, 6. The existing parity test (`src/lib/i18n.test.ts`) enforces identical key sets and identical `{placeholder}` sets.

- [ ] **Step 1: add the keys.** Exact values (add inside each JSON object; keep existing keys untouched):

| Key                     | it                                     | ro                                       | en                                     | de                                            |
| ----------------------- | -------------------------------------- | ---------------------------------------- | -------------------------------------- | --------------------------------------------- |
| `game_color_match_name` | Trova il colore                        | Găsește culoarea                         | Color Match                            | Farben finden                                 |
| `game_color_match_desc` | Trova il palloncino del colore giusto. | Găsește balonul cu culoarea potrivită.   | Find the balloon with the right color. | Finde den Luftballon mit der richtigen Farbe. |
| `color_question`        | Quale palloncino è {color}?            | Care balon este {color}?                 | Which balloon is {color}?              | Welcher Luftballon ist {color}?               |
| `color_tap`             | Tocca il palloncino giusto             | Atinge balonul potrivit                  | Tap the right balloon                  | Tippe den richtigen Luftballon an             |
| `color_hint_nudge`      | Guarda bene… trova lo stesso colore.   | Privește atent… găsește aceeași culoare. | Look closely… find the same color.     | Schau genau… finde die gleiche Farbe.         |
| `color_hint_strong`     | Quasi! Quale palloncino è uguale?      | Aproape! Care balon se potrivește?       | Almost! Which balloon matches?         | Fast! Welcher Luftballon passt?               |
| `color_hint_reveal`     | È {color}! Toccalo.                    | Este {color}! Atinge-l.                  | It's {color}! Tap it.                  | Es ist {color}! Tippe ihn an.                 |
| `color_red`             | rosso                                  | roșu                                     | red                                    | rot                                           |
| `color_yellow`          | giallo                                 | galben                                   | yellow                                 | gelb                                          |
| `color_blue`            | blu                                    | albastru                                 | blue                                   | blau                                          |
| `color_green`           | verde                                  | verde                                    | green                                  | grün                                          |
| `color_orange`          | arancione                              | portocaliu                               | orange                                 | orange                                        |
| `color_purple`          | viola                                  | mov                                      | purple                                 | lila                                          |
| `color_pink`            | rosa                                   | roz                                      | pink                                   | rosa                                          |
| `color_light_blue`      | azzurro                                | albastru deschis                         | light blue                             | hellblau                                      |
| `color_dark_blue`       | blu scuro                              | albastru închis                          | dark blue                              | dunkelblau                                    |
| `color_light_green`     | verde chiaro                           | verde deschis                            | light green                            | hellgrün                                      |
| `color_dark_green`      | verde scuro                            | verde închis                             | dark green                             | dunkelgrün                                    |
| `color_teal`            | turchese                               | turcoaz                                  | teal                                   | türkis                                        |

Color names stay **lowercase** — they are injected into sentences ("ist {color}?"). The reveal templates use the bare predicative form so every language stays grammatical ("Es ist rot!", "È rosso!").

- [ ] **Step 2: verify** — `pnpm exec vitest run src/lib/i18n.test.ts` → parity passes; `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors.

### Task 3: Color session module

**Files:**

- Create: `src/lib/games/color-match/session.svelte.ts`

**Interfaces:**

- Consumes: Task 1's `generateLevel`, `getLevelConfig`, `hintStage`, `Round`, `ColorId`.
- Produces (exact, consumed by Task 6): mirror `src/lib/games/counting/session.svelte.ts` (read it first) with the counting-specific parts removed (no `counted` set, no `tapFruit`, no `assist`):

```ts
export type ColorPhase = 'playing' | 'celebrating' | 'complete';
export interface ColorSession {
	readonly rounds: Round[];
	readonly roundIndex: number;
	readonly misses: number;
	readonly manualHints: number;
	readonly phase: ColorPhase;
	readonly round: Round;
	readonly hint: 0 | 1 | 2 | 3;
	readonly isLast: boolean;
	answer(color: ColorId): boolean; // wrong → misses++ and false; correct → phase 'celebrating' and true; ignored unless phase 'playing'
	help(): void; // manualHints++, only while playing
	markIdle(): void; // idle = true while playing
	advance(): void; // 'celebrating' → next round (resets misses/hints/idle) or 'complete'
	replay(): void; // fresh generateLevel(level), same level
}
export function createColorSession(level: number): ColorSession;
```

Pure state transitions only — the page owns every timer (idle nudge, celebrate delay, wrong flash). No timers, no DOM, no audio inside.

- [ ] **Step 1: implement** the factory with `$state` runes exactly as specified; `get round()` returns `rounds[roundIndex]` (cast like Counting does).
- [ ] **Step 2: verify** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors.

### Task 4: Level map route + home tile icon

**Files:**

- Create: `src/routes/play/color-match/+page.svelte` (level map)
- Modify: `src/routes/+page.svelte` (home tile icon branch only)

**Interfaces:**

- Consumes: Tasks 1 (registry), 2 (messages); save module (`loadSave`, `getCleared`, `isLevelOpen`, `MAX_LEVEL`); `Muguri`, `IconButton`; audio singleton. Reference: `src/routes/play/counting/+page.svelte` (mirror its structure, copy adapted — same states, same interactions).
- Produces: navigable map for `gameId 'color-match'`; home tile shows a balloon icon for `game.icon === 'color'`.

- [ ] **Step 1: map page.** Mirror Counting's map page with `gameId 'color-match'`, title `m.game_color_match_name()` + desc `m.game_color_match_desc()`, `Muguri pose="idle"`, back → `/`, `audio.playMusic('game')` on mount, ten level tiles (locked/open/done + `new` pill on `cleared + 1`, locked tap → wiggle + `m.locked_detail({ n })`, open tap → `goto('/play/color-match/' + n)`), progress line `m.progress({ done })`. Done-tiles keep the leaf gradient treatment; open tiles the mint treatment (same CSS as Counting's map).
- [ ] **Step 2: home icon branch.** In `src/routes/+page.svelte`, import `Balloon` and change the tile icon block to: `{#if game.icon === 'fruit'}<Fruit kind="apple" size={64} />{:else if game.icon === 'color'}<Balloon color="red" size={64} />{:else}<Fruit kind="apple" size={64} />{/if}`.
- [ ] **Step 3: verify** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors.

### Task 5: Balloon art component — **artist: DeepSeek V4.1 Flash**

**Files:**

- Create: `src/lib/components/art/Balloon.svelte`

**Interfaces:**

- Consumes: Task 1's `ColorId`; `ART-STYLE.md` (face grammar, palette intent, techniques); `Fruit.svelte` (read for the face grammar and inline-hex pattern).
- Produces (consumed by Tasks 4, 6): props `{ color: ColorId; size?: number (default 96); mood?: 'plain' | 'happy' | 'sad' (default 'happy'); class?: string }`.

**Art brief:**

- Static SVG like `Fruit.svelte` (motion lives on the container button, not here): balloon body (soft ellipse), knot (small triangle), curly string (thin stroke path), top-left highlight; `aria-hidden="true"`, `focusable="false"`, `viewBox="0 0 100 100"`.
- Internal `PALETTE: Record<ColorId, { body: string; deep: string; highlight: string }>` — 12 entries, inline hexes in SVG attributes. Garden-friendly per `ART-STYLE.md` (not neon): red reads red (not pink), yellow warm gold, blue a true blue (new to the app), green leaf-family, orange accent-family, purple a soft violet (new), pink berry-pink; **light/dark pairs must genuinely read lighter/deeper**; teal must sit clearly between blue and green yet stay distinct from both.
- Face grammar exactly per `ART-STYLE.md`: `happy` = ink-dot eyes with spark highlights + arc smile + blush; `sad` = tilted brows, droop, frown, one sky-blue tear; `plain` = no expressive features.
- Must read at 28 px (silhouette) and stay charming at 512 px. No SVG filters; gradients allowed.

- [ ] **Step 1: implement** `Balloon.svelte` per the brief.
- [ ] **Step 2: verify** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors. Report the final 12-color hex table (old→new not applicable; list final values) so the orchestrator can review them against the curriculum's light/deep intent.

### Task 6: Field route — the game screen

**Files:**

- Create: `src/routes/play/color-match/[level]/+page.svelte`

**Interfaces:**

- Consumes: Tasks 1–5 (rules, session, messages, `Balloon`, registry); save module; `Sparkles`, `LevelComplete`, `Confetti`, `Muguri`, `IconButton`, `MuteButton`; audio singleton. Reference: `src/routes/play/counting/[level]/+page.svelte` (mirror its structure and behaviors — header, dots, prompt, help button, idle timer, hint bubble, wrong/correct flow, celebration, unlock).
- Produces: the complete playable loop for one level.

**Behaviors to pin:**

- **Route validation:** parse `level` (1..10); if invalid or `!isLevelOpen(getCleared(save, profileId, 'color-match'), level)` → `goto('/play/color-match')`.
- **Top bar:** back → map, `m.level({ n })`, `MuteButton`; five progress dots (filled per solved round).
- **Prompt row:** `Muguri pose="hint"` + `<Balloon color={round.target} size={96} mood="happy" />` + question `m.color_question({ color: colorName(round.target) })`; help button (Muguri head `IconButton`) → `session.help()` + `playSfx('hint')`.
- **Field:** garden field background copied from Counting's (gradient + ground shade + swaying tufts — decorations stay `aria-hidden`, `pointer-events:none`, non-countable). One `<button>` per balloon spot: absolutely positioned at `--x`/`--y` %, `transform: translate(-50%,-50%) rotate(tilt)`, `animation-delay: calc(var(--cn-stagger) * delay)` on the bob; hit area ≥ 64 px; `aria-label={colorName(spot.color)}`; contains `<Balloon color={spot.color} size={88 * spot.size} mood={moodFor(spot.color)} />` where `moodFor` returns `'sad'` for the wrong-tapped balloon during its ~1 s flash and `'happy'` otherwise.
- **colorName(id):** maps `ColorId` → the right `m.color_*()` message (include `color_teal`).
- **Correct tap:** `playSfx('correct')`, `Sparkles` at the balloon, tapped balloon + target balloon `happy` + overshoot bounce (reuse the existing overshoot tokens), `m.correct()`, then `advance()` after ~1100 ms (same as Counting). Phase guards make extra taps inert.
- **Wrong tap:** that balloon `sad` + wiggle 400 ms, `playSfx('wrong')`, `misses++` (inside `answer`), then mood back to `happy` after ~1 s — retry always possible, never punishing, never red.
- **Hints:** Muguri hint bubble under the prompt showing `color_hint_nudge` / `color_hint_strong` / `color_hint_reveal({ color })` per `session.hint`; stage ≥ 2 → the correct balloon gets a glow ring (accent halo, like `bubble--glow`); stage 3 → pulse. Never mark more than the one correct balloon.
- **Idle timer:** 10 s without interaction → `markIdle()` (reset each round and on any tap).
- **Level complete:** on the last round's `advance()` → `phase 'complete'`: `clearLevel(save, profileId, 'color-match', level)` + persist + `playSfx('unlock')` + `LevelComplete` overlay (next → next level if ≤ 10, replay, all levels → map).
- **Bottom line:** `m.color_tap()`; `audio.playMusic('game')` on mount.

- [ ] **Step 1: implement** the page per the pinned behaviors (mirror Counting's file structure and CSS conventions; reuse its field/prompt styles adapted to balloons).
- [ ] **Step 2: verify** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors.

### Task 7: Polish, browser verification, docs

**Files:**

- Modify: `ART-STYLE.md` (asset map: add the Balloon row)
- Modify: `README.md` (games list line, if it enumerates games — check first)
- Modify: `docs/superpowers/specs/2026-10-11-color-match-design.md` (flip status to shipped)

**Interfaces:**

- Consumes: everything.

- [ ] **Step 1: browser pass (orchestrator):** home shows two tiles (balloon icon, berry accent) + placeholder; play L1: wrong tap → sad + wiggle → retry; hint glow after 2 misses; correct → bounce + sparkles + "Yes!"; five rounds → LevelComplete + confetti → unlock; map shows L2 "New!"; deep-link `/play/color-match/7` → map; 4-language spot check of the question strings; 320 px width check of the longest strings; airplane-mode reload sanity.
- [ ] **Step 2: screenshots** at the size ladder (28/64/120/512) + in-game stills for owner review.
- [ ] **Step 3: docs** — `ART-STYLE.md` asset map gains `Balloon.svelte (12 colors × 3 moods)`; spec status → shipped; README games line updated if present.
- [ ] **Step 4: authoritative gate** — `pnpm check` / `pnpm test` / `pnpm build` / `pnpm lint` all green; commit naming the artist.

---

## Deliberately deferred

- Voice narration (milestone 1.5) — message keys stay structured for later mapping.
- Balloon patterns for color-blind redundancy (luminance separation + names ship instead).
- Drag interaction, stars/badges, games 3–7, remote sync, analytics — out of scope.

## Owner directives (amendments carried from milestone 1)

- **Graphics/art tasks dispatch to DeepSeek V4.1 Flash** (`opencode-go/deepseek-v4.1-flash`, paid) — owner-certified via _Wurstel e Sogni_; Muse Spark 1.3 only on request; every asset report names its artist.
- **Color Match owner decisions:** core interaction = **tap the match**; objects = **balloons** (Muguri presents the target).
- **Beauty pass assets available:** overshoot/squash/stagger motion tokens (`--cn-ease-overshoot`, `--cn-ease-snap`, `--cn-t-arrive`, `--cn-t-pop`, `--cn-stagger`) and the sunlit-garden palette; `ART-STYLE.md` is the standing art bible.

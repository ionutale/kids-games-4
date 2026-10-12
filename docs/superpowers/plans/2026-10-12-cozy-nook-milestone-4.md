# Cozy Nook — Milestone 4 Implementation Plan: Feelings Faces

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking. **Orchestrator-adapted:** implementers never run git commands; the orchestrator runs the authoritative gate and commits each validated task.

**Goal:** Ship Feelings Faces — game #4 of Cozy Nook: ten levels of emotional recognition (match → situation → subtle) for ages 4–7, in four languages, riding on the existing shell.

**Architecture:** One new pure module (`feelings-faces/rules.ts`, seeded and unit-tested like the family), a thin runes session, two route pages mirroring the family, three art pieces (`Muguri` gains poses, new `Mimo.svelte`, new `FeelingScene.svelte`), one registry entry — progress already keys by gameId.

**Tech Stack:** unchanged — SvelteKit 3 · Svelte 5 (runes) · TypeScript strict · Vite 8 · Vitest 4 · pnpm · Paraglide i18n (it/ro/en/de) · procedural WebAudio.

**Spec:** docs/superpowers/specs/2026-10-12-feelings-faces-design.md

## Global Constraints

- Node ≥ 26. **pnpm only.** Svelte 5 **runes mode**; imports via `#lib/<path>.js` (never `$lib`); messages via `{ m }` from `#lib/paraglide/messages.js`.
- **User-visible strings only via Paraglide messages.** No network at runtime; localStorage only; no new dependencies; no new music (reuse sfx + scenes).
- **Art per `ART-STYLE.md`**; SVG inline hexes; no filters; gradients allowed.
- Tokens `var(--cn-*)` in CSS; tap targets ≥ 56 px (face buttons + scene ≥ 64 px); `prefers-reduced-motion` respected; decorations never countable.
- **Do not** run git commands, add dependencies, touch files outside your task's list, or dispatch subagents.
- **Verification:** implementers verify with `pnpm exec svelte-check --tsconfig ./tsconfig.json` (0 errors) + targeted `pnpm exec vitest run <file>` where tests exist. The orchestrator runs the authoritative gate per wave and commits.
- Reference projects read-only (`kids-games-3`, `restaurant-manager-game`).

## Review Focus

1. **Expression integrity:** a wrong tap wiggles the chosen face but **never changes any face's expression** — the expression is the game's content (Task 7).
2. **Confusable pairs:** below L8 no round contains two options from the same confusable pair (scared+surprised · angry+sad · sleepy+happy); L8+ uses them deliberately (Task 1 tests).
3. **Text fit:** the longest strings ("Schau das Gesicht an und finde das passende Gefühl.", "Come si sente il topo?", "Privește fața și găsește emoția potrivită.") render unclipped at 320 px (Tasks 2, 6, 7).
4. **Reduced motion:** family animations neutered; no state depends on `animationend` (Task 7).
5. **Locked deep-link:** `/play/feelings-faces/7` with no progress lands safely on the level map (Task 7; browser check Task 8).

---

### Task 1: Feelings rules + registry entry

**Files:**

- Create: `src/lib/games/feelings-faces/rules.ts`, `src/lib/games/feelings-faces/rules.test.ts`
- Modify: `src/lib/games/registry.ts`, `src/lib/games/registry.test.ts`

**Interfaces:**

- Consumes: family patterns from the existing game rules (`src/lib/games/counting/rules.ts`, `color-match/rules.ts`, `acorn-add/rules.ts` — read them). Local `mulberry32` copy; no cross-game imports.
- Produces (exact, consumed by Tasks 3, 4, 5, 6, 7):

```ts
export type EmotionId = 'happy' | 'sad' | 'angry' | 'scared' | 'surprised' | 'sleepy';
export type WhoId = 'muguri' | 'mimo';
export type FaceMode = 'match' | 'situation' | 'subtle' | 'mixed';
export type SceneId =
	| 'balloon-away'
	| 'fallen-icecream'
	| 'gift'
	| 'storm'
	| 'spilled-cup'
	| 'broken-toy'
	| 'hug'
	| 'bedtime'
	| 'pop-out';

export const SCENE_EMOTION: Record<SceneId, EmotionId> = {
	'balloon-away': 'sad',
	'fallen-icecream': 'sad',
	gift: 'happy',
	storm: 'scared',
	'spilled-cup': 'angry',
	'broken-toy': 'angry',
	hug: 'happy',
	bedtime: 'sleepy',
	'pop-out': 'surprised'
};

/** Pairs that are deliberately confusable — separated below L8, the point at L8+. */
export const CONFUSABLE: EmotionId[][] = [
	['scared', 'surprised'],
	['angry', 'sad'],
	['sleepy', 'happy']
];

export interface FeelingsLevelConfig {
	level: number;
	mode: FaceMode;
	choices: number;
	targets: EmotionId[]; // emotions that may be the round's target
	emotions: EmotionId[]; // emotions that may appear among the choices (superset of targets)
	scenes: SceneId[]; // scenes that may appear (empty in match mode)
}

export const MAX_LEVEL = 10;
export const ROUNDS_PER_LEVEL = 5;
export const LEVELS: FeelingsLevelConfig[] = [
	{
		level: 1,
		mode: 'match',
		choices: 2,
		targets: ['happy', 'sad'],
		emotions: ['happy', 'sad'],
		scenes: []
	},
	{
		level: 2,
		mode: 'match',
		choices: 3,
		targets: ['happy', 'sad', 'angry'],
		emotions: ['happy', 'sad', 'angry'],
		scenes: []
	},
	{
		level: 3,
		mode: 'situation',
		choices: 3,
		targets: ['happy', 'sad', 'angry'],
		emotions: ['happy', 'sad', 'angry'],
		scenes: ['gift', 'hug', 'balloon-away', 'fallen-icecream', 'spilled-cup', 'broken-toy']
	},
	{
		level: 4,
		mode: 'situation',
		choices: 3,
		targets: ['happy', 'sad', 'angry', 'scared'],
		emotions: ['happy', 'sad', 'angry', 'scared'],
		scenes: ['gift', 'hug', 'balloon-away', 'fallen-icecream', 'spilled-cup', 'broken-toy', 'storm']
	},
	{
		level: 5,
		mode: 'situation',
		choices: 3,
		targets: ['happy', 'sad', 'angry', 'scared', 'surprised', 'sleepy'],
		emotions: ['happy', 'sad', 'angry', 'scared', 'surprised', 'sleepy'],
		scenes: [
			'gift',
			'hug',
			'balloon-away',
			'fallen-icecream',
			'spilled-cup',
			'broken-toy',
			'storm',
			'bedtime',
			'pop-out'
		]
	},
	{
		level: 6,
		mode: 'situation',
		choices: 4,
		targets: ['happy', 'sad', 'angry', 'scared', 'surprised', 'sleepy'],
		emotions: ['happy', 'sad', 'angry', 'scared', 'surprised', 'sleepy'],
		scenes: [
			'gift',
			'hug',
			'balloon-away',
			'fallen-icecream',
			'spilled-cup',
			'broken-toy',
			'storm',
			'bedtime',
			'pop-out'
		]
	},
	{
		level: 7,
		mode: 'situation',
		choices: 4,
		targets: ['happy', 'sad', 'angry', 'scared', 'surprised', 'sleepy'],
		emotions: ['happy', 'sad', 'angry', 'scared', 'surprised', 'sleepy'],
		scenes: [
			'gift',
			'hug',
			'balloon-away',
			'fallen-icecream',
			'spilled-cup',
			'broken-toy',
			'storm',
			'bedtime',
			'pop-out'
		]
	},
	{
		level: 8,
		mode: 'subtle',
		choices: 3,
		targets: ['scared', 'surprised'],
		emotions: ['scared', 'surprised', 'sleepy'],
		scenes: ['storm', 'pop-out']
	},
	{
		level: 9,
		mode: 'subtle',
		choices: 4,
		targets: ['angry', 'sad', 'sleepy', 'happy'],
		emotions: ['angry', 'sad', 'sleepy', 'happy'],
		scenes: ['spilled-cup', 'broken-toy', 'balloon-away', 'bedtime', 'gift', 'hug']
	},
	{
		level: 10,
		mode: 'mixed',
		choices: 4,
		targets: ['happy', 'sad', 'angry', 'scared', 'surprised', 'sleepy'],
		emotions: ['happy', 'sad', 'angry', 'scared', 'surprised', 'sleepy'],
		scenes: [
			'gift',
			'hug',
			'balloon-away',
			'fallen-icecream',
			'spilled-cup',
			'broken-toy',
			'storm',
			'bedtime',
			'pop-out'
		]
	}
];

export interface Round {
	target: EmotionId; // the emotion to find
	who: WhoId; // the character shown (target face + all options)
	scene: SceneId | null; // null in match mode
	options: EmotionId[]; // exactly `choices` distinct emotions incl. target
}

export function getLevelConfig(level: number): FeelingsLevelConfig | undefined;
export function generateLevel(level: number, seed?: number): Round[];
export function pickScenes(config: FeelingsLevelConfig, rand: () => number): (SceneId | null)[];
export function makeOptions(
	config: FeelingsLevelConfig,
	target: EmotionId,
	rand: () => number
): EmotionId[];
export function hintStage(misses: number, manualHints: number, idle: boolean): 0 | 1 | 2 | 3; // family thresholds
```

Registry: `export type GameId = 'counting' | 'color-match' | 'acorn-add' | 'feelings-faces';`, `icon: 'fruit' | 'color' | 'logic' | 'face'`, and append `{ id: 'feelings-faces', titleKey: 'game_feelings_name', descKey: 'game_feelings_desc', href: '/play/feelings-faces', accent: 'leaf', icon: 'face' }`.

**Rules decisions to pin in the implementation:**

- `pickScenes`: match mode → five `null`s. Otherwise five scenes from a shuffled bag of `config.scenes` — **no consecutive repeats**; unique when the pool ≥ 5.
- `makeOptions`: exactly `config.choices` distinct emotions incl. the target. **Modes `match` and `situation`: no two options may come from the same `CONFUSABLE` pair** (widen to `config.emotions` first; if impossible, keep the strongest constraint and fill best-effort). Mode `subtle`: the target's confusable partner **must be included** whenever the partner is in the choice pool (true for every L8–9 target). Mode `mixed`: any distinct emotions allowed.
- `who`: alternate `'muguri'` / `'mimo'` across the five rounds for L1–6; L7+ random per round (seeded).
- `generateLevel`: default seed `level * 1013`; deterministic; `target = SCENE_EMOTION[scene]` in scene modes; round 1 of a level may not repeat the level's first emotion as its own target twice etc. — keep the family rule: **no consecutive repeated target**.

- [ ] **Step 1: write the failing tests** (`rules.test.ts`): LEVELS shape (10 rows; modes/choices/targets/emotions/scenes per the table; `targets ⊆ emotions`; L8 targets are the subtle pair only); `SCENE_EMOTION` completeness (all 9 scenes mapped); `makeOptions` — length, distinctness, target present; **no same-pair options for match/situation levels**; subtle includes the partner; `pickScenes` — match → nulls; scene levels no consecutive repeats, unique when pool ≥ 5; `generateLevel` — 5 rounds, determinism (`generateLevel(5, 1234)` twice deep-equals), targets match scenes in scene modes, no consecutive repeated target, `who` alternates on L1–6; `hintStage` boundaries. Registry: three-entry `toEqual` becomes four; `getGame('feelings-faces')` returns the new entry.
- [ ] **Step 2: run the tests to verify they fail** — `pnpm exec vitest run src/lib/games/feelings-faces/rules.test.ts src/lib/games/registry.test.ts`.
- [ ] **Step 3: implement** `rules.ts` + registry changes (exact values above).
- [ ] **Step 4: run the tests to verify they pass** — same command → green.
- [ ] **Step 5: verify types** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors.

### Task 2: i18n messages (it/ro/en/de)

**Files:**

- Modify: `messages/it.json`, `messages/ro.json`, `messages/en.json`, `messages/de.json`

**Interfaces:**

- Consumes: nothing new; `correct`, `try_again`, `level_complete`, `next_level`, `play_again`, `all_levels`, `new`, `locked`, `locked_detail`, `progress`, `choose_level`, `back`, `play` are reused.
- Produces: the 16 keys below in all four locales (parity test enforces key/placeholder sets).

- [ ] **Step 1: add the keys** (exact values; add after the acorn keys; keep formatting untouched):

| Key                    | it                                          | ro                                         | en                                              | de                                                  |
| ---------------------- | ------------------------------------------- | ------------------------------------------ | ----------------------------------------------- | --------------------------------------------------- |
| `game_feelings_name`   | Facce ed emozioni                           | Fețe și emoții                             | Feelings Faces                                  | Gesichter und Gefühle                               |
| `game_feelings_desc`   | Guarda la faccia e trova l'emozione giusta. | Privește fața și găsește emoția potrivită. | Look at the face and find the matching feeling. | Schau das Gesicht an und finde das passende Gefühl. |
| `feelings_match`       | Trova la stessa faccia!                     | Găsește aceeași față!                      | Find the same face!                             | Finde das gleiche Gesicht!                          |
| `feelings_question`    | Come si sente {who}?                        | Cum se simte {who}?                        | How does {who} feel?                            | Wie fühlt sich {who}?                               |
| `feelings_who_muguri`  | Muguri                                      | Muguri                                     | Muguri                                          | Muguri                                              |
| `feelings_who_mouse`   | il topo                                     | șoricelul                                  | the mouse                                       | die Maus                                            |
| `feelings_tap`         | Tocca la faccia giusta                      | Atinge fața potrivită                      | Tap the right face                              | Tippe das richtige Gesicht an                       |
| `feelings_hint_nudge`  | Guarda gli occhi e la bocca.                | Uită-te la ochi și la gură.                | Look at the eyes and the mouth.                 | Schau auf die Augen und den Mund.                   |
| `feelings_hint_strong` | Quasi! Quale faccia è giusta?               | Aproape! Care față se potrivește?          | Almost! Which face fits?                        | Fast! Welches Gesicht passt?                        |
| `feelings_hint_reveal` | È {emotion}! Toccala.                       | Este {emotion}! Atinge-o.                  | It's {emotion}! Tap it.                         | Es ist {emotion}! Tippe es an.                      |
| `feelings_happy`       | felice                                      | fericit                                    | happy                                           | glücklich                                           |
| `feelings_sad`         | triste                                      | trist                                      | sad                                             | traurig                                             |
| `feelings_angry`       | arrabbiato                                  | supărat                                    | angry                                           | wütend                                              |
| `feelings_scared`      | spaventato                                  | speriat                                    | scared                                          | ängstlich                                           |
| `feelings_surprised`   | sorpreso                                    | surprins                                   | surprised                                       | überrascht                                          |
| `feelings_sleepy`      | assonnato                                   | somnoros                                   | sleepy                                          | müde                                                |

Notes: emotion names are lowercase (sentence-injected and used as labels); `{who}` and `{emotion}` placeholders must survive all locales; both characters are masculine in it/ro (Muguri, il topo / șoricelul), so the emotion adjectives agree.

- [ ] **Step 2: verify** — `pnpm exec vitest run src/lib/i18n.test.ts` (parity green); `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors.

### Task 3: Feelings session module

**Files:**

- Create: `src/lib/games/feelings-faces/session.svelte.ts`

**Interfaces:**

- Consumes: Task 1's `generateLevel`, `hintStage`, `Round`, `EmotionId`.
- Produces (exact, consumed by Task 7): mirror `src/lib/games/acorn-add/session.svelte.ts`:

```ts
export type FeelingsPhase = 'playing' | 'celebrating' | 'complete';
export interface FeelingsSession {
	readonly rounds: Round[];
	readonly roundIndex: number;
	readonly misses: number;
	readonly manualHints: number;
	readonly phase: FeelingsPhase;
	readonly round: Round;
	readonly hint: 0 | 1 | 2 | 3;
	readonly isLast: boolean;
	answer(emotion: EmotionId): boolean; // wrong → misses++/false; correct → 'celebrating'/true; only while 'playing'
	help(): void;
	markIdle(): void;
	advance(): void;
	replay(): void;
}
export function createFeelingsSession(level: number): FeelingsSession;
```

Pure state transitions; the page owns every timer.

- [ ] **Step 1: implement** the factory exactly as specified.
- [ ] **Step 2: verify** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors.

### Task 4: Muguri's new poses + Mimo.svelte — **artist: DeepSeek V4.1 Flash**

**Files:**

- Modify: `src/lib/components/art/Muguri.svelte` (add 4 poses; do not touch existing ones)
- Create: `src/lib/components/art/Mimo.svelte`

**Interfaces:**

- Consumes: `ART-STYLE.md`; the existing `Muguri.svelte` (read it); `Fruit.svelte`/`Balloon.svelte`/`Acorn.svelte` for the face grammar.
- Produces (consumed by Tasks 6, 7):
  - `Muguri` pose union grows to `'idle' | 'hint' | 'cheer' | 'sleepy' | 'sad' | 'angry' | 'scared' | 'surprised'`.
  - `Mimo.svelte` props `{ pose?: 'idle' | 'happy' | 'sad' | 'angry' | 'scared' | 'surprised' | 'sleepy' (default 'idle'); size?: number (default 120); class?: string }`.

**Art brief (both):**

- **Expression grammar** (face-focused, consistent across both characters): `happy` = sparkle eyes + big arc smile + blush · `sad` = inner-up tilted brows, droop, frown, one sky-blue tear · `angry` = inner-down slanted brows, pressed wavy mouth, slight red-ish blush · `scared` = wide eyes (bigger irises), small open "o" mouth, raised brows · `surprised` = wide eyes, round open mouth, high brows, tiny motion ticks · `sleepy` = closed happy arcs + small "z" or droop. Keep silhouettes recognizable at 28 px.
- **Mimo**: a small round mouse — grey-blue or warm grey body per the garden palette, big ears, thin tail, face-forward; matches Muguri's line weight and shading recipe. All 7 poses.
- Static SVG like `Fruit.svelte` (no animations inside); `aria-hidden`, `focusable="false"`, `viewBox="0 0 100 100"` (Mimo may use `0 0 120 120` if the ears/tail need room — keep Muguri's canvas).
- No filters; gradients allowed; inline hexes.

- [ ] **Step 1: implement** the four new Muguri poses (existing pose markup untouched) and `Mimo.svelte`.
- [ ] **Step 2: verify** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors; report the new pose list + Mimo's hex palette; eyeball both at 28/64/120/512 px.

### Task 5: FeelingScene.svelte — **artist: DeepSeek V4.1 Flash**

**Files:**

- Create: `src/lib/components/art/FeelingScene.svelte`

**Interfaces:**

- Consumes: `ART-STYLE.md`; `SceneId` from `#lib/games/feelings-faces/rules.js` (Task 1).
- Produces (consumed by Task 7): props `{ scene: SceneId; size?: number (default 120); class?: string }` — one small flat vignette per id, object-based, no characters, no text.

**Art brief:**

- Nine vignettes in one component (`{#if scene === '...'}` branches or a lookup): `balloon-away` (balloon drifting up + motion ticks) · `fallen-icecream` (tipped cone, scoop on the ground) · `gift` (wrapped box + bow) · `storm` (cloud + lightning + drops) · `spilled-cup` (tipped cup + puddle) · `broken-toy` (cracked wooden block/toy split) · `hug` (two abstract round friends leaning together) · `bedtime` (moon + pillow + zzz) · `pop-out` (jack-in-the-box mid-pop).
- Same soft garden palette and line weight as the other art; readable at 64 px; nothing countable-looking (the vignettes are content, so shapes are allowed — keep them object-like, not creature-like).
- Static SVG; `aria-hidden`; `viewBox="0 0 100 100"`; inline hexes; no filters.

- [ ] **Step 1: implement** all nine scenes.
- [ ] **Step 2: verify** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors; report the scene list + palette; eyeball at 64/120 px.

### Task 6: Level map route + home tile

**Files:**

- Create: `src/routes/play/feelings-faces/+page.svelte`
- Modify: `src/routes/+page.svelte` (icon branch + TITLES/DESCS maps)

**Interfaces:**

- Consumes: Tasks 1, 2; save module; `Muguri`, `IconButton`. Reference: `src/routes/play/acorn-add/+page.svelte` (mirror it).
- Produces: map for `gameId 'feelings-faces'`; home tile complete.

- [ ] **Step 1: map page** — mirror the acorn map with `gameId 'feelings-faces'`, `m.game_feelings_name()` / `m.game_feelings_desc()`, `Muguri pose="idle"`, ten tiles, same states/interactions.
- [ ] **Step 2: home tile** — add the branch `{:else if game.icon === 'face'}<Muguri pose="cheer" size={64} />` and the `TITLES`/`DESCS` map entries (`game_feelings_name` / `game_feelings_desc`).
- [ ] **Step 3: verify** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors.

### Task 7: Field route — the game screen

**Files:**

- Create: `src/routes/play/feelings-faces/[level]/+page.svelte`

**Interfaces:**

- Consumes: Tasks 1–5; save module; `Sparkles`, `LevelComplete`, `Muguri`, `Mimo`, `FeelingScene`, `IconButton`, `MuteButton`; audio singleton. Reference: `src/routes/play/acorn-add/[level]/+page.svelte` (mirror its structure and behaviors).
- Produces: the complete playable loop.

**Behaviors to pin:**

- **Route validation:** parse `level` (1..10); invalid or locked → `goto('/play/feelings-faces')`.
- **Prompt row:** `Muguri pose="hint"` (presenter) + mode-dependent prompt:
  - match: the **target face big** — `<Muguri pose={poseOf(round.target)} size={140} />` or `<Mimo pose={round.target} size={140} />` per `round.who` — plus `m.feelings_match()`.
  - situation/subtle/mixed (scene rounds): `<FeelingScene scene={round.scene} size={120} />` + `m.feelings_question({ who: whoName(round.who) })`.
  - help button (Muguri head `IconButton`) → `session.help()` + `playSfx('hint')`; hint bubble with `feelings_hint_nudge` / `feelings_hint_strong` / `feelings_hint_reveal({ emotion: emotionName(round.target) })`.
- **Option faces:** one `<button>` per option (≥ 64 px, aria-label = "Muguri — felice" style: `whoName + ' — ' + emotionName`) containing `<Muguri pose={poseOf(option)} size={88} />` or `<Mimo pose={option} size={88} />` — **all options show `round.who`'s faces** (the kid compares one character's expressions).
- **poseOf(emotion):** `happy → 'cheer'`, else the emotion name (`'sad' | 'angry' | 'scared' | 'surprised' | 'sleepy'`).
- **Correct:** `playSfx('correct')`, `Sparkles` at the chosen face, that face bounces (overshoot class), `m.correct()`, `advance()` after ~1100 ms.
- **Wrong: wiggle the chosen face ONLY — never change any expression** (expression integrity; the family's sad-mood swap does NOT apply here) + `playSfx('wrong')` + `m.try_again()`, retry stays possible.
- **Hints:** stage ≥ 2 → glow ring on the correct face button; stage 3 → pulse; never more than one.
- **Idle timer:** 10 s → `markIdle()`; reset each round and on any tap.
- **Level complete:** `clearLevel(save, profileId, 'feelings-faces', level)` + persist + `playSfx('unlock')` + `LevelComplete` overlay; five progress dots; back → map; `audio.playMusic('game')`; bottom line `m.feelings_tap()`.
- **Field decor:** the family's garden background (gradient + ground shade + swaying tufts), `aria-hidden`, non-countable.

- [ ] **Step 1: implement** the page per the pinned behaviors.
- [ ] **Step 2: verify** — `pnpm exec svelte-check --tsconfig ./tsconfig.json` → 0 errors.

### Task 8: Polish, browser verification, docs

**Files:**

- Modify: `ART-STYLE.md` (asset map: Mimo + FeelingScene rows; Muguri pose list)
- Modify: `docs/superpowers/specs/2026-10-12-feelings-faces-design.md` (status → shipped)

- [ ] **Step 1: browser pass (orchestrator):** home shows four games with correct names; play L1 (match mode) + a situation level + verify no expression changes on a wrong tap; hint reveal names the emotion; five rounds → LevelComplete → unlock; deep-link `/play/feelings-faces/7` → map; 4-language spot check; 320 px check of the longest strings; zero console errors.
- [ ] **Step 2: screenshots** — Muguri's four new poses + Mimo + all nine scenes at the size ladder; in-game stills (match round, situation round, wrong tap, celebration).
- [ ] **Step 3: docs** — ART-STYLE asset map + Muguri pose list updated; spec → shipped.
- [ ] **Step 4: authoritative gate** — `pnpm check` / `pnpm test` / `pnpm build` / `pnpm lint` green; commit naming the artists.

---

## Deliberately deferred

- Voice narration; multi-emotion scenes; more characters; new music; drag; games 5+.

## Owner directives (amendments carried)

- **Free-models-first protocol:** Muse Spark 1.3 Free / LongCat 2.5 Free / Step 5 Free (best fit per task); validate + reprompt on failure; **free quota exhausted → DeepSeek V4.1 Flash**. Art tasks → DeepSeek per the artist directive.
- **Feelings Faces owner decisions:** mechanic = **mixed progression**; cast = **Muguri + one friend** (the mouse, chosen so emotion adjectives agree in it/ro).

# Brush Along Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship game #6, a forgiving tracing game where the kid brushes along dotted guides and finishes a small garden scene that comes alive.

**Architecture:** Pure `rules.ts` owns stroke geometry (sampled polylines), segment painting, coverage and completion. A runes `session.svelte.ts` wraps one level's strokes. `BrushScene.svelte` draws the backdrop and payoff; `BrushBoard.svelte` owns the SVG surface and pointer input. The level route reuses the family shell (header, dots, save, LevelComplete, audio).

**Tech Stack:** SvelteKit 3 · Svelte 5 runes · TypeScript · Vitest · pnpm · static adapter · Paraglide i18n (en/it/ro/de)

**Spec:** `docs/superpowers/specs/2026-10-31-brush-along-design.md`

## Global Constraints

- Node engine is `24.x`; local dev runs on Node 26. Never change the engine or the lockfile.
- No new dependencies. No raster assets. Canvas is not used.
- Every new user-facing string exists in **all four** locales (`messages/en.json`, `it.json`, `ro.json`, `de.json`).
- Text is secondary: the game is playable with no reading.
- No timer, score, move limit, direction requirement, or failure state.
- `touch-action: none` only on the tracing surface, never on the page.
- Implementation subagents do **not** commit or push. The orchestrator commits after validation.
- Every task gate: `pnpm check` → 0/0, `pnpm test` → all pass, `pnpm build` → success, `pnpm lint` → clean.
- Do not edit files outside the task's file list; no unrelated reformatting.

## Review Focus

1. **Fast drags** — every sample between two pointer events must be painted, not just the endpoint. Pinned in Task 1 (`paintSegment` fast-segment test).
2. **Reverse tracing** — starting at the far end or switching direction mid-stroke must still complete. Pinned in Task 1 (direction test) and Task 2.
3. **Lift and resume** — coverage survives `pointerup`; a second stroke segment anywhere on the guide continues it. Pinned in Task 1 (resume test).
4. **Pointer leaves or cancels** — drawing must stop, no captured pointer or stuck "drawing" state. Pinned in Task 3's board handlers and the Task 5 browser pass.
5. **Touch scrolling** — the page must not scroll while a finger is tracing the board, but must scroll normally elsewhere; 4×5-style layouts fit at 390 px. Pinned in Task 3 (`touch-action: none` scoped) and Task 5's mobile check.

---

### Task 1: Stroke geometry and coverage rules

**Files:**

- Create: `src/lib/games/brush-along/rules.ts`
- Create: `src/lib/games/brush-along/rules.test.ts`

**Interfaces (later tasks rely on these exact names):**

```ts
export interface Vec2 {
	x: number;
	y: number;
}
export type SceneId =
	| 'rain'
	| 'grass'
	| 'fence'
	| 'ladder'
	| 'sun'
	| 'kite'
	| 'hills'
	| 'flower'
	| 'butterfly'
	| 'rainbow';
export interface Stroke {
	id: string;
	points: Vec2[];
	color: string;
	width: number;
	tolerance: number;
}
export interface SceneConfig {
	level: number;
	id: SceneId;
	strokes: Stroke[];
}

export const MAX_LEVEL = 10;
export const COMPLETION = 0.85;
export const DEFAULT_TOLERANCE = 7;
export const DEFAULT_WIDTH = 6;
export const SCENES: SceneConfig[];

export function levelScene(level: number): SceneConfig | undefined;
export function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number;
export function paintSegment(
	painted: readonly boolean[],
	stroke: Stroke,
	from: Vec2,
	to: Vec2
): boolean[];
export function coverage(painted: readonly boolean[]): number;
export function strokeComplete(painted: readonly boolean[], threshold?: number): boolean;

// Shape helpers, all in a 0–100 normalised space.
export function line(a: Vec2, b: Vec2): Vec2[];
export function curve(a: Vec2, c1: Vec2, c2: Vec2, b: Vec2): Vec2[];
export function arc(center: Vec2, radius: number, fromDeg: number, toDeg: number): Vec2[];
export function circle(center: Vec2, radius: number): Vec2[];
export function loop(center: Vec2, radius: number, turns?: number): Vec2[];
export function spiral(center: Vec2, r0: number, r1: number, turns: number): Vec2[];
```

- [ ] **Step 1: Write the failing rule tests**

Cover exactly these behaviors:

```ts
import { describe, expect, it } from 'vitest';
import {
	COMPLETION,
	DEFAULT_TOLERANCE,
	MAX_LEVEL,
	SCENES,
	arc,
	circle,
	coverage,
	curve,
	distanceToSegment,
	levelScene,
	line,
	loop,
	paintSegment,
	spiral,
	strokeComplete,
	type Stroke,
	type Vec2
} from './rules.js';

const stroke = (points: Vec2[]): Stroke => ({
	id: 'test',
	points,
	color: '#74a72f',
	width: 6,
	tolerance: 7
});

describe('shape helpers', () => {
	it('samples a line from end to end', () => {
		const points = line({ x: 10, y: 20 }, { x: 90, y: 20 });
		expect(points.length).toBeGreaterThan(40);
		expect(points[0]).toEqual({ x: 10, y: 20 });
		expect(points.at(-1)).toEqual({ x: 90, y: 20 });
	});
	it('keeps every sampled point on the 0-100 canvas', () => {
		for (const [kind, points] of [
			['arc', arc({ x: 50, y: 85 }, 44, 200, 340)],
			['circle', circle({ x: 50, y: 50 }, 20)],
			['loop', loop({ x: 50, y: 50 }, 12)],
			['spiral', spiral({ x: 25, y: 70 }, 2, 7, 2)]
		] as const) {
			for (const p of points) {
				expect(p.x).toBeGreaterThanOrEqual(-1);
				expect(p.x).toBeLessThanOrEqual(101);
				expect(p.y).toBeGreaterThanOrEqual(-1);
				expect(p.y).toBeLessThanOrEqual(101);
			}
			expect(points.length).toBeGreaterThan(20);
		}
	});
	it('closes a circle and keeps a curve smooth', () => {
		const points = circle({ x: 50, y: 50 }, 10);
		expect(points[0]).toEqual(points.at(-1));
		expect(
			curve({ x: 10, y: 50 }, { x: 30, y: 20 }, { x: 70, y: 80 }, { x: 90, y: 50 }).length
		).toBeGreaterThan(40);
	});
});

describe('distanceToSegment', () => {
	it('measures against the segment, not an endpoint', () => {
		expect(distanceToSegment({ x: 50, y: 60 }, { x: 0, y: 50 }, { x: 100, y: 50 })).toBeCloseTo(10);
		expect(distanceToSegment({ x: -10, y: 50 }, { x: 0, y: 50 }, { x: 100, y: 50 })).toBeCloseTo(
			10
		);
	});
});

describe('painting', () => {
	const s = stroke(line({ x: 0, y: 50 }, { x: 100, y: 50 }));
	it('paints samples within tolerance of the segment', () => {
		const painted = paintSegment(
			s.points.map(() => false),
			s,
			{ x: 0, y: 50 },
			{ x: 100, y: 50 }
		);
		expect(coverage(painted)).toBe(1);
		expect(strokeComplete(painted)).toBe(true);
	});
	it('paints the whole path in one fast segment', () => {
		const painted = paintSegment(
			s.points.map(() => false),
			s,
			{ x: 0, y: 50 },
			{ x: 100, y: 50 }
		);
		expect(painted.filter(Boolean).length).toBe(s.points.length);
	});
	it('does not paint far from the path', () => {
		const painted = paintSegment(
			s.points.map(() => false),
			s,
			{ x: 0, y: 80 },
			{ x: 100, y: 80 }
		);
		expect(coverage(painted)).toBe(0);
	});
	it('is direction-independent', () => {
		const painted = paintSegment(
			s.points.map(() => false),
			s,
			{ x: 100, y: 50 },
			{ x: 0, y: 50 }
		);
		expect(coverage(painted)).toBe(1);
	});
	it('keeps coverage when a stroke is lifted and resumed', () => {
		const half = paintSegment(
			s.points.map(() => false),
			s,
			{ x: 0, y: 50 },
			{ x: 50, y: 50 }
		);
		expect(coverage(half)).toBeLessThan(COMPLETION);
		const resumed = paintSegment(half, s, { x: 80, y: 50 }, { x: 100, y: 50 });
		expect(coverage(resumed)).toBeGreaterThan(coverage(half));
	});
	it('completes at 85 percent, not before', () => {
		const painted = s.points.map((_, i) => i < Math.floor(s.points.length * 0.8));
		expect(strokeComplete(painted)).toBe(false);
		const enough = s.points.map((_, i) => i < Math.ceil(s.points.length * COMPLETION));
		expect(strokeComplete(enough)).toBe(true);
	});
	it('handles an empty stroke without dividing by zero', () => {
		expect(coverage([])).toBe(0);
		expect(strokeComplete([])).toBe(false);
	});
});

describe('levels', () => {
	it('has ten scenes with 3-5 strokes', () => {
		expect(MAX_LEVEL).toBe(10);
		expect(SCENES).toHaveLength(10);
		for (const scene of SCENES) {
			expect(scene.strokes.length).toBeGreaterThanOrEqual(3);
			expect(scene.strokes.length).toBeLessThanOrEqual(5);
			expect(new Set(scene.strokes.map((s) => s.id)).size).toBe(scene.strokes.length);
		}
	});
	it('samples every stroke densely and keeps it on canvas', () => {
		for (const scene of SCENES)
			for (const s of scene.strokes) {
				expect(s.points.length).toBeGreaterThanOrEqual(20);
				expect(s.tolerance).toBe(DEFAULT_TOLERANCE);
				expect(s.color).toMatch(/^#[0-9a-f]{6}$/i);
			}
	});
	it('maps levels 1-10 and rejects the rest', () => {
		for (let level = 1; level <= MAX_LEVEL; level += 1)
			expect(levelScene(level)?.level).toBe(level);
		expect(levelScene(0)).toBeUndefined();
		expect(levelScene(11)).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/games/brush-along/rules.test.ts`
Expected: FAIL — cannot resolve `./rules.js`.

- [ ] **Step 3: Implement `rules.ts`**

- Sample each shape at roughly 1.2 points per unit with a minimum of 24 points; lines use linear interpolation, curves use the cubic formula, arcs/circles use polar sampling, loops use a circle multiplied by a small in/out modulation, spirals interpolate radius over `turns * 2π`.
- `distanceToSegment` uses the standard projection clamped to the segment.
- `paintSegment` returns a **new** boolean array; it marks every unpainted sample whose distance to the segment is `<= stroke.tolerance`. Never mutate the input.
- `coverage` returns `painted.filter(Boolean).length / painted.length`, or 0 for an empty array. `strokeComplete` uses `COMPLETION` by default.
- Scene definitions follow the spec's decomposition table exactly:
  - rain: 3 verticals x = 30/50/70, y 30→72, colour `#3f7fc4`
  - grass: 4 verticals x = 25/40/55/70, y 82→64, `#74a72f`
  - fence: 3 horizontals x 15→85 at y 45/57/69, `#8c6242`
  - ladder: rails x 42/58 y 22→82 plus rungs y 38/52/66, `#8c6242` (5 strokes)
  - sun: 4 rays from r 22 to r 40 at 45/135/225/315 degrees around (50, 52), `#f5b73c`
  - kite: 2 crossed frame lines inside the body plus a curved tail from (50, 56) through (44, 72) to (56, 84), `#e8871f`
  - hills: 3 long curves across the bottom, `#74a72f`
  - flower: stem curve (50, 78)→(50, 55), two leaf curves, circle centre (50, 45) r 5, `#c64f78`
  - butterfly: left wing loop (40, 46) r 9, right wing loop (60, 46) r 9, trail loop (50, 66) r 7, `#9a6bd4`
  - rainbow: arcs centre (50, 85) r 28/36/44 from 200° to 340° in red `#d63b2f`, gold `#f5b73c`, blue `#3f7fc4`; then a 2-turn spiral at (25, 70) r 2→7 in teal `#3fb3a4` (4 strokes)
- Every stroke uses `DEFAULT_TOLERANCE` and `DEFAULT_WIDTH`; the plan's test only checks tolerance, width is free but must be > 0.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/games/brush-along/rules.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the task gate**

Run: `pnpm check && pnpm test && pnpm build`
Expected: clean; all tests pass.

- [ ] **Step 6: Commit (orchestrator only)**

```bash
git add src/lib/games/brush-along/rules.ts src/lib/games/brush-along/rules.test.ts
git commit -m "feat(brush-along): add stroke geometry rules"
```

---

### Task 2: Session

**Files:**

- Create: `src/lib/games/brush-along/session.svelte.ts`
- Create: `src/lib/games/brush-along/session.test.ts`

**Interfaces:**

```ts
export type BrushPhase = 'tracing' | 'stroke-done' | 'celebrating' | 'complete';

export interface BrushSession {
	readonly scene: SceneConfig;
	readonly strokeIndex: number;
	readonly stroke: Stroke;
	readonly phase: BrushPhase;
	readonly painted: boolean[][];
	readonly coverage: number;
	readonly strokeDone: boolean;
	readonly helpCount: number;
	readonly idle: boolean;
	readonly hint: 0 | 1 | 2 | 3;
	readonly isLastStroke: boolean;
	paint(from: Vec2, to: Vec2): void;
	help(): void;
	markIdle(): void;
	advance(): void;
	finish(): void;
	replay(): void;
}
export function createBrushSession(level: number): BrushSession;
```

- [ ] **Step 1: Write the failing session tests**

```ts
import { describe, expect, it } from 'vitest';
import { COMPLETION } from './rules.js';
import { createBrushSession } from './session.svelte.js';

function paintAll(s: ReturnType<typeof createBrushSession>) {
	const pts = s.stroke.points;
	s.paint(pts[0]!, pts.at(-1)!);
}

describe('brush session', () => {
	it('starts on the first stroke in tracing', () => {
		const s = createBrushSession(1);
		expect(s.strokeIndex).toBe(0);
		expect(s.phase).toBe('tracing');
		expect(s.coverage).toBe(0);
	});
	it('tracks coverage and completes a stroke', () => {
		const s = createBrushSession(1);
		paintAll(s);
		expect(s.coverage).toBeGreaterThanOrEqual(COMPLETION);
		expect(s.strokeDone).toBe(true);
		expect(s.phase).toBe('stroke-done');
	});
	it('does not complete below the threshold', () => {
		const s = createBrushSession(1);
		const pts = s.stroke.points;
		s.paint(pts[0]!, pts[Math.floor(pts.length * 0.5)]!);
		expect(s.phase).toBe('tracing');
		expect(s.strokeDone).toBe(false);
	});
	it('ignores paint after the stroke is done', () => {
		const s = createBrushSession(1);
		paintAll(s);
		const before = s.painted[0]!.filter(Boolean).length;
		s.paint({ x: 0, y: 0 }, { x: 100, y: 100 });
		expect(s.painted[0]!.filter(Boolean).length).toBe(before);
	});
	it('advances to the next stroke and resets help', () => {
		const s = createBrushSession(1);
		s.help();
		paintAll(s);
		s.advance();
		expect(s.strokeIndex).toBe(1);
		expect(s.phase).toBe('tracing');
		expect(s.helpCount).toBe(0);
		expect(s.coverage).toBe(0);
	});
	it('moves to celebrating after the last stroke, then complete', () => {
		const s = createBrushSession(1);
		for (let i = 0; i < s.scene.strokes.length; i += 1) {
			paintAll(s);
			s.advance();
		}
		expect(s.phase).toBe('celebrating');
		s.finish();
		expect(s.phase).toBe('complete');
	});
	it('auto-paints on the third help press', () => {
		const s = createBrushSession(1);
		s.help();
		s.help();
		expect(s.phase).toBe('tracing');
		s.help();
		expect(s.phase).toBe('stroke-done');
		expect(s.coverage).toBe(1);
	});
	it('marks idle once and clears it on paint', () => {
		const s = createBrushSession(1);
		s.markIdle();
		expect(s.idle).toBe(true);
		expect(s.hint).toBeGreaterThanOrEqual(1);
		s.paint(s.stroke.points[0]!, s.stroke.points[1]!);
		expect(s.idle).toBe(false);
	});
	it('replays with an empty board at stroke one', () => {
		const s = createBrushSession(1);
		paintAll(s);
		s.advance();
		s.replay();
		expect(s.strokeIndex).toBe(0);
		expect(s.phase).toBe('tracing');
		expect(s.coverage).toBe(0);
		expect(s.helpCount).toBe(0);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/games/brush-along/session.test.ts`
Expected: FAIL — cannot resolve `./session.svelte.js`.

- [ ] **Step 3: Implement `session.svelte.ts`**

- Runes state: scene, strokeIndex, phase, `painted: boolean[][]`, helpCount, idle.
- `paint` only in `tracing`; clone the outer array and the current stroke's booleans, call `paintSegment`, set `idle = false`, and if `strokeComplete` set `phase = 'stroke-done'`.
- `help()` increments up to 3; the third call fills the current stroke and sets `stroke-done`.
- `advance()` only from `stroke-done`; next stroke resets help/idle, or `celebrating` after the last.
- `finish()` only from `celebrating` → `complete`.
- `replay()` resets to stroke 0, empty coverage, `tracing`.
- `hint` = `helpCount` (0–3); `idle` is separate and drives the ghost brush.

- [ ] **Step 4: Run the tests to verify they pass, then the gate**

Run: `pnpm vitest run src/lib/games/brush-along/session.test.ts && pnpm check && pnpm test && pnpm build`
Expected: clean.

- [ ] **Step 5: Commit (orchestrator only)**

```bash
git add src/lib/games/brush-along/session.svelte.ts src/lib/games/brush-along/session.test.ts
git commit -m "feat(brush-along): add tracing session"
```

---

### Task 3: Scene, board, play route and strings

**Files:**

- Create: `src/lib/games/brush-along/BrushScene.svelte`
- Create: `src/lib/games/brush-along/BrushBoard.svelte`
- Create: `src/routes/play/brush-along/[level]/+page.svelte`
- Modify: `messages/en.json`, `it.json`, `ro.json`, `de.json`

**Interfaces:**

`BrushScene` props: `{ scene: SceneId; active: boolean }`. Renders the backdrop and the payoff when `active`.

`BrushBoard` props:

```ts
interface Props {
	scene: SceneConfig;
	stroke: Stroke;
	strokeIndex: number;
	painted: boolean[][];
	phase: BrushPhase;
	helpCount: number;
	idle: boolean;
	sceneLabel: string;
	onpaint: (from: Vec2, to: Vec2) => void;
}
```

- [ ] **Step 1: Implement `BrushScene.svelte`**

One inline SVG group per scene, in the 0–100 space, using the art bible palette and simple shapes:

- rain: soft cloud plus ground strip;
- grass: ground strip;
- fence: two posts;
- ladder: tree trunk;
- sun: disc at (50, 52) r 18;
- kite: diamond body;
- hills: sky/ground bands;
- flower: pot and soft petal outlines;
- butterfly: body;
- rainbow: cloud at the lower left.

Backdrop shapes are outline-soft while `active` is false; the `active` class fills them and runs the payoff animation. Reduced motion shows the final state with no looping animation.

- [ ] **Step 2: Implement `BrushBoard.svelte`**

- A single `<svg viewBox="0 0 100 100" role="img">` with `touch-action: none` on the svg only.
- Layers: `BrushScene`, completed strokes (solid polylines), the active guide (dotted polyline), the active painted samples (round-capped circles or a path), the ghost brush, the brush cursor.
- Pointer input: `pointerdown` sets drawing, captures the pointer, and records the point; `pointermove` converts the client coordinates to viewBox coordinates and calls `onpaint(previous, current)`; `pointerup`/`pointercancel`/`lostpointercapture` stop drawing. Drawing never starts if `phase !== 'tracing'`.
- Coordinate conversion uses `getBoundingClientRect()` and the 100-unit viewBox; do not assume a fixed pixel size.
- Hint visuals: `idle || helpCount >= 1` shows a ghost brush tracing the stroke over ~2 s (view-owned cosmetic timer, cleared on destroy). `helpCount >= 2` adds a translucent tolerance band along the stroke. `helpCount >= 3` is handled by the session's auto-paint, so no extra visual is required.
- Reduced motion: replace the moving ghost with a static faint brush at the start and no band pulse.
- Accessible name: `brush_board`, `sceneLabel`, plus `brush_stroke({ n: strokeIndex + 1, total: scene.strokes.length })`.

- [ ] **Step 3: Implement the level route**

Mirror `src/routes/play/peekaboo-pairs/[level]/+page.svelte`:

- `GAME_ID = 'brush-along'`, `IDLE_MS = 4000`, `STROKE_MS = 600`, `PAYOFF_MS = 1600`.
- Header + dots sized to `session.scene.strokes.length`.
- Prompt row: Muguri (`cheer` on stroke-done/celebrating, otherwise `idle`), caption, help button.
- Caption precedence: hint 3 → `brush_hint_reveal`, hint 2 → `brush_hint_strong`, hint 1 or idle → `brush_hint_nudge`, stroke-done → `correct`, celebrating → `brush_done`, otherwise `brush_trace`.
- Timers: idle → `session.markIdle()`; re-arm the idle timer every 8 s while nothing is painted so the ghost repeats; stroke-done → after `STROKE_MS` `session.advance()`; after the last stroke the session enters `celebrating`, wait `PAYOFF_MS`, then `session.finish()`. Clear all timers on destroy and level change.
- Scene label: a small `sceneName(id)` switch maps `SceneId` to the ten `brush_scene_*` keys and feeds `sceneLabel` to the board.
- Help button plays `hint` and calls `session.help()`; paint plays `tap` (throttled to one cue per stroke), stroke completion plays `correct`, the completion card plays `unlock`.
- Save on the last stroke's `stroke-done` (before the payoff), exactly once per level.
- LevelComplete, replay, next-level and all-levels reuse the family.
- Calibration: none. The constants `DEFAULT_TOLERANCE`, `DEFAULT_WIDTH` and `COMPLETION` are the only feel knobs.

- [ ] **Step 4: Add the four-locale strings**

English values:

```json
"game_brush_name": "Brush Along",
"game_brush_desc": "Trace the paths and paint the garden.",
"brush_trace": "Follow the dots.",
"brush_stroke": "Stroke {n} of {total}",
"brush_hint_nudge": "Start at the dot.",
"brush_hint_strong": "Watch the brush.",
"brush_hint_reveal": "I'll paint this one.",
"brush_done": "Beautiful!",
"brush_board": "Tracing board",
"brush_scene_rain": "Rain",
"brush_scene_grass": "Grass",
"brush_scene_fence": "Fence",
"brush_scene_ladder": "Ladder",
"brush_scene_sun": "Sun",
"brush_scene_kite": "Kite",
"brush_scene_hills": "Hills",
"brush_scene_flower": "Flower",
"brush_scene_butterfly": "Butterfly",
"brush_scene_rainbow": "Rainbow"
```

Translate into it/ro/de in the existing tone; keep `{n}`/`{total}` intact.

- [ ] **Step 5: Run the gate**

Run: `pnpm exec prettier --write src/lib/games/brush-along "src/routes/play/brush-along" messages/*.json && pnpm check && pnpm test && pnpm build`
Expected: clean.

- [ ] **Step 6: Browser smoke (orchestrator)**

At 390 × 844 on `/en/play/brush-along/1`: trace a rain stroke with synthetic pointer events, confirm ink appears and the stroke completes; drift off and confirm nothing fails; lift and resume; idle ghost appears; help three times auto-paints; three strokes finish the scene and open LevelComplete; no console errors.

- [ ] **Step 7: Commit (orchestrator only)**

```bash
git add src/lib/games/brush-along src/routes/play/brush-along messages
git commit -m "feat(brush-along): add tracing board and garden scenes"
```

---

### Task 4: Level map, registry and home tile

**Files:**

- Create: `src/routes/play/brush-along/+page.svelte`
- Modify: `src/lib/games/registry.ts`, `registry.test.ts`, `src/routes/+page.svelte`

**Interfaces:**

- Registry entry `{ id: 'brush-along', titleKey: 'game_brush_name', descKey: 'game_brush_desc', href: '/play/brush-along', accent: 'leaf', icon: 'brush' }`.

- [ ] **Step 1: Update the registry test first** — add the entry to the exact array and a `getGame('brush-along')` test expecting `GAMES[5]`.
- [ ] **Step 2: Run it to verify it fails**, then implement the registry (`GameId`, icon union, entry) and the map page (copy the Peekaboo map, substitute ids/keys/route) and the home tile (`TITLES`/`DESCS` plus an inline paintbrush icon for `icon === 'brush'`).
- [ ] **Step 3: Gate** — `pnpm check && pnpm test && pnpm build && pnpm lint`.
- [ ] **Step 4: Browser check (orchestrator)** — home tile, map, locked wiggle, level 1 opens, level 2 locked.
- [ ] **Step 5: Commit (orchestrator only)** — `feat(brush-along): add level map and home entry`.

---

### Task 5: Docs and full verification

**Files:** `ART-STYLE.md`, `GLOSSARY.md`, the design spec status line.

- [ ] **Step 1:** ART-STYLE motion section: tracing ink, ghost brush, scene payoff, reduced motion. Asset map: `Brush Along board + scenes | src/lib/games/brush-along/{BrushBoard,BrushScene}.svelte`.
- [ ] **Step 2:** GLOSSARY: **Trace**, **Stroke**, **Scene**, **Coverage**. Match the existing tone.
- [ ] **Step 3:** Design spec status → `implemented — pending review`.
- [ ] **Step 4:** Full gate **and** mobile matrix: trace, drift, resume, idle ghost, help stages, scene payoff, complete/save/unlock, replay, locked deep link, four locales, reduced motion, no overflow, no console errors.
- [ ] **Step 5:** Commit (orchestrator only) — `docs(brush-along): document tracing style and vocabulary`.

---

### Task 6: Owner trial and constant tuning

- [ ] **Step 1:** Orchestrator serves the branch and gives the owner a phone URL for level 1 and level 10.
- [ ] **Step 2:** Owner reports whether the tolerance, stroke width and 85% threshold feel right. If not, adjust `DEFAULT_TOLERANCE`, `DEFAULT_WIDTH` or `COMPLETION` in `rules.ts`; no panel ships.
- [ ] **Step 3:** Re-run the full gate and the 390 px check; commit any constant change as `chore(brush-along): tune tracing feel`.

---

### Task 7: Review and ship

- [ ] **Step 1:** Fresh reviewer on a different free model checks the diff against the spec and this plan.
- [ ] **Step 2:** Fix Critical/High/Medium findings; re-gate.
- [ ] **Step 3:** Fast-forward `milestone-6`, push `milestone-6` and `main`, confirm the Vercel production deployment is Ready, verify `/en/play/brush-along/1` live.
- [ ] **Step 4:** Report the task table, model scorecard, verified vs unverified.

---

## Handoff note

Brush Along is the sixth game; Dress the Weather follows as game #7 in a separate design and plan. Do not start #7 in this branch.

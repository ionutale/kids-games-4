# Peekaboo Pairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship game #5, a seeded memory-matching game where every board reveals itself in a peekaboo before the kid flips two cards at a time to find every pair.

**Architecture:** Pure `rules.ts` owns the level table, seeded board generation, near-pair policy, the flip reducer and hint staging. A runes `session.svelte.ts` wraps that state for one level. `MemoryBoard.svelte` renders the grid, peek, flip, hints and reduced-motion path; a temporary `CalibrationPanel.svelte` tunes feel on a real phone. The level route reuses the family shell (header, dots, save, LevelComplete, audio).

**Tech Stack:** SvelteKit 3 · Svelte 5 runes · TypeScript · Vitest · pnpm · static adapter · Paraglide i18n (en/it/ro/de)

**Spec:** `docs/superpowers/specs/2026-10-26-peekaboo-pairs-design.md`

## Global Constraints

- Node engine is `24.x` in `package.json`; local dev runs on Node 26. Never change the engine or the lockfile.
- No new dependencies. No raster assets. No new art components — reuse `Fruit`, `Balloon`, `Avatar`, `Muguri`, `Mimo`.
- All user-facing strings go through Paraglide; every new key exists in **all four** locales (`messages/en.json`, `it.json`, `ro.json`, `de.json`).
- Text is a secondary caption/aria only; the game must be playable with no reading.
- No timer, no move limit, no score, no red X, no punishment.
- Cards must keep a tap area ≥ 64 px at a 390 px wide viewport.
- Implementation subagents do **not** commit or push. The orchestrator commits after validation.
- Every task gate: `pnpm check` → 0 errors/0 warnings, `pnpm test` → all pass, `pnpm build` → success, `pnpm lint` → clean.
- Do not edit files outside the task's file list; do not reformat unrelated code.

## Review Focus

1. **Tap during peek or during a pending mismatch** — a third card must never flip; state must not advance. Pinned in Task 1 (`applyFlip` third-tap test) and Task 2 (session mismatch lock test).
2. **Rapid double-tap on one card** — must count once, never as a match or miss. Pinned in Task 1 (`applyFlip` same-index test).
3. **Navigate away mid-peek or mid-mismatch** — timers must be cleared on destroy; no stale callback may flip cards or save. Pinned in Task 2 route cleanup plus the Task 4 browser check.
4. **4 × 5 grid at 390 px** — no horizontal overflow, no clipped cards, every card ≥ 64 px. Pinned in Task 2's `cardPx` measurement and the Task 4 mobile screenshot.
5. **Replay after completion** — fresh boards, emptied matches, reset hints and the peek restored. Pinned in Task 2 replay test and the Task 4 browser pass.

---

### Task 1: Seeded board rules

**Files:**

- Create: `src/lib/games/peekaboo-pairs/rules.ts`
- Create: `src/lib/games/peekaboo-pairs/rules.test.ts`

**Interfaces:**

- Consumes: `FruitId` and `FRUITS` from `#lib/games/counting/rules.js`; `ColorId` and `COLORS` from `#lib/games/color-match/rules.js`; `AvatarId` and `AVATARS` from `#lib/storage/save.js`.
- Produces (later tasks rely on these exact names and signatures):

```ts
export type FriendId = AvatarId | 'muguri' | 'mimo';
export type Picture =
	| { theme: 'fruit'; id: FruitId }
	| { theme: 'balloon'; id: ColorId }
	| { theme: 'friend'; id: FriendId };
export type PairTheme = 'fruit' | 'balloon' | 'friend' | 'mixed-fruit-balloon' | 'mixed-all';

export interface PairLevelConfig {
	level: number;
	theme: PairTheme;
	pairs: number;
	cols: number;
	rows: number;
	peekMs: number;
	nearBudget: number;
}
export interface Card {
	key: string; // `${pairId}#0` or `${pairId}#1`
	pairId: string; // pictureKey(picture)
	picture: Picture;
}
export interface Board {
	cards: Card[];
	cols: number;
	rows: number;
	peekMs: number;
}
export interface BoardState {
	flipped: number[];
	matched: string[];
	misses: number;
}
export type FlipResult = 'ignored' | 'first' | 'match' | 'miss';

export const MAX_LEVEL = 10;
export const BOARDS_PER_LEVEL = 3;
export const LEVELS: PairLevelConfig[];
export const FRUIT_POOL: FruitId[];
export const BALLOON_POOL: ColorId[];
export const FRIEND_POOL: FriendId[];
export const NEAR_PAIRS: Array<[string, string]>;
export const EMPTY_BOARD_STATE: BoardState;

export function pictureKey(picture: Picture): string;
export function getLevelConfig(level: number): PairLevelConfig | undefined;
export function generateLevel(level: number, seed?: number): Board[];
export function applyFlip(
	board: Board,
	state: BoardState,
	index: number
): { state: BoardState; result: FlipResult };
export function clearFlip(state: BoardState): BoardState;
export function isBoardComplete(board: Board, state: BoardState): boolean;
export function hintStage(misses: number, manualHints: number, idle?: boolean): 0 | 1 | 2 | 3;
```

- [ ] **Step 1: Write the failing rule tests**

Create `rules.test.ts`. Cover exactly these behaviors (one `it` each unless noted):

```ts
import { describe, expect, it } from 'vitest';
import {
	BOARDS_PER_LEVEL,
	EMPTY_BOARD_STATE,
	LEVELS,
	MAX_LEVEL,
	NEAR_PAIRS,
	applyFlip,
	clearFlip,
	generateLevel,
	hintStage,
	isBoardComplete,
	pictureKey,
	type Board
} from './rules.js';

function nearCount(board: Board): number {
	const keys = new Set(board.cards.map((card) => pictureKey(card.picture)));
	return NEAR_PAIRS.filter(([a, b]) => keys.has(a) && keys.has(b)).length;
}
function pictureSet(board: Board): string {
	return [...new Set(board.cards.map((card) => card.pairId))].sort().join('|');
}

describe('level table', () => {
	it('has ten levels and three boards each', () => {
		expect(MAX_LEVEL).toBe(10);
		expect(BOARDS_PER_LEVEL).toBe(3);
		expect(LEVELS).toHaveLength(10);
	});
	it('has a grid that fits every pair', () => {
		for (const level of LEVELS) expect(level.cols * level.rows).toBe(level.pairs * 2);
	});
	it('shortens the peek every level', () => {
		for (let i = 1; i < LEVELS.length; i += 1)
			expect(LEVELS[i]!.peekMs).toBeLessThan(LEVELS[i - 1]!.peekMs);
	});
	it('keeps every pool large enough', () => {
		for (const level of LEVELS) expect(level.pairs).toBeGreaterThanOrEqual(2);
	});
});

describe('board generation', () => {
	it('generates three boards per level', () => {
		expect(generateLevel(1, 1)).toHaveLength(3);
	});
	it('is deterministic for one seed', () => {
		expect(generateLevel(8, 42)).toEqual(generateLevel(8, 42));
	});
	it('differs for another seed', () => {
		expect(generateLevel(8, 42)).not.toEqual(generateLevel(8, 43));
	});
	it('duplicates every picture exactly twice', () => {
		for (const board of generateLevel(5, 7)) {
			const counts = new Map<string, number>();
			for (const card of board.cards) counts.set(card.pairId, (counts.get(card.pairId) ?? 0) + 1);
			expect([...counts.values()]).toEqual(Array.from({ length: 6 }, () => 2));
		}
	});
	it('uses only the level theme on single-theme levels', () => {
		for (const level of [1, 4, 6])
			for (const board of generateLevel(level, 3))
				for (const card of board.cards) expect(card.picture.theme).toBe(LEVELS[level - 1]!.theme);
	});
	it('keeps near pairs off levels 1-7', () => {
		for (let level = 1; level <= 7; level += 1)
			for (let seed = 1; seed <= 50; seed += 1)
				for (const board of generateLevel(level, seed)) expect(nearCount(board)).toBe(0);
	});
	it('respects the near budget on levels 8-10', () => {
		for (let level = 8; level <= 10; level += 1)
			for (let seed = 1; seed <= 50; seed += 1)
				for (const board of generateLevel(level, seed))
					expect(nearCount(board)).toBeLessThanOrEqual(LEVELS[level - 1]!.nearBudget);
	});
	it('makes level 8 four fruits and four balloons', () => {
		for (const board of generateLevel(8, 9)) {
			const themes = board.cards.map((card) => card.picture.theme);
			expect(themes.filter((t) => t === 'fruit')).toHaveLength(8);
			expect(themes.filter((t) => t === 'balloon')).toHaveLength(8);
		}
	});
	it('uses two themes per board and all three across levels 9-10', () => {
		for (const level of [9, 10])
			for (let seed = 1; seed <= 20; seed += 1) {
				const boards = generateLevel(level, seed);
				for (const board of boards)
					expect(
						new Set(board.cards.map((card) => card.picture.theme)).size
					).toBeGreaterThanOrEqual(2);
				expect(new Set(boards.flatMap((b) => b.cards.map((card) => card.picture.theme)))).toEqual(
					new Set(['fruit', 'balloon', 'friend'])
				);
			}
	});
	it('never repeats an identical picture set on consecutive boards', () => {
		for (let level = 1; level <= 10; level += 1) {
			if (level === 7) continue; // pool is exactly 8; only the shuffle can differ
			for (let seed = 1; seed <= 20; seed += 1) {
				const boards = generateLevel(level, seed);
				for (let i = 1; i < boards.length; i += 1)
					expect(pictureSet(boards[i]!)).not.toBe(pictureSet(boards[i - 1]!));
			}
		}
	});
});

describe('applyFlip', () => {
	const board = generateLevel(1, 1)[0]!;
	const otherIndex = board.cards.findIndex((card) => card.pairId !== board.cards[0]!.pairId);

	it('returns first and remembers the card', () => {
		const out = applyFlip(board, EMPTY_BOARD_STATE, 0);
		expect(out.result).toBe('first');
		expect(out.state.flipped).toEqual([0]);
	});
	it('ignores the same card twice', () => {
		const first = applyFlip(board, EMPTY_BOARD_STATE, 0).state;
		expect(applyFlip(board, first, 0).result).toBe('ignored');
	});
	it('ignores a third tap while two cards are up', () => {
		const first = applyFlip(board, EMPTY_BOARD_STATE, 0).state;
		const miss = applyFlip(board, first, otherIndex).state;
		expect(miss.flipped).toHaveLength(2);
		expect(applyFlip(board, miss, 1).result).toBe('ignored');
	});
	it('matches identical pictures and clears the flip', () => {
		const first = applyFlip(board, EMPTY_BOARD_STATE, 0).state;
		const twin = board.cards.findIndex(
			(card, i) => i !== 0 && card.pairId === board.cards[0]!.pairId
		);
		const out = applyFlip(board, first, twin);
		expect(out.result).toBe('match');
		expect(out.state.flipped).toEqual([]);
		expect(out.state.matched).toEqual([board.cards[0]!.pairId]);
	});
	it('records a miss and exposes both cards', () => {
		const first = applyFlip(board, EMPTY_BOARD_STATE, 0).state;
		const out = applyFlip(board, first, otherIndex);
		expect(out.result).toBe('miss');
		expect(out.state.flipped).toEqual([0, otherIndex]);
		expect(out.state.misses).toBe(1);
	});
	it('clears a pending miss', () => {
		expect(clearFlip({ flipped: [0, 1], matched: [], misses: 1 }).flipped).toEqual([]);
	});
	it('completes when every pair is matched', () => {
		const complete = { flipped: [], matched: board.cards.map((c) => c.pairId), misses: 0 };
		expect(isBoardComplete(board, complete)).toBe(true);
		expect(isBoardComplete(board, EMPTY_BOARD_STATE)).toBe(false);
	});
});

describe('hintStage', () => {
	it('escalates on misses', () => {
		expect(hintStage(0, 0)).toBe(0);
		expect(hintStage(2, 0)).toBe(1);
		expect(hintStage(4, 0)).toBe(2);
		expect(hintStage(6, 0)).toBe(3);
	});
	it('escalates on manual help and idle', () => {
		expect(hintStage(0, 1)).toBe(1);
		expect(hintStage(0, 2)).toBe(2);
		expect(hintStage(0, 3)).toBe(3);
		expect(hintStage(0, 0, true)).toBe(1);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/games/peekaboo-pairs/rules.test.ts`
Expected: FAIL — cannot resolve `./rules.js`.

- [ ] **Step 3: Implement `rules.ts`**

Copy the level table verbatim:

```ts
export const LEVELS: PairLevelConfig[] = [
	{ level: 1, theme: 'fruit', pairs: 2, cols: 2, rows: 2, peekMs: 3000, nearBudget: 0 },
	{ level: 2, theme: 'fruit', pairs: 3, cols: 3, rows: 2, peekMs: 2800, nearBudget: 0 },
	{ level: 3, theme: 'fruit', pairs: 4, cols: 4, rows: 2, peekMs: 2600, nearBudget: 0 },
	{ level: 4, theme: 'balloon', pairs: 4, cols: 4, rows: 2, peekMs: 2400, nearBudget: 0 },
	{ level: 5, theme: 'balloon', pairs: 6, cols: 3, rows: 4, peekMs: 2200, nearBudget: 0 },
	{ level: 6, theme: 'friend', pairs: 6, cols: 3, rows: 4, peekMs: 2000, nearBudget: 0 },
	{ level: 7, theme: 'friend', pairs: 8, cols: 4, rows: 4, peekMs: 1800, nearBudget: 0 },
	{
		level: 8,
		theme: 'mixed-fruit-balloon',
		pairs: 8,
		cols: 4,
		rows: 4,
		peekMs: 1500,
		nearBudget: 1
	},
	{ level: 9, theme: 'mixed-all', pairs: 10, cols: 4, rows: 5, peekMs: 1300, nearBudget: 1 },
	{ level: 10, theme: 'mixed-all', pairs: 10, cols: 4, rows: 5, peekMs: 1100, nearBudget: 2 }
];
```

Algorithm notes:

- Local `mulberry32(seed)` (same shape as `feelings-faces`), default seed `level * 1013`.
- Pools: `FRUIT_POOL = FRUITS`, `BALLOON_POOL = Object.keys(COLORS) as ColorId[]`, `FRIEND_POOL = [...AVATARS, 'muguri', 'mimo']`.
- `NEAR_PAIRS` (unordered, both directions handled by a Set lookup):
  - `balloon:blue ↔ balloon:light-blue`, `balloon:blue ↔ balloon:dark-blue`, `balloon:light-blue ↔ balloon:dark-blue`
  - the same three combinations for `green / light-green / dark-green`
  - `balloon:red ↔ balloon:pink`
  - `fruit:lemon ↔ fruit:banana`, `fruit:apple ↔ fruit:cherry`, `fruit:orange ↔ fruit:peach`
  - cross-theme: `balloon:yellow ↔ fruit:lemon`, `balloon:yellow ↔ fruit:banana`, `balloon:red ↔ fruit:apple`, `balloon:pink ↔ fruit:apple`, `balloon:red ↔ fruit:cherry`, `balloon:pink ↔ fruit:cherry`, `balloon:orange ↔ fruit:orange`, `balloon:orange ↔ fruit:peach`, `balloon:green ↔ fruit:pear`
- Picture split per board:
  - `fruit` / `balloon` / `friend`: the whole board is that pool.
  - `mixed-fruit-balloon`: exactly `[4, 4, 0]` (fruit, balloon, friend).
  - `mixed-all`: `[[4, 4, 2], [5, 5, 0], [3, 4, 3]][boardIndex]`.
- Sampling is **greedy and constraint-checked per draw**, not accept/reject on the finished board: pick a random unused picture from the current theme's pool, accept it only if adding it keeps `nearCount <= nearBudget`, otherwise discard and draw again. If a slot cannot be filled after 30 draws, restart the whole board (cap 20 restarts; the pools and budgets make success routine). After building a board, restart it if its picture set equals the previous board's set and the level is not 7. This keeps level 8 (4 fruits + 4 balloons, budget 1) from failing most random whole-board draws.
- Build cards: duplicate every picture, then Fisher–Yates shuffle with the same seeded PRNG.
- `applyFlip` is immutable: return new objects, never mutate the input state. `misses` increments only on a miss. `'ignored'` covers invalid index, out-of-range, already matched, already flipped, and `flipped.length === 2`.
- `hintStage`: `>=6 misses or >=3 manual → 3`, `>=4 or >=2 → 2`, `>=2 or >=1 or idle → 1`, else `0`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/games/peekaboo-pairs/rules.test.ts`
Expected: PASS, 0 failures.

- [ ] **Step 5: Run the task gate**

Run: `pnpm check && pnpm test && pnpm build`
Expected: 0 errors/0 warnings; all tests pass; build succeeds.

- [ ] **Step 6: Commit (orchestrator only)**

```bash
git add src/lib/games/peekaboo-pairs/rules.ts src/lib/games/peekaboo-pairs/rules.test.ts
git commit -m "feat(peekaboo): add seeded board rules"
```

---

### Task 2: Playable board — session, view, route, strings

**Files:**

- Create: `src/lib/games/peekaboo-pairs/session.svelte.ts`
- Create: `src/lib/games/peekaboo-pairs/session.test.ts`
- Create: `src/lib/games/peekaboo-pairs/MemoryBoard.svelte`
- Create: `src/lib/games/peekaboo-pairs/CalibrationPanel.svelte`
- Create: `src/routes/play/peekaboo-pairs/[level]/+page.svelte`
- Modify: `messages/en.json`, `messages/it.json`, `messages/ro.json`, `messages/de.json`

**Interfaces:**

- Consumes from Task 1: all exports listed there.
- Produces:

```ts
export type PairsPhase = 'peek' | 'playing' | 'celebrating' | 'complete';

export interface PairsSession {
	readonly boards: Board[];
	readonly boardIndex: number;
	readonly board: Board;
	readonly phase: PairsPhase;
	readonly flipped: number[];
	readonly matched: string[];
	readonly misses: number;
	readonly manualHints: number;
	readonly hint: 0 | 1 | 2 | 3;
	readonly hintIndex: number | null;
	readonly isLastBoard: boolean;
	readonly boardComplete: boolean;
	peekDone(): void;
	flip(index: number): FlipResult;
	clearMiss(): void;
	advance(): void;
	replay(): void;
	help(): void;
	markIdle(): void;
}
export function createPairsSession(level: number, seed?: number): PairsSession;
```

`MemoryBoard.svelte` props:

```ts
interface Props {
	board: Board;
	phase: PairsPhase;
	flipped: number[];
	matched: string[];
	hint: 0 | 1 | 2 | 3;
	hintIndex: number | null;
	revealIndex: number | null;
	cardBackLabel: string;
	boardLabel: string;
	labelFor: (picture: Picture) => string;
	cols: number;
	rows: number;
	gap: number;
	cardPx?: number; // $bindable, reports measured card width
	onflip: (index: number) => void;
}
```

`CalibrationPanel.svelte` props:

```ts
interface Props {
	peekMs: number;
	gap: number;
	cols: number;
	rows: number;
	cardPx: number;
	onchange: (patch: { peekMs?: number; gap?: number; cols?: number; rows?: number }) => void;
	onreplay: () => void;
}
```

- [ ] **Step 1: Write the failing session tests**

Create `session.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BOARDS_PER_LEVEL, LEVELS } from './rules.js';
import { createPairsSession } from './session.svelte.js';

describe('pairs session', () => {
	it('starts on the first board in the peek phase', () => {
		const s = createPairsSession(1, 1);
		expect(s.phase).toBe('peek');
		expect(s.boardIndex).toBe(0);
		expect(s.boards).toHaveLength(BOARDS_PER_LEVEL);
	});
	it('ignores flips during the peek', () => {
		const s = createPairsSession(1, 1);
		expect(s.flip(0)).toBe('ignored');
		expect(s.flipped).toEqual([]);
	});
	it('starts play after the peek ends', () => {
		const s = createPairsSession(1, 1);
		s.peekDone();
		expect(s.phase).toBe('playing');
	});
	it('matches a pair and clears the flip', () => {
		const s = createPairsSession(1, 1);
		s.peekDone();
		const twin = s.board.cards.findIndex(
			(card, i) => i > 0 && card.pairId === s.board.cards[0]!.pairId
		);
		expect(s.flip(0)).toBe('first');
		expect(s.flip(twin)).toBe('match');
		expect(s.matched).toEqual([s.board.cards[0]!.pairId]);
		expect(s.flipped).toEqual([]);
	});
	it('locks flips until a miss is cleared', () => {
		const s = createPairsSession(1, 1);
		s.peekDone();
		const other = s.board.cards.findIndex((card) => card.pairId !== s.board.cards[0]!.pairId);
		expect(s.flip(0)).toBe('first');
		expect(s.flip(other)).toBe('miss');
		expect(s.flip(1)).toBe('ignored');
		s.clearMiss();
		expect(s.flipped).toEqual([]);
		expect(s.misses).toBe(1);
	});
	it('celebrates after the last pair and advances to a new peek', () => {
		const s = createPairsSession(1, 1);
		s.peekDone();
		for (const pairId of new Set(s.board.cards.map((card) => card.pairId))) {
			const pair = s.board.cards
				.map((card, i) => ({ card, i }))
				.filter((entry) => entry.card.pairId === pairId)
				.map((entry) => entry.i);
			expect(s.flip(pair[0]!)).toBe('first');
			expect(s.flip(pair[1]!)).toBe('match');
		}
		expect(s.boardComplete).toBe(true);
		expect(s.phase).toBe('celebrating');
		s.advance();
		expect(s.boardIndex).toBe(1);
		expect(s.phase).toBe('peek');
		expect(s.matched).toEqual([]);
		expect(s.misses).toBe(0);
	});
	it('completes after the last board', () => {
		const s = createPairsSession(1, 1);
		for (let board = 0; board < BOARDS_PER_LEVEL; board += 1) {
			s.peekDone();
			for (const pairId of new Set(s.board.cards.map((card) => card.pairId))) {
				const pair = s.board.cards
					.map((card, i) => ({ card, i }))
					.filter((entry) => entry.card.pairId === pairId)
					.map((entry) => entry.i);
				s.flip(pair[0]!);
				s.flip(pair[1]!);
			}
			s.advance();
		}
		expect(s.phase).toBe('complete');
	});
	it('replays from the first board with fresh state', () => {
		const s = createPairsSession(1, 1);
		s.peekDone();
		s.flip(0);
		s.replay();
		expect(s.boardIndex).toBe(0);
		expect(s.phase).toBe('peek');
		expect(s.flipped).toEqual([]);
		expect(s.matched).toEqual([]);
		expect(s.misses).toBe(0);
	});
	it('escalates hints on idle and manual help', () => {
		const s = createPairsSession(1, 1);
		s.peekDone();
		s.markIdle();
		expect(s.hint).toBe(1);
		expect(s.manualHints).toBe(0);
		s.help();
		expect(s.hint).toBeGreaterThanOrEqual(1);
	});
	it('points hintIndex at an unmatched pair', () => {
		const s = createPairsSession(1, 1);
		s.peekDone();
		const index = s.hintIndex;
		expect(index).not.toBeNull();
		expect(s.board.cards[index!]).toBeDefined();
	});
	it('keeps the configured peek time', () => {
		const s = createPairsSession(3, 1);
		expect(s.board.peekMs).toBe(LEVELS[2]!.peekMs);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/games/peekaboo-pairs/session.test.ts`
Expected: FAIL — cannot resolve `./session.svelte.js`.

- [ ] **Step 3: Implement `session.svelte.ts`**

Runes state, no timers. `flip` delegates to `applyFlip`; on `'match'` set `phase = 'celebrating'` only when `isBoardComplete`. `advance` only acts from `'celebrating'`; it resets state and moves to `'peek'`, or sets `'complete'` after the last board. `replay` regenerates with `seed + 1` (store a local mutable seed), returns to board 0 and `'peek'`. `hintIndex` = index of the first card whose `pairId` is not in `matched`. `hint` = `hintStage(misses, manualHints, idle)`.

- [ ] **Step 4: Run the session tests to verify they pass**

Run: `pnpm vitest run src/lib/games/peekaboo-pairs/session.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the board view and calibration panel**

`MemoryBoard.svelte`:

- Grid element with `role="group"`, `aria-label={boardLabel}`, `bind:clientWidth={gridWidth}`, CSS `grid-template-columns: repeat(var(--cols), minmax(0, 1fr))`, `gap: var(--gap)`, `--cols`/`--rows`/`--gap` from props.
- `$effect` computes `cardPx = Math.floor((gridWidth - (cols - 1) * gap) / cols)` and writes the bindable. Art size = `Math.max(24, Math.round(cardPx * 0.62))`.
- Each card is a `<button type="button">` with `aria-label` = `cardBackLabel` when face-down, `labelFor(card.picture)` when up; `aria-pressed` mirrors up-state; a visible `:focus-visible` ring uses `--cn-leaf-dark`. Up = `phase === 'peek' || flipped.includes(i) || matched.includes(card.pairId) || revealIndex === i`.
- Card art: `fruit` → `<Fruit kind={picture.id} size={artSize} />`; `balloon` → `<Balloon color={picture.id} size={artSize} />`; `friend` → `muguri`/`mimo` → `<Muguri pose="idle" size={artSize} />` / `<Mimo pose="idle" size={artSize} />`, otherwise `<Avatar id={picture.id} size={artSize} />`. Verify `Mimo.svelte`'s prop name before use (it takes `pose` and `size`).
- Card back: one inline SVG leaf motif on `--cn-paper-2` with a `--cn-wood` rim, no raster, `aria-hidden="true"`.
- Flip: fixed footprint, `perspective`, inner `rotateY(180deg)` at 320 ms `var(--cn-ease)`; both faces `backface-visibility: hidden`.
- Peek: all cards up while `phase === 'peek'`; when it ends, add a `.staggering` class for `320 + 40 * cards.length` ms and apply `transition-delay: calc(var(--i) * 40ms)` to the inner element only while that class is present (the page passes no timer; the view owns this short cosmetic window).
- Hints: `hint >= 1` adds `.nudge` (single wiggle animation on face-down cards); `hint === 2 && i === hintIndex` adds `.glow`; `revealIndex === i` shows the face.
- Board clear: when `phase === 'celebrating'`, add `.cleared` and a single small bounce on the matched cards during the 900 ms beat.
- Reduced motion: inside `@media (prefers-reduced-motion: reduce)` remove the transform flip and use an opacity crossfade between the two faces.

`CalibrationPanel.svelte`: fixed bottom sheet, `role="region"`, labelled "Calibration" (dev-only, not localized). Range inputs: peek 600–4000 step 50, gap 4–20 step 1, cols 2–4, rows 2–5; a "Replay board" button; readout `cardPx` in px. Emits patches through `onchange`.

- [ ] **Step 6: Implement the level route**

Create `src/routes/play/peekaboo-pairs/[level]/+page.svelte`. Use `src/routes/play/color-match/[level]/+page.svelte` as the shell reference and keep: header with Back/level/MuteButton, dots, save + `clearLevel` on complete, `LevelComplete`, `goto` for next/replay/all-levels, `onMount` audio + save load, level validation and redirect.

Replace the game core with:

- `const GAME_ID = 'peekaboo-pairs'`, `MISS_MS = 800`, `BOARD_MS = 900`, `IDLE_MS = 6000`.
- Prompt row above the board, mirroring `counting`/`feelings-faces`: `<Muguri pose={phase === 'celebrating' ? 'cheer' : 'idle'} size={64} />`, a caption in an `aria-live="polite"` paragraph, and an `IconButton` labelled `m.pairs_hint_nudge()` holding `<Muguri pose="hint" size={28} />` that calls `session.help()`. Caption precedence: `pairs_peek` while peeking, then `pairs_hint_reveal` / `pairs_hint_strong` / `pairs_hint_nudge` by hint stage, else `pairs_find`. Add a gentle bob class to Muguri while peeking.
- `session = createPairsSession(n, Date.now())`; calibration state `cal = { peekMs, gap: 12, cols, rows }` initialized from `LEVELS[n-1]`.
- `armPeek()` timeout → `session.peekDone()`; call after init, after `advance()`, and on calibration replay.
- `flip(i)`: `tap` sfx on first; `correct` on match; `wrong` on miss; on `'miss'` show `try_again` for `MISS_MS` then `clearMiss()`; on a match with `phase === 'celebrating'` wait `BOARD_MS`, `session.advance()`, then `armPeek()` when the new phase is `'peek'`; re-arm idle every action.
- `revealIndex`: `$effect` when `hint === 3` sets `hintIndex`, timer 1200 ms clears it. Page owns the timer.
- Complete effect saves exactly once per level, plays `unlock`, same as Color Match.
- Dots: `BOARDS_PER_LEVEL` dots keyed on `session.boardIndex`, aria `m.pairs_boards({ n: session.boardIndex + 1, total: BOARDS_PER_LEVEL })`.
- Calibration panel renders only when `import.meta.env.DEV && page.url.searchParams.get('calibrate') === '1'`.
- Clear every timer in `onDestroy`.

- [ ] **Step 7: Add the four-locale strings**

Add to each of `messages/en.json`, `messages/it.json`, `messages/ro.json`, `messages/de.json`. English values:

```json
"game_peekaboo_name": "Peekaboo Pairs",
"game_peekaboo_desc": "Find the pairs hiding under the cards.",
"pairs_peek": "Peekaboo! Remember the pictures.",
"pairs_find": "Find the pairs.",
"pairs_hint_nudge": "Look closely!",
"pairs_hint_strong": "Almost! Watch the glow.",
"pairs_hint_reveal": "Here is one. Where is its pair?",
"pairs_card_back": "Face-down card",
"pairs_boards": "Board {n} of {total}",
"pairs_fruit_apple": "apple",
"pairs_fruit_pear": "pear",
"pairs_fruit_orange": "orange",
"pairs_fruit_banana": "banana",
"pairs_fruit_grapes": "grapes",
"pairs_fruit_strawberry": "strawberry",
"pairs_fruit_lemon": "lemon",
"pairs_fruit_cherry": "cherry",
"pairs_fruit_peach": "peach",
"pairs_fruit_watermelon": "watermelon",
"pairs_friend_owl": "owl",
"pairs_friend_fox": "fox",
"pairs_friend_bear": "bear",
"pairs_friend_bunny": "bunny",
"pairs_friend_cat": "cat",
"pairs_friend_hedgehog": "hedgehog",
"pairs_friend_muguri": "Muguri",
"pairs_friend_mimo": "Mimo"
```

Translate the human-readable strings into it/ro/de using the tone already in those files; keep `{n}` and `{total}` intact; keep product names (`Muguri`, `Mimo`, `Peekaboo Pairs` may be localized) consistent with existing keys.

- [ ] **Step 8: Run the task gate**

Run: `pnpm exec prettier --write src/lib/games/peekaboo-pairs "src/routes/play/peekaboo-pairs" messages/*.json && pnpm check && pnpm test && pnpm build`
Expected: 0 errors/0 warnings; all tests pass; build succeeds.

- [ ] **Step 9: Browser smoke (orchestrator)**

Start `pnpm dev --port 5191`, open `http://localhost:5191/en/play/peekaboo-pairs/1` at 390 × 844. Verify with a screenshot/snapshot: the peek shows every face, then cards turn down; tapping two cards gives a match and a miss; three boards complete into `LevelComplete`; no console errors.

- [ ] **Step 10: Commit (orchestrator only)**

```bash
git add src/lib/games/peekaboo-pairs src/routes/play/peekaboo-pairs messages
git commit -m "feat(peekaboo): add playable memory board"
```

---

### Task 3: Level map, registry and home tile

**Files:**

- Create: `src/routes/play/peekaboo-pairs/+page.svelte`
- Modify: `src/lib/games/registry.ts`
- Modify: `src/lib/games/registry.test.ts`
- Modify: `src/routes/+page.svelte`

**Interfaces:**

- Consumes: `LEVELS`, `MAX_LEVEL` from Task 1; the message keys from Task 2.
- Produces: registry entry `{ id: 'peekaboo-pairs', titleKey: 'game_peekaboo_name', descKey: 'game_peekaboo_desc', href: '/play/peekaboo-pairs', accent: 'berry', icon: 'pairs' }`.

- [ ] **Step 1: Update the registry test first**

In `registry.test.ts`: add the new entry to the exact `toEqual` array and add `it('finds the peekaboo-pairs game', () => expect(getGame('peekaboo-pairs')).toEqual(GAMES[4]))`.

- [ ] **Step 2: Run the registry test to verify it fails**

Run: `pnpm vitest run src/lib/games/registry.test.ts`
Expected: FAIL — array has 4 entries.

- [ ] **Step 3: Implement the registry and map page**

- `registry.ts`: extend `GameId` with `'peekaboo-pairs'`, extend the `icon` union with `'pairs'`, append the entry.
- `src/routes/play/peekaboo-pairs/+page.svelte`: copy `src/routes/play/color-match/+page.svelte` and substitute `GAME_ID`, title/desc keys, route base, and level config; keep the locked-level wiggle, `Muguri` header and `IconButton` back.
- `src/routes/+page.svelte`: add `game_peekaboo_name`/`game_peekaboo_desc` to `TITLES`/`DESCS`; add an `{:else if game.icon === 'pairs'}` branch rendering two overlapping card backs with a leaf (inline SVG, `aria-hidden`).

- [ ] **Step 4: Run the task gate**

Run: `pnpm exec prettier --write src/lib/games/registry.ts src/lib/games/registry.test.ts src/routes/+page.svelte "src/routes/play/peekaboo-pairs/+page.svelte" && pnpm check && pnpm test && pnpm build`
Expected: pass.

- [ ] **Step 5: Browser check (orchestrator)**

Home shows the new tile with its icon and name; the map lists ten levels; level 2 is locked; playing level 1 to completion unlocks level 2.

- [ ] **Step 6: Commit (orchestrator only)**

```bash
git add src/lib/games/registry.ts src/lib/games/registry.test.ts src/routes/+page.svelte src/routes/play/peekaboo-pairs/+page.svelte
git commit -m "feat(peekaboo): add level map and home entry"
```

---

### Task 4: Docs and full verification

**Files:**

- Modify: `ART-STYLE.md`
- Modify: `GLOSSARY.md`
- Modify: `docs/superpowers/specs/2026-10-26-peekaboo-pairs-design.md` (status line only)

- [ ] **Step 1: Update the art bible**

In `ART-STYLE.md` motion section, add one bullet: memory cards flip with a 320 ms `rotateY`, the peek reveals every face then drops them with a 40 ms/card stagger, matches sparkle and stay, misses wiggle and flip back; reduced motion uses an opacity crossfade. In the asset map, add `Peekaboo Pairs card back + board | src/lib/games/peekaboo-pairs/MemoryBoard.svelte`.

- [ ] **Step 2: Update the glossary**

Add entries in the existing style: **Board** (one memory grid; three per level; replaces "round" for this game), **Peek** (the opening reveal), **Pair** (the two identical cards), **Near pair** (two deliberately similar pictures). Note that "round" still means one task in the other games.

- [ ] **Step 3: Mark the spec shipped**

Change the design spec status line to `Status: shipped (milestone 5)`.

- [ ] **Step 4: Run the full gate**

Run: `pnpm exec prettier --write ART-STYLE.md GLOSSARY.md docs/superpowers/specs/2026-10-26-peekaboo-pairs-design.md && pnpm check && pnpm test && pnpm build && pnpm lint`
Expected: all clean.

- [ ] **Step 5: Full browser matrix (orchestrator)**

At 390 × 844 on `http://localhost:5191`:

1. `/en/play/peekaboo-pairs/1` — peek, match, miss, hints at 2/4/6 misses (verify glow and reveal), the Muguri help button advances the stage, three boards, complete.
2. Save: after completion `getCleared(save)` for `peekaboo-pairs` is 1 and level 2 opens.
3. Replay from `LevelComplete` — fresh boards, peek returns, no stale matches.
4. Next level from `LevelComplete`.
5. Deep link to a locked level redirects to the map.
6. Locales: `/it/`, `/ro/`, `/de/` play screen renders translated caption and card labels.
7. Reduced motion emulation — no rotation, faces crossfade.
8. Calibration panel absent without `?calibrate=1`; present with it.
9. No console errors; 4 × 5 grid has no horizontal overflow and cards measure ≥ 64 px.

- [ ] **Step 6: Commit (orchestrator only)**

```bash
git add ART-STYLE.md GLOSSARY.md docs/superpowers/specs/2026-10-26-peekaboo-pairs-design.md
git commit -m "docs(peekaboo): document board art and vocabulary"
```

---

### Task 5: Owner calibration and panel removal

**Files:**

- Modify: `src/lib/games/peekaboo-pairs/rules.ts` (peek values only, if the owner changes them)
- Modify: `src/lib/games/peekaboo-pairs/MemoryBoard.svelte` (default gap only, if changed)
- Delete: `src/lib/games/peekaboo-pairs/CalibrationPanel.svelte`
- Modify: `src/routes/play/peekaboo-pairs/[level]/+page.svelte` (remove panel wiring)

- [ ] **Step 1: Owner trial (human checkpoint)**

Orchestrator keeps the dev server running and gives the owner `http://<lan-ip>:5191/en/play/peekaboo-pairs/1?calibrate=1`. Owner tunes peek duration and gap on a real phone and reports the values. Do not proceed until the owner answers.

- [ ] **Step 2: Bake the chosen values**

Write the owner's peek durations into `LEVELS`; if the gap changed, set the new default in `MemoryBoard.svelte`. Keep the level table monotonic.

- [ ] **Step 3: Remove the calibration panel**

Delete `CalibrationPanel.svelte`; remove its import, `cal` state, the `?calibrate=1` block and the `cardPx` binding from the level route. Also remove the temporary `devUnlock` flag and restore the plain level gate. `MemoryBoard` keeps `cols`/`rows`/`gap` props, fed from the level config. With `?calibrate=1` or `?unlock=1`, nothing special happens.

- [ ] **Step 4: Re-run the gate and the mobile check**

Run: `pnpm check && pnpm test && pnpm build && pnpm lint`
Expected: clean. Re-open the level at 390 × 844 and confirm the board still fits and the peek timing matches the baked values.

- [ ] **Step 5: Commit (orchestrator only)**

```bash
git add -A src/lib/games/peekaboo-pairs src/routes/play/peekaboo-pairs
git commit -m "chore(peekaboo): bake calibrated board feel"
```

---

### Task 6: Review and ship

- [ ] **Step 1: Fresh review**

Dispatch a reviewer subagent on a different free model with the branch diff, the spec, and the acceptance list. It must not edit. Verdict must be PASS or a ranked findings list.

- [ ] **Step 2: Fix findings**

Fix every Critical/High/Medium finding; fix Low findings unless they are explicitly accepted with a reason. Re-run the full gate.

- [ ] **Step 3: Merge and deploy**

Fast-forward `milestone-5`, push `milestone-5` and `main` (the Vercel production branch), confirm the Git-triggered production deployment is **Ready**, and verify `/en/play/peekaboo-pairs/1` live.

- [ ] **Step 4: Report**

Task table with model, attempts, evidence and status; verified vs unverified; scorecard per model.

/**
 * Pure rules for the "Peekaboo Pairs" memory game. No DOM, no Svelte, no
 * storage access, so every function here is unit-testable and deterministic
 * when given a seeded PRNG.
 */

import { FRUITS, type FruitId } from '#lib/games/counting/rules.js';
import { COLORS, type ColorId } from '#lib/games/color-match/rules.js';
import { AVATARS, type AvatarId } from '#lib/storage/save.js';

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

export const FRUIT_POOL: FruitId[] = FRUITS;
export const BALLOON_POOL: ColorId[] = Object.keys(COLORS) as ColorId[];
export const FRIEND_POOL: FriendId[] = [...AVATARS, 'muguri', 'mimo'];

/** Pairs that are deliberately confusable — separated below L8, the point at L8+. */
export const NEAR_PAIRS: Array<[string, string]> = [
	['balloon:blue', 'balloon:light-blue'],
	['balloon:blue', 'balloon:dark-blue'],
	['balloon:light-blue', 'balloon:dark-blue'],
	['balloon:green', 'balloon:light-green'],
	['balloon:green', 'balloon:dark-green'],
	['balloon:light-green', 'balloon:dark-green'],
	['balloon:red', 'balloon:pink'],
	['fruit:lemon', 'fruit:banana'],
	['fruit:apple', 'fruit:cherry'],
	['fruit:orange', 'fruit:peach'],
	['balloon:yellow', 'fruit:lemon'],
	['balloon:yellow', 'fruit:banana'],
	['balloon:red', 'fruit:apple'],
	['balloon:pink', 'fruit:apple'],
	['balloon:red', 'fruit:cherry'],
	['balloon:pink', 'fruit:cherry'],
	['balloon:orange', 'fruit:orange'],
	['balloon:orange', 'fruit:peach'],
	['balloon:green', 'fruit:pear']
];

export const EMPTY_BOARD_STATE: BoardState = { flipped: [], matched: [], misses: 0 };

export function pictureKey(picture: Picture): string {
	return `${picture.theme}:${picture.id}`;
}

export function getLevelConfig(level: number): PairLevelConfig | undefined {
	return LEVELS.find((entry) => entry.level === level);
}

/** Small seeded PRNG (mulberry32) so a level always plays identically. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffled<T>(items: T[], rand: () => number): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

type ThemeSplit = [fruit: number, balloon: number, friend: number];

const MIXED_ALL_SPLITS: ThemeSplit[] = [
	[4, 4, 2],
	[5, 5, 0],
	[3, 4, 3]
];

const THEMES: Picture['theme'][] = ['fruit', 'balloon', 'friend'];

function pictureSplit(config: PairLevelConfig, boardIndex: number): ThemeSplit {
	switch (config.theme) {
		case 'fruit':
			return [config.pairs, 0, 0];
		case 'balloon':
			return [0, config.pairs, 0];
		case 'friend':
			return [0, 0, config.pairs];
		case 'mixed-fruit-balloon':
			return [4, 4, 0];
		case 'mixed-all':
			return MIXED_ALL_SPLITS[boardIndex] ?? [4, 4, 2];
	}
}

function candidateFor(theme: Picture['theme'], rand: () => number): Picture {
	switch (theme) {
		case 'fruit':
			return { theme, id: FRUIT_POOL[Math.floor(rand() * FRUIT_POOL.length)] };
		case 'balloon':
			return { theme, id: BALLOON_POOL[Math.floor(rand() * BALLOON_POOL.length)] };
		case 'friend':
			return { theme, id: FRIEND_POOL[Math.floor(rand() * FRIEND_POOL.length)] };
	}
}

function nearCountOfKeys(keys: Set<string>): number {
	let count = 0;
	for (const [a, b] of NEAR_PAIRS) {
		if (keys.has(a) && keys.has(b)) count += 1;
	}
	return count;
}

const MAX_DRAWS_PER_PICTURE = 30;
const MAX_RESTARTS = 20;

/**
 * One greedy pass over the picture slots. Each slot draws random unused
 * pictures from its theme pool and keeps the first that stays inside the
 * near-pair budget; a slot that cannot be filled after 30 draws fails the
 * whole board so the caller can restart it.
 */
function tryBuildPictures(
	split: ThemeSplit,
	nearBudget: number,
	rand: () => number
): Picture[] | null {
	const picked: Picture[] = [];
	const keys = new Set<string>();
	const counts: Record<Picture['theme'], number> = {
		fruit: split[0],
		balloon: split[1],
		friend: split[2]
	};

	for (const theme of THEMES) {
		for (let slot = 0; slot < counts[theme]; slot += 1) {
			let filled = false;
			for (let draw = 0; draw < MAX_DRAWS_PER_PICTURE; draw += 1) {
				const candidate = candidateFor(theme, rand);
				const key = pictureKey(candidate);
				if (keys.has(key)) continue;
				keys.add(key);
				if (nearCountOfKeys(keys) <= nearBudget) {
					picked.push(candidate);
					filled = true;
					break;
				}
				keys.delete(key);
			}
			if (!filled) return null;
		}
	}
	return picked;
}

function buildPictures(split: ThemeSplit, nearBudget: number, rand: () => number): Picture[] {
	for (let attempt = 0; attempt < MAX_RESTARTS; attempt += 1) {
		const pictures = tryBuildPictures(split, nearBudget, rand);
		if (pictures) return pictures;
	}
	// Pools are always large enough without the near constraint, so this is
	// the deterministic last resort for an impossible pool.
	return tryBuildPictures(split, Number.POSITIVE_INFINITY, rand) ?? [];
}

function pictureSetKey(pictures: Picture[]): string {
	return [...new Set(pictures.map(pictureKey))].sort().join('|');
}

function makeBoard(pictures: Picture[], config: PairLevelConfig, rand: () => number): Board {
	const cards: Card[] = [];
	for (const picture of pictures) {
		const pairId = pictureKey(picture);
		cards.push({ key: `${pairId}#0`, pairId, picture });
		cards.push({ key: `${pairId}#1`, pairId, picture });
	}
	return {
		cards: shuffled(cards, rand),
		cols: config.cols,
		rows: config.rows,
		peekMs: config.peekMs
	};
}

/**
 * Three deterministic boards for a level. Same seed ⇒ identical boards; the
 * default seed derives from the level so a level always plays the same way.
 * Boards are drawn in order from one PRNG stream, and a board never repeats
 * the previous board's picture set when the pool has alternatives.
 */
export function generateLevel(level: number, seed?: number): Board[] {
	const config = getLevelConfig(level);
	if (!config) return [];
	const rand = mulberry32(seed ?? level * 1013);
	const boards: Board[] = [];
	let previousSet = '';

	for (let boardIndex = 0; boardIndex < BOARDS_PER_LEVEL; boardIndex += 1) {
		const split = pictureSplit(config, boardIndex);
		let pictures = buildPictures(split, config.nearBudget, rand);
		if (config.level !== 7 && previousSet) {
			for (
				let attempt = 0;
				attempt < MAX_RESTARTS && pictureSetKey(pictures) === previousSet;
				attempt += 1
			) {
				pictures = buildPictures(split, config.nearBudget, rand);
			}
		}
		previousSet = pictureSetKey(pictures);
		boards.push(makeBoard(pictures, config, rand));
	}

	return boards;
}

/**
 * Apply one tap to the board. Immutable: the returned state is always a new
 * object. A third tap while two cards are up, a repeated tap on the same
 * card, an already matched card, or an out-of-range index is ignored.
 */
export function applyFlip(
	board: Board,
	state: BoardState,
	index: number
): { state: BoardState; result: FlipResult } {
	const card = board.cards[index];
	const ignored = (): { state: BoardState; result: FlipResult } => ({
		state: {
			flipped: [...state.flipped],
			matched: [...state.matched],
			misses: state.misses
		},
		result: 'ignored'
	});

	if (!Number.isInteger(index) || !card) return ignored();
	if (state.flipped.length >= 2) return ignored();
	if (state.flipped.includes(index)) return ignored();
	if (state.matched.includes(card.pairId)) return ignored();

	if (state.flipped.length === 0) {
		return {
			state: { flipped: [index], matched: [...state.matched], misses: state.misses },
			result: 'first'
		};
	}

	const first = board.cards[state.flipped[0]];
	if (first && first.pairId === card.pairId) {
		return {
			state: {
				flipped: [],
				matched: [...state.matched, card.pairId],
				misses: state.misses
			},
			result: 'match'
		};
	}

	return {
		state: {
			flipped: [...state.flipped, index],
			matched: [...state.matched],
			misses: state.misses + 1
		},
		result: 'miss'
	};
}

/** Hide a pending mismatch without touching the match list or miss count. */
export function clearFlip(state: BoardState): BoardState {
	return { flipped: [], matched: [...state.matched], misses: state.misses };
}

export function isBoardComplete(board: Board, state: BoardState): boolean {
	const pairIds = new Set(board.cards.map((card) => card.pairId));
	for (const pairId of pairIds) {
		if (!state.matched.includes(pairId)) return false;
	}
	return true;
}

/**
 * Which help the child sees for the current board. Stage 3 reveals a card
 * after 6 misses or 3 Help presses; stage 2 glows after 4 misses or 2
 * presses; stage 1 nudges after 2 misses, 1 press, or a quiet spell.
 */
export function hintStage(misses: number, manualHints: number, idle = false): 0 | 1 | 2 | 3 {
	if (misses >= 6 || manualHints >= 3) return 3;
	if (misses >= 4 || manualHints >= 2) return 2;
	if (misses >= 2 || manualHints >= 1 || idle) return 1;
	return 0;
}

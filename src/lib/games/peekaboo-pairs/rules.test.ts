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

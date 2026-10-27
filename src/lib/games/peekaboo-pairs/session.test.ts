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
	it('replays from the first board with fresh state and new boards', () => {
		const s = createPairsSession(1, 1);
		s.peekDone();
		s.flip(0);
		const before = s.boards;
		s.replay();
		expect(s.boards).not.toEqual(before);
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
	it('points hintIndex at an unmatched pair after a match', () => {
		const s = createPairsSession(1, 1);
		s.peekDone();
		const pairId = s.board.cards[0]!.pairId;
		const twin = s.board.cards.findIndex((card, i) => i > 0 && card.pairId === pairId);
		s.flip(0);
		s.flip(twin);
		expect(s.matched).toContain(pairId);
		const index = s.hintIndex;
		expect(index).not.toBeNull();
		expect(s.matched).not.toContain(s.board.cards[index!]!.pairId);
	});
	it('never points hintIndex at a card that is currently flipped', () => {
		const s = createPairsSession(1, 1);
		s.peekDone();
		const other = s.board.cards.findIndex((card) => card.pairId !== s.board.cards[0]!.pairId);
		s.flip(0);
		s.flip(other);
		expect(s.flipped).toEqual([0, other]);
		expect(s.hintIndex).not.toBe(0);
		expect(s.hintIndex).not.toBe(other);
	});
	it('keeps the configured peek time', () => {
		const s = createPairsSession(3, 1);
		expect(s.board.peekMs).toBe(LEVELS[2]!.peekMs);
	});
});

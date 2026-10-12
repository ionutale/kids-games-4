import { describe, expect, it } from 'vitest';
import {
	CHOICES,
	LEVELS,
	MAX_LEVEL,
	ROUNDS_PER_LEVEL,
	generateLevel,
	getLevelConfig,
	hintStage,
	layoutPile,
	makeOptions,
	makePairs
} from './rules.js';

const rand = () => 0.5;

/** Local seeded PRNG so tests that need varying randoms stay deterministic. */
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

describe('level table', () => {
	it('matches the brief exactly', () => {
		expect(MAX_LEVEL).toBe(10);
		expect(ROUNDS_PER_LEVEL).toBe(5);
		expect(CHOICES).toBe(3);
		expect(LEVELS).toEqual([
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
		]);
	});

	it('enables chips from level 3 on', () => {
		for (const config of LEVELS) {
			expect(config.chip).toBe(config.level >= 3);
		}
	});

	it('getLevelConfig returns the config or undefined', () => {
		expect(getLevelConfig(1)).toEqual(LEVELS[0]);
		expect(getLevelConfig(10)).toEqual(LEVELS[9]);
		expect(getLevelConfig(0)).toBeUndefined();
		expect(getLevelConfig(11)).toBeUndefined();
	});
});

describe('makePairs', () => {
	it('keeps every pair within min..max with groups >= 1', () => {
		for (const config of LEVELS) {
			const pairs = makePairs(config, mulberry32(42));
			expect(pairs).toHaveLength(ROUNDS_PER_LEVEL);
			for (const [a, b] of pairs) {
				expect(a).toBeGreaterThanOrEqual(1);
				expect(b).toBeGreaterThanOrEqual(1);
				expect(a + b).toBeGreaterThanOrEqual(config.min);
				expect(a + b).toBeLessThanOrEqual(config.max);
			}
		}
	});

	it('never repeats a pair consecutively', () => {
		for (const config of LEVELS) {
			const pairs = makePairs(config, mulberry32(99));
			for (let i = 1; i < pairs.length; i++) {
				expect(pairs[i]).not.toEqual(pairs[i - 1]);
			}
		}
	});

	it('returns unique pairs when the pool allows', () => {
		for (const config of LEVELS) {
			let poolSize = 0;
			for (let a = 1; a <= config.max - 1; a++) {
				for (let b = 1; b <= config.max - a; b++) {
					if (a + b >= config.min && a + b <= config.max) poolSize++;
				}
			}
			if (poolSize < ROUNDS_PER_LEVEL) continue;
			const pairs = makePairs(config, mulberry32(7));
			const keys = pairs.map(([a, b]) => `${a}+${b}`);
			expect(new Set(keys).size).toBe(ROUNDS_PER_LEVEL);
		}
	});
});

describe('makeOptions', () => {
	it('returns exactly 3 unique values including sum, all >= 1', () => {
		for (const config of LEVELS) {
			for (let sum = config.min; sum <= config.max; sum++) {
				const options = makeOptions(config, sum, rand);
				expect(options).toHaveLength(3);
				expect(options).toContain(sum);
				expect(new Set(options).size).toBe(3);
				for (const value of options) {
					expect(value).toBeGreaterThanOrEqual(1);
				}
			}
		}
	});

	it('prefers near-miss distractors on level 4+', () => {
		const config = getLevelConfig(4)!;
		const options = makeOptions(config, 6, rand);
		expect(new Set(options.filter((value) => value !== 6))).toEqual(new Set([7, 5]));
	});

	it('skips near-miss neighbours below 1 on level 4+', () => {
		const config = getLevelConfig(4)!;
		const options = makeOptions(config, 1, rand);
		expect(new Set(options.filter((value) => value !== 1))).toEqual(new Set([2, 3]));
	});
});

describe('layoutPile', () => {
	it('places exactly count spots inside the left zone with size/tilt ranges', () => {
		for (let count = 2; count <= 12; count++) {
			const spots = layoutPile(count, 'left', rand);
			expect(spots).toHaveLength(count);
			for (const spot of spots) {
				expect(spot.x).toBeGreaterThanOrEqual(12);
				expect(spot.x).toBeLessThanOrEqual(48);
				expect(spot.y).toBeGreaterThanOrEqual(28);
				expect(spot.y).toBeLessThanOrEqual(72);
				expect(spot.size).toBeGreaterThanOrEqual(0.9);
				expect(spot.size).toBeLessThanOrEqual(1.15);
				expect(spot.tilt).toBeGreaterThanOrEqual(-10);
				expect(spot.tilt).toBeLessThanOrEqual(10);
			}
		}
	});

	it('places exactly count spots inside the right zone', () => {
		for (let count = 1; count <= 11; count++) {
			const spots = layoutPile(count, 'right', mulberry32(11));
			expect(spots).toHaveLength(count);
			for (const spot of spots) {
				expect(spot.x).toBeGreaterThanOrEqual(60);
				expect(spot.x).toBeLessThanOrEqual(90);
				expect(spot.y).toBeGreaterThanOrEqual(26);
				expect(spot.y).toBeLessThanOrEqual(68);
			}
		}
	});

	it('keeps pairwise distances >= 16', () => {
		for (let count = 2; count <= 8; count++) {
			const spots = layoutPile(count, 'left', mulberry32(2024 + count));
			for (let i = 0; i < spots.length; i++) {
				for (let j = i + 1; j < spots.length; j++) {
					const dx = spots[i].x - spots[j].x;
					const dy = spots[i].y - spots[j].y;
					expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(16);
				}
			}
		}
		for (let count = 2; count <= 6; count++) {
			const spots = layoutPile(count, 'right', mulberry32(3031 + count));
			for (let i = 0; i < spots.length; i++) {
				for (let j = i + 1; j < spots.length; j++) {
					const dx = spots[i].x - spots[j].x;
					const dy = spots[i].y - spots[j].y;
					expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(16);
				}
			}
		}
	});
});

describe('generateLevel', () => {
	it('produces 5 rounds with a + b = sum inside [min, max]', () => {
		for (const config of LEVELS) {
			const rounds = generateLevel(config.level, 42);
			expect(rounds).toHaveLength(5);
			for (const round of rounds) {
				expect(round.sum).toBe(round.a + round.b);
				expect(round.sum).toBeGreaterThanOrEqual(config.min);
				expect(round.sum).toBeLessThanOrEqual(config.max);
				expect(round.left).toHaveLength(round.a);
				expect(round.travels).toHaveLength(round.b);
				expect(round.options).toHaveLength(3);
			}
		}
	});

	it('is deterministic for the same seed', () => {
		expect(generateLevel(5, 1234)).toEqual(generateLevel(5, 1234));
	});

	it('is deterministic with the default seed', () => {
		expect(generateLevel(7)).toEqual(generateLevel(7));
	});

	it('places travels from the right zone with delays 0..b-1', () => {
		const rounds = generateLevel(5, 1234);
		for (const round of rounds) {
			expect(round.travels.map((spot) => spot.delay)).toEqual(round.travels.map((_, i) => i));
			for (const spot of round.travels) {
				expect(spot.fromX).toBeGreaterThanOrEqual(60);
				expect(spot.fromX).toBeLessThanOrEqual(90);
			}
		}
	});

	it('returns no rounds for an unknown level', () => {
		expect(generateLevel(99, 1)).toEqual([]);
	});
});

describe('hintStage', () => {
	it('follows the miss boundaries', () => {
		expect(hintStage(0, 0, false)).toBe(0);
		expect(hintStage(1, 0, false)).toBe(0);
		expect(hintStage(2, 0, false)).toBe(1);
		expect(hintStage(3, 0, false)).toBe(1);
		expect(hintStage(4, 0, false)).toBe(2);
		expect(hintStage(5, 0, false)).toBe(2);
		expect(hintStage(6, 0, false)).toBe(3);
		expect(hintStage(9, 0, false)).toBe(3);
	});

	it('follows the manual-hint boundaries', () => {
		expect(hintStage(0, 1, false)).toBe(1);
		expect(hintStage(0, 2, false)).toBe(2);
		expect(hintStage(0, 3, false)).toBe(3);
	});

	it('returns 1 when idle', () => {
		expect(hintStage(0, 0, true)).toBe(1);
	});
});

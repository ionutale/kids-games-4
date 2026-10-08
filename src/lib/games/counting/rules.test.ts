import { describe, expect, it } from 'vitest';
import {
	FRUITS,
	LEVELS,
	MAX_LEVEL,
	ROUNDS_PER_LEVEL,
	generateLevel,
	getLevelConfig,
	hintStage,
	layoutFruits,
	makeOptions
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
		expect(LEVELS).toEqual([
			{
				level: 1,
				min: 1,
				max: 3,
				layout: 'row',
				choices: 2,
				tight: false,
				kinds: 1,
				assist: false
			},
			{
				level: 2,
				min: 1,
				max: 4,
				layout: 'row',
				choices: 2,
				tight: false,
				kinds: 1,
				assist: false
			},
			{
				level: 3,
				min: 1,
				max: 5,
				layout: 'row',
				choices: 3,
				tight: false,
				kinds: 1,
				assist: false
			},
			{
				level: 4,
				min: 2,
				max: 6,
				layout: 'cluster',
				choices: 3,
				tight: false,
				kinds: 1,
				assist: false
			},
			{
				level: 5,
				min: 1,
				max: 8,
				layout: 'scatter',
				choices: 3,
				tight: false,
				kinds: 1,
				assist: true
			},
			{
				level: 6,
				min: 2,
				max: 10,
				layout: 'scatter',
				choices: 3,
				tight: false,
				kinds: 2,
				assist: true
			},
			{
				level: 7,
				min: 1,
				max: 12,
				layout: 'scatter',
				choices: 4,
				tight: true,
				kinds: 2,
				assist: true
			},
			{
				level: 8,
				min: 1,
				max: 15,
				layout: 'scatter',
				choices: 4,
				tight: true,
				kinds: 2,
				assist: true
			},
			{
				level: 9,
				min: 3,
				max: 18,
				layout: 'scatter',
				choices: 4,
				tight: true,
				kinds: 3,
				assist: true
			},
			{
				level: 10,
				min: 5,
				max: 20,
				layout: 'scatter',
				choices: 4,
				tight: true,
				kinds: 3,
				assist: true
			}
		]);
	});

	it('getLevelConfig returns the config or undefined', () => {
		expect(getLevelConfig(1)).toEqual(LEVELS[0]);
		expect(getLevelConfig(10)).toEqual(LEVELS[9]);
		expect(getLevelConfig(0)).toBeUndefined();
		expect(getLevelConfig(11)).toBeUndefined();
	});
});

describe('generateLevel', () => {
	it('produces ROUNDS_PER_LEVEL rounds within [min, max]', () => {
		for (const config of LEVELS) {
			const rounds = generateLevel(config.level, 42);
			expect(rounds).toHaveLength(ROUNDS_PER_LEVEL);
			for (const round of rounds) {
				expect(round.count).toBeGreaterThanOrEqual(config.min);
				expect(round.count).toBeLessThanOrEqual(config.max);
				expect(round.fruits).toHaveLength(round.count);
			}
		}
	});

	it('is deterministic for the same seed', () => {
		expect(generateLevel(5, 1234)).toEqual(generateLevel(5, 1234));
	});

	it('is deterministic with the default seed', () => {
		expect(generateLevel(7)).toEqual(generateLevel(7));
	});

	it('keeps counts unique when the range allows', () => {
		for (const config of LEVELS) {
			if (config.max - config.min + 1 < ROUNDS_PER_LEVEL) continue;
			const counts = generateLevel(config.level, 7).map((round) => round.count);
			expect(new Set(counts).size).toBe(ROUNDS_PER_LEVEL);
		}
	});

	it('never repeats a count consecutively', () => {
		for (const config of LEVELS) {
			const counts = generateLevel(config.level, 99).map((round) => round.count);
			for (let i = 1; i < counts.length; i++) {
				expect(counts[i]).not.toBe(counts[i - 1]);
			}
		}
	});

	it('rotates the fruit kind per level', () => {
		const kindsOf = (level: number) =>
			new Set(generateLevel(level, 5).flatMap((round) => round.fruits.map((fruit) => fruit.kind)));
		expect(kindsOf(2)).toEqual(new Set(['pear']));
		expect(kindsOf(5)).toEqual(new Set(['grapes']));
		expect(kindsOf(7)).toEqual(new Set([FRUITS[6], FRUITS[7]]));
		expect(kindsOf(9)).toEqual(new Set([FRUITS[8], FRUITS[9], FRUITS[0]]));
	});

	it('returns no rounds for an unknown level', () => {
		expect(generateLevel(99, 1)).toEqual([]);
	});
});

describe('makeOptions', () => {
	it('returns exactly choices unique values including correct, all in range', () => {
		for (const config of LEVELS) {
			for (let correct = config.min; correct <= config.max; correct++) {
				const options = makeOptions(config, correct, rand);
				expect(options).toHaveLength(config.choices);
				expect(options).toContain(correct);
				expect(new Set(options).size).toBe(config.choices);
				for (const value of options) {
					expect(value).toBeGreaterThanOrEqual(config.min);
					expect(value).toBeLessThanOrEqual(config.max);
				}
			}
		}
	});

	it('prefers nearest neighbours on tight levels', () => {
		const config = getLevelConfig(7)!;
		const options = makeOptions(config, 5, rand);
		expect(new Set(options.filter((value) => value !== 5))).toEqual(new Set([6, 4, 7]));
	});

	it('skips out-of-range neighbours on tight levels', () => {
		const config = getLevelConfig(7)!;
		const options = makeOptions(config, 1, rand);
		expect(new Set(options.filter((value) => value !== 1))).toEqual(new Set([2, 3, 4]));
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

describe('layoutFruits', () => {
	it('places exactly count fruits inside safe bounds', () => {
		for (const layout of ['row', 'cluster', 'scatter'] as const) {
			for (let count = 1; count <= 20; count++) {
				const fruits = layoutFruits(count, layout, 2, rand);
				expect(fruits).toHaveLength(count);
				for (const fruit of fruits) {
					expect(fruit.x).toBeGreaterThanOrEqual(5);
					expect(fruit.x).toBeLessThanOrEqual(95);
					expect(fruit.y).toBeGreaterThanOrEqual(10);
					expect(fruit.y).toBeLessThanOrEqual(90);
					expect(fruit.size).toBeGreaterThanOrEqual(0.85);
					expect(fruit.size).toBeLessThanOrEqual(1.15);
					expect(fruit.tilt).toBeGreaterThanOrEqual(-12);
					expect(fruit.tilt).toBeLessThanOrEqual(12);
					expect(FRUITS).toContain(fruit.kind);
				}
			}
		}
	});

	it('assigns kinds round-robin from FRUITS', () => {
		const fruits = layoutFruits(6, 'scatter', 3, rand);
		expect(new Set(fruits.map((fruit) => fruit.kind))).toEqual(new Set(FRUITS.slice(0, 3)));
		expect(fruits.map((fruit) => fruit.kind)).toEqual([
			FRUITS[0],
			FRUITS[1],
			FRUITS[2],
			FRUITS[0],
			FRUITS[1],
			FRUITS[2]
		]);
	});

	it('lays rows evenly spaced on the same y', () => {
		const fruits = layoutFruits(5, 'row', 1, rand);
		const xs = fruits.map((fruit) => fruit.x);
		const ys = new Set(fruits.map((fruit) => fruit.y));
		expect(ys.size).toBe(1);
		const sorted = [...xs].sort((a, b) => a - b);
		const gap = sorted[1] - sorted[0];
		for (let i = 2; i < sorted.length; i++) {
			expect(sorted[i] - sorted[i - 1]).toBeCloseTo(gap, 5);
		}
	});

	it('keeps scatter fruits apart', () => {
		const fruits = layoutFruits(20, 'scatter', 1, mulberry32(2024));
		for (let i = 0; i < fruits.length; i++) {
			for (let j = i + 1; j < fruits.length; j++) {
				const dx = fruits[i].x - fruits[j].x;
				const dy = fruits[i].y - fruits[j].y;
				expect(Math.hypot(dx, dy)).toBeGreaterThan(12);
			}
		}
	});
});

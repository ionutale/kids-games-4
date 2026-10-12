import { describe, expect, it } from 'vitest';
import {
	COLORS,
	LEVELS,
	MAX_LEVEL,
	NEIGHBORS,
	ROUNDS_PER_LEVEL,
	SIBLING,
	generateLevel,
	getLevelConfig,
	hintStage,
	layoutBalloons,
	makeOptions,
	type ColorId
} from './rules.js';

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
	it('has 10 entries', () => {
		expect(MAX_LEVEL).toBe(10);
		expect(ROUNDS_PER_LEVEL).toBe(5);
		expect(LEVELS).toHaveLength(10);
	});

	it('matches the brief exactly', () => {
		expect(LEVELS).toEqual([
			{ level: 1, targets: ['red', 'yellow'], choices: 2, mode: 'plain' },
			{ level: 2, targets: ['red', 'yellow', 'blue'], choices: 3, mode: 'plain' },
			{ level: 3, targets: ['red', 'yellow', 'blue', 'green'], choices: 3, mode: 'plain' },
			{
				level: 4,
				targets: ['red', 'yellow', 'blue', 'green', 'orange'],
				choices: 3,
				mode: 'plain'
			},
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
			{
				level: 9,
				targets: ['red', 'orange', 'pink', 'blue', 'green'],
				choices: 4,
				mode: 'near'
			},
			{
				level: 10,
				targets: ['red', 'yellow', 'blue', 'green', 'orange', 'purple', 'pink'],
				choices: 4,
				mode: 'mixed'
			}
		]);
	});

	it('pins key level shapes', () => {
		const l1 = getLevelConfig(1)!;
		expect(l1.targets).toEqual(['red', 'yellow']);
		expect(l1.choices).toBe(2);
		expect(l1.mode).toBe('plain');

		const l6 = getLevelConfig(6)!;
		expect(l6.targets).toHaveLength(7);
		expect(l6.choices).toBe(3);

		const l7 = getLevelConfig(7)!;
		expect(l7.choices).toBe(4);

		const l8 = getLevelConfig(8)!;
		expect(l8.targets).toEqual(['light-blue', 'dark-blue', 'light-green', 'dark-green']);
		expect(l8.mode).toBe('shades');

		const l9 = getLevelConfig(9)!;
		expect(l9.mode).toBe('near');
		expect(l9.targets).not.toContain('teal');

		const l10 = getLevelConfig(10)!;
		expect(l10.mode).toBe('mixed');
	});

	it('getLevelConfig returns the config or undefined', () => {
		expect(getLevelConfig(1)).toEqual(LEVELS[0]);
		expect(getLevelConfig(10)).toEqual(LEVELS[9]);
		expect(getLevelConfig(0)).toBeUndefined();
		expect(getLevelConfig(11)).toBeUndefined();
	});
});

describe('generateLevel', () => {
	it('produces 5 rounds per level', () => {
		for (const config of LEVELS) {
			const rounds = generateLevel(config.level, 42);
			expect(rounds).toHaveLength(5);
		}
	});

	it('is deterministic for the same seed', () => {
		expect(generateLevel(5, 1234)).toEqual(generateLevel(5, 1234));
	});

	it('is deterministic with the default seed', () => {
		expect(generateLevel(7)).toEqual(generateLevel(7));
	});

	it('draws every target from the config targets', () => {
		for (const config of LEVELS) {
			for (const round of generateLevel(config.level, 11)) {
				expect(config.targets).toContain(round.target);
			}
		}
	});

	it('gives every round exactly choices unique options with the target once', () => {
		for (const config of LEVELS) {
			for (const round of generateLevel(config.level, 21)) {
				expect(round.options).toHaveLength(config.choices);
				expect(round.options.filter((o) => o === round.target)).toHaveLength(1);
				expect(new Set(round.options).size).toBe(config.choices);
			}
		}
	});

	it('never repeats a target consecutively', () => {
		for (const config of LEVELS) {
			const targets = generateLevel(config.level, 99).map((r) => r.target);
			for (let i = 1; i < targets.length; i++) {
				expect(targets[i]).not.toBe(targets[i - 1]);
			}
		}
	});

	it('uses unique targets when the pool allows it', () => {
		for (const config of LEVELS) {
			if (config.targets.length < ROUNDS_PER_LEVEL) continue;
			const targets = generateLevel(config.level, 7).map((r) => r.target);
			expect(new Set(targets).size).toBe(ROUNDS_PER_LEVEL);
		}
	});

	it('has no duplicate (hue, tone) pairs among options', () => {
		for (const config of LEVELS) {
			for (const round of generateLevel(config.level, 31)) {
				const pairs = round.options.map((o) => `${COLORS[o].hue}:${COLORS[o].tone}`);
				expect(new Set(pairs).size).toBe(round.options.length);
			}
		}
	});

	it('returns no rounds for an unknown level', () => {
		expect(generateLevel(99, 1)).toEqual([]);
	});
});

describe('makeOptions', () => {
	it('returns exactly choices distinct ids with the target once', () => {
		for (const config of LEVELS) {
			const rand = mulberry32(5);
			for (const target of config.targets) {
				const options = makeOptions(config, target, rand);
				expect(options).toHaveLength(config.choices);
				expect(options.filter((o) => o === target)).toHaveLength(1);
				expect(new Set(options).size).toBe(config.choices);
			}
		}
	});

	it('uses no duplicate (hue, tone) pairs', () => {
		for (const config of LEVELS) {
			const rand = mulberry32(6);
			for (const target of config.targets) {
				const options = makeOptions(config, target, rand);
				const pairs = options.map((o) => `${COLORS[o].hue}:${COLORS[o].tone}`);
				expect(new Set(pairs).size).toBe(options.length);
			}
		}
	});

	it('includes the sibling on shades levels', () => {
		const config = getLevelConfig(8)!;
		for (const target of config.targets) {
			const sibling = SIBLING[target];
			expect(sibling).toBeDefined();
			const options = makeOptions(config, target, mulberry32(77));
			expect(options).toContain(sibling);
		}
	});

	it('uses at least choices - 2 NEIGHBORS members on near levels', () => {
		const config = getLevelConfig(9)!;
		for (const target of config.targets) {
			const options = makeOptions(config, target, mulberry32(78));
			const neighbors = new Set(NEIGHBORS[target] ?? []);
			const neighborCount = options.filter((o) => o !== target && neighbors.has(o)).length;
			expect(neighborCount).toBeGreaterThanOrEqual(config.choices - 2);
		}
	});

	it('produces distinct options on mixed levels', () => {
		const config = getLevelConfig(10)!;
		for (const target of config.targets) {
			const options = makeOptions(config, target, mulberry32(79));
			expect(options).toHaveLength(config.choices);
			expect(new Set(options).size).toBe(config.choices);
			expect(options).toContain(target);
		}
	});
});

describe('layoutBalloons', () => {
	it('places one spot per option inside bounds with valid size and tilt', () => {
		const options: ColorId[] = ['red', 'yellow', 'blue', 'green'];
		const spots = layoutBalloons(options, mulberry32(3));
		expect(spots).toHaveLength(options.length);
		expect(spots.map((s) => s.color)).toEqual(options);
		for (const spot of spots) {
			expect(spot.x).toBeGreaterThanOrEqual(8);
			expect(spot.x).toBeLessThanOrEqual(92);
			expect(spot.y).toBeGreaterThanOrEqual(14);
			expect(spot.y).toBeLessThanOrEqual(64);
			expect(spot.size).toBeGreaterThanOrEqual(0.9);
			expect(spot.size).toBeLessThanOrEqual(1.15);
			expect(spot.tilt).toBeGreaterThanOrEqual(-8);
			expect(spot.tilt).toBeLessThanOrEqual(8);
			expect(spot.delay).toBeGreaterThanOrEqual(0);
			expect(spot.delay).toBeLessThanOrEqual(4);
		}
	});

	it('keeps a minimum horizontal distance of 20', () => {
		const options: ColorId[] = ['red', 'yellow', 'blue', 'green'];
		const spots = layoutBalloons(options, mulberry32(4));
		for (let i = 0; i < spots.length; i++) {
			for (let j = i + 1; j < spots.length; j++) {
				expect(Math.abs(spots[i].x - spots[j].x)).toBeGreaterThanOrEqual(20);
			}
		}
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

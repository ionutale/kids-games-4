import { describe, expect, it } from 'vitest';
import {
	CONFUSABLE,
	LEVELS,
	MAX_LEVEL,
	ROUNDS_PER_LEVEL,
	SCENE_EMOTION,
	generateLevel,
	getLevelConfig,
	hintStage,
	makeOptions,
	pickScenes,
	type EmotionId,
	type SceneId
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

const ALL_SCENES: SceneId[] = [
	'balloon-away',
	'fallen-icecream',
	'gift',
	'storm',
	'spilled-cup',
	'broken-toy',
	'hug',
	'bedtime',
	'pop-out'
];

/** Two emotions that share a CONFUSABLE pair. */
const samePair = (a: EmotionId, b: EmotionId) =>
	CONFUSABLE.some((pair) => pair.includes(a) && pair.includes(b));

/** How many distinct confusable groups a set of emotions touches. */
const groupCount = (emotions: EmotionId[]) => {
	const groups = new Set<number>();
	for (const emotion of emotions) {
		const index = CONFUSABLE.findIndex((pair) => pair.includes(emotion));
		groups.add(index === -1 ? -1 - emotions.indexOf(emotion) : index);
	}
	return groups.size;
};

describe('level table', () => {
	it('has 10 entries', () => {
		expect(MAX_LEVEL).toBe(10);
		expect(ROUNDS_PER_LEVEL).toBe(5);
		expect(LEVELS).toHaveLength(10);
	});

	it('matches the brief exactly', () => {
		expect(LEVELS).toEqual([
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
				scenes: [
					'gift',
					'hug',
					'balloon-away',
					'fallen-icecream',
					'spilled-cup',
					'broken-toy',
					'storm'
				]
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
		]);
	});

	it('keeps targets a subset of emotions', () => {
		for (const config of LEVELS) {
			for (const target of config.targets) {
				expect(config.emotions).toContain(target);
			}
		}
	});

	it('makes L8 the subtle pair only', () => {
		expect(CONFUSABLE[0]).toEqual(['scared', 'surprised']);
		expect(getLevelConfig(8)!.targets).toEqual(['scared', 'surprised']);
		expect(getLevelConfig(8)!.mode).toBe('subtle');
	});

	it('getLevelConfig returns the config or undefined', () => {
		expect(getLevelConfig(1)).toEqual(LEVELS[0]);
		expect(getLevelConfig(10)).toEqual(LEVELS[9]);
		expect(getLevelConfig(0)).toBeUndefined();
		expect(getLevelConfig(11)).toBeUndefined();
	});
});

describe('SCENE_EMOTION', () => {
	it('maps all nine scenes', () => {
		expect(Object.keys(SCENE_EMOTION)).toHaveLength(9);
		expect(SCENE_EMOTION).toEqual({
			'balloon-away': 'sad',
			'fallen-icecream': 'sad',
			gift: 'happy',
			storm: 'scared',
			'spilled-cup': 'angry',
			'broken-toy': 'angry',
			hug: 'happy',
			bedtime: 'sleepy',
			'pop-out': 'surprised'
		});
		for (const scene of ALL_SCENES) {
			expect(SCENE_EMOTION[scene]).toBeDefined();
		}
	});
});

describe('makeOptions', () => {
	it('returns exactly choices distinct emotions including the target', () => {
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

	it('keeps no two options from the same confusable pair on match/situation levels', () => {
		for (const config of LEVELS) {
			if (config.mode !== 'match' && config.mode !== 'situation') continue;
			// The constraint is only satisfiable when the pool has enough
			// distinct confusable groups to fill every button.
			if (groupCount(config.emotions) < config.choices) continue;
			const rand = mulberry32(6);
			for (const target of config.targets) {
				const options = makeOptions(config, target, rand);
				for (let i = 0; i < options.length; i++) {
					for (let j = i + 1; j < options.length; j++) {
						expect(samePair(options[i], options[j])).toBe(false);
					}
				}
			}
		}
	});

	it('includes the confusable partner on subtle levels', () => {
		for (const level of [8, 9]) {
			const config = getLevelConfig(level)!;
			for (const target of config.targets) {
				const partner = CONFUSABLE.flat().find(
					(emotion) => emotion !== target && samePair(emotion, target)
				);
				expect(partner).toBeDefined();
				const options = makeOptions(config, target, mulberry32(77));
				expect(options).toContain(partner);
			}
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

describe('pickScenes', () => {
	it('returns five nulls in match mode', () => {
		expect(pickScenes(getLevelConfig(1)!, mulberry32(1))).toEqual([null, null, null, null, null]);
		expect(pickScenes(getLevelConfig(2)!, mulberry32(2))).toEqual([null, null, null, null, null]);
	});

	it('never repeats a scene or its emotion consecutively', () => {
		for (const config of LEVELS) {
			if (config.mode === 'match') continue;
			const scenes = pickScenes(config, mulberry32(99));
			expect(scenes).toHaveLength(ROUNDS_PER_LEVEL);
			for (const scene of scenes) {
				expect(config.scenes).toContain(scene);
			}
			for (let i = 1; i < scenes.length; i++) {
				expect(scenes[i]).not.toBe(scenes[i - 1]);
				expect(SCENE_EMOTION[scenes[i] as SceneId]).not.toBe(
					SCENE_EMOTION[scenes[i - 1] as SceneId]
				);
			}
		}
	});

	it('uses unique scenes when the pool is at least five', () => {
		for (const config of LEVELS) {
			if (config.mode === 'match' || config.scenes.length < ROUNDS_PER_LEVEL) continue;
			const scenes = pickScenes(config, mulberry32(7));
			expect(new Set(scenes).size).toBe(ROUNDS_PER_LEVEL);
		}
	});
});

describe('generateLevel', () => {
	it('produces 5 rounds per level', () => {
		for (const config of LEVELS) {
			expect(generateLevel(config.level, 42)).toHaveLength(ROUNDS_PER_LEVEL);
		}
	});

	it('is deterministic for the same seed', () => {
		expect(generateLevel(5, 1234)).toEqual(generateLevel(5, 1234));
	});

	it('is deterministic with the default seed', () => {
		expect(generateLevel(7)).toEqual(generateLevel(7));
	});

	it('draws targets from the config targets', () => {
		for (const config of LEVELS) {
			for (const round of generateLevel(config.level, 11)) {
				expect(config.targets).toContain(round.target);
			}
		}
	});

	it('derives the target from the scene in scene modes', () => {
		for (const config of LEVELS) {
			if (config.mode === 'match') continue;
			for (const round of generateLevel(config.level, 17)) {
				expect(round.scene).not.toBeNull();
				expect(config.scenes).toContain(round.scene);
				expect(round.target).toBe(SCENE_EMOTION[round.scene as SceneId]);
			}
		}
	});

	it('leaves the scene null in match mode', () => {
		for (const round of generateLevel(1, 17)) {
			expect(round.scene).toBeNull();
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

	it('alternates who across the five rounds on L1-6', () => {
		for (const level of [1, 2, 3, 4, 5, 6]) {
			const whos = generateLevel(level, 3).map((r) => r.who);
			expect(whos[0]).toBe('muguri');
			expect(new Set(whos)).toEqual(new Set(['muguri', 'mimo']));
			for (let i = 1; i < whos.length; i++) {
				expect(whos[i]).not.toBe(whos[i - 1]);
			}
		}
	});

	it('keeps who a valid character on L7+', () => {
		for (const level of [7, 8, 9, 10]) {
			for (const round of generateLevel(level, 5)) {
				expect(['muguri', 'mimo']).toContain(round.who);
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

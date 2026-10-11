/**
 * Pure rules for the "Color Match" balloon game. No DOM, no Svelte, no
 * storage access, so every function here is unit-testable and
 * deterministic when given a seeded PRNG.
 */

export type ColorId =
	| 'red'
	| 'yellow'
	| 'blue'
	| 'green'
	| 'orange'
	| 'purple'
	| 'pink'
	| 'light-blue'
	| 'dark-blue'
	| 'light-green'
	| 'dark-green'
	| 'teal';

export type HueFamily = 'red' | 'yellow' | 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'teal';

export type Tone = 'light' | 'mid' | 'deep';

export const COLORS: Record<ColorId, { hue: HueFamily; tone: Tone }> = {
	red: { hue: 'red', tone: 'mid' },
	yellow: { hue: 'yellow', tone: 'mid' },
	blue: { hue: 'blue', tone: 'mid' },
	green: { hue: 'green', tone: 'mid' },
	orange: { hue: 'orange', tone: 'mid' },
	purple: { hue: 'purple', tone: 'mid' },
	pink: { hue: 'pink', tone: 'mid' },
	teal: { hue: 'teal', tone: 'light' },
	'light-blue': { hue: 'blue', tone: 'light' },
	'dark-blue': { hue: 'blue', tone: 'deep' },
	'light-green': { hue: 'green', tone: 'light' },
	'dark-green': { hue: 'green', tone: 'deep' }
};

export const SIBLING: Partial<Record<ColorId, ColorId>> = {
	'light-blue': 'dark-blue',
	'dark-blue': 'light-blue',
	'light-green': 'dark-green',
	'dark-green': 'light-green'
};

export const NEIGHBORS: Partial<Record<ColorId, ColorId[]>> = {
	red: ['orange', 'pink', 'purple'],
	orange: ['red', 'yellow', 'pink'],
	yellow: ['orange', 'green'],
	pink: ['red', 'purple'],
	purple: ['pink', 'blue'],
	blue: ['purple', 'teal', 'light-blue'],
	green: ['teal', 'yellow', 'light-green'],
	'light-blue': ['blue', 'dark-blue'],
	'dark-blue': ['blue', 'light-blue'],
	'light-green': ['green', 'dark-green'],
	'dark-green': ['green', 'light-green']
};

export type ColorMode = 'plain' | 'shades' | 'near' | 'mixed';

export interface ColorLevelConfig {
	level: number;
	targets: ColorId[];
	choices: number;
	mode: ColorMode;
}

export interface BalloonSpot {
	color: ColorId;
	x: number;
	y: number;
	size: number;
	tilt: number;
	delay: number;
}

export interface Round {
	target: ColorId;
	options: ColorId[];
	balloons: BalloonSpot[];
}

export const MAX_LEVEL = 10;
export const ROUNDS_PER_LEVEL = 5;

export const LEVELS: ColorLevelConfig[] = [
	{ level: 1, targets: ['red', 'yellow'], choices: 2, mode: 'plain' },
	{ level: 2, targets: ['red', 'yellow', 'blue'], choices: 3, mode: 'plain' },
	{ level: 3, targets: ['red', 'yellow', 'blue', 'green'], choices: 3, mode: 'plain' },
	{ level: 4, targets: ['red', 'yellow', 'blue', 'green', 'orange'], choices: 3, mode: 'plain' },
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
	{ level: 9, targets: ['red', 'orange', 'pink', 'blue', 'green'], choices: 4, mode: 'near' },
	{
		level: 10,
		targets: ['red', 'yellow', 'blue', 'green', 'orange', 'purple', 'pink'],
		choices: 4,
		mode: 'mixed'
	}
];

export function getLevelConfig(level: number): ColorLevelConfig | undefined {
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

const ALL_IDS = Object.keys(COLORS) as ColorId[];

const pairKey = (id: ColorId) => `${COLORS[id].hue}:${COLORS[id].tone}`;

/**
 * Five different targets for one level, in play order. Unique while the
 * pool allows it; when the pool is smaller than the round count the
 * shuffled pool cycles without ever repeating a target back-to-back.
 */
function pickTargets(config: ColorLevelConfig, rand: () => number): ColorId[] {
	const order = shuffled(config.targets, rand);
	if (order.length <= 1) {
		return Array.from({ length: ROUNDS_PER_LEVEL }, () => order[0]);
	}
	const targets: ColorId[] = [];
	while (targets.length < ROUNDS_PER_LEVEL) {
		for (const target of order) {
			if (targets.length >= ROUNDS_PER_LEVEL) break;
			if (target !== targets[targets.length - 1]) targets.push(target);
		}
	}
	return targets;
}

/**
 * Answer buttons for one round: the target plus `choices - 1`
 * distractors, all unique with no shared (hue, tone) pair. The
 * distractor pool depends on the mode: plain levels use the other
 * level targets; shades levels always include the target's sibling and
 * fill from other hue families; near levels prefer NEIGHBORS members
 * (at least choices - 2) and fill from the level targets; mixed levels
 * draw from every color. When the pool runs short it widens to all
 * colors rather than breaking the (hue, tone) constraint.
 */
export function makeOptions(
	config: ColorLevelConfig,
	target: ColorId,
	rand: () => number
): ColorId[] {
	const picked: ColorId[] = [target];
	const seen = new Set([pairKey(target)]);
	const take = (candidates: ColorId[], count: number) => {
		for (const candidate of shuffled(candidates, rand)) {
			if (picked.length - 1 >= count) break;
			if (picked.includes(candidate)) continue;
			if (seen.has(pairKey(candidate))) continue;
			picked.push(candidate);
			seen.add(pairKey(candidate));
		}
	};

	const others = config.targets.filter((id) => id !== target);
	if (config.mode === 'shades') {
		const sibling = SIBLING[target];
		if (sibling && !picked.includes(sibling) && !seen.has(pairKey(sibling))) {
			picked.push(sibling);
			seen.add(pairKey(sibling));
		}
		const targetHue = COLORS[target].hue;
		take(
			ALL_IDS.filter((id) => id !== target && COLORS[id].hue !== targetHue),
			config.choices - 1
		);
	} else if (config.mode === 'near') {
		const neighbors = (NEIGHBORS[target] ?? []).filter((id) => id !== target);
		take(neighbors, config.choices - 1);
		take(others, config.choices - 1);
	} else if (config.mode === 'mixed') {
		take(
			ALL_IDS.filter((id) => id !== target),
			config.choices - 1
		);
	} else {
		take(others, config.choices - 1);
	}
	// Widen rather than violating the (hue, tone) constraint.
	take(ALL_IDS.filter((id) => id !== target), config.choices - 1);
	return shuffled(picked.slice(0, config.choices), rand);
}

/**
 * Which help the child sees for the current round. Stage 3 gives the
 * answer away after 6 wrong taps or 3 Help presses; stage 2 names it after
 * 4 misses or 2 presses; stage 1 nudges after 2 misses, 1 press, or a
 * quiet spell.
 */
export function hintStage(misses: number, manualHints: number, idle: boolean): 0 | 1 | 2 | 3 {
	if (misses >= 6 || manualHints >= 3) return 3;
	if (misses >= 4 || manualHints >= 2) return 2;
	if (misses >= 2 || manualHints >= 1 || idle) return 1;
	return 0;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * Balloon positions for one round, in % of the field. Spots keep the
 * option order and spread evenly across x (8–92) with a small jitter
 * that preserves a minimum horizontal distance of 20; y, size, and tilt
 * jitter per spot, and delay staggers by index.
 */
export function layoutBalloons(options: ColorId[], rand: () => number): BalloonSpot[] {
	const count = options.length;
	const gap = count <= 1 ? 0 : 84 / (count - 1);
	const jitter = count <= 1 ? 0 : Math.min(4, Math.max(0, (gap - 20) / 2));
	return options.map((color, index) => {
		const base = count <= 1 ? 50 : 8 + (index * 84) / (count - 1);
		return {
			color,
			x: clamp(base + (rand() * 2 - 1) * jitter, 8, 92),
			y: 14 + rand() * 50,
			size: 0.9 + rand() * 0.25,
			tilt: rand() * 16 - 8,
			delay: count <= 1 ? 0 : (index * 4) / (count - 1)
		};
	});
}

/**
 * Five deterministic rounds for a level. Same seed ⇒ identical rounds;
 * the default seed derives from the level so a level always plays the
 * same way.
 */
export function generateLevel(level: number, seed?: number): Round[] {
	const config = getLevelConfig(level);
	if (!config) return [];
	const rand = mulberry32(seed ?? level * 1013);
	return pickTargets(config, rand).map((target) => {
		const options = makeOptions(config, target, rand);
		return { target, options, balloons: layoutBalloons(options, rand) };
	});
}

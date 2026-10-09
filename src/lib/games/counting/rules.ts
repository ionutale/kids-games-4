/**
 * Pure rules for the "Count the fruit" game. No DOM, no Svelte, no storage
 * access, so every function here is unit-testable and deterministic when
 * given a seeded PRNG.
 */

export type FruitId =
	| 'apple'
	| 'pear'
	| 'orange'
	| 'banana'
	| 'grapes'
	| 'strawberry'
	| 'lemon'
	| 'cherry'
	| 'peach'
	| 'watermelon';

export type FruitLayout = 'row' | 'cluster' | 'scatter';

export interface LevelConfig {
	level: number;
	/** Smallest count that can appear. */
	min: number;
	/** Largest count that can appear. */
	max: number;
	/** How the fruit is arranged on screen. */
	layout: FruitLayout;
	/** How many answer buttons the round offers. */
	choices: number;
	/** Wrong answers sit close to the right one. */
	tight: boolean;
	/** How many distinct fruit kinds appear, assigned round-robin from FRUITS. */
	kinds: number;
	/** Assist mode is available for this level. */
	assist: boolean;
}

export interface Round {
	count: number;
	options: number[];
	fruits: { kind: FruitId; x: number; y: number; size: number; tilt: number }[];
}

export const MAX_LEVEL = 10;
export const ROUNDS_PER_LEVEL = 5;

export const FRUITS: FruitId[] = [
	'apple',
	'pear',
	'orange',
	'banana',
	'grapes',
	'strawberry',
	'lemon',
	'cherry',
	'peach',
	'watermelon'
];

export const LEVELS: LevelConfig[] = [
	{ level: 1, min: 1, max: 3, layout: 'row', choices: 3, tight: false, kinds: 1, assist: false },
	{ level: 2, min: 1, max: 4, layout: 'row', choices: 3, tight: false, kinds: 1, assist: false },
	{ level: 3, min: 1, max: 5, layout: 'row', choices: 3, tight: false, kinds: 1, assist: false },
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
	{ level: 5, min: 1, max: 8, layout: 'scatter', choices: 3, tight: false, kinds: 1, assist: true },
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
	{ level: 7, min: 1, max: 12, layout: 'scatter', choices: 3, tight: true, kinds: 2, assist: true },
	{ level: 8, min: 1, max: 15, layout: 'scatter', choices: 3, tight: true, kinds: 2, assist: true },
	{ level: 9, min: 3, max: 18, layout: 'scatter', choices: 3, tight: true, kinds: 3, assist: true },
	{ level: 10, min: 5, max: 20, layout: 'scatter', choices: 3, tight: true, kinds: 3, assist: true }
];

export function getLevelConfig(level: number): LevelConfig | undefined {
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

/**
 * Five different counts for one level, in play order. Unique while the
 * range allows it; when the range is smaller than the round count the
 * shuffled pool cycles without ever repeating a count back-to-back.
 */
function pickCounts(config: LevelConfig, rand: () => number): number[] {
	const pool: number[] = [];
	for (let count = config.min; count <= config.max; count++) {
		pool.push(count);
	}
	const order = shuffled(pool, rand);
	if (order.length === 1) {
		return Array.from({ length: ROUNDS_PER_LEVEL }, () => order[0]);
	}
	const counts: number[] = [];
	while (counts.length < ROUNDS_PER_LEVEL) {
		for (const count of order) {
			if (counts.length >= ROUNDS_PER_LEVEL) break;
			if (count !== counts[counts.length - 1]) counts.push(count);
		}
	}
	return counts;
}

/**
 * Answer buttons for one round: the right count plus `choices - 1`
 * distractors, all unique and inside [min..max]. Tight levels pick the
 * numeric neighbours first (±1, ±2, …); other levels pick at random.
 */
export function makeOptions(config: LevelConfig, correct: number, rand: () => number): number[] {
	const inRange = (value: number) =>
		value >= config.min && value <= config.max && value !== correct;
	const neighbours: number[] = [];
	for (const delta of [1, -1, 2, -2, 3, -3, 4, -4, 5, -5]) {
		const candidate = correct + delta;
		if (inRange(candidate)) neighbours.push(candidate);
	}
	const rest: number[] = [];
	for (let value = config.min; value <= config.max; value++) {
		if (value !== correct && !neighbours.includes(value)) rest.push(value);
	}
	const ordered = config.tight
		? [...neighbours, ...rest]
		: shuffled([...rest, ...neighbours], rand);
	const distractors = ordered.slice(0, config.choices - 1);
	return shuffled([correct, ...distractors], rand);
}

/**
 * Which help the child sees for the current count. Stage 3 gives the
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

function makeFruit(
	kind: FruitId,
	x: number,
	y: number,
	rand: () => number
): Round['fruits'][number] {
	return {
		kind,
		x,
		y,
		size: 0.85 + rand() * 0.3,
		tilt: rand() * 24 - 12
	};
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * Positions for one round's fruit, in % of the field. Rows are evenly
 * spaced on one line; clusters sit on a tight ellipse; scatters jitter with
 * a minimum distance so taps don't hit the wrong fruit. Kinds are dealt
 * round-robin from FRUITS.
 */
export function layoutFruits(
	count: number,
	layout: FruitLayout,
	kinds: number,
	rand: () => number,
	startKind = 0
): Round['fruits'] {
	const kindCount = clamp(Math.round(kinds), 1, FRUITS.length);
	const kindAt = (index: number) => FRUITS[(startKind + (index % kindCount)) % FRUITS.length];
	const fruits: Round['fruits'] = [];

	if (layout === 'row') {
		const y = 50;
		for (let i = 0; i < count; i++) {
			const x = count === 1 ? 50 : 10 + (i * 80) / (count - 1);
			fruits.push(makeFruit(kindAt(i), x, y, rand));
		}
		return fruits;
	}

	if (layout === 'cluster') {
		const radiusX = 20;
		const radiusY = 14;
		for (let i = 0; i < count; i++) {
			const angle = (i / count) * Math.PI * 2 + rand() * 0.6;
			const radius = 0.45 + rand() * 0.55;
			const x = clamp(50 + Math.cos(angle) * radiusX * radius, 5, 95);
			const y = clamp(50 + Math.sin(angle) * radiusY * radius, 10, 90);
			fruits.push(makeFruit(kindAt(i), x, y, rand));
		}
		return fruits;
	}

	// Scatter: rejection-sample positions that keep a minimum distance.
	const minDistance = 14;
	const maxAttempts = 1000;
	for (let i = 0; i < count; i++) {
		let best = { x: 5 + rand() * 90, y: 10 + rand() * 80 };
		let bestClearance = -1;
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const candidate = { x: 5 + rand() * 90, y: 10 + rand() * 80 };
			let clearance = Number.POSITIVE_INFINITY;
			for (const placed of fruits) {
				const distance = Math.hypot(candidate.x - placed.x, candidate.y - placed.y);
				if (distance < clearance) clearance = distance;
			}
			if (clearance > bestClearance) {
				best = candidate;
				bestClearance = clearance;
			}
			if (clearance >= minDistance) {
				best = candidate;
				break;
			}
		}
		fruits.push(makeFruit(kindAt(i), best.x, best.y, rand));
	}
	return fruits;
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
	return pickCounts(config, rand).map((count) => ({
		count,
		options: makeOptions(config, count, rand),
		fruits: layoutFruits(count, config.layout, config.kinds, rand, (level - 1) % FRUITS.length)
	}));
}

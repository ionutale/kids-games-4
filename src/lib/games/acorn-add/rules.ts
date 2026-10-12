/**
 * Pure rules for the "Acorn Addition" game. No DOM, no Svelte, no storage
 * access, so every function here is unit-testable and deterministic when
 * given a seeded PRNG.
 */

export interface AdditionLevelConfig {
	level: number;
	/** Smallest sum that can appear. */
	min: number;
	/** Largest sum that can appear. */
	max: number;
	/** Chip (assist) mode is available for this level. */
	chip: boolean;
}

export interface AcornSpot {
	x: number;
	y: number;
	size: number;
	tilt: number;
}

export interface TravelSpot extends AcornSpot {
	fromX: number;
	fromY: number;
	delay: number;
}

export interface Round {
	/** Left patch count (resting acorns). */
	a: number;
	/** Right patch count (traveling acorns). */
	b: number;
	/** a + b. */
	sum: number;
	/** The a resting acorns at their final pile positions. */
	left: AcornSpot[];
	/** The b traveling acorns at their final pile positions + start offsets. */
	travels: TravelSpot[];
	/** Exactly 3 unique numbers including sum. */
	options: number[];
}

export const MAX_LEVEL = 10;
export const ROUNDS_PER_LEVEL = 5;
export const CHOICES = 3;

export const LEVELS: AdditionLevelConfig[] = [
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
];

export function getLevelConfig(level: number): AdditionLevelConfig | undefined {
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

const pairKey = (pair: [number, number]): string => `${pair[0]}+${pair[1]}`;

/**
 * Five addition pairs for one level, in play order. Every pair has
 * a, b >= 1 with min <= a + b <= max. Pairs stay unique while the pool
 * allows it; when the pool is smaller than the round count the shuffled
 * pool cycles without ever repeating a pair back-to-back.
 */
export function makePairs(config: AdditionLevelConfig, rand: () => number): [number, number][] {
	const pool: [number, number][] = [];
	for (let a = 1; a <= config.max - 1; a++) {
		for (let b = 1; b <= config.max - a; b++) {
			if (a + b >= config.min && a + b <= config.max) pool.push([a, b]);
		}
	}
	const order = shuffled(pool, rand);
	if (order.length <= 1) {
		const only: [number, number] = order[0] ?? [1, 1];
		return Array.from({ length: ROUNDS_PER_LEVEL }, () => [...only] as [number, number]);
	}
	const pairs: [number, number][] = [];
	while (pairs.length < ROUNDS_PER_LEVEL) {
		for (const pair of order) {
			if (pairs.length >= ROUNDS_PER_LEVEL) break;
			const previous = pairs[pairs.length - 1];
			if (!previous || pairKey(pair) !== pairKey(previous)) pairs.push(pair);
		}
	}
	return pairs;
}

/**
 * Answer buttons for one round: the sum plus `CHOICES - 1` distractors,
 * all unique and >= 1. Levels below 4 pick distractors at random from
 * [1..max + 1]; levels 4 and up take the closest near-misses first
 * (±1, then ±2, never below 1) and fill any gap at random.
 */
export function makeOptions(
	config: AdditionLevelConfig,
	sum: number,
	rand: () => number
): number[] {
	const distractors: number[] = [];
	if (config.level >= 4) {
		for (const delta of [1, -1, 2, -2]) {
			if (distractors.length >= CHOICES - 1) break;
			const candidate = sum + delta;
			if (candidate >= 1 && candidate !== sum && !distractors.includes(candidate)) {
				distractors.push(candidate);
			}
		}
	}
	if (distractors.length < CHOICES - 1) {
		const rest: number[] = [];
		for (let value = 1; value <= config.max + 1; value++) {
			if (value !== sum && !distractors.includes(value)) rest.push(value);
		}
		for (const value of shuffled(rest, rand)) {
			if (distractors.length >= CHOICES - 1) break;
			distractors.push(value);
		}
	}
	return shuffled([sum, ...distractors.slice(0, CHOICES - 1)], rand);
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

function makeSpot(x: number, y: number, rand: () => number): AcornSpot {
	return {
		x,
		y,
		size: 0.9 + rand() * 0.25,
		tilt: rand() * 20 - 10
	};
}

/**
 * Acorn positions for one pile, in % of the field. Spots sit on a
 * jittered grid inside the patch zone (left: x 12–48, y 28–72;
 * right: x 60–90, y 26–68) and keep a pairwise minimum distance of 16
 * so taps don't hit the wrong acorn. Columns stay at two while the
 * spacing allows it, widening only for bigger piles; piles too large
 * to space out keep the best clearance found.
 */
export function layoutPile(count: number, zone: 'left' | 'right', rand: () => number): AcornSpot[] {
	const xLow = zone === 'left' ? 12 : 60;
	const xHigh = zone === 'left' ? 48 : 90;
	const yLow = zone === 'left' ? 28 : 26;
	const yHigh = zone === 'left' ? 72 : 68;
	const minDistance = 16;
	const maxAttempts = 1000;
	const width = xHigh - xLow;
	const height = yHigh - yLow;
	const spacingOf = (cols: number, rows: number): number =>
		Math.min(
			cols < 2 ? Number.POSITIVE_INFINITY : width / (cols - 1),
			rows < 2 ? Number.POSITIVE_INFINITY : height / (rows - 1)
		);
	// Fewest columns whose grid spacing fits the minimum distance;
	// otherwise the dims with the widest spacing (best effort).
	let cols = 1;
	let rows = count;
	if (count > 1) {
		let fallback = 2;
		let fallbackSpacing = -1;
		let picked: [number, number] | undefined;
		for (let c = 2; c <= count; c++) {
			const r = Math.ceil(count / c);
			const spacing = spacingOf(c, r);
			if (spacing > fallbackSpacing) {
				fallbackSpacing = spacing;
				fallback = c;
			}
			if (!picked && spacing >= minDistance) picked = [c, r];
		}
		[cols, rows] = picked ?? [fallback, Math.ceil(count / fallback)];
	}
	const spacing = count < 2 ? Number.POSITIVE_INFINITY : spacingOf(cols, rows);
	const feasible = spacing >= minDistance;
	// Jitter that can never break a fitting grid; wider search otherwise.
	const jitter = feasible ? (spacing - minDistance) / 2 : 4;
	const baseAt = (index: number): { x: number; y: number } => {
		if (count === 1) return { x: (xLow + xHigh) / 2, y: (yLow + yHigh) / 2 };
		const column = index % cols;
		const row = Math.floor(index / cols);
		const filledRows = Math.ceil(count / cols);
		return {
			x: cols < 2 ? (xLow + xHigh) / 2 : xLow + (column * width) / (cols - 1),
			y: filledRows < 2 ? (yLow + yHigh) / 2 : yLow + (row * height) / (filledRows - 1)
		};
	};
	const spots: AcornSpot[] = [];
	for (let i = 0; i < count; i++) {
		const base = baseAt(i);
		let best = { x: base.x, y: base.y };
		let bestClearance = -1;
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const spread = !feasible && attempt % 2 === 1;
			const candidate = spread
				? { x: xLow + rand() * width, y: yLow + rand() * height }
				: {
						x: Math.min(xHigh, Math.max(xLow, base.x + (rand() * 2 - 1) * jitter)),
						y: Math.min(yHigh, Math.max(yLow, base.y + (rand() * 2 - 1) * jitter))
					};
			let clearance = Number.POSITIVE_INFINITY;
			for (const placed of spots) {
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
		spots.push(makeSpot(best.x, best.y, rand));
	}
	return spots;
}

/**
 * Five deterministic rounds for a level. Same seed ⇒ identical rounds;
 * the default seed derives from the level so a level always plays the
 * same way. Each round piles `sum` acorns on the left patch; the first
 * `a` rest there while the remaining `b` travel in from the right patch.
 */
export function generateLevel(level: number, seed?: number): Round[] {
	const config = getLevelConfig(level);
	if (!config) return [];
	const rand = mulberry32(seed ?? level * 1013);
	return makePairs(config, rand).map(([a, b]) => {
		const sum = a + b;
		const pile = layoutPile(sum, 'left', rand);
		const left = pile.slice(0, a);
		const rightSpots = layoutPile(b, 'right', rand);
		const travels: TravelSpot[] = pile.slice(a).map((spot, i) => ({
			...spot,
			fromX: rightSpots[i].x,
			fromY: rightSpots[i].y,
			delay: i
		}));
		return { a, b, sum, left, travels, options: makeOptions(config, sum, rand) };
	});
}

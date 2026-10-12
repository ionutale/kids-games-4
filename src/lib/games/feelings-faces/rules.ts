/**
 * Pure rules for the "Feelings Faces" game. No DOM, no Svelte, no storage
 * access, so every function here is unit-testable and deterministic when
 * given a seeded PRNG.
 */

export type EmotionId = 'happy' | 'sad' | 'angry' | 'scared' | 'surprised' | 'sleepy';

export type WhoId = 'muguri' | 'mimo';

export type FaceMode = 'match' | 'situation' | 'subtle' | 'mixed';

export type SceneId =
	| 'balloon-away'
	| 'fallen-icecream'
	| 'gift'
	| 'storm'
	| 'spilled-cup'
	| 'broken-toy'
	| 'hug'
	| 'bedtime'
	| 'pop-out';

export const SCENE_EMOTION: Record<SceneId, EmotionId> = {
	'balloon-away': 'sad',
	'fallen-icecream': 'sad',
	gift: 'happy',
	storm: 'scared',
	'spilled-cup': 'angry',
	'broken-toy': 'angry',
	hug: 'happy',
	bedtime: 'sleepy',
	'pop-out': 'surprised'
};

/** Pairs that are deliberately confusable — separated below L8, the point at L8+. */
export const CONFUSABLE: EmotionId[][] = [
	['scared', 'surprised'],
	['angry', 'sad'],
	['sleepy', 'happy']
];

export interface FeelingsLevelConfig {
	level: number;
	mode: FaceMode;
	choices: number;
	/** Emotions that may be the round's target. */
	targets: EmotionId[];
	/** Emotions that may appear among the choices (superset of targets). */
	emotions: EmotionId[];
	/** Scenes that may appear (empty in match mode). */
	scenes: SceneId[];
}

export interface Round {
	/** The emotion to find. */
	target: EmotionId;
	/** The character shown (target face + all options). */
	who: WhoId;
	/** null in match mode. */
	scene: SceneId | null;
	/** Exactly `choices` distinct emotions incl. target. */
	options: EmotionId[];
}

export const MAX_LEVEL = 10;
export const ROUNDS_PER_LEVEL = 5;

export const LEVELS: FeelingsLevelConfig[] = [
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
		scenes: ['gift', 'hug', 'balloon-away', 'fallen-icecream', 'spilled-cup', 'broken-toy', 'storm']
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
];

export function getLevelConfig(level: number): FeelingsLevelConfig | undefined {
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

/** The other member of the first CONFUSABLE pair containing `emotion`. */
function confusablePartner(emotion: EmotionId): EmotionId | undefined {
	for (const pair of CONFUSABLE) {
		if (pair.includes(emotion)) return pair.find((member) => member !== emotion);
	}
	return undefined;
}

/** True when both emotions belong to the same CONFUSABLE pair. */
function samePair(a: EmotionId, b: EmotionId): boolean {
	return CONFUSABLE.some((pair) => pair.includes(a) && pair.includes(b));
}

/**
 * Five targets for one level, in play order (match mode). Unique while the
 * pool allows it; when the pool is smaller than the round count the
 * shuffled pool cycles without ever repeating a target back-to-back.
 */
function pickTargets(pool: EmotionId[], rand: () => number): EmotionId[] {
	const order = shuffled(pool, rand);
	if (order.length <= 1) {
		return Array.from({ length: ROUNDS_PER_LEVEL }, () => order[0]);
	}
	const targets: EmotionId[] = [];
	while (targets.length < ROUNDS_PER_LEVEL) {
		for (const target of order) {
			if (targets.length >= ROUNDS_PER_LEVEL) break;
			if (target !== targets[targets.length - 1]) targets.push(target);
		}
	}
	return targets;
}

/**
 * Five scenes for one level, in play order. Match mode returns five nulls.
 * Scene levels draw from a shuffled bag of `config.scenes` and never repeat
 * a scene — or the emotion it stands for — back-to-back, so the derived
 * target never repeats consecutively. Unique while the pool allows it (≥ 5).
 */
export function pickScenes(config: FeelingsLevelConfig, rand: () => number): (SceneId | null)[] {
	if (config.mode === 'match') {
		return Array.from({ length: ROUNDS_PER_LEVEL }, () => null);
	}
	const bag = shuffled(config.scenes, rand);
	const scenes: SceneId[] = [];
	const used = new Set<SceneId>();
	let lastScene: SceneId | null = null;
	let lastEmotion: EmotionId | null = null;
	const keepUnique = bag.length >= ROUNDS_PER_LEVEL;
	let index = 0;
	const maxIterations = bag.length * ROUNDS_PER_LEVEL * 4 + 16;
	for (let guard = 0; scenes.length < ROUNDS_PER_LEVEL && guard < maxIterations; guard++) {
		const scene = bag[index % bag.length];
		index++;
		if (scene === lastScene) continue;
		if (SCENE_EMOTION[scene] === lastEmotion) continue;
		if (keepUnique && used.has(scene) && used.size < ROUNDS_PER_LEVEL) continue;
		scenes.push(scene);
		used.add(scene);
		lastScene = scene;
		lastEmotion = SCENE_EMOTION[scene];
	}
	// Best-effort fallback: relax uniqueness (but never the no-repeat rule)
	// so a level always yields five rounds.
	while (scenes.length < ROUNDS_PER_LEVEL) {
		const order = shuffled(bag, rand);
		const scene =
			order.find((s) => !used.has(s) && s !== lastScene && SCENE_EMOTION[s] !== lastEmotion) ??
			order.find((s) => !used.has(s) && s !== lastScene) ??
			order.find((s) => s !== lastScene) ??
			order[0];
		scenes.push(scene);
		used.add(scene);
		lastScene = scene;
		lastEmotion = SCENE_EMOTION[scene];
	}
	return scenes;
}

/**
 * Answer buttons for one round: the target plus `choices - 1` distractors,
 * all distinct. Match and situation levels keep no two options from the
 * same CONFUSABLE pair (widening the pool to `config.emotions`; when the
 * pool is too small to satisfy it, the strongest constraint is kept and
 * the rest filled best-effort). Subtle levels always include the target's
 * confusable partner when it is in the pool. Mixed levels allow any.
 */
export function makeOptions(
	config: FeelingsLevelConfig,
	target: EmotionId,
	rand: () => number
): EmotionId[] {
	const picked: EmotionId[] = [target];
	const pool = shuffled(
		config.emotions.filter((emotion) => emotion !== target),
		rand
	);
	const takeAny = (count: number) => {
		for (const candidate of pool) {
			if (picked.length - 1 >= count) break;
			if (picked.includes(candidate)) continue;
			picked.push(candidate);
		}
	};

	if (config.mode === 'subtle') {
		const partner = confusablePartner(target);
		if (partner && config.emotions.includes(partner) && !picked.includes(partner)) {
			picked.push(partner);
		}
		takeAny(config.choices - 1);
	} else if (config.mode === 'match' || config.mode === 'situation') {
		for (const candidate of pool) {
			if (picked.length - 1 >= config.choices - 1) break;
			if (picked.includes(candidate)) continue;
			if (picked.some((other) => samePair(other, candidate))) continue;
			picked.push(candidate);
		}
		// Pool too small to honour the constraint: fill best-effort.
		takeAny(config.choices - 1);
	} else {
		takeAny(config.choices - 1);
	}

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

/**
 * Five deterministic rounds for a level. Same seed ⇒ identical rounds; the
 * default seed derives from the level so a level always plays the same way.
 * In scene modes the target is the emotion the scene stands for; match mode
 * picks a bare target. `who` alternates across the five rounds on L1–6 and
 * is picked at random per round from L7 up.
 */
export function generateLevel(level: number, seed?: number): Round[] {
	const config = getLevelConfig(level);
	if (!config) return [];
	const rand = mulberry32(seed ?? level * 1013);
	const scenes = pickScenes(config, rand);
	const targets: EmotionId[] =
		config.mode === 'match'
			? pickTargets(config.targets, rand)
			: scenes.map((scene) => SCENE_EMOTION[scene as SceneId]);
	return targets.map((target, index) => ({
		target,
		who: level <= 6 ? (index % 2 === 0 ? 'muguri' : 'mimo') : rand() < 0.5 ? 'muguri' : 'mimo',
		scene: scenes[index],
		options: makeOptions(config, target, rand)
	}));
}

/**
 * Pure rules for the "Brush Along" tracing game. No DOM, no Svelte, no
 * storage access: strokes are sampled polylines in a 0–100 normalised scene
 * space, and coverage is derived from plain boolean arrays.
 */

export interface Vec2 {
	x: number;
	y: number;
}

export type SceneId =
	| 'rain'
	| 'grass'
	| 'fence'
	| 'ladder'
	| 'sun'
	| 'kite'
	| 'hills'
	| 'flower'
	| 'butterfly'
	| 'rainbow';

export interface Stroke {
	id: string;
	points: Vec2[];
	color: string;
	width: number;
	tolerance: number;
}

export interface SceneConfig {
	level: number;
	id: SceneId;
	strokes: Stroke[];
}

export const MAX_LEVEL = 10;
export const COMPLETION = 0.85;
export const DEFAULT_TOLERANCE = 7;
export const DEFAULT_WIDTH = 6;

/** Roughly one sample per unit keeps the guide smooth and coverage meaningful. */
const POINTS_PER_UNIT = 1.2;
const MIN_STEPS = 23; // steps + 1 endpoints = 24 points

function stepsFor(length: number): number {
	return Math.max(MIN_STEPS, Math.ceil(length * POINTS_PER_UNIT));
}

function degToRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

/** Straight polyline from `a` to `b`, endpoints exact. */
export function line(a: Vec2, b: Vec2): Vec2[] {
	const steps = stepsFor(Math.hypot(b.x - a.x, b.y - a.y));
	const points: Vec2[] = [];
	for (let i = 0; i <= steps; i += 1) {
		const t = i / steps;
		points.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
	}
	points[0] = { x: a.x, y: a.y };
	points[points.length - 1] = { x: b.x, y: b.y };
	return points;
}

/** Cubic Bézier from `a` to `b` with controls `c1` and `c2`. */
export function curve(a: Vec2, c1: Vec2, c2: Vec2, b: Vec2): Vec2[] {
	const length =
		Math.hypot(c1.x - a.x, c1.y - a.y) +
		Math.hypot(c2.x - c1.x, c2.y - c1.y) +
		Math.hypot(b.x - c2.x, b.y - c2.y);
	const steps = stepsFor(length);
	const points: Vec2[] = [];
	for (let i = 0; i <= steps; i += 1) {
		const t = i / steps;
		const mt = 1 - t;
		const w0 = mt * mt * mt;
		const w1 = 3 * mt * mt * t;
		const w2 = 3 * mt * t * t;
		const w3 = t * t * t;
		points.push({
			x: a.x * w0 + c1.x * w1 + c2.x * w2 + b.x * w3,
			y: a.y * w0 + c1.y * w1 + c2.y * w2 + b.y * w3
		});
	}
	points[0] = { x: a.x, y: a.y };
	points[points.length - 1] = { x: b.x, y: b.y };
	return points;
}

/** Polar arc from `fromDeg` to `toDeg` (degrees, clockwise on screen). */
export function arc(center: Vec2, radius: number, fromDeg: number, toDeg: number): Vec2[] {
	const sweep = Math.abs(degToRad(toDeg - fromDeg));
	const steps = stepsFor(radius * sweep);
	const points: Vec2[] = [];
	for (let i = 0; i <= steps; i += 1) {
		const t = i / steps;
		const angle = degToRad(fromDeg + (toDeg - fromDeg) * t);
		points.push({
			x: center.x + radius * Math.cos(angle),
			y: center.y + radius * Math.sin(angle)
		});
	}
	return points;
}

/** Full circle; the last point is identical to the first so it closes cleanly. */
export function circle(center: Vec2, radius: number): Vec2[] {
	const points = arc(center, radius, 0, 360);
	points[points.length - 1] = { ...points[0] };
	return points;
}

/** A circle with a small in/out modulation, one turn per revolution. */
export function loop(center: Vec2, radius: number, turns = 1): Vec2[] {
	const spin = Math.max(1, Math.abs(turns));
	const steps = stepsFor(2 * Math.PI * radius * spin);
	const points: Vec2[] = [];
	for (let i = 0; i <= steps; i += 1) {
		const t = i / steps;
		const angle = 2 * Math.PI * spin * t;
		const modulated = radius * (1 + 0.16 * Math.sin(2 * Math.PI * spin * t));
		points.push({
			x: center.x + modulated * Math.cos(angle),
			y: center.y + modulated * Math.sin(angle)
		});
	}
	points[points.length - 1] = { ...points[0] };
	return points;
}

/** Spiral from radius `r0` to `r1` over `turns` revolutions. */
export function spiral(center: Vec2, r0: number, r1: number, turns: number): Vec2[] {
	const spin = Math.max(1, Math.abs(turns));
	const meanRadius = (Math.abs(r0) + Math.abs(r1)) / 2;
	const steps = stepsFor(2 * Math.PI * meanRadius * spin);
	const points: Vec2[] = [];
	for (let i = 0; i <= steps; i += 1) {
		const t = i / steps;
		const angle = 2 * Math.PI * spin * t;
		const radius = r0 + (r1 - r0) * t;
		points.push({
			x: center.x + radius * Math.cos(angle),
			y: center.y + radius * Math.sin(angle)
		});
	}
	return points;
}

/** Shortest distance from `p` to the segment `a`–`b`, clamped to the segment. */
export function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const lengthSq = dx * dx + dy * dy;
	if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
	const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
	return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/**
 * Paint every unpainted sample within `stroke.tolerance` of the pointer
 * segment. Returns a new array; the input is never mutated.
 */
export function paintSegment(
	painted: readonly boolean[],
	stroke: Stroke,
	from: Vec2,
	to: Vec2
): boolean[] {
	return stroke.points.map((point, index) => {
		if (painted[index]) return true;
		return distanceToSegment(point, from, to) <= stroke.tolerance;
	});
}

/** Painted fraction in 0–1; an empty stroke counts as 0. */
export function coverage(painted: readonly boolean[]): number {
	if (painted.length === 0) return 0;
	let count = 0;
	for (const paintedSample of painted) if (paintedSample) count += 1;
	return count / painted.length;
}

/** A stroke is done at 85% coverage unless another threshold is given. */
export function strokeComplete(painted: readonly boolean[], threshold = COMPLETION): boolean {
	return coverage(painted) >= threshold;
}

const RAIN_COLOR = '#3f7fc4';
const LEAF_COLOR = '#74a72f';
const WOOD_COLOR = '#8c6242';
const GOLD_COLOR = '#f5b73c';
const ACCENT_COLOR = '#e8871f';
const BERRY_COLOR = '#c64f78';
const PURPLE_COLOR = '#9a6bd4';
const RED_COLOR = '#d63b2f';
const TEAL_COLOR = '#3fb3a4';

function brushStroke(id: string, points: Vec2[], color: string): Stroke {
	return { id, points, color, width: DEFAULT_WIDTH, tolerance: DEFAULT_TOLERANCE };
}

/** One diagonal ray between two radii around `center`, in degrees. */
function ray(center: Vec2, fromRadius: number, toRadius: number, deg: number): Vec2[] {
	const angle = degToRad(deg);
	return line(
		{
			x: center.x + fromRadius * Math.cos(angle),
			y: center.y + fromRadius * Math.sin(angle)
		},
		{
			x: center.x + toRadius * Math.cos(angle),
			y: center.y + toRadius * Math.sin(angle)
		}
	);
}

export const SCENES: SceneConfig[] = [
	{
		level: 1,
		id: 'rain',
		strokes: [
			brushStroke('rain-1', line({ x: 30, y: 30 }, { x: 30, y: 72 }), RAIN_COLOR),
			brushStroke('rain-2', line({ x: 50, y: 30 }, { x: 50, y: 72 }), RAIN_COLOR),
			brushStroke('rain-3', line({ x: 70, y: 30 }, { x: 70, y: 72 }), RAIN_COLOR)
		]
	},
	{
		level: 2,
		id: 'grass',
		strokes: [
			brushStroke('grass-1', line({ x: 25, y: 82 }, { x: 25, y: 64 }), LEAF_COLOR),
			brushStroke('grass-2', line({ x: 40, y: 82 }, { x: 40, y: 64 }), LEAF_COLOR),
			brushStroke('grass-3', line({ x: 55, y: 82 }, { x: 55, y: 64 }), LEAF_COLOR),
			brushStroke('grass-4', line({ x: 70, y: 82 }, { x: 70, y: 64 }), LEAF_COLOR)
		]
	},
	{
		level: 3,
		id: 'fence',
		strokes: [
			brushStroke('fence-1', line({ x: 15, y: 45 }, { x: 85, y: 45 }), WOOD_COLOR),
			brushStroke('fence-2', line({ x: 15, y: 57 }, { x: 85, y: 57 }), WOOD_COLOR),
			brushStroke('fence-3', line({ x: 15, y: 69 }, { x: 85, y: 69 }), WOOD_COLOR)
		]
	},
	{
		level: 4,
		id: 'ladder',
		strokes: [
			brushStroke('ladder-1', line({ x: 42, y: 22 }, { x: 42, y: 82 }), WOOD_COLOR),
			brushStroke('ladder-2', line({ x: 58, y: 22 }, { x: 58, y: 82 }), WOOD_COLOR),
			brushStroke('ladder-3', line({ x: 42, y: 38 }, { x: 58, y: 38 }), WOOD_COLOR),
			brushStroke('ladder-4', line({ x: 42, y: 52 }, { x: 58, y: 52 }), WOOD_COLOR),
			brushStroke('ladder-5', line({ x: 42, y: 66 }, { x: 58, y: 66 }), WOOD_COLOR)
		]
	},
	{
		level: 5,
		id: 'sun',
		strokes: [
			brushStroke('sun-1', ray({ x: 50, y: 52 }, 22, 40, 45), GOLD_COLOR),
			brushStroke('sun-2', ray({ x: 50, y: 52 }, 22, 40, 135), GOLD_COLOR),
			brushStroke('sun-3', ray({ x: 50, y: 52 }, 22, 40, 225), GOLD_COLOR),
			brushStroke('sun-4', ray({ x: 50, y: 52 }, 22, 40, 315), GOLD_COLOR)
		]
	},
	{
		level: 6,
		id: 'kite',
		strokes: [
			brushStroke('kite-1', line({ x: 40, y: 20 }, { x: 60, y: 42 }), ACCENT_COLOR),
			brushStroke('kite-2', line({ x: 60, y: 20 }, { x: 40, y: 42 }), ACCENT_COLOR),
			brushStroke(
				'kite-3',
				curve({ x: 50, y: 56 }, { x: 44, y: 64 }, { x: 40, y: 84 }, { x: 56, y: 84 }),
				ACCENT_COLOR
			)
		]
	},
	{
		level: 7,
		id: 'hills',
		strokes: [
			brushStroke(
				'hills-1',
				curve({ x: 4, y: 64 }, { x: 32, y: 52 }, { x: 68, y: 76 }, { x: 96, y: 64 }),
				LEAF_COLOR
			),
			brushStroke(
				'hills-2',
				curve({ x: 4, y: 76 }, { x: 32, y: 64 }, { x: 68, y: 88 }, { x: 96, y: 76 }),
				LEAF_COLOR
			),
			brushStroke(
				'hills-3',
				curve({ x: 4, y: 88 }, { x: 32, y: 76 }, { x: 68, y: 100 }, { x: 96, y: 88 }),
				LEAF_COLOR
			)
		]
	},
	{
		level: 8,
		id: 'flower',
		strokes: [
			brushStroke(
				'flower-1',
				curve({ x: 50, y: 78 }, { x: 46, y: 70 }, { x: 54, y: 62 }, { x: 50, y: 55 }),
				BERRY_COLOR
			),
			brushStroke(
				'flower-2',
				curve({ x: 48, y: 68 }, { x: 42, y: 67 }, { x: 36, y: 62 }, { x: 33, y: 57 }),
				BERRY_COLOR
			),
			brushStroke(
				'flower-3',
				curve({ x: 52, y: 62 }, { x: 58, y: 61 }, { x: 63, y: 56 }, { x: 66, y: 52 }),
				BERRY_COLOR
			),
			brushStroke('flower-4', circle({ x: 50, y: 45 }, 5), BERRY_COLOR)
		]
	},
	{
		level: 9,
		id: 'butterfly',
		strokes: [
			brushStroke('butterfly-1', loop({ x: 40, y: 46 }, 9), PURPLE_COLOR),
			brushStroke('butterfly-2', loop({ x: 60, y: 46 }, 9), PURPLE_COLOR),
			brushStroke('butterfly-3', loop({ x: 50, y: 66 }, 7), PURPLE_COLOR)
		]
	},
	{
		level: 10,
		id: 'rainbow',
		strokes: [
			brushStroke('rainbow-1', arc({ x: 50, y: 85 }, 28, 200, 340), RED_COLOR),
			brushStroke('rainbow-2', arc({ x: 50, y: 85 }, 36, 200, 340), GOLD_COLOR),
			brushStroke('rainbow-3', arc({ x: 50, y: 85 }, 44, 200, 340), RAIN_COLOR),
			brushStroke('rainbow-4', spiral({ x: 25, y: 70 }, 2, 7, 2), TEAL_COLOR)
		]
	}
];

export function levelScene(level: number): SceneConfig | undefined {
	return SCENES.find((scene) => scene.level === level);
}

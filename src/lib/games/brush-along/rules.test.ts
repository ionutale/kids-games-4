import { describe, expect, it } from 'vitest';
import {
	COMPLETION,
	DEFAULT_TOLERANCE,
	MAX_LEVEL,
	SCENES,
	arc,
	circle,
	coverage,
	curve,
	distanceToSegment,
	levelScene,
	line,
	loop,
	paintSegment,
	spiral,
	strokeComplete,
	type Stroke,
	type Vec2
} from './rules.js';

const stroke = (points: Vec2[]): Stroke => ({
	id: 'test',
	points,
	color: '#74a72f',
	width: 6,
	tolerance: 7
});

describe('shape helpers', () => {
	it('samples a line from end to end', () => {
		const points = line({ x: 10, y: 20 }, { x: 90, y: 20 });
		expect(points.length).toBeGreaterThan(40);
		expect(points[0]).toEqual({ x: 10, y: 20 });
		expect(points.at(-1)).toEqual({ x: 90, y: 20 });
	});
	it('keeps every sampled point on the 0-100 canvas', () => {
		for (const [kind, points] of [
			['arc', arc({ x: 50, y: 85 }, 44, 200, 340)],
			['circle', circle({ x: 50, y: 50 }, 20)],
			['loop', loop({ x: 50, y: 50 }, 12)],
			['spiral', spiral({ x: 25, y: 70 }, 2, 7, 2)]
		] as const) {
			for (const p of points) {
				expect(p.x).toBeGreaterThanOrEqual(-1);
				expect(p.x).toBeLessThanOrEqual(101);
				expect(p.y).toBeGreaterThanOrEqual(-1);
				expect(p.y).toBeLessThanOrEqual(101);
			}
			expect(points.length).toBeGreaterThan(20);
		}
	});
	it('closes a circle and keeps a curve smooth', () => {
		const points = circle({ x: 50, y: 50 }, 10);
		expect(points[0]).toEqual(points.at(-1));
		expect(
			curve({ x: 10, y: 50 }, { x: 30, y: 20 }, { x: 70, y: 80 }, { x: 90, y: 50 }).length
		).toBeGreaterThan(40);
	});
});

describe('distanceToSegment', () => {
	it('measures against the segment, not an endpoint', () => {
		expect(distanceToSegment({ x: 50, y: 60 }, { x: 0, y: 50 }, { x: 100, y: 50 })).toBeCloseTo(10);
		expect(distanceToSegment({ x: -10, y: 50 }, { x: 0, y: 50 }, { x: 100, y: 50 })).toBeCloseTo(
			10
		);
	});
});

describe('painting', () => {
	const s = stroke(line({ x: 0, y: 50 }, { x: 100, y: 50 }));
	it('paints samples within tolerance of the segment', () => {
		const painted = paintSegment(
			s.points.map(() => false),
			s,
			{ x: 0, y: 50 },
			{ x: 100, y: 50 }
		);
		expect(coverage(painted)).toBe(1);
		expect(strokeComplete(painted)).toBe(true);
	});
	it('paints the whole path in one fast segment', () => {
		const painted = paintSegment(
			s.points.map(() => false),
			s,
			{ x: 0, y: 50 },
			{ x: 100, y: 50 }
		);
		expect(painted.filter(Boolean).length).toBe(s.points.length);
	});
	it('does not paint far from the path', () => {
		const painted = paintSegment(
			s.points.map(() => false),
			s,
			{ x: 0, y: 80 },
			{ x: 100, y: 80 }
		);
		expect(coverage(painted)).toBe(0);
	});
	it('is direction-independent', () => {
		const painted = paintSegment(
			s.points.map(() => false),
			s,
			{ x: 100, y: 50 },
			{ x: 0, y: 50 }
		);
		expect(coverage(painted)).toBe(1);
	});
	it('keeps coverage when a stroke is lifted and resumed', () => {
		const half = paintSegment(
			s.points.map(() => false),
			s,
			{ x: 0, y: 50 },
			{ x: 50, y: 50 }
		);
		expect(coverage(half)).toBeLessThan(COMPLETION);
		const resumed = paintSegment(half, s, { x: 80, y: 50 }, { x: 100, y: 50 });
		expect(coverage(resumed)).toBeGreaterThan(coverage(half));
	});
	it('completes at 85 percent, not before', () => {
		const painted = s.points.map((_, i) => i < Math.floor(s.points.length * 0.8));
		expect(strokeComplete(painted)).toBe(false);
		const enough = s.points.map((_, i) => i < Math.ceil(s.points.length * COMPLETION));
		expect(strokeComplete(enough)).toBe(true);
	});
	it('handles an empty stroke without dividing by zero', () => {
		expect(coverage([])).toBe(0);
		expect(strokeComplete([])).toBe(false);
	});
});

describe('levels', () => {
	it('has ten scenes with 3-5 strokes', () => {
		expect(MAX_LEVEL).toBe(10);
		expect(SCENES).toHaveLength(10);
		for (const scene of SCENES) {
			expect(scene.strokes.length).toBeGreaterThanOrEqual(3);
			expect(scene.strokes.length).toBeLessThanOrEqual(5);
			expect(new Set(scene.strokes.map((s) => s.id)).size).toBe(scene.strokes.length);
		}
	});
	it('samples every stroke densely and keeps it on canvas', () => {
		for (const scene of SCENES)
			for (const s of scene.strokes) {
				expect(s.points.length).toBeGreaterThanOrEqual(20);
				expect(s.tolerance).toBe(DEFAULT_TOLERANCE);
				expect(s.color).toMatch(/^#[0-9a-f]{6}$/i);
			}
	});
	it('maps levels 1-10 and rejects the rest', () => {
		for (let level = 1; level <= MAX_LEVEL; level += 1)
			expect(levelScene(level)?.level).toBe(level);
		expect(levelScene(0)).toBeUndefined();
		expect(levelScene(11)).toBeUndefined();
	});
});

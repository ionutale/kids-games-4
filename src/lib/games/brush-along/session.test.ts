import { describe, expect, it } from 'vitest';
import { COMPLETION } from './rules.js';
import { createBrushSession } from './session.svelte.js';

function paintAll(s: ReturnType<typeof createBrushSession>) {
	const pts = s.stroke.points;
	s.paint(pts[0]!, pts.at(-1)!);
}

describe('brush session', () => {
	it('starts on the first stroke in tracing', () => {
		const s = createBrushSession(1);
		expect(s.strokeIndex).toBe(0);
		expect(s.phase).toBe('tracing');
		expect(s.coverage).toBe(0);
	});
	it('tracks coverage and completes a stroke', () => {
		const s = createBrushSession(1);
		paintAll(s);
		expect(s.coverage).toBeGreaterThanOrEqual(COMPLETION);
		expect(s.strokeDone).toBe(true);
		expect(s.phase).toBe('stroke-done');
	});
	it('does not complete below the threshold', () => {
		const s = createBrushSession(1);
		const pts = s.stroke.points;
		s.paint(pts[0]!, pts[Math.floor(pts.length * 0.5)]!);
		expect(s.phase).toBe('tracing');
		expect(s.strokeDone).toBe(false);
	});
	it('ignores paint after the stroke is done', () => {
		const s = createBrushSession(1);
		paintAll(s);
		const before = s.painted[0]!.filter(Boolean).length;
		s.paint({ x: 0, y: 0 }, { x: 100, y: 100 });
		expect(s.painted[0]!.filter(Boolean).length).toBe(before);
	});
	it('advances to the next stroke and resets help', () => {
		const s = createBrushSession(1);
		s.help();
		paintAll(s);
		s.advance();
		expect(s.strokeIndex).toBe(1);
		expect(s.phase).toBe('tracing');
		expect(s.helpCount).toBe(0);
		expect(s.coverage).toBe(0);
	});
	it('moves to celebrating after the last stroke, then complete', () => {
		const s = createBrushSession(1);
		for (let i = 0; i < s.scene.strokes.length; i += 1) {
			paintAll(s);
			s.advance();
		}
		expect(s.phase).toBe('celebrating');
		s.finish();
		expect(s.phase).toBe('complete');
	});
	it('auto-paints on the third help press', () => {
		const s = createBrushSession(1);
		s.help();
		s.help();
		expect(s.phase).toBe('tracing');
		s.help();
		expect(s.phase).toBe('stroke-done');
		expect(s.coverage).toBe(1);
	});
	it('marks idle once and clears it on paint', () => {
		const s = createBrushSession(1);
		s.markIdle();
		expect(s.idle).toBe(true);
		expect(s.hint).toBeGreaterThanOrEqual(1);
		s.paint(s.stroke.points[0]!, s.stroke.points[1]!);
		expect(s.idle).toBe(false);
	});
	it('replays with an empty board at stroke one', () => {
		const s = createBrushSession(1);
		paintAll(s);
		s.advance();
		s.replay();
		expect(s.strokeIndex).toBe(0);
		expect(s.phase).toBe('tracing');
		expect(s.coverage).toBe(0);
		expect(s.helpCount).toBe(0);
	});
});

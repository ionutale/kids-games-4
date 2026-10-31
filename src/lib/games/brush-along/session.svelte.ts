import {
	SCENES,
	coverage,
	levelScene,
	paintSegment,
	strokeComplete,
	type SceneConfig,
	type Stroke,
	type Vec2
} from './rules.js';

export type BrushPhase = 'tracing' | 'stroke-done' | 'celebrating' | 'complete';

export interface BrushSession {
	readonly scene: SceneConfig;
	readonly strokeIndex: number;
	readonly stroke: Stroke;
	readonly phase: BrushPhase;
	readonly painted: boolean[][];
	readonly coverage: number;
	readonly strokeDone: boolean;
	readonly helpCount: number;
	readonly idle: boolean;
	readonly hint: 0 | 1 | 2 | 3;
	readonly isLastStroke: boolean;
	paint(from: Vec2, to: Vec2): void;
	help(): void;
	markIdle(): void;
	advance(): void;
	finish(): void;
	replay(): void;
}

/**
 * Runes state factory for one Brush Along level: an ordered list of strokes,
 * painted sample bits per stroke, and the per-stroke help ladder. Pure state
 * transitions only — the page owns every timer (idle demo, stroke beat, scene
 * payoff).
 */
export function createBrushSession(level: number): BrushSession {
	const scene = levelScene(level) ?? (SCENES[0] as SceneConfig);
	const strokeCount = scene.strokes.length;

	let strokeIndex = $state(0);
	let phase = $state<BrushPhase>('tracing');
	let painted = $state<boolean[][]>(emptyCoverage());
	let helpCount = $state(0);
	let idle = $state(false);

	function emptyCoverage(): boolean[][] {
		return scene.strokes.map((stroke) => stroke.points.map(() => false));
	}

	function currentStroke(): Stroke {
		return scene.strokes[strokeIndex] as Stroke;
	}

	function currentPainted(): boolean[] {
		return painted[strokeIndex] ?? [];
	}

	return {
		get scene() {
			return scene;
		},
		get strokeIndex() {
			return strokeIndex;
		},
		get stroke() {
			return currentStroke();
		},
		get phase() {
			return phase;
		},
		get painted() {
			return painted;
		},
		get coverage() {
			return coverage(currentPainted());
		},
		get strokeDone() {
			return strokeComplete(currentPainted());
		},
		get helpCount() {
			return helpCount;
		},
		get idle() {
			return idle;
		},
		get hint() {
			return (helpCount > 0 ? helpCount : idle ? 1 : 0) as 0 | 1 | 2 | 3;
		},
		get isLastStroke() {
			return strokeIndex >= strokeCount - 1;
		},

		paint(from: Vec2, to: Vec2): void {
			if (phase !== 'tracing') return;
			const next = paintSegment(currentPainted(), currentStroke(), from, to);
			const nextPainted = painted.slice();
			nextPainted[strokeIndex] = next;
			painted = nextPainted;
			idle = false;
			if (strokeComplete(next)) phase = 'stroke-done';
		},

		help(): void {
			if (phase !== 'tracing') return;
			idle = false;
			helpCount = Math.min(3, helpCount + 1);
			if (helpCount < 3) return;
			const nextPainted = painted.slice();
			nextPainted[strokeIndex] = currentStroke().points.map(() => true);
			painted = nextPainted;
			phase = 'stroke-done';
		},

		markIdle(): void {
			if (phase === 'tracing') idle = true;
		},

		advance(): void {
			if (phase !== 'stroke-done') return;
			if (strokeIndex >= strokeCount - 1) {
				phase = 'celebrating';
				return;
			}
			strokeIndex += 1;
			helpCount = 0;
			idle = false;
			phase = 'tracing';
		},

		finish(): void {
			if (phase === 'celebrating') phase = 'complete';
		},

		replay(): void {
			strokeIndex = 0;
			painted = emptyCoverage();
			helpCount = 0;
			idle = false;
			phase = 'tracing';
		}
	};
}

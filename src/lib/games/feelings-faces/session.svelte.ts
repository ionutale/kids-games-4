import {
	generateLevel,
	hintStage,
	type EmotionId,
	type Round
} from '#lib/games/feelings-faces/rules.js';

export type FeelingsPhase = 'playing' | 'celebrating' | 'complete';

export interface FeelingsSession {
	readonly rounds: Round[];
	readonly roundIndex: number;
	readonly misses: number;
	readonly manualHints: number;
	readonly phase: FeelingsPhase;
	readonly round: Round;
	readonly hint: 0 | 1 | 2 | 3;
	readonly isLast: boolean;
	answer(emotion: EmotionId): boolean;
	help(): void;
	markIdle(): void;
	advance(): void;
	replay(): void;
}

/**
 * Runes state factory for one Feelings Faces level. Pure state transitions
 * only — the page owns every timer (celebrate delay, wrong flash, idle
 * nudge, scene beat).
 */
export function createFeelingsSession(level: number): FeelingsSession {
	let rounds = $state<Round[]>(generateLevel(level));
	let roundIndex = $state(0);
	let misses = $state(0);
	let manualHints = $state(0);
	let idle = $state(false);
	let phase = $state<FeelingsPhase>('playing');

	function resetRoundState(): void {
		misses = 0;
		manualHints = 0;
		idle = false;
	}

	return {
		get rounds() {
			return rounds;
		},
		get roundIndex() {
			return roundIndex;
		},
		get misses() {
			return misses;
		},
		get manualHints() {
			return manualHints;
		},
		get phase() {
			return phase;
		},
		get round() {
			return rounds[roundIndex] as Round;
		},
		get hint() {
			return hintStage(misses, manualHints, idle);
		},
		get isLast() {
			return roundIndex >= rounds.length - 1;
		},

		answer(emotion: EmotionId): boolean {
			if (phase !== 'playing') return false;
			idle = false;
			const current = rounds[roundIndex];
			if (!current || emotion !== current.target) {
				if (current) misses += 1;
				return false;
			}
			phase = 'celebrating';
			return true;
		},

		help(): void {
			if (phase !== 'playing') return;
			manualHints += 1;
		},

		markIdle(): void {
			if (phase === 'playing') idle = true;
		},

		advance(): void {
			if (phase !== 'celebrating') return;
			if (roundIndex >= rounds.length - 1) {
				phase = 'complete';
				return;
			}
			roundIndex += 1;
			resetRoundState();
			phase = 'playing';
		},

		replay(): void {
			rounds = generateLevel(level);
			roundIndex = 0;
			resetRoundState();
			phase = 'playing';
		}
	};
}

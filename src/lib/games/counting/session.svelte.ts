import { generateLevel, getLevelConfig, hintStage, type Round } from '#lib/games/counting/rules.js';

export type CountingPhase = 'playing' | 'celebrating' | 'complete';

export interface CountingSession {
	readonly rounds: Round[];
	readonly roundIndex: number;
	readonly misses: number;
	readonly manualHints: number;
	readonly counted: Set<number>;
	readonly phase: CountingPhase;
	readonly round: Round;
	readonly hint: 0 | 1 | 2 | 3;
	readonly isLast: boolean;
	readonly assist: boolean;
	tapFruit(i: number): void;
	answer(value: number): boolean;
	help(): void;
	markIdle(): void;
	advance(): void;
	replay(): void;
}

/**
 * Runes state factory for one counting level. Pure state transitions only —
 * the page owns every timer (idle nudge, celebrate delay, wrong flash).
 */
export function createCountingSession(level: number): CountingSession {
	let rounds = $state<Round[]>(generateLevel(level));
	let roundIndex = $state(0);
	let misses = $state(0);
	let manualHints = $state(0);
	let idle = $state(false);
	let counted = $state<Set<number>>(new Set());
	let phase = $state<CountingPhase>('playing');

	const assist = getLevelConfig(level)?.assist ?? false;

	function resetRoundState(): void {
		misses = 0;
		manualHints = 0;
		idle = false;
		counted = new Set();
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
		get counted() {
			return counted;
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
		get assist() {
			return assist;
		},

		tapFruit(i: number): void {
			if (phase !== 'playing') return;
			idle = false;
			if (assist) counted.add(i);
		},

		answer(value: number): boolean {
			if (phase !== 'playing') return false;
			idle = false;
			const current = rounds[roundIndex];
			if (!current || value !== current.count) {
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

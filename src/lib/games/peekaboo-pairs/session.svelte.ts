import {
	EMPTY_BOARD_STATE,
	applyFlip,
	clearFlip,
	generateLevel,
	hintStage,
	isBoardComplete,
	type Board,
	type BoardState,
	type FlipResult
} from './rules.js';

export type PairsPhase = 'peek' | 'playing' | 'celebrating' | 'complete';

export interface PairsSession {
	readonly boards: Board[];
	readonly boardIndex: number;
	readonly board: Board;
	readonly phase: PairsPhase;
	readonly flipped: number[];
	readonly matched: string[];
	readonly misses: number;
	readonly manualHints: number;
	readonly hint: 0 | 1 | 2 | 3;
	readonly hintIndex: number | null;
	readonly isLastBoard: boolean;
	readonly boardComplete: boolean;
	peekDone(): void;
	flip(index: number): FlipResult;
	clearMiss(): void;
	advance(): void;
	replay(): void;
	help(): void;
	markIdle(): void;
}

/**
 * Runes state factory for one Peekaboo Pairs level: three seeded boards of
 * memory matching, each opened by a peek. Pure state transitions only — the
 * page owns every timer (peek, mismatch flip-back, board beat, hint reveal,
 * idle nudge).
 */
export function createPairsSession(level: number, seed?: number): PairsSession {
	let boards = $state<Board[]>(generateLevel(level, seed));
	let boardIndex = $state(0);
	let state = $state<BoardState>({ ...EMPTY_BOARD_STATE });
	let manualHints = $state(0);
	let idle = $state(false);
	let phase = $state<PairsPhase>('peek');
	let currentSeed = seed ?? level * 1013;

	function resetBoardState(): void {
		state = { ...EMPTY_BOARD_STATE };
		manualHints = 0;
		idle = false;
	}

	return {
		get boards() {
			return boards;
		},
		get boardIndex() {
			return boardIndex;
		},
		get board() {
			return boards[boardIndex] as Board;
		},
		get phase() {
			return phase;
		},
		get flipped() {
			return state.flipped;
		},
		get matched() {
			return state.matched;
		},
		get misses() {
			return state.misses;
		},
		get manualHints() {
			return manualHints;
		},
		get hint() {
			return phase === 'playing' ? hintStage(state.misses, manualHints, idle) : 0;
		},
		get hintIndex() {
			const board = boards[boardIndex];
			if (!board) return null;
			for (let i = 0; i < board.cards.length; i += 1) {
				if (!state.matched.includes(board.cards[i]!.pairId)) return i;
			}
			return null;
		},
		get isLastBoard() {
			return boardIndex >= boards.length - 1;
		},
		get boardComplete() {
			return isBoardComplete(boards[boardIndex] as Board, state);
		},

		peekDone(): void {
			if (phase === 'peek') phase = 'playing';
		},

		flip(index: number): FlipResult {
			if (phase !== 'playing') return 'ignored';
			const board = boards[boardIndex];
			if (!board) return 'ignored';
			idle = false;
			const out = applyFlip(board, state, index);
			state = out.state;
			if (out.result === 'match' && isBoardComplete(board, state)) {
				phase = 'celebrating';
			}
			return out.result;
		},

		clearMiss(): void {
			state = clearFlip(state);
		},

		advance(): void {
			if (phase !== 'celebrating') return;
			if (boardIndex >= boards.length - 1) {
				phase = 'complete';
				return;
			}
			boardIndex += 1;
			resetBoardState();
			phase = 'peek';
		},

		replay(): void {
			currentSeed += 1;
			boards = generateLevel(level, currentSeed);
			boardIndex = 0;
			resetBoardState();
			phase = 'peek';
		},

		help(): void {
			if (phase !== 'playing') return;
			manualHints += 1;
			idle = false;
		},

		markIdle(): void {
			if (phase === 'playing') idle = true;
		}
	};
}

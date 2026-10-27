<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { audio } from '#lib/audio/index.js';
	import { clearLevel, getCleared, isLevelOpen, loadSave, persistSave } from '#lib/storage/save.js';
	import {
		BOARDS_PER_LEVEL,
		LEVELS,
		MAX_LEVEL,
		type Picture
	} from '#lib/games/peekaboo-pairs/rules.js';
	import type { ColorId } from '#lib/games/color-match/rules.js';
	import {
		createPairsSession,
		type PairsSession
	} from '#lib/games/peekaboo-pairs/session.svelte.js';
	import MemoryBoard from '#lib/games/peekaboo-pairs/MemoryBoard.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import MuteButton from '#lib/components/ui/MuteButton.svelte';
	import LevelComplete from '#lib/components/LevelComplete.svelte';
	import Muguri from '#lib/components/art/Muguri.svelte';

	const GAME_ID = 'peekaboo-pairs';
	const MISS_MS = 800;
	const BOARD_MS = 900;
	const IDLE_MS = 6000;
	const REVEAL_MS = 1200;
	const CARD_GAP = 12;

	let cleared = $state(0);
	let hasProfile = $state(false);
	let decided = $state(false);
	let level = $state(0);
	let session = $state<PairsSession | null>(null);
	let tryAgain = $state(false);
	let revealIndex = $state<number | null>(null);
	let hintShown = $state(0);
	let cheering = $state(false);
	let savedFor = $state(0);
	let config = $state(LEVELS[0]!);

	let idleTimer = 0;
	let peekTimer = 0;
	let missTimer = 0;
	let boardTimer = 0;
	let revealTimer = 0;
	let cheerTimer = 0;

	const paramLevel = $derived(Number.parseInt(page.params.level ?? '', 10));

	function clearTimers(): void {
		if (idleTimer) window.clearTimeout(idleTimer);
		if (peekTimer) window.clearTimeout(peekTimer);
		if (missTimer) window.clearTimeout(missTimer);
		if (boardTimer) window.clearTimeout(boardTimer);
		if (revealTimer) window.clearTimeout(revealTimer);
		if (cheerTimer) window.clearTimeout(cheerTimer);
		idleTimer = 0;
		peekTimer = 0;
		missTimer = 0;
		boardTimer = 0;
		revealTimer = 0;
		cheerTimer = 0;
		cheering = false;
	}

	function armPeek(): void {
		if (peekTimer) window.clearTimeout(peekTimer);
		peekTimer = window.setTimeout(() => {
			peekTimer = 0;
			session?.peekDone();
			revealIndex = null;
		}, session?.board.peekMs ?? config.peekMs);
	}

	function armIdle(): void {
		if (idleTimer) window.clearTimeout(idleTimer);
		idleTimer = window.setTimeout(() => {
			if (!session || session.phase !== 'playing') return;
			session.markIdle();
		}, IDLE_MS);
	}

	onMount(() => {
		audio.playMusic('game');
		try {
			const data = loadSave(localStorage);
			const active = data.activeProfileId;
			hasProfile = active !== null;
			cleared = active ? getCleared(data, active, GAME_ID) : 0;
		} catch {
			cleared = 0;
			hasProfile = false;
		}
		decided = true;
	});

	onDestroy(clearTimers);

	// SvelteKit reuses this component between levels: resync whenever the param changes.
	$effect(() => {
		if (!decided) return;
		const n = paramLevel;
		if (!Number.isInteger(n) || n < 1 || n > MAX_LEVEL || !isLevelOpen(cleared, n)) {
			void goto('/play/peekaboo-pairs');
			return;
		}
		if (n !== level) {
			clearTimers();
			level = n;
			session = createPairsSession(n, Date.now());
			config = LEVELS[n - 1]!;
			tryAgain = false;
			revealIndex = null;
			savedFor = 0;
			armPeek();
			armIdle();
		}
	});

	// Stage-3 hint: reveal one card once when the stage is entered, then hide
	// it again. The sentinel stops later matches from re-triggering the reveal.
	$effect(() => {
		if (!session) return;
		if (session.hint < 3) {
			hintShown = 0;
			return;
		}
		if (hintShown >= 3) return;
		const index = session.hintIndex;
		if (index === null) return;
		hintShown = 3;
		if (revealTimer) window.clearTimeout(revealTimer);
		revealIndex = index;
		revealTimer = window.setTimeout(() => {
			revealTimer = 0;
			revealIndex = null;
		}, REVEAL_MS);
	});

	// Persist once per completion. Save on the final match's celebration, not
	// after the beat, so leaving during the beat cannot lose the clear.
	$effect(() => {
		const finished =
			session?.phase === 'complete' || (session?.phase === 'celebrating' && session.isLastBoard);
		if (finished && level > 0 && savedFor !== level) {
			savedFor = level;
			if (idleTimer) window.clearTimeout(idleTimer);
			if (hasProfile) {
				try {
					const data = loadSave(localStorage);
					const active = data.activeProfileId;
					if (active) {
						clearLevel(data, active, GAME_ID, level);
						persistSave(data, localStorage);
						cleared = getCleared(data, active, GAME_ID);
					}
				} catch {
					// storage unavailable: the celebration still plays
				}
			}
		}
	});

	// The unlock sting belongs to the completion card, not the final match.
	$effect(() => {
		if (session?.phase === 'complete') audio.playSfx('unlock');
	});

	const caption = $derived.by(() => {
		if (!session) return '';
		if (tryAgain) return m.try_again();
		if (session.phase === 'celebrating') return m.correct();
		if (session.phase === 'peek') return m.pairs_peek();
		if (session.hint === 3) return m.pairs_hint_reveal();
		if (session.hint === 2) return m.pairs_hint_strong();
		if (session.hint === 1) return m.pairs_hint_nudge();
		return m.pairs_find();
	});
	const mascotPose = $derived<'idle' | 'cheer'>(
		session?.phase === 'celebrating' || cheering ? 'cheer' : 'idle'
	);

	function fruitName(id: Picture & { theme: 'fruit' }): string {
		switch (id.id) {
			case 'apple':
				return m.pairs_fruit_apple();
			case 'pear':
				return m.pairs_fruit_pear();
			case 'orange':
				return m.pairs_fruit_orange();
			case 'banana':
				return m.pairs_fruit_banana();
			case 'grapes':
				return m.pairs_fruit_grapes();
			case 'strawberry':
				return m.pairs_fruit_strawberry();
			case 'lemon':
				return m.pairs_fruit_lemon();
			case 'cherry':
				return m.pairs_fruit_cherry();
			case 'peach':
				return m.pairs_fruit_peach();
			case 'watermelon':
				return m.pairs_fruit_watermelon();
		}
	}

	function colorName(id: ColorId): string {
		switch (id) {
			case 'red':
				return m.color_red();
			case 'yellow':
				return m.color_yellow();
			case 'blue':
				return m.color_blue();
			case 'green':
				return m.color_green();
			case 'orange':
				return m.color_orange();
			case 'purple':
				return m.color_purple();
			case 'pink':
				return m.color_pink();
			case 'light-blue':
				return m.color_light_blue();
			case 'dark-blue':
				return m.color_dark_blue();
			case 'light-green':
				return m.color_light_green();
			case 'dark-green':
				return m.color_dark_green();
			case 'teal':
				return m.color_teal();
		}
	}

	function friendName(id: Picture & { theme: 'friend' }): string {
		switch (id.id) {
			case 'owl':
				return m.pairs_friend_owl();
			case 'fox':
				return m.pairs_friend_fox();
			case 'bear':
				return m.pairs_friend_bear();
			case 'bunny':
				return m.pairs_friend_bunny();
			case 'cat':
				return m.pairs_friend_cat();
			case 'hedgehog':
				return m.pairs_friend_hedgehog();
			case 'muguri':
				return m.pairs_friend_muguri();
			case 'mimo':
				return m.pairs_friend_mimo();
		}
	}

	function labelFor(picture: Picture): string {
		switch (picture.theme) {
			case 'fruit':
				return fruitName(picture);
			case 'balloon':
				return colorName(picture.id);
			case 'friend':
				return friendName(picture);
		}
	}

	function flip(index: number): void {
		if (!session) return;
		armIdle();
		const result = session.flip(index);
		if (result === 'first') {
			audio.playSfx('tap');
		} else if (result === 'match') {
			audio.playSfx('correct');
			tryAgain = false;
			cheering = true;
			if (cheerTimer) window.clearTimeout(cheerTimer);
			cheerTimer = window.setTimeout(() => {
				cheerTimer = 0;
				cheering = false;
			}, 700);
			if (session.phase === 'celebrating') {
				if (boardTimer) window.clearTimeout(boardTimer);
				boardTimer = window.setTimeout(() => {
					boardTimer = 0;
					session?.advance();
					if (session?.phase === 'peek') armPeek();
					armIdle();
				}, BOARD_MS);
			}
		} else if (result === 'miss') {
			audio.playSfx('wrong');
			tryAgain = true;
			if (missTimer) window.clearTimeout(missTimer);
			missTimer = window.setTimeout(() => {
				missTimer = 0;
				session?.clearMiss();
				tryAgain = false;
			}, MISS_MS);
		}
	}

	function replay(): void {
		if (!session) return;
		clearTimers();
		session.replay();
		tryAgain = false;
		revealIndex = null;
		savedFor = 0;
		armPeek();
		armIdle();
	}
</script>

<svelte:head>
	<title>{level > 0 ? m.level({ n: level }) : m.game_peekaboo_name()}</title>
</svelte:head>

<div class="game cn-safe">
	<header class="top">
		<IconButton label={m.back()} size="sm" onclick={() => void goto('/play/peekaboo-pairs')}>
			<svg
				class="back-arrow"
				viewBox="0 0 24 24"
				width="22"
				height="22"
				aria-hidden="true"
				focusable="false"
			>
				<path
					d="M14.5 5 8 12l6.5 7"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</IconButton>
		<h1>{level > 0 ? m.level({ n: level }) : ''}</h1>
		<MuteButton size="sm" />
	</header>

	{#if session}
		<div
			class="dots"
			role="img"
			aria-label={m.pairs_boards({ n: session.boardIndex + 1, total: BOARDS_PER_LEVEL })}
		>
			{#each Array.from({ length: BOARDS_PER_LEVEL }, (_, i) => i) as i (i)}
				<span
					class="dot"
					class:full={i < session.boardIndex ||
						(i === session.boardIndex &&
							(session.phase === 'celebrating' || session.phase === 'complete'))}
				></span>
			{/each}
		</div>

		<div class="prompt-row">
			<span class:mascot-bob={session.phase === 'peek'}>
				<Muguri pose={mascotPose} size={64} />
			</span>
			<p class="prompt" aria-live="polite">{caption}</p>
			<IconButton
				label={m.pairs_hint_nudge()}
				size="sm"
				onclick={() => {
					audio.playSfx('hint');
					session?.help();
				}}
			>
				<Muguri pose="hint" size={28} />
			</IconButton>
		</div>

		<MemoryBoard
			board={session.board}
			phase={session.phase}
			flipped={session.flipped}
			matched={session.matched}
			hint={session.hint}
			hintIndex={session.hintIndex}
			{revealIndex}
			cardBackLabel={m.pairs_card_back()}
			boardLabel={m.game_peekaboo_name()}
			{labelFor}
			cols={config.cols}
			rows={config.rows}
			gap={CARD_GAP}
			onflip={flip}
		/>
	{/if}
</div>

{#if session?.phase === 'complete'}
	<LevelComplete
		{level}
		isLast={level === MAX_LEVEL}
		onNext={() =>
			level < MAX_LEVEL
				? void goto('/play/peekaboo-pairs/' + (level + 1))
				: void goto('/play/peekaboo-pairs')}
		onReplay={replay}
		onAllLevels={() => void goto('/play/peekaboo-pairs')}
	/>
{/if}

<style>
	.game {
		max-width: 560px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--cn-space-3);
	}

	.top {
		display: flex;
		align-items: center;
		gap: var(--cn-space-3);
	}

	.top h1 {
		flex: 1;
		font-size: var(--cn-text-lg);
		text-align: center;
	}

	.back-arrow {
		display: block;
	}

	.dots {
		display: flex;
		justify-content: center;
		gap: var(--cn-space-2);
	}

	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--cn-paper-3);
		border: 2px solid var(--cn-border);
	}

	.dot.full {
		background: var(--cn-leaf);
		border-color: var(--cn-leaf-dark);
	}

	.prompt-row {
		display: flex;
		align-items: center;
		gap: var(--cn-space-3);
	}

	.prompt {
		margin: 0;
		flex: 1;
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-md);
		color: var(--cn-ink);
	}

	.mascot-bob {
		animation: mascot-bob 2.4s ease-in-out infinite;
	}

	@keyframes mascot-bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mascot-bob {
			animation: none;
		}
	}
</style>

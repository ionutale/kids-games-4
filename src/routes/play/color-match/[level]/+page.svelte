<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { audio } from '#lib/audio/index.js';
	import { clearLevel, getCleared, isLevelOpen, loadSave, persistSave } from '#lib/storage/save.js';
	import { MAX_LEVEL, ROUNDS_PER_LEVEL, type ColorId } from '#lib/games/color-match/rules.js';
	import { createColorSession } from '#lib/games/color-match/session.svelte.js';
	import type { ColorSession } from '#lib/games/color-match/session.svelte.js';
	import ColorPortal from '#lib/games/color-match/ColorPortal.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import MuteButton from '#lib/components/ui/MuteButton.svelte';
	import LevelComplete from '#lib/components/LevelComplete.svelte';

	const GAME_ID = 'color-match';
	const IDLE_MS = 6000;
	const CELEBRATE_MS = 1400;
	const WRONG_MS = 1000;

	let cleared = $state(0);
	let hasProfile = $state(false);
	let decided = $state(false);
	let level = $state(0);
	let session = $state<ColorSession | null>(null);
	let wrongColor = $state<ColorId | null>(null);
	let burst = $state<{ color: ColorId; x: number; y: number; id: number } | null>(null);
	let savedFor = $state(0);
	let burstId = 0;
	let demo = $state(false);
	let demoSeen = $state(false);
	let missDemoShown = $state(false);

	let idleTimer = 0;
	let celebrateTimer = 0;
	let wrongTimer = 0;
	let demoTimer = 0;

	const paramLevel = $derived(Number.parseInt(page.params.level ?? '', 10));

	function clearTimers(): void {
		if (idleTimer) window.clearTimeout(idleTimer);
		if (celebrateTimer) window.clearTimeout(celebrateTimer);
		if (wrongTimer) window.clearTimeout(wrongTimer);
		if (demoTimer) window.clearTimeout(demoTimer);
		idleTimer = 0;
		celebrateTimer = 0;
		wrongTimer = 0;
		demoTimer = 0;
	}

	function clearDemo(): void {
		if (demoTimer) window.clearTimeout(demoTimer);
		demoTimer = 0;
		demo = false;
	}

	function startDemo(): void {
		if (demoTimer) window.clearTimeout(demoTimer);
		demo = true;
		demoTimer = window.setTimeout(() => {
			demo = false;
			demoSeen = true;
			missDemoShown = true;
		}, 1950);
	}

	function armIdle(): void {
		if (idleTimer) window.clearTimeout(idleTimer);
		idleTimer = window.setTimeout(() => {
			if (!session || session.phase !== 'playing') return;
			session.markIdle();
			if (!demoSeen) startDemo();
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
			void goto('/play/color-match');
			return;
		}
		if (n !== level) {
			clearTimers();
			level = n;
			session = createColorSession(n);
			wrongColor = null;
			burst = null;
			savedFor = 0;
			demo = false;
			demoSeen = false;
			missDemoShown = false;
			armIdle();
		}
	});

	// Persist once per completion.
	$effect(() => {
		if (session?.phase === 'complete' && level > 0 && savedFor !== level) {
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
			audio.playSfx('unlock');
		}
	});

	const round = $derived(session?.round);
	const hint = $derived(session?.hint ?? 0);
	const caption = $derived(round ? m.color_question({ color: colorName(round.target) }) : '');
	const targetLabel = $derived(round ? m.color_target({ color: colorName(round.target) }) : '');

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

	function answer(color: ColorId): void {
		if (!session || session.phase !== 'playing') return;
		if (idleTimer) window.clearTimeout(idleTimer);
		if (session.answer(color)) {
			audio.playSfx('correct');
			demoSeen = true;
			clearDemo();
			wrongColor = null;
			burstId += 1;
			burst = { color, x: 50, y: 50, id: burstId };
			if (celebrateTimer) window.clearTimeout(celebrateTimer);
			celebrateTimer = window.setTimeout(() => {
				session?.advance();
				burst = null;
				demo = false;
				armIdle();
			}, CELEBRATE_MS);
		} else {
			audio.playSfx('wrong');
			wrongColor = color;
			if (!demoSeen && !missDemoShown) {
				missDemoShown = true;
				if (demoTimer) window.clearTimeout(demoTimer);
				demoTimer = window.setTimeout(() => startDemo(), 450);
			}
			if (wrongTimer) window.clearTimeout(wrongTimer);
			wrongTimer = window.setTimeout(() => {
				wrongColor = null;
			}, WRONG_MS);
			armIdle();
		}
	}

	function replay(): void {
		if (!session) return;
		if (celebrateTimer) window.clearTimeout(celebrateTimer);
		if (wrongTimer) window.clearTimeout(wrongTimer);
		clearDemo();
		session.replay();
		wrongColor = null;
		burst = null;
		savedFor = 0;
		demoSeen = false;
		missDemoShown = false;
		armIdle();
	}
</script>

<svelte:head>
	<title>{level > 0 ? m.level({ n: level }) : m.game_color_match_name()}</title>
</svelte:head>

<div class="game cn-safe">
	<header class="top">
		<IconButton label={m.back()} size="sm" onclick={() => void goto('/play/color-match')}>
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

	{#if session && round}
		<div class="dots" role="img" aria-label={m.progress({ done: session.roundIndex })}>
			{#each Array.from({ length: ROUNDS_PER_LEVEL }, (_, i) => i) as i (i)}
				<span
					class="dot"
					class:full={i < session.roundIndex ||
						(i === session.roundIndex && session.phase !== 'playing')}
				></span>
			{/each}
		</div>

		<ColorPortal
			{round}
			phase={session.phase}
			{hint}
			{wrongColor}
			{demo}
			{burst}
			{targetLabel}
			{caption}
			{colorName}
			onanswer={answer}
			onburstdone={() => (burst = null)}
		/>

		<p class="feedback" aria-live="polite">
			{#if session.phase === 'celebrating'}{m.correct()}{:else if wrongColor !== null}{m.try_again()}{/if}
		</p>
	{/if}
</div>

{#if session?.phase === 'complete'}
	<LevelComplete
		{level}
		isLast={level === MAX_LEVEL}
		onNext={() =>
			level < MAX_LEVEL
				? void goto('/play/color-match/' + (level + 1))
				: void goto('/play/color-match')}
		onReplay={replay}
		onAllLevels={() => void goto('/play/color-match')}
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

	.feedback {
		margin: 0;
		min-height: 1.6em;
		text-align: center;
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-md);
		color: var(--cn-leaf-dark);
	}
</style>

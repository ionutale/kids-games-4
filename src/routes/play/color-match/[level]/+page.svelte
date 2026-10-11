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
	import Balloon from '#lib/components/art/Balloon.svelte';
	import Muguri from '#lib/components/art/Muguri.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import MuteButton from '#lib/components/ui/MuteButton.svelte';
	import LevelComplete from '#lib/components/LevelComplete.svelte';
	import Sparkles from '#lib/components/Sparkles.svelte';

	const GAME_ID = 'color-match';
	const IDLE_MS = 10000;
	const CELEBRATE_MS = 1100;
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

	let idleTimer = 0;
	let celebrateTimer = 0;
	let wrongTimer = 0;

	const paramLevel = $derived(Number.parseInt(page.params.level ?? '', 10));

	function clearTimers(): void {
		if (idleTimer) window.clearTimeout(idleTimer);
		if (celebrateTimer) window.clearTimeout(celebrateTimer);
		if (wrongTimer) window.clearTimeout(wrongTimer);
		idleTimer = 0;
		celebrateTimer = 0;
		wrongTimer = 0;
	}

	function armIdle(): void {
		if (idleTimer) window.clearTimeout(idleTimer);
		idleTimer = window.setTimeout(() => {
			session?.markIdle();
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
	const hintText = $derived.by(() => {
		if (!session || !round || hint === 0) return '';
		if (hint === 1) return m.color_hint_nudge();
		if (hint === 2) return m.color_hint_strong();
		return m.color_hint_reveal({ color: colorName(round.target) });
	});

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

	function moodFor(color: ColorId): 'happy' | 'sad' {
		return wrongColor === color ? 'sad' : 'happy';
	}

	function answer(color: ColorId, x: number, y: number): void {
		if (!session || session.phase !== 'playing') return;
		if (session.answer(color)) {
			audio.playSfx('correct');
			wrongColor = null;
			burstId += 1;
			burst = { color, x, y, id: burstId };
			if (celebrateTimer) window.clearTimeout(celebrateTimer);
			celebrateTimer = window.setTimeout(() => {
				session?.advance();
				burst = null;
				armIdle();
			}, CELEBRATE_MS);
		} else {
			audio.playSfx('wrong');
			wrongColor = color;
			if (wrongTimer) window.clearTimeout(wrongTimer);
			wrongTimer = window.setTimeout(() => {
				wrongColor = null;
			}, WRONG_MS);
			armIdle();
		}
	}

	function help(): void {
		if (!session || session.phase !== 'playing') return;
		session.help();
		audio.playSfx('hint');
		armIdle();
	}

	function replay(): void {
		if (!session) return;
		if (celebrateTimer) window.clearTimeout(celebrateTimer);
		if (wrongTimer) window.clearTimeout(wrongTimer);
		session.replay();
		wrongColor = null;
		burst = null;
		savedFor = 0;
		armIdle();
	}

	function balloonState(color: ColorId): 'idle' | 'glow' | 'pulse' {
		if (!session || !round) return 'idle';
		if (session.phase !== 'playing') return 'idle';
		if (color !== round.target) return 'idle';
		if (hint >= 3) return 'pulse';
		if (hint >= 2) return 'glow';
		return 'idle';
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

		<div class="prompt-row">
			<Muguri pose="hint" size={64} />
			<Balloon color={round.target} size={96} mood="happy" />
			<div class="prompt-text">
				<p class="prompt">{m.color_question({ color: colorName(round.target) })}</p>
				{#if hintText}
					<p class="hint" role="status">{hintText}</p>
				{/if}
			</div>
			<IconButton label={m.color_hint_nudge()} size="sm" onclick={help}>
				<Muguri pose="hint" size={28} />
			</IconButton>
		</div>

		<div class="field">
			<svg
				class="tuft tuft--left"
				viewBox="0 0 48 40"
				width="56"
				height="44"
				aria-hidden="true"
				focusable="false"
			>
				<g opacity="0.4">
					<path
						d="M24 38 Q23 28 26 18"
						fill="none"
						stroke="var(--cn-leaf-dark)"
						stroke-width="3"
						stroke-linecap="round"
					/>
					<path d="M24 30 Q15 29 10 19 Q20 20 24 30 Z" fill="var(--cn-leaf)" />
					<path
						d="M23 29 Q17 26 12 20"
						fill="none"
						stroke="var(--cn-leaf-dark)"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
					<path d="M25 24 Q34 23 39 13 Q29 14 25 24 Z" fill="var(--cn-leaf)" />
					<path
						d="M26 23 Q32 20 37 14"
						fill="none"
						stroke="var(--cn-leaf-dark)"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				</g>
			</svg>
			<svg
				class="tuft tuft--right"
				viewBox="0 0 48 40"
				width="56"
				height="44"
				aria-hidden="true"
				focusable="false"
			>
				<g opacity="0.4">
					<path
						d="M24 38 Q25 28 22 18"
						fill="none"
						stroke="var(--cn-leaf-dark)"
						stroke-width="3"
						stroke-linecap="round"
					/>
					<path d="M24 30 Q33 29 38 19 Q28 20 24 30 Z" fill="var(--cn-leaf)" />
					<path
						d="M25 29 Q31 26 36 20"
						fill="none"
						stroke="var(--cn-leaf-dark)"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
					<path d="M23 24 Q14 23 9 13 Q19 14 23 24 Z" fill="var(--cn-leaf)" />
					<path
						d="M22 23 Q16 20 11 14"
						fill="none"
						stroke="var(--cn-leaf-dark)"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				</g>
			</svg>
			{#each round.balloons as spot (spot.color)}
				<button
					type="button"
					class="balloon-btn balloon--{balloonState(spot.color)}"
					class:cheering={session.phase === 'celebrating'}
					class:wrong={wrongColor === spot.color}
					style="--x: {spot.x}%; --y: {spot.y}%; --tilt: {spot.tilt}deg;"
					aria-label={colorName(spot.color)}
					onclick={() => answer(spot.color, spot.x, spot.y)}
				>
					<span
						class="balloon-bob"
						style="animation-delay: calc(var(--cn-stagger) * {spot.delay});"
					>
						<Balloon
							color={spot.color}
							size={Math.round(88 * spot.size)}
							mood={moodFor(spot.color)}
						/>
					</span>
				</button>
			{/each}
			{#if burst}
				{#key burst.id}
					<Sparkles x={burst.x} y={burst.y} count={10} onDone={() => (burst = null)} />
				{/key}
			{/if}
		</div>

		<p class="feedback" aria-live="polite">
			{#if session.phase === 'celebrating'}{m.correct()}{:else if wrongColor !== null}{m.try_again()}{/if}
		</p>

		<p class="tap-hint">{m.color_tap()}</p>
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

	.prompt-row {
		display: flex;
		align-items: center;
		gap: var(--cn-space-3);
	}

	.prompt-text {
		flex: 1;
		min-width: 0;
	}

	.prompt {
		margin: 0;
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-lg);
	}

	.hint {
		margin: var(--cn-space-1) 0 0;
		padding: var(--cn-space-2) var(--cn-space-3);
		background: var(--cn-paper-2);
		border: 2px solid var(--cn-border);
		border-radius: var(--cn-radius-sm);
		color: var(--cn-ink-soft);
		font-size: var(--cn-text-sm);
	}

	.field {
		position: relative;
		height: 55dvh;
		min-height: 280px;
		border-radius: var(--cn-radius);
		background: linear-gradient(
			180deg,
			var(--cn-sky) 0%,
			var(--cn-sky-2) 32%,
			var(--cn-paper) 76%,
			rgba(116, 167, 47, 0.16) 100%
		);
		border: 2px solid var(--cn-border);
		overflow: hidden;
		touch-action: manipulation;
	}

	/* Ambient garden light: a slow, warm breathing wash over the top edge only.
	   Decorative and non-countable — a soft gradient, no shapes — kept faint and
	   killed by the global reduced-motion switch. */
	.field::before {
		content: '';
		position: absolute;
		left: -10%;
		right: -10%;
		top: -30%;
		height: 70%;
		background: radial-gradient(
			60% 70% at 50% 100%,
			rgba(255, 236, 170, 0.4) 0%,
			rgba(255, 236, 170, 0) 70%
		);
		pointer-events: none;
		z-index: 0;
		animation: field-breathe 9s ease-in-out infinite;
	}

	@keyframes field-breathe {
		0%,
		100% {
			opacity: 0.5;
			transform: scale(1);
		}
		50% {
			opacity: 0.9;
			transform: scale(1.06);
		}
	}

	.field::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 26%;
		background: linear-gradient(180deg, rgba(116, 167, 47, 0) 0%, rgba(116, 167, 47, 0.28) 100%);
		pointer-events: none;
		z-index: 0;
	}

	.tuft {
		position: absolute;
		bottom: 4px;
		pointer-events: none;
		z-index: 0;
		transform-origin: 50% 100%;
		animation: sprout-sway 5s ease-in-out infinite;
	}

	@keyframes sprout-sway {
		0%,
		100% {
			rotate: -2deg;
		}
		50% {
			rotate: 2deg;
		}
	}

	.tuft--left {
		left: 6px;
	}

	.tuft--right {
		right: 6px;
		transform: scaleX(-1);
	}

	.balloon-btn {
		position: absolute;
		left: var(--x);
		top: var(--y);
		min-width: 64px;
		min-height: 64px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transform: translate(-50%, -50%) rotate(var(--tilt, 0deg));
		transition: transform 180ms var(--cn-ease-overshoot);
		border-radius: var(--cn-radius-pill);
		z-index: 1;
	}

	.balloon-btn:active {
		transform: translate(-50%, -50%) rotate(var(--tilt, 0deg)) scale(0.86, 0.92);
	}

	.balloon-bob {
		display: inline-flex;
		animation: balloon-bob 2.4s ease-in-out infinite;
	}

	@keyframes balloon-bob {
		0%,
		100% {
			margin-top: 0;
		}
		50% {
			margin-top: -6px;
		}
	}

	.balloon-btn.cheering .balloon-bob {
		animation: balloon-cheer 0.55s var(--cn-ease) infinite;
	}

	@keyframes balloon-cheer {
		0%,
		100% {
			margin-top: 0;
		}
		35% {
			margin-top: -14px;
		}
		60% {
			margin-top: 0;
		}
	}

	.balloon-btn.wrong .balloon-bob {
		animation: balloon-wiggle 400ms ease-in-out;
	}

	@keyframes balloon-wiggle {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-8px);
		}
		40% {
			transform: translateX(8px);
		}
		60% {
			transform: translateX(-5px);
		}
		80% {
			transform: translateX(5px);
		}
	}

	.balloon--glow {
		box-shadow:
			0 0 0 4px var(--cn-paper),
			0 0 18px 4px var(--cn-accent);
	}

	.balloon--pulse {
		box-shadow:
			0 0 0 5px var(--cn-paper),
			0 0 26px 8px var(--cn-accent);
		animation: balloon-pulse 1s var(--cn-ease) infinite;
	}

	@keyframes balloon-pulse {
		0%,
		100% {
			transform: translate(-50%, -50%) rotate(var(--tilt, 0deg)) scale(1);
		}
		50% {
			transform: translate(-50%, -50%) rotate(var(--tilt, 0deg)) scale(1.08);
		}
	}

	.feedback {
		margin: 0;
		min-height: 1.6em;
		text-align: center;
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-md);
		color: var(--cn-leaf-dark);
	}

	.tap-hint {
		margin: 0;
		text-align: center;
		color: var(--cn-ink-soft);
		font-size: var(--cn-text-sm);
	}
</style>

<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { audio } from '#lib/audio/index.js';
	import { clearLevel, getCleared, isLevelOpen, loadSave, persistSave } from '#lib/storage/save.js';
	import { MAX_LEVEL, ROUNDS_PER_LEVEL } from '#lib/games/counting/rules.js';
	import { createCountingSession } from '#lib/games/counting/session.svelte.js';
	import type { CountingSession } from '#lib/games/counting/session.svelte.js';
	import Fruit from '#lib/components/art/Fruit.svelte';
	import Bufi from '#lib/components/art/Bufi.svelte';
	import NumeralBubble from '#lib/games/counting/NumeralBubble.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import MuteButton from '#lib/components/ui/MuteButton.svelte';
	import LevelComplete from '#lib/components/LevelComplete.svelte';
	import Sparkles from '#lib/components/Sparkles.svelte';

	const GAME_ID = 'counting';
	const IDLE_MS = 10000;
	const CELEBRATE_MS = 1100;
	const WRONG_MS = 600;

	let cleared = $state(0);
	let hasProfile = $state(false);
	let decided = $state(false);
	let level = $state(0);
	let session = $state<CountingSession | null>(null);
	let wrongValue = $state<number | null>(null);
	let burstFor = $state<number | null>(null);
	let savedFor = $state(0);
	let fruitPops = $state<{ id: number; x: number; y: number }[]>([]);
	let popId = 0;

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
			void goto('/play/counting');
			return;
		}
		if (n !== level) {
			clearTimers();
			level = n;
			session = createCountingSession(n);
			wrongValue = null;
			burstFor = null;
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
	const kinds = $derived(round ? [...new Set(round.fruits.map((f) => f.kind))] : []);
	const prompt = $derived.by(() => {
		if (!round) return '';
		if (kinds.length === 1) {
			const key = `prompt_${kinds[0]}` as keyof typeof m;
			const fn = m[key] as unknown as (() => string) | undefined;
			if (typeof fn === 'function') return fn();
		}
		return m.how_many();
	});
	const hint = $derived(session?.hint ?? 0);
	const hintText = $derived.by(() => {
		if (!session || !round || hint === 0) return '';
		if (hint === 1) return m.hint_nudge();
		if (hint === 2) return m.hint_strong();
		return m.hint_reveal({ count: round.count });
	});
	const bufiPose = $derived(session?.phase !== 'playing' ? 'cheer' : hint > 0 ? 'hint' : 'idle');

	function tapFruit(i: number, x: number, y: number): void {
		if (!session || session.phase !== 'playing') return;
		session.tapFruit(i);
		audio.playSfx('tap');
		popId += 1;
		const id = popId;
		fruitPops = [...fruitPops, { id, x, y }];
		armIdle();
	}

	function removePop(id: number): void {
		fruitPops = fruitPops.filter((p) => p.id !== id);
	}

	function answer(option: number): void {
		if (!session || session.phase !== 'playing') return;
		if (session.answer(option)) {
			audio.playSfx('correct');
			burstFor = option;
			wrongValue = null;
			if (celebrateTimer) window.clearTimeout(celebrateTimer);
			celebrateTimer = window.setTimeout(() => {
				session?.advance();
				burstFor = null;
				armIdle();
			}, CELEBRATE_MS);
		} else {
			audio.playSfx('wrong');
			wrongValue = option;
			if (wrongTimer) window.clearTimeout(wrongTimer);
			wrongTimer = window.setTimeout(() => {
				wrongValue = null;
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
		wrongValue = null;
		burstFor = null;
		savedFor = 0;
		armIdle();
	}

	function bubbleState(option: number): 'idle' | 'glow' | 'pulse' | 'correct' | 'wrong' {
		if (!session || !round) return 'idle';
		if (session.phase !== 'playing') return option === round.count ? 'correct' : 'idle';
		if (wrongValue === option) return 'wrong';
		if (option === round.count && hint >= 2) return hint >= 3 ? 'pulse' : 'glow';
		return 'idle';
	}

	function tickNumber(i: number): number {
		if (!session) return 0;
		return [...session.counted].indexOf(i) + 1;
	}
</script>

<svelte:head>
	<title>{level > 0 ? m.level({ n: level }) : m.game_counting_name()}</title>
</svelte:head>

<div class="game cn-safe">
	<header class="top">
		<IconButton label={m.back()} size="sm" onclick={() => void goto('/play/counting')}>
			<span class="back-arrow" aria-hidden="true">←</span>
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
			<Bufi pose={bufiPose} size={64} />
			<div class="prompt-text">
				<p class="prompt">{prompt}</p>
				{#if hintText}
					<p class="hint" role="status">{hintText}</p>
				{/if}
			</div>
			<IconButton label={m.hint_nudge()} size="sm" onclick={help}>
				<Bufi pose="hint" size={28} />
			</IconButton>
		</div>

		<div class="field">
			{#each round.fruits as fruit, i (i)}
				<button
					type="button"
					class="fruit-btn"
					style="left: {fruit.x}%; top: {fruit.y}%; --tilt: {fruit.tilt}deg; animation-delay: {i *
						120}ms;"
					aria-label={m.tap_number()}
					onclick={() => tapFruit(i, fruit.x, fruit.y)}
				>
					<Fruit kind={fruit.kind} size={Math.round(64 * fruit.size)} />
					{#if session.assist && tickNumber(i) > 0}
						<span class="tick" aria-hidden="true">{tickNumber(i)}</span>
					{/if}
				</button>
			{/each}
			{#each fruitPops as pop (pop.id)}
				<Sparkles x={pop.x} y={pop.y} count={6} onDone={() => removePop(pop.id)} />
			{/each}
		</div>

		<p class="feedback" aria-live="polite">
			{#if session.phase === 'celebrating'}{m.correct()}{:else if wrongValue !== null}{m.try_again()}{/if}
		</p>

		<div class="answers">
			{#each round.options as option (option)}
				<span class="bubble-wrap">
					<NumeralBubble
						value={option}
						state={bubbleState(option)}
						onclick={() => answer(option)}
					/>
					{#if burstFor === option}
						<Sparkles x={50} y={50} count={10} onDone={() => (burstFor = null)} />
					{/if}
				</span>
			{/each}
		</div>
		<p class="tap-hint">{m.tap_number()}</p>
	{/if}
</div>

{#if session?.phase === 'complete'}
	<LevelComplete
		{level}
		isLast={level === MAX_LEVEL}
		onNext={() =>
			level < MAX_LEVEL ? void goto('/play/counting/' + (level + 1)) : void goto('/play/counting')}
		onReplay={replay}
		onAllLevels={() => void goto('/play/counting')}
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
		font-size: 1.4rem;
		line-height: 1;
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
		background: var(--cn-sky-2);
		border: 2px solid var(--cn-border);
		overflow: hidden;
		touch-action: manipulation;
	}

	.fruit-btn {
		position: absolute;
		min-width: 56px;
		min-height: 56px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transform: translate(-50%, -50%) rotate(var(--tilt, 0deg));
		animation: fruit-bob 2.4s ease-in-out infinite;
	}

	.fruit-btn:active {
		transform: translate(-50%, -50%) rotate(var(--tilt, 0deg)) scale(0.92);
	}

	@keyframes fruit-bob {
		0%,
		100% {
			margin-top: 0;
		}
		50% {
			margin-top: -6px;
		}
	}

	.tick {
		position: absolute;
		top: -6px;
		right: -6px;
		min-width: 26px;
		height: 26px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 6px;
		border-radius: var(--cn-radius-pill);
		background: var(--cn-accent);
		color: #fff;
		font-size: var(--cn-text-xs);
		font-weight: 800;
		box-shadow: var(--cn-shadow-1);
	}

	.feedback {
		margin: 0;
		min-height: 1.6em;
		text-align: center;
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-md);
		color: var(--cn-leaf-dark);
	}

	.answers {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: var(--cn-space-3);
	}

	.bubble-wrap {
		position: relative;
		display: inline-block;
	}

	.tap-hint {
		margin: 0;
		text-align: center;
		color: var(--cn-ink-soft);
		font-size: var(--cn-text-sm);
	}
</style>

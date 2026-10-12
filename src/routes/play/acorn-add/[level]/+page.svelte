<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { audio } from '#lib/audio/index.js';
	import { clearLevel, getCleared, isLevelOpen, loadSave, persistSave } from '#lib/storage/save.js';
	import { MAX_LEVEL, ROUNDS_PER_LEVEL, getLevelConfig } from '#lib/games/acorn-add/rules.js';
	import { createAcornSession } from '#lib/games/acorn-add/session.svelte.js';
	import type { AcornSession } from '#lib/games/acorn-add/session.svelte.js';
	import Acorn from '#lib/components/art/Acorn.svelte';
	import Muguri from '#lib/components/art/Muguri.svelte';
	import NumeralBubble from '#lib/games/counting/NumeralBubble.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import MuteButton from '#lib/components/ui/MuteButton.svelte';
	import LevelComplete from '#lib/components/LevelComplete.svelte';
	import Sparkles from '#lib/components/Sparkles.svelte';

	const GAME_ID = 'acorn-add';
	const IDLE_MS = 10000;
	const CELEBRATE_MS = 1100;
	const WRONG_MS = 600;
	const MOOD_MS = 1000;
	const GATHER_LEAD_MS = 500;
	const GATHER_STEP_MS = 250;
	const GATHER_TAIL_MS = 350;
	const GATHER_REDUCED_MS = 300;
	const COUNT_STEP_MS = 120;
	const COUNT_TAIL_MS = 450;

	let cleared = $state(0);
	let hasProfile = $state(false);
	let decided = $state(false);
	let level = $state(0);
	let session = $state<AcornSession | null>(null);
	let wrongValue = $state<number | null>(null);
	let fieldMood = $state<'happy' | 'sad'>('happy');
	let gathered = $state(false);
	let hopping = $state(false);
	let counting = $state(false);
	let sparkId = $state(0);
	let savedFor = $state(0);
	let fieldW = $state(0);
	let fieldH = $state(0);

	let idleTimer = 0;
	let celebrateTimer = 0;
	let wrongTimer = 0;
	let moodTimer = 0;
	let hopTimer = 0;
	let gatherTimer = 0;
	let countTimer = 0;

	const paramLevel = $derived(Number.parseInt(page.params.level ?? '', 10));

	function clearTimers(): void {
		if (idleTimer) window.clearTimeout(idleTimer);
		if (celebrateTimer) window.clearTimeout(celebrateTimer);
		if (wrongTimer) window.clearTimeout(wrongTimer);
		if (moodTimer) window.clearTimeout(moodTimer);
		if (hopTimer) window.clearTimeout(hopTimer);
		if (gatherTimer) window.clearTimeout(gatherTimer);
		if (countTimer) window.clearTimeout(countTimer);
		idleTimer = 0;
		celebrateTimer = 0;
		wrongTimer = 0;
		moodTimer = 0;
		hopTimer = 0;
		gatherTimer = 0;
		countTimer = 0;
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
			void goto('/play/acorn-add');
			return;
		}
		if (n !== level) {
			clearTimers();
			level = n;
			session = createAcornSession(n);
			wrongValue = null;
			fieldMood = 'happy';
			gathered = false;
			hopping = false;
			counting = false;
			sparkId = 0;
			savedFor = 0;
			armIdle();
		}
	});

	// Gathering beat: reset every round, then flip `gathered` on a timer.
	$effect(() => {
		const current = session?.round;
		if (!current || !decided) return;
		gathered = false;
		hopping = false;
		if (hopTimer) window.clearTimeout(hopTimer);
		if (gatherTimer) window.clearTimeout(gatherTimer);
		hopTimer = 0;
		gatherTimer = 0;
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!reduced) {
			hopTimer = window.setTimeout(() => {
				hopping = true;
			}, GATHER_LEAD_MS);
		}
		gatherTimer = window.setTimeout(
			() => {
				gathered = true;
			},
			reduced
				? GATHER_REDUCED_MS
				: GATHER_LEAD_MS + current.travels.length * GATHER_STEP_MS + GATHER_TAIL_MS
		);
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
	const chip = $derived(level > 0 && (getLevelConfig(level)?.chip ?? false));
	const hintText = $derived.by(() => {
		if (!session || !round || hint === 0) return '';
		if (hint === 1) return m.hint_nudge();
		if (hint === 2) return m.hint_strong();
		return m.hint_reveal({ count: round.sum });
	});

	function answer(option: number): void {
		if (!session || session.phase !== 'playing' || !gathered) return;
		if (session.answer(option)) {
			audio.playSfx('correct');
			wrongValue = null;
			sparkId += 1;
			if (celebrateTimer) window.clearTimeout(celebrateTimer);
			celebrateTimer = window.setTimeout(() => {
				session?.advance();
				armIdle();
			}, CELEBRATE_MS);
		} else {
			audio.playSfx('wrong');
			wrongValue = option;
			fieldMood = 'sad';
			if (wrongTimer) window.clearTimeout(wrongTimer);
			wrongTimer = window.setTimeout(() => {
				wrongValue = null;
			}, WRONG_MS);
			if (moodTimer) window.clearTimeout(moodTimer);
			moodTimer = window.setTimeout(() => {
				fieldMood = 'happy';
			}, MOOD_MS);
			armIdle();
		}
	}

	function help(): void {
		if (!session || session.phase !== 'playing') return;
		session.help();
		audio.playSfx('hint');
		armIdle();
	}

	function countAlong(): void {
		if (!session || !round || session.phase === 'complete') return;
		if (countTimer) window.clearTimeout(countTimer);
		counting = false;
		requestAnimationFrame(() => {
			counting = true;
		});
		countTimer = window.setTimeout(
			() => {
				counting = false;
			},
			round.sum * COUNT_STEP_MS + COUNT_TAIL_MS
		);
		armIdle();
	}

	function replay(): void {
		if (!session) return;
		if (celebrateTimer) window.clearTimeout(celebrateTimer);
		if (wrongTimer) window.clearTimeout(wrongTimer);
		if (moodTimer) window.clearTimeout(moodTimer);
		if (countTimer) window.clearTimeout(countTimer);
		session.replay();
		wrongValue = null;
		fieldMood = 'happy';
		counting = false;
		savedFor = 0;
		armIdle();
	}

	function bubbleState(option: number): 'idle' | 'glow' | 'pulse' | 'correct' | 'wrong' {
		if (!session || !round) return 'idle';
		if (session.phase !== 'playing') return option === round.sum ? 'correct' : 'idle';
		if (wrongValue === option) return 'wrong';
		if (option === round.sum && hint >= 2) return hint >= 3 ? 'pulse' : 'glow';
		return 'idle';
	}
</script>

<svelte:head>
	<title>{level > 0 ? m.level({ n: level }) : m.game_acorn_add_name()}</title>
</svelte:head>

<div class="game cn-safe">
	<header class="top">
		<IconButton label={m.back()} size="sm" onclick={() => void goto('/play/acorn-add')}>
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
			<div class="prompt-text">
				<p class="prompt">
					{m.addition_question()}
					{#if chip}
						<span class="chip">{round.a} + {round.b}</span>
					{/if}
				</p>
				{#if hintText}
					<p class="hint" role="status">{hintText}</p>
				{/if}
			</div>
			<IconButton label={m.hint_nudge()} size="sm" onclick={help}>
				<Muguri pose="hint" size={28} />
			</IconButton>
		</div>

		<div class="field" bind:clientWidth={fieldW} bind:clientHeight={fieldH}>
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
			<span class="plus" class:faded={gathered} aria-hidden="true">+</span>
			<button
				type="button"
				class="pile"
				class:cheering={session.phase === 'celebrating'}
				aria-label={m.addition_count_along()}
				onclick={countAlong}
			>
				{#each round.left as spot, i (`left-${i}`)}
					<span class="acorn-pos" style="left: {spot.x}%; top: {spot.y}%;">
						<span class="acorn-hop" class:counting style="animation-delay: {i * COUNT_STEP_MS}ms;">
							<Acorn
								size={Math.round(64 * spot.size)}
								mood={fieldMood === 'sad' ? 'sad' : 'happy'}
							/>
						</span>
					</span>
				{/each}
				{#each round.travels as travel, i (`travel-${i}`)}
					<span
						class="acorn-pos travel"
						class:go={hopping}
						style="left: {travel.x}%; top: {travel.y}%; --sx: {(
							((travel.fromX - travel.x) / 100) *
							fieldW
						).toFixed(1)}px; --sy: {(((travel.fromY - travel.y) / 100) * fieldH).toFixed(
							1
						)}px; animation-delay: {travel.delay * GATHER_STEP_MS}ms;"
					>
						<span
							class="acorn-hop"
							class:counting
							style="animation-delay: {(round.left.length + i) * COUNT_STEP_MS}ms;"
						>
							<Acorn
								size={Math.round(64 * travel.size)}
								mood={fieldMood === 'sad' ? 'sad' : 'happy'}
							/>
						</span>
					</span>
				{/each}
			</button>
			{#if sparkId > 0 && session.phase === 'celebrating'}
				{#key sparkId}
					<Sparkles x={30} y={50} count={10} />
				{/key}
			{/if}
		</div>

		<p class="feedback" aria-live="polite">
			{#if session.phase === 'celebrating'}{m.correct()}{:else if wrongValue !== null}{m.try_again()}{/if}
		</p>

		<div class="answers" class:show={gathered} inert={!gathered}>
			{#each round.options as option (option)}
				<NumeralBubble value={option} state={bubbleState(option)} onclick={() => answer(option)} />
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
			level < MAX_LEVEL
				? void goto('/play/acorn-add/' + (level + 1))
				: void goto('/play/acorn-add')}
		onReplay={replay}
		onAllLevels={() => void goto('/play/acorn-add')}
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

	.chip {
		display: inline-block;
		margin-left: var(--cn-space-2);
		padding: var(--cn-space-1) var(--cn-space-3);
		border: 2px solid var(--cn-leaf-dark);
		border-radius: var(--cn-radius-pill);
		background: linear-gradient(180deg, var(--cn-paper) 0%, var(--cn-paper-2) 100%);
		font-size: var(--cn-text-md);
		font-weight: 700;
		white-space: nowrap;
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

	.plus {
		position: absolute;
		left: 54%;
		top: 47%;
		transform: translate(-50%, -50%);
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-xl);
		font-weight: 700;
		color: var(--cn-ink-soft);
		pointer-events: none;
		z-index: 1;
		transition: opacity 400ms var(--cn-ease);
	}

	.plus.faded {
		opacity: 0;
	}

	.pile {
		position: absolute;
		inset: 0;
		min-width: 64px;
		min-height: 64px;
		display: block;
		border-radius: var(--cn-radius);
		z-index: 1;
		touch-action: manipulation;
	}

	.acorn-pos {
		position: absolute;
		display: inline-flex;
		transform: translate(-50%, -50%);
	}

	/* Normal motion: the b traveling acorns wait at their start (right patch)
	   until their hop begins; reduced motion skips this so they appear
	   already gathered. */
	@media (prefers-reduced-motion: no-preference) {
		.acorn-pos.travel {
			transform: translate(-50%, -50%) translate(var(--sx, 0px), var(--sy, 0px));
		}
	}

	.acorn-hop {
		display: inline-flex;
	}

	/* One-shot gather hop: base sits at the final spot; the `from` frame holds
	   the start offset during the lead + per-acorn delay. Under
	   prefers-reduced-motion the global rule neuters the animation, so the
	   acorn simply snaps to its final spot. */
	.travel.go {
		animation: acorn-gather 350ms var(--cn-ease-overshoot) both;
	}

	@keyframes acorn-gather {
		from {
			transform: translate(-50%, -50%) translate(var(--sx, 0px), var(--sy, 0px));
		}
		60% {
			transform: translate(-50%, -50%) translate(0, -8px);
		}
		to {
			transform: translate(-50%, -50%) translate(0, 0);
		}
	}

	.pile.cheering .acorn-hop {
		animation: acorn-cheer 0.55s var(--cn-ease) infinite;
	}

	@keyframes acorn-cheer {
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

	.acorn-hop.counting {
		animation: acorn-count 380ms var(--cn-ease) both;
	}

	@keyframes acorn-count {
		0%,
		100% {
			margin-top: 0;
		}
		40% {
			margin-top: -14px;
		}
		70% {
			margin-top: 0;
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

	.answers {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: var(--cn-space-3);
		opacity: 0;
		transform: translateY(8px);
		pointer-events: none;
		transition:
			opacity 400ms var(--cn-ease),
			transform 400ms var(--cn-ease-overshoot);
	}

	.answers.show {
		opacity: 1;
		transform: none;
		pointer-events: auto;
	}

	.tap-hint {
		margin: 0;
		text-align: center;
		color: var(--cn-ink-soft);
		font-size: var(--cn-text-sm);
	}
</style>

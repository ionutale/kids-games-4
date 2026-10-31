<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { audio } from '#lib/audio/index.js';
	import { clearLevel, getCleared, isLevelOpen, loadSave, persistSave } from '#lib/storage/save.js';
	import { MAX_LEVEL, type SceneId, type Vec2 } from '#lib/games/brush-along/rules.js';
	import { createBrushSession, type BrushSession } from '#lib/games/brush-along/session.svelte.js';
	import BrushBoard from '#lib/games/brush-along/BrushBoard.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import MuteButton from '#lib/components/ui/MuteButton.svelte';
	import LevelComplete from '#lib/components/LevelComplete.svelte';
	import Muguri from '#lib/components/art/Muguri.svelte';
	import Sparkles from '#lib/components/Sparkles.svelte';

	const GAME_ID = 'brush-along';
	const IDLE_MS = 4000;
	const GHOST_REARM_MS = 8000;
	const STROKE_MS = 600;
	const PAYOFF_MS = 1600;

	let cleared = $state(0);
	let hasProfile = $state(false);
	let decided = $state(false);
	let level = $state(0);
	let session = $state<BrushSession | null>(null);
	let savedFor = $state(0);
	let tappedStroke = $state(-1);

	let idleTimer = 0;
	let strokeTimer = 0;
	let payoffTimer = 0;

	const paramLevel = $derived(Number.parseInt(page.params.level ?? '', 10));

	function clearTimers(): void {
		if (idleTimer) window.clearTimeout(idleTimer);
		if (strokeTimer) window.clearTimeout(strokeTimer);
		if (payoffTimer) window.clearTimeout(payoffTimer);
		idleTimer = 0;
		strokeTimer = 0;
		payoffTimer = 0;
	}

	function armIdle(delay = IDLE_MS): void {
		if (idleTimer) window.clearTimeout(idleTimer);
		idleTimer = window.setTimeout(() => {
			idleTimer = 0;
			if (!session || session.phase !== 'tracing') return;
			session.markIdle();
			armIdle(GHOST_REARM_MS);
		}, delay);
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
			void goto('/play/brush-along');
			return;
		}
		if (n !== level) {
			clearTimers();
			level = n;
			session = createBrushSession(n);
			savedFor = 0;
			tappedStroke = -1;
			armIdle();
		}
	});

	// The unlock sting belongs to the completion card.
	$effect(() => {
		if (session?.phase === 'complete') audio.playSfx('unlock');
	});

	function saveClear(): void {
		if (savedFor === level) return;
		savedFor = level;
		if (idleTimer) window.clearTimeout(idleTimer);
		idleTimer = 0;
		if (!hasProfile) return;
		try {
			const data = loadSave(localStorage);
			const active = data.activeProfileId;
			if (!active) return;
			clearLevel(data, active, GAME_ID, level);
			persistSave(data, localStorage);
			cleared = getCleared(data, active, GAME_ID);
		} catch {
			// storage unavailable: the celebration still plays
		}
	}

	function onStrokeComplete(): void {
		if (!session) return;
		audio.playSfx('correct');
		// Save on the final stroke's completion, before the payoff starts.
		if (session.isLastStroke) saveClear();
		if (strokeTimer) window.clearTimeout(strokeTimer);
		strokeTimer = window.setTimeout(() => {
			strokeTimer = 0;
			if (!session) return;
			session.advance();
			if (session.phase === 'celebrating') {
				if (payoffTimer) window.clearTimeout(payoffTimer);
				payoffTimer = window.setTimeout(() => {
					payoffTimer = 0;
					session?.finish();
				}, PAYOFF_MS);
			} else {
				armIdle();
			}
		}, STROKE_MS);
	}

	function paint(from: Vec2, to: Vec2): void {
		if (!session || session.phase !== 'tracing') return;
		if (tappedStroke !== session.strokeIndex) {
			tappedStroke = session.strokeIndex;
			audio.playSfx('tap');
		}
		session.paint(from, to);
		if (session.strokeDone) onStrokeComplete();
		else armIdle();
	}

	function help(): void {
		if (!session || session.phase !== 'tracing') return;
		audio.playSfx('hint');
		session.help();
		if (session.strokeDone) onStrokeComplete();
		else armIdle();
	}

	function replay(): void {
		if (!session) return;
		clearTimers();
		session.replay();
		savedFor = 0;
		tappedStroke = -1;
		armIdle();
	}

	function sceneName(id: SceneId): string {
		switch (id) {
			case 'rain':
				return m.brush_scene_rain();
			case 'grass':
				return m.brush_scene_grass();
			case 'fence':
				return m.brush_scene_fence();
			case 'ladder':
				return m.brush_scene_ladder();
			case 'sun':
				return m.brush_scene_sun();
			case 'kite':
				return m.brush_scene_kite();
			case 'hills':
				return m.brush_scene_hills();
			case 'flower':
				return m.brush_scene_flower();
			case 'butterfly':
				return m.brush_scene_butterfly();
			case 'rainbow':
				return m.brush_scene_rainbow();
		}
	}

	const caption = $derived.by(() => {
		if (!session) return '';
		if (session.hint === 3) return m.brush_hint_reveal();
		if (session.hint === 2) return m.brush_hint_strong();
		if (session.hint === 1) return m.brush_hint_nudge();
		if (session.phase === 'stroke-done') return m.correct();
		if (session.phase === 'celebrating') return m.brush_done();
		return m.brush_trace();
	});
	const mascotPose = $derived<'idle' | 'cheer'>(
		session?.phase === 'stroke-done' || session?.phase === 'celebrating' ? 'cheer' : 'idle'
	);
	const sceneLabel = $derived(session ? sceneName(session.scene.id) : '');
</script>

<svelte:head>
	<title>{level > 0 ? m.level({ n: level }) : m.game_brush_name()}</title>
</svelte:head>

<div class="game cn-safe">
	<header class="top">
		<IconButton label={m.back()} size="sm" onclick={() => void goto('/play/brush-along')}>
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
			aria-label={m.brush_stroke({
				n: session.strokeIndex + 1,
				total: session.scene.strokes.length
			})}
		>
			{#each Array.from({ length: session.scene.strokes.length }, (_, i) => i) as i (i)}
				<span
					class="dot"
					class:full={i < session.strokeIndex ||
						(i === session.strokeIndex && session.phase !== 'tracing')}
				></span>
			{/each}
		</div>

		<p class="sr" aria-live="polite">
			{m.brush_stroke({ n: session.strokeIndex + 1, total: session.scene.strokes.length })}
		</p>

		<div class="prompt-row">
			<Muguri pose={mascotPose} size={64} />
			<p class="prompt" aria-live="polite">{caption}</p>
			<IconButton label={m.brush_hint_nudge()} size="sm" onclick={help}>
				<Muguri pose="hint" size={28} />
			</IconButton>
		</div>

		<div class="board-wrap">
			<BrushBoard
				scene={session.scene}
				stroke={session.stroke}
				strokeIndex={session.strokeIndex}
				painted={session.painted}
				phase={session.phase}
				helpCount={session.helpCount}
				idle={session.idle}
				{sceneLabel}
				onpaint={paint}
			/>
			{#if session.phase === 'stroke-done'}
				<div class="burst">
					<Sparkles x={50} y={50} count={10} />
				</div>
			{/if}
		</div>
	{/if}
</div>

{#if session?.phase === 'complete'}
	<LevelComplete
		{level}
		isLast={level === MAX_LEVEL}
		onNext={() =>
			level < MAX_LEVEL
				? void goto('/play/brush-along/' + (level + 1))
				: void goto('/play/brush-along')}
		onReplay={replay}
		onAllLevels={() => void goto('/play/brush-along')}
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

	.board-wrap {
		position: relative;
	}

	.burst {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>

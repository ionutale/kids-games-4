<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { SceneConfig, Stroke, Vec2 } from './rules.js';
	import type { BrushPhase } from './session.svelte.js';
	import BrushScene from './BrushScene.svelte';

	interface Props {
		scene: SceneConfig;
		stroke: Stroke;
		strokeIndex: number;
		painted: boolean[][];
		phase: BrushPhase;
		helpCount: number;
		idle: boolean;
		sceneLabel: string;
		onpaint: (from: Vec2, to: Vec2) => void;
	}

	let { scene, stroke, strokeIndex, painted, phase, helpCount, idle, sceneLabel, onpaint }: Props =
		$props();

	const GHOST_CYCLE_MS = 8000;

	let surface = $state<SVGSVGElement | null>(null);
	let drawing = $state(false);
	let pointerId: number | null = null;
	let cursor = $state<Vec2 | null>(null);
	let ghostPoint = $state<Vec2 | null>(null);
	let reduced = $state(false);
	let last: Vec2 | null = null;

	onMount(() => {
		reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	// Help stage 2 shows the corridor and slows the demonstration down.
	const ghostMs = $derived(helpCount >= 2 ? 3200 : 2200);
	const guidePoints = $derived(stroke.points.map((p) => `${p.x},${p.y}`).join(' '));
	const paintedPoints = $derived(
		stroke.points.filter((_, index) => (painted[strokeIndex] ?? [])[index])
	);
	const boardLabel = $derived(
		`${m.brush_board()}: ${sceneLabel}. ${m.brush_stroke({
			n: strokeIndex + 1,
			total: scene.strokes.length
		})}`
	);

	function toPoint(event: PointerEvent): Vec2 {
		const rect = surface?.getBoundingClientRect();
		if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
		return {
			x: ((event.clientX - rect.left) * 100) / rect.width,
			y: ((event.clientY - rect.top) * 100) / rect.height
		};
	}

	function start(event: PointerEvent): void {
		if (drawing) return;
		if (phase !== 'tracing') return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		if (!surface) return;
		const point = toPoint(event);
		drawing = true;
		pointerId = event.pointerId;
		last = point;
		cursor = point;
		try {
			surface.setPointerCapture(event.pointerId);
		} catch {
			// The pointer may already be gone; drawing still stops on pointerup.
		}
	}

	function move(event: PointerEvent): void {
		if (!drawing || event.pointerId !== pointerId || phase !== 'tracing') return;
		const point = toPoint(event);
		const previous = last ?? point;
		onpaint(previous, point);
		last = point;
		cursor = point;
	}

	function stop(event?: PointerEvent): void {
		if (!drawing && pointerId === null) return;
		if (event && pointerId !== null && event.pointerId !== pointerId) return;
		drawing = false;
		pointerId = null;
		last = null;
		cursor = null;
	}

	// A stroke can complete or a level can reset mid-drag: never keep drawing.
	$effect(() => {
		if (phase !== 'tracing') stop();
	});

	$effect(() => {
		strokeIndex;
		// Stop without subscribing to the drag state that stop() reads:
		// otherwise pointerdown would re-run this effect and cancel the drag.
		untrack(stop);
	});

	// The ghost brush is cosmetic: the view owns its own animation timer and
	// cleans it up when the stroke, the phase or the scene changes.
	$effect(() => {
		const show = phase === 'tracing' && (idle || helpCount >= 1);
		const points = stroke.points;
		if (!show || points.length === 0) {
			ghostPoint = null;
			return;
		}
		if (reduced) {
			ghostPoint = points[0] ?? null;
			return;
		}
		let frame = 0;
		let startedAt = 0;
		const step = (now: number) => {
			if (!startedAt) startedAt = now;
			const elapsed = (now - startedAt) % GHOST_CYCLE_MS;
			const ghost = ghostMs;
			if (elapsed < ghost) {
				const t = elapsed / ghost;
				const index = Math.min(points.length - 1, Math.floor(t * (points.length - 1)));
				ghostPoint = points[index] ?? null;
			} else {
				ghostPoint = null;
			}
			frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
		return () => {
			cancelAnimationFrame(frame);
			ghostPoint = null;
		};
	});
</script>

{#snippet brush(point: Vec2, ghost: boolean)}
	<g class="brush" class:ghost transform="translate({point.x} {point.y}) rotate(-40) scale(0.9)">
		<circle cx="0" cy="0" r="2.4" fill={stroke.color} />
		<rect
			x="-1.3"
			y="-8.6"
			width="2.6"
			height="4.8"
			rx="1"
			fill="#e3d3b7"
			stroke="#7d6c58"
			stroke-width="0.7"
		/>
		<rect x="-1.5" y="-12" width="3" height="3.8" rx="1.5" fill="#8c6242" />
	</g>
{/snippet}

<div class="frame">
	<svg
		bind:this={surface}
		class="surface"
		viewBox="0 0 100 100"
		role="img"
		aria-label={boardLabel}
		onpointerdown={start}
		onpointermove={move}
		onpointerup={stop}
		onpointercancel={stop}
		onlostpointercapture={stop}
	>
		<BrushScene scene={scene.id} active={phase === 'celebrating' || phase === 'complete'} />

		{#each scene.strokes as done, index (done.id)}
			{#if index < strokeIndex || (index === strokeIndex && phase !== 'tracing')}
				<polyline
					points={done.points.map((p) => `${p.x},${p.y}`).join(' ')}
					fill="none"
					stroke={done.color}
					stroke-width={done.width}
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			{/if}
		{/each}

		{#if phase === 'tracing'}
			{#if helpCount >= 2}
				<polyline
					class="band"
					points={guidePoints}
					fill="none"
					stroke={stroke.color}
					stroke-width={stroke.tolerance * 2}
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			{/if}

			<polyline
				class="guide"
				points={guidePoints}
				fill="none"
				stroke={stroke.color}
				stroke-width="1.6"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-dasharray="0.1 2.8"
			/>

			{#each paintedPoints as point, index (index)}
				<circle cx={point.x} cy={point.y} r={stroke.width / 2} fill={stroke.color} />
			{/each}

			<circle
				class="start-halo"
				cx={stroke.points[0]?.x ?? 0}
				cy={stroke.points[0]?.y ?? 0}
				r="4"
				fill="#fdf6e9"
				opacity="0.85"
			/>
			<circle
				class="start"
				class:pulse={helpCount >= 1}
				cx={stroke.points[0]?.x ?? 0}
				cy={stroke.points[0]?.y ?? 0}
				r="2.4"
				fill={stroke.color}
			/>

			{#if ghostPoint}
				{@render brush(ghostPoint, true)}
			{:else if !drawing}
				{@render brush(stroke.points[0] ?? { x: 50, y: 50 }, false)}
			{/if}

			{#if drawing && cursor}
				{@render brush(cursor, false)}
			{/if}
		{/if}
	</svg>
</div>

<style>
	.frame {
		width: 100%;
		max-width: 480px;
		margin: 0 auto;
	}

	.surface {
		display: block;
		width: 100%;
		aspect-ratio: 1 / 1;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		cursor: crosshair;
		border-radius: var(--cn-radius);
		border: 2px solid var(--cn-border);
		background: linear-gradient(180deg, var(--cn-sky-2) 0%, var(--cn-paper) 55%, #f7eddc 100%);
		box-shadow: var(--cn-shadow-1);
		overflow: hidden;
	}

	.guide {
		opacity: 0.55;
	}

	.band {
		opacity: 0.16;
		animation: band-pulse 1.9s ease-in-out infinite;
	}

	.start {
		opacity: 0.9;
	}

	.start.pulse {
		transform-box: fill-box;
		transform-origin: center;
		animation: start-pulse 1.4s ease-in-out infinite;
	}

	.brush.ghost {
		opacity: 0.4;
	}

	@keyframes band-pulse {
		0%,
		100% {
			opacity: 0.1;
		}
		50% {
			opacity: 0.24;
		}
	}

	@keyframes start-pulse {
		0%,
		100% {
			transform: scale(1);
			opacity: 0.9;
		}
		50% {
			transform: scale(1.5);
			opacity: 0.5;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.band,
		.start.pulse {
			animation: none;
		}
	}
</style>

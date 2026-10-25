<script lang="ts">
	import Balloon from '#lib/components/art/Balloon.svelte';
	import GhostBalloon from '#lib/components/art/GhostBalloon.svelte';
	import GhostHand from '#lib/components/art/GhostHand.svelte';
	import Muguri from '#lib/components/art/Muguri.svelte';
	import Sparkles from '#lib/components/Sparkles.svelte';
	import type { ColorId, Round } from '#lib/games/color-match/rules.js';
	import type { ColorPhase } from '#lib/games/color-match/session.svelte.js';

	interface Props {
		round: Round;
		phase: ColorPhase;
		hint: 0 | 1 | 2 | 3;
		wrongColor: ColorId | null;
		demo: boolean;
		burst: { color: ColorId; x: number; y: number; id: number } | null;
		targetLabel: string;
		caption: string;
		colorName: (id: ColorId) => string;
		onanswer: (color: ColorId) => void;
		onburstdone: () => void;
	}

	let {
		round,
		phase,
		hint,
		wrongColor,
		demo,
		burst,
		targetLabel,
		caption,
		colorName,
		onanswer,
		onburstdone
	}: Props = $props();

	let portalEl = $state<HTMLDivElement | null>(null);
	let drag = $state<{
		color: ColorId;
		x: number;
		y: number;
		startX: number;
		startY: number;
		moved: boolean;
	} | null>(null);
	let dropHot = $state(false);
	let didDrag = $state(false);

	const celebrating = $derived(phase === 'celebrating');

	function moodFor(color: ColorId): 'happy' | 'sad' {
		return wrongColor === color ? 'sad' : 'happy';
	}

	function balloonState(color: ColorId): 'idle' | 'glow' | 'pulse' {
		if (phase !== 'playing') return 'idle';
		if (color !== round.target) return 'idle';
		if (hint >= 3) return 'pulse';
		if (hint >= 2) return 'glow';
		return 'idle';
	}

	/** Keep mobile balloons clear of the clipped field edges. */
	function safeX(x: number): number {
		return 16 + (x / 100) * 68;
	}

	/** Leave the bottom of the field free for the ghost demo. */
	function safeY(y: number): number {
		return 14 + ((y - 14) / 50) * 38;
	}

	function isOverPortal(x: number, y: number): boolean {
		if (!portalEl) return false;
		const rect = portalEl.getBoundingClientRect();
		return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
	}

	function startDrag(event: PointerEvent, color: ColorId): void {
		if (phase !== 'playing') return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		didDrag = false;
		drag = {
			color,
			x: event.clientX,
			y: event.clientY,
			startX: event.clientX,
			startY: event.clientY,
			moved: false
		};
	}

	function onMove(event: PointerEvent): void {
		if (!drag) return;
		drag.x = event.clientX;
		drag.y = event.clientY;
		if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 8) {
			drag.moved = true;
			didDrag = true;
		}
		dropHot = drag.moved && isOverPortal(event.clientX, event.clientY);
	}

	function onUp(event: PointerEvent): void {
		if (!drag) return;
		const { color, moved } = drag;
		const over = isOverPortal(event.clientX, event.clientY);
		drag = null;
		dropHot = false;
		if (moved && over) onanswer(color);
		if (moved) {
			window.setTimeout(() => {
				didDrag = false;
			}, 350);
		}
	}

	function cancelDrag(): void {
		drag = null;
		dropHot = false;
	}

	function onClick(color: ColorId): void {
		if (didDrag) {
			didDrag = false;
			return;
		}
		if (!drag) onanswer(color);
	}
</script>

<svelte:window onpointermove={onMove} onpointerup={onUp} onpointercancel={cancelDrag} />

<div class="prompt">
	<div class="muguri"><Muguri pose="hint" size={64} /></div>

	<div class="portal-wrap">
		<div
			class="portal revealed"
			class:drop-hot={dropHot}
			class:demo
			class:flash={celebrating}
			bind:this={portalEl}
		>
			<div class="portal-target" class:nuzzle={celebrating} role="img" aria-label={targetLabel}>
				<Balloon color={round.target} size={78} mood="happy" />
			</div>
			{#if burst && celebrating}
				<Sparkles x={50} y={54} count={12} onDone={onburstdone} />
			{/if}
		</div>
	</div>

	<div class="caption-wrap">
		<p class="caption">{caption}</p>
	</div>
</div>

<div class="field">
	{#each round.balloons as spot (spot.color)}
		<button
			type="button"
			class="balloon-btn balloon--{balloonState(spot.color)}"
			class:wrong={wrongColor === spot.color}
			class:cheering={celebrating && burst?.color !== spot.color}
			class:flying={celebrating && burst?.color === spot.color}
			class:dragging={drag?.color === spot.color}
			style="--x: {safeX(spot.x)}%; --y: {safeY(spot.y)}%; --tilt: {spot.tilt}deg;"
			aria-label={colorName(spot.color)}
			onpointerdown={(event) => startDrag(event, spot.color)}
			onclick={() => onClick(spot.color)}
			oncontextmenu={(event) => event.preventDefault()}
		>
			<span class="balloon-bob" style="animation-delay: calc(var(--cn-stagger) * {spot.delay});">
				<Balloon color={spot.color} size={Math.round(88 * spot.size)} mood={moodFor(spot.color)} />
			</span>
		</button>
	{/each}

	{#if demo}
		<GhostBalloon class="ghost-slot" mode="drag" size={80} style="left: 50%; top: 78%;" />
		<GhostHand class="hand-ghost" pose="drag" style="left: 50%; top: 78%;" />
	{/if}
</div>

{#if drag}
	<div class="drag-balloon" style="left: {drag.x}px; top: {drag.y}px;">
		<Balloon color={drag.color} size={96} mood="happy" />
	</div>
{/if}

<style>
	.prompt {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--cn-space-3);
		min-height: 178px;
	}

	.muguri {
		flex: none;
	}

	.portal-wrap {
		position: relative;
		flex: none;
		width: 180px;
		height: 174px;
	}

	.portal {
		position: absolute;
		inset: 0 0 10px 0;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		border-radius: 90px 90px 16px 16px;
		border: 6px solid var(--cn-wood);
		background:
			radial-gradient(70% 55% at 50% 40%, rgba(255, 236, 170, 0.8), rgba(255, 236, 170, 0) 75%),
			linear-gradient(180deg, var(--cn-sky) 0%, var(--cn-sky-2) 100%);
		box-shadow:
			inset 0 0 0 3px rgba(253, 246, 233, 0.8),
			0 6px 0 rgba(74, 59, 47, 0.12);
		overflow: hidden;
		transition:
			box-shadow 200ms ease,
			transform 180ms var(--cn-ease);
	}

	.portal.revealed {
		box-shadow:
			inset 0 0 0 3px rgba(253, 246, 233, 0.9),
			0 0 0 4px var(--cn-paper),
			0 0 24px 6px var(--cn-gold);
	}

	.portal.drop-hot,
	.portal.demo {
		box-shadow:
			inset 0 0 0 3px rgba(253, 246, 233, 1),
			0 0 0 5px var(--cn-paper),
			0 0 32px 10px var(--cn-accent);
		animation: portal-pulse 1s var(--cn-ease) infinite;
	}

	.portal.flash {
		animation: portal-flash 620ms var(--cn-ease) both;
	}

	.portal-target {
		position: absolute;
		left: 50%;
		bottom: 12px;
		translate: -50% 0;
		animation: target-in 420ms var(--cn-ease-overshoot) both;
	}

	.portal-target.nuzzle {
		animation: target-nuzzle 720ms var(--cn-ease) both;
	}

	.caption-wrap {
		flex: 1 1 150px;
		min-width: 0;
		display: flex;
		align-items: center;
		min-height: 64px;
	}

	.caption {
		margin: 0;
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-md);
		line-height: 1.22;
		color: var(--cn-ink-soft);
		animation: caption-in 300ms var(--cn-ease) both;
	}

	.field {
		position: relative;
		height: 42dvh;
		min-height: 244px;
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
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
	}

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
		z-index: 2;
		touch-action: none;
		-webkit-touch-callout: none;
	}

	.balloon-btn:active {
		transform: translate(-50%, -50%) rotate(var(--tilt, 0deg)) scale(0.86, 0.92);
	}

	.balloon-btn.dragging {
		opacity: 0.18;
	}

	.balloon-bob {
		display: inline-flex;
		animation: balloon-bob 2.4s ease-in-out infinite;
	}

	.balloon-btn.cheering .balloon-bob {
		animation: balloon-cheer 0.55s var(--cn-ease) infinite;
	}

	.balloon-btn.wrong .balloon-bob {
		animation: balloon-wiggle 400ms ease-in-out;
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

	.balloon-btn.flying {
		animation: fly-to-portal 760ms var(--cn-ease) forwards;
		pointer-events: none;
	}

	.drag-balloon {
		position: fixed;
		z-index: 900;
		translate: -50% -50%;
		pointer-events: none;
		rotate: -4deg;
	}

	@keyframes portal-pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.025);
		}
	}

	@keyframes portal-flash {
		0% {
			transform: scale(1);
		}
		35% {
			transform: scale(1.06);
		}
		100% {
			transform: scale(1);
		}
	}

	@keyframes target-in {
		0% {
			opacity: 0;
			transform: scale(0.6) translateY(16px);
		}
		100% {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	@keyframes target-nuzzle {
		0% {
			transform: scale(1) rotate(0deg);
		}
		30% {
			transform: scale(1.14) rotate(-3deg);
		}
		60% {
			transform: scale(0.97) rotate(2deg);
		}
		100% {
			transform: scale(1) rotate(0deg);
		}
	}

	@keyframes caption-in {
		0% {
			opacity: 0;
			transform: translateY(6px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
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

	@keyframes balloon-bob {
		0%,
		100% {
			margin-top: 0;
		}
		50% {
			margin-top: -6px;
		}
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

	@keyframes balloon-pulse {
		0%,
		100% {
			transform: translate(-50%, -50%) rotate(var(--tilt, 0deg)) scale(1);
		}
		50% {
			transform: translate(-50%, -50%) rotate(var(--tilt, 0deg)) scale(1.08);
		}
	}

	@keyframes fly-to-portal {
		0% {
			transform: translate(-50%, -50%) rotate(var(--tilt, 0deg)) scale(1);
			opacity: 1;
		}
		55% {
			transform: translate(-50%, -50%) rotate(var(--tilt, 0deg)) scale(1.08);
			opacity: 1;
		}
		100% {
			transform: translate(-50%, -190%) rotate(var(--tilt, 0deg)) scale(0.5);
			opacity: 0;
		}
	}
</style>

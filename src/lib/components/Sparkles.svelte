<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	export interface SparklesProps {
		/** Horizontal position, % of the nearest positioned ancestor. */
		x: number;
		/** Vertical position, % of the nearest positioned ancestor. */
		y: number;
		/** Number of sparkle pips. */
		count?: number;
		/** Called once when the sparkles remove themselves. */
		onDone?: () => void;
	}

	let { x, y, count = 8, onDone }: SparklesProps = $props();

	// Same hexes as the --cn-* tokens.
	const PALETTE = ['#f5b73c', '#e8871f', '#c64f78', '#74a72f', '#a6e0d8'];

	const DURATION = 560;
	const FADE_DURATION = 180;

	interface Pip {
		tx: number;
		ty: number;
		delay: number;
		color: string;
	}

	let pips: Pip[] = $state([]);
	let fading = $state(false);
	let gone = $state(false);
	let timer = 0;

	onMount(() => {
		pips = Array.from({ length: count }, (_, i) => {
			const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
			const dist = 26 + Math.random() * 22;
			return {
				tx: Math.cos(angle) * dist,
				ty: Math.sin(angle) * dist,
				delay: Math.random() * 90,
				color: PALETTE[i % PALETTE.length]
			};
		});
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			fading = true;
			timer = window.setTimeout(remove, FADE_DURATION);
		} else {
			timer = window.setTimeout(remove, DURATION);
		}
	});

	onDestroy(() => window.clearTimeout(timer));

	function remove() {
		gone = true;
		onDone?.();
	}
</script>

{#if !gone}
	<div class="sparkles" class:fading style="left: {x}%; top: {y}%;" aria-hidden="true">
		{#each pips as pip}
			<svg
				class="pip"
				style="--tx: {pip.tx}px; --ty: {pip.ty}px; animation-delay: {pip.delay}ms;"
				width="12"
				height="12"
				viewBox="0 0 24 24"
			>
				<path
					d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z"
					fill={pip.color}
				/>
			</svg>
		{/each}
	</div>
{/if}

<style>
	.sparkles {
		position: absolute;
		width: 0;
		height: 0;
		pointer-events: none;
	}

	.pip {
		position: absolute;
		left: 0;
		top: 0;
		animation: cn-burst 560ms cubic-bezier(0.22, 1.25, 0.36, 1) forwards;
	}

	.fading {
		animation: cn-fade 180ms ease-out forwards;
	}

	.fading .pip {
		animation: none;
	}

	@keyframes cn-burst {
		0% {
			transform: translate(-50%, -50%) scale(0.3);
			opacity: 1;
		}
		70% {
			opacity: 1;
		}
		100% {
			transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1);
			opacity: 0;
		}
	}

	@keyframes cn-fade {
		to {
			opacity: 0;
		}
	}
</style>

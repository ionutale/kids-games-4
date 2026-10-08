<script lang="ts">
	import { onMount } from 'svelte';

	export interface ConfettiProps {
		/** Run the burst while true; stop + clear when false. */
		active: boolean;
		/** Number of confetti pieces. */
		pieces?: number;
		/** Called once when the burst finishes naturally. */
		onDone?: () => void;
	}

	let { active, pieces = 90, onDone }: ConfettiProps = $props();

	// Same hexes as the --cn-* tokens; canvas 2d can't read CSS vars.
	const PALETTE = ['#e08a3c', '#7fa653', '#b0577a', '#f0b34e', '#bfe3e0', '#c9752c', '#5f823c'];

	const DURATION = 2600;
	const FADE = 500;

	interface Piece {
		x: number;
		y: number;
		vx: number;
		vy: number;
		size: number;
		spin: number;
		spinSpeed: number;
		color: string;
		round: boolean;
	}

	let canvas: HTMLCanvasElement | null = $state(null);
	let reduced = $state(false);
	let frame = 0;

	onMount(() => {
		reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	function stopAndClear() {
		cancelAnimationFrame(frame);
		if (canvas) {
			const ctx = canvas.getContext('2d');
			ctx?.clearRect(0, 0, canvas.width, canvas.height);
		}
	}

	$effect(() => {
		if (!active) {
			stopAndClear();
			return;
		}
		if (reduced) {
			onDone?.();
			return;
		}
		const el = canvas;
		if (!el) return;

		const ctx = el.getContext('2d');
		if (!ctx) return;

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = el.clientWidth;
		const h = el.clientHeight;
		el.width = w * dpr;
		el.height = h * dpr;
		ctx.scale(dpr, dpr);

		const parts: Piece[] = Array.from({ length: pieces }, () => ({
			x: w / 2 + (Math.random() - 0.5) * 220,
			y: h * 0.35,
			vx: (Math.random() - 0.5) * 11,
			vy: -Math.random() * 10 - 3,
			size: 6 + Math.random() * 7,
			spin: Math.random() * Math.PI * 2,
			spinSpeed: (Math.random() - 0.5) * 0.3,
			color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
			round: Math.random() > 0.6
		}));

		const start = performance.now();
		const tick = (now: number) => {
			frame = requestAnimationFrame(tick);
			const elapsed = now - start;
			ctx.clearRect(0, 0, w, h);
			for (const p of parts) {
				p.vy += 0.28;
				p.vx *= 0.99;
				p.x += p.vx + Math.sin(now / 180 + p.spin) * 1.2;
				p.y += p.vy;
				p.spin += p.spinSpeed;
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(p.spin);
				ctx.fillStyle = p.color;
				ctx.globalAlpha =
					elapsed > DURATION - FADE ? Math.max(0, 1 - (elapsed - (DURATION - FADE)) / FADE) : 1;
				if (p.round) {
					ctx.beginPath();
					ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
					ctx.fill();
				} else {
					ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
				}
				ctx.restore();
			}
			if (elapsed > DURATION) {
				cancelAnimationFrame(frame);
				ctx.clearRect(0, 0, w, h);
				onDone?.();
			}
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});
</script>

{#if active && !reduced}
	<canvas bind:this={canvas} class="confetti" aria-hidden="true"></canvas>
{/if}

<style>
	.confetti {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 2;
	}
</style>

<script lang="ts">
	import { onDestroy } from 'svelte';
	import Avatar from '#lib/components/art/Avatar.svelte';
	import Balloon from '#lib/components/art/Balloon.svelte';
	import Fruit from '#lib/components/art/Fruit.svelte';
	import Mimo from '#lib/components/art/Mimo.svelte';
	import Muguri from '#lib/components/art/Muguri.svelte';
	import Sparkles from '#lib/components/Sparkles.svelte';
	import type { Board, Picture } from '#lib/games/peekaboo-pairs/rules.js';
	import type { PairsPhase } from '#lib/games/peekaboo-pairs/session.svelte.js';

	interface Props {
		board: Board;
		phase: PairsPhase;
		flipped: number[];
		matched: string[];
		hint: 0 | 1 | 2 | 3;
		hintIndex: number | null;
		revealIndex: number | null;
		cardBackLabel: string;
		boardLabel: string;
		labelFor: (picture: Picture) => string;
		cols: number;
		rows: number;
		gap: number;
		onflip: (index: number) => void;
	}

	let {
		board,
		phase,
		flipped,
		matched,
		hint,
		hintIndex,
		revealIndex,
		cardBackLabel,
		boardLabel,
		labelFor,
		cols,
		rows,
		gap,
		onflip
	}: Props = $props();

	let cardPx = $state(0);
	let gridWidth = $state(0);
	let staggering = $state(false);
	let wasPeek = true;
	let staggerTimer = 0;

	// Measured card width so pages and the calibration panel can react.
	$effect(() => {
		if (gridWidth <= 0) return;
		cardPx = Math.floor((gridWidth - (cols - 1) * gap) / cols);
	});

	// When the peek ends, cards turn down one by one: a short cosmetic window
	// the view owns on top of the page's peek timer.
	$effect(() => {
		if (wasPeek && phase !== 'peek') {
			if (staggerTimer) window.clearTimeout(staggerTimer);
			staggering = true;
			staggerTimer = window.setTimeout(
				() => {
					staggering = false;
					staggerTimer = 0;
				},
				320 + 40 * board.cards.length
			);
		}
		wasPeek = phase === 'peek';
	});

	onDestroy(() => {
		if (staggerTimer) window.clearTimeout(staggerTimer);
	});
</script>

{#snippet art(picture: Picture, size: number)}
	{#if picture.theme === 'fruit'}
		<Fruit kind={picture.id} {size} />
	{:else if picture.theme === 'balloon'}
		<Balloon color={picture.id} {size} />
	{:else if picture.id === 'muguri'}
		<Muguri pose="idle" {size} />
	{:else if picture.id === 'mimo'}
		<Mimo pose="idle" {size} />
	{:else}
		<Avatar id={picture.id} {size} />
	{/if}
{/snippet}

<div
	class="board"
	role="group"
	aria-label={boardLabel}
	bind:clientWidth={gridWidth}
	style="--cols:{cols}; --rows:{rows}; --gap:{gap}px"
>
	{#each board.cards as card, i (card.key)}
		{@const up =
			phase === 'peek' || flipped.includes(i) || matched.includes(card.pairId) || revealIndex === i}
		<button
			type="button"
			class="card"
			class:up
			class:nudge={hint >= 1 && !up}
			class:glow={hint === 2 && !up && i === hintIndex}
			class:miss={flipped.length === 2 && flipped.includes(i)}
			class:cleared={phase === 'celebrating' && matched.includes(card.pairId)}
			class:staggering
			style="--i:{i}"
			aria-pressed={up}
			aria-label={up ? labelFor(card.picture) : `${cardBackLabel} ${i + 1}`}
			onclick={() => {
				staggering = false;
				onflip(i);
			}}
		>
			<span class="inner">
				<span class="face face-back" aria-hidden="true">
					<svg viewBox="0 0 48 64" class="back-art" focusable="false">
						<rect x="3" y="3" width="42" height="58" rx="10" fill="var(--cn-paper-2)" />
						<rect
							x="3"
							y="3"
							width="42"
							height="58"
							rx="10"
							fill="none"
							stroke="var(--cn-wood)"
							stroke-width="4"
						/>
						<g stroke="var(--cn-leaf-dark)" stroke-width="2.5" fill="var(--cn-leaf)">
							<path d="M24 46 Q23 36 26 28" fill="none" stroke-linecap="round" />
							<path d="M26 30 Q19 24 13 27 Q19 34 26 30 Z" />
							<path d="M24 24 Q29 17 36 19 Q32 27 24 24 Z" />
						</g>
					</svg>
				</span>
				<span class="face face-front" aria-hidden="true">
					{@render art(card.picture, Math.max(24, Math.round(cardPx * 0.62)))}
				</span>
			</span>
			{#if matched.includes(card.pairId)}
				<Sparkles x={50} y={50} count={8} />
			{/if}
		</button>
	{/each}
</div>

<style>
	.board {
		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
		gap: var(--gap);
		width: 100%;
		max-width: 480px;
		margin: 0 auto;
	}

	.card {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 3 / 4;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		perspective: 600px;
		border-radius: 12px;
	}

	.card:focus-visible {
		outline: 3px solid var(--cn-leaf-dark);
		outline-offset: 3px;
	}

	.inner {
		position: absolute;
		inset: 0;
		display: block;
		transform-style: preserve-3d;
		transition: transform 320ms var(--cn-ease);
	}

	/* Stagger only the peek's flip-down. A card the kid taps during that
	   window gains .up, drops the delay, and flips immediately. */
	.card.staggering:not(.up) .inner {
		transition-delay: calc(var(--i) * 40ms);
	}

	.card.up .inner {
		transform: rotateY(180deg);
	}

	.face {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		border-radius: 12px;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		overflow: hidden;
	}

	.face-front {
		transform: rotateY(180deg);
		background: var(--cn-paper);
		border: 3px solid var(--cn-border);
		box-shadow: var(--cn-shadow-1);
	}

	.back-art {
		width: 100%;
		height: 100%;
		display: block;
	}

	/* Hints: a gentle wiggle on face-down cards, a glow on the hint card. */
	.card.nudge {
		animation: nudge-wiggle 480ms var(--cn-ease) 2;
	}

	@keyframes nudge-wiggle {
		0%,
		100% {
			transform: rotate(0deg);
		}
		30% {
			transform: rotate(-2.5deg);
		}
		70% {
			transform: rotate(2.5deg);
		}
	}

	.card.glow .face-back {
		animation: glow-pulse 900ms ease-in-out infinite;
	}

	/* A miss: a short, soft wiggle while the pair waits to flip back. */
	.card.miss {
		animation: miss-wiggle 360ms var(--cn-ease);
	}

	@keyframes miss-wiggle {
		0%,
		100% {
			transform: rotate(0deg);
		}
		30% {
			transform: rotate(-2deg);
		}
		70% {
			transform: rotate(2deg);
		}
	}

	@keyframes glow-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(255, 214, 90, 0);
		}
		50% {
			box-shadow: 0 0 10px 3px var(--cn-gold);
		}
	}

	/* Board clear: one small bounce on the matched cards. Animate the card,
	   not .inner — .inner's rotateY is what keeps the faces showing. */
	.card.cleared {
		animation: cleared-bounce 900ms var(--cn-ease-overshoot);
	}

	@keyframes cleared-bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		35% {
			transform: translateY(-6px);
		}
		65% {
			transform: translateY(-2px);
		}
	}

	/* Reduced motion: no rotation; the faces crossfade instead. */
	@media (prefers-reduced-motion: reduce) {
		.inner,
		.card.staggering .inner {
			transform: none !important;
			transition-delay: 0ms;
		}

		.face-front {
			opacity: 0;
			transform: none;
			transition: opacity 320ms ease;
			transition-duration: 320ms !important;
		}

		.card.up .face-front {
			opacity: 1;
		}

		.face-back {
			opacity: 1;
			transition: opacity 320ms ease;
			transition-duration: 320ms !important;
		}

		.card.up .face-back {
			opacity: 0;
		}

		.card.nudge .face-back {
			box-shadow: 0 0 0 2px var(--cn-gold);
			animation: none;
		}

		.card.glow .face-back {
			box-shadow: 0 0 0 5px var(--cn-gold);
			animation: none;
		}

		.card.nudge,
		.card.miss,
		.card.cleared {
			animation: none;
		}
	}
</style>

<script lang="ts">
	interface Props {
		value: number;
		state?: 'idle' | 'glow' | 'pulse' | 'correct' | 'wrong';
		onclick?: () => void;
	}

	let { value, state = 'idle', onclick }: Props = $props();
</script>

<button type="button" class="bubble bubble--{state} cn-press" aria-label={String(value)} {onclick}>
	<span class="numeral">{value}</span>
</button>

<style>
	.bubble {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 64px;
		min-height: 64px;
		padding: var(--cn-space-2) var(--cn-space-4);
		border: 2px solid var(--cn-leaf-dark);
		border-radius: var(--cn-radius-pill);
		background: var(--cn-wood);
		color: var(--cn-paper);
		box-shadow:
			var(--cn-shadow-1),
			inset 0 3px 0 rgba(255, 255, 255, 0.35),
			inset 0 -5px 0 rgba(74, 59, 47, 0.22);
	}

	.numeral {
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-lg);
		font-weight: 700;
		line-height: 1;
		color: var(--cn-paper);
	}

	.bubble--glow {
		box-shadow:
			var(--cn-shadow-1),
			inset 0 3px 0 rgba(255, 255, 255, 0.35),
			inset 0 -5px 0 rgba(74, 59, 47, 0.22),
			0 0 0 4px var(--cn-paper),
			0 0 18px 4px var(--cn-accent);
	}

	.bubble--pulse {
		box-shadow:
			var(--cn-shadow-1),
			inset 0 3px 0 rgba(255, 255, 255, 0.35),
			inset 0 -5px 0 rgba(74, 59, 47, 0.22),
			0 0 0 5px var(--cn-paper),
			0 0 26px 8px var(--cn-accent);
		animation: bubble-pulse 1s var(--cn-ease) infinite;
	}
	@keyframes bubble-pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.08);
		}
	}

	.bubble--correct {
		background: var(--cn-leaf);
		box-shadow:
			var(--cn-shadow-1),
			inset 0 3px 0 rgba(255, 255, 255, 0.35),
			inset 0 -5px 0 rgba(74, 59, 47, 0.22);
		animation: bubble-pop 400ms var(--cn-ease);
	}
	@keyframes bubble-pop {
		0% {
			transform: scale(1);
		}
		40% {
			transform: scale(1.18);
		}
		100% {
			transform: scale(1.05);
		}
	}

	.bubble--wrong {
		animation: bubble-wiggle 400ms ease-in-out;
	}
	@keyframes bubble-wiggle {
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
</style>

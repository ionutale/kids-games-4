<script lang="ts">
	/**
	 * A friendly garden glove that demonstrates the drag gesture without
	 * touching a real answer. The parent places it over the dashed ghost
	 * balloon.
	 */
	let {
		visible = true,
		pose = 'tap',
		class: klass = '',
		style = ''
	}: {
		visible?: boolean;
		pose?: 'tap' | 'drag';
		class?: string;
		style?: string;
	} = $props();
</script>

<span
	class="ghost-hand {klass}"
	class:visible
	class:tap={pose === 'tap'}
	class:drag={pose === 'drag'}
	aria-hidden="true"
	{style}
>
	<span class="ripple" aria-hidden="true"></span>
	<svg
		class="hand-svg"
		viewBox="0 0 64 72"
		width="64"
		height="72"
		aria-hidden="true"
		focusable="false"
	>
		<!-- index finger -->
		<rect
			x="26"
			y="6"
			width="12"
			height="32"
			rx="6"
			fill="#fdf6e9"
			stroke="#4a3b2f"
			stroke-width="3"
		/>
		<!-- thumb -->
		<rect
			x="12"
			y="28"
			width="11"
			height="19"
			rx="5.5"
			fill="#fdf6e9"
			stroke="#4a3b2f"
			stroke-width="3"
			transform="rotate(24 17.5 37.5)"
		/>
		<!-- palm -->
		<rect
			x="18"
			y="30"
			width="30"
			height="24"
			rx="12"
			fill="#fdf6e9"
			stroke="#4a3b2f"
			stroke-width="3"
		/>
		<!-- cuff -->
		<rect
			x="22"
			y="50"
			width="24"
			height="12"
			rx="6"
			fill="#74a72f"
			stroke="#4a3b2f"
			stroke-width="3"
		/>
		<!-- thumb crease -->
		<path
			d="M20 36 C24 39 27 40 31 39"
			fill="none"
			stroke="#4a3b2f"
			stroke-width="1.8"
			stroke-linecap="round"
			opacity="0.45"
		/>
	</svg>
</span>

<style>
	.ghost-hand {
		position: absolute;
		z-index: 30;
		width: 64px;
		height: 72px;
		pointer-events: none;
		opacity: 0;
		translate: -50% -6px;
		transition: opacity 160ms ease;
	}

	.ghost-hand.visible {
		opacity: 1;
	}

	.hand-svg {
		display: block;
		transform-origin: 32px 6px;
		rotate: -12deg;
	}

	.ripple {
		position: absolute;
		left: 32px;
		top: 6px;
		width: 28px;
		height: 28px;
		margin: -14px 0 0 -14px;
		border-radius: 50%;
		border: 2px solid var(--cn-accent);
		opacity: 0;
	}

	.ghost-hand.tap.visible .hand-svg {
		animation: hand-tap 900ms ease-in-out infinite;
	}

	.ghost-hand.tap.visible .ripple {
		animation: hand-ripple 900ms ease-out infinite;
	}

	.ghost-hand.drag.visible .hand-svg {
		animation: hand-drag 1300ms ease-in-out infinite;
	}

	@keyframes hand-tap {
		0%,
		100% {
			transform: translateY(0) rotate(-12deg);
		}
		40% {
			transform: translateY(8px) rotate(-12deg);
		}
		62% {
			transform: translateY(0) rotate(-12deg);
		}
	}

	@keyframes hand-ripple {
		0%,
		30% {
			opacity: 0;
			transform: scale(0.4);
		}
		45% {
			opacity: 0.7;
			transform: scale(0.6);
		}
		75%,
		100% {
			opacity: 0;
			transform: scale(1.5);
		}
	}

	@keyframes hand-drag {
		0%,
		12% {
			transform: translate(0, 0) rotate(-12deg);
			opacity: 1;
		}
		58% {
			transform: translate(0, -150px) rotate(-12deg);
			opacity: 1;
		}
		86% {
			transform: translate(0, -150px) rotate(-12deg);
			opacity: 1;
		}
		100% {
			transform: translate(0, -150px) rotate(-12deg);
			opacity: 0;
		}
	}
</style>

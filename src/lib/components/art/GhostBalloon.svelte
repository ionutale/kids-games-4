<script lang="ts">
	/**
	 * A neutral dashed balloon that shows where to start the drag gesture.
	 * It is never a real answer.
	 */
	let {
		size = 96,
		visible = true,
		mode = 'tap',
		class: klass = '',
		style = ''
	}: {
		size?: number;
		visible?: boolean;
		mode?: 'tap' | 'drag';
		class?: string;
		style?: string;
	} = $props();

	const boxStyle = $derived(`width: ${size}px; height: ${size * 1.12}px; ${style}`);
</script>

<span
	class="ghost-balloon {klass}"
	class:visible
	class:demo-tap={mode === 'tap'}
	class:demo-drag={mode === 'drag'}
	style={boxStyle}
	aria-hidden="true"
>
	<svg viewBox="0 0 100 112" width="100%" height="100%" focusable="false">
		<ellipse
			cx="50"
			cy="46"
			rx="27"
			ry="30"
			fill="#fdf6e9"
			fill-opacity="0.28"
			stroke="#7d6c58"
			stroke-width="2.4"
			stroke-dasharray="6 7"
			stroke-linecap="round"
		/>
		<path
			d="M50 76 C54 80 46 84 50 88 C54 92 46 96 50 100 C52 103 50 106 50 108"
			fill="none"
			stroke="#7d6c58"
			stroke-width="2"
			stroke-dasharray="4 6"
			stroke-linecap="round"
			opacity="0.7"
		/>
		<text
			x="50"
			y="56"
			text-anchor="middle"
			font-size="26"
			font-weight="700"
			fill="#7d6c58"
			opacity="0.7"
			font-family="Baloo 2, system-ui, sans-serif">?</text
		>
	</svg>
</span>

<style>
	.ghost-balloon {
		position: absolute;
		z-index: 12;
		pointer-events: none;
		opacity: 0;
		translate: -50% -50%;
		transition: opacity 180ms ease;
	}

	.ghost-balloon.visible {
		opacity: 1;
	}

	.ghost-balloon.demo-tap.visible svg {
		animation: ghost-tap 900ms ease-in-out infinite;
	}

	.ghost-balloon.demo-drag.visible svg {
		animation: ghost-pulse 1.3s ease-in-out infinite;
	}

	@keyframes ghost-tap {
		0%,
		100% {
			transform: scale(1);
		}
		40% {
			transform: scale(1.06);
		}
		62% {
			transform: scale(1);
		}
	}

	@keyframes ghost-pulse {
		0%,
		100% {
			transform: scale(1);
			opacity: 0.55;
		}
		50% {
			transform: scale(1.05);
			opacity: 0.9;
		}
	}
</style>

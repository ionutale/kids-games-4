<script lang="ts">
	import type { SceneId } from './rules.js';

	interface Props {
		scene: SceneId;
		active: boolean;
	}

	let { scene, active }: Props = $props();

	const INK = '#4a3b2f';
	const INK_SOFT = '#7d6c58';
	const PAPER = '#fdf6e9';
	const CLOUD = '#a6e0d8';
	const LEAF = '#74a72f';
	const LEAF_DARK = '#527d1e';
	const GOLD = '#f5b73c';
	const ACCENT = '#e8871f';
	const BERRY = '#c64f78';
	const WOOD = '#8c6242';
	const RAIN = '#3f7fc4';
</script>

<svg
	class="scene"
	class:active
	viewBox="0 0 100 100"
	width="100%"
	height="100%"
	preserveAspectRatio="xMidYMid meet"
	pointer-events="none"
	aria-hidden="true"
	focusable="false"
>
	{#if scene === 'rain'}
		<g class="backdrop">
			<path
				class="fill"
				d="M22 32 Q18 32 18 27 Q18 22 24 21 Q25 13 34 13 Q38 7 46 9 Q52 3 60 8 Q68 6 71 14 Q79 15 78 22 Q82 27 77 32 Z"
				fill={CLOUD}
				fill-opacity="0.3"
				stroke={INK_SOFT}
				stroke-width="1.3"
				stroke-linejoin="round"
			/>
			<rect
				class="fill"
				x="0"
				y="82"
				width="100"
				height="18"
				fill={LEAF}
				fill-opacity="0.18"
				stroke={INK_SOFT}
				stroke-width="1"
				stroke-opacity="0.35"
			/>
		</g>
		<g class="payoff rain" stroke={RAIN} stroke-width="1.8" stroke-linecap="round">
			<line class="drop" x1="38" y1="32" x2="35" y2="42" />
			<line class="drop" x1="60" y1="30" x2="57" y2="40" />
			<line class="drop" x1="80" y1="34" x2="77" y2="44" />
		</g>
	{:else if scene === 'grass'}
		<g class="backdrop">
			<rect
				class="fill"
				x="0"
				y="82"
				width="100"
				height="18"
				fill={LEAF}
				fill-opacity="0.18"
				stroke={INK_SOFT}
				stroke-width="1"
				stroke-opacity="0.35"
			/>
		</g>
		<g class="payoff grass" stroke={LEAF_DARK} stroke-width="2" stroke-linecap="round">
			<g class="tuft tuft-a">
				<path d="M12 98 Q11 88 14 80" fill="none" />
				<path d="M12 98 Q6 90 4 84" fill="none" />
				<path d="M12 98 Q17 91 20 86" fill="none" />
			</g>
			<g class="tuft tuft-b">
				<path d="M88 98 Q87 88 90 80" fill="none" />
				<path d="M88 98 Q82 90 80 84" fill="none" />
				<path d="M88 98 Q93 91 96 86" fill="none" />
			</g>
		</g>
	{:else if scene === 'fence'}
		<g class="backdrop">
			<path
				class="fill"
				d="M12 32 L18 42 V84 H6 V42 Z"
				fill={WOOD}
				fill-opacity="0.28"
				stroke={INK_SOFT}
				stroke-width="1.2"
				stroke-linejoin="round"
			/>
			<path
				class="fill"
				d="M88 32 L94 42 V84 H82 V42 Z"
				fill={WOOD}
				fill-opacity="0.28"
				stroke={INK_SOFT}
				stroke-width="1.2"
				stroke-linejoin="round"
			/>
		</g>
		<g class="payoff fence">
			<g class="fence-flower">
				<path
					d="M50 46 Q48 38 50 32"
					fill="none"
					stroke={LEAF_DARK}
					stroke-width="1.6"
					stroke-linecap="round"
				/>
				<circle
					cx="50"
					cy="29"
					r="4.4"
					fill={BERRY}
					fill-opacity="0.8"
					stroke={INK_SOFT}
					stroke-width="0.8"
				/>
				<circle cx="50" cy="29" r="1.6" fill={GOLD} />
			</g>
		</g>
	{:else if scene === 'ladder'}
		<g class="backdrop">
			<path
				class="fill"
				d="M45 97 Q43 62 44 30 Q45 21 50 17 Q55 21 56 30 Q57 62 55 97 Z"
				fill={WOOD}
				fill-opacity="0.3"
				stroke={INK_SOFT}
				stroke-width="1.2"
				stroke-linejoin="round"
			/>
			<circle
				class="fill"
				cx="50"
				cy="14"
				r="11"
				fill={LEAF}
				fill-opacity="0.28"
				stroke={INK_SOFT}
				stroke-width="1.1"
			/>
			<circle
				class="fill"
				cx="39"
				cy="18"
				r="7.5"
				fill={LEAF}
				fill-opacity="0.28"
				stroke={INK_SOFT}
				stroke-width="1.1"
			/>
			<circle
				class="fill"
				cx="61"
				cy="18"
				r="7.5"
				fill={LEAF}
				fill-opacity="0.28"
				stroke={INK_SOFT}
				stroke-width="1.1"
			/>
		</g>
		<g class="payoff ladder">
			<g class="climber">
				<circle cx="50" cy="76" r="4.2" fill={PAPER} stroke={WOOD} stroke-width="1.2" />
				<path
					d="M50 71 Q48 66 51 63 Q55 65 53 71 Z"
					fill={LEAF}
					stroke={LEAF_DARK}
					stroke-width="0.8"
					stroke-linejoin="round"
				/>
			</g>
		</g>
	{:else if scene === 'sun'}
		<g class="backdrop">
			<circle
				class="fill sun-disc"
				cx="50"
				cy="52"
				r="18"
				fill={GOLD}
				fill-opacity="0.32"
				stroke={GOLD}
				stroke-width="1.4"
				stroke-opacity="0.7"
			/>
		</g>
		<g class="payoff sun">
			<circle class="sun-glow" cx="50" cy="52" r="25" fill="none" stroke={GOLD} stroke-width="3" />
		</g>
	{:else if scene === 'kite'}
		<g class="backdrop">
			<path
				class="fill"
				d="M50 13 L67 31 L50 49 L33 31 Z"
				fill={ACCENT}
				fill-opacity="0.22"
				stroke={INK_SOFT}
				stroke-width="1.3"
				stroke-linejoin="round"
			/>
		</g>
		<g class="payoff kite">
			<g class="ribbon ribbon-a">
				<path
					d="M54 85 L58 88 L54 91 L50 88 Z"
					fill={BERRY}
					fill-opacity="0.65"
					stroke={INK_SOFT}
					stroke-width="0.8"
					stroke-linejoin="round"
				/>
			</g>
			<g class="ribbon ribbon-b">
				<path
					d="M58 92 L62 95 L58 98 L54 95 Z"
					fill={GOLD}
					fill-opacity="0.7"
					stroke={INK_SOFT}
					stroke-width="0.8"
					stroke-linejoin="round"
				/>
			</g>
		</g>
	{:else if scene === 'hills'}
		<g class="backdrop">
			<rect class="fill" x="0" y="0" width="100" height="58" fill={CLOUD} fill-opacity="0.18" />
			<rect class="fill" x="0" y="58" width="100" height="42" fill={LEAF} fill-opacity="0.16" />
		</g>
		<g class="payoff hills">
			<path
				class="hill-glow"
				d="M4 64 C32 52 68 76 96 64"
				fill="none"
				stroke={GOLD}
				stroke-width="9"
				stroke-linecap="round"
			/>
			<path
				class="hill-glow"
				d="M4 76 C32 64 68 88 96 76"
				fill="none"
				stroke={GOLD}
				stroke-width="9"
				stroke-linecap="round"
			/>
			<path
				class="hill-glow"
				d="M4 88 C32 76 68 100 96 88"
				fill="none"
				stroke={GOLD}
				stroke-width="9"
				stroke-linecap="round"
			/>
		</g>
	{:else if scene === 'flower'}
		<g class="backdrop">
			<path
				class="fill"
				d="M40 82 H60 L57 97 H43 Z"
				fill={ACCENT}
				fill-opacity="0.28"
				stroke={INK_SOFT}
				stroke-width="1.2"
				stroke-linejoin="round"
			/>
			<rect
				class="fill"
				x="37"
				y="78"
				width="26"
				height="5"
				rx="2.5"
				fill={ACCENT}
				fill-opacity="0.35"
				stroke={INK_SOFT}
				stroke-width="0.9"
			/>
			<g class="fill bloom" fill={BERRY} fill-opacity="0.18" stroke={INK_SOFT} stroke-width="1.1">
				<ellipse cx="50" cy="35" rx="4.6" ry="7" />
				<ellipse cx="50" cy="55" rx="4.6" ry="7" />
				<ellipse cx="40" cy="45" rx="7" ry="4.6" />
				<ellipse cx="60" cy="45" rx="7" ry="4.6" />
				<ellipse cx="43" cy="38" rx="4.6" ry="7" transform="rotate(-45 43 38)" />
				<ellipse cx="57" cy="52" rx="4.6" ry="7" transform="rotate(-45 57 52)" />
				<ellipse cx="57" cy="38" rx="4.6" ry="7" transform="rotate(45 57 38)" />
				<ellipse cx="43" cy="52" rx="4.6" ry="7" transform="rotate(45 43 52)" />
			</g>
		</g>
	{:else if scene === 'butterfly'}
		<g class="backdrop">
			<g class="butterfly-body">
				<ellipse
					class="fill"
					cx="50"
					cy="52"
					rx="3.2"
					ry="11"
					fill={INK_SOFT}
					fill-opacity="0.55"
					stroke={INK_SOFT}
					stroke-width="1"
				/>
				<circle
					class="fill"
					cx="50"
					cy="37.5"
					r="3.4"
					fill={INK_SOFT}
					fill-opacity="0.65"
					stroke={INK}
					stroke-width="0.8"
				/>
				<path
					d="M50 35 Q45 29 42 26"
					fill="none"
					stroke={INK_SOFT}
					stroke-width="1"
					stroke-linecap="round"
				/>
				<path
					d="M50 35 Q55 29 58 26"
					fill="none"
					stroke={INK_SOFT}
					stroke-width="1"
					stroke-linecap="round"
				/>
			</g>
		</g>
		<g class="payoff butterfly" fill={GOLD}>
			<circle class="twinkle" cx="34" cy="38" r="1.2" />
			<circle class="twinkle" cx="66" cy="38" r="1.2" />
			<circle class="twinkle" cx="28" cy="58" r="1" />
			<circle class="twinkle" cx="72" cy="58" r="1" />
		</g>
	{:else if scene === 'rainbow'}
		<g class="backdrop">
			<path
				class="fill"
				d="M5 84 Q0 84 1 78 Q2 72 9 71 Q10 64 18 64 Q23 58 30 62 Q37 59 40 66 Q46 68 44 75 Q47 81 39 83 Z"
				fill={PAPER}
				fill-opacity="0.85"
				stroke={INK_SOFT}
				stroke-width="1.2"
				stroke-opacity="0.45"
				stroke-linejoin="round"
			/>
		</g>
		<g class="payoff rainbow" fill={GOLD}>
			<path
				class="twinkle"
				d="M50 32 l1.2 3.2 3.2 1.2 -3.2 1.2 -1.2 3.2 -1.2 -3.2 -3.2 -1.2 3.2 -1.2 Z"
			/>
			<circle class="twinkle" cx="34" cy="46" r="1.3" />
			<circle class="twinkle" cx="66" cy="46" r="1.3" />
			<circle class="twinkle" cx="24" cy="62" r="1.1" />
			<circle class="twinkle" cx="76" cy="62" r="1.1" />
			<circle class="twinkle" cx="88" cy="74" r="1.2" />
		</g>
	{/if}
</svg>

<style>
	.scene {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.fill {
		transition:
			fill-opacity 500ms ease,
			stroke-opacity 500ms ease;
	}

	.scene.active .fill {
		/* Keep the traced strokes readable against the finished scene. */
		fill-opacity: 0.55;
		stroke-opacity: 0.55;
	}

	.payoff {
		opacity: 0;
		transition: opacity 400ms ease;
	}

	.scene.active .payoff {
		opacity: 1;
	}

	.sun-glow {
		opacity: 0;
		transform-box: fill-box;
		transform-origin: center;
	}

	.hill-glow {
		stroke-opacity: 0.2;
	}

	.twinkle {
		opacity: 0;
	}

	.scene.active .sun-glow {
		animation: sun-glow 3.2s ease-in-out infinite;
	}

	.scene.active .rain .drop {
		animation: drop-fall 1.4s linear infinite;
	}

	.rain .drop:nth-child(2) {
		animation-delay: 0.4s;
	}

	.rain .drop:nth-child(3) {
		animation-delay: 0.8s;
	}

	.scene.active .grass .tuft {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation: tuft-sway 2.8s ease-in-out infinite;
	}

	.grass .tuft-b {
		animation-delay: 0.9s;
	}

	.scene.active .fence-flower {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation: flower-pop 900ms var(--cn-ease-overshoot) both;
	}

	.scene.active .climber {
		animation: climb 3.2s ease-in-out infinite alternate;
	}

	.scene.active .ribbon {
		transform-box: fill-box;
		transform-origin: 50% 0;
		animation: flutter 1.8s ease-in-out infinite;
	}

	.ribbon-b {
		animation-delay: 0.3s;
	}

	.scene.active .hill-glow {
		animation: hill-glow 2.8s ease-in-out infinite;
	}

	.scene.active .bloom {
		transform-box: fill-box;
		transform-origin: center;
		animation: bloom-in 1.1s var(--cn-ease-overshoot) both;
	}

	.scene.active .butterfly-body {
		transform-box: fill-box;
		transform-origin: center;
		animation: butterfly-bob 2.2s ease-in-out infinite;
	}

	.scene.active .twinkle {
		animation: twinkle 1.8s ease-in-out infinite;
	}

	.twinkle:nth-child(2) {
		animation-delay: 0.4s;
	}

	.twinkle:nth-child(3) {
		animation-delay: 0.8s;
	}

	.twinkle:nth-child(4) {
		animation-delay: 1.2s;
	}

	.twinkle:nth-child(5) {
		animation-delay: 0.6s;
	}

	@keyframes drop-fall {
		0% {
			transform: translateY(-8px);
			opacity: 0;
		}
		35% {
			opacity: 0.85;
		}
		100% {
			transform: translateY(22px);
			opacity: 0;
		}
	}

	@keyframes tuft-sway {
		0%,
		100% {
			transform: rotate(-3deg);
		}
		50% {
			transform: rotate(3deg);
		}
	}

	@keyframes flower-pop {
		from {
			transform: scale(0.2) translateY(8px);
			opacity: 0;
		}
		to {
			transform: scale(1) translateY(0);
			opacity: 1;
		}
	}

	@keyframes climb {
		from {
			transform: translateY(0);
		}
		to {
			transform: translateY(-34px);
		}
	}

	@keyframes flutter {
		0%,
		100% {
			transform: rotate(-6deg);
		}
		50% {
			transform: rotate(6deg);
		}
	}

	@keyframes sun-glow {
		0%,
		100% {
			opacity: 0.25;
			transform: scale(1);
		}
		50% {
			opacity: 0.55;
			transform: scale(1.12);
		}
	}

	@keyframes hill-glow {
		0%,
		100% {
			stroke-opacity: 0.12;
		}
		50% {
			stroke-opacity: 0.38;
		}
	}

	@keyframes bloom-in {
		from {
			transform: scale(0.55);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	@keyframes butterfly-bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-2px);
		}
	}

	@keyframes twinkle {
		0%,
		100% {
			opacity: 0.15;
		}
		50% {
			opacity: 0.9;
		}
	}

	/* Reduced motion: the scene settles on its finished picture, no loops. */
	@media (prefers-reduced-motion: reduce) {
		.fill {
			transition: none;
		}

		.payoff {
			transition: none;
		}

		.scene.active .sun-glow,
		.scene.active .rain .drop,
		.scene.active .grass .tuft,
		.scene.active .fence-flower,
		.scene.active .climber,
		.scene.active .ribbon,
		.scene.active .hill-glow,
		.scene.active .bloom,
		.scene.active .butterfly-body,
		.scene.active .twinkle {
			animation: none;
		}

		.scene.active .rain .drop {
			opacity: 0.7;
		}

		.scene.active .climber {
			transform: translateY(-34px);
		}

		.scene.active .sun-glow {
			opacity: 0.45;
		}

		.scene.active .hill-glow {
			stroke-opacity: 0.24;
		}

		.scene.active .bloom,
		.scene.active .fence-flower {
			opacity: 1;
			transform: none;
		}

		.scene.active .twinkle {
			opacity: 1;
		}
	}
</style>

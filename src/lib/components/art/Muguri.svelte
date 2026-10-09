<script lang="ts">
	type MuguriPose = 'idle' | 'hint' | 'cheer' | 'sleepy';

	let {
		pose = 'idle',
		size = 120,
		class: klass = ''
	}: { pose?: MuguriPose; size?: number; class?: string } = $props();
</script>

<span
	class="muguri muguri--{pose}{klass ? ` ${klass}` : ''}"
	aria-hidden="true"
	style:width="{size}px"
	style:height="{size}px"
>
	<svg viewBox="0 0 120 120" width={size} height={size} role="presentation" focusable="false">
		<!-- leafy sprigs on top (the character's hands/ears) -->
		<g class="muguri-leaf muguri-leaf--left">
			<path d="M60 30 C48 28 36 20 32 8 C46 8 58 16 60 30 Z" fill="#74a72f" />
			<path
				d="M58 28 C50 22 42 16 36 10"
				stroke="#527d1e"
				stroke-width="2"
				fill="none"
				stroke-linecap="round"
			/>
		</g>
		<g class="muguri-leaf muguri-leaf--right">
			<path d="M60 30 C72 28 84 20 88 8 C74 8 62 16 60 30 Z" fill="#74a72f" />
			<path
				d="M62 28 C70 22 78 16 84 10"
				stroke="#527d1e"
				stroke-width="2"
				fill="none"
				stroke-linecap="round"
			/>
		</g>
		<!-- stem -->
		<rect x="57" y="22" width="6" height="16" rx="3" fill="#527d1e" />
		<!-- seed body -->
		<ellipse cx="60" cy="72" rx="36" ry="34" fill="#fdf6e9" stroke="#8c6242" stroke-width="4" />
		<!-- soft belly shading -->
		<ellipse cx="60" cy="86" rx="22" ry="16" fill="#f9ecd2" />
		<!-- cheeks -->
		<circle cx="38" cy="74" r="5" fill="#c64f78" opacity="0.55" />
		<circle cx="82" cy="74" r="5" fill="#c64f78" opacity="0.55" />
		<!-- face -->
		<g class="muguri-eyes">
			{#if pose === 'sleepy'}
				<path
					d="M42 66 Q48 70 54 66"
					stroke="#4a3b2f"
					stroke-width="3"
					fill="none"
					stroke-linecap="round"
				/>
				<path
					d="M66 66 Q72 70 78 66"
					stroke="#4a3b2f"
					stroke-width="3"
					fill="none"
					stroke-linecap="round"
				/>
			{:else}
				<circle cx="48" cy="66" r="4.5" fill="#4a3b2f" />
				<circle cx="72" cy="66" r="4.5" fill="#4a3b2f" />
				<circle cx="49.5" cy="64.5" r="1.5" fill="#ffffff" opacity="0.9" />
				<circle cx="73.5" cy="64.5" r="1.5" fill="#ffffff" opacity="0.9" />
			{/if}
		</g>
		<path
			d="M54 76 Q60 82 66 76"
			stroke="#4a3b2f"
			stroke-width="3"
			fill="none"
			stroke-linecap="round"
		/>
		<!-- root feet -->
		<path
			d="M48 104 Q46 110 40 110"
			stroke="#8c6242"
			stroke-width="4"
			fill="none"
			stroke-linecap="round"
		/>
		<path
			d="M72 104 Q74 110 80 110"
			stroke="#8c6242"
			stroke-width="4"
			fill="none"
			stroke-linecap="round"
		/>
	</svg>
</span>

<style>
	.muguri {
		display: inline-block;
		line-height: 0;
	}
	.muguri svg {
		display: block;
		overflow: visible;
	}
	.muguri-eyes,
	.muguri-leaf {
		transform-box: fill-box;
		transform-origin: center;
	}

	/* gentle blink for every pose (dot eyes squash briefly) */
	.muguri-eyes {
		animation: muguri-blink 4.5s ease-in-out infinite;
	}
	@keyframes muguri-blink {
		0%,
		92%,
		100% {
			transform: scaleY(1);
		}
		95% {
			transform: scaleY(0.08);
		}
	}

	/* idle: soft bob of the whole sprout */
	.muguri--idle svg {
		animation: muguri-bob 2.6s ease-in-out infinite;
	}
	@keyframes muguri-bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-4px);
		}
	}

	/* hint: right leaf raised like a hand, slight lean + an overshoot wave */
	.muguri--hint svg {
		animation: muguri-lean 2.2s ease-in-out infinite;
	}
	.muguri--hint .muguri-leaf--right {
		animation: muguri-leaf-raise 2.2s var(--cn-ease-overshoot) infinite;
	}
	@keyframes muguri-lean {
		0%,
		100% {
			transform: rotate(0deg);
		}
		50% {
			transform: rotate(-4deg);
		}
	}
	@keyframes muguri-leaf-raise {
		0%,
		100% {
			transform: rotate(0deg) translateY(0);
		}
		45% {
			transform: rotate(-38deg) translateY(-8px);
		}
		70% {
			transform: rotate(-28deg) translateY(-5px);
		}
	}

	/* cheer: both leaves up + a squash-and-stretch hop with real overshoot */
	.muguri--cheer svg {
		transform-origin: 50% 100%;
		animation: muguri-hop 1s var(--cn-ease-overshoot) infinite;
	}
	.muguri--cheer .muguri-leaf {
		animation: muguri-leaves-up 1s var(--cn-ease-overshoot) infinite;
	}
	@keyframes muguri-hop {
		0%,
		100% {
			transform: translateY(0) scale(1, 1);
		}
		15% {
			transform: translateY(2px) scale(1.08, 0.9);
		}
		40% {
			transform: translateY(-14px) scale(0.94, 1.1);
		}
		62% {
			transform: translateY(0) scale(1.06, 0.92);
		}
		80% {
			transform: translateY(-3px) scale(0.98, 1.02);
		}
	}
	@keyframes muguri-leaves-up {
		0%,
		100% {
			transform: rotate(0deg) scaleY(1);
		}
		40% {
			transform: translateY(-8px) scaleY(1.22) rotate(-6deg);
		}
		70% {
			transform: translateY(-2px) scaleY(1.04) rotate(0deg);
		}
	}
	.muguri--cheer .muguri-leaf--left {
		transform-origin: bottom right;
	}
	.muguri--cheer .muguri-leaf--right {
		transform-origin: bottom left;
	}

	/* sleepy: drooped leaves, slow sway, eyes drawn closed (see markup) */
	.muguri--sleepy svg {
		animation: muguri-sway 3.4s ease-in-out infinite;
	}
	.muguri--sleepy .muguri-leaf {
		transform: rotate(24deg) translateY(3px);
	}
	.muguri--sleepy .muguri-leaf--left {
		transform: rotate(-24deg) translateY(3px);
	}
	.muguri--sleepy .muguri-eyes {
		animation: muguri-sleepy-blink 3.4s ease-in-out infinite;
	}
	@keyframes muguri-sway {
		0%,
		100% {
			transform: rotate(-2deg);
		}
		50% {
			transform: rotate(2deg);
		}
	}
	@keyframes muguri-sleepy-blink {
		0%,
		100% {
			transform: scaleY(0.9);
		}
		50% {
			transform: scaleY(0.8);
		}
	}
</style>

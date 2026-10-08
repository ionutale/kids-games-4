<script lang="ts">
	type BufiPose = 'idle' | 'hint' | 'cheer' | 'sleepy';

	let {
		pose = 'idle',
		size = 120,
		class: klass = ''
	}: { pose?: BufiPose; size?: number; class?: string } = $props();
</script>

<span
	class="bufi bufi--{pose}{klass ? ` ${klass}` : ''}"
	aria-hidden="true"
	style:width="{size}px"
	style:height="{size}px"
>
	<svg viewBox="0 0 120 120" width={size} height={size} role="presentation" focusable="false">
		<!-- ear tufts -->
		<path d="M30 40 L22 14 L48 30 Z" fill="var(--cn-wood)" />
		<path d="M90 40 L98 14 L72 30 Z" fill="var(--cn-wood)" />
		<!-- wings (behind body) -->
		<g class="bufi-wing bufi-wing--left">
			<ellipse cx="22" cy="72" rx="10" ry="20" fill="var(--cn-accent-dark)" />
		</g>
		<g class="bufi-wing bufi-wing--right">
			<ellipse cx="98" cy="72" rx="10" ry="20" fill="var(--cn-accent-dark)" />
		</g>
		<!-- body -->
		<ellipse cx="60" cy="66" rx="40" ry="38" fill="var(--cn-wood)" />
		<ellipse cx="60" cy="80" rx="24" ry="22" fill="var(--cn-paper)" />
		<!-- cheeks -->
		<circle cx="35" cy="64" r="5" fill="var(--cn-berry)" opacity="0.55" />
		<circle cx="85" cy="64" r="5" fill="var(--cn-berry)" opacity="0.55" />
		<!-- eyes -->
		<g class="bufi-eyes">
			<circle cx="45" cy="52" r="15" fill="var(--cn-paper)" />
			<circle cx="75" cy="52" r="15" fill="var(--cn-paper)" />
			<g class="bufi-pupils">
				<circle cx="45" cy="54" r="6.5" fill="var(--cn-ink)" />
				<circle cx="75" cy="54" r="6.5" fill="var(--cn-ink)" />
				<circle cx="47.5" cy="51.5" r="2.2" fill="var(--cn-paper)" />
				<circle cx="77.5" cy="51.5" r="2.2" fill="var(--cn-paper)" />
			</g>
			{#if pose === 'sleepy'}
				<rect x="30" y="38" width="30" height="12" rx="6" fill="var(--cn-wood)" />
				<rect x="60" y="38" width="30" height="12" rx="6" fill="var(--cn-wood)" />
			{/if}
		</g>
		<!-- beak -->
		<path d="M60 62 L52 70 L68 70 Z" fill="var(--cn-accent-dark)" />
		<!-- feet -->
		<ellipse cx="48" cy="104" rx="7" ry="4" fill="var(--cn-accent-dark)" />
		<ellipse cx="72" cy="104" rx="7" ry="4" fill="var(--cn-accent-dark)" />
	</svg>
</span>

<style>
	.bufi {
		display: inline-block;
		line-height: 0;
	}
	.bufi svg {
		display: block;
		overflow: visible;
	}
	.bufi-eyes,
	.bufi-pupils,
	.bufi-wing {
		transform-box: fill-box;
		transform-origin: center;
	}

	/* gentle blink for every pose */
	.bufi-eyes {
		animation: bufi-blink 4.5s ease-in-out infinite;
	}
	@keyframes bufi-blink {
		0%,
		92%,
		100% {
			transform: scaleY(1);
		}
		95% {
			transform: scaleY(0.08);
		}
	}

	/* idle: soft bob of the whole owl */
	.bufi--idle svg {
		animation: bufi-bob 2.6s ease-in-out infinite;
	}
	@keyframes bufi-bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-4px);
		}
	}

	/* hint: right wing raised, slight lean */
	.bufi--hint svg {
		animation: bufi-lean 2.2s ease-in-out infinite;
	}
	.bufi--hint .bufi-wing--right {
		animation: bufi-wing-raise 2.2s ease-in-out infinite;
	}
	@keyframes bufi-lean {
		0%,
		100% {
			transform: rotate(0deg);
		}
		50% {
			transform: rotate(-4deg);
		}
	}
	@keyframes bufi-wing-raise {
		0%,
		100% {
			transform: rotate(0deg) translateY(0);
		}
		50% {
			transform: rotate(-38deg) translateY(-8px);
		}
	}

	/* cheer: wings up + happy hop */
	.bufi--cheer svg {
		animation: bufi-hop 0.9s var(--cn-ease) infinite;
	}
	.bufi--cheer .bufi-wing {
		animation: bufi-wings-up 0.9s ease-in-out infinite;
	}
	@keyframes bufi-hop {
		0%,
		100% {
			transform: translateY(0) scale(1);
		}
		30% {
			transform: translateY(-10px) scale(1.03);
		}
		60% {
			transform: translateY(0) scale(0.98);
		}
	}
	@keyframes bufi-wings-up {
		0%,
		100% {
			transform: rotate(0deg);
		}
		30% {
			transform: rotate(0deg) translateY(-10px) scaleY(1.15);
		}
		60% {
			transform: rotate(0deg) translateY(0);
		}
	}
	.bufi--cheer .bufi-wing--left {
		transform-origin: bottom right;
	}
	.bufi--cheer .bufi-wing--right {
		transform-origin: bottom left;
	}

	/* sleepy: slow sway, lids drawn (see markup), no hopping */
	.bufi--sleepy svg {
		animation: bufi-sway 3.4s ease-in-out infinite;
	}
	.bufi--sleepy .bufi-eyes {
		animation: bufi-sleepy-blink 3.4s ease-in-out infinite;
	}
	@keyframes bufi-sway {
		0%,
		100% {
			transform: rotate(-2deg);
		}
		50% {
			transform: rotate(2deg);
		}
	}
	@keyframes bufi-sleepy-blink {
		0%,
		100% {
			transform: scaleY(0.55);
		}
		50% {
			transform: scaleY(0.45);
		}
	}
</style>

<script lang="ts">
	type MuguriPose = 'idle' | 'hint' | 'cheer' | 'sleepy' | 'sad' | 'angry' | 'scared' | 'surprised';

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
		<!-- face: one expression grammar shared with Mimo (ART-STYLE.md §4) -->
		{#if pose === 'sad'}
			<!-- inner-up tilted brows -->
			<line
				x1="40"
				y1="58"
				x2="48"
				y2="55"
				stroke="#4a3b2f"
				stroke-width="2.5"
				stroke-linecap="round"
			/>
			<line
				x1="72"
				y1="55"
				x2="80"
				y2="58"
				stroke="#4a3b2f"
				stroke-width="2.5"
				stroke-linecap="round"
			/>
		{:else if pose === 'angry'}
			<!-- inner-down slanted brows -->
			<line
				x1="40"
				y1="56"
				x2="48"
				y2="60"
				stroke="#4a3b2f"
				stroke-width="2.5"
				stroke-linecap="round"
			/>
			<line
				x1="72"
				y1="60"
				x2="80"
				y2="56"
				stroke="#4a3b2f"
				stroke-width="2.5"
				stroke-linecap="round"
			/>
			<!-- slight red-ish flush over the berry cheeks -->
			<ellipse cx="38" cy="76" rx="6.5" ry="4.5" fill="#d63b2f" opacity="0.32" />
			<ellipse cx="82" cy="76" rx="6.5" ry="4.5" fill="#d63b2f" opacity="0.32" />
		{:else if pose === 'scared'}
			<!-- raised brows -->
			<line
				x1="41"
				y1="53"
				x2="49"
				y2="51"
				stroke="#4a3b2f"
				stroke-width="2.5"
				stroke-linecap="round"
			/>
			<line
				x1="71"
				y1="51"
				x2="79"
				y2="53"
				stroke="#4a3b2f"
				stroke-width="2.5"
				stroke-linecap="round"
			/>
		{:else if pose === 'surprised'}
			<!-- high arched brows + tiny motion ticks -->
			<path
				d="M40 51 Q44 47 48 50"
				stroke="#4a3b2f"
				stroke-width="2.5"
				fill="none"
				stroke-linecap="round"
			/>
			<path
				d="M72 50 Q76 47 80 51"
				stroke="#4a3b2f"
				stroke-width="2.5"
				fill="none"
				stroke-linecap="round"
			/>
			<g stroke="#7d6c58" stroke-width="2.5" stroke-linecap="round" opacity="0.75">
				<line x1="28" y1="48" x2="23" y2="44" />
				<line x1="32" y1="40" x2="28" y2="35" />
				<line x1="92" y1="48" x2="97" y2="44" />
				<line x1="88" y1="40" x2="92" y2="35" />
			</g>
		{/if}
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
			{:else if pose === 'sad' || pose === 'angry'}
				<circle cx="48" cy="68" r="4" fill="#4a3b2f" />
				<circle cx="72" cy="68" r="4" fill="#4a3b2f" />
			{:else if pose === 'scared' || pose === 'surprised'}
				<circle cx="48" cy="66" r="6" fill="#4a3b2f" />
				<circle cx="72" cy="66" r="6" fill="#4a3b2f" />
				<circle cx="50" cy="63.5" r="2" fill="#ffffff" opacity="0.9" />
				<circle cx="74" cy="63.5" r="2" fill="#ffffff" opacity="0.9" />
			{:else}
				<circle cx="48" cy="66" r="4.5" fill="#4a3b2f" />
				<circle cx="72" cy="66" r="4.5" fill="#4a3b2f" />
				<circle cx="49.5" cy="64.5" r="1.5" fill="#ffffff" opacity="0.9" />
				<circle cx="73.5" cy="64.5" r="1.5" fill="#ffffff" opacity="0.9" />
			{/if}
		</g>
		{#if pose === 'sad'}
			<!-- one sky-blue tear + frown -->
			<path
				d="M81 67 C84.5 72 84.5 75 81 75 C77.5 75 77.5 72 81 67 Z"
				fill="#a6e0d8"
				stroke="#7d6c58"
				stroke-width="1"
			/>
			<path
				d="M54 80 Q60 74 66 80"
				stroke="#4a3b2f"
				stroke-width="3"
				fill="none"
				stroke-linecap="round"
			/>
		{:else if pose === 'angry'}
			<!-- pressed wavy mouth -->
			<path
				d="M52 78 Q55 74.5 58 78 T64 78"
				stroke="#4a3b2f"
				stroke-width="3"
				fill="none"
				stroke-linecap="round"
			/>
		{:else if pose === 'scared'}
			<!-- small open "o" mouth -->
			<ellipse cx="60" cy="79" rx="4.2" ry="5.2" fill="#4a3b2f" />
		{:else if pose === 'surprised'}
			<!-- round open mouth -->
			<ellipse cx="60" cy="80" rx="6" ry="7" fill="#4a3b2f" />
		{:else}
			<path
				d="M54 76 Q60 82 66 76"
				stroke="#4a3b2f"
				stroke-width="3"
				fill="none"
				stroke-linecap="round"
			/>
		{/if}
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

	/* the four expressive poses are static SVGs — motion lives on the game
	   container (Task 6/7); suppress the shared dot-eye blink so the brows,
	   wide eyes and tears stay put. */
	.muguri--sad .muguri-eyes,
	.muguri--angry .muguri-eyes,
	.muguri--scared .muguri-eyes,
	.muguri--surprised .muguri-eyes {
		animation: none;
	}
</style>

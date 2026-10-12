<script lang="ts">
	type MimoPose = 'idle' | 'happy' | 'sad' | 'angry' | 'scared' | 'surprised' | 'sleepy';

	let {
		pose = 'idle',
		size = 120,
		class: klass = ''
	}: { pose?: MimoPose; size?: number; class?: string } = $props();

	// Mimo palette — inline hexes (SVG fills can't read CSS vars reliably
	// cross-browser). A soft blue-grey mouse (brief: grey-blue or warm grey)
	// tuned to the sunlit-garden intent: not neon, not flat grey. Pink inner
	// ears + berry nose/blush + ink face tie it to Muguri's family.
	//   body  #b0bccd  soft blue-grey
	//   ear   #eab6c1  soft berry-pink inner ear
	//   deep  #7f8ca1  outline, shadow pool, tail
	//   hi    #dde4ef  pale blue-white highlight
	const BODY = '#b0bccd';
	const EAR = '#eab6c1';
	const DEEP = '#7f8ca1';
	const HI = '#dde4ef';

	// Blush is berry everywhere else in the garden (Fruit/Acorn rule).
	const BLUSH = '#c64f78';
</script>

<span
	class="mimo mimo--{pose}{klass ? ` ${klass}` : ''}"
	aria-hidden="true"
	style:width="{size}px"
	style:height="{size}px"
>
	<svg viewBox="0 0 120 120" width={size} height={size} role="presentation" focusable="false">
		<!-- thin tail, drawn first so it tucks behind the round body -->
		<path
			d="M86 88 C104 96 116 84 108 74 C103 68 108 62 114 64"
			stroke={DEEP}
			stroke-width="3"
			fill="none"
			stroke-linecap="round"
		/>
		<!-- big round ears (behind the body) -->
		<circle cx="36" cy="32" r="21" fill={BODY} stroke={DEEP} stroke-width="4" />
		<circle cx="84" cy="32" r="21" fill={BODY} stroke={DEEP} stroke-width="4" />
		<ellipse cx="36" cy="34" rx="10" ry="11" fill={EAR} opacity="0.9" />
		<ellipse cx="84" cy="34" rx="10" ry="11" fill={EAR} opacity="0.9" />
		<!-- round body: same canvas + line weight as Muguri -->
		<ellipse cx="60" cy="72" rx="34" ry="32" fill={BODY} stroke={DEEP} stroke-width="4" />
		<!-- soft belly shading pooled low -->
		<ellipse cx="60" cy="86" rx="21" ry="15" fill={DEEP} opacity="0.16" />
		<!-- soft top-left highlight -->
		<ellipse
			cx="43"
			cy="56"
			rx="8"
			ry="11"
			fill={HI}
			opacity="0.42"
			transform="rotate(-14 43 56)"
		/>
		<!-- little paws peeking below -->
		<ellipse cx="48" cy="105" rx="8" ry="5" fill={BODY} stroke={DEEP} stroke-width="3" />
		<ellipse cx="72" cy="105" rx="8" ry="5" fill={BODY} stroke={DEEP} stroke-width="3" />
		<!-- cheeks -->
		<circle cx="36" cy="72" r="4.5" fill={BLUSH} opacity="0.5" />
		<circle cx="84" cy="72" r="4.5" fill={BLUSH} opacity="0.5" />
		<!-- whiskers -->
		<g stroke="#7d6c58" stroke-width="1.5" stroke-linecap="round" opacity="0.7">
			<line x1="30" y1="76" x2="18" y2="73" />
			<line x1="30" y1="80" x2="19" y2="84" />
			<line x1="90" y1="76" x2="102" y2="73" />
			<line x1="90" y1="80" x2="101" y2="84" />
		</g>
		<!-- nose -->
		<ellipse cx="60" cy="70" rx="3.4" ry="2.8" fill={BLUSH} />
		<!-- face: one expression grammar shared with Muguri (ART-STYLE.md §4) -->
		{#if pose === 'sad'}
			<!-- inner-up tilted brows -->
			<line
				x1="40"
				y1="52"
				x2="48"
				y2="49"
				stroke="#4a3b2f"
				stroke-width="2.5"
				stroke-linecap="round"
			/>
			<line
				x1="72"
				y1="49"
				x2="80"
				y2="52"
				stroke="#4a3b2f"
				stroke-width="2.5"
				stroke-linecap="round"
			/>
		{:else if pose === 'angry'}
			<!-- inner-down slanted brows -->
			<line
				x1="40"
				y1="50"
				x2="48"
				y2="54"
				stroke="#4a3b2f"
				stroke-width="2.5"
				stroke-linecap="round"
			/>
			<line
				x1="72"
				y1="54"
				x2="80"
				y2="50"
				stroke="#4a3b2f"
				stroke-width="2.5"
				stroke-linecap="round"
			/>
			<!-- slight red-ish flush -->
			<ellipse cx="36" cy="74" rx="6" ry="4.5" fill="#d63b2f" opacity="0.3" />
			<ellipse cx="84" cy="74" rx="6" ry="4.5" fill="#d63b2f" opacity="0.3" />
		{:else if pose === 'scared'}
			<!-- raised brows -->
			<line
				x1="41"
				y1="47"
				x2="49"
				y2="45"
				stroke="#4a3b2f"
				stroke-width="2.5"
				stroke-linecap="round"
			/>
			<line
				x1="71"
				y1="45"
				x2="79"
				y2="47"
				stroke="#4a3b2f"
				stroke-width="2.5"
				stroke-linecap="round"
			/>
		{:else if pose === 'surprised'}
			<!-- high arched brows + tiny motion ticks -->
			<path
				d="M40 45 Q44 41 48 44"
				stroke="#4a3b2f"
				stroke-width="2.5"
				fill="none"
				stroke-linecap="round"
			/>
			<path
				d="M72 44 Q76 41 80 45"
				stroke="#4a3b2f"
				stroke-width="2.5"
				fill="none"
				stroke-linecap="round"
			/>
			<g stroke="#7d6c58" stroke-width="2.5" stroke-linecap="round" opacity="0.75">
				<line x1="14" y1="34" x2="8" y2="30" />
				<line x1="18" y1="24" x2="12" y2="18" />
				<line x1="106" y1="34" x2="112" y2="30" />
				<line x1="102" y1="24" x2="108" y2="18" />
			</g>
		{/if}
		<g class="mimo-eyes">
			{#if pose === 'sleepy'}
				<path
					d="M42 60 Q48 64 54 60"
					stroke="#4a3b2f"
					stroke-width="3"
					fill="none"
					stroke-linecap="round"
				/>
				<path
					d="M66 60 Q72 64 78 60"
					stroke="#4a3b2f"
					stroke-width="3"
					fill="none"
					stroke-linecap="round"
				/>
			{:else if pose === 'sad' || pose === 'angry'}
				<circle cx="48" cy="62" r="3.6" fill="#4a3b2f" />
				<circle cx="72" cy="62" r="3.6" fill="#4a3b2f" />
			{:else if pose === 'scared' || pose === 'surprised'}
				<circle cx="48" cy="60" r="5.5" fill="#4a3b2f" />
				<circle cx="72" cy="60" r="5.5" fill="#4a3b2f" />
				<circle cx="49.8" cy="57.8" r="1.8" fill="#ffffff" opacity="0.9" />
				<circle cx="73.8" cy="57.8" r="1.8" fill="#ffffff" opacity="0.9" />
			{:else if pose === 'happy'}
				<circle cx="48" cy="60" r="4.5" fill="#4a3b2f" />
				<circle cx="72" cy="60" r="4.5" fill="#4a3b2f" />
				<circle cx="49.5" cy="58.5" r="1.5" fill="#ffffff" opacity="0.9" />
				<circle cx="73.5" cy="58.5" r="1.5" fill="#ffffff" opacity="0.9" />
			{:else}
				<circle cx="48" cy="60" r="4" fill="#4a3b2f" />
				<circle cx="72" cy="60" r="4" fill="#4a3b2f" />
			{/if}
		</g>
		{#if pose === 'sad'}
			<!-- one sky-blue tear + frown -->
			<path
				d="M80 70 C83.5 75 83.5 78 80 78 C76.5 78 76.5 75 80 70 Z"
				fill="#a6e0d8"
				stroke="#7d6c58"
				stroke-width="1"
			/>
			<path
				d="M54 83 Q60 77 66 83"
				stroke="#4a3b2f"
				stroke-width="3"
				fill="none"
				stroke-linecap="round"
			/>
		{:else if pose === 'angry'}
			<!-- pressed wavy mouth -->
			<path
				d="M52 80 Q55 76.5 58 80 T64 80"
				stroke="#4a3b2f"
				stroke-width="3"
				fill="none"
				stroke-linecap="round"
			/>
		{:else if pose === 'scared'}
			<!-- small open "o" mouth -->
			<ellipse cx="60" cy="81" rx="3.6" ry="4.4" fill="#4a3b2f" />
		{:else if pose === 'surprised'}
			<!-- round open mouth -->
			<ellipse cx="60" cy="83" rx="5.5" ry="6.5" fill="#4a3b2f" />
		{:else if pose === 'happy'}
			<!-- big arc smile -->
			<path
				d="M53 77 Q60 85 67 77"
				stroke="#4a3b2f"
				stroke-width="3"
				fill="none"
				stroke-linecap="round"
			/>
		{:else if pose === 'sleepy'}
			<!-- small "z"s + a soft droop -->
			<path
				d="M106 14 L114 14 L106 22 L114 22"
				stroke="#7d6c58"
				stroke-width="2.2"
				fill="none"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path
				d="M112 4 L118 4 L112 10 L118 10"
				stroke="#7d6c58"
				stroke-width="1.8"
				fill="none"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path
				d="M55 79 Q60 83 65 79"
				stroke="#4a3b2f"
				stroke-width="3"
				fill="none"
				stroke-linecap="round"
			/>
		{:else}
			<!-- idle: calm little smile -->
			<path
				d="M55 78 Q60 82 65 78"
				stroke="#4a3b2f"
				stroke-width="3"
				fill="none"
				stroke-linecap="round"
			/>
		{/if}
	</svg>
</span>

<style>
	.mimo {
		display: inline-block;
		line-height: 0;
	}
	.mimo svg {
		display: block;
		overflow: visible;
	}
</style>

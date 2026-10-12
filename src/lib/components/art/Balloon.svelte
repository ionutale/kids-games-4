<script lang="ts">
	import type { ColorId } from '#lib/games/color-match/rules.js';

	interface Props {
		color: ColorId;
		size?: number;
		mood?: 'happy' | 'plain' | 'sad';
		class?: string;
	}

	let { color, size = 96, mood = 'happy', class: klass }: Props = $props();

	// Balloon palette — inline hexes (SVG fills can't read CSS vars reliably
	// cross-browser). Mirrors the sunlit-garden intent in ART-STYLE.md: red reads
	// red, yellow warm gold, blue a true blue, green leaf-family, orange
	// accent-family, purple a soft violet, pink berry-pink; each light/deep pair
	// genuinely reads lighter/deeper, and teal sits between blue and green yet
	// stays distinct from both. No neon, no gray.
	//   green   #74a72f / #527d1e = --cn-leaf / --cn-leaf-dark
	//   orange  #e8871f / #c4661a = --cn-accent / --cn-accent-dark
	//   yellow  #f5b73c           = --cn-gold
	//   pink    #c64f78           = --cn-berry (used as pink's deep tone)
	const PALETTE: Record<ColorId, { body: string; deep: string; highlight: string }> = {
		red: { body: '#d63b2f', deep: '#a82a20', highlight: '#f3907f' },
		yellow: { body: '#f5b73c', deep: '#d08e1c', highlight: '#ffe0a0' },
		blue: { body: '#3f7fc4', deep: '#2b5c96', highlight: '#9cc6ee' },
		green: { body: '#74a72f', deep: '#527d1e', highlight: '#a9d16a' },
		orange: { body: '#e8871f', deep: '#c4661a', highlight: '#f8bd6e' },
		purple: { body: '#9a6bd4', deep: '#7548b0', highlight: '#c9a8ea' },
		pink: { body: '#ef8fb3', deep: '#c64f78', highlight: '#ffc6d8' },
		'light-blue': { body: '#8fc6ee', deep: '#69a6d6', highlight: '#cfe9fb' },
		'dark-blue': { body: '#2a5591', deep: '#1c3c6b', highlight: '#5b87bd' },
		'light-green': { body: '#a3d16a', deep: '#7fb03f', highlight: '#d2ecac' },
		'dark-green': { body: '#457f2a', deep: '#2f5c1a', highlight: '#78ab52' },
		teal: { body: '#3fb3a4', deep: '#2b8a7d', highlight: '#9bdcd2' }
	};

	// Face sits in the balloon's lower-middle, clear of the top-left highlight.
	const FACE_CX = 50;
	const FACE_CY = 40;

	// Blush follows Fruit.svelte's rule: warm accent on berry-family bodies,
	// berry blush everywhere else (berry-on-berry would read muddy).
	const blush = $derived(color === 'red' || color === 'pink' ? '#e8871f' : '#c64f78');
</script>

{#snippet face(cx: number, cy: number, blushColor: string)}
	<g>
		<ellipse cx={cx - 15} cy={cy + 4} rx="4.4" ry="3" fill={blushColor} opacity="0.5" />
		<ellipse cx={cx + 15} cy={cy + 4} rx="4.4" ry="3" fill={blushColor} opacity="0.5" />
		<circle cx={cx - 9} {cy} r="3" fill="#4a3b2f" />
		<circle cx={cx + 9} {cy} r="3" fill="#4a3b2f" />
		<circle cx={cx - 10} cy={cy - 1} r="1" fill="#ffffff" opacity="0.85" />
		<circle cx={cx + 8} cy={cy - 1} r="1" fill="#ffffff" opacity="0.85" />
		<path
			d={`M${cx - 6},${cy + 2} Q${cx},${cy + 8} ${cx + 6},${cy + 2}`}
			stroke="#4a3b2f"
			stroke-width="3"
			stroke-linecap="round"
			fill="none"
		/>
	</g>
{/snippet}

{#snippet sadFace(cx: number, cy: number)}
	<g>
		<line
			x1={cx - 13}
			y1={cy - 7}
			x2={cx - 5}
			y2={cy - 10}
			stroke="#4a3b2f"
			stroke-width="2"
			stroke-linecap="round"
		/>
		<line
			x1={cx + 5}
			y1={cy - 10}
			x2={cx + 13}
			y2={cy - 7}
			stroke="#4a3b2f"
			stroke-width="2"
			stroke-linecap="round"
		/>
		<circle cx={cx - 9} cy={cy + 1} r="2.6" fill="#4a3b2f" />
		<circle cx={cx + 9} cy={cy + 1} r="2.6" fill="#4a3b2f" />
		<path
			d={`M${cx - 6},${cy + 10} Q${cx},${cy + 4} ${cx + 6},${cy + 10}`}
			stroke="#4a3b2f"
			stroke-width="3"
			stroke-linecap="round"
			fill="none"
		/>
		<path
			d={`M${cx + 14},${cy + 1} C${cx + 17},${cy + 6} ${cx + 17},${cy + 9} ${cx + 14},${cy + 9} C${cx + 11},${cy + 9} ${cx + 11},${cy + 6} ${cx + 14},${cy + 1} Z`}
			fill="#a6e0d8"
			stroke="#7d6c58"
			stroke-width="1"
		/>
	</g>
{/snippet}

<svg
	viewBox="0 0 100 100"
	width={size}
	height={size}
	aria-hidden="true"
	focusable="false"
	class={klass}
>
	<!-- curly string, drawn first so the knot and body sit on top of it -->
	<path
		d="M50,72 C53.5,75 46.5,78 50,81 C53.5,84 46.5,87 50,90 C52,92.5 50.5,95.5 50,98"
		stroke={PALETTE[color].deep}
		stroke-width="1.3"
		stroke-linecap="round"
		fill="none"
	/>
	<!-- balloon body: soft ellipse -->
	<ellipse
		cx="50"
		cy="38"
		rx="26"
		ry="29"
		fill={PALETTE[color].body}
		stroke={PALETTE[color].deep}
		stroke-opacity="0.4"
		stroke-width="2.5"
	/>
	<!-- soft deep shading pooled at the bottom for roundness -->
	<ellipse cx="50" cy="45" rx="20" ry="19" fill={PALETTE[color].deep} opacity="0.22" />
	<!-- top-left highlight -->
	<ellipse
		cx="38"
		cy="25"
		rx="7.5"
		ry="11"
		fill={PALETTE[color].highlight}
		opacity="0.55"
		transform="rotate(-20 38 25)"
	/>
	<ellipse
		cx="36"
		cy="22"
		rx="3"
		ry="4.5"
		fill="#ffffff"
		opacity="0.5"
		transform="rotate(-20 36 22)"
	/>
	<!-- knot: small triangle tying body to string -->
	<path d="M46,66 L54,66 L50,73 Z" fill={PALETTE[color].deep} />
	{#if mood === 'happy'}
		{@render face(FACE_CX, FACE_CY, blush)}
	{:else if mood === 'sad'}
		{@render sadFace(FACE_CX, FACE_CY)}
	{/if}
</svg>

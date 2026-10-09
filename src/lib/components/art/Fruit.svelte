<script lang="ts">
	import type { FruitId } from '../../games/counting/rules';

	interface Props {
		kind: FruitId;
		size?: number;
		mood?: 'happy' | 'plain' | 'sad';
		class?: string;
	}

	let { kind, size = 72, mood = 'happy', class: klass }: Props = $props();

	// Palette (from src/lib/styles/tokens.css): berry #b0577a, accent #e08a3c,
	// accent-dark #c9752c, gold #f0b34e, leaf #7fa653, leaf-dark #5f823c,
	// wood #8c6242, ink #4a3b2f, paper-2 #f6ead5, sky #bfe3e0.
	// Inline hexes: SVG fills can't read CSS vars reliably cross-browser.
	const FACE_AT: Record<FruitId, { cx: number; cy: number }> = {
		apple: { cx: 50, cy: 54 },
		pear: { cx: 50, cy: 64 },
		orange: { cx: 50, cy: 56 },
		banana: { cx: 44, cy: 55 },
		grapes: { cx: 50, cy: 50 },
		strawberry: { cx: 50, cy: 52 },
		lemon: { cx: 50, cy: 56 },
		cherry: { cx: 36, cy: 62 },
		peach: { cx: 47, cy: 55 },
		watermelon: { cx: 50, cy: 50 }
	};

	// Warm blush on berry bodies, berry blush everywhere else.
	const BLUSH: Record<FruitId, string> = {
		apple: '#e08a3c',
		pear: '#b0577a',
		orange: '#b0577a',
		banana: '#b0577a',
		grapes: '#e08a3c',
		strawberry: '#e08a3c',
		lemon: '#b0577a',
		cherry: '#e08a3c',
		peach: '#b0577a',
		watermelon: '#e08a3c'
	};
</script>

{#snippet face(cx: number, cy: number, blush: string)}
	<g>
		<ellipse cx={cx - 15} cy={cy + 4} rx="4.4" ry="3" fill={blush} opacity="0.55" />
		<ellipse cx={cx + 15} cy={cy + 4} rx="4.4" ry="3" fill={blush} opacity="0.55" />
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
			fill="#bfe3e0"
			stroke="#7d6c58"
			stroke-width="1"
		/>
	</g>
{/snippet}

<svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" class={klass}>
	{#if kind === 'apple'}
		<rect
			x="46.5"
			y="14"
			width="7"
			height="20"
			rx="3.5"
			fill="#8c6242"
			transform="rotate(6 50 24)"
		/>
		<ellipse cx="65" cy="21" rx="11" ry="6" fill="#7fa653" transform="rotate(-24 65 21)" />
		<path
			d="M57,21 Q65,18 73,20"
			stroke="#5f823c"
			stroke-width="1.6"
			fill="none"
			stroke-linecap="round"
		/>
		<path
			d="M50,32 C42,27 31,29 27,40 C22,51 23,66 30,75 C37,84 45,88 50,88 C55,88 63,84 70,75 C77,66 78,51 73,40 C69,29 58,27 50,32 Z"
			fill="#b0577a"
			stroke="#4a3b2f"
			stroke-opacity="0.22"
			stroke-width="3"
			stroke-linejoin="round"
		/>
		<ellipse
			cx="37"
			cy="50"
			rx="6"
			ry="11"
			fill="#ffffff"
			opacity="0.2"
			transform="rotate(-14 37 50)"
		/>
	{:else if kind === 'pear'}
		<rect x="47" y="10" width="6" height="16" rx="3" fill="#8c6242" />
		<ellipse cx="62" cy="16" rx="10" ry="5.5" fill="#7fa653" transform="rotate(-24 62 16)" />
		<path
			d="M54,15 Q62,13 70,14"
			stroke="#5f823c"
			stroke-width="1.5"
			fill="none"
			stroke-linecap="round"
		/>
		<circle cx="50" cy="37" r="14" fill="#7fa653" stroke="#5f823c" stroke-width="2.5" />
		<ellipse cx="50" cy="69" rx="25" ry="21" fill="#7fa653" stroke="#5f823c" stroke-width="3" />
		<ellipse cx="60" cy="76" rx="11" ry="8" fill="#5f823c" opacity="0.28" />
		<ellipse
			cx="40"
			cy="60"
			rx="5"
			ry="10"
			fill="#ffffff"
			opacity="0.2"
			transform="rotate(-10 40 60)"
		/>
	{:else if kind === 'orange'}
		<rect x="47.5" y="20" width="5" height="12" rx="2.5" fill="#8c6242" />
		<ellipse cx="64" cy="25" rx="11" ry="6" fill="#7fa653" transform="rotate(-24 64 25)" />
		<circle cx="50" cy="58" r="27" fill="#e08a3c" stroke="#c9752c" stroke-width="3" />
		<circle cx="40" cy="48" r="2" fill="#c9752c" opacity="0.7" />
		<circle cx="58" cy="45" r="2" fill="#c9752c" opacity="0.7" />
		<circle cx="66" cy="58" r="2" fill="#c9752c" opacity="0.7" />
		<circle cx="34" cy="62" r="2" fill="#c9752c" opacity="0.7" />
		<circle cx="48" cy="72" r="2" fill="#c9752c" opacity="0.7" />
		<circle cx="60" cy="70" r="2" fill="#c9752c" opacity="0.7" />
		<ellipse
			cx="38"
			cy="48"
			rx="6"
			ry="10"
			fill="#ffffff"
			opacity="0.22"
			transform="rotate(-16 38 48)"
		/>
	{:else if kind === 'banana'}
		<path
			d="M30,20 C36,56 64,72 86,54 C84,70 60,86 38,74 C26,66 22,40 30,20 Z"
			fill="#f0b34e"
			stroke="#c9752c"
			stroke-width="3.5"
			stroke-linejoin="round"
		/>
		<path
			d="M32,26 C38,54 62,66 80,54"
			stroke="#c9752c"
			stroke-width="2"
			fill="none"
			opacity="0.5"
			stroke-linecap="round"
		/>
		<ellipse
			cx="50"
			cy="44"
			rx="15"
			ry="5"
			fill="#ffffff"
			opacity="0.25"
			transform="rotate(38 50 44)"
		/>
		<circle cx="30" cy="21" r="4" fill="#8c6242" />
		<circle cx="85" cy="53" r="4" fill="#8c6242" />
	{:else if kind === 'grapes'}
		<rect x="47" y="6" width="6" height="12" rx="3" fill="#8c6242" />
		<ellipse cx="63" cy="12" rx="10" ry="5.5" fill="#7fa653" transform="rotate(-24 63 12)" />
		<circle cx="50" cy="28" r="10.5" fill="#b0577a" />
		<circle cx="38" cy="42" r="10.5" fill="#b0577a" />
		<circle cx="62" cy="42" r="10.5" fill="#b0577a" />
		<circle cx="31" cy="56" r="10.5" fill="#b0577a" />
		<circle cx="50" cy="56" r="10.5" fill="#b0577a" />
		<circle cx="69" cy="56" r="10.5" fill="#b0577a" />
		<circle cx="41" cy="70" r="10.5" fill="#b0577a" />
		<circle cx="59" cy="70" r="10.5" fill="#b0577a" />
		<ellipse cx="55" cy="72" rx="16" ry="8" fill="#4a3b2f" opacity="0.12" />
		<ellipse
			cx="40"
			cy="33"
			rx="15"
			ry="8"
			fill="#ffffff"
			opacity="0.16"
			transform="rotate(-24 40 33)"
		/>
		<circle cx="46.5" cy="24.5" r="2.6" fill="#ffffff" opacity="0.3" />
		<circle cx="34.5" cy="38.5" r="2.6" fill="#ffffff" opacity="0.3" />
		<circle cx="58.5" cy="38.5" r="2.6" fill="#ffffff" opacity="0.3" />
		<circle cx="27.5" cy="52.5" r="2.6" fill="#ffffff" opacity="0.3" />
		<circle cx="46.5" cy="52.5" r="2.6" fill="#ffffff" opacity="0.3" />
		<circle cx="65.5" cy="52.5" r="2.6" fill="#ffffff" opacity="0.3" />
		<circle cx="37.5" cy="66.5" r="2.6" fill="#ffffff" opacity="0.3" />
		<circle cx="55.5" cy="66.5" r="2.6" fill="#ffffff" opacity="0.3" />
	{:else if kind === 'strawberry'}
		<rect x="47" y="12" width="6" height="12" rx="3" fill="#5f823c" />
		<path
			d="M23,38 L31,25 L39,34 L50,24 L61,34 L69,25 L77,38 C67,32 59,31 50,32 C41,31 33,32 23,38 Z"
			fill="#7fa653"
		/>
		<path
			d="M50,32 C35,32 23,42 23,57 C23,72 36,86 50,90 C64,86 77,72 77,57 C77,42 65,32 50,32 Z"
			fill="#b0577a"
			stroke="#4a3b2f"
			stroke-opacity="0.2"
			stroke-width="3"
			stroke-linejoin="round"
		/>
		<ellipse cx="34" cy="52" rx="1.8" ry="2.6" fill="#f6ead5" />
		<ellipse cx="66" cy="52" rx="1.8" ry="2.6" fill="#f6ead5" />
		<ellipse cx="50" cy="64" rx="1.8" ry="2.6" fill="#f6ead5" />
		<ellipse cx="45" cy="76" rx="1.8" ry="2.6" fill="#f6ead5" />
		<ellipse cx="55" cy="76" rx="1.8" ry="2.6" fill="#f6ead5" />
		<ellipse
			cx="38"
			cy="62"
			rx="5"
			ry="9"
			fill="#ffffff"
			opacity="0.18"
			transform="rotate(-12 38 62)"
		/>
	{:else if kind === 'lemon'}
		<ellipse
			cx="50"
			cy="58"
			rx="29"
			ry="21"
			fill="#f0b34e"
			transform="rotate(-12 50 58)"
			stroke="#c9752c"
			stroke-width="3"
		/>
		<circle cx="21" cy="64" r="6" fill="#f0b34e" stroke="#c9752c" stroke-width="2.5" />
		<circle cx="79" cy="52" r="6" fill="#f0b34e" stroke="#c9752c" stroke-width="2.5" />
		<ellipse
			cx="54"
			cy="66"
			rx="20"
			ry="8"
			fill="#c9752c"
			opacity="0.25"
			transform="rotate(-12 54 66)"
		/>
		<ellipse cx="71" cy="33" rx="10" ry="5.5" fill="#7fa653" transform="rotate(-24 71 33)" />
		<path
			d="M63,32 Q71,30 79,31"
			stroke="#5f823c"
			stroke-width="1.5"
			fill="none"
			stroke-linecap="round"
		/>
		<ellipse
			cx="40"
			cy="50"
			rx="7"
			ry="9"
			fill="#ffffff"
			opacity="0.25"
			transform="rotate(-20 40 50)"
		/>
	{:else if kind === 'cherry'}
		<path
			d="M36,52 C38,36 44,24 54,14"
			stroke="#7fa653"
			stroke-width="4.5"
			fill="none"
			stroke-linecap="round"
		/>
		<path
			d="M66,54 C64,38 60,24 54,14"
			stroke="#7fa653"
			stroke-width="4.5"
			fill="none"
			stroke-linecap="round"
		/>
		<ellipse cx="66" cy="15" rx="9" ry="5" fill="#7fa653" transform="rotate(-20 66 15)" />
		<circle
			cx="36"
			cy="64"
			r="15"
			fill="#b0577a"
			stroke="#4a3b2f"
			stroke-opacity="0.2"
			stroke-width="3"
		/>
		<circle
			cx="66"
			cy="67"
			r="15"
			fill="#b0577a"
			stroke="#4a3b2f"
			stroke-opacity="0.2"
			stroke-width="3"
		/>
		<ellipse cx="72" cy="71" rx="8" ry="10" fill="#4a3b2f" opacity="0.15" />
		<ellipse cx="30" cy="58" rx="3.5" ry="5" fill="#ffffff" opacity="0.3" />
		<ellipse cx="60" cy="61" rx="3.5" ry="5" fill="#ffffff" opacity="0.3" />
	{:else if kind === 'peach'}
		<rect x="48" y="24" width="5" height="12" rx="2.5" fill="#8c6242" />
		<ellipse cx="63" cy="29" rx="10" ry="5.5" fill="#7fa653" transform="rotate(-24 63 29)" />
		<path
			d="M55,28 Q63,26 71,27"
			stroke="#5f823c"
			stroke-width="1.5"
			fill="none"
			stroke-linecap="round"
		/>
		<circle cx="50" cy="59" r="25" fill="#e08a3c" stroke="#c9752c" stroke-width="3" />
		<circle cx="63" cy="67" r="12" fill="#b0577a" opacity="0.3" />
		<path
			d="M50,36 C45,52 45,66 50,82"
			stroke="#c9752c"
			stroke-width="2.5"
			fill="none"
			stroke-linecap="round"
		/>
		<ellipse
			cx="38"
			cy="50"
			rx="5.5"
			ry="9"
			fill="#ffffff"
			opacity="0.22"
			transform="rotate(-14 38 50)"
		/>
	{:else if kind === 'watermelon'}
		<path
			d="M14,42 A36,36 0 0,0 86,42 Z"
			fill="#7fa653"
			stroke="#4a3b2f"
			stroke-opacity="0.18"
			stroke-width="3"
			stroke-linejoin="round"
		/>
		<path d="M20,42 A30,30 0 0,0 80,42 Z" fill="#f6ead5" />
		<path d="M26,42 A24,24 0 0,0 74,42 Z" fill="#b0577a" />
		<ellipse cx="24" cy="50" rx="3" ry="6" fill="#ffffff" opacity="0.25" />
		<ellipse cx="38" cy="57" rx="2" ry="3" fill="#4a3b2f" />
		<ellipse cx="50" cy="64" rx="2" ry="3" fill="#4a3b2f" />
		<ellipse cx="62" cy="57" rx="2" ry="3" fill="#4a3b2f" />
	{/if}
	{#if mood === 'happy'}
		{@render face(FACE_AT[kind].cx, FACE_AT[kind].cy, BLUSH[kind])}
	{:else if mood === 'sad'}
		{@render sadFace(FACE_AT[kind].cx, FACE_AT[kind].cy)}
	{/if}
</svg>

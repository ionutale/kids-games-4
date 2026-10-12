<script lang="ts">
	interface Props {
		size?: number;
		mood?: 'happy' | 'plain' | 'sad';
		class?: string;
	}

	let { size = 72, mood = 'happy', class: klass }: Props = $props();

	// Acorn palette — inline hexes (SVG fills can't read CSS vars reliably
	// cross-browser). Warm wood/gold family per ART-STYLE.md, tuned to the
	// sunlit-garden intent: the body is a soft amber/tan, the cap a genuinely
	// deeper brown, the deep tone carries the outline + shadow pool, and the
	// highlight is a soft warm cream. Not neon, not gray.
	//   cap   #8c6242 = --cn-wood (the brown anchor of the wood family)
	//   body  warm amber/tan, lighter than the cap
	//   deep  deeper brown: cap edge, shadow pool, outlines
	//   hi    soft cream, sits under the paper-3 family
	const BODY = '#d99a4e';
	const CAP = '#8c6242';
	const DEEP = '#63402a';
	const HIGHLIGHT = '#f6d79b';

	// Berry blush on the warm amber body (warm-on-warm would read muddy).
	const BLUSH = '#c64f78';

	// Face sits on the body's lower-middle, clear of the cap's scalloped brim.
	const FACE_CX = 50;
	const FACE_CY = 62;
</script>

{#snippet face(cx: number, cy: number, blush: string)}
	<g>
		<ellipse cx={cx - 15} cy={cy + 4} rx="4.4" ry="3" fill={blush} opacity="0.5" />
		<ellipse cx={cx + 15} cy={cy + 4} rx="4.4" ry="3" fill={blush} opacity="0.5" />
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
	<!-- stem: tiny, meeting the cap's crown so the silhouette reads "acorn" -->
	<rect x="47.6" y="7" width="4.8" height="13" rx="2.4" fill={DEEP} transform="rotate(7 50 14)" />
	<!-- body: soft amber/tan, rounded shoulders tapering to a small point -->
	<path
		d="M50,33 C37,33 27,43 27,56 C27,71 38,85 50,90 C62,85 73,71 73,56 C73,43 63,33 50,33 Z"
		fill={BODY}
		stroke={DEEP}
		stroke-opacity="0.22"
		stroke-width="3"
		stroke-linejoin="round"
	/>
	<!-- soft deep shading pooled at the tip for roundness -->
	<ellipse cx="50" cy="78" rx="15" ry="8" fill={DEEP} opacity="0.16" />
	<!-- cap: deeper brown dome with a gentle scalloped brim over the body -->
	<path
		d="M24,40 C24,26 34,18 50,18 C66,18 76,26 76,40 C71.7,44 67.3,44 63,40 C58.7,44 54.3,44 50,40 C45.7,44 41.3,44 37,40 C32.7,44 28.3,44 24,40 Z"
		fill={CAP}
		stroke={DEEP}
		stroke-opacity="0.35"
		stroke-width="2"
		stroke-linejoin="round"
	/>
	<!-- soft highlight on the cap's upper-left -->
	<ellipse
		cx="40"
		cy="27"
		rx="9"
		ry="5"
		fill={HIGHLIGHT}
		opacity="0.28"
		transform="rotate(-16 40 27)"
	/>
	<!-- soft highlight on the body's upper-left -->
	<ellipse
		cx="39"
		cy="51"
		rx="6.5"
		ry="10"
		fill={HIGHLIGHT}
		opacity="0.42"
		transform="rotate(-14 39 51)"
	/>
	{#if mood === 'happy'}
		{@render face(FACE_CX, FACE_CY, BLUSH)}
	{:else if mood === 'sad'}
		{@render sadFace(FACE_CX, FACE_CY)}
	{/if}
</svg>

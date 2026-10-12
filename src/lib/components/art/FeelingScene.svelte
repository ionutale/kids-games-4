<script lang="ts">
	import type { SceneId } from '#lib/games/feelings-faces/rules.js';

	interface Props {
		scene: SceneId;
		size?: number;
		class?: string;
	}

	let { scene, size = 120, class: klass }: Props = $props();

	// FeelingScene palette — inline hexes (SVG presentation attributes can't read
	// CSS vars reliably cross-browser). Mirrors src/lib/styles/tokens.css and the
	// sunlit-garden intent in ART-STYLE.md: cream paper, cocoa ink, vivid-but-soft
	// leaf, warm accents — never neon, never gray.
	//   INK / INK_SOFT     #4a3b2f / #7d6c58 = --cn-ink / --cn-ink-soft (outlines, marks)
	//   PAPER2             #f9ecd2           = --cn-paper-2 (pillow, cup rim)
	//   WOOD / WOOD_DEEP   #8c6242 / #63402a = --cn-wood + its deep (block, ground shadows)
	//   WOOD_BODY / WOOD_HI #d99a4e / #f6d79b — Acorn's warm amber + cream highlight
	//   BERRY / -DEEP / -HI #c64f78 / #9c3a5e / #ffc6d8 = --cn-berry family (box, friend)
	//   LEAF / LEAF_DARK   #74a72f / #527d1e = --cn-leaf / --cn-leaf-dark (friend, stripe)
	//   ACCENT / -DARK / -HI #e8871f / #c4661a / #f8bd6e = --cn-accent family (ball)
	//   GOLD / GOLD_DEEP   #f5b73c / #d08e1c = --cn-gold + its deep (ribbon, bolt, moon)
	//   SKY / -DEEP / -HI  #a6e0d8 / #6fbfb2 / #e3f6f1 = --cn-sky family (cloud, cup, spill)
	//   RED / -DEEP / -HI  #d63b2f / #a82a20 / #f3907f — balloon-family red + highlight
	//   PINK / -DEEP / -HI #ef8fb3 / #c64f78 / #ffc6d8 — berry-family pink (scoop); PINK_DEEP
	//                       equals --cn-berry, mirroring Balloon.svelte's pink pair.
	const INK = '#4a3b2f';
	const INK_SOFT = '#7d6c58';
	const PAPER2 = '#f9ecd2';
	const WOOD = '#8c6242';
	const WOOD_DEEP = '#63402a';
	const WOOD_BODY = '#d99a4e';
	const WOOD_HI = '#f6d79b';
	const BERRY = '#c64f78';
	const BERRY_DEEP = '#9c3a5e';
	const BERRY_HI = '#ffc6d8';
	const LEAF = '#74a72f';
	const LEAF_DARK = '#527d1e';
	const ACCENT = '#e8871f';
	const ACCENT_DARK = '#c4661a';
	const ACCENT_HI = '#f8bd6e';
	const GOLD = '#f5b73c';
	const GOLD_DEEP = '#d08e1c';
	const SKY = '#a6e0d8';
	const SKY_DEEP = '#6fbfb2';
	const SKY_HI = '#e3f6f1';
	const RED = '#d63b2f';
	const RED_DEEP = '#a82a20';
	const RED_HI = '#f3907f';
	const PINK = '#ef8fb3';
	const PINK_DEEP = '#c64f78';
	const PINK_HI = '#ffc6d8';
</script>

<!--
  FeelingScene — one small flat, object-based vignette per SceneId. No characters
  and no text: the game shows the characters' faces separately, so these read as
  "what happened", not "who feels it". Soft garden palette + family line weight
  (main outlines ~2.6, secondary ~2, marks ~1.6–2.4, deep-tone strokes at low
  opacity). Static SVG, readable as a silhouette at 64 px.
-->
<svg
	viewBox="0 0 100 100"
	width={size}
	height={size}
	aria-hidden="true"
	focusable="false"
	class={klass}
>
	{#if scene === 'balloon-away'}
		<!-- scene:balloon-away -->
		<!-- motion ticks trailing below-left, implying an upward-right drift -->
		<path
			d="M30,66 q-6,4 -7,11"
			fill="none"
			stroke={INK_SOFT}
			stroke-width="2.6"
			stroke-linecap="round"
			opacity="0.55"
		/>
		<path
			d="M20,58 q-6,4 -7,11"
			fill="none"
			stroke={INK_SOFT}
			stroke-width="2.6"
			stroke-linecap="round"
			opacity="0.38"
		/>
		<path
			d="M40,74 q-5,4 -6,10"
			fill="none"
			stroke={INK_SOFT}
			stroke-width="2.2"
			stroke-linecap="round"
			opacity="0.3"
		/>
		<!-- string, drawn first so the knot sits on top of it -->
		<path
			d="M60,50 C57,58 63,62 58,70 C55,75 57,80 54,84"
			fill="none"
			stroke={RED_DEEP}
			stroke-width="1.6"
			stroke-linecap="round"
		/>
		<!-- balloon body -->
		<ellipse
			cx="62"
			cy="32"
			rx="17"
			ry="20"
			fill={RED}
			stroke={RED_DEEP}
			stroke-opacity="0.4"
			stroke-width="2.6"
		/>
		<ellipse cx="62" cy="38" rx="12.5" ry="12" fill={RED_DEEP} opacity="0.2" />
		<ellipse
			cx="55"
			cy="22"
			rx="5"
			ry="8.5"
			fill={RED_HI}
			opacity="0.6"
			transform="rotate(-22 55 22)"
		/>
		<ellipse
			cx="53.5"
			cy="19.5"
			rx="2"
			ry="3.2"
			fill="#ffffff"
			opacity="0.5"
			transform="rotate(-22 53.5 19.5)"
		/>
		<!-- knot tying body to string -->
		<path d="M58,49 L66,49 L62,55 Z" fill={RED_DEEP} />
		<!-- /scene -->
	{:else if scene === 'fallen-icecream'}
		<!-- scene:fallen-icecream -->
		<!-- soft ground shadows -->
		<ellipse cx="30" cy="83" rx="18" ry="4.5" fill={WOOD_DEEP} opacity="0.12" />
		<ellipse cx="64" cy="85" rx="22" ry="5" fill={WOOD_DEEP} opacity="0.12" />
		<!-- melt pooled under the fallen scoop -->
		<ellipse cx="30" cy="80" rx="15" ry="4" fill={PINK_DEEP} opacity="0.3" />
		<!-- scoop on the ground -->
		<circle
			cx="30"
			cy="66"
			r="15"
			fill={PINK}
			stroke={PINK_DEEP}
			stroke-opacity="0.35"
			stroke-width="2.6"
		/>
		<ellipse cx="30" cy="71" rx="10.5" ry="8" fill={PINK_DEEP} opacity="0.16" />
		<ellipse
			cx="25"
			cy="60"
			rx="4.6"
			ry="6.5"
			fill={PINK_HI}
			opacity="0.6"
			transform="rotate(-20 25 60)"
		/>
		<!-- tipped waffle cone, opening facing the scoop -->
		<path
			d="M48,58 C44,61 44,79 48,82 L78,71 C81,70 81,69 78,68 Z"
			fill={GOLD}
			stroke={GOLD_DEEP}
			stroke-opacity="0.4"
			stroke-width="2.6"
			stroke-linejoin="round"
		/>
		<!-- waffle cross-lines -->
		<g stroke={ACCENT_DARK} stroke-width="1.6" stroke-linecap="round" opacity="0.45">
			<path d="M54,61 L51,79" />
			<path d="M62,64 L59,77" />
			<path d="M51,65 L70,74" />
			<path d="M51,76 L70,67" />
		</g>
		<!-- rim of the empty opening -->
		<path
			d="M48,58 C44,61 44,79 48,82"
			fill="none"
			stroke={WOOD}
			stroke-opacity="0.5"
			stroke-width="2.4"
			stroke-linecap="round"
		/>
		<!-- /scene -->
	{:else if scene === 'gift'}
		<!-- scene:gift -->
		<ellipse cx="50" cy="89" rx="30" ry="5" fill={WOOD_DEEP} opacity="0.12" />
		<!-- box body + lid -->
		<rect
			x="22"
			y="46"
			width="56"
			height="42"
			rx="7"
			fill={BERRY}
			stroke={BERRY_DEEP}
			stroke-opacity="0.35"
			stroke-width="2.6"
		/>
		<rect
			x="17"
			y="37"
			width="66"
			height="15"
			rx="6"
			fill={BERRY}
			stroke={BERRY_DEEP}
			stroke-opacity="0.35"
			stroke-width="2.6"
		/>
		<path d="M17,49 L83,49" stroke={BERRY_DEEP} stroke-opacity="0.25" stroke-width="2" />
		<!-- ribbon -->
		<rect x="45" y="37" width="10" height="51" fill={GOLD} />
		<rect x="17" y="59" width="66" height="10" fill={GOLD} />
		<g stroke={GOLD_DEEP} stroke-opacity="0.35" stroke-width="1.6" fill="none">
			<path d="M45,37 L45,88" />
			<path d="M55,37 L55,88" />
			<path d="M17,59 L83,59" />
			<path d="M17,69 L83,69" />
		</g>
		<!-- box highlight -->
		<ellipse
			cx="32"
			cy="62"
			rx="5"
			ry="12"
			fill={BERRY_HI}
			opacity="0.35"
			transform="rotate(-8 32 62)"
		/>
		<!-- bow loops + knot -->
		<path
			d="M50,37 C38,26 28,33 39,42 C43,45 48,42 50,37 Z"
			fill={GOLD}
			stroke={GOLD_DEEP}
			stroke-opacity="0.4"
			stroke-width="2"
			stroke-linejoin="round"
		/>
		<path
			d="M50,37 C62,26 72,33 61,42 C57,45 52,42 50,37 Z"
			fill={GOLD}
			stroke={GOLD_DEEP}
			stroke-opacity="0.4"
			stroke-width="2"
			stroke-linejoin="round"
		/>
		<ellipse cx="50" cy="37" rx="5" ry="4.4" fill={BERRY_DEEP} />
		<!-- /scene -->
	{:else if scene === 'storm'}
		<!-- scene:storm -->
		<!-- cloud: one union path so the puffs share a single clean outline -->
		<path
			d="M22,58 C14,58 12,48 19,44 C18,34 30,28 38,34 C42,22 60,22 64,33 C74,28 86,34 84,45 C90,48 90,58 82,58 C74,62 30,62 22,58 Z"
			fill={SKY}
			stroke={SKY_DEEP}
			stroke-opacity="0.35"
			stroke-width="2.6"
			stroke-linejoin="round"
		/>
		<ellipse cx="50" cy="53" rx="26" ry="5" fill={SKY_DEEP} opacity="0.14" />
		<ellipse
			cx="40"
			cy="38"
			rx="12"
			ry="7"
			fill={SKY_HI}
			opacity="0.55"
			transform="rotate(-12 40 38)"
		/>
		<!-- lightning bolt -->
		<path
			d="M52,58 L40,78 L49,78 L43,94 L64,70 L54,70 Z"
			fill={GOLD}
			stroke={GOLD_DEEP}
			stroke-opacity="0.4"
			stroke-width="2"
			stroke-linejoin="round"
		/>
		<!-- rain drops -->
		<path
			d="M22,64 C25,68 26,71 26,73 A4,4 0 1 1 18,73 C18,71 17,68 22,64 Z"
			fill={SKY_DEEP}
			opacity="0.85"
		/>
		<path
			d="M30,76 C33,80 34,83 34,85 A4,4 0 1 1 26,85 C26,83 25,80 30,76 Z"
			fill={SKY_DEEP}
			opacity="0.7"
		/>
		<path
			d="M80,64 C83,68 84,71 84,73 A4,4 0 1 1 76,73 C76,71 75,68 80,64 Z"
			fill={SKY_DEEP}
			opacity="0.85"
		/>
		<path
			d="M72,76 C75,80 76,83 76,85 A4,4 0 1 1 68,85 C68,83 67,80 72,76 Z"
			fill={SKY_DEEP}
			opacity="0.7"
		/>
		<!-- /scene -->
	{:else if scene === 'spilled-cup'}
		<!-- scene:spilled-cup -->
		<!-- puddle of spilled drink -->
		<path
			d="M18,84 C14,78 28,74 44,75 C62,76 78,76 84,80 C90,85 78,90 58,90 C38,90 22,89 18,84 Z"
			fill={SKY_DEEP}
			opacity="0.5"
		/>
		<ellipse cx="40" cy="82" rx="12" ry="3.5" fill={SKY_HI} opacity="0.55" />
		<!-- stream running from the cup mouth into the puddle -->
		<path
			d="M40,60 C37,68 34,75 29,82 C36,82 41,79 43,74 C43,67 42,62 42,60 Z"
			fill={SKY_DEEP}
			opacity="0.45"
		/>
		<!-- tipped cup, open mouth facing the puddle -->
		<g transform="rotate(-90 66 62)">
			<path
				d="M84,52 q10,2 10,10 q0,8 -10,10"
				fill="none"
				stroke={SKY_DEEP}
				stroke-opacity="0.4"
				stroke-width="9"
				stroke-linecap="round"
			/>
			<path
				d="M84,52 q10,2 10,10 q0,8 -10,10"
				fill="none"
				stroke={SKY}
				stroke-width="5"
				stroke-linecap="round"
			/>
			<path
				d="M53,40 L84,40 L80,74 Q79,78 75,78 L62,78 Q58,78 57,74 Z"
				fill={SKY}
				stroke={SKY_DEEP}
				stroke-opacity="0.35"
				stroke-width="2.6"
				stroke-linejoin="round"
			/>
			<rect x="56" y="56" width="25" height="7" rx="3.5" fill={LEAF} opacity="0.85" />
			<ellipse cx="68.5" cy="40" rx="15.5" ry="5.5" fill="#4fa79a" />
			<ellipse cx="68.5" cy="40" rx="15.5" ry="5.5" fill="none" stroke={PAPER2} stroke-width="3" />
		</g>
		<!-- /scene -->
	{:else if scene === 'broken-toy'}
		<!-- scene:broken-toy -->
		<ellipse cx="50" cy="86" rx="32" ry="5" fill={WOOD_DEEP} opacity="0.12" />
		<!-- left half of the block, jagged along the split -->
		<g transform="rotate(-5 33 57)">
			<path
				d="M20,36 Q20,32 24,32 L44,32 L40,42 L46,50 L40,58 L46,66 L40,74 L44,82 L24,82 Q20,82 20,78 Z"
				fill={WOOD_BODY}
				stroke={WOOD_DEEP}
				stroke-opacity="0.35"
				stroke-width="2.6"
				stroke-linejoin="round"
			/>
			<path
				d="M26,42 Q34,46 28,54"
				fill="none"
				stroke={WOOD}
				stroke-opacity="0.4"
				stroke-width="2"
				stroke-linecap="round"
			/>
			<ellipse
				cx="28"
				cy="48"
				rx="4"
				ry="9"
				fill={WOOD_HI}
				opacity="0.35"
				transform="rotate(-8 28 48)"
			/>
		</g>
		<!-- right half, mirrored -->
		<g transform="rotate(5 67 57)">
			<path
				d="M56,32 L76,32 Q80,32 80,36 L80,78 Q80,82 76,82 L56,82 L60,74 L54,66 L60,58 L54,50 L60,42 Z"
				fill={WOOD_BODY}
				stroke={WOOD_DEEP}
				stroke-opacity="0.35"
				stroke-width="2.6"
				stroke-linejoin="round"
			/>
			<path
				d="M74,42 Q66,46 72,54"
				fill="none"
				stroke={WOOD}
				stroke-opacity="0.4"
				stroke-width="2"
				stroke-linecap="round"
			/>
			<ellipse
				cx="72"
				cy="48"
				rx="4"
				ry="9"
				fill={WOOD_HI}
				opacity="0.35"
				transform="rotate(8 72 48)"
			/>
		</g>
		<!-- splinter knocked free -->
		<path
			d="M46,84 L52,82 L50,88 Z"
			fill={WOOD}
			stroke={WOOD_DEEP}
			stroke-opacity="0.3"
			stroke-width="1.6"
			stroke-linejoin="round"
		/>
		<!-- /scene -->
	{:else if scene === 'hug'}
		<!-- scene:hug -->
		<!-- two abstract round friends leaning together (no faces — those are separate) -->
		<ellipse cx="38" cy="84" rx="20" ry="4.5" fill={WOOD_DEEP} opacity="0.12" />
		<ellipse cx="62" cy="84" rx="20" ry="4.5" fill={WOOD_DEEP} opacity="0.12" />
		<ellipse
			cx="38"
			cy="58"
			rx="19"
			ry="23"
			fill={LEAF}
			stroke={LEAF_DARK}
			stroke-opacity="0.35"
			stroke-width="2.6"
			transform="rotate(10 38 58)"
		/>
		<ellipse
			cx="62"
			cy="58"
			rx="19"
			ry="23"
			fill={BERRY}
			stroke={BERRY_DEEP}
			stroke-opacity="0.35"
			stroke-width="2.6"
			transform="rotate(-10 62 58)"
		/>
		<ellipse cx="50" cy="60" rx="6" ry="18" fill={INK} opacity="0.1" />
		<ellipse
			cx="31"
			cy="48"
			rx="4.6"
			ry="8"
			fill="#a9d16a"
			opacity="0.5"
			transform="rotate(-14 31 48)"
		/>
		<ellipse
			cx="55"
			cy="48"
			rx="4.6"
			ry="8"
			fill={BERRY_HI}
			opacity="0.5"
			transform="rotate(-14 55 48)"
		/>
		<!-- heart above the pair -->
		<path
			d="M50,17 C47,11 37,11 37,19 C37,25 46,30 50,35 C54,30 63,25 63,19 C63,11 53,11 50,17 Z"
			fill={GOLD}
			stroke={GOLD_DEEP}
			stroke-opacity="0.4"
			stroke-width="2"
			stroke-linejoin="round"
		/>
		<!-- /scene -->
	{:else if scene === 'bedtime'}
		<!-- scene:bedtime -->
		<!-- crescent moon (offset-tip arcs keep the body thick and self-contained) -->
		<path
			d="M76,25 A21,21 0 1 0 76,55 A16,16 0 1 1 76,25 Z"
			fill={GOLD}
			stroke={GOLD_DEEP}
			stroke-opacity="0.4"
			stroke-width="2.4"
			stroke-linejoin="round"
		/>
		<!-- sleepy z marks -->
		<g
			fill="none"
			stroke={INK_SOFT}
			stroke-width="2.4"
			stroke-linecap="round"
			stroke-linejoin="round"
			opacity="0.75"
		>
			<path d="M26,34 L35,34 L26,43 L35,43" />
			<path d="M34,25 L41.5,25 L34,32.5 L41.5,32.5" />
			<path d="M41,17 L47,17 L41,23 L47,23" />
		</g>
		<!-- pillow -->
		<ellipse cx="42" cy="88" rx="30" ry="5" fill={WOOD_DEEP} opacity="0.1" />
		<g transform="rotate(-8 41 73)">
			<rect
				x="14"
				y="60"
				width="54"
				height="26"
				rx="13"
				fill={PAPER2}
				stroke={WOOD}
				stroke-opacity="0.3"
				stroke-width="2.4"
			/>
			<rect
				x="19"
				y="65"
				width="44"
				height="16"
				rx="8"
				fill="none"
				stroke={WOOD}
				stroke-opacity="0.22"
				stroke-width="1.8"
			/>
			<ellipse cx="30" cy="69" rx="9" ry="4" fill="#ffffff" opacity="0.5" />
		</g>
		<!-- /scene -->
	{:else if scene === 'pop-out'}
		<!-- scene:pop-out -->
		<ellipse cx="50" cy="92" rx="30" ry="5" fill={WOOD_DEEP} opacity="0.12" />
		<!-- lid flipped open -->
		<rect
			x="30"
			y="52"
			width="42"
			height="11"
			rx="4.5"
			fill={BERRY}
			stroke={BERRY_DEEP}
			stroke-opacity="0.35"
			stroke-width="2.4"
			transform="rotate(-16 51 57)"
		/>
		<!-- box -->
		<rect
			x="26"
			y="64"
			width="48"
			height="26"
			rx="6"
			fill={BERRY}
			stroke={BERRY_DEEP}
			stroke-opacity="0.35"
			stroke-width="2.6"
		/>
		<rect x="26" y="76" width="48" height="7" fill={GOLD} opacity="0.9" />
		<!-- spring, one continuous coil -->
		<path
			d="M50,66 C60,63 60,58 50,55 C40,52 40,47 50,44 C60,41 60,37 50,34"
			fill="none"
			stroke={INK_SOFT}
			stroke-width="3"
			stroke-linecap="round"
		/>
		<!-- popper ball mid-pop -->
		<circle
			cx="50"
			cy="26"
			r="15"
			fill={ACCENT}
			stroke={ACCENT_DARK}
			stroke-opacity="0.35"
			stroke-width="2.6"
		/>
		<ellipse cx="50" cy="31" rx="10.5" ry="8" fill={ACCENT_DARK} opacity="0.16" />
		<ellipse
			cx="44"
			cy="20"
			rx="4.6"
			ry="6.6"
			fill={ACCENT_HI}
			opacity="0.6"
			transform="rotate(-20 44 20)"
		/>
		<!-- motion ticks -->
		<g fill="none" stroke={INK_SOFT} stroke-linecap="round" opacity="0.5">
			<path d="M28,30 q-7,1 -9,-4" stroke-width="2.6" />
			<path d="M72,30 q7,1 9,-4" stroke-width="2.6" />
			<path d="M38,8 q2,-5 7,-6" stroke-width="2.2" opacity="0.7" />
			<path d="M62,8 q-2,-5 -7,-6" stroke-width="2.2" opacity="0.7" />
		</g>
		<!-- /scene -->
	{/if}
</svg>

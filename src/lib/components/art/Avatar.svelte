<script lang="ts">
	import type { AvatarId } from '../../storage/save';

	let {
		id,
		size = 64,
		mood = 'happy',
		class: klass = ''
	}: { id: AvatarId; size?: number; mood?: 'happy' | 'plain' | 'sad'; class?: string } = $props();
</script>

{#snippet eyes(x1: number, y1: number, x2: number, y2: number, r: number)}
	<circle cx={x1} cy={y1} {r} fill="var(--cn-ink)" />
	<circle cx={x2} cy={y2} {r} fill="var(--cn-ink)" />
{/snippet}

{#snippet cheeks(x1: number, y1: number, x2: number, y2: number)}
	<circle cx={x1} cy={y1} r="3.2" fill="var(--cn-berry)" opacity="0.5" />
	<circle cx={x2} cy={y2} r="3.2" fill="var(--cn-berry)" opacity="0.5" />
{/snippet}

{#snippet smile(cx: number, cy: number)}
	<path
		d="M{cx - 6},{cy} Q{cx},{cy + 5} {cx + 6},{cy}"
		stroke="var(--cn-ink)"
		stroke-width="2.4"
		fill="none"
		stroke-linecap="round"
	/>
{/snippet}

{#snippet sadMouth(cx: number, cy: number)}
	<path
		d="M{cx - 6},{cy} Q{cx},{cy - 5} {cx + 6},{cy}"
		stroke="var(--cn-ink)"
		stroke-width="2.4"
		fill="none"
		stroke-linecap="round"
	/>
{/snippet}

{#snippet brows(ex1: number, ey1: number, ex2: number, ey2: number)}
	<line
		x1={ex1 - 7}
		y1={ey1 - 9}
		x2={ex1 + 1}
		y2={ey1 - 12}
		stroke="var(--cn-ink)"
		stroke-width="2"
		stroke-linecap="round"
	/>
	<line
		x1={ex2 - 1}
		y1={ey2 - 12}
		x2={ex2 + 7}
		y2={ey2 - 9}
		stroke="var(--cn-ink)"
		stroke-width="2"
		stroke-linecap="round"
	/>
{/snippet}

{#snippet tear(x: number, y: number)}
	<path
		d="M{x},{y - 6} C{x + 3.5},{y - 1} {x + 3.5},{y + 2} {x},{y + 2} C{x - 3.5},{y + 2} {x -
			3.5},{y - 1} {x},{y - 6} Z"
		fill="var(--cn-sky)"
		stroke="var(--cn-ink-soft)"
		stroke-width="1"
	/>
{/snippet}

<span
	class="avatar{klass ? ` ${klass}` : ''}"
	aria-hidden="true"
	style:width="{size}px"
	style:height="{size}px"
>
	<svg viewBox="0 0 64 64" width={size} height={size} role="presentation" focusable="false">
		{#if id === 'owl'}
			<!-- simplified Bufi face -->
			<path d="M14 22 L10 8 L24 16 Z" fill="var(--cn-wood)" />
			<path d="M50 22 L54 8 L40 16 Z" fill="var(--cn-wood)" />
			<circle cx="32" cy="34" r="24" fill="var(--cn-wood)" />
			{#if mood !== 'plain'}
				<circle cx="23" cy="30" r="9" fill="var(--cn-paper)" />
				<circle cx="41" cy="30" r="9" fill="var(--cn-paper)" />
				<circle cx="23" cy="31" r="4" fill="var(--cn-ink)" />
				<circle cx="41" cy="31" r="4" fill="var(--cn-ink)" />
			{/if}
			<path d="M32 36 L27 41 L37 41 Z" fill="var(--cn-accent-dark)" />
			{#if mood === 'happy'}
				{@render cheeks(16, 40, 48, 40)}
				{@render smile(32, 47)}
			{:else if mood === 'sad'}
				{@render brows(23, 30, 41, 30)}
				{@render sadMouth(32, 50)}
				{@render tear(46, 40)}
			{/if}
		{:else if id === 'fox'}
			<!-- pointy ears, orange face, white muzzle -->
			<path d="M12 26 L8 6 L26 16 Z" fill="var(--cn-accent-dark)" />
			<path d="M52 26 L56 6 L38 16 Z" fill="var(--cn-accent-dark)" />
			<path d="M14 21 L11 10 L22 17 Z" fill="var(--cn-paper)" />
			<path d="M50 21 L53 10 L42 17 Z" fill="var(--cn-paper)" />
			<circle cx="32" cy="34" r="22" fill="var(--cn-accent)" />
			<ellipse cx="32" cy="44" rx="12" ry="9" fill="var(--cn-paper)" />
			<ellipse cx="32" cy="41" rx="4" ry="3" fill="var(--cn-ink)" />
			{#if mood === 'happy'}
				{@render eyes(24, 30, 40, 30, 3.4)}
				{@render cheeks(18, 38, 46, 38)}
				{@render smile(32, 47)}
			{:else if mood === 'sad'}
				{@render eyes(24, 30, 40, 30, 3.4)}
				{@render brows(24, 30, 40, 30)}
				{@render sadMouth(32, 49)}
				{@render tear(45, 36)}
			{/if}
		{:else if id === 'bear'}
			<!-- round ears, brown face, tan muzzle -->
			<circle cx="13" cy="16" r="8" fill="var(--cn-wood)" />
			<circle cx="51" cy="16" r="8" fill="var(--cn-wood)" />
			<circle cx="13" cy="16" r="3.5" fill="var(--cn-paper-3)" />
			<circle cx="51" cy="16" r="3.5" fill="var(--cn-paper-3)" />
			<circle cx="32" cy="34" r="22" fill="var(--cn-wood)" />
			<ellipse cx="32" cy="42" rx="11" ry="8.5" fill="var(--cn-paper-3)" />
			<ellipse cx="32" cy="39" rx="4.5" ry="3.4" fill="var(--cn-ink)" />
			{#if mood === 'happy'}
				{@render eyes(24, 29, 40, 29, 3.4)}
				{@render cheeks(19, 37, 45, 37)}
				{@render smile(32, 45)}
			{:else if mood === 'sad'}
				{@render eyes(24, 29, 40, 29, 3.4)}
				{@render brows(24, 29, 40, 29)}
				{@render sadMouth(32, 47)}
				{@render tear(45, 35)}
			{/if}
		{:else if id === 'bunny'}
			<!-- long ears, cream face -->
			<ellipse cx="21" cy="12" rx="6.5" ry="13" fill="var(--cn-paper-2)" />
			<ellipse cx="43" cy="12" rx="6.5" ry="13" fill="var(--cn-paper-2)" />
			<ellipse cx="21" cy="13" rx="3" ry="8" fill="var(--cn-berry)" opacity="0.6" />
			<ellipse cx="43" cy="13" rx="3" ry="8" fill="var(--cn-berry)" opacity="0.6" />
			<circle cx="32" cy="38" r="20" fill="var(--cn-paper-2)" />
			{#if mood === 'happy'}
				{@render eyes(25, 35, 39, 35, 3.2)}
				<path
					d="M28 41 L32 44 L36 41"
					stroke="var(--cn-ink)"
					stroke-width="2"
					fill="none"
					stroke-linecap="round"
				/>
				<circle cx="17" cy="42" r="3.4" fill="var(--cn-berry)" opacity="0.5" />
				<circle cx="47" cy="42" r="3.4" fill="var(--cn-berry)" opacity="0.5" />
			{:else if mood === 'sad'}
				{@render eyes(25, 35, 39, 35, 3.2)}
				{@render brows(25, 35, 39, 35)}
				{@render sadMouth(32, 46)}
				{@render tear(44, 41)}
			{/if}
		{:else if id === 'cat'}
			<!-- triangle ears, golden face, whiskers -->
			<path d="M14 28 L10 8 L28 18 Z" fill="var(--cn-gold)" />
			<path d="M50 28 L54 8 L36 18 Z" fill="var(--cn-gold)" />
			<path d="M15 23 L13 12 L23 18 Z" fill="var(--cn-berry)" opacity="0.55" />
			<path d="M49 23 L51 12 L41 18 Z" fill="var(--cn-berry)" opacity="0.55" />
			<circle cx="32" cy="36" r="21" fill="var(--cn-gold)" />
			<path d="M29 40 L35 40 L32 43 Z" fill="var(--cn-berry)" />
			<g stroke="var(--cn-ink-soft)" stroke-width="1.6" stroke-linecap="round">
				<line x1="6" y1="38" x2="16" y2="40" />
				<line x1="6" y1="44" x2="16" y2="43" />
				<line x1="58" y1="38" x2="48" y2="40" />
				<line x1="58" y1="44" x2="48" y2="43" />
			</g>
			{#if mood === 'happy'}
				{@render eyes(24, 33, 40, 33, 3.4)}
				{@render cheeks(18, 40, 46, 40)}
				{@render smile(32, 46)}
			{:else if mood === 'sad'}
				{@render eyes(24, 33, 40, 33, 3.4)}
				{@render brows(24, 33, 40, 33)}
				{@render sadMouth(32, 48)}
				{@render tear(45, 39)}
			{/if}
		{:else if id === 'hedgehog'}
			<!-- spiky back, cream face -->
			<path
				d="M10 38 L4 30 L10 28 L5 20 L12 19 L9 10 L17 12 L17 3 L23 9 L28 1 L31 9 L38 3 L39 11 L47 8 L45 16 L53 16 L48 23 L54 28 L46 30 L48 38 Z"
				fill="var(--cn-ink-soft)"
			/>
			<circle cx="32" cy="38" r="19" fill="var(--cn-paper-3)" />
			<circle cx="32" cy="43" r="3.4" fill="var(--cn-ink)" />
			{#if mood === 'happy'}
				{@render eyes(25, 36, 39, 36, 3.2)}
				{@render smile(32, 48)}
				<circle cx="18" cy="42" r="3" fill="var(--cn-berry)" opacity="0.5" />
				<circle cx="46" cy="42" r="3" fill="var(--cn-berry)" opacity="0.5" />
			{:else if mood === 'sad'}
				{@render eyes(25, 36, 39, 36, 3.2)}
				{@render brows(25, 36, 39, 36)}
				{@render sadMouth(32, 50)}
				{@render tear(44, 42)}
			{/if}
		{/if}
	</svg>
</span>

<style>
	.avatar {
		display: inline-block;
		line-height: 0;
	}
	.avatar svg {
		display: block;
	}
</style>

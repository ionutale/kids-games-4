<script lang="ts">
	import type { AvatarId } from '../../storage/save';

	let {
		id,
		size = 64,
		class: klass = ''
	}: { id: AvatarId; size?: number; class?: string } = $props();
</script>

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
			<circle cx="23" cy="30" r="9" fill="var(--cn-paper)" />
			<circle cx="41" cy="30" r="9" fill="var(--cn-paper)" />
			<circle cx="23" cy="31" r="4" fill="var(--cn-ink)" />
			<circle cx="41" cy="31" r="4" fill="var(--cn-ink)" />
			<path d="M32 36 L27 41 L37 41 Z" fill="var(--cn-accent-dark)" />
		{:else if id === 'fox'}
			<!-- pointy ears, orange face, white muzzle -->
			<path d="M12 26 L8 6 L26 16 Z" fill="var(--cn-accent-dark)" />
			<path d="M52 26 L56 6 L38 16 Z" fill="var(--cn-accent-dark)" />
			<path d="M14 21 L11 10 L22 17 Z" fill="var(--cn-paper)" />
			<path d="M50 21 L53 10 L42 17 Z" fill="var(--cn-paper)" />
			<circle cx="32" cy="34" r="22" fill="var(--cn-accent)" />
			<ellipse cx="32" cy="44" rx="12" ry="9" fill="var(--cn-paper)" />
			<circle cx="24" cy="30" r="3.4" fill="var(--cn-ink)" />
			<circle cx="40" cy="30" r="3.4" fill="var(--cn-ink)" />
			<ellipse cx="32" cy="41" rx="4" ry="3" fill="var(--cn-ink)" />
		{:else if id === 'bear'}
			<!-- round ears, brown face, tan muzzle -->
			<circle cx="13" cy="16" r="8" fill="var(--cn-wood)" />
			<circle cx="51" cy="16" r="8" fill="var(--cn-wood)" />
			<circle cx="13" cy="16" r="3.5" fill="var(--cn-paper-3)" />
			<circle cx="51" cy="16" r="3.5" fill="var(--cn-paper-3)" />
			<circle cx="32" cy="34" r="22" fill="var(--cn-wood)" />
			<ellipse cx="32" cy="42" rx="11" ry="8.5" fill="var(--cn-paper-3)" />
			<circle cx="24" cy="29" r="3.4" fill="var(--cn-ink)" />
			<circle cx="40" cy="29" r="3.4" fill="var(--cn-ink)" />
			<ellipse cx="32" cy="39" rx="4.5" ry="3.4" fill="var(--cn-ink)" />
		{:else if id === 'bunny'}
			<!-- long ears, cream face -->
			<ellipse cx="21" cy="12" rx="6.5" ry="13" fill="var(--cn-paper-2)" />
			<ellipse cx="43" cy="12" rx="6.5" ry="13" fill="var(--cn-paper-2)" />
			<ellipse cx="21" cy="13" rx="3" ry="8" fill="var(--cn-berry)" opacity="0.6" />
			<ellipse cx="43" cy="13" rx="3" ry="8" fill="var(--cn-berry)" opacity="0.6" />
			<circle cx="32" cy="38" r="20" fill="var(--cn-paper-2)" />
			<circle cx="25" cy="35" r="3.2" fill="var(--cn-ink)" />
			<circle cx="39" cy="35" r="3.2" fill="var(--cn-ink)" />
			<path
				d="M28 41 L32 44 L36 41"
				stroke="var(--cn-ink)"
				stroke-width="2"
				fill="none"
				stroke-linecap="round"
			/>
			<circle cx="17" cy="42" r="3.4" fill="var(--cn-berry)" opacity="0.5" />
			<circle cx="47" cy="42" r="3.4" fill="var(--cn-berry)" opacity="0.5" />
		{:else if id === 'cat'}
			<!-- triangle ears, golden face, whiskers -->
			<path d="M14 28 L10 8 L28 18 Z" fill="var(--cn-gold)" />
			<path d="M50 28 L54 8 L36 18 Z" fill="var(--cn-gold)" />
			<path d="M15 23 L13 12 L23 18 Z" fill="var(--cn-berry)" opacity="0.55" />
			<path d="M49 23 L51 12 L41 18 Z" fill="var(--cn-berry)" opacity="0.55" />
			<circle cx="32" cy="36" r="21" fill="var(--cn-gold)" />
			<circle cx="24" cy="33" r="3.4" fill="var(--cn-ink)" />
			<circle cx="40" cy="33" r="3.4" fill="var(--cn-ink)" />
			<path d="M29 40 L35 40 L32 43 Z" fill="var(--cn-berry)" />
			<g stroke="var(--cn-ink-soft)" stroke-width="1.6" stroke-linecap="round">
				<line x1="6" y1="38" x2="16" y2="40" />
				<line x1="6" y1="44" x2="16" y2="43" />
				<line x1="58" y1="38" x2="48" y2="40" />
				<line x1="58" y1="44" x2="48" y2="43" />
			</g>
		{:else if id === 'hedgehog'}
			<!-- spiky back, cream face -->
			<path
				d="M10 38 L4 30 L10 28 L5 20 L12 19 L9 10 L17 12 L17 3 L23 9 L28 1 L31 9 L38 3 L39 11 L47 8 L45 16 L53 16 L48 23 L54 28 L46 30 L48 38 Z"
				fill="var(--cn-ink-soft)"
			/>
			<circle cx="32" cy="38" r="19" fill="var(--cn-paper-3)" />
			<circle cx="25" cy="36" r="3.2" fill="var(--cn-ink)" />
			<circle cx="39" cy="36" r="3.2" fill="var(--cn-ink)" />
			<circle cx="32" cy="43" r="3.4" fill="var(--cn-ink)" />
			<circle cx="18" cy="42" r="3" fill="var(--cn-berry)" opacity="0.5" />
			<circle cx="46" cy="42" r="3" fill="var(--cn-berry)" opacity="0.5" />
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

<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		onclick,
		size = 'md',
		disabled = false,
		pressed,
		children
	}: {
		label: string;
		onclick?: () => void;
		size?: 'sm' | 'md';
		disabled?: boolean;
		pressed?: boolean;
		children: Snippet;
	} = $props();
</script>

<button
	type="button"
	aria-label={label}
	aria-pressed={pressed}
	{disabled}
	{onclick}
	class="icon-btn icon-btn--{size} cn-press"
>
	{@render children()}
</button>

<style>
	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--cn-radius-pill);
		background: var(--cn-paper-2);
		border: 2px solid var(--cn-border);
		color: var(--cn-ink);
		box-shadow: var(--cn-shadow-1);
		padding: 0;
		flex: none;
	}
	.icon-btn--md {
		min-width: 56px;
		min-height: 56px;
	}
	.icon-btn--sm {
		min-width: 48px;
		min-height: 48px;
	}
	.icon-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>

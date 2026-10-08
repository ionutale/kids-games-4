<script lang="ts">
	import { onMount } from 'svelte';
	import { audio } from '../../audio';
	import { loadSave, persistSave, setMuted } from '../../storage/save';
	import * as m from '../../paraglide/messages';
	import IconButton from './IconButton.svelte';

	let { size = 'md' }: { size?: 'sm' | 'md' } = $props();

	let muted = $state(false);

	function readStored(): boolean {
		try {
			if (typeof localStorage === 'undefined') return false;
			return loadSave(localStorage).settings.muted;
		} catch {
			return false;
		}
	}

	onMount(() => {
		muted = readStored();
		audio.setMuted(muted);
	});

	function toggle(): void {
		const next = !muted;
		muted = next;
		audio.setMuted(next);
		try {
			if (typeof localStorage === 'undefined') return;
			const data = loadSave(localStorage);
			setMuted(data, next);
			persistSave(data, localStorage);
		} catch {
			// storage unavailable (private mode, SSR): audio state still applies
		}
	}
</script>

<IconButton label={muted ? m.music_on() : m.music_off()} {size} pressed={muted} onclick={toggle}>
	<span class="mute-icon" aria-hidden="true">
		<svg viewBox="0 0 24 24" width="24" height="24" fill="none" focusable="false">
			<path
				d="M4 9v6h4l5 4V5L8 9H4z"
				fill="currentColor"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linejoin="round"
			/>
			{#if muted}
				<line
					x1="16"
					y1="9"
					x2="22"
					y2="15"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
				<line
					x1="22"
					y1="9"
					x2="16"
					y2="15"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			{:else}
				<path
					d="M16 9a4.5 4.5 0 0 1 0 6"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
				<path
					d="M18.5 6.5a8 8 0 0 1 0 11"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			{/if}
		</svg>
	</span>
</IconButton>

<style>
	.mute-icon {
		display: inline-flex;
		line-height: 0;
	}
</style>

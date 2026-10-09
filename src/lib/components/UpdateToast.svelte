<script lang="ts">
	import { applyUpdate, onUpdateReady } from '../pwa/client';
	import * as m from '../paraglide/messages';

	let ready = $state(false);

	// Subscribing here keeps the component self-contained: it can be dropped
	// into any page without wiring anything up.
	$effect(() => onUpdateReady(() => (ready = true)));

	function refresh(): void {
		ready = false;
		applyUpdate();
	}
</script>

{#if ready}
	<div class="cn-update" role="status">
		<span class="cn-update-text">{m.update_ready()}</span>
		<button type="button" class="cn-update-btn cn-press" onclick={refresh}>
			{m.update_refresh()}
		</button>
	</div>
{/if}

<style>
	.cn-update {
		position: fixed;
		left: 50%;
		bottom: calc(var(--cn-space-4) + var(--cn-safe-bottom));
		transform: translateX(-50%);
		z-index: 60;
		display: flex;
		align-items: center;
		gap: var(--cn-space-3);
		width: max-content;
		max-width: calc(100vw - var(--cn-space-5));
		padding: var(--cn-space-3) var(--cn-space-4);
		border: 3px solid var(--cn-ink);
		border-radius: var(--cn-radius-pill);
		background: var(--cn-paper);
		box-shadow: var(--cn-shadow-2);
	}

	.cn-update-text {
		font-size: var(--cn-text-sm);
		font-weight: 700;
	}

	.cn-update-btn {
		padding: var(--cn-space-2) var(--cn-space-4);
		border-radius: var(--cn-radius-pill);
		background: var(--cn-accent);
		color: var(--cn-paper);
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-sm);
		white-space: nowrap;
	}
</style>

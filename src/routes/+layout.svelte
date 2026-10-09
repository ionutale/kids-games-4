<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { audio } from '#lib/audio/index.js';
	import { loadSave } from '#lib/storage/save.js';
	import { initPwa } from '#lib/pwa/client.js';
	import UpdateToast from '#lib/components/UpdateToast.svelte';
	import InstallHint from '#lib/components/InstallHint.svelte';

	let { children } = $props();

	onMount(() => {
		try {
			audio.setMuted(loadSave(localStorage).settings.muted);
		} catch {
			// Storage unavailable (private mode): the engine stays unmuted.
		}
		try {
			document.documentElement.lang = getLocale();
		} catch {
			// Locale resolution failed: keep the app.html default.
		}
		initPwa();
		const unlock = (): void => {
			void audio.unlock();
		};
		window.addEventListener('pointerdown', unlock, { once: true });
		return () => {
			window.removeEventListener('pointerdown', unlock);
		};
	});
</script>

<svelte:head>
	<title>{m.app_name()}</title>
</svelte:head>

{@render children()}
<UpdateToast />
<InstallHint />

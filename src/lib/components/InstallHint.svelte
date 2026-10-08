<script lang="ts">
	import * as m from '../paraglide/messages';

	const DISMISSED_KEY = 'cozy-nook.installHintDismissed';

	function readDismissed(): boolean {
		try {
			return localStorage.getItem(DISMISSED_KEY) !== null;
		} catch {
			// Storage can be unavailable in privacy-restricted contexts.
			return false;
		}
	}

	/** Chrome and Firefox on iOS cannot install PWAs, so only Safari is worth a hint. */
	function isIosSafari(): boolean {
		if (typeof navigator === 'undefined') return false;
		const iOS = /iP(hone|ad|od)/.test(navigator.userAgent);
		const Safari = /Safari/.test(navigator.userAgent);
		const notChromium = !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/.test(navigator.userAgent);
		return iOS && Safari && notChromium;
	}

	/** Already launched from the Home Screen — nothing left to install. */
	function isStandalone(): boolean {
		return (
			window.matchMedia('(display-mode: standalone)').matches ||
			(navigator as Navigator & { standalone?: boolean }).standalone === true
		);
	}

	let dismissed = $state(readDismissed());
	const show = $derived(!dismissed && isIosSafari() && !isStandalone());

	function dismiss(): void {
		dismissed = true;
		try {
			localStorage.setItem(DISMISSED_KEY, '1');
		} catch {
			// Dismissing is best-effort; the hint reappears next visit.
		}
	}
</script>

{#if show}
	<div class="cn-install" role="status">
		<p class="cn-install-text">{m.install_ios()}</p>
		<button type="button" class="cn-install-later cn-press" onclick={dismiss}>
			{m.later()}
		</button>
	</div>
{/if}

<style>
	.cn-install {
		position: fixed;
		left: 50%;
		bottom: calc(var(--cn-space-4) + var(--cn-safe-bottom));
		transform: translateX(-50%);
		z-index: 55;
		display: flex;
		align-items: center;
		gap: var(--cn-space-3);
		width: max-content;
		max-width: calc(100vw - var(--cn-space-5));
		padding: var(--cn-space-3) var(--cn-space-4);
		border: 3px solid var(--cn-border);
		border-radius: var(--cn-radius);
		background: var(--cn-paper-2);
		box-shadow: var(--cn-shadow-1);
	}

	.cn-install-text {
		margin: 0;
		color: var(--cn-ink);
		font-size: var(--cn-text-sm);
	}

	.cn-install-later {
		flex-shrink: 0;
		padding: var(--cn-space-1) var(--cn-space-3);
		border-radius: var(--cn-radius-pill);
		color: var(--cn-ink-soft);
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-sm);
	}
</style>

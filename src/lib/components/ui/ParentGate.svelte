<script lang="ts">
	import { onDestroy, type Snippet } from 'svelte';

	let {
		children,
		label = '',
		onUnlocked
	}: {
		children: Snippet;
		label?: string;
		onUnlocked?: () => void;
	} = $props();

	const HOLD_MS = 3000;
	const RING_R = 15;
	const RING_C = 2 * Math.PI * RING_R;

	let unlocked = $state(false);
	let progress = $state(0);
	let holding = $state(false);
	let raf = 0;
	let start = 0;

	function tick(now: number): void {
		if (unlocked) return;
		const t = (now - start) / HOLD_MS;
		if (t >= 1) {
			finish();
			return;
		}
		progress = t;
		raf = requestAnimationFrame(tick);
	}

	function begin(): void {
		if (unlocked) return;
		cancelAnimationFrame(raf);
		start = performance.now();
		holding = true;
		raf = requestAnimationFrame(tick);
	}

	function cancel(): void {
		cancelAnimationFrame(raf);
		holding = false;
		if (!unlocked) progress = 0;
	}

	function finish(): void {
		cancelAnimationFrame(raf);
		holding = false;
		progress = 1;
		unlocked = true;
		onUnlocked?.();
	}

	function onPointerDown(event: PointerEvent): void {
		if (unlocked) return;
		event.preventDefault();
		try {
			(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
		} catch {
			// pointer capture is best-effort; the hold timer works without it
		}
		begin();
	}

	function onKeyDown(event: KeyboardEvent): void {
		if (unlocked) return;
		if (event.repeat) return;
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		begin();
	}

	function onKeyUp(event: KeyboardEvent): void {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		cancel();
	}

	onDestroy(() => cancelAnimationFrame(raf));
</script>

{#if unlocked}
	{@render children()}
{:else}
	<button
		type="button"
		class="gate cn-press"
		aria-label={label}
		onpointerdown={onPointerDown}
		onpointerup={cancel}
		onpointercancel={cancel}
		onpointerleave={cancel}
		onkeydown={onKeyDown}
		onkeyup={onKeyUp}
		oncontextmenu={(event) => event.preventDefault()}
	>
		<span class="gate-ring" aria-hidden="true">
			<svg viewBox="0 0 36 36" width="22" height="22" focusable="false">
				<circle cx="18" cy="18" r={RING_R} fill="none" stroke="var(--cn-border)" stroke-width="4" />
				<circle
					cx="18"
					cy="18"
					r={RING_R}
					fill="none"
					stroke="var(--cn-leaf-dark)"
					stroke-width="4"
					stroke-linecap="round"
					stroke-dasharray={RING_C}
					stroke-dashoffset={RING_C * (1 - progress)}
					transform="rotate(-90 18 18)"
				/>
			</svg>
		</span>
		<span class="gate-label">{label}</span>
	</button>
{/if}

<style>
	.gate {
		display: inline-flex;
		align-items: center;
		gap: var(--cn-space-2);
		min-height: 48px;
		padding: var(--cn-space-2) var(--cn-space-4);
		border-radius: var(--cn-radius-pill);
		background: var(--cn-paper-2);
		border: 2px solid var(--cn-border);
		color: var(--cn-ink-soft);
		font-size: var(--cn-text-sm);
		font-weight: 700;
		box-shadow: var(--cn-shadow-1);
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}
	.gate-ring {
		display: inline-flex;
		line-height: 0;
	}
	.gate-label {
		line-height: 1.2;
	}
</style>

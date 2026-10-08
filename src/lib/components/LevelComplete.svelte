<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Confetti from './Confetti.svelte';

	export interface LevelCompleteProps {
		/** The level that was just completed. */
		level: number;
		/** True when this was the last level (hides the "new" pill). */
		isLast: boolean;
		/** Go to the next level. */
		onNext: () => void;
		/** Replay the current level. */
		onReplay: () => void;
		/** Back to the level map. */
		onAllLevels: () => void;
	}

	let { level, isLast, onNext, onReplay, onAllLevels }: LevelCompleteProps = $props();
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="level-complete-title">
	<Confetti active={true} />
	<div class="card">
		<h2 id="level-complete-title">{m.level_complete()}</h2>
		<span class="level">{m.level({ n: level })}</span>
		{#if !isLast}
			<span class="pill">{m.new()}</span>
		{/if}
		<p class="cheer">{m.cheer()}</p>
		<div class="actions">
			<button type="button" class="btn primary cn-press" onclick={onNext}>
				{m.next_level()}
			</button>
			<button type="button" class="btn cn-press" onclick={onReplay}>
				{m.play_again()}
			</button>
			<button type="button" class="btn ghost cn-press" onclick={onAllLevels}>
				{m.all_levels()}
			</button>
		</div>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		padding: var(--cn-space-4);
		background: rgba(74, 59, 47, 0.35);
		z-index: 50;
	}

	.card {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--cn-space-3);
		width: 100%;
		max-width: 420px;
		padding: var(--cn-space-6);
		background: var(--cn-paper);
		border-radius: var(--cn-radius);
		box-shadow: var(--cn-shadow-2);
		text-align: center;
		animation: cn-pop var(--cn-t-med) var(--cn-ease);
	}

	.level {
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-lg);
		color: var(--cn-ink-soft);
	}

	.pill {
		padding: var(--cn-space-1) var(--cn-space-3);
		background: var(--cn-gold);
		color: var(--cn-ink);
		border-radius: var(--cn-radius-pill);
		font-size: var(--cn-text-xs);
		font-weight: 700;
	}

	.cheer {
		margin: 0;
		color: var(--cn-ink-soft);
		font-size: var(--cn-text-md);
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--cn-space-3);
		width: 100%;
		margin-top: var(--cn-space-2);
	}

	.btn {
		min-height: 56px;
		width: 100%;
		padding: var(--cn-space-3) var(--cn-space-5);
		border-radius: var(--cn-radius-pill);
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-md);
		color: var(--cn-ink);
		background: var(--cn-paper-2);
		box-shadow: var(--cn-shadow-1);
	}

	.btn.primary {
		background: var(--cn-leaf);
		color: #fff;
	}

	.btn.ghost {
		background: transparent;
		border: 2px solid var(--cn-border);
		color: var(--cn-ink-soft);
		box-shadow: none;
	}

	@keyframes cn-pop {
		from {
			transform: scale(0.8) translateY(12px);
			opacity: 0;
		}
		to {
			transform: none;
			opacity: 1;
		}
	}
</style>

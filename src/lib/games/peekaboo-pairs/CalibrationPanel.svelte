<script lang="ts">
	interface Props {
		peekMs: number;
		gap: number;
		cols: number;
		rows: number;
		cardPx: number;
		onchange: (patch: { peekMs?: number; gap?: number; cols?: number; rows?: number }) => void;
		onreplay: () => void;
	}

	let { peekMs, gap, cols, rows, cardPx, onchange, onreplay }: Props = $props();
</script>

<aside class="panel" role="region" aria-label="Calibration">
	<h2>Calibration</h2>
	<label class="row">
		<span>Peek {peekMs} ms</span>
		<input
			type="range"
			min="600"
			max="4000"
			step="50"
			value={peekMs}
			onchange={(event) => onchange({ peekMs: Number(event.currentTarget.value) })}
		/>
	</label>
	<label class="row">
		<span>Gap {gap} px</span>
		<input
			type="range"
			min="4"
			max="20"
			step="1"
			value={gap}
			onchange={(event) => onchange({ gap: Number(event.currentTarget.value) })}
		/>
	</label>
	<label class="row">
		<span>Cols {cols}</span>
		<input
			type="range"
			min="2"
			max="4"
			step="1"
			value={cols}
			onchange={(event) => onchange({ cols: Number(event.currentTarget.value) })}
		/>
	</label>
	<label class="row">
		<span>Rows {rows}</span>
		<input
			type="range"
			min="2"
			max="5"
			step="1"
			value={rows}
			onchange={(event) => onchange({ rows: Number(event.currentTarget.value) })}
		/>
	</label>
	<p class="readout">cardPx: {cardPx}</p>
	<button type="button" onclick={onreplay}>Replay board</button>
</aside>

<style>
	.panel {
		position: fixed;
		left: var(--cn-space-3);
		right: var(--cn-space-3);
		bottom: var(--cn-space-3);
		z-index: 60;
		display: flex;
		flex-direction: column;
		gap: var(--cn-space-2);
		padding: var(--cn-space-3);
		background: var(--cn-paper);
		border: 2px solid var(--cn-border);
		border-radius: var(--cn-radius);
		box-shadow: var(--cn-shadow-2);
		font-size: var(--cn-text-sm);
	}

	.panel h2 {
		margin: 0;
		font-size: var(--cn-text-md);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cn-space-2);
	}

	.readout {
		margin: 0;
	}

	.panel button {
		padding: var(--cn-space-2);
		border-radius: var(--cn-radius-pill);
		border: 2px solid var(--cn-border);
		background: var(--cn-paper-2);
	}
</style>

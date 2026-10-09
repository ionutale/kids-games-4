<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { m } from '#lib/paraglide/messages.js';
	import { audio } from '#lib/audio/index.js';
	import { getCleared, isLevelOpen, loadSave } from '#lib/storage/save.js';
	import { LEVELS, MAX_LEVEL } from '#lib/games/counting/rules.js';
	import Muguri from '#lib/components/art/Muguri.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';

	const GAME_ID = 'counting';

	let cleared = $state(0);
	let wiggling = $state<number | null>(null);
	let lockedFor = $state<number | null>(null);
	let lockedTimer = 0;

	onMount(() => {
		audio.playMusic('game');
		try {
			const data = loadSave(localStorage);
			const active = data.activeProfileId;
			cleared = active ? getCleared(data, active, GAME_ID) : 0;
		} catch {
			cleared = 0;
		}
	});

	onDestroy(() => {
		if (lockedTimer) window.clearTimeout(lockedTimer);
	});

	function tapLevel(n: number): void {
		if (!isLevelOpen(cleared, n)) {
			audio.playSfx('ui');
			wiggling = n;
			lockedFor = n;
			if (lockedTimer) window.clearTimeout(lockedTimer);
			lockedTimer = window.setTimeout(() => {
				lockedFor = null;
				wiggling = null;
			}, 1600);
			return;
		}
		audio.playSfx('ui');
		void goto('/play/counting/' + n);
	}
</script>

<svelte:head>
	<title>{m.game_counting_name()}</title>
</svelte:head>

<div class="map cn-safe">
	<header class="top">
		<IconButton label={m.back()} onclick={() => void goto('/')}>
			<svg
				class="back-arrow"
				viewBox="0 0 24 24"
				width="22"
				height="22"
				aria-hidden="true"
				focusable="false"
			>
				<path
					d="M14.5 5 8 12l6.5 7"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</IconButton>
		<div class="titles">
			<h1>{m.game_counting_name()}</h1>
			<p>{m.game_counting_desc()}</p>
		</div>
		<Muguri pose="idle" size={72} />
	</header>

	<h2 class="choose">{m.choose_level()}</h2>
	<p class="progress">{m.progress({ done: cleared })}</p>

	<ol class="tiles">
		{#each LEVELS as entry (entry.level)}
			{@const n = entry.level}
			{@const open = isLevelOpen(cleared, n)}
			{@const done = n <= cleared}
			{@const isNew = n === cleared + 1 && cleared < MAX_LEVEL}
			<li>
				<button
					type="button"
					class="tile cn-press"
					class:locked={!open}
					class:done
					class:wiggle={wiggling === n}
					aria-label={open ? m.level({ n }) : `${m.level({ n })} — ${m.locked()}`}
					onclick={() => tapLevel(n)}
				>
					{#if isNew}
						<span class="pill">{m.new()}</span>
					{/if}
					{#if !open}
						<svg
							class="padlock"
							viewBox="0 0 24 24"
							width="28"
							height="28"
							aria-hidden="true"
							focusable="false"
						>
							<rect
								x="5"
								y="10"
								width="14"
								height="10"
								rx="3"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
							/>
							<path
								d="M8 10V7a4 4 0 0 1 8 0v3"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
							/>
							<circle cx="12" cy="15" r="1.6" fill="currentColor" />
						</svg>
					{:else if done}
						<span class="check" aria-hidden="true">✓</span>
					{/if}
					<span class="num">{n}</span>
				</button>
				{#if lockedFor === n}
					<p class="locked-bubble" role="status">{m.locked_detail({ n: cleared + 1 })}</p>
				{/if}
			</li>
		{/each}
	</ol>
</div>

<style>
	.map {
		max-width: 560px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--cn-space-4);
	}

	.top {
		display: flex;
		align-items: center;
		gap: var(--cn-space-4);
	}

	.titles {
		flex: 1;
		min-width: 0;
	}

	.titles h1 {
		font-size: var(--cn-text-xl);
	}

	.titles p {
		margin: var(--cn-space-1) 0 0;
		color: var(--cn-ink-soft);
		font-size: var(--cn-text-sm);
	}

	.back-arrow {
		display: block;
	}

	.choose {
		font-size: var(--cn-text-lg);
	}

	.progress {
		margin: 0;
		color: var(--cn-ink-soft);
		font-size: var(--cn-text-sm);
	}

	.tiles {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--cn-space-3);
	}

	.tiles li {
		position: relative;
	}

	.tile {
		position: relative;
		width: 100%;
		min-height: 88px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--cn-space-2);
		border-radius: var(--cn-radius);
		background: var(--cn-paper-2);
		border: 2px solid var(--cn-border);
		box-shadow: var(--cn-shadow-1);
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-lg);
	}

	.tile.done {
		background: var(--cn-leaf);
		border-color: var(--cn-leaf-dark);
		color: #fff;
	}

	.tile.locked {
		opacity: 0.75;
		color: var(--cn-ink-soft);
	}

	.num {
		font-weight: 700;
	}

	.check {
		font-size: 1.4rem;
		line-height: 1;
	}

	.padlock {
		color: var(--cn-ink-soft);
	}

	.pill {
		position: absolute;
		top: -10px;
		right: 8px;
		padding: 2px var(--cn-space-3);
		background: var(--cn-gold);
		color: var(--cn-ink);
		border-radius: var(--cn-radius-pill);
		font-family: var(--cn-font-body);
		font-size: var(--cn-text-xs);
		font-weight: 800;
	}

	.wiggle {
		animation: tile-wiggle 400ms ease-in-out;
	}
	@keyframes tile-wiggle {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-8px);
		}
		40% {
			transform: translateX(8px);
		}
		60% {
			transform: translateX(-5px);
		}
		80% {
			transform: translateX(5px);
		}
	}

	.locked-bubble {
		margin: var(--cn-space-2) 0 0;
		padding: var(--cn-space-2) var(--cn-space-3);
		background: var(--cn-paper-2);
		border: 2px solid var(--cn-border);
		border-radius: var(--cn-radius-sm);
		color: var(--cn-ink-soft);
		font-size: var(--cn-text-sm);
		text-align: center;
	}
</style>

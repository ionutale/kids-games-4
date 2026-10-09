<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, localizeHref, locales } from '#lib/paraglide/runtime.js';
	import { audio } from '#lib/audio/index.js';
	import {
		AVATARS,
		addProfile,
		getCleared,
		loadSave,
		persistSave,
		setActiveProfile,
		type AvatarId,
		type SaveData
	} from '#lib/storage/save.js';
	import { GAMES, type GameMeta } from '#lib/games/registry.js';
	import Muguri from '#lib/components/art/Muguri.svelte';
	import Avatar from '#lib/components/art/Avatar.svelte';
	import Fruit from '#lib/components/art/Fruit.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';

	type Locale = (typeof locales)[number];

	const TITLES: Record<string, () => string> = {
		game_counting_name: () => m.game_counting_name()
	};
	const DESCS: Record<string, () => string> = {
		game_counting_desc: () => m.game_counting_desc()
	};

	function gameTitle(game: GameMeta): string {
		return TITLES[game.titleKey]?.() ?? game.id;
	}

	function gameDesc(game: GameMeta): string {
		return DESCS[game.descKey]?.() ?? '';
	}

	let save = $state<SaveData | null>(null);
	let locale = $state<Locale>('it');
	let sheetOpen = $state(false);
	let newName = $state('');
	let newAvatar = $state<AvatarId>('owl');

	const profiles = $derived(save?.profiles ?? []);
	const activeId = $derived(save?.activeProfileId ?? profiles[0]?.id ?? null);
	const active = $derived(profiles.find((p) => p.id === activeId) ?? null);

	const settingsHref = $derived(localizeHref('/settings', { locale }));

	function gameHref(game: GameMeta): string {
		return localizeHref(game.href, { locale });
	}

	function clearedFor(game: GameMeta): number {
		if (!save || !active) return 0;
		return getCleared(save, active.id, game.id);
	}

	function persist(): void {
		if (!save) return;
		try {
			persistSave(save, localStorage);
		} catch {
			// Private mode: the session still works, it just won't survive reload.
		}
	}

	function createKid(name: string, avatar: AvatarId): void {
		if (!save) return;
		addProfile(save, name, avatar);
		persist();
	}

	function startPlaying(): void {
		createKid(newName, newAvatar);
		newName = '';
		newAvatar = 'owl';
	}

	function switchProfile(id: string): void {
		if (!save) return;
		setActiveProfile(save, id);
		persist();
		sheetOpen = false;
	}

	function openSettings(): void {
		void goto(settingsHref);
	}

	onMount(() => {
		try {
			save = loadSave(localStorage);
		} catch {
			save = loadSave(null);
		}
		try {
			locale = getLocale() as Locale;
		} catch {
			locale = 'it';
		}
		audio.playMusic('home');
	});
</script>

<div class="home cn-safe">
	<header class="home-head">
		<div class="home-titles">
			<h1>{m.app_name()}</h1>
			<p>{m.tagline()}</p>
		</div>
		<IconButton label={m.settings()} onclick={openSettings}>
			<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
				<path
					d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2" />
			</svg>
		</IconButton>
	</header>

	{#if save && profiles.length === 0}
		<section class="card first-run" aria-label={m.home_who()}>
			<Muguri pose="idle" size={96} />
			<h2>{m.home_who()}</h2>
			<label class="field">
				<span class="field-label">{m.kid_name()}</span>
				<input
					class="field-input"
					type="text"
					maxlength="20"
					autocomplete="off"
					placeholder={m.kid_name()}
					bind:value={newName}
				/>
			</label>
			<fieldset class="avatar-pick">
				<legend class="field-label">{m.choose_avatar()}</legend>
				<div class="avatar-grid">
					{#each AVATARS as id (id)}
						<button
							type="button"
							class="avatar-btn cn-press"
							class:selected={id === newAvatar}
							aria-pressed={id === newAvatar}
							aria-label={id}
							onclick={() => (newAvatar = id)}
						>
							<Avatar {id} size={48} />
						</button>
					{/each}
				</div>
			</fieldset>
			<button type="button" class="btn primary cn-press" onclick={startPlaying}>
				{m.start_playing()}
			</button>
		</section>
	{:else if save && active}
		<section class="greet" aria-label={m.home_who()}>
			<Muguri pose="idle" size={96} />
			<button
				type="button"
				class="chip cn-press"
				aria-expanded={sheetOpen}
				onclick={() => (sheetOpen = !sheetOpen)}
			>
				<Avatar id={active.avatar} size={40} />
				<span class="chip-name">{active.name}</span>
				<span class="chip-caret" aria-hidden="true">▾</span>
			</button>
		</section>

		{#if sheetOpen}
			<section class="card sheet" aria-label={m.home_who()}>
				<ul class="profile-list">
					{#each profiles as p (p.id)}
						<li>
							<button
								type="button"
								class="profile-row cn-press"
								class:selected={p.id === active.id}
								aria-current={p.id === active.id ? 'true' : undefined}
								onclick={() => switchProfile(p.id)}
							>
								<Avatar id={p.avatar} size={44} />
								<span class="profile-name">{p.name}</span>
							</button>
						</li>
					{/each}
				</ul>
				<div class="sheet-add">
					<label class="field">
						<span class="field-label">{m.kid_name()}</span>
						<input
							class="field-input"
							type="text"
							maxlength="20"
							autocomplete="off"
							placeholder={m.kid_name()}
							bind:value={newName}
						/>
					</label>
					<div class="avatar-grid small">
						{#each AVATARS as id (id)}
							<button
								type="button"
								class="avatar-btn cn-press"
								class:selected={id === newAvatar}
								aria-pressed={id === newAvatar}
								aria-label={id}
								onclick={() => (newAvatar = id)}
							>
								<Avatar {id} size={40} />
							</button>
						{/each}
					</div>
					<button type="button" class="btn cn-press" onclick={startPlaying}>
						{m.home_add_kid()}
					</button>
				</div>
			</section>
		{/if}

		<nav class="games" aria-label={m.app_name()}>
			{#each GAMES as game (game.id)}
				<a class="tile cn-press" href={gameHref(game)}>
					<span class="tile-icon">
						{#if game.icon === 'fruit'}
							<Fruit kind="apple" size={64} />
						{:else}
							<Fruit kind="apple" size={64} />
						{/if}
					</span>
					<span class="tile-text">
						<span class="tile-title">{gameTitle(game)}</span>
						<span class="tile-desc">{gameDesc(game)}</span>
						<span class="tile-progress">{m.progress({ done: clearedFor(game) })}</span>
					</span>
					<span class="tile-play">{m.play()}</span>
				</a>
			{/each}
			<div class="tile soon" aria-disabled="true">
				<span class="tile-icon" aria-hidden="true">
					<Muguri pose="sleepy" size={64} />
				</span>
				<span class="tile-text">
					<span class="tile-title">{m.coming_soon_tile()}</span>
					<span class="tile-desc">{m.coming_soon()}</span>
				</span>
			</div>
		</nav>
	{/if}
</div>

<style>
	.home {
		display: flex;
		flex-direction: column;
		gap: var(--cn-space-5);
		max-width: 560px;
		margin: 0 auto;
	}

	.home-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cn-space-3);
	}

	.home-titles h1 {
		font-size: var(--cn-text-xl);
	}

	.home-titles p {
		margin: var(--cn-space-1) 0 0;
		color: var(--cn-ink-soft);
		font-size: var(--cn-text-md);
		font-weight: 600;
	}

	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--cn-space-4);
		padding: var(--cn-space-5);
		background: var(--cn-paper-2);
		border: 2px solid var(--cn-border);
		border-radius: var(--cn-radius);
		box-shadow: var(--cn-shadow-1);
		text-align: center;
	}

	.card h2 {
		font-size: var(--cn-text-lg);
		margin: 0;
	}

	.greet {
		display: flex;
		align-items: center;
		gap: var(--cn-space-4);
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: var(--cn-space-2);
		min-height: 56px;
		padding: var(--cn-space-2) var(--cn-space-4);
		background: var(--cn-paper-2);
		border: 2px solid var(--cn-border);
		border-radius: var(--cn-radius-pill);
		box-shadow: var(--cn-shadow-1);
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-md);
	}

	.chip-name {
		max-width: 140px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chip-caret {
		color: var(--cn-ink-soft);
	}

	.sheet {
		align-items: stretch;
		text-align: start;
	}

	.profile-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--cn-space-2);
		margin: 0;
		padding: 0;
	}

	.profile-row {
		display: flex;
		align-items: center;
		gap: var(--cn-space-3);
		width: 100%;
		min-height: 56px;
		padding: var(--cn-space-2) var(--cn-space-3);
		border: 2px solid var(--cn-border);
		border-radius: var(--cn-radius-sm);
		background: var(--cn-paper);
		font-size: var(--cn-text-md);
		font-weight: 700;
		text-align: start;
	}

	.profile-row.selected {
		border-color: var(--cn-leaf-dark);
		background: var(--cn-sky-2);
	}

	.profile-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sheet-add {
		display: flex;
		flex-direction: column;
		gap: var(--cn-space-3);
		border-top: 2px solid var(--cn-border);
		padding-top: var(--cn-space-4);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--cn-space-2);
		width: 100%;
		text-align: start;
	}

	.field-label {
		font-size: var(--cn-text-sm);
		font-weight: 800;
		color: var(--cn-ink-soft);
	}

	.field-input {
		min-height: 56px;
		padding: var(--cn-space-2) var(--cn-space-4);
		border: 2px solid var(--cn-border);
		border-radius: var(--cn-radius-sm);
		background: var(--cn-paper);
		color: var(--cn-ink);
		font: inherit;
		font-size: var(--cn-text-md);
		font-weight: 600;
		width: 100%;
	}

	.avatar-pick {
		border: 0;
		margin: 0;
		padding: 0;
		width: 100%;
		text-align: start;
	}

	.avatar-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--cn-space-2);
		margin-top: var(--cn-space-2);
	}

	.avatar-grid.small {
		grid-template-columns: repeat(6, 1fr);
	}

	.avatar-btn {
		display: grid;
		place-items: center;
		min-width: 56px;
		min-height: 56px;
		padding: var(--cn-space-1);
		border: 2px solid var(--cn-border);
		border-radius: var(--cn-radius-sm);
		background: var(--cn-paper);
	}

	.avatar-btn.selected {
		border-color: var(--cn-leaf-dark);
		background: var(--cn-sky-2);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 56px;
		width: 100%;
		padding: var(--cn-space-3) var(--cn-space-5);
		border-radius: var(--cn-radius-pill);
		background: var(--cn-paper-2);
		border: 2px solid var(--cn-border);
		box-shadow: var(--cn-shadow-1);
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-md);
		color: var(--cn-ink);
	}

	.btn.primary {
		background: var(--cn-leaf);
		border-color: var(--cn-leaf-dark);
		color: #fff;
	}

	.games {
		display: flex;
		flex-direction: column;
		gap: var(--cn-space-3);
	}

	.tile {
		display: flex;
		align-items: center;
		gap: var(--cn-space-4);
		min-height: 88px;
		padding: var(--cn-space-4);
		background: var(--cn-paper-2);
		border: 2px solid var(--cn-border);
		border-radius: var(--cn-radius);
		box-shadow: var(--cn-shadow-1);
		color: inherit;
		text-decoration: none;
	}

	.tile.soon {
		opacity: 0.75;
		box-shadow: none;
	}

	.tile-icon {
		flex: none;
		line-height: 0;
		padding: var(--cn-space-1);
		border-radius: var(--cn-radius-sm);
		background: rgba(127, 166, 83, 0.14);
	}

	.tile-text {
		display: flex;
		flex-direction: column;
		gap: var(--cn-space-1);
		flex: 1;
		min-width: 0;
	}

	.tile-title {
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-md);
	}

	.tile-desc {
		font-size: var(--cn-text-sm);
		color: var(--cn-ink-soft);
		font-weight: 600;
	}

	.tile-progress {
		font-size: var(--cn-text-sm);
		font-weight: 800;
		color: var(--cn-leaf-dark);
	}

	.tile-play {
		flex: none;
		padding: var(--cn-space-2) var(--cn-space-4);
		border-radius: var(--cn-radius-pill);
		background: var(--cn-accent);
		color: var(--cn-paper);
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-sm);
	}
</style>

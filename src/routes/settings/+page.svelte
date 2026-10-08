<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, localizeHref, locales, setLocale } from '#lib/paraglide/runtime.js';
	import { audio } from '#lib/audio/index.js';
	import {
		AVATARS,
		addProfile,
		loadSave,
		persistSave,
		removeProfile,
		type AvatarId,
		type SaveData
	} from '#lib/storage/save.js';
	import Avatar from '#lib/components/art/Avatar.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import MuteButton from '#lib/components/ui/MuteButton.svelte';
	import ParentGate from '#lib/components/ui/ParentGate.svelte';

	type Locale = (typeof locales)[number];

	const LOCALE_NAMES: Record<Locale, string> = {
		it: 'Italiano',
		ro: 'Română',
		en: 'English',
		de: 'Deutsch'
	};

	let save = $state<SaveData | null>(null);
	let locale = $state<Locale>('it');
	let unlocked = $state(false);
	let muted = $state(false);
	let soundRow = $state<HTMLDivElement | null>(null);
	let addName = $state('');
	let addAvatar = $state<AvatarId>('owl');
	let confirmingId = $state<string | null>(null);

	const profiles = $derived(save?.profiles ?? []);
	const homeHref = $derived(localizeHref('/', { locale }));

	function persist(): void {
		if (!save) return;
		try {
			persistSave(save, localStorage);
		} catch {
			// Private mode: the session still works, it just won't survive reload.
		}
	}

	function switchLanguage(target: Locale): void {
		if (target === locale) return;
		locale = target;
		setLocale(target);
	}

	function syncMuted(): void {
		muted = audio.muted;
	}

	// MuteButton owns its toggle; a bubbled click listener (wired in script so
	// it stays out of the a11y static-element rules) keeps the label in sync.
	$effect(() => {
		const el = soundRow;
		if (!el) return;
		el.addEventListener('click', syncMuted);
		return () => el.removeEventListener('click', syncMuted);
	});

	function addKid(): void {
		if (!save) return;
		addProfile(save, addName, addAvatar);
		persist();
		addName = '';
		addAvatar = 'owl';
	}

	function askRemove(id: string): void {
		confirmingId = id;
	}

	function confirmRemove(id: string): void {
		if (!save) return;
		removeProfile(save, id);
		persist();
		confirmingId = null;
	}

	function goHome(): void {
		void goto(homeHref);
	}

	onMount(() => {
		try {
			save = loadSave(localStorage);
			muted = save.settings.muted;
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

<div class="settings cn-safe">
	{#if !unlocked}
		<p class="gate-hint">{m.hold_to_open()}</p>
	{/if}
	<ParentGate label={m.for_grownups()} onUnlocked={() => (unlocked = true)}>
		<div class="settings-body">
			<header class="settings-head">
				<IconButton label={m.back()} onclick={goHome}>
					<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
						<path
							d="M15 5l-7 7 7 7"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</IconButton>
				<h1>{m.settings()}</h1>
			</header>

			<section class="card" aria-label={m.language()}>
				<h2>{m.language()}</h2>
				<div class="lang-grid">
					{#each locales as target (target)}
						<button
							type="button"
							class="lang-btn cn-press"
							class:selected={target === locale}
							aria-pressed={target === locale}
							onclick={() => switchLanguage(target)}
						>
							{LOCALE_NAMES[target]}
						</button>
					{/each}
				</div>
			</section>

			<section class="card" aria-label={m.sound()}>
				<h2>{m.sound()}</h2>
				<div class="sound-row" bind:this={soundRow}>
					<MuteButton size="md" />
					<span class="sound-label">{muted ? m.music_off() : m.music_on()}</span>
				</div>
			</section>

			<section class="card" aria-label={m.kids()}>
				<h2>{m.kids()}</h2>
				{#if save && profiles.length > 0}
					<ul class="kid-list">
						{#each profiles as p (p.id)}
							<li class="kid-row">
								<span class="kid-id">
									<Avatar id={p.avatar} size={44} />
									<span class="kid-name">{p.name}</span>
								</span>
								{#if confirmingId === p.id}
									<span class="confirm">
										<span class="confirm-text">{m.remove_kid_confirm()}</span>
										<span class="confirm-btns">
											<button
												type="button"
												class="mini-btn danger cn-press"
												onclick={() => confirmRemove(p.id)}
											>
												{m.yes()}
											</button>
											<button
												type="button"
												class="mini-btn cn-press"
												onclick={() => (confirmingId = null)}
											>
												{m.no()}
											</button>
										</span>
									</span>
								{:else}
									<button type="button" class="mini-btn cn-press" onclick={() => askRemove(p.id)}>
										{m.remove_kid()}
									</button>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
				<div class="add-kid">
					<label class="field">
						<span class="field-label">{m.kid_name()}</span>
						<input
							class="field-input"
							type="text"
							maxlength="20"
							autocomplete="off"
							placeholder={m.kid_name()}
							bind:value={addName}
						/>
					</label>
					<fieldset class="avatar-pick">
						<legend class="field-label">{m.choose_avatar()}</legend>
						<div class="avatar-grid">
							{#each AVATARS as id (id)}
								<button
									type="button"
									class="avatar-btn cn-press"
									class:selected={id === addAvatar}
									aria-pressed={id === addAvatar}
									aria-label={id}
									onclick={() => (addAvatar = id)}
								>
									<Avatar {id} size={40} />
								</button>
							{/each}
						</div>
					</fieldset>
					<button type="button" class="btn cn-press" onclick={addKid}>
						{m.add_kid()}
					</button>
				</div>
			</section>
		</div>
	</ParentGate>
</div>

<style>
	.settings {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--cn-space-4);
		max-width: 560px;
		margin: 0 auto;
	}

	.gate-hint {
		margin: 0;
		color: var(--cn-ink-soft);
		font-size: var(--cn-text-sm);
		font-weight: 700;
		text-align: center;
	}

	.settings-body {
		display: flex;
		flex-direction: column;
		gap: var(--cn-space-4);
		width: 100%;
	}

	.settings-head {
		display: flex;
		align-items: center;
		gap: var(--cn-space-3);
	}

	.settings-head h1 {
		font-size: var(--cn-text-xl);
		margin: 0;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: var(--cn-space-3);
		padding: var(--cn-space-5);
		background: var(--cn-paper-2);
		border: 2px solid var(--cn-border);
		border-radius: var(--cn-radius);
		box-shadow: var(--cn-shadow-1);
	}

	.card h2 {
		font-size: var(--cn-text-lg);
		margin: 0;
	}

	.lang-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--cn-space-2);
	}

	.lang-btn {
		min-height: 56px;
		padding: var(--cn-space-2) var(--cn-space-3);
		border: 2px solid var(--cn-border);
		border-radius: var(--cn-radius-sm);
		background: var(--cn-paper);
		font-size: var(--cn-text-md);
		font-weight: 700;
	}

	.lang-btn.selected {
		border-color: var(--cn-leaf-dark);
		background: var(--cn-sky-2);
	}

	.sound-row {
		display: flex;
		align-items: center;
		gap: var(--cn-space-3);
	}

	.sound-label {
		font-size: var(--cn-text-md);
		font-weight: 700;
	}

	.kid-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--cn-space-2);
		margin: 0;
		padding: 0;
	}

	.kid-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cn-space-3);
		min-height: 56px;
		padding: var(--cn-space-2) var(--cn-space-3);
		border: 2px solid var(--cn-border);
		border-radius: var(--cn-radius-sm);
		background: var(--cn-paper);
	}

	.kid-id {
		display: inline-flex;
		align-items: center;
		gap: var(--cn-space-2);
		min-width: 0;
	}

	.kid-name {
		font-weight: 700;
		font-size: var(--cn-text-md);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mini-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 56px;
		min-width: 56px;
		padding: var(--cn-space-2) var(--cn-space-4);
		border: 2px solid var(--cn-border);
		border-radius: var(--cn-radius-pill);
		background: var(--cn-paper-2);
		font-size: var(--cn-text-sm);
		font-weight: 800;
		white-space: nowrap;
	}

	.mini-btn.danger {
		background: var(--cn-berry);
		border-color: var(--cn-berry);
		color: #fff;
	}

	.confirm {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--cn-space-2);
	}

	.confirm-text {
		font-size: var(--cn-text-xs);
		font-weight: 700;
		color: var(--cn-ink-soft);
		text-align: end;
	}

	.confirm-btns {
		display: flex;
		gap: var(--cn-space-2);
	}

	.add-kid {
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
	}

	.avatar-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: var(--cn-space-2);
		margin-top: var(--cn-space-2);
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
		background: var(--cn-leaf);
		border: 2px solid var(--cn-leaf-dark);
		color: #fff;
		font-family: var(--cn-font-display);
		font-size: var(--cn-text-md);
		box-shadow: var(--cn-shadow-1);
	}
</style>

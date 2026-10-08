export type AvatarId = 'owl' | 'fox' | 'bear' | 'bunny' | 'cat' | 'hedgehog';

export interface Profile {
	id: string;
	name: string;
	avatar: AvatarId;
	createdAt: number;
}

export interface GameProgress {
	cleared: number;
}

export interface SaveData {
	version: 1;
	activeProfileId: string | null;
	profiles: Profile[];
	progress: Record<string, Record<string, GameProgress>>;
	settings: { muted: boolean };
}

export interface KeyValueStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

export const SAVE_KEY = 'cozy-nook-save';
export const MAX_LEVEL = 10;
export const AVATARS: AvatarId[] = ['owl', 'fox', 'bear', 'bunny', 'cat', 'hedgehog'];

export function defaultSave(): SaveData {
	return {
		version: 1,
		activeProfileId: null,
		profiles: [],
		progress: {},
		settings: { muted: false }
	};
}

export function loadSave(storage?: KeyValueStorage | null): SaveData {
	const fallback = defaultSave();
	if (!storage) return fallback;

	let raw: string | null;
	try {
		raw = storage.getItem(SAVE_KEY);
	} catch {
		return fallback;
	}
	if (typeof raw !== 'string' || raw.length === 0) return fallback;

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return fallback;
	}
	if (!isPlainObject(parsed)) return fallback;
	if (parsed.version !== 1) return fallback;

	const profiles: Profile[] = [];
	if (Array.isArray(parsed.profiles)) {
		for (const entry of parsed.profiles) {
			const profile = sanitizeProfile(entry);
			if (profile) profiles.push(profile);
		}
	}

	const progress: SaveData['progress'] = {};
	if (isPlainObject(parsed.progress)) {
		for (const [profileId, games] of Object.entries(parsed.progress)) {
			if (!profiles.some((p) => p.id === profileId)) continue;
			if (!isPlainObject(games)) continue;
			const sanitizedGames: Record<string, GameProgress> = {};
			for (const [gameId, game] of Object.entries(games)) {
				if (!isPlainObject(game)) continue;
				sanitizedGames[gameId] = { cleared: sanitizeCleared(game.cleared) };
			}
			progress[profileId] = sanitizedGames;
		}
	}

	const rawActive = parsed.activeProfileId;
	let activeProfileId: string | null = null;
	if (typeof rawActive === 'string' && profiles.some((p) => p.id === rawActive)) {
		activeProfileId = rawActive;
	}

	const rawSettings = isPlainObject(parsed.settings) ? parsed.settings : {};
	const muted = typeof rawSettings.muted === 'boolean' ? rawSettings.muted : false;

	return { version: 1, activeProfileId, profiles, progress, settings: { muted } };
}

export function persistSave(data: SaveData, storage: KeyValueStorage): void {
	storage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function addProfile(data: SaveData, name: string, avatar: AvatarId): Profile {
	const profile: Profile = {
		id: createId(),
		name: name.trim().slice(0, 20) || 'Kid',
		avatar,
		createdAt: Date.now()
	};
	data.profiles.push(profile);
	data.activeProfileId = profile.id;
	return profile;
}

export function removeProfile(data: SaveData, id: string): void {
	data.profiles = data.profiles.filter((p) => p.id !== id);
	delete data.progress[id];
	if (data.activeProfileId === id) data.activeProfileId = null;
}

export function setActiveProfile(data: SaveData, id: string | null): void {
	data.activeProfileId = id;
}

export function setMuted(data: SaveData, muted: boolean): void {
	data.settings.muted = muted;
}

export function getCleared(data: SaveData, profileId: string, gameId: string): number {
	return data.progress[profileId]?.[gameId]?.cleared ?? 0;
}

export function clearLevel(
	data: SaveData,
	profileId: string,
	gameId: string,
	level: number
): number {
	const clamped = Math.min(Math.max(level, 0), MAX_LEVEL);
	const cleared = Math.max(getCleared(data, profileId, gameId), clamped);
	const games = (data.progress[profileId] ??= {});
	games[gameId] = { cleared };
	return cleared;
}

export function isLevelOpen(cleared: number, level: number): boolean {
	return level >= 1 && level <= MAX_LEVEL && level <= cleared + 1;
}

export function createId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
		const rand = (Math.random() * 16) | 0;
		const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
		return value.toString(16);
	});
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAvatarId(value: unknown): value is AvatarId {
	return typeof value === 'string' && (AVATARS as readonly string[]).includes(value);
}

function sanitizeCleared(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
	return Math.min(Math.max(value, 0), MAX_LEVEL);
}

function sanitizeProfile(value: unknown): Profile | null {
	if (!isPlainObject(value)) return null;
	const { id, name, avatar, createdAt } = value;
	if (typeof id !== 'string' || id.length === 0) return null;
	if (typeof name !== 'string') return null;
	if (!isAvatarId(avatar)) return null;
	if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) return null;
	return { id, name, avatar, createdAt };
}

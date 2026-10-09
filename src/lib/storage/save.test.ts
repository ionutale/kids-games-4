import { describe, expect, it } from 'vitest';

import {
	AVATARS,
	MAX_LEVEL,
	SAVE_KEY,
	addProfile,
	clearLevel,
	createId,
	defaultSave,
	getCleared,
	isLevelOpen,
	loadSave,
	persistSave,
	removeProfile,
	setActiveProfile,
	setMuted,
	type KeyValueStorage,
	type SaveData
} from './save';

function memoryStorage(
	initial: Record<string, string> = {}
): KeyValueStorage & { map: Map<string, string> } {
	const map = new Map(Object.entries(initial));
	return {
		map,
		getItem: (key: string) => map.get(key) ?? null,
		setItem: (key: string, value: string) => {
			map.set(key, value);
		}
	};
}

function stored(storage: KeyValueStorage & { map: Map<string, string> }): string {
	const raw = storage.getItem(SAVE_KEY);
	if (raw === null) throw new Error('expected save to be stored');
	return raw;
}

describe('loadSave', () => {
	it('returns the default save when storage is null or undefined', () => {
		expect(loadSave(null)).toEqual(defaultSave());
		expect(loadSave(undefined)).toEqual(defaultSave());
	});

	it('returns the default save when the key is missing', () => {
		expect(loadSave(memoryStorage())).toEqual(defaultSave());
	});

	it('returns the default save on corrupt JSON', () => {
		expect(loadSave(memoryStorage({ [SAVE_KEY]: '{not json' }))).toEqual(defaultSave());
	});

	it('returns the default save when the JSON is not an object', () => {
		expect(loadSave(memoryStorage({ [SAVE_KEY]: '"hello"' }))).toEqual(defaultSave());
		expect(loadSave(memoryStorage({ [SAVE_KEY]: '42' }))).toEqual(defaultSave());
		expect(loadSave(memoryStorage({ [SAVE_KEY]: 'null' }))).toEqual(defaultSave());
		expect(loadSave(memoryStorage({ [SAVE_KEY]: '[1,2,3]' }))).toEqual(defaultSave());
	});

	it('returns the default save on an unknown version', () => {
		const raw = JSON.stringify({ ...defaultSave(), version: 2 });
		expect(loadSave(memoryStorage({ [SAVE_KEY]: raw }))).toEqual(defaultSave());
	});

	it('sanitizes cleared values that are NaN, negative, or too large', () => {
		const data: SaveData = {
			...defaultSave(),
			profiles: [{ id: 'p1', name: 'Ava', avatar: 'owl', createdAt: 1 }],
			progress: {
				p1: {
					memory: { cleared: Number.NaN },
					puzzle: { cleared: -5 },
					maze: { cleared: 99 }
				}
			}
		};
		const loaded = loadSave(memoryStorage({ [SAVE_KEY]: JSON.stringify(data) }));
		expect(getCleared(loaded, 'p1', 'memory')).toBe(0);
		expect(getCleared(loaded, 'p1', 'puzzle')).toBe(0);
		expect(getCleared(loaded, 'p1', 'maze')).toBe(MAX_LEVEL);
	});

	it('drops activeProfileId when it points at a missing profile', () => {
		const raw = JSON.stringify({ ...defaultSave(), activeProfileId: 'ghost' });
		expect(loadSave(memoryStorage({ [SAVE_KEY]: raw })).activeProfileId).toBeNull();
	});

	it('keeps activeProfileId when it points at a real profile', () => {
		const data: SaveData = {
			...defaultSave(),
			profiles: [{ id: 'p1', name: 'Ava', avatar: 'owl', createdAt: 1 }],
			activeProfileId: 'p1'
		};
		expect(loadSave(memoryStorage({ [SAVE_KEY]: JSON.stringify(data) })).activeProfileId).toBe(
			'p1'
		);
	});

	it('drops profiles with unknown avatar ids and their progress', () => {
		const data = {
			...defaultSave(),
			profiles: [
				{ id: 'p1', name: 'Ava', avatar: 'owl', createdAt: 1 },
				{ id: 'p2', name: 'Bo', avatar: 'dragon', createdAt: 2 }
			],
			progress: {
				p1: { memory: { cleared: 3 } },
				p2: { puzzle: { cleared: 4 } }
			}
		};
		const loaded = loadSave(memoryStorage({ [SAVE_KEY]: JSON.stringify(data) }));
		expect(loaded.profiles.map((p) => p.id)).toEqual(['p1']);
		expect(loaded.progress.p2).toBeUndefined();
		expect(getCleared(loaded, 'p1', 'memory')).toBe(3);
	});

	it('drops profiles with no valid avatar field', () => {
		const data = {
			...defaultSave(),
			profiles: [{ id: 'p1', name: 'Ava', createdAt: 1 }, null, 'nope']
		};
		const loaded = loadSave(memoryStorage({ [SAVE_KEY]: JSON.stringify(data) }));
		expect(loaded.profiles).toEqual([]);
	});

	it('defaults muted to false when it is not a boolean', () => {
		const data = { ...defaultSave(), settings: { muted: 'yes' } };
		const loaded = loadSave(memoryStorage({ [SAVE_KEY]: JSON.stringify(data) }));
		expect(loaded.settings.muted).toBe(false);
	});

	it('tolerates missing profiles, progress, and settings sections', () => {
		const raw = JSON.stringify({ version: 1 });
		const loaded = loadSave(memoryStorage({ [SAVE_KEY]: raw }));
		expect(loaded).toEqual(defaultSave());
	});
});

describe('addProfile', () => {
	it('appends a profile and makes it active', () => {
		const data = defaultSave();
		const profile = addProfile(data, '  Max  ', 'fox');
		expect(profile.name).toBe('Max');
		expect(profile.avatar).toBe('fox');
		expect(data.profiles).toEqual([profile]);
		expect(data.activeProfileId).toBe(profile.id);
	});

	it('trims names longer than 20 characters', () => {
		const data = defaultSave();
		const profile = addProfile(data, 'abcdefghijklmnopqrstuvwxyz', 'bear');
		expect(profile.name).toBe('abcdefghijklmnopqrst');
		expect(profile.name).toHaveLength(20);
	});

	it('falls back to "Kid" for empty names', () => {
		const data = defaultSave();
		expect(addProfile(data, '   ', 'cat').name).toBe('Kid');
		expect(addProfile(data, '', 'cat').name).toBe('Kid');
	});
});

describe('removeProfile', () => {
	it('removes the profile, its progress, and clears it as active', () => {
		const data = defaultSave();
		const profile = addProfile(data, 'Ava', 'owl');
		clearLevel(data, profile.id, 'memory', 3);
		removeProfile(data, profile.id);
		expect(data.profiles).toEqual([]);
		expect(data.progress[profile.id]).toBeUndefined();
		expect(data.activeProfileId).toBeNull();
	});

	it('keeps other profiles, their progress, and the active profile intact', () => {
		const data = defaultSave();
		const a = addProfile(data, 'Ava', 'owl');
		const b = addProfile(data, 'Bo', 'fox');
		clearLevel(data, a.id, 'memory', 2);
		clearLevel(data, b.id, 'puzzle', 4);
		removeProfile(data, a.id);
		expect(data.profiles.map((p) => p.id)).toEqual([b.id]);
		expect(data.activeProfileId).toBe(b.id);
		expect(getCleared(data, b.id, 'puzzle')).toBe(4);
	});
});

describe('setActiveProfile', () => {
	it('sets and clears the active profile', () => {
		const data = defaultSave();
		const profile = addProfile(data, 'Ava', 'owl');
		setActiveProfile(data, null);
		expect(data.activeProfileId).toBeNull();
		setActiveProfile(data, profile.id);
		expect(data.activeProfileId).toBe(profile.id);
	});
});

describe('setMuted', () => {
	it('sets the muted flag', () => {
		const data = defaultSave();
		setMuted(data, true);
		expect(data.settings.muted).toBe(true);
		setMuted(data, false);
		expect(data.settings.muted).toBe(false);
	});
});

describe('getCleared', () => {
	it('returns 0 for unknown profiles or games', () => {
		const data = defaultSave();
		expect(getCleared(data, 'nope', 'memory')).toBe(0);
		const profile = addProfile(data, 'Ava', 'owl');
		expect(getCleared(data, profile.id, 'memory')).toBe(0);
	});
});

describe('clearLevel', () => {
	it('is monotonic and clamped to 0..MAX_LEVEL', () => {
		const data = defaultSave();
		const profile = addProfile(data, 'Ava', 'owl');
		expect(clearLevel(data, profile.id, 'memory', 2)).toBe(2);
		expect(clearLevel(data, profile.id, 'memory', 1)).toBe(2);
		expect(clearLevel(data, profile.id, 'memory', 7)).toBe(7);
		expect(clearLevel(data, profile.id, 'memory', 99)).toBe(MAX_LEVEL);
		expect(clearLevel(data, profile.id, 'memory', -3)).toBe(MAX_LEVEL);
		expect(getCleared(data, profile.id, 'memory')).toBe(MAX_LEVEL);
	});

	it('tracks games independently', () => {
		const data = defaultSave();
		const profile = addProfile(data, 'Ava', 'owl');
		clearLevel(data, profile.id, 'memory', 3);
		clearLevel(data, profile.id, 'puzzle', 1);
		expect(getCleared(data, profile.id, 'memory')).toBe(3);
		expect(getCleared(data, profile.id, 'puzzle')).toBe(1);
	});
});

describe('isLevelOpen', () => {
	it('follows the unlock rule', () => {
		expect(isLevelOpen(0, 1)).toBe(true);
		expect(isLevelOpen(0, 2)).toBe(false);
		expect(isLevelOpen(10, 10)).toBe(true);
		expect(isLevelOpen(3, 5)).toBe(false);
		expect(isLevelOpen(3, 4)).toBe(true);
		expect(isLevelOpen(10, 11)).toBe(false);
	});
});

describe('persistSave + loadSave', () => {
	it('round-trips a save through the storage', () => {
		const storage = memoryStorage();
		const data = defaultSave();
		const profile = addProfile(data, 'Ava', 'owl');
		setMuted(data, true);
		clearLevel(data, profile.id, 'memory', 5);
		persistSave(data, storage);
		expect(stored(storage)).toBe(JSON.stringify(data));
		expect(loadSave(storage)).toEqual(data);
	});
});

describe('createId', () => {
	it('generates unique ids', () => {
		expect(createId()).not.toBe(createId());
		expect(createId()).toMatch(/^[0-9a-f-]{36}$/);
	});
});

describe('constants', () => {
	it('exports the avatar list', () => {
		expect(AVATARS).toEqual(['owl', 'fox', 'bear', 'bunny', 'cat', 'hedgehog']);
	});

	it('exports the save key and level cap', () => {
		expect(SAVE_KEY).toBe('cozy-nook-save');
		expect(MAX_LEVEL).toBe(10);
	});
});

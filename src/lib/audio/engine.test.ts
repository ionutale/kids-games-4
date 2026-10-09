// The inert-in-Node contract, in the repo instead of in a scratch run.
//
// The audio engine promises that importing it and calling it where WebAudio does not exist is
// safe and silent: no throw, no graph, no timer, no leaked work. Vitest runs in the node
// environment here, so this file is exactly that environment — which is the point. It exercises
// only the inert paths (a missing AudioContext, and an explicitly null one), so it is
// deterministic and leaves nothing behind.
//
// The other half of the story — the browser paths against a fake AudioContext — lives in the
// engine itself; see `music.ts` for the scheduler guards that keep a silent context quiet.

import { describe, expect, it } from 'vitest';
import { audio, createCozyAudio } from './engine';

describe('the singleton when WebAudio is unavailable', () => {
	it('imports and reports itself inert before unlock', () => {
		expect(typeof audio.unlock).toBe('function');
		expect(typeof audio.playSfx).toBe('function');
		expect(audio.muted).toBe(false);
		expect(audio.ready).toBe(false);
	});

	it('treats every call before unlock as a silent no-op', () => {
		expect(() => audio.playSfx('tap')).not.toThrow();
		expect(() => audio.playMusic('home')).not.toThrow();
		expect(() => audio.stopMusic()).not.toThrow();
		expect(() => audio.setMuted(true)).not.toThrow();
		expect(() => audio.setMuted(false)).not.toThrow();
		// The mute flag is still tracked: it is applied when the graph is finally built.
		expect(audio.muted).toBe(false);
		expect(audio.ready).toBe(false);
	});

	it('resolves unlock without a context, and stays inert', async () => {
		await expect(audio.unlock()).resolves.toBeUndefined();
		expect(audio.ready).toBe(false);
		expect(() => audio.playSfx('ui')).not.toThrow();
	});

	it('remembers a scene asked for before unlock and stays silent at unlock', async () => {
		audio.playMusic('game'); // remembered, never applied: there is no context to apply it to
		await expect(audio.unlock()).resolves.toBeUndefined();
		expect(audio.ready).toBe(false);
		expect(() => audio.stopMusic()).not.toThrow();
	});
});

describe('a factory instance with an explicitly null context', () => {
	it('behaves exactly like the singleton: inert, silent, resolving', async () => {
		const engine = createCozyAudio({ ctxFactory: () => null });
		expect(engine.ready).toBe(false);
		expect(engine.muted).toBe(false);

		expect(() => {
			engine.playSfx('correct');
			engine.playMusic('home');
			engine.playMusic('game');
			engine.setMuted(true);
		}).not.toThrow();
		expect(engine.muted).toBe(true); // the flag moves even with no graph behind it
		expect(() => engine.setMuted(false)).not.toThrow();

		await expect(engine.unlock()).resolves.toBeUndefined();
		await expect(engine.unlock()).resolves.toBeUndefined(); // repeat gestures stay cheap
		expect(engine.ready).toBe(false);
		expect(() => engine.stopMusic()).not.toThrow();
	});

	it('keeps a pre-unlock scene without ever surfacing it as an error', async () => {
		const engine = createCozyAudio({ ctxFactory: () => null });
		engine.playMusic('home');
		await expect(engine.unlock()).resolves.toBeUndefined();
		expect(engine.ready).toBe(false);
		expect(engine.muted).toBe(false);
	});
});

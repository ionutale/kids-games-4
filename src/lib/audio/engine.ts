// The audio engine: one singleton that games, the shell and the settings screen talk to.
//
// Four rules shape it (spec + ADR-0001):
//   * Silent until the first gesture. The AudioContext is created inside `unlock()` and nowhere
//     else — iOS Safari will not hand out a running context before a tap, and creating one early
//     is how you get a suspended-context bug that only reproduces on a phone.
//   * Nothing throws outside a browser. Every global lookup is guarded, and a machine without
//     WebAudio gets a fully inert singleton rather than an error: importing this module in Node
//     is safe and every call is a no-op.
//   * Configuration survives the wait. `playMusic` before `unlock()` is remembered and applied the
//     moment the graph exists, so a screen may ask for its music before anyone has touched it.
//   * Gentle by construction. A 0.22 master, a short ramp on mute, and nothing that can pop.

import { createMusic } from './music';
import type { MusicHandle, MusicScene } from './music';
import { isSfxName, playSfx } from './sfx';
import type { SfxName } from './sfx';

export type { MusicScene, SfxName };

/** What the app can ask of the audio engine. */
export interface CozyAudio {
	/** True once the graph exists and the context is actually running. */
	readonly ready: boolean;
	/** Create and resume the AudioContext. Call from the first user gesture; safe to repeat. */
	unlock(): Promise<void>;
	playSfx(name: SfxName): void;
	playMusic(scene: MusicScene): void;
	stopMusic(): void;
	setMuted(muted: boolean): void;
	readonly muted: boolean;
}

export interface CozyAudioOptions {
	/** Where the AudioContext comes from. Injected by tests; defaults to the global constructor. */
	readonly ctxFactory?: () => AudioContext | null;
}

const MASTER_LEVEL = 0.22; // everything the engine plays sits under this
const MUTE_RAMP_S = 0.06; // long enough that muting cannot click, short enough to feel instant

/** The WebAudio constructor, or `null` where there is none (Node, SSR, an old browser). */
function audioContextCtor(): typeof AudioContext | null {
	if (typeof globalThis === 'undefined') return null;
	const scope = globalThis as {
		AudioContext?: typeof AudioContext;
		webkitAudioContext?: typeof AudioContext;
	};
	const ctor = scope.AudioContext ?? scope.webkitAudioContext;
	return typeof ctor === 'function' ? ctor : null;
}

/** Create a context from the global constructor, or `null` where there is none. */
function defaultCtxFactory(): AudioContext | null {
	const Ctor = audioContextCtor();
	return Ctor ? new Ctor() : null;
}

export function createCozyAudio(options?: CozyAudioOptions): CozyAudio {
	const ctxFactory = options?.ctxFactory ?? defaultCtxFactory;
	let ctx: AudioContext | null = null;
	let master: GainNode | null = null;
	let music: MusicHandle | null = null;
	/** The scene asked for before `unlock()`: applied the moment the graph exists. */
	let pendingScene: MusicScene | null = null;
	let muted = false;

	async function unlock(): Promise<void> {
		if (ctx) {
			// An interruption (iOS, a tab backgrounded for a long time) can leave a live context
			// suspended; a fresh gesture is the cue to ask for it back.
			if (ctx.state !== 'running') await ctx.resume().catch(() => undefined);
			return;
		}
		const context = ctxFactory();
		if (!context) return; // no WebAudio: stay inert, stay silent
		try {
			const out = context.createGain();
			out.gain.value = muted ? 0 : MASTER_LEVEL;
			out.connect(context.destination);
			ctx = context;
			master = out;
			await context.resume().catch(() => undefined);
			// Only now does a remembered scene become audible — never before the gesture.
			const scene = pendingScene;
			if (scene) {
				pendingScene = null;
				music = createMusic({ ctx: context, destination: out }, scene);
			}
		} catch {
			// A hostile or closed context must never surface as an error in a game screen. The
			// scene stays remembered, and because `ctx` is cleared the next gesture retries.
			const broken = music;
			music = null;
			broken?.stop();
			void context.close().catch(() => undefined);
			if (ctx === context) {
				ctx = null;
				master = null;
			}
		}
	}

	return {
		get ready(): boolean {
			return ctx !== null && ctx.state === 'running';
		},

		get muted(): boolean {
			return muted;
		},

		unlock,

		playSfx(name: SfxName): void {
			if (!ctx || !master || muted) return;
			if (!isSfxName(name)) return; // a name we do not own is silence, never a crash
			playSfx(name, { ctx, destination: master });
		},

		playMusic(scene: MusicScene): void {
			if (!ctx || !master) {
				pendingScene = scene; // remembered, applied at unlock
				return;
			}
			if (music) {
				music.setScene(scene); // a no-op when the scene is already playing
				return;
			}
			music = createMusic({ ctx, destination: master }, scene);
		},

		stopMusic(): void {
			const playing = music;
			music = null;
			pendingScene = null;
			playing?.stop(); // fades out over half a second, then unhooks itself
		},

		setMuted(next: boolean): void {
			if (muted === next) return;
			muted = next;
			if (!ctx || !master) return;
			const now = ctx.currentTime;
			master.gain.cancelScheduledValues(now);
			master.gain.setValueAtTime(master.gain.value, now);
			master.gain.linearRampToValueAtTime(next ? 0 : MASTER_LEVEL, now + MUTE_RAMP_S);
		}
	};
}

/** The one audio engine the app uses. Inert (and silent) until the first gesture unlocks it. */
export const audio: CozyAudio = createCozyAudio();

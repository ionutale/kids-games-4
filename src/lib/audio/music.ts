// The generative lullaby: a warm pad walking C - Am - F - G, sparse pentatonic plucks with a
// gentle echo, and (in the home scene only) a soft wind bed. Everything is booked ahead on the
// audio clock from a seeded PRNG, so the piece is endless, seamless and reproducible — no loops,
// no files, no `Math.random`.
//
// Two scenes, one continuous performance. Switching never restarts the music: the pad keeps
// playing, its filter brightens for `game`, and the wind bed fades out over half a second.
//
// Shape of the graph (everything ends up in `destination`, the engine's master bus):
//
//   pad voices (6 detuned triangles per chord) → pad filter (lowpass + slow LFO) ─┐
//   pluck voices (triangle, 1.2 s decay) ───────────────────────────────────────┼─ music out
//        └─ send ─→ feedback delay ─────────────────────────────────────────────┤
//   wind bed (filtered noise, gust LFO) ────────────────────────────────────────┘  (home only)

import { CHORDS, midiToFreq, mulberry32, PENTATONIC } from './synth';

/** The two musical moods the app asks for. */
export type MusicScene = 'home' | 'game';

/** Where the music is rendered: the live context plus the master bus to connect into. */
export interface MusicBus {
	readonly ctx: AudioContext;
	readonly destination: AudioNode;
}

/**
 * A running performance. `setScene` crossfades between moods; `stop` fades the whole thing out
 * and tears it down, after which the handle is dead — ask for a new one to play again.
 */
export interface MusicHandle {
	readonly scene: MusicScene;
	setScene(scene: MusicScene): void;
	stop(): void;
}

const MUSIC_LEVEL = 0.6; // the lullaby sits under the engine's 0.22 master

// Pad: three voices per chord (root, third, fifth), each one a detuned triangle pair. Six
// oscillators summing at unity would clip against the 0.22 master, so each voice is scaled: the
// pad peaks near 0.04 at the master output and the plucks (0.016) still poke through it.
const PAD_VOICE_LEVEL = 0.05;
const PAD_DETUNE_CENTS = 6; // the pair is ±6 cents apart: warmth, not chorus
const PAD_FILTER_HOME_HZ = 700; // the lowpass the brief asks for
const PAD_FILTER_GAME_HZ = 950; // `game` is the same pad, a little brighter
const PAD_FILTER_Q = 0.7;
const PAD_LFO_HZ = 0.05; // ~20 s per sweep: the pad breathes, it never pulses
const PAD_LFO_DEPTH_HZ = 220;
const PAD_VOICES_PER_CHORD = 3;
const CHORD_S = 8; // one chord every 8 s
const CHORD_FADE_S = 1.5; // neighbours overlap by this much, so a change reads as a breath

// Plucks: sparse, quiet, always in the pentatonic so they can never clash with the pad.
const PLUCK_GAP_MIN_S = 3;
const PLUCK_GAP_MAX_S = 7;
const PLUCK_PEAK = 0.12; // the ceiling the spec allows
const PLUCK_DECAY_S = 1.2;
const PLUCK_ATTACK_S = 0.012;
const PLUCK_FIRST_S = 1.5;
const DELAY_TIME_S = 0.34;
const DELAY_FEEDBACK = 0.32; // gentle: three audible echoes at most
const DELAY_LEVEL = 0.5;

// Wind bed: home scene only.
const WIND_LEVEL = 0.03;
const WIND_CUTOFF_HZ = 300;
const WIND_LFO_HZ = 0.07; // gusts, roughly every 14 s
const WIND_LFO_DEPTH = 0.014;

const CROSSFADE_S = 0.5; // scene changes ease over this long
const LOOKAHEAD_S = 4; // how far ahead the scheduler books on the audio clock
const TICK_MS = 250;
const RESUME_GRACE_S = 12; // an absence this long restarts the chord walk rather than replaying it
const NOISE_S = 2;
const NOISE_SEED = 20261009; // the wind, reseeded per performance
const PLUCK_SEED = 4711; // its own stream, so re-seeding the wind cannot reshuffle the plucks

const FLOOR = 0.0001; // exponential ramps cannot touch zero
const TAIL_S = 0.05; // stop a hair after the envelope ends, so nothing clicks

/** The one noise buffer every performance bakes: looped, and crossfaded head-into-tail. */
function bakeNoise(ctx: AudioContext): AudioBuffer {
	const length = Math.max(1, Math.round(ctx.sampleRate * NOISE_S));
	const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	const rnd = mulberry32(NOISE_SEED);
	for (let i = 0; i < length; i += 1) data[i] = rnd() * 2 - 1;
	const seam = Math.min(2048, Math.floor(length / 8));
	for (let i = 0; i < seam; i += 1) {
		const mix = i / seam;
		const at = length - seam + i;
		data[at] = (data[at] ?? 0) * mix + (data[i] ?? 0) * (1 - mix);
	}
	return buffer;
}

/** A ramp on an AudioParam that starts from wherever that param is right now. */
function rampTo(param: AudioParam, value: number, at: number, seconds: number): void {
	param.cancelScheduledValues(at);
	param.setValueAtTime(param.value, at);
	param.linearRampToValueAtTime(value, at + seconds);
}

/** The wind bed, once built. Rebuilt from scratch each time `home` takes over. */
interface WindBed {
	readonly source: AudioBufferSourceNode;
	readonly lowpass: BiquadFilterNode;
	readonly gain: GainNode;
	readonly lfo: OscillatorNode;
	readonly lfoDepth: GainNode;
}

export function createMusic(bus: MusicBus, scene: MusicScene): MusicHandle {
	const { ctx, destination } = bus;
	const pluckRnd = mulberry32(PLUCK_SEED);

	// The persistent layer: one pad filter, one echo, one output gain. Chords and plucks come and
	// go through them; they never change identity, which is why a scene swap never clicks.
	const out = ctx.createGain();
	out.gain.value = MUSIC_LEVEL;
	out.connect(destination);

	const padFilter = ctx.createBiquadFilter();
	padFilter.type = 'lowpass';
	padFilter.frequency.value = PAD_FILTER_HOME_HZ;
	padFilter.Q.value = PAD_FILTER_Q;
	padFilter.connect(out);

	const padLfo = ctx.createOscillator();
	padLfo.type = 'sine';
	padLfo.frequency.value = PAD_LFO_HZ;
	const padLfoDepth = ctx.createGain();
	padLfoDepth.gain.value = PAD_LFO_DEPTH_HZ;
	padLfo.connect(padLfoDepth);
	padLfoDepth.connect(padFilter.frequency);
	padLfo.start();

	const delay = ctx.createDelay(1);
	delay.delayTime.value = DELAY_TIME_S;
	const feedback = ctx.createGain();
	feedback.gain.value = DELAY_FEEDBACK;
	delay.connect(feedback);
	feedback.connect(delay);
	const send = ctx.createGain();
	send.gain.value = DELAY_LEVEL;
	send.connect(delay);
	delay.connect(out);

	const noise = bakeNoise(ctx);
	let wind: WindBed | null = null;

	// Scheduler state, all in audio-clock seconds.
	let current: MusicScene = scene;
	let startedAt = ctx.currentTime;
	let nextChord = 0;
	let nextPluckAt = startedAt + PLUCK_FIRST_S;
	let lastNow = -1; // -1 so the very first tick always books, whatever the clock reads

	/** Every live source, so `stop()` can silence the ones that have not fired yet. */
	const sources = new Set<AudioScheduledSourceNode>();

	/** Unhook a one-shot's nodes when it ends — on its own, or because we stopped it. */
	function releaseOnEnd(source: AudioScheduledSourceNode, ...nodes: AudioNode[]): void {
		source.onended = () => {
			sources.delete(source);
			for (const node of nodes) {
				try {
					node.disconnect();
				} catch {
					// Already unhooked.
				}
			}
		};
	}

	/**
	 * One chord: three notes, each a detuned triangle pair, sharing one trapezoid envelope so the
	 * neighbouring chords overlap without a dip in level.
	 */
	function bookChord(at: number, number: number): void {
		const notes = CHORDS[number % CHORDS.length] ?? CHORDS[0] ?? [60];
		const env = ctx.createGain();
		env.gain.setValueAtTime(FLOOR, at);
		env.gain.linearRampToValueAtTime(PAD_VOICE_LEVEL, at + CHORD_FADE_S);
		env.gain.setValueAtTime(PAD_VOICE_LEVEL, at + CHORD_S - CHORD_FADE_S);
		env.gain.linearRampToValueAtTime(FLOOR, at + CHORD_S);
		env.connect(padFilter);
		for (let i = 0; i < PAD_VOICES_PER_CHORD; i += 1) {
			const hz = midiToFreq(notes[i] ?? notes[0] ?? 60);
			for (const cents of [-PAD_DETUNE_CENTS, PAD_DETUNE_CENTS]) {
				const osc = ctx.createOscillator();
				osc.type = 'triangle';
				osc.frequency.value = hz;
				osc.detune.value = cents;
				osc.connect(env);
				osc.start(at);
				osc.stop(at + CHORD_S + TAIL_S);
				sources.add(osc);
				releaseOnEnd(osc, env);
			}
		}
	}

	/** One pluck: a pentatonic note, dry into the mix and into the gentle echo. */
	function bookPluck(at: number): void {
		const pool = current === 'game' ? PENTATONIC.slice(5) : PENTATONIC;
		const midi = pool[Math.floor(pluckRnd() * pool.length)] ?? 72;
		const hz = midiToFreq(midi) * (pluckRnd() < 0.25 ? 2 : 1); // a quarter of them an octave up
		const osc = ctx.createOscillator();
		osc.type = 'triangle';
		osc.frequency.value = hz;
		const env = ctx.createGain();
		env.gain.setValueAtTime(FLOOR, at);
		env.gain.exponentialRampToValueAtTime(PLUCK_PEAK, at + PLUCK_ATTACK_S);
		env.gain.exponentialRampToValueAtTime(FLOOR, at + PLUCK_DECAY_S);
		osc.connect(env);
		env.connect(out);
		env.connect(send);
		osc.start(at);
		osc.stop(at + PLUCK_DECAY_S + TAIL_S);
		sources.add(osc);
		releaseOnEnd(osc, env);
	}

	/** Build the wind bed if it is not there yet (`game` tears it down, so this runs again). */
	function ensureWind(): WindBed {
		if (wind) return wind;
		const source = ctx.createBufferSource();
		source.buffer = noise;
		source.loop = true;
		const lowpass = ctx.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.value = WIND_CUTOFF_HZ;
		lowpass.Q.value = 0.7;
		const gain = ctx.createGain();
		gain.gain.value = FLOOR;
		const lfo = ctx.createOscillator();
		lfo.type = 'sine';
		lfo.frequency.value = WIND_LFO_HZ;
		const lfoDepth = ctx.createGain();
		lfoDepth.gain.value = 0; // fades in with the level below
		lfo.connect(lfoDepth);
		lfoDepth.connect(gain.gain);
		source.connect(lowpass);
		lowpass.connect(gain);
		gain.connect(out);
		source.start();
		lfo.start();
		sources.add(source);
		sources.add(lfo);
		releaseOnEnd(source, lowpass, gain, lfo, lfoDepth);
		wind = { source, lowpass, gain, lfo, lfoDepth };
		return wind;
	}

	/** Ease the bed to `level`, gust LFO included (a gust on a silent bed is still audible). */
	function windLevel(bed: WindBed, level: number, now: number): void {
		rampTo(bed.gain.gain, level, now, CROSSFADE_S);
		rampTo(bed.lfoDepth.gain, level > 0 ? WIND_LFO_DEPTH : 0, now, CROSSFADE_S);
	}

	function fadeWindOut(): void {
		if (!wind) return;
		windLevel(wind, 0, ctx.currentTime);
		try {
			// The fade lands first, so stopping the source here is click-free.
			wind.source.stop(ctx.currentTime + CROSSFADE_S + TAIL_S);
		} catch {
			// Never started, or already stopped.
		}
		wind = null; // a later `home` rebuilds a fresh bed rather than reviving a stopped source
	}

	/**
	 * Book everything that starts inside the lookahead window.
	 *
	 * Three guards keep this honest on a device rather than in a test: a clock that has not moved
	 * means a suspended or closed context, and booking into one just piles up nodes that never
	 * play; an absence longer than {@link RESUME_GRACE_S} restarts the chord walk instead of
	 * resurrecting a backlog of chords that have already had their moment; and a chord whose
	 * moment has passed is skipped rather than booked late.
	 */
	function book(): void {
		const now = ctx.currentTime;
		const away = now - lastNow;
		if (away <= 0) return; // frozen clock: nothing to schedule, nothing booked
		lastNow = now;
		if (away > RESUME_GRACE_S) {
			startedAt = now;
			nextChord = 0;
			nextPluckAt = now + PLUCK_FIRST_S;
		}
		const horizon = now + LOOKAHEAD_S;
		while (startedAt + nextChord * CHORD_S < horizon) {
			const at = startedAt + nextChord * CHORD_S;
			const number = nextChord;
			nextChord += 1;
			if (at < now && number !== 0) continue; // its moment passed while we were away
			bookChord(at, number % CHORDS.length);
		}
		if (nextPluckAt < now) nextPluckAt = now + 0.5;
		while (nextPluckAt < horizon) {
			bookPluck(nextPluckAt);
			nextPluckAt += PLUCK_GAP_MIN_S + pluckRnd() * (PLUCK_GAP_MAX_S - PLUCK_GAP_MIN_S);
		}
	}

	if (scene === 'home') windLevel(ensureWind(), WIND_LEVEL, ctx.currentTime);
	book();
	const timer = setInterval(book, TICK_MS);

	let dead = false;

	return {
		get scene(): MusicScene {
			return current;
		},

		setScene(next: MusicScene): void {
			if (dead || next === current) return; // duplicate scene calls are no-ops
			const now = ctx.currentTime;
			current = next;
			// The pad never stops: only its brightness moves, over half a second.
			rampTo(
				padFilter.frequency,
				next === 'game' ? PAD_FILTER_GAME_HZ : PAD_FILTER_HOME_HZ,
				now,
				CROSSFADE_S
			);
			if (next === 'home') windLevel(ensureWind(), WIND_LEVEL, now);
			else fadeWindOut();
		},

		stop(): void {
			if (dead) return;
			dead = true;
			clearInterval(timer);
			const now = ctx.currentTime;
			rampTo(out.gain, FLOOR, now, CROSSFADE_S);
			const at = now + CROSSFADE_S + TAIL_S;
			for (const source of [...sources]) {
				try {
					source.stop(at);
				} catch {
					// Already stopped by an earlier teardown.
				}
			}
			wind = null;
			// The audio clock cannot schedule "unhook the persistent layer", and leaking a live
			// oscillator is worse than one wall-clock timer that outlives the fade by a frame.
			setTimeout(
				() => {
					for (const source of [...sources]) sources.delete(source);
					for (const node of [out, padFilter, padLfo, padLfoDepth, delay, feedback, send]) {
						try {
							node.disconnect();
						} catch {
							// Already unhooked.
						}
					}
				},
				Math.round(CROSSFADE_S * 1000) + 60
			);
		}
	};
}

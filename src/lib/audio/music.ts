// The cozy background music: a warm, gently bouncy kindergarten-morning tune in C major
// pentatonic. A marimba-ish melody hums a twelve-bar question-and-answer loop over a soft detuned
// pad, with a sine bass on beats 1 and 3 and the gentlest pulse in the building — a woodblock
// tick on the beat, a light shaker off it. The `home` scene adds a very quiet wind bed; `game`
// drops it and lifts the tempo a touch.
//
// Everything is booked ahead on the audio clock from a seeded PRNG, so the piece is endless,
// seamless and reproducible — no audio loops, no files, no `Math.random`.
//
// Two scenes, one continuous performance. Switching never restarts the music: the eighth-note
// grid is re-anchored on the new tempo just past the last step already booked, the pad brightens,
// and the wind bed fades out over half a second.
//
// Shape of the graph (everything ends up in `destination`, the engine's master bus):
//
//   melody voices (sine + one soft partial) → melody lowpass ─┬─ send ─→ feedback delay ─┐
//   bass voice (sine, chord root) ────────────────────────────┼─────────────────────────┼─ music out
//   woodblock tick (short sine blip) ─────────────────────────┤                         │
//   shaker (bandpassed noise burst) ──────────────────────────┤                         │
//   pad voices (3 detuned triangle pairs per chord) → lowpass ┴─ pad lowpass (slow LFO) ─┤
//   wind bed (filtered noise, gust LFO) ────────────────────────────────────────────────┘  (home only)

import {
	CHORDS,
	LOOP_BARS,
	STEPS_PER_BAR,
	barSeconds,
	bassMidi,
	chordIndexAtBar,
	graceNoteBelow,
	isBassStep,
	isHeldNote,
	melodyNoteAt,
	midiToFreq,
	mulberry32,
	ornamentAt,
	pulseAt,
	shakerOffset,
	stepSeconds,
	wrapStep
} from './synth';

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

const MUSIC_LEVEL = 0.6; // the tune sits under the engine's 0.22 master

// Tempo: `home` is the slow morning; `game` is the same tune a touch brighter and quicker.
const SCENE_TEMPO: Record<MusicScene, number> = { home: 96, game: 110 };

// Melody: the marimba that carries the tune. A 12 ms attack, a bell-ish decay and one soft
// partial two octaves up — a music box, not a synth lead.
const MELODY_PEAK = 0.22;
const MELODY_ATTACK_S = 0.012;
const MELODY_DECAY_S = 0.34;
const MELODY_HELD_DECAY_S = 0.9; // phrase endings ring out instead of ticking on
const MELODY_PARTIAL_GAIN = 0.14; // the one upper partial: music-box shimmer, never a whine
const MELODY_FILTER_HZ = 2400; // the one place the tune is kept from ever piercing
const GRACE_LEVEL = 0.45; // ornaments are decoration, never statements
const GRACE_DECAY_S = 0.16;
const ECHO_LEVEL = 0.6;
const ECHO_DECAY_S = 0.26;
const ECHO_MAX_MIDI = 84; // an octave echo that would go shrill simply does not play

// Bass: a soft sine on the chord root, and only on beats 1 and 3.
const BASS_PEAK = 0.16;
const BASS_ATTACK_S = 0.02;
const BASS_DECAY_S = 0.5;

// Pulse: never above 0.05, and the quietest layer here on purpose. A tick on the beat, a
// shaker off it — that alternation is the bounce of the whole piece.
const WOOD_PEAK = 0.05;
const WOOD_HZ = 740;
const WOOD_ATTACK_S = 0.006;
const WOOD_DECAY_S = 0.05;
const SHAKER_PEAK = 0.045;
const SHAKER_HZ = 6200;
const SHAKER_Q = 1.1;
const SHAKER_ATTACK_S = 0.004;
const SHAKER_DECAY_S = 0.055;
const SHAKER_WINDOW_S = 0.1; // how much of the baked noise one hit needs

// Pad: the warm detuned bed under the melody — deliberately quieter than the lullaby's was, so
// the tune leads. Six oscillators per chord summing at unity would clip against the 0.22 master.
const PAD_VOICE_LEVEL = 0.035;
const PAD_DETUNE_CENTS = 6; // the pair is ±6 cents apart: warmth, not chorus
const PAD_VOICES_PER_CHORD = 3;
const PAD_BARS = 2; // one chord every two bars
const PAD_FADE_S = 1.2; // neighbours overlap by this much, so a change reads as a breath
const PAD_FILTER_HOME_HZ = 700; // the lowpass the brief asks for
const PAD_FILTER_GAME_HZ = 1000; // `game` is the same pad, a little brighter
const PAD_FILTER_Q = 0.7;
const PAD_LFO_HZ = 0.05; // ~20 s per sweep: the pad breathes, it never pulses
const PAD_LFO_DEPTH_HZ = 220;

// Echo: one gentle delay on the melody alone, so a phrase leaves a soft shadow behind it.
const DELAY_TIME_S = 0.28;
const DELAY_FEEDBACK = 0.28;
const DELAY_LEVEL = 0.35;

// Wind bed: `home` only, and much quieter than it used to be — it is a hint of weather, not a
// texture the ear listens to.
const WIND_LEVEL = 0.018;
const WIND_CUTOFF_HZ = 300;
const WIND_LFO_HZ = 0.07; // gusts, roughly every 14 s
const WIND_LFO_DEPTH = 0.009;

const CROSSFADE_S = 0.5; // scene changes ease over this long
const REANCHOR_S = 0.06; // the new tempo takes hold one sixtieth of a beat after the switch
const START_S = 0.1; // the first note lands a hair after the graph is built
const LOOKAHEAD_S = 1.5; // how far ahead the scheduler books on the audio clock
const TICK_MS = 200;
const LATE_S = 0.05; // a step this far in the past has had its moment; skip it rather than book it
const RESUME_GRACE_S = 12; // an absence this long restarts the tune rather than replaying it
const NOISE_S = 2;
const NOISE_SEED = 20261009; // the wind and the shaker, reseeded per performance
const ORNAMENT_SEED = 8451; // one stream per loop iteration, so the evolution is reproducible

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

/** One step of the loop, resolved into the notes and the ticks it plays. */
interface StepPlan {
	/** The melody note on this step, or `null` where the tune breathes. */
	readonly note: number | null;
	/** True when this note ends a phrase and rings out instead of ticking on. */
	readonly held: boolean;
	/** A quick lower neighbour just before {@link note}, or none. */
	readonly grace: number | null;
	/** The same note an octave up, ringing with it, or none. */
	readonly echo: number | null;
	/** The bass note on beats 1 and 3, or none. */
	readonly bass: number | null;
	/** Which tick of the pulse falls on this step. */
	readonly pulse: 'wood' | 'shaker';
}

/** Which step of `bar` carries its first note — where a grace note falls from. */
function firstNoteStep(bar: number): number {
	for (let step = 0; step < STEPS_PER_BAR; step += 1) {
		if (melodyNoteAt(bar, step) !== null) return step;
	}
	return -1;
}

/** Which step of `bar` carries its last note — where an octave echo rings from. */
function lastNoteStep(bar: number): number {
	for (let step = STEPS_PER_BAR - 1; step >= 0; step -= 1) {
		if (melodyNoteAt(bar, step) !== null) return step;
	}
	return -1;
}

/**
 * Resolve one whole loop into its 96 steps. Called once per loop iteration with a seed derived
 * from the iteration number, so the tune keeps its shape while the ornaments reshuffle — never
 * fatiguing — and so the same seed always produces the same performance.
 */
function buildPlan(iteration: number): StepPlan[] {
	const rnd = mulberry32(ORNAMENT_SEED + iteration);
	const plan: StepPlan[] = [];
	for (let bar = 0; bar < LOOP_BARS; bar += 1) {
		const ornament = ornamentAt(bar, rnd());
		const graceStep = ornament === 'grace' ? firstNoteStep(bar) : -1;
		const echoStep = ornament === 'echo' ? lastNoteStep(bar) : -1;
		const bassRoot = CHORDS[chordIndexAtBar(bar)]?.[0] ?? 48;
		for (let step = 0; step < STEPS_PER_BAR; step += 1) {
			const absolute = bar * STEPS_PER_BAR + step;
			const note = melodyNoteAt(bar, step);
			plan.push({
				note,
				held: isHeldNote(bar, step),
				grace: step === graceStep && note !== null ? graceNoteBelow(note) : null,
				echo: step === echoStep && note !== null && note + 12 <= ECHO_MAX_MIDI ? note + 12 : null,
				bass: isBassStep(absolute) ? bassMidi(bassRoot) : null,
				pulse: pulseAt(absolute)
			});
		}
	}
	return plan;
}

export function createMusic(bus: MusicBus, scene: MusicScene): MusicHandle {
	const { ctx, destination } = bus;

	// The persistent layer: one output gain, two filters, one echo. Steps come and go through
	// them; they never change identity, which is why a scene swap never clicks.
	const out = ctx.createGain();
	out.gain.value = MUSIC_LEVEL;
	out.connect(destination);

	const melodyFilter = ctx.createBiquadFilter();
	melodyFilter.type = 'lowpass';
	melodyFilter.frequency.value = MELODY_FILTER_HZ;
	melodyFilter.Q.value = 0.5;
	melodyFilter.connect(out);

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

	// Scheduler state, all in audio-clock seconds. `origin` is where step 0 of the grid sits;
	// every other time in the performance is `origin + index * stepDuration`.
	let current: MusicScene = scene;
	let origin = ctx.currentTime + START_S;
	let nextStep = 0; // the first step that has not been booked yet
	let nextChordBar = 0; // the first bar whose chord has not been booked yet
	let loopIteration = 0;
	let plan = buildPlan(0);
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
	 * One marimba note: a sine for the body, one soft partial two octaves up for the music-box
	 * shimmer, both through the melody lowpass and into the gentle echo. `peak` and `decay` are
	 * the two knobs that separate a melody note from an ornament.
	 */
	function bookMarimba(at: number, midi: number, peak: number, decay: number): void {
		const hz = midiToFreq(midi);
		const osc = ctx.createOscillator();
		osc.type = 'sine';
		osc.frequency.value = hz;
		const partial = ctx.createOscillator();
		partial.type = 'sine';
		partial.frequency.value = hz * 4;
		const partialGain = ctx.createGain();
		partialGain.gain.value = MELODY_PARTIAL_GAIN;
		const env = ctx.createGain();
		env.gain.setValueAtTime(FLOOR, at);
		env.gain.linearRampToValueAtTime(Math.max(peak, FLOOR * 2), at + MELODY_ATTACK_S);
		env.gain.exponentialRampToValueAtTime(FLOOR, at + decay);
		osc.connect(env);
		partial.connect(partialGain);
		partialGain.connect(env);
		env.connect(melodyFilter);
		env.connect(send);
		for (const voice of [osc, partial]) {
			voice.start(at);
			voice.stop(at + decay + TAIL_S);
			sources.add(voice);
		}
		releaseOnEnd(osc, env, partialGain);
		releaseOnEnd(partial);
	}

	/** The bass: one soft sine on the chord root, low and quiet. */
	function bookBass(at: number, midi: number): void {
		const osc = ctx.createOscillator();
		osc.type = 'sine';
		osc.frequency.value = midiToFreq(midi);
		const env = ctx.createGain();
		env.gain.setValueAtTime(FLOOR, at);
		env.gain.linearRampToValueAtTime(BASS_PEAK, at + BASS_ATTACK_S);
		env.gain.exponentialRampToValueAtTime(FLOOR, at + BASS_DECAY_S);
		osc.connect(env);
		env.connect(out);
		osc.start(at);
		osc.stop(at + BASS_DECAY_S + TAIL_S);
		sources.add(osc);
		releaseOnEnd(osc, env);
	}

	/** The woodblock: a short sine blip on the beat. A tick, not a drum. */
	function bookWood(at: number): void {
		const osc = ctx.createOscillator();
		osc.type = 'sine';
		osc.frequency.value = WOOD_HZ;
		const env = ctx.createGain();
		env.gain.setValueAtTime(FLOOR, at);
		env.gain.linearRampToValueAtTime(WOOD_PEAK, at + WOOD_ATTACK_S);
		env.gain.exponentialRampToValueAtTime(FLOOR, at + WOOD_DECAY_S);
		osc.connect(env);
		env.connect(out);
		osc.start(at);
		osc.stop(at + WOOD_DECAY_S + TAIL_S);
		sources.add(osc);
		releaseOnEnd(osc, env);
	}

	/** The shaker: a bandpassed slice of the baked noise, at a different spot every step. */
	function bookShaker(at: number, step: number): void {
		const source = ctx.createBufferSource();
		source.buffer = noise;
		const bandpass = ctx.createBiquadFilter();
		bandpass.type = 'bandpass';
		bandpass.frequency.value = SHAKER_HZ;
		bandpass.Q.value = SHAKER_Q;
		const env = ctx.createGain();
		env.gain.setValueAtTime(FLOOR, at);
		env.gain.linearRampToValueAtTime(SHAKER_PEAK, at + SHAKER_ATTACK_S);
		env.gain.exponentialRampToValueAtTime(FLOOR, at + SHAKER_DECAY_S);
		source.connect(bandpass);
		bandpass.connect(env);
		env.connect(out);
		source.start(at, shakerOffset(step, NOISE_S, SHAKER_WINDOW_S));
		source.stop(at + SHAKER_DECAY_S + TAIL_S);
		sources.add(source);
		releaseOnEnd(source, bandpass, env);
	}

	/**
	 * One chord: three notes, each a detuned triangle pair, sharing one trapezoid envelope so
	 * neighbouring chords crossfade instead of dipping to silence between them.
	 */
	function bookChord(at: number, index: number, duration: number): void {
		const notes = CHORDS[index] ?? CHORDS[0] ?? [60];
		const env = ctx.createGain();
		env.gain.setValueAtTime(FLOOR, at);
		env.gain.linearRampToValueAtTime(PAD_VOICE_LEVEL, at + PAD_FADE_S);
		env.gain.setValueAtTime(PAD_VOICE_LEVEL, at + duration - PAD_FADE_S);
		env.gain.linearRampToValueAtTime(FLOOR, at + duration);
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
				osc.stop(at + duration + TAIL_S);
				sources.add(osc);
				releaseOnEnd(osc, env);
			}
		}
	}

	/** Everything one step of the grid plays: its ticks, its bass and its melody. */
	function bookStep(step: number, at: number, now: number): void {
		const entry = plan[wrapStep(step)];
		if (!entry) return;
		if (entry.pulse === 'wood') bookWood(at);
		else bookShaker(at, step);
		if (entry.bass !== null) bookBass(at, entry.bass);
		if (entry.note !== null) {
			bookMarimba(at, entry.note, MELODY_PEAK, entry.held ? MELODY_HELD_DECAY_S : MELODY_DECAY_S);
		}
		// The grace note falls a sixteenth before the note it decorates — never earlier than now,
		// or a catch-up booking would try to play in the past.
		if (entry.grace !== null) {
			const lead = Math.max(at - stepSeconds(SCENE_TEMPO[current]) / 2, now);
			bookMarimba(lead, entry.grace, MELODY_PEAK * GRACE_LEVEL, GRACE_DECAY_S);
		}
		if (entry.echo !== null) bookMarimba(at, entry.echo, MELODY_PEAK * ECHO_LEVEL, ECHO_DECAY_S);
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
	 * play; an absence longer than {@link RESUME_GRACE_S} restarts the tune instead of resurrecting
	 * a backlog of steps that have already had their moment; and a step whose moment has passed is
	 * skipped rather than booked late.
	 */
	function book(): void {
		const now = ctx.currentTime;
		const away = now - lastNow;
		if (away <= 0) return; // frozen clock: nothing to schedule, nothing booked
		lastNow = now;
		if (away > RESUME_GRACE_S) {
			origin = now;
			nextStep = 0;
			nextChordBar = 0;
			loopIteration = 0;
			plan = buildPlan(0);
		}
		const stepDur = stepSeconds(SCENE_TEMPO[current]);
		const horizon = now + LOOKAHEAD_S;
		while (origin + nextStep * stepDur < horizon) {
			const at = origin + nextStep * stepDur;
			const step = nextStep;
			nextStep += 1;
			if (at < now - LATE_S) continue; // its moment passed while we were away
			bookStep(step, at, now);
			// The plan is per loop iteration, so a fresh set of ornaments waits just past the seam.
			if (wrapStep(step + 1) === 0) {
				loopIteration += 1;
				plan = buildPlan(loopIteration);
			}
		}
		const barDur = barSeconds(SCENE_TEMPO[current]);
		while (origin + nextChordBar * barDur < horizon) {
			const at = origin + nextChordBar * barDur;
			const bar = nextChordBar;
			nextChordBar += PAD_BARS;
			if (at < now - LATE_S) continue;
			// A chord outlasts its two bars by one fade, so neighbours crossfade instead of dipping
			// to silence between them.
			bookChord(at, chordIndexAtBar(bar), barDur * PAD_BARS + PAD_FADE_S);
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
			const previous = current;
			current = next;
			// Re-anchor the grid on the new tempo, starting after the last step that has already
			// been booked. Booking the new grid any earlier would interleave it with the steps the
			// old tempo put in the lookahead window, and the pulse would stutter for a second.
			const oldStepDur = stepSeconds(SCENE_TEMPO[previous]);
			const stepDur = stepSeconds(SCENE_TEMPO[next]);
			const lastBooked = origin + (nextStep - 1) * oldStepDur;
			origin = Math.max(now + REANCHOR_S, lastBooked + stepDur) - nextStep * stepDur;
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
					for (const node of [
						out,
						melodyFilter,
						padFilter,
						padLfo,
						padLfoDepth,
						delay,
						feedback,
						send
					]) {
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

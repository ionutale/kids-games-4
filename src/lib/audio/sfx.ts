// The cozy SFX set: every sound in the app, synthesized on demand. No files, no buffers, no
// instruments beyond an oscillator and a gentle envelope.
//
// Three rules shape this module (spec: "no harsh attack, nothing sudden"):
//   * Every cue is at most 900 ms long — the longest (`celebrate`) retires by ~830 ms.
//   * Every voice is a sine or a triangle with a soft exponential decay, so nothing clicks or
//     snaps, and nothing needs a compressor to behave.
//   * The recipes are a table keyed by {@link SfxName}, so a new cue is one entry and TypeScript
//     refuses to let a name go without a sound.

/** The interaction cues. Games name an event; this module owns what it sounds like. */
export type SfxName = 'tap' | 'correct' | 'wrong' | 'hint' | 'unlock' | 'celebrate' | 'ui';

/** Where a cue is rendered: the live context plus the master bus to connect into. */
export interface SfxBus {
	readonly ctx: AudioContext;
	readonly destination: AudioNode;
}

const ATTACK_S = 0.012; // slow enough to read as a soft blow, fast enough to feel immediate
const TAIL_S = 0.04; // stop a hair after the envelope ends, so silence comes click-free
const FLOOR = 0.0001; // exponential ramps cannot touch zero

/** One enveloped oscillator: optional upward/downward glide, dry into the master bus. */
function voice(
	bus: SfxBus,
	at: number,
	from: number,
	to: number,
	dur: number,
	peak: number,
	type: OscillatorType
): void {
	const { ctx, destination } = bus;
	if (typeof ctx.createOscillator !== 'function') return;
	const osc = ctx.createOscillator();
	osc.type = type;
	osc.frequency.setValueAtTime(Math.max(from, 1), at);
	if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), at + dur * 0.8);
	const env = ctx.createGain();
	env.gain.setValueAtTime(FLOOR, at);
	env.gain.exponentialRampToValueAtTime(Math.max(peak, FLOOR * 2), at + ATTACK_S);
	env.gain.exponentialRampToValueAtTime(FLOOR, at + dur);
	osc.connect(env);
	env.connect(destination);
	osc.start(at);
	osc.stop(at + dur + TAIL_S);
	// Voices are one-shots; unhook on end so a long session does not accumulate dead nodes.
	osc.onended = () => {
		try {
			osc.disconnect();
			env.disconnect();
		} catch {
			// Already torn down — nothing to release.
		}
	};
}

/**
 * The recipes. `at` is the audio-clock time the cue starts, so a multi-note cue stays in time
 * however busy the main thread is when it fires.
 */
const RECIPES: Record<SfxName, (bus: SfxBus, at: number) => void> = {
	// A numeral bubble is pressed: one small wooden tap.
	tap: (bus, at) => voice(bus, at, 660, 660, 0.12, 0.06, 'sine'),

	// Right answer: two rising notes, E5 then A5 — a smile, not a trumpet.
	correct: (bus, at) => {
		voice(bus, at, 659.26, 659.26, 0.15, 0.06, 'triangle');
		voice(bus, at + 0.13, 880, 880, 0.15, 0.05, 'triangle');
	},

	// Wrong answer: a quiet falling sigh (Bb3 → G#3). Never a buzzer, never punished.
	wrong: (bus, at) => voice(bus, at, 233.08, 207.65, 0.3, 0.15, 'sine'),

	// Muguri nudges: a quiet bell pair, 880 Hz with a soft octave-and-a-fifth shimmer on top.
	hint: (bus, at) => {
		voice(bus, at, 880, 880, 0.4, 0.05, 'sine');
		voice(bus, at, 1320, 1320, 0.4, 0.02, 'sine');
	},

	// A level opens: a little C-E-G arpeggio, the "unlocked" moment.
	unlock: (bus, at) => {
		voice(bus, at, 523.25, 523.25, 0.15, 0.06, 'triangle');
		voice(bus, at + 0.15, 659.26, 659.26, 0.15, 0.06, 'triangle');
		voice(bus, at + 0.3, 783.99, 783.99, 0.15, 0.06, 'triangle');
	},

	// Level complete: a C major arpeggio with a soft high shimmer over the top.
	celebrate: (bus, at) => {
		const notes = [523.25, 659.26, 783.99, 1046.5]; // C5 E5 G5 C6
		for (let i = 0; i < notes.length; i += 1) {
			voice(bus, at + i * 0.12, notes[i] ?? 523.25, notes[i] ?? 523.25, 0.22, 0.07, 'triangle');
		}
		// Shimmer: two quiet partials, the air above the arpeggio. Retires with it (~830 ms).
		voice(bus, at + 0.38, 1567.98, 1567.98, 0.45, 0.018, 'sine');
		voice(bus, at + 0.38, 2093, 2093, 0.45, 0.012, 'sine');
	},

	// Ordinary UI movement: the quietest thing in the set.
	ui: (bus, at) => voice(bus, at, 740, 740, 0.08, 0.04, 'sine')
};

/** Play one cue onto `bus`. Inert if the context is gone or not really an AudioContext. */
export function playSfx(name: SfxName, bus: SfxBus): void {
	const recipe = RECIPES[name];
	if (!bus || !recipe) return;
	const { ctx } = bus;
	if (!ctx || typeof ctx.currentTime !== 'number') return;
	try {
		recipe(bus, ctx.currentTime + 0.012);
	} catch {
		// A dying context must never surface as an error in a game screen.
	}
}

/** Whether `name` is one of the cues this module can actually play. */
export function isSfxName(name: string): name is SfxName {
	return Object.hasOwn(RECIPES, name);
}

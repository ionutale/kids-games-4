// Pure synthesis maths: the one place that turns musical intent into numbers. No WebAudio nodes
// live here, so every function is trivially testable and safe to import from Node.
//
// Three layers, in order: the primitives (tuning, the ladder, the progression), the clock (how
// tempo becomes seconds), and the tune itself (the grid, the twelve-bar form, the melody table
// and the ornaments). `music.ts` only ever arranges these into nodes.

/** Deterministic PRNG (mulberry32). Every generative choice in the engine comes from one of these. */
export function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** MIDI note number → frequency in Hz (equal temperament, A4 = 69 = 440 Hz). */
export function midiToFreq(midi: number): number {
	return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * Two octaves of C major pentatonic (C D E G A), midi 60–81. The sparse plucks pick from here:
 * no semitones means no note can clash with the pad, however unlucky the seed gets.
 */
export const PENTATONIC: readonly number[] = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];

/**
 * The progression the tune walks: C - Am - F - G, one chord every two bars, voiced as ascending
 * four-note chords between midi 48 and 72. The pad plays the first three of each (root, third,
 * fifth); the top note stays in the voicing so a later tweak can lift it without touching the
 * progression. Twelve bars of 4/4 take six chords, so the loop goes C - Am - F - G - C - Am and
 * turns around back to C with no seam.
 */
export const CHORDS: readonly (readonly number[])[] = [
	[60, 64, 67, 71], // C
	[57, 60, 64, 67], // Am
	[53, 57, 60, 65], // F
	[55, 59, 62, 67] // G
];

/** Keep `x` inside `[min, max]`. Bounds may arrive in either order. */
export function clamp(x: number, min: number, max: number): number {
	if (min > max) return clamp(x, max, min);
	return Math.min(max, Math.max(min, x));
}

// ---------------------------------------------------------------------------
// The clock
// ---------------------------------------------------------------------------
// Musical time, in audio-clock seconds. The tune runs on a grid of eighth notes; every duration
// in `music.ts` comes from one of these three functions plus the scene's tempo.

/** Eighth notes per beat — the grid the melody and the pulse share. */
export const STEPS_PER_BEAT = 2;

/** Beats per bar. Straight 4/4, no swing: kindergarten morning, not a jazz club. */
export const BEATS_PER_BAR = 4;

/** Steps (eighths) in one bar. */
export const STEPS_PER_BAR = STEPS_PER_BEAT * BEATS_PER_BAR;

/** Seconds per beat at `bpm` — 120 bpm is half a second, 94 bpm is a slow walk. */
export function beatSeconds(bpm: number): number {
	return 60 / Math.max(bpm, 1);
}

/** Seconds per step (one eighth) at `bpm`. */
export function stepSeconds(bpm: number, stepsPerBeat: number = STEPS_PER_BEAT): number {
	return beatSeconds(bpm) / Math.max(stepsPerBeat, 1);
}

/** Seconds per bar at `bpm`. */
export function barSeconds(bpm: number, beatsPerBar: number = BEATS_PER_BAR): number {
	return beatSeconds(bpm) * Math.max(beatsPerBar, 1);
}

// ---------------------------------------------------------------------------
// The grid and the form
// ---------------------------------------------------------------------------

/** Bars in one section: a question, an answer, the question returned. */
export const BARS_PER_SECTION = 4;

/** Sections in one loop of the tune. */
export const SECTIONS_PER_LOOP = 3;

/** Bars in one loop — twelve bars of 4/4, which is 27–31 s across the two scene tempos. */
export const LOOP_BARS = BARS_PER_SECTION * SECTIONS_PER_LOOP;

/** Steps in one loop. */
export const LOOP_STEPS = LOOP_BARS * STEPS_PER_BAR;

/** Non-negative remainder, so a late or negative index lands inside the loop. */
function mod(x: number, m: number): number {
	return ((Math.floor(x) % m) + m) % m;
}

/** Wrap a step index — negative, or many loops past — into `[0, LOOP_STEPS)`. */
export function wrapStep(step: number): number {
	return mod(step, LOOP_STEPS);
}

/** Wrap a bar index into `[0, LOOP_BARS)`. */
export function wrapBar(bar: number): number {
	return mod(bar, LOOP_BARS);
}

/**
 * What the pulse plays on a step: a soft woodblock tick on the beat, a light shaker off it.
 * The bounce of the whole piece lives in this alternation, so it never varies.
 */
export function pulseAt(step: number): 'wood' | 'shaker' {
	return mod(step, STEPS_PER_BEAT) === 0 ? 'wood' : 'shaker';
}

/** True on beats 1 and 3 of the bar — the only two places the bass ever lands. */
export function isBassStep(step: number): boolean {
	return mod(step, STEPS_PER_BEAT * 2) === 0;
}

/**
 * The chord sounding during `bar`: one chord every two bars, walking {@link CHORDS}. Wrapped at
 * the loop so bar 12 is bar 0 again — the harmony is closed, with no seam where it repeats.
 */
export function chordIndexAtBar(bar: number): number {
	return mod(Math.floor(wrapBar(bar) / 2), CHORDS.length);
}

/**
 * Fold a chord root into a register a phone speaker can actually reproduce. The progression
 * sits between midi 53 and 60, and an octave below that dips under 100 Hz where a small speaker
 * gives up — so the bass lands on 48–55 (C3–G3) instead, low and warm but still audible.
 */
export function bassMidi(root: number, low = 45, high = 55): number {
	const note = Math.round(root);
	if (!Number.isFinite(note)) return low;
	let folded = note;
	while (folded > high) folded -= 12;
	while (folded < low) folded += 12;
	return folded;
}

// ---------------------------------------------------------------------------
// The tune
// ---------------------------------------------------------------------------
// One bar of the melody, one entry per eighth, `null` where the tune breathes. Every note comes
// from PENTATONIC, so the melody can never clash with the pad underneath it — however unlucky
// the seed gets.

type MelodyBar = readonly (number | null)[];

/** The question: up, up, and back down to `la` — unfinished, on purpose. */
const QUESTION: readonly MelodyBar[] = [
	[72, null, 74, null, 76, null, 79, null],
	[null, 79, null, 76, null, 74, null, 72],
	[74, null, 76, null, 79, null, 81, null],
	[79, null, 76, null, 74, null, 69, null]
];

/** The answer: the same shape walked back down, landing on `do` and then resting a beat. */
const ANSWER: readonly MelodyBar[] = [
	[76, null, 74, null, 72, null, 69, null],
	[null, 72, null, 74, null, 76, null, 79],
	[81, null, 79, null, 76, null, 74, null],
	[72, null, null, null, null, null, null, null]
];

/** The question returned: recognisably the same tune, closing on the tonic. */
const RETURNED: readonly MelodyBar[] = [
	[76, null, 74, null, 72, null, null, 74],
	[null, 76, null, 79, null, 81, null, 79],
	[72, null, 74, null, 76, null, null, 79],
	[79, null, 76, null, 74, null, 72, null]
];

/** The three sections of the loop, in the order they play. */
export const MELODY_SECTIONS: readonly (readonly MelodyBar[])[] = [QUESTION, ANSWER, RETURNED];

/** The note the tune plays at `bar`:`step`, or `null` where it breathes. */
export function melodyNoteAt(bar: number, step: number): number | null {
	const wrapped = wrapBar(bar);
	const section = MELODY_SECTIONS[Math.floor(wrapped / BARS_PER_SECTION)];
	const row = section?.[wrapped % BARS_PER_SECTION];
	return row?.[mod(step, STEPS_PER_BAR)] ?? null;
}

/** How many rest-eighths after a note make it a phrase ending rather than a passing note. */
export const HELD_REST_STEPS = 2;

/** True when a note is the last of its phrase: it rings out instead of ticking on. */
export function isHeldNote(bar: number, step: number): boolean {
	if (melodyNoteAt(bar, step) === null) return false;
	for (let ahead = 1; ahead <= HELD_REST_STEPS; ahead += 1) {
		const forward = step + ahead;
		const barAhead = bar + Math.floor(forward / STEPS_PER_BAR);
		if (melodyNoteAt(barAhead, forward) !== null) return false;
	}
	return true;
}

// ---------------------------------------------------------------------------
// The ornaments
// ---------------------------------------------------------------------------

/** How often a bar carries an ornament at all. Most bars stay plain, on purpose. */
export const ORNAMENT_CHANCE = 0.45;

/** The two ornaments: a quick lower neighbour before a note, or that note's octave above. */
export type Ornament = 'grace' | 'echo';

/**
 * The ornament a bar plays, decided by one seeded roll. The last bar of a section never gets one
 * — the tune has to arrive clean — and a roll at or above {@link ORNAMENT_CHANCE} leaves the bar
 * plain, so the loop keeps its shape however many times it comes round.
 */
export function ornamentAt(bar: number, roll: number): Ornament | null {
	if (wrapBar(bar) % BARS_PER_SECTION === BARS_PER_SECTION - 1) return null;
	if (roll >= ORNAMENT_CHANCE) return null;
	return roll < ORNAMENT_CHANCE / 2 ? 'grace' : 'echo';
}

/** The note a grace note falls from: the next step down the pentatonic ladder, or nothing. */
export function graceNoteBelow(midi: number): number | null {
	for (let i = PENTATONIC.length - 1; i >= 0; i -= 1) {
		const note = PENTATONIC[i];
		if (note !== undefined && note < midi) return note;
	}
	return null;
}

/**
 * Where in the baked noise buffer a shaker hit plays. Multiplying the step by the golden ratio
 * spreads the hits evenly and never repeats inside one loop, so weeks of listening do not teach
 * a kid the pattern of the shaker.
 */
export function shakerOffset(step: number, noiseS: number, windowS: number): number {
	const golden = Math.floor(step) * 0.6180339887498949;
	const spot = golden - Math.floor(golden); // fractional part, always inside [0, 1)
	return spot * Math.max(0, noiseS - windowS);
}

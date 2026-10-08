// Pure synthesis maths: the one place that turns musical intent into numbers. No WebAudio nodes
// live here, so every function is trivially testable and safe to import from Node.

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
 * The lullaby progression: C - Am - F - G, one chord per 8 seconds, voiced as ascending four-note
 * chords between midi 48 and 72. The pad plays the first three of each (root, third, fifth); the
 * top note stays in the voicing so a later tweak can lift it without touching the progression.
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

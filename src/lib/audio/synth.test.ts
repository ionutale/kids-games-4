// Pure-helper tests for the synth layer. Everything here is deterministic: no WebAudio, no
// timers, no globals — which is exactly why the maths lives in its own module.
import { describe, expect, it } from 'vitest';
import { CHORDS, clamp, midiToFreq, mulberry32, PENTATONIC } from './synth';

describe('midiToFreq', () => {
	it('puts A4 at 440 Hz', () => {
		expect(midiToFreq(69)).toBeCloseTo(440, 6);
	});

	it('doubles every 12 semitones', () => {
		expect(midiToFreq(81)).toBeCloseTo(midiToFreq(69) * 2, 6);
		expect(midiToFreq(57)).toBeCloseTo(440 / 2, 6);
	});

	it('puts middle C where the tuning says it is', () => {
		expect(midiToFreq(60)).toBeCloseTo(261.6255653, 5);
	});
});

describe('PENTATONIC', () => {
	it('is the two-octave C major pentatonic ladder used by the plucks', () => {
		expect([...PENTATONIC]).toEqual([60, 62, 64, 67, 69, 72, 74, 76, 79, 81]);
	});

	it('is evenly spaced by whole steps and minor thirds, with no semitone clashes', () => {
		const gaps = PENTATONIC.slice(1).map((note, i) => note - (PENTATONIC[i] ?? 0));
		expect(gaps).toEqual([2, 2, 3, 2, 3, 2, 2, 3, 2]);
	});

	it('stays inside a playable register for every note', () => {
		for (const note of PENTATONIC) {
			expect(note).toBeGreaterThanOrEqual(48);
			expect(note).toBeLessThanOrEqual(84);
		}
	});
});

describe('CHORDS', () => {
	it('is the C - Am - F - G progression the lullaby walks through', () => {
		expect(CHORDS.map((notes) => [...notes])).toEqual([
			[60, 64, 67, 71],
			[57, 60, 64, 67],
			[53, 57, 60, 65],
			[55, 59, 62, 67]
		]);
	});

	it('voices every chord between midi 48 and 72', () => {
		for (const chord of CHORDS) {
			expect(chord.length).toBe(4);
			for (const note of chord) {
				expect(note).toBeGreaterThanOrEqual(48);
				expect(note).toBeLessThanOrEqual(72);
			}
		}
	});

	it('ascends inside each voicing so the pad never jumps down a voice', () => {
		for (const chord of CHORDS) {
			const sorted = [...chord].sort((a, b) => a - b);
			expect([...chord]).toEqual(sorted);
		}
	});
});

describe('mulberry32', () => {
	it('returns the same stream for the same seed', () => {
		const a = mulberry32(42);
		const b = mulberry32(42);
		const first = [a(), a(), a(), a()];
		const second = [b(), b(), b(), b()];
		expect(first).toEqual(second);
	});

	it('stays inside [0, 1)', () => {
		const rnd = mulberry32(7);
		for (let i = 0; i < 500; i += 1) {
			const value = rnd();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});

	it('does not reuse one stream for two seeds', () => {
		const a = mulberry32(1);
		const b = mulberry32(2);
		expect(a()).not.toBe(b());
	});
});

describe('clamp', () => {
	it('leaves values inside the range alone', () => {
		expect(clamp(0.5, 0, 1)).toBe(0.5);
		expect(clamp(700, 0, 1000)).toBe(700);
	});

	it('pulls values back to the bounds', () => {
		expect(clamp(-3, 0, 1)).toBe(0);
		expect(clamp(9, 0, 1)).toBe(1);
	});

	it('handles inverted arguments by keeping min and max meaningful', () => {
		expect(clamp(0.5, 0.4, 0.6)).toBe(0.5);
		expect(clamp(0.1, 0.4, 0.6)).toBe(0.4);
		expect(clamp(0.9, 0.4, 0.6)).toBe(0.6);
	});
});

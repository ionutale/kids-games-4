// Pure-helper tests for the synth layer. Everything here is deterministic: no WebAudio, no
// timers, no globals — which is exactly why the maths lives in its own module.
import { describe, expect, it } from 'vitest';
import {
	CHORDS,
	BARS_PER_SECTION,
	BEATS_PER_BAR,
	LOOP_BARS,
	LOOP_STEPS,
	ORNAMENT_CHANCE,
	PENTATONIC,
	SECTIONS_PER_LOOP,
	STEPS_PER_BAR,
	STEPS_PER_BEAT,
	barSeconds,
	bassMidi,
	beatSeconds,
	chordIndexAtBar,
	clamp,
	graceNoteBelow,
	isBassStep,
	isHeldNote,
	melodyNoteAt,
	MELODY_SECTIONS,
	midiToFreq,
	mulberry32,
	ornamentAt,
	pulseAt,
	shakerOffset,
	stepSeconds,
	wrapBar,
	wrapStep
} from './synth';

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

// ---------------------------------------------------------------------------
// The clock
// ---------------------------------------------------------------------------

describe('the constants the form is built from', () => {
	it('pin the eighth-note grid', () => {
		expect(STEPS_PER_BEAT).toBe(2);
		expect(BEATS_PER_BAR).toBe(4);
		expect(STEPS_PER_BAR).toBe(8);
	});

	it('pin the twelve-bar, three-section loop', () => {
		expect(BARS_PER_SECTION).toBe(4);
		expect(SECTIONS_PER_LOOP).toBe(3);
		expect(LOOP_BARS).toBe(12);
		expect(LOOP_STEPS).toBe(96);
	});

	it('spell a loop that lasts half a minute at the scene tempos', () => {
		// 12 bars of 4/4 at 94 bpm ≈ 30.6 s, at 108 bpm ≈ 26.7 s — the brief's 24–32 s window.
		const home = barSeconds(94) * LOOP_BARS;
		const game = barSeconds(108) * LOOP_BARS;
		expect(home).toBeGreaterThan(24);
		expect(home).toBeLessThan(32);
		expect(game).toBeGreaterThan(24);
		expect(game).toBeLessThan(32);
	});
});

describe('beatSeconds', () => {
	it('puts 120 bpm at half a second a beat', () => {
		expect(beatSeconds(120)).toBe(0.5);
	});

	it('reads the two scene tempos as a slow, walkable pulse', () => {
		expect(beatSeconds(94)).toBeCloseTo(0.6383, 4); // home
		expect(beatSeconds(108)).toBeCloseTo(0.5556, 4); // game
	});

	it('never divides by a zero or negative tempo', () => {
		expect(Number.isFinite(beatSeconds(0))).toBe(true);
		expect(Number.isFinite(beatSeconds(-5))).toBe(true);
	});
});

describe('stepSeconds', () => {
	it('splits a beat into the eighths the melody and the pulse share', () => {
		expect(stepSeconds(94)).toBeCloseTo(0.31915, 5);
		expect(stepSeconds(108)).toBeCloseTo(0.27778, 5);
	});

	it('honours a different subdivision when a section asks for one', () => {
		expect(stepSeconds(94, 4)).toBeCloseTo(beatSeconds(94) / 4, 10);
	});
});

describe('barSeconds', () => {
	it('is four beats of the same tempo', () => {
		expect(barSeconds(94)).toBeCloseTo(2.5532, 4);
	});

	it('stays consistent with the step grid, which is what the scheduler assumes', () => {
		expect(stepSeconds(94) * STEPS_PER_BAR).toBeCloseTo(barSeconds(94), 10);
		expect(stepSeconds(108) * STEPS_PER_BAR).toBeCloseTo(barSeconds(108), 10);
	});
});

// ---------------------------------------------------------------------------
// The grid and the form
// ---------------------------------------------------------------------------

describe('wrapStep', () => {
	it('wraps any step index into one loop, however it arrives', () => {
		expect(wrapStep(0)).toBe(0);
		expect(wrapStep(5)).toBe(5);
		expect(wrapStep(LOOP_STEPS)).toBe(0);
		expect(wrapStep(LOOP_STEPS + 5)).toBe(5);
		expect(wrapStep(LOOP_STEPS * 7 + 3)).toBe(3);
	});

	it('pulls negative indices back into the loop rather than out of the array', () => {
		expect(wrapStep(-1)).toBe(LOOP_STEPS - 1);
		expect(wrapStep(-5)).toBe(LOOP_STEPS - 5);
	});
});

describe('wrapBar', () => {
	it('wraps bar indices into the twelve-bar form', () => {
		expect(wrapBar(0)).toBe(0);
		expect(wrapBar(11)).toBe(11);
		expect(wrapBar(12)).toBe(0);
		expect(wrapBar(13)).toBe(1);
		expect(wrapBar(-1)).toBe(11);
	});
});

describe('pulseAt', () => {
	it('ticks the woodblock on the beat and the shaker off it', () => {
		for (let step = 0; step < LOOP_STEPS; step += 1) {
			expect(pulseAt(step)).toBe(step % 2 === 0 ? 'wood' : 'shaker');
		}
	});

	it('keeps the alternation going across the loop seam and backwards', () => {
		expect(pulseAt(LOOP_STEPS - 1)).toBe('shaker');
		expect(pulseAt(LOOP_STEPS)).toBe('wood');
		expect(pulseAt(-1)).toBe('shaker');
	});

	it('puts eight ticks in a bar, four of them on the beat', () => {
		const ticks = Array.from({ length: STEPS_PER_BAR }, (_, step) => pulseAt(step));
		expect(ticks.filter((t) => t === 'wood')).toHaveLength(4);
		expect(ticks.filter((t) => t === 'shaker')).toHaveLength(4);
	});
});

describe('isBassStep', () => {
	it('lands on beats 1 and 3 and nowhere else', () => {
		for (let step = 0; step < STEPS_PER_BAR; step += 1) {
			expect(isBassStep(step)).toBe(step % 4 === 0);
		}
	});

	it('closes on a bar boundary, so the pattern never drifts against the tune', () => {
		expect(LOOP_STEPS % (STEPS_PER_BEAT * 2)).toBe(0);
		expect(isBassStep(LOOP_STEPS)).toBe(true);
	});
});

describe('chordIndexAtBar', () => {
	it('walks one chord every two bars, C - Am - F - G - C - Am', () => {
		const walk = Array.from({ length: LOOP_BARS }, (_, bar) => chordIndexAtBar(bar));
		expect(walk).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 0, 0, 1, 1]);
	});

	it('comes home to C at the loop point, so the harmony has no seam', () => {
		expect(chordIndexAtBar(LOOP_BARS)).toBe(chordIndexAtBar(0));
		expect(chordIndexAtBar(LOOP_BARS + 1)).toBe(chordIndexAtBar(1));
		expect(chordIndexAtBar(-2)).toBe(chordIndexAtBar(LOOP_BARS - 2));
	});

	it('names a real chord for every bar of the loop', () => {
		for (let bar = 0; bar < LOOP_BARS; bar += 1) {
			expect(CHORDS[chordIndexAtBar(bar)]).toBeDefined();
		}
	});
});

describe('bassMidi', () => {
	it('folds the progression into a register a phone speaker can reproduce', () => {
		expect(bassMidi(60)).toBe(48); // C
		expect(bassMidi(57)).toBe(45); // Am
		expect(bassMidi(53)).toBe(53); // F, already in range
		expect(bassMidi(55)).toBe(55); // G
	});

	it('drops an octave from above and adds one from below', () => {
		expect(bassMidi(64, 45, 55)).toBe(52);
		expect(bassMidi(30, 45, 55)).toBe(54);
	});

	it('keeps every root of the progression inside the warm low-mid band', () => {
		for (const chord of CHORDS) {
			const note = bassMidi(chord[0] ?? 60);
			expect(note).toBeGreaterThanOrEqual(45);
			expect(note).toBeLessThanOrEqual(55);
		}
	});

	it('answers nonsense with the bottom of the range rather than looping forever', () => {
		expect(bassMidi(Number.NaN)).toBe(45);
	});
});

// ---------------------------------------------------------------------------
// The tune
// ---------------------------------------------------------------------------

/** Every note the loop plays, in order, with the rests left out. */
function tuneNotes(): number[] {
	const notes: number[] = [];
	for (let bar = 0; bar < LOOP_BARS; bar += 1) {
		for (let step = 0; step < STEPS_PER_BAR; step += 1) {
			const note = melodyNoteAt(bar, step);
			if (note !== null) notes.push(note);
		}
	}
	return notes;
}

describe('MELODY_SECTIONS', () => {
	it('is three sections of four bars of eight eighths', () => {
		expect(MELODY_SECTIONS).toHaveLength(3);
		for (const section of MELODY_SECTIONS) {
			expect(section).toHaveLength(4);
			for (const bar of section) expect(bar).toHaveLength(8);
		}
	});
});

describe('melodyNoteAt', () => {
	it('asks a question first: rising, and ending on la, unfinished', () => {
		expect(melodyNoteAt(0, 0)).toBe(72); // starts on do
		expect(melodyNoteAt(2, 6)).toBe(81); // the peak of the question
		expect(melodyNoteAt(3, 6)).toBe(69); // lands on la, not do, and then breathes
		expect(melodyNoteAt(3, 7)).toBeNull();
	});

	it('answers it by walking back down and resting on the tonic', () => {
		expect(melodyNoteAt(4, 0)).toBe(76); // the answer begins where the question left off
		expect(melodyNoteAt(6, 0)).toBe(81); // and climbs to the peak once more
		expect(melodyNoteAt(7, 0)).toBe(72); // do: the answer arrives
		expect(melodyNoteAt(7, 4)).toBeNull(); // and then breathes
	});

	it('returns the question and closes the loop on the tonic', () => {
		expect(melodyNoteAt(11, 6)).toBe(72);
		expect(melodyNoteAt(11, 7)).toBeNull();
		expect(melodyNoteAt(LOOP_BARS, 0)).toBe(melodyNoteAt(0, 0)); // seamless at the seam
	});

	it('only ever plays notes from the pentatonic ladder', () => {
		for (let bar = 0; bar < LOOP_BARS; bar += 1) {
			for (let step = 0; step < STEPS_PER_BAR; step += 1) {
				const note = melodyNoteAt(bar, step);
				if (note !== null) expect(PENTATONIC).toContain(note);
			}
		}
	});

	it('stays in the warm marimba register, never high enough to pierce', () => {
		const notes = tuneNotes();
		expect(notes.length).toBeGreaterThan(30);
		expect(Math.min(...notes)).toBeGreaterThanOrEqual(67); // G4
		expect(Math.max(...notes)).toBeLessThanOrEqual(81); // A5
	});

	it('never leaps further than a fifth, so a five-year-old could hum it', () => {
		const notes = tuneNotes();
		for (let i = 1; i < notes.length; i += 1) {
			expect(Math.abs((notes[i] ?? 0) - (notes[i - 1] ?? 0))).toBeLessThanOrEqual(7);
		}
	});

	it('never plays two melody notes in a row, so the marimba always breathes', () => {
		for (let bar = 0; bar < LOOP_BARS; bar += 1) {
			for (let step = 0; step < STEPS_PER_BAR - 1; step += 1) {
				if (melodyNoteAt(bar, step) === null) continue;
				expect(melodyNoteAt(bar, step + 1)).toBeNull();
			}
		}
	});

	it('lets a phrase carry over the bar line only into the next beat, never mid-beat', () => {
		// Bar 1 ends on do and bar 2 opens on re: a phrase may run on across the bar line, but it
		// always arrives on a beat, so the pulse underneath never fights the tune.
		expect(melodyNoteAt(1, 7)).toBe(72);
		expect(melodyNoteAt(2, 0)).toBe(74);
	});

	it('plays at most one melody note per beat, so the marimba never runs', () => {
		for (let bar = 0; bar < LOOP_BARS; bar += 1) {
			let notes = 0;
			for (let beat = 0; beat < BEATS_PER_BAR; beat += 1) {
				const onBeat = melodyNoteAt(bar, beat * STEPS_PER_BEAT) !== null;
				const offBeat = melodyNoteAt(bar, beat * STEPS_PER_BEAT + 1) !== null;
				expect(onBeat && offBeat).toBe(false); // never two notes inside one beat
				if (onBeat || offBeat) notes += 1;
			}
			expect(notes).toBeGreaterThanOrEqual(1); // every bar sings
			expect(notes).toBeLessThanOrEqual(BEATS_PER_BAR); // and never more than a note a beat
		}
	});

	it('keeps every bar singing, so the tune never falls silent for a whole bar', () => {
		for (let bar = 0; bar < LOOP_BARS; bar += 1) {
			let notes = 0;
			for (let step = 0; step < STEPS_PER_BAR; step += 1) {
				if (melodyNoteAt(bar, step) !== null) notes += 1;
			}
			expect(notes).toBeGreaterThanOrEqual(1);
			expect(notes).toBeLessThanOrEqual(6); // a wall of notes is not cozy
		}
	});
});

describe('isHeldNote', () => {
	it('rings out the note the answer lands on', () => {
		expect(isHeldNote(7, 0)).toBe(true);
	});

	it('does not ring out a note that is followed by another one', () => {
		expect(isHeldNote(0, 0)).toBe(false);
		expect(isHeldNote(0, 2)).toBe(false);
		expect(isHeldNote(1, 1)).toBe(false);
	});

	it('looks across the bar line before deciding', () => {
		expect(isHeldNote(3, 6)).toBe(false); // bar 3 ends on la, bar 4 starts on mi
		expect(isHeldNote(11, 6)).toBe(false); // the loop seam restarts the tune on do
	});

	it('never calls a rest a held note', () => {
		for (let bar = 0; bar < LOOP_BARS; bar += 1) {
			for (let step = 0; step < STEPS_PER_BAR; step += 1) {
				if (melodyNoteAt(bar, step) === null) expect(isHeldNote(bar, step)).toBe(false);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// The ornaments
// ---------------------------------------------------------------------------

describe('ornamentAt', () => {
	it('leaves most bars plain, on purpose', () => {
		for (let bar = 0; bar < LOOP_BARS; bar += 1) {
			expect(ornamentAt(bar, ORNAMENT_CHANCE + 0.01)).toBeNull();
			expect(ornamentAt(bar, 0.9)).toBeNull();
			expect(ornamentAt(bar, 1)).toBeNull();
		}
	});

	it('never ornaments a landing bar, whatever the roll', () => {
		for (const bar of [3, 7, 11]) {
			for (const roll of [0, 0.1, 0.2, ORNAMENT_CHANCE - 0.001, 0.5, 0.99]) {
				expect(ornamentAt(bar, roll)).toBeNull();
			}
		}
	});

	it('splits the ornament band in two: grace notes low, echoes high', () => {
		expect(ornamentAt(0, 0)).toBe('grace');
		expect(ornamentAt(0, ORNAMENT_CHANCE / 2 - 0.001)).toBe('grace');
		expect(ornamentAt(0, ORNAMENT_CHANCE / 2)).toBe('echo');
		expect(ornamentAt(0, ORNAMENT_CHANCE - 0.001)).toBe('echo');
	});

	it('decorates at most a third of the bars over many rolls', () => {
		let decorated = 0;
		const rolls = 400;
		for (let i = 0; i < rolls; i += 1) {
			if (ornamentAt(0, i / rolls) !== null) decorated += 1;
		}
		expect(decorated / rolls).toBeCloseTo(ORNAMENT_CHANCE, 2);
	});
});

describe('graceNoteBelow', () => {
	it('falls to the next step down the pentatonic ladder', () => {
		expect(graceNoteBelow(72)).toBe(69);
		expect(graceNoteBelow(79)).toBe(76);
		expect(graceNoteBelow(81)).toBe(79);
	});

	it('has nothing to fall from below the bottom of the ladder', () => {
		expect(graceNoteBelow(60)).toBeNull();
		expect(graceNoteBelow(40)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// The shaker
// ---------------------------------------------------------------------------

describe('shakerOffset', () => {
	it('spreads the hits across the noise buffer with no audible pattern', () => {
		const spots = Array.from({ length: 8 }, (_, step) => shakerOffset(step, 2, 0.1));
		expect(spots[0]).toBe(0);
		expect(new Set(spots).size).toBe(8);
		for (const spot of spots) {
			expect(spot).toBeGreaterThanOrEqual(0);
			expect(spot).toBeLessThanOrEqual(2 - 0.1);
		}
	});

	it('is deterministic, so the same seed always sounds the same', () => {
		expect(shakerOffset(3, 2, 0.1)).toBe(shakerOffset(3, 2, 0.1));
		expect(shakerOffset(97, 2, 0.1)).toBe(shakerOffset(97, 2, 0.1));
	});

	it('does not line the hits up the same way on the next loop round', () => {
		const first = Array.from({ length: 8 }, (_, step) => shakerOffset(step, 2, 0.1));
		const second = Array.from({ length: 8 }, (_, step) => shakerOffset(step + 96, 2, 0.1));
		const repeats = second.filter((spot, i) => Math.abs(spot - (first[i] ?? -1)) < 0.01);
		expect(repeats).toHaveLength(0);
	});

	it('stays at zero when the window would swallow the whole buffer', () => {
		expect(shakerOffset(5, 0.05, 0.1)).toBe(0);
		expect(shakerOffset(0, 2, 0)).toBe(0);
	});
});

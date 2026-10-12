# Feelings Faces — design spec (game #4, milestone 4)

Date: 2026-10-12 · Status: awaiting owner review · Base spec: `2026-10-08-cozy-nook-design.md` · Branch: `milestone-4`

## Goal

Game #4 of Cozy Nook: **emotional recognition for ages 4–7** in the same cozy garden world — offline-first PWA, four languages (it / ro / en / de), no reading required to play. Kids match faces, then read little situations, then tell subtle feelings apart.

**Owner decisions (locked):**

- Core mechanic = **mixed progression** — match the face (L1–2) → situation → face (L3–7) → subtle feelings (L8–10).
- Cast = **Muguri + one friend** — the friend is a **mouse** (working docs name _Mimo_; the UI stays wordless). A mouse keeps the emotion adjectives grammatically consistent across all four languages (masculine in Italian and Romanian: _il topo_, _șoricelul_) and does not clash with the six existing avatar animals.

## Core loop

- **Match the face (L1–2):** a big face (~140 px) is shown; the kid taps the identical expression among the choices. No question sentence; the prompt line says "Find the same face!".
- **Situation → face (L3–7):** a small flat vignette (~9 scenes, e.g. balloon drifting away) plus "How does {who} feel?" → the kid taps the face that fits.
- **Subtle feelings (L8–10):** same situation flow, but the choices are the confusable pairs — scared vs surprised, angry vs sad, calm vs happy.
- **Correct:** sparkles + the face cheers + "Yes!", advance (family timing). **Wrong:** gentle wiggle + "Try again!" ~1 s, retry — never punishing, never red.
- **Hints:** the family's 3-stage system (nudge → strong → reveal); the reveal **names the emotion** for vocabulary ("It's happy! Tap it.").
- **Level** = 5 rounds; level map, unlock, progress dots, LevelComplete + confetti mirror the family exactly.

## Curriculum

| Level | Mode      | Choices | Emotions / notes                            |
| ----- | --------- | ------- | ------------------------------------------- |
| 1     | match     | 2       | happy vs sad (the most distinct pair)       |
| 2     | match     | 3       | + angry                                     |
| 3     | situation | 3       | happy / sad / angry scenes                  |
| 4     | situation | 3       | + scared                                    |
| 5     | situation | 3       | + surprised, + sleepy (all six in rotation) |
| 6     | situation | 4       |                                             |
| 7     | situation | 4       | both characters alternate                   |
| 8     | subtle    | 3       | scared vs surprised focus                   |
| 9     | subtle    | 4       | angry vs sad · calm vs happy                |
| 10    | mixed     | 4       | everything                                  |

**Emotions (6):** happy · sad · angry · scared · surprised · sleepy (calm).

**Generation rules** (seeded/deterministic, tested like the family):

- Exactly N choices per round (2 / 3 / 4 by level); all distinct emotions; the target present exactly once.
- **Low levels never pair confusable emotions** (scared+surprised, angry+sad, calm+happy are separated until L8+, where they become the point).
- Match rounds: target emotion + distractors; situation rounds: scene → its emotion is the target; **no consecutive repeated scene or target emotion**; unique where the pool allows.
- Both characters alternate across rounds; L7+ may mix.

## Cast & art

- **Muguri** gains 4 new poses: `sad`, `angry`, `scared`, `surprised` (cheer = happy, sleepy = calm already exist). Additive only — existing poses untouched.
- **`Mimo.svelte`** — the mouse friend, all 6 emotions (+ idle), face-focused, same face grammar and soft garden palette per `ART-STYLE.md`.
- **`FeelingScene.svelte`** — ~9 small flat vignettes (one prop `scene`): balloon-away, fallen ice-cream, gift, storm cloud, spilled cup, broken toy, hug, bedtime, pop-out surprise. Simple object-based pictures, no text, not countable-looking.
- Target face renders big; option faces in a row (≥ 64 px taps, aria labels "Muguri — happy" localized).
- **Two artist dispatches (DeepSeek V4.1 Flash)** can run in parallel: (a) Muguri poses + `Mimo.svelte`; (b) `FeelingScene.svelte`.

## Prompt & feedback details

- Question: `feelings_question({ who })` — "How does {who} feel?" with `who` = `feelings_who_muguri` ("Muguri") or `feelings_who_mouse` ("the mouse" / "il topo" / "șoricelul" / "die Maus"). Predicative emotion adjectives agree because both characters are masculine in it/ro (German predicative does not inflect).
- Match-mode prompt: `feelings_match` — "Find the same face!".
- Bottom line: `feelings_tap` — "Tap the right face".
- Emotion names (6 keys) double as aria labels and the hint-reveal vocabulary.

## Reuse & plumbing (verified family patterns)

- `src/lib/games/registry.ts` — add `{ id: 'feelings-faces', href: '/play/feelings-faces', accent: 'leaf', icon: 'face' }`; the `icon` union gains `'face'`.
- Home: new icon branch renders Muguri's happy face for `'face'` **plus the `TITLES`/`DESCS` map entries** (lesson learned twice).
- Routes mirror the family: `/play/feelings-faces` (map) + `/play/feelings-faces/[level]` (field).
- `rules.ts` + tests and `session.svelte.ts` mirror the family; `save.ts` untouched (per-gameId).
- Audio: existing sfx and scenes reused as-is. No new music.
- i18n: ~16 new keys × 4 languages.

## Non-goals

Voice narration; more characters; multi-emotion scenes; new music; drag interaction; games 5+.

## Verification

- Gate per wave: `check` / `test` / `build` / `lint`; browser pass (match round, situation round, subtle round, wrong/correct paths, unlock, deep-link to a locked level).
- Rules tests: choice count/distinctness, target present, **no confusable pairs below L8**, subtle pairs at L8+, scene↔emotion mapping, no consecutive repeats, determinism.
- Screenshots of Muguri's new poses + `Mimo` + scenes at the size ladder; in-game stills for owner review.

## Open questions

None — resolved by owner: mixed progression; Muguri + one friend (mouse).

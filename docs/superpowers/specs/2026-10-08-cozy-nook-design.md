# Cozy Nook — Design

**Date:** 2026-10-08 · **Status:** approved · **Plan:** docs/superpowers/plans/2026-10-08-cozy-nook-milestone-1.md

## Overview

Cozy Nook is a mobile-first web app (installable PWA) of calm learning games for kids aged 5–8. It is fully offline, keeps all data on the device (no accounts, no analytics, no runtime network calls), and speaks Italian, Romanian, English, and German (device locale wins, Italian fallback, switcher in settings). Hosted on Vercel from a fresh GitHub repo (`ionutale/kids-games-4`), built with SvelteKit 3 + Svelte 5 runes + TypeScript + pnpm, static SPA build.

## Product rules → implementation

- **Art:** hand-built HTML/CSS/SVG only; canvas only where it earns it (confetti, particles). Zero in-app raster; the only PNGs are PWA icons rasterized from SVG at build time.
- **Sound:** 100% procedural WebAudio (see ADR-0001) — generative calm lullaby (warm pad, sparse pentatonic plucks, soft noise bed), cozy SFX set: `tap, correct, wrong, hint, unlock, celebrate, ui`. Mute toggle. iOS-safe: silent until first gesture. Music ducks under future speech.
- **Voice narration:** deferred to milestone 1.5. Qwen3-TTS covers it/en/de but not Romanian; a Romanian audition decides RO handling. Architecture is silent-aware: missing narration = silence, never an error.
- **Never stuck, never punished:** wrong tap = gentle wiggle + soft low chime; no red X, no buzzer, no timer. Staged hints: nudge → strong hint → reveal. Muguri help button always on screen.
- **Celebrations:** sparkle burst + chime + Muguri cheer per correct answer; full-screen confetti + music sting + level-complete card per finished level.
- **Levels:** ten per game; completion = all rounds finished; next level unlocks permanently per profile; level map with replay for any unlocked level.

## Shell (shared by every game)

- **Home:** cozy illustrated scene; Muguri hosts; one large tile per game plus a "coming soon" spot; music continues across screens; settings (sound, language, profiles) behind a 3-second press Parent Gate.
- **Profiles:** first run asks name + animal avatar (owl, fox, bear, bunny, cat, hedgehog); picker auto-skips when only one profile exists; per-profile versioned save in localStorage (`cozy-nook-save`, version 1).
- **Game module pattern:** each game = pure testable rules + level config + Svelte view + message keys + audio-event mapping, registered in one games registry; shared services (audio, hints, celebration, save) come from `$lib`.

## Game 1 — Counting ("Count the Fruit")

Loop: fruits appear; the kid counts them and taps the matching numeral bubble. 5 rounds per level. Tap-to-count assist from level 5 (each fruit tap ticks a counter); hint stages apply as above.

| Level | Count | Layout  | Choices | Kinds | Tight distractors |
| ----- | ----- | ------- | ------- | ----- | ----------------- |
| 1     | 1–3   | row     | 3       | 1     | no                |
| 2     | 1–4   | row     | 3       | 1     | no                |
| 3     | 1–5   | row     | 3       | 1     | no                |
| 4     | 2–6   | cluster | 3       | 1     | no                |
| 5     | 1–8   | scatter | 3       | 1     | no (assist)       |
| 6     | 2–10  | scatter | 3       | 2     | no (assist)       |
| 7     | 1–12  | scatter | 3       | 2     | yes               |
| 8     | 1–15  | scatter | 3       | 2     | yes               |
| 9     | 3–18  | scatter | 3       | 3     | yes               |
| 10    | 5–20  | scatter | 3       | 3     | yes               |

> _Update 2026-10-09 (owner feedback): every level offers exactly 3 numeral choices. Fruit kinds rotate per level (L2 pears, L5 grapes, …). Fruits and avatars have happy/plain/sad moods; the counting field smiles on a correct answer and looks sad on a wrong one. The mascot is now **Muguri**, a little sprout (the owl "Bufi" remains a profile avatar); game graphics mirror Muguri's garden palette._

Art: ten SVG fruits (ported and repolished from kids-games-3), wooden numeral bubbles, cozy garden scene.

## Wave 1 (build order) and backlog

1. Counting · 2. Color Match · 3. Acorn Addition · 4. Feelings Faces · 5. Peekaboo Pairs · 6. Brush Along · 7. Dress the Weather.

Backlog worlds: Numbers & Math · Letters & Words (wave 2 opens: Letter Friends, First Sounds — all four languages) · Colors & World · Thinking & Logic · Time & My Day · Care & Habits · Feelings & Calm · Music & Rhythm. Full brainstorm list lives in the session record; ~33 ideas.

## Reuse map (all adapted; originals untouched)

- kids-games-3 → level/unlock logic, progress shape, confetti, fruit SVGs, Paraglide it/ro/en/de scaffold, static SvelteKit config shape.
- cozy-forest-village / cozy-jigsaw → design tokens and palette, WebAudio engine patterns.
- music-player-pwa → service worker policy, update toast, iOS install hint, icon-generation script.
- kids-time-game → parent gate / install gate patterns, versioned storage envelope (reference only).

## Non-goals for milestone 1

Voice narration (1.5), stars/badges, games 2–7 (their wave follows this base), remote sync, analytics, 3D/2.5D.

## Docs

- `GLOSSARY.md` — project vocabulary.
- ADRs: `docs/adr/0001` procedural audio · `0002` relationship to kids-games-3 · `0003` hand-rolled service worker.

# Color Match — Portal drag revision

Date: 2026-10-25 · Status: approved after prototype · Base spec: `2026-10-11-color-match-design.md` · Branch: `feature/color-match-portal`

## Why this revision

The original Color Match screen asked the question in text (“Which balloon is blue?”) and relied on a spoken/screen-reader prompt for kids who cannot read it yet. Owner feedback: the voice-over is unpleasant, the screen feels like “read or listen, then tap,” and the target balloon next to Muguri was easy to read as another choice rather than as the question.

A throwaway prototype tested three packages on the real level route — Muguri + tap, card + carry, portal + drag — with a hidden target and a peekaboo reveal. The portal + drag package won. The hidden target did not: it made the first attempt a guess, so the target is now visible from the start. The prototype also proved the action cue is the missing piece, not the target itself.

## Goal

Make Color Match playable **without reading or narration**: the question is a target balloon held inside a garden portal, and the answer is the matching balloon dragged into that portal. The caption stays as a small secondary line for grown-ups and screen readers.

## Core loop

- **Question:** the portal holds the always-visible target balloon. The caption (“Which balloon is blue?”) sits below it.
- **Answer:** drag a field balloon into the portal. A plain tap on a field balloon also answers, as a fallback for small hands, keyboard users, and assistive tech.
- **Correct:** the chosen balloon flies into the portal, sparkles burst at the arch, the target balloon nuzzles, and “Yes!” appears. The round advances after 1.4 s.
- **Wrong:** the chosen balloon wiggles and looks sad for 1 s; the portal and target stay steady. The round stays open.
- **Level:** five rounds; completion, unlocking, and the celebration card are unchanged.

## Action cue

- A ghost hand and a dashed neutral balloon appear in the clear bottom band of the field.
- The hand drags the dashed balloon toward the portal while the portal pulses.
- It appears once after 6 s of idle on the first round, and once after the first miss of a round. It is a demonstration, never a real answer; it does not reveal which field balloon is correct.
- After the cue has been shown, the staged answer hint takes over: the correct balloon glows after 4 misses and pulses after 6 misses.

## What changed from the old screen

- Replaced the prompt row (Muguri + target balloon + question + help button) with the portal, Muguri, and the caption.
- Replaced tap-the-match with drag-into-the-portal as the primary gesture; tap remains a fallback.
- Removed the text hint panel and the Muguri help button from Color Match. Help is now visual: the action cue, the glow, and the pulse. Other games keep their existing hint UI.
- The target balloon is always visible. There is no peekaboo cloud and no hidden-target state.
- The field keeps a clear bottom band for the action cue and keeps balloons inside the mobile field.

## Unchanged

- Curriculum: ten levels, five rounds per level, the same color pools, modes, choice counts, and deterministic generation.
- Target set and shade/near-neighbor difficulty.
- Celebration timing, unlocking, save shape, profile handling, and level-complete card.
- No new audio, no narration, no raster assets, no runtime network calls.

## Accessibility & motion

- The target balloon exposes `Target: blue` (localized) as its accessible name; the caption remains normal text.
- Field balloons are buttons with localized color names; tap answers, drag is an enhancement.
- Tap targets ≥ 64 px; choices keep luminance separation.
- The ghost hand and dashed balloon are `aria-hidden`.
- Everything obeys the global `prefers-reduced-motion` switch; the ghost hand becomes a static cue and the portal/flight animations collapse.

## Non-goals

Voice narration; balloon patterns; new music; remote sync; stars/badges; games 5+; changing the curriculum or generation rules.

## Verification

- Gate: `check` / `test` / `build` / `lint`.
- Browser pass on a phone viewport: correct drag, wrong drag, tap fallback, idle cue, miss cue, glow/pulse, round advance, level complete, replay, level map unlock, offline sanity.
- Check all four locales for the caption and target label.

## Open questions

- Portal glow intensity: currently a strong gold halo; tune after a real-device pass.
- Whether Color Match should keep a visual-only help affordance (the automatic cue currently plays once); watch whether kids who join mid-level ever miss it.

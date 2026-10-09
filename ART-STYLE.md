# Cozy Nook — Art & Motion Style

The single reference for every visual asset in this app. **Artist of record:** DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`) unless the owner says otherwise — every asset report names its artist. **Motion north-star:** _Wurstel e Sogni_ (`../restaurant-manager-game`, read-only) — study its `src/lib/components/art/*.svelte` for easing and stagger; never modify that project.

## 1. Principles

- Cozy, warm, hand-drawn storybook feel: soft shapes, no harsh angles, nothing loud.
- **One family:** everything must read as drawn by one hand — consistent line weight, one shading recipe, one face grammar.
- **Legible small first:** the help button is 28 px — a silhouette must be recognizable there; detail only pays above 64 px.
- **Never countable:** decorations (ground, tufts, shimmer, dust) must never look like things to count — edge-only, ≤0.45 opacity, `aria-hidden`, `pointer-events:none`, behind content.
- **Reduced motion is sacred:** every animation dies gracefully under the global `prefers-reduced-motion` rule.

## 2. Color

- Source of truth: `src/lib/styles/tokens.css` (`--cn-*`). SVG presentation attributes can't read CSS vars reliably cross-browser, so components may carry **inline hex copies — they must mirror the token values**. When a token value changes, grep the whole `src/` for the old hex and sync every copy (components, icon.svg → `pnpm icons`).
- Palette intent: **sunlit garden** — cream paper, cocoa ink, vivid-but-soft leaf, warm accents. Not neon, not gray.
- Fruit **identity colors stay distinct** (apple red, banana yellow…) — that is the color-teaching point.
- Decorative gradient stops that are not brand colors (e.g. the garden's warm light wash `rgba(255,236,170,…)`) may stay literal — they are ambience, not palette.

| Token                   | Value                 | Use                                              |
| ----------------------- | --------------------- | ------------------------------------------------ |
| `--cn-paper`            | `#fdf6e9`             | page background (identity — rarely change)       |
| `--cn-paper-2/3`        | `#f9ecd2` / `#f1dcbd` | cards, tiles, wells (warm sand)                  |
| `--cn-ink`              | `#4a3b2f`             | text, faces, outlines (identity — rarely change) |
| `--cn-ink-soft`         | `#7d6c58`             | secondary text                                   |
| `--cn-border`           | `#e3d3b7`             | hairlines, tile borders                          |
| `--cn-leaf` / `-dark`   | `#74a72f` / `#527d1e` | Muguri, garden, success, cleared                 |
| `--cn-accent` / `-dark` | `#e8871f` / `#c4661a` | highlights, "New!", warm pops                    |
| `--cn-berry`            | `#c64f78`             | blush, fruit reds                                |
| `--cn-gold`             | `#f5b73c`             | sparkles, celebration                            |
| `--cn-sky` / `-2`       | `#a6e0d8` / `#e3f6f1` | field air, calm fills                            |

_(Values set by the Task 19 color lift — keep in sync with `tokens.css`.)_

## 3. Motion language

**Durations:** press = 140 ms (`--cn-t-fast`) · pop = 440 ms (`--cn-t-pop`) · arrive = 480 ms (`--cn-t-arrive`) · ambience loops = 3–8 s.

**Easings:**

- Settle: `var(--cn-ease)` `cubic-bezier(0.34, 1.56, 0.64, 1)`
- **Overshoot "boing" (Wurstel-grade arrivals/pops):** `var(--cn-ease-overshoot)` `cubic-bezier(0.2, 1.5, 0.4, 1)`
- Snappy transform: `var(--cn-ease-snap)` `cubic-bezier(0.18, 0.85, 0.32, 1.05)`

**Patterns:**

- **Tap:** quick squash (scale ≈0.86–0.92) then spring back with overshoot (fruit tap: 180 ms).
- **Correct answer:** bubble does squash-and-spring `1 → 0.88 → 1.16 → 1.06` (`--cn-t-pop`); sparkle burst synced to the pop (560 ms); fruits smile + hop.
- **Wrong answer:** gentle wiggle + sad faces for ~1 s; never punishing, never red.
- **Arrivals** (level card, tiles): overshoot entrance at `--cn-t-arrive`, `animation-fill-mode: backwards`; choreographed sub-beats (pill pops at 160 ms, actions rise at 220 ms).
- **Stagger:** `animation-delay` steps of `--cn-stagger` (90 ms) for waves (home tiles, cheering fruits, sparkles).
- **Idle pulse:** numeral bubbles breathe scale 1↔1.03 over 2.8 s — uniform across all bubbles, never hints at an answer.
- **Ambience:** slow, looping, subtle — Muguri's bob (2.6 s), sprout sway (5 s), garden's breathing warm light wash (9 s, top edge only, ≤0.36 effective alpha). Never attention-grabbing.
- **Muguri:** idle = bob + blink · hint = leaf raised like a hand (−38° overshoot wave) · cheer = both leaves up + squash-and-stretch hop (`transform-origin: 50% 100%`) · sleepy = drooped leaves + closed happy eyes.

## 4. Face grammar

- **Fruits & avatars:** three moods — `happy` (ink-dot eyes with spark highlights, arc smile, blush), `plain` (no expressive features; anatomy persists), `sad` (tilted inner-up brows, droop, frown, one sky-blue tear).
- **Muguri:** sparkle eyes + smile; sleepy = closed happy arcs. (Muguri has no sad mood yet — add only if a game needs it.)
- **Field reactions:** on a correct answer the counting field smiles; on a wrong one it looks sad for ~1 s, then back to happy.

## 5. Size ladder

Test every asset at **28 px** (help button) · **64 px** (field/tiles) · **96–120 px** (home) · **512 px** (icon). If it fails at 28 px, simplify the silhouette.

## 6. Techniques

- HTML/CSS/SVG only; canvas only for confetti/particles. **Zero raster in-app**; PNGs exist only for PWA icons, generated from SVG.
- **Gradients: yes** (soft, same-hue, for depth). **SVG filters/blur: no** (old-iPad performance) — fake softness with layered translucent shapes.
- Inline hexes in SVG presentation attributes (cross-browser); `var(--cn-*)` in CSS.
- `src/lib/assets/icon.svg` contract: exactly one `rx="112"` and one `<g id="glyph">` — `generate-icons.mjs` validates and throws otherwise.

## 7. Asset map

| Asset                            | File                                                          |
| -------------------------------- | ------------------------------------------------------------- |
| Mascot Muguri (4 poses)          | `src/lib/components/art/Muguri.svelte`                        |
| 10 fruits × 3 moods              | `src/lib/components/art/Fruit.svelte`                         |
| 6 animal avatars × 3 moods       | `src/lib/components/art/Avatar.svelte`                        |
| Wooden numeral bubbles           | `src/lib/games/counting/NumeralBubble.svelte`                 |
| Confetti / sparkles / level card | `src/lib/components/{Confetti,Sparkles,LevelComplete}.svelte` |
| Garden field scene               | `src/routes/play/counting/[level]/+page.svelte`               |
| App icon source                  | `src/lib/assets/icon.svg` → `pnpm icons`                      |

## 8. How art ships

1. Brief with references + this file → artist model (DeepSeek V4.1 Flash by default).
2. Artist verifies with `svelte-check` + `prettier`.
3. Orchestrator runs the full gate (`check` / `test` / `build` / `lint`).
4. Screenshots at the size ladder → owner review (micro-feedback wins; name the element + the change).
5. Commit names the artist. Update this file when a decision changes (values, grammar, technique).

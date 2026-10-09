# Cozy Nook — Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking. **Orchestrator-adapted:** implementers never run git commands; the orchestrator commits each validated task.

**Goal:** Ship the Cozy Nook base (shell, profiles, procedural audio, PWA) plus the complete Counting game with ten levels, hints, and celebrations.

**Architecture:** Static SPA (SvelteKit 3 + Svelte 5 runes, adapter-static fallback `index.html`), all services client-side in `#lib` (pure, unit-tested modules behind thin Svelte views), Paraglide i18n (it/ro/en/de), hand-rolled service worker precaching the whole app.

**Tech Stack:** SvelteKit 3 · Svelte 5 (runes) · TypeScript strict · Vite 8 · Vitest 4 · pnpm · adapter-static · @inlang/paraglide-js · @fontsource (Baloo 2 + Nunito) · @resvg/resvg-js (dev-only, icon rasterization).

**Spec:** docs/superpowers/specs/2026-10-08-cozy-nook-design.md

## Global Constraints

- Node ≥ 26. **pnpm only** (never npm). `.npmrc` has `engine-strict=true`.
- Svelte 5 **runes mode** everywhere; use `$props()`, `$state()`, `$derived()`, `$effect()`, `onclick`, snippets. No legacy event syntax (`on:click`). No `svelte:` stores.
- SPA: `ssr = false`, `prerender = false`, adapter fallback `index.html`.
- Everything imports via the package `imports` map with explicit file extensions: `#lib/<path>.js` (SvelteKit 3 **removed** `$lib` — importing it is a build error; never use it). Messages: named import `{ m }` from `#lib/paraglide/messages.js`; locale helpers from `#lib/paraglide/runtime.js`; components as `#lib/components/<name>.svelte`.
- **User-visible strings only via Paraglide messages** (after Task 6). No hardcoded copy. Placeholders `{n}`, `{done}`, `{count}` must survive translation.
- **No network requests at runtime.** No analytics. localStorage is the only persistence.
- **Art:** HTML/CSS/SVG only; canvas only for confetti/particles. No raster in-app; only PWA icon PNGs (Task 9).
- **Audio:** procedural WebAudio only; no audio files; silent until first gesture; nothing may throw in Node (guard all `AudioContext` access).
- **Colors/spacing/type only via tokens** `var(--cn-*)`; components must not invent raw colors (canvas code may inline the same hex palette as constants).
- Tap targets ≥ 56×56px. Mobile-first; portrait; safe-area aware. `prefers-reduced-motion` respected for every animation.
- Do **not** run git commands. Do **not** add/edit dependencies (all shipped in Task 1). Do **not** modify files outside your task's file list. Do **not** dispatch subagents.
- Every task ends with: `pnpm check`, `pnpm test`, `pnpm build` all passing.
- Reference projects are **read-only**: `/Users/ionutale/developer-playground/kids-games-3` (primary), `cozy-forest-village`, `cozy-jigsaw`, `music-player-pwa`, `kids-time-game`. Never modify them.

## Review Focus

1. **Audio start:** first user gesture unlocks audio (iOS Safari); music starts only after that, in the right scene, with no pop.
2. **Locked levels:** deep-linking `/play/counting/7` with no progress lands safely on the level map.
3. **Offline:** after one online load, airplane mode boots the app fully (shell, art, fonts, game).
4. **Text fit:** it/ro/en/de strings incl. diacritics (ș ț ă â î ß ü) render unclipped at 320px width.
5. **Double-tap:** rapid taps never skip two rounds or double-fire celebrations.
6. **Reduced motion:** confetti/sparkles degrade; no animation-dependent state gets stuck.

---

### Task 1: Project scaffold & tooling

**Files:**

- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `.npmrc`, `.gitignore`, `.prettierignore`, `prettier.config.js`
- Create: `src/app.html`, `src/app.d.ts`, `src/app.css`, `src/lib/index.ts`, `src/hooks.ts`, `src/hooks.server.ts`
- Create: `src/routes/+layout.ts`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`
- Create: `static/favicon.svg`, `project.inlang/settings.json`, `messages/{it,ro,en,de}.json`

**Interfaces:**

- Consumes: nothing (first task).
- Produces: working SvelteKit 3 static build; `#lib/paraglide/messages.js` (all tasks); the `#lib` imports map; vitest runner; `pnpm` scripts `dev/build/preview/check/test/icons`.

- [ ] **Step 1: package.json.** `"name": "cozy-nook"`, `"private": true`, `"type": "module"`, `"engines": {"node": ">=26"}`. Scripts: `dev: vite dev`, `build: vite build`, `preview: vite preview`, `prepare: svelte-kit sync || echo ''`, `check: svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`, `test: vitest run --passWithNoTests`, `test:unit: vitest`, `lint: prettier --check .`, `format: prettier --write .`, `icons: node scripts/generate-icons.mjs`. Deps: `@fontsource/baloo-2`, `@fontsource/nunito`. DevDeps (versions mirror kids-games-3/package.json exactly): `@inlang/paraglide-js`, `@sveltejs/adapter-static`, `@sveltejs/kit`, `@sveltejs/vite-plugin-svelte`, `@types/node`, `@resvg/resvg-js`, `prettier`, `prettier-plugin-svelte`, `svelte`, `svelte-check`, `typescript`, `vite`, `vitest`. `imports`: `{"#lib": "./src/lib/index.js", "#lib/*": "./src/lib/*"}`.
- [ ] **Step 2: vite.config.ts.** Mirror kids-games-3/vite.config.ts EXACTLY in shape: `sveltekit({ compilerOptions: { runes: (…) => node_modules ? undefined : true }, adapter: adapter({ fallback: 'index.html' }) })` + `paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide', emitTsDeclarations: true, strategy: ['url','cookie','preferredLanguage','baseLocale'], urlPatterns: [{ pattern: '/:path(.*)?', localized: [['it','/it/:path(.*)?'],['ro','/ro/:path(.*)?'],['en','/en/:path(.*)?'],['de','/de/:path(.*)?']] }] })` + vitest `test` block (node env, `expect.requireAssertions: true`, include `src/**/*.{test,spec}.{js,ts}`, exclude `src/**/*.svelte.{test,spec}.{js,ts}`).
- [ ] **Step 3: project.inlang/settings.json.** Copy kids-games-3's exactly except keep baseLocale `it`, locales `["it","ro","en","de"]`.
- [ ] **Step 4: messages seeds.** Four files, each `{ "$schema": "https://inlang.com/schema/inlang-message-format", "app_name": "Cozy Nook", "tagline": "…" }`. Taglines: it "Giochi coccolosi per imparare", ro "Jocuri blânde pentru învățat", en "Cozy games for learning", de "Gemütliche Spiele zum Lernen".
- [ ] **Step 5: app shell files.** `src/app.html`: doctype, `<html lang="it">`, viewport `width=device-width, initial-scale=1, viewport-fit=cover`, `theme-color #fdf6e9`, title "Cozy Nook", `%sveltekit.head%` / `%sveltekit.body%`. `src/app.d.ts`: `export {};` with App namespace placeholder. `src/hooks.ts` + `src/hooks.server.ts`: mirror the Paraglide integration pattern from kids-games-3 (read both files there and adapt). `src/routes/+layout.ts`: `export const ssr = false; export const prerender = false;`. `src/routes/+layout.svelte`: minimal — `import '../app.css';` + `let { children } = $props();` + `{@render children()}`. `src/routes/+page.svelte`: placeholder `<h1>Cozy Nook</h1>`. `src/app.css`: minimal (`html,body{margin:0;background:#fdf6e9;color:#4a3b2f;font-family:system-ui,sans-serif}`). `src/lib/index.ts`: `export {};`. `static/favicon.svg`: simple 64×64 paper circle with two ink eyes.
- [ ] **Step 6: housekeeping files.** `.npmrc`: `engine-strict=true`. `.gitignore`: mirror kids-games-3's + add `.superpowers/`. `.prettierignore` + `prettier.config.js`: mirror kids-games-3.
- [ ] **Step 7: install & verify.** Run: `pnpm install`, `pnpm check`, `pnpm test`, `pnpm build`. Expected: all pass; `build/index.html` exists; `src/lib/paraglide/messages/_index.js` generated. Record exact command outputs in the report.

### Task 2: Design tokens & base styles

**Files:**

- Create: `src/lib/styles/tokens.css`, `src/lib/styles/base.css`
- Modify: `src/app.css` (replace placeholder with the two imports)

**Interfaces:**

- Consumes: Task 1 build.
- Produces: every `--cn-*` token (below) for all later tasks; global base styles incl. reduced-motion and fonts.

- [ ] **Step 1: tokens.css.** `:root` must define exactly: `--cn-paper:#fdf6e9; --cn-paper-2:#f6ead5; --cn-paper-3:#efe0c8; --cn-ink:#4a3b2f; --cn-ink-soft:#7d6c58; --cn-border:#e3d3b7; --cn-accent:#e08a3c; --cn-accent-dark:#c9752c; --cn-leaf:#7fa653; --cn-leaf-dark:#5f823c; --cn-berry:#b0577a; --cn-wood:#8c6242; --cn-gold:#f0b34e; --cn-sky:#bfe3e0; --cn-sky-2:#e6f4f2; --cn-radius:20px; --cn-radius-sm:12px; --cn-radius-pill:999px; --cn-space-1:4px; --cn-space-2:8px; --cn-space-3:12px; --cn-space-4:16px; --cn-space-5:24px; --cn-space-6:32px; --cn-shadow-1:0 2px 0 rgba(74,59,47,.10), 0 6px 16px rgba(74,59,47,.08); --cn-shadow-2:0 4px 0 rgba(74,59,47,.12), 0 12px 28px rgba(74,59,47,.12); --cn-font-display:'Baloo 2', system-ui, sans-serif; --cn-font-body:'Nunito', system-ui, sans-serif; --cn-text-xs:.8rem; --cn-text-sm:.95rem; --cn-text-md:1.1rem; --cn-text-lg:1.35rem; --cn-text-xl:clamp(1.7rem, 6vw, 2.4rem); --cn-t-fast:140ms; --cn-t-med:280ms; --cn-t-slow:600ms; --cn-ease:cubic-bezier(.34,1.56,.64,1); --cn-safe-top:env(safe-area-inset-top, 0px); --cn-safe-bottom:env(safe-area-inset-bottom, 0px); --cn-safe-x:env(safe-area-inset-left, 0px);` (mirror safe-x for right: add a second var only if needed; keep list as above).
- [ ] **Step 2: base.css.** Fontsource imports first (latin-ext so it/ro/de diacritics render): `@fontsource/baloo-2/latin-ext-600.css`, `…-700.css`, `@fontsource/nunito/latin-ext-400.css`, `…-600.css`, `…-700.css`, `…-800.css`. Then: `*{box-sizing:border-box}`; `html{-webkit-text-size-adjust:100%}`; `body{margin:0;min-height:100dvh;background:var(--cn-paper);color:var(--cn-ink);font-family:var(--cn-font-body);-webkit-tap-highlight-color:transparent;overscroll-behavior:none}`; `h1,h2,h3{font-family:var(--cn-font-display);margin:0}`; buttons reset (`border:0;background:none;font:inherit;color:inherit;cursor:pointer`); `:focus-visible{outline:3px solid var(--cn-accent);outline-offset:2px;border-radius:8px}`; `.cn-press{transition:transform var(--cn-t-fast) var(--cn-ease)} .cn-press:active{transform:scale(.96)}`; `.cn-safe{padding-top:max(var(--cn-safe-top), var(--cn-space-3));padding-bottom:max(var(--cn-safe-bottom), var(--cn-space-3));padding-left:max(var(--cn-safe-x), var(--cn-space-4));padding-right:max(var(--cn-safe-x), var(--cn-space-4))}`; reduced-motion: `@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}`.
- [ ] **Step 3: app.css.** `@import './lib/styles/tokens.css'; @import './lib/styles/base.css';`
- [ ] **Step 4: verify.** `pnpm check`, `pnpm test`, `pnpm build` all pass.

### Task 3: Save data — profiles, progress, settings

**Files:**

- Create: `src/lib/storage/save.ts`, `src/lib/storage/save.test.ts`

**Interfaces:**

- Consumes: Task 1.
- Produces (exact, consumed by Tasks 8, 9, 11, 12):
  - `type AvatarId = 'owl'|'fox'|'bear'|'bunny'|'cat'|'hedgehog'`
  - `interface Profile { id: string; name: string; avatar: AvatarId; createdAt: number }`
  - `interface GameProgress { cleared: number }`
  - `interface SaveData { version: 1; activeProfileId: string | null; profiles: Profile[]; progress: Record<string, Record<string, GameProgress>>; settings: { muted: boolean } }`
  - `interface KeyValueStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }`
  - `const SAVE_KEY = 'cozy-nook-save'`, `const MAX_LEVEL = 10`, `const AVATARS: AvatarId[]`
  - `defaultSave(): SaveData`, `loadSave(storage?: KeyValueStorage | null): SaveData`, `persistSave(data: SaveData, storage: KeyValueStorage): void`
  - `addProfile(data: SaveData, name: string, avatar: AvatarId): Profile` (trims name, `slice(0,20)`, empty → `'Kid'`; sets new profile active), `removeProfile(data: SaveData, id: string): void` (also deletes its progress and clears `activeProfileId` if it was active), `setActiveProfile(data, id: string | null): void`
  - `setMuted(data: SaveData, muted: boolean): void`
  - `getCleared(data: SaveData, profileId: string, gameId: string): number`
  - `clearLevel(data: SaveData, profileId: string, gameId: string, level: number): number` (monotonic: max of old/new, clamped 0..10; returns new cleared)
  - `isLevelOpen(cleared: number, level: number): boolean` (`level>=1 && level<=MAX_LEVEL && level<=cleared+1`)
  - `createId(): string` (crypto.randomUUID with fallback)
- [ ] **Step 1: write tests first** (`save.test.ts`): corrupt JSON → `defaultSave()`; non-object JSON → default; unknown `version` → default; `cleared` values `NaN`/`-5`/`99` sanitized to `0`/`0`/`10`; `activeProfileId` pointing at missing profile → `null`; unknown avatar id dropped (profile dropped if no valid avatar field); `addProfile` appends, trims long names to 20, empty name → `'Kid'`, becomes active; `removeProfile` removes progress + clears active; `clearLevel` monotonic (`2` then `1` stays `2`); `isLevelOpen(0,1)===true`, `(0,2)===false`, `(10,10)===true`, `(3,5)===false`, `(3,4)===true`, `(10,11)===false`; `persistSave` + `loadSave` round-trips. Use a tiny in-memory `KeyValueStorage` fake.
- [ ] **Step 2: implement `save.ts`** with defensive sanitization only at the `loadSave` boundary (single place). Keep pure/injectable (no top-level `localStorage`).
- [ ] **Step 3: verify.** `pnpm test` (all new tests pass), `pnpm check`, `pnpm build`.

### Task 4: Procedural audio engine

**Files:**

- Create: `src/lib/audio/synth.ts`, `src/lib/audio/synth.test.ts`, `src/lib/audio/music.ts`, `src/lib/audio/sfx.ts`, `src/lib/audio/engine.ts`, `src/lib/audio/index.ts`

**Interfaces:**

- Consumes: Task 1. (Read `cozy-jigsaw/src/audio/engine.ts` and `cozy-forest-village/src/audio/index.ts` for proven WebAudio patterns.)
- Produces (exact, consumed by Tasks 8, 11, 12):
  - `type SfxName = 'tap'|'correct'|'wrong'|'hint'|'unlock'|'celebrate'|'ui'`
  - `type MusicScene = 'home'|'game'`
  - `interface CozyAudio { readonly ready: boolean; unlock(): Promise<void>; playSfx(name: SfxName): void; playMusic(scene: MusicScene): void; stopMusic(): void; setMuted(muted: boolean): void; readonly muted: boolean }`
  - singleton `export const audio: CozyAudio`
  - Contract: **calling `playMusic(scene)` before `unlock()` is remembered and applied at unlock**; duplicate scene calls are no-ops; all calls are silent no-ops in Node/without AudioContext (module must import cleanly outside the browser).
- [ ] **Step 1: tests first** (`synth.test.ts`) for pure helpers: `midiToFreq(69)≈440`; `PENTATONIC` (midi `[60,62,64,67,69,72,74,76,79,81]`); `CHORDS` (four voicings, all midi 48–72); `mulberry32(42)` deterministic (first two values equal across two instances); `clamp`.
- [ ] **Step 2: `synth.ts`** — `mulberry32(seed): () => number`, `midiToFreq(midi): number`, `PENTATONIC`, `CHORDS` (C: `[60,64,67,71]`, Am: `[57,60,64,67]`, F: `[53,57,60,65]`, G: `[55,59,62,67]`), `clamp(x, min, max)`.
- [ ] **Step 3: `sfx.ts`** — soft recipes, master bus param `ctx` + `destination`; every sound ≤ 900ms, gentle tones (sine/triangle), no harsh attack: tap (sine 660Hz, 120ms exp decay); correct (triangle E5→A5, two 150ms notes); wrong (sine 233→208Hz glide, 300ms, quiet ~0.15); hint (sine 880 + 1320Hz, 400ms); unlock (triangle 523→659→784, 150ms each); celebrate (triangle arpeggio C5-E5-G5-C6 + soft shimmer); ui (sine 740Hz, 80ms).
- [ ] **Step 4: `music.ts`** — generative calm loop: warm pad (2–3 detuned triangle voices, lowpass ~700Hz, slow LFO), `CHORDS` progression every 8s, sparse pentatonic plucks every 3–7s (seeded `mulberry32`, gain ≤ 0.12, decay ~1.2s, gentle feedback delay), soft noise wind (lowpass ~300Hz, gain ~0.03). `home` scene includes the wind bed; `game` scene skips it and is slightly brighter. Scene crossfade ~500ms.
- [ ] **Step 5: `engine.ts` + `index.ts`** — lazy `AudioContext` creation ONLY inside `unlock()` (resume on gesture); master gain 0.22; `playSfx` before unlock or when muted → no-op; `setMuted` ramps master gain (0 ↔ 0.22) and stops/starts nothing; all `AudioContext`/`window` references guarded (`typeof AudioContext === 'undefined'` → fully inert singleton).
- [ ] **Step 6: verify.** `pnpm check`, `pnpm test`, `pnpm build` pass. Importing `#lib/audio/index.js` in test/node must not throw (tests import `synth.ts` only).

### Task 5: Counting rules + games registry

**Files:**

- Create: `src/lib/games/counting/rules.ts`, `src/lib/games/counting/rules.test.ts`
- Create: `src/lib/games/registry.ts`, `src/lib/games/registry.test.ts`

**Interfaces:**

- Consumes: Task 1. (Port patterns from `kids-games-3/src/lib/count-fruit.ts`, adapted — do not copy wholesale.)
- Produces (exact, consumed by Tasks 11, 12):
  - `type FruitId = 'apple'|'pear'|'orange'|'banana'|'grapes'|'strawberry'|'lemon'|'cherry'|'peach'|'watermelon'` (this order = `FRUITS` array)
  - `type FruitLayout = 'row'|'cluster'|'scatter'`
  - `interface LevelConfig { level: number; min: number; max: number; layout: FruitLayout; choices: number; tight: boolean; kinds: number; assist: boolean }`
  - `const MAX_LEVEL = 10`, `const ROUNDS_PER_LEVEL = 5`
  - `const LEVELS: LevelConfig[]` — exact table: L1 `{1,1,3,'row',2,false,1,false}` · L2 `{2,1,4,'row',2,false,1,false}` · L3 `{3,1,5,'row',3,false,1,false}` · L4 `{4,2,6,'cluster',3,false,1,false}` · L5 `{5,1,8,'scatter',3,false,1,true}` · L6 `{6,2,10,'scatter',3,false,2,true}` · L7 `{7,1,12,'scatter',4,true,2,true}` · L8 `{8,1,15,'scatter',4,true,2,true}` · L9 `{9,3,18,'scatter',4,true,3,true}` · L10 `{10,5,20,'scatter',4,true,3,true}`
  - `interface Round { count: number; options: number[]; fruits: { kind: FruitId; x: number; y: number; size: number; tilt: number }[] }` (`x/y` are % of the field, `size` ≈ 0.85–1.15, `tilt` −12..12 degrees)
  - `getLevelConfig(level: number): LevelConfig | undefined`
  - `generateLevel(level: number, seed?: number): Round[]` (5 rounds; default seed `level * 1013`; deterministic — same seed ⇒ identical output; counts unique across rounds when the range allows, never repeating consecutively)
  - `makeOptions(config: LevelConfig, correct: number, rand: () => number): number[]` (exactly `config.choices` unique values incl. `correct`, all within `[min..max]`; when `tight`, distractors ordered by numeric closeness ±1, ±2…)
  - `layoutFruits(count: number, layout: FruitLayout, kinds: number, rand: () => number): Round['fruits']` (row: evenly spaced, same y; cluster: tight ellipse; scatter: jittered with min-distance so taps don't hit the wrong fruit; `kinds` = how many distinct fruit kinds appear, assigned round-robin from `FRUITS`)
  - `hintStage(misses: number, manualHints: number, idle: boolean): 0|1|2|3` — `3` if `misses>=6 || manualHints>=3`; `2` if `misses>=4 || manualHints>=2`; `1` if `misses>=2 || manualHints>=1 || idle`; else `0`
  - `type GameId = 'counting'`; `interface GameMeta { id: GameId; titleKey: string; descKey: string; href: string; accent: 'leaf'|'accent'|'berry'; icon: 'fruit'|'color'|'logic' }`; `const GAMES: GameMeta[] = [{ id:'counting', titleKey:'game_counting_name', descKey:'game_counting_desc', href:'/play/counting', accent:'leaf', icon:'fruit' }]`; `getGame(id: string): GameMeta | undefined`
- [ ] **Step 1: tests first** (`rules.test.ts`): bounds — every count ∈ `[min,max]`; options: length === `choices`, contains correct, unique, in range; tight distractors are the nearest available numbers (±1 preferred); determinism — `generateLevel(5, 1234)` twice deep-equals; counts unique within a level when `max-min+1 >= 5`; `hintStage` boundaries (0/2/4/6 misses; 1/2/3 manual; idle → 1); `layoutFruits` length + all coordinates within 5–95% x and 10–90% y; scatter min-distance > threshold; registry: `GAMES[0].href === '/play/counting'`.
- [ ] **Step 2: implement** `rules.ts` + `registry.ts` (seeded `mulberry32` local copy is fine — do NOT import across task boundaries; a 6-line duplicate is acceptable).
- [ ] **Step 3: verify.** `pnpm test`, `pnpm check`, `pnpm build`.

### Task 6: i18n messages (it/ro/en/de)

**Files:**

- Modify: `messages/it.json`, `messages/ro.json`, `messages/en.json`, `messages/de.json` (seeded in Task 1)
- Create: `src/lib/i18n.test.ts`
- Modify: `tsconfig.json` (add `"resolveJsonModule": true` to compilerOptions — allowed one-line edit)

**Interfaces:**

- Consumes: Task 1. Seed translations for overlapping keys exist in `kids-games-3/messages/{locale}.json` (read them for tone; adapt, don't copy blindly).
- Produces: the complete key set below in all four locales, for Tasks 9, 11, 12.

- [ ] **Step 1: write all four files** with identical keys. English reference values (translate with the same warm, short tone; Italian is the baseLocale):

```
app_name: "Cozy Nook"
tagline: "Cozy games for learning"
home_who: "Who's playing?"
home_add_kid: "Add a kid"
kid_name: "Name"
choose_avatar: "Choose an animal"
start_playing: "Start playing"
settings: "Settings"
for_grownups: "For grown-ups"
hold_to_open: "Hold to open"
sound: "Sound"
language: "Language"
kids: "Kids"
add_kid: "Add a kid"
remove_kid: "Remove"
remove_kid_confirm: "Remove this kid and their progress?"
yes: "Yes"
no: "No"
back: "Back"
play: "Play"
locked: "Locked"
locked_detail: "Finish level {n} first."
new: "New!"
level: "Level {n}"
choose_level: "Choose a level"
progress: "{done} of 10 levels"
all_levels_done: "You finished all the levels! Great job!"
game_counting_name: "Count the Fruit"
game_counting_desc: "Count the fruits and tap the right number."
coming_soon: "More games coming soon"
coming_soon_tile: "Coming soon"
how_many: "How many fruits?"
tap_number: "Tap the right number"
hint_nudge: "Count slowly, one by one."
hint_strong: "Look closely… which number is it?"
hint_reveal: "It's {count}! Tap that one."
correct: "Yes!"
try_again: "Try again!"
cheer: "Great job!"
level_complete: "Level complete!"
next_level: "Next level"
play_again: "Play again"
all_levels: "All levels"
music_on: "Music on"
music_off: "Music off"
update_ready: "A cozy new version is ready!"
update_refresh: "Refresh"
install_ios: "Add Cozy Nook to your Home Screen for full-screen fun"
later: "Later"
prompt_apple: "How many apples?"
prompt_pear: "How many pears?"
prompt_orange: "How many oranges?"
prompt_banana: "How many bananas?"
prompt_grapes: "How many grapes?"
prompt_strawberry: "How many strawberries?"
prompt_lemon: "How many lemons?"
prompt_cherry: "How many cherries?"
prompt_peach: "How many peaches?"
prompt_watermelon: "How many watermelons?"
```

- [ ] **Step 2: parity test** (`src/lib/i18n.test.ts`): import the four JSON files; assert every locale has exactly the same key set as `it.json` (ignoring `$schema`); assert each message's `{placeholder}` set is identical across locales.
- [ ] **Step 3: verify.** `pnpm test`, `pnpm check`, `pnpm build` (Paraglide regenerates; build must not warn about missing messages).

### Task 7: Fruit art component

**Files:**

- Create: `src/lib/components/art/Fruit.svelte`

**Interfaces:**

- Consumes: `FruitId` from `#lib/games/counting/rules.js` (Task 5); tokens (Task 2).
- Produces (consumed by Tasks 11, 12): component props `{ kind: FruitId; size?: number (default 72); mood?: 'happy'|'plain' (default 'happy'); class?: string }`.

- [ ] **Step 1: implement.** Inline `<svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" class={klass}>`; port each fruit's shapes from `kids-games-3/src/lib/components/FruitArt.svelte` (read it first), then repolish: consistent soft palette across all ten (use token hexes: apple `--cn-berry`-ish red, pear leaf `--cn-leaf`, orange `--cn-accent`, banana `--cn-gold`, grapes `--cn-berry`, strawberry `--cn-berry`, lemon `--cn-gold`, cherry `--cn-berry`, peach `--cn-accent`, watermelon `--cn-leaf`); when `mood === 'happy'` add the simple face (two ink dots + smile); `plain` has no face. Svelte 5 runes; no `<style>` animation needed here.
- [ ] **Step 2: verify.** `pnpm check`, `pnpm build` pass.

### Task 8: Bufi mascot, avatars, small UI primitives

**Files:**

- Create: `src/lib/components/art/Bufi.svelte`
- Create: `src/lib/components/art/Avatar.svelte`
- Create: `src/lib/components/ui/IconButton.svelte`
- Create: `src/lib/components/ui/MuteButton.svelte`
- Create: `src/lib/components/ui/ParentGate.svelte`

**Interfaces:**

- Consumes: tokens (T2), save module (T3), audio singleton (T4).
- Produces (consumed by Tasks 10, 11, 12):
  - `Bufi.svelte` props `{ pose?: 'idle'|'hint'|'cheer'|'sleepy' (default 'idle'); size?: number (default 120); class?: string }` — cute round owl, SVG, `aria-hidden="true"`, gentle CSS animations (blink; per-pose motion) all disabled by reduced-motion.
  - `Avatar.svelte` props `{ id: AvatarId; size?: number (default 64); class?: string }` — six simple animal heads (owl = simplified Bufi face, fox, bear, bunny, cat, hedgehog), SVG, distinct silhouettes/colors.
  - `IconButton.svelte` props `{ label: string; onclick?: () => void; size?: 'sm'|'md' (default 'md'); disabled?: boolean; children }` — `<button type="button" aria-label={label}>`, min tap 56px (`md`) / 48px (`sm`), `cn-press`.
  - `MuteButton.svelte` props `{ size?: 'sm'|'md' }` — on mount reads `loadSave(localStorage).settings.muted`; toggles: `persistSave(setMuted(data, next))` + `audio.setMuted(next)`; two inline-SVG speaker states; `aria-pressed`; label from `music_on`/`music_off` messages.
  - `ParentGate.svelte` props `{ children; label?: string; onUnlocked?: () => void }` — renders a pill ("For grown-ups" label passed in) with a progress ring; a 3s press (pointerdown/pointerup/pointercancel, also works with mouse) unlocks and renders `children`; cancels cleanly on early release; `unlocked` state internal.
- [ ] **Step 1: implement all five** with runes syntax; colors strictly via tokens; no emoji.
- [ ] **Step 2: verify.** `pnpm check` (svelte-check parses snippets/props), `pnpm build`.

### Task 9: PWA — manifest, icons, service worker, update & install UX

**Files:**

- Create: `static/manifest.webmanifest`, `scripts/generate-icons.mjs`, `src/lib/assets/icon.svg`
- Create: `src/lib/pwa/policy.ts`, `src/lib/pwa/policy.test.ts`, `src/lib/pwa/client.ts`
- Create: `src/service-worker.ts`
- Create: `src/lib/components/UpdateToast.svelte`, `src/lib/components/InstallHint.svelte`
- Modify: `src/app.html` (manifest link, `apple-touch-icon`, apple web-app meta — allowed), `vite.config.ts` ONLY if needed to set `serviceWorker: { register: false }` inside `sveltekit(...)` (allowed one-line edit; check first), `tsconfig.json` (add `"exclude": ["src/service-worker"]` so the app typecheck skips the service worker — kit validates this)

**Interfaces:**

- Consumes: Task 1 build; message keys `update_ready`, `update_refresh`, `install_ios`, `later` (T6); tokens (T2). Reference: `music-player-pwa/pwa/src/service-worker.ts`, `src/lib/swPolicy.ts`, `scripts/generate-icons.mjs`, `static/manifest.webmanifest`, `UpdateToast.svelte`, `InstallHint.svelte` (read-only, adapt).
- Produces (consumed by Task 11): `initPwa(): void` from `#lib/pwa/client.js` — registers `/service-worker.js` (browser + production only), listens `updatefound`, exposes an internal subscription that shows nothing by itself; exports `applyUpdate(): void` (posts `SKIP_WAITING`); reloads once on `controllerchange`. Components `UpdateToast` and `InstallHint` are self-contained (subscribe/register themselves) and can be dropped into any page.
- [ ] **Step 1: pure policy + tests first.** `policy.ts`: `type CacheDecision = 'bypass'|'cache-first'|'network-first'`; `decide({ method, url, origin, mode, destination }, appOrigin): CacheDecision` — `GET` same-origin navigation → `network-first`; `GET` same-origin asset → `cache-first`; anything else (POST, cross-origin, range) → `bypass`. Tests cover each branch.
- [ ] **Step 2: service worker.** SvelteKit 3 removed `$service-worker`: import `immutable`, `assets` and `prerendered` from `$app/manifest`, `version` from `$app/env`, and `resolve` from `$app/paths`; use a versioned cache name; install: `addAll` (ignore individual failures); activate: delete stale caches, `clients.claim()`; message `SKIP_WAITING` → `skipWaiting()`; fetch: apply `decide()` — `cache-first` (network fallback + put for same-origin GETs), `network-first` for navigations with fallback to cached `/index.html`, `bypass` otherwise. Never cache cross-origin or non-GET.
- [ ] **Step 3: client + components.** `client.ts` as specified. `UpdateToast.svelte`: bottom toast, shows on update-ready, button "Refresh" → `applyUpdate()`. `InstallHint.svelte`: iOS Safari only (not standalone), one gentle bottom card, "Later" dismiss persists a localStorage flag.
- [ ] **Step 4: icons.** `src/lib/assets/icon.svg` (paper rounded square, Bufi face: two big eyes, beak, ear tufts — cohesive with T8). `scripts/generate-icons.mjs` uses `@resvg/resvg-js` → `static/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (extra 15% safe-zone padding), `apple-touch-icon.png` (180×180). Run `pnpm icons`; PNGs are the app's only tracked raster files.
- [ ] **Step 5: manifest + app.html.** manifest: name/short_name "Cozy Nook", `lang: "it"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `background_color/theme_color: "#fdf6e9"`, icons (192, 512, maskable-512). app.html: `<link rel="manifest">`, `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-status-bar-style" content="default">`.
- [ ] **Step 6: verify.** `pnpm icons` produces 4 PNGs; `pnpm test`, `pnpm check`, `pnpm build` pass; `build/service-worker.js` + `build/manifest.webmanifest` exist.

### Task 10: Celebration components

**Files:**

- Create: `src/lib/components/Confetti.svelte`, `src/lib/components/Sparkles.svelte`, `src/lib/components/LevelComplete.svelte`

**Interfaces:**

- Consumes: tokens (T2); message keys `level_complete`, `next_level`, `play_again`, `all_levels`, `new`, `cheer` (T6). Reference: `kids-games-3/src/lib/components/Confetti.svelte` (adapt).
- Produces (consumed by Task 12):
  - `Confetti.svelte` props `{ active: boolean; pieces?: number (default 90); onDone?: () => void }` — canvas `position:absolute; inset:0; pointer-events:none`, parent must be `position:relative`; stops + clears when `active` false; reduced-motion → renders nothing and calls `onDone` immediately.
  - `Sparkles.svelte` props `{ x: number; y: number; count?: number (default 8); onDone?: () => void }` — x/y in % of nearest positioned ancestor; tiny SVG pips bursting outward (CSS keyframes with inline `--tx/--ty`), self-removes ~700ms; reduced-motion → 200ms fade.
  - `LevelComplete.svelte` props `{ level: number; isLast: boolean; onNext: () => void; onReplay: () => void; onAllLevels: () => void }` — overlay card (paper, `--cn-radius`, `--cn-shadow-2`) with `level_complete` title + optional `new` pill, three buttons (`next_level` primary leaf / `play_again` / `all_levels` ghost); contains its own `Confetti active={true}` layer; buttons ≥56px.
- [ ] **Step 1: implement.** Canvas palette constants (same hexes as tokens; canvas can't use CSS vars). No Bufi import here.
- [ ] **Step 2: verify.** `pnpm check`, `pnpm build`.

### Task 11: App shell — layout, home, profiles, settings

**Files:**

- Modify: `src/routes/+layout.svelte`
- Modify: `src/routes/+page.svelte` (home)
- Create: `src/routes/settings/+page.svelte`

**Interfaces:**

- Consumes: Tasks 2, 3, 4, 5 (registry), 6, 7, 8, 9 (`initPwa`), 10.
- Produces: navigable shell (`/`, `/settings`), first-run profile setup, active-profile switching, parent-gated settings. Reference for i18n patterns: `kids-games-3/src/routes/+layout.svelte` + `+page.svelte` (read them).
- [ ] **Step 1: `+layout.svelte`.** Keep it thin: import app.css; `{@render children()}`; `<svelte:head><title>{m.app_name()}</title></svelte:head>`; `onMount`: apply saved mute (`audio.setMuted(save.settings.muted)`), `initPwa()`, and a one-shot `pointerdown` listener on `window` that calls `audio.unlock()` (audio then applies any remembered scene). `UpdateToast` + `InstallHint` mounted here (they self-manage visibility).
- [ ] **Step 2: home page.** On mount: `loadSave(localStorage)` into `$state`; `audio.playMusic('home')`. Render: header (`app_name`, `tagline`, `Settings` gear via `IconButton` → `/settings`); Bufi idle greeting + active-profile chip (tap → inline sheet listing profiles + `home_add_kid`); if no profiles: first-run card (`kid_name` input + avatar grid via `Avatar` + `start_playing` → `addProfile` + persist). Game section: for each `GAMES` entry a tile (icon: `Fruit kind="apple"` for `'fruit'`; title/desc via message keys; progress `m.progress({done: getCleared(...)})`; `href`); every tile ≥ 88px tall; plus one non-interactive `coming_soon_tile` tile. All copy via messages. Music must not be restarted when returning (engine dedupes).
- [ ] **Step 3: settings page.** `ParentGate` wraps everything (label `for_grownups`, hint `hold_to_open`). Inside: language switcher (4 buttons; use `getLocale`/`setLocale` from `#lib/paraglide/runtime.js`; active state visible), sound row with `MuteButton` (md) + `music_on/music_off` label, kids list from save (each: `Avatar` + name + `remove_kid` with inline `remove_kid_confirm` yes/no → `removeProfile` + persist), add-kid form (name + avatar grid). `back` `IconButton` → `/`.
- [ ] **Step 4: verify.** `pnpm check`, `pnpm build`; orchestrator will browser-test.

### Task 12: Counting game — level map + play screen

**Files:**

- Create: `src/routes/play/counting/+page.svelte` (level map)
- Create: `src/routes/play/counting/[level]/+page.svelte` (game)
- Create: `src/lib/games/counting/NumeralBubble.svelte`
- Create: `src/lib/games/counting/session.svelte.ts`

**Interfaces:**

- Consumes: Tasks 2, 3, 4, 5 (rules + registry), 6, 7, 8, 10. Reference: `kids-games-3/src/routes/play/count-fruit/[level]/+page.svelte` + `+page.svelte` (adapt flows, new art/audio).
- Produces: complete gameplay loop; `NumeralBubble` props `{ value: number; state: 'idle'|'glow'|'pulse'|'correct'|'wrong'; onclick?: () => void }` (wood pill, ≥64px, ink numeral, `cn-press`; `glow` = soft accent halo, `pulse` = stronger animated halo, `correct` = leaf fill + scale pop, `wrong` = wiggle 400ms + stays idle after).
- [ ] **Step 1: `session.svelte.ts`.** Factory `createCountingSession(level: number)` returning runes state + methods: `rounds` (from `generateLevel`), `roundIndex`, `misses`, `manualHints`, `counted` (Set of fruit indexes, assist ticker), `phase: 'playing'|'celebrating'|'complete'`, derived `round`, `hint`, `isLast`; methods `tapFruit(i)`, `answer(value: number): boolean` (returns correct), `help()`, `advance()` (called after celebrate delay), `replay()` (fresh rounds, same level). No timers inside; the page owns the 10s idle timer and calls `session.help()`-style nudges via a `markIdle()` method feeding `hintStage(misses, manualHints, idle)`.
- [ ] **Step 2: level map page.** Reads save → `getCleared`. Ten level tiles (number + state: locked 🔒-free (SVG padlock), open, cleared check, `new` pill for `cleared+1`); locked tap → wiggle animation + transient `m.locked_detail({n})` bubble; open tap → `goto('/play/counting/' + n)`. Header: back → `/`, `game_counting_name` + `game_counting_desc`, Bufi idle. `audio.playMusic('game')`.
- [ ] **Step 3: game page.** Validate `level` param 1..10 and `isLevelOpen(getCleared(...), level)` else `goto('/play/counting')`. Top bar: back → level map, `MuteButton`, round indicator (5 dots). Prompt: `m.prompt_<kind>()` when the round has one kind, else `m.how_many()`. Fruit field (`position:relative`, ~55dvh): each fruit `<button>` (≥56px hit area) with `Fruit`; tap → `Sparkles` at fruit + `audio.playSfx('tap')`; if `assist` and not yet counted → counted tick (small number bubble) else just sparkle. Bubbles row: `NumeralBubble` per option — tap: if correct → `playSfx('correct')`, `Sparkles` on the bubble, phase `celebrating`, Bufi `cheer` pose, then `advance()` after ~1100ms; on level completion → `clearLevel` + persist + `playSfx('unlock')` + `LevelComplete` overlay (confetti) with actions: next (`goto` next level), replay, all levels. Wrong → `NumeralBubble` `wrong` + `playSfx('wrong')` + `misses++` (no other penalty). Hint display: Bufi bubble (`hint` pose) under the prompt showing `hint_nudge` / `hint_strong` / `hint_reveal({count})` per `hintStage`; stage ≥2: correct bubble gets `glow`; stage 3: `pulse`. Help button: small Bufi head `IconButton` (always visible) → `session.help()` + hint sfx. Idle timer: 10s without interaction → idle nudge (reset each round/answer).
- [ ] **Step 4: verify.** `pnpm check`, `pnpm build`, `pnpm test`; orchestrator browser-tests the full flow.

### Task 13: README, deploy config, final polish

**Files:**

- Create: `README.md`, `vercel.json`

**Interfaces:**

- Consumes: everything.
- [ ] **Step 1: `vercel.json`.** SPA rewrites: `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`.
- [ ] **Step 2: `README.md`.** What it is (one paragraph + spec link), stack, `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm check`, `pnpm build`, `pnpm preview`, `pnpm icons`; deploy: import the GitHub repo in Vercel (static build, no env vars; includes `vercel.json` rewrites); structure map (`src/lib/{audio,storage,games,pwa,components}`, routes); credits: reference projects used, portrait/landscape note.
- [ ] **Step 3: verify.** `pnpm check`, `pnpm test`, `pnpm build`, `pnpm preview` serves the app locally.

---

## Deliberately deferred

- Voice narration (milestone 1.5): needs a Romanian audition on the local Qwen3-TTS studio; message keys are already structured so lines can map to keys later.
- Games 2–7 (wave 1 continues after this plan), stars/badges, remote sync, analytics — all out of scope here.

## Owner directives (amendments)

- **2026-10-09: Graphics and art tasks dispatch to DeepSeek V4.1 Flash** (`opencode-go/deepseek-v4.1-flash`, paid $0.15/$0.6 per M tokens) — owner-certified via _Wurstel e Sogni_ and reaffirmed explicitly. Muse Spark 1.3 only when the owner asks for it; every asset report names its artist.
- 2026-10-09: Every counting level offers exactly **3 numeral choices**; fruit kinds **rotate per level**; fruits and avatars have **happy/plain/sad moods** and the counting field smiles on correct answers, looks sad on wrong ones.
- 2026-10-09: **Mascot replaced** — Bufi the owl becomes **Muguri**, a little sprout (Task 17); the owl remains a profile avatar. **Game graphics mirror Muguri's garden palette** (Task 18): garden field, sprout-bud decorations, leaf accents — fruits keep their identity colors. Music iterated by listening (owner, who also hand-tunes `music.ts` directly): `SCENE_TEMPO` 96/103 (game tempo owner-tuned), marimba peak 0.17, high sparkles calmed (ornament chance 0.28, octave echoes capped at A5, softer twiddle/echo levels).
- 2026-10-09: **Beauty pass (Task 19)** — motion language borrowed from _Wurstel e Sogni_ (overshoot "boing" arrivals, squash-and-stretch taps, staggered entrances, breathing garden light) plus a **livelier, more inviting palette** (sunlit-garden token lift; PWA icon and every inline hex copy synced). `ART-STYLE.md` added as the standing art bible (principles, palette, motion tokens, face grammar, size ladder, shipping process).

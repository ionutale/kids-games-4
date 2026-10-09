# Cozy Nook

Cozy Nook is a mobile-first, installable PWA of calm learning games for kids aged 5–8. It is fully offline, keeps all data on the device (no accounts, no analytics, no runtime network calls), and speaks Italian, Romanian, English, and German (device locale wins, Italian fallback, switcher in settings). A friendly little sprout named Muguri hosts a growing collection of gentle mini-games with hand-built HTML/CSS/SVG art, procedural WebAudio music and sound effects, and a "never stuck, never punished" hint system.

Read the full design spec: [docs/superpowers/specs/2026-10-08-cozy-nook-design.md](docs/superpowers/specs/2026-10-08-cozy-nook-design.md)

## Tech stack

- **SvelteKit 3** with **Svelte 5 runes** and **TypeScript**
- **Paraglide.js** for i18n (`it`, `ro`, `en`, `de`) with URL-cookie locale strategy
- **@sveltejs/adapter-static** — static SPA build, no server code
- **pnpm** package manager
- All sound is 100% procedural WebAudio (no audio files); all art is HTML/CSS/SVG (no in-app raster images; PNGs are PWA icons rasterized from SVG at build time)

## Quick start

Requires Node.js 26+ and pnpm.

```bash
pnpm install      # install dependencies (compiles Paraglide messages)
pnpm dev          # start the dev server
pnpm test         # run the Vitest suite
pnpm check        # svelte-check type checking
pnpm build        # static production build (output in build/)
pnpm preview      # serve the production build locally
pnpm icons        # regenerate PWA icons from SVG
```

## Deploy on Vercel

The app is a static SPA, so deployment is zero-config:

1. Import the GitHub repository (`ionutale/kids-games-4`) in the Vercel dashboard.
2. Vercel auto-detects SvelteKit and uses `@sveltejs/adapter-static` — no environment variables or extra settings are needed.
3. The included `vercel.json` adds an SPA rewrite rule, so deep links (e.g. refreshing on `/play`) serve `index.html` and routing works on the static deploy.

## Project structure

```
src/
  lib/
    audio/        procedural WebAudio engine (calm lullaby, SFX)
    storage/      localStorage save system (per-profile, versioned)
    games/        game registry + game modules (rules, levels, views)
    pwa/          service worker registration, install prompt
    components/   shared Svelte components
    styles/       global styles and design tokens
  routes/         home, play, settings (+ layouts)
messages/         Paraglide message catalogs (it, ro, en, de)
scripts/          build-time scripts (icon generation)
static/           static assets (SVG icons, favicons)
```

## Conventions

- **Imports:** always use the package `imports` map — `#lib/<path>.js` — never the `$lib` alias. The map is declared in `package.json` (`#lib` → `./src/lib/index.js`, `#lib/*` → `./src/lib/*`).
- **Audio:** all sound is generated at runtime with the WebAudio API. No audio files exist in the repo. Sound is iOS-safe: silent until the first user gesture.
- **Offline-first:** a service worker precaches the built app; once loaded, the app works fully offline and is installable as a PWA.
- **Art:** all visuals are hand-built with HTML, CSS, and SVG. Canvas is used only where it earns it (confetti, particle bursts). The only PNGs are PWA icons rasterized from SVG at build time.

## Credits

Built with inspiration and lessons from these earlier projects in the series: **kids-games-3** (the starting point — its owl mascot Bufi lives on here as a profile avatar), **cozy-forest-village** (art direction and ambient scene design), **cozy-jigsaw** (puzzle game patterns), **music-player-pwa** (procedural WebAudio and PWA patterns), and **kids-time-game** (learning-game loop and UI patterns).

The app is designed mobile-first in portrait orientation and adapts gracefully to landscape on tablets and desktop.

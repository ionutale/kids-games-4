# Hand-rolled service worker, not @vite-pwa/sveltekit

The offline strategy is a small hand-rolled service worker adapted from the proven music-player-pwa pattern: precache every build asset, cache-first for assets, network-first for navigations with a cached SPA fallback, plus an update toast. A static app this small gains nothing from a plugin's generality, and the hand-rolled version gives exact control over the update flow (no silent reloads mid-game) with zero extra dependencies. Consequence: the service worker, its pure policy functions, and the SVG→PNG icon script are ours to maintain.

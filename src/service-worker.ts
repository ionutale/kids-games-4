/// <reference types="@sveltejs/kit" />
import { assets, immutable } from '$app/manifest';
import { version } from '$app/env';
import { resolve } from '$app/paths';
import { self } from '$app/service-worker';
import { decide } from '#lib/pwa/policy';

// One cache per deployment: a new build opens a fresh cache and the activate
// handler deletes everything else, so stale assets can never be served.
const CACHE = `cozy-nook-${version}`;
const INDEX = '/index.html';

// `immutable`/`assets` are relative to the base path; resolve them to
// pathnames that can be cached and matched back.
const PRECACHE = [
	...immutable.map((asset) => resolve(asset.path)),
	...assets.map((asset) => resolve(asset.path))
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE).then(async (cache) => {
			// `addAll` is all-or-nothing, so the precache adds one entry at a
			// time: a single missing file must not fail the whole install.
			await Promise.all([...PRECACHE, INDEX].map((url) => cache.add(url).catch(() => {})));
		})
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
			// Take over open pages so the reload that follows an update is
			// served by this worker instead of the outgoing one.
			.then(() => self.clients.claim())
	);
});

// The update toast asks a waiting worker to take over immediately; the page
// reloads itself once this worker controls it (`controllerchange`).
self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
	const decision = decide(
		{
			method: event.request.method,
			url: event.request.url,
			origin: safeOrigin(event.request.url),
			mode: event.request.mode,
			destination: event.request.destination
		},
		self.location.origin
	);

	switch (decision) {
		case 'network-first':
			event.respondWith(respondNavigation(event.request));
			break;
		case 'cache-first':
			event.respondWith(respondCacheFirst(event.request));
			break;
		case 'bypass':
			// Credentials, CORS, audio and non-GET requests keep the browser's
			// default handling.
			break;
	}
});

/** An unparsable URL can only be bypassed, so it must never throw here. */
function safeOrigin(url: string): string {
	try {
		return new URL(url).origin;
	} catch {
		return '';
	}
}

/** Network-first with the cached SPA fallback; every route serves the same document. */
async function respondNavigation(request: Request): Promise<Response> {
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(CACHE);
			// A failed cache write must not fail the navigation.
			await cache.put(INDEX, response.clone()).catch(() => {});
		}
		return response;
	} catch {
		const cached = await caches.match(INDEX);
		return cached ?? Response.error();
	}
}

/** Cache-first; a miss goes to the network and is then stored for next time. */
async function respondCacheFirst(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE);
	const cached = await cache.match(request);
	if (cached) return cached;

	const response = await fetch(request);
	// Only same-origin GETs reach this point (`decide` guarantees it), so the
	// write is allowed; `Vary: *`, an opaque response or a full quota still
	// must not fail the response.
	await cache.put(request, response.clone()).catch(() => {});
	return response;
}

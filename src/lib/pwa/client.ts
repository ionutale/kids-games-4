/**
 * PWA client: registers the service worker in production browsers and exposes
 * the "an update is waiting" signal. Nothing is shown on its own — drop
 * `UpdateToast` into a page to surface it.
 */

type UpdateListener = () => void;

const listeners = new Set<UpdateListener>();

let registration: ServiceWorkerRegistration | undefined;
// The single reload is armed only by `applyUpdate`, so the reload that takes
// over from the *first* install never fires.
let updateRequested = false;
let reloading = false;

/** Subscribe to update-ready notifications; returns the unsubscribe function. */
export function onUpdateReady(listener: UpdateListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function notifyUpdateReady(): void {
	for (const listener of listeners) listener();
}

/**
 * Register `/service-worker.js`. Production only (a dev registration would keep
 * serving stale assets) and only where the API exists.
 */
export function initPwa(): void {
	if (!import.meta.env.PROD) return;
	if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

	navigator.serviceWorker.addEventListener('controllerchange', () => {
		if (!updateRequested || reloading) return;
		reloading = true;
		window.location.reload();
	});

	navigator.serviceWorker
		.register('/service-worker.js')
		.then((reg) => {
			registration = reg;
			watchForUpdate(reg);
		})
		.catch(() => {
			// Offline, private mode or an unsupported context: the app still
			// works, it just updates on the next full load.
		});
}

/** A second worker installing while this page is controlled is an update. */
function watchForUpdate(reg: ServiceWorkerRegistration): void {
	reg.addEventListener('updatefound', () => {
		const installing = reg.installing;
		if (!installing) return;
		installing.addEventListener('statechange', () => {
			if (installing.state === 'installed' && navigator.serviceWorker.controller) {
				notifyUpdateReady();
			}
		});
	});
}

/** Tell the waiting worker to take over now (the page reloads once after). */
export function applyUpdate(): void {
	updateRequested = true;
	registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
}

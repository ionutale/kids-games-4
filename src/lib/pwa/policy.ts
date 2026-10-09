export type CacheDecision = 'bypass' | 'cache-first' | 'network-first';

/** The request facts the service worker can observe, kept free of `Request`. */
export interface RequestDecision {
	method: string;
	url: string;
	/** Origin of the request itself; derived from `url` when omitted. */
	origin?: string;
	mode?: string;
	destination?: string;
}

/** A path whose last segment carries an extension is an asset, not a page. */
const HAS_EXTENSION = /\.[^/]+$/;

/**
 * Decide how the service worker caches a request.
 *
 * `appOrigin` is the origin the app is served from (the worker's own scope
 * origin). Anything that is not a same-origin GET — another method, another
 * origin, a Range request — is left to the browser so credentials, CORS and
 * partial-content semantics stay untouched.
 */
export function decide(request: RequestDecision, appOrigin: string): CacheDecision {
	const method = (request.method ?? 'GET').toUpperCase();
	if (method !== 'GET') return 'bypass';

	const url = new URL(request.url, appOrigin);
	const origin = request.origin ?? url.origin;
	if (origin !== appOrigin) return 'bypass';

	// Documents change on every deploy, so they must be revalidated online.
	if (request.mode === 'navigate' || request.destination === 'document') return 'network-first';

	// Build output (`_app/...`) and everything copied from `static/` carries an
	// extension; API calls, audio and anything else without one are bypassed.
	if (HAS_EXTENSION.test(url.pathname)) return 'cache-first';

	return 'bypass';
}

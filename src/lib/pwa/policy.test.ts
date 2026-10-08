import { describe, expect, it } from 'vitest';
import { decide } from './policy';

const ORIGIN = 'https://cozy-nook.example';
const OTHER = 'https://cdn.example';

describe('decide', () => {
	it('serves same-origin GET navigations network-first', () => {
		expect(decide({ method: 'GET', url: `${ORIGIN}/`, mode: 'navigate' }, ORIGIN)).toBe(
			'network-first'
		);
		expect(decide({ method: 'GET', url: `${ORIGIN}/it/`, mode: 'navigate' }, ORIGIN)).toBe(
			'network-first'
		);
		expect(decide({ method: 'GET', url: `${ORIGIN}/play/12`, mode: 'navigate' }, ORIGIN)).toBe(
			'network-first'
		);
	});

	it('treats a same-origin document destination as a navigation', () => {
		expect(
			decide({ method: 'GET', url: `${ORIGIN}/play/12`, destination: 'document' }, ORIGIN)
		).toBe('network-first');
	});

	it('serves same-origin GET assets cache-first', () => {
		expect(
			decide(
				{ method: 'GET', url: `${ORIGIN}/_app/immutable/assets/0.abc123.css`, mode: 'cors' },
				ORIGIN
			)
		).toBe('cache-first');
		expect(
			decide(
				{ method: 'GET', url: `${ORIGIN}/_app/immutable/entry/start.abc123.js`, mode: 'cors' },
				ORIGIN
			)
		).toBe('cache-first');
		expect(decide({ method: 'GET', url: `${ORIGIN}/icons/icon-192.png` }, ORIGIN)).toBe(
			'cache-first'
		);
		expect(decide({ method: 'GET', url: `${ORIGIN}/manifest.webmanifest` }, ORIGIN)).toBe(
			'cache-first'
		);
		expect(decide({ method: 'GET', url: `${ORIGIN}/favicon.svg` }, ORIGIN)).toBe('cache-first');
	});

	it('bypasses non-GET requests', () => {
		expect(decide({ method: 'POST', url: `${ORIGIN}/api/progress`, mode: 'cors' }, ORIGIN)).toBe(
			'bypass'
		);
		expect(decide({ method: 'HEAD', url: `${ORIGIN}/manifest.webmanifest` }, ORIGIN)).toBe(
			'bypass'
		);
	});

	it('bypasses cross-origin requests', () => {
		expect(decide({ method: 'GET', url: `${OTHER}/font.woff2`, mode: 'cors' }, ORIGIN)).toBe(
			'bypass'
		);
		expect(
			decide({ method: 'GET', url: `${OTHER}/api/art`, origin: OTHER, mode: 'cors' }, ORIGIN)
		).toBe('bypass');
	});

	it('bypasses unknown same-origin requests that are neither navigation nor asset', () => {
		expect(decide({ method: 'GET', url: `${ORIGIN}/api/progress`, mode: 'cors' }, ORIGIN)).toBe(
			'bypass'
		);
		expect(decide({ method: 'GET', url: `${ORIGIN}/api/progress`, mode: 'no-cors' }, ORIGIN)).toBe(
			'bypass'
		);
		expect(decide({ method: 'GET', url: `${ORIGIN}/`, mode: 'cors' }, ORIGIN)).toBe('bypass');
	});

	it('derives the request origin when the caller omits it', () => {
		expect(decide({ method: 'GET', url: `${OTHER}/script.js`, mode: 'cors' }, ORIGIN)).toBe(
			'bypass'
		);
		expect(decide({ method: 'GET', url: '/icons/icon-512.png' }, ORIGIN)).toBe('cache-first');
		expect(decide({ method: 'GET', url: '/', mode: 'navigate' }, ORIGIN)).toBe('network-first');
	});
});

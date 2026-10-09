import { describe, expect, it } from 'vitest';

import italian from '../../messages/it.json';
import romanian from '../../messages/ro.json';
import english from '../../messages/en.json';
import german from '../../messages/de.json';

/**
 * Parity guard for the four Cozy Nook locales.
 *
 * Every locale must expose exactly the same message keys as the base locale
 * (`it`), and every message must use exactly the same interpolation
 * placeholders (`{n}`, `{done}`, `{count}`) as its English counterpart, so a
 * missing key or a renamed placeholder breaks the test instead of the UI.
 */

const locales = {
	it: italian,
	ro: romanian,
	en: english,
	de: german
} as const;
type Locale = keyof typeof locales;

const localeNames = Object.keys(locales) as Locale[];

/** The inlang schema pointer is metadata, not a message key. */
const SCHEMA_KEY = '$schema';

/** The brand name is identical everywhere. */
const APP_NAME = 'Cozy Nook';

function asMessages(locale: Locale): Record<string, unknown> {
	return locales[locale] as unknown as Record<string, unknown>;
}

function messageKeys(locale: Locale): string[] {
	return Object.keys(asMessages(locale))
		.filter((key) => key !== SCHEMA_KEY)
		.sort();
}

/** Placeholder names used inside a message, e.g. "{done} of 10 levels" -> ["done"]. */
function placeholdersOf(message: string): string[] {
	return [...message.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

function sorted(values: readonly string[]): string[] {
	return [...values].sort();
}

describe('i18n message parity', () => {
	it('defines a non-empty key set in every locale', () => {
		for (const locale of localeNames) {
			const keys = messageKeys(locale);
			expect(keys.length, `${locale} should have messages`).toBeGreaterThan(0);
		}
	});

	it('uses the same keys in every locale as in the base locale', () => {
		const base = messageKeys('it');
		for (const locale of localeNames) {
			expect(sorted(messageKeys(locale)), `${locale} key set`).toEqual(base);
		}
	});

	it('keeps the schema pointer in every locale', () => {
		for (const locale of localeNames) {
			expect(asMessages(locale)[SCHEMA_KEY], `${locale} ${SCHEMA_KEY}`).toBe(
				'https://inlang.com/schema/inlang-message-format'
			);
		}
	});

	it('translates every message as a non-empty string', () => {
		for (const locale of localeNames) {
			const messages = asMessages(locale);
			for (const [key, value] of Object.entries(messages)) {
				if (key === SCHEMA_KEY) continue;
				expect(typeof value, `${locale}.${key} type`).toBe('string');
				expect((value as string).trim().length, `${locale}.${key} is not empty`).toBeGreaterThan(0);
			}
		}
	});

	it('uses the same placeholders per key across locales', () => {
		const base = asMessages('it');
		for (const key of messageKeys('it')) {
			const expected = placeholdersOf(String(base[key]));
			for (const locale of localeNames) {
				const actual = placeholdersOf(String(asMessages(locale)[key]));
				expect(actual, `${locale}.${key} placeholders`).toEqual(expected);
			}
		}
	});

	it('covers the placeholder-bearing messages', () => {
		expect(placeholdersOf(String(asMessages('en').locked_detail))).toEqual(['n']);
		expect(placeholdersOf(String(asMessages('en').level))).toEqual(['n']);
		expect(placeholdersOf(String(asMessages('en').progress))).toEqual(['done']);
		expect(placeholdersOf(String(asMessages('en').hint_reveal))).toEqual(['count']);
	});

	it('keeps the brand name in every locale', () => {
		for (const locale of localeNames) {
			expect(asMessages(locale).app_name, `${locale}.app_name`).toBe(APP_NAME);
		}
	});
});

import { describe, expect, it } from 'vitest';
import { GAMES, getGame } from './registry.js';

describe('GAMES', () => {
	it('registers the counting game', () => {
		expect(GAMES[0].href).toBe('/play/counting');
	});

	it('matches the brief exactly', () => {
		expect(GAMES).toEqual([
			{
				id: 'counting',
				titleKey: 'game_counting_name',
				descKey: 'game_counting_desc',
				href: '/play/counting',
				accent: 'leaf',
				icon: 'fruit'
			},
			{
				id: 'color-match',
				titleKey: 'game_color_match_name',
				descKey: 'game_color_match_desc',
				href: '/play/color-match',
				accent: 'berry',
				icon: 'color'
			}
		]);
	});
});

describe('getGame', () => {
	it('finds a known game', () => {
		expect(getGame('counting')).toEqual(GAMES[0]);
	});

	it('finds the color-match game', () => {
		expect(getGame('color-match')).toEqual(GAMES[1]);
	});

	it('returns undefined for an unknown game', () => {
		expect(getGame('nope')).toBeUndefined();
	});
});

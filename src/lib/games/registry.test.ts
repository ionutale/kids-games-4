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
			},
			{
				id: 'acorn-add',
				titleKey: 'game_acorn_add_name',
				descKey: 'game_acorn_add_desc',
				href: '/play/acorn-add',
				accent: 'accent',
				icon: 'logic'
			},
			{
				id: 'feelings-faces',
				titleKey: 'game_feelings_name',
				descKey: 'game_feelings_desc',
				href: '/play/feelings-faces',
				accent: 'leaf',
				icon: 'face'
			},
			{
				id: 'peekaboo-pairs',
				titleKey: 'game_peekaboo_name',
				descKey: 'game_peekaboo_desc',
				href: '/play/peekaboo-pairs',
				accent: 'berry',
				icon: 'pairs'
			},
			{
				id: 'brush-along',
				titleKey: 'game_brush_name',
				descKey: 'game_brush_desc',
				href: '/play/brush-along',
				accent: 'leaf',
				icon: 'brush'
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

	it('finds the acorn-add game', () => {
		expect(getGame('acorn-add')).toEqual(GAMES[2]);
	});

	it('finds the feelings-faces game', () => {
		expect(getGame('feelings-faces')).toEqual(GAMES[3]);
	});

	it('finds the peekaboo-pairs game', () => {
		expect(getGame('peekaboo-pairs')).toEqual(GAMES[4]);
	});

	it('finds the brush-along game', () => {
		expect(getGame('brush-along')).toEqual(GAMES[5]);
	});

	it('returns undefined for an unknown game', () => {
		expect(getGame('nope')).toBeUndefined();
	});
});

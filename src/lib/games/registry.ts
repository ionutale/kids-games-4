/**
 * Registry of the games Cozy Nook ships. Tasks 11 and 12 read this to
 * build the home screen and the play routes; adding a game means adding
 * one entry here.
 */

export type GameId = 'counting' | 'color-match' | 'acorn-add';

export interface GameMeta {
	id: GameId;
	/** Message key for the game's display name. */
	titleKey: string;
	/** Message key for the game's short description. */
	descKey: string;
	href: string;
	accent: 'leaf' | 'accent' | 'berry';
	icon: 'fruit' | 'color' | 'logic';
}

export const GAMES: GameMeta[] = [
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
	}
];

export function getGame(id: string): GameMeta | undefined {
	return GAMES.find((game) => game.id === id);
}

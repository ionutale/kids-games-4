// The audio surface of $lib. Game code, the shell and the settings screen import `audio` and the
// two unions from here and never touch WebAudio directly.
//
//   import { audio } from '$lib/audio';
//   audio.unlock();            // on the first user gesture
//   audio.playMusic('home');   // before unlock is fine — it is remembered
//   audio.playSfx('correct');
//   audio.setMuted(true);

export { audio, createCozyAudio } from './engine';
export type { CozyAudio, CozyAudioOptions } from './engine';
export type { MusicScene } from './music';
export type { SfxName } from './sfx';

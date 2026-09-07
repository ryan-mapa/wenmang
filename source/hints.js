// The hint ladder for the writing pad.
//
// Split from writing.js because it is the only part of handwriting that needs
// the character tables, and writing.js has to stay importable by the Worker —
// which folds character history on the server and has no business carrying the
// whole word list to do it.

import { characterInfo } from './characters.js';

// The hint ladder. Each rung gives away strictly more than the one before, and
// the early rungs deliberately give away *structure* rather than shape — how
// long the character is, and what family it belongs to. That is the Wubi
// insight applied without Wubi's data: a learner who is told "this is a 女
// character with six strokes" usually recovers the rest themselves, and has
// learned something reusable when they do. Being shown the next stroke teaches
// them only that stroke.
export const HINT_LEVELS = ['strokeCount', 'radical', 'outline', 'nextStroke'];

/**
 * Build the hint at `level` for a character, or null past the end of the ladder.
 *
 * `reveals` names what the pad must do, so the renderer never has to interpret
 * the hint text. A character with no Unihan entry skips the structural rungs
 * rather than inventing them — there is no honest stroke count to give.
 */
export function hintAt(char, level) {
  const info = characterInfo(char);
  const rung = HINT_LEVELS[level];

  switch (rung) {
    case 'strokeCount':
      if (!info.strokes) return hintAt(char, level + 1);
      return {
        level,
        rung,
        text: `${info.strokes} strokes`,
        reveals: 'nothing'
      };

    case 'radical':
      if (!info.radical) return hintAt(char, level + 1);
      if (info.isRadicalItself) {
        return {
          level,
          rung,
          text: `This one is the radical itself — ${info.radical.display}, ${info.radical.en}`,
          reveals: 'nothing'
        };
      }
      return {
        level,
        rung,
        text: `Built on ${info.radical.display} (${info.radical.py}) — ${info.radical.en}`,
        reveals: 'nothing'
      };

    case 'outline':
      return {
        level,
        rung,
        text: 'Showing the shape',
        reveals: 'outline'
      };

    case 'nextStroke':
      return {
        level,
        rung,
        text: 'Showing the next stroke',
        reveals: 'nextStroke'
      };

    default:
      return null;
  }
}

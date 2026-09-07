// Building a round, of either kind.
//
// A round is the unit the daily goal counts, so the two kinds have to feel like
// comparable work even though they are not the same length. Twenty multiple
// choice questions and ten characters both land around two minutes, which is
// what actually matters — a learner deciding between them should be choosing
// what to practise, not how long to be busy.
//
// Ten characters is also about the ceiling for handwriting in one sitting.
// Twenty would be more rounds-per-hour but the last five would be mush, and a
// character practised badly is worse than one not practised: the hand learns
// the wrong order and then has to unlearn it.

import { selectNext, newCard } from './srs.js';
import { availableCharacters, teachingOrder } from './characters.js';
import { suggestedMode } from './writing.js';
import { ROUND_LENGTH as WORD_ROUND_LENGTH_SOURCE } from './game.js';

export const ROUND_TYPES = ['words', 'characters'];

export const ROUND_LABELS = {
  words: 'Words',
  characters: 'Characters'
};

/** Word rounds are game.js's business; re-exported so the picker can label them. */
export const WORD_ROUND_LENGTH = WORD_ROUND_LENGTH_SOURCE;
export const CHARACTER_ROUND_LENGTH = 10;

export function roundLength(type) {
  return type === 'characters' ? CHARACTER_ROUND_LENGTH : WORD_ROUND_LENGTH;
}

/**
 * Can a character round be played at all?
 *
 * Character practice is gated on mastered vocabulary, so early on the answer is
 * no — and the app has to say so rather than offering an empty round. The
 * threshold is one character, not one word: the moment anything is unlocked
 * there is something real to practise.
 */
export function charactersReady(wordCards) {
  return availableCharacters(wordCards).length > 0;
}

/**
 * The characters for a writing round, each with the mode it should open in.
 *
 * Scheduling picks *which* characters — the same overdue-first logic the words
 * use — and then the round is re-sorted into teaching order so the session runs
 * simple to complex. Those are different questions: the scheduler decides what
 * needs work, the ordering decides what makes a coherent sitting. Meeting a
 * twelve-stroke character while your hand is cold is how people quit.
 *
 * `preferredMode` is the learner's toggle. Null means "follow the card", which
 * is the default and the only setting that walks someone up the ladder on its
 * own.
 */
export function buildCharacterRound(wordCards, charCards, now, options = {}) {
  const { random = Math.random, length = CHARACTER_ROUND_LENGTH, preferredMode = null } = options;

  const available = availableCharacters(wordCards);
  if (available.length === 0) return [];

  const chosen = [];
  const taken = new Set();
  let avoid = null;

  for (let i = 0; i < length; i++) {
    const remaining = available.filter((entry) => !taken.has(entry.char));
    if (remaining.length === 0) break;

    const entry = selectNext(remaining, charCards, now, {
      avoid,
      random,
      keyOf: (item) => item.char
    });
    if (!entry) break;

    taken.add(entry.char);
    chosen.push(entry);
    avoid = entry.char;
  }

  const order = teachingOrder(chosen.map((entry) => entry.char));
  return order.map((char) => {
    const entry = chosen.find((item) => item.char === char);
    const card = charCards[char] ?? newCard();
    return {
      char,
      /** The word that unlocked it, shown so the character has a reason to exist. */
      from: entry.from,
      mode: preferredMode ?? suggestedMode(card)
    };
  });
}

/**
 * Which round types can be played right now, for the picker.
 * Words are always available; characters depend on unlocked vocabulary.
 */
export function availableRounds(wordCards) {
  return ROUND_TYPES.filter((type) => type === 'words' || charactersReady(wordCards));
}

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
import { availableCharacters, writingSequence, strokesOf } from './characters.js';
import { ALL_DECK_ID } from './vocab.js';
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

/** Whether the chosen deck and source contain any characters at all. */
export function charactersReady(wordCards, source = 'all', deckId = ALL_DECK_ID) {
  return availableCharacters(wordCards, source, deckId).length > 0;
}

/**
 * A writing round, as whole words.
 *
 * The unit is a word, not a character, and that is the point. You are never
 * asked to write 狐 on its own — you are asked to write 狐狸, and the pad gives
 * you one square per character. Practising half of a two-character word teaches
 * a shape without the word it belongs to, and leaves the learner guessing which
 * half the app meant.
 *
 * Scheduling still runs on *characters*, because that is what progress is
 * tracked against: the scheduler picks the character most in need of work, and
 * the word containing it comes along with it. Every character of that word is
 * then written, including ones that were not due — writing 狸 is the price of
 * writing 狐狸, and it is a cheap one.
 *
 * `length` counts characters rather than words, so a round is a consistent
 * amount of hand-work whether it lands on ten single-character words or five
 * two-character ones. It is a floor, not a ceiling: the last word is never cut
 * in half to hit the number exactly.
 *
 * `preferredMode` is the learner's toggle. Null means "follow the card", which
 * is the default and the only setting that walks someone up the ladder on its
 * own.
 */
export function buildCharacterRound(wordCards, charCards, now, options = {}) {
  const {
    random = Math.random,
    length = CHARACTER_ROUND_LENGTH,
    preferredMode = null,
    source = 'all',
    deckId = ALL_DECK_ID
  } = options;

  const available = availableCharacters(wordCards, source, deckId);
  if (available.length === 0) return [];

  const chosenWords = [];
  const usedWords = new Set();
  const usedChars = new Set();
  let written = 0;
  let avoid = null;

  while (written < length) {
    // A character already covered by a chosen word is not worth scheduling
    // again — it is going to be written either way.
    const remaining = available.filter(
      (entry) => !usedChars.has(entry.char) && !usedWords.has(entry.from.zh)
    );
    if (remaining.length === 0) break;

    const entry = selectNext(remaining, charCards, now, {
      avoid,
      random,
      keyOf: (item) => item.char
    });
    if (!entry) break;

    const sequence = writingSequence(entry.from);
    usedWords.add(entry.from.zh);
    for (const ch of sequence) usedChars.add(ch);

    chosenWords.push({ word: entry.from, sequence });
    written += sequence.length;
    avoid = entry.char;
  }

  // Simple to complex, by how much hand-work the whole word is. Meeting a
  // twenty-stroke word while your hand is cold is how people quit.
  return chosenWords
    .sort(
      (a, b) =>
        strokesOf(a.word) - strokesOf(b.word) ||
        (a.word.zh < b.word.zh ? -1 : a.word.zh > b.word.zh ? 1 : 0)
    )
    .map(({ word, sequence }) => ({
      word,
      chars: sequence.map((char) => ({
        char,
        mode: preferredMode ?? suggestedMode(charCards[char] ?? newCard())
      }))
    }));
}

/** How many characters a built round asks you to write. */
export function charactersInRound(items) {
  return items.reduce((total, item) => total + item.chars.length, 0);
}

/**
 * Which round types can be played right now, for the picker.
 * Both practice types are always available; an empty source is handled by the UI.
 */
export function availableRounds() {
  return [...ROUND_TYPES];
}

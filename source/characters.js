// Which characters are available to write, and in what order.
//
// Character practice is filtered the same two ways the learner already thinks
// about their vocabulary: by deck, and by whether they know the word yet. Every
// character keeps a word alongside it, because a character with no word is a
// shape with no reason to be learned.

import { allWords, deckWords, ALL_DECK_ID } from './vocab.js';
import { CHARACTER_DATA } from './character-data.js';
import { getRadical, formsOf } from './radicals.js';
import { newCard } from './srs.js';

/** Han characters in a string, in order, keeping duplicates out. */
export function charactersIn(text) {
  return [...new Set([...String(text)].filter((ch) => /\p{Script=Han}/u.test(ch)))];
}

/**
 * The characters of a word in writing order, keeping repeats.
 *
 * Deliberately not `charactersIn`, which dedupes. Writing 妈妈 means writing 妈
 * twice, and a pad row that showed one square for a two-character word would be
 * showing the wrong word. Repeats matter here in a way they do not when asking
 * "which characters does this learner have access to".
 */
export function writingSequence(word) {
  return [...word.zh].filter((ch) => /\p{Script=Han}/u.test(ch));
}

/** Total strokes to write a whole word, for ordering a round simple to complex. */
export function strokesOf(word) {
  return writingSequence(word).reduce(
    (total, ch) => total + (CHARACTER_DATA[ch]?.strokes ?? 0),
    0
  );
}

/** Every character the app could ever teach, because a deck word uses it. */
export function allCharacters() {
  return [...new Set(allWords().flatMap((word) => charactersIn(word.zh)))].sort();
}

/** The words containing a character, so a lesson can show it in context. */
export function wordsUsing(char) {
  return allWords().filter((word) => word.zh.includes(char));
}

/**
 * Characters to practise writing, from one deck or from all of them.
 *
 * Two filters, and they answer different questions. `deckId` is the subject the
 * learner picked — writing the characters of the Food deck is a coherent
 * session in a way that writing ten characters drawn from the whole language is
 * not. `source` is how much of that deck they have earned: everything in it, or
 * only words whose last answer was right.
 *
 * `wordCards` is the vocabulary card map — writing progress lives in a separate
 * map and is deliberately not consulted here. Availability is a question about
 * what you understand, not about what you have already practised writing.
 *
 * Deduped by character, and the first word to claim one keeps it. So a
 * character shared by two words is practised once, in the context of whichever
 * word the deck reaches first.
 */
export function availableCharacters(wordCards, source = 'all', deckId = ALL_DECK_ID) {
  const unlocked = new Map();
  for (const word of deckWords(deckId)) {
    const card = wordCards[word.zh] ?? newCard();
    if (source === 'known' && card.box <= 0) continue;
    for (const ch of charactersIn(word.zh)) {
      if (!unlocked.has(ch)) unlocked.set(ch, word);
    }
  }
  return [...unlocked].map(([char, from]) => ({ char, from }));
}

/**
 * What we know about a character's construction.
 *
 * `radical` is null for a character with no Unihan entry — possible if a deck
 * gains a character before the table is regenerated. Callers must cope rather
 * than assume, because the failure mode otherwise is a lesson that renders
 * "undefined" at someone learning to write.
 */
export function characterInfo(char) {
  const data = CHARACTER_DATA[char] ?? null;
  const radical = data ? getRadical(data.radical) : null;

  return {
    char,
    strokes: data?.strokes ?? null,
    residual: data?.residual ?? null,
    radical,
    radicalForms: radical ? formsOf(radical.number) : [],
    /** The radical is the whole character — 女, 木, 水. Nothing to decompose. */
    isRadicalItself: Boolean(data && data.residual === 0),
    known: Boolean(data)
  };
}

/**
 * Characters sharing a radical, which is what makes the radical worth teaching:
 * meeting 妈 after 好 and 姐 should feel like a pattern, not a fourth stranger.
 */
export function siblingsOf(char) {
  const data = CHARACTER_DATA[char];
  if (!data) return [];
  return allCharacters().filter(
    (other) => other !== char && CHARACTER_DATA[other]?.radical === data.radical
  );
}

/**
 * Teaching order for a set of characters: simplest first.
 *
 * Stroke count is the primary key because it is the honest measure of how much
 * hand-work a character is. Radical groups characters that share structure so
 * they arrive together, and the character itself breaks ties so the order is
 * stable across sessions — a lesson list that reshuffles itself is one nobody
 * can build a habit around.
 */
export function teachingOrder(chars) {
  return [...chars].sort((a, b) => {
    const da = CHARACTER_DATA[a];
    const db = CHARACTER_DATA[b];
    if (!da || !db) return da ? -1 : db ? 1 : a < b ? -1 : 1;
    return (
      da.strokes - db.strokes ||
      da.radical - db.radical ||
      (a < b ? -1 : a > b ? 1 : 0)
    );
  });
}

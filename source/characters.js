// The bridge from knowing words to writing characters.
//
// A character becomes available to learn once you have mastered a word that
// contains it. That ordering is the point: writing 苹 from a blank pad is a
// memory task with nothing to hold on to unless 苹果 already means apple to
// you. Meaning first, then the hand.
//
// It also keeps the writing set honest. There are tens of thousands of
// characters and no learner needs them in the abstract; they need the ones
// inside the words they actually use. So this module never lists a character
// the learner has no reason for — the inventory grows out of their own
// vocabulary, and every character in it can name the word that earned it.

import { allWords } from './vocab.js';
import { CHARACTER_DATA } from './character-data.js';
import { getRadical, formsOf } from './radicals.js';
import { newCard, isMastered } from './srs.js';

/** Han characters in a string, in order, keeping duplicates out. */
export function charactersIn(text) {
  return [...new Set([...String(text)].filter((ch) => /\p{Script=Han}/u.test(ch)))];
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
 * Characters unlocked by mastered vocabulary, with the word that unlocked each.
 *
 * `wordCards` is the vocabulary card map — writing progress lives in a separate
 * map and is deliberately not consulted here. Availability is a question about
 * what you understand, not about what you have already practised writing.
 */
export function availableCharacters(wordCards) {
  const unlocked = new Map();
  for (const word of allWords()) {
    const card = wordCards[word.zh] ?? newCard();
    if (!isMastered(card)) continue;
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

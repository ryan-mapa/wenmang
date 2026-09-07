import { describe, it, expect } from 'vitest';
import { DECKS, ALL_DECK_ID, STAGE_COUNT, allWords, findWord, stageWords, deckWords } from '../source/vocab.js';
import { CHARACTER_DATA } from '../source/character-data.js';
import { charactersIn } from '../source/characters.js';

const everyEntry = () => DECKS.flatMap((deck) => deck.stages.flat());

describe('deck structure', () => {
  it('gives every deck the same number of stages', () => {
    for (const deck of DECKS) expect(deck.stages).toHaveLength(STAGE_COUNT);
  });

  it('gives every deck a unique id', () => {
    const ids = DECKS.map((deck) => deck.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not collide with the combined deck id', () => {
    expect(DECKS.map((deck) => deck.id)).not.toContain(ALL_DECK_ID);
  });
});

describe('every entry is complete', () => {
  it('has characters, pinyin and a gloss', () => {
    for (const word of everyEntry()) {
      expect(word.zh, `${word.zh} characters`).toBeTruthy();
      expect(word.py, `${word.zh} pinyin`).toBeTruthy();
      expect(word.en, `${word.zh} gloss`).toBeTruthy();
    }
  });

  it('writes pinyin with tone marks rather than tone numbers', () => {
    for (const word of everyEntry()) {
      expect(word.py, `${word.zh} pinyin`).not.toMatch(/\d/);
    }
  });

  it('uses only Han characters on the Chinese side', () => {
    for (const word of everyEntry()) {
      expect([...word.zh].every((ch) => /\p{Script=Han}/u.test(ch)), word.zh).toBe(true);
    }
  });
});

describe('a shared word is one card', () => {
  it('glosses a duplicated headword identically in every deck', () => {
    // 鱼 is in both Food and Animals. Because the card is keyed by the
    // characters, two different glosses would teach two different answers
    // depending on where the learner met it.
    const byKey = new Map();
    for (const word of everyEntry()) {
      const seen = byKey.get(word.zh);
      if (seen) {
        expect(word.en, `${word.zh} gloss`).toBe(seen.en);
        expect(word.py, `${word.zh} pinyin`).toBe(seen.py);
      } else {
        byKey.set(word.zh, word);
      }
    }
  });

  it('dedupes it in the combined word list', () => {
    const keys = allWords().map((word) => word.zh);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('character data covers the decks', () => {
  it('knows every character a deck word uses', () => {
    const missing = allWords()
      .flatMap((word) => charactersIn(word.zh))
      .filter((ch) => !CHARACTER_DATA[ch]);
    expect([...new Set(missing)]).toEqual([]);
  });
});

describe('lookups', () => {
  it('finds a word by its characters', () => {
    expect(findWord('苹果').en).toBe('apple');
  });

  it('returns null for a word that is not in any deck', () => {
    expect(findWord('量子力学')).toBeNull();
  });

  it('collects a deck across its stages', () => {
    const [basics, everyday, fluent] = [0, 1, 2].map((stage) => stageWords('shiwu', stage));
    expect(deckWords('shiwu')).toEqual([...basics, ...everyday, ...fluent]);
  });

  it('has every stage of every deck populated', () => {
    // Everyday and Fluent shipped empty at first, and the stage machinery was
    // built to cope with that. It no longer has to.
    for (const deck of DECKS) {
      for (const [stage, words] of deck.stages.entries()) {
        expect(words.length, `${deck.id} stage ${stage}`).toBeGreaterThan(0);
      }
    }
  });

  it('collects every deck for the combined id', () => {
    expect(stageWords(ALL_DECK_ID, 0).length).toBe(
      DECKS.reduce((n, deck) => n + deck.stages[0].length, 0)
    );
  });
});

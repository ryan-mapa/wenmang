import { describe, it, expect } from 'vitest';
import {
  charactersIn,
  allCharacters,
  wordsUsing,
  availableCharacters,
  characterInfo,
  siblingsOf,
  teachingOrder
} from '../source/characters.js';
import { newCard, BOX_COUNT } from '../source/srs.js';
import { ALL_DECK_ID, deckWords } from '../source/vocab.js';

const mastered = () => ({ ...newCard(), box: BOX_COUNT - 1 });

describe('pulling characters out of words', () => {
  it('keeps Han characters and drops everything else', () => {
    expect(charactersIn('苹果')).toEqual(['苹', '果']);
    expect(charactersIn('píngguǒ')).toEqual([]);
  });

  it('does not repeat a character that occurs twice', () => {
    expect(charactersIn('妈妈')).toEqual(['妈']);
  });
});

describe('character sources', () => {
  it('offers nothing at the start', () => {
    expect(availableCharacters({}, 'known')).toEqual([]);
  });

  it('unlocks both characters of a mastered two-character word', () => {
    const unlocked = availableCharacters({ 苹果: mastered() }, 'known');
    expect(unlocked.map((entry) => entry.char).sort()).toEqual(['果', '苹']);
  });

  it('includes a word after one correct answer without requiring mastery', () => {
    expect(availableCharacters({ 苹果: { ...newCard(), box: 1 } }, 'known').map(x => x.char).sort()).toEqual(['果', '苹']);
  });

  it('excludes a word after a miss even if it was previously correct', () => {
    expect(availableCharacters({ 苹果: { ...newCard(), box: 0, correct: 3, seen: 4 } }, 'known')).toEqual([]);
  });

  it('offers every vocabulary character by default without word progress', () => {
    expect(availableCharacters({}).map(x => x.char).sort()).toEqual(allCharacters());
  });

  it('remembers which word earned each character', () => {
    const [entry] = availableCharacters({ 苹果: mastered() }, 'known');
    expect(entry.from.zh).toBe('苹果');
    expect(entry.from.en).toBe('apple');
  });

  it('credits a shared character to one word only', () => {
    const unlocked = availableCharacters({ 妈妈: mastered(), 好: mastered() }, 'known');
    const chars = unlocked.map((entry) => entry.char);
    expect(new Set(chars).size).toBe(chars.length);
  });
});

describe('what we know about a character', () => {
  it('reads the radical and stroke count from Unihan', () => {
    const info = characterInfo('妈');
    expect(info.strokes).toBe(6);
    expect(info.radical.display).toBe('女');
    expect(info.radical.en).toBe('woman');
  });

  it('recognises a character that is its own radical', () => {
    expect(characterInfo('女').isRadicalItself).toBe(true);
    expect(characterInfo('妈').isRadicalItself).toBe(false);
  });

  it('reports honestly when there is no entry rather than guessing', () => {
    const info = characterInfo('\u{2A6D6}');
    expect(info.known).toBe(false);
    expect(info.strokes).toBeNull();
    expect(info.radical).toBeNull();
  });
});

describe('radical families', () => {
  it('finds the other characters built on the same radical', () => {
    const siblings = siblingsOf('妈');
    expect(siblings).toContain('好');
    expect(siblings).toContain('姐');
    expect(siblings).not.toContain('妈');
  });
});

describe('teaching order', () => {
  it('puts simpler characters first', () => {
    const ordered = teachingOrder(['蝴', '一', '妈']);
    expect(ordered).toEqual(['一', '妈', '蝴']);
  });

  it('is stable, so a lesson list does not reshuffle between sessions', () => {
    const chars = allCharacters().slice(0, 40);
    expect(teachingOrder(chars)).toEqual(teachingOrder([...chars].reverse()));
  });

  it('does not drop characters it has no data for', () => {
    const ordered = teachingOrder(['妈', '\u{2A6D6}']);
    expect(ordered).toHaveLength(2);
  });
});

describe('the teachable set', () => {
  it('covers every character used by a deck word', () => {
    expect(allCharacters().length).toBeGreaterThan(150);
  });

  it('can name a word for every character it offers', () => {
    for (const char of allCharacters()) {
      expect(wordsUsing(char).length).toBeGreaterThan(0);
    }
  });
});

describe('the deck narrows what there is to write', () => {
  it('offers only the chosen deck’s characters', () => {
    const food = availableCharacters({}, 'all', 'shiwu').map((entry) => entry.char);
    expect(food).toContain('苹'); // 苹, from 苹果
    expect(food).not.toContain('青'); // 青, only in other decks
  });

  it('offers every deck at once for the combined id', () => {
    const all = availableCharacters({}, 'all', ALL_DECK_ID);
    const food = availableCharacters({}, 'all', 'shiwu');
    expect(all.length).toBeGreaterThan(food.length);
  });

  it('defaults to the combined deck when none is named', () => {
    expect(availableCharacters({}, 'all').length).toBe(
      availableCharacters({}, 'all', ALL_DECK_ID).length
    );
  });

  it('applies the deck and the source together, not one or the other', () => {
    const known = { '苹果': { ...newCard(), box: 2 } }; // 苹果
    const chars = availableCharacters(known, 'known', 'shiwu').map((entry) => entry.char);
    expect(chars.sort()).toEqual(['果', '苹'].sort()); // 果, 苹
  });

  it('draws the context word from the chosen deck', () => {
    for (const entry of availableCharacters({}, 'all', 'shiwu')) {
      expect(deckWords('shiwu').some((word) => word.zh === entry.from.zh)).toBe(true);
    }
  });
});

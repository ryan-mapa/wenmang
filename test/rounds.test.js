import { describe, it, expect } from 'vitest';
import {
  buildCharacterRound,
  charactersInRound,
  charactersReady,
  availableRounds,
  roundLength,
  WORD_ROUND_LENGTH,
  CHARACTER_ROUND_LENGTH
} from '../source/rounds.js';
import { mulberry32 } from '../source/random.js';
import { newCard, BOX_COUNT } from '../source/srs.js';
import { availableCharacters, writingSequence, strokesOf } from '../source/characters.js';

const mastered = () => ({ ...newCard(), box: BOX_COUNT - 1 });
const rng = () => mulberry32(7);

describe('character rounds are built from whole words', () => {
  const wordCards = { 苹果: mastered(), 妈妈: mastered(), 老师: mastered(), 学生: mastered() };
  const known = (options = {}) =>
    buildCharacterRound(wordCards, {}, 0, { source: 'known', random: rng(), ...options });

  it('gives every item a word and one entry per character of it', () => {
    for (const item of known()) {
      expect(item.word.zh).toBeTruthy();
      expect(item.chars.map((c) => c.char)).toEqual(writingSequence(item.word));
    }
  });

  it('asks for both characters of a two-character word, not one of them', () => {
    // The bug this guards: a round that scheduled 狐 alone showed the prompt
    // 狐狸 and accepted a single character, leaving the other half unwritten
    // and the learner guessing which half was meant.
    const round = buildCharacterRound({ 苹果: mastered() }, {}, 0, {
      source: 'known',
      random: rng()
    });
    const pingguo = round.find((item) => item.word.zh === '苹果');
    expect(pingguo.chars.map((c) => c.char)).toEqual(['苹', '果']);
  });

  it('keeps a repeated character as two squares — 妈妈 is written twice', () => {
    const round = buildCharacterRound({ 妈妈: mastered() }, {}, 0, {
      source: 'known',
      random: rng()
    });
    expect(round[0].chars.map((c) => c.char)).toEqual(['妈', '妈']);
  });

  it('reaches the round length in characters, not in words', () => {
    const round = buildCharacterRound({}, {}, 0, { random: rng() });
    expect(charactersInRound(round)).toBeGreaterThanOrEqual(CHARACTER_ROUND_LENGTH);
  });

  it('never cuts the last word in half to hit the number exactly', () => {
    const round = buildCharacterRound({}, {}, 0, { random: rng() });
    // Overshooting is allowed; every word must still be whole.
    for (const item of round) {
      expect(item.chars).toHaveLength(writingSequence(item.word).length);
    }
  });

  it('takes the whole available set while it is smaller than a round', () => {
    const unlocked = availableCharacters(wordCards, 'known').length;
    expect(charactersInRound(known())).toBeLessThanOrEqual(
      Math.max(unlocked, CHARACTER_ROUND_LENGTH)
    );
  });

  it('is empty when the source has nothing in it', () => {
    expect(buildCharacterRound({}, {}, 0, { source: 'known', random: rng() })).toEqual([]);
  });

  it('never repeats a word inside one round', () => {
    const words = buildCharacterRound({}, {}, 0, { random: rng() }).map((item) => item.word.zh);
    expect(new Set(words).size).toBe(words.length);
  });

  it('runs simple to complex by whole-word effort so the hand warms up', () => {
    const round = buildCharacterRound({}, {}, 0, { random: rng() });
    const effort = round.map((item) => strokesOf(item.word));
    expect(effort).toEqual([...effort].sort((a, b) => a - b));
  });

  it('opens each character in the mode its own card has earned', () => {
    const charCards = { 苹: { ...newCard(), box: BOX_COUNT - 1 } };
    const round = buildCharacterRound({ 苹果: mastered() }, charCards, 0, {
      source: 'known',
      random: rng()
    });
    const chars = round.find((item) => item.word.zh === '苹果').chars;
    expect(chars.find((c) => c.char === '苹').mode).toBe('free');
    expect(chars.find((c) => c.char === '果').mode).toBe('teach');
  });

  it('honours a mode the learner picked, for every character of every word', () => {
    const round = known({ preferredMode: 'free' });
    expect(round.every((item) => item.chars.every((c) => c.mode === 'free'))).toBe(true);
  });
});

describe('which rounds are offered', () => {
  it('offers characters immediately, including when the known source is empty', () => {
    expect(charactersReady({})).toBe(true);
    expect(charactersReady({}, 'known')).toBe(false);
    expect(availableRounds({})).toEqual(['words', 'characters']);
  });

  it('offers both once a word is mastered', () => {
    expect(availableRounds({ 苹果: mastered() })).toEqual(['words', 'characters']);
  });
});

describe('round lengths', () => {
  it('reports the length for each kind', () => {
    expect(roundLength('words')).toBe(WORD_ROUND_LENGTH);
    expect(roundLength('characters')).toBe(CHARACTER_ROUND_LENGTH);
  });
});

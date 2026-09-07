import { describe, it, expect } from 'vitest';
import {
  buildCharacterRound,
  charactersReady,
  availableRounds,
  roundLength,
  WORD_ROUND_LENGTH,
  CHARACTER_ROUND_LENGTH
} from '../source/rounds.js';
import { mulberry32 } from '../source/random.js';
import { newCard, BOX_COUNT } from '../source/srs.js';
import { availableCharacters, teachingOrder } from '../source/characters.js';

const mastered = () => ({ ...newCard(), box: BOX_COUNT - 1 });
const rng = () => mulberry32(7);

describe('character rounds', () => {
  const wordCards = { 苹果: mastered(), 妈妈: mastered(), 老师: mastered(), 学生: mastered() };

  it('takes the whole unlocked set while it is smaller than a round', () => {
    const unlocked = availableCharacters(wordCards).length;
    const round = buildCharacterRound(wordCards, {}, 0, { random: rng() });
    expect(round).toHaveLength(Math.min(CHARACTER_ROUND_LENGTH, unlocked));
  });

  it('stops at ten once more than ten are unlocked', () => {
    const many = Object.fromEntries(
      ['苹果', '妈妈', '老师', '学生', '西红柿', '胡萝卜', '信用卡'].map((zh) => [zh, mastered()])
    );
    expect(availableCharacters(many).length).toBeGreaterThan(CHARACTER_ROUND_LENGTH);
    expect(buildCharacterRound(many, {}, 0, { random: rng() })).toHaveLength(CHARACTER_ROUND_LENGTH);
  });

  it('is empty before any vocabulary is mastered', () => {
    expect(buildCharacterRound({}, {}, 0, { random: rng() })).toEqual([]);
  });

  it('never repeats a character inside one round', () => {
    const round = buildCharacterRound(wordCards, {}, 0, { random: rng() });
    const chars = round.map((entry) => entry.char);
    expect(new Set(chars).size).toBe(chars.length);
  });

  it('runs simple to complex so the hand warms up', () => {
    const round = buildCharacterRound(wordCards, {}, 0, { random: rng() });
    const chars = round.map((entry) => entry.char);
    expect(chars).toEqual(teachingOrder(chars));
  });

  it('opens each character in the mode its card has earned', () => {
    const charCards = { 苹: { ...newCard(), box: BOX_COUNT - 1 } };
    const round = buildCharacterRound(wordCards, charCards, 0, { random: rng() });
    expect(round.find((entry) => entry.char === '苹').mode).toBe('free');
    expect(round.find((entry) => entry.char === '果').mode).toBe('teach');
  });

  it('honours a mode the learner picked for every character', () => {
    const round = buildCharacterRound(wordCards, {}, 0, { random: rng(), preferredMode: 'free' });
    expect(round.every((entry) => entry.mode === 'free')).toBe(true);
  });

  it('shows which word unlocked each character', () => {
    const round = buildCharacterRound(wordCards, {}, 0, { random: rng() });
    expect(round.every((entry) => entry.from?.zh)).toBe(true);
  });
});

describe('which rounds are offered', () => {
  it('offers only words until something is mastered', () => {
    expect(charactersReady({})).toBe(false);
    expect(availableRounds({})).toEqual(['words']);
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

import { describe, it, expect } from 'vitest';
import {
  buildWordRound,
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
import { ALL_DECK_ID } from '../source/vocab.js';

const mastered = () => ({ ...newCard(), box: BOX_COUNT - 1 });
const rng = () => mulberry32(7);

describe('word rounds', () => {
  it('is twenty questions long', () => {
    const round = buildWordRound('shiwu', [0], {}, 0, { random: rng() });
    expect(round).toHaveLength(WORD_ROUND_LENGTH);
  });

  it('never asks the same word twice in a row', () => {
    const round = buildWordRound('shiwu', [0], {}, 0, { random: rng() });
    for (let i = 1; i < round.length; i++) {
      expect(round[i].word.zh).not.toBe(round[i - 1].word.zh);
    }
  });

  it('gives every question four distinct choices including the answer', () => {
    for (const question of buildWordRound('shiwu', [0], {}, 0, { random: rng() })) {
      expect(new Set(question.choices).size).toBe(4);
      expect(question.choices).toContain(question.answer);
    }
  });

  it('comes back empty for a stage with no words rather than throwing', () => {
    expect(buildWordRound('shiwu', [1], {}, 0, { random: rng() })).toEqual([]);
  });

  it('can draw across every deck at once', () => {
    const round = buildWordRound(ALL_DECK_ID, [0], {}, 0, { random: rng() });
    expect(round).toHaveLength(WORD_ROUND_LENGTH);
  });
});

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

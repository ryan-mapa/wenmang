import { describe, it, expect } from 'vitest';
import { buildQuestion, isCorrect, DIRECTIONS, CHOICE_COUNT } from '../source/quiz.js';
import { mulberry32 } from '../source/random.js';
import { stageWords } from '../source/vocab.js';

const pool = stageWords('shiwu', 0);
const word = pool.find((w) => w.zh === '苹果');
const rng = () => mulberry32(11);

describe('building a question', () => {
  it('asks the Chinese and answers in English by default', () => {
    const q = buildQuestion(word, pool, 'zh-en', 'hanzi', rng());
    expect(q.prompt).toBe('苹果');
    expect(q.answer).toBe('apple');
    expect(q.answerIsHanzi).toBe(false);
  });

  it('can ask the English and answer in Chinese', () => {
    const q = buildQuestion(word, pool, 'en-zh', 'hanzi', rng());
    expect(q.prompt).toBe('apple');
    expect(q.answer).toBe('苹果');
    expect(q.answerIsHanzi).toBe(true);
  });

  it('offers four distinct choices, one of them right', () => {
    const q = buildQuestion(word, pool, 'zh-en', 'hanzi', rng());
    expect(q.choices).toHaveLength(CHOICE_COUNT);
    expect(new Set(q.choices).size).toBe(CHOICE_COUNT);
    expect(q.choices).toContain(q.answer);
  });

  it('never prints the same text on two buttons', () => {
    for (const candidate of pool) {
      const q = buildQuestion(candidate, pool, 'zh-en', 'hanzi', rng());
      expect(new Set(q.choices).size, candidate.zh).toBe(q.choices.length);
    }
  });

  it('falls back to a sane direction rather than throwing', () => {
    expect(buildQuestion(word, pool, 'klingon', 'hanzi', rng()).answer).toBe('apple');
  });
});

describe('the script setting and the prompt', () => {
  it('adds pinyin under the characters in the combined mode', () => {
    const q = buildQuestion(word, pool, 'zh-en', 'both', rng());
    expect(q.prompt).toBe('苹果');
    expect(q.promptSub).toBe('píngguǒ');
  });

  it('can prompt with pinyin alone', () => {
    const q = buildQuestion(word, pool, 'zh-en', 'pinyin', rng());
    expect(q.prompt).toBe('píngguǒ');
    expect(q.promptIsHanzi).toBe(false);
  });

  it('leaves an English prompt alone whatever the script setting', () => {
    // Pinyin beside the English prompt in an English → 中文 round would give
    // the sound away and turn recall into matching.
    const q = buildQuestion(word, pool, 'en-zh', 'both', rng());
    expect(q.prompt).toBe('apple');
    expect(q.promptSub).toBe('');
  });
});

describe('marking an answer', () => {
  it('accepts the answer and rejects the rest', () => {
    const q = buildQuestion(word, pool, 'zh-en', 'hanzi', rng());
    expect(isCorrect(q, 'apple')).toBe(true);
    for (const choice of q.choices.filter((c) => c !== q.answer)) {
      expect(isCorrect(q, choice)).toBe(false);
    }
  });
});

describe('directions', () => {
  it('labels both of them for the picker', () => {
    for (const info of Object.values(DIRECTIONS)) expect(info.label).toBeTruthy();
  });
});

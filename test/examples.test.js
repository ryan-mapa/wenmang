import { describe, it, expect } from 'vitest';
import { exampleFor, exampleLines, hasExample, promptSide } from '../source/examples.js';
import { SENTENCES } from '../source/sentences.js';
import { allWords } from '../source/vocab.js';

const pair = { zh: '请给我一杯水。', en: 'Please give me a glass of water.' };

describe('reading a sentence pair', () => {
  it('returns both halves for a word that has one', () => {
    expect(exampleFor(SENTENCES, '水')).toEqual({
      zh: SENTENCES['水'][0],
      en: SENTENCES['水'][1]
    });
  });

  it('returns null for a word with none', () => {
    expect(exampleFor(SENTENCES, '蝴蝶')).toBeNull();
  });

  it('returns null rather than half a pair for malformed data', () => {
    expect(exampleFor({ 水: ['只有中文'] }, '水')).toBeNull();
    expect(exampleFor({ 水: ['', 'empty Chinese'] }, '水')).toBeNull();
    expect(exampleFor({ 水: 'not an array' }, '水')).toBeNull();
    expect(exampleFor(undefined, '水')).toBeNull();
  });
});

describe('what may be shown before answering', () => {
  it('shows the Chinese when the prompt is already Chinese', () => {
    const lines = exampleLines(pair, 'zh-en', false);
    expect(lines).toHaveLength(1);
    expect(lines[0].lang).toBe('zh');
  });

  it('shows only the English when the Chinese is the answer', () => {
    // The one that matters. A Chinese sentence here would put the exact
    // characters the learner was asked to produce in front of them.
    const lines = exampleLines(pair, 'en-zh', false);
    expect(lines).toHaveLength(1);
    expect(lines[0].lang).toBe('en');
    expect(lines[0].text).not.toContain('水');
  });

  it('never leaks the answer text in either direction', () => {
    for (const direction of ['zh-en', 'en-zh']) {
      const shown = exampleLines(pair, direction, false).map((l) => l.lang);
      expect(shown).toEqual([promptSide(direction)]);
    }
  });
});

describe('what may be shown after answering', () => {
  it('shows both, in either direction', () => {
    for (const direction of ['zh-en', 'en-zh']) {
      expect(exampleLines(pair, direction, true).map((l) => l.lang)).toEqual(['zh', 'en']);
    }
  });
});

describe('whether there is anything to offer', () => {
  it('is false for a word with no sentence', () => {
    expect(hasExample(SENTENCES, { zh: '蝴蝶' }, 'zh-en')).toBe(false);
  });

  it('is true in both directions for a word that has one', () => {
    expect(hasExample(SENTENCES, { zh: '水' }, 'zh-en')).toBe(true);
    expect(hasExample(SENTENCES, { zh: '水' }, 'en-zh')).toBe(true);
  });

  it('copes with no word at all', () => {
    expect(hasExample(SENTENCES, undefined, 'zh-en')).toBe(false);
  });
});

describe('the sentences that exist', () => {
  it('keys every one to a real headword', () => {
    const words = new Set(allWords().map((word) => word.zh));
    for (const zh of Object.keys(SENTENCES)) {
      expect(words.has(zh), `${zh} is not a deck word`).toBe(true);
    }
  });

  it('contains its own headword in every Chinese sentence', () => {
    // A sentence that does not contain the word it illustrates is shown *as*
    // the example, and a learner has no way to know it is wrong.
    for (const [zh, [chinese]] of Object.entries(SENTENCES)) {
      expect(chinese.includes(zh), `${zh}: ${chinese}`).toBe(true);
    }
  });

  it('carries no Latin letters on the Chinese side', () => {
    for (const [zh, [chinese]] of Object.entries(SENTENCES)) {
      expect(/[a-zA-Z]/.test(chinese), `${zh}: ${chinese}`).toBe(false);
    }
  });
});

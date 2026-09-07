import { describe, it, expect } from 'vitest';
import { exampleFor, exampleLines, hasExample, promptSide } from '../source/examples.js';
import { SENTENCES } from '../source/sentences.js';
import { allWords } from '../source/vocab.js';

const pair = { zh: '请给我一杯水。', py: 'qǐng gěi wǒ yì bēi shuǐ', en: 'Please give me a glass of water.' };
const langs = (...args) => exampleLines(...args).map((line) => line.lang);

describe('reading a sentence', () => {
  it('returns all three parts for a word that has one', () => {
    const [zh, py, en] = SENTENCES['水'];
    expect(exampleFor(SENTENCES, '水')).toEqual({ zh, py, en });
  });

  it('returns null for a word with none', () => {
    expect(exampleFor(SENTENCES, '蝴蝶')).toBeNull();
  });

  it('returns null rather than a partial entry', () => {
    expect(exampleFor({ 水: ['中文', 'zhōngwén'] }, '水')).toBeNull();
    expect(exampleFor({ 水: ['中文', '', 'no pinyin'] }, '水')).toBeNull();
    expect(exampleFor({ 水: 'not an array' }, '水')).toBeNull();
    expect(exampleFor(undefined, '水')).toBeNull();
  });
});

describe('what may be shown before answering', () => {
  it('shows the Chinese when the prompt is already Chinese', () => {
    expect(langs(pair, 'zh-en', false, 'hanzi')).toEqual(['zh']);
  });

  it('shows only the English when the Chinese is the answer', () => {
    // The one that matters. A Chinese sentence here would put the exact
    // characters the learner was asked to produce in front of them.
    expect(langs(pair, 'en-zh', false, 'hanzi')).toEqual(['en']);
  });

  it('counts pinyin as a Chinese line, not a neutral reading aid', () => {
    // Pinyin of a sentence containing the headword gives away its sound, which
    // in the recall direction is most of the answer.
    expect(langs(pair, 'en-zh', false, 'pinyin')).toEqual(['en']);
    expect(langs(pair, 'en-zh', false, 'both')).toEqual(['en']);
  });

  it('never shows anything but the prompt side, in any script', () => {
    for (const direction of ['zh-en', 'en-zh']) {
      for (const script of ['hanzi', 'pinyin', 'both']) {
        const side = promptSide(direction);
        const shown = langs(pair, direction, false, script);
        const allowed = side === 'zh' ? ['zh', 'py'] : ['en'];
        expect(shown.every((lang) => allowed.includes(lang)), `${direction}/${script}`).toBe(true);
      }
    }
  });
});

describe('the script setting governs the sentence as it governs the prompt', () => {
  it('gives characters alone by default', () => {
    expect(langs(pair, 'zh-en', true, 'hanzi')).toEqual(['zh', 'en']);
  });

  it('gives pinyin alone to somebody reading in pinyin', () => {
    expect(langs(pair, 'zh-en', true, 'pinyin')).toEqual(['py', 'en']);
  });

  it('gives both when both are asked for', () => {
    expect(langs(pair, 'zh-en', true, 'both')).toEqual(['zh', 'py', 'en']);
  });

  it('falls back to characters for an unrecognised setting', () => {
    expect(langs(pair, 'zh-en', true, 'zhuyin')).toEqual(['zh', 'en']);
  });
});

describe('what may be shown after answering', () => {
  it('shows everything the script allows, in either direction', () => {
    for (const direction of ['zh-en', 'en-zh']) {
      expect(langs(pair, direction, true, 'both')).toEqual(['zh', 'py', 'en']);
    }
  });
});

describe('whether there is anything to offer', () => {
  it('is false for a word with no sentence', () => {
    expect(hasExample(SENTENCES, { zh: '蝴蝶' }, 'zh-en', 'hanzi')).toBe(false);
  });

  it('is true in both directions and every script for a word that has one', () => {
    for (const direction of ['zh-en', 'en-zh']) {
      for (const script of ['hanzi', 'pinyin', 'both']) {
        expect(hasExample(SENTENCES, { zh: '水' }, direction, script), `${direction}/${script}`).toBe(true);
      }
    }
  });

  it('copes with no word at all', () => {
    expect(hasExample(SENTENCES, undefined, 'zh-en', 'hanzi')).toBe(false);
  });
});

describe('the sentences that exist', () => {
  it('keys every one to a real headword', () => {
    const words = new Set(allWords().map((word) => word.zh));
    for (const zh of Object.keys(SENTENCES)) {
      expect(words.has(zh), `${zh} is not a deck word`).toBe(true);
    }
  });

  it('gives every entry all three parts', () => {
    for (const [zh, entry] of Object.entries(SENTENCES)) {
      expect(entry, zh).toHaveLength(3);
      expect(entry.every((part) => typeof part === 'string' && part.length > 0), zh).toBe(true);
    }
  });

  it('contains its own headword in every Chinese sentence', () => {
    // A sentence that does not contain the word it illustrates is shown *as*
    // the example, and a learner has no way to know it is wrong.
    for (const [zh, [chinese]] of Object.entries(SENTENCES)) {
      expect(chinese.includes(zh), `${zh}: ${chinese}`).toBe(true);
    }
  });

  it('writes pinyin with tone marks rather than tone numbers', () => {
    for (const [zh, [, pinyin]] of Object.entries(SENTENCES)) {
      expect(/\d/.test(pinyin), `${zh}: ${pinyin}`).toBe(false);
    }
  });

  it('carries no Latin letters on the Chinese side', () => {
    for (const [zh, [chinese]] of Object.entries(SENTENCES)) {
      expect(/[a-zA-Z]/.test(chinese), `${zh}: ${chinese}`).toBe(false);
    }
  });
});

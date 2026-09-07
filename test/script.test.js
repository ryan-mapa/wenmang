import { describe, it, expect } from 'vitest';
import {
  SCRIPT_MODES,
  DEFAULT_SCRIPT,
  cycleScript,
  normalizeScript,
  displayWord
} from '../source/script.js';

const word = { zh: '苹果', py: 'píngguǒ', en: 'apple' };

describe('the script toggle', () => {
  it('starts on characters alone, the strictest setting', () => {
    expect(DEFAULT_SCRIPT).toBe('hanzi');
  });

  it('cycles through all three and returns to the start', () => {
    let mode = DEFAULT_SCRIPT;
    const seen = [mode];
    for (let i = 0; i < SCRIPT_MODES.length - 1; i++) {
      mode = cycleScript(mode);
      seen.push(mode);
    }
    expect(new Set(seen).size).toBe(SCRIPT_MODES.length);
    expect(cycleScript(mode)).toBe(DEFAULT_SCRIPT);
  });

  it('falls back to the default for anything unrecognised', () => {
    expect(normalizeScript('wubi')).toBe(DEFAULT_SCRIPT);
    expect(normalizeScript(undefined)).toBe(DEFAULT_SCRIPT);
    expect(cycleScript('nonsense')).toBe(SCRIPT_MODES[1]);
  });
});

describe('rendering a word', () => {
  it('shows characters alone by default', () => {
    expect(displayWord(word, 'hanzi')).toEqual({ primary: '苹果', secondary: '', isHanzi: true });
  });

  it('shows pinyin alone, which is what a writing prompt needs', () => {
    expect(displayWord(word, 'pinyin')).toEqual({ primary: 'píngguǒ', secondary: '', isHanzi: false });
  });

  it('puts pinyin underneath in the combined mode', () => {
    expect(displayWord(word, 'both')).toEqual({ primary: '苹果', secondary: 'píngguǒ', isHanzi: true });
  });

  it('leaves secondary empty rather than undefined when there is nothing to show', () => {
    expect(displayWord(word, 'hanzi').secondary).toBe('');
  });
});

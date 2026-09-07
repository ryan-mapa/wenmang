import { describe, it, expect } from 'vitest';
import {
  audioSlug,
  clipUrl,
  nextVoice,
  canPlay,
  hasClip,
  VOICE_COUNT
} from '../source/audio.js';
import { allWords } from '../source/vocab.js';

describe('naming a clip', () => {
  it('turns a word into its characters as hex codepoints', () => {
    expect(audioSlug('水')).toBe('6c34');
    expect(audioSlug('苹果')).toBe('82f9-679c');
  });

  it('is filesystem and URL safe', () => {
    for (const word of allWords()) {
      expect(audioSlug(word.zh), word.zh).toMatch(/^[0-9a-f]+(-[0-9a-f]+)*$/);
    }
  });

  it('never collides across the whole vocabulary', () => {
    // The reason this scheme exists. Pinyin would collide constantly — 是, 事
    // and 试 are all shì — and a slug that collides silently serves one word's
    // recording for another, which is worse than having no recording at all.
    const slugs = allWords().map((word) => audioSlug(word.zh));
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('distinguishes words pinyin cannot', () => {
    expect(audioSlug('买')).not.toBe(audioSlug('卖')); // mǎi / mài
    expect(audioSlug('他')).not.toBe(audioSlug('她')); // both tā
  });

  it('is stable, so a clip generated today is still found tomorrow', () => {
    expect(audioSlug('蝴蝶')).toBe(audioSlug('蝴蝶'));
  });
});

describe('where a clip lives', () => {
  it('puts each voice in its own numbered directory, one-based', () => {
    expect(clipUrl('水', 0)).toBe('audio/1/6c34.mp3');
    expect(clipUrl('水', 3)).toBe('audio/4/6c34.mp3');
  });
});

describe('choosing a voice', () => {
  it('starts at the first voice', () => {
    expect(nextVoice(null)).toBe(0);
    expect(nextVoice(undefined)).toBe(0);
  });

  it('cycles, so tapping twice never repeats a reading', () => {
    let voice = nextVoice(null);
    const seen = [voice];
    for (let i = 1; i < VOICE_COUNT; i++) {
      voice = nextVoice(voice);
      seen.push(voice);
    }
    expect(new Set(seen).size).toBe(VOICE_COUNT);
    expect(nextVoice(voice)).toBe(0);
  });

  it('copes with a single voice rather than dividing by zero', () => {
    expect(nextVoice(0, 1)).toBe(0);
  });
});

describe('when a word may be spoken', () => {
  it('speaks the prompt when the prompt is already Chinese', () => {
    expect(canPlay('zh-en')).toBe(true);
  });

  it('stays silent in the recall direction, where the Chinese is the answer', () => {
    expect(canPlay('en-zh')).toBe(false);
  });
});

describe('whether a word can be heard', () => {
  it('is false when nothing has been generated', () => {
    expect(hasClip(new Set(), '水')).toBe(false);
  });

  it('is true only for words in the manifest', () => {
    const spoken = new Set([audioSlug('水')]);
    expect(hasClip(spoken, '水')).toBe(true);
    expect(hasClip(spoken, '茶')).toBe(false);
  });
});

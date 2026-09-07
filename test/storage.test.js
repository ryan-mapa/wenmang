import { describe, it, expect, beforeEach } from 'vitest';
import {
  load,
  save,
  reset,
  withCards,
  withChars,
  withPrefs,
  exportProgress,
  parseProgress,
  TRANSFER_FORMAT,
  VERSION
} from '../source/storage.js';
import { newCard } from '../source/srs.js';

class MemoryStorage {
  #data = new Map();
  getItem(key) { return this.#data.has(key) ? this.#data.get(key) : null; }
  setItem(key, value) { this.#data.set(key, String(value)); }
  removeItem(key) { this.#data.delete(key); }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

describe('an empty start', () => {
  it('gives separate empty maps for words and characters', () => {
    const data = load();
    expect(data.cards).toEqual({});
    expect(data.chars).toEqual({});
  });

  it('gives usable default preferences', () => {
    expect(load().prefs).toEqual({ script: 'hanzi', mode: 'auto' });
  });
});

describe('round trips', () => {
  it('keeps word and character progress apart', () => {
    let data = load();
    data = withCards(data, { 苹果: { ...newCard(), box: 3 } });
    data = withChars(data, { 苹: { ...newCard(), box: 1 } });
    save(data);

    const back = load();
    expect(back.cards['苹果'].box).toBe(3);
    expect(back.chars['苹'].box).toBe(1);
    expect(back.cards['苹']).toBeUndefined();
    expect(back.chars['苹果']).toBeUndefined();
  });

  it('persists preferences', () => {
    save(withPrefs(load(), { script: 'both', mode: 'free' }));
    expect(load().prefs).toEqual({ script: 'both', mode: 'free' });
  });

  it('repairs a preference that is no longer valid', () => {
    save(withPrefs(load(), { script: 'zhuyin', mode: 'tracing' }));
    expect(load().prefs).toEqual({ script: 'hanzi', mode: 'auto' });
  });
});

describe('surviving a hostile store', () => {
  it('returns empty rather than throwing on corrupt data', () => {
    globalThis.localStorage.setItem('wenmang:v1', '{not json');
    expect(load().cards).toEqual({});
  });

  it('works with no storage at all', () => {
    globalThis.localStorage = undefined;
    expect(() => save(load())).not.toThrow();
    expect(load().cards).toEqual({});
  });

  it('drops a malformed card instead of poisoning the map', () => {
    globalThis.localStorage.setItem(
      'wenmang:v1',
      JSON.stringify({ cards: { 苹果: { box: 'three' } } })
    );
    expect(load().cards['苹果']).toEqual(newCard());
  });
});

describe('carrying progress elsewhere', () => {
  it('exports and re-imports both card maps', () => {
    let data = load();
    data = withCards(data, { 苹果: { ...newCard(), box: 4 } });
    data = withChars(data, { 苹: { ...newCard(), box: 2 } });

    const restored = parseProgress(exportProgress(data));
    expect(restored.cards['苹果'].box).toBe(4);
    expect(restored.chars['苹'].box).toBe(2);
  });

  it('names itself so a foreign paste fails clearly', () => {
    expect(JSON.parse(exportProgress(load())).format).toBe(TRANSFER_FORMAT);
    expect(() => parseProgress('{"format":"vocabulario/progress"}')).toThrow(/did not come from/);
  });

  it('rejects text that is not JSON with something actionable', () => {
    expect(() => parseProgress('hello')).toThrow(/whole code was copied/);
  });

  it('refuses a payload from a future version', () => {
    const future = JSON.stringify({ format: TRANSFER_FORMAT, version: VERSION + 1 });
    expect(() => parseProgress(future)).toThrow(/newer version/);
  });
});

describe('reset', () => {
  it('clears everything', () => {
    save(withCards(load(), { 苹果: { ...newCard(), box: 4 } }));
    reset();
    expect(load().cards).toEqual({});
  });
});

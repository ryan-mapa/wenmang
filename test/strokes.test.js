import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadCharacter,
  clearCache,
  writerOptions,
  demonstratesFirst,
  DATA_ORIGIN,
  ATTRIBUTION
} from '../source/strokes.js';

beforeEach(clearCache);

const ok = (data) => async () => ({ ok: true, json: async () => data });

describe('loading stroke data', () => {
  it('returns the data for a character that has some', () => {
    const data = { strokes: ['M0 0'], medians: [[[0, 0]]] };
    return expect(loadCharacter('女', ok(data))).resolves.toEqual(data);
  });

  it('fetches from the pinned origin', async () => {
    let seen = null;
    await loadCharacter('女', async (url) => {
      seen = url;
      return { ok: true, json: async () => ({ strokes: ['M0 0'] }) };
    });
    expect(seen).toContain(DATA_ORIGIN);
    expect(seen).toContain(encodeURIComponent('女'));
  });

  it('degrades to null on a network failure rather than throwing', () => {
    return expect(
      loadCharacter('女', async () => {
        throw new Error('offline');
      })
    ).resolves.toBeNull();
  });

  it('degrades to null for a character the data set does not have', () => {
    return expect(loadCharacter('女', async () => ({ ok: false }))).resolves.toBeNull();
  });

  it('treats an empty stroke list as no data', () => {
    return expect(loadCharacter('女', ok({ strokes: [] }))).resolves.toBeNull();
  });

  it('fetches a character once however often it recurs', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return { ok: true, json: async () => ({ strokes: ['M0 0'] }) };
    };
    await Promise.all([loadCharacter('女', fetcher), loadCharacter('女', fetcher)]);
    await loadCharacter('女', fetcher);
    expect(calls).toBe(1);
  });
});

describe('renderer options per mode', () => {
  it('shows the outline for teaching and tracing', () => {
    expect(writerOptions('teach').showOutline).toBe(true);
  });

  it('shows the outline but stops guiding in the middle mode', () => {
    expect(writerOptions('guided').showOutline).toBe(true);
  });

  it('shows nothing on a blank pad', () => {
    expect(writerOptions('free').showOutline).toBe(false);
  });

  it('never lets the library volunteer its own hints', () => {
    // The app runs its own hint ladder; a second source of hints would hand out
    // the shape for free and defeat the mode caps in writing.js.
    for (const mode of ['teach', 'guided', 'free']) {
      expect(writerOptions(mode).showHintAfterMisses).toBe(false);
    }
  });

  it('never reveals the finished character up front', () => {
    for (const mode of ['teach', 'guided', 'free']) {
      expect(writerOptions(mode).showCharacter).toBe(false);
    }
  });

  it('animates first only in the teaching mode', () => {
    expect(demonstratesFirst('teach')).toBe(true);
    expect(demonstratesFirst('guided')).toBe(false);
    expect(demonstratesFirst('free')).toBe(false);
  });
});

describe('attribution', () => {
  it('names the data source and its licence', () => {
    expect(ATTRIBUTION).toContain('Make Me a Hanzi');
    expect(ATTRIBUTION).toContain('Arphic');
  });
});

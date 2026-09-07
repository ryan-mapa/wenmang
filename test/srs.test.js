import { describe, it, expect } from 'vitest';
import {
  newCard,
  review,
  isMastered,
  masteryOf,
  isDue,
  selectNext,
  foldReviews,
  intervalFor,
  BOX_COUNT
} from '../source/srs.js';
import { mulberry32 } from '../source/random.js';

describe('advancing a card', () => {
  it('climbs one box per correct answer and stops at the top', () => {
    let card = newCard();
    for (let i = 0; i < 10; i++) card = review(card, true, 0);
    expect(card.box).toBe(BOX_COUNT - 1);
    expect(isMastered(card)).toBe(true);
  });

  it('drops all the way back on a miss', () => {
    let card = newCard();
    for (let i = 0; i < 4; i++) card = review(card, true, 0);
    expect(review(card, false, 0).box).toBe(0);
  });

  it('schedules further out from a higher box', () => {
    const early = review(newCard(), true, 1000);
    const late = review({ ...newCard(), box: 3 }, true, 1000);
    expect(late.dueAt).toBeGreaterThan(early.dueAt);
  });

  it('counts what it has seen', () => {
    const card = review(review(newCard(), true, 0), false, 0);
    expect(card.seen).toBe(2);
    expect(card.correct).toBe(1);
  });
});

describe('mastery across a set', () => {
  it('is zero for untouched cards and one for a fully learned set', () => {
    expect(masteryOf([newCard(), newCard()])).toBe(0);
    const top = { ...newCard(), box: BOX_COUNT - 1 };
    expect(masteryOf([top, top])).toBe(1);
  });

  it('is zero, not NaN, for an empty set', () => {
    expect(masteryOf([])).toBe(0);
  });
});

describe('choosing what to ask next', () => {
  const words = [{ zh: '一' }, { zh: '二' }, { zh: '三' }];
  const keyOf = (word) => word.zh;

  it('uses the key function rather than assuming a field', () => {
    // The reason this parameter exists: the same scheduler runs over word
    // objects and over bare character strings.
    const chars = ['苹', '果'];
    const picked = selectNext(chars, {}, 0, { random: mulberry32(1), keyOf: (c) => c });
    expect(chars).toContain(picked);
  });

  it('never returns the word it was told to avoid', () => {
    for (let seed = 0; seed < 20; seed++) {
      const picked = selectNext(words, {}, 0, { avoid: '二', random: mulberry32(seed), keyOf });
      expect(picked.zh).not.toBe('二');
    }
  });

  it('prefers a due card over one scheduled into the future', () => {
    const cards = {
      一: { ...newCard(), dueAt: 10_000 },
      二: { ...newCard(), dueAt: 0 },
      三: { ...newCard(), dueAt: 10_000 }
    };
    expect(selectNext(words, cards, 1000, { random: mulberry32(3), keyOf }).zh).toBe('二');
  });

  it('still offers something when nothing is due', () => {
    const cards = Object.fromEntries(words.map((w) => [w.zh, { ...newCard(), dueAt: 10_000 }]));
    expect(selectNext(words, cards, 0, { random: mulberry32(3), keyOf })).not.toBeNull();
  });

  it('returns null only for an empty list', () => {
    expect(selectNext([], {}, 0, { keyOf })).toBeNull();
  });

  it('does not let one very overdue card monopolise every round', () => {
    const cards = {
      一: { ...newCard(), dueAt: 0 },
      二: { ...newCard(), dueAt: 0 },
      三: { ...newCard(), dueAt: 0 }
    };
    const picks = new Set();
    for (let seed = 0; seed < 40; seed++) {
      picks.add(selectNext(words, cards, 10 ** 12, { random: mulberry32(seed), keyOf }).zh);
    }
    expect(picks.size).toBeGreaterThan(1);
  });
});

describe('folding a history', () => {
  const entries = [
    { id: 'b', reviewedAt: 2000, correct: true },
    { id: 'a', reviewedAt: 1000, correct: true },
    { id: 'c', reviewedAt: 3000, correct: false }
  ];

  it('does not depend on the order the reviews arrive in', () => {
    const forward = foldReviews(entries);
    const backward = foldReviews([...entries].reverse());
    expect(forward).toEqual(backward);
  });

  it('breaks a same-millisecond tie the same way every time', () => {
    const tied = [
      { id: 'z', reviewedAt: 1000, correct: false },
      { id: 'a', reviewedAt: 1000, correct: true }
    ];
    expect(foldReviews(tied)).toEqual(foldReviews([...tied].reverse()));
  });

  it('ends where replaying the reviews by hand would', () => {
    expect(foldReviews(entries).box).toBe(0);
  });
});

describe('due dates', () => {
  it('treats a card as due at exactly its due time', () => {
    expect(isDue({ ...newCard(), dueAt: 1000 }, 1000)).toBe(true);
    expect(isDue({ ...newCard(), dueAt: 1001 }, 1000)).toBe(false);
  });

  it('clamps the interval lookup past the last box', () => {
    expect(intervalFor(99)).toBe(intervalFor(BOX_COUNT - 1));
  });
});

import { describe, it, expect } from 'vitest';
import {
  MODES,
  suggestedMode,
  newAttempt,
  recordStroke,
  takeHint,
  isSuccess,
  reviewCharacter,
  capExplanation,
  foldCharacterReviews,
  applyResult,
  MISTAKE_ALLOWANCE,
  HINT_ALLOWANCE
} from '../source/writing.js';
import { hintAt, HINT_LEVELS } from '../source/hints.js';
import { newCard, BOX_COUNT, isMastered, intervalFor } from '../source/srs.js';

const completed = (char, mode, strokes) => {
  let attempt = newAttempt(char, mode);
  for (let i = 0; i < strokes; i++) attempt = recordStroke(attempt, true, strokes);
  return attempt;
};

describe('mode suggestion', () => {
  it('walks from teaching to a blank pad as the card climbs', () => {
    const at = (box) => suggestedMode({ ...newCard(), box });
    expect(at(0)).toBe('teach');
    expect(at(1)).toBe('teach');
    expect(at(2)).toBe('guided');
    expect(at(3)).toBe('guided');
    expect(at(BOX_COUNT - 1)).toBe('free');
  });
});

describe('mastery is only reachable on a blank pad', () => {
  it('caps tracing at the learning steps however often it succeeds', () => {
    let card = newCard();
    for (let i = 0; i < 20; i++) {
      card = reviewCharacter(card, completed('女', 'teach', 3), 1000);
    }
    expect(card.box).toBe(1);
    expect(isMastered(card)).toBe(false);
  });

  it('caps the outline mode one box below mastery', () => {
    let card = newCard();
    for (let i = 0; i < 20; i++) {
      card = reviewCharacter(card, completed('女', 'guided', 3), 1000);
    }
    expect(card.box).toBe(BOX_COUNT - 2);
    expect(isMastered(card)).toBe(false);
  });

  it('reaches the top box on a blank pad', () => {
    let card = newCard();
    for (let i = 0; i < 20; i++) {
      card = reviewCharacter(card, completed('女', 'free', 3), 1000);
    }
    expect(isMastered(card)).toBe(true);
  });

  it('schedules a capped card on its own box interval, not the uncapped one', () => {
    // The bug this guards: capping the box after choosing the interval would
    // park a box-1 card two weeks out while calling it barely learned.
    let card = newCard();
    for (let i = 0; i < 5; i++) card = reviewCharacter(card, completed('女', 'teach', 3), 1000);
    expect(card.box).toBe(1);
    expect(card.dueAt - 1000).toBe(intervalFor(1));
  });
});

describe('what counts as a success', () => {
  it('needs the character finished', () => {
    let attempt = newAttempt('女', 'free');
    attempt = recordStroke(attempt, true, 3);
    expect(isSuccess(attempt)).toBe(false);
  });

  it('forgives a couple of wrong strokes', () => {
    let attempt = completed('女', 'free', 3);
    for (let i = 0; i < MISTAKE_ALLOWANCE; i++) attempt = recordStroke(attempt, false, 3);
    expect(isSuccess(attempt)).toBe(true);
  });

  it('fails once the mistakes pass the allowance', () => {
    let attempt = completed('女', 'free', 3);
    for (let i = 0; i < MISTAKE_ALLOWANCE + 1; i++) attempt = recordStroke(attempt, false, 3);
    expect(isSuccess(attempt)).toBe(false);
  });

  it('fails once too many hints were taken', () => {
    let attempt = completed('女', 'free', 3);
    for (let i = 0; i < HINT_ALLOWANCE + 1; i++) attempt = takeHint(attempt);
    expect(isSuccess(attempt)).toBe(false);
  });

  it('sends a failed attempt back to the first box', () => {
    const card = { ...newCard(), box: 4 };
    let attempt = completed('女', 'free', 3);
    for (let i = 0; i < 5; i++) attempt = recordStroke(attempt, false, 3);
    expect(reviewCharacter(card, attempt, 1000).box).toBe(0);
  });
});

describe('the hint ladder', () => {
  it('gives structure before it gives shape', () => {
    const rungs = HINT_LEVELS.map((_, level) => hintAt('妈', level));
    expect(rungs.map((h) => h.rung)).toEqual(HINT_LEVELS);
    expect(rungs[0].reveals).toBe('nothing');
    expect(rungs[1].reveals).toBe('nothing');
    expect(rungs[2].reveals).toBe('outline');
    expect(rungs[3].reveals).toBe('nextStroke');
  });

  it('names the radical rather than the stroke', () => {
    expect(hintAt('妈', 1).text).toContain('女');
    expect(hintAt('妈', 1).text).toContain('woman');
  });

  it('counts the strokes', () => {
    expect(hintAt('妈', 0).text).toBe('6 strokes');
  });

  it('says so when the character is its own radical', () => {
    expect(hintAt('女', 1).text).toContain('radical itself');
  });

  it('skips rungs it has no honest data for rather than inventing them', () => {
    // A character with no Unihan entry: the structural rungs fall through to
    // the geometric ones instead of rendering "null strokes".
    const hint = hintAt('\u{2A6D6}', 0);
    expect(hint.reveals).toBe('outline');
  });

  it('runs out at the end of the ladder', () => {
    expect(hintAt('妈', HINT_LEVELS.length)).toBeNull();
  });
});

describe('explaining a cap', () => {
  it('stays quiet while the mode can still promote', () => {
    expect(capExplanation(newCard(), 'teach')).toBeNull();
  });

  it('explains the stall once tracing has run out of room', () => {
    expect(capExplanation({ ...newCard(), box: 1 }, 'teach')).toContain('outline');
  });

  it('never nags on a blank pad', () => {
    expect(capExplanation({ ...newCard(), box: 4 }, 'free')).toBeNull();
  });
});

describe('modes', () => {
  it('has exactly the three the spec names', () => {
    expect(MODES).toEqual(['teach', 'guided', 'free']);
  });
});

describe('folding a character history', () => {
  const at = (id, reviewedAt, mode, success) => ({ id, reviewedAt, mode, success });

  it('does not depend on the order the reviews arrive in', () => {
    const entries = [
      at('b', 2000, 'free', true),
      at('a', 1000, 'free', true),
      at('c', 3000, 'guided', true)
    ];
    expect(foldCharacterReviews(entries)).toEqual(foldCharacterReviews([...entries].reverse()));
  });

  it('breaks a same-millisecond tie the same way every time', () => {
    const tied = [at('z', 1000, 'free', false), at('a', 1000, 'free', true)];
    expect(foldCharacterReviews(tied)).toEqual(foldCharacterReviews([...tied].reverse()));
  });

  it('replays the mode caps rather than ignoring them', () => {
    // The whole reason this fold exists. A history of nothing but tracing must
    // not fold to a mastered character, however long it is.
    const traced = Array.from({ length: 12 }, (_, i) => at(`t${i}`, 1000 + i, 'teach', true));
    expect(foldCharacterReviews(traced).box).toBe(1);

    const written = Array.from({ length: 12 }, (_, i) => at(`w${i}`, 1000 + i, 'free', true));
    expect(isMastered(foldCharacterReviews(written))).toBe(true);
  });

  it('starts from a seed imported from a browser with no account', () => {
    const seed = { ...newCard(), box: 3, seen: 9, correct: 9 };
    expect(foldCharacterReviews([], seed)).toEqual(seed);
  });

  it('ends where replaying the attempts by hand would', () => {
    const card = foldCharacterReviews([
      at('a', 1000, 'free', true),
      at('b', 2000, 'free', true),
      at('c', 3000, 'free', false)
    ]);
    expect(card.box).toBe(0);
    expect(card.seen).toBe(3);
    expect(card.correct).toBe(2);
  });
});

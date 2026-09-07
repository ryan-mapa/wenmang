import { describe, it, expect } from 'vitest';
import { createGame, recallChance, ROUND_LENGTH, MIXED } from '../source/game.js';
import { mulberry32 } from '../source/random.js';
import { newCard, BOX_COUNT } from '../source/srs.js';
import { ALL_DECK_ID, stageWords } from '../source/vocab.js';

const rng = () => mulberry32(9);
const game = (options = {}) =>
  createGame({ deckId: 'shiwu', stages: [0], random: rng(), now: () => 1000, ...options });

const playRound = (g, answerRight = true) => {
  g.startRound();
  while (!g.isRoundOver()) {
    const q = g.state.question;
    g.answer(answerRight ? q.answer : q.choices.find((c) => c !== q.answer));
    g.nextQuestion();
  }
  return g;
};

describe('starting a round', () => {
  it('deals the first question', () => {
    const g = game();
    expect(g.startRound()).not.toBeNull();
    expect(g.state.question.choices).toHaveLength(4);
  });

  it('refuses a locked stage rather than dealing a round nobody earned', () => {
    expect(() => game({ stages: [1] })).toThrow(/locked/);
  });

  it('opens a deeper stage once the one before it is mastered', () => {
    // Every stage carries words now, so reaching Everyday is a question of
    // mastery rather than of whether anything was authored there.
    const cards = {};
    for (const word of stageWords('shiwu', 0)) {
      cards[word.zh] = { ...newCard(), box: BOX_COUNT - 1 };
    }
    expect(() => createGame({ deckId: 'shiwu', stages: [1], cards, random: rng() })).not.toThrow();
  });

  it('runs over every deck at once for the combined id', () => {
    expect(() => game({ deckId: ALL_DECK_ID })).not.toThrow();
  });
});

describe('a round is twenty questions', () => {
  it('ends after exactly the round length', () => {
    const g = playRound(game());
    expect(g.state.asked).toBe(ROUND_LENGTH);
    expect(g.isRoundOver()).toBe(true);
  });

  it('reports accuracy over what was asked', () => {
    expect(playRound(game()).accuracy()).toBe(1);
    expect(playRound(game(), false).accuracy()).toBe(0);
  });
});

describe('mixed direction', () => {
  it('splits the round evenly between the two directions', () => {
    const g = playRound(game({ direction: MIXED }));
    const recall = g.state.plan.filter((d) => d === 'en-zh').length;
    expect(recall).toBe(ROUND_LENGTH / 2);
  });

  it('weights the harder direction toward words that are better known', () => {
    // The budget fixes the round at half and half; this weighting decides which
    // words spend the recall slots. Tested directly because a well-known card
    // scores far below a new one in selectNext and so rarely appears in a round
    // at all — the scheduler is doing its job, but it hides this rule.
    const at = (box) => recallChance({ ...newCard(), box });
    for (let box = 1; box < BOX_COUNT; box++) {
      expect(at(box)).toBeGreaterThan(at(box - 1));
    }
  });

  it('never makes either direction certain, at any level of knowing', () => {
    // A new word still gets the occasional recall so the round is mixed from
    // the start; a mastered one still gets recognised sometimes so it does not
    // become a different exercise.
    for (let box = 0; box < BOX_COUNT; box++) {
      const chance = recallChance({ ...newCard(), box });
      expect(chance).toBeGreaterThan(0);
      expect(chance).toBeLessThan(1);
    }
  });

  it('honours a fixed direction for every question', () => {
    for (const direction of ['zh-en', 'en-zh']) {
      const g = playRound(game({ direction }));
      expect(new Set(g.state.plan)).toEqual(new Set([direction]));
    }
  });
});

describe('answering', () => {
  it('ignores a double tap on an answered question', () => {
    const g = game();
    g.startRound();
    const q = g.state.question;
    const first = g.answer(q.answer);
    const second = g.answer(q.choices.find((c) => c !== q.answer));
    expect(second).toBe(first);
    expect(g.state.asked).toBe(1);
  });

  it('throws rather than silently scoring nothing when no question is in play', () => {
    expect(() => game().answer('apple')).toThrow(/no question/);
  });

  it('advances the card on a right answer and resets it on a wrong one', () => {
    const g = game();
    g.startRound();
    const right = g.state.question.word.zh;
    g.answer(g.state.question.answer);
    expect(g.state.cards[right].box).toBe(1);

    g.nextQuestion();
    const wrongWord = g.state.question.word.zh;
    g.answer(g.state.question.choices.find((c) => c !== g.state.question.answer));
    expect(g.state.cards[wrongWord].box).toBe(0);
  });

  it('never asks the same word twice in a row', () => {
    const g = game();
    g.startRound();
    let previous = null;
    while (!g.isRoundOver()) {
      expect(g.state.question.word.zh).not.toBe(previous);
      previous = g.state.question.word.zh;
      g.answer(g.state.question.answer);
      g.nextQuestion();
    }
  });
});

describe('the script setting mid-round', () => {
  it('changes the prompt without reshuffling the answers', () => {
    const g = game({ direction: 'zh-en', script: 'hanzi' });
    g.startRound();
    const before = g.state.question;
    const after = g.setScript('pinyin');

    expect(after.prompt).toBe(before.word.py);
    expect(after.choices).toEqual(before.choices);
    expect(after.answer).toBe(before.answer);
  });

  it('leaves an English prompt alone', () => {
    const g = game({ direction: 'en-zh', script: 'hanzi' });
    g.startRound();
    const before = g.state.question.prompt;
    expect(g.setScript('both').prompt).toBe(before);
  });
});

describe('progress reporting', () => {
  it('counts mastered words in the deck', () => {
    const cards = { 苹果: { ...newCard(), box: BOX_COUNT - 1 } };
    expect(game({ cards }).masteredCount()).toBe(1);
  });

  it('reports mastery as a fraction of the whole deck', () => {
    expect(game().mastery()).toBe(0);
  });
});

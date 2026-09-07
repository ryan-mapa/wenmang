// Headless round state for word rounds: multiple choice over one deck, with
// per-word progress that survives across rounds.
//
// Built one question at a time rather than as a list up front, because the
// direction each word is asked in depends on how well that word is known *at
// the moment it comes up* — and inside a round that changes with every answer.
//
// Character rounds do not use this. Writing is a different exercise with a
// different scheduler cap, and it lives in rounds.js and writing.js.

import { ALL_DECK_ID } from './vocab.js';
import { newCard, review, masteryOf, isMastered, selectNext, BOX_COUNT } from './srs.js';
import { buildQuestion, isCorrect, reprompt } from './quiz.js';
import { selectionPool, isStageUnlocked } from './stages.js';
import { DEFAULT_SCRIPT } from './script.js';

export const ROUND_LENGTH = 20;

/** Both directions in one round, evenly split. */
export const MIXED = 'mixed';

// How likely a word is to be asked the harder way, from barely known to
// mastered. Never 0 or 1: a new word gets the occasional recall so the round
// stays mixed from the start, and a mastered one still gets recognised
// sometimes so it does not become a different exercise entirely.
const RECALL_FLOOR = 0.2;
const RECALL_CEIL = 0.8;

/**
 * Recognition (中文 → English) is the easier direction; recall
 * (English → 中文) is the one that proves you know a word. In Chinese the gap
 * between the two is wider than in a language written with an alphabet: you can
 * recognise 蝴蝶 on sight long before you could pick it out of four plausible
 * character strings. So the odds of being asked to recall rise with how well
 * the word is known.
 */
export function recallChance(card) {
  return RECALL_FLOOR + (RECALL_CEIL - RECALL_FLOOR) * (card.box / (BOX_COUNT - 1));
}

export function createGame({
  deckId = ALL_DECK_ID,
  stages = [0],
  direction = MIXED,
  script = DEFAULT_SCRIPT,
  cards = {},
  roundLength = ROUND_LENGTH,
  random = Math.random,
  now = Date.now
} = {}) {
  const chosen = [...new Set(stages)].sort();
  const locked = chosen.filter((stage) => !isStageUnlocked(deckId, stage, cards));
  if (locked.length) {
    throw new Error(`stage ${locked[0]} of deck "${deckId}" is locked`);
  }
  const words = selectionPool(deckId, chosen, cards);
  if (words.length === 0) {
    throw new Error(`no words for deck "${deckId}" stages ${chosen.join(',') || '(none)'}`);
  }

  const state = {
    deckId,
    stages: chosen,
    direction,
    script,
    words,
    cards: { ...cards },
    roundLength,
    plan: [],
    remaining: {},
    asked: 0,
    correct: 0,
    startedAt: 0,
    question: null,
    lastAnswer: null
  };

  function cardFor(word) {
    return state.cards[word.zh] ?? newCard();
  }

  /**
   * Which way to ask this particular word.
   *
   * A mixed round is still exactly half and half — the two directions hold a
   * budget of slots and each question spends one. The weighting decides which
   * budget a word *prefers*; the budget decides what is actually left. So the
   * balance of the round is guaranteed while the harder direction still lands
   * on the words that have earned it.
   */
  function directionFor(word) {
    if (state.direction !== MIXED) return state.direction;

    const left = state.remaining;
    const total = left['en-zh'] + left['zh-en'];
    // Half the decision is what the word deserves, half is what the round still
    // owes. Steering toward the budget rather than only enforcing it at the end
    // is what keeps the last few questions from all being the same direction
    // once one side runs dry.
    const pressure = total > 0 ? left['en-zh'] / total : 0.5;
    const chance = 0.5 * recallChance(cardFor(word)) + 0.5 * pressure;

    const wanted = random() < chance ? 'en-zh' : 'zh-en';
    const other = wanted === 'en-zh' ? 'zh-en' : 'en-zh';
    const picked = left[wanted] > 0 || left[other] <= 0 ? wanted : other;

    left[picked] -= 1;
    return picked;
  }

  function nextQuestion() {
    if (state.asked >= state.roundLength) {
      state.question = null;
      return null;
    }
    const word = selectNext(state.words, state.cards, now(), {
      avoid: state.question?.word.zh ?? null,
      random,
      keyOf: (item) => item.zh
    });
    const direction = directionFor(word);
    state.plan.push(direction);
    state.question = buildQuestion(word, state.words, direction, state.script, random);
    state.lastAnswer = null;
    return state.question;
  }

  function answer(choice) {
    if (!state.question) throw new Error('no question in play');
    if (state.lastAnswer) return state.lastAnswer; // ignore double-taps

    const question = state.question;
    const correct = isCorrect(question, choice);
    const at = now();

    state.cards[question.word.zh] = review(cardFor(question.word), correct, at);
    state.asked += 1;
    state.correct += correct ? 1 : 0;

    state.lastAnswer = { choice, correct, question, at };
    return state.lastAnswer;
  }

  function startRound() {
    // An odd round length gives the extra question to recall, the harder one.
    const recall = Math.ceil(state.roundLength / 2);
    state.remaining = { 'en-zh': recall, 'zh-en': state.roundLength - recall };
    state.plan = [];
    state.asked = 0;
    state.correct = 0;
    state.startedAt = now();
    state.question = null;
    state.lastAnswer = null;
    return nextQuestion();
  }

  /** Show the question in play under a new script setting, keeping the choices. */
  function setScript(next) {
    state.script = next;
    if (state.question) state.question = reprompt(state.question, next);
    return state.question;
  }

  return {
    state,
    nextQuestion,
    answer,
    startRound,
    setScript,
    isRoundOver: () => state.asked >= state.roundLength,
    accuracy: () => (state.asked === 0 ? 0 : state.correct / state.asked),
    mastery: () => masteryOf(state.words.map(cardFor)),
    masteredCount: () => state.words.filter((word) => isMastered(cardFor(word))).length
  };
}

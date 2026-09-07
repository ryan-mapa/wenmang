// Multiple-choice word questions.
//
// Distractors are drawn from the same pool the question came from, which keeps
// them plausible: asking for 'apple' against three other fruits is a real test,
// asking it against 'bank', 'to sell' and 'colleague' is a reading exercise.
//
// Buttons are deduped by the text actually printed on them. Two entries can
// share an English gloss — several Chinese words mean "old" — and without the
// dedup a round could offer the same word twice, with one copy marked wrong.
// A learner who picks the wrong identical button has been failed by the quiz,
// not by their memory.

import { shuffle } from './random.js';
import { displayWord } from './script.js';

export const DIRECTIONS = {
  'zh-en': { promptSide: 'zh', answerSide: 'en', label: '中文 → English' },
  'en-zh': { promptSide: 'en', answerSide: 'zh', label: 'English → 中文' }
};

export const CHOICE_COUNT = 4;

/**
 * Build a question for `word`, drawing distractors from `pool`.
 *
 * `script` shapes only the prompt, and only when the prompt is the Chinese
 * side. Showing pinyin next to the answer buttons in an English → 中文 round
 * would turn a recall test into a matching test.
 */
export function buildQuestion(word, pool, direction, script, random = Math.random) {
  const { promptSide, answerSide } = DIRECTIONS[direction] ?? DIRECTIONS['zh-en'];
  const answer = word[answerSide];

  const seen = new Set([answer]);
  const distractors = [];
  for (const candidate of shuffle(pool, random)) {
    if (distractors.length >= CHOICE_COUNT - 1) break;
    const text = candidate[answerSide];
    if (seen.has(text)) continue;
    seen.add(text);
    distractors.push(text);
  }

  const shown =
    promptSide === 'zh'
      ? displayWord(word, script)
      : { primary: word.en, secondary: '', isHanzi: false };

  return {
    word,
    direction,
    prompt: shown.primary,
    promptSub: shown.secondary,
    promptIsHanzi: shown.isHanzi,
    answer,
    answerIsHanzi: answerSide === 'zh',
    choices: shuffle([answer, ...distractors], random)
  };
}

export function isCorrect(question, choice) {
  return choice === question.answer;
}

/**
 * The same question shown under a different script setting.
 *
 * Only the prompt changes. Rebuilding the whole question would redraw the
 * distractors, so flipping the toggle mid-question would reshuffle the buttons
 * under the reader's hand — and hand them a different question from the one
 * they were part-way through answering.
 */
export function reprompt(question, script) {
  const { promptSide } = DIRECTIONS[question.direction] ?? DIRECTIONS['zh-en'];
  if (promptSide !== 'zh') return question;

  const shown = displayWord(question.word, script);
  return { ...question, prompt: shown.primary, promptSub: shown.secondary, promptIsHanzi: shown.isHanzi };
}

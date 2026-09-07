// The rules for when an example sentence may be shown, and in which script.
//
// The sentences themselves live in sentences.js. The rules live here, apart
// from them, because "which line is safe to show right now" is the kind of
// thing that needs a test around it rather than a condition buried in a render
// function.
//
// Keyed by the Chinese headword exactly as it appears in vocab.js — the same
// string that keys progress, so the join can never drift. A word with no entry
// simply has no button, exactly as a word with no recording has no speaker.

import { normalizeScript } from './script.js';

/**
 * Which lines may be shown for a question.
 *
 * Two rules, and they are about different things.
 *
 * The first is safety: never show the learner the thing they are being asked to
 * produce. Before answering, only the lines on the prompt's own side —
 *
 *   - Chinese prompt: the sentence gives context for a word already on screen.
 *     Its English translation would hand over the answer.
 *   - English prompt: the English sentence disambiguates which sense is meant.
 *     The Chinese sentence contains the answer outright, in characters — and so
 *     does its pinyin, which is why pinyin counts as a Chinese line here rather
 *     than as a neutral reading aid.
 *
 * That second case bites harder in Chinese than in Spanish. A Spanish sentence
 * at least makes the learner pick the word out; a Chinese one puts the exact
 * characters they were asked to produce in front of them.
 *
 * The second rule is the script setting, which governs the sentence exactly as
 * it governs the prompt. Somebody reading in pinyin should not be handed a
 * sentence they cannot read, and somebody who has turned pinyin off has done so
 * on purpose.
 *
 * Once answered there is nothing left to give away, so everything the script
 * setting allows appears.
 */
export function exampleLines(example, direction, answered, script) {
  if (!example?.zh || !example?.py || !example?.en) return [];
  const shown = normalizeScript(script);

  const chinese = [];
  if (shown !== 'pinyin') chinese.push({ lang: 'zh', text: example.zh });
  if (shown !== 'hanzi') chinese.push({ lang: 'py', text: example.py });
  const english = [{ lang: 'en', text: example.en }];

  if (answered) return [...chinese, ...english];
  return promptSide(direction) === 'zh' ? chinese : english;
}

/** The language a question shows its prompt in. */
export function promptSide(direction) {
  return direction === 'en-zh' ? 'en' : 'zh';
}

/** The sentence triple for a word, or null where none was written. */
export function exampleFor(sentences, zh) {
  const entry = sentences?.[zh];
  if (!Array.isArray(entry) || entry.length !== 3) return null;
  const [chinese, pinyin, english] = entry;
  if (!chinese || !pinyin || !english) return null;
  return { zh: chinese, py: pinyin, en: english };
}

/** Is there anything to reveal for this question at all? */
export function hasExample(sentences, word, direction, script) {
  return exampleLines(exampleFor(sentences, word?.zh), direction, false, script).length > 0;
}

// The rules for when an example sentence may be shown.
//
// The sentences themselves live in sentences.js, which is generated and
// checked. The rules live here, apart from them, because "which line is safe to
// show right now" is the kind of thing that needs a test around it rather than
// a condition buried in a render function.
//
// Keyed by the Chinese headword exactly as it appears in vocab.js — the same
// string that keys progress, so the join can never drift. A word with no entry
// simply has no button, exactly as a word with no recording has no speaker.

/**
 * Which lines may be shown for a question.
 *
 * The rule is the one that governs the speaker button: never show the learner
 * the thing they are being asked to produce. Before answering, only the line in
 * the prompt's own language is safe —
 *
 *   - Chinese prompt: the Chinese sentence gives context for a word already on
 *     screen. Its English translation would hand over the answer.
 *   - English prompt: the English sentence disambiguates which sense is meant.
 *     The Chinese sentence contains the answer outright, in characters.
 *
 * That second case bites harder in Chinese than in Spanish. A Spanish sentence
 * at least makes the learner pick the word out; a Chinese one puts the exact
 * characters they were asked to produce in front of them.
 *
 * Once answered there is nothing left to give away, so both appear and the pair
 * becomes what it is for: the word doing its job in a real sentence.
 */
export function exampleLines(example, direction, answered) {
  if (!example?.zh || !example?.en) return [];
  const lines = [
    { lang: 'zh', text: example.zh },
    { lang: 'en', text: example.en }
  ];
  if (answered) return lines;
  return lines.filter((line) => line.lang === promptSide(direction));
}

/** The language a question shows its prompt in. */
export function promptSide(direction) {
  return direction === 'en-zh' ? 'en' : 'zh';
}

/** The sentence pair for a word, or null where none was written. */
export function exampleFor(sentences, zh) {
  const pair = sentences?.[zh];
  if (!Array.isArray(pair) || pair.length !== 2) return null;
  const [chinese, english] = pair;
  if (!chinese || !english) return null;
  return { zh: chinese, en: english };
}

/** Is there anything to reveal for this question at all? */
export function hasExample(sentences, word, direction) {
  return exampleLines(exampleFor(sentences, word?.zh), direction, false).length > 0;
}

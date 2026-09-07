// Merges a batch of example sentences into source/sentences.js.
//
//   node tools/add-sentences.mjs batch.json
//   node tools/add-sentences.mjs batch.json --dry     report, write nothing
//
// The batch is `{ "苹果": ["苹果比香蕉便宜。", "píngguǒ bǐ xiāngjiāo piányi", "Apples are cheaper than bananas."] }`.
//
// Why a tool rather than editing the file directly: sentences arrive a deck at
// a time over many sittings, and the point is that each batch is a small,
// checked, committable step. Rewriting the whole file by hand each time is how
// an earlier deck quietly loses a line.
//
// Everything is checked before anything is written, and a batch with a single
// fault is rejected whole — a half-merged batch is the state that costs the
// most to unpick. The checks here are the mechanical ones; tools/check-vocab.mjs
// then verifies the pinyin against Unihan, one syllable per character.

import { readFileSync, writeFileSync } from 'node:fs';
import { allWords } from '../source/vocab.js';
import { SENTENCES } from '../source/sentences.js';

const OUT = new URL('../source/sentences.js', import.meta.url);
const MIN_CHARS = 4;
const MAX_CHARS = 22;

const [, , file, ...flags] = process.argv;
if (!file) {
  console.error('usage: node tools/add-sentences.mjs <batch.json> [--dry]');
  process.exit(1);
}

const words = new Map(allWords().map((word) => [word.zh, word]));
const batch = JSON.parse(readFileSync(file, 'utf8'));

const hanCount = (text) => [...text].filter((ch) => /\p{Script=Han}/u.test(ch)).length;

const problems = [];
for (const [zh, entry] of Object.entries(batch)) {
  const fault = (why) => problems.push(`${zh}: ${why}`);

  if (!words.has(zh)) { fault('not a deck word'); continue; }
  if (!Array.isArray(entry) || entry.length !== 3) { fault('not [Chinese, pinyin, English]'); continue; }

  const [chinese, pinyin, english] = entry;
  if (typeof chinese !== 'string' || typeof pinyin !== 'string' || typeof english !== 'string') {
    fault('a part is not a string');
    continue;
  }
  // The check that matters most: a sentence not containing the word it
  // illustrates is shown *as* the example, and a learner cannot tell.
  if (!chinese.includes(zh)) fault(`sentence does not contain ${zh}`);
  if (hanCount(chinese) < MIN_CHARS) fault('sentence too short');
  if (hanCount(chinese) > MAX_CHARS) fault(`sentence too long (${hanCount(chinese)} chars)`);
  if (/[a-zA-Z]/.test(chinese)) fault('Latin letters in the sentence');
  if (/\d/.test(pinyin)) fault('pinyin uses tone numbers');
  if (!/[Ā-ǿà-ü]/.test(pinyin)) fault('pinyin has no tone marks');
  if (english.trim().length < 3) fault('no English');
}

const incoming = Object.keys(batch).length;
const fresh = Object.keys(batch).filter((zh) => !SENTENCES[zh]).length;

if (problems.length) {
  console.error(`${problems.length} problem(s) — nothing written:`);
  for (const line of problems) console.error('  ' + line);
  process.exit(1);
}

console.log(`batch: ${incoming} sentences, ${fresh} new, ${incoming - fresh} already present`);
if (flags.includes('--dry')) process.exit(0);

const merged = { ...SENTENCES, ...batch };
const body = Object.entries(merged)
  .sort(([a], [b]) => (a < b ? -1 : 1))
  .map(([zh, [chinese, pinyin, english]]) =>
    `  '${zh}': [${JSON.stringify(chinese)}, ${JSON.stringify(pinyin)}, ${JSON.stringify(english)}]`
  )
  .join(',\n');

writeFileSync(
  OUT,
  `// One example sentence per word: the Chinese, its pinyin, and its English.
//
// Keyed by the Chinese headword exactly as it appears in vocab.js. That string
// is the progress key, so the join is the same one the rest of the app makes.
// A word with no entry here simply gets no example.
//
// Each entry is [Chinese, pinyin, English]. The pinyin is the sentence read
// aloud, not a gloss — it follows the same script setting as the prompt, so a
// learner who has the toggle on pinyin gets the sentence in pinyin too. The
// English translates the Chinese rather than standing alone; the three are
// shown together and have to line up.
//
// House style, so a reviewer has something to hold these to:
//   - short: ${MIN_CHARS} to ${MAX_CHARS} characters, one clause or two
//   - natural: what a person would actually say, not a dictionary illustration
//   - the sentence disambiguates the word, which is the whole point of the
//     feature: 菜 in one sentence is a dish, in another it is a vegetable
//   - simplified characters, no Latin letters, no names
//   - no 他/她 where a neutral subject will do — a sentence should not need a
//     person invented for it
//   - pinyin with tone marks, spaced by word rather than by syllable, with
//     sandhi written as it is said: 一杯 is yì bēi, 不放 is bú fàng
//
// Written a deck at a time through tools/add-sentences.mjs, which rejects a
// batch whole rather than merging half of it, and checked by
// tools/check-vocab.mjs, which aligns every sentence's pinyin against the
// readings Unicode records for its characters. That is all mechanical. Whether
// a sentence is natural is not, and these have
//
// NOT YET BEEN REVIEWED BY A NATIVE SPEAKER.

export const SENTENCES = {
${body}
};

/** The example for a word, or null. */
export function sentenceFor(zh) {
  return SENTENCES[zh] ?? null;
}
`
);

console.log(`written — ${Object.keys(merged).length} sentences total`);

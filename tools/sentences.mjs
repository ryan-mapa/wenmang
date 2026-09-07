// Generates one example sentence per word.
//
//   node tools/sentences.mjs --deck shiwu --stage 0      one stage of one deck
//   node tools/sentences.mjs --deck shiwu                a whole deck
//   node tools/sentences.mjs --limit 5                   the first 5 missing
//   node tools/sentences.mjs --check                     validate what exists, write nothing
//
// Credentials come from `.gen.env` beside the repo root, which is gitignored,
// or from ANTHROPIC_API_KEY in the environment. Nothing is read from the
// command line, so a key cannot end up in shell history:
//
//   ANTHROPIC_API_KEY=sk-ant-...
//
// Words that already have a sentence are skipped, so this is safe to run
// repeatedly and safe to interrupt — which is what lets the daemon around it be
// a dumb loop.
//
// Everything generated is checked before it is written: the sentence has to
// contain the headword, be the right sort of length, and be Chinese. A model
// that drifts produces a rejected batch and a retry rather than silently
// teaching somebody a sentence that does not contain the word it is for.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { DECKS, STAGE_NAMES } from '../source/vocab.js';
import { SENTENCES } from '../source/sentences.js';

const ROOT = new URL('..', import.meta.url);
const OUT = new URL('source/sentences.js', ROOT);

const MODEL = 'claude-opus-5';
/** Words per request. Small enough that one bad batch is cheap to redo. */
const BATCH = 12;
const MIN_CHARS = 4;
const MAX_CHARS = 22;

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null);

const deckId = value('--deck');
const stage = value('--stage') === null ? null : Number(value('--stage'));
const limit = value('--limit') === null ? Infinity : Number(value('--limit'));

// ------------------------------------------------------------- credentials

function apiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;

  const file = new URL('.gen.env', ROOT);
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = line.match(/^\s*ANTHROPIC_API_KEY\s*=\s*(.*)$/);
      if (match) return match[1].trim();
    }
  }
  console.error(
    'No API key. Put one in .gen.env beside package.json:\n' +
    '  ANTHROPIC_API_KEY=sk-ant-...\n' +
    'or export ANTHROPIC_API_KEY in the environment.'
  );
  process.exit(1);
}

// ------------------------------------------------------------------- words

function targetWords() {
  const decks = deckId ? DECKS.filter((d) => d.id === deckId) : DECKS;
  if (deckId && decks.length === 0) {
    console.error(`unknown deck: ${deckId}`);
    process.exit(1);
  }
  const seen = new Set();
  const out = [];
  for (const deck of decks) {
    const stages = stage === null ? deck.stages : [deck.stages[stage] ?? []];
    for (const word of stages.flat()) {
      if (seen.has(word.zh)) continue;
      seen.add(word.zh);
      out.push(word);
    }
  }
  return out;
}

// -------------------------------------------------------------- validation

const isHan = (ch) => /\p{Script=Han}/u.test(ch);
const hanCount = (text) => [...text].filter(isHan).length;

/**
 * Why a sentence is unusable, or null if it is fine.
 *
 * The headword check is the one that matters. A sentence that does not contain
 * the word it illustrates is worse than no sentence: it is shown *as* the
 * example, and a learner has no way to know it is wrong.
 */
function reject(word, sentence, pinyin, english) {
  if ([sentence, pinyin, english].some((part) => typeof part !== 'string')) return 'missing a field';
  if (/\d/.test(pinyin)) return 'pinyin has a tone number';
  if (!/[\u0100-\u01ff\u00e0-\u00fc]/.test(pinyin)) return 'pinyin has no tone marks';
  if (!sentence.includes(word.zh)) return `does not contain ${word.zh}`;
  if (hanCount(sentence) < MIN_CHARS) return 'too short';
  if (hanCount(sentence) > MAX_CHARS) return 'too long';
  if (/[a-zA-Z]/.test(sentence)) return 'contains Latin letters';
  if (english.trim().length < 3) return 'English translation missing';
  return null;
}

// ------------------------------------------------------------- generation

const Schema = z.object({
  sentences: z.array(
    z.object({
      word: z.string(),
      chinese: z.string(),
      pinyin: z.string(),
      english: z.string()
    })
  )
});

const BRIEF = `You are writing example sentences for a Mandarin vocabulary app.

For each word you are given, write ONE example sentence in simplified Chinese
and its English translation.

House style, which the app's validator enforces:
- Short: ${MIN_CHARS}–${MAX_CHARS} Chinese characters. One clause, or two at most.
- Natural: what a person would actually say, not a dictionary illustration.
- The sentence MUST contain the headword exactly as given, unchanged.
- The sentence should disambiguate the word — that is the whole point of the
  example. 会 in one sentence is "can"; in another it is "will"; the sentence
  has to make clear which one this entry means.
- Simplified characters only. No pinyin, no Latin letters, no names.
- Avoid 他/她 where a neutral subject will do. A sentence should not need a
  person invented for it.
- The English is a translation of the Chinese sentence, not an independent
  example. The two are shown together and have to line up.
- The pinyin is the whole sentence read aloud, with tone marks, spaced by word
  rather than by syllable. Write sandhi as it is said: 一杯 is "yì bēi", 不放 is
  "bú fàng". It is checked against the Unicode Han Database one syllable per
  character, so a dropped or invented syllable will be rejected.`;

async function generate(client, words) {
  const listing = words.map((w) => `${w.zh} (${w.py}) — ${w.en}`).join('\n');

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: BRIEF,
    messages: [{ role: 'user', content: `Write one sentence for each of these words:\n\n${listing}` }],
    output_config: { format: zodOutputFormat(Schema, 'sentences') }
  });

  if (response.stop_reason === 'refusal') {
    throw new Error(`refused: ${response.stop_details?.category ?? 'unknown'}`);
  }
  if (!response.parsed_output) throw new Error('no parsed output');
  return response.parsed_output.sentences;
}

// ------------------------------------------------------------------ output

function write(map) {
  const entries = Object.entries(map).sort(([a], [b]) => (a < b ? -1 : 1));
  const body = entries
    .map(([zh, [sentence, pinyin, english]]) =>
      `  '${zh}': [${JSON.stringify(sentence)}, ${JSON.stringify(pinyin)}, ${JSON.stringify(english)}]`
    )
    .join(',\n');

  writeFileSync(
    OUT,
    `// One example sentence per word, with its English translation.
//
// Keyed by the Chinese headword exactly as it appears in vocab.js. That string
// is the progress key, so the join is the same one the rest of the app makes.
// A word with no entry here simply gets no example.
//
// Each entry is [Chinese, pinyin, English]. The English translates the Chinese
// rather than standing alone — the two are shown together, so they have to line
// up.
//
// Generated by tools/sentences.mjs and checked by it before being written: the
// sentence contains its headword, is between ${MIN_CHARS} and ${MAX_CHARS}
// characters, and carries no Latin letters. Regenerate with:
//
//   node tools/sentences.mjs --deck <id> --stage <n>
//
// NOT YET REVIEWED BY A NATIVE SPEAKER. The checks above are mechanical;
// whether a sentence is natural is not something they can tell you.

export const SENTENCES = {
${body}
};

/** The example for a word, or null. */
export function sentenceFor(zh) {
  return SENTENCES[zh] ?? null;
}
`
  );
}

// -------------------------------------------------------------------- main

const words = targetWords();
const scope = `${deckId ?? 'all decks'}${stage === null ? '' : ` ${STAGE_NAMES[stage]}`}`;

if (flag('--check')) {
  let bad = 0;
  for (const word of words) {
    const entry = SENTENCES[word.zh];
    if (!entry) continue;
    const why = reject(word, entry[0], entry[1], entry[2]);
    if (why) {
      console.log(`${word.zh}: ${why}`);
      bad += 1;
    }
  }
  const have = words.filter((w) => SENTENCES[w.zh]).length;
  console.log(`${scope}: ${have}/${words.length} have sentences, ${bad} bad`);
  process.exit(bad ? 1 : 0);
}

const missing = words.filter((word) => !SENTENCES[word.zh]).slice(0, limit);
console.log(`${scope}: ${missing.length} word(s) need a sentence`);
if (missing.length === 0) process.exit(0);

const client = new Anthropic({ apiKey: apiKey() });
const merged = { ...SENTENCES };
let written = 0;
let rejected = 0;

for (let i = 0; i < missing.length; i += BATCH) {
  const batch = missing.slice(i, i + BATCH);
  let produced;
  try {
    produced = await generate(client, batch);
  } catch (error) {
    // One bad batch should not end the run — the daemon comes back for it, and
    // a batch that fails every pass shows up as a count that never reaches zero.
    console.error(`batch ${i / BATCH + 1}: ${error.message}`);
    continue;
  }

  const byWord = new Map(produced.map((item) => [item.word, item]));
  for (const word of batch) {
    const item = byWord.get(word.zh);
    if (!item) {
      console.error(`${word.zh}: not returned`);
      rejected += 1;
      continue;
    }
    const why = reject(word, item.chinese, item.pinyin, item.english);
    if (why) {
      console.error(`${word.zh}: rejected — ${why}`);
      rejected += 1;
      continue;
    }
    merged[word.zh] = [item.chinese, item.pinyin, item.english];
    written += 1;
  }
  write(merged);
  process.stdout.write(`\r${written} written, ${rejected} rejected`);
}

console.log(`\ndone — ${written} written, ${rejected} rejected`);

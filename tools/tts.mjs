// Generates the pronunciation clips.
//
//   node tools/tts.mjs --voices                 list the Mandarin voices on offer
//   node tools/tts.mjs --deck shiwu --stage 0   one stage of one deck
//   node tools/tts.mjs --limit 5                the first 5 missing words only
//   node tools/tts.mjs --manifest               rebuild audio/words.json from disk
//   node tools/tts.mjs                          every word still missing a clip
//
// Credentials come from `.tts.env` beside the repo root, which is gitignored.
// Nothing is read from the command line, so a key cannot end up in shell
// history:
//
//   AZURE_KEY=...
//   AZURE_REGION=eastus
//
// Output is mp3 straight from the provider. No transcode step, because that
// would mean depending on ffmpeg to convert audio nobody would hear a
// difference in.
//
// Already-generated clips are skipped, so this is safe to run repeatedly and
// safe to interrupt — which is what lets the daemon around it be a dumb loop.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { DECKS } from '../source/vocab.js';
import { audioSlug, VOICE_COUNT } from '../source/audio.js';

const ROOT = new URL('..', import.meta.url);
const OUT = new URL('audio/', ROOT);

/**
 * The four that ship, in cycle order.
 *
 * Two women and two men, all Mainland standard. A learner tapping four times
 * should hear four different readings of the same tones — that is the point of
 * having more than one, and it is worth more in Chinese than in a language
 * where the vowel does not carry meaning.
 */
const VOICES = [
  { id: 'zh-CN-XiaoxiaoNeural', label: 'Mainland, female · Xiaoxiao' },
  { id: 'zh-CN-YunxiNeural', label: 'Mainland, male · Yunxi' },
  { id: 'zh-CN-XiaoyiNeural', label: 'Mainland, female · Xiaoyi' },
  { id: 'zh-CN-YunjianNeural', label: 'Mainland, male · Yunjian' }
];

/** Pause between requests, so a long run does not trip Azure's rate limit. */
const PACE_MS = Number(process.env.TTS_PACE_MS ?? 220);

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null);

const deckId = value('--deck');
const stage = value('--stage') === null ? null : Number(value('--stage'));
const limit = value('--limit') === null ? Infinity : Number(value('--limit'));

// ------------------------------------------------------------- credentials

function readEnv() {
  const file = new URL('.tts.env', ROOT);
  if (!existsSync(file)) {
    console.error(
      'No .tts.env found. Create one beside package.json with:\n' +
      '  AZURE_KEY=...\n  AZURE_REGION=eastus\n' +
      '(Vocabulario has one already: cp ../vocabulario/.tts.env .tts.env)'
    );
    process.exit(1);
  }
  const vars = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
    if (match) vars[match[1]] = match[2].trim();
  }
  if (!vars.AZURE_KEY || !vars.AZURE_REGION) {
    console.error('.tts.env needs both AZURE_KEY and AZURE_REGION');
    process.exit(1);
  }
  return vars;
}

// ------------------------------------------------------------------ speech

const escapeXml = (text) =>
  text.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

async function speak(vars, text, voice) {
  const ssml =
    `<speak version='1.0' xml:lang='zh-CN'>` +
    `<voice name='${voice}'>${escapeXml(text)}</voice></speak>`;

  const res = await fetch(
    `https://${vars.AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': vars.AZURE_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'wenmang'
      },
      body: ssml
    }
  );
  if (!res.ok) throw new Error(`azure ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function listVoices(vars) {
  const res = await fetch(
    `https://${vars.AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
    { headers: { 'Ocp-Apim-Subscription-Key': vars.AZURE_KEY } }
  );
  if (!res.ok) throw new Error(`azure ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const all = await res.json();
  for (const v of all.filter((v) => v.Locale.startsWith('zh-CN'))) {
    console.log(`${v.ShortName.padEnd(34)} ${v.Gender.padEnd(7)} ${v.LocalName ?? ''}`);
  }
}

// ------------------------------------------------------------------- words

/** The words this run is responsible for, after --deck and --stage. */
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

const clipPath = (voice, word) => new URL(`${voice + 1}/${audioSlug(word.zh)}.mp3`, OUT);

const missing = (word) =>
  Array.from({ length: VOICE_COUNT }, (_, v) => v).filter((v) => !existsSync(clipPath(v, word)));

/**
 * The manifest: which words have a complete set of recordings.
 *
 * A partial set is left out entirely. A word with three of four voices would
 * otherwise show a speak button that fails one tap in four, and a button that
 * usually works is worse than one that is not there.
 */
function writeManifest() {
  const present = Array.from({ length: VOICE_COUNT }, (_, v) => {
    const dir = new URL(`${v + 1}/`, OUT);
    if (!existsSync(dir)) return new Set();
    return new Set(readdirSync(dir).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)));
  });

  const complete = [];
  for (const word of DECKS.flatMap((d) => d.stages.flat())) {
    const slug = audioSlug(word.zh);
    if (present.every((set) => set.has(slug))) complete.push(slug);
  }

  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    new URL('words.json', OUT),
    JSON.stringify({ voices: VOICE_COUNT, spoken: [...new Set(complete)].sort() }, null, 0)
  );
  console.log(`manifest: ${new Set(complete).size} words fully voiced`);
}

// -------------------------------------------------------------------- main

const vars = readEnv();

if (flag('--voices')) {
  await listVoices(vars);
  process.exit(0);
}
if (flag('--manifest')) {
  writeManifest();
  process.exit(0);
}

for (let v = 0; v < VOICE_COUNT; v++) mkdirSync(new URL(`${v + 1}/`, OUT), { recursive: true });

const words = targetWords().filter((word) => missing(word).length > 0).slice(0, limit);
console.log(`${words.length} word(s) need clips${deckId ? ` in ${deckId}` : ''}${stage === null ? '' : ` stage ${stage}`}`);

let made = 0;
let failed = 0;

for (const word of words) {
  for (const voice of missing(word)) {
    try {
      const audio = await speak(vars, word.zh, VOICES[voice].id);
      writeFileSync(clipPath(voice, word), audio);
      made += 1;
      process.stdout.write(`\r${made} clips written`);
    } catch (error) {
      // One bad word should not end the run — the daemon will come back for it,
      // and a word that fails every pass is visible in the count that never
      // reaches zero.
      failed += 1;
      console.error(`\n${word.zh} voice ${voice + 1}: ${error.message}`);
    }
    if (PACE_MS) await new Promise((r) => setTimeout(r, PACE_MS));
  }
}

console.log(`\ndone — ${made} written, ${failed} failed`);
writeManifest();

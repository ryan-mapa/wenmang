// Checks source/vocab.js against the Unicode Han Database and against itself.
//
//   node tools/check-vocab.mjs <path-to-unpacked-unihan>
//
// Hand-authored vocabulary goes wrong in quiet ways. A wrong gloss is caught by
// anybody who reads it; a wrong *tone* is not, and it is the error that teaches
// somebody to say the wrong thing for years. So the pinyin is checked against
// the readings Unicode records for each character, one syllable per character,
// in order.
//
// The check is deliberately generous about which reading is acceptable — it
// takes the union of four Unihan fields, because 多音字 are common and a word
// may legitimately use a rare reading. It is strict about the *shape*: the
// syllables must line up with the characters one for one. That is what catches
// a dropped syllable or a syllable belonging to a different character.
//
// What it cannot catch, and does not pretend to: whether a gloss is the right
// English for the word. Only a reader can do that.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DECKS, STAGE_COUNT, STAGE_NAMES } from '../source/vocab.js';

const unihanDir = process.argv[2];
if (!unihanDir) {
  console.error('usage: node tools/check-vocab.mjs <path-to-unpacked-unihan>');
  process.exit(1);
}

const READING_FIELDS = new Set(['kMandarin', 'kHanyuPinyin', 'kXHC1983', 'kTGHZ2013']);

/** Tone marks stripped, ü folded to v, so 'lǜ' and 'lv' compare equal. */
function bare(pinyin) {
  return pinyin
    .normalize('NFD')
    .replace(/[\u0300-\u030f]/g, '')   // combining tone marks
    .replace(/\u00fc/g, 'v')
    .replace(/[''\u2019\s-]/g, '')
    .toLowerCase();
}

/** 1-4 from the tone mark, or 0 for an unmarked (neutral) syllable. */
const TONE_OF = { '\u0304': 1, '\u0301': 2, '\u030c': 3, '\u0300': 4 };
function toneOf(syllable) {
  for (const mark of syllable.normalize('NFD')) {
    if (TONE_OF[mark]) return TONE_OF[mark];
  }
  return 0;
}

/**
 * Characters whose tone changes in context, so any tone on them is allowed.
 * 一 and 不 are the two productive sandhi cases in Mandarin; 儿 is swallowed
 * entirely in erhua.
 */
const SANDHI = new Set(['\u4e00', '\u4e0d', '\u513f']);

/** char -> Set of acceptable readings, tone marks kept. */
function readReadings() {
  const out = new Map();
  const text = readFileSync(join(unihanDir, 'Unihan_Readings.txt'), 'utf8');

  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [code, field, value] = line.split('\t');
    if (!READING_FIELDS.has(field)) continue;

    const ch = String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (!out.has(ch)) out.set(ch, new Set());
    const set = out.get(ch);

    // kHanyuPinyin: "53189.040:píng,pēng" — location, then the readings.
    // kXHC1983/kTGHZ2013: "0883.020:píng". kMandarin: "píng" (or two, spaced).
    for (const chunk of value.trim().split(' ')) {
      const readings = chunk.includes(':') ? chunk.slice(chunk.indexOf(':') + 1) : chunk;
      for (const reading of readings.split(',')) {
        const clean = reading.trim().toLowerCase();
        if (clean) set.add(clean);
      }
    }
  }
  return out;
}

const readings = readReadings();

/**
 * Can `word` be cut into one reading per character, in order, with tones that
 * the character actually takes?
 *
 * Segmentation runs on the toneless forms, because that is what makes the cut
 * unambiguous to search — 'xian' is a reading and so are 'xi' + 'an', and only
 * one split leaves a valid reading for the next character, so it backtracks.
 * The tone is then checked against the readings that produced the match.
 *
 * A neutral (unmarked) syllable is accepted anywhere but the first: 轻声 is
 * real and pervasive — 桌子 really is zhuōzi, not zhuōzǐ — but a word whose
 * *first* syllable carries no tone is a typo, not a neutral tone.
 *
 * Returns true, false, or null when a character has no readings on file.
 */
function align(chars, syllablesOf, index = 0, at = 0) {
  if (index === chars.length) return at === syllablesOf.bare.length;
  const options = readings.get(chars[index]);
  if (!options) return null;

  // Erhua. A final 儿 is not a syllable of its own — it colours the syllable
  // before it, so 哪儿 is nǎr and not nǎ ér. One character has no syllable to
  // line up with, which is exactly what the rest of this function forbids, so
  // it is spelled out here rather than smuggled in as a reading.
  if (chars[index] === '儿' && index === chars.length - 1) {
    const tail = syllablesOf.bare.slice(at);
    if (tail === 'r' || tail === '') return true;
  }

  for (const reading of options) {
    const toneless = bare(reading);
    if (!toneless || !syllablesOf.bare.startsWith(toneless, at)) continue;

    const wanted = toneOf(reading);
    const got = toneOf(syllablesOf.toneAt(at, toneless.length));
    const toneOk =
      got === wanted ||
      SANDHI.has(chars[index]) ||
      (got === 0 && index > 0);
    if (!toneOk) continue;

    const rest = align(chars, syllablesOf, index + 1, at + toneless.length);
    if (rest === true) return true;
    if (rest === null) return null;
  }
  return false;
}

/**
 * The word's pinyin in both forms, with a way to ask which toned characters
 * produced a given span of the toneless string. Built by walking the two in
 * step, since stripping a tone never changes a letter's position.
 */
function syllableView(pinyin) {
  const kept = [];
  let bareText = '';
  for (const ch of pinyin) {
    const piece = bare(ch);
    if (!piece) continue; // an apostrophe or a space
    bareText += piece;
    for (let i = 0; i < piece.length; i++) kept.push(ch);
  }
  return {
    bare: bareText,
    toneAt: (start, length) => kept.slice(start, start + length).join('')
  };
}

const problems = [];
const note = (deck, stage, word, message) =>
  problems.push(`${deck}/${STAGE_NAMES[stage]}  ${word.zh ?? '?'}  ${message}`);

const byKey = new Map();
let count = 0;
let unknown = 0;

console.log('deck'.padEnd(14) + 'name'.padEnd(24) + STAGE_NAMES.map((n) => n.padStart(9)).join('') + '    total');

for (const deck of DECKS) {
  const sizes = [];
  for (let stage = 0; stage < STAGE_COUNT; stage++) {
    const words = deck.stages[stage] ?? [];
    sizes.push(words.length);

    for (const word of words) {
      count += 1;

      if (!word.zh || !word.py || !word.en) { note(deck.id, stage, word, 'missing a field'); continue; }
      if (/\d/.test(word.py)) note(deck.id, stage, word, `pinyin has a tone number: ${word.py}`);
      if (![...word.zh].every((c) => /\p{Script=Han}/u.test(c))) {
        note(deck.id, stage, word, 'non-Han character on the Chinese side');
      }

      const seen = byKey.get(word.zh);
      if (seen && (seen.en !== word.en || seen.py !== word.py)) {
        note(deck.id, stage, word, `glossed differently in ${seen.deck}: "${seen.en}"/"${seen.py}" vs "${word.en}"/"${word.py}"`);
      } else if (!seen) {
        byKey.set(word.zh, { ...word, deck: deck.id });
      }

      const ok = align([...word.zh], syllableView(word.py));
      if (ok === null) unknown += 1;
      else if (!ok) note(deck.id, stage, word, `pinyin "${word.py}" does not line up with the characters`);
    }
  }
  const total = sizes.reduce((a, b) => a + b, 0);
  console.log(
    deck.id.padEnd(14) + deck.name.padEnd(24) +
    sizes.map((n) => String(n).padStart(9)).join('') + String(total).padStart(9)
  );
}

console.log('');
console.log(`decks: ${DECKS.length}   entries: ${count}   distinct words: ${byKey.size}`);
if (unknown) console.log(`no Unihan readings for ${unknown} entr${unknown === 1 ? 'y' : 'ies'} — not checked`);

if (problems.length) {
  console.log(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
  for (const line of problems) console.log('  ' + line);
  process.exit(1);
}
console.log('\nno problems.');

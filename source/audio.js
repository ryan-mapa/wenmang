// Where a word's pronunciation lives, and which voice says it next.
//
// Deliberately pure — no Audio object is built here. main.js does the playing,
// so this stays testable and `source/` stays DOM-free.

/** Voices per word. Tapping again cycles, so repeats are never the same voice. */
export const VOICE_COUNT = 4;

const DIR = 'audio';
const FORMAT = 'mp3';

/**
 * Filename stem for a word: its characters as hex codepoints, joined.
 * 苹果 becomes `82f9-679c`.
 *
 * Vocabulario strips accents and keeps the letters, which works because
 * Spanish survives the trip to ASCII. Chinese does not, and the two obvious
 * alternatives both fail:
 *
 * - The characters themselves would have to survive every filesystem, URL
 *   encoder and CDN between here and a phone, and some of them do not.
 * - Pinyin collides constantly. 是, 事 and 试 are all `shi`; even with tones,
 *    事 and 试 are both `shì`. A slug that collides silently serves one word's
 *   recording for another, which is worse than having no recording.
 *
 * Codepoints are ugly to read and impossible to get wrong, which is the right
 * trade for a name no learner ever sees. Like Vocabulario's, the stem derives
 * from the progress key, so renaming a shipped word orphans its audio exactly
 * as it orphans its progress.
 */
export function audioSlug(zh) {
  return [...String(zh)].map((ch) => ch.codePointAt(0).toString(16)).join('-');
}

/** Where the list of words that have a full set of recordings lives. */
export const MANIFEST_URL = `${DIR}/words.json`;

/** Path to one voice's recording of a word, relative to the app. */
export function clipUrl(zh, voice) {
  return `${DIR}/${voice + 1}/${audioSlug(zh)}.${FORMAT}`;
}

/**
 * The voice to play next. Cycles, so tapping twice never gives the same reading
 * twice — one tap is a reminder, four is listening practice.
 */
export function nextVoice(previous, count = VOICE_COUNT) {
  if (count <= 1) return 0;
  return previous === null || previous === undefined ? 0 : (previous + 1) % count;
}

/**
 * Whether this question may be spoken at all.
 *
 * Only when the prompt is already Chinese. In the recall direction the Chinese
 * *is* the answer, so speaking it would give it away — and in Chinese it would
 * give away more than in Spanish, since hearing the word is most of the
 * question. Half of every mixed round is recall, so this is the common case.
 */
export function canPlay(direction) {
  return direction === 'zh-en';
}

/**
 * Whether this particular word can be heard.
 *
 * Recordings arrive a deck at a time, and one that fails to generate should
 * cost that word its button rather than cost every word its button. `spoken` is
 * the manifest's set of slugs; empty means no audio at all, which is the normal
 * state of a copy served before the clips were made.
 */
export function hasClip(spoken, zh) {
  return spoken.size > 0 && spoken.has(audioSlug(zh));
}

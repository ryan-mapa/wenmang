// How a word is shown: characters alone, pinyin alone, or both together.
//
// The default is characters alone, and that default is doing real work. Pinyin
// is a crutch that stops being one only when it is absent: shown next to a
// character, it is read *instead of* the character, and the learner leaves the
// round having practised reading the alphabet they already knew. So the app
// starts strict and lets you reach for the crutch, rather than starting soft.
//
// Pinyin-alone is not a lesser mode — it is the mode that matters for writing,
// where the pinyin is the prompt and the character is the answer being
// produced. That is why this is a three-way cycle rather than a hint toggle.

export const SCRIPT_MODES = ['hanzi', 'pinyin', 'both'];

export const DEFAULT_SCRIPT = 'hanzi';

export const SCRIPT_LABELS = {
  hanzi: '汉字',
  pinyin: 'pīnyīn',
  both: '汉字 + pīnyīn'
};

/** Longer text for the toggle's tooltip and the settings row. */
export const SCRIPT_DESCRIPTIONS = {
  hanzi: 'Characters only',
  pinyin: 'Pinyin only',
  both: 'Characters with pinyin'
};

export function isScriptMode(mode) {
  return SCRIPT_MODES.includes(mode);
}

export function normalizeScript(mode) {
  return isScriptMode(mode) ? mode : DEFAULT_SCRIPT;
}

/** Next mode in the cycle, wrapping. The toggle's only behaviour. */
export function cycleScript(mode) {
  const index = SCRIPT_MODES.indexOf(normalizeScript(mode));
  return SCRIPT_MODES[(index + 1) % SCRIPT_MODES.length];
}

/**
 * How to display `word` under `mode`.
 *
 * Two fields rather than one string, because the caller sizes them very
 * differently — characters want to be large enough to see the strokes, pinyin
 * wants to sit quietly underneath. `secondary` is empty when there is nothing
 * to put there, and callers should test for that rather than for the mode.
 */
export function displayWord(word, mode = DEFAULT_SCRIPT) {
  switch (normalizeScript(mode)) {
    case 'pinyin':
      return { primary: word.py, secondary: '', isHanzi: false };
    case 'both':
      return { primary: word.zh, secondary: word.py, isHanzi: true };
    default:
      return { primary: word.zh, secondary: '', isHanzi: true };
  }
}

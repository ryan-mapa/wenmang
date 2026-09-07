// The one place that knows where stroke geometry comes from.
//
// Everything else in the app talks about characters, modes and hints; only this
// module knows that the shapes are SVG paths, that they arrive from a CDN, and
// that they carry a licence. That containment is deliberate and worth keeping:
// the stroke-data question is the only genuinely unsettled dependency in the
// project, and when it changes it should change here and nowhere else.
//
// Current source: hanzi-writer (MIT) for rendering and quiz logic, with its
// character data (Make Me a Hanzi, derived from the Arphic PL fonts) fetched
// per character at runtime. Fetching rather than bundling is a deliberate
// choice about the licence as much as about size — the Arphic terms attach
// obligations to *distributing* the data, and to modified copies especially, so
// not shipping a trimmed subset keeps those obligations off this repo. The
// attribution is in NOTICE either way, because it is owed either way.
//
// If that source is ever replaced, the contract to preserve is small: something
// that can mount a character into an element, animate it, quiz on it, and
// report per-stroke correctness.

/** Where the per-character JSON is fetched from. Pinned, so a CDN's "latest"
 *  cannot silently change the data under a learner mid-round. */
export const DATA_ORIGIN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1';

export const ATTRIBUTION =
  'Character stroke data from Make Me a Hanzi, derived from the Arphic PL fonts, ' +
  'used under the Arphic Public License.';

/** In-memory cache. A character recurs constantly across rounds; refetching it
 *  every time would put a network round-trip in front of a hint. */
const cache = new Map();

/**
 * Fetch one character's stroke data.
 *
 * Resolves to null rather than throwing when a character is missing or the
 * network is down. A writing round that cannot draw is a degraded round, not a
 * crashed app — the caller falls back to the structural hints, which need no
 * geometry at all.
 */
export async function loadCharacter(char, fetcher = globalThis.fetch) {
  if (cache.has(char)) return cache.get(char);

  const pending = (async () => {
    try {
      const response = await fetcher(`${DATA_ORIGIN}/${encodeURIComponent(char)}.json`);
      if (!response.ok) return null;
      const data = await response.json();
      return data?.strokes?.length ? data : null;
    } catch {
      return null;
    }
  })();

  cache.set(char, pending);
  return pending;
}

/** Drop the cache. Tests need this; the app never does. */
export function clearCache() {
  cache.clear();
}

/**
 * Options for hanzi-writer, derived from a writing mode.
 *
 * The three modes differ only in what the renderer shows before the learner
 * starts, which is why they can share one component. `teach` shows the outline
 * *and* the per-stroke guidance; `guided` shows the outline alone; `free` shows
 * nothing. `showHintAfterMisses` is set to false throughout because this app
 * runs its own hint ladder — letting the library also volunteer hints would
 * hand out the shape for free and break the mode caps in writing.js.
 */
export function writerOptions(mode, { size = 300 } = {}) {
  const base = {
    width: size,
    height: size,
    padding: Math.round(size * 0.05),
    showCharacter: false,
    showOutline: true,
    showHintAfterMisses: false,
    highlightOnComplete: true,
    strokeAnimationSpeed: 1,
    delayBetweenStrokes: 150
  };

  switch (mode) {
    case 'free':
      return { ...base, showOutline: false, drawingWidth: 24 };
    case 'guided':
      return { ...base, showOutline: true, drawingWidth: 24 };
    default:
      return { ...base, showOutline: true, drawingWidth: 28 };
  }
}

/** Does this mode animate the character before the learner draws? */
export function demonstratesFirst(mode) {
  return mode === 'teach';
}

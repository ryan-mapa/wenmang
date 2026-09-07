// Progress in localStorage.
//
// Two card maps, not one. `cards` is keyed by the Chinese word and records
// whether you know what it means; `chars` is keyed by the single character and
// records whether you can write it. They are separate because they are separate
// skills — you can read 蝴蝶 comfortably and have no idea how to produce either
// character — and merging them would let reading progress quietly report itself
// as handwriting ability.
//
// Everything else follows Vocabulario: cards keyed by the word so learning 鱼
// counts whether you met it in Food or in Animals, days as local 'YYYY-MM-DD'
// strings, guards as an append-only log rather than a mutable flag.
//
// There is no sync layer yet. The shapes here are the ones a server would need
// — client-generated review ids, an append-only guard log, a fold-from-history
// card model — so adding one later is additive rather than a migration. What is
// missing is the worker, not the data model.

import { newCard } from './srs.js';
import { DEFAULT_SCRIPT, normalizeScript } from './script.js';
import { isMode } from './writing.js';

export const VERSION = 1;

const KEY = 'wenmang:v1';
const OUTBOX_KEY = 'wenmang:outbox';
const ROUND_OUTBOX_KEY = 'wenmang:rounds';

/**
 * How many unsent answers to keep. Reached only by playing offline for a very
 * long time; past it the oldest go, because a bounded loss of history beats
 * filling the origin's storage quota and losing the ability to save anything.
 */
const OUTBOX_LIMIT = 2000;

/**
 * Days of history to keep. Two years of `{ day: rounds }` is a few kilobytes,
 * and keeping it means the longest streak stays derivable rather than needing a
 * counter of its own to drift out of step.
 */
const DAY_LIMIT = 730;

/** Marks a payload as ours, so a stray clipboard paste fails with a real message. */
export const TRANSFER_FORMAT = 'wenmang/progress';

/**
 * The writing mode the learner has pinned, or AUTO_MODE for "follow each card".
 *
 * Auto is the default and is not one of the three writing modes: it means the
 * app picks per character from what that card has earned, which is the only
 * setting that walks somebody up the ladder on its own. Pinning a mode is a
 * deliberate act, so it has to be distinguishable from never having chosen —
 * storing 'teach' as the default made every new learner look like they had
 * chosen to trace forever.
 */
export const AUTO_MODE = 'auto';

const EMPTY = {
  cards: {},
  chars: {},
  days: {},
  guards: [],
  prefs: { script: DEFAULT_SCRIPT, mode: AUTO_MODE },
  syncedAt: 0
};

function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // private mode / blocked site data
  }
}

const number = (value, fallback) => (Number.isFinite(value) ? value : fallback);

function readCard(raw) {
  const base = newCard();
  if (!raw || typeof raw !== 'object') return base;
  return {
    box: number(raw.box, base.box),
    dueAt: number(raw.dueAt, base.dueAt),
    seen: number(raw.seen, base.seen),
    correct: number(raw.correct, base.correct),
    lastSeenAt: number(raw.lastSeenAt, base.lastSeenAt)
  };
}

function readCardMap(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return Object.fromEntries(Object.entries(raw).map(([key, card]) => [key, readCard(card)]));
}

/**
 * Manual streak-guard changes, oldest first. An append-only log rather than a
 * current-state field: a field is a thing two devices can disagree about, and a
 * log with client-made ids is not.
 */
function readGuards(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (event) =>
        event &&
        typeof event.id === 'string' &&
        typeof event.state === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(event.day)
    )
    .map(({ id, day, at, state, source }) => ({
      id,
      day,
      at: Number.isFinite(at) ? at : 0,
      state,
      source: source ?? 'manual'
    }));
}

/** `{ 'YYYY-MM-DD': roundsCompleted }`, trimmed to the most recent DAY_LIMIT. */
function readDays(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const clean = Object.entries(raw)
    .filter(([day, rounds]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(rounds))
    .map(([day, rounds]) => [day, Math.max(0, Math.round(rounds))])
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-DAY_LIMIT);
  return Object.fromEntries(clean);
}

/** Display preferences. Both are normalized on read, so a hand-edited or
 *  out-of-date value degrades to the default instead of breaking a render. */
function readPrefs(raw) {
  return {
    script: normalizeScript(raw?.script),
    // Anything unrecognised falls back to auto rather than to a writing mode:
    // a corrupt preference must not quietly pin someone to tracing forever.
    mode: isMode(raw?.mode) ? raw.mode : AUTO_MODE
  };
}

function readPayload(parsed) {
  return {
    cards: readCardMap(parsed?.cards),
    chars: readCardMap(parsed?.chars),
    days: readDays(parsed?.days),
    guards: readGuards(parsed?.guards),
    prefs: readPrefs(parsed?.prefs),
    syncedAt: number(parsed?.syncedAt, 0)
  };
}

function readKey(store, key) {
  try {
    const raw = store.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // absent, or a corrupt payload — either way, nothing to read
  }
}

export function load() {
  const store = storage();
  if (!store) return structuredClone(EMPTY);
  const current = readKey(store, KEY);
  return current ? readPayload(current) : structuredClone(EMPTY);
}

export function save(data) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(KEY, JSON.stringify({ version: VERSION, ...data }));
  } catch {
    // Out of quota or blocked — progress just won't persist.
  }
}

export const withCards = (data, cards) => ({ ...data, cards });
export const withChars = (data, chars) => ({ ...data, chars });
export const withDays = (data, days) => ({ ...data, days: readDays(days) });
export const withSyncedAt = (data, syncedAt) => ({ ...data, syncedAt: number(syncedAt, 0) });
export const withPrefs = (data, prefs) => ({ ...data, prefs: readPrefs({ ...data.prefs, ...prefs }) });

/** Add a guard change, or take in a merged set from elsewhere. */
export function withGuards(data, guards) {
  const byId = new Map(readGuards(guards).map((event) => [event.id, event]));
  return { ...data, guards: [...byId.values()] };
}

export function reset() {
  const store = storage();
  try {
    store?.removeItem(KEY);
    store?.removeItem(OUTBOX_KEY);
    store?.removeItem(ROUND_OUTBOX_KEY);
  } catch {
    /* nothing to clear */
  }
  return structuredClone(EMPTY);
}

/** A review id. Client-generated, so an upload retried after a dropped
 *  response can be ignored rather than counted twice once sync exists. */
export function newReviewId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Progress as text the learner can carry somewhere else. It exists because
 * localStorage is per-origin: moving this app to another address would
 * otherwise strand everyone's progress at the old one with no way to reach it.
 */
export function exportProgress(data) {
  return JSON.stringify(
    {
      format: TRANSFER_FORMAT,
      version: VERSION,
      exportedAt: Date.now(),
      cards: data.cards,
      chars: data.chars,
      days: data.days,
      guards: data.guards
    },
    null,
    2
  );
}

/**
 * Parse an exported payload. Throws rather than returning null: every way this
 * fails is something the person pasting can act on, so the message is the
 * useful part.
 */
export function parseProgress(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That is not valid progress data — check the whole code was copied.');
  }
  if (!parsed || parsed.format !== TRANSFER_FORMAT) {
    throw new Error('That code did not come from Wenmang.');
  }
  if (number(parsed.version, 0) > VERSION) {
    throw new Error('That code came from a newer version of Wenmang than this one.');
  }
  return readPayload(parsed);
}

/**
 * Answers waiting to reach the server. Written on every answer, signed in or
 * not: recording history from the start means somebody who signs in later
 * brings real history with them instead of only a snapshot.
 *
 * A queued review names its `kind` — 'word' or 'char' — because the two fold by
 * different rules on the server, and a character review carries the `mode` it
 * was made in, without which the mode caps could not be replayed.
 */
function readQueue(key) {
  const store = storage();
  if (!store) return [];
  const raw = readKey(store, key);
  return Array.isArray(raw) ? raw : [];
}

function writeQueue(key, entries) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(entries.slice(-OUTBOX_LIMIT)));
  } catch {
    // Quota or blocked storage. Play carries on; this just will not sync.
  }
}

const push = (key, entry) => writeQueue(key, [...readQueue(key), entry]);

/** Drop the entries the server confirmed, keeping anything added meanwhile. */
function drop(key, ids) {
  const done = new Set(ids);
  writeQueue(key, readQueue(key).filter((entry) => !done.has(entry.id)));
}

export const readOutbox = () => readQueue(OUTBOX_KEY);
export const queueReview = (entry) => push(OUTBOX_KEY, entry);
export const clearQueued = (ids) => drop(OUTBOX_KEY, ids);

/** Finished rounds waiting to reach the server. What the streak is built from. */
export const readRoundOutbox = () => readQueue(ROUND_OUTBOX_KEY);
export const queueRound = (entry) => push(ROUND_OUTBOX_KEY, entry);
export const clearQueuedRounds = (ids) => drop(ROUND_OUTBOX_KEY, ids);

/**
 * Local progress as import seeds, for a first sync from a browser that was
 * played before it had an account.
 *
 * Sent as snapshots rather than as invented reviews: the browser never recorded
 * how the progress was earned, and manufacturing a plausible history would be a
 * lie every statistic built on the log would then repeat.
 */
export function importSeeds(data) {
  return [
    ...Object.entries(data.cards).map(([item, card]) => ({ kind: 'word', item, ...card })),
    ...Object.entries(data.chars).map(([item, card]) => ({ kind: 'char', item, ...card }))
  ];
}

/** Local day counts, for that same first sync. */
export function dayHandover(data) {
  return Object.entries(data.days).map(([localDay, rounds]) => ({ localDay, rounds }));
}

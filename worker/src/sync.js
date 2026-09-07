// Progress sync. One request pushes what this device has done and pulls what
// every other device has, because doing both at once is what makes the merge
// safe: the reviews just uploaded are already in the log when the fold runs,
// so the cards coming back can never be behind what was sent.
//
// Nothing here resolves a conflict, because nothing here can produce one.
// `reviews` is an append-only set keyed by a client-generated id, so a retried
// upload is ignored rather than double-counted, and a card is a deterministic
// fold over that set. Two devices that have seen the same reviews compute the
// same card, whatever order the reviews arrived in.
//
// Two kinds of card travel through here. A word folds with the plain Leitner
// rule; a character folds with the mode caps reapplied, so a character somebody
// has only ever traced cannot come back from the server mastered. The two folds
// are the same code the browser runs, which is what keeps them from drifting.

import { foldReviews, newCard } from '../../source/srs.js';
import { foldCharacterReviews } from '../../source/writing.js';

export const SRS_VERSION = 1;

const MAX_REVIEWS = 500;
const MAX_IMPORTS = 2000;
const MAX_ROUNDS = 200;
const MAX_GUARDS = 200;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ITEM_LENGTH = 80;
const MAX_ID_LENGTH = 64;
const KINDS = new Set(['word', 'char']);

// SQLite allows 999 bound parameters; stay well under it and leave room for
// the user id and any other bindings sharing the statement.
const CHUNK = 80;

// A client clock running ahead would schedule an item beyond the point anyone
// would see it again. Small skew is normal and harmless, so only obvious
// nonsense is pulled back.
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

const chunk = (items, size = CHUNK) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

const finite = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);

const text = (value, max) =>
  typeof value === 'string' && value.length > 0 && value.length <= max ? value : null;

const kindOf = (value) => (KINDS.has(value) ? value : null);

/** Throws with a message worth returning to the client. */
function readReview(raw, now) {
  const id = text(raw?.id, MAX_ID_LENGTH);
  const item = text(raw?.item, MAX_ITEM_LENGTH);
  const kind = kindOf(raw?.kind);
  if (!id || !item || !kind) throw new Error('every review needs an id, a kind and an item');
  if (!Number.isFinite(raw.reviewedAt)) throw new Error(`review ${id} has no timestamp`);

  return {
    id,
    kind,
    item,
    deckId: text(raw.deckId, 40),
    stage: Number.isInteger(raw.stage) ? raw.stage : null,
    direction: text(raw.direction, 10),
    // Only meaningful for a character. A word review carrying one is harmless;
    // the word fold never reads it.
    mode: text(raw.mode, 10),
    correct: raw.correct ? 1 : 0,
    reviewedAt: Math.min(Math.round(raw.reviewedAt), now + FUTURE_TOLERANCE_MS)
  };
}

function readImport(raw) {
  const item = text(raw?.item, MAX_ITEM_LENGTH);
  const kind = kindOf(raw?.kind);
  if (!item || !kind) throw new Error('every imported item needs a kind and an item');
  return {
    kind,
    item,
    box: Math.max(0, Math.round(finite(raw.box))),
    dueAt: Math.max(0, Math.round(finite(raw.dueAt))),
    seen: Math.max(0, Math.round(finite(raw.seen))),
    correct: Math.max(0, Math.round(finite(raw.correct))),
    lastSeenAt: Math.max(0, Math.round(finite(raw.lastSeenAt)))
  };
}

/**
 * A finished round. `localDay` is the learner's own calendar date, stamped by
 * their browser and stored as an opaque string — the server never computes a
 * day from a timestamp, because its idea of "today" is not theirs.
 */
function readRound(raw, now) {
  const id = text(raw?.id, MAX_ID_LENGTH);
  const day = text(raw?.localDay, 10);
  if (!id) throw new Error('every round needs an id');
  if (!day || !DAY_PATTERN.test(day)) throw new Error(`round ${id} has no local day`);
  return {
    id,
    localDay: day,
    type: raw.type === 'characters' ? 'characters' : 'words',
    deckId: text(raw.deckId, 40) ?? 'quanbu',
    stages: text(raw.stages, 20) ?? '0',
    direction: text(raw.direction, 10) ?? 'mixed',
    asked: Math.max(0, Math.round(finite(raw.asked))),
    correct: Math.max(0, Math.round(finite(raw.correct))),
    startedAt: Math.round(finite(raw.startedAt, now)),
    endedAt: Math.round(finite(raw.endedAt, now))
  };
}

/** A manual guard change. `state` is opaque text, so a new one costs nothing. */
function readGuard(raw) {
  const id = text(raw?.id, MAX_ID_LENGTH);
  const day = text(raw?.day, 10);
  const state = text(raw?.state, 20);
  if (!id || !state) throw new Error('every guard change needs an id and a state');
  if (!day || !DAY_PATTERN.test(day)) throw new Error(`guard ${id} has no day`);
  return {
    id,
    day,
    at: Math.round(finite(raw.at)),
    state,
    source: text(raw.source, 10) ?? 'manual'
  };
}

/** A day count handed over on a first sync, from a browser played signed out. */
function readDay(raw) {
  const day = text(raw?.localDay, 10);
  if (!day || !DAY_PATTERN.test(day)) throw new Error('every day needs a date');
  return { localDay: day, rounds: Math.max(0, Math.round(finite(raw.rounds))) };
}

/** History rows for the named items of one kind, keyed by item. */
async function historyOf(db, userId, kind, items) {
  const byItem = new Map(items.map((item) => [item, []]));

  for (const group of chunk(items)) {
    const holes = group.map(() => '?').join(',');
    const { results } = await db
      .prepare(
        `SELECT item, id, correct, mode, reviewed_at FROM reviews
         WHERE user_id = ? AND kind = ? AND item IN (${holes})`
      )
      .bind(userId, kind, ...group)
      .all();

    for (const row of results) {
      byItem.get(row.item).push({
        id: row.id,
        correct: row.correct,
        success: Boolean(row.correct),
        mode: row.mode,
        reviewedAt: row.reviewed_at
      });
    }
  }
  return byItem;
}

/**
 * Starting cards: a snapshot imported from a browser that had progress before
 * it had an account, or a fresh card. Imports are a seed and not history — the
 * browser never recorded how that progress was earned, and inventing reviews to
 * match would be a lie the statistics would repeat.
 */
async function seedsOf(db, userId, kind, items) {
  const seeds = new Map();

  for (const group of chunk(items)) {
    const holes = group.map(() => '?').join(',');
    const { results } = await db
      .prepare(
        `SELECT item, box, due_at, seen, correct, last_seen_at FROM imports
         WHERE user_id = ? AND kind = ? AND item IN (${holes})`
      )
      .bind(userId, kind, ...group)
      .all();

    for (const row of results) {
      seeds.set(row.item, {
        box: row.box,
        dueAt: row.due_at,
        seen: row.seen,
        correct: row.correct,
        lastSeenAt: row.last_seen_at
      });
    }
  }
  return seeds;
}

async function refold(db, userId, kind, items, now) {
  if (items.length === 0) return;

  const [history, seeds] = await Promise.all([
    historyOf(db, userId, kind, items),
    seedsOf(db, userId, kind, items)
  ]);

  // The one place the two kinds part company.
  const fold = kind === 'char' ? foldCharacterReviews : foldReviews;

  const upserts = items.map((item) => {
    const card = fold(history.get(item) ?? [], seeds.get(item) ?? newCard());
    return db
      .prepare(
        `INSERT INTO cards
           (user_id, kind, item, box, due_at, seen, correct, last_seen_at, srs_version, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, kind, item) DO UPDATE SET
           box = excluded.box, due_at = excluded.due_at, seen = excluded.seen,
           correct = excluded.correct, last_seen_at = excluded.last_seen_at,
           srs_version = excluded.srs_version, updated_at = excluded.updated_at`
      )
      .bind(
        userId, kind, item, card.box, card.dueAt, card.seen, card.correct,
        card.lastSeenAt, SRS_VERSION, now
      );
  });

  for (const group of chunk(upserts, 40)) await db.batch(group);
}

/**
 * POST /sync — push this device's answers, pull everyone's cards.
 *
 * `since` is the client's last sync time; 0 asks for everything, which is what
 * a browser signing in on a new device sends.
 */
export async function sync(request, env, user) {
  let body;
  try {
    body = await request.json();
  } catch {
    return { status: 400, data: { error: 'malformed body' } };
  }

  const now = Date.now();
  const since = Math.max(0, finite(body.since));
  const rawReviews = Array.isArray(body.reviews) ? body.reviews : [];
  const rawImports = Array.isArray(body.imports) ? body.imports : [];
  const rawRounds = Array.isArray(body.rounds) ? body.rounds : [];
  const rawDays = Array.isArray(body.days) ? body.days : [];
  const rawGuards = Array.isArray(body.guards) ? body.guards : [];

  if (rawReviews.length > MAX_REVIEWS) {
    return { status: 413, data: { error: `send at most ${MAX_REVIEWS} reviews at a time` } };
  }
  if (rawImports.length > MAX_IMPORTS) {
    return { status: 413, data: { error: `send at most ${MAX_IMPORTS} items at a time` } };
  }
  if (rawRounds.length > MAX_ROUNDS) {
    return { status: 413, data: { error: `send at most ${MAX_ROUNDS} rounds at a time` } };
  }

  let reviews;
  let imports;
  let rounds;
  let days;
  let guards;
  try {
    reviews = rawReviews.map((raw) => readReview(raw, now));
    imports = rawImports.map(readImport);
    rounds = rawRounds.map((raw) => readRound(raw, now));
    days = rawDays.map(readDay);
    guards = rawGuards.slice(0, MAX_GUARDS).map(readGuard);
  } catch (error) {
    return { status: 400, data: { error: error.message } };
  }

  // INSERT OR IGNORE throughout: re-sending is how a client recovers from a
  // dropped response, and it has to be free of consequences.
  const writes = [
    ...reviews.map((entry) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO reviews
           (id, user_id, kind, item, deck_id, stage, direction, mode, correct,
            reviewed_at, received_at, source, srs_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'review', ?)`
      ).bind(
        entry.id, user.sub, entry.kind, entry.item, entry.deckId, entry.stage,
        entry.direction, entry.mode, entry.correct, entry.reviewedAt, now, SRS_VERSION
      )
    ),
    ...rounds.map((entry) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO rounds
           (id, user_id, type, deck_id, stages, direction, asked, correct,
            started_at, ended_at, local_day)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        entry.id, user.sub, entry.type, entry.deckId, entry.stages, entry.direction,
        entry.asked, entry.correct, entry.startedAt, entry.endedAt, entry.localDay
      )
    ),
    ...guards.map((entry) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO guards (id, user_id, day, at, state, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(entry.id, user.sub, entry.day, entry.at, entry.state, entry.source, now)
    ),
    ...imports.map((entry) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO imports
           (user_id, kind, item, box, due_at, seen, correct, last_seen_at, imported_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        user.sub, entry.kind, entry.item, entry.box, entry.dueAt,
        entry.seen, entry.correct, entry.lastSeenAt, now
      )
    )
  ];
  for (const group of chunk(writes, 40)) await env.DB.batch(group);

  // Only items can need re-folding. Rounds, day counts and guard changes touch
  // no card. Each kind is folded with its own rule.
  for (const kind of ['word', 'char']) {
    const touched = [...new Set([
      ...reviews.filter((entry) => entry.kind === kind).map((entry) => entry.item),
      ...imports.filter((entry) => entry.kind === kind).map((entry) => entry.item)
    ])];
    await refold(env.DB, user.sub, kind, touched, now);
  }

  // A first sync hands over day counts earned before there was an account.
  // Those days have no rounds behind them, so each is recorded as placeholder
  // rows — one per round — which keeps the daily count a single GROUP BY over
  // one table rather than two sources to reconcile.
  //
  // The ids are derived from the day and the index, so re-sending the same
  // handover inserts nothing new. No guard needed: idempotence is a property
  // of the id, the same way it is for reviews.
  if (days.length > 0) {
    const placeholders = days.flatMap((day) =>
      Array.from({ length: Math.min(day.rounds, 50) }, (_, i) =>
        env.DB.prepare(
          `INSERT OR IGNORE INTO rounds
             (id, user_id, type, deck_id, stages, direction, asked, correct,
              started_at, ended_at, local_day)
           VALUES (?, ?, 'words', 'quanbu', '0', 'mixed', 0, 0, ?, ?, ?)`
        ).bind(`import:${day.localDay}:${i}`, user.sub, now, now, day.localDay)
      )
    );
    for (const group of chunk(placeholders, 40)) await env.DB.batch(group);
  }

  await env.DB.prepare('UPDATE profiles SET synced_at = ? WHERE user_id = ?')
    .bind(now, user.sub).run();

  // Everything that changed since the client last looked. The refold above
  // stamped `updated_at = now` on the pushed items, so they come back too —
  // which is how the client learns what another device already knew.
  const { results: changed } = await env.DB.prepare(
    `SELECT kind, item, box, due_at, seen, correct, last_seen_at FROM cards
     WHERE user_id = ? AND updated_at > ?`
  ).bind(user.sub, since).all();

  const cards = {};
  const chars = {};
  for (const row of changed) {
    (row.kind === 'char' ? chars : cards)[row.item] = {
      box: row.box,
      dueAt: row.due_at,
      seen: row.seen,
      correct: row.correct,
      lastSeenAt: row.last_seen_at
    };
  }

  // Every device's rounds, counted per local day. The streak itself is derived
  // in the client from these — there is no counter here to fall out of step.
  const { results: dayRows } = await env.DB.prepare(
    `SELECT local_day, COUNT(*) AS rounds FROM rounds
     WHERE user_id = ? AND local_day IS NOT NULL
     GROUP BY local_day`
  ).bind(user.sub).all();

  const dayCounts = {};
  for (const row of dayRows) dayCounts[row.local_day] = row.rounds;

  // The whole log comes back every time. It is a handful of rows even after
  // years, and a set union is only conflict-free if both sides can see all of
  // it — an incremental slice would let one device fold a different history.
  const { results: guardRows } = await env.DB.prepare(
    'SELECT id, day, at, state, source FROM guards WHERE user_id = ? ORDER BY day, at, id'
  ).bind(user.sub).all();

  return {
    status: 200,
    data: {
      serverTime: now,
      accepted: reviews.map((entry) => entry.id),
      acceptedRounds: rounds.map((entry) => entry.id),
      cards,
      chars,
      days: dayCounts,
      guards: guardRows
    }
  };
}

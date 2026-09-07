// Leitner-style scheduling on a real clock. Each item sits in a box; higher
// boxes come back less often. A wrong answer knocks it all the way back to
// box 0.
//
// Intervals are durations, not question counts: a counter that restarts every
// round never actually schedules anything past the end of the round. The first
// two intervals are short enough that a new or missed item comes back within
// the same sitting — the "learning steps" — and the rest are the real spacing.
//
// One difference from a vocabulary-only app: this module schedules two kinds of
// card. A *word* card tracks whether you know what 苹果 means; a *character*
// card tracks whether you can write 苹 from memory. They are genuinely separate
// skills — recognising a character in context is much easier than producing it
// on a blank pad — so they get separate cards, separate boxes, and separate due
// dates. Nothing here knows which kind it is holding, which is the point:
// `selectNext` takes a `keyOf` rather than reaching for a fixed field.

export const BOX_COUNT = 5;

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

/** How long an item in each box waits before it is due again. */
const INTERVALS = [MINUTE, 10 * MINUTE, DAY, 4 * DAY, 14 * DAY];

/**
 * How far past due a card may count as, in multiples of its own interval.
 * Capped because an item untouched for a year is not a thousand times more
 * urgent than one untouched for a day, and without a cap a single long absence
 * would pin the same handful of items to the top of every round.
 */
const MAX_LATENESS = 4;

export function newCard() {
  return { box: 0, dueAt: 0, seen: 0, correct: 0, lastSeenAt: 0 };
}

export function intervalFor(box) {
  return INTERVALS[Math.min(box, INTERVALS.length - 1)];
}

/**
 * Advance a card after an answer.
 * @param {object} card  current card state
 * @param {boolean} wasCorrect
 * @param {number} now  epoch milliseconds the answer happened at
 */
export function review(card, wasCorrect, now) {
  const box = wasCorrect ? Math.min(card.box + 1, BOX_COUNT - 1) : 0;
  return {
    box,
    dueAt: now + intervalFor(box),
    seen: card.seen + 1,
    correct: card.correct + (wasCorrect ? 1 : 0),
    lastSeenAt: now
  };
}

/** An item counts as mastered once it reaches the top box. */
export function isMastered(card) {
  return card.box >= BOX_COUNT - 1;
}

/** 0..1 across a whole set, weighting each item by how far it has climbed. */
export function masteryOf(cards) {
  if (cards.length === 0) return 0;
  const total = cards.reduce((sum, card) => sum + card.box, 0);
  return total / (cards.length * (BOX_COUNT - 1));
}

/**
 * Rebuild a card from its whole history, starting from `seed`.
 *
 * Deterministic regardless of arrival order — reviews are sorted before
 * folding, and the tiebreak on `id` is not decoration: two devices can answer
 * in the same millisecond, and without it they would fold the same history into
 * different cards. Pure, so a server and a browser running this code cannot
 * drift about what a history means.
 */
export function foldReviews(reviews, seed = newCard()) {
  const ordered = [...reviews].sort(
    (a, b) => a.reviewedAt - b.reviewedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
  return ordered.reduce((card, entry) => review(card, Boolean(entry.correct), entry.reviewedAt), seed);
}

export function isDue(card, now) {
  return card.dueAt <= now;
}

/**
 * Lateness relative to the card's own interval, so a box-0 item an hour late
 * and a box-4 item a month late compare on the same scale. Negative for a card
 * that is not due yet, and never below -1, since a card is scheduled exactly
 * one interval ahead.
 */
function lateness(card, now) {
  return Math.min((now - card.dueAt) / intervalFor(card.box), MAX_LATENESS);
}

/**
 * Pick the next item to ask. Only due items are in play; when nothing is due
 * the whole list is, so someone keen to keep going is never turned away — they
 * just get the items closest to coming up.
 *
 * `keyOf` maps an item to its card key, because this runs over both word
 * objects and bare character strings. `avoid` keeps the same item from
 * appearing twice in a row.
 */
export function selectNext(items, cards, now, options = {}) {
  const { avoid = null, random = Math.random, keyOf = (item) => item } = options;

  const candidates = items.filter((item) => keyOf(item) !== avoid);
  const eligible = candidates.length > 0 ? candidates : items;
  if (eligible.length === 0) return null;

  const cardFor = (item) => cards[keyOf(item)] ?? newCard();
  const due = eligible.filter((item) => isDue(cardFor(item), now));
  const pool = due.length > 0 ? due : eligible;

  let best = [];
  let bestScore = -Infinity;
  for (const item of pool) {
    const card = cardFor(item);
    // Most overdue first, then the lower boxes; the jitter breaks up rigid
    // cycling through items that would otherwise always tie.
    const score = lateness(card, now) * 2 - card.box + random() * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = [item];
    } else if (score === bestScore) {
      best.push(item);
    }
  }
  return best[Math.floor(random() * best.length)];
}

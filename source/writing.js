// Handwriting practice: the three modes, the hint ladder, and how an attempt
// on the pad turns into a scheduling decision.
//
// The modes are a ladder from "shown everything" to "shown nothing":
//
//   teach    the character animates stroke by stroke and the learner traces it,
//            with the next stroke's path visible and its start point marked.
//   guided   the outline stays on the pad but nothing guides the hand. You know
//            what you are drawing; you have to produce every stroke yourself.
//   free     a blank pad and the meaning. Nothing to copy.
//
// The rule that makes this more than three difficulty settings: **a character
// cannot reach the top box from anything but `free`.** Tracing a shape you can
// see is a different skill from producing one you cannot, and a system that let
// tracing count as mastery would report fluency nobody has. So each mode caps
// how far a success can promote a card, and the cap — not the learner's
// self-assessment — is what makes the top box mean "I can write this".
//
// The learner may still pick any mode at any time. Choosing `teach` on a
// character you already know is not cheating, it is reviewing; it just will not
// move the card past the learning steps.

import { newCard, intervalFor, BOX_COUNT } from './srs.js';

export const MODES = ['teach', 'guided', 'free'];

export const MODE_LABELS = {
  teach: 'Teach & trace',
  guided: 'Outline only',
  free: 'Blank pad'
};

export const MODE_DESCRIPTIONS = {
  teach: 'Watch the stroke order, then trace it',
  guided: 'The shape is shown; you write every stroke',
  free: 'Nothing shown — write it from memory'
};

/** The highest box a success in each mode may reach. */
const MODE_BOX_CAP = {
  teach: 1,
  guided: BOX_COUNT - 2,
  free: BOX_COUNT - 1
};

/** Wrong strokes forgiven before an attempt stops counting as a success. */
export const MISTAKE_ALLOWANCE = 2;

/** Hints taken before an attempt stops counting as a success. */
export const HINT_ALLOWANCE = 1;

export function isMode(mode) {
  return MODES.includes(mode);
}

export function normalizeMode(mode) {
  return isMode(mode) ? mode : 'teach';
}

/**
 * The mode a card is ready for, which is what the app opens on unless the
 * learner has chosen otherwise. Boxes 0–1 are still learning the shape, 2–3 are
 * consolidating it, and the top box is only ever earned on a blank pad.
 */
export function suggestedMode(card = newCard()) {
  if (card.box <= 1) return 'teach';
  if (card.box < BOX_COUNT - 1) return 'guided';
  return 'free';
}

/** Fresh state for one attempt at one character. */
export function newAttempt(char, mode = 'teach') {
  return {
    char,
    mode: normalizeMode(mode),
    mistakes: 0,
    hintsUsed: 0,
    strokesDrawn: 0,
    complete: false
  };
}

export function recordStroke(attempt, wasCorrect, totalStrokes) {
  const strokesDrawn = attempt.strokesDrawn + (wasCorrect ? 1 : 0);
  return {
    ...attempt,
    mistakes: attempt.mistakes + (wasCorrect ? 0 : 1),
    strokesDrawn,
    complete: Boolean(totalStrokes) && strokesDrawn >= totalStrokes
  };
}

export function takeHint(attempt) {
  return { ...attempt, hintsUsed: attempt.hintsUsed + 1 };
}

/**
 * Did this attempt count as knowing the character?
 *
 * Completion alone is not enough: with unlimited hints and unlimited wrong
 * strokes every attempt completes eventually, and a scheduler fed nothing but
 * successes stops scheduling anything usefully.
 */
export function isSuccess(attempt) {
  return (
    attempt.complete &&
    attempt.mistakes <= MISTAKE_ALLOWANCE &&
    attempt.hintsUsed <= HINT_ALLOWANCE
  );
}

/**
 * Advance a character card by one result.
 *
 * This is `srs.review` with the mode cap applied, and the cap is applied
 * *before* the interval is chosen rather than after — a card clamped to box 1
 * must come back on box 1's schedule, or it would sit unseen for two weeks
 * while claiming to be barely learned.
 *
 * Takes the outcome rather than the attempt, because history replayed from a
 * server has only the outcome: what a device uploads is "this mode, this
 * result", not the stroke-by-stroke record of how it went.
 */
export function applyResult(card, { mode, success }, now) {
  const cap = MODE_BOX_CAP[normalizeMode(mode)];
  const box = success ? Math.min(card.box + 1, cap) : 0;

  return {
    box,
    dueAt: now + intervalFor(box),
    seen: card.seen + 1,
    correct: card.correct + (success ? 1 : 0),
    lastSeenAt: now
  };
}

/** Fold a finished attempt on the pad into a character card. */
export function reviewCharacter(card, attempt, now) {
  return applyResult(card, { mode: attempt.mode, success: isSuccess(attempt) }, now);
}

/**
 * Rebuild a character card from its whole history.
 *
 * The counterpart of `srs.foldReviews`, and it exists separately for one
 * reason: a character's box depends on the *mode* each attempt was made in, so
 * replaying its history means replaying the caps too. Folding character history
 * with the plain word fold would quietly promote a character somebody has only
 * ever traced, which is the one thing the caps exist to prevent.
 *
 * Same two properties as the word fold, for the same reason — deterministic
 * regardless of arrival order, and pure, so a server and a browser cannot drift
 * about what a history means.
 */
export function foldCharacterReviews(entries, seed = newCard()) {
  const ordered = [...entries].sort(
    (a, b) => a.reviewedAt - b.reviewedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
  return ordered.reduce(
    (card, entry) =>
      applyResult(card, { mode: entry.mode, success: Boolean(entry.success) }, entry.reviewedAt),
    seed
  );
}

/**
 * Why a card is not advancing, for the lesson screen to explain itself.
 * Null when the current mode can still promote it.
 */
export function capExplanation(card, mode) {
  const cap = MODE_BOX_CAP[normalizeMode(mode)];
  if (card.box < cap) return null;
  if (mode === 'free') return null;
  return mode === 'teach'
    ? 'Tracing keeps this fresh, but the outline has to come off to go further.'
    : 'Write it on a blank pad to master it.';
}

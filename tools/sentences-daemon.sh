#!/bin/bash
# Keeps generating example sentences until every targeted word has one, then
# stops.
#
#   nohup bash tools/sentences-daemon.sh shiwu 0 > /dev/null 2>&1 &
#   nohup bash tools/sentences-daemon.sh > /dev/null 2>&1 &        # everything
#
# Unlike the audio daemon this one does cost money — it calls the Anthropic API
# with the key in .gen.env. What it does not cost is *your session*: it runs
# detached, so generating a deck is not something you sit and watch.
#
# Progress goes to /tmp/wenmang-sentences.status, one short line per pass, so
# checking on it is cheap. Full output goes to /tmp/wenmang-sentences.log.

cd "$(dirname "$0")/.." || exit 1

DECK="${1:-}"
STAGE="${2:-}"
STATUS=/tmp/wenmang-sentences.status
LOG=/tmp/wenmang-sentences.log
DEADLINE=$(( $(date +%s) + 4 * 3600 ))

ARGS=()
[ -n "$DECK" ] && ARGS+=(--deck "$DECK")
[ -n "$STAGE" ] && ARGS+=(--stage "$STAGE")
SCOPE="${DECK:-all decks}${STAGE:+ stage $STAGE}"

# How many targeted words still have no sentence. Read from the same modules the
# generator uses, so the daemon and the tool cannot disagree about "done".
remaining() {
  node --input-type=module -e "
import { DECKS } from './source/vocab.js';
import { SENTENCES } from './source/sentences.js';
const deck = process.env.D || '';
const stage = process.env.S === '' ? null : Number(process.env.S);
const decks = deck ? DECKS.filter(d => d.id === deck) : DECKS;
const words = decks.flatMap(d => (stage === null ? d.stages : [d.stages[stage] ?? []]).flat());
const seen = new Set();
const left = words.filter(w => {
  if (seen.has(w.zh)) return false;
  seen.add(w.zh);
  return !SENTENCES[w.zh];
});
process.stdout.write(String(left.length));
" 2>/dev/null
}

export D="$DECK" S="$STAGE"

echo "$(date +%H:%M) daemon started — $SCOPE — $(remaining) without sentences" > "$STATUS"

while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  before=$(remaining)

  if [ "$before" = "0" ]; then
    echo "$(date +%H:%M) all written — $SCOPE complete" >> "$STATUS"
    exit 0
  fi

  node tools/sentences.mjs "${ARGS[@]}" >> "$LOG" 2>&1
  after=$(remaining)
  echo "$(date +%H:%M) pass done — $after without sentences (was $before)" >> "$STATUS"

  # No progress twice running means the model is refusing this batch, the key is
  # wrong, or every candidate is failing validation. Back off rather than spend
  # money spinning through the same rejection.
  if [ "$after" = "$before" ]; then
    echo "$(date +%H:%M) no progress; stopping — see $LOG" >> "$STATUS"
    exit 1
  fi
done

echo "$(date +%H:%M) daemon finished its 4-hour window — $(remaining) left" >> "$STATUS"

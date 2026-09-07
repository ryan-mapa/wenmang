#!/bin/bash
# Keeps generating pronunciation clips until every targeted word has all four
# voices, then stops.
#
#   nohup bash tools/audio-daemon.sh shiwu 0 > /dev/null 2>&1 &
#   nohup bash tools/audio-daemon.sh > /dev/null 2>&1 &          # everything
#
# Costs no model usage — it is Azure and a shell loop. The point is to clear the
# TTS bottleneck while nothing else is running, so that resuming other work is
# not gated on a second or two per clip.
#
# Progress goes to /tmp/wenmang-audio.status, one short line per pass, so
# checking on it is cheap. Full output goes to /tmp/wenmang-audio.log.
#
# Safe to run twice: tts.mjs skips clips that already exist, so a second daemon
# would duplicate effort but not damage anything.

cd "$(dirname "$0")/.." || exit 1

DECK="${1:-}"
STAGE="${2:-}"
STATUS=/tmp/wenmang-audio.status
LOG=/tmp/wenmang-audio.log
DEADLINE=$(( $(date +%s) + 8 * 3600 ))

ARGS=()
[ -n "$DECK" ] && ARGS+=(--deck "$DECK")
[ -n "$STAGE" ] && ARGS+=(--stage "$STAGE")
SCOPE="${DECK:-all decks}${STAGE:+ stage $STAGE}"

# How many targeted words are still missing at least one voice. Asked of the
# same modules the generator uses, so the daemon and the tool cannot disagree
# about what "done" means.
remaining() {
  node --input-type=module -e "
import { DECKS } from './source/vocab.js';
import { audioSlug, VOICE_COUNT } from './source/audio.js';
import { existsSync } from 'node:fs';
const deck = process.env.D || '';
const stage = process.env.S === '' ? null : Number(process.env.S);
const decks = deck ? DECKS.filter(d => d.id === deck) : DECKS;
const words = decks.flatMap(d => (stage === null ? d.stages : [d.stages[stage] ?? []]).flat());
const seen = new Set();
const left = words.filter(w => {
  if (seen.has(w.zh)) return false;
  seen.add(w.zh);
  return ![...Array(VOICE_COUNT).keys()].every(v => existsSync(\`audio/\${v+1}/\${audioSlug(w.zh)}.mp3\`));
});
process.stdout.write(String(left.length));
" 2>/dev/null
}

export D="$DECK" S="$STAGE"

echo "$(date +%H:%M) daemon started — $SCOPE — $(remaining) words unvoiced" > "$STATUS"

while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  before=$(remaining)

  if [ "$before" = "0" ]; then
    node tools/tts.mjs --manifest >> "$LOG" 2>&1
    echo "$(date +%H:%M) all voiced — $SCOPE complete" >> "$STATUS"
    exit 0
  fi

  node tools/tts.mjs "${ARGS[@]}" >> "$LOG" 2>&1
  after=$(remaining)
  echo "$(date +%H:%M) pass done — $after unvoiced (was $before)" >> "$STATUS"

  # No progress twice running means something is wrong — a bad key, a quota, a
  # word the provider refuses. Back off rather than spin through the same
  # failure a thousand times.
  if [ "$after" = "$before" ]; then
    echo "$(date +%H:%M) no progress; backing off 15m — see $LOG" >> "$STATUS"
    sleep 900
  fi
done

echo "$(date +%H:%M) daemon finished its 8-hour window — $(remaining) unvoiced" >> "$STATUS"

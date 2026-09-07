#!/bin/bash
# Uploads the clips to R2, skipping what is already there.
#
#   bash tools/r2-upload.sh          upload everything missing
#   bash tools/r2-upload.sh --check  just report what is missing
#
# Every wrangler r2 call needs --remote. Without it wrangler writes to a LOCAL
# simulator and reports "Upload complete" for objects that never leave the
# machine, which is exactly as convincing as a real upload and completely wrong.
#
# Resumable: it records what it has sent, so an interrupted run costs nothing to
# repeat. wrangler sends one object per invocation, so this runs several in
# parallel — too many and the API rate-limits.

cd "$(dirname "$0")/.." || exit 1
BUCKET=wenmang-audio
PARALLEL=${PARALLEL:-4}   # Vocabulario found 8 drove failures from 3% to 16% under
             # throttling. Overridable because a failure here is cheap — the
             # ledger means a re-run retries only what did not land — so a bulk
             # first upload can trade a worse failure rate for wall time.
STATUS=/tmp/wenmang-r2.status

# wrangler 4 has no `r2 object list`, so progress is tracked in a local ledger
# of keys confirmed uploaded — one empty marker file per key, see upload().
# Delete the directory to force a full re-upload.
MARKS=/tmp/wenmang-r2-marks
FAILS=/tmp/wenmang-r2-fails
mkdir -p "$MARKS" "$FAILS"
rm -rf "${FAILS:?}"/*
ls "$MARKS" | tr '_' '/' | sort > /tmp/wenmang-r2-have.txt
HAVE=$(wc -l < /tmp/wenmang-r2-have.txt | tr -d ' ')

find audio -name '*.mp3' | sort > /tmp/wenmang-r2-want.txt
WANT=$(wc -l < /tmp/wenmang-r2-want.txt | tr -d ' ')
comm -23 /tmp/wenmang-r2-want.txt /tmp/wenmang-r2-have.txt > /tmp/wenmang-r2-todo.txt
TODO=$(wc -l < /tmp/wenmang-r2-todo.txt | tr -d ' ')

echo "$(date +%H:%M) bucket has $HAVE, repo has $WANT, to upload: $TODO" | tee "$STATUS"
[ "$1" = "--check" ] && exit 0
[ "$TODO" = "0" ] && { echo "nothing to do"; exit 0; }

export BUCKET MARKS FAILS
# Each worker records its result by CREATING A FILE, not by appending a line.
# Parallel `echo >> ledger` from N workers interleaves: at PARALLEL=8 this
# ledger came back with lines like `audio/1/8eab-4efd.maudio/2/7f16-7a0b.mp3`,
# and paths recorded as BOTH done and failed. A corrupt ledger is worse than no
# ledger, because it silently reports clips as uploaded that never were. One
# empty file per key cannot interleave with anything.
upload() {
  local mark=${1//\//_}
  if npx wrangler r2 object put "$BUCKET/$1" --file "$1" --content-type audio/mpeg --remote >/dev/null 2>&1; then
    : > "$MARKS/$mark"
  else
    : > "$FAILS/$mark"
  fi
}
export -f upload

xargs -P "$PARALLEL" -I{} bash -c 'upload "$@"' _ {} < /tmp/wenmang-r2-todo.txt

FAILED=$(ls "$FAILS" | wc -l | tr -d ' ')
HAVE=$(ls "$MARKS" | wc -l | tr -d ' ')
echo "$(date +%H:%M) done — bucket has $HAVE, $FAILED failures (re-run to retry them)" | tee -a "$STATUS"

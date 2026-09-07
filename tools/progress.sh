#!/bin/bash
# Where the two long-running generation jobs have got to.
#
#   bash tools/progress.sh
#
# Cheap to run and safe at any time — it reads the same modules the generators
# do, so it cannot disagree with them about what is done. The point is that
# resuming after a break costs one command rather than an investigation.

cd "$(dirname "$0")/.." || exit 1

node --input-type=module -e "
import { DECKS } from './source/vocab.js';
import { SENTENCES } from './source/sentences.js';
import { audioSlug, VOICE_COUNT } from './source/audio.js';
import { existsSync } from 'node:fs';

const words = [...new Map(DECKS.flatMap(d => d.stages.flat()).map(w => [w.zh, w])).values()];
const voiced = w => [...Array(VOICE_COUNT).keys()].every(v => existsSync('audio/'+(v+1)+'/'+audioSlug(w.zh)+'.mp3'));

const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const av = words.filter(voiced).length;
const se = words.filter(w => SENTENCES[w.zh]).length;

console.log('audio     ' + av + '/' + words.length + '  (' + pct(av, words.length) + '%)');
console.log('sentences ' + se + '/' + words.length + '  (' + pct(se, words.length) + '%)');
console.log('');
console.log('deck'.padEnd(13) + 'audio'.padStart(9) + 'sentences'.padStart(12));
for (const d of DECKS) {
  const ws = [...new Map(d.stages.flat().map(w => [w.zh, w])).values()];
  const a = ws.filter(voiced).length;
  const s = ws.filter(w => SENTENCES[w.zh]).length;
  const mark = (n) => n === ws.length ? 'done' : n + '/' + ws.length;
  console.log(d.id.padEnd(13) + mark(a).padStart(9) + mark(s).padStart(12));
}
"

echo ''
echo "audio daemon:  $(tail -1 /tmp/wenmang-audio.status 2>/dev/null || echo 'not running')"

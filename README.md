# 文盲 Wenmang

A Mandarin vocabulary game that turns into a handwriting trainer. Words first,
in multiple choice with Leitner-box spaced repetition; then the characters
inside the words you have mastered, drawn stroke by stroke on a 米字格 pad.

The name means *illiterate* — literally "writing-blind". It is meant as a joke
about where you start. Worth knowing that in Chinese it is a blunt word, used
seriously and sometimes as an insult, so a native speaker may read it harder
than an English-speaking learner will.

## Run it

No build step — ES modules straight from the filesystem:

```sh
npm install
npm run serve      # http://localhost:8000
npm test           # 125 tests
```

## How it works

**Words.** Rounds of 20 multiple-choice questions over four decks. Distractors
come from the same deck, so a question is a real test rather than a reading
exercise. A card climbs a box on a right answer and falls to the bottom on a
wrong one, with intervals in real time rather than question counts.

**Script.** One toggle cycles characters → pinyin → both. The default is
characters alone, deliberately: pinyin shown beside a character gets read
*instead of* it, and the round teaches you nothing you did not already know.

**Characters unlock from words.** A character becomes available to write once
you have mastered a word containing it. Producing 苹 from a blank pad is a
memory task with nothing to hold on to unless 苹果 already means apple to you.

**Writing has three modes**, and one rule that matters:

| Mode | Pad shows | Can promote a card to |
|---|---|---|
| Teach & trace | outline, animated stroke order, per-stroke guides | box 1 |
| Outline only | outline | box 3 |
| Blank pad | nothing | box 4 — mastered |

**A character cannot reach the top box from anything but a blank pad.** Tracing
a shape you can see is a different skill from producing one you cannot, and a
system that let tracing count as mastery would report fluency nobody has. The
default setting follows each card up that ladder on its own; pinning a mode is
possible any time and is not cheating, it just will not move a card past the
mode's cap.

**Hints give structure before shape.** The ladder is stroke count → the radical
and what it means → the outline → the next stroke. This is the Wubi insight
without Wubi's data: told "this is a 女 character with six strokes", most people
recover the rest themselves and have learned something reusable when they do.
Being shown the next stroke teaches only that stroke. One hint is free; past
that the attempt stops counting as a success.

**Daily goal.** Five rounds, of either kind — a day spent entirely on
handwriting is as complete as one spent entirely on meanings. Streaks forgive
three missed days and can be held manually for a holiday.

## Layout

```
source/
  vocab.js          the decks — 159 words, four categories, Basics stage
  character-data.js GENERATED radical and stroke counts (tools/build-characters.mjs)
  radicals.js       the 214 Kangxi radicals, forms and glosses
  characters.js     which characters are unlocked, and in what teaching order
  writing.js        the three modes, the hint ladder, the mastery cap
  strokes.js        the ONLY module that knows where stroke geometry comes from
  srs.js            Leitner scheduling, for word cards and character cards alike
  quiz.js           multiple-choice construction
  rounds.js         round composition for both kinds
  stages.js         stage gating within a deck
  goals.js          the daily goal and the streak
  script.js         characters / pinyin / both
  storage.js        localStorage, with word and character progress kept apart
```

Every rule lives in `source/` and is tested without a browser. `main.js` is
screen wiring only.

## Regenerating character data

```sh
curl -O https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
unzip -d /tmp/unihan Unihan.zip
node tools/build-characters.mjs /tmp/unihan
```

## Licensing

See [NOTICE](NOTICE). Short version: the code and the vocabulary are original;
stroke geometry is Arphic-licensed data fetched at runtime and never vendored,
which keeps the redistribution obligations off this repository; radical data is
from Unihan under the Unicode License. `source/strokes.js` is the only module
that touches the stroke data, so the source can be swapped in one file.

## Not done yet

- **Audio.** Deliberately deferred. Word records already carry pinyin, so adding
  voices is additive rather than a migration.
- **Vocabulary depth.** Only the Basics stage is authored, 40 words per deck.
  `Everyday` and `Fluent` are declared empty so the stage machinery has the
  shape it expects and the gap is visible in the data rather than at runtime.
- **Accounts and sync.** No server. The data model is already shaped for one —
  client-generated review ids, an append-only guard log, cards folded from
  history — so it is a worker away, not a migration.
- **Multi-character phrases on the pad.** The pad writes one character at a
  time; the spec calls for phrase display, which needs a row of pads.
- **Example sentences.** Vocabulario has one per word; this has none yet.

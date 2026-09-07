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
npm run serve      # the game alone, on :8000
npm run dev        # the game plus the API and a local database, on :8787
npm test           # 143 tests
```

Use `serve` for anything that does not touch accounts; it is faster to start
and needs nothing configured. Use `dev` when you are working on sign-in or
sync.

## How it works

**Words.** Rounds of 20 multiple-choice questions over four decks. Distractors
come from the same deck, so a question is a real test rather than a reading
exercise. A card climbs a box on a right answer and falls to the bottom on a
wrong one, with intervals in real time rather than question counts.

**Direction.** 中文 → English is recognition; English → 中文 is recall, and in
Chinese the gap is wider than in a language written with an alphabet — you can
recognise 蝴蝶 on sight long before you could pick it from four plausible
character strings. A mixed round is exactly half and half, but *which* words
spend the recall slots is weighted by how well each one is known.

**Stages.** Each deck runs Basics → Everyday → Fluent, and a stage opens at 60%
mastery of the one before it. Stages are a multi-select, so Basics and Everyday
can be studied together rather than one or the other.

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
three missed days, and a **streak guard** holds one deliberately for a holiday.
Nothing turns the guard on for you, so a streak that survives is one somebody
decided to protect; finishing a round releases it again by itself.

**Move progress.** Progress lives in this browser alone, so it can be exported
as a code and pasted into another browser or device. The code carries both the
words and the handwriting.

**Accounts.** Signing in with Google is optional and always will be — the app
works fully signed out on localStorage, and an account only adds progress that
follows you between devices. Only `openid profile` is requested, so no email
address is ever asked for or stored.

Answers are recorded from the very first round whether or not anybody is signed
in, which is what lets somebody who signs in later bring real history with them
instead of only a snapshot. On the server that history is the source of truth
and a card is a fold over it, so two devices merge without a conflict: the log
is a set union and the fold is deterministic.

Character history folds differently from word history, and has to. A
character's box depends on the *mode* each attempt was made in, so replaying it
means replaying the caps — otherwise a character somebody has only ever traced
would come back from the server mastered. That is why every character review
carries its mode.

## Layout

```
source/
  vocab.js          the decks — 159 words, four categories, Basics stage
  game.js           word-round state: mixed direction, recall weighting, scoring
  character-data.js GENERATED radical and stroke counts (tools/build-characters.mjs)
  radicals.js       the 214 Kangxi radicals, forms and glosses
  characters.js     which characters are unlocked, and in what teaching order
  writing.js        the three modes, the hint ladder, the mastery cap
  strokes.js        the ONLY module that knows where stroke geometry comes from
  srs.js            Leitner scheduling, for word cards and character cards alike
  quiz.js           multiple-choice construction
  rounds.js         character-round composition and which round types are open
  stages.js         stage gating within a deck
  goals.js          the daily goal and the streak
  script.js         characters / pinyin / both
  storage.js        localStorage, with word and character progress kept apart
  api.js            talking to the Worker; resolves to "no API here" on a static host
worker/
  src/index.js      routes, Google OAuth, session cookie, account deletion
  src/auth.js       HMAC-SHA256 JWT on Web Crypto
  src/sync.js       push answers, pull cards; folds each kind by its own rule
  migrations/       D1 schema
```

Every rule lives in `source/` and is tested without a browser. `main.js` is
screen wiring only.

## Regenerating character data

```sh
curl -O https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
unzip -d /tmp/unihan Unihan.zip
node tools/build-characters.mjs /tmp/unihan
```

## Deploying

The Worker serves the app *and* the API from one origin, so there is no CORS
and the session can ride in an HttpOnly cookie that page scripts — and
therefore any XSS — cannot read.

```sh
npx wrangler d1 create wenmang        # put the id in wrangler.toml
npm run db:apply                      # or db:local for the dev database
npx wrangler secret put JWT_SECRET            # random 32+ bytes
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npm run deploy
```

The Google OAuth client needs `https://<your-domain>/auth/google/callback` as
an authorized redirect URI. Without `GOOGLE_CLIENT_ID` set, `/auth/google/start`
answers 503 and the app simply never shows the account controls — which is also
what happens on a plain static host with no Worker at all.

**Before going live:** Google requires a privacy policy on the OAuth consent
screen. Vocabulario has `/privacy` and `/terms` pages; this does not yet.

## Licensing

See [NOTICE](NOTICE). Short version: the code and the vocabulary are original;
stroke geometry is Arphic-licensed data fetched at runtime and never vendored,
which keeps the redistribution obligations off this repository; radical data is
from Unihan under the Unicode License. `source/strokes.js` is the only module
that touches the stroke data, so the source can be swapped in one file.

## Look

One screen, dark, laid out like its sibling
[Vocabulario](https://vocabulario.ryan-mapa.dev): a settings row, four stat
tiles, a stage strip, and one card that swaps between a word question, the
writing pad, and the round summary. The palette is its own — ink and celadon,
a warm near-black ground with a 青 (qīng) teal running into jade, and cinnabar
kept for misses and for danger.

## Not done yet

- **Audio.** Deliberately deferred. Word records already carry pinyin, so adding
  voices is additive rather than a migration.
- **Vocabulary depth.** Only the Basics stage is authored, 40 words per deck.
  `Everyday` and `Fluent` are declared empty so the stage machinery has the
  shape it expects and the gap is visible in the data rather than at runtime.
- **Privacy and terms pages.** Needed before the Google consent screen can be
  published.
- **Multi-character phrases on the pad.** The pad writes one character at a
  time; the spec calls for phrase display, which needs a row of pads.
- **Example sentences.** Vocabulario has one per word; this has none yet.

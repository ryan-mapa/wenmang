// Wenmang. Screen wiring and round flow; every rule it enforces lives in
// source/ so it can be tested without a browser.

import { DECKS, ALL_DECK_ID } from './source/vocab.js';
import { newCard, isMastered, review } from './source/srs.js';
import * as store from './source/storage.js';
import { localDay, streakFrom, recordRound, goalProgress, DAILY_GOAL } from './source/goals.js';
import { cycleScript, SCRIPT_LABELS, SCRIPT_DESCRIPTIONS, displayWord } from './source/script.js';
import { isCorrect } from './source/quiz.js';
import { buildWordRound, buildCharacterRound, availableRounds, ROUND_LABELS } from './source/rounds.js';
import { availableCharacters, characterInfo } from './source/characters.js';
import {
  MODES,
  MODE_LABELS,
  MODE_DESCRIPTIONS,
  newAttempt,
  recordStroke,
  takeHint,
  reviewCharacter,
  isSuccess,
  hintAt,
  HINT_LEVELS,
  capExplanation
} from './source/writing.js';
import { loadCharacter, writerOptions, demonstratesFirst, ATTRIBUTION } from './source/strokes.js';

const el = (id) => document.getElementById(id);

const ui = {
  screens: {
    home: el('screen-home'),
    words: el('screen-words'),
    chars: el('screen-chars'),
    done: el('screen-done')
  },
  streak: el('streak'),
  scriptToggle: el('script-toggle'),
  share: el('share'),
  shareNote: el('share-note'),
  goalFill: el('goal-fill'),
  goalText: el('goal-text'),
  roundTypes: el('round-types'),
  lockedNote: el('locked-note'),
  deckSection: el('deck-section'),
  decks: el('decks'),
  writingSection: el('writing-section'),
  modePicker: el('mode-picker'),
  modeNote: el('mode-note'),
  startCharacters: el('start-characters'),
  wordProgress: el('word-progress'),
  promptMain: el('prompt-main'),
  promptSub: el('prompt-sub'),
  choices: el('choices'),
  wordFeedback: el('word-feedback'),
  charProgress: el('char-progress'),
  charGloss: el('char-gloss'),
  charContext: el('char-context'),
  pad: el('pad'),
  charHint: el('char-hint'),
  charMode: el('char-mode'),
  hint: el('hint'),
  showAgain: el('show-again'),
  skip: el('skip'),
  doneTitle: el('done-title'),
  doneLine: el('done-line'),
  doneUnlocked: el('done-unlocked'),
  again: el('again'),
  home: el('home'),
  attribution: el('attribution')
};

let data = store.load();

/** What the home screen is currently set to launch. */
let roundType = 'words';
let deckId = DECKS[0].id;
/** null means "follow each card", the setting that walks a learner up the ladder. */
let preferredMode = null;

/** The round in progress, of whichever kind. */
let round = null;

// ---------------------------------------------------------------- screens

function show(name) {
  for (const [key, node] of Object.entries(ui.screens)) node.hidden = key !== name;
}

const persist = () => store.save(data);

// ---------------------------------------------------------------- home

function renderGoal() {
  const today = localDay();
  const streak = streakFrom(data.days, today, data.guards);

  ui.goalFill.style.width = `${goalProgress(data.days, today) * 100}%`;
  ui.goalText.textContent = streak.hitToday
    ? `Today is done — ${streak.roundsToday} rounds.`
    : `${streak.roundsToday} of ${DAILY_GOAL} rounds today.`;

  ui.streak.textContent = streak.current > 0 ? `${streak.current}日` : '';
  ui.streak.title = streak.current > 0 ? `${streak.current}-day streak` : '';
}

function renderRoundTypes() {
  const open = availableRounds(data.cards);
  if (!open.includes(roundType)) roundType = 'words';

  ui.roundTypes.replaceChildren(
    ...['words', 'characters'].map((type) => {
      const button = document.createElement('button');
      const unlocked = open.includes(type);
      button.type = 'button';
      button.disabled = !unlocked;
      button.setAttribute('aria-pressed', String(type === roundType));
      button.innerHTML =
        `${ROUND_LABELS[type]}<small>${type === 'words' ? '20 questions' : '10 characters'}</small>`;
      button.addEventListener('click', () => {
        roundType = type;
        renderHome();
      });
      return button;
    })
  );

  const unlocked = availableCharacters(data.cards).length;
  ui.lockedNote.textContent = unlocked
    ? `${unlocked} character${unlocked === 1 ? '' : 's'} unlocked by words you have mastered.`
    : 'Character practice opens as you master words — each one unlocks the characters it contains.';

  ui.deckSection.hidden = roundType !== 'words';
  ui.writingSection.hidden = roundType !== 'characters';
}

function renderDecks() {
  ui.decks.replaceChildren(
    ...[...DECKS, { id: ALL_DECK_ID, name: 'Everything', emoji: '全' }].map((deck) => {
      const words = deck.id === ALL_DECK_ID
        ? DECKS.flatMap((d) => d.stages[0])
        : deck.stages[0];
      const cards = words.map((word) => data.cards[word.zh] ?? newCard());
      const done = cards.filter(isMastered).length;

      const button = document.createElement('button');
      button.className = 'deck';
      button.type = 'button';
      button.innerHTML =
        `<span class="emoji">${deck.emoji}</span>` +
        `<span><span class="name">${deck.name}</span><br>` +
        `<span class="meta">${done}/${words.length} mastered</span></span>`;
      button.addEventListener('click', () => {
        deckId = deck.id;
        startWordRound();
      });
      return button;
    })
  );
}

function renderModePicker() {
  const options = [{ id: null, label: 'Follow my progress', note: 'Each character opens where it has earned' }]
    .concat(MODES.map((mode) => ({ id: mode, label: MODE_LABELS[mode], note: MODE_DESCRIPTIONS[mode] })));

  ui.modePicker.replaceChildren(
    ...options.map((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-pressed', String(option.id === preferredMode));
      button.innerHTML = `${option.label}<small>${option.note}</small>`;
      button.addEventListener('click', () => {
        preferredMode = option.id;
        data = store.withPrefs(data, { mode: option.id ?? store.AUTO_MODE });
        persist();
        renderModePicker();
      });
      return button;
    })
  );

  ui.modeNote.textContent =
    preferredMode === 'free'
      ? 'A blank pad is the only mode that can master a character.'
      : preferredMode === null
        ? ''
        : 'Tracing keeps a character fresh but will not take it to mastery.';
}

function renderScriptToggle() {
  const mode = data.prefs.script;
  ui.scriptToggle.textContent = SCRIPT_LABELS[mode];
  ui.scriptToggle.title = SCRIPT_DESCRIPTIONS[mode];
}

function renderHome() {
  renderGoal();
  renderRoundTypes();
  renderDecks();
  renderModePicker();
  renderScriptToggle();
  show('home');
}

// ---------------------------------------------------------------- word round

function startWordRound() {
  const questions = buildWordRound(deckId, [0, 1, 2], data.cards, Date.now(), {
    direction: 'zh-en',
    script: data.prefs.script
  });

  if (questions.length === 0) {
    ui.lockedNote.textContent = 'That deck has no words at this stage yet.';
    return;
  }

  round = { type: 'words', questions, index: 0, right: 0 };
  show('words');
  renderQuestion();
}

function renderQuestion() {
  const question = round.questions[round.index];

  ui.wordProgress.style.width = `${(round.index / round.questions.length) * 100}%`;
  ui.promptMain.textContent = question.prompt;
  ui.promptMain.classList.toggle('is-hanzi', question.promptIsHanzi);
  ui.promptSub.textContent = question.promptSub;
  ui.wordFeedback.textContent = '';

  ui.choices.replaceChildren(
    ...question.choices.map((choice) => {
      const button = document.createElement('button');
      button.className = 'choice' + (question.answerIsHanzi ? ' is-hanzi' : '');
      button.type = 'button';
      button.textContent = choice;
      button.addEventListener('click', () => answerWord(question, choice, button));
      return button;
    })
  );
}

function answerWord(question, choice, button) {
  const right = isCorrect(question, choice);
  const now = Date.now();

  const card = data.cards[question.word.zh] ?? newCard();
  data = store.withCards(data, {
    ...data.cards,
    [question.word.zh]: review(card, right, now)
  });
  persist();

  for (const node of ui.choices.children) {
    node.disabled = true;
    if (node.textContent === question.answer) node.classList.add('right');
    else if (node === button) node.classList.add('wrong');
  }

  if (right) round.right += 1;

  const shown = displayWord(question.word, 'both');
  ui.wordFeedback.textContent = right
    ? `${shown.primary} — ${shown.secondary}`
    : `${shown.primary} (${shown.secondary}) — ${question.word.en}`;

  setTimeout(nextQuestion, right ? 700 : 1500);
}

function nextQuestion() {
  round.index += 1;
  if (round.index >= round.questions.length) return finishRound();
  renderQuestion();
}

// ---------------------------------------------------------------- character round

let writer = null;

function startCharacterRound() {
  const items = buildCharacterRound(data.cards, data.chars, Date.now(), { preferredMode });
  if (items.length === 0) {
    ui.lockedNote.textContent = 'Master a word first — its characters unlock here.';
    return;
  }

  round = { type: 'characters', items, index: 0, right: 0, attempt: null, hintLevel: 0 };
  show('chars');
  renderCharacter();
}

async function renderCharacter() {
  const item = round.items[round.index];
  const info = characterInfo(item.char);

  round.attempt = newAttempt(item.char, item.mode);
  round.hintLevel = 0;

  ui.charProgress.style.width = `${(round.index / round.items.length) * 100}%`;
  ui.charHint.textContent = '';
  ui.charMode.textContent = MODE_LABELS[item.mode];

  // The prompt is the meaning, never the character — on a blank pad the
  // character is the answer, so showing it in the context word would give the
  // whole thing away.
  const hideIt = item.mode === 'free';
  ui.charGloss.textContent = item.from.en;
  ui.charContext.innerHTML =
    `<b>${hideIt ? item.from.zh.replaceAll(item.char, '□') : item.from.zh}</b> · ${item.from.py}` +
    (info.strokes ? ` · ${info.strokes} strokes` : '');

  ui.pad.replaceChildren();
  writer = null;

  const charData = await loadCharacter(item.char);
  if (!charData || !globalThis.HanziWriter) {
    // No geometry: the round still runs on the structural hints, and the
    // learner marks themselves rather than being blocked.
    ui.charHint.textContent = 'Stroke data unavailable — write it on paper, then continue.';
    ui.skip.textContent = 'Done';
    return;
  }

  ui.skip.textContent = 'Skip';
  writer = globalThis.HanziWriter.create(ui.pad, item.char, {
    ...writerOptions(item.mode, { size: ui.pad.clientWidth || 300 }),
    charDataLoader: (_char, onComplete) => onComplete(charData)
  });

  if (demonstratesFirst(item.mode)) {
    await writer.animateCharacter();
  }
  startQuiz(item, charData);
}

function startQuiz(item, charData) {
  writer.quiz({
    onMistake: () => {
      round.attempt = recordStroke(round.attempt, false, charData.strokes.length);
    },
    onCorrectStroke: () => {
      round.attempt = recordStroke(round.attempt, true, charData.strokes.length);
    },
    onComplete: () => finishCharacter(item)
  });
}

function finishCharacter(item) {
  const now = Date.now();
  const card = data.chars[item.char] ?? newCard();
  const success = isSuccess(round.attempt);

  data = store.withChars(data, {
    ...data.chars,
    [item.char]: reviewCharacter(card, round.attempt, now)
  });
  persist();

  if (success) round.right += 1;

  const explanation = capExplanation(data.chars[item.char], item.mode);
  ui.charHint.textContent = success
    ? explanation ?? `${item.char} — good.`
    : `${item.char} — worth another look.`;

  setTimeout(() => {
    round.index += 1;
    if (round.index >= round.items.length) return finishRound();
    renderCharacter();
  }, 1100);
}

ui.hint.addEventListener('click', async () => {
  if (round?.type !== 'characters') return;
  const hint = hintAt(round.attempt.char, round.hintLevel);
  if (!hint) return;

  round.hintLevel = hint.level + 1;
  round.attempt = takeHint(round.attempt);
  ui.charHint.textContent = hint.text;

  if (hint.reveals === 'outline') writer?.showOutline();
  if (hint.reveals === 'nextStroke') {
    // The strokes already drawn are the ones we are past; highlight the next.
    await writer?.highlightStroke?.(round.attempt.strokesDrawn);
  }
  ui.hint.disabled = round.hintLevel >= HINT_LEVELS.length;
});

ui.showAgain.addEventListener('click', async () => {
  if (round?.type !== 'characters' || !writer) return;
  // In the teaching mode watching the animation is the mode, not a hint. In the
  // other two it hands over the whole character, so it costs a hint.
  if (round.attempt.mode !== 'teach') round.attempt = takeHint(round.attempt);
  await writer.animateCharacter();
  const item = round.items[round.index];
  const charData = await loadCharacter(item.char);
  if (charData) startQuiz(item, charData);
});

ui.skip.addEventListener('click', () => {
  if (round?.type !== 'characters') return;
  finishCharacter(round.items[round.index]);
});

// ---------------------------------------------------------------- finishing

function finishRound() {
  const before = new Set(availableCharacters(data.cards).map((entry) => entry.char));

  data = store.withDays(data, recordRound(data.days));
  persist();

  const after = availableCharacters(data.cards).map((entry) => entry.char);
  const unlocked = after.filter((char) => !before.has(char));

  const total = round.type === 'words' ? round.questions.length : round.items.length;
  ui.doneTitle.textContent = round.right === total ? '全对 — all correct' : 'Round done';
  ui.doneLine.textContent = `${round.right} of ${total}.`;
  ui.doneUnlocked.textContent = unlocked.length
    ? `New characters unlocked: ${unlocked.join(' ')}`
    : '';

  renderGoal();
  show('done');
}

ui.again.addEventListener('click', () => {
  if (round?.type === 'characters') startCharacterRound();
  else startWordRound();
});

ui.home.addEventListener('click', renderHome);
ui.startCharacters.addEventListener('click', startCharacterRound);

// ---------------------------------------------------------------- chrome

ui.scriptToggle.addEventListener('click', () => {
  data = store.withPrefs(data, { script: cycleScript(data.prefs.script) });
  persist();
  renderScriptToggle();
  if (round?.type === 'words') {
    // Re-render the current question so the change is visible immediately
    // rather than at the next question.
    const question = round.questions[round.index];
    const shown = displayWord(question.word, data.prefs.script);
    if (question.direction === 'zh-en') {
      ui.promptMain.textContent = shown.primary;
      ui.promptMain.classList.toggle('is-hanzi', shown.isHanzi);
      ui.promptSub.textContent = shown.secondary;
    }
  }
});

/**
 * Share the app. navigator.share is the right thing on a phone — it opens the
 * system sheet — and a cancelled sheet rejects with AbortError, which is
 * somebody changing their mind, not a failure to report.
 */
async function share() {
  const url = location.href.split('#')[0];
  const payload = { title: 'Wenmang', text: 'Mandarin words and characters', url };

  if (navigator.share) {
    try {
      await navigator.share(payload);
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
      // Fall through: browsers advertise navigator.share then refuse it in
      // plenty of contexts.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    sayShared('Link copied');
  } catch {
    sayShared('Copy the address bar');
  }
}

let shareTimer = null;
function sayShared(text) {
  ui.shareNote.textContent = text;
  clearTimeout(shareTimer);
  shareTimer = setTimeout(() => { ui.shareNote.textContent = ''; }, 2600);
}

ui.share.addEventListener('click', share);

// Answer with the keyboard as well as the mouse.
document.addEventListener('keydown', (event) => {
  if (round?.type !== 'words' || ui.screens.words.hidden) return;
  const index = Number(event.key) - 1;
  const button = ui.choices.children[index];
  if (button && !button.disabled) button.click();
});

ui.attribution.textContent = `${ATTRIBUTION} Radical and stroke-count data from the Unicode Han Database.`;

// AUTO_MODE means "follow each card", which is null to everything downstream.
preferredMode = data.prefs.mode === store.AUTO_MODE ? null : data.prefs.mode;
renderHome();

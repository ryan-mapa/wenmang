// Wenmang. Screen wiring and round flow; every rule it enforces lives in
// source/ so it can be tested without a browser.

import { DECKS, ALL_DECK_ID, STAGE_NAMES, STAGE_COUNT, getDeck } from './source/vocab.js';
import { newCard, isMastered, masteryOf } from './source/srs.js';
import { createGame, MIXED, ROUND_LENGTH } from './source/game.js';
import { DIRECTIONS } from './source/quiz.js';
import { isStageUnlocked, stageProgress, unlockedDepth, nextUnlock } from './source/stages.js';
import * as store from './source/storage.js';
import {
  localDay, streakFrom, recordRound, DAILY_GOAL, GRACE_DAYS, GUARD, guardEvent, manualGuardOn
} from './source/goals.js';
import { cycleScript, SCRIPT_LABELS, SCRIPT_DESCRIPTIONS, displayWord } from './source/script.js';
import {
  buildCharacterRound, availableRounds, charactersInRound, CHARACTER_ROUND_LENGTH
} from './source/rounds.js';
import { availableCharacters, characterInfo } from './source/characters.js';
import {
  MODES, MODE_LABELS, MODE_DESCRIPTIONS, newAttempt, recordStroke, takeHint,
  reviewCharacter, isSuccess, capExplanation
} from './source/writing.js';
import { hintAt, HINT_LEVELS } from './source/hints.js';
import { loadCharacter, writerOptions, demonstratesFirst, ATTRIBUTION } from './source/strokes.js';
import { fetchMe, sync as pushPull, deleteAccount, signOut as endSession } from './source/api.js';

const el = (id) => document.getElementById(id);

const ui = {
  deck: el('deck'),
  direction: el('direction'),
  directionField: el('direction-field'),
  scriptToggle: el('script-toggle'),
  scriptLabel: el('script-label'),
  guardShield: el('guard-shield'),

  auth: el('auth'),
  signIn: el('sign-in'),
  authUser: el('auth-user'),
  authName: el('auth-name'),
  authNote: el('auth-note'),
  account: el('account'),
  accountDialog: el('account-dialog'),
  accountBody: el('account-body'),
  accountClose: el('account-close'),
  accountDanger: el('account-danger'),
  signOut: el('sign-out'),
  deleteStart: el('delete-start'),
  deleteDialog: el('delete-dialog'),
  deleteCancel: el('delete-cancel'),
  deleteContinue: el('delete-continue'),
  deleteFinal: el('delete-final'),
  deleteTyped: el('delete-typed'),
  deleteStatus: el('delete-status'),
  deleteFinalCancel: el('delete-final-cancel'),
  deleteConfirm: el('delete-confirm'),
  guardBadge: el('guard-badge'),

  today: el('today'),
  todayStat: el('today-stat'),
  goalFill: el('goal-fill'),
  streak: el('streak'),
  mastered: el('mastered'),
  masteredStat: el('mastered-stat'),
  mastery: el('mastery'),
  masteryStat: el('mastery-stat'),
  scoreboardNote: el('scoreboard-note'),
  roundProgress: el('round-progress'),

  practiceRow: el('practice-row'),
  stages: el('stages'),
  stageRow: el('stage-row'),
  unlockNote: el('unlock-note'),
  writingModes: el('writing-modes'),
  characterSource: el('character-source'),
  characterEmpty: el('character-empty'),
  modeRow: el('mode-row'),
  modeNote: el('mode-note'),

  play: el('play'),
  directionHint: el('direction-hint'),
  prompt: el('prompt'),
  promptSub: el('prompt-sub'),
  choices: el('choices'),
  feedback: el('feedback'),
  hint: el('hint'),

  write: el('write'),
  writeHint: el('write-hint'),
  charGloss: el('char-gloss'),
  charContext: el('char-context'),
  padRow: el('pad-row'),
  charFeedback: el('char-feedback'),
  charHintBtn: el('char-hint-btn'),
  showAgain: el('show-again'),
  skip: el('skip'),
  writeKeys: el('write-keys'),

  summary: el('summary'),
  summaryTitle: el('summary-title'),
  goalBanner: el('goal-banner'),
  unlockBanner: el('unlock-banner'),
  summaryAccuracy: el('summary-accuracy'),
  summaryToday: el('summary-today'),
  summaryMastered: el('summary-mastered'),
  summaryMasteredLabel: el('summary-mastered-label'),
  summaryLongest: el('summary-longest'),
  again: el('again'),

  share: el('share'),
  shareNote: el('share-note'),
  attribution: el('attribution'),
  openTransfer: el('open-transfer'),

  guardNotice: el('guard-notice'),
  guardNoticeTitle: el('guard-notice-title'),
  guardNoticeBody: el('guard-notice-body'),
  guardNoticeOk: el('guard-notice-ok'),
  guardDialog: el('guard-dialog'),
  guardBody: el('guard-body'),
  guardToggle: el('guard-toggle'),
  guardClose: el('guard-close'),

  transferDialog: el('transfer-dialog'),
  transferOut: el('transfer-out'),
  transferIn: el('transfer-in'),
  transferStatus: el('transfer-status'),
  transferCopy: el('transfer-copy'),
  transferImport: el('transfer-import'),
  transferClose: el('transfer-close')
};

let data = store.load();

/** 'words' or 'characters'. */
let roundType = 'words';
/** Which stages a word round draws from — multi-select, so Basics and Everyday
 *  can be studied together rather than one or the other. */
let stages = [0];
/** null means "follow each card", the only setting that climbs the mode ladder. */
let preferredMode = null;

let game = null;
let charRound = null;
let writer = null;

/** Whether an account is signed in. False also covers "there is no API here". */
let signedIn = false;

let roundCredited = false;
let depthAtRoundStart = 0;
let hoveredTip = null;

const persist = () => store.save(data);
const cards = () => (game ? game.state.cards : data.cards);

// ------------------------------------------------------------------ chrome

function populateDecks() {
  const selected = ui.deck.value || ALL_DECK_ID;
  const entries = [{ id: ALL_DECK_ID, name: 'Everything', emoji: '全' }, ...DECKS];

  ui.deck.replaceChildren(
    ...entries.map((deck) => {
      const option = document.createElement('option');
      option.value = deck.id;
      const total = deck.id === ALL_DECK_ID
        ? DECKS.reduce((n, d) => n + d.stages.flat().length, 0)
        : deck.stages.flat().length;
      const done = wordsOf(deck.id).filter((word) => isMastered(data.cards[word.zh] ?? newCard())).length;
      option.textContent = `${deck.emoji} ${deck.name} · ${done}/${total}`;
      return option;
    })
  );
  ui.deck.value = selected;
}

function wordsOf(deckId) {
  if (deckId === ALL_DECK_ID) return DECKS.flatMap((deck) => deck.stages.flat());
  return getDeck(deckId)?.stages.flat() ?? [];
}

function renderScriptToggle() {
  ui.scriptLabel.textContent = SCRIPT_LABELS[data.prefs.script];
  ui.scriptToggle.title = SCRIPT_DESCRIPTIONS[data.prefs.script];
}

// -------------------------------------------------------------- scoreboard

function renderScoreboard() {
  const today = localDay();
  const streak = streakFrom(data.days, today, data.guards);

  ui.today.textContent = `${streak.roundsToday}/${DAILY_GOAL}`;
  ui.goalFill.style.width = `${Math.min(1, streak.roundsToday / DAILY_GOAL) * 100}%`;
  ui.todayStat.classList.toggle('met', streak.hitToday);

  ui.streak.textContent = streak.current;
  ui.streak.classList.toggle('lit', streak.current > 0);
  ui.guardBadge.textContent = streak.guard === GUARD.GUARDED ? '●' : '';
  ui.guardShield.classList.toggle('on', streak.guard === GUARD.GUARDED);

  // The two right-hand tiles report whichever skill is being practised. In a
  // writing round "mastered words" is not the number anybody is watching.
  if (roundType === 'characters') {
    const unlocked = availableCharacters(data.cards, data.prefs.characterSource).map((entry) => entry.char);
    const charCards = unlocked.map((char) => data.chars[char] ?? newCard());
    ui.mastered.textContent = charCards.filter(isMastered).length;
    ui.mastery.textContent = `${Math.round(masteryOf(charCards) * 100)}%`;
    ui.masteredStat.dataset.tip =
      'Characters you can write from a blank pad — the top box, which tracing cannot reach.';
    ui.masteryStat.dataset.tip =
      'How far characters in this source have climbed overall, counting partial progress on every one.';
  } else {
    const pool = poolWords();
    const wordCards = pool.map((word) => data.cards[word.zh] ?? newCard());
    ui.mastered.textContent = wordCards.filter(isMastered).length;
    ui.mastery.textContent = `${Math.round(masteryOf(wordCards) * 100)}%`;
    ui.masteredStat.dataset.tip =
      'Words in this deck and stage you have reached the top box on — four correct answers in a row, with no miss in between.';
    ui.masteryStat.dataset.tip =
      'How far this deck and stage has climbed overall, counting partial progress on every word — not only the mastered ones.';
  }

  renderNote(streak);
}

/** The words the current deck and stage selection covers. */
function poolWords() {
  const deckId = ui.deck.value || ALL_DECK_ID;
  const open = stages.filter((stage) => isStageUnlocked(deckId, stage, data.cards));
  const seen = new Set();
  const out = [];
  for (const stage of open.length ? open : [0]) {
    for (const word of (deckId === ALL_DECK_ID
      ? DECKS.flatMap((d) => d.stages[stage] ?? [])
      : getDeck(deckId)?.stages[stage] ?? [])) {
      if (seen.has(word.zh)) continue;
      seen.add(word.zh);
      out.push(word);
    }
  }
  return out;
}

/**
 * The line under the scoreboard. A hovered tile explains itself; otherwise the
 * line is used for the one thing worth interrupting for, which is a streak
 * inside its grace window.
 */
function renderNote(streak = streakFrom(data.days, localDay(), data.guards)) {
  const note = ui.scoreboardNote;

  if (hoveredTip) {
    note.textContent = hoveredTip;
    note.className = 'scoreboard-note';
    return;
  }

  const atRisk =
    streak.current > 0 && !streak.hitToday && streak.graceDaysLeft < GRACE_DAYS &&
    streak.guard !== GUARD.GUARDED;

  if (atRisk) {
    note.innerHTML =
      `Your <strong>${streak.current}-day</strong> streak has ` +
      `<strong>${streak.graceDaysLeft}</strong> day${streak.graceDaysLeft === 1 ? '' : 's'} ` +
      `of grace left — finish a round, or <button class="linkish" data-open-guard>pause it</button>.`;
    note.className = 'scoreboard-note warning';
    return;
  }

  note.textContent = '';
  note.className = 'scoreboard-note';
}

// ------------------------------------------------------- practice / stages

function renderPracticeRow() {
  const open = availableRounds(data.cards);
  if (!open.includes(roundType)) roundType = 'words';

  const unlocked = availableCharacters(data.cards, data.prefs.characterSource).length;

  ui.practiceRow.replaceChildren(
    ...[
      { id: 'words', name: 'Words', meta: `${ROUND_LENGTH} questions` },
      {
        id: 'characters',
        name: 'Characters',
        meta: `${Math.min(CHARACTER_ROUND_LENGTH, unlocked)} to write · ${unlocked} available`
      }
    ].map((type) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = !open.includes(type.id);
      button.setAttribute('aria-pressed', String(type.id === roundType));
      button.innerHTML =
        `<span class="practice-name">${type.name}</span><span class="practice-meta">${type.meta}</span>`;
      button.addEventListener('click', () => {
        if (type.id === roundType) return;
        roundType = type.id;
        startRound();
      });
      return button;
    })
  );

  ui.stages.hidden = roundType !== 'words';
  ui.writingModes.hidden = roundType !== 'characters';
  ui.characterSource.value = data.prefs.characterSource;
  ui.deck.closest('label').hidden = roundType === 'characters';
  ui.directionField.hidden = roundType !== 'words';
}

function renderStages() {
  const deckId = ui.deck.value || ALL_DECK_ID;

  ui.stageRow.replaceChildren(
    ...Array.from({ length: STAGE_COUNT }, (_, stage) => {
      const info = stageProgress(deckId, stage, data.cards);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'stage';
      button.disabled = !info.unlocked || info.total === 0;
      button.setAttribute('aria-pressed', String(stages.includes(stage) && info.unlocked));
      button.innerHTML =
        `<span class="stage-name">${STAGE_NAMES[stage]}</span>` +
        // "locked" and "empty" are different things and were reading the same.
        // On the combined deck a locked stage reports no words at all — its
        // pool is the decks that have opened it, and none have — so testing the
        // count alone called every locked stage empty.
        `<span class="stage-meta">${
          !info.unlocked ? 'locked' : info.total === 0 ? 'empty' : `${info.mastered}/${info.total}`
        }</span>` +
        `<span class="stage-fill" style="width:${info.mastery * 100}%"></span>`;
      button.addEventListener('click', () => toggleStage(stage));
      return button;
    })
  );

  const next = nextUnlock(deckId, data.cards);
  ui.unlockNote.innerHTML = next
    ? `<strong>${STAGE_NAMES[next.stage]}</strong> opens at ` +
      `<strong>${Math.round(next.threshold * 100)}%</strong> of ${STAGE_NAMES[next.from]} — ` +
      `${Math.round(next.mastery * 100)}% so far.`
    : 'Every stage on this deck is open.';
}

/** Stages are a multi-select, but a round needs at least one. */
function toggleStage(stage) {
  const next = stages.includes(stage) ? stages.filter((s) => s !== stage) : [...stages, stage];
  if (next.length === 0) return;
  stages = next.sort();
  startRound();
}

function renderModes() {
  // The meta line names the ceiling each mode can reach, because that is the
  // one thing about these four that is not obvious from their names — and it is
  // the whole reason there are four.
  const CAPS = { teach: 'to box 1', guided: 'to box 3', free: 'to mastery' };
  const options = [
    { id: null, name: 'Auto', meta: 'earned', note: 'Follow each card' },
    ...MODES.map((mode) => ({ id: mode, name: MODE_LABELS[mode], meta: CAPS[mode], note: MODE_DESCRIPTIONS[mode] }))
  ];

  ui.modeRow.replaceChildren(
    ...options.map((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'stage';
      button.setAttribute('aria-pressed', String(option.id === preferredMode));
      button.innerHTML =
        `<span class="stage-name">${option.name}</span>` +
        `<span class="stage-meta">${option.meta}</span>`;
      button.title = option.note;
      button.addEventListener('click', () => {
        preferredMode = option.id;
        data = store.withPrefs(data, { mode: option.id ?? store.AUTO_MODE });
        persist();
        renderModes();
        startRound();
      });
      return button;
    })
  );

  ui.modeNote.textContent =
    preferredMode === 'free'
      ? 'A blank pad is the only mode that can take a character to the top box.'
      : preferredMode === null
        ? 'Each character opens in the mode it has earned, and climbs as it is learned.'
        : 'Tracing keeps a character fresh, but only a blank pad masters it.';
}

// ------------------------------------------------------------- word rounds

function startWordRound() {
  const deckId = ui.deck.value || ALL_DECK_ID;
  const open = stages.filter((stage) => isStageUnlocked(deckId, stage, data.cards));
  const usable = open.filter(
    (stage) => stageProgress(deckId, stage, data.cards).total > 0
  );
  stages = usable.length ? usable : [0];

  game = createGame({
    deckId,
    stages,
    direction: ui.direction.value,
    script: data.prefs.script,
    cards: data.cards
  });
  charRound = null;
  depthAtRoundStart = unlockedDepth(deckId, data.cards);
  game.startRound();

  ui.play.hidden = false;
  ui.write.hidden = true;
  ui.summary.hidden = true;
  renderQuestion();
}

function renderQuestion() {
  const { state } = game;
  renderScoreboard();
  ui.roundProgress.style.width = `${(state.asked / state.roundLength) * 100}%`;

  const question = state.question;
  if (!question) return;

  const side = DIRECTIONS[question.direction].promptSide;
  ui.directionHint.textContent = side === 'zh' ? 'What does it mean…?' : 'How do you write it…?';

  ui.prompt.textContent = question.prompt;
  ui.prompt.classList.toggle('is-hanzi', question.promptIsHanzi);
  ui.promptSub.textContent = question.promptSub;

  ui.choices.replaceChildren(
    ...question.choices.map((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice';
      button.dataset.choice = choice;
      button.innerHTML = `<span class="key">${index + 1}</span><span class="text"></span>`;
      const text = button.querySelector('.text');
      text.textContent = choice;
      text.classList.toggle('is-hanzi', question.answerIsHanzi);
      button.addEventListener('click', () => submit(choice));
      return button;
    })
  );

  ui.feedback.textContent = ' ';
  ui.feedback.className = 'feedback';
  ui.hint.innerHTML = 'Answer with <kbd>1</kbd>–<kbd>4</kbd> · <kbd>Enter</kbd> to continue';
  ui.hint.classList.remove('waiting');
  fitPrompt();
}

/**
 * Shrink a long prompt to keep it on one line. The line box is sized from
 * --prompt-size rather than from the font, so shrinking never moves the board.
 */
function fitPrompt() {
  const row = ui.prompt.parentElement;
  ui.prompt.style.fontSize = '';
  const available = row.clientWidth;
  if (!available) return;
  const width = ui.prompt.scrollWidth;
  if (width > available) {
    const base = parseFloat(getComputedStyle(ui.prompt).fontSize);
    ui.prompt.style.fontSize = `${Math.floor(base * (available / width))}px`;
  }
}

function submit(choice) {
  if (!game?.state.question || game.state.lastAnswer) return;

  const result = game.answer(choice);
  const question = result.question;

  data = store.withCards(data, { ...data.cards, ...game.state.cards });

  // Recorded whether or not anybody is signed in. History written from the
  // start is what lets somebody who signs in later bring real history with
  // them rather than only a snapshot of where they ended up.
  store.queueReview({
    id: store.newReviewId(),
    kind: 'word',
    item: question.word.zh,
    deckId: game.state.deckId,
    stage: Number.isInteger(question.word.stage) ? question.word.stage : null,
    direction: question.direction,
    correct: result.correct,
    reviewedAt: result.at
  });
  persist();

  for (const node of ui.choices.children) {
    node.disabled = true;
    if (node.dataset.choice === question.answer) node.classList.add('correct');
    else if (node.dataset.choice === choice) node.classList.add('wrong');
  }

  const shown = displayWord(question.word, 'both');
  ui.feedback.innerHTML = result.correct
    ? `<span class="han">${shown.primary}</span> · ${shown.secondary}`
    : `<span class="han">${shown.primary}</span> · ${shown.secondary} — ${question.word.en}`;
  ui.feedback.className = `feedback ${result.correct ? 'good' : 'bad'}`;

  renderScoreboard();
  ui.roundProgress.style.width = `${(game.state.asked / game.state.roundLength) * 100}%`;

  if (result.correct) {
    setTimeout(advance, 700);
  } else {
    // The keys are wrapped so a touch device can drop them: this line is the
    // one piece of guidance that stays on screen on a phone, and naming keys it
    // does not have is worse than saying nothing.
    ui.hint.innerHTML =
      'Tap anywhere<span class="keys"> · <kbd>Enter</kbd> or <kbd>1</kbd>–<kbd>4</kbd></span> to continue';
    ui.hint.classList.add('waiting');
  }
}

function advance() {
  if (!game?.state.lastAnswer) return;
  if (game.isRoundOver()) return showSummary();
  game.nextQuestion();
  renderQuestion();
}

// -------------------------------------------------------- character rounds

function startCharacterRound() {
  const items = buildCharacterRound(data.cards, data.chars, Date.now(), {
    preferredMode,
    source: data.prefs.characterSource
  });

  if (items.length === 0) {
    charRound = null;
    game = null;
    ui.play.hidden = true;
    ui.write.hidden = true;
    ui.summary.hidden = true;
    ui.characterEmpty.hidden = false;
    ui.roundProgress.style.width = '0%';
    renderScoreboard();
    return;
  }

  charRound = {
    items,
    index: 0,
    charIndex: 0,
    written: 0,
    right: 0,
    total: charactersInRound(items),
    attempt: null,
    hintLevel: 0,
    startedAt: Date.now(),
    // Bumped whenever the round moves on. Every async step checks it before
    // touching the DOM, so a slow character-data fetch cannot draw itself onto
    // a pad that has since moved to the next word.
    generation: 0
  };
  game = null;

  ui.play.hidden = true;
  ui.write.hidden = false;
  ui.summary.hidden = true;
  renderWord();
}

/** The word being written, and the character within it. */
const currentWord = () => charRound.items[charRound.index];
const currentChar = () => currentWord().chars[charRound.charIndex];

/**
 * Lay out one square per character of the word and start the first unwritten
 * one.
 *
 * The whole row is rebuilt per word rather than per character: the row is the
 * word, and rebuilding it as you move along it would make the word flicker
 * under the hand that is writing it.
 */
async function renderWord() {
  const item = currentWord();
  const generation = ++charRound.generation;

  charRound.charIndex = 0;
  charRound.hintLevel = 0;

  renderScoreboard();
  ui.roundProgress.style.width = `${(charRound.written / charRound.total) * 100}%`;
  ui.charFeedback.textContent = ' ';
  ui.charFeedback.className = 'feedback';
  ui.charHintBtn.disabled = false;
  ui.writeHint.textContent = MODE_LABELS[item.chars[0].mode];

  // The prompt is the meaning and the sound; the characters are the answer.
  ui.charGloss.textContent = item.word.en;
  ui.charContext.textContent = item.word.py;

  ui.padRow.style.setProperty('--pad-count', item.chars.length);
  ui.padRow.replaceChildren(
    ...item.chars.map((_, position) => {
      const wrap = document.createElement('div');
      wrap.className = 'pad-wrap ' + (position === 0 ? 'is-active' : 'is-pending');
      const grid = document.createElement('div');
      grid.className = 'pad-grid';
      grid.setAttribute('aria-hidden', 'true');
      const pad = document.createElement('div');
      pad.className = 'pad';
      wrap.append(grid, pad);
      return wrap;
    })
  );

  if (charRound.generation !== generation) return;
  activateChar();
}

/** Put a live writer on the current square and take strokes on it. */
async function activateChar() {
  const generation = charRound.generation;
  const item = currentWord();
  const entry = currentChar();
  const info = characterInfo(entry.char);

  charRound.attempt = newAttempt(entry.char, entry.mode);
  charRound.hintLevel = 0;
  ui.charHintBtn.disabled = false;
  ui.writeHint.textContent = MODE_LABELS[entry.mode];

  const wraps = [...ui.padRow.children];
  wraps.forEach((wrap, position) => {
    wrap.classList.toggle('is-active', position === charRound.charIndex);
    wrap.classList.toggle('is-pending', position > charRound.charIndex);
    wrap.classList.toggle('is-done', position < charRound.charIndex);
  });

  // Which character of the word, and how long it is — the row shows where you
  // are, this says what is being asked for.
  ui.charContext.textContent =
    item.chars.length > 1
      ? `${item.word.py} · character ${charRound.charIndex + 1} of ${item.chars.length}` +
        (info.strokes ? ` · ${info.strokes} strokes` : '')
      : `${item.word.py}${info.strokes ? ` · ${info.strokes} strokes` : ''}`;

  const pad = wraps[charRound.charIndex]?.querySelector('.pad');
  if (!pad) return;
  pad.replaceChildren();
  writer = null;

  const charData = await loadCharacter(entry.char);
  if (charRound?.generation !== generation) return;

  if (!charData || !globalThis.HanziWriter) {
    // No geometry: the round still runs on the structural hints, and the
    // learner marks themselves rather than being blocked.
    ui.charFeedback.textContent = 'Stroke data unavailable — write it on paper, then continue.';
    ui.skip.textContent = 'Done';
    return;
  }

  ui.skip.textContent = 'Skip';
  writer = globalThis.HanziWriter.create(pad, entry.char, {
    ...writerOptions(entry.mode, { size: pad.clientWidth || 300 }),
    charDataLoader: (_char, onComplete) => onComplete(charData)
  });

  if (demonstratesFirst(entry.mode)) await writer.animateCharacter();
  if (charRound?.generation !== generation) return;
  startQuiz(entry, charData);
}

function startQuiz(entry, charData) {
  writer.quiz({
    onMistake: () => {
      charRound.attempt = recordStroke(charRound.attempt, false, charData.strokes.length);
    },
    onCorrectStroke: () => {
      charRound.attempt = recordStroke(charRound.attempt, true, charData.strokes.length);
    },
    onComplete: () => finishChar(entry)
  });
}

/** Score the character just written, then move along the word. */
function finishChar(entry) {
  if (!charRound || entry.done) return;
  entry.done = true;

  const generation = charRound.generation;
  const now = Date.now();
  const card = data.chars[entry.char] ?? newCard();
  const success = isSuccess(charRound.attempt);

  data = store.withChars(data, {
    ...data.chars,
    [entry.char]: reviewCharacter(card, charRound.attempt, now)
  });

  // The mode travels with the review. Without it the server could not replay
  // the caps, and would have to guess — in the direction that flatters.
  store.queueReview({
    id: store.newReviewId(),
    kind: 'char',
    item: entry.char,
    mode: entry.mode,
    correct: success,
    reviewedAt: now
  });
  persist();

  charRound.written += 1;
  if (success) charRound.right += 1;

  const explanation = capExplanation(data.chars[entry.char], entry.mode);
  ui.charFeedback.innerHTML = success
    ? `<span class="han">${entry.char}</span> — ${explanation ?? 'good.'}`
    : `<span class="han">${entry.char}</span> — worth another look.`;
  ui.charFeedback.className = `feedback ${success ? 'good' : 'bad'}`;
  ui.roundProgress.style.width = `${(charRound.written / charRound.total) * 100}%`;

  const lastOfWord = charRound.charIndex + 1 >= currentWord().chars.length;

  setTimeout(() => {
    if (!charRound || charRound.generation !== generation || roundType !== 'characters') return;

    if (!lastOfWord) {
      charRound.charIndex += 1;
      return activateChar();
    }
    charRound.index += 1;
    if (charRound.index >= charRound.items.length) return showSummary();
    renderWord();
  }, lastOfWord ? 900 : 550);
}

async function useHint() {
  if (!charRound || ui.write.hidden) return;
  const hint = hintAt(charRound.attempt.char, charRound.hintLevel);
  if (!hint) return;

  charRound.hintLevel = hint.level + 1;
  charRound.attempt = takeHint(charRound.attempt);
  ui.charFeedback.textContent = hint.text;
  ui.charFeedback.className = 'feedback';

  if (hint.reveals === 'outline') writer?.showOutline();
  if (hint.reveals === 'nextStroke') {
    await writer?.highlightStroke?.(charRound.attempt.strokesDrawn);
  }
  ui.charHintBtn.disabled = charRound.hintLevel >= HINT_LEVELS.length;
}

ui.charHintBtn.addEventListener('click', useHint);

ui.showAgain.addEventListener('click', async () => {
  if (!charRound || !writer) return;
  // In the teaching mode watching the animation *is* the mode. In the other two
  // it hands over the whole character, so it costs a hint.
  if (charRound.attempt.mode !== 'teach') charRound.attempt = takeHint(charRound.attempt);

  const generation = charRound.generation;
  await writer.animateCharacter();
  if (charRound?.generation !== generation) return;

  const entry = currentChar();
  const charData = await loadCharacter(entry.char);
  if (charData && charRound?.generation === generation) startQuiz(entry, charData);
});

ui.skip.addEventListener('click', () => {
  if (charRound && !ui.write.hidden) finishChar(currentChar());
});

// ---------------------------------------------------------------- rounds

function startRound() {
  ui.characterEmpty.hidden = true;
  charRound = null;
  writer?.cancelQuiz();
  writer = null;
  roundCredited = false;
  populateDecks();
  renderPracticeRow();
  renderStages();
  renderModes();
  renderScriptToggle();
  if (roundType === 'characters') startCharacterRound();
  else startWordRound();
}

function creditRound({ asked, correct, startedAt }) {
  const today = localDay();
  const before = streakFrom(data.days, today, data.guards);

  data = store.withDays(data, recordRound(data.days, today));

  // The streak is derived from rounds, so a round is the thing that has to
  // reach the server. `localDay` is stamped here, in the learner's own
  // calendar, and treated as opaque text from this point on.
  store.queueRound({
    id: store.newReviewId(),
    type: roundType,
    localDay: today,
    deckId: ui.deck.value,
    stages: stages.join(','),
    direction: roundType === 'words' ? ui.direction.value : 'n/a',
    asked,
    correct,
    startedAt,
    endedAt: Date.now()
  });

  // Finishing a round picks the streak up again by itself — nobody should have
  // to remember to turn their own guard off.
  let released = false;
  if (manualGuardOn(data.guards, today) === GUARD.GUARDED) {
    data = store.withGuards(data, [...data.guards, guardEvent(GUARD.ACTIVE, today)]);
    released = true;
  }
  persist();

  return { before, after: streakFrom(data.days, today, data.guards), released };
}

function showSummary() {
  // Answering schedules advance() on a timer and Enter calls it too, so the end
  // of a round can be reached more than once. Crediting the day is not
  // idempotent, so it is gated here rather than by only being called once.
  if (roundCredited) return;
  roundCredited = true;

  const wasWords = roundType === 'words';
  const asked = wasWords ? game.state.asked : charRound.total;
  const correct = wasWords ? game.state.correct : charRound.right;

  const streaks = creditRound({
    asked,
    correct,
    startedAt: wasWords ? game.state.startedAt : charRound.startedAt
  });

  ui.play.hidden = true;
  ui.write.hidden = true;
  ui.summary.hidden = false;

  populateDecks();
  renderPracticeRow();
  renderStages();
  renderScoreboard();
  ui.roundProgress.style.width = '100%';

  const accuracy = asked === 0 ? 0 : correct / asked;

  ui.summaryTitle.textContent = wasWords ? 'Round complete!' : 'Characters done!';
  ui.summaryAccuracy.textContent = `${Math.round(accuracy * 100)}%`;
  ui.summaryToday.textContent = `${streaks.after.roundsToday}/${DAILY_GOAL}`;
  ui.summaryLongest.textContent = streaks.after.longest;

  if (wasWords) {
    ui.summaryMastered.textContent = game.masteredCount();
    ui.summaryMasteredLabel.textContent = 'words mastered';
  } else {
    const unlocked = availableCharacters(data.cards, data.prefs.characterSource).map((char) => data.chars[char.char] ?? newCard());
    ui.summaryMastered.textContent = unlocked.filter(isMastered).length;
    ui.summaryMasteredLabel.textContent = 'characters you can write';
  }

  // Crossing a threshold mid-round is the reward; call it out first.
  const depth = unlockedDepth(ui.deck.value, data.cards);
  const opened = wasWords && depth > depthAtRoundStart;
  ui.unlockBanner.hidden = !opened;
  if (opened) ui.unlockBanner.textContent = `🔓 ${STAGE_NAMES[depth]} unlocked!`;
  depthAtRoundStart = depth;

  renderGoalBanner(streaks);

  // After the summary is up, so the notice lands on top of it rather than being
  // the first thing seen and hiding what the round achieved.
  if (streaks.released) noticeGuard(GUARD.ACTIVE, true);

  syncProgress();
}

function renderGoalBanner(streaks) {
  const { after, before } = streaks;
  if (after.hitToday && !before.hitToday) {
    ui.goalBanner.hidden = false;
    ui.goalBanner.className = 'goal-banner';
    ui.goalBanner.textContent =
      after.current > 1 ? `🎯 Goal met — ${after.current} days running!` : '🎯 Daily goal met!';
    return;
  }
  if (!after.hitToday && after.current > 0 && after.graceDaysLeft < GRACE_DAYS) {
    ui.goalBanner.hidden = false;
    ui.goalBanner.className = 'goal-banner warning';
    ui.goalBanner.textContent =
      `${DAILY_GOAL - after.roundsToday} more round${DAILY_GOAL - after.roundsToday === 1 ? '' : 's'} to keep the streak.`;
    return;
  }
  ui.goalBanner.hidden = true;
}

ui.again.addEventListener('click', startRound);

// ------------------------------------------------------------ streak guard

function noticeGuard(state, released = false) {
  ui.guardNoticeTitle.textContent = released ? 'Streak guard off' : 'Streak guard on';
  ui.guardNoticeBody.textContent = released
    ? 'You finished a round, so your streak is running again. Nothing to turn off.'
    : 'Your streak is held until you turn this off, or until you finish a round.';
  ui.guardNotice.showModal();
  void state;
}

function openGuardDialog() {
  const today = localDay();
  const on = manualGuardOn(data.guards, today) === GUARD.GUARDED;
  const streak = streakFrom(data.days, today, data.guards);

  ui.guardBody.textContent = on
    ? `Your ${streak.current}-day streak is being held.`
    : streak.current > 0
      ? `Your streak is ${streak.current} day${streak.current === 1 ? '' : 's'} long, with ${streak.graceDaysLeft} of grace left.`
      : 'No streak to hold yet — finish five rounds today to start one.';
  ui.guardToggle.textContent = on ? 'Turn it off' : 'Hold my streak';
  ui.guardDialog.showModal();
}

ui.guardShield.addEventListener('click', openGuardDialog);
el('streak-stat').addEventListener('click', openGuardDialog);
ui.guardClose.addEventListener('click', () => ui.guardDialog.close());
ui.guardNoticeOk.addEventListener('click', () => ui.guardNotice.close());

ui.guardToggle.addEventListener('click', () => {
  const today = localDay();
  const on = manualGuardOn(data.guards, today) === GUARD.GUARDED;
  data = store.withGuards(data, [...data.guards, guardEvent(on ? GUARD.ACTIVE : GUARD.GUARDED, today)]);
  persist();
  ui.guardDialog.close();
  renderScoreboard();
  if (!on) noticeGuard(GUARD.GUARDED);
});

// The warning line offers to pause the streak; the offer has to work.
ui.scoreboardNote.addEventListener('click', (event) => {
  if (event.target.closest('[data-open-guard]')) openGuardDialog();
});


// ------------------------------------------------------------- account

/**
 * Ask the server who we are.
 *
 * A null answer means there is no API behind this copy of the app — it is
 * being served by a plain static host — so the account controls stay hidden
 * rather than offering something that cannot work.
 */
async function refreshAuth() {
  const me = await fetchMe();
  if (!me) {
    ui.auth.hidden = true;
    signedIn = false;
    return;
  }

  ui.auth.hidden = false;
  signedIn = me.signedIn;
  ui.signIn.hidden = signedIn;
  ui.authUser.hidden = !signedIn;
  ui.account.hidden = !signedIn;
  ui.authName.textContent = me.name ?? '';
}

/**
 * Push what this device has done and pull what every other device has.
 *
 * Both directions in one request, because that is what makes the merge safe:
 * the reviews just uploaded are already in the log when the server folds, so
 * the cards coming back can never be behind what was sent.
 *
 * Failure is silent and harmless. The outbox is only cleared for the ids the
 * server confirms, so an unreachable server means the work waits rather than
 * being lost.
 */
async function syncProgress() {
  if (!signedIn) return;

  const first = data.syncedAt === 0;
  const result = await pushPull({
    since: data.syncedAt,
    reviews: store.readOutbox(),
    rounds: store.readRoundOutbox(),
    guards: data.guards,
    // Only on a first sync: progress earned in this browser before there was
    // an account, handed over as snapshots rather than as invented history.
    imports: first ? store.importSeeds(data) : [],
    days: first ? store.dayHandover(data) : []
  });
  if (!result) return;

  store.clearQueued(result.accepted ?? []);
  store.clearQueuedRounds(result.acceptedRounds ?? []);

  // Server cards win: they are the fold over every device's history, including
  // the answers this request just delivered.
  data = store.withCards(data, { ...data.cards, ...result.cards });
  data = store.withChars(data, { ...data.chars, ...result.chars });
  data = store.withDays(data, { ...data.days, ...result.days });
  data = store.withGuards(data, [...data.guards, ...(result.guards ?? [])]);
  data = store.withSyncedAt(data, result.serverTime);
  persist();

  // A round in progress works from its own copy of the cards, taken when it
  // started. Without this hand-off the next answer would write that stale copy
  // straight back over everything the sync just brought in.
  game?.adoptCards(data.cards);

  populateDecks();
  renderPracticeRow();
  renderStages();
  renderScoreboard();
}

function openAccount() {
  ui.accountBody.textContent = signedIn
    ? 'Your progress is saved to your account and follows you to any browser you sign in on.'
    : 'Sign in to keep your progress across devices.';
  ui.signOut.hidden = !signedIn;
  ui.accountDanger.hidden = !signedIn;
  ui.accountDialog.showModal();
}

ui.account.addEventListener('click', openAccount);
ui.accountClose.addEventListener('click', () => ui.accountDialog.close());

ui.signOut.addEventListener('click', async () => {
  await endSession();
  ui.accountDialog.close();
  location.assign('/');
});

ui.deleteStart.addEventListener('click', () => {
  ui.accountDialog.close();
  ui.deleteDialog.showModal();
});
ui.deleteCancel.addEventListener('click', () => ui.deleteDialog.close());

ui.deleteContinue.addEventListener('click', () => {
  ui.deleteDialog.close();
  ui.deleteTyped.value = '';
  ui.deleteConfirm.disabled = true;
  ui.deleteStatus.textContent = '';
  ui.deleteFinal.showModal();
});
ui.deleteFinalCancel.addEventListener('click', () => ui.deleteFinal.close());

// Typing the word is the confirmation. The button stays inert until it matches,
// so the irreversible action cannot be reached by a stray double-click.
ui.deleteTyped.addEventListener('input', () => {
  ui.deleteConfirm.disabled = ui.deleteTyped.value.trim().toLowerCase() !== 'delete';
});

ui.deleteConfirm.addEventListener('click', async () => {
  ui.deleteConfirm.disabled = true;
  say(ui.deleteStatus, 'Deleting…', '');

  // Local progress is only wiped once the server confirms. Guessing would
  // leave somebody believing their data is gone when it is not.
  if (!(await deleteAccount())) {
    say(ui.deleteStatus, 'That did not work. Nothing was deleted.', 'bad');
    ui.deleteConfirm.disabled = false;
    return;
  }
  store.reset();
  location.assign('/');
});

/**
 * The Google round trip comes back as ?auth=ok or ?auth=failed. Read it, say
 * something, then strip it — a reload should not repeat the message, and the
 * address bar should not keep carrying it.
 */
function readAuthResult() {
  const params = new URLSearchParams(location.search);
  const result = params.get('auth');
  if (!result) return;

  if (result === 'failed') {
    ui.authNote.hidden = false;
    ui.authNote.textContent = 'Sign-in did not complete. Try again.';
  }
  history.replaceState(null, '', location.pathname);
}

// ------------------------------------------------------------- transfer

function openTransfer() {
  ui.transferOut.value = store.exportProgress(data);
  ui.transferIn.value = '';
  ui.transferStatus.textContent = '';
  ui.transferStatus.className = 'transfer-status';
  ui.transferDialog.showModal();
}

ui.openTransfer.addEventListener('click', openTransfer);
ui.transferClose.addEventListener('click', () => ui.transferDialog.close());

ui.transferCopy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(ui.transferOut.value);
    say(ui.transferStatus, 'Copied.', 'good');
  } catch {
    ui.transferOut.select();
    say(ui.transferStatus, 'Press ⌘C or Ctrl+C to copy.', 'bad');
  }
});

ui.transferImport.addEventListener('click', () => {
  try {
    const incoming = store.parseProgress(ui.transferIn.value.trim());
    data = { ...data, ...incoming };
    persist();
    ui.transferDialog.close();
    startRound();
  } catch (error) {
    say(ui.transferStatus, error.message, 'bad');
  }
});

function say(node, text, tone) {
  node.textContent = text;
  node.className = `transfer-status ${tone}`;
}

// ----------------------------------------------------------------- share

/**
 * navigator.share is the right thing on a phone — it opens the system sheet —
 * and a cancelled sheet rejects with AbortError, which is somebody changing
 * their mind, not a failure to report.
 */
async function share() {
  const url = location.href.split('#')[0];

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Wenmang', text: 'Mandarin words and characters', url });
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

// --------------------------------------------------------------- settings

ui.characterSource.addEventListener('change', () => {
  data = store.withPrefs(data, { characterSource: ui.characterSource.value });
  persist();
  startRound();
});

ui.deck.addEventListener('change', () => {
  stages = [0];
  startRound();
});

ui.direction.addEventListener('change', () => {
  if (roundType === 'words') startWordRound();
});

ui.scriptToggle.addEventListener('click', () => {
  data = store.withPrefs(data, { script: cycleScript(data.prefs.script) });
  persist();
  renderScriptToggle();

  // Mid-question, only the prompt changes — reshuffling the buttons under
  // somebody's hand would hand them a different question from the one they were
  // part-way through answering.
  if (game?.state.question && ui.play.hidden === false) {
    game.setScript(data.prefs.script);
    const question = game.state.question;
    ui.prompt.textContent = question.prompt;
    ui.prompt.classList.toggle('is-hanzi', question.promptIsHanzi);
    ui.promptSub.textContent = question.promptSub;
    fitPrompt();
  }
});

/**
 * "Mixed (recommended)" does not fit a phone's select, and a native option
 * cannot be trimmed with CSS — it truncates to "Mixed (reco…", which reads as a
 * mistake. The word is dropped where there is no room for it.
 */
function fitDirectionOption() {
  const option = ui.direction.querySelector('option[data-full]');
  if (!option) return;
  option.textContent = window.innerWidth < 460 ? option.dataset.short : option.dataset.full;
}

// ---------------------------------------------------------------- keyboard

document.addEventListener('keydown', (event) => {
  // A dialog owns the keyboard while it is up. The transfer one has text
  // fields, where digits have to type rather than answer.
  if (document.querySelector('dialog[open]')) return;

  if (!ui.write.hidden && (event.key === 'h' || event.key === 'H')) {
    useHint();
    return;
  }

  if (event.key >= '1' && event.key <= '4' && !ui.play.hidden) {
    // Once answered, every choice is disabled and the digits have no question
    // left to answer — so they carry on instead. The hand is already there.
    if (game?.state.lastAnswer) advance();
    else {
      const button = ui.choices.children[Number(event.key) - 1];
      if (button && !button.disabled) button.click();
    }
  }

  if (event.key === 'Enter') {
    if (!ui.summary.hidden) startRound();
    else if (!ui.play.hidden) advance();
  }
});

// Tapping the card carries on after a miss — a phone has no Enter key.
ui.play.addEventListener('click', (event) => {
  if (event.target.closest('.choice')) return;
  if (game?.state.lastAnswer) advance();
});

// Explaining a tile on hover, and on focus so it also works by keyboard and by
// tapping on a phone, where there is no hover at all.
for (const tile of document.querySelectorAll('[data-tip]')) {
  const show = () => { hoveredTip = tile.dataset.tip; renderNote(); };
  const hide = () => { hoveredTip = null; renderNote(); };
  tile.addEventListener('mouseenter', show);
  tile.addEventListener('focus', show);
  tile.addEventListener('mouseleave', hide);
  tile.addEventListener('blur', hide);
}

window.addEventListener('resize', () => {
  fitDirectionOption();
  if (!ui.play.hidden) fitPrompt();
});

// ------------------------------------------------------------------- boot

ui.attribution.textContent =
  `${ATTRIBUTION} Radical and stroke-count data from the Unicode Han Database.`;

// AUTO_MODE means "follow each card", which is null to everything downstream.
preferredMode = data.prefs.mode === store.AUTO_MODE ? null : data.prefs.mode;

populateDecks();
ui.direction.value = MIXED;
fitDirectionOption();
startRound();

readAuthResult();
// Sign-in state first, then a sync: the sync is a no-op until we know there is
// an account behind it.
refreshAuth().then(syncProgress);

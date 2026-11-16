// 타일 합치기 — 화면 렌더, 입력, 저장, 테마, 스크린리더 알림
import { canMove, createGame, move } from './game.js';

const SIZE = 4;
const SLIDE_MS = 120;
const SWIPE_MIN = 30;
const BEST_KEY = 'tile-merge:best';
const STATE_KEY = 'tile-merge:state';
const THEME_KEY = 'theme';

const $ = (selector) => document.querySelector(selector);

const els = {
  board: $('#board'),
  cells: $('.cell-layer'),
  tiles: $('#tile-layer'),
  score: $('#score'),
  best: $('#best'),
  scoreFloat: $('#score-float'),
  newGame: $('#new-game'),
  overlay: $('#overlay'),
  finalScore: $('#final-score'),
  overlayBest: $('#overlay-best'),
  retry: $('#retry'),
  live: $('#live'),
  alert: $('#alert'),
  themeToggle: $('.theme-toggle'),
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- 저장소 (사생활 보호 모드에서도 동작하도록 try/catch) ---------- */

const storageGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const storageSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장 불가 시 무시
  }
};

const isValidGrid = (grid) => Array.isArray(grid)
  && grid.length === SIZE
  && grid.every((row) => Array.isArray(row) && row.length === SIZE
    && row.every((v) => Number.isInteger(v) && v >= 0 && (v === 0 || (v >= 2 && (v & (v - 1)) === 0))));

const loadState = () => {
  try {
    const data = JSON.parse(storageGet(STATE_KEY));
    if (data && isValidGrid(data.grid) && Number.isInteger(data.score) && data.score >= 0
      && typeof data.over === 'boolean') {
      // 저장된 over 값과 무관하게 판 상태로 다시 판정해, 막힌 판이 오버레이 없이 멈추지 않게 한다
      return { grid: data.grid, score: data.score, over: data.over || !canMove(data.grid) };
    }
  } catch {
    // 깨진 값은 무시
  }
  return null;
};

const saveState = (state) => storageSet(STATE_KEY, JSON.stringify(state));

const loadBest = () => {
  const value = Number(storageGet(BEST_KEY));
  return Number.isInteger(value) && value > 0 ? value : 0;
};

/* ---------- 테마 ---------- */

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  const label = theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';
  els.themeToggle.setAttribute('aria-label', label);
  els.themeToggle.title = label;
};

const initTheme = () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  els.themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    storageSet(THEME_KEY, next);
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    if (!storageGet(THEME_KEY)) applyTheme(event.matches ? 'dark' : 'light');
  });
};

/* ---------- 게임 상태 ---------- */

let state = null;
let best = 0;
let bestAtStart = 0;
let ids = [];
let nextId = 1;
const tileEls = new Map();
let pending = null;

/* ---------- 타일 렌더 ---------- */

const setTileValue = (el, value) => {
  el.dataset.value = String(value);
  el.dataset.digits = String(Math.min(String(value).length, 5));
  el.classList.toggle('is-super', value >= 512);
  el.firstChild.textContent = String(value);
};

const setTilePos = (el, { r, c }) => {
  el.style.setProperty('--r', String(r));
  el.style.setProperty('--c', String(c));
};

const createTile = (value, pos, extraClass) => {
  const id = nextId;
  nextId += 1;
  const el = document.createElement('div');
  el.className = 'tile';
  const inner = document.createElement('div');
  inner.className = 'tile-inner';
  el.append(inner);
  setTileValue(el, value);
  setTilePos(el, pos);
  if (extraClass) el.classList.add(extraClass);
  els.tiles.append(el);
  tileEls.set(id, el);
  return id;
};

const removeTile = (id) => {
  tileEls.get(id)?.remove();
  tileEls.delete(id);
};

const emptyIds = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

// 상태 전체를 다시 그린다 (시작·불러오기·새 게임)
const renderAll = () => {
  tileEls.forEach((el) => el.remove());
  tileEls.clear();
  ids = emptyIds();
  state.grid.forEach((row, r) => row.forEach((value, c) => {
    if (value) ids[r][c] = createTile(value, { r, c });
  }));
};

// 진행 중인 애니메이션을 끝 상태로 즉시 마무리
const finishPending = () => {
  if (!pending) return;
  clearTimeout(pending.timer);
  const { run } = pending;
  pending = null;
  run();
};

// move()의 tiles 정보로 이동 애니메이션 후 합치기·새 타일을 반영한다
const animateMove = (tiles) => {
  const nextIds = emptyIds();
  const toRemove = [];
  const toCreate = [];

  tiles.forEach((tile) => {
    if (tile.from) {
      const id = ids[tile.from.r][tile.from.c];
      setTilePos(tileEls.get(id), tile.to);
      nextIds[tile.to.r][tile.to.c] = id;
    } else if (tile.mergedFrom) {
      tile.mergedFrom.forEach((src) => {
        const id = ids[src.r][src.c];
        setTilePos(tileEls.get(id), tile.to);
        toRemove.push(id);
      });
      toCreate.push({ tile, cls: 'is-merged' });
    } else if (tile.isNew) {
      toCreate.push({ tile, cls: 'is-new' });
    }
  });
  ids = nextIds;

  const run = () => {
    toRemove.forEach(removeTile);
    toCreate.forEach(({ tile, cls }) => {
      ids[tile.to.r][tile.to.c] = createTile(tile.value, tile.to, reducedMotion.matches ? null : cls);
    });
  };

  if (reducedMotion.matches) {
    run();
  } else {
    pending = { run, timer: setTimeout(() => finishPending(), SLIDE_MS) };
  }
};

/* ---------- 점수·안내 ---------- */

const showScoreFloat = (gained) => {
  if (reducedMotion.matches) return;
  const el = document.createElement('span');
  el.className = 'score-float';
  el.textContent = `+${gained}`;
  el.addEventListener('animationend', () => el.remove());
  els.scoreFloat.append(el);
  setTimeout(() => el.remove(), 800);
};

const renderScores = () => {
  els.score.textContent = String(state.score);
  els.best.textContent = String(best);
};

const updateBest = () => {
  if (state.score > best) {
    best = state.score;
    storageSet(BEST_KEY, String(best));
  }
};

const renderOverlay = (announce) => {
  if (!state.over) {
    els.overlay.hidden = true;
    els.alert.textContent = '';
    return;
  }
  els.finalScore.textContent = String(state.score);
  els.overlayBest.hidden = !(state.score > bestAtStart && state.score >= best);
  els.overlay.hidden = false;
  if (announce) {
    els.alert.textContent = `게임 종료. 최종 점수 ${state.score}점`;
    els.retry.focus();
  }
};

/* ---------- 게임 흐름 ---------- */

const startNewGame = () => {
  finishPending();
  state = createGame(SIZE);
  bestAtStart = best;
  saveState(state);
  renderAll();
  renderScores();
  renderOverlay(false);
  els.live.textContent = '';
};

const handleMove = (direction) => {
  if (!state || state.over) return false;
  finishPending();
  const result = move(state, direction);
  if (!result.moved) return true;

  state = result.state;
  updateBest();
  saveState(state);
  animateMove(result.tiles);
  renderScores();

  if (result.gained > 0) {
    showScoreFloat(result.gained);
    els.live.textContent = `점수 ${state.score}, ${result.gained}점 획득`;
  }
  if (state.over) {
    finishPending();
    renderOverlay(true);
  }
  return true;
};

/* ---------- 입력 ---------- */

const KEY_DIRECTIONS = {
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

const isTypingTarget = (target) => target instanceof HTMLElement
  && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const onKeyDown = (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (isTypingTarget(event.target)) return;
  const direction = KEY_DIRECTIONS[event.key.toLowerCase()];
  if (!direction || !state || state.over) return;
  event.preventDefault();
  handleMove(direction);
};

let swipeStart = null;

const onPointerDown = (event) => {
  // 게임 오버 중에는 캡처하지 않아 "다시 하기" 버튼 클릭을 방해하지 않는다
  if (!state || state.over) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  swipeStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  try {
    els.board.setPointerCapture(event.pointerId);
  } catch {
    // 캡처 실패해도 스와이프는 동작
  }
};

const onPointerUp = (event) => {
  if (!swipeStart || swipeStart.id !== event.pointerId) return;
  const dx = event.clientX - swipeStart.x;
  const dy = event.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    handleMove(dx > 0 ? 'right' : 'left');
  } else {
    handleMove(dy > 0 ? 'down' : 'up');
  }
};

const onPointerCancel = () => {
  swipeStart = null;
};

/* ---------- 시작 ---------- */

const buildCells = () => {
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    els.cells.append(document.createElement('span'));
  }
};

const init = () => {
  initTheme();
  buildCells();
  best = loadBest();
  const saved = loadState();
  if (saved) {
    state = saved;
    if (state.score > best) {
      best = state.score;
      storageSet(BEST_KEY, String(best));
    }
    bestAtStart = best;
    renderAll();
    renderScores();
    renderOverlay(false);
  } else {
    startNewGame();
  }

  document.addEventListener('keydown', onKeyDown);
  els.board.addEventListener('pointerdown', onPointerDown);
  els.board.addEventListener('pointerup', onPointerUp);
  els.board.addEventListener('pointercancel', onPointerCancel);
  els.newGame.addEventListener('click', startNewGame);
  els.retry.addEventListener('click', () => {
    startNewGame();
    els.board.focus();
  });
};

init();

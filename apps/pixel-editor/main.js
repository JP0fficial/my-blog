// 픽셀 아트 에디터 — 화면 렌더, 포인터/키보드 입력, PNG 저장, 저장소, 테마, 스크린리더 알림
import {
  COLOR_RE,
  PALETTE,
  createGrid,
  createHistory,
  deserialize,
  floodFill,
  lineCells,
  pushHistory,
  redo,
  serialize,
  setPixel,
  undo,
} from './editor.js';

const SIZE = 16;
const ART_KEY = 'pixel-editor:art';
const SETTINGS_KEY = 'pixel-editor:settings';
const THEME_KEY = 'theme';
const TOOLS = ['pen', 'eraser', 'fill'];
const TOOL_NAMES = { pen: '펜', eraser: '지우개', fill: '채우기' };
const SCALES = [1, 8, 16, 32];
const DEFAULT_SETTINGS = { tool: 'pen', color: '#000000', grid: true, scale: 16 };

const $ = (selector) => document.querySelector(selector);

const els = {
  canvas: $('#canvas'),
  gridOverlay: $('#grid-overlay'),
  cursor: $('#cursor'),
  toolButtons: [...document.querySelectorAll('[data-tool]')],
  undo: $('#undo'),
  redo: $('#redo'),
  currentSwatch: $('#current-swatch'),
  currentText: $('#current-text'),
  palette: $('#palette'),
  custom: $('#custom-color'),
  gridToggle: $('#grid-toggle'),
  clear: $('#clear'),
  scale: $('#scale'),
  save: $('#save-png'),
  live: $('#live'),
  themeToggle: $('.theme-toggle'),
};

const ctx = els.canvas.getContext('2d');

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

const loadArt = () => {
  const data = deserialize(storageGet(ART_KEY));
  return data && data.size === SIZE ? data.grid : createGrid(SIZE);
};

const loadSettings = () => {
  const settings = { ...DEFAULT_SETTINGS };
  try {
    const data = JSON.parse(storageGet(SETTINGS_KEY));
    if (!data || typeof data !== 'object') return settings;
    if (TOOLS.includes(data.tool)) settings.tool = data.tool;
    if (typeof data.color === 'string' && COLOR_RE.test(data.color)) settings.color = data.color;
    if (typeof data.grid === 'boolean') settings.grid = data.grid;
    if (SCALES.includes(data.scale)) settings.scale = data.scale;
  } catch {
    // 깨진 값은 무시
  }
  return settings;
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

/* ---------- 상태 ---------- */

let grid = createGrid(SIZE);
let history = createHistory(50);
let settings = { ...DEFAULT_SETTINGS };
let stroke = null; // { pointerId, start, last: [x, y] }
let cursor = { x: 0, y: 0 };
let frameRequested = false;

const announce = (message) => {
  // 같은 문구도 다시 읽히도록 비운 뒤 채운다
  els.live.textContent = '';
  requestAnimationFrame(() => {
    els.live.textContent = message;
  });
};

const saveArt = () => storageSet(ART_KEY, serialize(grid, SIZE));
const saveSettings = () => storageSet(SETTINGS_KEY, JSON.stringify(settings));

const colorName = (value) => {
  const found = PALETTE.find((item) => item.value === value);
  return found ? found.name : '사용자 지정';
};

const colorLabel = (value) => `${colorName(value)} (${value})`;

/* ---------- 렌더 ---------- */

const draw = () => {
  frameRequested = false;
  ctx.clearRect(0, 0, SIZE, SIZE);
  grid.forEach((color, index) => {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(index % SIZE, Math.floor(index / SIZE), 1, 1);
  });
};

const requestDraw = () => {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(draw);
};

const renderHistoryButtons = () => {
  els.undo.disabled = history.past.length === 0;
  els.redo.disabled = history.future.length === 0;
};

const renderTool = () => {
  els.toolButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.tool === settings.tool));
  });
};

const renderColor = () => {
  els.currentSwatch.style.backgroundColor = settings.color;
  els.currentText.textContent = `현재 색: ${colorLabel(settings.color)}`;
  const inPalette = PALETTE.some((item) => item.value === settings.color);
  els.palette.querySelectorAll('button.swatch').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.color === settings.color));
  });
  els.custom.classList.toggle('is-selected', !inPalette);
};

const renderGridToggle = () => {
  els.gridOverlay.hidden = !settings.grid;
  els.gridToggle.setAttribute('aria-pressed', String(settings.grid));
};

const renderCursor = () => {
  els.cursor.style.setProperty('--x', String(cursor.x));
  els.cursor.style.setProperty('--y', String(cursor.y));
};

const buildPalette = () => {
  PALETTE.forEach(({ name, value }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.dataset.color = value;
    button.style.backgroundColor = value;
    button.setAttribute('aria-label', name);
    button.setAttribute('aria-pressed', 'false');
    button.title = `${name} (${value})`;
    button.addEventListener('click', () => selectColor(value));
    els.palette.append(button);
  });
};

/* ---------- 상태 변경 ---------- */

const selectTool = (tool) => {
  if (!TOOLS.includes(tool)) return;
  settings.tool = tool;
  renderTool();
  saveSettings();
  announce(`${TOOL_NAMES[tool]} 도구`);
};

const selectColor = (value) => {
  settings.color = value;
  // 지우개 상태에서 색을 고르면 펜으로 돌아가 바로 칠할 수 있게 한다
  const switched = settings.tool === 'eraser';
  if (switched) {
    settings.tool = 'pen';
    renderTool();
  }
  renderColor();
  saveSettings();
  announce(`${switched ? '펜 도구, ' : ''}현재 색: ${colorLabel(value)}`);
};

const toggleGrid = () => {
  settings.grid = !settings.grid;
  renderGridToggle();
  saveSettings();
  announce(settings.grid ? '격자선 표시' : '격자선 숨김');
};

// 한 번의 동작으로 바뀐 그림을 기록에 남기고 저장
const commit = (before) => {
  if (grid === before) return;
  history = pushHistory(history, before);
  renderHistoryButtons();
  saveArt();
};

const toolColor = () => (settings.tool === 'eraser' ? null : settings.color);

const paintCell = (x, y) => {
  grid = setPixel(grid, SIZE, x, y, toolColor());
};

const doUndo = () => {
  if (stroke || history.past.length === 0) return;
  ({ history, grid } = undo(history, grid));
  renderHistoryButtons();
  requestDraw();
  saveArt();
  announce('실행 취소');
};

const doRedo = () => {
  if (stroke || history.future.length === 0) return;
  ({ history, grid } = redo(history, grid));
  renderHistoryButtons();
  requestDraw();
  saveArt();
  announce('다시 실행');
};

const clearAll = () => {
  if (stroke) return;
  const before = grid;
  if (grid.some((color) => color !== null)) grid = createGrid(SIZE);
  commit(before);
  requestDraw();
  announce('전체 지움');
};

// 키보드(Space/Enter)로 현재 칸에 도구 적용 — 한 번 = 기록 1건
const applyAtCursor = () => {
  const before = grid;
  if (settings.tool === 'fill') {
    grid = floodFill(grid, SIZE, cursor.x, cursor.y, settings.color);
  } else {
    paintCell(cursor.x, cursor.y);
  }
  commit(before);
  requestDraw();
};

/* ---------- 포인터 입력 ---------- */

const cellFromEvent = (event) => {
  const rect = els.canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * SIZE);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * SIZE);
  return [x, y];
};

const inside = ([x, y]) => x >= 0 && y >= 0 && x < SIZE && y < SIZE;

const onPointerDown = (event) => {
  if (stroke || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const cell = cellFromEvent(event);
  if (!inside(cell)) return;
  event.preventDefault();
  els.canvas.focus({ preventScroll: true });
  els.cursor.hidden = true;
  [cursor.x, cursor.y] = cell;
  renderCursor();

  if (settings.tool === 'fill') {
    const before = grid;
    grid = floodFill(grid, SIZE, cell[0], cell[1], settings.color);
    commit(before);
    requestDraw();
    return;
  }

  stroke = { pointerId: event.pointerId, start: grid, last: cell };
  try {
    els.canvas.setPointerCapture(event.pointerId);
  } catch {
    // 포인터가 이미 사라진 경우 등 — 캡처 없이도 획은 진행한다
  }
  paintCell(cell[0], cell[1]);
  requestDraw();
};

const onPointerMove = (event) => {
  if (!stroke || event.pointerId !== stroke.pointerId) return;
  const cell = cellFromEvent(event);
  const [lx, ly] = stroke.last;
  if (cell[0] === lx && cell[1] === ly) return;
  // 빠르게 움직여도 끊기지 않도록 직전 칸부터 직선으로 잇는다 (범위 밖 칸은 setPixel이 무시)
  lineCells(lx, ly, cell[0], cell[1]).forEach(([x, y]) => paintCell(x, y));
  stroke.last = cell;
  requestDraw();
};

const endStroke = (event) => {
  if (!stroke || event.pointerId !== stroke.pointerId) return;
  const { start } = stroke;
  stroke = null;
  commit(start);
};

/* ---------- 키보드 입력 ---------- */

const ARROWS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const onCanvasKeyDown = (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (ARROWS[event.key]) {
    event.preventDefault();
    const [dx, dy] = ARROWS[event.key];
    cursor.x = Math.min(SIZE - 1, Math.max(0, cursor.x + dx));
    cursor.y = Math.min(SIZE - 1, Math.max(0, cursor.y + dy));
    els.cursor.hidden = false;
    renderCursor();
    return;
  }
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    els.cursor.hidden = false;
    applyAtCursor();
  }
};

const isTypingTarget = (target) => target instanceof Element
  && target.matches('input, select, textarea, [contenteditable="true"]');

const onDocumentKeyDown = (event) => {
  if (isTypingTarget(event.target) || event.altKey) return;
  const key = event.key.toLowerCase();
  const mod = event.ctrlKey || event.metaKey;

  if (mod) {
    if (key === 'z' && event.shiftKey) {
      event.preventDefault();
      doRedo();
    } else if (key === 'z') {
      event.preventDefault();
      doUndo();
    } else if (key === 'y' && event.ctrlKey) {
      event.preventDefault();
      doRedo();
    }
    return;
  }
  if (event.shiftKey) return;
  if (key === 'b') selectTool('pen');
  else if (key === 'e') selectTool('eraser');
  else if (key === 'f') selectTool('fill');
  else if (key === 'g') toggleGrid();
};

/* ---------- PNG 저장 ---------- */

const pad = (n) => String(n).padStart(2, '0');

const fileName = (date = new Date()) => {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `pixel-art-${day}-${time}.png`;
};

const renderExportCanvas = (scale) => {
  const out = document.createElement('canvas');
  out.width = SIZE * scale;
  out.height = SIZE * scale;
  const outCtx = out.getContext('2d');
  outCtx.imageSmoothingEnabled = false;
  grid.forEach((color, index) => {
    if (!color) return;
    outCtx.fillStyle = color;
    outCtx.fillRect((index % SIZE) * scale, Math.floor(index / SIZE) * scale, scale, scale);
  });
  return out;
};

const savePng = () => {
  const out = renderExportCanvas(settings.scale);
  out.toBlob((blob) => {
    if (!blob) {
      console.error('PNG 생성 실패');
      announce('PNG 저장에 실패했습니다');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName();
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('PNG 저장됨');
  }, 'image/png');
};

/* ---------- 시작 ---------- */

const init = () => {
  initTheme();
  buildPalette();
  grid = loadArt();
  settings = loadSettings();
  if (!PALETTE.some((item) => item.value === settings.color)) els.custom.value = settings.color;
  els.scale.value = String(settings.scale);

  renderTool();
  renderColor();
  renderGridToggle();
  renderHistoryButtons();
  renderCursor();
  draw();

  els.toolButtons.forEach((button) => {
    button.addEventListener('click', () => selectTool(button.dataset.tool));
  });
  els.undo.addEventListener('click', doUndo);
  els.redo.addEventListener('click', doRedo);
  els.custom.addEventListener('input', () => selectColor(els.custom.value));
  els.custom.addEventListener('click', () => {
    if (settings.color !== els.custom.value) selectColor(els.custom.value);
  });
  els.gridToggle.addEventListener('click', toggleGrid);
  els.clear.addEventListener('click', clearAll);
  els.scale.addEventListener('change', () => {
    const value = Number(els.scale.value);
    if (!SCALES.includes(value)) return;
    settings.scale = value;
    saveSettings();
  });
  els.save.addEventListener('click', savePng);

  els.canvas.addEventListener('pointerdown', onPointerDown);
  els.canvas.addEventListener('pointermove', onPointerMove);
  els.canvas.addEventListener('pointerup', endStroke);
  els.canvas.addEventListener('pointercancel', endStroke);
  els.canvas.addEventListener('lostpointercapture', endStroke);
  els.canvas.addEventListener('keydown', onCanvasKeyDown);
  els.canvas.addEventListener('blur', () => {
    els.cursor.hidden = true;
  });
  document.addEventListener('keydown', onDocumentKeyDown);
};

init();

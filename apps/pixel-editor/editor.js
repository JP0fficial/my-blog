// 픽셀 아트 에디터 — 순수 로직 (DOM·canvas·localStorage 접근 없음)

export const PALETTE = [
  { name: '검정', value: '#000000' },
  { name: '진회색', value: '#4b5563' },
  { name: '회색', value: '#9ca3af' },
  { name: '흰색', value: '#ffffff' },
  { name: '빨강', value: '#ef4444' },
  { name: '주황', value: '#f97316' },
  { name: '노랑', value: '#facc15' },
  { name: '연두', value: '#84cc16' },
  { name: '초록', value: '#16a34a' },
  { name: '청록', value: '#14b8a6' },
  { name: '하늘', value: '#38bdf8' },
  { name: '파랑', value: '#2563eb' },
  { name: '남색', value: '#3730a3' },
  { name: '보라', value: '#9333ea' },
  { name: '분홍', value: '#ec4899' },
  { name: '갈색', value: '#92400e' },
];

export const COLOR_RE = /^#[0-9a-f]{6}$/;

const inBounds = (size, x, y) => Number.isInteger(x) && Number.isInteger(y)
  && x >= 0 && y >= 0 && x < size && y < size;

// 빈(투명) 격자
export const createGrid = (size = 16) => new Array(size * size).fill(null);

// 칸 하나 칠하기 — 범위 밖이거나 같은 색이면 원본 그대로
export const setPixel = (grid, size, x, y, color) => {
  if (!inBounds(size, x, y)) return grid;
  const index = y * size + x;
  if (grid[index] === color) return grid;
  const next = grid.slice();
  next[index] = color;
  return next;
};

// 브레젠햄 직선 — 양 끝 포함
export const lineCells = (x0, y0, x1, y1) => {
  const cells = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    cells.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return cells;
};

// 같은 색 영역 채우기 (4방향, null 영역도 대상)
export const floodFill = (grid, size, x, y, color) => {
  if (!inBounds(size, x, y)) return grid;
  const target = grid[y * size + x];
  if (target === color) return grid;
  const next = grid.slice();
  const stack = [[x, y]];
  while (stack.length > 0) {
    const [cx, cy] = stack.pop();
    if (!inBounds(size, cx, cy)) continue;
    const index = cy * size + cx;
    if (next[index] !== target) continue;
    next[index] = color;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return next;
};

/* ---------- 실행 취소 기록 ---------- */

export const createHistory = (limit = 50) => ({ past: [], future: [], limit });

// 변경 직전 격자를 기록 — redo 스택은 비움
export const pushHistory = (history, grid) => {
  const past = [...history.past, grid];
  while (past.length > history.limit) past.shift();
  return { past, future: [], limit: history.limit };
};

export const undo = (history, current) => {
  if (history.past.length === 0) return { history, grid: current };
  const past = history.past.slice(0, -1);
  const grid = history.past[history.past.length - 1];
  return { history: { past, future: [...history.future, current], limit: history.limit }, grid };
};

export const redo = (history, current) => {
  if (history.future.length === 0) return { history, grid: current };
  const future = history.future.slice(0, -1);
  const grid = history.future[history.future.length - 1];
  return { history: { past: [...history.past, current], future, limit: history.limit }, grid };
};

/* ---------- 저장 형식 ---------- */

export const serialize = (grid, size) => JSON.stringify({ version: 1, size, pixels: grid });

export const deserialize = (json) => {
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object' || data.version !== 1) return null;
    const { size, pixels } = data;
    if (!Number.isInteger(size) || size < 1 || size > 256) return null;
    if (!Array.isArray(pixels) || pixels.length !== size * size) return null;
    const valid = pixels.every((p) => p === null || (typeof p === 'string' && COLOR_RE.test(p)));
    return valid ? { size, grid: pixels.slice() } : null;
  } catch {
    return null;
  }
};

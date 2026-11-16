// 타일 합치기 규칙 로직 — DOM·localStorage에 접근하지 않는 순수 모듈

const DIRECTIONS = ['left', 'right', 'up', 'down'];

// 빈 격자 만들기
const emptyGrid = (size) => Array.from({ length: size }, () => Array(size).fill(0));

const cloneGrid = (grid) => grid.map((row) => row.slice());

// 빈칸 좌표 목록
const emptyCells = (grid) => {
  const cells = [];
  grid.forEach((row, r) => row.forEach((value, c) => {
    if (value === 0) cells.push({ r, c });
  }));
  return cells;
};

// 무작위 빈칸에 2(90%) 또는 4(10%)를 놓고 위치도 함께 돌려준다
const placeRandomTile = (grid, random = Math.random) => {
  const cells = emptyCells(grid);
  if (cells.length === 0) return { grid: cloneGrid(grid), pos: null, value: 0 };
  const index = Math.min(cells.length - 1, Math.floor(random() * cells.length));
  const pos = cells[index];
  const value = random() < 0.9 ? 2 : 4;
  const next = cloneGrid(grid);
  next[pos.r][pos.c] = value;
  return { grid: next, pos, value };
};

export const addRandomTile = (grid, random = Math.random) => placeRandomTile(grid, random).grid;

// 한 줄을 왼쪽으로 밀며, 결과 칸마다 원래 위치(인덱스)를 기록한다
const slideIndexed = (line) => {
  const items = [];
  line.forEach((value, index) => {
    if (value !== 0) items.push({ value, index });
  });

  const result = [];
  let gained = 0;
  for (let i = 0; i < items.length; i += 1) {
    const current = items[i];
    const next = items[i + 1];
    if (next && next.value === current.value) {
      const value = current.value * 2;
      result.push({ value, sources: [current.index, next.index] });
      gained += value;
      i += 1;
    } else {
      result.push({ value: current.value, sources: [current.index] });
    }
  }
  return { result, gained };
};

export const slideLine = (line) => {
  const { result, gained } = slideIndexed(line);
  const out = result.map((item) => item.value);
  while (out.length < line.length) out.push(0);
  return { line: out, gained };
};

// 방향별로 k번째 줄의 좌표를 "이동 방향 쪽 끝"부터 나열한다
const lineCoords = (size, direction, k) => {
  const coords = [];
  for (let i = 0; i < size; i += 1) {
    const j = direction === 'right' || direction === 'down' ? size - 1 - i : i;
    coords.push(direction === 'left' || direction === 'right' ? { r: k, c: j } : { r: j, c: k });
  }
  return coords;
};

export const canMove = (grid) => {
  const size = grid.length;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const value = grid[r][c];
      if (value === 0) return true;
      if (c + 1 < size && grid[r][c + 1] === value) return true;
      if (r + 1 < size && grid[r + 1][c] === value) return true;
    }
  }
  return false;
};

export const createGame = (size = 4, random = Math.random) => {
  const first = placeRandomTile(emptyGrid(size), random);
  const second = placeRandomTile(first.grid, random);
  return { grid: second.grid, score: 0, over: false };
};

// 한 방향으로 이동. tiles는 이동 후 격자의 타일별 정보:
// { to, value, from } | { to, value, mergedFrom: [a, b] } | { to, value, isNew: true }
export const move = (state, direction, random = Math.random) => {
  if (!DIRECTIONS.includes(direction) || state.over) {
    return { state, moved: false, gained: 0, tiles: [] };
  }

  const size = state.grid.length;
  const grid = emptyGrid(size);
  const tiles = [];
  let gained = 0;
  let moved = false;

  for (let k = 0; k < size; k += 1) {
    const coords = lineCoords(size, direction, k);
    const line = coords.map(({ r, c }) => state.grid[r][c]);
    const slid = slideIndexed(line);
    gained += slid.gained;

    slid.result.forEach((item, i) => {
      const to = coords[i];
      grid[to.r][to.c] = item.value;
      if (item.sources.length === 2) {
        moved = true;
        tiles.push({ to, value: item.value, mergedFrom: item.sources.map((s) => coords[s]) });
      } else {
        if (item.sources[0] !== i) moved = true;
        tiles.push({ to, value: item.value, from: coords[item.sources[0]] });
      }
    });
  }

  if (!moved) return { state, moved: false, gained: 0, tiles: [] };

  const placed = placeRandomTile(grid, random);
  if (placed.pos) tiles.push({ to: placed.pos, value: placed.value, isNew: true });

  const nextState = {
    grid: placed.grid,
    score: state.score + gained,
    over: !canMove(placed.grid),
  };
  return { state: nextState, moved: true, gained, tiles };
};

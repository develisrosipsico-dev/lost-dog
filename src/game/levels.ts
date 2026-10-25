import { COLS, ROWS, TILE, POWERUP } from "./constants";
import type { CatBreed, CatBehavior, Direction, PowerupKind } from "./types";

export type LevelId = "1-1" | "1-2" | "1-3";
export interface Cell {
  col: number;
  row: number;
}
export interface CatSpawn extends Cell {
  breed: CatBreed;
  behavior: CatBehavior;
  speed: number;
  dir: Direction;
}
interface Reward extends Cell {
  type: PowerupKind;
  walls: Cell[];
  mouth: Cell;
}
export interface LevelDefinition {
  id: LevelId;
  name: string;
  hint: string;
  crates: number;
  time: number;
  barrierRange: readonly [number, number];
  bands: readonly number[];
  cats: readonly CatSpawn[];
  rewards: readonly Reward[];
}
export const SPAWN: Cell = { col: 1, row: 11 };
export const HOME: Cell = { col: 13, row: 1 };
export const SPAWN_SAFE: readonly Cell[] = [
  SPAWN,
  { col: 1, row: 10 },
  { col: 2, row: 11 },
];
export const cellKey = ({ col, row }: Cell) => `${col},${row}`;
const corners: Reward[] = [
  {
    col: 1,
    row: 1,
    type: POWERUP.RANGE,
    walls: [{ col: 2, row: 1 }],
    mouth: { col: 1, row: 2 },
  },
  {
    col: 13,
    row: 11,
    type: POWERUP.SPEED,
    walls: [{ col: 12, row: 11 }],
    mouth: { col: 13, row: 10 },
  },
];
const center: Reward = {
  col: 5,
  row: 5,
  type: POWERUP.BOMB_COUNT,
  walls: [
    { col: 5, row: 4 },
    { col: 6, row: 5 },
    { col: 5, row: 6 },
  ],
  mouth: { col: 4, row: 5 },
};
const orange = (col: number, row: number): CatSpawn => ({
  col,
  row,
  breed: "orange",
  behavior: "linear",
  speed: 1,
  dir: "right",
});
export const LEVELS: readonly LevelDefinition[] = [
  {
    id: "1-1",
    name: "O Portão do Quintal",
    hint: "Solte um osso junto à caixa e recue. Explore os becos para encontrar melhorias.",
    crates: 15,
    time: 120,
    barrierRange: [3, 4],
    bands: [2, 4, 6],
    cats: [orange(7, 1), orange(9, 5)],
    rewards: corners,
  },
  {
    id: "1-2",
    name: "Beco dos Gatos",
    hint: "O centro oferece uma rota mais curta. Três becos escondem melhorias garantidas.",
    crates: 28,
    time: 120,
    barrierRange: [6, 8],
    bands: [2, 4, 6, 16, 18, 20],
    cats: [
      orange(5, 1),
      orange(7, 3),
      {
        col: 5,
        row: 7,
        breed: "tuxedo",
        behavior: "wander",
        speed: 1.45,
        dir: "left",
      },
      {
        col: 11,
        row: 7,
        breed: "calico",
        behavior: "wander",
        speed: 1.55,
        dir: "left",
      },
    ],
    rewards: [...corners, center],
  },
  {
    id: "1-3",
    name: "Noite na Vizinhança",
    hint: "Cuidado ao abrir as gaiolas: siameses perseguem o cão quando têm visão livre na mesma linha ou coluna.",
    crates: 45,
    time: 90,
    barrierRange: [10, 13],
    bands: [2, 4, 6, 8, 12, 14, 16, 18, 20, 21],
    cats: [
      orange(7, 7),
      orange(9, 9),
      {
        col: 9,
        row: 8,
        breed: "tuxedo",
        behavior: "wander",
        speed: 1.55,
        dir: "up",
      },
      {
        col: 11,
        row: 10,
        breed: "calico",
        behavior: "wander",
        speed: 1.7,
        dir: "up",
      },
      {
        col: 7,
        row: 4,
        breed: "siamese",
        behavior: "hunter",
        speed: 2.1,
        dir: "up",
      },
      {
        col: 9,
        row: 6,
        breed: "siamese",
        behavior: "hunter",
        speed: 2.1,
        dir: "up",
      },
    ],
    rewards: [...corners, center],
  },
];
export function levelDefinition(id: LevelId) {
  const level = LEVELS.find((item) => item.id === id);
  if (!level) throw new Error(`Nível desconhecido: ${id}`);
  return level;
}
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
export function createBaseGrid(): number[][] {
  const grid = Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col): number =>
      row === 0 ||
      row === ROWS - 1 ||
      col === 0 ||
      col === COLS - 1 ||
      (row % 2 === 0 && col % 2 === 0)
        ? TILE.WALL_SOLID
        : TILE.EMPTY,
    ),
  );
  grid[HOME.row][HOME.col] = TILE.GOAL_HOUSE;
  return grid;
}
export function adjacent(
  grid: number[][],
  cell: Cell,
  allowCrates = false,
): Cell[] {
  return [
    { col: cell.col - 1, row: cell.row },
    { col: cell.col + 1, row: cell.row },
    { col: cell.col, row: cell.row - 1 },
    { col: cell.col, row: cell.row + 1 },
  ].filter(
    ({ col, row }) =>
      grid[row]?.[col] !== undefined &&
      grid[row][col] !== TILE.WALL_SOLID &&
      (allowCrates || grid[row][col] !== TILE.BOX_CRATE),
  );
}

/** Lexicographic Dijkstra: fewest crates first, then fewest grid steps.
 * This measures barriers crossed, not the number of bones needed to destroy them.
 */
export function findRoute(
  grid: number[][],
  from = SPAWN,
  to = HOME,
  allowCrates = true,
) {
  const queue = [{ cell: from, cost: 0 }];
  const distance = new Map([[cellKey(from), 0]]);
  const previous = new Map<string, Cell>();
  const priority = COLS * ROWS + 1;
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;
    const key = cellKey(current.cell);
    if (current.cost !== distance.get(key)) continue;
    if (key === cellKey(to)) {
      const path = [to];
      while (cellKey(path[0]) !== cellKey(from))
        path.unshift(previous.get(cellKey(path[0]))!);
      return {
        path,
        steps: path.length - 1,
        crates: path.filter(({ col, row }) => grid[row][col] === TILE.BOX_CRATE)
          .length,
      };
    }
    for (const next of adjacent(grid, current.cell, allowCrates)) {
      const cost =
        current.cost +
        1 +
        (grid[next.row][next.col] === TILE.BOX_CRATE ? priority : 0);
      const nextKey = cellKey(next);
      if (cost < (distance.get(nextKey) ?? Infinity)) {
        distance.set(nextKey, cost);
        previous.set(nextKey, current.cell);
        queue.push({ cell: next, cost });
      }
    }
  }
  return null;
}

export function generateLevel(id: LevelId, seed: number) {
  const definition = levelDefinition(id);
  const grid = createBaseGrid();
  const random = seededRandom(
    (seed >>> 0) ^ ((LEVELS.indexOf(definition) + 1) * 0x9e3779b9),
  );
  const protectedCells = new Set(
    [
      HOME,
      ...SPAWN_SAFE,
      ...definition.cats,
      ...definition.rewards.map((reward) => reward.mouth),
    ].map(cellKey),
  );
  for (const cat of definition.cats.filter(
    (cat) => cat.behavior === "linear",
  )) {
    const forward = { col: cat.col + 1, row: cat.row };
    if (
      grid[forward.row][forward.col] === TILE.EMPTY &&
      !definition.bands.includes(forward.col - 1 + 11 - forward.row)
    )
      protectedCells.add(cellKey(forward));
  }
  const put = (cell: Cell) => {
    if (
      protectedCells.has(cellKey(cell)) ||
      grid[cell.row]?.[cell.col] !== TILE.EMPTY
    )
      throw new Error(`Bloqueio inválido em ${cellKey(cell)}`);
    grid[cell.row][cell.col] = TILE.BOX_CRATE;
  };
  // Nested diagonal cuts. Any route to home must cross every selected band;
  // their locations are designed, while secondary blockers vary with the seed.
  for (let row = 1; row < ROWS - 1; row++)
    for (let col = 1; col < COLS - 1; col++) {
      if (
        grid[row][col] === TILE.EMPTY &&
        definition.bands.includes(col - 1 + 11 - row)
      )
        put({ col, row });
    }
  const rewards: Record<string, PowerupKind> = {};
  for (const reward of definition.rewards) {
    if (grid[reward.row][reward.col] !== TILE.BOX_CRATE) put(reward);
    rewards[cellKey(reward)] = reward.type;
    for (const wall of reward.walls)
      if (grid[wall.row][wall.col] !== TILE.BOX_CRATE) put(wall);
  }
  if (id === "1-2") {
    put({ col: 1, row: 3 });
    // Penalize the left/top perimeter without closing the rewarding central route.
    const top = [3, 4, 6, 8, 10].filter(
      (col) => !protectedCells.has(cellKey({ col, row: 1 })),
    );
    put({ col: top[Math.floor(random() * top.length)], row: 1 });
  }
  const candidates: Cell[] = [];
  for (let row = 1; row < ROWS - 1; row++)
    for (let col = 1; col < COLS - 1; col++) {
      if (
        grid[row][col] === TILE.EMPTY &&
        !protectedCells.has(cellKey({ col, row }))
      )
        candidates.push({ col, row });
    }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  let count = grid.flat().filter((tile) => tile === TILE.BOX_CRATE).length;
  if (count > definition.crates)
    throw new Error("O template excede o orçamento de caixas.");
  while (count < definition.crates) {
    const cell = candidates.pop();
    if (!cell) throw new Error("Faltam posições para as caixas.");
    put(cell);
    count++;
  }
  const route = findRoute(grid);
  if (
    !route ||
    route.crates < definition.barrierRange[0] ||
    route.crates > definition.barrierRange[1]
  )
    throw new Error("O template não respeita a rota planejada.");
  return { definition, grid, rewards, route, seed: seed >>> 0 };
}

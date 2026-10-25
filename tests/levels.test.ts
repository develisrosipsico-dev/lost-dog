import { describe, expect, it } from "vitest";
import { GameModel } from "../src/game/GameModel";
import {
  BONE_FUSE,
  PLAYER_TILES_PER_SECOND,
  TILE,
  TILE_SIZE,
} from "../src/game/constants";
import {
  LEVELS,
  SPAWN_SAFE,
  createBaseGrid,
  findRoute,
  generateLevel,
  adjacent,
} from "../src/game/levels";
import type { Cat } from "../src/game/types";

const cat = (values: Partial<Cat> = {}): Cat => ({
  x: 168,
  y: 168,
  size: 30,
  speed: 1,
  dir: "right",
  animTime: 0,
  alive: true,
  breed: "orange",
  behavior: "linear",
  ...values,
});
function emptyModel() {
  const model = new GameModel(undefined, () => 0.99);
  model.startNewGame("1-1", 1);
  model.initGrid();
  model.enemies = [];
  model.hiddenRewards = {};
  return model;
}

describe("Phase 1 templates", () => {
  it("has the 22-step orthogonal base route and the proposed movement/fuse timing", () => {
    expect(findRoute(createBaseGrid())?.steps).toBe(22);
    expect(findRoute(createBaseGrid())?.crates).toBe(0);
    expect(22 / PLAYER_TILES_PER_SECOND).toBeCloseTo(6.286, 3);
    expect(BONE_FUSE).toBe(2);
  });
  for (const level of LEVELS) {
    it(`${level.id}: validates counts, route barriers, pillars, safe spawn and reward dead ends across 250 seeds`, () => {
      for (let seed = 0; seed < 250; seed++) {
        const generated = generateLevel(level.id, seed);
        const { grid, rewards, route } = generated;
        expect(
          grid.flat().filter((tile) => tile === TILE.BOX_CRATE),
        ).toHaveLength(level.crates);
        for (const cell of SPAWN_SAFE)
          expect(grid[cell.row][cell.col]).toBe(TILE.EMPTY);
        expect(grid[1][13]).toBe(TILE.GOAL_HOUSE);
        for (let row = 0; row < 13; row++)
          for (let col = 0; col < 15; col++) {
            if (
              row === 0 ||
              row === 12 ||
              col === 0 ||
              col === 14 ||
              (row % 2 === 0 && col % 2 === 0)
            )
              expect(grid[row][col]).toBe(TILE.WALL_SOLID);
          }
        expect(route.crates).toBeGreaterThanOrEqual(level.barrierRange[0]);
        expect(route.crates).toBeLessThanOrEqual(level.barrierRange[1]);
        expect(findRoute(grid, undefined, undefined, false)).toBeNull();
        for (const spawn of level.cats) {
          expect(grid[spawn.row][spawn.col]).toBe(TILE.EMPTY);
          expect(
            Math.abs(spawn.col - 1) + Math.abs(spawn.row - 11),
          ).toBeGreaterThan(4);
        }
        for (const reward of level.rewards) {
          expect(rewards[`${reward.col},${reward.row}`]).toBe(reward.type);
          expect(grid[reward.row][reward.col]).toBe(TILE.BOX_CRATE);
          expect(adjacent(grid, reward)).toEqual([reward.mouth]);
        }
      }
    });
  }
  it("reproduces a map with the same seed and varies secondary blockers across seeds", () => {
    for (const level of LEVELS) {
      expect(generateLevel(level.id, 42)).toEqual(generateLevel(level.id, 42));
      const maps = new Set(
        Array.from({ length: 12 }, (_, seed) =>
          JSON.stringify(generateLevel(level.id, seed).grid),
        ),
      );
      expect(maps.size).toBeGreaterThan(1);
    }
  });
  it("makes the medium center route cheaper than either simple perimeter route", () => {
    for (let seed = 0; seed < 20; seed++) {
      const { grid, route } = generateLevel("1-2", seed);
      const along = (cells: { col: number; row: number }[]) =>
        cells.filter((p) => grid[p.row][p.col] === TILE.BOX_CRATE).length;
      const leftTop = [
        ...Array.from({ length: 11 }, (_, n) => ({ col: 1, row: 11 - n })),
        ...Array.from({ length: 12 }, (_, n) => ({ col: n + 2, row: 1 })),
      ];
      const bottomRight = [
        ...Array.from({ length: 13 }, (_, n) => ({ col: n + 1, row: 11 })),
        ...Array.from({ length: 10 }, (_, n) => ({ col: 13, row: 10 - n })),
      ];
      expect(route.crates).toBeLessThan(along(leftTop));
      expect(route.crates).toBeLessThan(along(bottomRight));
    }
  });
  it("keeps the two fast Siamese cats caged until their crate pockets are opened", () => {
    const model = new GameModel();
    model.startNewGame("1-3", 1);
    const hunters = model.enemies.filter((enemy) => enemy.breed === "siamese");
    expect(hunters).toHaveLength(2);
    for (const hunter of hunters)
      expect(model.pickNewCatDirection(hunter)).toBeNull();
    const hunter = hunters[0],
      col = Math.floor(hunter.x / TILE_SIZE),
      row = Math.floor(hunter.y / TILE_SIZE);
    expect(model.grid[row - 1][col]).toBe(TILE.BOX_CRATE);
    model.destroyCrate(col, row - 1);
    expect(model.pickNewCatDirection(hunter)).toBe("up");
  });
  it("delivers each promised powerup exactly once, independently of random drops", () => {
    const model = new GameModel(undefined, () => 0.99);
    model.startNewGame("1-2", 1);
    for (const reward of model.level.rewards) {
      const before = model.powerups.length;
      model.destroyCrate(reward.col, reward.row);
      expect(model.powerups.at(-1)?.type).toBe(reward.type);
      model.destroyCrate(reward.col, reward.row);
      expect(model.powerups).toHaveLength(before + 1);
    }
  });
});

describe("Campaign transitions", () => {
  it("uses the 2/4/6 enemy compositions and 120/120/90 clocks", () => {
    const model = new GameModel();
    for (const [index, level] of LEVELS.entries()) {
      model.startNewGame(level.id, 7);
      expect(model.enemies).toHaveLength([2, 4, 6][index]);
      expect(model.timeLeft).toBe([120, 120, 90][index]);
      expect(model.enemies.filter((c) => c.breed === "orange")).toHaveLength(2);
    }
  });
  it("only advances after victory, stops at the last level, and retries the same seed", () => {
    const model = new GameModel();
    model.startNewGame("1-1", 17);
    expect(model.advanceLevel()).toBe(false);
    model.triggerVictory();
    expect(model.advanceLevel()).toBe(true);
    expect(model.levelId).toBe("1-2");
    model.triggerVictory();
    model.advanceLevel();
    expect(model.levelId).toBe("1-3");
    const grid = JSON.stringify(model.grid);
    model.destroyCrate(1, 9);
    model.triggerGameOver("Teste");
    model.restartLevel();
    expect(JSON.stringify(model.grid)).toBe(grid);
    expect(model.timeLeft).toBe(90);
    expect(model.player.lives).toBe(3);
    model.triggerVictory();
    expect(model.advanceLevel()).toBe(false);
    expect(model.state).toBe("VICTORY");
    expect(model.levelSeed).toBe(17);
  });
});

describe("Cat navigation and line of sight", () => {
  it("keeps an orange cat linear and reverses at a wall instead of taking an available turn", () => {
    const model = emptyModel();
    const enemy = cat();
    model.grid[3][4] = TILE.BOX_CRATE;
    expect(model.pickNewCatDirection(enemy)).toBe("left");
    expect(enemy.dir).toBe("left");
  });
  it("lets a wandering cat take a corner when forward is blocked", () => {
    const model = emptyModel();
    const enemy = cat({ behavior: "wander", breed: "calico" });
    model.grid[3][4] = TILE.BOX_CRATE;
    model.grid[3][2] = TILE.BOX_CRATE;
    model.grid[4][3] = TILE.BOX_CRATE;
    expect(model.pickNewCatDirection(enemy)).toBe("up");
  });
  it("chases along a clear row or column, never through crates, pillars or bones", () => {
    const model = emptyModel();
    const hunter = cat({ behavior: "hunter", breed: "siamese", dir: "up" });
    model.player.x = 264;
    model.player.y = 168;
    expect(model.hasLineOfSight(hunter)).toBe(true);
    expect(model.pickNewCatDirection(hunter)).toBe("right");
    model.grid[3][4] = TILE.BOX_CRATE;
    expect(model.hasLineOfSight(hunter)).toBe(false);
    model.grid[3][4] = TILE.WALL_SOLID;
    expect(model.hasLineOfSight(hunter)).toBe(false);
    model.grid[3][4] = TILE.EMPTY;
    model.dropBoneBomb();
    expect(model.hasLineOfSight(hunter)).toBe(false);
    model.activeBombs = [];
    model.player.x = 168;
    model.player.y = 264;
    expect(model.pickNewCatDirection(hunter)).toBe("down");
    model.player.x = 264;
    expect(model.hasLineOfSight(hunter)).toBe(false);
  });
  it("navigates many tile centers without clipping corners or crossing solid tiles", () => {
    const model = emptyModel();
    model.player.x = 648;
    model.player.y = 552;
    model.enemies = [cat({ behavior: "wander", breed: "tuxedo", speed: 1.45 })];
    for (let n = 0; n < 60 * 20; n++) {
      model.updateCats(1 / 60);
      const enemy = model.enemies[0];
      expect(model.checkCollision(enemy.x, enemy.y, 13, enemy)).toBe(false);
      const alignedX =
        Math.abs((enemy.x - 24) / 48 - Math.round((enemy.x - 24) / 48)) < 1e-6;
      const alignedY =
        Math.abs((enemy.y - 24) / 48 - Math.round((enemy.y - 24) / 48)) < 1e-6;
      expect(alignedX || alignedY).toBe(true);
    }
  });
});

import { describe, expect, it } from "vitest";
import { GameModel } from "../src/game/GameModel";
import { COLS, ROWS, TILE, TILE_SIZE, POWERUP } from "../src/game/constants";

function game() {
  const model = new GameModel(undefined, () => 0.99);
  model.startNewGame();
  model.initGrid(); // Isolate movement/mechanics from the designed level blockers.
  model.hiddenRewards = {};
  model.enemies = [];
  return model;
}
function tick(model: GameModel, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 60); i++) model.update(1 / 60);
}

describe("15×13 simulation", () => {
  it("preserves borders, even/even pillars, goal and bottom-left spawn", () => {
    const model = game();
    expect(model.grid).toHaveLength(ROWS);
    expect(model.grid.every((row) => row.length === COLS)).toBe(true);
    expect(model.grid[0].every((cell) => cell === TILE.WALL_SOLID)).toBe(true);
    expect(model.grid[12].every((cell) => cell === TILE.WALL_SOLID)).toBe(true);
    expect(model.grid[2][2]).toBe(TILE.WALL_SOLID);
    expect(model.grid[1][13]).toBe(TILE.GOAL_HOUSE);
    expect([model.player.x, model.player.y]).toEqual([72, 552]);
  });
  it("never puts crates in the spawn cells in the tutorial", () => {
    const model = new GameModel(undefined, () => 0);
    model.startNewGame();
    for (const [col, row] of [
      [1, 11],
      [2, 11],
      [1, 10],
      [13, 1],
    ]) {
      expect(model.grid[row][col]).not.toBe(TILE.BOX_CRATE);
    }
  });
  it("moves at 168 px/s and normalizes diagonal speed", () => {
    const a = game();
    const b = game();
    a.grid[2][2] = b.grid[2][2] = TILE.EMPTY;
    a.player.x = b.player.x = 72;
    a.player.y = b.player.y = 72;
    a.keys.KeyD = true;
    b.keys.KeyD = true;
    b.keys.KeyS = true;
    tick(a, 0.1);
    tick(b, 0.1);
    expect(a.player.x - 72).toBeCloseTo(16.8);
    expect(Math.hypot(b.player.x - 72, b.player.y - 72)).toBeCloseTo(16.8, 2);
  });
  it("slides vertically around a pillar when entering a horizontal corridor", () => {
    const model = game();
    model.player.x = 160;
    model.player.y = 86;
    for (let i = 0; i < 24; i++) model.movePlayerWithCornerSlide(-2.55, 0);
    expect(model.player.y).toBeLessThan(81);
    expect(model.player.x).toBeLessThan(130);
    expect(
      model.checkCollision(model.player.x, model.player.y, 15, model.player),
    ).toBe(false);
  });
  it("slides horizontally around a pillar when entering a vertical corridor", () => {
    const model = game();
    model.player.x = 86;
    model.player.y = 160;
    for (let i = 0; i < 24; i++) model.movePlayerWithCornerSlide(0, -2.55);
    expect(model.player.x).toBeLessThan(81);
    expect(model.player.y).toBeLessThan(130);
    expect(
      model.checkCollision(model.player.x, model.player.y, 15, model.player),
    ).toBe(false);
  });
  it("does not slide or tunnel through pillars when outside the corner tolerance", () => {
    const model = game();
    model.player.x = 160;
    model.player.y = 91;
    for (let i = 0; i < 60; i++) model.movePlayerWithCornerSlide(-2.55, 0);
    expect([model.player.x, model.player.y]).toEqual([160, 91]);
  });
  it("blocks crates and world bounds, but allows only the dog into the house", () => {
    const model = game();
    model.grid[11][2] = TILE.BOX_CRATE;
    model.keys.KeyD = true;
    tick(model, 1);
    expect(model.player.x).toBeLessThan(96 - 15);
    expect(model.checkCollision(5, 72, 15, model.player)).toBe(true);
    expect(model.checkCollision(648, 72, 13, { x: 600, y: 72 })).toBe(true);
    expect(model.checkCollision(648, 72, 15, model.player)).toBe(false);
  });
});

describe("bones, particles and powerups", () => {
  it("allows leaving your bone, then prevents walking back through it", () => {
    const model = game();
    model.dropBoneBomb();
    model.keys.KeyD = true;
    tick(model, 0.4);
    model.keys.KeyD = false;
    expect(model.player.x).toBeGreaterThan(120);
    model.keys.KeyA = true;
    tick(model, 0.4);
    expect(model.player.x).toBeGreaterThanOrEqual(111);
  });
  it("enforces the simultaneous bone limit and prevents duplicate placement", () => {
    const model = game();
    model.dropBoneBomb();
    model.dropBoneBomb();
    expect(model.activeBombs).toHaveLength(1);
    model.player.x = 120;
    model.dropBoneBomb();
    expect(model.activeBombs).toHaveLength(1);
  });
  it("detonates after 2.0 seconds and creates cross-shaped blasts with particles", () => {
    const model = game();
    model.dropBoneBomb();
    tick(model, 1.9);
    expect(model.activeBombs).toHaveLength(1);
    tick(model, 0.15);
    expect(model.activeBombs).toHaveLength(0);
    expect(
      model.activeExplosions.some((cell) => cell.col === 1 && cell.row === 11),
    ).toBe(true);
    expect(model.particles.length).toBeGreaterThan(0);
    expect(model.player.lives).toBe(2);
    tick(model, 1);
    expect(model.activeExplosions).toHaveLength(0);
    expect(model.particles).toHaveLength(0);
  });
  it("destroys a crate but stops the blast at that crate", () => {
    const model = game();
    model.grid[11][2] = TILE.BOX_CRATE;
    model.player.bombRange = 4;
    model.dropBoneBomb();
    model.detonateBone(model.activeBombs[0]);
    expect(model.grid[11][2]).toBe(TILE.EMPTY);
    expect(
      model.activeExplosions.some((cell) => cell.col === 3 && cell.row === 11),
    ).toBe(false);
    expect(
      model.particles.some((p) => p.type === "splinter" && p.gravity === 280),
    ).toBe(true);
  });
  it("chains nearby bones and kills cats caught in the blast", () => {
    const model = game();
    model.player.maxBombs = 2;
    model.dropBoneBomb();
    model.player.x = 120;
    model.dropBoneBomb();
    model.player.x = 72;
    model.enemies = [
      {
        x: 120,
        y: 552,
        size: 30,
        speed: 0,
        dir: "down",
        animTime: 0,
        alive: true,
      },
    ];
    model.detonateBone(model.activeBombs[0]);
    expect(model.activeBombs[1].timer).toBe(0.04);
    model.update(1 / 60);
    expect(model.enemies[0].alive).toBe(false);
  });
  it("applies gravity and removes expired particles", () => {
    const model = game();
    model.particles = [
      {
        x: 0,
        y: 0,
        vx: 10,
        vy: -10,
        gravity: 100,
        color: "#fff",
        size: 3,
        life: 0.2,
        type: "spark",
      },
    ];
    model.update(0.1);
    expect(model.particles[0].x).toBe(1);
    expect(model.particles[0].vy).toBe(0);
    model.update(0.11);
    expect(model.particles).toHaveLength(0);
  });
  it("collects all powerup types and caps upgrades", () => {
    const model = game();
    for (const type of [POWERUP.RANGE, POWERUP.BOMB_COUNT, POWERUP.SPEED]) {
      for (let n = 0; n < 10; n++)
        model.collectPowerup({ x: 72, y: 552, col: 1, row: 11, type, anim: 0 });
    }
    expect(model.player.bombRange).toBe(6);
    expect(model.player.maxBombs).toBe(5);
    expect(model.player.speedLevel).toBe(4);
  });
});

describe("lifecycle and pause", () => {
  it("wins on entering the goal and stops the countdown", () => {
    const model = game();
    model.player.x = 13 * TILE_SIZE + 24;
    model.player.y = 72;
    model.update(1 / 60);
    expect(model.state).toBe("VICTORY");
    tick(model, 2);
    expect(model.timeLeft).toBe(120);
  });
  it("loses when time expires, and restart resets the match", () => {
    const model = game();
    model.timeLeft = 1;
    tick(model, 1.1);
    expect(model.state).toBe("GAMEOVER");
    model.startNewGame();
    expect([model.state, model.timeLeft, model.player.lives]).toEqual([
      "PLAYING",
      120,
      3,
    ]);
    expect(model.activeBombs).toHaveLength(0);
  });
  it("freezes the timer, bones, player and particles while paused", () => {
    const model = game();
    model.dropBoneBomb();
    model.paused = true;
    const before = JSON.stringify(model);
    tick(model, 3);
    expect(JSON.stringify(model)).toBe(before);
    model.dropBoneBomb();
    expect(model.activeBombs).toHaveLength(1);
  });
  it("releases inputs on reset and ignores action before starting", () => {
    const model = new GameModel();
    model.dropBoneBomb();
    expect(model.activeBombs).toHaveLength(0);
    model.keys.KeyD = true;
    model.startNewGame();
    expect(model.keys.KeyD).toBe(false);
  });
});

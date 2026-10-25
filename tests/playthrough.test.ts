import { expect, it } from "vitest";
import { GameModel } from "../src/game/GameModel";
import { LEVELS, adjacent, cellKey, findRoute } from "../src/game/levels";
import type { Cell } from "../src/game/levels";
import { TILE_SIZE, TILE } from "../src/game/constants";

/** Run the real movement, fuse, collision and damage simulation. Cats are disabled
 * here to isolate the topology; their patrol/chase behavior has separate tests.
 */
for (const level of LEVELS)
  it(`${level.id}: can reach home by planting bones and retreating, without taking blast damage`, () => {
    const model = new GameModel(undefined, () => 0.99);
    model.startNewGame(level.id, 42);
    model.enemies = [];
    const move = (cell: Cell) => {
      const x = cell.col * TILE_SIZE + 24,
        y = cell.row * TILE_SIZE + 24;
      let ticks = 0;
      while (
        Math.hypot(model.player.x - x, model.player.y - y) > 1e-6 &&
        model.state === "PLAYING"
      ) {
        if (++ticks > 120) throw new Error("Movement became stuck");
        model.resetInput();
        const dx = x - model.player.x,
          dy = y - model.player.y;
        if (Math.abs(dx) > 1e-6) model.keys[dx > 0 ? "KeyD" : "KeyA"] = true;
        else model.keys[dy > 0 ? "KeyS" : "KeyW"] = true;
        const step = Math.min(
          1 / 60,
          Math.hypot(dx, dy) / (model.player.speed * 60),
        );
        model.update(step);
      }
      model.resetInput();
    };
    let turns = 0;
    while (model.state === "PLAYING") {
      if (++turns > 250) throw new Error("Route did not finish");
      const start = {
        col: Math.floor(model.player.x / 48),
        row: Math.floor(model.player.y / 48),
      };
      const route = findRoute(model.grid, start);
      expect(route).not.toBeNull();
      const next = route!.path[1];
      if (model.grid[next.row][next.col] !== TILE.BOX_CRATE) {
        move(next);
        continue;
      }
      model.dropBoneBomb();
      expect(model.activeBombs).toHaveLength(1);
      const unsafe = new Set([cellKey(start)]);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        for (let distance = 1; distance <= model.player.bombRange; distance++) {
          const cell = {
            col: start.col + dx * distance,
            row: start.row + dy * distance,
          };
          const tile = model.grid[cell.row]?.[cell.col];
          if (tile === undefined || tile === TILE.WALL_SOLID) break;
          unsafe.add(cellKey(cell));
          if (tile === TILE.BOX_CRATE) break;
        }
      }
      const queue = [[start]],
        seen = new Set([cellKey(start)]);
      let escape: Cell[] | undefined;
      while (queue.length) {
        const path = queue.shift()!;
        const cell = path.at(-1)!;
        if (!unsafe.has(cellKey(cell))) {
          escape = path;
          break;
        }
        for (const next of adjacent(model.grid, cell)) {
          if (!seen.has(cellKey(next))) {
            seen.add(cellKey(next));
            queue.push([...path, next]);
          }
        }
      }
      expect(
        escape,
        "There must be a reachable cell outside the blast",
      ).toBeDefined();
      for (const cell of escape!.slice(1)) move(cell);
      let waiting = 0;
      while (model.activeBombs.length || model.activeExplosions.length) {
        if (++waiting > 180) throw new Error("Fuse or blast failed to expire");
        model.update(1 / 60);
      }
      expect(model.player.lives).toBe(3);
    }
    expect(model.state).toBe("VICTORY");
    expect(model.timeLeft).toBeGreaterThan(0);
  });

export const COLS = 15;
export const ROWS = 13;
export const TILE_SIZE = 48;
export const WIDTH = COLS * TILE_SIZE;
export const HEIGHT = ROWS * TILE_SIZE;
export const TILE = {
  EMPTY: 0,
  WALL_SOLID: 1,
  BOX_CRATE: 2,
  GOAL_HOUSE: 3,
} as const;
export const POWERUP = {
  SPEED: "speed",
  RANGE: "range",
  BOMB_COUNT: "bomb",
} as const;
export const DIRECTIONS = ["up", "down", "left", "right"] as const;
